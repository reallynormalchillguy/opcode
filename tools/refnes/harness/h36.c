#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "apu.h"
#include "apu.inc"

// Run until status bit `bit` goes to 0; returns the cycle, or -1.
static long until_off(uint8_t bit, long limit) {
    for (long i = 1; i <= limit; i++) {
        apu_tick();
        if (!(apu_read_status() & bit)) return i;
    }
    return -1;
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    apu_reset();
    apu_write(0x4017, 0x40);                // no frame IRQ unless a test asks
    if (t == 1) {
        apu_write(0x4015, 0x01);
        apu_write(0x4000, 0x9F);            // length counter running
        apu_write(0x4002, 0xFD);
        apu_write(0x4003, 0x18);            // length index 3: 2 half frames
        printf("length 2: silent after %ld cycles\n", until_off(0x01, 200000));
        apu_write(0x4003, 0x00);            // index 0: 10 half frames
        printf("length 10: silent after %ld more cycles\n", until_off(0x01, 400000));
        apu_write(0x4000, 0xBF);            // halted
        apu_write(0x4003, 0x18);
        printf("halted: %ld\n", until_off(0x01, 200000));
    }
    if (t == 2) {
        apu_write(0x4015, 0x01);
        apu_write(0x4000, 0xC0);            // 75%, envelope (no loop), decay period 0
        apu_write(0x4002, 0x40);
        apu_write(0x4003, 0x08);
        printf("decay, one step per quarter frame:");
        for (int q = 0; q < 18; q++) {
            int peak = 0;
            for (long i = 0; i < 7457; i++) { apu_tick(); if (apu_channel(0) > peak) peak = apu_channel(0); }
            printf(" %d", peak);
        }
        printf("\n");
        apu_write(0x4000, 0xE2);            // loop, period 2
        apu_write(0x4003, 0x08);
        printf("looping, period 2:");
        for (int q = 0; q < 20; q++) {
            int peak = 0;
            for (long i = 0; i < 7457; i++) { apu_tick(); if (apu_channel(0) > peak) peak = apu_channel(0); }
            printf(" %d", peak);
        }
        printf("\n");
    }
    if (t == 3) {
        apu_write(0x4015, 0x03);
        apu_write(0x4000, 0xBF);
        apu_write(0x4002, 0x00);
        apu_write(0x4001, 0x8B);            // up: enabled, period 0, negate, shift 3
        apu_write(0x4003, 0x02);            // period 0x200
        measure(0, 20000, "start, period 0x200:");
        run_cycles(20000);
        measure(0, 20000, "half frames later:");
        apu_write(0x4004, 0xBF);
        apu_write(0x4006, 0x00);
        apu_write(0x4005, 0x83);            // down: shift 3
        apu_write(0x4007, 0x06);            // period 0x600
        measure(1, 60000, "pulse 2, period 0x600:");
        measure(1, 60000, "then, too low to play:");
    }
    if (t == 4) {
        apu_reset();
        apu_write(0x4017, 0x00);            // 4-step, IRQ on
        long at = -1;
        for (long i = 1; i < 40000 && at < 0; i++) { apu_tick(); if (apu_irq()) at = i; }
        printf("frame IRQ after %ld cycles\n", at);
        printf("status %02X", apu_read_status());
        printf(", read again %02X, IRQ %d\n", apu_read_status(), apu_irq());
        apu_write(0x4017, 0x40);
        run_cycles(40000);
        printf("inhibited: IRQ %d\n", apu_irq());
        apu_write(0x4017, 0x80);            // 5-step: no IRQ
        run_cycles(80000);
        printf("5-step: IRQ %d\n", apu_irq());
    }
    if (t == 5) {
        apu_write(0x4015, 0x01);
        apu_write(0x4000, 0x9F);
        apu_write(0x4003, 0x18);            // length 2
        apu_write(0x4017, 0x80);            // 5-step: a half frame at once
        printf("after one 4017 write: status %02X", apu_read_status());
        apu_write(0x4017, 0x80);
        printf(", after two: %02X\n", apu_read_status());
    }
    return 0;
}
