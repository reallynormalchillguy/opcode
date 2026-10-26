#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "palette.h"
#include "controller.h"
#include "common.inc"
#include "scene.inc"
#include "demo.inc"

static void tick_to(int line, int dot) {
    while (!(ppu_scanline() == line && ppu_dot() == dot)) ppu_tick();
}

static void scroll(int x, int y) {
    ppu_register_read(2);
    w(5, (uint8_t)x);
    w(5, (uint8_t)y);
}

// A marker in each corner of nametables 0 and 1, and a column of solid tiles.
static void marked_scene(void) {
    build_sprite_scene();
    w(1, 0x0A);                                  // background only
    put_tile(0, 0, 1);                           // nametable 0, top-left: colour 1 (w)
    put_tile(1, 29, 2);                          // nametable 0, bottom row
    set_addr(0x2400); w(7, 1); w(7, 1);           // nametable 1, top-left: two solid tiles
    set_addr(0x23C0); w(7, 0x01);                 // nametable 0 top-left area: palette 1
    for (int r = 4; r < 30; r++) put_tile(0, r, 1);   // column 0: solid colour 1 (w)
    for (int r = 10; r <= 20; r++) put_tile(2, r, 2); // column 2, rows 10-20: colour 2 on the left (r)
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    marked_scene();
    if (t == 1) {
        scroll(4, 3);
        finish_frame();
        finish_frame();
        printf("scrolled 4 right and 3 down:\n");
        show_area(0, 0, 12, 6);
        w(0, 0x11);                              // nametable 1
        scroll(0, 0);
        finish_frame();
        finish_frame();
        printf("nametable 1:\n");
        show_area(0, 0, 20, 2);
    }
    if (t == 2) {
        scroll(250, 0);
        finish_frame();
        finish_frame();
        printf("x 250: the right edge comes from nametable 1:\n");
        show_area(0, 0, 30, 1);
    }
    if (t == 3) {
        scroll(0, 236);
        finish_frame();
        finish_frame();
        printf("y 236: row 29, then nametable 2 (= 0 here) row 0:\n");
        for (int y = 0; y < 12; y += 2) show_area(0, y, 12, 1);
        scroll(0, 248);
        finish_frame();
        finish_frame();
        printf("y 248: row 31 holds attributes, shown as tiles, then row 0 of the same nametable:\n");
        for (int y = 0; y < 18; y += 3) show_area(0, y, 12, 1);
    }
    if (t == 4) {
        scroll(0, 0);
        finish_frame();
        tick_to(100, 300);
        scroll(16, 0);                           // x in the middle of the frame: from the next line
        tick_to(140, 300);
        scroll(16, 80);                          // y in the middle: only from the next frame
        finish_frame();
        printf("x = 16 written on line 100, y = 80 on line 140 (the left pixel of lines 99-102, 139-142):\n");
        const uint32_t *px = ppu_pixels();
        for (int y = 99; y <= 102; y++) printf("  line %d: %c\n", y, letter(px[y * 256 + 0]));
        for (int y = 139; y <= 142; y++) printf("  line %d: %c\n", y, letter(px[y * 256 + 0]));
        finish_frame();
        printf("next frame, from y 80: line 0 shows row 10: %c%c\n", letter(px[0]), letter(px[8]));
    }
    if (t == 5) {
        scroll(0, 0);
        finish_frame();
        tick_to(50, 300);
        set_addr(0x2020);                        // a 2006 write in the middle: v changes at once
        tick_to(51, 0);
        finish_frame();
        const uint32_t *px = ppu_pixels();
        printf("2006 = 2020 (row 1) on line 50: lines 50-53, left pixel:");
        for (int y = 50; y <= 53; y++) printf(" %c", letter(px[y * 256]));
        printf("\n");
    }
    if (t == 6) {
        if (!demo_start()) return 0;
        controller_reset();
        int same = 0;
        uint32_t bar = 0;
        for (int f = 1; f <= 300; f++) {
            controller_set(0, demo_buttons(f));
            demo_frame();
            uint32_t c = crc_rows(0, 15);
            if (f == 20) bar = c;
            if (f > 20) same += c == bar;
        }
        printf("opcode-demo.nes: the status bar looked the same in %d of 280 frames; camera at x %d\n", same,
               bus_read(0x000A) | bus_read(0x000B) << 8);
        for (int b = 0; b < 15; b++) printf("  rows %3d-%3d: %08X\n", b * 16, b * 16 + 15, crc_rows(b * 16, b * 16 + 15));
    }
    return 0;
}
