"""Cuts the ending cutscene art out of source.png (a 16:9 painting of the whole scene) into public/ending/:
the cave with Lot and the jug baked in, each daughter as her own sprite (so a lost one just isn't drawn), a
winking frame for each, and the three Zs. Positions go to public/ending/layout.json for the scene to read.
Run: python build.py [preview.png]   (needs numpy, opencv-contrib-python-headless)"""
import os, sys, json
import numpy as np
import cv2

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '../../public/ending')
W, H = 320, 180
COLORS = 48

# Each daughter's outline in the 320x180 image (traced by hand; the hair is too close to the rock for a
# colour cut). Her sprite is this area grown by a pixel, so drawn over the cave it restores the painting.
OUTLINE = {
    'daughter1': [(157, 82), (163, 80), (169, 80), (173, 82), (176, 85), (178, 89), (179, 96), (179, 106), (177, 112),
                  (175, 116), (174, 125), (175, 133), (174, 149), (145, 149), (141, 146), (141, 130), (142, 120), (144, 110), (147, 102),
                  (150, 95), (153, 89)],
    'daughter2': [(199, 90), (202, 85), (207, 81), (214, 79), (221, 81), (226, 86), (230, 93), (233, 100), (237, 107),
                  (241, 113), (240, 122), (243, 130), (246, 137), (249, 144), (248, 149), (203, 149), (203, 121),
                  (201, 116), (199, 110), (199, 100)],
}
# The eye each daughter winks (the one nearer the jug): its box x0, y0, x1, y1 (inclusive).
WINK = {'daughter1': (170, 97, 174, 101), 'daughter2': (204, 97, 208, 101)}
ZBOX = (78, 55, 122, 95)   # the painted Zs, which are cut out to animate
FLOOR_Y = 145              # below this the gap a daughter leaves is refilled with floor copied from beside her
FLOOR_FROM = {'daughter1': -1, 'daughter2': 1}   # which side to copy it from (away from the jug)


def load():
    src = cv2.imread(os.path.join(HERE, 'source.png'))
    lo = cv2.resize(src, (W, H), interpolation=cv2.INTER_AREA)
    # snap to a small palette so the downscale stays crisp pixel art
    cv2.setRNGSeed(1)
    _, lab, pal = cv2.kmeans(lo.reshape(-1, 3).astype(np.float32), COLORS, None,
                             (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 50, 0.2), 4, cv2.KMEANS_PP_CENTERS)
    pal = pal.astype(np.uint8)
    return pal[lab.ravel()].reshape(lo.shape), pal


def snap(img, pal):
    d = ((img.reshape(-1, 1, 3).astype(int) - pal[None].astype(int)) ** 2).sum(2)
    return pal[d.argmin(1)].reshape(img.shape)


def poly_mask(pts):
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(pts, np.int32)], 1)
    return cv2.dilate(m, np.ones((3, 3), np.uint8)) > 0


def sprite(img, mask):
    """Crop img to mask's bounding box as BGRA; returns (bgra, x, y)."""
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    out = np.dstack([img[y0:y1, x0:x1], mask[y0:y1, x0:x1].astype(np.uint8) * 255])
    return out, int(x0), int(y0)


def wink(img, box):
    """Paint the eye in `box` shut: skin over it, then a happy ^ arc in the lash colour."""
    x0, y0, x1, y1 = box
    out = img.copy()
    eye = img[y0:y1 + 1, x0:x1 + 1].reshape(-1, 3).astype(int)
    lash = eye[eye.sum(1).argmin()]
    skin = img[y1 + 2, (x0 + x1) // 2]
    out[y0:y1 + 1, x0:x1 + 1] = skin
    out[y0 + 2, x0 + 1:x1] = lash
    out[y0 + 3, x0] = out[y0 + 3, x1] = lash
    return out


def zeds(img):
    """The painted Zs as separate sprites, smallest (lowest) first."""
    x0, y0, x1, y1 = ZBOX
    box = img[y0:y1, x0:x1].astype(int)
    white = (box.min(2) > 150).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(white)
    found = sorted((stats[i] for i in range(1, n) if stats[i][4] > 4), key=lambda s: -s[1])
    out, full = [], np.zeros((H, W), bool)
    for sx, sy, sw, sh, _ in found:
        m = np.zeros((H, W), np.uint8)
        m[y0 + sy:y0 + sy + sh, x0 + sx:x0 + sx + sw] = white[sy:sy + sh, sx:sx + sw]
        m = cv2.dilate(m, np.ones((3, 3), np.uint8)) > 0   # keep the dark outline
        full |= m
        out.append(m)
    return out, full


def main():
    os.makedirs(OUT, exist_ok=True)
    img, pal = load()
    masks = {d: poly_mask(p) for d, p in OUTLINE.items()}
    zmasks, zall = zeds(img)

    # the cave: daughters and Zs removed, the holes filled from the surrounding rock
    nozs = cv2.inpaint(img, cv2.dilate(zall.astype(np.uint8), np.ones((3, 3), np.uint8)) * 255, 3, cv2.INPAINT_TELEA)
    valid = (~(masks['daughter1'] | masks['daughter2'])).astype(np.uint8) * 255
    cave = np.zeros_like(img)
    cv2.xphoto.inpaint(nozs, valid, cave, cv2.xphoto.INPAINT_SHIFTMAP)
    cave[valid > 0] = nozs[valid > 0]   # shift-map also nudges pixels just outside the holes (the jug's edge)
    for d, m in masks.items():   # the floor is a horizontal band, so a sideways copy matches it best
        xs = np.nonzero(m.any(0))[0]
        k = FLOOR_FROM[d] * (xs.max() - xs.min() + 1)
        for y in range(FLOOR_Y, H):
            for x in np.nonzero(m[y])[0]:
                cave[y, x] = img[y, x + k]
    cave = snap(cave, pal)
    cv2.imwrite(f'{OUT}/cave.png', cave)

    layout = {'daughters': {}, 'zs': []}
    for d, m in masks.items():
        spr, x, y = sprite(img, m)
        cv2.imwrite(f'{OUT}/{d}.png', spr)
        wspr, _, _ = sprite(wink(img, WINK[d]), m)
        cv2.imwrite(f'{OUT}/{d}-wink.png', wspr)
        bx0, by0, bx1, by1 = WINK[d]
        layout['daughters'][d] = {'x': x, 'y': y, 'eye': [(bx0 + bx1) // 2, (by0 + by1) // 2]}
    for i, m in enumerate(zmasks):
        spr, x, y = sprite(img, m)
        cv2.imwrite(f'{OUT}/z{i}.png', spr)
        layout['zs'].append([x, y])
    with open(f'{OUT}/layout.json', 'w') as f:
        json.dump(layout, f)

    if len(sys.argv) > 1:   # preview: the cave with daughter1 winking and daughter2 lost, at 3x
        pv = cave.copy()
        spr, x, y = sprite(wink(img, WINK['daughter1']), masks['daughter1'])
        a = spr[..., 3] > 0
        pv[y:y + spr.shape[0], x:x + spr.shape[1]][a] = spr[..., :3][a]
        pv[:22] = 0; pv[-22:] = 0
        cv2.imwrite(sys.argv[1], cv2.resize(np.vstack([pv, cave[22:-22]]), None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST))
    print(json.dumps(layout))


if __name__ == '__main__':
    main()
