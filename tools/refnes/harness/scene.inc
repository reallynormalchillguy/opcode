// A small scene in CHR RAM for the picture tests.
static void w(int reg, uint8_t v) { ppu_register_write(reg, v); }
static void set_addr(uint16_t a) { ppu_register_read(2); w(6, (uint8_t)(a >> 8)); w(6, (uint8_t)a); }

static char letter(uint32_t rgb) {
    static const struct { uint8_t colour; char c; } KNOWN[] = {
        { 0x0F, '.' }, { 0x16, 'r' }, { 0x2A, 'g' }, { 0x12, 'b' }, { 0x30, 'w' }, { 0x28, 'y' }, { 0x14, 'p' }, { 0x21, 'c' },
    };
    for (unsigned i = 0; i < sizeof KNOWN / sizeof KNOWN[0]; i++) {
        if (NES_PALETTE[KNOWN[i].colour] == rgb) return KNOWN[i].c;
    }
    return '?';
}

static void show_area(int x0, int y0, int w_, int h) {
    const uint32_t *px = ppu_pixels();
    for (int y = y0; y < y0 + h; y++) {
        printf("  ");
        for (int x = x0; x < x0 + w_; x++) putchar(letter(px[y * 256 + x]));
        putchar('\n');
    }
}

static void finish_frame(void) {
    ppu_take_frame();
    long n = 0;
    do { ppu_tick(); n++; } while (!ppu_take_frame() && n < 200000);
}

static void tile(uint16_t table, int n, const char *rows) {
    // rows: 64 characters, '.' or '1'-'3'
    uint8_t lo[8] = { 0 }, hi[8] = { 0 };
    for (int i = 0; i < 64; i++) {
        int c = rows[i] == '.' ? 0 : rows[i] - '0';
        lo[i / 8] |= (uint8_t)((c & 1) << (7 - i % 8));
        hi[i / 8] |= (uint8_t)(((c >> 1) & 1) << (7 - i % 8));
    }
    set_addr((uint16_t)(table + n * 16));
    for (int i = 0; i < 8; i++) w(7, lo[i]);
    for (int i = 0; i < 8; i++) w(7, hi[i]);
}

static const char SOLID1[] = "1111111111111111111111111111111111111111111111111111111111111111";
static const char SOLID2[] = "2222222222222222222222222222222222222222222222222222222222222222";
static const char SOLID3[] = "3333333333333333333333333333333333333333333333333333333333333333";
static const char HALF2[] = "2222....2222....2222....2222....2222....2222....2222....2222....";
static const char ARROW[] = "3111....2.......2.......2222....2.......2.......2.......2.......";

static void sprite(int i, int y, int tile_, int attr, int x) {
    w(3, (uint8_t)(i * 4));
    w(4, (uint8_t)y);
    w(4, (uint8_t)tile_);
    w(4, (uint8_t)attr);
    w(4, (uint8_t)x);
}

// Background tiles in 1000: 1 solid colour 1, 2 left half colour 2.
// Sprite tiles in 0000: 1 an arrow, 2 solid 3, 4 and 5 solid 1 and 2 (a
// tall sprite); in 1000: 6 and 7 solid 3 and 1.
static void build_sprite_scene(void) {
    cart_load(rom_file, make_rom(1, 0, 0x01, 0));
    ppu_reset();
    tile(0x1000, 1, SOLID1);
    tile(0x1000, 2, HALF2);
    tile(0x0000, 1, ARROW);
    tile(0x0000, 2, SOLID3);
    tile(0x0000, 4, SOLID1);
    tile(0x0000, 5, SOLID2);
    tile(0x1000, 6, SOLID3);
    tile(0x1000, 7, SOLID1);
    static const uint8_t pal[32] = {
        0x0F, 0x30, 0x16, 0x2A, 0x0F, 0x30, 0x16, 0x2A, 0x0F, 0x30, 0x16, 0x2A, 0x0F, 0x30, 0x16, 0x2A,
        0x0F, 0x12, 0x28, 0x14, 0x0F, 0x21, 0x16, 0x30, 0x0F, 0x2A, 0x2A, 0x2A, 0x0F, 0x14, 0x14, 0x14,
    };
    set_addr(0x3F00);
    for (int i = 0; i < 32; i++) w(7, pal[i]);
    for (int i = 0; i < 64; i++) sprite(i, 0xFF, 0, 0, 0);   // all hidden
    w(0, 0x10);                                             // background from 1000, sprites from 0000
    w(1, 0x1E);                                             // everything on
}

static void put_tile(int tx, int ty, uint8_t t) {
    set_addr((uint16_t)(0x2000 + ty * 32 + tx));
    w(7, t);
    ppu_register_read(2);
    w(5, 0);
    w(5, 0);
}

static uint32_t crc_rows(int first, int last) {
    const uint32_t *px = ppu_pixels();
    uint32_t crc = 0xFFFFFFFF;
    for (int i = first * 256; i < (last + 1) * 256; i++) {
        uint32_t v = px[i] & 0xFFFFFF;
        for (int b = 0; b < 24; b++) {
            uint32_t bit = ((v >> b) ^ crc) & 1;
            crc >>= 1;
            if (bit) crc ^= 0xEDB88320;
        }
    }
    return crc ^ 0xFFFFFFFF;
}
