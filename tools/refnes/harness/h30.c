#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "banks.inc"

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    if (t == 1) {
        printf("load: %d\n", cart_load(banked, make_banked(0, 1, 1, 1)));
        show_prg("NROM, 16 KB");
        cart_load(banked, make_banked(0, 2, 1, 1));
        show_prg("NROM, 32 KB");
        cart_cpu_write(0x8000, 1);
        show_prg("after a write to 8000");
        show_chr("CHR");
    }
    if (t == 2) {
        printf("load: %d\n", cart_load(banked, make_banked(2, 8, 0, 1)));
        show_prg("UxROM at power on");
        cart_cpu_write(0x8000, 3);
        show_prg("bank 3");
        cart_cpu_write(0xFFFF, 6);
        show_prg("bank 6 (written at FFFF)");
        cart_cpu_write(0xC000, 9);
        show_prg("bank 9: only 8 banks");
    }
    if (t == 3) {
        cart_load(banked, make_banked(2, 4, 0, 1));
        cart_ppu_write(0x0123, 0xAB);
        cart_ppu_write(0x1FFF, 0xCD);
        cart_cpu_write(0x8000, 2);
        printf("UxROM CHR RAM: %02X %02X\n", cart_ppu_read(0x0123), cart_ppu_read(0x1FFF));
        cart_cpu_write(0x6000, 0x5A);
        cart_cpu_write(0x7FFF, 0xA5);
        printf("PRG RAM: %02X %02X\n", cart_cpu_read(0x6000), cart_cpu_read(0x7FFF));
    }
    if (t == 4) {
        printf("load: %d\n", cart_load(banked, make_banked(3, 2, 4, 0)));
        show_chr("CNROM at power on");
        cart_cpu_write(0x8000, 2);
        show_chr("bank 2");
        cart_cpu_write(0xA123, 3);
        show_chr("bank 3");
        cart_cpu_write(0x8000, 5);
        show_chr("bank 5: only 4 banks");
        show_prg("PRG does not move");
        cart_ppu_write(0x0000, 0x77);
        printf("CHR ROM can't be written: %d\n", cart_ppu_read(0x0000));
    }
    if (t == 5) {
        printf("mapper 1: %d, mapper 4: %d, mapper 7: %d\n", cart_load(banked, make_banked(1, 2, 1, 0)),
               cart_load(banked, make_banked(4, 2, 1, 0)), cart_load(banked, make_banked(7, 2, 1, 0)));
    }
    return 0;
}
