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

// Run until status bit `bit` goes to 0; returns the cycle, or -1.
static long until_off(std::uint8_t bit, long limit) {
    for (long i = 1; i <= limit; i++) {
        apu.tick();
        if (!(apu.read_status() & bit)) return i;
    }
    return -1;
}

static void peaks(int ch, int quarters, const char* label) {
    std::printf("%s", label);
    for (int q = 0; q < quarters; q++) {
        int peak = 0;
        for (long i = 0; i < 7457; i++) { apu.tick(); if (apu.channel(ch) > peak) peak = apu.channel(ch); }
        std::printf(" %d", peak);
    }
    std::printf("\n");
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    apu.reset();
    apu.write(0x4017, 0x40);                // no frame IRQ unless a test asks
    if (t == 1) {
        apu.write(0x4015, 0x01);
        apu.write(0x4000, 0x9F);            // length counter running
        apu.write(0x4002, 0xFD);
        apu.write(0x4003, 0x18);            // length index 3: 2 half frames
        std::printf("length 2: silent after %ld cycles\n", until_off(0x01, 200000));
        apu.write(0x4003, 0x00);            // index 0: 10 half frames
        std::printf("length 10: silent after %ld more cycles\n", until_off(0x01, 400000));
        apu.write(0x4000, 0xBF);            // halted
        apu.write(0x4003, 0x18);
        std::printf("halted: %ld\n", until_off(0x01, 200000));
    }
    if (t == 2) {
        apu.write(0x4015, 0x01);
        apu.write(0x4000, 0xC0);            // 75%, envelope (no loop), decay period 0
        apu.write(0x4002, 0x40);
        apu.write(0x4003, 0x08);
        peaks(0, 18, "decay, one step per quarter frame:");
        apu.write(0x4000, 0xE2);            // loop, period 2
        apu.write(0x4003, 0x08);
        peaks(0, 20, "looping, period 2:");
    }
    if (t == 3) {
        apu.write(0x4015, 0x03);
        apu.write(0x4000, 0xBF);
        apu.write(0x4002, 0x00);
        apu.write(0x4001, 0x8B);            // up: enabled, period 0, negate, shift 3
        apu.write(0x4003, 0x02);            // period 0x200
        measure(0, 20000, "start, period 0x200:");
        run_cycles(20000);
        measure(0, 20000, "half frames later:");
        apu.write(0x4004, 0xBF);
        apu.write(0x4006, 0x00);
        apu.write(0x4005, 0x83);            // down: shift 3
        apu.write(0x4007, 0x06);            // period 0x600
        measure(1, 60000, "pulse 2, period 0x600:");
        measure(1, 60000, "then, too low to play:");
    }
    if (t == 4) {
        apu.reset();
        apu.write(0x4017, 0x00);            // 4-step, IRQ on
        long at = -1;
        for (long i = 1; i < 40000 && at < 0; i++) { apu.tick(); if (apu.irq()) at = i; }
        std::printf("frame IRQ after %ld cycles\n", at);
        std::printf("status %02X", apu.read_status());
        std::printf(", read again %02X", apu.read_status());
        std::printf(", IRQ %d\n", apu.irq() ? 1 : 0);
        apu.write(0x4017, 0x40);
        run_cycles(40000);
        std::printf("inhibited: IRQ %d\n", apu.irq() ? 1 : 0);
        apu.write(0x4017, 0x80);            // 5-step: no IRQ
        run_cycles(80000);
        std::printf("5-step: IRQ %d\n", apu.irq() ? 1 : 0);
    }
    if (t == 5) {
        apu.write(0x4015, 0x01);
        apu.write(0x4000, 0x9F);
        apu.write(0x4003, 0x18);            // length 2
        apu.write(0x4017, 0x80);            // 5-step: a half frame at once
        std::printf("after one 4017 write: status %02X", apu.read_status());
        apu.write(0x4017, 0x80);
        std::printf(", after two: %02X\n", apu.read_status());
    }
}
