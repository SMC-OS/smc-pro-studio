#!/usr/bin/env python3
"""Render the native icon and launch assets from the approved SMC Pro Studio mark.

Single source of truth: public/favicon.svg (512x512 viewBox: a charcoal tile
with three staggered stone slabs). Geometry is read from that file, so the
native assets can never drift from the approved identity. Everything is drawn
with 4x supersampling and downsampled with a Lanczos filter (no upscaling of
raster sources).

Outputs (overwrites the Capacitor template defaults):
  Android  mipmap-*/ic_launcher.png, ic_launcher_round.png  (API < 26)
           drawable/ic_launcher_foreground.xml               (adaptive + monochrome)
           values/ic_launcher_background.xml                 (adaptive background)
           drawable/splash_mark.xml                          (Android 12+ launch icon)
           drawable*/splash.png                              (legacy splash drawables)
  iOS      AppIcon.appiconset/AppIcon-512@2x.png             (1024 RGB, no alpha)
           Splash.imageset/splash-2732x2732*.png             (launch image)

Usage: python3 scripts/native/render-native-assets.py   (requires Pillow)
"""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SVG = (ROOT / "public/favicon.svg").read_text()
RES = ROOT / "android/app/src/main/res"
XCASSETS = ROOT / "ios/App/App/Assets.xcassets"

SURFACE = "#FBF9F5"  # Warm Architectural Atelier native surface
SS = 4  # supersampling factor

# --- Parse the approved mark -------------------------------------------------
rect = re.search(r'<rect[^>]*rx="(\d+)"[^>]*fill="(#[0-9a-fA-F]{6})"', SVG)
TILE_RADIUS = int(rect.group(1))
TILE_FILL = rect.group(2)
SLABS = [
    ([tuple(map(float, p.split(","))) for p in pts.split()], fill)
    for pts, fill in re.findall(r'<polygon points="([^"]+)" fill="(#[0-9a-fA-F]{6})"', SVG)
]
assert len(SLABS) == 3 and TILE_RADIUS > 0, "unexpected master SVG structure"


def hex_rgb(h: str) -> tuple[int, int, int]:
    return tuple(int(h[i : i + 2], 16) for i in (1, 3, 5))


# --- Raster helpers ------------------------------------------------------------
def draw_mark(size: int, *, shape: str, bleed: bool = False) -> Image.Image:
    """The mark at `size` px. shape: 'rounded' (approved tile), 'square'
    (full-bleed, for iOS which applies its own mask) or 'circle'."""
    big = size * SS
    img = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    k = big / 512
    if shape == "square":
        d.rectangle([0, 0, big, big], fill=hex_rgb(TILE_FILL))
    elif shape == "circle":
        d.ellipse([0, 0, big - 1, big - 1], fill=hex_rgb(TILE_FILL))
    else:
        d.rounded_rectangle([0, 0, big - 1, big - 1], radius=TILE_RADIUS * k, fill=hex_rgb(TILE_FILL))
    # Slabs: in the circle variant they are scaled so the group stays inside it.
    s, off = (0.86, 512 * 0.07) if shape == "circle" else (1.0, 0.0)
    for pts, fill in SLABS:
        d.polygon([((x * s + off) * k, (y * s + off) * k) for x, y in pts], fill=hex_rgb(fill))
    return img.resize((size, size), Image.LANCZOS)


def on_surface(width: int, height: int, mark_px: int) -> Image.Image:
    """Opaque launch image: the approved tile, centred, on the native surface."""
    canvas = Image.new("RGB", (width, height), hex_rgb(SURFACE))
    mark = draw_mark(mark_px, shape="rounded")
    canvas.paste(mark, ((width - mark_px) // 2, (height - mark_px) // 2), mark)
    return canvas


def save_png(img: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "PNG", optimize=True)
    print("wrote", path.relative_to(ROOT), img.size, img.mode)


# --- Vector drawables (Android) ------------------------------------------------
def slab_path(scale: float, ox: float, oy: float) -> str:
    out = []
    for pts, _ in SLABS:
        coords = [f"{x * scale + ox:.3f},{y * scale + oy:.3f}" for x, y in pts]
        out.append("M" + coords[0] + " L" + " L".join(coords[1:]) + " Z")
    return out


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)
    print("wrote", path.relative_to(ROOT))


def android() -> None:
    # Legacy launcher icons (API 24-25 use these; 26+ use the adaptive icon).
    for density, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        save_png(draw_mark(px, shape="rounded"), RES / f"mipmap-{density}/ic_launcher.png")
        save_png(draw_mark(px, shape="circle"), RES / f"mipmap-{density}/ic_launcher_round.png")
        stale = RES / f"mipmap-{density}/ic_launcher_foreground.png"
        if stale.exists():
            stale.unlink()  # replaced by the vector foreground below

    # Adaptive icon: 108dp canvas; the 512 tile maps onto the central 72dp
    # (the visible area), keeping the slab group well inside the 66dp safe zone.
    scale, off = 72 / 512, 18
    paths = slab_path(scale, off, off)
    fills = [f for _, f in SLABS]
    body = "\n".join(
        f'    <path android:fillColor="{fill.upper()}" android:pathData="{p}" />' for p, fill in zip(paths, fills)
    )
    write(RES / "drawable/ic_launcher_foreground.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/native/render-native-assets.py from public/favicon.svg. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
{body}
</vector>
""")
    mono = "\n".join(f'    <path android:fillColor="#FFFFFFFF" android:pathData="{p}" />' for p in paths)
    write(RES / "drawable/ic_launcher_monochrome.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<!-- Android 13+ themed icon: the slab silhouette, tinted by the launcher. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
{mono}
</vector>
""")
    stale_v24 = RES / "drawable-v24/ic_launcher_foreground.xml"
    if stale_v24.exists():
        stale_v24.unlink()
        if not any(stale_v24.parent.iterdir()):
            stale_v24.parent.rmdir()
    adaptive = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
    <monochrome android:drawable="@drawable/ic_launcher_monochrome"/>
</adaptive-icon>
"""
    write(RES / "mipmap-anydpi-v26/ic_launcher.xml", adaptive)
    write(RES / "mipmap-anydpi-v26/ic_launcher_round.xml", adaptive)
    write(RES / "values/ic_launcher_background.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">{TILE_FILL.upper()}</color>
</resources>
""")

    # Android 12+ launch icon (240dp, content inside the 160dp mask circle):
    # the approved tile at 100dp, centred — restrained, with generous space.
    t, o = 100, 70
    r = TILE_RADIUS * t / 512
    tile = (
        f"M{o + r:.3f},{o} H{o + t - r:.3f} A{r:.3f},{r:.3f} 0 0 1 {o + t},{o + r:.3f} "
        f"V{o + t - r:.3f} A{r:.3f},{r:.3f} 0 0 1 {o + t - r:.3f},{o + t} "
        f"H{o + r:.3f} A{r:.3f},{r:.3f} 0 0 1 {o},{o + t - r:.3f} "
        f"V{o + r:.3f} A{r:.3f},{r:.3f} 0 0 1 {o + r:.3f},{o} Z"
    )
    splash_slabs = "\n".join(
        f'    <path android:fillColor="{fill.upper()}" android:pathData="{p}" />'
        for p, fill in zip(slab_path(t / 512, o, o), fills)
    )
    write(RES / "drawable/splash_mark.xml", f"""<?xml version="1.0" encoding="utf-8"?>
<!-- Generated by scripts/native/render-native-assets.py from public/favicon.svg. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="240dp"
    android:height="240dp"
    android:viewportWidth="240"
    android:viewportHeight="240">
    <path android:fillColor="{TILE_FILL.upper()}" android:pathData="{tile}" />
{splash_slabs}
</vector>
""")

    # Legacy splash drawables (only used by a programmatic SplashScreen.show()).
    for path in sorted(RES.glob("drawable*/splash.png")):
        w, h = Image.open(path).size
        save_png(on_surface(w, h, round(min(w, h) * 0.2)), path)


def ios() -> None:
    icon = draw_mark(1024, shape="square").convert("RGB")  # App Store: opaque, no alpha
    save_png(icon, XCASSETS / "AppIcon.appiconset/AppIcon-512@2x.png")
    for name in ("splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"):
        save_png(on_surface(2732, 2732, 300), XCASSETS / "Splash.imageset" / name)


if __name__ == "__main__":
    android()
    ios()
