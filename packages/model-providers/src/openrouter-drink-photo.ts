import type { DrinkPhotoProvider, DrinkPhotoRequest, PreparedDrinkPhoto } from "./drink-photo.js";

// Keep the gateway URL inside this adapter so domain and UI code stay vendor-neutral.
const openRouterImagesUrl = "https://openrouter.ai/api/v1/images";

export const defaultOpenRouterCutoutModel = "openai/gpt-5-image-mini";

export interface OpenRouterDrinkPhotoProviderOptions {
  apiKey: string;
  /** Image-edit model that supports background=transparent, e.g. openai/gpt-5-image-mini. */
  model?: string;
  siteUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Generative edit, unlike SAM 2's pixel mask: the model redraws the cutout, so
 * the prompt must pin the subject to the source photo and forbid invention.
 */
export function buildOpenRouterCutoutPrompt(itemName: string, description: string | null): string {
  const hint = [itemName.trim(), description?.trim()].filter(Boolean).join(" — ");
  return [
    `Remove the background from this photo of a drink (${hint || "cocktail glass"}).`,
    "Keep only the drink vessel with its liquid, ice, and any garnish attached to the vessel,",
    "exactly as they appear in the source photo — same shape, colors, and label or glass text.",
    "Exclude the table, props, loose fruit, hands, menus, and every other background element.",
    "Output the subject on a fully transparent background.",
    "Do not restyle the drink, add elements, or invent text.",
  ].join(" ");
}

/** Calls OpenRouter's unified Image API for a transparent-background cutout. */
export class OpenRouterDrinkPhotoProvider implements DrinkPhotoProvider {
  readonly id = "openrouter";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly siteUrl: string | undefined;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenRouterDrinkPhotoProviderOptions) {
    if (!options.apiKey.trim()) throw new Error("OpenRouter API key is required");
    this.apiKey = options.apiKey;
    this.model = options.model?.trim() || defaultOpenRouterCutoutModel;
    this.siteUrl = options.siteUrl;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async prepareDrinkPhoto(request: DrinkPhotoRequest): Promise<PreparedDrinkPhoto> {
    const sourceDataUrl = `data:${request.image.contentType};base64,${Buffer.from(request.image.bytes).toString("base64")}`;
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.apiKey}`,
      "content-type": "application/json",
      "X-OpenRouter-Title": "Vibetail",
    };
    if (this.siteUrl) headers["HTTP-Referer"] = this.siteUrl;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.fetchImpl(openRouterImagesUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.model,
          prompt: buildOpenRouterCutoutPrompt(request.name, request.description),
          input_references: [{ type: "image_url", image_url: { url: sourceDataUrl } }],
          background: "transparent",
          output_format: "png",
          n: 1,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`OpenRouter image cutout failed (${response.status}): ${await response.text()}`);
      }
      const json = (await response.json()) as { data?: Array<{ b64_json?: string }> };
      const encoded = json.data?.[0]?.b64_json;
      if (!encoded) throw new Error("OpenRouter image cutout returned no image");
      return {
        bytes: Uint8Array.from(Buffer.from(encoded, "base64")),
        contentType: "image/png",
        backgroundRemoved: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
