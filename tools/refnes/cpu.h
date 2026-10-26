#ifndef CPU_H
#define CPU_H

#include <stdint.h>

// The status register P, bit by bit.
#define FLAG_C 0x01  // carry
#define FLAG_Z 0x02  // zero
#define FLAG_I 0x04  // interrupt disable
#define FLAG_D 0x08  // decimal (stored, but the NES ignores it)
#define FLAG_B 0x10  // break (only exists in copies of P pushed to the stack)
#define FLAG_U 0x20  // unused, always 1
#define FLAG_V 0x40  // overflow
#define FLAG_N 0x80  // negative

typedef struct {
    uint8_t a;        // accumulator
    uint8_t x;        // index register X
    uint8_t y;        // index register Y
    uint8_t sp;       // stack pointer: the stack lives at 0x0100 + sp
    uint8_t p;        // status flags
    uint16_t pc;      // program counter: address of the next instruction
    uint64_t cycles;  // CPU cycles since power-on
} Cpu;

// Power on: registers to their start values, PC from the reset vector.
void cpu_reset(Cpu *cpu);

// Run one instruction. Returns how many cycles it took.
int cpu_step(Cpu *cpu);

// Interrupt the CPU with an NMI (the PPU does this every frame).
void cpu_nmi(Cpu *cpu);
//@ 34

// Interrupt the CPU with an IRQ, unless the I flag is set. Returns 1 if the
// CPU took it.
int cpu_irq(Cpu *cpu);
//@ end

#endif
