#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "banks.inc"

static void reg(int r, uint8_t value, uint8_t modes) {
    cart_cpu_write(0x8000, (uint8_t)(modes | r));
    cart_cpu_write(0x8001, value);
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    printf("load: %d\n", cart_load(banked, make_banked(4, 8, 8, 0)));
    if (t == 1) {
        show_prg("power on");
        reg(6, 3, 0);
        reg(7, 9, 0);
        show_prg("R6 3, R7 9");
        cart_cpu_write(0x8000, 0x40);
        show_prg("PRG mode 1");
        reg(6, 21, 0x40);
        show_prg("R6 21 (16 banks)");
    }
    if (t == 2) {
        static const uint8_t R[6] = { 10, 21, 3, 4, 5, 60 };
        for (int r = 0; r < 6; r++) reg(r, R[r], 0);
        show_chr("CHR mode 0");
        cart_cpu_write(0x8000, 0x80);
        show_chr("CHR mode 1");
    }
    if (t == 3) {
        cart_cpu_write(0xA000, 0);
        printf("A000 = 0: %s\n", cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal");
        cart_cpu_write(0xBFFE, 1);
        printf("BFFE = 1: %s\n", cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal");
        cart_cpu_write(0xA001, 0);
        printf("A001 (RAM protect) leaves it: %s\n", cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal");
    }
    if (t == 4) {
        cart_cpu_write(0x8000, 6);
        cart_cpu_write(0x9FFF, 5);          // any odd address in 8000-9FFF
        show_prg("R6 through 9FFF");
        cart_cpu_write(0x9FFE, 7);          // any even address
        cart_cpu_write(0x8001, 2);
        show_prg("R7 through 9FFE/8001");
        cart_cpu_write(0x6000, 0x99);
        printf("PRG RAM: %02X\n", cart_cpu_read(0x6000));
    }
    return 0;
}
