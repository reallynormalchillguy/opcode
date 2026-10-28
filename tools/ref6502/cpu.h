#pragma once
#include <cstdint>
#include "bus.h"

// The status register P, bit by bit.
constexpr std::uint8_t kFlagC = 0x01;  // carry
constexpr std::uint8_t kFlagZ = 0x02;  // zero
constexpr std::uint8_t kFlagI = 0x04;  // interrupt disable
constexpr std::uint8_t kFlagD = 0x08;  // decimal (stored, but the NES ignores it)
constexpr std::uint8_t kFlagB = 0x10;  // break (only exists in copies of P pushed to the stack)
constexpr std::uint8_t kFlagU = 0x20;  // unused, always 1
constexpr std::uint8_t kFlagV = 0x40;  // overflow
constexpr std::uint8_t kFlagN = 0x80;  // negative

// The 6502. It reaches everything else through the bus it is given.
class Cpu {
public:
    explicit Cpu(Bus& bus) : bus_(bus) {}

    // Power on: registers to their start values, PC from the reset vector.
    void reset();

    // Run one instruction. Returns how many cycles it took.
    int step();

    // Interrupt the CPU with an NMI (the PPU does this every frame).
    void nmi();

    // Interrupt the CPU with an IRQ, unless the I flag is set.
    // Returns true if the CPU took it.
    bool irq();

    // The registers. They are public so the test bench, the trace and
    // nestest can read them (and set PC).
    std::uint8_t a = 0;         // accumulator
    std::uint8_t x = 0;         // index register X
    std::uint8_t y = 0;         // index register Y
    std::uint8_t sp = 0;        // stack pointer: the stack lives at 0x0100 + sp
    std::uint8_t p = 0;         // status flags
    std::uint16_t pc = 0;       // program counter: address of the next instruction
    std::uint64_t cycles = 0;   // CPU cycles since power-on

private:
    Bus& bus_;

    // Every helper the CPU lessons use. You write them one lesson at a
    // time; a declaration nobody calls yet costs nothing. This file is
    // yours: add your own helpers here if you want them.

    // Flags
    void set_flag(std::uint8_t flag, bool on);
    bool get_flag(std::uint8_t flag) const;
    void set_zn(std::uint8_t value);          // Z and N from a result

    // Reading the program
    std::uint8_t fetch();                     // the byte at PC, then PC + 1
    std::uint16_t fetch16();                  // two bytes at PC, low first

    // The stack: page 1, growing down
    void push(std::uint8_t value);
    std::uint8_t pull();
    void push16(std::uint16_t value);
    std::uint16_t pull16();

    // Addressing modes: each returns the address of the operand
    std::uint16_t addr_imm();
    std::uint16_t addr_zp();
    std::uint16_t addr_zpx();
    std::uint16_t addr_zpy();
    std::uint16_t addr_abs();
    std::uint16_t addr_abx();
    std::uint16_t addr_aby();
    std::uint16_t addr_izx();
    std::uint16_t addr_izy();
    std::uint16_t addr_ind_jmp();
    std::uint16_t read_zp_pointer(std::uint8_t zp);
    bool page_crossed_ = false;               // set by the indexed modes

    // Loads and stores
    void lda(std::uint16_t addr);
    void ldx(std::uint16_t addr);
    void ldy(std::uint16_t addr);
    void sta(std::uint16_t addr);
    void stx(std::uint16_t addr);
    void sty(std::uint16_t addr);

    // Branches: returns the cycles taken
    int branch(bool condition);

    // Logic and comparisons
    void and_(std::uint16_t addr);            // "and" is a reserved word in C++
    void ora(std::uint16_t addr);
    void eor(std::uint16_t addr);
    void bit(std::uint16_t addr);
    void compare(std::uint8_t reg, std::uint16_t addr);

    // Arithmetic
    void add(std::uint8_t m);
    void adc(std::uint16_t addr);
    void sbc(std::uint16_t addr);

    // Shifts, rotates, increments: value in, value out
    std::uint8_t asl(std::uint8_t v);
    std::uint8_t lsr(std::uint8_t v);
    std::uint8_t rol(std::uint8_t v);
    std::uint8_t ror(std::uint8_t v);
    std::uint8_t inc(std::uint8_t v);
    std::uint8_t dec(std::uint8_t v);

    // Read-modify-write: read the byte at addr, pass it through one of the
    // six functions above, write the result back.
    using Change = std::uint8_t (Cpu::*)(std::uint8_t);
    void modify(std::uint16_t addr, Change change);
};
