"""The ending's fixed backdrop: a fire-lit cave, 320x180, drawn from scratch.

Rock is a noise height field, lit from the glow between the daughters and posterised into a few hard bands
(cel-shaded pixel art); crevices where the surface turns sharply away get the darkest tone.
"""
import numpy as np
import cv2

W, H = 320, 180
FLOOR_Y = 134            # where the back wall meets the floor
LIGHT = (214, 108)       # centre of the warm glow
ROCK = ['#0a050c', '#160a16', '#261022', '#3a182a', '#52222e', '#6e2e30', '#8e4030', '#b05a32', '#d07a3a', '#ec9c4c', '#fcc070']
SAND = ['#1c0c10', '#34160f', '#562612', '#7c3a16', '#a4541e', '#c8742a', '#e4983c', '#f8bc5c']
rgb = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
R = np.array([rgb(c) for c in ROCK], np.uint8)
S = np.array([rgb(c) for c in SAND], np.uint8)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def fbm(seed, scale, octaves=4, sx=1.0):
    g = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        cw, ch = max(2, int(W / scale * sx)), max(2, int(H / scale))
        n = g.random((ch + 3, cw + 3)).astype(np.float32)
        big = cv2.resize(n, (W + int(W / cw * 3), H + int(H / ch * 3)), interpolation=cv2.INTER_CUBIC)[:H, :W]
        out += amp * big
        tot += amp
        amp *= 0.5
        scale /= 2.1
    return out / tot


def lumps(cell, seed, squash=1.3):
    """Big rounded rock lumps: Voronoi cells, each domed (height = distance to its edge)."""
    from scipy.spatial import cKDTree
    g = np.random.default_rng(seed)
    pts = []
    for gy in np.arange(-cell, H + cell, cell * 0.75):
        off = g.uniform(0, cell)
        for gx in np.arange(-cell + off, W + cell, cell):
            pts.append((gx + g.uniform(-0.4, 0.4) * cell, gy + g.uniform(-0.3, 0.3) * cell))
    pts = np.array(pts)
    tree = cKDTree(pts * [1, squash])
    d, _ = tree.query(np.stack([xx.ravel() + 0.5, (yy.ravel() + 0.5) * squash], 1), k=2)
    edge = ((d[:, 1] - d[:, 0]) / 2).reshape(H, W).astype(np.float32)
    h = np.sqrt(np.clip(edge, 0, cell * 0.45))  # dome, flattened on top
    h += fbm(seed + 50, cell / 2, 2) * 0.8
    return cv2.GaussianBlur(h, (0, 0), 2.4), edge


def glow(x, y, r=150.0):
    d = np.hypot((x - LIGHT[0]) * 0.85, (y - LIGHT[1]) * 1.2) / r
    return np.clip(1 - d, 0, 1)


def lit(height, bump, toward_light=True):
    """Shade a height field. Light comes from the glow (in 2D) and a little from the viewer."""
    gx = cv2.Sobel(height, cv2.CV_32F, 1, 0, ksize=3) * bump
    gy = cv2.Sobel(height, cv2.CV_32F, 0, 1, ksize=3) * bump
    nz = 1.0 / np.sqrt(gx * gx + gy * gy + 1)
    nx, ny = -gx * nz, -gy * nz
    lx, ly = LIGHT[0] - xx, LIGHT[1] - yy
    ln = np.hypot(lx, ly) + 1e-3
    lx, ly = lx / ln * 0.8, ly / ln * 0.8
    lz = 0.6
    return np.clip(nx * lx + ny * ly + nz * lz, -1, 1), np.hypot(gx, gy)


def post(v, levels):
    return np.clip(np.floor(v), 0, levels - 1).astype(int)


def build():
    img = np.zeros((H, W, 3), np.uint8)

    # --- back wall: lumpy rock, dark purple at the edges, warm where the glow hits ----------------------
    hw, ew = lumps(24, 3)
    d, steep = lit(hw, 14)
    g = glow(xx, yy)
    v = 1.6 + 7.8 * g ** 1.1 + 3.0 * (d - 0.55) - (ew < 1.0) * 2.2
    img[:] = R[post(v, len(R))]

    # --- floor: packed sand, brightest in the middle, dashes of texture --------------------------------
    edge_y = FLOOR_Y + 3 * np.sin(xx / 23) + 2 * np.sin(xx / 7.3 + 1)
    floor = yy >= edge_y
    fg = glow(xx, np.maximum(yy, 118), 175)
    fv = 1.0 + 6.8 * fg - (yy - FLOOR_Y) * 0.03
    tex = fbm(9, 7, 2, sx=0.2)   # stretched horizontally: streaks
    fv = fv + (tex - 0.5) * 1.8
    img[floor] = S[post(fv, len(S))][floor]
    # pebbles: a lit top pixel over a dark one
    g2 = np.random.default_rng(12)
    for _ in range(140):
        px, py = int(g2.integers(4, W - 4)), int(g2.integers(FLOOR_Y + 5, H - 8))
        if floor[py, px]:
            k = int(np.clip(np.floor(fv[py, px]), 1, len(S) - 2))
            w = int(g2.integers(1, 4))
            img[py, px:px + w] = S[min(k + 1, len(S) - 1)]
            img[py + 1, px:px + w] = S[k - 1]
    contact = floor & (yy < edge_y + 2.5)
    img[contact] = S[post(fv - 2.5, len(S))][contact]

    # --- boulders at the back left and right --------------------------------------------------------------
    def boulder(cx, cy, rx, ry, bias=0):
        m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        h = np.sqrt(np.clip(1 - ((xx - cx) / rx) ** 2 - ((yy - cy) / ry) ** 2, 0, 1)) * 10 + fbm(cx, 6, 2) * 1.5
        dd, _ = lit(h.astype(np.float32), 3)
        vv = 1.5 + bias + 6.5 * glow(cx, cy, 190) + 2.6 * (dd - 0.4)
        img[m] = R[post(vv, len(R))][m]
        ring = (((xx - cx) / (rx + 1)) ** 2 + ((yy - cy) / (ry + 1)) ** 2 <= 1) & ~m
        img[ring] = R[1]
    boulder(12, 126, 17, 14)
    boulder(34, 140, 12, 9, 0.3)
    boulder(3, 146, 11, 8)
    boulder(302, 136, 19, 15, -0.4)
    boulder(318, 118, 12, 18, -0.6)

    # --- the cave mouth: a heavy foreground arch, lit orange on its inner face ---------------------------
    ang = np.arctan2(yy - 196, xx - 162)
    wob = 7 * np.sin(ang * 6 + 0.5) + 5 * np.sin(ang * 11 + 2) + 3 * np.sin(ang * 23 + 1)
    rr = np.hypot(xx - 162, (yy - 196) * 1.08)
    inner = 190 + wob
    frame = rr > inner
    hf, ef = lumps(36, 21, 1.1)
    df, steepf = lit(hf, 16)
    depth = np.clip((rr - inner) / 40, 0, 1)                 # 0 at the inner lip, 1 deep in the rock
    vf = 2.4 + 8.0 * (1 - depth) ** 1.4 * (0.55 + 0.45 * glow(xx, yy, 260)) + 3.2 * (df - 0.5) - (ef < 1.2) * 2.5
    vf = np.where(rr < inner + 2.5, vf + 1.5, vf)             # the lip catches the light
    img[frame] = R[post(vf, len(R))][frame]
    # a band of shadow just inside the arch: the arch sits in front of the wall
    shadow = ~frame & (rr > inner - 12) & ~floor
    img[shadow] = R[post(v - 3 - (rr - inner + 12) / 12 * 1.5, len(R))][shadow]
    img[~frame & (rr > inner - 1.3)] = R[0]

    # --- foreground: a dark rocky ledge along the bottom -------------------------------------------------
    fx = 3 * np.sin(xx / 17) + 2 * np.sin(xx / 6.1 + 2) + 2 * np.sin(xx / 41)
    lift = np.clip(np.abs(xx - 165) - 95, 0, None) * 0.28
    front = yy > 173 + fx - lift
    img[front] = R[1]
    img[front & ~np.roll(front, 1, 0)] = R[5]
    img[front & ~np.roll(front, 2, 0) & np.roll(front, 1, 0)] = R[3]

    # soft falloff into the corners (stepped, so it stays pixel-crisp)
    vig = np.hypot((xx - 175) / 200, (yy - 110) / 130)
    k = np.clip(np.round((1.3 - vig) * 5) / 5, 0.35, 1)
    return (img * k[..., None]).astype(np.uint8)
