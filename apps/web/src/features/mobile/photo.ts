/**
 * Camera photos land here as multi-megabyte HEIC-converted JPEGs; resize to
 * something IndexedDB can hold hundreds of. Drawing through an <img> keeps
 * Safari applying the EXIF orientation for us.
 */
const MAX_EDGE = 1280;
const QUALITY = 0.82;

export async function compressPhoto(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolvePromise) =>
      canvas.toBlob(resolvePromise, "image/jpeg", QUALITY),
    );
    return blob ?? file;
  } catch {
    // An undecodable image still gets logged at full size rather than lost.
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolvePromise, reject) => {
    const image = new Image();
    image.onload = () => resolvePromise(image);
    image.onerror = () => reject(new Error("Could not decode photo"));
    image.src = url;
  });
}
