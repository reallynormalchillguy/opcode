#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"
#include "banks.inc"

// What a game does: five writes, bit 0 first, to the register's address.
static void mmc1(uint16_t addr, uint8_t value) {
    for (int i = 0; i < 5; i++) {
        cart_cpu_write(addr, value);
        value >>= 1;
    }
}

static const char *MIRRORING[4] = { "horizontal", "vertical", "one-screen low", "one-screen high" };

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    printf("load: %d\n", cart_load(banked, make_banked(1, 8, 4, 0)));
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
            mmc1(0x8000, (uint8_t)(0x0C | m));
            printf("control %02X: %s\n", 0x0C | m, MIRRORING[cart_mirroring()]);
        }
    }
    if (t == 4) {
        cart_cpu_write(0xE000, 1);
        cart_cpu_write(0xE000, 1);
        cart_cpu_write(0xE000, 0x80);       // start again in the middle
        show_prg("reset after two bits");
        mmc1(0xE000, 2);
        show_prg("then five bits of 2");
        mmc1(0x8000, 0x00);
        cart_cpu_write(0x8000, 0x80);       // a reset also sets PRG mode 3
        show_prg("mode 0, then a reset");
    }
    if (t == 5) {
        ppu_reset();
        for (int m = 0; m < 4; m++) {
            mmc1(0x8000, (uint8_t)(0x0C | m));
            static const uint16_t AT[4] = { 0x2000, 0x2400, 0x2800, 0x2C00 };
            for (int i = 0; i < 4; i++) ppu_write(AT[i], (uint8_t)(0x10 * m + i));
            printf("%-16s 2000-2C00 read:", MIRRORING[cart_mirroring()]);
            for (int i = 0; i < 4; i++) printf(" %02X", ppu_read(AT[i]));
            printf("\n");
        }
    }
    return 0;
}
