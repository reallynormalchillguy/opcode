#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "common.inc"
#include "demo.inc"

static void sprite(int i, int y, int x) {
    ppu_register_write(3, (uint8_t)(i * 4));
    ppu_register_write(4, (uint8_t)y);
    ppu_register_write(4, 1);
    ppu_register_write(4, 0);
    ppu_register_write(4, (uint8_t)x);
}

static void hide_all(void) {
    for (int i = 0; i < 64; i++) sprite(i, 0xFF, 0);
}

static void lines(int from, int to) {
    for (int y = from; y <= to; y++) {
        uint8_t found[8] = { 0 };
        int n = ppu_sprites_on_line(y, found);
        printf("  line %3d: %d", y, n);
        for (int i = 0; i < (n > 8 ? 8 : n); i++) printf(" %s%d", i ? "" : "[", found[i]);
        printf("%s\n", n ? "]" : "");
    }
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 1, 0x00, 0));
    ppu_reset();
    hide_all();
    if (t == 1) {
        sprite(5, 10, 40);
        printf("sprite 5 at Y 10, 8 x 8:\n");
        lines(9, 20);
    }
    if (t == 2) {
        sprite(5, 10, 40);
        ppu_register_write(0, 0x20);
        printf("sprite 5 at Y 10, 8 x 16:\n");
        lines(10, 28);
    }
    if (t == 3) {
        for (int i = 0; i < 10; i++) sprite(3 + i * 5, 100 - (i % 3), i * 20);
        printf("10 sprites near Y 100:\n");
        lines(98, 103);
    }
    if (t == 4) {
        sprite(0, 0x00, 0);
        sprite(1, 0xEE, 0);
        sprite(2, 0xEF, 0);
        sprite(3, 0xF8, 0);
        int lines_with[4] = { 0 };
        for (int y = 0; y < 240; y++) {
            uint8_t found[8];
            int n = ppu_sprites_on_line(y, found);
            for (int i = 0; i < (n > 8 ? 8 : n); i++) lines_with[found[i]]++;
        }
        printf("lines showing sprite 0 (Y 00): %d, sprite 1 (Y EE): %d, sprite 2 (Y EF): %d, sprite 3 (Y F8): %d\n",
               lines_with[0], lines_with[1], lines_with[2], lines_with[3]);
        uint8_t found[8];
        printf("line 0 has %d sprites, line 1 has %d\n", ppu_sprites_on_line(0, found), ppu_sprites_on_line(1, found));
    }
    if (t == 5) {
        if (!demo_start()) return 0;
        for (int f = 0; f < 60; f++) demo_frame();
        printf("opcode-demo.nes after 60 frames, lines with sprites:\n");
        int prev = -1, start = 0;
        uint8_t prev_found[8] = { 0 };
        for (int y = 0; y <= 240; y++) {
            uint8_t found[8] = { 0 };
            int n = y < 240 ? ppu_sprites_on_line(y, found) : -1;
            if (n != prev || memcmp(found, prev_found, 8) != 0) {
                if (prev > 0) {
                    printf("  %3d-%3d: %d [", start, y - 1, prev);
                    for (int i = 0; i < (prev > 8 ? 8 : prev); i++) printf("%s%d", i ? " " : "", prev_found[i]);
                    printf("]\n");
                }
                prev = n;
                memcpy(prev_found, found, 8);
                start = y;
            }
        }
    }
    return 0;
}
