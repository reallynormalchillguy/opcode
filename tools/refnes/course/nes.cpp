// Opcode's NES. Provided by the course.
// It plugs game.nes into your emulator and runs it on the screen. Each
// frame runs the CPU, with the PPU ticking three dots per CPU cycle, until
// the PPU says the picture is finished.
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

#include "readfile.inc"

namespace {

// The console's parts, created in this order: each one gets references to
// the parts it talks to. They live outside main so that run_frame, which
// the page calls 60 times a second, can reach them.
Cartridge cart;
Ppu ppu(cart);
Bus bus(cart, ppu);
Cpu cpu(bus);

void run_frame() {
    // A safety limit: a real frame is about 29781 CPU cycles.
    for (long cycles = 0; cycles < 200000; ) {
        int c = cpu.step();
        cycles += c;
        for (int i = 0; i < 3 * c; i++) {
            ppu.tick();
        }
        if (ppu.take_nmi()) {
            cpu.nmi();
        }
        if (ppu.take_frame()) {
            break;
        }
    }
    screen_show(ppu.pixels());
}

}  // namespace

int main() {
    if (!plug_in_cartridge(cart)) return 1;
    std::printf("Mapper %d, %d x 16 KB PRG, %d x 8 KB CHR, %s mirroring\n", cart.mapper(), cart.prg_banks(),
                cart.chr_banks(), cart.mirroring() == Mirroring::Vertical ? "vertical" : "horizontal");
    bus.reset();
    ppu.reset();
    cpu.reset();
    std::printf("Reset vector: %04X\n", cpu.pc);
    screen_loop(run_frame);
}
