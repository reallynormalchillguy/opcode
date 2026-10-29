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

static void r(std::uint16_t a) { std::printf(" %04X=%02X", a, ppu.read(a)); }

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    if (t == 1) {
        cart.load(make_rom(1, 1, 0x01, 0));   // vertical
        ppu.reset();
        ppu.write(0x2000, 0x11); ppu.write(0x2400, 0x22); ppu.write(0x23FF, 0x33);
        std::printf("vertical:"); r(0x2800); r(0x2C00); r(0x2BFF); r(0x3000); r(0x3400); std::printf("\n");
    }
    if (t == 2) {
        cart.load(make_rom(1, 1, 0x00, 0));   // horizontal
        ppu.reset();
        ppu.write(0x2000, 0x11); ppu.write(0x2800, 0x22); ppu.write(0x2FFF, 0x44);
        std::printf("horizontal:"); r(0x2400); r(0x2C00); r(0x2BFF); r(0x3BFF); std::printf("\n");
    }
    if (t == 3) {
        cart.load(make_rom(1, 1, 0x01, 0));
        ppu.reset();
        ppu.write(0x3F00, 0x0F); ppu.write(0x3F14, 0x20); ppu.write(0x3F01, 0x16); ppu.write(0x3F11, 0x2A);
        std::printf("palette:"); r(0x3F10); r(0x3F04); r(0x3F01); r(0x3F11); r(0x3F20); r(0x3FF1); std::printf("\n");
    }
    if (t == 4) {
        cart.load(make_rom(1, 1, 0x01, 0));
        ppu.reset();
        std::printf("patterns:"); r(0x0000); r(0x0010); r(0x1FFF); r(0x4005);
        ppu.write(0x0000, 0x77);
        r(0x0000); std::printf("\n");
        cart.load(make_rom(1, 0, 0x01, 0));
        ppu.write(0x0000, 0x77);
        std::printf("CHR RAM:"); r(0x0000); std::printf("\n");
    }
    if (t == 5) {
        cart.load(make_rom(1, 1, 0x01, 0));
        ppu.reset();
        ppu.write(0x2123, 0x99); ppu.write(0x3F05, 0x30);
        ppu.reset();
        std::printf("after reset:"); r(0x2123); r(0x3F05); std::printf("\n");
    }
}
