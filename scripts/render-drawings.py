"""Renders the drawings from draw-parts.py into scripts/seed-images/ as JPEG files.

Each drawing is scaled and centred so the part fills the frame. Needs Python with Playwright and Pillow
(development tooling only; the app does not use this script).

    python scripts/draw-parts.py <svg-dir>
    python scripts/render-drawings.py <svg-dir> scripts/seed-images
"""
import io
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

svg_dir, out_dir = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out_dir.mkdir(parents=True, exist_ok=True)
FIT = """() => {
  const g = document.getElementById('content');
  const b = g.getBBox();
  const W = 1200, H = 900;
  const s = Math.min((W * 0.84) / b.width, (H * 0.78) / b.height, 1.8);
  const tx = W / 2 - (b.x + b.width / 2) * s;
  const ty = H / 2 - (b.y + b.height / 2) * s + 6;
  g.setAttribute('transform', `translate(${tx} ${ty}) scale(${s})`);
}"""
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 900})
    for f in sorted(svg_dir.glob("*.svg")):
        page.goto(f.resolve().as_uri())
        page.evaluate(FIT)
        png = page.screenshot()
        Image.open(io.BytesIO(png)).convert("RGB").save(out_dir / f"{f.stem}.jpg", quality=90)
        print("rendered", f.stem)
    browser.close()
