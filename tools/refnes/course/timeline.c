// Opcode's PPU timeline. Provided by the course.
// It ticks your PPU through two frames with NMIs turned on, and prints
// every moment something happens.
// Program input: the value written to PPUCTRL first (default 80: NMI on).
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"

#include "readfile.inc"

int main(void) {
    if (!plug_in_cartridge()) return 1;
    ppu_reset();
    unsigned ctrl = 0x80;
    if (scanf("%x", &ctrl) != 1) ctrl = 0x80;
    ppu_register_write(0, (uint8_t)ctrl);
    printf("PPUCTRL = %02X\n", ctrl & 0xFF);
    long dots = 0;
    int frames = 0;
    while (frames < 2 && dots < 400000) {
        int sl = ppu_scanline(), d = ppu_dot();
        ppu_tick();
        dots++;
        if (ppu_take_nmi()) printf("dot %6ld  (scanline %3d, dot %3d): NMI\n", dots, sl, d);
        if (ppu_take_frame()) {
            frames++;
            printf("dot %6ld  (scanline %3d, dot %3d): frame %d finished\n", dots, sl, d, frames);
        }
        if (sl == 250 && d == 0) {
            printf("dot %6ld  (scanline 250): PPUSTATUS reads %02X", dots, ppu_register_read(2));
            printf(", then %02X\n", ppu_register_read(2));
        }
    }
    printf("Two frames took %ld dots.\n", dots);
    return 0;
}
