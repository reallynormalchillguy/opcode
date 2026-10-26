"""Tiles, palettes and the level of Opcode's demo cartridge.

Pictures are 8 x 8 characters: '.' is colour 0 (see-through), '1' '2' '3'
the palette's other colours.
"""

# ---------- Sprite tiles (pattern table 0000) ----------

SPRITES = {
    # The robot, 16 x 16: top-left, top-right, bottom-left, bottom-right.
    0x01: """
        ..111111
        .1333333
        .1322222
        .1323223
        .1322222
        .1333333
        ..111111
        ...13333
    """,
    0x02: """
        111111..
        3333331.
        2222231.
        3223231.
        2222231.
        3333331.
        111111..
        33331...
    """,
    0x03: """
        ..133333
        .1333113
        .1313113
        ..133333
        ...11111
        ...13.13
        ...13.13
        ..111.11
    """,
    0x04: """
        33331...
        3113331.
        3113131.
        33331...
        11111...
        31.31...
        31.31...
        11.111..
    """,
    # Bottom half again with the legs apart (walking).
    0x05: """
        ..133333
        .1333113
        .1313113
        ..133333
        ...11111
        ..13..13
        .13...13
        .11...11
    """,
    0x06: """
        33331...
        3113331.
        3113131.
        33331...
        11111...
        31...31.
        31....31
        11....11
    """,
    # A byte to collect.
    0x07: """
        ...11...
        ..1221..
        .122321.
        12233321
        12232321
        .122321.
        ..1221..
        ...11...
    """,
    # A drone that flies behind the bushes.
    0x08: """
        11....11
        .111111.
        12233221
        12333321
        .122221.
        ..1221..
        ...11...
        ........
    """,
    # Sprite 0: one row, hidden behind the bottom row of the byte icon in
    # the status bar. The PPU notices where they overlap.
    0x09: """
        ...33...
        ........
        ........
        ........
        ........
        ........
        ........
        ........
    """,
}

# ---------- Background tiles (pattern table 1000) ----------

FONT = {
    '0': ['.111.', '1...1', '1..11', '1.1.1', '11..1', '1...1', '.111.'],
    '1': ['..1..', '.11..', '..1..', '..1..', '..1..', '..1..', '.111.'],
    '2': ['.111.', '1...1', '....1', '...1.', '..1..', '.1...', '11111'],
    '3': ['11111', '...1.', '..1..', '...1.', '....1', '1...1', '.111.'],
    '4': ['...1.', '..11.', '.1.1.', '1..1.', '11111', '...1.', '...1.'],
    '5': ['11111', '1....', '1111.', '....1', '....1', '1...1', '.111.'],
    '6': ['..11.', '.1...', '1....', '1111.', '1...1', '1...1', '.111.'],
    '7': ['11111', '....1', '...1.', '..1..', '.1...', '.1...', '.1...'],
    '8': ['.111.', '1...1', '1...1', '.111.', '1...1', '1...1', '.111.'],
    '9': ['.111.', '1...1', '1...1', '.1111', '....1', '...1.', '.11..'],
    'A': ['.111.', '1...1', '1...1', '11111', '1...1', '1...1', '1...1'],
    'B': ['1111.', '1...1', '1...1', '1111.', '1...1', '1...1', '1111.'],
    'C': ['.111.', '1...1', '1....', '1....', '1....', '1...1', '.111.'],
    'D': ['111..', '1..1.', '1...1', '1...1', '1...1', '1..1.', '111..'],
    'E': ['11111', '1....', '1....', '1111.', '1....', '1....', '11111'],
    'M': ['1...1', '11.11', '1.1.1', '1.1.1', '1...1', '1...1', '1...1'],
    'O': ['.111.', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    'P': ['1111.', '1...1', '1...1', '1111.', '1....', '1....', '1....'],
    'S': ['.1111', '1....', '1....', '.111.', '....1', '....1', '1111.'],
    'T': ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '..1..'],
    'U': ['1...1', '1...1', '1...1', '1...1', '1...1', '1...1', '.111.'],
    'Y': ['1...1', '1...1', '.1.1.', '..1..', '..1..', '..1..', '..1..'],
    '/': ['....1', '....1', '...1.', '..1..', '.1...', '1....', '1....'],
    'x': ['.....', '.....', '1...1', '.1.1.', '..1..', '.1.1.', '1...1'],
}

BACKGROUND = {
    # Ground: grass on top, bricks below.
    0x80: """
        22222222
        23222232
        33333333
        11111111
        33313333
        33313333
        33313333
        11111111
    """,
    0x81: """
        22222222
        22322223
        33333333
        11111111
        33333133
        33333133
        33333133
        11111111
    """,
    0x82: """
        33313333
        33313333
        33313333
        11111111
        33333331
        33333331
        33333331
        11111111
    """,
    0x83: """
        33333133
        33333133
        33333133
        11111111
        31333333
        31333333
        31333333
        11111111
    """,
    # A chip: the top of a pillar, then its body.
    0x88: """
        .3.3.3.3
        .3.3.3.3
        11111111
        11111111
        11211111
        11111111
        11111111
        11111111
    """,
    0x89: """
        3.3.3.3.
        3.3.3.3.
        11111111
        11111111
        11111111
        11111111
        11111211
        11111111
    """,
    0x8A: """
        31111111
        11111111
        31111111
        11111111
        31111111
        11111111
        31111111
        11111111
    """,
    0x8B: """
        11111113
        11111111
        11111113
        11111111
        11111113
        11111111
        11111113
        11111111
    """,
    # A cloud, 16 x 16.
    0x90: """
        ........
        .....111
        ....1222
        ..111222
        .1222222
        12222222
        12222222
        .1222222
    """,
    0x91: """
        ........
        11......
        221.....
        2221111.
        22222221
        22222221
        22222221
        2222221.
    """,
    0x92: """
        ..133333
        ...11111
        ........
        ........
        ........
        ........
        ........
        ........
    """,
    0x93: """
        3333331.
        111111..
        ........
        ........
        ........
        ........
        ........
        ........
    """,
    # A bush, 16 x 16.
    0x98: """
        ........
        ........
        .....333
        ...33222
        ..322222
        .3222212
        32222122
        32221222
    """,
    0x99: """
        ........
        ........
        333.....
        22233...
        222223..
        2122223.
        22122223
        22212223
    """,
    0x9A: """
        32222222
        32212222
        32221222
        32222212
        32222122
        32222222
        33222222
        .3333333
    """,
    0x9B: """
        22222223
        22212223
        22122223
        21222223
        12222223
        22222223
        22222233
        3333333.
    """,
    # The byte icon in the status bar.
    0xA0: """
        ...33...
        ..3223..
        .322223.
        32222223
        32222223
        .322223.
        ..3223..
        ...33...
    """,
}

# ---------- Palettes ----------

PALETTES = [
    0x22, 0x0F, 0x17, 0x27,   # background 0: ground and chips
    0x22, 0x30, 0x3C, 0x0F,   # background 1: clouds
    0x22, 0x0A, 0x1A, 0x2A,   # background 2: bushes
    0x22, 0x30, 0x28, 0x0F,   # background 3: status bar
    0x22, 0x0F, 0x16, 0x30,   # sprite 0: the robot
    0x22, 0x18, 0x28, 0x38,   # sprite 1: bytes
    0x22, 0x0F, 0x2A, 0x1A,   # sprite 2: the drone
    0x22, 0x30, 0x28, 0x0F,   # sprite 3: sprite 0
]

# ---------- The level ----------

GROUND = 192
# Floor height (y of the top of the floor) of each 16-pixel column of the
# 512-pixel level.
FLOOR = ([192] * 6 + [176, 160] + [192] * 2 + [176, 160, 144, 144] + [192] * 3 + [160, 160]
         + [192] * 3 + [176, 160, 144, 128] + [192] * 6)
assert len(FLOOR) == 32

CLOUDS = [(3, 6), (11, 5), (20, 7), (27, 5)]          # (column, tile row) of each cloud
BUSHES = [2, 9, 15, 20, 28]                           # columns with a bush on the ground
BYTES = [(52, 168), (116, 136), (204, 120), (284, 136), (404, 104), (468, 168)]  # (x, y) of each byte

BAR = [
    (1, 2, 'OPCODE DEMO'),
    (1, 21, 'BYTES'),
    (2, 21, '\x01x0/6'),
]


def tile_bytes(picture):
    rows = [r.strip() for r in picture.strip().splitlines()]
    assert len(rows) == 8 and all(len(r) == 8 for r in rows), picture
    lo, hi = [], []
    for r in rows:
        a = b = 0
        for ch in r:
            c = 0 if ch == '.' else int(ch)
            a = a << 1 | (c & 1)
            b = b << 1 | (c >> 1)
        lo.append(a)
        hi.append(b)
    return lo + hi


def font_tile(rows):
    pic = ['........'] + ['.' + r.replace('1', '1') + '..' for r in rows]
    return tile_bytes('\n'.join(pic))


def chr_rom():
    data = bytearray(0x2000)
    for n, pic in SPRITES.items():
        data[n * 16:n * 16 + 16] = bytes(tile_bytes(pic))
    for n, pic in BACKGROUND.items():
        data[0x1000 + n * 16:0x1000 + n * 16 + 16] = bytes(tile_bytes(pic))
    for ch, rows in FONT.items():
        n = ord(ch)
        data[0x1000 + n * 16:0x1000 + n * 16 + 16] = bytes(font_tile(rows))
    return bytes(data)


def nametables():
    """Two nametables (with their attribute tables), 2 x 1024 bytes."""
    tiles = [[0] * 64 for _ in range(30)]       # 64 tiles wide: both nametables
    attr = [[0] * 32 for _ in range(15)]        # palette of each 16 x 16 area
    for col, floor in enumerate(FLOOR):
        for r in range(floor // 8, 30):
            for half in (0, 1):
                x = col * 2 + half
                if r >= GROUND // 8:
                    tiles[r][x] = (0x80 + half) if r == GROUND // 8 else (0x82 + half)
                elif r == floor // 8:
                    tiles[r][x] = 0x88 + half
                else:
                    tiles[r][x] = 0x8A + half
    for col, row in CLOUDS:
        for dy in (0, 1):
            for dx in (0, 1):
                tiles[row + dy][col * 2 + dx] = 0x90 + dy * 2 + dx
        attr[row // 2][col] = 1
        attr[(row + 1) // 2][col] = 1
    for col in BUSHES:
        assert FLOOR[col] == GROUND
        for dy in (0, 1):
            for dx in (0, 1):
                tiles[GROUND // 8 - 2 + dy][col * 2 + dx] = 0x98 + dy * 2 + dx
        attr[(GROUND // 8 - 2) // 2][col] = 2
    for row, col, text in BAR:
        for i, ch in enumerate(text):
            tiles[row][col + i] = 0xA0 if ch == '\x01' else ord(ch)
    for c in range(32):
        attr[0][c] = attr[1][c] = 3
    out = bytearray()
    for table in (0, 1):
        for r in range(30):
            out += bytes(tiles[r][table * 32:(table + 1) * 32])
        for ay in range(8):
            for ax in range(8):
                v = 0
                for i, (dy, dx) in enumerate(((0, 0), (0, 1), (1, 0), (1, 1))):
                    y, x = ay * 2 + dy, table * 16 + ax * 2 + dx
                    p = attr[y][x] if y < 15 else 0
                    v |= p << (2 * i)
                out.append(v)
    assert len(out) == 2048
    return bytes(out)
