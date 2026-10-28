"""Generates trace.h and trace.cpp: a small 6502 disassembler that prints one
line per instruction in the same layout as the nestest log."""
from opcodes import table, SIZES

MODE_IDS = ['imp', 'acc', 'imm', 'zp', 'zpx', 'zpy', 'abs', 'abx', 'aby', 'ind', 'izx', 'izy', 'rel']

TRACE_H = """#pragma once
#include <cstdint>
#include <string>
#include "bus.h"
#include "cpu.h"

// One line describing the instruction at cpu.pc and the registers, in the
// same layout as the nestest log, for example:
// C000  4C F5 C5  JMP $C5F5                       A:00 X:00 Y:00 P:24 SP:FD CYC:7
std::string trace_line(const Cpu& cpu, Bus& bus);

// Just the instruction part: "LDA #$05", "STA $0200,X", ...
std::string trace_disassemble(Bus& bus, std::uint16_t pc);

// How many bytes the instruction with this opcode takes (1 to 3).
int trace_length(std::uint8_t opcode);
"""

def trace_c():
    t = table()
    names, modes = [], []
    for op in range(256):
        if op in t:
            names.append('"%s"' % t[op][0])
            modes.append(t[op][1].capitalize())
        else:
            names.append('"???"')
            modes.append('Imp')
    def rows(items, per):
        return ',\n'.join('    ' + ', '.join(items[i:i + per]) for i in range(0, 256, per))
    return """// Opcode's 6502 disassembler for traces. Provided by the course.
#include <cstdio>
#include "trace.h"

namespace {

enum Mode { Imp, Acc, Imm, Zp, Zpx, Zpy, Abs, Abx, Aby, Ind, Izx, Izy, Rel };

const char* const kNames[256] = {
%s
};

const Mode kModes[256] = {
%s
};

const int kSize[] = { 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 2, 2, 2 };

}  // namespace

int trace_length(std::uint8_t opcode) {
    return kSize[kModes[opcode]];
}

std::string trace_disassemble(Bus& bus, std::uint16_t pc) {
    std::uint8_t op = bus.read(pc);
    std::uint8_t lo = bus.read(static_cast<std::uint16_t>(pc + 1));
    std::uint8_t hi = bus.read(static_cast<std::uint16_t>(pc + 2));
    unsigned word = static_cast<unsigned>(hi << 8 | lo);
    const char* n = kNames[op];
    char out[32];
    switch (kModes[op]) {
    case Imp: std::snprintf(out, sizeof out, "%%s", n); break;
    case Acc: std::snprintf(out, sizeof out, "%%s A", n); break;
    case Imm: std::snprintf(out, sizeof out, "%%s #$%%02X", n, lo); break;
    case Zp:  std::snprintf(out, sizeof out, "%%s $%%02X", n, lo); break;
    case Zpx: std::snprintf(out, sizeof out, "%%s $%%02X,X", n, lo); break;
    case Zpy: std::snprintf(out, sizeof out, "%%s $%%02X,Y", n, lo); break;
    case Abs: std::snprintf(out, sizeof out, "%%s $%%04X", n, word); break;
    case Abx: std::snprintf(out, sizeof out, "%%s $%%04X,X", n, word); break;
    case Aby: std::snprintf(out, sizeof out, "%%s $%%04X,Y", n, word); break;
    case Ind: std::snprintf(out, sizeof out, "%%s ($%%04X)", n, word); break;
    case Izx: std::snprintf(out, sizeof out, "%%s ($%%02X,X)", n, lo); break;
    case Izy: std::snprintf(out, sizeof out, "%%s ($%%02X),Y", n, lo); break;
    case Rel: std::snprintf(out, sizeof out, "%%s $%%04X", n,
                            static_cast<unsigned>(static_cast<std::uint16_t>(pc + 2 + static_cast<std::int8_t>(lo)))); break;
    }
    return out;
}

std::string trace_line(const Cpu& cpu, Bus& bus) {
    std::uint16_t pc = cpu.pc;
    std::uint8_t op = bus.read(pc);
    int len = trace_length(op);
    char bytes[12];
    if (len == 1) {
        std::snprintf(bytes, sizeof bytes, "%%02X", op);
    } else if (len == 2) {
        std::snprintf(bytes, sizeof bytes, "%%02X %%02X", op, bus.read(static_cast<std::uint16_t>(pc + 1)));
    } else {
        std::snprintf(bytes, sizeof bytes, "%%02X %%02X %%02X", op, bus.read(static_cast<std::uint16_t>(pc + 1)),
                      bus.read(static_cast<std::uint16_t>(pc + 2)));
    }
    std::string text = trace_disassemble(bus, pc);
    char out[128];
    std::snprintf(out, sizeof out, "%%04X  %%-8s  %%-30s  A:%%02X X:%%02X Y:%%02X P:%%02X SP:%%02X CYC:%%llu",
                  pc, bytes, text.c_str(), cpu.a, cpu.x, cpu.y, cpu.p, cpu.sp, static_cast<unsigned long long>(cpu.cycles));
    return out;
}
""" % (rows(names, 8), rows(modes, 8))

if __name__ == '__main__':
    open('trace.h', 'w').write(TRACE_H)
    open('trace.cpp', 'w').write(trace_c())
