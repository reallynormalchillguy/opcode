#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "apu.h"
#include "common.inc"
#include "apu.inc"

// A cartridge whose C000 holds the given DMC bytes.
static void sample_rom(const uint8_t *bytes, int n) {
    long size = make_rom(1, 1, 0x00, 0);
    memcpy(rom_file + 16, bytes, (size_t)n);             // 16 KB PRG appears at C000 too
    cart_load(rom_file, size);
    bus_reset();
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    apu_reset();
    apu_write(0x4017, 0x40);
    if (t == 1) {
        apu_write(0x4011, 0x55);
        printf("4011 = 55: level %d", apu_channel(4));
        apu_write(0x4011, 0x80);
        printf(", 4011 = 80: level %d\n", apu_channel(4));
    }
    if (t == 2) {
        static const uint8_t S[] = { 0xFF, 0x0F, 0x00, 0xAA };
        sample_rom(S, 4);
        apu_write(0x4010, 0x0F);            // 54 cycles a bit
        apu_write(0x4011, 0x40);
        apu_write(0x4012, 0x00);            // C000
        apu_write(0x4013, 0x01);            // 16 x 1 + 1 = 17 bytes
        apu_write(0x4015, 0x10);
        printf("levels, one per bit:");
        for (int b = 0; b < 40; b++) { run_cycles(54); printf(" %d", apu_channel(4)); }
        printf("\n");
        printf("status while playing: %02X\n", apu_read_status());
    }
    if (t == 3) {
        static const uint8_t S[] = { 0xFF };
        sample_rom(S, 1);
        apu_write(0x4010, 0x8F);            // IRQ at the end
        apu_write(0x4013, 0x00);            // 1 byte
        apu_write(0x4015, 0x10);
        long at = -1;
        for (long i = 1; i < 2000 && at < 0; i++) { apu_tick(); if (apu_irq()) at = i; }
        printf("1-byte sample: IRQ after %ld cycles, status %02X\n", at, apu_read_status());
        apu_write(0x4015, 0x00);
        printf("after a 4015 write: IRQ %d, status %02X\n", apu_irq(), apu_read_status());
        apu_write(0x4010, 0x4F);            // looping, no IRQ
        apu_write(0x4015, 0x10);
        run_cycles(20000);
        printf("looping: status %02X, IRQ %d\n", apu_read_status(), apu_irq());
        apu_write(0x4015, 0x00);
        printf("stopped: status %02X\n", apu_read_status());
    }
    if (t == 4) {
        long size = 0;
        uint8_t *data = read_file("opcode-sound.nes", &size);
        if (!data) { printf("opcode-sound.nes is missing\n"); return 0; }
        cart_load(data, size);
        free(data);
        bus_reset();
        ppu_reset();
        apu_reset();
        Cpu cpu;
        cpu_reset(&cpu);
        int peak[5] = { 0 }, low4 = 127, frame = 0;
        long busy[5] = { 0 };
        for (frame = 0; frame < 1330; frame++) {
            for (long cycles = 0; cycles < 200000; ) {
                int c = cpu_step(&cpu);
                c += bus_take_stall();
                cycles += c;
                for (int i = 0; i < 3 * c; i++) ppu_tick();
                for (int i = 0; i < c; i++) {
                    apu_tick();
                    for (int ch = 0; ch < 5; ch++) {
                        int v = apu_channel(ch);
                        if (v > peak[ch]) peak[ch] = v;
                        if (ch == 4 && v < low4) low4 = v;
                    }
                }
                if (ppu_take_nmi()) cpu_nmi(&cpu);
                if (ppu_take_frame()) break;
            }
            for (int ch = 0; ch < 4; ch++) busy[ch] += apu_channel(ch) != 0;
        }
        printf("opcode-sound.nes, the whole song: highest values %d %d %d %d, DMC from %d to %d\n",
               peak[0], peak[1], peak[2], peak[3], low4, peak[4]);
        printf("frames with each channel sounding at the frame's end: %ld %ld %ld %ld\n", busy[0], busy[1], busy[2], busy[3]);
    }
    return 0;
}
