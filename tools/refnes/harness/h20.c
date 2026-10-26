#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

static long until_frame(void) {
    long n = 0;
    do { ppu_tick(); n++; } while (!ppu_take_frame() && n < 1000000);
    return n;
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 0, 0x01, 0));
    ppu_reset();
    if (t == 1) {
        printf("ticks: %d, %d", ppu_scanline(), ppu_dot());
        for (int i = 0; i < 340; i++) ppu_tick();
        printf(" -> %d, %d", ppu_scanline(), ppu_dot());
        ppu_tick();
        printf(" -> %d, %d", ppu_scanline(), ppu_dot());
        for (long i = 0; i < 341L * 261; i++) ppu_tick();
        printf(" -> %d, %d\n", ppu_scanline(), ppu_dot());
    }
    if (t == 2) {
        long first = until_frame();
        long second = until_frame();
        printf("first frame after %ld dots, then every %ld dots\n", first, second);
    }
    if (t == 3) {
        long to_vblank = 241L * 341 + 1;
        for (long i = 0; i < to_vblank; i++) ppu_tick();
        printf("at %d,%d PPUSTATUS=%02X", ppu_scanline(), ppu_dot(), ppu_register_read(2));
        ppu_tick();
        printf(", one dot later %02X", ppu_register_read(2));
        printf(", read again %02X\n", ppu_register_read(2));
        ppu_take_frame();
        until_frame();
        uint8_t in_vblank = 0;
        while (!(ppu_scanline() == 261 && ppu_dot() == 2)) {
            ppu_tick();
            if (ppu_scanline() == 260 && ppu_dot() == 0) in_vblank = ppu_register_read(2) & 0x80;
        }
        printf("next frame: set during the blank %02X, cleared after 261,1: %02X\n", in_vblank, ppu_register_read(2));
    }
    if (t == 4) {
        int nmis = 0;
        for (int f = 0; f < 2; f++) { long n = 0; do { ppu_tick(); n++; nmis += ppu_take_nmi(); } while (!ppu_take_frame()); }
        printf("NMI off: %d NMIs in 2 frames\n", nmis);
        ppu_register_read(2);                   // clear the vblank flag first
        ppu_register_write(0, 0x80);
        nmis = 0;
        for (int f = 0; f < 2; f++) { do { ppu_tick(); nmis += ppu_take_nmi(); } while (!ppu_take_frame()); }
        printf("NMI on: %d NMIs in 2 frames, at %d,%d\n", nmis, ppu_scanline(), ppu_dot());
        printf("asking twice: %d\n", ppu_take_nmi());
    }
    if (t == 5) {
        ppu_register_write(0, 0x00);
        until_frame();
        printf("NMI turned on during the blank: ");
        ppu_register_write(0, 0x80);
        printf("%d\n", ppu_take_nmi());
        ppu_register_read(2);
        ppu_register_write(0, 0x00);
        ppu_register_write(0, 0x80);
        printf("after PPUSTATUS was read: %d\n", ppu_take_nmi());
    }
    return 0;
}
