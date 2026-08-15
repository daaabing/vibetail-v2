import sharp from "sharp";

export async function removeChromaKey(bytes: Uint8Array, key = "#00ff00"): Promise<Uint8Array> {
  const target = hexToRgb(key);
  const tolerance = 48;
  const feather = 80;
  const { data, info } = await sharp(Buffer.from(bytes)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    const distance = Math.sqrt(
      (data[index]! - target[0]) ** 2
      + (data[index + 1]! - target[1]) ** 2
      + (data[index + 2]! - target[2]) ** 2,
    );
    if (distance <= tolerance) {
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
      data[index + 3] = 0;
    } else if (distance < tolerance + feather) {
      data[index + 3] = Math.round(data[index + 3]! * ((distance - tolerance) / feather));
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

function hexToRgb(value: string): [number, number, number] {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#00ff00";
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}
