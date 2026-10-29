// Opcode's scroll register monitor. Provided by the course.
// Each line of Program input is a register access: "2000 01" writes 01 to
// PPUCTRL, "2002" reads PPUSTATUS, "2005 7D" writes PPUSCROLL, and so on.
// After each one it prints v, t, fine x and w, with t cut into its parts.
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include "cart.h"
#include "ppu.h"

namespace {

std::string bits(unsigned value, int count) {
    std::string out;
    for (int i = count - 1; i >= 0; i--) out += (value >> i) & 1 ? '1' : '0';
    return out;
}

void show(const Ppu& ppu) {
    Ppu::ScrollRegs r = ppu.scroll_regs();
    unsigned t = r.t;
    std::printf("    t = %04X  %s %s %s %s  (fine y %u, nametable %u, coarse y %2u, coarse x %2u)\n", t,
                bits(t >> 12, 3).c_str(), bits(t >> 10, 2).c_str(), bits(t >> 5, 5).c_str(), bits(t, 5).c_str(),
                (t >> 12) & 7, (t >> 10) & 3, (t >> 5) & 31, t & 31);
    std::printf("    v = %04X   fine x = %d   w = %d\n", r.v, r.fine_x, r.w ? 1 : 0);
}

}  // namespace

int main() {
    // An empty cartridge with CHR RAM.
    std::vector<std::uint8_t> rom(16 + 0x4000, 0);
    rom[0] = 'N'; rom[1] = 'E'; rom[2] = 'S'; rom[3] = 0x1A; rom[4] = 1; rom[6] = 1;
    Cartridge cart;
    cart.load(rom);
    Ppu ppu(cart);
    ppu.reset();
    std::string line;
    int n = 0;
    while (std::getline(std::cin, line)) {
        std::istringstream in(line);
        unsigned reg = 0, value = 0;
        if (!(in >> std::hex >> reg) || reg < 0x2000 || reg > 0x2007) continue;
        if (in >> value) {
            std::printf("write %02X to %04X\n", value & 0xFF, reg);
            ppu.register_write(reg & 7, static_cast<std::uint8_t>(value));
        } else {
            std::printf("read %04X\n", reg);
            ppu.register_read(reg & 7);
        }
        show(ppu);
        n++;
    }
    if (n == 0) std::printf("Write register accesses in Program input, one per line, like: 2005 7D\n");
}
