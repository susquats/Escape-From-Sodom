"""The ending's figures, drawn at native resolution (1 px = 1 world unit): the daughters, Lot, the jugs, Zs."""
from px import Sprite

SKIN = ['#b8683e', '#e8a270', '#fcc896']
FACE = ['#e09a68', '#fcc896', '#ffe2bc']
SKIN_DK = '#8a4428'
HAIR = ['#2e140c', '#52281a', '#7a3e22']
HAIR_HI = '#9c5630'
BEARD = ['#2a120a', '#4a2414', '#6e3a1e']
CLOTH = ['#b48c5c', '#e6cc9c', '#fff0d0']
GOLD = ['#8a4a10', '#d88a1c', '#f8c040', '#fff0a0']
EYE_DK, EYE_WH, LASH = '#1a0c14', '#ffffff', '#2a1418'
LIP, BLUSH = '#c0485a', '#f08a80'

DAUGHTERS = {
    'daughter1': dict(dress=['#5a2080', '#9440bc', '#c870e4', '#ecb0ff'], band=['#a86a14', '#f4c048', '#fff0a0']),
    'daughter2': dict(dress=['#a0386e', '#dc60a8', '#fc98d4', '#ffd0ec'], band=['#a02050', '#e8487c', '#ffa0c0']),
}


def daughter(name, wink=False, light=(1, -1)):
    """Kneeling, facing the camera, hands in her lap. 56x68."""
    c = DAUGHTERS[name]
    s = Sprite(56, 68, light=light)
    cx = 28
    # long hair behind everything
    s.part(s.ellipse(cx, 19, 16, 16) | s.poly([(12, 20), (44, 20), (47, 44), (45, 54), (38, 56), (18, 56), (11, 54), (9, 44)]),
           HAIR, rim=2, core=5)
    # kneeling legs under the skirt: a wide soft mound
    skirt = s.ellipse(cx, 59, 23, 8.5) | s.ellipse(cx - 11, 57, 11, 7.5) | s.ellipse(cx + 11, 57, 11, 7.5)
    s.part(skirt & s.rect(0, 0, 56, 67), c['dress'], rim=2, core=4)
    s.paint(s.line([(cx, 56), (cx, 64)]) | s.line([(cx - 16, 60), (cx - 12, 63)]) | s.line([(cx + 16, 60), (cx + 12, 63)]), c['dress'][0])
    # torso / dress bodice
    s.part(s.poly([(18.5, 37), (37.5, 37), (40, 52), (16, 52)]), c['dress'], rim=2, core=4)
    # bare shoulders and neckline
    shoulders = s.ellipse(cx, 37, 11.5, 5) & s.rect(0, 0, 56, 39)
    s.part(shoulders | s.rect(24, 28, 32, 36), SKIN, rim=1, core=3)
    # dress neckline over the chest (sweetheart curve) + thin straps
    s.part(s.poly([(18.5, 39), (24, 38), (28, 40), (32, 38), (37.5, 39), (38, 43), (18, 43)]), c['dress'], rim=1, core=4)
    s.paint(s.line([(20, 34), (21, 39)]) | s.line([(36, 34), (35, 39)]), c['dress'][1])
    # arms: down the sides, forearms folding in to the lap
    for side in (-1, 1):
        sh, el, hd = (cx + side * 10.5, 38), (cx + side * 12.5, 47), (cx + side * 4, 53)
        s.part(s.capsule(sh, el, 2.6, 2.4), SKIN, rim=1, core=2)
        s.part(s.capsule(el, hd, 2.4, 2.2), SKIN, rim=1, core=2)
    s.part(s.ellipse(cx - 3, 53.5, 3.5, 2.5) | s.ellipse(cx + 3, 53.5, 3.5, 2.5), SKIN, rim=1, core=2)  # hands
    # face: round, soft chin
    face = s.ellipse(cx, 20, 11, 11) | s.ellipse(cx, 24, 9, 8)
    s.part(face, FACE, rim=2, core=2)
    # hair on top: parted in the middle, sweeping down both sides of the face
    top = s.ellipse(cx, 16, 13.5, 11) & s.rect(0, 0, 56, 17)
    left = s.poly([(14, 14), (22, 12), (19, 18), (17, 26), (16, 36), (13, 34), (12, 22)])
    right = s.poly([(42, 14), (34, 12), (37, 18), (39, 26), (40, 36), (43, 34), (44, 22)])
    part_line = s.poly([(27, 6), (29, 6), (30, 13), (26, 13)])
    s.part((top & ~s.poly([(24, 17), (32, 17), (31, 13), (25, 13)])) | left | right, HAIR, rim=2, core=4)
    s.paint(s.line([(24, 6), (21, 10), (18, 16)]) | s.line([(33, 6), (36, 10), (38, 16)]), HAIR_HI)  # shine
    s.paint(part_line & s.rect(27, 5, 29, 12), HAIR[0])
    # headband across the crown
    band = (s.ellipse(cx, 16, 14, 11.5) & ~s.ellipse(cx, 16.5, 12.5, 10)) & s.rect(0, 0, 56, 14)
    s.part(band, c['band'], rim=1, core=0, edge=False)
    s.finish()
    # --- face details, by hand ---
    col = {'k': LASH, 'd': EYE_DK, 'w': EYE_WH, 'i': '#7a3c1c', 'l': LIP, 'b': BLUSH, 'n': SKIN[0], 's': SKIN[1]}
    open_eye = ['.kkkkk',
                'kkkkkk',
                'kwwiid',
                '.wiiid',
                '.iiid.']
    wink_eye = ['......',
                '......',
                'k....k',
                '.kkkk.',
                '......']
    ey = 19
    s.stamp(cx - 8, ey, open_eye, col)
    s.stamp(cx + 2, ey, wink_eye if wink else open_eye, col)
    s.stamp(cx - 9, ey - 3, ['.kkk'], col)                         # brows
    s.stamp(cx + 5, ey - 3 - (1 if wink else 0), ['kkk.'], col)
    s.stamp(cx - 1, ey + 6, ['n'], col)                             # nose
    s.stamp(cx - 2, ey + 9, ['l..l', '.ll.'] if not wink else ['...l', 'lll.'], col)  # smile
    s.stamp(cx - 9, ey + 6, ['bb'], col)
    s.stamp(cx + 7, ey + 6, ['bb'], col)
    return s


CLOAK = ['#2a1430', '#48244a', '#6a3a62']


def lot():
    """Asleep, leaning back on his rolled-up cloak, one arm behind his head. 126x66."""
    s = Sprite(126, 66, light=(1, -1))
    # the cloak he's lying on
    s.part(s.ellipse(28, 46, 26, 15) | s.ellipse(12, 34, 10, 12), CLOAK, rim=2, core=5)
    # far arm, bent up behind his head
    s.part(s.capsule((32, 36), (7, 17), 4.2, 3.6), SKIN, rim=1, core=3)
    s.part(s.capsule((7, 17), (19, 8), 3.6, 3.2), SKIN, rim=1, core=3)
    # legs: far one stretched out, near one with the knee up
    s.part(s.capsule((84, 56), (108, 58), 5, 3.5), SKIN, rim=1, core=3)
    s.part(s.ellipse(112, 60, 5, 2.6), SKIN, rim=1, core=2)
    s.part(s.capsule((86, 52), (103, 40), 5.5, 4.2), SKIN, rim=1, core=3)
    s.part(s.capsule((103, 40), (114, 57), 4.2, 3), SKIN, rim=1, core=3)
    s.part(s.ellipse(118, 60, 5.5, 2.8), SKIN, rim=1, core=2)
    # torso: chest high on the left, belly rolling down to the right
    s.part(s.ellipse(52, 44, 25, 12.5, angle=18) | s.ellipse(64, 48, 15, 11), SKIN, rim=2, core=4)
    # the cloth over his hips
    s.part(s.ellipse(84, 52, 17, 10.5, angle=-10) | s.ellipse(74, 56, 12, 7.5) | s.ellipse(94, 57, 10, 6), CLOTH, rim=2, core=4)
    s.paint(s.line([(76, 48), (82, 55), (84, 61)]) | s.line([(90, 46), (94, 52)]) | s.line([(70, 55), (74, 60)]), CLOTH[0])
    # near arm lying along his side, hand on the belly
    s.part(s.capsule((42, 40), (50, 51), 4.2, 3.6), SKIN, rim=1, core=3)
    s.part(s.capsule((50, 51), (66, 47), 3.6, 3.2), SKIN, rim=1, core=2)
    s.part(s.ellipse(69, 46, 4, 3), SKIN, rim=1, core=2)
    # head, tipped back
    s.part(s.ellipse(26, 25, 10, 10.5), FACE, rim=2, core=3)
    s.part((s.ellipse(24, 21, 11.5, 10) & ~s.ellipse(29, 26, 9, 8.5)) | s.ellipse(17, 26, 5, 8), HAIR, rim=2, core=4)
    s.part(s.ellipse(31, 33, 9, 7.5) | s.ellipse(26, 34, 6, 6), BEARD, rim=2, core=3)
    s.finish()
    col = {'k': LASH, 'n': SKIN[0], 'm': '#1a0808', 'h': BEARD[2], 'e': SKIN[1], 'b': BLUSH, 'z': SKIN[0]}
    s.stamp(25, 23, ['kkk..kkk',   # closed eyes
                     '.......'], col)
    s.stamp(24, 21, ['hhh..hhh'], {'h': BEARD[1]})  # brows
    s.stamp(30, 25, ['.n', 'nn'], col)             # nose
    s.stamp(28, 29, ['hhhhh', '.mmm.'], col)        # moustache, open snoring mouth
    s.stamp(20, 26, ['ee', 'ee'], col)             # ear
    s.stamp(56, 43, ['n'], col)                    # navel
    s.stamp(44, 36, ['n.n', '.n.'], {'n': SKIN[0]})  # chest hair
    return s


JUG = ['#8a4010', '#d0761c', '#f4a838', '#ffe08a']
LABEL = ['#c09a64', '#f0dcb0', '#fff6e0']


def jug(w=40, h=50, label=True, light=(1, -1)):
    """The XXX jug (or, without the label, the little one by Lot)."""
    s = Sprite(w, h, light=light)
    k = w / 40
    cx = w / 2
    body = s.ellipse(cx, h - 17 * k, 17 * k, 15 * k) & s.rect(0, 0, w, int(h - 2 * k))
    body |= s.rect(int(cx - 13 * k), int(h - 12 * k), int(cx + 13 * k + 1), int(h - 2 * k))
    shoulder = s.poly([(cx - 7 * k, 14 * k), (cx + 7 * k, 14 * k), (cx + 13 * k, 22 * k), (cx - 13 * k, 22 * k)])
    s.part(body | shoulder | s.rect(int(cx - 5.5 * k), int(8 * k), int(cx + 5.5 * k + 1), int(18 * k)), JUG, rim=2, core=4)
    s.part(s.ellipse(cx, 7 * k, 8.5 * k, 3 * k), JUG, rim=1, core=1)  # lip
    s.paint(s.rect(int(cx - 6 * k), int(7 * k), int(cx + 6 * k + 1), int(8 * k)), JUG[0])  # mouth of the jug
    if label:
        lab = s.rect(int(cx - 14), 25, int(cx + 15), 44)
        s.part(lab, LABEL, rim=1, core=2)
        for i in range(3):
            ox = int(cx - 13 + i * 9)
            for t in range(7):
                s.px([(ox + t, 30 + t), (ox + t + 1, 30 + t), (ox + 6 - t, 30 + t), (ox + 7 - t, 30 + t)], '#3a160a')
    s.finish()
    s.paint(s.line([(int(cx + 9 * k), int(h - 26 * k)), (int(cx + 11 * k), int(h - 20 * k))]), JUG[3])  # glint
    return s


def zed(size):
    """A chunky white Z with a dark outline."""
    s = Sprite(size + 2, size + 2, outline='#1c1030')
    o, n = 1, size
    m = s.rect(o, o, o + n, o + 2) | s.rect(o, o + n - 2, o + n, o + n)
    for i in range(n - 3):
        m |= s.rect(o + n - 2 - i - 1, o + 2 + i, o + n - i, o + 3 + i)
    s.part(m, ['#c8c0e0', '#f0ecff', '#ffffff'], rim=1, core=1, edge=False)
    return s.finish(inner=False)
