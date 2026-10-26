"""Generates trace.h and trace.c: a small 6502 disassembler that prints one
line per instruction in the same layout as the nestest log."""
from opcodes import table, SIZES

MODE_IDS = ['imp', 'acc', 'imm', 'zp', 'zpx', 'zpy', 'abs', 'abx', 'aby', 'ind', 'izx', 'izy', 'rel']

TRACE_H = """#ifndef TRACE_H
#define TRACE_H

#include <stddef.h>
#include "cpu.h"

// Writes one line describing the instruction at cpu->pc and the registers,
// in the same layout as the nestest log, for example:
// C000  4C F5 C5  JMP $C5F5                       A:00 X:00 Y:00 P:24 SP:FD CYC:7
void trace_line(const Cpu *cpu, char *out, size_t size);

// Just the instruction part: "LDA #$05", "STA $0200,X", ...
void trace_disassemble(uint16_t pc, char *out, size_t size);

// How many bytes the instruction with this opcode takes (1 to 3).
int trace_length(uint8_t opcode);

#endif
"""

def trace_c():
    t = table()
    names, modes = [], []
    for op in range(256):
        if op in t:
            names.append('"%s"' % t[op][0])
            modes.append('M_' + t[op][1].upper())
        else:
            names.append('"???"')
            modes.append('M_IMP')
    def rows(items, per):
        return ',\n'.join('    ' + ', '.join(items[i:i + per]) for i in range(0, 256, per))
    return """// Opcode's 6502 disassembler for traces. Provided by the course.
#include <stdio.h>
#include "trace.h"
#include "bus.h"

enum { M_IMP, M_ACC, M_IMM, M_ZP, M_ZPX, M_ZPY, M_ABS, M_ABX, M_ABY, M_IND, M_IZX, M_IZY, M_REL };

static const char *const NAMES[256] = {
%s
};

static const unsigned char MODES[256] = {
%s
};

static const int SIZE[] = { 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2 };

int trace_length(uint8_t opcode) {
    return SIZE[MODES[opcode]];
}

void trace_disassemble(uint16_t pc, char *out, size_t size) {
    uint8_t op = bus_read(pc);
    uint8_t lo = bus_read((uint16_t)(pc + 1));
    uint8_t hi = bus_read((uint16_t)(pc + 2));
    unsigned word = (unsigned)(hi << 8 | lo);
    const char *n = NAMES[op];
    switch (MODES[op]) {
    case M_IMP: snprintf(out, size, "%%s", n); break;
    case M_ACC: snprintf(out, size, "%%s A", n); break;
    case M_IMM: snprintf(out, size, "%%s #$%%02X", n, lo); break;
    case M_ZP:  snprintf(out, size, "%%s $%%02X", n, lo); break;
    case M_ZPX: snprintf(out, size, "%%s $%%02X,X", n, lo); break;
    case M_ZPY: snprintf(out, size, "%%s $%%02X,Y", n, lo); break;
    case M_ABS: snprintf(out, size, "%%s $%%04X", n, word); break;
    case M_ABX: snprintf(out, size, "%%s $%%04X,X", n, word); break;
    case M_ABY: snprintf(out, size, "%%s $%%04X,Y", n, word); break;
    case M_IND: snprintf(out, size, "%%s ($%%04X)", n, word); break;
    case M_IZX: snprintf(out, size, "%%s ($%%02X,X)", n, lo); break;
    case M_IZY: snprintf(out, size, "%%s ($%%02X),Y", n, lo); break;
    case M_REL: snprintf(out, size, "%%s $%%04X", n, (unsigned)(uint16_t)(pc + 2 + (int8_t)lo)); break;
    }
}

void trace_line(const Cpu *cpu, char *out, size_t size) {
    uint16_t pc = cpu->pc;
    uint8_t op = bus_read(pc);
    int len = trace_length(op);
    char bytes[12];
    if (len == 1) snprintf(bytes, sizeof bytes, "%%02X", op);
    else if (len == 2) snprintf(bytes, sizeof bytes, "%%02X %%02X", op, bus_read((uint16_t)(pc + 1)));
    else snprintf(bytes, sizeof bytes, "%%02X %%02X %%02X", op, bus_read((uint16_t)(pc + 1)), bus_read((uint16_t)(pc + 2)));
    char text[32];
    trace_disassemble(pc, text, sizeof text);
    snprintf(out, size, "%%04X  %%-8s  %%-30s  A:%%02X X:%%02X Y:%%02X P:%%02X SP:%%02X CYC:%%llu",
             pc, bytes, text, cpu->a, cpu->x, cpu->y, cpu->p, cpu->sp, (unsigned long long)cpu->cycles);
}
""" % (rows(names, 8), rows(modes, 8))

if __name__ == '__main__':
    open('trace.h', 'w').write(TRACE_H)
    open('trace.c', 'w').write(trace_c())
