#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "palette.h"
#include "banks.inc"

static void clocks(int n, const char *label) {
    printf("%-26s", label);
    for (int i = 0; i < n; i++) {
        cart_scanline();
        printf(" %d", cart_irq());
    }
    printf("\n");
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(banked, make_banked(4, 8, 8, 0));
    if (t == 1) {
        cart_cpu_write(0xC000, 3);
        cart_cpu_write(0xC001, 0);
        cart_cpu_write(0xE001, 0);
        clocks(10, "latch 3, enabled:");
        cart_cpu_write(0xE000, 0);
        printf("after E000: %d\n", cart_irq());
        cart_cpu_write(0xE001, 0);
        clocks(5, "enabled again:");
    }
    if (t == 2) {
        cart_cpu_write(0xC000, 2);
        cart_cpu_write(0xC001, 0);
        clocks(6, "latch 2, disabled:");
        cart_cpu_write(0xE001, 0);
        cart_cpu_write(0xC000, 4);
        clocks(4, "latch 4 written, no reload:");
        cart_cpu_write(0xC001, 0);
        clocks(6, "after C001:");
    }
    if (t == 3) {
        cart_cpu_write(0xC000, 0);
        cart_cpu_write(0xC001, 0);
        cart_cpu_write(0xE001, 0);
        clocks(4, "latch 0:");
        cart_load(banked, make_banked(2, 8, 0, 1));
        clocks(4, "UxROM never asks:");
    }
    if (t == 4) {
        ppu_reset();
        cart_cpu_write(0xC000, 20);
        cart_cpu_write(0xC001, 0);
        cart_cpu_write(0xE001, 0);
        ppu_register_write(1, 0x18);            // rendering on
        int seen = 0;
        long n = 0;
        while (n < 200000 && seen < 3) {
            ppu_tick();
            n++;
            if (cart_irq()) {
                printf("IRQ at scanline %d, dot %d\n", ppu_scanline(), ppu_dot());
                cart_cpu_write(0xE000, 0);
                cart_cpu_write(0xE001, 0);
                seen++;
            }
        }
    }
    if (t == 5) {
        ppu_reset();
        cart_cpu_write(0xC000, 5);
        cart_cpu_write(0xC001, 0);
        cart_cpu_write(0xE001, 0);
        ppu_register_write(1, 0x00);            // rendering off: no scanlines are counted
        for (long n = 0; n < 89342; n++) ppu_tick();
        printf("rendering off, one frame: IRQ %d\n", cart_irq());
        ppu_register_write(1, 0x08);
        for (long n = 0; n < 89342; n++) ppu_tick();
        printf("background on, one frame: IRQ %d\n", cart_irq());
    }
    return 0;
}
