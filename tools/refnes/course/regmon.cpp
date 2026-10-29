// Opcode's PPU register monitor. Provided by the course.
// Commands (numbers in hex), like the CPU writing to 2000-2007:
//   w REG VALUE  write VALUE to register REG (0-7), with Ppu::register_write
//   r REG        read register REG, with Ppu::register_read
//   p ADDR       peek at the PPU's memory directly, with Ppu::read
#include <array>
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
    const std::array<const char*, 8> names = {"PPUCTRL", "PPUMASK", "PPUSTATUS", "OAMADDR", "OAMDATA", "PPUSCROLL", "PPUADDR", "PPUDATA"};
    Cartridge cart;
    if (!plug_in_cartridge(cart)) return 1;
    Ppu ppu(cart);
    ppu.reset();
    char cmd = 0;
    unsigned a = 0, v = 0;
    std::cin >> std::hex;
    while (std::cin >> cmd) {
        if (cmd == 'w' && std::cin >> a >> v && a < 8) {
            ppu.register_write(static_cast<int>(a), static_cast<std::uint8_t>(v));
            std::printf("write %02X to %s\n", v & 0xFF, names[a]);
        } else if (cmd == 'r' && std::cin >> a && a < 8) {
            std::printf("read  %02X from %s\n", ppu.register_read(static_cast<int>(a)), names[a]);
        } else if (cmd == 'p' && std::cin >> a) {
            std::printf("peek  %04X = %02X\n", a & 0x3FFF, ppu.read(static_cast<std::uint16_t>(a)));
        } else {
            std::printf("I did not understand that command.\n");
            return 1;
        }
    }
}
