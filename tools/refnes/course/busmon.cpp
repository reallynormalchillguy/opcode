// Opcode's bus monitor. Provided by the course.
// Commands (numbers in hex), exactly what the CPU does:
//   r ADDR        read through Bus::read
//   w ADDR VALUE  write through Bus::write
//   p ADDR        peek at the PPU's memory directly, with Ppu::read
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "bus.h"
#include "cart.h"
#include "ppu.h"

#include "readfile.inc"

int main() {
    Cartridge cart;
    if (!plug_in_cartridge(cart)) return 1;
    Ppu ppu(cart);
    Bus bus(cart, ppu);
    bus.reset();
    ppu.reset();
    char cmd = 0;
    unsigned a = 0, v = 0;
    std::cin >> std::hex;
    while (std::cin >> cmd) {
        if (cmd == 'r' && std::cin >> a) {
            auto addr = static_cast<std::uint16_t>(a);
            std::printf("%04X: %02X  (%s)\n", a & 0xFFFF, bus.read(addr), bus.region(addr));
        } else if (cmd == 'w' && std::cin >> a >> v) {
            bus.write(static_cast<std::uint16_t>(a), static_cast<std::uint8_t>(v));
        } else if (cmd == 'p' && std::cin >> a) {
            std::printf("PPU %04X = %02X\n", a & 0x3FFF, ppu.read(static_cast<std::uint16_t>(a)));
        } else {
            std::printf("I did not understand that command.\n");
            return 1;
        }
    }
}
