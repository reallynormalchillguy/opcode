namespace {

// A small scene in CHR RAM for the picture tests.
void w(int reg, std::uint8_t v) { ppu.register_write(reg, v); }
void set_addr(std::uint16_t a) { ppu.register_read(2); w(6, static_cast<std::uint8_t>(a >> 8)); w(6, static_cast<std::uint8_t>(a)); }

char letter(std::uint32_t rgb) {
    struct Known { std::uint8_t colour; char c; };
    const Known known[] = {
        {0x0F, '.'}, {0x16, 'r'}, {0x2A, 'g'}, {0x12, 'b'}, {0x30, 'w'}, {0x28, 'y'}, {0x14, 'p'}, {0x21, 'c'},
    };
    for (const Known& k : known) {
        if (kNesPalette[k.colour] == rgb) return k.c;
    }
    return '?';
}

void show_area(int x0, int y0, int w_, int h) {
    const std::uint32_t* px = ppu.pixels();
    for (int y = y0; y < y0 + h; y++) {
        std::printf("  ");
        for (int x = x0; x < x0 + w_; x++) std::putchar(letter(px[y * 256 + x]));
        std::putchar('\n');
    }
}

void finish_frame() {
    ppu.take_frame();
    long n = 0;
    do { ppu.tick(); n++; } while (!ppu.take_frame() && n < 200000);
}

void tile(std::uint16_t table, int n, const char* rows) {
    // rows: 64 characters, '.' or '1'-'3'
    std::uint8_t lo[8] = {0}, hi[8] = {0};
    for (int i = 0; i < 64; i++) {
        int c = rows[i] == '.' ? 0 : rows[i] - '0';
        lo[i / 8] |= static_cast<std::uint8_t>((c & 1) << (7 - i % 8));
        hi[i / 8] |= static_cast<std::uint8_t>(((c >> 1) & 1) << (7 - i % 8));
    }
    set_addr(static_cast<std::uint16_t>(table + n * 16));
    for (int i = 0; i < 8; i++) w(7, lo[i]);
    for (int i = 0; i < 8; i++) w(7, hi[i]);
}

const char kSolid1[] = "1111111111111111111111111111111111111111111111111111111111111111";
const char kSolid2[] = "2222222222222222222222222222222222222222222222222222222222222222";
const char kSolid3[] = "3333333333333333333333333333333333333333333333333333333333333333";
const char kHalf2[] = "2222....2222....2222....2222....2222....2222....2222....2222....";
const char kArrow[] = "3111....2.......2.......2222....2.......2.......2.......2.......";

void sprite(int i, int y, int tile_, int attr, int x) {
    w(3, static_cast<std::uint8_t>(i * 4));
    w(4, static_cast<std::uint8_t>(y));
    w(4, static_cast<std::uint8_t>(tile_));
    w(4, static_cast<std::uint8_t>(attr));
    w(4, static_cast<std::uint8_t>(x));
}

// Background tiles in 1000: 1 solid colour 1, 2 left half colour 2.
// Sprite tiles in 0000: 1 an arrow, 2 solid 3, 4 and 5 solid 1 and 2 (a
// tall sprite); in 1000: 6 and 7 solid 3 and 1.
void build_sprite_scene() {
    cart.load(make_rom(1, 0, 0x01, 0));
    ppu.reset();
    tile(0x1000, 1, kSolid1);
    tile(0x1000, 2, kHalf2);
    tile(0x0000, 1, kArrow);
    tile(0x0000, 2, kSolid3);
    tile(0x0000, 4, kSolid1);
    tile(0x0000, 5, kSolid2);
    tile(0x1000, 6, kSolid3);
    tile(0x1000, 7, kSolid1);
    const std::uint8_t pal[32] = {
        0x0F, 0x30, 0x16, 0x2A, 0x0F, 0x30, 0x16, 0x2A, 0x0F, 0x30, 0x16, 0x2A, 0x0F, 0x30, 0x16, 0x2A,
        0x0F, 0x12, 0x28, 0x14, 0x0F, 0x21, 0x16, 0x30, 0x0F, 0x2A, 0x2A, 0x2A, 0x0F, 0x14, 0x14, 0x14,
    };
    set_addr(0x3F00);
    for (int i = 0; i < 32; i++) w(7, pal[i]);
    for (int i = 0; i < 64; i++) sprite(i, 0xFF, 0, 0, 0);   // all hidden
    w(0, 0x10);                                             // background from 1000, sprites from 0000
    w(1, 0x1E);                                             // everything on
}

void put_tile(int tx, int ty, std::uint8_t t) {
    set_addr(static_cast<std::uint16_t>(0x2000 + ty * 32 + tx));
    w(7, t);
    ppu.register_read(2);
    w(5, 0);
    w(5, 0);
}

std::uint32_t crc_rows(int first, int last) {
    const std::uint32_t* px = ppu.pixels();
    std::uint32_t crc = 0xFFFFFFFF;
    for (int i = first * 256; i < (last + 1) * 256; i++) {
        std::uint32_t v = px[i] & 0xFFFFFF;
        for (int b = 0; b < 24; b++) {
            std::uint32_t bit = ((v >> b) ^ crc) & 1;
            crc >>= 1;
            if (bit) crc ^= 0xEDB88320;
        }
    }
    return crc ^ 0xFFFFFFFF;
}

}  // namespace
