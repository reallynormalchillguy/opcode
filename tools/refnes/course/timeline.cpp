// Opcode's PPU timeline. Provided by the course.
// It ticks your PPU through two frames with NMIs turned on, and prints
// every moment something happens.
// Program input: the value written to PPUCTRL first (default 80: NMI on).
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "ppu.h"

#include "readfile.inc"

int main() {
    Cartridge cart;
    if (!plug_in_cartridge(cart)) return 1;
    Ppu ppu(cart);
    ppu.reset();
    unsigned ctrl = 0x80;
    if (!(std::cin >> std::hex >> ctrl)) ctrl = 0x80;
    ppu.register_write(0, static_cast<std::uint8_t>(ctrl));
    std::printf("PPUCTRL = %02X\n", ctrl & 0xFF);
    long dots = 0;
    int frames = 0;
    while (frames < 2 && dots < 400000) {
        int sl = ppu.scanline(), d = ppu.dot();
        ppu.tick();
        dots++;
        if (ppu.take_nmi()) std::printf("dot %6ld  (scanline %3d, dot %3d): NMI\n", dots, sl, d);
        if (ppu.take_frame()) {
            frames++;
            std::printf("dot %6ld  (scanline %3d, dot %3d): frame %d finished\n", dots, sl, d, frames);
        }
        if (sl == 250 && d == 0) {
            std::printf("dot %6ld  (scanline 250): PPUSTATUS reads %02X", dots, ppu.register_read(2));
            std::printf(", then %02X\n", ppu.register_read(2));
        }
    }
    std::printf("Two frames took %ld dots.\n", dots);
}
