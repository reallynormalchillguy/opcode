// Opcode's NES. Provided by the course.
// It plugs game.nes into your emulator and runs it on the screen. Each
// frame runs the CPU, with the PPU ticking three dots per CPU cycle, until
// the PPU says the picture is finished.
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "screen.h"

#include "readfile.inc"

static Cpu cpu;
static long frames;

static void run_frame(void) {
    // A safety limit: a real frame is about 29781 CPU cycles.
    for (long cycles = 0; cycles < 200000; ) {
        int c = cpu_step(&cpu);
        cycles += c;
        for (int i = 0; i < 3 * c; i++) {
            ppu_tick();
        }
        if (ppu_take_nmi()) {
            cpu_nmi(&cpu);
        }
        if (ppu_take_frame()) {
            break;
        }
    }
    screen_show(ppu_pixels());
    frames++;
}

int main(void) {
    if (!plug_in_cartridge()) return 1;
    printf("Mapper %d, %d x 16 KB PRG, %d x 8 KB CHR, %s mirroring\n", cart_mapper(), cart_prg_banks(),
           cart_chr_banks(), cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal");
    bus_reset();
    ppu_reset();
    cpu_reset(&cpu);
    printf("Reset vector: %04X\n", cpu.pc);
    screen_loop(run_frame);
    return 0;
}
