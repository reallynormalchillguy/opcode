#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "common.inc"

Cartridge cart;

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

static void reg(int r, std::uint8_t value, std::uint8_t modes) {
    cart.cpu_write(0x8000, static_cast<std::uint8_t>(modes | r));
    cart.cpu_write(0x8001, value);
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    std::printf("load: %s\n", result_name(cart.load(make_banked(4, 8, 8, 0))));
    if (t == 1) {
        show_prg("power on");
        reg(6, 3, 0);
        reg(7, 9, 0);
        show_prg("R6 3, R7 9");
        cart.cpu_write(0x8000, 0x40);
        show_prg("PRG mode 1");
        reg(6, 21, 0x40);
        show_prg("R6 21 (16 banks)");
    }
    if (t == 2) {
        const std::uint8_t values[6] = {10, 21, 3, 4, 5, 60};
        for (int r = 0; r < 6; r++) reg(r, values[r], 0);
        show_chr("CHR mode 0");
        cart.cpu_write(0x8000, 0x80);
        show_chr("CHR mode 1");
    }
    if (t == 3) {
        cart.cpu_write(0xA000, 0);
        std::printf("A000 = 0: %s\n", mirroring_name(cart.mirroring()));
        cart.cpu_write(0xBFFE, 1);
        std::printf("BFFE = 1: %s\n", mirroring_name(cart.mirroring()));
        cart.cpu_write(0xA001, 0);
        std::printf("A001 (RAM protect) leaves it: %s\n", mirroring_name(cart.mirroring()));
    }
    if (t == 4) {
        cart.cpu_write(0x8000, 6);
        cart.cpu_write(0x9FFF, 5);          // any odd address in 8000-9FFF
        show_prg("R6 through 9FFF");
        cart.cpu_write(0x9FFE, 7);          // any even address
        cart.cpu_write(0x8001, 2);
        show_prg("R7 through 9FFE/8001");
        cart.cpu_write(0x6000, 0x99);
        std::printf("PRG RAM: %02X\n", cart.cpu_read(0x6000));
    }
}
