import type { DrinkPhotoProvider, DrinkPhotoRequest, PreparedDrinkPhoto } from "./drink-photo.js";

export interface Sam2DrinkPhotoProviderOptions {
  /** Local SAM 2 sidecar base URL, e.g. http://127.0.0.1:8091 */
  baseUrl: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Cocktail-oriented SAM 2 prompt (geometric, not generative text).
 * SAM 2 segments from clicks/boxes — we bias toward the drink glass
 * and ask the sidecar to reject table/fruit/props masks.
 */
export function buildSam2CocktailPrompt(itemName: string, description: string | null): {
  strategy: "cocktail_auto";
  positivePointNorm: { x: number; y: number };
  multimask: boolean;
  fillHoles: boolean;
  closeRadius: number;
  keepLargestComponent: boolean;
  subjectHint: string;
  instructions: string;
} {
  const hint = [itemName.trim(), description?.trim()].filter(Boolean).join(" — ");
  return {
    strategy: "cocktail_auto",
    positivePointNorm: { x: 0.58, y: 0.52 },
    multimask: true,
    fillHoles: true,
    closeRadius: 5,
    keepLargestComponent: true,
    subjectHint: hint || "cocktail glass",
    instructions: [
      "Segment ONLY the cocktail glass (liquid, ice, garnish attached to the glass).",
      "Prefer a solid drink silhouette; fill holes inside the glass (ice must stay opaque).",
      "Do NOT include table, slate, loose fruit, orange, lime, hands, menu paper, or background.",
      "Return an RGBA PNG of the original subject pixels with transparent background.",
      "Do not redraw, restyle, or invent text.",
    ].join(" "),
  };
}

/** Calls the local free SAM 2 sidecar — no DashScope billing. */
export class Sam2DrinkPhotoProvider implements DrinkPhotoProvider {
  readonly id = "sam2";
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: Sam2DrinkPhotoProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.model = options.model ?? "sam2.1_hiera_small";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async prepareDrinkPhoto(request: DrinkPhotoRequest): Promise<PreparedDrinkPhoto> {
    const prompt = buildSam2CocktailPrompt(request.name, request.description);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/v1/cutout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: Buffer.from(request.image.bytes).toString("base64"),
          contentType: request.image.contentType,
          model: this.model,
          prompt,
          traceId: request.traceId,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`SAM 2 cutout failed (${response.status}): ${await response.text()}`);
      }
      const json = (await response.json()) as { imageBase64?: string; model?: string };
      if (!json.imageBase64) throw new Error("SAM 2 cutout returned no image");
      return {
        bytes: Uint8Array.from(Buffer.from(json.imageBase64, "base64")),
        contentType: "image/png",
        backgroundRemoved: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
