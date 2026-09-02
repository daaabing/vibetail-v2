import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { applyMaskCutout } from "./drink-photo-mask.js";

async function solidImage(width: number, height: number): Promise<Uint8Array> {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: { r: 180, g: 40, b: 90 } } })
      .png()
      .toBuffer(),
  );
}

/** Builds a grayscale mask PNG from a 0/255 pixel matrix. */
async function maskImage(pixels: number[][], width: number, height: number): Promise<Uint8Array> {
  const raw = Buffer.alloc(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) raw[y * width + x] = pixels[y]![x]!;
  }
  return new Uint8Array(
    await sharp(raw, { raw: { width, height, channels: 1 } }).png().toBuffer(),
  );
}

function block(width: number, height: number, on: (x: number, y: number) => boolean): number[][] {
  return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => (on(x, y) ? 255 : 0)));
}

async function alphaGrid(cutout: Uint8Array): Promise<{ width: number; height: number; alpha: Buffer }> {
  const image = sharp(Buffer.from(cutout));
  const { width, height } = await image.metadata();
  return { width: width!, height: height!, alpha: await image.extractChannel(3).raw().toBuffer() };
}

describe("applyMaskCutout", () => {
  it("fills internal holes, applies the mask as alpha, and crops tight", async () => {
    // 20x20 image; subject is a 10x10 block at (5,5) with a 2x2 hole in the middle.
    const image = await solidImage(20, 20);
    const mask = await maskImage(
      block(20, 20, (x, y) => {
        const inBlock = x >= 5 && x < 15 && y >= 5 && y < 15;
        const inHole = x >= 9 && x < 11 && y >= 9 && y < 11;
        return inBlock && !inHole;
      }),
      20,
      20,
    );

    const cutout = await applyMaskCutout(image, mask);
    const { width, height, alpha } = await alphaGrid(cutout);

    // 10x10 subject + 3% padding rounds to 0 → tight 10x10 crop.
    expect(width).toBe(10);
    expect(height).toBe(10);
    // The hole (center of the crop) must be opaque — ice stays visible.
    expect(alpha[4 * width + 4]).toBe(255);
    // Corners of the block are opaque.
    expect(alpha[0]).toBe(255);
  });

  it("keeps the vessel while dropping a loose table prop", async () => {
    // Main 12x12 subject plus a stray 2x2 blob far away.
    const image = await solidImage(30, 30);
    const mask = await maskImage(
      block(30, 30, (x, y) => (x >= 4 && x < 16 && y >= 4 && y < 16) || (x >= 26 && x < 28 && y >= 26 && y < 28)),
      30,
      30,
    );

    const cutout = await applyMaskCutout(image, mask);
    const { width, height } = await alphaGrid(cutout);
    // Crop bounds cover only the 12x12 subject (3% pad ~ 0), not the stray blob.
    expect(width).toBeLessThanOrEqual(13);
    expect(height).toBeLessThanOrEqual(13);
  });

  it("preserves detached garnish, picks, and straws associated with the vessel", async () => {
    const image = await solidImage(40, 40);
    const mask = await maskImage(
      block(40, 40, (x, y) => {
        const vessel = x >= 10 && x < 30 && y >= 16 && y < 36;
        const straw = x >= 16 && x < 18 && y >= 3 && y < 14;
        const garnish = x >= 20 && x < 25 && y >= 8 && y < 14;
        const looseFruit = x >= 33 && x < 38 && y >= 31 && y < 36;
        return vessel || straw || garnish || looseFruit;
      }),
      40,
      40,
    );

    const cutout = await applyMaskCutout(image, mask);
    const { width, height, alpha } = await alphaGrid(cutout);

    // The upper accessories extend the crop well above the 20px-tall vessel.
    expect(height).toBeGreaterThan(30);
    // The loose fruit at the lower right must not widen the crop.
    expect(width).toBeLessThan(30);
    // At least one pixel near the crop top belongs to the preserved straw.
    expect(alpha.subarray(0, width * 3).some((value) => value === 255)).toBe(true);
  });

  it("unions low-valued grayscale garnish instances with the vessel", async () => {
    const image = await solidImage(40, 40);
    const mask = await maskImage(
      Array.from({ length: 40 }, (_, y) =>
        Array.from({ length: 40 }, (_, x) => {
          if (x >= 10 && x < 30 && y >= 16 && y < 36) return 253;
          if (x >= 16 && x < 18 && y >= 3 && y < 14) return 133;
          if (x >= 20 && x < 25 && y >= 8 && y < 14) return 107;
          return 0;
        }),
      ),
      40,
      40,
    );

    const cutout = await applyMaskCutout(image, mask);
    const { width, height, alpha } = await alphaGrid(cutout);

    expect(height).toBeGreaterThan(30);
    expect(alpha.subarray(0, width * 3).some((value) => value === 255)).toBe(true);
  });

  it("rejects masks that cover almost nothing", async () => {
    const image = await solidImage(30, 30);
    const mask = await maskImage(block(30, 30, (x, y) => x === 0 && y === 0), 30, 30);
    await expect(applyMaskCutout(image, mask)).rejects.toThrow(/not a usable drink silhouette/);
  });

  it("rejects masks that cover almost everything", async () => {
    const image = await solidImage(20, 20);
    const mask = await maskImage(block(20, 20, () => true), 20, 20);
    await expect(applyMaskCutout(image, mask)).rejects.toThrow(/not a usable drink silhouette/);
  });

  it("crops in the rotated frame for photos with EXIF orientation", async () => {
    // 30x20 landscape JPEG tagged orientation 6 → displays as 20x30 portrait.
    // The mask is authored in the displayed (portrait) frame.
    const image = new Uint8Array(
      await sharp({ create: { width: 30, height: 20, channels: 3, background: { r: 60, g: 60, b: 60 } } })
        .jpeg()
        .withMetadata({ orientation: 6 })
        .toBuffer(),
    );
    const mask = await maskImage(block(20, 30, (x, y) => x >= 5 && x < 15 && y >= 9 && y < 21), 20, 30);

    const cutout = await applyMaskCutout(image, mask);
    const { width, height } = await alphaGrid(cutout);
    expect(width).toBe(10);
    expect(height).toBe(12);
  });

  it("resizes a mask produced at a different resolution", async () => {
    // Image 40x40, mask 20x20 with a 10x10 block → scales to 20x20 subject.
    const image = await solidImage(40, 40);
    const mask = await maskImage(block(20, 20, (x, y) => x >= 5 && x < 15 && y >= 5 && y < 15), 20, 20);

    const cutout = await applyMaskCutout(image, mask);
    const { width, height } = await alphaGrid(cutout);
    expect(width).toBeGreaterThanOrEqual(20);
    expect(width).toBeLessThanOrEqual(22);
    expect(height).toBeGreaterThanOrEqual(20);
    expect(height).toBeLessThanOrEqual(22);
  });
});
