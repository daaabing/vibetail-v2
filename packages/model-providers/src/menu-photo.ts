import {
  drinkInputSchema,
  menuPhotoScanResultSchema,
  type DrinkInput,
  type MenuPhotoScanResult,
} from "@vibetail/contracts";
import OpenAI from "openai";
import { zodResponseFormat, zodTextFormat } from "openai/helpers/zod";

const scannedMenuSchema = menuPhotoScanResultSchema.omit({ provider: true });
type ScannedMenu = Omit<MenuPhotoScanResult, "provider">;

export interface MenuPhotoScanRequest {
  image: { bytes: Uint8Array; contentType: "image/png" | "image/jpeg" | "image/webp" };
  fileName?: string;
  traceId: string;
  timeoutMs: number;
}

export interface MenuUrlScanRequest {
  sourceUrl: string;
  traceId: string;
  timeoutMs: number;
}

export interface MenuPhotoScanProvider {
  readonly id: string;
  scanMenuPhoto(request: MenuPhotoScanRequest): Promise<ScannedMenu>;
  scanMenuUrl(request: MenuUrlScanRequest): Promise<ScannedMenu>;
}

export class DeterministicMenuPhotoScanProvider implements MenuPhotoScanProvider {
  readonly id = "deterministic";

  async scanMenuPhoto(request: MenuPhotoScanRequest): Promise<ScannedMenu> {
    void request;
    return scannedMenuSchema.parse({
      suggestedMenuName: "Imported drinks",
      drinks: [
        draft({
          name: "Garden Highball",
          description: "A bright highball with citrus and herbs.",
          price: "$15",
          ingredients: ["gin", "citrus", "soda", "herbs"],
          flavorTags: ["citrusy", "herbal", "fresh"],
          baseSpirit: "gin",
          strength: "light",
          recommendationNote: "For guests looking for something tall, bright, and refreshing.",
        }),
        draft({
          name: "Night Market Old Fashioned",
          description: "A spirit-forward pour with warm spice and bitters.",
          price: "$18",
          ingredients: ["rye whiskey", "spiced syrup", "bitters"],
          flavorTags: ["rich", "spicy", "aromatic"],
          baseSpirit: "whiskey",
          strength: "strong",
          recommendationNote: "For guests who want a slow, spirit-forward drink.",
        }),
        draft({
          name: "Zero Proof Spritz",
          description: "A crisp alcohol-free spritz with grapefruit and tonic.",
          price: "$12",
          ingredients: ["grapefruit", "tonic", "rosemary"],
          flavorTags: ["bitter", "citrusy", "herbal"],
          baseSpirit: "none",
          strength: "zero",
          recommendationNote: "For guests who want a grown-up, alcohol-free aperitif.",
        }),
      ],
    });
  }

  async scanMenuUrl(request: MenuUrlScanRequest): Promise<ScannedMenu> {
    const scanned = await this.scanMenuPhoto({
      image: { bytes: new Uint8Array([1]), contentType: "image/png" },
      traceId: request.traceId,
      timeoutMs: request.timeoutMs,
    });
    return { ...scanned, suggestedMenuName: "Imported from web" };
  }
}

export interface OpenRouterMenuPhotoScanProviderOptions {
  apiKey: string;
  model: string;
  siteUrl?: string;
}

export class OpenRouterMenuPhotoScanProvider implements MenuPhotoScanProvider {
  readonly id = "openrouter";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenRouterMenuPhotoScanProviderOptions) {
    this.model = options.model.trim();
    if (!this.model || !options.apiKey.trim()) throw new Error("OpenRouter menu scan configuration is required");
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "X-OpenRouter-Title": "Vibetail",
        ...(options.siteUrl ? { "HTTP-Referer": options.siteUrl } : {}),
      },
      maxRetries: 1,
    });
  }

  async scanMenuPhoto(request: MenuPhotoScanRequest): Promise<ScannedMenu> {
    const imageUrl = dataUrl(request.image.bytes, request.image.contentType);
    const response = await this.client.chat.completions.parse({
      model: this.model,
      messages: [
        { role: "system", content: MENU_PHOTO_PROMPT },
        { role: "user", content: [
          { type: "text", text: "Extract only beverage items from this menu photo, especially cocktails and mocktails." },
          { type: "image_url", image_url: { url: imageUrl } },
        ] },
      ],
      max_completion_tokens: 4_000,
      response_format: zodResponseFormat(scannedMenuSchema, "scanned_drink_menu"),
    }, { timeout: request.timeoutMs });
    return scannedMenuSchema.parse(response.choices[0]?.message.parsed);
  }

  async scanMenuUrl(request: MenuUrlScanRequest): Promise<ScannedMenu> {
    const menuText = await fetchMenuText(request.sourceUrl, request.timeoutMs);
    const response = await this.client.chat.completions.parse({
      model: this.model,
      messages: [
        { role: "system", content: MENU_PHOTO_PROMPT },
        { role: "user", content: `Extract every beverage item from this fetched public menu page:\n\n${menuText}` },
      ],
      max_completion_tokens: 4_000,
      response_format: zodResponseFormat(scannedMenuSchema, "fetched_drink_menu"),
    }, { timeout: request.timeoutMs });
    return scannedMenuSchema.parse(response.choices[0]?.message.parsed);
  }
}

export interface OpenAIMenuPhotoScanProviderOptions {
  apiKey: string;
  model: string;
}

export class OpenAIMenuPhotoScanProvider implements MenuPhotoScanProvider {
  readonly id = "openai";
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIMenuPhotoScanProviderOptions) {
    this.model = options.model.trim();
    if (!this.model || !options.apiKey.trim()) throw new Error("OpenAI menu scan configuration is required");
    this.client = new OpenAI({ apiKey: options.apiKey, maxRetries: 1 });
  }

  async scanMenuPhoto(request: MenuPhotoScanRequest): Promise<ScannedMenu> {
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      input: [
        { role: "system", content: MENU_PHOTO_PROMPT },
        { role: "user", content: [
          { type: "input_text", text: "Extract every drink from this menu photo." },
          { type: "input_image", image_url: dataUrl(request.image.bytes, request.image.contentType), detail: "high" },
        ] },
      ],
      max_output_tokens: 4_000,
      text: { format: zodTextFormat(scannedMenuSchema, "scanned_drink_menu") },
    }, { timeout: request.timeoutMs });
    return scannedMenuSchema.parse(response.output_parsed);
  }

  async scanMenuUrl(request: MenuUrlScanRequest): Promise<ScannedMenu> {
    const menuText = await fetchMenuText(request.sourceUrl, request.timeoutMs);
    const response = await this.client.responses.parse({
      model: this.model,
      store: false,
      input: [
        { role: "system", content: MENU_PHOTO_PROMPT },
        { role: "user", content: `Extract every beverage item from this fetched public menu page:\n\n${menuText}` },
      ],
      max_output_tokens: 4_000,
      text: { format: zodTextFormat(scannedMenuSchema, "fetched_drink_menu") },
    }, { timeout: request.timeoutMs });
    return scannedMenuSchema.parse(response.output_parsed);
  }
}

const MENU_PHOTO_PROMPT = `You extract a venue's complete beverage menu from one photo.
Return every actual beverage item as an editable draft, especially cocktails and mocktails.
Include beer, wine, spirits, shots, non-alcoholic drinks, coffee, tea, soda, and other beverages when they are listed as menu items.
Exclude food, dishes, section headings, descriptive prose without a beverage, and decorative text.
Preserve printed names, descriptions, prices, ingredients, and allergens exactly when visible.
Infer flavorTags, baseSpirit, strength, and recommendationNote conservatively from visible facts.
Use null when a fact is not visible and cannot be safely inferred. Never invent an image URL.
suggestedMenuName should use the printed menu title, or "Imported menu" when no title is visible.`;

function dataUrl(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function fetchMenuText(sourceUrl: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(sourceUrl, {
      headers: {
        accept: "text/html, application/xhtml+xml, text/plain;q=0.9",
        "user-agent": "Vibetail menu importer/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Menu page fetch failed (${response.status})`);
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/(html|xhtml|text\/plain)/i.test(contentType)) {
      throw new Error("Menu URL did not return a readable webpage");
    }
    const html = await response.text();
    const text = htmlToText(html).slice(0, 30_000);
    if (!text) throw new Error("Menu page contained no readable text");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function htmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function draft(input: Partial<DrinkInput> & Pick<DrinkInput, "name">): DrinkInput {
  return drinkInputSchema.parse({
    description: null,
    price: null,
    imageUrl: null,
    ingredients: [],
    flavorTags: [],
    allergens: [],
    baseSpirit: null,
    strength: null,
    recommendationNote: null,
    ...input,
  });
}
