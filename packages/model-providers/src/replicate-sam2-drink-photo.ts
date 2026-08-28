import type { DrinkPhotoProvider, DrinkPhotoRequest, PreparedDrinkPhoto } from "./drink-photo.js";
import { applyMaskCutout } from "./drink-photo-mask.js";
import { firstOutputUrl, ReplicateClient } from "./replicate-client.js";

/**
 * GroundingDINO + SAM 2.1 (lang-segment-anything): a text prompt locates the
 * glass semantically, replacing the local sidecar's geometric point guesses,
 * and SAM 2 produces the mask. Community model, so the version hash is pinned.
 */
export const defaultReplicateSam2Model =
  "tmappdev/lang-segment-anything:891411c38a6ed2d44c004b7b9e44217df7a5b07848f29ddefd2e28bc7cbf93bc";

const cutoutTextPrompt = "cocktail glass";

export interface ReplicateSam2DrinkPhotoProviderOptions {
  apiToken: string;
  model?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
}

/**
 * SAM 2 cutout on Replicate. The model returns a binary mask, not a finished
 * cutout, so the sidecar's post-processing (hole fill, largest component,
 * area sanity check, tight crop, alpha compositing) runs here instead.
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
      { image: imageUrl, text_prompt: cutoutTextPrompt },
      deadline,
    );
    const maskBytes = await this.client.download(firstOutputUrl(prediction), deadline);
    const bytes = await applyMaskCutout(request.image.bytes, maskBytes);
    return { bytes, contentType: "image/png", backgroundRemoved: true };
  }
}
