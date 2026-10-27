// Opcode's NES. Provided by the course.
// It plugs game.nes into your emulator and runs it on the screen. Each
// frame runs the CPU, with the PPU ticking three dots per CPU cycle, until
// the PPU says the picture is finished.
//@ 26
// The keyboard is controller 1.
//@ end
//@ 35
// The APU runs one tick per CPU cycle; this file mixes its channels into
// sound for the page.
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
//@ 35
#include "apu.h"
//@ end

#include "readfile.inc"

static Cpu cpu;
static long frames;
//@ 35

// ---------- Sound ----------

// The NES adds its channels through resistors, so the mix is not a plain
// sum: these two formulas come from the console's circuit.
static float mix(void) {
    int p = apu_channel(0) + apu_channel(1);
    int t = apu_channel(2), n = apu_channel(3), d = apu_channel(4);
    float pulse = p ? 95.88f / (8128.0f / p + 100.0f) : 0.0f;
    float tnd = (t || n || d) ? 159.79f / (1.0f / (t / 8227.0f + n / 12241.0f + d / 22638.0f) + 100.0f) : 0.0f;
    return pulse + tnd;
}

// The page plays 44100 samples a second and runs 60 frames a second, so a
// frame (29780.5 CPU cycles) makes 735 samples: one per 40.52 cycles. Each
// sample is the average of the cycles it covers.
#define CYCLES_PER_SAMPLE (29780.5f / 735.0f)
static float sound[2048];
static int sound_count;
static float sum, until = CYCLES_PER_SAMPLE;
static int summed;
static float last_in, last_out;

static void sound_cycle(void) {
    apu_tick();
    sum += mix();
    summed++;
    until -= 1.0f;
    if (until <= 0.0f) {
        until += CYCLES_PER_SAMPLE;
        float x = sum / summed;
        sum = 0.0f;
        summed = 0;
        // Take away the constant part (the NES has a capacitor for this too).
        float y = x - last_in + 0.996f * last_out;
        last_in = x;
        last_out = y;
        if (sound_count < 2048) sound[sound_count++] = y;
    }
}
//@ end

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
//@ 35
        for (int i = 0; i < c; i++) {
            sound_cycle();
        }
//@ end
        if (ppu_take_nmi()) {
            cpu_nmi(&cpu);
        }
//@ 34-35
        if (cart_irq()) {
            cpu_irq(&cpu);                      // taken only if the game has interrupts on
        }
//@ end
//@ 36
        if (cart_irq() || apu_irq()) {
            cpu_irq(&cpu);                      // taken only if the game has interrupts on
        }
//@ end
        if (ppu_take_frame()) {
            break;
        }
    }
    screen_show(ppu_pixels());
//@ 35
    screen_audio(sound, sound_count);
    sound_count = 0;
//@ end
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
//@ 35
    apu_reset();
//@ end
    cpu_reset(&cpu);
    printf("Reset vector: %04X\n", cpu.pc);
    screen_loop(run_frame);
    return 0;
}
