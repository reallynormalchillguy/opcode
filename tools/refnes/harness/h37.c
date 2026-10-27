#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "apu.h"
#include "apu.inc"

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    apu_reset();
    apu_write(0x4017, 0x40);
    if (t == 1) {
        apu_write(0x4015, 0x04);
        apu_write(0x4008, 0xFF);            // control on, linear counter 127
        apu_write(0x400A, 0x7E);
        apu_write(0x400B, 0x08);            // period 126: 440 Hz
        run_cycles(8000);                   // the linear counter loads at a quarter frame
        printf("triangle steps:");
        for (int i = 0; i < 34; i++) { printf(" %d", apu_channel(2)); run_cycles(127); }
        printf("\n");
        measure(2, 20000, "triangle, period 126:");
    }
    if (t == 2) {
        apu_write(0x4015, 0x04);
        apu_write(0x4008, 0x05);            // control off, linear counter 5
        apu_write(0x400A, 0x40);
        apu_write(0x400B, 0x08);
        long last = 0;
        int prev = apu_channel(2);
        for (long i = 1; i < 120000; i++) {
            apu_tick();
            if (apu_channel(2) != prev) last = i;
            prev = apu_channel(2);
        }
        printf("linear counter 5: the triangle stops after %ld cycles, at %d\n", last, apu_channel(2));
        printf("status %02X\n", apu_read_status());
        apu_write(0x400A, 0x01);            // period 1: too high to hear
        apu_write(0x400B, 0x08);
        printf("period 1: %d\n", apu_channel(2));
    }
    if (t == 3) {
        apu_write(0x4015, 0x08);
        apu_write(0x400C, 0x3A);            // halted, constant volume 10
        apu_write(0x400E, 0x00);            // fastest: a step every 4 cycles
        apu_write(0x400F, 0x08);
        printf("noise, mode 0:");
        for (int i = 0; i < 40; i++) { printf("%c", apu_channel(3) ? '#' : '.'); run_cycles(4); }
        printf("\n");
        apu_write(0x400E, 0x80);
        printf("noise, mode 1:");
        for (int i = 0; i < 40; i++) { printf("%c", apu_channel(3) ? '#' : '.'); run_cycles(4); }
        printf("\n");
        apu_write(0x400E, 0x0A);            // period index 10: 380 cycles
        long changes = 0;
        int prev = apu_channel(3);
        for (long i = 0; i < 38000; i++) { apu_tick(); if (apu_channel(3) != prev) changes++; prev = apu_channel(3); }
        printf("index 10, 38000 cycles: %ld changes\n", changes);
    }
    if (t == 4) {
        apu_write(0x4015, 0x0C);
        apu_write(0x4008, 0x81);
        apu_write(0x400B, 0x08);
        apu_write(0x400C, 0x10);            // envelope, period 0, length running
        apu_write(0x400F, 0x18);            // length 2
        printf("status %02X", apu_read_status());
        run_cycles(30000);
        printf(", a frame later %02X", apu_read_status());
        apu_write(0x4015, 0x00);
        printf(", all off %02X\n", apu_read_status());
        apu_write(0x4015, 0x08);
        apu_write(0x400C, 0x00);            // decaying envelope
        apu_write(0x400F, 0x08);
        printf("noise envelope:");
        for (int q = 0; q < 17; q++) {
            int peak = 0;
            for (long i = 0; i < 7457; i++) { apu_tick(); if (apu_channel(3) > peak) peak = apu_channel(3); }
            printf(" %d", peak);
        }
        printf("\n");
    }
    return 0;
}
