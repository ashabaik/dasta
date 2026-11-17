import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { products } from "../../scripts/seed-data.mjs";

const dir = join(process.cwd(), "scripts", "seed-images");
const credits = JSON.parse(readFileSync(join(dir, "credits.json"), "utf8")) as Record<string, Record<string, string>>;
const images = (products as { img: string; code: string }[]).map((p) => p.img);

describe("sample listing photographs", () => {
  it("every sample listing has one photograph and one credits entry", () => {
    expect(new Set(images).size).toBe(images.length);
    for (const img of images) {
      expect(existsSync(join(dir, `${img}.jpg`)), img).toBe(true);
      expect(credits[img], img).toBeTruthy();
    }
  });

  it("the folder holds photographs of listings only: no drawings, no leftovers", () => {
    const files = readdirSync(dir).filter((f) => f.endsWith(".jpg")).map((f) => f.replace(/\.jpg$/, ""));
    expect(files.sort()).toEqual([...images].sort());
  });

  it("every photograph names a licence that allows commercial use and its source page", () => {
    for (const [name, c] of Object.entries(credits)) {
      expect(c.licence, name).toBe("Unsplash Licence");
      expect(c.source_url, name).toMatch(/^https:\/\/unsplash\.com\/photos\//);
    }
  });

  it("the files carry no metadata", async () => {
    for (const img of images) {
      const meta = await sharp(join(dir, `${img}.jpg`)).metadata();
      expect(meta.exif, img).toBeUndefined();
      expect(meta.xmp, img).toBeUndefined();
    }
  });
});
