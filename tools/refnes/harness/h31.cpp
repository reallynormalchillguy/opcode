#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);

#include "banks.inc"

namespace {

const char* mirroring_name(Mirroring m) {
    switch (m) {
    case Mirroring::Horizontal: return "horizontal";
    case Mirroring::Vertical: return "vertical";
    case Mirroring::OneLow: return "one-screen low";
    case Mirroring::OneHigh: return "one-screen high";
    }
    return "?";
}

}  // namespace

// What a game does: five writes, bit 0 first, to the register's address.
static void mmc1(std::uint16_t addr, std::uint8_t value) {
    for (int i = 0; i < 5; i++) {
        cart.cpu_write(addr, value);
        value >>= 1;
    }
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    std::printf("load: %s\n", result_name(cart.load(make_banked(1, 8, 4, 0))));
    if (t == 1) {
        show_prg("power on");
        mmc1(0xE000, 3);
        show_prg("PRG bank 3 (mode 3)");
        mmc1(0x8000, 0x08);
        show_prg("mode 2");
        mmc1(0x8000, 0x00);
        show_prg("mode 0: 32 KB");
        mmc1(0xE000, 6);
        show_prg("mode 0, bank 6");
        mmc1(0xFFFF, 13);
        show_prg("bank 13 (wraps at 8)");
    }
    if (t == 2) {
        mmc1(0x8000, 0x0C);
        mmc1(0xA000, 5);
        mmc1(0xC000, 2);
        show_chr("CHR mode 0, bank 5");
        mmc1(0x8000, 0x1C);
        show_chr("CHR mode 1: 5 and 2");
        mmc1(0xDFFF, 7);
        show_chr("second bank 7");
    }
    if (t == 3) {
        for (int m = 0; m < 4; m++) {
            mmc1(0x8000, static_cast<std::uint8_t>(0x0C | m));
            std::printf("control %02X: %s\n", 0x0C | m, mirroring_name(cart.mirroring()));
        }
    }
    if (t == 4) {
        cart.cpu_write(0xE000, 1);
        cart.cpu_write(0xE000, 1);
        cart.cpu_write(0xE000, 0x80);       // start again in the middle
        show_prg("reset after two bits");
        mmc1(0xE000, 2);
        show_prg("then five bits of 2");
        mmc1(0x8000, 0x00);
        cart.cpu_write(0x8000, 0x80);       // a reset also sets PRG mode 3
        show_prg("mode 0, then a reset");
    }
    if (t == 5) {
        ppu.reset();
        const std::uint16_t at[4] = {0x2000, 0x2400, 0x2800, 0x2C00};
        for (int m = 0; m < 4; m++) {
            mmc1(0x8000, static_cast<std::uint8_t>(0x0C | m));
            for (int i = 0; i < 4; i++) ppu.write(at[i], static_cast<std::uint8_t>(0x10 * m + i));
            std::printf("%-16s 2000-2C00 read:", mirroring_name(cart.mirroring()));
            for (int i = 0; i < 4; i++) std::printf(" %02X", ppu.read(at[i]));
            std::printf("\n");
        }
    }
}
