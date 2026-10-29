#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Controllers controllers;
Bus bus(cart, ppu, controllers);
Cpu cpu(bus);

// A 32 KB NROM program: 8000 CLI, then a loop; the IRQ code at 8100 counts
// in 0010 and returns; the NMI code at 8200 counts in 0011.
static void program() {
    auto rom = make_rom(2, 1, 0x00, 0);
    std::uint8_t* prg = rom.data() + 16;
    const std::uint8_t main_code[] = {0x58, 0xEA, 0x4C, 0x01, 0x80};     // CLI; NOP; JMP 8001
    const std::uint8_t irq_code[] = {0xE6, 0x10, 0x40};                  // INC 10; RTI
    const std::uint8_t nmi_code[] = {0xE6, 0x11, 0x40};                  // INC 11; RTI
    std::memcpy(prg, main_code, sizeof main_code);
    std::memcpy(prg + 0x100, irq_code, sizeof irq_code);
    std::memcpy(prg + 0x200, nmi_code, sizeof nmi_code);
    prg[0x7FFA] = 0x00; prg[0x7FFB] = 0x82;                              // NMI vector
    prg[0x7FFC] = 0x00; prg[0x7FFD] = 0x80;                              // reset vector
    prg[0x7FFE] = 0x00; prg[0x7FFF] = 0x81;                              // IRQ vector
    cart.load(rom);
    bus.reset();
    ppu.reset();
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    program();
    cpu.reset();
    if (t == 1) {
        bool first = cpu.irq();
        std::printf("after reset, I is set: irq() returns %d, PC %04X\n", first ? 1 : 0, cpu.pc);
        cpu.step();                                                      // CLI
        std::uint64_t before = cpu.cycles;
        std::uint8_t sp = cpu.sp;
        bool taken = cpu.irq();
        std::printf("after CLI: irq() returns %d, PC %04X, SP %02X -> %02X, %d cycles, I %s\n", taken ? 1 : 0, cpu.pc, sp, cpu.sp,
                    static_cast<int>(cpu.cycles - before), (cpu.p & kFlagI) ? "set" : "clear");
        std::printf("pushed: PC %02X", bus.read(0x01FD));
        std::printf("%02X", bus.read(0x01FC));
        std::printf(", P %02X\n", bus.read(0x01FB));
    }
    if (t == 2) {
        cpu.step();
        cpu.irq();
        std::printf("a second IRQ inside the first: %d\n", cpu.irq() ? 1 : 0);
        cpu.step();                                                      // INC 10
        cpu.step();                                                      // RTI
        std::printf("after RTI: PC %04X, I %s, count %d\n", cpu.pc, (cpu.p & kFlagI) ? "set" : "clear", bus.read(0x0010));
        std::printf("and again: %d\n", cpu.irq() ? 1 : 0);
    }
    if (t == 3) {
        cpu.nmi();
        std::printf("NMI with I set still goes: PC %04X\n", cpu.pc);
    }
    if (t == 4) {
        std::vector<std::uint8_t> data = read_file("opcode-mmc3.nes");
        if (data.empty()) { std::printf("opcode-mmc3.nes is missing\n"); return 0; }
        std::printf("load %s\n", result_name(cart.load(data)));
        bus.reset();
        ppu.reset();
        cpu.reset();
        std::vector<std::uint32_t> first;
        int irqs = 0;
        for (int f = 1; f <= 40; f++) {
            for (long cycles = 0; cycles < 200000; ) {
                int c = cpu.step();
                c += bus.take_stall();
                cycles += c;
                for (int i = 0; i < 3 * c; i++) ppu.tick();
                if (ppu.take_nmi()) cpu.nmi();
                if (cart.irq()) irqs += cpu.irq() ? 1 : 0;
                if (ppu.take_frame()) break;
            }
            if (f == 39) first.assign(ppu.pixels(), ppu.pixels() + 256 * 240);
        }
        int top = -1;
        const std::uint32_t* px = ppu.pixels();
        for (int y = 0; y < 240 && top < 0; y++)
            if (std::memcmp(first.data() + y * 256, px + y * 256, 256 * 4) != 0) top = y;
        std::printf("opcode-mmc3.nes: %d IRQs in 40 frames; frames 39 and 40 first differ on scanline %d\n", irqs, top);
    }
}
