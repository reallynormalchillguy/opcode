#include "cpu.h"
#include "bus.h"
//@ 2

// ---------- Flags ----------

static void set_flag(Cpu *cpu, uint8_t flag, int on) {
    if (on) {
        cpu->p |= flag;
    } else {
        cpu->p &= (uint8_t)~flag;
    }
}

static int get_flag(const Cpu *cpu, uint8_t flag) {
    return (cpu->p & flag) != 0;
}

// Z and N follow almost every result: Z if it is zero, N if bit 7 is set.
static void set_zn(Cpu *cpu, uint8_t value) {
    set_flag(cpu, FLAG_Z, value == 0);
    set_flag(cpu, FLAG_N, value & 0x80);
}
//@ end

// ---------- Reading the program ----------

// The byte at PC, then move PC past it.
static uint8_t fetch(Cpu *cpu) {
    return bus_read(cpu->pc++);
}

// Two bytes at PC, low byte first.
static uint16_t fetch16(Cpu *cpu) {
    uint16_t lo = fetch(cpu);
    uint16_t hi = fetch(cpu);
    return (uint16_t)(hi << 8 | lo);
}
//@ 3

// ---------- The stack: page 1, growing down ----------

static void push(Cpu *cpu, uint8_t value) {
    bus_write(0x0100 | cpu->sp, value);
    cpu->sp--;
}

static uint8_t pull(Cpu *cpu) {
    cpu->sp++;
    return bus_read(0x0100 | cpu->sp);
}
//@ end
//@ 11

static void push16(Cpu *cpu, uint16_t value) {
    push(cpu, value >> 8);
    push(cpu, value & 0xFF);
}

static uint16_t pull16(Cpu *cpu) {
    uint16_t lo = pull(cpu);
    uint16_t hi = pull(cpu);
    return (uint16_t)(hi << 8 | lo);
}
//@ end
//@ 4

// ---------- Addressing modes: each returns the address of the operand ----------

// Immediate: the operand is the next byte of the program itself.
static uint16_t addr_imm(Cpu *cpu) {
    return cpu->pc++;
}

// Zero page: a one-byte address, 0x00 to 0xFF.
static uint16_t addr_zp(Cpu *cpu) {
    return fetch(cpu);
}

// Zero page plus X or Y, wrapping inside the zero page.
static uint16_t addr_zpx(Cpu *cpu) {
    return (uint8_t)(fetch(cpu) + cpu->x);
}

static uint16_t addr_zpy(Cpu *cpu) {
    return (uint8_t)(fetch(cpu) + cpu->y);
}
//@ end
//@ 5

// Set by the indexed modes when adding the index moved into the next page.
static int page_crossed;

static int different_pages(uint16_t a, uint16_t b) {
    return (a & 0xFF00) != (b & 0xFF00);
}

static uint16_t addr_abs(Cpu *cpu) {
    return fetch16(cpu);
}

static uint16_t addr_abx(Cpu *cpu) {
    uint16_t base = fetch16(cpu);
    uint16_t addr = (uint16_t)(base + cpu->x);
    page_crossed = different_pages(base, addr);
    return addr;
}

static uint16_t addr_aby(Cpu *cpu) {
    uint16_t base = fetch16(cpu);
    uint16_t addr = (uint16_t)(base + cpu->y);
    page_crossed = different_pages(base, addr);
    return addr;
}
//@ end
//@ 6

// Read a pointer stored in the zero page. Its high byte wraps to 0x00.
static uint16_t read_zp_pointer(uint8_t zp) {
    uint16_t lo = bus_read(zp);
    uint16_t hi = bus_read((uint8_t)(zp + 1));
    return (uint16_t)(hi << 8 | lo);
}

// (zp,X): add X to the zero page address first, then follow the pointer.
static uint16_t addr_izx(Cpu *cpu) {
    return read_zp_pointer((uint8_t)(fetch(cpu) + cpu->x));
}

// (zp),Y: follow the pointer first, then add Y.
static uint16_t addr_izy(Cpu *cpu) {
    uint16_t base = read_zp_pointer(fetch(cpu));
    uint16_t addr = (uint16_t)(base + cpu->y);
    page_crossed = different_pages(base, addr);
    return addr;
}

// JMP (addr). The 6502 never carries into the high byte when reading the
// pointer, so a pointer at xxFF takes its high byte from xx00.
static uint16_t addr_ind_jmp(Cpu *cpu) {
    uint16_t ptr = fetch16(cpu);
    uint16_t lo = bus_read(ptr);
    uint16_t hi = bus_read((uint16_t)((ptr & 0xFF00) | ((ptr + 1) & 0x00FF)));
    return (uint16_t)(hi << 8 | lo);
}
//@ end
//@ 4

// ---------- Loads and stores ----------

static void lda(Cpu *cpu, uint16_t addr) { cpu->a = bus_read(addr); set_zn(cpu, cpu->a); }
static void ldx(Cpu *cpu, uint16_t addr) { cpu->x = bus_read(addr); set_zn(cpu, cpu->x); }
static void ldy(Cpu *cpu, uint16_t addr) { cpu->y = bus_read(addr); set_zn(cpu, cpu->y); }
static void sta(Cpu *cpu, uint16_t addr) { bus_write(addr, cpu->a); }
static void stx(Cpu *cpu, uint16_t addr) { bus_write(addr, cpu->x); }
static void sty(Cpu *cpu, uint16_t addr) { bus_write(addr, cpu->y); }
//@ end
//@ 7

// ---------- Branches ----------

// Every branch is two bytes: the opcode and a signed offset. Taking the
// branch costs one more cycle, and one more again if it lands in another page.
static int branch(Cpu *cpu, int condition) {
    int8_t offset = (int8_t)fetch(cpu);
    if (!condition) {
        return 2;
    }
    uint16_t target = (uint16_t)(cpu->pc + offset);
    int cycles = different_pages(cpu->pc, target) ? 4 : 3;
    cpu->pc = target;
    return cycles;
}
//@ end
//@ 8

// ---------- Logic and comparisons ----------

static void and_(Cpu *cpu, uint16_t addr) { cpu->a &= bus_read(addr); set_zn(cpu, cpu->a); }
static void ora(Cpu *cpu, uint16_t addr) { cpu->a |= bus_read(addr); set_zn(cpu, cpu->a); }
static void eor(Cpu *cpu, uint16_t addr) { cpu->a ^= bus_read(addr); set_zn(cpu, cpu->a); }

static void bit(Cpu *cpu, uint16_t addr) {
    uint8_t m = bus_read(addr);
    set_flag(cpu, FLAG_Z, (cpu->a & m) == 0);
    set_flag(cpu, FLAG_V, m & 0x40);
    set_flag(cpu, FLAG_N, m & 0x80);
}

// CMP, CPX and CPY: subtract without keeping the result.
static void compare(Cpu *cpu, uint8_t reg, uint16_t addr) {
    uint8_t m = bus_read(addr);
    set_flag(cpu, FLAG_C, reg >= m);
    set_zn(cpu, (uint8_t)(reg - m));
}
//@ end
//@ 9

// ---------- Arithmetic ----------

static void add(Cpu *cpu, uint8_t m) {
    unsigned sum = cpu->a + m + get_flag(cpu, FLAG_C);
    uint8_t result = (uint8_t)sum;
    set_flag(cpu, FLAG_C, sum > 0xFF);
    // Overflow: both inputs had the same sign and the result's sign differs.
    set_flag(cpu, FLAG_V, (~(cpu->a ^ m) & (cpu->a ^ result)) & 0x80);
    cpu->a = result;
    set_zn(cpu, cpu->a);
}

static void adc(Cpu *cpu, uint16_t addr) { add(cpu, bus_read(addr)); }

// A - M - (1 - C) is the same as A + (M with every bit flipped) + C.
static void sbc(Cpu *cpu, uint16_t addr) { add(cpu, (uint8_t)~bus_read(addr)); }
//@ end
//@ 10

// ---------- Shifts, rotates, increments: value in, value out ----------

static uint8_t asl(Cpu *cpu, uint8_t v) {
    set_flag(cpu, FLAG_C, v & 0x80);
    v = (uint8_t)(v << 1);
    set_zn(cpu, v);
    return v;
}

static uint8_t lsr(Cpu *cpu, uint8_t v) {
    set_flag(cpu, FLAG_C, v & 0x01);
    v = v >> 1;
    set_zn(cpu, v);
    return v;
}

static uint8_t rol(Cpu *cpu, uint8_t v) {
    int carry_in = get_flag(cpu, FLAG_C);
    set_flag(cpu, FLAG_C, v & 0x80);
    v = (uint8_t)(v << 1 | carry_in);
    set_zn(cpu, v);
    return v;
}

static uint8_t ror(Cpu *cpu, uint8_t v) {
    int carry_in = get_flag(cpu, FLAG_C);
    set_flag(cpu, FLAG_C, v & 0x01);
    v = (uint8_t)(v >> 1 | carry_in << 7);
    set_zn(cpu, v);
    return v;
}

static uint8_t inc(Cpu *cpu, uint8_t v) { v++; set_zn(cpu, v); return v; }
static uint8_t dec(Cpu *cpu, uint8_t v) { v--; set_zn(cpu, v); return v; }

// Read-modify-write on memory: read the byte, change it, write it back.
static void modify(Cpu *cpu, uint16_t addr, uint8_t (*op)(Cpu *, uint8_t)) {
    bus_write(addr, op(cpu, bus_read(addr)));
}
//@ end

// ---------- Power on ----------

void cpu_reset(Cpu *cpu) {
    cpu->a = 0;
    cpu->x = 0;
    cpu->y = 0;
    cpu->sp = 0xFD;
    cpu->p = FLAG_I | FLAG_U;
    cpu->pc = bus_read16(0xFFFC);
    cpu->cycles = 7;
}
//@ 11

// ---------- Interrupts ----------

void cpu_nmi(Cpu *cpu) {
    push16(cpu, cpu->pc);
    push(cpu, (uint8_t)((cpu->p & ~FLAG_B) | FLAG_U));
    cpu->p |= FLAG_I;
    cpu->pc = bus_read16(0xFFFA);
    cpu->cycles += 7;
}
//@ end

// ---------- One instruction ----------

int cpu_step(Cpu *cpu) {
    uint8_t opcode = fetch(cpu);
    int cycles = 2;
//@ 5
    page_crossed = 0;
//@ end

    switch (opcode) {
    // No operation
    case 0xEA: cycles = 2; break;

//@ 1-4
    // JMP absolute
    case 0x4C: cpu->pc = fetch16(cpu); cycles = 3; break;
//@ end
//@ 2-3
    // Loads with an immediate operand
    case 0xA9: cpu->a = fetch(cpu); set_zn(cpu, cpu->a); cycles = 2; break;
    case 0xA2: cpu->x = fetch(cpu); set_zn(cpu, cpu->x); cycles = 2; break;
    case 0xA0: cpu->y = fetch(cpu); set_zn(cpu, cpu->y); cycles = 2; break;
//@ end
//@ 2

    // Transfers between registers
    case 0xAA: cpu->x = cpu->a; set_zn(cpu, cpu->x); cycles = 2; break;  // TAX
    case 0xA8: cpu->y = cpu->a; set_zn(cpu, cpu->y); cycles = 2; break;  // TAY
    case 0x8A: cpu->a = cpu->x; set_zn(cpu, cpu->a); cycles = 2; break;  // TXA
    case 0x98: cpu->a = cpu->y; set_zn(cpu, cpu->a); cycles = 2; break;  // TYA

    // Increment and decrement X and Y
    case 0xE8: cpu->x++; set_zn(cpu, cpu->x); cycles = 2; break;  // INX
    case 0xC8: cpu->y++; set_zn(cpu, cpu->y); cycles = 2; break;  // INY
    case 0xCA: cpu->x--; set_zn(cpu, cpu->x); cycles = 2; break;  // DEX
    case 0x88: cpu->y--; set_zn(cpu, cpu->y); cycles = 2; break;  // DEY

    // Set and clear flags
    case 0x18: set_flag(cpu, FLAG_C, 0); cycles = 2; break;  // CLC
    case 0x38: set_flag(cpu, FLAG_C, 1); cycles = 2; break;  // SEC
    case 0x58: set_flag(cpu, FLAG_I, 0); cycles = 2; break;  // CLI
    case 0x78: set_flag(cpu, FLAG_I, 1); cycles = 2; break;  // SEI
    case 0xD8: set_flag(cpu, FLAG_D, 0); cycles = 2; break;  // CLD
    case 0xF8: set_flag(cpu, FLAG_D, 1); cycles = 2; break;  // SED
    case 0xB8: set_flag(cpu, FLAG_V, 0); cycles = 2; break;  // CLV
//@ end
//@ 3

    // The stack
    case 0x48: push(cpu, cpu->a); cycles = 3; break;                              // PHA
    case 0x08: push(cpu, cpu->p | FLAG_B | FLAG_U); cycles = 3; break;            // PHP
    case 0x68: cpu->a = pull(cpu); set_zn(cpu, cpu->a); cycles = 4; break;        // PLA
    case 0x28: cpu->p = (pull(cpu) & (uint8_t)~FLAG_B) | FLAG_U; cycles = 4; break; // PLP
    case 0xBA: cpu->x = cpu->sp; set_zn(cpu, cpu->x); cycles = 2; break;          // TSX
    case 0x9A: cpu->sp = cpu->x; cycles = 2; break;                               // TXS
//@ end
//@ 4

    // LDA, LDX, LDY
    case 0xA9: lda(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0xA5: lda(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0xB5: lda(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0xA2: ldx(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0xA6: ldx(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0xB6: ldx(cpu, addr_zpy(cpu)); cycles = 4; break;
    case 0xA0: ldy(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0xA4: ldy(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0xB4: ldy(cpu, addr_zpx(cpu)); cycles = 4; break;
//@ end
//@ 5
    case 0xAD: lda(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0xBD: lda(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0xB9: lda(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0xAE: ldx(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0xBE: ldx(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0xAC: ldy(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0xBC: ldy(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
//@ end
//@ 6
    case 0xA1: lda(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0xB1: lda(cpu, addr_izy(cpu)); cycles = 5 + page_crossed; break;
//@ end
//@ 4

    // STA, STX, STY (stores never take the extra page-crossing cycle)
    case 0x85: sta(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x95: sta(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0x86: stx(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x96: stx(cpu, addr_zpy(cpu)); cycles = 4; break;
    case 0x84: sty(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x94: sty(cpu, addr_zpx(cpu)); cycles = 4; break;
//@ end
//@ 5
    case 0x8D: sta(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0x9D: sta(cpu, addr_abx(cpu)); cycles = 5; break;
    case 0x99: sta(cpu, addr_aby(cpu)); cycles = 5; break;
    case 0x8E: stx(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0x8C: sty(cpu, addr_abs(cpu)); cycles = 4; break;
//@ end
//@ 6
    case 0x81: sta(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0x91: sta(cpu, addr_izy(cpu)); cycles = 6; break;
//@ end
//@ 5

    // Jumps
    case 0x4C: cpu->pc = addr_abs(cpu); cycles = 3; break;
//@ end
//@ 6
    case 0x6C: cpu->pc = addr_ind_jmp(cpu); cycles = 5; break;
//@ end
//@ 7

    // Branches
    case 0x10: cycles = branch(cpu, !get_flag(cpu, FLAG_N)); break;  // BPL
    case 0x30: cycles = branch(cpu, get_flag(cpu, FLAG_N)); break;   // BMI
    case 0x50: cycles = branch(cpu, !get_flag(cpu, FLAG_V)); break;  // BVC
    case 0x70: cycles = branch(cpu, get_flag(cpu, FLAG_V)); break;   // BVS
    case 0x90: cycles = branch(cpu, !get_flag(cpu, FLAG_C)); break;  // BCC
    case 0xB0: cycles = branch(cpu, get_flag(cpu, FLAG_C)); break;   // BCS
    case 0xD0: cycles = branch(cpu, !get_flag(cpu, FLAG_Z)); break;  // BNE
    case 0xF0: cycles = branch(cpu, get_flag(cpu, FLAG_Z)); break;   // BEQ
//@ end
//@ 8

    // AND
    case 0x29: and_(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0x25: and_(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x35: and_(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0x2D: and_(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0x3D: and_(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0x39: and_(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0x21: and_(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0x31: and_(cpu, addr_izy(cpu)); cycles = 5 + page_crossed; break;

    // ORA
    case 0x09: ora(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0x05: ora(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x15: ora(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0x0D: ora(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0x1D: ora(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0x19: ora(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0x01: ora(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0x11: ora(cpu, addr_izy(cpu)); cycles = 5 + page_crossed; break;

    // EOR
    case 0x49: eor(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0x45: eor(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x55: eor(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0x4D: eor(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0x5D: eor(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0x59: eor(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0x41: eor(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0x51: eor(cpu, addr_izy(cpu)); cycles = 5 + page_crossed; break;

    // BIT
    case 0x24: bit(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x2C: bit(cpu, addr_abs(cpu)); cycles = 4; break;

    // CMP, CPX, CPY
    case 0xC9: compare(cpu, cpu->a, addr_imm(cpu)); cycles = 2; break;
    case 0xC5: compare(cpu, cpu->a, addr_zp(cpu)); cycles = 3; break;
    case 0xD5: compare(cpu, cpu->a, addr_zpx(cpu)); cycles = 4; break;
    case 0xCD: compare(cpu, cpu->a, addr_abs(cpu)); cycles = 4; break;
    case 0xDD: compare(cpu, cpu->a, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0xD9: compare(cpu, cpu->a, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0xC1: compare(cpu, cpu->a, addr_izx(cpu)); cycles = 6; break;
    case 0xD1: compare(cpu, cpu->a, addr_izy(cpu)); cycles = 5 + page_crossed; break;
    case 0xE0: compare(cpu, cpu->x, addr_imm(cpu)); cycles = 2; break;
    case 0xE4: compare(cpu, cpu->x, addr_zp(cpu)); cycles = 3; break;
    case 0xEC: compare(cpu, cpu->x, addr_abs(cpu)); cycles = 4; break;
    case 0xC0: compare(cpu, cpu->y, addr_imm(cpu)); cycles = 2; break;
    case 0xC4: compare(cpu, cpu->y, addr_zp(cpu)); cycles = 3; break;
    case 0xCC: compare(cpu, cpu->y, addr_abs(cpu)); cycles = 4; break;
//@ end
//@ 9

    // ADC
    case 0x69: adc(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0x65: adc(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0x75: adc(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0x6D: adc(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0x7D: adc(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0x79: adc(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0x61: adc(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0x71: adc(cpu, addr_izy(cpu)); cycles = 5 + page_crossed; break;

    // SBC
    case 0xE9: sbc(cpu, addr_imm(cpu)); cycles = 2; break;
    case 0xE5: sbc(cpu, addr_zp(cpu)); cycles = 3; break;
    case 0xF5: sbc(cpu, addr_zpx(cpu)); cycles = 4; break;
    case 0xED: sbc(cpu, addr_abs(cpu)); cycles = 4; break;
    case 0xFD: sbc(cpu, addr_abx(cpu)); cycles = 4 + page_crossed; break;
    case 0xF9: sbc(cpu, addr_aby(cpu)); cycles = 4 + page_crossed; break;
    case 0xE1: sbc(cpu, addr_izx(cpu)); cycles = 6; break;
    case 0xF1: sbc(cpu, addr_izy(cpu)); cycles = 5 + page_crossed; break;
//@ end
//@ 10

    // Shifts and rotates of the accumulator
    case 0x0A: cpu->a = asl(cpu, cpu->a); cycles = 2; break;
    case 0x4A: cpu->a = lsr(cpu, cpu->a); cycles = 2; break;
    case 0x2A: cpu->a = rol(cpu, cpu->a); cycles = 2; break;
    case 0x6A: cpu->a = ror(cpu, cpu->a); cycles = 2; break;

    // ... and of memory (read-modify-write never skips the page cycle)
    case 0x06: modify(cpu, addr_zp(cpu), asl); cycles = 5; break;
    case 0x16: modify(cpu, addr_zpx(cpu), asl); cycles = 6; break;
    case 0x0E: modify(cpu, addr_abs(cpu), asl); cycles = 6; break;
    case 0x1E: modify(cpu, addr_abx(cpu), asl); cycles = 7; break;
    case 0x46: modify(cpu, addr_zp(cpu), lsr); cycles = 5; break;
    case 0x56: modify(cpu, addr_zpx(cpu), lsr); cycles = 6; break;
    case 0x4E: modify(cpu, addr_abs(cpu), lsr); cycles = 6; break;
    case 0x5E: modify(cpu, addr_abx(cpu), lsr); cycles = 7; break;
    case 0x26: modify(cpu, addr_zp(cpu), rol); cycles = 5; break;
    case 0x36: modify(cpu, addr_zpx(cpu), rol); cycles = 6; break;
    case 0x2E: modify(cpu, addr_abs(cpu), rol); cycles = 6; break;
    case 0x3E: modify(cpu, addr_abx(cpu), rol); cycles = 7; break;
    case 0x66: modify(cpu, addr_zp(cpu), ror); cycles = 5; break;
    case 0x76: modify(cpu, addr_zpx(cpu), ror); cycles = 6; break;
    case 0x6E: modify(cpu, addr_abs(cpu), ror); cycles = 6; break;
    case 0x7E: modify(cpu, addr_abx(cpu), ror); cycles = 7; break;

    // INC and DEC on memory
    case 0xE6: modify(cpu, addr_zp(cpu), inc); cycles = 5; break;
    case 0xF6: modify(cpu, addr_zpx(cpu), inc); cycles = 6; break;
    case 0xEE: modify(cpu, addr_abs(cpu), inc); cycles = 6; break;
    case 0xFE: modify(cpu, addr_abx(cpu), inc); cycles = 7; break;
    case 0xC6: modify(cpu, addr_zp(cpu), dec); cycles = 5; break;
    case 0xD6: modify(cpu, addr_zpx(cpu), dec); cycles = 6; break;
    case 0xCE: modify(cpu, addr_abs(cpu), dec); cycles = 6; break;
    case 0xDE: modify(cpu, addr_abx(cpu), dec); cycles = 7; break;
//@ end
//@ 11

    // Subroutines and interrupts
    case 0x20: {                                    // JSR
        uint16_t target = fetch16(cpu);
        push16(cpu, (uint16_t)(cpu->pc - 1));       // the address of JSR's last byte
        cpu->pc = target;
        cycles = 6;
        break;
    }
    case 0x60: cpu->pc = (uint16_t)(pull16(cpu) + 1); cycles = 6; break;        // RTS
    case 0x40:                                                                  // RTI
        cpu->p = (pull(cpu) & (uint8_t)~FLAG_B) | FLAG_U;
        cpu->pc = pull16(cpu);
        cycles = 6;
        break;
    case 0x00:                                                                  // BRK
        cpu->pc++;                                  // BRK skips one padding byte
        push16(cpu, cpu->pc);
        push(cpu, cpu->p | FLAG_B | FLAG_U);
        cpu->p |= FLAG_I;
        cpu->pc = bus_read16(0xFFFE);
        cycles = 7;
        break;
//@ end

    default:
        // An opcode this CPU does not know yet. Treat it as a 2-cycle NOP.
        cycles = 2;
        break;
    }

    cpu->cycles += cycles;
    return cycles;
}
