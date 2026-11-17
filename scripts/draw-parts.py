"""Draws the illustrations used for sample listings that have no freely licensed photo.

Every drawing here was made for this project (no third-party artwork, no brand marks).
Output: one SVG per part number in the folder given as the first argument.

    python scripts/draw-parts.py <out-dir>
"""
import pathlib
import sys

W, H = 1200, 900
STEEL, DSTEEL, BLACK, BLUE, CAST = "#b4bcc4", "#727c86", "#2c3137", "#3d5a78", "#5c656e"
BRASS, RUBBER, RED, ALU, ORANGE, PU = "#c8a24c", "#24272b", "#bf3b2c", "#cfd4d9", "#d9480f", "#2f6fa8"


def mix(color, f):
    """f < 1 darkens, f > 1 lightens."""
    r, g, b = (int(color[i:i + 2], 16) for i in (1, 3, 5))
    if f <= 1:
        r, g, b = (int(c * f) for c in (r, g, b))
    else:
        r, g, b = (int(c + (255 - c) * min(f - 1, 1)) for c in (r, g, b))
    return f"#{r:02x}{g:02x}{b:02x}"


class Scene:
    def __init__(self):
        self.defs, self.items, self.cache = [], [], {}

    def grad(self, color, axis):
        """Metal-like gradient. axis 'y': bands run top to bottom (for a horizontal cylinder)."""
        key = (color, axis)
        if key not in self.cache:
            gid = f"g{len(self.cache)}"
            x2, y2 = ("0", "1") if axis == "y" else ("1", "0")
            stops = [(0, 0.62), (0.18, 1.38), (0.42, 1.0), (0.78, 0.72), (1, 0.5)] if axis in ("x", "y") else [(0, 1.18), (1, 0.82)]
            if axis == "flat":
                x2, y2 = "0", "1"
            s = "".join(f'<stop offset="{o}" stop-color="{mix(color, f)}"/>' for o, f in stops)
            self.defs.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>')
            self.cache[key] = gid
        return f"url(#{self.cache[key]})"

    def add(self, s):
        self.items.append(s)

    # ---- primitives ----
    def shadow(self, cx, cy, rx, ry=26):
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#000" opacity="0.16" filter="url(#blur)"/>')

    def hcyl(self, x, y, w, h, color, face=True, left=True):
        """Cylinder lying along x. (x, y) is the top-left of its body."""
        rx = h * 0.16
        if left:
            self.add(f'<ellipse cx="{x}" cy="{y + h / 2}" rx="{rx}" ry="{h / 2}" fill="{mix(color, 0.55)}"/>')
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{self.grad(color, "y")}"/>')
        if face:
            self.add(f'<ellipse cx="{x + w}" cy="{y + h / 2}" rx="{rx}" ry="{h / 2}" fill="{self.grad(color, "flat")}" stroke="{mix(color, 0.6)}" stroke-width="1.5"/>')

    def vcyl(self, x, y, w, h, color, top=True):
        """Cylinder standing along y. (x, y) is the top-left of its body."""
        ry = w * 0.16
        self.add(f'<ellipse cx="{x + w / 2}" cy="{y + h}" rx="{w / 2}" ry="{ry}" fill="{mix(color, 0.5)}"/>')
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{self.grad(color, "x")}"/>')
        if top:
            self.add(f'<ellipse cx="{x + w / 2}" cy="{y}" rx="{w / 2}" ry="{ry}" fill="{self.grad(color, "flat")}" stroke="{mix(color, 0.6)}" stroke-width="1.5"/>')

    def box(self, x, y, w, h, d, color):
        """Block seen from the front, slightly from above and from the right. (x, y) = front top-left."""
        dy = d * 0.5
        self.add(f'<polygon points="{x},{y} {x + d},{y - dy} {x + w + d},{y - dy} {x + w},{y}" fill="{mix(color, 1.28)}" stroke="{mix(color, 0.6)}" stroke-width="1.2"/>')
        self.add(f'<polygon points="{x + w},{y} {x + w + d},{y - dy} {x + w + d},{y + h - dy} {x + w},{y + h}" fill="{mix(color, 0.68)}" stroke="{mix(color, 0.5)}" stroke-width="1.2"/>')
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{self.grad(color, "flat")}" stroke="{mix(color, 0.55)}" stroke-width="1.2"/>')

    def hole(self, cx, cy, rx, ry=None, rim=STEEL):
        ry = ry or rx
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx * 1.22}" ry="{ry * 1.22}" fill="{mix(rim, 1.15)}" stroke="{mix(rim, 0.55)}" stroke-width="1.5"/>')
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="#15181b"/>')
        self.add(f'<ellipse cx="{cx - rx * 0.12}" cy="{cy + ry * 0.2}" rx="{rx * 0.7}" ry="{ry * 0.7}" fill="#2b3035"/>')

    def bolt(self, cx, cy, r, color=DSTEEL):
        import math
        pts = " ".join(f"{cx + r * math.cos(math.radians(a)):.1f},{cy + r * math.sin(math.radians(a)):.1f}" for a in range(0, 360, 60))
        self.add(f'<polygon points="{pts}" fill="{mix(color, 1.2)}" stroke="{mix(color, 0.5)}" stroke-width="1.5"/>')
        self.add(f'<circle cx="{cx}" cy="{cy}" r="{r * 0.5}" fill="{mix(color, 0.8)}"/>')

    def hexnut(self, x, y, w, h, color=STEEL):
        """Hexagon nut seen from the side, on a horizontal axis."""
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{self.grad(color, "y")}" stroke="{mix(color, 0.55)}" stroke-width="1.2"/>')
        for f in (0.27, 0.73):
            self.add(f'<line x1="{x}" y1="{y + h * f}" x2="{x + w}" y2="{y + h * f}" stroke="{mix(color, 0.6)}" stroke-width="1.5"/>')

    def ribs(self, x, y, w, h, n, color="#000", vertical=True, opacity=0.28):
        for i in range(1, n):
            if vertical:
                px = x + w * i / n
                self.add(f'<line x1="{px}" y1="{y}" x2="{px}" y2="{y + h}" stroke="{color}" stroke-width="2" opacity="{opacity}"/>')
            else:
                py = y + h * i / n
                self.add(f'<line x1="{x}" y1="{py}" x2="{x + w}" y2="{py}" stroke="{color}" stroke-width="2" opacity="{opacity}"/>')

    def ring(self, cx, cy, r, t, color, squash=1.0):
        """Ring seen from above (squash < 1 tilts it)."""
        self.add(f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r * squash}" fill="none" stroke="{mix(color, 0.7)}" stroke-width="{t}"/>')
        self.add(f'<ellipse cx="{cx}" cy="{cy - t * 0.12}" rx="{r}" ry="{r * squash}" fill="none" stroke="{color}" stroke-width="{t * 0.72}"/>')
        self.add(f'<path d="M {cx - r * 0.72} {cy - r * squash * 0.72} A {r} {r * squash} 0 0 1 {cx + r * 0.3} {cy - r * squash * 0.96}" fill="none" stroke="{mix(color, 1.6)}" stroke-width="{max(2, t * 0.16)}" stroke-linecap="round" opacity="0.75"/>')

    def hose(self, d, width, color=RUBBER):
        self.add(f'<path d="{d}" fill="none" stroke="{mix(color, 0.6)}" stroke-width="{width}" stroke-linecap="round"/>')
        self.add(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width * 0.84}" stroke-linecap="round"/>')
        self.add(f'<path d="{d}" fill="none" stroke="#fff" stroke-width="{width * 0.12}" stroke-linecap="round" opacity="0.22" transform="translate(0,{-width * 0.2})"/>')

    def plate(self, x, y, w, h):
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="3" fill="#dfe3e6" stroke="#8b949c" stroke-width="1.2"/>')
        for i in (0.3, 0.52, 0.74):
            self.add(f'<line x1="{x + w * 0.1}" y1="{y + h * i}" x2="{x + w * (0.9 if i < 0.7 else 0.6)}" y2="{y + h * i}" stroke="#9aa3ab" stroke-width="2"/>')

    def svg(self):
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
            '<defs><radialGradient id="bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#f7f5f0"/><stop offset="1" stop-color="#dcd8cd"/></radialGradient>'
            '<filter id="blur" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="16"/></filter>'
            + "".join(self.defs) + "</defs>"
            f'<rect width="{W}" height="{H}" fill="url(#bg)"/><g id="content">' + "".join(self.items) + "</g></svg>"
        )


# ---------------------------------------------------------------------------------------------------
# Parts
# ---------------------------------------------------------------------------------------------------
def gear_pump(s, scale=1.0, color=BLUE):
    k = scale
    cx, by = 620, 640
    s.shadow(cx, by + 20, 330 * k)
    bw, bh, d = 330 * k, 250 * k, 150 * k
    x, y = cx - bw / 2, by - bh
    s.hcyl(x - 215 * k, y + bh * 0.5 - 30 * k, 190 * k, 60 * k, STEEL)           # shaft
    s.add(f'<rect x="{x - 200 * k}" y="{y + bh * 0.5 - 8 * k}" width="{90 * k}" height="{16 * k}" fill="{mix(STEEL, 0.55)}"/>')  # keyway
    s.box(x - 44 * k, y - 34 * k, 44 * k, bh + 68 * k, d, CAST)                    # mounting flange
    s.box(x, y, bw, bh, d, color)                                                  # body
    for gy in (0.34, 0.66):                                                        # the two gear chambers
        s.add(f'<circle cx="{x + bw * 0.5}" cy="{y + bh * gy}" r="{bh * 0.24}" fill="none" stroke="{mix(color, 0.6)}" stroke-width="3" opacity="0.7"/>')
    for bx, byy in ((0.1, 0.1), (0.9, 0.1), (0.1, 0.9), (0.9, 0.9)):
        s.bolt(x + bw * bx, y + bh * byy, 13 * k)
    s.hole(x + bw * 0.5 + d * 0.55, y - d * 0.27, 30 * k, 16 * k)                  # port on top
    s.plate(x + bw * 0.3, y + bh * 0.44, bw * 0.4, bh * 0.14)


def piston_pump(s):
    s.shadow(610, 690, 400)
    s.hcyl(170, 430, 180, 70, STEEL)                                               # splined shaft
    s.ribs(180, 430, 120, 70, 8, vertical=False, opacity=0.35)
    s.box(330, 330, 46, 290, 150, CAST)                                            # square flange
    s.hcyl(376, 350, 430, 250, BLACK, face=False, left=False)                      # round body
    s.box(806, 320, 150, 300, 150, CAST)                                           # rear cover with ports
    s.hole(881, 420, 34)
    s.hole(881, 530, 34)
    s.box(470, 250, 220, 100, 110, CAST)                                           # displacement control
    s.hcyl(690, 270, 90, 44, STEEL)
    s.hexnut(700, 262, 34, 60)
    s.plate(500, 440, 180, 70)
    for bx, by in ((352, 350), (352, 600)):
        s.bolt(bx, by, 13)


def hand_pump(s):
    s.shadow(600, 730, 380)
    s.box(250, 560, 620, 130, 200, BLUE)                                           # reservoir
    s.vcyl(380, 360, 110, 200, STEEL)                                              # pump barrel
    s.vcyl(410, 280, 50, 90, mix(STEEL, 1.15))                                     # piston rod
    s.add(f'<g transform="rotate(-24 430 290)"><rect x="330" y="268" width="620" height="40" rx="18" fill="{s.grad(BLACK, "y")}"/>'
          f'<rect x="760" y="262" width="200" height="52" rx="24" fill="{s.grad(ORANGE, "y")}"/></g>')   # lever with grip
    s.add(f'<circle cx="430" cy="290" r="20" fill="{mix(STEEL, 0.8)}" stroke="{mix(STEEL, 0.5)}" stroke-width="2"/>')
    s.hcyl(700, 500, 120, 56, CAST)                                                # outlet block
    s.hole(823, 528, 16, 22)
    s.vcyl(600, 500, 46, 60, BRASS)                                                # release valve
    s.add(f'<circle cx="623" cy="498" r="34" fill="{mix(BLACK, 1.1)}" stroke="#111" stroke-width="2"/>')
    s.plate(300, 600, 170, 60)


def solenoid_valve(s, coils=2, electronics=False):
    s.shadow(600, 700, 430 if coils == 2 else 340)
    bx, by, bw, bh, d = 450, 470, 300, 170, 150
    s.box(bx - 30, by + bh, bw + 60, 40, d, CAST)                                  # sub-plate
    if coils == 2:
        s.hcyl(bx - 210, by + 26, 210, 118, BLACK, face=False)                     # left coil
        s.hexnut(bx - 246, by + 50, 40, 70)
        s.box(bx - 160, by - 44, 96, 70, 60, mix(BLACK, 1.3))                      # connector
    s.box(bx, by, bw, bh, d, STEEL)                                                # valve body
    s.hcyl(bx + bw, by + 26, 210, 118, BLACK)                                      # right coil
    s.hexnut(bx + bw + 216, by + 50, 40, 70)
    s.box(bx + bw + 60, by - 44, 96, 70, 60, mix(BLACK, 1.3))
    for px in (0.2, 0.8):
        s.bolt(bx + bw * px + d * 0.5, by - d * 0.25, 14)
    s.plate(bx + 80, by + 55, 140, 60)
    if electronics:
        s.box(bx + 20, by - 150, 240, 96, 120, mix(BLACK, 1.2))                    # on-board electronics
        s.add(f'<circle cx="{bx + 140}" cy="{by - 102}" r="26" fill="{mix(STEEL, 0.9)}" stroke="#111" stroke-width="2"/>')
        for a in range(4):
            s.add(f'<circle cx="{bx + 128 + (a % 2) * 24}" cy="{by - 114 + (a // 2) * 24}" r="4" fill="#111"/>')


def relief_valve(s):
    s.shadow(600, 720, 300)
    s.box(430, 500, 300, 190, 150, STEEL)                                          # body
    s.hole(520, 600, 30)
    s.hole(640, 600, 30)
    s.vcyl(545, 350, 110, 150, CAST)                                               # spring housing
    s.add(f'<rect x="530" y="330" width="140" height="36" fill="{s.grad(STEEL, "x")}" stroke="{mix(STEEL, 0.5)}" stroke-width="1.2"/>')   # lock nut
    s.ribs(530, 330, 140, 36, 6)
    s.vcyl(572, 250, 56, 84, mix(STEEL, 1.1))                                      # adjusting screw
    s.ribs(572, 250, 56, 84, 9, vertical=False)
    s.vcyl(552, 196, 96, 58, ORANGE)                                               # knob
    s.ribs(552, 196, 96, 58, 10)
    s.plate(450, 520, 120, 44)


def plunger_cylinder(s):
    s.shadow(600, 770, 260)
    s.box(430, 720, 300, 40, 200, CAST)                                            # base
    s.vcyl(470, 330, 260, 400, BLACK)                                              # barrel
    s.add(f'<rect x="462" y="320" width="276" height="44" fill="{s.grad(CAST, "x")}" stroke="{mix(CAST, 0.5)}" stroke-width="1.2"/>')     # gland
    s.vcyl(520, 130, 160, 196, mix(STEEL, 1.12))                                   # plunger
    s.vcyl(500, 110, 200, 26, CAST)                                                # head plate
    s.hcyl(730, 640, 70, 50, STEEL)                                                # port
    s.hole(803, 665, 13, 20)
    s.plate(540, 500, 120, 60)


def telescopic_cylinder(s):
    s.shadow(610, 640, 480)
    s.hcyl(120, 380, 330, 210, BLACK, face=False)                                  # outer stage
    s.add(f'<rect x="436" y="370" width="30" height="230" fill="{s.grad(CAST, "y")}"/>')
    s.hcyl(466, 404, 250, 162, mix(STEEL, 1.05), face=False, left=False)           # stage 2
    s.add(f'<rect x="702" y="396" width="26" height="178" fill="{s.grad(CAST, "y")}"/>')
    s.hcyl(728, 426, 200, 118, mix(STEEL, 1.12), face=False, left=False)           # stage 3
    s.add(f'<rect x="914" y="418" width="24" height="134" fill="{s.grad(CAST, "y")}"/>')
    s.hcyl(938, 448, 110, 74, mix(STEEL, 1.2), left=False)                         # last stage
    s.add(f'<circle cx="1080" cy="485" r="52" fill="{s.grad(CAST, "flat")}" stroke="{mix(CAST, 0.5)}" stroke-width="2"/>')   # eye
    s.hole(1080, 485, 20)
    s.hcyl(86, 440, 40, 90, CAST)                                                  # trunnion
    s.hole(250, 372, 22, 9)


def seal_kit(s):
    s.shadow(600, 720, 420, 30)
    s.ring(430, 470, 210, 40, PU, 0.42)            # piston seal
    s.ring(430, 500, 150, 20, RUBBER, 0.42)        # o-ring
    s.ring(790, 420, 150, 34, RED, 0.42)           # rod seal
    s.ring(790, 440, 104, 14, RUBBER, 0.42)
    s.ring(690, 610, 120, 26, "#d8d2c2", 0.42)     # guide ring
    s.ring(940, 610, 86, 22, PU, 0.42)             # wiper
    s.ring(330, 650, 70, 12, RUBBER, 0.42)
    s.ring(510, 680, 54, 10, RUBBER, 0.42)


def oring_box(s):
    s.shadow(600, 740, 440, 30)
    x, y, w, h = 200, 250, 800, 440
    s.add(f'<rect x="{x - 14}" y="{y - 14}" width="{w + 28}" height="{h + 28}" rx="18" fill="{s.grad(BLUE, "flat")}" stroke="{mix(BLUE, 0.5)}" stroke-width="2"/>')
    s.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{mix(BLUE, 0.62)}"/>')
    cols, rows = 6, 4
    for r in range(rows):
        for c in range(cols):
            cx, cy = x + w * (c + 0.5) / cols, y + h * (r + 0.5) / rows
            s.add(f'<rect x="{cx - w / cols / 2 + 5}" y="{cy - h / rows / 2 + 5}" width="{w / cols - 10}" height="{h / rows - 10}" rx="6" fill="{mix(BLUE, 0.8)}"/>')
            size = 14 + (r * cols + c) * 1.25
            for off in (0, 5):
                s.ring(cx + off, cy + off * 0.6, size, 5 + size * 0.07, RUBBER, 0.9)


def rod_seal(s):
    s.shadow(600, 730, 330, 30)
    s.ring(600, 480, 290, 86, PU, 0.46)
    s.add(f'<ellipse cx="600" cy="468" rx="290" ry="{290 * 0.46}" fill="none" stroke="{mix(PU, 0.62)}" stroke-width="5"/>')   # lip groove
    s.add(f'<ellipse cx="600" cy="474" rx="258" ry="{258 * 0.46}" fill="none" stroke="{mix(PU, 1.3)}" stroke-width="4" opacity="0.7"/>')


def hose_assembly(s):
    s.shadow(600, 760, 430, 28)
    path = "M 250 640 C 250 230, 620 160, 640 430 S 950 720, 960 330"
    s.hose(path, 62)
    for (x, y, rot) in ((250, 640, 90), (960, 330, -88)):
        s.add(f'<g transform="rotate({rot} {x} {y})">')
        s.hcyl(x - 10, y - 40, 120, 80, STEEL, face=False, left=False)              # ferrule
        s.ribs(x - 10, y - 40, 120, 80, 7)
        s.hexnut(x + 110, y - 48, 62, 96, mix(STEEL, 1.1))                          # swivel nut
        s.hcyl(x + 172, y - 26, 44, 52, mix(STEEL, 1.15))
        s.add("</g>")


def quick_coupling(s):
    s.shadow(600, 640, 450)
    # socket (left)
    s.hcyl(150, 400, 90, 120, STEEL, face=False)
    s.hexnut(240, 386, 70, 148)
    s.hcyl(310, 380, 200, 160, mix(STEEL, 1.08), face=False, left=False)            # sliding sleeve
    s.ribs(330, 380, 160, 160, 12)
    s.hcyl(510, 400, 40, 120, STEEL, left=False)
    s.hole(552, 460, 13, 40)
    # plug (right)
    s.hcyl(670, 424, 110, 72, mix(STEEL, 1.15), left=True)
    s.add(f'<rect x="700" y="418" width="26" height="84" fill="{mix(STEEL, 0.6)}"/>')   # locking groove
    s.hexnut(780, 386, 80, 148)
    s.hcyl(860, 400, 150, 120, STEEL, left=False)
    s.ribs(880, 400, 120, 120, 10, opacity=0.2)


def tube_fittings(s):
    s.shadow(600, 730, 450, 30)

    def one(x, y, k):
        s.hcyl(x, y + 14 * k, 60 * k, 52 * k, STEEL, face=False)
        s.hexnut(x + 60 * k, y, 66 * k, 80 * k, mix(STEEL, 1.1))
        s.hexnut(x + 126 * k, y - 8 * k, 78 * k, 96 * k)
        s.hexnut(x + 204 * k, y, 66 * k, 80 * k, mix(STEEL, 1.1))
        s.hcyl(x + 270 * k, y + 14 * k, 60 * k, 52 * k, STEEL)

    for i, (x, y) in enumerate(((150, 250), (640, 250), (150, 440), (640, 440), (395, 620))):
        one(x, y, 1.15)


def pillow_block(s):
    s.shadow(600, 730, 420)
    s.box(210, 640, 720, 60, 160, CAST)                                            # base
    for px in (300, 840):
        s.add(f'<ellipse cx="{px + 80}" cy="610" rx="46" ry="15" fill="#15181b"/>')    # slots
        s.bolt(px + 80, 606, 20, STEEL)
    s.add(f'<path d="M 380 660 L 380 470 A 220 220 0 0 1 820 470 L 820 660 Z" fill="{s.grad(CAST, "flat")}" stroke="{mix(CAST, 0.5)}" stroke-width="2"/>')
    s.add(f'<path d="M 820 470 A 220 220 0 0 0 800 380 L 880 340 A 230 230 0 0 1 900 440 L 900 620 L 820 660 Z" fill="{mix(CAST, 0.68)}" stroke="{mix(CAST, 0.5)}" stroke-width="2"/>')
    s.add(f'<circle cx="600" cy="470" r="150" fill="{s.grad(STEEL, "flat")}" stroke="{mix(STEEL, 0.5)}" stroke-width="2"/>')   # insert
    s.add(f'<circle cx="600" cy="470" r="118" fill="{mix(BLACK, 1.2)}"/>')                                                # seal
    s.add(f'<circle cx="600" cy="470" r="96" fill="{s.grad(STEEL, "x")}" stroke="{mix(STEEL, 0.5)}" stroke-width="2"/>')        # inner ring
    s.hole(600, 470, 62)
    s.vcyl(586, 222, 28, 34, BRASS)                                                # grease nipple
    for a in (-1, 1):
        s.bolt(600 + a * 86, 470 - 64, 9, mix(STEEL, 0.8))                         # set screws


def jaw_coupling(s, ox=0, oy=0, k=1.0):
    if not ox:
        s.shadow(600, 660, 360)
    x, y = 300 * k + ox, 330 * k + oy
    s.hcyl(x, y, 220 * k, 260 * k, ALU, face=False)                                # hub 1
    s.hole(x + 2, y + 130 * k, 12 * k, 44 * k, ALU)
    sx = x + 220 * k
    s.add(f'<rect x="{sx}" y="{y + 6 * k}" width="{100 * k}" height="{248 * k}" fill="{s.grad(RED, "y")}"/>')   # spider
    for i in range(1, 6):
        yy = y + 6 * k + 248 * k * i / 6
        s.add(f'<line x1="{sx}" y1="{yy}" x2="{sx + 100 * k}" y2="{yy}" stroke="{mix(RED, 0.55)}" stroke-width="{3 * k}"/>')
    for i in (0, 2, 4):                                                            # jaws reaching into the spider
        yy = y + 6 * k + 248 * k * i / 6
        s.add(f'<rect x="{sx}" y="{yy + 4 * k}" width="{56 * k}" height="{248 * k / 6 - 8 * k}" fill="{mix(ALU, 0.86)}" opacity="0.96"/>')
        s.add(f'<rect x="{sx + 44 * k}" y="{yy + 248 * k / 6 + 4 * k}" width="{56 * k}" height="{248 * k / 6 - 8 * k}" fill="{mix(ALU, 1.1)}" opacity="0.96"/>')
    s.hcyl(sx + 100 * k, y, 220 * k, 260 * k, ALU, left=False)                     # hub 2
    s.hole(sx + 320 * k, y + 130 * k, 15 * k, 50 * k, ALU)
    s.bolt(x + 110 * k, y + 20 * k, 11 * k, DSTEEL)


def bell_housing(s):
    s.shadow(600, 720, 440)
    # bell: a cone between two flanges
    s.add(f'<ellipse cx="250" cy="450" rx="60" ry="240" fill="{mix(ALU, 0.6)}"/>')
    s.add(f'<polygon points="250,210 620,290 620,610 250,690" fill="{s.grad(ALU, "y")}" stroke="{mix(ALU, 0.55)}" stroke-width="2"/>')
    s.add(f'<rect x="232" y="196" width="36" height="508" rx="6" fill="{s.grad(ALU, "y")}" stroke="{mix(ALU, 0.55)}" stroke-width="1.5"/>')     # motor flange
    s.add(f'<rect x="604" y="276" width="34" height="348" rx="6" fill="{s.grad(ALU, "y")}" stroke="{mix(ALU, 0.55)}" stroke-width="1.5"/>')     # pump flange
    s.add(f'<ellipse cx="638" cy="450" rx="44" ry="174" fill="{s.grad(ALU, "flat")}" stroke="{mix(ALU, 0.55)}" stroke-width="2"/>')
    s.hole(640, 450, 22, 88, ALU)
    s.add(f'<rect x="370" y="400" width="140" height="100" rx="14" fill="#1b1e22" stroke="{mix(ALU, 0.5)}" stroke-width="3"/>')                 # inspection window
    for by in (230, 670):
        s.bolt(250, by, 12)
    jaw_coupling(s, ox=560, oy=250, k=0.62)
    s.shadow(930, 640, 150, 18)


def pressure_filter(s):
    s.shadow(600, 800, 230)
    s.box(420, 200, 320, 130, 160, STEEL)                                          # head
    s.hole(470, 265, 26)
    s.add(f'<ellipse cx="820" cy="230" rx="14" ry="26" fill="#15181b"/>')
    s.vcyl(660, 110, 70, 60, CAST)                                                 # clogging indicator
    s.add(f'<ellipse cx="695" cy="110" rx="26" ry="9" fill="{ORANGE}"/>')
    s.add(f'<rect x="470" y="330" width="250" height="34" fill="{s.grad(CAST, "x")}" stroke="{mix(CAST, 0.5)}" stroke-width="1.2"/>')    # collar
    s.ribs(470, 330, 250, 34, 12)
    s.vcyl(485, 364, 220, 360, BLACK, top=False)                                   # bowl
    s.add(f'<rect x="545" y="724" width="100" height="44" fill="{s.grad(STEEL, "x")}" stroke="{mix(STEEL, 0.5)}" stroke-width="1.2"/>')   # hexagon at the bottom
    s.ribs(545, 724, 100, 44, 3)
    s.plate(530, 470, 130, 70)


def worm_gearbox(s):
    s.shadow(600, 730, 380)
    s.box(330, 690, 500, 40, 220, CAST)                                            # feet
    s.hcyl(150, 560, 200, 70, STEEL)                                               # input shaft (worm)
    s.add(f'<rect x="170" y="586" width="100" height="18" fill="{mix(STEEL, 0.55)}"/>')
    s.box(350, 330, 440, 360, 220, BLUE)                                           # housing
    s.ribs(350, 330, 440, 70, 11, color=mix(BLUE, 0.5), opacity=0.8)               # cooling fins
    s.add(f'<circle cx="570" cy="520" r="128" fill="{s.grad(CAST, "flat")}" stroke="{mix(CAST, 0.5)}" stroke-width="2"/>')   # output cover
    for a in range(6):
        import math
        s.bolt(570 + 104 * math.cos(math.radians(a * 60 + 30)), 520 + 104 * math.sin(math.radians(a * 60 + 30)), 11, STEEL)
    s.hole(570, 520, 52)                                                           # hollow output shaft
    s.add('<rect x="560" y="462" width="20" height="16" fill="#15181b"/>')         # keyway
    s.vcyl(700, 268, 44, 36, BRASS)                                                # breather plug
    s.plate(380, 420, 110, 50)


PARTS = {
    "HP-GP-0163": lambda s: gear_pump(s, 1.0, BLUE),
    "HP-GP-0080": lambda s: gear_pump(s, 0.8, CAST),
    "HP-AP-0450": piston_pump,
    "HP-HP-0025": hand_pump,
    "HV-DC-4306": lambda s: solenoid_valve(s, 2),
    "HV-PF-0606": lambda s: solenoid_valve(s, 1, electronics=True),
    "HV-PR-1010": relief_valve,
    "HC-SA-8030": plunger_cylinder,
    "HC-TC-3120": telescopic_cylinder,
    "HS-CK-6336": seal_kit,
    "HS-OR-0382": oring_box,
    "HS-RS-3646": rod_seal,
    "HH-2S-1220": hose_assembly,
    "HH-QC-0012": quick_coupling,
    "HH-TF-1210": tube_fittings,
    "MB-PB-0040": pillow_block,
    "MT-JC-2838": jaw_coupling,
    "MT-WG-6330": worm_gearbox,
    "MT-BH-1012": bell_housing,
    "HF-PF-0020": pressure_filter,
}

if __name__ == "__main__":
    out = pathlib.Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for part, draw in PARTS.items():
        scene = Scene()
        draw(scene)
        (out / f"{part}.svg").write_text(scene.svg(), encoding="utf-8")
    print(f"{len(PARTS)} drawings written to {out}")
