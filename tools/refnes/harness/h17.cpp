#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);

static void show_tile(std::uint16_t table, std::uint8_t tile) {
    for (int row = 0; row < 8; row++) {
        auto c = ppu.tile_row(table, tile, row);
        for (int x = 0; x < 8; x++) std::printf("%d", c[x]);
        std::printf("\n");
    }
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    if (t <= 2) {
        cart.load(make_rom(1, 0, 0, 0));      // CHR RAM, so the test can draw tiles
        ppu.reset();
        // Tile 1 in table 0000: a diagonal of colour 1, a frame of colour 2, both: 3.
        const std::uint8_t lo[8] = {0x81, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x81};
        const std::uint8_t hi[8] = {0xFF, 0x81, 0x81, 0x81, 0x81, 0x81, 0x81, 0xFF};
        for (int i = 0; i < 8; i++) { ppu.write(static_cast<std::uint16_t>(0x0010 + i), lo[i]); ppu.write(static_cast<std::uint16_t>(0x0018 + i), hi[i]); }
        // Tile FF in table 1000: only the low plane, a checkerboard.
        for (int i = 0; i < 8; i++) ppu.write(static_cast<std::uint16_t>(0x1FF0 + i), (i & 1) ? 0x55 : 0xAA);
        if (t == 1) { std::printf("tile 01 of table 0000:\n"); show_tile(0x0000, 0x01); }
        if (t == 2) { std::printf("tile FF of table 1000:\n"); show_tile(0x1000, 0xFF); }
    }
    if (t == 3) {
        cart.load(read_file("nestest.nes"));
        ppu.reset();
        std::printf("nestest, tile 41 of table 0000:\n"); show_tile(0x0000, 0x41);
        std::printf("nestest, tile 2A of table 0000:\n"); show_tile(0x0000, 0x2A);
    }
}
