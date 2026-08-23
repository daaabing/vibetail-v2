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
