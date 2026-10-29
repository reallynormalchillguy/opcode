// Opcode's pattern table viewer. Provided by the course.
// It draws both pattern tables of game.nes on the screen with your
// Ppu::tile_row, in four shades of grey, and prints one tile as numbers.
// Program input: the tile to print, in hex (default 41).
#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "ppu.h"
#include "screen.h"

#include "readfile.inc"

int main() {
    Cartridge cart;
    if (!plug_in_cartridge(cart)) return 1;
    Ppu ppu(cart);
    ppu.reset();
    const std::array<std::uint32_t, 4> greys = {0x101010, 0x686868, 0xB0B0B0, 0xF8F8F8};
    std::vector<std::uint32_t> picture(256 * 240, 0x202024);
    // Each table is 16 x 16 tiles of 8 x 8 pixels: 128 x 128, side by side.
    for (int table = 0; table < 2; table++) {
        for (int tile = 0; tile < 256; tile++) {
            for (int row = 0; row < 8; row++) {
                auto colours = ppu.tile_row(static_cast<std::uint16_t>(table * 0x1000), static_cast<std::uint8_t>(tile), row);
                for (int x = 0; x < 8; x++) {
                    int px = table * 128 + (tile % 16) * 8 + x;
                    int py = 56 + (tile / 16) * 8 + row;
                    picture[py * 256 + px] = greys[colours[x] & 3];
                }
            }
        }
    }
    screen_show(picture.data());
    std::printf("Left: pattern table 0000. Right: pattern table 1000.\n");

    unsigned tile = 0x41;
    if (!(std::cin >> std::hex >> tile)) tile = 0x41;
    std::printf("\nTile %02X of table 0000, as colour numbers:\n", tile & 0xFF);
    for (int row = 0; row < 8; row++) {
        auto colours = ppu.tile_row(0x0000, static_cast<std::uint8_t>(tile), row);
        for (int x = 0; x < 8; x++) std::printf("%c", colours[x] ? '0' + colours[x] : '.');
        std::printf("\n");
    }
}
