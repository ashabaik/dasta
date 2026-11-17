import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { reencodePhoto } from "@/lib/photo";

// A photo taken on a phone carries the camera model, the owner's name and the GPS position.
// After re-encoding, none of it may be left in the file that buyers can download.
async function photoWithMetadata(): Promise<Buffer> {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 120, g: 130, b: 140 } } })
    .withExif({
      IFD0: { Make: "CanaryCam MKEXIFMAKE", Model: "MKEXIFMODEL", Artist: "MKEXIFOWNER Seller Name", Copyright: "MKEXIFCOPYRIGHT" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "30/1 2/1 39/1", GPSLongitudeRef: "E", GPSLongitude: "31/1 14/1 8/1" },
    })
    .jpeg()
    .toBuffer();
}

describe("photo re-encoding", () => {
  it("the test photo really contains metadata (control)", async () => {
    const input = await photoWithMetadata();
    const meta = await sharp(input).metadata();
    expect(meta.exif).toBeDefined();
    expect(input.includes("MKEXIFOWNER")).toBe(true);
  });

  it("removes EXIF, GPS and owner data", async () => {
    const out = await reencodePhoto(await photoWithMetadata());
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
    expect(meta.iptc).toBeUndefined();
    for (const marker of ["MKEXIF", "CanaryCam", "GPS", "Exif"]) expect(out.data.includes(marker)).toBe(false);
  });

  it("keeps the picture and caps its size", async () => {
    const big = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#888" } }).jpeg().toBuffer();
    const out = await reencodePhoto(big);
    expect(Math.max(out.width, out.height)).toBe(1400);
    expect(out.width / out.height).toBeCloseTo(4 / 3, 2);
  });

  it("rejects a file that is not an image", async () => {
    await expect(reencodePhoto(Buffer.from("this is not an image"))).rejects.toThrow();
  });
});
