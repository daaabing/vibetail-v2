import { drinkInfoSuggestionSchema, modelMatchSelectionSchema } from "@vibetail/contracts";
import { GoogleGenAI } from "@google/genai";
import type { TelemetrySink } from "@vibetail/observability";
import type {
  DrinkInfoModelRequest,
  DrinkInfoProvider,
  DrinkInfoResult,
  ModelInvocationMetadata,
  ModelProvider,
  ModelProviderResult,
  VenueModelRequest,
} from "./index.js";
import { drinkInfoSystemPrompt } from "./drink-info-prompt.js";
import { venueMatchSystemPrompt } from "./venue-prompt.js";

interface VertexGeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface VertexGeminiResponse {
  text?: string;
  responseId?: string;
  modelVersion?: string;
  usageMetadata?: VertexGeminiUsageMetadata;
  candidates?: Array<{ finishReason?: string }>;
}

interface VertexGeminiGenerateRequest {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
    responseMimeType: "application/json";
    responseJsonSchema: Record<string, unknown>;
    candidateCount: 1;
    temperature: number;
    thinkingConfig: { thinkingLevel: "MINIMAL" };
    maxOutputTokens: number;
    httpOptions: { timeout: number };
  };
}

export interface VertexGeminiClient {
  models: {
    generateContent(request: VertexGeminiGenerateRequest): Promise<VertexGeminiResponse>;
  };
}

export interface VertexGeminiModelProviderOptions {
  apiKey: string;
  model: string;
  client?: VertexGeminiClient;
  telemetry?: TelemetrySink;
}

export class VertexGeminiProviderError extends Error {
  override readonly name = "VertexGeminiProviderError";

  constructor(
    readonly code: "invalid_response" | "provider_unavailable",
    readonly diagnostic?: "empty_text" | "invalid_json" | "schema_validation",
  ) {
    super(code === "invalid_response" ? "Vertex Gemini returned an invalid response" : "Vertex Gemini request failed");
  }
}

const matchResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["matchedItemId", "whyThisMatch"],
  properties: {
    matchedItemId: { type: "string", description: "An ID copied exactly from allowedItems." },
    whyThisMatch: { type: "string" },
  },
} satisfies Record<string, unknown>;

const drinkInfoResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["flavorTags", "baseSpirit", "strength", "recommendationNote"],
  properties: {
    flavorTags: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    baseSpirit: { type: "string" },
    strength: { type: "string", enum: ["zero", "light", "medium", "strong"] },
    recommendationNote: { type: "string" },
  },
} satisfies Record<string, unknown>;

export class VertexGeminiModelProvider implements ModelProvider, DrinkInfoProvider {
  readonly id = "vertex";
  private readonly client: VertexGeminiClient;
  private readonly model: string;
  private readonly telemetry: TelemetrySink | undefined;

  constructor(options: VertexGeminiModelProviderOptions) {
    this.model = options.model.trim();
    if (!this.model) throw new Error("Vertex Gemini model name is required");
    if (!options.client && !options.apiKey.trim()) throw new Error("Vertex API key is required");
    this.client = options.client ?? (new GoogleGenAI({
      vertexai: true,
      apiKey: options.apiKey,
    }) as unknown as VertexGeminiClient);
    this.telemetry = options.telemetry;
  }

  async selectVenueItem(request: VenueModelRequest): Promise<ModelProviderResult> {
    if (request.allowedItems.length === 0) throw new Error("No allowed menu items were provided");
    this.logStarted(
      request.traceId,
      request.allowedItems.length,
      request.locale,
      request.merchantId === "global" ? "global" : "venue",
    );
    const startedAt = performance.now();
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: JSON.stringify({
          preferences: request.preferences,
          allowedItems: request.allowedItems,
        }),
        config: {
          systemInstruction: venueMatchSystemPrompt(request.locale),
          responseMimeType: "application/json",
          responseJsonSchema: matchResponseJsonSchema,
          candidateCount: 1,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
          maxOutputTokens: 2_048,
          httpOptions: { timeout: request.timeoutMs },
        },
      });
      const selection = modelMatchSelectionSchema.strict().parse(parseResponseJson(response));
      const metadata = invocationMetadata(this.id, this.model, response, startedAt);
      this.logCompleted(request.traceId, selection.matchedItemId, metadata);
      return { selection, metadata };
    } catch (error) {
      const durationMs = elapsed(startedAt);
      const code = error instanceof VertexGeminiProviderError || isParseError(error)
        ? "invalid_response"
        : "provider_unavailable";
      const diagnostic = error instanceof VertexGeminiProviderError
        ? error.diagnostic
        : isParseError(error)
          ? "schema_validation"
          : undefined;
      this.logFailed(request.traceId, durationMs, code, diagnostic);
      throw new VertexGeminiProviderError(code);
    }
  }

  async suggestDrinkInfo(request: DrinkInfoModelRequest): Promise<DrinkInfoResult> {
    const startedAt = performance.now();
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: JSON.stringify({
          name: request.name,
          description: request.description,
          ingredients: request.ingredients,
        }),
        config: {
          systemInstruction: drinkInfoSystemPrompt(request.locale),
          responseMimeType: "application/json",
          responseJsonSchema: drinkInfoResponseJsonSchema,
          candidateCount: 1,
          temperature: 0.2,
          thinkingConfig: { thinkingLevel: "MINIMAL" },
          maxOutputTokens: 2_048,
          httpOptions: { timeout: request.timeoutMs },
        },
      });
      const suggestion = drinkInfoSuggestionSchema.strict().parse(parseResponseJson(response));
      return {
        suggestion,
        metadata: invocationMetadata(this.id, this.model, response, startedAt),
      };
    } catch (error) {
      throw new VertexGeminiProviderError(
        error instanceof VertexGeminiProviderError || isParseError(error)
          ? "invalid_response"
          : "provider_unavailable",
      );
    }
  }

  private logStarted(traceId: string, candidateCount: number, locale: string, matchScope: string): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      traceId,
      provider: this.id,
      event: "tasting_agent_request_started",
      fields: { model: this.model, candidateCount, locale, matchScope },
    });
  }

  private logCompleted(traceId: string, matchedItemId: string, metadata: ModelInvocationMetadata): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level: "info",
      service: "web",
      traceId,
      provider: this.id,
      durationMs: metadata.durationMs,
      event: "tasting_agent_request_completed",
      fields: {
        model: metadata.model,
        attempt: metadata.attempt,
        matchedItemId,
        promptTokenCount: metadata.promptTokenCount ?? null,
        outputTokenCount: metadata.outputTokenCount ?? null,
        totalTokenCount: metadata.totalTokenCount ?? null,
        responseId: metadata.responseId ?? null,
        modelVersion: metadata.modelVersion ?? null,
        finishReason: metadata.finishReason ?? null,
      },
    });
  }

  private logFailed(
    traceId: string,
    durationMs: number,
    errorCode: string,
    diagnostic?: VertexGeminiProviderError["diagnostic"],
  ): void {
    this.emit({
      timestamp: new Date().toISOString(),
      level: "warn",
      service: "web",
      traceId,
      provider: this.id,
      durationMs,
      errorCode,
      event: "tasting_agent_request_failed",
      fields: {
        model: this.model,
        attempt: 1,
        ...(diagnostic ? { diagnostic } : {}),
      },
    });
  }

  private emit(event: Parameters<TelemetrySink["log"]>[0]): void {
    try {
      this.telemetry?.log(event);
    } catch {
      // Observability must never block a guest recommendation or expose a
      // telemetry failure through the public API.
    }
  }
}

function parseResponseJson(response: VertexGeminiResponse): unknown {
  let text = response.text?.trim();
  if (!text) throw new VertexGeminiProviderError("invalid_response", "empty_text");

  // Structured-output providers occasionally preserve a single Markdown JSON
  // fence or JSON-string wrapper. Normalize only those transport wrappers;
  // the parsed object still has to pass the strict application schema.
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  if (fenced?.[1]) text = fenced[1].trim();
  try {
    return parseJsonOrWrappedJson(text);
  } catch {
    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      try {
        return parseJsonOrWrappedJson(text.slice(objectStart, objectEnd + 1));
      } catch {
        // Fall through to the same sanitized provider error.
      }
    }
  }
  throw new VertexGeminiProviderError("invalid_response", "invalid_json");
}

function parseJsonOrWrappedJson(text: string): unknown {
  const parsed = JSON.parse(text) as unknown;
  return typeof parsed === "string" ? JSON.parse(parsed) as unknown : parsed;
}

function invocationMetadata(
  provider: string,
  model: string,
  response: VertexGeminiResponse,
  startedAt: number,
): ModelInvocationMetadata {
  return {
    provider,
    model,
    attempt: 1,
    durationMs: elapsed(startedAt),
    ...(response.usageMetadata?.promptTokenCount === undefined
      ? {} : { promptTokenCount: response.usageMetadata.promptTokenCount }),
    ...(response.usageMetadata?.candidatesTokenCount === undefined
      ? {} : { outputTokenCount: response.usageMetadata.candidatesTokenCount }),
    ...(response.usageMetadata?.totalTokenCount === undefined
      ? {} : { totalTokenCount: response.usageMetadata.totalTokenCount }),
    ...(response.responseId ? { responseId: response.responseId } : {}),
    ...(response.modelVersion ? { modelVersion: response.modelVersion } : {}),
    ...(response.candidates?.[0]?.finishReason
      ? { finishReason: response.candidates[0].finishReason } : {}),
  };
}

function elapsed(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function isParseError(error: unknown): boolean {
  return error instanceof SyntaxError || (
    typeof error === "object" && error !== null && "name" in error && error.name === "ZodError"
  );
}
