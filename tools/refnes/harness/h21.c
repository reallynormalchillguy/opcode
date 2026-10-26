#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "palette.h"
#include "common.inc"

static void w(int reg, uint8_t v) { ppu_register_write(reg, v); }
static void set_addr(uint16_t a) { ppu_register_read(2); w(6, (uint8_t)(a >> 8)); w(6, (uint8_t)a); }

// Letters for the colours the tests use, so the picture can be printed.
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
        for (int x = x0; x < x0 + w_; x++) putchar(letter(px[y * 256 + x]));
        putchar('\n');
    }
}

static void finish_frame(void) {
    ppu_take_frame();
    long n = 0;
    do { ppu_tick(); n++; } while (!ppu_take_frame() && n < 200000);
}

// A scene: tile 1 has all four colour numbers; palettes 0-3 use different colours.
static void build_scene(void) {
    cart_load(rom_file, make_rom(1, 0, 0x01, 0));   // CHR RAM, vertical mirroring
    ppu_reset();
    static const uint8_t lo[8] = { 0xF0, 0xF0, 0x0F, 0x0F, 0xFF, 0x00, 0xAA, 0x55 };
    static const uint8_t hi[8] = { 0xCC, 0x33, 0xCC, 0x33, 0x00, 0xFF, 0xFF, 0xFF };
    set_addr(0x0010);
    for (int i = 0; i < 8; i++) w(7, lo[i]);
    for (int i = 0; i < 8; i++) w(7, hi[i]);
    // Tile 2 in pattern table 1000: solid colour 3.
    set_addr(0x1020);
    for (int i = 0; i < 16; i++) w(7, 0xFF);
    // Palettes: backdrop black, then four background palettes.
    static const uint8_t pal[16] = { 0x0F, 0x16, 0x2A, 0x12, 0x0F, 0x30, 0x28, 0x14, 0x0F, 0x21, 0x16, 0x2A, 0x0F, 0x12, 0x30, 0x28 };
    set_addr(0x3F00);
    for (int i = 0; i < 16; i++) w(7, pal[i]);
}

static void put_tile(uint16_t nt, int tx, int ty, uint8_t tile) {
    set_addr((uint16_t)(nt + ty * 32 + tx));
    w(7, tile);
}

static void band_crcs(void) {
    const uint32_t *px = ppu_pixels();
    for (int band = 0; band < 30; band++) {
        uint32_t crc = 0xFFFFFFFF;
        for (int i = band * 8 * 256; i < (band + 1) * 8 * 256; i++) {
            uint32_t v = px[i] & 0xFFFFFF;
            for (int b = 0; b < 24; b++) {
                uint32_t bit = ((v >> b) ^ crc) & 1;
                crc >>= 1;
                if (bit) crc ^= 0xEDB88320;
            }
        }
        printf("rows %3d-%3d: %08X\n", band * 8, band * 8 + 7, crc ^ 0xFFFFFFFF);
    }
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    if (t == 1) {
        build_scene();
        set_addr(0x3F00); w(7, 0x21);
        w(1, 0x00);
        finish_frame();
        int same = 0;
        for (int i = 0; i < 256 * 240; i++) same += ppu_pixels()[i] == NES_PALETTE[0x21];
        printf("background off: %d of 61440 pixels show the backdrop colour 21\n", same);
    }
    if (t == 2) {
        build_scene();
        put_tile(0x2000, 0, 0, 1);
        put_tile(0x2000, 1, 0, 1);
        w(1, 0x0A);
        finish_frame();
        printf("top-left 16 x 9 pixels:\n");
        show_area(0, 0, 16, 9);
    }
    if (t == 3) {
        build_scene();
        put_tile(0x2000, 0, 0, 1);
        put_tile(0x2000, 1, 0, 1);
        w(1, 0x08);
        finish_frame();
        printf("left column hidden:\n");
        show_area(0, 0, 16, 2);
    }
    if (t == 4) {
        build_scene();
        for (int ty = 0; ty < 4; ty++) for (int tx = 0; tx < 4; tx++) put_tile(0x2000, tx, ty, 1);
        put_tile(0x2000, 6, 6, 1);
        set_addr(0x23C0); w(7, 0xE4);           // 11 10 01 00: bottom-right, bottom-left, top-right, top-left
        set_addr(0x23C9); w(7, 0xC0);           // tiles 4-7 / 4-7: the bottom-right area (tile 6,6) uses palette 3
        w(1, 0x0A);
        finish_frame();
        printf("row 4 of each 16 x 16 area (4 areas, then tile 6,6):\n");
        show_area(0, 4, 32, 1);
        show_area(0, 20, 32, 1);
        show_area(48, 52, 8, 1);
    }
    if (t == 5) {
        build_scene();
        put_tile(0x2000, 0, 0, 1);
        put_tile(0x2000, 0, 1, 1);
        w(1, 0x0A);
        ppu_register_read(2);
        w(5, 4); w(5, 3);
        finish_frame();
        printf("scrolled 4 right and 3 down:\n");
        show_area(0, 0, 12, 6);
    }
    if (t == 6) {
        build_scene();
        put_tile(0x2400, 0, 0, 2);              // nametable 1, tile 2
        w(1, 0x0A);
        w(0, 0x11);                             // nametable 2400, background tiles from 1000
        finish_frame();
        printf("PPUCTRL 11:\n");
        show_area(0, 0, 10, 2);
        w(0, 0x01);                             // same nametable, tiles from 0000
        finish_frame();
        printf("PPUCTRL 01:\n");
        show_area(0, 0, 10, 2);
    }
    if (t == 7) {
        long size = 0;
        uint8_t *data = read_file("nestest.nes", &size);
        printf("load %d\n", cart_load(data, size));
        free(data);
        bus_reset();
        ppu_reset();
        Cpu cpu;
        cpu_reset(&cpu);
        int frames = 0;
        long guard = 0;
        while (frames < 30 && guard < 30L * 40000) {
            int c = cpu_step(&cpu);
            guard += c;
            for (int i = 0; i < 3 * c; i++) ppu_tick();
            if (ppu_take_nmi()) cpu_nmi(&cpu);
            if (ppu_take_frame()) frames++;
        }
        printf("nestest after %d frames, a checksum of each band of 8 rows:\n", frames);
        band_crcs();
    }
    return 0;
}
