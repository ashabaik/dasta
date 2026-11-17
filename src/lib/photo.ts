import sharp from "sharp";

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const MAX_PHOTOS_PER_PRODUCT = 4;

/**
 * Turns an uploaded photo into a clean WebP. Only the pixels survive: EXIF, GPS position, camera
 * serial, embedded thumbnail and colour-profile comments are not copied (sharp drops metadata unless
 * asked to keep it), and the original file name is never used.
 */
export async function reencodePhoto(input: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate() // apply the camera's orientation, then forget it
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
