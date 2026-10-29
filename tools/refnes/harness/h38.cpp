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
#include "cpu.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Controllers controllers;
Apu apu;
Bus bus(cart, ppu, controllers, apu);
Cpu cpu(bus);

#include "apu.inc"

// A cartridge whose C000 holds the given DMC bytes.
static void sample_rom(const std::vector<std::uint8_t>& bytes) {
    auto rom = make_rom(1, 1, 0x00, 0);
    std::copy(bytes.begin(), bytes.end(), rom.begin() + 16);   // 16 KB PRG appears at C000 too
    cart.load(rom);
    bus.reset();
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    apu.reset();
    apu.connect(&bus);
    apu.write(0x4017, 0x40);
    if (t == 1) {
        apu.write(0x4011, 0x55);
        std::printf("4011 = 55: level %d", apu.channel(4));
        apu.write(0x4011, 0x80);
        std::printf(", 4011 = 80: level %d\n", apu.channel(4));
    }
    if (t == 2) {
        sample_rom({0xFF, 0x0F, 0x00, 0xAA});
        apu.write(0x4010, 0x0F);            // 54 cycles a bit
        apu.write(0x4011, 0x40);
        apu.write(0x4012, 0x00);            // C000
        apu.write(0x4013, 0x01);            // 16 x 1 + 1 = 17 bytes
        apu.write(0x4015, 0x10);
        std::printf("levels, one per bit:");
        for (int b = 0; b < 40; b++) { run_cycles(54); std::printf(" %d", apu.channel(4)); }
        std::printf("\n");
        std::printf("status while playing: %02X\n", apu.read_status());
    }
    if (t == 3) {
        sample_rom({0xFF});
        apu.write(0x4010, 0x8F);            // IRQ at the end
        apu.write(0x4013, 0x00);            // 1 byte
        apu.write(0x4015, 0x10);
        long at = -1;
        for (long i = 1; i < 2000 && at < 0; i++) { apu.tick(); if (apu.irq()) at = i; }
        std::printf("1-byte sample: IRQ after %ld cycles, status %02X\n", at, apu.read_status());
        apu.write(0x4015, 0x00);
        bool irq = apu.irq();
        std::printf("after a 4015 write: IRQ %d, status %02X\n", irq ? 1 : 0, apu.read_status());
        apu.write(0x4010, 0x4F);            // looping, no IRQ
        apu.write(0x4015, 0x10);
        run_cycles(20000);
        std::uint8_t status = apu.read_status();
        std::printf("looping: status %02X, IRQ %d\n", status, apu.irq() ? 1 : 0);
        apu.write(0x4015, 0x00);
        std::printf("stopped: status %02X\n", apu.read_status());
    }
    if (t == 4) {
        std::vector<std::uint8_t> data = read_file("opcode-sound.nes");
        if (data.empty()) { std::printf("opcode-sound.nes is missing\n"); return 0; }
        cart.load(data);
        bus.reset();
        ppu.reset();
        apu.reset();
        cpu.reset();
        int peak[5] = {0}, low4 = 127;
        long busy[5] = {0};
        for (int frame = 0; frame < 1330; frame++) {
            for (long cycles = 0; cycles < 200000; ) {
                int c = cpu.step();
                c += bus.take_stall();
                cycles += c;
                for (int i = 0; i < 3 * c; i++) ppu.tick();
                for (int i = 0; i < c; i++) {
                    apu.tick();
                    for (int ch = 0; ch < 5; ch++) {
                        int v = apu.channel(ch);
                        if (v > peak[ch]) peak[ch] = v;
                        if (ch == 4 && v < low4) low4 = v;
                    }
                }
                if (ppu.take_nmi()) cpu.nmi();
                if (ppu.take_frame()) break;
            }
            for (int ch = 0; ch < 4; ch++) busy[ch] += apu.channel(ch) != 0;
        }
        std::printf("opcode-sound.nes, the whole song: highest values %d %d %d %d, DMC from %d to %d\n",
                    peak[0], peak[1], peak[2], peak[3], low4, peak[4]);
        std::printf("frames with each channel sounding at the frame's end: %ld %ld %ld %ld\n", busy[0], busy[1], busy[2], busy[3]);
    }
}
