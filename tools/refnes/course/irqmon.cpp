// Opcode's IRQ monitor. Provided by the course.
// It runs the cartridge like main.cpp does, but without giving IRQs to the
// CPU (that is the next exercise). Each frame it prints the scanline where
// the cartridge's IRQ line went up, then lowers it the way a game's IRQ code
// would, by writing E000 and E001.
// Program input: how many frames (5 if empty).
#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"

#include "readfile.inc"

namespace {

Cartridge cart;
Ppu ppu(cart);
Controllers controllers;
Bus bus(cart, ppu, controllers);
Cpu cpu(bus);

}  // namespace

int main() {
    if (!plug_in_cartridge(cart)) return 1;
    std::printf("Mapper %d\n", cart.mapper());
    int frames = 5;
    if (!(std::cin >> frames)) frames = 5;
    bus.reset();
    ppu.reset();
    cpu.reset();
    for (int f = 1; f <= frames; f++) {
        std::vector<int> lines;
        for (long cycles = 0; cycles < 200000; ) {
            int c = cpu.step();
            c += bus.take_stall();
            cycles += c;
            for (int i = 0; i < 3 * c; i++) {
                ppu.tick();
                if (cart.irq()) {
                    if (lines.size() < 8) lines.push_back(ppu.scanline());
                    cart.cpu_write(0xE000, 0);          // acknowledge, as the game would
                    cart.cpu_write(0xE001, 0);
                }
            }
            if (ppu.take_nmi()) cpu.nmi();
            if (ppu.take_frame()) break;
        }
        std::printf("frame %d: ", f);
        if (lines.empty()) std::printf("no IRQ\n");
        for (std::size_t i = 0; i < lines.size(); i++) std::printf("IRQ on scanline %d%s", lines[i], i + 1 < lines.size() ? ", " : "\n");
    }
}
