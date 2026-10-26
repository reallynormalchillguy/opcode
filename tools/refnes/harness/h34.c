#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "palette.h"
#include "common.inc"

// A 32 KB NROM program: 8000 CLI, then a loop; the IRQ code at 8100 counts
// in 0010 and returns; the NMI code at 8200 counts in 0011.
static void program(void) {
    long size = make_rom(2, 1, 0x00, 0);
    uint8_t *prg = rom_file + 16;
    static const uint8_t MAIN[] = { 0x58, 0xEA, 0x4C, 0x01, 0x80 };          // CLI; NOP; JMP 8001
    static const uint8_t IRQ[] = { 0xE6, 0x10, 0x40 };                      // INC 10; RTI
    static const uint8_t NMI[] = { 0xE6, 0x11, 0x40 };                      // INC 11; RTI
    memcpy(prg, MAIN, sizeof MAIN);
    memcpy(prg + 0x100, IRQ, sizeof IRQ);
    memcpy(prg + 0x200, NMI, sizeof NMI);
    prg[0x7FFA] = 0x00; prg[0x7FFB] = 0x82;                                 // NMI vector
    prg[0x7FFC] = 0x00; prg[0x7FFD] = 0x80;                                 // reset vector
    prg[0x7FFE] = 0x00; prg[0x7FFF] = 0x81;                                 // IRQ vector
    cart_load(rom_file, size);
    bus_reset();
    ppu_reset();
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    program();
    Cpu cpu;
    cpu_reset(&cpu);
    if (t == 1) {
        printf("after reset, I is set: cpu_irq returns %d, PC %04X\n", cpu_irq(&cpu), cpu.pc);
        cpu_step(&cpu);                                                     // CLI
        uint64_t before = cpu.cycles;
        uint8_t sp = cpu.sp;
        int taken = cpu_irq(&cpu);
        printf("after CLI: cpu_irq returns %d, PC %04X, SP %02X -> %02X, %d cycles, I %s\n", taken, cpu.pc, sp, cpu.sp,
               (int)(cpu.cycles - before), (cpu.p & FLAG_I) ? "set" : "clear");
        printf("pushed: PC %02X%02X, P %02X\n", bus_read(0x01FD), bus_read(0x01FC), bus_read(0x01FB));
    }
    if (t == 2) {
        cpu_step(&cpu);
        cpu_irq(&cpu);
        printf("a second IRQ inside the first: %d\n", cpu_irq(&cpu));
        cpu_step(&cpu);                                                     // INC 10
        cpu_step(&cpu);                                                     // RTI
        printf("after RTI: PC %04X, I %s, count %d\n", cpu.pc, (cpu.p & FLAG_I) ? "set" : "clear", bus_read(0x0010));
        printf("and again: %d\n", cpu_irq(&cpu));
    }
    if (t == 3) {
        cpu_nmi(&cpu);
        printf("NMI with I set still goes: PC %04X\n", cpu.pc);
    }
    if (t == 4) {
        long size = 0;
        uint8_t *data = read_file("opcode-mmc3.nes", &size);
        if (!data) { printf("opcode-mmc3.nes is missing\n"); return 0; }
        printf("load %d\n", cart_load(data, size));
        free(data);
        bus_reset();
        ppu_reset();
        cpu_reset(&cpu);
        static uint32_t first[256 * 240];
        int irqs = 0;
        for (int f = 1; f <= 40; f++) {
            for (long cycles = 0; cycles < 200000; ) {
                int c = cpu_step(&cpu);
                c += bus_take_stall();
                cycles += c;
                for (int i = 0; i < 3 * c; i++) ppu_tick();
                if (ppu_take_nmi()) cpu_nmi(&cpu);
                if (cart_irq()) irqs += cpu_irq(&cpu);
                if (ppu_take_frame()) break;
            }
            if (f == 39) memcpy(first, ppu_pixels(), sizeof first);
        }
        int top = -1;
        const uint32_t *px = ppu_pixels();
        for (int y = 0; y < 240 && top < 0; y++)
            if (memcmp(first + y * 256, px + y * 256, 256 * 4) != 0) top = y;
        printf("opcode-mmc3.nes: %d IRQs in 40 frames; frames 39 and 40 first differ on scanline %d\n", irqs, top);
    }
    return 0;
}
