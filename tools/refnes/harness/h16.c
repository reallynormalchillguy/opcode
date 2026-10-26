#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

static void r(uint16_t a) { printf(" %04X=%02X", a, ppu_read(a)); }

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    if (t == 1) {
        cart_load(rom_file, make_rom(1, 1, 0x01, 0));   // vertical
        ppu_reset();
        ppu_write(0x2000, 0x11); ppu_write(0x2400, 0x22); ppu_write(0x23FF, 0x33);
        printf("vertical:"); r(0x2800); r(0x2C00); r(0x2BFF); r(0x3000); r(0x3400); printf("\n");
    }
    if (t == 2) {
        cart_load(rom_file, make_rom(1, 1, 0x00, 0));   // horizontal
        ppu_reset();
        ppu_write(0x2000, 0x11); ppu_write(0x2800, 0x22); ppu_write(0x2FFF, 0x44);
        printf("horizontal:"); r(0x2400); r(0x2C00); r(0x2BFF); r(0x3BFF); printf("\n");
    }
    if (t == 3) {
        cart_load(rom_file, make_rom(1, 1, 0x01, 0));
        ppu_reset();
        ppu_write(0x3F00, 0x0F); ppu_write(0x3F14, 0x20); ppu_write(0x3F01, 0x16); ppu_write(0x3F11, 0x2A);
        printf("palette:"); r(0x3F10); r(0x3F04); r(0x3F01); r(0x3F11); r(0x3F20); r(0x3FF1); printf("\n");
    }
    if (t == 4) {
        cart_load(rom_file, make_rom(1, 1, 0x01, 0));
        ppu_reset();
        printf("patterns:"); r(0x0000); r(0x0010); r(0x1FFF); r(0x4005);
        ppu_write(0x0000, 0x77);
        r(0x0000); printf("\n");
        cart_load(rom_file, make_rom(1, 0, 0x01, 0));
        ppu_write(0x0000, 0x77);
        printf("CHR RAM:"); r(0x0000); printf("\n");
    }
    if (t == 5) {
        cart_load(rom_file, make_rom(1, 1, 0x01, 0));
        ppu_reset();
        ppu_write(0x2123, 0x99); ppu_write(0x3F05, 0x30);
        ppu_reset();
        printf("after ppu_reset:"); r(0x2123); r(0x3F05); printf("\n");
    }
    return 0;
}
