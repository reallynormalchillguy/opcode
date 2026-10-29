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

static void w(int reg, std::uint8_t v) { ppu.register_write(reg, v); }
static std::uint8_t rd(int reg) { return ppu.register_read(reg); }
static void peek(std::uint16_t a) { std::printf(" %04X=%02X", a, ppu.read(a)); }

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_rom(1, 0, 0x01, 0));
    ppu.reset();
    if (t == 1) {
        w(6, 0x20); w(6, 0x05); w(7, 0x41); w(7, 0x42);
        std::printf("PPU memory:"); peek(0x2005); peek(0x2006); peek(0x2007); std::printf("\n");
    }
    if (t == 2) {
        ppu.write(0x2105, 0x41); ppu.write(0x2106, 0x42);
        w(6, 0x21); w(6, 0x05);
        std::uint8_t a = rd(7), b = rd(7), c = rd(7);
        std::printf("three reads from 2105: %02X %02X %02X\n", a, b, c);
    }
    if (t == 3) {
        w(0, 0x04);
        w(6, 0x20); w(6, 0x00); w(7, 0x01); w(7, 0x02); w(7, 0x03);
        std::printf("PPU memory:"); peek(0x2000); peek(0x2020); peek(0x2040); peek(0x2001); std::printf("\n");
    }
    if (t == 4) {
        w(6, 0x3F); w(6, 0x00); w(7, 0x0F); w(7, 0x16);
        ppu.write(0x2F00, 0x77);
        w(6, 0x3F); w(6, 0x00);
        std::uint8_t a = rd(7);
        w(6, 0x20); w(6, 0x00);
        std::uint8_t b = rd(7);
        std::printf("palette read: %02X, then a nametable read gives the buffer: %02X\n", a, b);
    }
    if (t == 5) {
        w(6, 0x21);
        std::uint8_t s = rd(2);
        w(6, 0x20); w(6, 0x00); w(7, 0x5A);
        std::printf("PPUSTATUS read %02X;", s); peek(0x2000); peek(0x2100); std::printf("\n");
    }
    if (t == 6) {
        w(6, 0x3F); w(6, 0xFF); w(7, 0x30); w(7, 0x55);
        std::printf("PPU memory:"); peek(0x3FFF); peek(0x0000); std::printf("\n");
        w(6, 0x7F); w(6, 0x00); w(7, 0x12);
        std::printf("writing PPUADDR 7F00 reaches 3F00: %02X\n", ppu.read(0x3F00));
    }
}
