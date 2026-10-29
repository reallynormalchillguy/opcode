#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "bus.h"
#include "cart.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Bus bus(cart, ppu);

static void peek(std::uint16_t a) { std::printf(" %04X=%02X", a, ppu.read(a)); }

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_rom(1, 0, 0x01, 0));
    bus.reset();
    ppu.reset();
    if (t == 1) {
        bus.write(0x2006, 0x3F); bus.write(0x2006, 0x00); bus.write(0x2007, 0x2A);
        bus.write(0x3FFE, 0x21); bus.write(0x3FFE, 0x08); bus.write(0x3FFF, 0x33);
        std::printf("PPU memory:"); peek(0x3F00); peek(0x2108); std::printf("\n");
    }
    if (t == 2) {
        bus.write(0x2003, 0x10); bus.write(0x2004, 0xAA); bus.write(0x2004, 0xBB);
        bus.write(0x2003, 0x10);
        std::uint8_t a = bus.read(0x2004), b = bus.read(0x2004);
        bus.write(0x2003, 0x11);
        std::printf("OAM: %02X %02X", a, b);
        std::printf(" %02X\n", bus.read(0x2004));
    }
    if (t == 3) {
        bus.write(0x2005, 0x12);
        bus.write(0x2006, 0x34);
        bus.write(0x2007, 0x5A);
        std::printf("after one PPUSCROLL write, PPUADDR took the low byte: 0034=%02X\n", ppu.read(0x0034));
        bus.read(0x2002);
        bus.write(0x2006, 0x20); bus.write(0x2006, 0x10); bus.write(0x2007, 0x6B);
        std::printf("after reading PPUSTATUS, both bytes again: 2010=%02X\n", ppu.read(0x2010));
    }
    if (t == 4) {
        bus.write(0x0001, 0x77);
        std::printf("RAM %02X, cartridge", bus.read(0x0801));
        std::printf(" %02X", bus.read(0x8000));
        std::printf(" %02X\n", bus.read(0xC123));
    }
}
