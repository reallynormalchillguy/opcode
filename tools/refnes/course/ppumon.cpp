// Opcode's PPU memory monitor. Provided by the course.
// It plugs in game.nes (for its pattern tables and mirroring), then runs
// commands from Program input (numbers in hex):
//   r ADDR        read a byte from the PPU's bus with Ppu::read
//   w ADDR VALUE  write a byte with Ppu::write
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
    std::printf("Cartridge mirroring: %s\n", cart.mirroring() == Mirroring::Vertical ? "vertical" : "horizontal");
    char cmd = 0;
    unsigned addr = 0, value = 0;
    std::cin >> std::hex;
    while (std::cin >> cmd) {
        if (cmd == 'r' && std::cin >> addr) {
            std::printf("%04X: %02X\n", addr, ppu.read(static_cast<std::uint16_t>(addr)));
        } else if (cmd == 'w' && std::cin >> addr >> value) {
            ppu.write(static_cast<std::uint16_t>(addr), static_cast<std::uint8_t>(value));
        } else {
            std::printf("Unknown command '%c'\n", cmd);
            return 1;
        }
    }
}
