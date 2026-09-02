import type { DrinkPhotoProvider, DrinkPhotoRequest, PreparedDrinkPhoto } from "./drink-photo.js";
import { applyMaskCutout } from "./drink-photo-mask.js";
import { firstOutputUrl, ReplicateClient } from "./replicate-client.js";

/**
 * GroundingDINO + SAM 2.1 (lang-segment-anything): a text prompt locates the
 * assembled drink semantically, replacing the local sidecar's geometric point
 * guesses, and SAM 2 produces the mask. Community model, so the version hash
 * is pinned.
 */
export const defaultReplicateSam2Model =
  "tmappdev/lang-segment-anything:891411c38a6ed2d44c004b7b9e44217df7a5b07848f29ddefd2e28bc7cbf93bc";

const cutoutTargets = [
  // Complete drinks and representative service vessels.
  "cocktail",
  "cocktail drink",
  "mixed drink",
  "mocktail",
  "cocktail glass",
  "martini glass",
  "coupe glass",
  "rocks glass",
  "highball glass",
  "wine glass",
  "champagne flute",
  "tiki mug",
  "ceramic mug",
  "copper mug",
  "cup",
  "mug",

  // Contents and broad garnish families keep this detector caption compact.
  "ice",
  "cocktail foam",
  "cocktail garnish",
  "fruit garnish",
  "citrus garnish",
  "herb garnish",
  "savory garnish",
  "spice garnish",
  "floral garnish",
  "dessert garnish",
  "decorated rim",

  // Important concrete instances from the broader families above.
  "cherry",
  "olive",
  "citrus wheel",
  "citrus wedge",
  "citrus peel",
  "fruit slice",
  "pineapple",
  "berries",
  "cucumber",
  "mint leaves",
  "herb sprig",
  "celery stalk",
  "edible flower",
  "cinnamon stick",
  "coffee beans",

  // Hardware and decorations intentionally served with the drink.
  "cocktail pick",
  "skewer",
  "swizzle stick",
  "drink stirrer",
  "straw",
  "cocktail umbrella",
] as const;

/**
 * LangSAM sends text through GroundingDINO before SAM 2, so this is a compact
 * comma-separated list of detectable object phrases rather than an LLM-style
 * instruction. Broad families cover the long tail of cocktail garnishes while
 * staying below the detector's caption limit in one paid prediction.
 */
export function buildReplicateSam2TextPrompt(): string {
  return cutoutTargets.join(",");
}

export interface ReplicateSam2DrinkPhotoProviderOptions {
  apiToken: string;
  model?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
}

/**
 * SAM 2 cutout on Replicate. The model returns a grayscale instance mask, not
 * a finished cutout, so post-processing (instance union, hole fill,
 * vessel-plus-garnish component filter, area sanity check, tight crop, alpha
 * compositing) runs here instead.
 */
export class ReplicateSam2DrinkPhotoProvider implements DrinkPhotoProvider {
  readonly id = "replicate-sam2";
  private readonly client: ReplicateClient;
  private readonly model: string;

  constructor(options: ReplicateSam2DrinkPhotoProviderOptions) {
    this.client = new ReplicateClient(options);
    this.model = options.model?.trim() || defaultReplicateSam2Model;
  }

  async prepareDrinkPhoto(request: DrinkPhotoRequest): Promise<PreparedDrinkPhoto> {
    const deadline = Date.now() + request.timeoutMs;
    const extension = request.image.contentType.split("/")[1] ?? "png";
    const imageUrl = await this.client.uploadFile(
      request.image.bytes,
      request.image.contentType,
      `drink.${extension}`,
      deadline,
    );
    const prediction = await this.client.runModel(
      this.model,
      { image: imageUrl, text_prompt: buildReplicateSam2TextPrompt() },
      deadline,
    );
    const maskBytes = await this.client.download(firstOutputUrl(prediction), deadline);
    const bytes = await applyMaskCutout(request.image.bytes, maskBytes);
    return { bytes, contentType: "image/png", backgroundRemoved: true };
  }
}
