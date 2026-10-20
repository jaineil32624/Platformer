"""
Design helper used to author the ASCII level maps in src/levels/levels.ts.
Not required to build the game — the maps are committed as plain text and can be
edited by hand. Run `python3 scripts/levelgen.py` to regenerate and preview.
"""
import sys

class L:
    def __init__(s, w, h):
        s.w, s.h = w, h
        s.g = [['.'] * w for _ in range(h)]
    def put(s, x, y, ch):
        if 0 <= x < s.w and 0 <= y < s.h: s.g[y][x] = ch
    def fill(s, x0, x1, y0, y1, ch='#'):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): s.put(x, y, ch)
    def ground(s, x0, x1, top):
        s.fill(x0, x1, top, s.h - 1, '#')
    def plat(s, x0, x1, y, ch='='):
        s.fill(x0, x1, y, y, ch)
    def coins(s, x0, x1, y, step=1):
        for x in range(x0, x1 + 1, step): s.put(x, y, 'C')
    def arc(s, x0, x1, ybase, height):
        n = x1 - x0
        for i, x in enumerate(range(x0, x1 + 1)):
            t = i / max(1, n)
            s.put(x, round(ybase - height * 4 * t * (1 - t)), 'C')
    def rows(s):
        return [''.join(r) for r in s.g]

def meadow():
    l = L(132, 14)
    l.ground(0, 21, 11); l.put(2, 10, 'P'); l.put(5, 10, 'i')
    l.coins(8, 12, 9); l.put(17, 10, 'S')
    l.ground(22, 31, 10); l.coins(24, 28, 8)
    l.put(30, 9, 'i')                                   # double jump sign
    l.arc(32, 36, 7, 3)                                 # pit 32-35
    l.ground(36, 52, 11); l.plat(39, 42, 8); l.coins(39, 42, 7)
    l.put(44, 10, 'S')
    l.ground(47, 52, 8); l.coins(48, 51, 7); l.put(50, 7, 'h')
    l.plat(55, 57, 9, '-'); l.coins(55, 57, 8)          # pit 53-59 with one-way ledge
    l.ground(60, 84, 11); l.put(62, 10, 'K'); l.put(65, 10, 'i'); l.put(68, 10, 'f')
    l.put(73, 10, 'S'); l.put(79, 10, 'S'); l.coins(71, 82, 9, 2)
    l.arc(85, 92, 8, 4)                                 # wide pit 85-91 (sprint / double jump)
    l.ground(92, 108, 11); l.put(96, 10, '^'); l.put(97, 10, '^'); l.coins(95, 98, 7)
    l.put(101, 10, 'S'); l.put(104, 10, 'B'); l.put(105, 10, 'B'); l.put(105, 9, 'B')
    l.plat(108, 110, 9); l.plat(112, 114, 7); l.coins(108, 110, 8); l.coins(112, 114, 6)
    l.put(113, 6, '1')
    l.ground(111, 131, 11); l.coins(117, 121, 9); l.put(126, 10, 'G')
    return l

def canopy():
    l = L(156, 18)
    l.ground(0, 18, 15); l.put(2, 14, 'P'); l.coins(6, 10, 13)
    l.put(12, 14, 'S')
    # wall-jump shaft tutorial: two walls, gap 3
    l.fill(19, 21, 4, 11); l.fill(25, 27, 4, 17); l.ground(19, 24, 15)
    l.put(16, 14, 'i')
    l.coins(23, 23, 13); l.coins(23, 23, 11); l.coins(23, 23, 9); l.coins(23, 23, 7)
    l.plat(28, 33, 4, '-'); l.coins(28, 33, 3)
    l.ground(28, 40, 15); l.put(34, 14, 'S'); l.put(30, 14, 'h')
    l.plat(36, 40, 11, '-'); l.plat(41, 45, 8, '-'); l.coins(42, 45, 7); l.put(46, 6, 'b')
    l.plat(28, 33, 9, '-')
    l.ground(41, 50, 15); l.put(47, 14, 'S')
    l.ground(51, 66, 13); l.put(54, 12, 'K'); l.put(60, 12, 'E'); l.coins(57, 64, 11, 2)
    # canopy one-way bridge over pit 67-82
    l.plat(67, 71, 10, '-'); l.plat(74, 78, 8, '-'); l.plat(81, 84, 10, '-')
    l.coins(67, 71, 9); l.coins(74, 78, 7); l.put(76, 6, 'b'); l.put(76, 7, 'm')
    l.ground(83, 98, 13); l.put(88, 12, 'S'); l.put(94, 12, 'S'); l.coins(86, 97, 11, 3)
    # tall tree trunk with wall-jump climb
    l.fill(99, 101, 4, 9); l.ground(99, 101, 13); l.fill(105, 107, 7, 17); l.ground(102, 104, 15)
    l.coins(103, 103, 12); l.coins(103, 103, 9); l.coins(103, 103, 6)
    l.plat(95, 98, 4, '-'); l.coins(95, 98, 3); l.put(96, 3, 's')
    l.ground(108, 122, 13); l.put(110, 12, 'K'); l.put(115, 12, 'E'); l.put(119, 9, 'b')
    l.plat(116, 118, 9); l.coins(116, 118, 8)
    l.arc(123, 128, 11, 3)
    l.ground(128, 155, 13); l.put(132, 12, 'S'); l.put(137, 12, '^'); l.put(138, 12, '^')
    l.put(142, 12, 'S'); l.coins(140, 146, 10); l.put(150, 12, 'G')
    return l

def hollow():
    l = L(116, 14)
    l.ground(0, 24, 11); l.put(2, 10, 'P'); l.coins(6, 10, 9); l.put(14, 10, 'S'); l.put(20, 10, 'E')
    l.plat(26, 28, 9); l.plat(31, 33, 7); l.plat(36, 38, 9); l.coins(31, 33, 6); l.put(32, 5, 'h')
    l.ground(39, 66, 11); l.put(41, 10, 'K'); l.put(47, 10, 'S'); l.put(52, 10, 'E'); l.put(57, 10, 'S')
    l.coins(45, 60, 9, 3); l.put(59, 6, 'b'); l.put(63, 10, 's')
    l.put(65, 10, 'i')
    # Arena: entry column 69 closes when the fight starts. Walls on both ends.
    l.ground(67, 115, 11); l.put(70, 10, 'A'); l.fill(113, 115, 0, 10)
    l.plat(76, 79, 7, '-'); l.plat(101, 104, 7, '-'); l.plat(88, 92, 5, '-')
    l.coins(76, 79, 6); l.coins(101, 104, 6); l.coins(88, 92, 4)
    l.put(97, 10, 'X'); l.put(108, 10, 'G')
    return l

def cliffs():
    l = L(176, 16)
    l.ground(0, 14, 13); l.put(2, 12, 'P'); l.coins(5, 10, 11)
    l.plat(16, 18, 11); l.plat(21, 23, 9); l.plat(26, 28, 11); l.coins(21, 23, 8); l.put(24, 7, 'b')
    l.ground(30, 44, 13); l.put(35, 12, 'E'); l.put(40, 12, 'S'); l.coins(32, 43, 11, 2)
    # cliff wall climb
    l.fill(45, 47, 6, 10); l.ground(45, 47, 13); l.fill(51, 53, 3, 15); l.ground(48, 50, 14)
    l.coins(49, 49, 12); l.coins(49, 49, 9); l.coins(49, 49, 6)
    l.ground(54, 70, 6); l.put(56, 5, 'K'); l.put(62, 5, 'S'); l.put(67, 5, 'E'); l.coins(58, 69, 4, 2)
    l.put(58, 3, 'b')
    # descending floating isles across the void
    l.plat(73, 76, 8); l.plat(80, 82, 10); l.plat(86, 89, 8, '-'); l.plat(93, 95, 10); l.plat(99, 102, 12)
    l.coins(73, 76, 7); l.coins(80, 82, 9); l.coins(86, 89, 7); l.coins(93, 95, 9); l.put(84, 6, 'b'); l.put(97, 8, 'b')
    l.put(87, 6, 'f')
    l.ground(104, 124, 13); l.put(106, 12, 'K'); l.put(111, 12, '^'); l.put(112, 12, '^')
    l.put(116, 12, 'E'); l.put(121, 12, 'S'); l.coins(110, 113, 9)
    l.plat(114, 117, 9, '-'); l.coins(114, 117, 8); l.put(119, 7, 'h')
    l.arc(125, 131, 11, 4)
    l.ground(131, 150, 13); l.put(134, 12, 'S'); l.put(139, 12, 'E'); l.put(144, 12, 'S'); l.put(140, 9, 'b')
    l.put(146, 10, '1'); l.plat(145, 147, 11)
    l.fill(151, 152, 9, 12, '#'); l.put(151, 8, '^')
    l.ground(151, 175, 13); l.coins(155, 162, 11); l.put(158, 12, 'S'); l.put(170, 12, 'G')
    return l

def caverns():
    l = L(176, 16)
    l.fill(0, 175, 0, 1)                                 # cave ceiling
    l.ground(0, 16, 13); l.put(2, 12, 'P'); l.coins(5, 12, 11)
    l.fill(10, 16, 2, 5)
    l.ground(17, 22, 15); l.fill(17, 22, 14, 14, '^')   # spike pit
    l.plat(18, 21, 10, '-'); l.coins(18, 21, 9)
    l.ground(23, 40, 13); l.put(27, 12, 'E'); l.put(33, 12, 'S'); l.put(37, 12, 'E'); l.fill(24, 40, 2, 7)
    l.coins(26, 39, 11, 2); l.put(30, 9, 'b')
    l.ground(41, 44, 15); l.fill(41, 44, 14, 14, '^'); l.plat(41, 44, 10)
    l.ground(45, 60, 13); l.put(47, 12, 'K'); l.put(52, 12, 'm'); l.fill(50, 58, 2, 4)
    l.put(55, 12, 'S'); l.put(58, 12, 'S')
    # vertical shaft up and over
    l.fill(61, 63, 6, 10); l.ground(61, 63, 13); l.fill(67, 69, 3, 15); l.ground(64, 66, 15); l.fill(64, 66, 14, 14, '^')
    l.plat(64, 66, 13, '-'); l.coins(65, 65, 9); l.coins(65, 65, 7); l.coins(65, 65, 5)
    l.ground(70, 92, 13); l.put(72, 12, 'h'); l.put(77, 12, 'E'); l.put(82, 12, 'S')
    l.put(87, 12, 'E'); l.coins(74, 91, 10, 2); l.put(80, 6, 'b'); l.put(88, 6, 'b')
    l.ground(93, 98, 15); l.fill(93, 98, 14, 14, '^')
    l.plat(94, 96, 11, '-'); l.coins(94, 96, 10)
    l.ground(99, 118, 13); l.put(101, 12, 'K'); l.fill(99, 118, 2, 6)
    l.put(105, 12, 'S'); l.put(109, 12, 'E'); l.put(113, 12, 'S'); l.coins(104, 116, 11, 3)
    l.plat(119, 121, 11, '-'); l.plat(124, 126, 9, '-'); l.plat(129, 131, 11, '-')
    l.coins(119, 121, 10); l.coins(124, 126, 8); l.coins(129, 131, 10); l.put(125, 6, 'b'); l.put(125, 7, 's')
    l.ground(119, 133, 15); l.fill(119, 133, 14, 14, '^')
    l.ground(134, 175, 13); l.put(138, 12, 'E'); l.put(144, 12, 'S'); l.put(150, 12, 'E')
    l.fill(140, 146, 9, 9, '='); l.coins(140, 146, 8); l.put(156, 12, 'S'); l.put(160, 12, '1')
    l.coins(162, 167, 11); l.put(170, 12, 'G')
    return l

def peak():
    l = L(160, 16)
    l.ground(0, 14, 13); l.put(2, 12, 'P'); l.coins(5, 12, 11)
    l.plat(16, 18, 11); l.plat(21, 23, 9); l.plat(26, 28, 7); l.coins(16, 18, 10); l.coins(21, 23, 8); l.coins(26, 28, 6)
    l.ground(30, 46, 8); l.put(33, 7, 'E'); l.put(38, 7, 'S'); l.put(43, 7, 'E'); l.coins(32, 45, 6, 2); l.put(40, 4, 'b')
    l.ground(47, 50, 15); l.fill(47, 50, 14, 14, '^')
    l.ground(51, 64, 10); l.put(53, 9, 'K'); l.put(58, 9, 'S'); l.put(62, 9, 'E'); l.put(60, 6, 'b'); l.coins(55, 63, 8, 2)
    l.fill(65, 67, 3, 8); l.ground(65, 67, 10); l.fill(71, 73, 5, 15); l.ground(68, 70, 15); l.fill(68, 70, 14, 14, '^')
    l.plat(68, 70, 10, '-'); l.coins(69, 69, 9); l.coins(69, 69, 6)
    l.ground(74, 98, 13); l.put(77, 12, 'h'); l.put(81, 12, 'E'); l.put(86, 12, 'S'); l.put(91, 12, 'E')
    l.put(84, 8, 'b'); l.put(94, 8, 'b'); l.coins(79, 97, 10, 3); l.plat(87, 90, 9, '-'); l.put(88, 8, 's')
    l.ground(99, 160 - 1, 13); l.put(101, 12, 'K'); l.put(104, 12, 'i')
    l.put(108, 12, 'A'); l.fill(157, 159, 0, 12)
    l.plat(114, 117, 9, '-'); l.plat(144, 147, 9, '-'); l.plat(128, 133, 6, '-')
    l.coins(114, 117, 8); l.coins(144, 147, 8); l.coins(128, 133, 5)
    l.put(138, 12, 'X'); l.put(152, 12, 'G')
    return l

LEVELS = {'meadow': meadow, 'canopy': canopy, 'hollow': hollow, 'cliffs': cliffs, 'caverns': caverns, 'peak': peak}

if __name__ == '__main__':
    for name, fn in LEVELS.items():
        rows = fn().rows()
        print(f'// {name} ({len(rows[0])}x{len(rows)})')
        for r in rows: print(r)
        print()
