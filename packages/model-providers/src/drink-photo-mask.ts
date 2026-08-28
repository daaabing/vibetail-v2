import sharp from "sharp";

/**
 * Turns a segmentation mask into a transparent-background cutout, mirroring
 * the local SAM 2 sidecar's post-processing: threshold, fill internal holes
 * (ice and liquid must stay opaque), keep the largest connected component
 * (drop stray fruit blobs), sanity-check the silhouette area, then apply the
 * mask as the alpha channel and crop tight around the subject.
 */
export async function applyMaskCutout(imageBytes: Uint8Array, maskBytes: Uint8Array): Promise<Uint8Array> {
  // Render EXIF rotation into the pixels FIRST: metadata() on a pending
  // .rotate() pipeline reports pre-rotation dimensions, which would swap
  // width/height for portrait phone photos. Cap the working resolution so
  // the flood fills below stay bounded in memory and time.
  const rotatedPng = await sharp(Buffer.from(imageBytes))
    .rotate()
    .resize(4096, 4096, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const { width, height } = await sharp(rotatedPng).metadata();
  if (!width || !height) throw new Error("Drink photo has no readable dimensions");

  const maskRaw = await sharp(Buffer.from(maskBytes))
    .resize(width, height, { kernel: "nearest", fit: "fill" })
    .extractChannel(0)
    .raw()
    .toBuffer();
  const mask = new Uint8Array(maskRaw.length);
  for (let i = 0; i < maskRaw.length; i += 1) mask[i] = maskRaw[i]! >= 128 ? 1 : 0;

  // Fill holes before dropping components: a straw or finger can bisect the
  // silhouette, and filling first reconnects it instead of losing one half.
  const scratch = new Int32Array(mask.length);
  fillHoles(mask, width, height, scratch);
  keepLargestComponent(mask, width, scratch);

  let area = 0;
  for (let i = 0; i < mask.length; i += 1) area += mask[i]!;
  const fraction = area / (width * height);
  if (fraction < 0.02 || fraction > 0.7) {
    throw new Error(`Mask covers ${(fraction * 100).toFixed(1)}% of the photo — not a usable drink silhouette`);
  }

  const box = tightBox(mask, width, height);
  const alpha = Buffer.alloc(box.width * box.height);
  for (let y = 0; y < box.height; y += 1) {
    for (let x = 0; x < box.width; x += 1) {
      alpha[y * box.width + x] = mask[(box.top + y) * width + (box.left + x)]! * 255;
    }
  }

  // Two sharp passes: removeAlpha and joinChannel run at fixed pipeline
  // stages regardless of call order, so joining alpha must happen alone.
  const cropped = await sharp(rotatedPng).extract(box).removeAlpha().png().toBuffer();
  const cutout = await sharp(cropped)
    .joinChannel(alpha, { raw: { width: box.width, height: box.height, channels: 1 } })
    .png()
    .toBuffer();
  return new Uint8Array(cutout);
}

/** Flood-fills background from the borders; anything unreached is a hole. */
function fillHoles(mask: Uint8Array, width: number, height: number, queue: Int32Array): void {
  const exterior = new Uint8Array(mask.length);
  let head = 0;
  let tail = 0;
  const seed = (index: number) => {
    if (mask[index] === 0 && exterior[index] === 0) {
      exterior[index] = 1;
      queue[tail] = index;
      tail += 1;
    }
  };
  for (let x = 0; x < width; x += 1) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    seed(y * width);
    seed(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head]!;
    head += 1;
    const x = index % width;
    if (x > 0) seed(index - 1);
    if (x < width - 1) seed(index + 1);
    if (index >= width) seed(index - width);
    if (index < mask.length - width) seed(index + width);
  }
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 0 && exterior[i] === 0) mask[i] = 1;
  }
}

function keepLargestComponent(mask: Uint8Array, width: number, queue: Int32Array): void {
  const labels = new Int32Array(mask.length);
  let bestLabel = 0;
  let bestSize = 0;
  let label = 0;
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || labels[start] !== 0) continue;
    label += 1;
    labels[start] = label;
    queue[0] = start;
    let head = 0;
    let tail = 1;
    let size = 0;
    while (head < tail) {
      const index = queue[head]!;
      head += 1;
      size += 1;
      const x = index % width;
      const visit = (next: number) => {
        if (mask[next] === 1 && labels[next] === 0) {
          labels[next] = label;
          queue[tail] = next;
          tail += 1;
        }
      };
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (index >= width) visit(index - width);
      if (index < mask.length - width) visit(index + width);
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = label;
    }
  }
  if (bestLabel === 0) return;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === 1 && labels[i] !== bestLabel) mask[i] = 0;
  }
}

function tightBox(
  mask: Uint8Array,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const padX = Math.round((maxX - minX + 1) * 0.03);
  const padY = Math.round((maxY - minY + 1) * 0.03);
  const left = Math.max(0, minX - padX);
  const top = Math.max(0, minY - padY);
  return {
    left,
    top,
    width: Math.min(width, maxX + 1 + padX) - left,
    height: Math.min(height, maxY + 1 + padY) - top,
  };
}
