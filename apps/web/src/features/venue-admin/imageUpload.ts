import type { VenueImageContentType } from "@vibetail/contracts";

const ALLOWED = new Set<VenueImageContentType>(["image/png", "image/jpeg", "image/webp"]);
export const MAX_VENUE_IMAGE_BYTES = 8_000_000;

export async function readVenueImage(file: File): Promise<{
  imageBase64: string;
  imageContentType: VenueImageContentType;
}> {
  if (!ALLOWED.has(file.type as VenueImageContentType)) {
    throw new Error("Choose a PNG, JPEG, or WebP image.");
  }
  if (file.size > MAX_VENUE_IMAGE_BYTES) {
    throw new Error("Choose an image under 8 MB.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("The image could not be read.");
  return {
    imageBase64: dataUrl.slice(comma + 1),
    imageContentType: file.type as VenueImageContentType,
  };
}
