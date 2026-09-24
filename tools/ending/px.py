"""Tiny pixel-art toolkit for the ending cutscene: hard-edged shapes, cel shading, outlines. No anti-aliasing.

A Sprite is an RGBA canvas plus a part-id layer. Parts are drawn back to front; each part is a mask filled
with a 3-4 tone ramp (dark..light). Shading is cel-style: pixels near the lit edge of a part get the light
tone, pixels near the far edge the dark tone. Outlines go around the silhouette and where a part overlaps
the one behind it.
"""
import numpy as np
import cv2

def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.uint8)


def shift(m, dx, dy):
    out = np.zeros_like(m)
    H, W = m.shape
    xs, xd = (slice(0, W - dx), slice(dx, W)) if dx >= 0 else (slice(-dx, W), slice(0, W + dx))
    ys, yd = (slice(0, H - dy), slice(dy, H)) if dy >= 0 else (slice(-dy, H), slice(0, H + dy))
    out[yd, xd] = m[ys, xs]
    return out


# ---- mask primitives (all return bool arrays of the canvas size) -------------------------------------------
class Shapes:
    def __init__(self, w, h):
        self.w, self.h = w, h

    def blank(self):
        return np.zeros((self.h, self.w), np.uint8)

    def ellipse(self, cx, cy, rx, ry, angle=0, a0=0, a1=360):
        m = self.blank()
        cv2.ellipse(m, ((cx * 16).__round__(), (cy * 16).__round__()), ((rx * 16).__round__(), (ry * 16).__round__()),
                    angle, a0, a1, 1, -1, cv2.LINE_8, 4)
        return m > 0

    def poly(self, pts):
        m = self.blank()
        cv2.fillPoly(m, [np.round(np.array(pts, np.float64) * 16).astype(np.int32)], 1, cv2.LINE_8, 4)
        return m > 0

    def rect(self, x0, y0, x1, y1):
        m = self.blank()
        m[max(0, y0):y1, max(0, x0):x1] = 1
        return m > 0

    def capsule(self, p0, p1, r0, r1=None):
        """A limb: tapered stroke from p0 to p1."""
        r1 = r0 if r1 is None else r1
        yy, xx = np.mgrid[0:self.h, 0:self.w].astype(np.float64) + 0.5
        (x0, y0), (x1, y1) = p0, p1
        dx, dy = x1 - x0, y1 - y0
        t = np.clip(((xx - x0) * dx + (yy - y0) * dy) / max(dx * dx + dy * dy, 1e-6), 0, 1)
        qx, qy = x0 + dx * t, y0 + dy * t
        r = r0 + (r1 - r0) * t
        return (xx - qx) ** 2 + (yy - qy) ** 2 <= r * r

    def line(self, pts, thick=1):
        m = self.blank()
        cv2.polylines(m, [np.array(pts, np.int32)], False, 1, thick, cv2.LINE_8)
        return m > 0


class Sprite(Shapes):
    def __init__(self, w, h, outline='#2a1418', light=(1, -1)):
        super().__init__(w, h)
        self.rgb = np.zeros((h, w, 3), np.uint8)
        self.a = np.zeros((h, w), bool)
        self.ids = np.zeros((h, w), np.int32)
        self.dark = {}     # part id -> darkest tone, used for inner outlines
        self.n = 0
        self.outline = hexrgb(outline)
        self.light = light

    def part(self, mask, ramp, rim=2, core=4, light=None, edge=True, rim_ramp_idx=None):
        """Fill `mask` with a cel-shaded ramp. ramp: [dark, mid, light] or [dark, mid, light, highlight]."""
        mask = mask.astype(bool)
        lx, ly = light or self.light
        cols = [hexrgb(c) for c in ramp]
        mid = 1
        self.n += 1
        out = np.full(mask.shape, mid)
        if core:  # pixels whose neighbour `core` px AWAY from the light is outside the part -> shadow side
            far = shift(mask.astype(np.uint8), round(lx * core), round(ly * core)) == 0
            out[far] = 0
        if rim:   # pixels near the lit edge -> light tone
            near = shift(mask.astype(np.uint8), -round(lx * rim), -round(ly * rim)) == 0
            out[near & (out != 0)] = 2
        for i, c in enumerate(cols[:3]):
            sel = mask & (out == i)
            self.rgb[sel] = c
        self.a |= mask
        self.ids[mask] = self.n
        self.dark[self.n] = cols[0] if edge else None
        return self.n

    def paint(self, mask, color):
        """Flat colour, keeps the part id underneath."""
        mask = mask.astype(bool) & self.a if self.a.any() else mask.astype(bool)
        self.rgb[mask] = hexrgb(color)

    def paint_any(self, mask, color, pid=None):
        mask = mask.astype(bool)
        self.rgb[mask] = hexrgb(color)
        self.a |= mask
        if pid is not None:
            self.ids[mask] = pid

    def px(self, pts, color):
        c = hexrgb(color)
        for x, y in pts:
            if 0 <= x < self.w and 0 <= y < self.h:
                self.rgb[y, x] = c
                self.a[y, x] = True

    def stamp(self, x, y, rows, colors):
        """Hand-drawn detail: rows of chars, '.' = skip."""
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    self.px([(x + i, y + j)], colors[ch])

    def finish(self, inner=True, outline=True):
        """Inner lines where a part sits over an earlier one (drawn in the front part's dark tone) and a dark
        silhouette outline around everything."""
        ids = self.ids
        if inner:
            line = np.zeros_like(self.a)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nb = shift(ids, dx, dy)
                line |= self.a & (nb != 0) & (nb < ids) & (shift(self.a.astype(np.uint8), dx, dy) > 0)
            for pid, c in self.dark.items():
                if c is None:
                    continue
                sel = line & (ids == pid)
                self.rgb[sel] = (self.rgb[sel].astype(int) * 0 + c).astype(np.uint8)
        if outline:
            ring = np.zeros_like(self.a)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ring |= shift(self.a.astype(np.uint8), dx, dy) > 0
            ring &= ~self.a
            self.rgb[ring] = self.outline
            self.a |= ring
        return self

    def rgba(self):
        return np.dstack([self.rgb, self.a.astype(np.uint8) * 255])

    def save(self, path, scale=1):
        img = cv2.cvtColor(self.rgba(), cv2.COLOR_RGBA2BGRA)
        if scale != 1:
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
        cv2.imwrite(path, img)


def composite(bg_rgb, sprites):
    """bg_rgb: HxWx3; sprites: [(Sprite or rgba array, x, y)]."""
    out = bg_rgb.copy()
    for s, x, y in sprites:
        a = s.rgba() if isinstance(s, Sprite) else s
        h, w = a.shape[:2]
        m = a[..., 3] > 0
        region = out[y:y + h, x:x + w]
        region[m[:region.shape[0], :region.shape[1]]] = a[..., :3][:region.shape[0], :region.shape[1]][m[:region.shape[0], :region.shape[1]]]
    return out
