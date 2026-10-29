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

static void show(LoadResult r) {
    std::printf("result %s", result_name(r));
    if (r == LoadResult::Ok) {
        std::printf(": mapper %d, PRG %d, CHR %d, %s mirroring, battery %d", cart.mapper(), cart.prg_banks(), cart.chr_banks(),
                    cart.mirroring() == Mirroring::Vertical ? "vertical" : "horizontal", cart.has_battery() ? 1 : 0);
    }
    std::printf("\n");
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    if (t == 1) {
        show(cart.load(make_rom(1, 1, 0x01, 0x00)));
        show(cart.load(make_rom(2, 0, 0x02, 0x00)));
    }
    if (t == 2) {
        show(cart.load(make_rom(1, 1, 0x10, 0x00)));
        show(cart.load(make_rom(1, 1, 0x40, 0x00)));
        show(cart.load(make_rom(1, 1, 0x00, 0x40)));
        show(cart.load(make_rom(1, 1, 0x11, 0x40)));
    }
    if (t == 3) {
        auto rom = make_rom(1, 1, 0, 0);
        show(cart.load(std::vector<std::uint8_t>(rom.begin(), rom.begin() + 10)));
        rom[3] = 0x1B;
        show(cart.load(rom));
        rom = make_rom(1, 1, 0, 0);
        rom[4] = 2;
        show(cart.load(rom));
    }
    if (t == 4) {
        auto rom = make_rom(1, 1, 0x04, 0x00);
        show(cart.load(rom));
        rom.pop_back();
        show(cart.load(rom));
    }
}
