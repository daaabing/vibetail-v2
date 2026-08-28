import type { DrinkPhotoProvider, DrinkPhotoRequest, PreparedDrinkPhoto } from "./drink-photo.js";
import { firstOutputUrl, ReplicateClient } from "./replicate-client.js";

/** Bria RMBG 2.0 — pixel-mask removal with soft alpha, official model (no version hash, no cold boots). */
export const defaultReplicateCutoutModel = "bria/remove-background";

export interface ReplicateDrinkPhotoProviderOptions {
  apiToken: string;
  /**
   * "owner/name" runs an official model; "owner/name:versionhash" runs a
   * community model version through the generic predictions endpoint.
   */
  model?: string;
  fetchImpl?: typeof fetch;
  pollIntervalMs?: number;
}

/**
 * Runs a dedicated background-removal model on Replicate. The model returns
 * the finished transparent PNG directly, so no client-side compositing.
 */
export class ReplicateDrinkPhotoProvider implements DrinkPhotoProvider {
  readonly id = "replicate";
  private readonly client: ReplicateClient;
  private readonly model: string;

  constructor(options: ReplicateDrinkPhotoProviderOptions) {
    this.client = new ReplicateClient(options);
    this.model = options.model?.trim() || defaultReplicateCutoutModel;
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
    const prediction = await this.client.runModel(this.model, { image: imageUrl }, deadline);
    const bytes = await this.client.download(firstOutputUrl(prediction), deadline);
    return { bytes, contentType: "image/png", backgroundRemoved: true };
  }
}
