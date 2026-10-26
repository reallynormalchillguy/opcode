// Opcode's sprite viewer. Provided by the course.
// It runs the cartridge for a number of frames (Program input, 60 if
// empty), then reads the 64 sprites back through OAMADDR and OAMDATA and
// lists the ones that are on screen.
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"

#include "readfile.inc"
#include "runner.inc"

int main(void) {
    if (!plug_in_cartridge()) return 1;
    int frames = 60;
    if (scanf("%d", &frames) != 1) frames = 60;
    bus_reset();
    ppu_reset();
    cpu_reset(&cpu);
    run_frames(frames);
    printf("After %d frames:\n", frames);
    printf("sprite   Y    X  tile  palette  flips  behind\n");
    int shown = 0;
    for (int i = 0; i < 64; i++) {
        uint8_t s[4];
        for (int b = 0; b < 4; b++) {
            ppu_register_write(3, (uint8_t)(i * 4 + b));   // OAMADDR
            s[b] = ppu_register_read(4);                   // OAMDATA
        }
        if (s[0] >= 0xEF) continue;                        // Y EF-FF: below the picture, hidden
        shown++;
        printf("  %2d   %3d  %3d   %02X      %d     %c%c     %s\n", i, s[0], s[3], s[1], 4 + (s[2] & 3),
               (s[2] & 0x40) ? 'H' : '-', (s[2] & 0x80) ? 'V' : '-', (s[2] & 0x20) ? "yes" : "no");
    }
    printf("%d of 64 sprites on screen.\n", shown);
    return 0;
}
