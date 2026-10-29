#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "apu.h"
#include "bus.h"
#include "cart.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Controllers controllers;
Apu apu;
Bus bus(cart, ppu, controllers, apu);

#include "apu.inc"

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    apu.reset();
    if (t == 1) {
        apu.write(0x4015, 0x01);
        apu.write(0x4000, 0xBF);            // 50%, volume 15
        apu.write(0x4002, 0xFD);
        apu.write(0x4003, 0x08);            // period 253: 440 Hz
        measure(0, 40000, "period 253, 50%:");
        apu.write(0x4000, 0xB6);            // volume 6
        apu.write(0x4002, 0x7E);            // period 126: an octave up
        measure(0, 40000, "period 126, volume 6:");
        std::printf("the CPU runs 1789773 cycles a second: %ld Hz\n", 1789773L / ((126 + 1) * 16));
    }
    if (t == 2) {
        apu.write(0x4015, 0x01);
        for (int duty = 0; duty < 4; duty++) {
            apu.write(0x4000, static_cast<std::uint8_t>(duty << 6 | 0x3F));
            apu.write(0x4002, 99);
            apu.write(0x4003, 0x08);        // restarts the waveform
            std::printf("duty %d:", duty);
            for (int step = 0; step < 16; step++) {
                std::printf("%s", apu.channel(0) ? "#" : ".");
                run_cycles(200);            // (99 + 1) x 2 cycles a step
            }
            std::printf("\n");
        }
    }
    if (t == 3) {
        apu.write(0x4000, 0xBF);
        apu.write(0x4002, 0xFD);
        apu.write(0x4003, 0x08);            // not enabled yet: the length is not loaded
        int out = apu.channel(0);
        run_cycles(300);
        out += apu.channel(0);
        std::printf("before 4015: status %02X, output %d\n", apu.read_status(), out);
        apu.write(0x4015, 0x03);
        apu.write(0x4003, 0x08);
        apu.write(0x4007, 0x08);
        std::printf("enabled and loaded: status %02X\n", apu.read_status());
        apu.write(0x4015, 0x02);
        std::printf("pulse 1 switched off: status %02X\n", apu.read_status());
        measure(0, 5000, "pulse 1 after that:");
    }
    if (t == 4) {
        apu.write(0x4015, 0x01);
        apu.write(0x4000, 0xBF);
        apu.write(0x4002, 0x07);
        apu.write(0x4003, 0x08);
        measure(0, 5000, "period 7 (too high):");
        apu.write(0x4002, 0x08);
        measure(0, 5000, "period 8:");
    }
    if (t == 5) {
        cart.load(make_rom(1, 1, 0x00, 0));
        bus.reset();
        bus.write(0x4015, 0x02);
        bus.write(0x4004, 0x7A);            // 25%, volume 10
        bus.write(0x4006, 0x40);
        bus.write(0x4007, 0x09);            // period 0x140
        std::printf("through the bus: status %02X\n", bus.read(0x4015));
        measure(1, 40000, "pulse 2, period 0x140, 25%:");
        measure(0, 2000, "pulse 1 stays quiet:");
    }
}
