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

// Tick until PPUSTATUS shows bit `bit`, or the frame ends. Returns the
// scanline it appeared on, or -1.
static int line_of(uint8_t bit) {
    ppu_take_frame();
    for (long n = 0; n < 200000; n++) {
        ppu_tick();
        if (ppu_register_read(2) & bit) return ppu_scanline();
        if (ppu_take_frame()) return -1;
    }
    return -1;
}

// From the start of a frame (just after the pre-render line).
static void to_frame_start(void) {
    while (!(ppu_scanline() == 0 && ppu_dot() == 0)) ppu_tick();
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    build_sprite_scene();
    if (t == 1) {
        put_tile(5, 10, 1);                      // solid background at x 40-47, lines 80-87
        sprite(0, 83, 2, 0x00, 44);              // sprite 0 overlaps it from line 84
        to_frame_start();
        printf("sprite 0 over the background: hit on scanline %d\n", line_of(0x40));
        sprite(0, 83, 2, 0x20, 44);
        to_frame_start();
        printf("same, sprite 0 behind the background: hit on scanline %d\n", line_of(0x40));
    }
    if (t == 2) {
        put_tile(5, 10, 1);
        sprite(0, 83, 2, 0x00, 100);             // over see-through background
        to_frame_start();
        printf("sprite 0 over see-through background: %d\n", line_of(0x40));
        sprite(0, 0xFF, 2, 0x00, 0);
        sprite(1, 83, 2, 0x00, 44);              // sprite 1 over the solid tile
        to_frame_start();
        printf("sprite 1 (not 0) over the background: %d\n", line_of(0x40));
        put_tile(2, 10, 2);                      // left half colour 2 (x 16-19)
        sprite(1, 0xFF, 2, 0x00, 0);
        sprite(0, 83, 1, 0x00, 20);              // the arrow at x 20: only pixels from x 20 on
        to_frame_start();
        printf("sprite 0 next to the background, not over it: %d\n", line_of(0x40));
    }
    if (t == 3) {
        put_tile(31, 10, 1);
        sprite(0, 83, 2, 0x00, 255);             // only its first column, x 255, is on screen
        to_frame_start();
        printf("only at x 255: %d\n", line_of(0x40));
        put_tile(0, 12, 1);
        sprite(0, 99, 2, 0x00, 0);
        w(1, 0x1A);                              // sprites' left column hidden
        to_frame_start();
        printf("in the left column, sprites hidden there: %d\n", line_of(0x40));
        w(1, 0x1C);                              // background's left column hidden
        to_frame_start();
        printf("in the left column, background hidden there: %d\n", line_of(0x40));
        w(1, 0x1E);
        to_frame_start();
        printf("in the left column, both shown: %d\n", line_of(0x40));
    }
    if (t == 4) {
        put_tile(5, 10, 1);
        sprite(0, 83, 2, 0x00, 44);
        to_frame_start();
        line_of(0x40);
        printf("PPUSTATUS after the hit: %02X", ppu_register_read(2) & 0xE0);
        printf(", read again: %02X\n", ppu_register_read(2) & 0xE0);
        while (!(ppu_scanline() == 261 && ppu_dot() == 1)) ppu_tick();
        printf("at 261,1: %02X", ppu_register_read(2) & 0x60);
        ppu_tick();
        printf(", one dot later: %02X\n", ppu_register_read(2) & 0x60);
    }
    if (t == 5) {
        for (int i = 0; i < 8; i++) sprite(i, 120, 2, 0, i * 10);
        to_frame_start();
        printf("8 sprites on a line, overflow on scanline %d\n", line_of(0x20));
        sprite(20, 125, 2, 0, 200);
        to_frame_start();
        printf("a 9th from line 126: overflow on scanline %d\n", line_of(0x20));
        w(1, 0x00);
        to_frame_start();
        printf("the same with rendering off: %d\n", line_of(0x20));
    }
    if (t == 6) {
        if (!demo_start()) return 0;
        controller_reset();
        uint32_t bar = 0;
        int same = 0;
        for (int f = 1; f <= 300; f++) {
            controller_set(0, demo_buttons(f));
            demo_frame();
            uint32_t c = crc_rows(0, 15);
            if (f == 20) bar = c;
            if (f > 20) same += c == bar;
        }
        printf("opcode-demo.nes: the status bar looked the same in %d of 280 frames while the level scrolled to x %d\n",
               same, bus_read(0x000A) | bus_read(0x000B) << 8);
    }
    return 0;
}
