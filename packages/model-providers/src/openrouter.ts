import { modelMatchSelectionSchema } from "@vibetail/contracts";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ModelProvider, ModelProviderResult, RestaurantModelRequest } from "./index.js";
import { restaurantMatchSystemPrompt } from "./restaurant-prompt.js";

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

export class OpenRouterModelProvider implements ModelProvider {
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

  async selectRestaurantItem(request: RestaurantModelRequest): Promise<ModelProviderResult> {
    if (request.allowedItems.length === 0) throw new Error("No allowed menu items were provided");
    const startedAt = performance.now();
    const response = await this.client.chat.completions.parse({
      model: this.model,
      messages: [
        {
          role: "system",
          content: restaurantMatchSystemPrompt(request.locale),
        },
        {
          role: "user",
          content: JSON.stringify({
            preferences: request.preferences,
            allowedItems: request.allowedItems,
          }),
        },
      ],
      max_tokens: 500,
      response_format: zodResponseFormat(
        modelMatchSelectionSchema.strict(),
        "restaurant_match_selection",
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
}
