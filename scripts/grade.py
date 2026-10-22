"""Key-art grading for the site: turns the game's renders (D:/GameDev-Tools/site_src, made by
main_menu.tscn --bare --shot --attract_cam) into finished frames in site_src/graded/:

  * bloom: the bright parts (lamps, windows, the oak's eyes) glow, at two radii;
  * a grade per mood: split toning (cool shadows, warm light), an S-curve, saturation;
  * tilt-shift: sharp across the garden, softening toward the top and bottom (a miniature lens);
  * mist low over the ground, a vignette, a fine grain;
  * clean-up: the stray figure the title screen leaves in the lower-left corner is painted out.

    python scripts/grade.py [name ...]     (only the outputs whose names contain one of these)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

SRC = "D:/GameDev-Tools/site_src"
OUT = os.path.join(SRC, "graded")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

MOODS = {
    # name: (shadow tint, highlight tint, exposure, contrast, saturation, bloom, mist colour, mist alpha)
    "night": ((0.62, 0.78, 0.92), (1.03, 0.96, 0.86), 1.0, 1.16, 1.08, 0.55, (120, 140, 150), 0.16),
    "gold": ((0.78, 0.74, 0.86), (1.22, 1.0, 0.70), 1.08, 1.14, 1.28, 0.55, (255, 205, 150), 0.12),
    "dusk": ((0.70, 0.66, 0.90), (1.12, 0.86, 0.80), 1.0, 1.12, 1.1, 0.5, (200, 160, 190), 0.14),
    "day": ((0.90, 0.95, 1.0), (1.08, 1.04, 0.92), 1.1, 1.1, 1.22, 0.35, (230, 235, 220), 0.08),
    # (the rooms by night: lifted, so the firelight and the candles carry the picture)
    "room": ((0.70, 0.80, 0.95), (1.10, 0.98, 0.84), 1.75, 1.06, 1.12, 0.65, (90, 100, 110), 0.05),
    "roomday": ((0.92, 0.95, 1.0), (1.06, 1.03, 0.94), 1.3, 1.08, 1.15, 0.4, (230, 235, 220), 0.04),
    "fog": ((0.66, 0.78, 0.95), (1.06, 1.0, 0.9), 2.1, 1.1, 1.1, 0.7, (150, 160, 170), 0.04),
}


def blur(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0


def grade(path, mood, out, focus_y=0.56, band=0.22, clean=None, vig=0.75):
    if sys.argv[1:] and not any(k in os.path.basename(out) for k in sys.argv[1:]):
        return
    sh, hi, expo, con, sat, bloom_k, mist_c, mist_a = MOODS[mood]
    a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32) / 255.0
    h, w, _ = a.shape
    if clean:
        x0, y0, x1, y1 = [int(v) for v in (clean[0] * w, clean[1] * h, clean[2] * w, clean[3] * h)]
        a[y0:y1, x0:x1] = np.median(a[y0:y1, max(0, x1):min(w, x1 + 60)].reshape(-1, 3), axis=0)
    a = a * expo
    # bloom: what's bright glows, near and far
    luma = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    bright = a * np.clip((luma - 0.5) / 0.35, 0, 1)[..., None]
    glow = blur(bright, w / 120) * 0.7 + blur(bright, w / 40) * 0.6
    a = 1 - (1 - a) * (1 - glow * bloom_k)  # screen
    # split toning: shadows toward one tint, light toward another
    luma = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    t = np.clip(luma, 0, 1)[..., None]
    a = a * ((1 - t) * np.array(sh, dtype=np.float32) + t * np.array(hi, dtype=np.float32))
    # S-curve contrast and saturation
    a = np.clip(a, 0, 1)
    a = 0.5 + (a - 0.5) * con
    a = np.clip(a, 0, 1)
    a = a * a * (3 - 2 * a) * 0.35 + a * 0.65
    g = (a @ np.array([0.299, 0.587, 0.114], dtype=np.float32))[..., None]
    a = g + (a - g) * sat
    # mist: low-frequency noise, heavier toward the bottom of the frame
    n = rng.random((9, 16)).astype(np.float32)
    n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), dtype=np.float32) / 255.0
    n = blur(np.repeat(n[..., None], 3, axis=2), w / 60)[..., 0]
    yy = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    mist = (np.clip((yy - 0.35) / 0.65, 0, 1) * n * mist_a)[..., None]
    a = a * (1 - mist) + np.array(mist_c, dtype=np.float32) / 255.0 * mist
    # tilt-shift: sharp in a band, softer above and below
    soft = blur(a, w / 360)
    d = np.clip((np.abs(yy - focus_y) - band) / 0.25, 0, 1)[..., None]
    a = a * (1 - d) + soft * d
    # vignette
    xx = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
    yv = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    v = 1 - np.clip((xx * xx * 0.55 + yv * yv * 0.75) - 0.25, 0, 1) * vig
    a = a * v[..., None]
    # grain
    a = a + (rng.standard_normal((h, w, 1)).astype(np.float32) * 0.012)
    Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).save(out)
    print("graded", os.path.basename(out))


# the stray watcher figure sits in the lower-left corner of the title-screen view
CLEAN_L = (0.0, 0.86, 0.06, 1.0)
for mood in ["day", "gold", "dusk", "night"]:
    grade(f"{SRC}/gardenL_{mood}.png", mood, f"{OUT}/garden_{mood}.png", clean=CLEAN_L)
for mood in ["gold", "night"]:
    grade(f"{SRC}/gardenP_{mood}.png", mood, f"{OUT}/gardenP_{mood}.png", focus_y=0.5, band=0.18)
# close-ups of the garden (the gallery, and the hero on a phone)
for name, mood in [("oak_night", "night"), ("oak_gold", "gold"), ("arch_night", "night"), ("beds_day", "day"), ("bath_gold", "gold")]:
    grade(f"{SRC}/cu_{name}.png", mood, f"{OUT}/cu_{name}.png", focus_y=0.5, band=0.16)
grade(f"{SRC}/cuP_oak_night.png", "night", f"{OUT}/cuP_oak_night.png", focus_y=0.45, band=0.14)
