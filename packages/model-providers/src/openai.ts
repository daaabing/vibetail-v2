import { drinkInfoSuggestionSchema, matchSelectionSchemaFor, modelMatchSelectionSchema } from "@vibetail/contracts";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type {
  DrinkInfoModelRequest,
  DrinkInfoProvider,
  DrinkInfoResult,
  ModelProvider,
  ModelProviderResult,
  VenueModelRequest,
} from "./index.js";
import { drinkInfoSystemPrompt } from "./drink-info-prompt.js";
import { buildVenueMatchPrompt } from "./venue-prompt.js";

export interface OpenAIResponsesClient {
  responses: {
    parse(
      request: Record<string, unknown>,
      options?: { timeout?: number },
    ): Promise<{ output_parsed: unknown }>;
  };
}

export interface OpenAIModelProviderOptions {
  apiKey: string;
  model: string;
  client?: OpenAIResponsesClient;
}

export class OpenAIModelProvider implements ModelProvider, DrinkInfoProvider {
  readonly id = "openai";
  private readonly client: OpenAIResponsesClient;
  private readonly model: string;

  constructor(options: OpenAIModelProviderOptions) {
    this.model = options.model.trim();
    if (!this.model) throw new Error("OpenAI model name is required");
    if (!options.client && !options.apiKey.trim()) throw new Error("OpenAI API key is required");
    this.client = options.client ?? (new OpenAI({
      apiKey: options.apiKey,
      maxRetries: 1,
    }) as unknown as OpenAIResponsesClient);
  }

  async selectVenueItem(request: VenueModelRequest): Promise<ModelProviderResult> {
    if (request.allowedItems.length === 0) throw new Error("No allowed menu items were provided");
    const startedAt = performance.now();
    const prompt = buildVenueMatchPrompt(request);
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 1_200,
      input: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      text: {
        verbosity: "low",
        format: zodTextFormat(matchSelectionSchemaFor(prompt.allowedIds), "venue_match_selection"),
      },
    }, { timeout: request.timeoutMs });

    const selection = modelMatchSelectionSchema.strict().parse(response.output_parsed);
    return {
      selection,
      metadata: {
        provider: this.id,
        model: this.model,
        attempt: 1,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  }

  async suggestDrinkInfo(request: DrinkInfoModelRequest): Promise<DrinkInfoResult> {
    const startedAt = performance.now();
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content: drinkInfoSystemPrompt(),
        },
        {
          role: "user",
          content: JSON.stringify({
            name: request.name,
            description: request.description,
            ingredients: request.ingredients,
          }),
        },
      ],
      text: {
        verbosity: "low",
        format: zodTextFormat(drinkInfoSuggestionSchema, "drink_info_suggestion"),
      },
    }, { timeout: request.timeoutMs });

    const suggestion = drinkInfoSuggestionSchema.strict().parse(response.output_parsed);
    return {
      suggestion,
      metadata: {
        provider: this.id,
        model: this.model,
        attempt: 1,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  }
}
