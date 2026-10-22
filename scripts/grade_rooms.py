"""The gallery's rooms: renders of the house (D:/GameDev-Tools/site_src/rooms, made by the game:
game.tscn -- --qa=site_room --stand=u,v --look=u,v --zoom=z --tod=min --shot=<png>) cropped to what
is lit (the house draws only the room you stand in; the rest is black), framed 3:2, then graded like
the key art (scripts/grade.py).

    python scripts/grade_rooms.py
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
sys.argv = sys.argv[:1] + ["__none__"]  # (grade.py's own list does nothing)
import grade  # noqa: E402

sys.argv = sys.argv[:1]

SRC = "D:/GameDev-Tools/site_src/rooms"
CROP = "D:/GameDev-Tools/site_src/rooms/cropped"
os.makedirs(CROP, exist_ok=True)

# name: (mood, extra margin, focus band y)
ROOMS = {
    "court_snow": ("night", 0.0, 0.5),
    "graveyard_night": ("fog", 0.04, 0.5),
    "hall_day": ("roomday", 0.03, 0.5),
    "hall_night": ("room", 0.03, 0.5),
    "kitchen_day": ("roomday", 0.03, 0.5),
    "parlour_night": ("room", 0.05, 0.5),
    "shop_day": ("roomday", 0.04, 0.5),
    "chapel_night": ("room", 0.05, 0.5),
    "forecourt_dusk": ("gold", 0.0, 0.5),
}


def crop_lit(path, out, margin, aspect=1.5):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im, dtype=np.float32) / 255.0
    luma = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    # the lit part: rows and columns that hold enough light
    lit = luma > max(0.05, np.percentile(luma, 75) * 0.8)
    cols = np.where(lit.mean(axis=0) > 0.08)[0]
    rows = np.where(lit.mean(axis=1) > 0.08)[0]
    W, H = im.size
    if not len(cols) or not len(rows):
        x0, x1, y0, y1 = 0, W, 0, H
    else:
        x0, x1, y0, y1 = cols[0], cols[-1], rows[0], rows[-1]
    mx = (x1 - x0) * margin
    my = (y1 - y0) * margin
    x0, x1, y0, y1 = x0 - mx, x1 + mx, y0 - my, y1 + my
    # grow to the aspect around the centre, then keep inside the frame
    w, h = x1 - x0, y1 - y0
    if w / h > aspect:
        h = w / aspect
    else:
        w = h * aspect
    w, h = min(w, W), min(h, H)
    if w / h > aspect:
        w = h * aspect
    else:
        h = w / aspect
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    x0 = int(min(max(0, cx - w / 2), W - w))
    y0 = int(min(max(0, cy - h / 2), H - h))
    im.crop((x0, y0, x0 + int(w), y0 + int(h))).save(out)
    print("cropped", os.path.basename(out), int(w), int(h))


if __name__ == "__main__":
    for name, (mood, margin, fy) in ROOMS.items():
        c = f"{CROP}/{name}.png"
        crop_lit(f"{SRC}/{name}.png", c, margin)
        grade.grade(c, mood, f"{grade.OUT}/rm_{name}.png", focus_y=fy, band=0.3, vig=0.35)
