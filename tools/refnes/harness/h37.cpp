#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "apu.h"

Apu apu;

#include "apu.inc"

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    apu.reset();
    apu.write(0x4017, 0x40);
    if (t == 1) {
        apu.write(0x4015, 0x04);
        apu.write(0x4008, 0xFF);            // control on, linear counter 127
        apu.write(0x400A, 0x7E);
        apu.write(0x400B, 0x08);            // period 126: 440 Hz
        run_cycles(8000);                   // the linear counter loads at a quarter frame
        std::printf("triangle steps:");
        for (int i = 0; i < 34; i++) { std::printf(" %d", apu.channel(2)); run_cycles(127); }
        std::printf("\n");
        measure(2, 20000, "triangle, period 126:");
    }
    if (t == 2) {
        apu.write(0x4015, 0x04);
        apu.write(0x4008, 0x05);            // control off, linear counter 5
        apu.write(0x400A, 0x40);
        apu.write(0x400B, 0x08);
        long last = 0;
        int prev = apu.channel(2);
        for (long i = 1; i < 120000; i++) {
            apu.tick();
            if (apu.channel(2) != prev) last = i;
            prev = apu.channel(2);
        }
        std::printf("linear counter 5: the triangle stops after %ld cycles, at %d\n", last, apu.channel(2));
        std::printf("status %02X\n", apu.read_status());
        apu.write(0x400A, 0x01);            // period 1: too high to hear
        apu.write(0x400B, 0x08);
        std::printf("period 1: %d\n", apu.channel(2));
    }
    if (t == 3) {
        apu.write(0x4015, 0x08);
        apu.write(0x400C, 0x3A);            // halted, constant volume 10
        apu.write(0x400E, 0x00);            // fastest: a step every 4 cycles
        apu.write(0x400F, 0x08);
        std::printf("noise, mode 0:");
        for (int i = 0; i < 40; i++) { std::printf("%c", apu.channel(3) ? '#' : '.'); run_cycles(4); }
        std::printf("\n");
        apu.write(0x400E, 0x80);
        std::printf("noise, mode 1:");
        for (int i = 0; i < 40; i++) { std::printf("%c", apu.channel(3) ? '#' : '.'); run_cycles(4); }
        std::printf("\n");
        apu.write(0x400E, 0x0A);            // period index 10: 380 cycles
        long changes = 0;
        int prev = apu.channel(3);
        for (long i = 0; i < 38000; i++) { apu.tick(); if (apu.channel(3) != prev) changes++; prev = apu.channel(3); }
        std::printf("index 10, 38000 cycles: %ld changes\n", changes);
    }
    if (t == 4) {
        apu.write(0x4015, 0x0C);
        apu.write(0x4008, 0x81);
        apu.write(0x400B, 0x08);
        apu.write(0x400C, 0x10);            // envelope, period 0, length running
        apu.write(0x400F, 0x18);            // length 2
        std::printf("status %02X", apu.read_status());
        run_cycles(30000);
        std::printf(", a frame later %02X", apu.read_status());
        apu.write(0x4015, 0x00);
        std::printf(", all off %02X\n", apu.read_status());
        apu.write(0x4015, 0x08);
        apu.write(0x400C, 0x00);            // decaying envelope
        apu.write(0x400F, 0x08);
        std::printf("noise envelope:");
        for (int q = 0; q < 17; q++) {
            int peak = 0;
            for (long i = 0; i < 7457; i++) { apu.tick(); if (apu.channel(3) > peak) peak = apu.channel(3); }
            std::printf(" %d", peak);
        }
        std::printf("\n");
    }
}
