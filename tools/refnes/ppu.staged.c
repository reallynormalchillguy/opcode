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
static uint8_t oam[256];         // sprite memory, used in a later lesson
static uint8_t scroll_x;         // 2005 PPUSCROLL, first write
static uint8_t scroll_y;         // 2005 PPUSCROLL, second write
//@ end
//@ 18
static uint16_t vram_addr;       // 2006 PPUADDR: where 2007 reads and writes
static int write_latch;          // 0: next 2005/2006 write is the first one
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
    vram_addr = 0;
    write_latch = 0;
    read_buffer = 0;
//@ end
//@ 19
    mask = 0;
    oam_addr = 0;
    memset(oam, 0, sizeof oam);
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
    if (cart_mirroring() == MIRROR_VERTICAL) {
        physical = table & 1;                     // 0 1 / 0 1
    } else {
        physical = table >> 1;                    // 0 0 / 1 1
    }
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
//@ 18
        write_latch = 0;                            // and resets the 2005/2006 latch
        return value;
    }
//@ end
//@ 19
    case 4:                                         // OAMDATA
        return oam[oam_addr];
//@ end
//@ 18
    case 7: {                                       // PPUDATA
        uint16_t addr = vram_addr & 0x3FFF;
        uint8_t value;
        if (addr >= 0x3F00) {
            value = ppu_read(addr);                 // the palette answers at once
            read_buffer = ppu_read((uint16_t)(addr - 0x1000));
        } else {
            value = read_buffer;                    // everything else is one read late
            read_buffer = ppu_read(addr);
        }
        vram_addr = (uint16_t)((vram_addr + ((ctrl & 0x04) ? 32 : 1)) & 0x3FFF);
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
    case 5:                                         // PPUSCROLL
        if (write_latch == 0) {
            scroll_x = value;
        } else {
            scroll_y = value;
        }
        write_latch ^= 1;
        break;
//@ end
//@ 18
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
    }
}
//@ end
//@ 21

// ---------- Drawing ----------

// Draw scanline y of the background, using the scroll position and the
// nametable chosen in PPUCTRL.
static void render_scanline(int y) {
    uint32_t *row = &pixels[y * PPU_WIDTH];
    uint32_t backdrop = NES_PALETTE[ppu_read(0x3F00) & 0x3F];
    if (!(mask & 0x08)) {                           // background off
        for (int x = 0; x < PPU_WIDTH; x++) row[x] = backdrop;
        return;
    }
    // The four nametables form a 512 x 480 world; the screen is a window on it.
    int origin_x = ((ctrl & 0x01) ? 256 : 0) + scroll_x;
    int origin_y = ((ctrl & 0x02) ? 240 : 0) + scroll_y;
    uint16_t pattern_table = (ctrl & 0x10) ? 0x1000 : 0x0000;
    int wy = (origin_y + y) % 480;
    for (int x = 0; x < PPU_WIDTH; x++) {
        if (x < 8 && !(mask & 0x02)) {              // left column hidden
            row[x] = backdrop;
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
        uint8_t colour = c == 0 ? ppu_read(0x3F00) : ppu_read((uint16_t)(0x3F00 + pal * 4 + c));
        row[x] = NES_PALETTE[colour & 0x3F];
    }
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
