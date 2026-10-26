#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

static void show_tile(uint16_t table, uint8_t tile) {
    for (int row = 0; row < 8; row++) {
        uint8_t c[8];
        ppu_tile_row(table, tile, row, c);
        for (int x = 0; x < 8; x++) printf("%d", c[x]);
        printf("\n");
    }
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    if (t <= 2) {
        cart_load(rom_file, make_rom(1, 0, 0, 0));      // CHR RAM, so the test can draw tiles
        ppu_reset();
        // Tile 1 in table 0000: a diagonal of colour 1, a frame of colour 2, both: 3.
        static const uint8_t lo[8] = { 0x81, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x81 };
        static const uint8_t hi[8] = { 0xFF, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xFF };
        for (int i = 0; i < 8; i++) { ppu_write((uint16_t)(0x0010 + i), lo[i]); ppu_write((uint16_t)(0x0018 + i), hi[i]); }
        // Tile FF in table 1000: only the low plane, a checkerboard.
        for (int i = 0; i < 8; i++) ppu_write((uint16_t)(0x1FF0 + i), (i & 1) ? 0x55 : 0xAA);
        if (t == 1) { printf("tile 01 of table 0000:\n"); show_tile(0x0000, 0x01); }
        if (t == 2) { printf("tile FF of table 1000:\n"); show_tile(0x1000, 0xFF); }
    }
    if (t == 3) {
        long size = 0;
        uint8_t *data = read_file("nestest.nes", &size);
        cart_load(data, size);
        free(data);
        ppu_reset();
        printf("nestest, tile 41 of table 0000:\n"); show_tile(0x0000, 0x41);
        printf("nestest, tile 2A of table 0000:\n"); show_tile(0x0000, 0x2A);
    }
    return 0;
}
