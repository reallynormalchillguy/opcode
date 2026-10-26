// Opcode's IRQ monitor. Provided by the course.
// It runs the cartridge like main.c does, but without giving IRQs to the
// CPU (that is the next exercise). Each frame it prints the scanline where
// the cartridge's IRQ line went up, then lowers it the way a game's IRQ code
// would, by writing E000 and E001.
// Program input: how many frames (5 if empty).
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"

#include "readfile.inc"

int main(void) {
    if (!plug_in_cartridge()) return 1;
    printf("Mapper %d\n", cart_mapper());
    int frames = 5;
    if (scanf("%d", &frames) != 1) frames = 5;
    bus_reset();
    ppu_reset();
    Cpu cpu;
    cpu_reset(&cpu);
    for (int f = 1; f <= frames; f++) {
        int lines[8], n = 0;
        for (long cycles = 0; cycles < 200000; ) {
            int c = cpu_step(&cpu);
            c += bus_take_stall();
            cycles += c;
            for (int i = 0; i < 3 * c; i++) {
                ppu_tick();
                if (cart_irq()) {
                    if (n < 8) lines[n++] = ppu_scanline();
                    cart_cpu_write(0xE000, 0);          // acknowledge, as the game would
                    cart_cpu_write(0xE001, 0);
                }
            }
            if (ppu_take_nmi()) cpu_nmi(&cpu);
            if (ppu_take_frame()) break;
        }
        printf("frame %d: ", f);
        if (n == 0) printf("no IRQ\n");
        for (int i = 0; i < n; i++) printf("IRQ on scanline %d%s", lines[i], i + 1 < n ? ", " : "\n");
    }
    return 0;
}
