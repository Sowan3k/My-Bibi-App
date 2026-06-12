"""Generate My Bibi PWA icons — a soft heart on a dawn-gradient tile."""

import math
import os

from PIL import Image, ImageDraw

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "icons")

TOP = (253, 246, 236)      # cream
BOTTOM = (244, 167, 185)   # rose
HEART = (228, 77, 116)     # deep rose
HEART_SOFT = (255, 255, 255)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def heart_path(cx, cy, size):
    """Parametric heart curve points."""
    pts = []
    for i in range(0, 360, 2):
        t = math.radians(i)
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 16, cy - y * size / 16))
    return pts


def make_icon(px: int, path: str):
    s = 4  # supersample for smooth edges
    W = px * s
    img = Image.new("RGB", (W, W))
    d = ImageDraw.Draw(img)

    # Diagonal dawn gradient
    for y in range(W):
        d.line([(0, y), (W, y)], fill=lerp(TOP, BOTTOM, y / W))

    # Soft white glow heart behind
    glow = heart_path(W / 2, W / 2.05, W * 0.30)
    d.polygon(glow, fill=HEART_SOFT)

    # Main heart
    main = heart_path(W / 2, W / 2.02, W * 0.27)
    d.polygon(main, fill=HEART)

    # Rounded-square mask (maskable-safe: content well inside safe zone)
    mask = Image.new("L", (W, W), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, W, W], radius=int(W * 0.22), fill=255)
    out = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)

    out = out.resize((px, px), Image.LANCZOS)
    out.save(path, "PNG")
    print(f"wrote {path} ({px}x{px})")


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)
    make_icon(192, os.path.join(OUT_DIR, "icon-192.png"))
    make_icon(512, os.path.join(OUT_DIR, "icon-512.png"))
