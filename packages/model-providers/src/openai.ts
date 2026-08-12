import { modelMatchSelectionSchema } from "@vibetail/contracts";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ModelProvider, ModelProviderResult, RestaurantModelRequest } from "./index.js";
import { restaurantMatchSystemPrompt } from "./restaurant-prompt.js";

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

export class OpenAIModelProvider implements ModelProvider {
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

  async selectRestaurantItem(request: RestaurantModelRequest): Promise<ModelProviderResult> {
    if (request.allowedItems.length === 0) throw new Error("No allowed menu items were provided");
    const startedAt = performance.now();
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 500,
      input: [
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
      text: {
        verbosity: "low",
        format: zodTextFormat(modelMatchSelectionSchema, "restaurant_match_selection"),
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
}
