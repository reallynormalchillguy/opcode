#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "palette.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Bus bus(cart, ppu);
Cpu cpu(bus);

#include "scene.inc"
#include "demo.inc"

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    build_sprite_scene();
    if (t == 1) {
        sprite(0, 19, 1, 0x00, 20);              // the arrow, palette 4, at x 20, from line 20
        sprite(1, 19, 2, 0x01, 30);              // a solid square, palette 5
        finish_frame();
        std::printf("two sprites over the backdrop (x 18-39, lines 19-28):\n");
        show_area(18, 19, 22, 10);
    }
    if (t == 2) {
        sprite(0, 19, 1, 0x00, 10);
        sprite(1, 19, 1, 0x40, 20);
        sprite(2, 19, 1, 0x80, 30);
        sprite(3, 19, 1, 0xC0, 40);
        finish_frame();
        std::printf("the arrow: as it is, flipped H, flipped V, both:\n");
        show_area(10, 20, 38, 8);
    }
    if (t == 3) {
        put_tile(2, 2, 2);                       // background: left half colour 2 at x 16-19
        put_tile(3, 2, 1);                       // and solid colour 1 at x 24-31
        sprite(0, 15, 2, 0x20, 14);              // behind: shows only where the background is see-through
        sprite(1, 15, 2, 0x00, 26);              // in front
        finish_frame();
        std::printf("behind (x 14-21) and in front (x 26-33) of the background:\n");
        show_area(12, 16, 24, 2);
        build_sprite_scene();
        put_tile(2, 2, 1);
        sprite(0, 15, 2, 0x20, 16);              // sprite 0, behind
        sprite(1, 15, 2, 0x00, 20);              // sprite 1, in front, overlapping it at x 20-23
        finish_frame();
        std::printf("sprite 0 behind the background hides sprite 1 where they overlap:\n");
        show_area(14, 16, 16, 1);
    }
    if (t == 4) {
        w(0, 0x30);                              // 8 x 16 sprites
        sprite(0, 9, 4, 0x00, 10);               // even: tiles 4 and 5 from 0000
        sprite(1, 9, 7, 0x00, 20);               // odd: tiles 6 and 7 from 1000
        sprite(2, 9, 4, 0x80, 30);               // flipped vertically: the halves swap
        finish_frame();
        std::printf("8 x 16 sprites, lines 10-25 (every 3rd):\n");
        for (int y = 10; y < 26; y += 3) show_area(8, y, 32, 1);
    }
    if (t == 5) {
        sprite(0, 19, 2, 0x00, 4);
        sprite(1, 19, 2, 0x01, 12);
        w(1, 0x18);                              // left column hidden for both layers
        finish_frame();
        std::printf("left column hidden:\n");
        show_area(0, 20, 22, 1);
        w(1, 0x0E);                              // sprites off
        finish_frame();
        std::printf("sprites off:\n");
        show_area(0, 20, 22, 1);
    }
    if (t == 6) {
        for (int i = 0; i < 10; i++) sprite(i, 49, 2, i & 1, 10 + i * 9);
        finish_frame();
        std::printf("10 sprites on one line: only 8 are drawn\n");
        show_area(8, 50, 96, 1);
    }
    if (t == 7) {
        if (!demo_start()) return 0;
        for (int f = 0; f < 90; f++) demo_frame();
        std::printf("opcode-demo.nes after 90 frames, a checksum of each band of 16 rows:\n");
        for (int b = 0; b < 15; b++) std::printf("  rows %3d-%3d: %08X\n", b * 16, b * 16 + 15, crc_rows(b * 16, b * 16 + 15));
    }
}
