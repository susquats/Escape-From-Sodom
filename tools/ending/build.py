"""Draws the ending cutscene art and writes public/ending/*.png (all at 1 px = 1 world unit).
Run: python build.py [preview.png]   (needs numpy, scipy, opencv-python-headless)"""
import os, sys, json
import cv2
from px import composite
from cave import build as cave
from figures import daughter, lot, jug, zed

OUT = os.path.join(os.path.dirname(__file__), '../../public/ending')
# where each piece sits in the 320x180 scene (top-left, world units)
LAYOUT = {
    'lot': (4, 84), 'jug-small': (40, 132),
    'daughter1': (150, 92), 'daughter2': (236, 92),
    'jug': (199, 116),
}
LIGHT_DIR = {'daughter1': (1, -1), 'daughter2': (-1, -1)}


def sprites():
    out = {'lot': lot(), 'jug-small': jug(16, 20, label=False), 'jug': jug()}
    for d in ('daughter1', 'daughter2'):
        out[d] = daughter(d, light=LIGHT_DIR[d])
        out[d + '-wink'] = daughter(d, wink=True, light=LIGHT_DIR[d])
    for i, n in enumerate((7, 9, 11)):
        out[f'z{i}'] = zed(n)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    bg = cave()
    cv2.imwrite(f'{OUT}/cave.png', cv2.cvtColor(bg, cv2.COLOR_RGB2BGR))
    sp = sprites()
    for k, s in sp.items():
        s.save(f'{OUT}/{k}.png')
    if len(sys.argv) > 1:
        order = ['lot', 'jug-small', 'daughter1', 'daughter2-wink', 'jug']
        im = composite(bg, [(sp[k], *LAYOUT[k.replace('-wink', '')]) for k in order] +
                       [(sp['z0'], 42, 96), (sp['z1'], 50, 84), (sp['z2'], 60, 70)])
        cv2.imwrite(sys.argv[1], cv2.resize(cv2.cvtColor(im, cv2.COLOR_RGB2BGR), None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST))
    print(json.dumps(LAYOUT))


if __name__ == '__main__':
    main()
