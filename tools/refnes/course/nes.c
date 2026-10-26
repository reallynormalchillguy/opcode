// Opcode's NES. Provided by the course.
// It plugs game.nes into your emulator and runs it on the screen. Each
// frame runs the CPU, with the PPU ticking three dots per CPU cycle, until
// the PPU says the picture is finished.
//@ 26
// The keyboard is controller 1.
//@ end
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "screen.h"
//@ 26
#include "controller.h"
//@ end

#include "readfile.inc"

static Cpu cpu;
static long frames;

static void run_frame(void) {
//@ 26
    controller_set(0, screen_buttons());
//@ end
    // A safety limit: a real frame is about 29781 CPU cycles.
    for (long cycles = 0; cycles < 200000; ) {
        int c = cpu_step(&cpu);
//@ 22
        c += bus_take_stall();                  // an OAM DMA pauses the CPU
//@ end
        cycles += c;
        for (int i = 0; i < 3 * c; i++) {
            ppu_tick();
        }
        if (ppu_take_nmi()) {
            cpu_nmi(&cpu);
        }
//@ 34
        if (cart_irq()) {
            cpu_irq(&cpu);                      // taken only if the game has interrupts on
        }
//@ end
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
//@ 26
    controller_reset();
//@ end
    cpu_reset(&cpu);
    printf("Reset vector: %04X\n", cpu.pc);
    screen_loop(run_frame);
    return 0;
}
