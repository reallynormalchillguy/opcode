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
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>
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

namespace {

// The console's parts, created in this order: each one gets references to
// the parts it talks to. They live outside main so that run_frame, which
// the page calls 60 times a second, can reach them.
Cartridge cart;
Ppu ppu(cart);
//@ 21-25
Bus bus(cart, ppu);
//@ end
//@ 26-34
Controllers controllers;
Bus bus(cart, ppu, controllers);
//@ end
//@ 35
Controllers controllers;
Apu apu;
Bus bus(cart, ppu, controllers, apu);
//@ end
Cpu cpu(bus);
//@ 35

// ---------- Sound ----------

// The NES adds its channels through resistors, so the mix is not a plain
// sum: these two formulas come from the console's circuit.
float mix() {
    int p = apu.channel(0) + apu.channel(1);
    int t = apu.channel(2), n = apu.channel(3), d = apu.channel(4);
    float pulse = p ? 95.88f / (8128.0f / p + 100.0f) : 0.0f;
    float tnd = (t || n || d) ? 159.79f / (1.0f / (t / 8227.0f + n / 12241.0f + d / 22638.0f) + 100.0f) : 0.0f;
    return pulse + tnd;
}

// The page plays 44100 samples a second and runs 60 frames a second, so a
// frame (29780.5 CPU cycles) makes 735 samples: one per 40.52 cycles. Each
// sample is the average of the cycles it covers.
constexpr float kCyclesPerSample = 29780.5f / 735.0f;
std::vector<float> sound;
float sum = 0.0f, until = kCyclesPerSample;
int summed = 0;
float last_in = 0.0f, last_out = 0.0f;

void sound_cycle() {
    apu.tick();
    sum += mix();
    summed++;
    until -= 1.0f;
    if (until <= 0.0f) {
        until += kCyclesPerSample;
        float x = sum / summed;
        sum = 0.0f;
        summed = 0;
        // Take away the constant part (the NES has a capacitor for this too).
        float y = x - last_in + 0.996f * last_out;
        last_in = x;
        last_out = y;
        if (sound.size() < 2048) sound.push_back(y);
    }
}
//@ end

void run_frame() {
//@ 26
    controllers.set(0, screen_buttons());
//@ end
    // A safety limit: a real frame is about 29781 CPU cycles.
    for (long cycles = 0; cycles < 200000; ) {
        int c = cpu.step();
//@ 22
        c += bus.take_stall();                      // an OAM DMA pauses the CPU
//@ end
        cycles += c;
        for (int i = 0; i < 3 * c; i++) {
            ppu.tick();
        }
//@ 35
        for (int i = 0; i < c; i++) {
            sound_cycle();
        }
//@ end
        if (ppu.take_nmi()) {
            cpu.nmi();
        }
//@ 34-35
        if (cart.irq()) {
            cpu.irq();                              // taken only if the game has interrupts on
        }
//@ end
//@ 36
        if (cart.irq() || apu.irq()) {
            cpu.irq();                              // taken only if the game has interrupts on
        }
//@ end
        if (ppu.take_frame()) {
            break;
        }
    }
    screen_show(ppu.pixels());
//@ 35
    screen_audio(sound.data(), static_cast<int>(sound.size()));
    sound.clear();
//@ end
}

}  // namespace

int main() {
    if (!plug_in_cartridge(cart)) return 1;
    std::printf("Mapper %d, %d x 16 KB PRG, %d x 8 KB CHR, %s mirroring\n", cart.mapper(), cart.prg_banks(),
                cart.chr_banks(), cart.mirroring() == Mirroring::Vertical ? "vertical" : "horizontal");
    bus.reset();
    ppu.reset();
//@ 26
    controllers.reset();
//@ end
//@ 35
    apu.reset();
    apu.connect(&bus);
//@ end
    cpu.reset();
    std::printf("Reset vector: %04X\n", cpu.pc);
    screen_loop(run_frame);
}
