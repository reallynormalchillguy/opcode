#include <string.h>
#include "ppu.h"
#include "cart.h"
//@ 21
#include "palette.h"
//@ end

// ---------- Memory ----------

static uint8_t vram[0x800];      // 2 KB: two physical nametables
static uint8_t palette_ram[32];
//@ 18

// ---------- Registers ----------

static uint8_t ctrl;             // 2000 PPUCTRL
//@ end
//@ 19
static uint8_t mask;             // 2001 PPUMASK
//@ end
//@ 18
static uint8_t status;           // 2002 PPUSTATUS
//@ end
//@ 19
static uint8_t oam_addr;         // 2003 OAMADDR
//@ end
//@ 19-21
static uint8_t oam[256];         // sprite memory, used in a later lesson
//@ end
//@ 22
static uint8_t oam[256];         // sprite memory: 64 sprites of 4 bytes
//@ end
//@ 19-27
static uint8_t scroll_x;         // 2005 PPUSCROLL, first write
static uint8_t scroll_y;         // 2005 PPUSCROLL, second write
//@ end
//@ 18-27
static uint16_t vram_addr;       // 2006 PPUADDR: where 2007 reads and writes
static int write_latch;          // 0: next 2005/2006 write is the first one
//@ end
//@ 28
// The scroll and the address, kept the way the PPU keeps them:
static uint16_t v;               // the address 2007 uses, and where drawing reads from
static uint16_t t;               // the next value for v: 2000, 2005 and 2006 writes build it
static uint8_t fine_x;           // horizontal scroll inside a tile, 0-7
static int w;                    // 0: next 2005/2006 write is the first one
//@ end
//@ 18
static uint8_t read_buffer;      // 2007 reads are delayed by one
//@ end
//@ 20

// ---------- Timing ----------

static int scanline;             // 0-261
static int dot;                  // 0-340
static int nmi_pending;
static int frame_ready;
//@ end
//@ 21

// ---------- The picture ----------

static uint32_t pixels[PPU_WIDTH * PPU_HEIGHT];
//@ end

void ppu_reset(void) {
    memset(vram, 0, sizeof vram);
    memset(palette_ram, 0, sizeof palette_ram);
//@ 18
    ctrl = 0;
    status = 0;
//@ end
//@ 18-27
    vram_addr = 0;
    write_latch = 0;
//@ end
//@ 28
    v = 0;
    t = 0;
    fine_x = 0;
    w = 0;
//@ end
//@ 18
    read_buffer = 0;
//@ end
//@ 19
    mask = 0;
    oam_addr = 0;
    memset(oam, 0, sizeof oam);
//@ end
//@ 19-27
    scroll_x = 0;
    scroll_y = 0;
//@ end
//@ 20
    scanline = 0;
    dot = 0;
    nmi_pending = 0;
    frame_ready = 0;
//@ end
//@ 21
    memset(pixels, 0, sizeof pixels);
//@ end
}

// Which byte of vram a nametable address 2000-3EFF uses.
static uint16_t nametable_index(uint16_t addr) {
    uint16_t offset = (addr - 0x2000) & 0x0FFF;   // 0000-0FFF: four 1 KB tables
    int table = offset / 0x400;                   // 0, 1, 2 or 3
    int physical;
//@ 16-30
    if (cart_mirroring() == MIRROR_VERTICAL) {
        physical = table & 1;                     // 0 1 / 0 1
    } else {
        physical = table >> 1;                    // 0 0 / 1 1
    }
//@ end
//@ 31
    switch (cart_mirroring()) {
    case MIRROR_VERTICAL:
        physical = table & 1;                     // 0 1 / 0 1
        break;
    case MIRROR_HORIZONTAL:
        physical = table >> 1;                    // 0 0 / 1 1
        break;
    case MIRROR_ONE_LOW:
        physical = 0;                             // 0 0 / 0 0
        break;
    default:
        physical = 1;                             // 1 1 / 1 1
        break;
    }
//@ end
    return (uint16_t)(physical * 0x400 + (offset & 0x3FF));
}

// Which byte of palette_ram an address 3F00-3FFF uses.
static int palette_index(uint16_t addr) {
    int i = addr & 0x1F;
    // 3F10, 3F14, 3F18 and 3F1C are the same bytes as 3F00, 3F04, 3F08, 3F0C.
    if ((i & 0x13) == 0x10) {
        i &= 0x0F;
    }
    return i;
}

uint8_t ppu_read(uint16_t addr) {
    addr &= 0x3FFF;
    if (addr < 0x2000) {
        return cart_ppu_read(addr);
    }
    if (addr < 0x3F00) {
        return vram[nametable_index(addr)];
    }
    return palette_ram[palette_index(addr)];
}

void ppu_write(uint16_t addr, uint8_t value) {
    addr &= 0x3FFF;
    if (addr < 0x2000) {
        cart_ppu_write(addr, value);
    } else if (addr < 0x3F00) {
        vram[nametable_index(addr)] = value;
    } else {
        palette_ram[palette_index(addr)] = value;
    }
}
//@ 17

// ---------- Tiles ----------

// A tile is 16 bytes: 8 bytes for bit 0 of each pixel (one byte per row),
// then 8 bytes for bit 1. In each byte, bit 7 is the leftmost pixel.
void ppu_tile_row(uint16_t table, uint8_t tile, int row, uint8_t out[8]) {
    uint16_t base = (uint16_t)(table + tile * 16 + row);
    uint8_t lo = ppu_read(base);
    uint8_t hi = ppu_read((uint16_t)(base + 8));
    for (int x = 0; x < 8; x++) {
        int bit = 7 - x;
        out[x] = (uint8_t)(((lo >> bit) & 1) | (((hi >> bit) & 1) << 1));
    }
}
//@ end
//@ 18

// ---------- The CPU's view: 2000-2007 ----------

uint8_t ppu_register_read(int reg) {
    switch (reg) {
    case 2: {                                       // PPUSTATUS
        uint8_t value = (uint8_t)((status & 0xE0) | (read_buffer & 0x1F));
//@ end
//@ 20
        status &= (uint8_t)~0x80;                   // reading clears the vblank flag
//@ end
//@ 18-27
        write_latch = 0;                            // and resets the 2005/2006 latch
//@ end
//@ 28
        w = 0;                                      // and resets the 2005/2006 toggle
//@ end
//@ 18
        return value;
    }
//@ end
//@ 19
    case 4:                                         // OAMDATA
        return oam[oam_addr];
//@ end
//@ 18
    case 7: {                                       // PPUDATA
//@ end
//@ 18-27
        uint16_t addr = vram_addr & 0x3FFF;
//@ end
//@ 28
        uint16_t addr = v & 0x3FFF;
//@ end
//@ 18
        uint8_t value;
        if (addr >= 0x3F00) {
            value = ppu_read(addr);                 // the palette answers at once
            read_buffer = ppu_read((uint16_t)(addr - 0x1000));
        } else {
            value = read_buffer;                    // everything else is one read late
            read_buffer = ppu_read(addr);
        }
//@ end
//@ 18-27
        vram_addr = (uint16_t)((vram_addr + ((ctrl & 0x04) ? 32 : 1)) & 0x3FFF);
//@ end
//@ 28
        v = (uint16_t)((v + ((ctrl & 0x04) ? 32 : 1)) & 0x7FFF);
//@ end
//@ 18
        return value;
    }
    }
    return 0;
}

void ppu_register_write(int reg, uint8_t value) {
    switch (reg) {
    case 0:                                         // PPUCTRL
//@ end
//@ 20
        // Turning NMIs on during the vertical blank raises one straight away.
        if (!(ctrl & 0x80) && (value & 0x80) && (status & 0x80)) {
            nmi_pending = 1;
        }
//@ end
//@ 18
        ctrl = value;
//@ end
//@ 28
        t = (uint16_t)((t & ~0x0C00) | ((value & 0x03) << 10));   // nametable bits
//@ end
//@ 18
        break;
//@ end
//@ 19
    case 1:                                         // PPUMASK
        mask = value;
        break;
    case 3:                                         // OAMADDR
        oam_addr = value;
        break;
    case 4:                                         // OAMDATA
        oam[oam_addr++] = value;
        break;
//@ end
//@ 19-27
    case 5:                                         // PPUSCROLL
        if (write_latch == 0) {
            scroll_x = value;
        } else {
            scroll_y = value;
        }
        write_latch ^= 1;
        break;
//@ end
//@ 18-27
    case 6:                                         // PPUADDR: high byte, then low byte
        if (write_latch == 0) {
            vram_addr = (uint16_t)(((value & 0x3F) << 8) | (vram_addr & 0x00FF));
        } else {
            vram_addr = (uint16_t)((vram_addr & 0xFF00) | value);
        }
        write_latch ^= 1;
        break;
    case 7:                                         // PPUDATA
        ppu_write(vram_addr, value);
        vram_addr = (uint16_t)((vram_addr + ((ctrl & 0x04) ? 32 : 1)) & 0x3FFF);
        break;
//@ end
//@ 28
    case 5:                                         // PPUSCROLL
        if (w == 0) {                               // x: coarse x into t, fine x on its own
            t = (uint16_t)((t & ~0x001F) | (value >> 3));
            fine_x = value & 0x07;
        } else {                                    // y: coarse y and fine y into t
            t = (uint16_t)((t & ~0x73E0) | ((value & 0x07) << 12) | ((value & 0xF8) << 2));
        }
        w ^= 1;
        break;
    case 6:                                         // PPUADDR: high byte, then low byte
        if (w == 0) {
            t = (uint16_t)((t & 0x00FF) | ((value & 0x3F) << 8));
        } else {
            t = (uint16_t)((t & 0xFF00) | value);
            v = t;                                  // the second write sets the address
        }
        w ^= 1;
        break;
    case 7:                                         // PPUDATA
        ppu_write(v, value);
        v = (uint16_t)((v + ((ctrl & 0x04) ? 32 : 1)) & 0x7FFF);
        break;
//@ end
//@ 18
    }
}
//@ end
//@ 28

// The scroll registers, for tests and debuggers.
void ppu_scroll_regs(uint16_t *v_out, uint16_t *t_out, uint8_t *fine_x_out, int *w_out) {
    *v_out = v;
    *t_out = t;
    *fine_x_out = fine_x;
    *w_out = w;
}
//@ end
//@ 23

// ---------- Sprites ----------

// Which sprites are on scanline y. Puts the numbers (0-63) of the first eight
// into found, in OAM order, and returns how many there are in all: more than
// 8 means the PPU leaves some out.
int ppu_sprites_on_line(int y, uint8_t found[8]) {
    int height = (ctrl & 0x20) ? 16 : 8;            // PPUCTRL bit 5: 8 x 16 sprites
    int count = 0;
    for (int i = 0; i < 64; i++) {
        int top = oam[i * 4] + 1;                   // a sprite appears one line below its Y
        if (y >= top && y < top + height) {
            if (count < 8) {
                found[count] = (uint8_t)i;
            }
            count++;
        }
    }
    return count;
}
//@ end
//@ 21

// ---------- Drawing ----------

//@ end
//@ 21-23
// Draw scanline y of the background, using the scroll position and the
// nametable chosen in PPUCTRL.
static void render_scanline(int y) {
    uint32_t *row = &pixels[y * PPU_WIDTH];
//@ end
//@ 24-28
// Draw scanline y of the background into row. bg_pixel gets the colour
// number (0-3) of every pixel: the sprites need to know where it is 0.
static void draw_background(int y, uint32_t *row, uint8_t bg_pixel[PPU_WIDTH]) {
//@ end
//@ 21-28
    uint32_t backdrop = NES_PALETTE[ppu_read(0x3F00) & 0x3F];
    if (!(mask & 0x08)) {                           // background off
        for (int x = 0; x < PPU_WIDTH; x++) row[x] = backdrop;
//@ end
//@ 24-28
        memset(bg_pixel, 0, PPU_WIDTH);
//@ end
//@ 21-28
        return;
    }
//@ end
//@ 21-27
    // The four nametables form a 512 x 480 world; the screen is a window on it.
    int origin_x = ((ctrl & 0x01) ? 256 : 0) + scroll_x;
    int origin_y = ((ctrl & 0x02) ? 240 : 0) + scroll_y;
//@ end
//@ 28-28
    // The scroll is in t now: nametable in bits 10-11, coarse x in 0-4,
    // coarse y in 5-9, fine y in 12-14, and fine x on its own.
    int origin_x = ((t >> 10) & 1) * 256 + (t & 0x1F) * 8 + fine_x;
    int origin_y = ((t >> 11) & 1) * 240 + ((t >> 5) & 0x1F) * 8 + ((t >> 12) & 7);
//@ end
//@ 21-28
    uint16_t pattern_table = (ctrl & 0x10) ? 0x1000 : 0x0000;
    int wy = (origin_y + y) % 480;
    for (int x = 0; x < PPU_WIDTH; x++) {
        if (x < 8 && !(mask & 0x02)) {              // left column hidden
            row[x] = backdrop;
//@ end
//@ 24-28
            bg_pixel[x] = 0;
//@ end
//@ 21-28
            continue;
        }
        int wx = (origin_x + x) % 512;
        int table = (wx / 256) + 2 * (wy / 240);
        int tx = (wx % 256) / 8;                    // tile column, 0-31
        int ty = (wy % 240) / 8;                    // tile row, 0-29
        uint16_t nt = (uint16_t)(0x2000 + table * 0x400);
        uint8_t tile = ppu_read((uint16_t)(nt + ty * 32 + tx));
        uint8_t attr = ppu_read((uint16_t)(nt + 0x3C0 + (ty / 4) * 8 + tx / 4));
        int shift = ((ty & 2) << 1) | (tx & 2);     // which 2 bits of the attribute byte
        int pal = (attr >> shift) & 3;
        uint8_t colours[8];
        ppu_tile_row(pattern_table, tile, (wy % 240) % 8, colours);
        int c = colours[wx % 8];
//@ end
//@ 24-28
        bg_pixel[x] = (uint8_t)c;
//@ end
//@ 21-28
        uint8_t colour = c == 0 ? ppu_read(0x3F00) : ppu_read((uint16_t)(0x3F00 + pal * 4 + c));
        row[x] = NES_PALETTE[colour & 0x3F];
    }
}
//@ end
//@ 29
// Draw the background of the scanline v points at into row. bg_pixel gets
// the colour number (0-3) of every pixel: the sprites need to know where it
// is 0.
static void draw_background(uint32_t *row, uint8_t bg_pixel[PPU_WIDTH]) {
    uint32_t backdrop = NES_PALETTE[ppu_read(0x3F00) & 0x3F];
    if (!(mask & 0x08)) {                           // background off
        for (int x = 0; x < PPU_WIDTH; x++) row[x] = backdrop;
        memset(bg_pixel, 0, PPU_WIDTH);
        return;
    }
    uint16_t pattern_table = (ctrl & 0x10) ? 0x1000 : 0x0000;
    uint16_t addr = v;                              // a copy that walks right, one tile at a time
    int fine_y = (v >> 12) & 7;
    int x = -fine_x;                                // the first tile starts fine_x pixels off screen
    while (x < PPU_WIDTH) {
        uint8_t tile = ppu_read((uint16_t)(0x2000 | (addr & 0x0FFF)));
        // Its attribute byte: same nametable, row coarse_y / 4, column coarse_x / 4.
        uint16_t at = (uint16_t)(0x23C0 | (addr & 0x0C00) | ((addr >> 4) & 0x38) | ((addr >> 2) & 0x07));
        int shift = ((addr >> 4) & 4) | (addr & 2);
        int pal = (ppu_read(at) >> shift) & 3;
        uint8_t colours[8];
        ppu_tile_row(pattern_table, tile, fine_y, colours);
        for (int i = 0; i < 8; i++, x++) {
            if (x < 0 || x >= PPU_WIDTH) continue;
            int c = (x < 8 && !(mask & 0x02)) ? 0 : colours[i];   // left column hidden
            bg_pixel[x] = (uint8_t)c;
            uint8_t colour = c == 0 ? ppu_read(0x3F00) : ppu_read((uint16_t)(0x3F00 + pal * 4 + c));
            row[x] = NES_PALETTE[colour & 0x3F];
        }
        if ((addr & 0x001F) == 31) {                // the last column: on into the next nametable
            addr = (uint16_t)((addr & ~0x001F) ^ 0x0400);
        } else {
            addr++;
        }
    }
}

// Move v down one row of pixels: fine y, then coarse y, then into the
// nametable below after tile row 29.
static void increment_y(void) {
    if ((v & 0x7000) != 0x7000) {
        v += 0x1000;                                // fine y + 1
        return;
    }
    v &= (uint16_t)~0x7000;                         // fine y back to 0: the next tile row
    int y = (v >> 5) & 0x1F;
    if (y == 29) {
        y = 0;
        v ^= 0x0800;                                // the nametable below
    } else if (y == 31) {
        y = 0;                                      // rows 30-31 hold attributes: wrap, same nametable
    } else {
        y++;
    }
    v = (uint16_t)((v & ~0x03E0) | (y << 5));
}
//@ end
//@ 24

// Draw the sprites on scanline y over row.
static void draw_sprites(int y, uint32_t *row, const uint8_t bg_pixel[PPU_WIDTH]) {
    uint8_t found[8];
    int count = ppu_sprites_on_line(y, found);
//@ end
//@ 27
    if ((mask & 0x18) && count > 8) {
        status |= 0x20;                             // sprite overflow
    }
//@ end
//@ 24
    if (!(mask & 0x10)) {                           // sprites off
        return;
    }
    if (count > 8) {
        count = 8;
    }
    int height = (ctrl & 0x20) ? 16 : 8;
    uint8_t taken[PPU_WIDTH] = { 0 };               // 1 where a sprite already has a pixel
    for (int n = 0; n < count; n++) {               // lower numbers first: they win
        const uint8_t *s = &oam[found[n] * 4];      // Y, tile, attributes, X
        uint8_t attr = s[2];
        int row_in = y - (s[0] + 1);
        if (attr & 0x80) {                          // flipped vertically
            row_in = height - 1 - row_in;
        }
        uint16_t table;
        uint8_t tile = s[1];
        if (height == 16) {                         // 8 x 16: bit 0 picks the table, then two tiles
            table = (tile & 1) ? 0x1000 : 0x0000;
            tile &= 0xFE;
            if (row_in >= 8) {
                tile++;
                row_in -= 8;
            }
        } else {
            table = (ctrl & 0x08) ? 0x1000 : 0x0000;
        }
        uint8_t colours[8];
        ppu_tile_row(table, tile, row_in, colours);
        for (int i = 0; i < 8; i++) {
            int x = s[3] + i;
            if (x >= PPU_WIDTH) {
                break;
            }
            if (x < 8 && !(mask & 0x04)) {          // left column hidden
                continue;
            }
            int c = colours[(attr & 0x40) ? 7 - i : i];   // flipped horizontally
            if (c == 0 || taken[x]) {
                continue;
            }
            taken[x] = 1;
//@ end
//@ 27
            if (found[n] == 0 && bg_pixel[x] != 0 && x != 255) {
                status |= 0x40;                     // sprite 0 hit
            }
//@ end
//@ 24
            if ((attr & 0x20) && bg_pixel[x] != 0) {  // behind the background
                continue;
            }
            uint8_t colour = ppu_read((uint16_t)(0x3F10 + (attr & 3) * 4 + c));
            row[x] = NES_PALETTE[colour & 0x3F];
        }
    }
}

// Draw scanline y: the background, then the sprites over it.
static void render_scanline(int y) {
    uint32_t *row = &pixels[y * PPU_WIDTH];
    uint8_t bg_pixel[PPU_WIDTH];
//@ end
//@ 24-28
    draw_background(y, row, bg_pixel);
//@ end
//@ 29
    draw_background(row, bg_pixel);
//@ end
//@ 24
    draw_sprites(y, row, bg_pixel);
}
//@ end
//@ 20

// ---------- Timing ----------

void ppu_tick(void) {
//@ end
//@ 21
    if (scanline < PPU_HEIGHT && dot == 256) {
        render_scanline(scanline);
    }
//@ end
//@ 29
    // While the picture is drawn, v moves along with it.
    if ((mask & 0x18) && (scanline < PPU_HEIGHT || scanline == 261)) {
//@ end
//@ 33
        if (dot == 260) {
            cart_scanline();                        // MMC3 counts scanlines here
        }
//@ end
//@ 29
        if (dot == 256) {
            increment_y();                          // the next row of pixels
        } else if (dot == 257) {                    // back to the left: the horizontal bits of t
            v = (uint16_t)((v & ~0x041F) | (t & 0x041F));
        } else if (scanline == 261 && dot >= 280 && dot <= 304) {
            v = (uint16_t)((v & ~0x7BE0) | (t & 0x7BE0));   // a new frame: the vertical bits too
        }
    }
//@ end
//@ 20
    if (scanline == 241 && dot == 1) {              // the vertical blank starts
        status |= 0x80;
        frame_ready = 1;
        if (ctrl & 0x80) {
            nmi_pending = 1;
        }
    }
    if (scanline == 261 && dot == 1) {              // the pre-render line
        status &= (uint8_t)~0xE0;
    }
    dot++;
    if (dot > 340) {
        dot = 0;
        scanline++;
        if (scanline > 261) {
            scanline = 0;
        }
    }
}

int ppu_take_nmi(void) {
    int n = nmi_pending;
    nmi_pending = 0;
    return n;
}

int ppu_take_frame(void) {
    int f = frame_ready;
    frame_ready = 0;
    return f;
}

int ppu_scanline(void) { return scanline; }
int ppu_dot(void) { return dot; }
//@ end
//@ 21

const uint32_t *ppu_pixels(void) {
    return pixels;
}
//@ end
