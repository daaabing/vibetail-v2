export interface DrinkPhotoRequest {
  name: string;
  description: string | null;
  image: { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" };
  traceId: string;
  timeoutMs: number;
}

export interface PreparedDrinkPhoto {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  backgroundRemoved: boolean;
}

export interface DrinkPhotoProvider {
  readonly id: string;
  prepareDrinkPhoto(request: DrinkPhotoRequest): Promise<PreparedDrinkPhoto>;
}

/** Local fallback keeps the uploaded photo intact. It never claims AI background removal. */
export class OriginalDrinkPhotoProvider implements DrinkPhotoProvider {
  readonly id = "original";

  async prepareDrinkPhoto(request: DrinkPhotoRequest): Promise<PreparedDrinkPhoto> {
    return {
      bytes: Uint8Array.from(request.image.bytes),
      contentType: request.image.contentType,
      backgroundRemoved: false,
    };
  }
}

export interface AlibabaDrinkPhotoProviderOptions {
  apiKey: string;
  model?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

/** Provider adapter: isolate the photographed drink on a chroma key, then turn that key transparent. */
export class AlibabaDrinkPhotoProvider implements DrinkPhotoProvider {
  readonly id = "alibaba";
  private readonly model: string;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: AlibabaDrinkPhotoProviderOptions) {
    this.model = options.model ?? "qwen-image-3.0";
    this.endpoint = normalizeEndpoint(options.endpoint);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async prepareDrinkPhoto(request: DrinkPhotoRequest): Promise<PreparedDrinkPhoto> {
    const { removeChromaKey } = await import("./chroma-key.js");
    const key = "#00ff00";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${this.options.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          input: { messages: [{ role: "user", content: [
            { image: dataUrl(request.image.bytes, request.image.contentType) },
            { text: cutoutPrompt(key) },
          ] }] },
          parameters: {
            n: 1,
            size: "1024*1024",
            prompt_extend: false,
            watermark: false,
            negative_prompt: "text, letters, words, caption, label, logo, watermark, menu, poster, collage, table, hands",
          },
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Alibaba image cutout failed (${response.status})`);
      const json = await response.json() as { output?: { choices?: Array<{ message?: { content?: Array<{ image?: string }> } }> } };
      const payload = json.output?.choices?.[0]?.message?.content?.find((entry) => entry.image)?.image;
      if (!payload) throw new Error("Alibaba image cutout returned no image");
      return {
        bytes: await removeChromaKey(await decodeImage(payload), key),
        contentType: "image/png",
        backgroundRemoved: true,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

function cutoutPrompt(key: string): string {
  return [
    "Background removal and product cutout only.",
    "Keep only the single cocktail glass, its liquid, ice, and garnish on the glass.",
    "Keep the original glass shape, colors, ice, and garnish. Do not redesign the drink.",
    `Replace everything else with a flat, uniform ${key} background with no shadow or gradient.`,
    "Center the glass with padding. Add no text, labels, logos, props, tables, or hands.",
  ].join(" ");
}

function dataUrl(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

function normalizeEndpoint(endpoint?: string): string {
  const fallback = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";
  if (!endpoint?.trim()) return fallback;
  const base = endpoint.trim().replace(/\/$/, "");
  if (base.includes("/services/aigc/")) return base;
  return `${base.endsWith("/api/v1") ? base : `${base}/api/v1`}/services/aigc/multimodal-generation/generation`;
}

async function decodeImage(payload: string): Promise<Uint8Array> {
  const match = payload.match(/^data:[^;]+;base64,(.+)$/s);
  if (match?.[1]) return Uint8Array.from(Buffer.from(match[1], "base64"));
  if (/^https?:\/\//i.test(payload)) {
    const response = await fetch(payload);
    if (!response.ok) throw new Error(`Failed to download cutout image (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }
  return Uint8Array.from(Buffer.from(payload, "base64"));
}
