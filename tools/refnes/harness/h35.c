#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "ppu.h"
#include "apu.h"
#include "common.inc"
#include "apu.inc"

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    apu_reset();
    if (t == 1) {
        apu_write(0x4015, 0x01);
        apu_write(0x4000, 0xBF);            // 50%, volume 15
        apu_write(0x4002, 0xFD);
        apu_write(0x4003, 0x08);            // period 253: 440 Hz
        measure(0, 40000, "period 253, 50%:");
        apu_write(0x4000, 0xB6);            // volume 6
        apu_write(0x4002, 0x7E);            // period 126: an octave up
        measure(0, 40000, "period 126, volume 6:");
        printf("the CPU runs 1789773 cycles a second: %ld Hz\n", 1789773L / ((126 + 1) * 16));
    }
    if (t == 2) {
        apu_write(0x4015, 0x01);
        for (int duty = 0; duty < 4; duty++) {
            apu_write(0x4000, (uint8_t)(duty << 6 | 0x3F));
            apu_write(0x4002, 99);
            apu_write(0x4003, 0x08);        // restarts the waveform
            printf("duty %d:", duty);
            for (int step = 0; step < 16; step++) {
                printf("%s", apu_channel(0) ? "#" : ".");
                run_cycles(200);            // (99 + 1) x 2 cycles a step
            }
            printf("\n");
        }
    }
    if (t == 3) {
        apu_write(0x4000, 0xBF);
        apu_write(0x4002, 0xFD);
        apu_write(0x4003, 0x08);            // not enabled yet: the length is not loaded
        int out = apu_channel(0);
        run_cycles(300);
        out += apu_channel(0);
        printf("before 4015: status %02X, output %d\n", apu_read_status(), out);
        apu_write(0x4015, 0x03);
        apu_write(0x4003, 0x08);
        apu_write(0x4007, 0x08);
        printf("enabled and loaded: status %02X\n", apu_read_status());
        apu_write(0x4015, 0x02);
        printf("pulse 1 switched off: status %02X\n", apu_read_status());
        measure(0, 5000, "pulse 1 after that:");
    }
    if (t == 4) {
        apu_write(0x4015, 0x01);
        apu_write(0x4000, 0xBF);
        apu_write(0x4002, 0x07);
        apu_write(0x4003, 0x08);
        measure(0, 5000, "period 7 (too high):");
        apu_write(0x4002, 0x08);
        measure(0, 5000, "period 8:");
    }
    if (t == 5) {
        cart_load(rom_file, make_rom(1, 1, 0x00, 0));
        bus_reset();
        bus_write(0x4015, 0x02);
        bus_write(0x4004, 0x7A);            // 25%, volume 10
        bus_write(0x4006, 0x40);
        bus_write(0x4007, 0x09);            // period 0x140
        printf("through the bus: status %02X\n", bus_read(0x4015));
        measure(1, 40000, "pulse 2, period 0x140, 25%:");
        measure(0, 2000, "pulse 1 stays quiet:");
    }
    return 0;
}
