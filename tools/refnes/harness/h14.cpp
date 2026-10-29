#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "common.inc"

Cartridge cart;

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    auto show4 = [](std::uint16_t a, std::uint16_t b, std::uint16_t c, std::uint16_t d) {
        std::printf("%02X ", cart.cpu_read(a)); std::printf("%02X ", cart.cpu_read(b));
        std::printf("%02X ", cart.cpu_read(c)); std::printf("%02X\n", cart.cpu_read(d));
    };
    if (t == 1) {
        std::printf("load %s\n", result_name(cart.load(make_rom(1, 1, 0, 0))));
        show4(0x8000, 0x8123, 0xC123, 0xFFFF);
    }
    if (t == 2) {
        std::printf("load %s\n", result_name(cart.load(make_rom(2, 1, 0, 0))));
        show4(0x8000, 0x8123, 0xC123, 0xFFFF);
    }
    if (t == 3) {
        std::printf("load %s\n", result_name(cart.load(make_rom(1, 1, 0, 0))));
        cart.cpu_write(0x6000, 0x11);
        cart.cpu_write(0x7FFF, 0x22);
        cart.cpu_write(0x8000, 0x99);
        show4(0x6000, 0x7FFF, 0x6001, 0x8000);
    }
    if (t == 4) {
        std::printf("load %s\n", result_name(cart.load(make_rom(1, 1, 0, 0))));
        std::printf("CHR ROM: %02X", cart.ppu_read(0x0000));
        std::printf(" %02X", cart.ppu_read(0x0011));
        std::printf(" %02X", cart.ppu_read(0x1FFF));
        cart.ppu_write(0x0000, 0x55);
        std::printf(" after a write: %02X\n", cart.ppu_read(0x0000));
        std::printf("load %s\n", result_name(cart.load(make_rom(1, 0, 0, 0))));
        std::printf("CHR RAM: %02X", cart.ppu_read(0x0000));
        cart.ppu_write(0x0000, 0x55);
        cart.ppu_write(0x1FFF, 0x66);
        std::printf(" after writes: %02X", cart.ppu_read(0x0000));
        std::printf(" %02X\n", cart.ppu_read(0x1FFF));
    }
    if (t == 5) {
        std::printf("load %s\n", result_name(cart.load(make_rom(1, 1, 0, 0))));
        std::uint8_t before = cart.cpu_read(0x8123);
        std::printf("mapper 1: load %s\n", result_name(cart.load(make_rom(1, 1, 0x10, 0))));
        std::printf("the first cartridge is still there: %s\n", cart.cpu_read(0x8123) == before ? "yes" : "no");
        auto rom = make_rom(2, 1, 0, 0);
        rom[16 + 0x123] = 0xEE;
        std::printf("load %s\n", result_name(cart.load(rom)));
        std::printf("the new one replaced it: %02X\n", cart.cpu_read(0x8123));
    }
    if (t == 6) {
        LoadResult r = cart.load(read_file("nestest.nes"));
        std::printf("nestest: load %s, reset vector %02X", result_name(r), cart.cpu_read(0xFFFD));
        std::printf("%02X\n", cart.cpu_read(0xFFFC));
    }
}
