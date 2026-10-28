#include "cpu.h"
//@ 2

// ---------- Flags ----------

void Cpu::set_flag(std::uint8_t flag, bool on) {
    if (on) {
        p |= flag;
    } else {
        p &= static_cast<std::uint8_t>(~flag);
    }
}

bool Cpu::get_flag(std::uint8_t flag) const {
    return (p & flag) != 0;
}

// Z and N follow almost every result: Z if it is zero, N if bit 7 is set.
void Cpu::set_zn(std::uint8_t value) {
    set_flag(kFlagZ, value == 0);
    set_flag(kFlagN, value & 0x80);
}
//@ end

// ---------- Reading the program ----------

// The byte at PC, then move PC past it.
std::uint8_t Cpu::fetch() {
    return bus_.read(pc++);
}

// Two bytes at PC, low byte first.
std::uint16_t Cpu::fetch16() {
    std::uint16_t lo = fetch();
    std::uint16_t hi = fetch();
    return static_cast<std::uint16_t>(hi << 8 | lo);
}
//@ 3

// ---------- The stack: page 1, growing down ----------

void Cpu::push(std::uint8_t value) {
    bus_.write(0x0100 | sp, value);
    sp--;
}

std::uint8_t Cpu::pull() {
    sp++;
    return bus_.read(0x0100 | sp);
}
//@ end
//@ 11

void Cpu::push16(std::uint16_t value) {
    push(value >> 8);
    push(value & 0xFF);
}

std::uint16_t Cpu::pull16() {
    std::uint16_t lo = pull();
    std::uint16_t hi = pull();
    return static_cast<std::uint16_t>(hi << 8 | lo);
}
//@ end
//@ 4

// ---------- Addressing modes: each returns the address of the operand ----------

// Immediate: the operand is the next byte of the program itself.
std::uint16_t Cpu::addr_imm() {
    return pc++;
}

// Zero page: a one-byte address, 0x00 to 0xFF.
std::uint16_t Cpu::addr_zp() {
    return fetch();
}

// Zero page plus X or Y, wrapping inside the zero page.
std::uint16_t Cpu::addr_zpx() {
    return static_cast<std::uint8_t>(fetch() + x);
}

std::uint16_t Cpu::addr_zpy() {
    return static_cast<std::uint8_t>(fetch() + y);
}
//@ end
//@ 5

namespace {

bool different_pages(std::uint16_t a, std::uint16_t b) {
    return (a & 0xFF00) != (b & 0xFF00);
}

}  // namespace

std::uint16_t Cpu::addr_abs() {
    return fetch16();
}

std::uint16_t Cpu::addr_abx() {
    std::uint16_t base = fetch16();
    auto addr = static_cast<std::uint16_t>(base + x);
    page_crossed_ = different_pages(base, addr);
    return addr;
}

std::uint16_t Cpu::addr_aby() {
    std::uint16_t base = fetch16();
    auto addr = static_cast<std::uint16_t>(base + y);
    page_crossed_ = different_pages(base, addr);
    return addr;
}
//@ end
//@ 6

// Read a pointer stored in the zero page. Its high byte wraps to 0x00.
std::uint16_t Cpu::read_zp_pointer(std::uint8_t zp) {
    std::uint16_t lo = bus_.read(zp);
    std::uint16_t hi = bus_.read(static_cast<std::uint8_t>(zp + 1));
    return static_cast<std::uint16_t>(hi << 8 | lo);
}

// (zp,X): add X to the zero page address first, then follow the pointer.
std::uint16_t Cpu::addr_izx() {
    return read_zp_pointer(static_cast<std::uint8_t>(fetch() + x));
}

// (zp),Y: follow the pointer first, then add Y.
std::uint16_t Cpu::addr_izy() {
    std::uint16_t base = read_zp_pointer(fetch());
    auto addr = static_cast<std::uint16_t>(base + y);
    page_crossed_ = different_pages(base, addr);
    return addr;
}

// JMP (addr). The 6502 never carries into the high byte when reading the
// pointer, so a pointer at xxFF takes its high byte from xx00.
std::uint16_t Cpu::addr_ind_jmp() {
    std::uint16_t ptr = fetch16();
    std::uint16_t lo = bus_.read(ptr);
    std::uint16_t hi = bus_.read(static_cast<std::uint16_t>((ptr & 0xFF00) | ((ptr + 1) & 0x00FF)));
    return static_cast<std::uint16_t>(hi << 8 | lo);
}
//@ end
//@ 4

// ---------- Loads and stores ----------

void Cpu::lda(std::uint16_t addr) { a = bus_.read(addr); set_zn(a); }
void Cpu::ldx(std::uint16_t addr) { x = bus_.read(addr); set_zn(x); }
void Cpu::ldy(std::uint16_t addr) { y = bus_.read(addr); set_zn(y); }
void Cpu::sta(std::uint16_t addr) { bus_.write(addr, a); }
void Cpu::stx(std::uint16_t addr) { bus_.write(addr, x); }
void Cpu::sty(std::uint16_t addr) { bus_.write(addr, y); }
//@ end
//@ 7

// ---------- Branches ----------

// Every branch is two bytes: the opcode and a signed offset. Taking the
// branch costs one more cycle, and one more again if it lands in another page.
int Cpu::branch(bool condition) {
    auto offset = static_cast<std::int8_t>(fetch());
    if (!condition) {
        return 2;
    }
    auto target = static_cast<std::uint16_t>(pc + offset);
    int cost = different_pages(pc, target) ? 4 : 3;
    pc = target;
    return cost;
}
//@ end
//@ 8

// ---------- Logic and comparisons ----------

void Cpu::and_(std::uint16_t addr) { a &= bus_.read(addr); set_zn(a); }
void Cpu::ora(std::uint16_t addr) { a |= bus_.read(addr); set_zn(a); }
void Cpu::eor(std::uint16_t addr) { a ^= bus_.read(addr); set_zn(a); }

void Cpu::bit(std::uint16_t addr) {
    std::uint8_t m = bus_.read(addr);
    set_flag(kFlagZ, (a & m) == 0);
    set_flag(kFlagV, m & 0x40);
    set_flag(kFlagN, m & 0x80);
}

// CMP, CPX and CPY: subtract without keeping the result.
void Cpu::compare(std::uint8_t reg, std::uint16_t addr) {
    std::uint8_t m = bus_.read(addr);
    set_flag(kFlagC, reg >= m);
    set_zn(static_cast<std::uint8_t>(reg - m));
}
//@ end
//@ 9

// ---------- Arithmetic ----------

void Cpu::add(std::uint8_t m) {
    unsigned sum = a + m + (get_flag(kFlagC) ? 1 : 0);
    auto result = static_cast<std::uint8_t>(sum);
    set_flag(kFlagC, sum > 0xFF);
    // Overflow: both inputs had the same sign and the result's sign differs.
    set_flag(kFlagV, (~(a ^ m) & (a ^ result)) & 0x80);
    a = result;
    set_zn(a);
}

void Cpu::adc(std::uint16_t addr) { add(bus_.read(addr)); }

// A - M - (1 - C) is the same as A + (M with every bit flipped) + C.
void Cpu::sbc(std::uint16_t addr) { add(static_cast<std::uint8_t>(~bus_.read(addr))); }
//@ end
//@ 10

// ---------- Shifts, rotates, increments: value in, value out ----------

std::uint8_t Cpu::asl(std::uint8_t v) {
    set_flag(kFlagC, v & 0x80);
    v = static_cast<std::uint8_t>(v << 1);
    set_zn(v);
    return v;
}

std::uint8_t Cpu::lsr(std::uint8_t v) {
    set_flag(kFlagC, v & 0x01);
    v = v >> 1;
    set_zn(v);
    return v;
}

std::uint8_t Cpu::rol(std::uint8_t v) {
    int carry_in = get_flag(kFlagC) ? 1 : 0;
    set_flag(kFlagC, v & 0x80);
    v = static_cast<std::uint8_t>(v << 1 | carry_in);
    set_zn(v);
    return v;
}

std::uint8_t Cpu::ror(std::uint8_t v) {
    int carry_in = get_flag(kFlagC) ? 1 : 0;
    set_flag(kFlagC, v & 0x01);
    v = static_cast<std::uint8_t>(v >> 1 | carry_in << 7);
    set_zn(v);
    return v;
}

std::uint8_t Cpu::inc(std::uint8_t v) { v++; set_zn(v); return v; }
std::uint8_t Cpu::dec(std::uint8_t v) { v--; set_zn(v); return v; }

// Read-modify-write on memory: read the byte, change it, write it back.
// change points to one of the member functions above; (this->*change)(v)
// calls it on this CPU.
void Cpu::modify(std::uint16_t addr, Change change) {
    bus_.write(addr, (this->*change)(bus_.read(addr)));
}
//@ end

// ---------- Power on ----------

void Cpu::reset() {
    a = 0;
    x = 0;
    y = 0;
    sp = 0xFD;
    p = kFlagI | kFlagU;
    pc = bus_.read16(0xFFFC);
    cycles = 7;
}
//@ 11

// ---------- Interrupts ----------

void Cpu::nmi() {
    push16(pc);
    push(static_cast<std::uint8_t>((p & ~kFlagB) | kFlagU));
    p |= kFlagI;
    pc = bus_.read16(0xFFFA);
    cycles += 7;
}
//@ end
//@ 34

bool Cpu::irq() {
    if (p & kFlagI) {                               // interrupts are off: the IRQ waits
        return false;
    }
    push16(pc);
    push(static_cast<std::uint8_t>((p & ~kFlagB) | kFlagU));
    p |= kFlagI;
    pc = bus_.read16(0xFFFE);
    cycles += 7;
    return true;
}
//@ end

// ---------- One instruction ----------

int Cpu::step() {
    std::uint8_t opcode = fetch();
    int cost = 2;  // how many cycles this instruction takes
//@ 5
    page_crossed_ = false;
//@ end

    switch (opcode) {
    // No operation
    case 0xEA: cost = 2; break;

//@ 1-4
    // JMP absolute
    case 0x4C: pc = fetch16(); cost = 3; break;
//@ end
//@ 2-3
    // Loads with an immediate operand
    case 0xA9: a = fetch(); set_zn(a); cost = 2; break;
    case 0xA2: x = fetch(); set_zn(x); cost = 2; break;
    case 0xA0: y = fetch(); set_zn(y); cost = 2; break;
//@ end
//@ 2

    // Transfers between registers
    case 0xAA: x = a; set_zn(x); cost = 2; break;  // TAX
    case 0xA8: y = a; set_zn(y); cost = 2; break;  // TAY
    case 0x8A: a = x; set_zn(a); cost = 2; break;  // TXA
    case 0x98: a = y; set_zn(a); cost = 2; break;  // TYA

    // Increment and decrement X and Y
    case 0xE8: x++; set_zn(x); cost = 2; break;  // INX
    case 0xC8: y++; set_zn(y); cost = 2; break;  // INY
    case 0xCA: x--; set_zn(x); cost = 2; break;  // DEX
    case 0x88: y--; set_zn(y); cost = 2; break;  // DEY

    // Set and clear flags
    case 0x18: set_flag(kFlagC, false); cost = 2; break;  // CLC
    case 0x38: set_flag(kFlagC, true); cost = 2; break;  // SEC
    case 0x58: set_flag(kFlagI, false); cost = 2; break;  // CLI
    case 0x78: set_flag(kFlagI, true); cost = 2; break;  // SEI
    case 0xD8: set_flag(kFlagD, false); cost = 2; break;  // CLD
    case 0xF8: set_flag(kFlagD, true); cost = 2; break;  // SED
    case 0xB8: set_flag(kFlagV, false); cost = 2; break;  // CLV
//@ end
//@ 3

    // The stack
    case 0x48: push(a); cost = 3; break;                                               // PHA
    case 0x08: push(p | kFlagB | kFlagU); cost = 3; break;                             // PHP
    case 0x68: a = pull(); set_zn(a); cost = 4; break;                                 // PLA
    case 0x28: p = (pull() & static_cast<std::uint8_t>(~kFlagB)) | kFlagU; cost = 4; break;  // PLP
    case 0xBA: x = sp; set_zn(x); cost = 2; break;                                     // TSX
    case 0x9A: sp = x; cost = 2; break;                                                // TXS
//@ end
//@ 4

    // LDA, LDX, LDY
    case 0xA9: lda(addr_imm()); cost = 2; break;
    case 0xA5: lda(addr_zp()); cost = 3; break;
    case 0xB5: lda(addr_zpx()); cost = 4; break;
    case 0xA2: ldx(addr_imm()); cost = 2; break;
    case 0xA6: ldx(addr_zp()); cost = 3; break;
    case 0xB6: ldx(addr_zpy()); cost = 4; break;
    case 0xA0: ldy(addr_imm()); cost = 2; break;
    case 0xA4: ldy(addr_zp()); cost = 3; break;
    case 0xB4: ldy(addr_zpx()); cost = 4; break;
//@ end
//@ 5
    case 0xAD: lda(addr_abs()); cost = 4; break;
    case 0xBD: lda(addr_abx()); cost = 4 + page_crossed_; break;
    case 0xB9: lda(addr_aby()); cost = 4 + page_crossed_; break;
    case 0xAE: ldx(addr_abs()); cost = 4; break;
    case 0xBE: ldx(addr_aby()); cost = 4 + page_crossed_; break;
    case 0xAC: ldy(addr_abs()); cost = 4; break;
    case 0xBC: ldy(addr_abx()); cost = 4 + page_crossed_; break;
//@ end
//@ 6
    case 0xA1: lda(addr_izx()); cost = 6; break;
    case 0xB1: lda(addr_izy()); cost = 5 + page_crossed_; break;
//@ end
//@ 4

    // STA, STX, STY (stores never take the extra page-crossing cycle)
    case 0x85: sta(addr_zp()); cost = 3; break;
    case 0x95: sta(addr_zpx()); cost = 4; break;
    case 0x86: stx(addr_zp()); cost = 3; break;
    case 0x96: stx(addr_zpy()); cost = 4; break;
    case 0x84: sty(addr_zp()); cost = 3; break;
    case 0x94: sty(addr_zpx()); cost = 4; break;
//@ end
//@ 5
    case 0x8D: sta(addr_abs()); cost = 4; break;
    case 0x9D: sta(addr_abx()); cost = 5; break;
    case 0x99: sta(addr_aby()); cost = 5; break;
    case 0x8E: stx(addr_abs()); cost = 4; break;
    case 0x8C: sty(addr_abs()); cost = 4; break;
//@ end
//@ 6
    case 0x81: sta(addr_izx()); cost = 6; break;
    case 0x91: sta(addr_izy()); cost = 6; break;
//@ end
//@ 5

    // Jumps
    case 0x4C: pc = addr_abs(); cost = 3; break;
//@ end
//@ 6
    case 0x6C: pc = addr_ind_jmp(); cost = 5; break;
//@ end
//@ 7

    // Branches
    case 0x10: cost = branch(!get_flag(kFlagN)); break;  // BPL
    case 0x30: cost = branch(get_flag(kFlagN)); break;   // BMI
    case 0x50: cost = branch(!get_flag(kFlagV)); break;  // BVC
    case 0x70: cost = branch(get_flag(kFlagV)); break;   // BVS
    case 0x90: cost = branch(!get_flag(kFlagC)); break;  // BCC
    case 0xB0: cost = branch(get_flag(kFlagC)); break;   // BCS
    case 0xD0: cost = branch(!get_flag(kFlagZ)); break;  // BNE
    case 0xF0: cost = branch(get_flag(kFlagZ)); break;   // BEQ
//@ end
//@ 8

    // AND
    case 0x29: and_(addr_imm()); cost = 2; break;
    case 0x25: and_(addr_zp()); cost = 3; break;
    case 0x35: and_(addr_zpx()); cost = 4; break;
    case 0x2D: and_(addr_abs()); cost = 4; break;
    case 0x3D: and_(addr_abx()); cost = 4 + page_crossed_; break;
    case 0x39: and_(addr_aby()); cost = 4 + page_crossed_; break;
    case 0x21: and_(addr_izx()); cost = 6; break;
    case 0x31: and_(addr_izy()); cost = 5 + page_crossed_; break;

    // ORA
    case 0x09: ora(addr_imm()); cost = 2; break;
    case 0x05: ora(addr_zp()); cost = 3; break;
    case 0x15: ora(addr_zpx()); cost = 4; break;
    case 0x0D: ora(addr_abs()); cost = 4; break;
    case 0x1D: ora(addr_abx()); cost = 4 + page_crossed_; break;
    case 0x19: ora(addr_aby()); cost = 4 + page_crossed_; break;
    case 0x01: ora(addr_izx()); cost = 6; break;
    case 0x11: ora(addr_izy()); cost = 5 + page_crossed_; break;

    // EOR
    case 0x49: eor(addr_imm()); cost = 2; break;
    case 0x45: eor(addr_zp()); cost = 3; break;
    case 0x55: eor(addr_zpx()); cost = 4; break;
    case 0x4D: eor(addr_abs()); cost = 4; break;
    case 0x5D: eor(addr_abx()); cost = 4 + page_crossed_; break;
    case 0x59: eor(addr_aby()); cost = 4 + page_crossed_; break;
    case 0x41: eor(addr_izx()); cost = 6; break;
    case 0x51: eor(addr_izy()); cost = 5 + page_crossed_; break;

    // BIT
    case 0x24: bit(addr_zp()); cost = 3; break;
    case 0x2C: bit(addr_abs()); cost = 4; break;

    // CMP, CPX, CPY
    case 0xC9: compare(a, addr_imm()); cost = 2; break;
    case 0xC5: compare(a, addr_zp()); cost = 3; break;
    case 0xD5: compare(a, addr_zpx()); cost = 4; break;
    case 0xCD: compare(a, addr_abs()); cost = 4; break;
    case 0xDD: compare(a, addr_abx()); cost = 4 + page_crossed_; break;
    case 0xD9: compare(a, addr_aby()); cost = 4 + page_crossed_; break;
    case 0xC1: compare(a, addr_izx()); cost = 6; break;
    case 0xD1: compare(a, addr_izy()); cost = 5 + page_crossed_; break;
    case 0xE0: compare(x, addr_imm()); cost = 2; break;
    case 0xE4: compare(x, addr_zp()); cost = 3; break;
    case 0xEC: compare(x, addr_abs()); cost = 4; break;
    case 0xC0: compare(y, addr_imm()); cost = 2; break;
    case 0xC4: compare(y, addr_zp()); cost = 3; break;
    case 0xCC: compare(y, addr_abs()); cost = 4; break;
//@ end
//@ 9

    // ADC
    case 0x69: adc(addr_imm()); cost = 2; break;
    case 0x65: adc(addr_zp()); cost = 3; break;
    case 0x75: adc(addr_zpx()); cost = 4; break;
    case 0x6D: adc(addr_abs()); cost = 4; break;
    case 0x7D: adc(addr_abx()); cost = 4 + page_crossed_; break;
    case 0x79: adc(addr_aby()); cost = 4 + page_crossed_; break;
    case 0x61: adc(addr_izx()); cost = 6; break;
    case 0x71: adc(addr_izy()); cost = 5 + page_crossed_; break;

    // SBC
    case 0xE9: sbc(addr_imm()); cost = 2; break;
    case 0xE5: sbc(addr_zp()); cost = 3; break;
    case 0xF5: sbc(addr_zpx()); cost = 4; break;
    case 0xED: sbc(addr_abs()); cost = 4; break;
    case 0xFD: sbc(addr_abx()); cost = 4 + page_crossed_; break;
    case 0xF9: sbc(addr_aby()); cost = 4 + page_crossed_; break;
    case 0xE1: sbc(addr_izx()); cost = 6; break;
    case 0xF1: sbc(addr_izy()); cost = 5 + page_crossed_; break;
//@ end
//@ 10

    // Shifts and rotates of the accumulator
    case 0x0A: a = asl(a); cost = 2; break;
    case 0x4A: a = lsr(a); cost = 2; break;
    case 0x2A: a = rol(a); cost = 2; break;
    case 0x6A: a = ror(a); cost = 2; break;

    // ... and of memory (read-modify-write never skips the page cycle)
    case 0x06: modify(addr_zp(), &Cpu::asl); cost = 5; break;
    case 0x16: modify(addr_zpx(), &Cpu::asl); cost = 6; break;
    case 0x0E: modify(addr_abs(), &Cpu::asl); cost = 6; break;
    case 0x1E: modify(addr_abx(), &Cpu::asl); cost = 7; break;
    case 0x46: modify(addr_zp(), &Cpu::lsr); cost = 5; break;
    case 0x56: modify(addr_zpx(), &Cpu::lsr); cost = 6; break;
    case 0x4E: modify(addr_abs(), &Cpu::lsr); cost = 6; break;
    case 0x5E: modify(addr_abx(), &Cpu::lsr); cost = 7; break;
    case 0x26: modify(addr_zp(), &Cpu::rol); cost = 5; break;
    case 0x36: modify(addr_zpx(), &Cpu::rol); cost = 6; break;
    case 0x2E: modify(addr_abs(), &Cpu::rol); cost = 6; break;
    case 0x3E: modify(addr_abx(), &Cpu::rol); cost = 7; break;
    case 0x66: modify(addr_zp(), &Cpu::ror); cost = 5; break;
    case 0x76: modify(addr_zpx(), &Cpu::ror); cost = 6; break;
    case 0x6E: modify(addr_abs(), &Cpu::ror); cost = 6; break;
    case 0x7E: modify(addr_abx(), &Cpu::ror); cost = 7; break;

    // INC and DEC on memory
    case 0xE6: modify(addr_zp(), &Cpu::inc); cost = 5; break;
    case 0xF6: modify(addr_zpx(), &Cpu::inc); cost = 6; break;
    case 0xEE: modify(addr_abs(), &Cpu::inc); cost = 6; break;
    case 0xFE: modify(addr_abx(), &Cpu::inc); cost = 7; break;
    case 0xC6: modify(addr_zp(), &Cpu::dec); cost = 5; break;
    case 0xD6: modify(addr_zpx(), &Cpu::dec); cost = 6; break;
    case 0xCE: modify(addr_abs(), &Cpu::dec); cost = 6; break;
    case 0xDE: modify(addr_abx(), &Cpu::dec); cost = 7; break;
//@ end
//@ 11

    // Subroutines and interrupts
    case 0x20: {                                    // JSR
        std::uint16_t target = fetch16();
        push16(static_cast<std::uint16_t>(pc - 1));  // the address of JSR's last byte
        pc = target;
        cost = 6;
        break;
    }
    case 0x60: pc = static_cast<std::uint16_t>(pull16() + 1); cost = 6; break;  // RTS
    case 0x40:                                                                  // RTI
        p = (pull() & static_cast<std::uint8_t>(~kFlagB)) | kFlagU;
        pc = pull16();
        cost = 6;
        break;
    case 0x00:                                                                  // BRK
        pc++;                                       // BRK skips one padding byte
        push16(pc);
        push(p | kFlagB | kFlagU);
        p |= kFlagI;
        pc = bus_.read16(0xFFFE);
        cost = 7;
        break;
//@ end

    default:
        // An opcode this CPU does not know yet. Treat it as a 2-cycle NOP.
        cost = 2;
        break;
    }

    cycles += cost;
    return cost;
}
