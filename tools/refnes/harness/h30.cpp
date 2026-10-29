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

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    if (t == 1) {
        std::printf("load: %s\n", result_name(cart.load(make_banked(0, 1, 1, 1))));
        show_prg("NROM, 16 KB");
        cart.load(make_banked(0, 2, 1, 1));
        show_prg("NROM, 32 KB");
        cart.cpu_write(0x8000, 1);
        show_prg("after a write to 8000");
        show_chr("CHR");
    }
    if (t == 2) {
        std::printf("load: %s\n", result_name(cart.load(make_banked(2, 8, 0, 1))));
        show_prg("UxROM at power on");
        cart.cpu_write(0x8000, 3);
        show_prg("bank 3");
        cart.cpu_write(0xFFFF, 6);
        show_prg("bank 6 (written at FFFF)");
        cart.cpu_write(0xC000, 9);
        show_prg("bank 9: only 8 banks");
    }
    if (t == 3) {
        cart.load(make_banked(2, 4, 0, 1));
        cart.ppu_write(0x0123, 0xAB);
        cart.ppu_write(0x1FFF, 0xCD);
        cart.cpu_write(0x8000, 2);
        std::printf("UxROM CHR RAM: %02X %02X\n", cart.ppu_read(0x0123), cart.ppu_read(0x1FFF));
        cart.cpu_write(0x6000, 0x5A);
        cart.cpu_write(0x7FFF, 0xA5);
        std::printf("PRG RAM: %02X %02X\n", cart.cpu_read(0x6000), cart.cpu_read(0x7FFF));
    }
    if (t == 4) {
        std::printf("load: %s\n", result_name(cart.load(make_banked(3, 2, 4, 0))));
        show_chr("CNROM at power on");
        cart.cpu_write(0x8000, 2);
        show_chr("bank 2");
        cart.cpu_write(0xA123, 3);
        show_chr("bank 3");
        cart.cpu_write(0x8000, 5);
        show_chr("bank 5: only 4 banks");
        show_prg("PRG does not move");
        cart.ppu_write(0x0000, 0x77);
        std::printf("CHR ROM can't be written: %d\n", cart.ppu_read(0x0000));
    }
    if (t == 5) {
        std::printf("mapper 1: %s", result_name(cart.load(make_banked(1, 2, 1, 0))));
        std::printf(", mapper 4: %s", result_name(cart.load(make_banked(4, 2, 1, 0))));
        std::printf(", mapper 7: %s\n", result_name(cart.load(make_banked(7, 2, 1, 0))));
    }
}
