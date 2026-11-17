import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { products } from "../../scripts/seed-data.mjs";

const dir = join(process.cwd(), "scripts", "seed-images");
const credits = JSON.parse(readFileSync(join(dir, "credits.json"), "utf8")) as Record<string, Record<string, string>>;
const parts = (products as unknown[][]).map((p) => String(p[2]));
const FREE_LICENCES = /^(CC0|Public domain|CC BY(-SA)? [1-4]\.[05])$/;

describe("sample listing images", () => {
  it("every sample listing has exactly one image file and one credits entry", () => {
    expect(Object.keys(credits).sort()).toEqual([...parts].sort());
    for (const part of parts) expect(existsSync(join(dir, `${part}.jpg`)), part).toBe(true);
  });

  it("every third-party photo names its author, a free licence and its source page", () => {
    const photos = Object.entries(credits).filter(([, c]) => c.kind === "photo");
    expect(photos.length).toBeGreaterThan(0);
    for (const [part, c] of photos) {
      expect(c.author, part).toBeTruthy();
      expect(c.author, part).not.toBe("Unknown");
      expect(c.license, part).toMatch(FREE_LICENCES);
      expect(c.source_url, part).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(c.license_url, part).toMatch(/^https?:\/\//);
    }
  });

  it("everything else is a drawing made for this project", () => {
    for (const c of Object.values(credits)) expect(["photo", "drawing"]).toContain(c.kind);
  });

  it("the files carry no metadata", async () => {
    for (const part of parts) {
      const meta = await sharp(join(dir, `${part}.jpg`)).metadata();
      expect(meta.exif, part).toBeUndefined();
      expect(meta.xmp, part).toBeUndefined();
    }
  });
});
