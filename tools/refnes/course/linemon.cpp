// Opcode's scanline monitor. Provided by the course.
// It runs the cartridge for a number of frames (Program input, 60 if
// empty), then asks your Ppu::sprites_on_line which sprites each scanline
// has, and prints the lines that have any, grouped.
#include <array>
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include <string>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"

#include "readfile.inc"
#include "runner.inc"

namespace {

std::string describe(int count, const std::array<std::uint8_t, 8>& found) {
    std::string out = std::to_string(count) + (count == 1 ? " sprite:" : " sprites:");
    for (int i = 0; i < count && i < 8; i++) out += " " + std::to_string(found[i]);
    if (count > 8) out += "  (" + std::to_string(count - 8) + " left out)";
    return out;
}

}  // namespace

int main() {
    if (!plug_in_cartridge(cart)) return 1;
    int frames = 60;
    if (!(std::cin >> frames)) frames = 60;
    bus.reset();
    ppu.reset();
    cpu.reset();
    run_frames(frames);
    std::printf("After %d frames:\n", frames);
    std::string prev;
    int start = 0;
    for (int y = 0; y <= 240; y++) {
        std::string text;
        if (y < 240) {
            std::array<std::uint8_t, 8> found{};
            int count = ppu.sprites_on_line(y, found);
            if (count > 0) text = describe(count, found);
        }
        if (text != prev) {
            if (!prev.empty()) std::printf("lines %3d-%3d  %s\n", start, y - 1, prev.c_str());
            prev = text;
            start = y;
        }
    }
}
