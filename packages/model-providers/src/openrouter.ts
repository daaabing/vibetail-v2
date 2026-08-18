import { drinkInfoSuggestionSchema, matchSelectionSchemaFor, modelMatchSelectionSchema } from "@vibetail/contracts";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
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

// Keep the gateway URL inside this adapter so domain and UI code stay vendor-neutral.
const openRouterBaseUrl = "https://openrouter.ai/api/v1";

export interface OpenRouterChatClient {
  chat: {
    completions: {
      parse(
        request: Record<string, unknown>,
        options?: { timeout?: number },
      ): Promise<{
        choices: Array<{ message: { parsed?: unknown; refusal?: string | null } }>;
      }>;
    };
  };
}

export interface OpenRouterModelProviderOptions {
  apiKey: string;
  model: string;
  siteUrl?: string;
  client?: OpenRouterChatClient;
}

export class OpenRouterModelProvider implements ModelProvider, DrinkInfoProvider {
  readonly id = "openrouter";
  private readonly client: OpenRouterChatClient;
  private readonly model: string;

  constructor(options: OpenRouterModelProviderOptions) {
    this.model = options.model.trim();
    if (!this.model) throw new Error("OpenRouter model name is required");
    if (!options.client && !options.apiKey.trim()) throw new Error("OpenRouter API key is required");
    const defaultHeaders: Record<string, string> = { "X-OpenRouter-Title": "Vibetail" };
    if (options.siteUrl) defaultHeaders["HTTP-Referer"] = options.siteUrl;
    this.client = options.client ?? (new OpenAI({
      apiKey: options.apiKey,
      baseURL: openRouterBaseUrl,
      defaultHeaders,
      maxRetries: 1,
    }) as unknown as OpenRouterChatClient);
  }

  async selectVenueItem(request: VenueModelRequest): Promise<ModelProviderResult> {
    if (request.allowedItems.length === 0) throw new Error("No allowed menu items were provided");
    const startedAt = performance.now();
    const prompt = buildVenueMatchPrompt(request);
    const response = await this.client.chat.completions.parse({
      model: this.model,
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      max_completion_tokens: 1_200,
      // The scoring rules in the prompt need room to be applied; "minimal"
      // reduced this to a first-plausible-pick scan.
      reasoning: {
        effort: "low",
        exclude: true,
      },
      response_format: zodResponseFormat(
        matchSelectionSchemaFor(prompt.allowedIds),
        "venue_match_selection",
      ),
      provider: {
        require_parameters: true,
        data_collection: "deny",
      },
    }, { timeout: request.timeoutMs });

    const message = response.choices[0]?.message;
    if (!message?.parsed) {
      throw new Error(message?.refusal ? "OpenRouter model refused the match request" : "OpenRouter returned no parsed match");
    }
    const selection = modelMatchSelectionSchema.strict().parse(message.parsed);
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
    const response = await this.client.chat.completions.parse({
      model: this.model,
      messages: [
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
      max_completion_tokens: 800,
      reasoning: {
        effort: "minimal",
        exclude: true,
      },
      response_format: zodResponseFormat(
        drinkInfoSuggestionSchema.strict(),
        "drink_info_suggestion",
      ),
      provider: {
        require_parameters: true,
        data_collection: "deny",
      },
    }, { timeout: request.timeoutMs });

    const message = response.choices[0]?.message;
    if (!message?.parsed) {
      throw new Error(message?.refusal ? "OpenRouter model refused the drink info request" : "OpenRouter returned no parsed drink info");
    }
    const suggestion = drinkInfoSuggestionSchema.strict().parse(message.parsed);
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
