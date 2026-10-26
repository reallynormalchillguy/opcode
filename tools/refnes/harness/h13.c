#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "common.inc"

static void show(int r) {
    printf("result %d", r);
    if (r == CART_OK) {
        printf(": mapper %d, PRG %d, CHR %d, %s mirroring, battery %d", cart_mapper(), cart_prg_banks(), cart_chr_banks(),
               cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal", cart_has_battery());
    }
    printf("\n");
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    if (t == 1) {
        show(cart_load(rom_file, make_rom(1, 1, 0x01, 0x00)));
        show(cart_load(rom_file, make_rom(2, 0, 0x02, 0x00)));
    }
    if (t == 2) {
        show(cart_load(rom_file, make_rom(1, 1, 0x10, 0x00)));
        show(cart_load(rom_file, make_rom(1, 1, 0x40, 0x00)));
        show(cart_load(rom_file, make_rom(1, 1, 0x00, 0x40)));
        show(cart_load(rom_file, make_rom(1, 1, 0x11, 0x40)));
    }
    if (t == 3) {
        long size = make_rom(1, 1, 0, 0);
        show(cart_load(rom_file, 10));
        rom_file[3] = 0x1B;
        show(cart_load(rom_file, size));
        size = make_rom(1, 1, 0, 0);
        rom_file[4] = 2;
        show(cart_load(rom_file, size));
    }
    if (t == 4) {
        long size = make_rom(1, 1, 0x04, 0x00);
        show(cart_load(rom_file, size));
        show(cart_load(rom_file, size - 1));
    }
    return 0;
}
