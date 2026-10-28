"""The course-owned main.cpp files for the CPU lessons."""

def bench(with_nmi):
    nmi_doc = "\n//   nmi N            signal an NMI just before instruction number N" if with_nmi else ""
    nmi_decl = "    int nmi_at = -1;\n" if with_nmi else ""
    nmi_parse = """        } else if (word == "nmi") {
            if (!(std::cin >> nmi_at)) bad = true;
""" if with_nmi else ""
    nmi_run = """        if (i == nmi_at) {
            std::printf("---- NMI ----\\n");
            cpu.nmi();
        }
""" if with_nmi else ""
    return f"""// Opcode's CPU test bench. Provided by the course.
//
// Type a program into Program input as hex bytes. They go into a 16 KB test
// cartridge starting at C000, which is where the reset vector points.
// Words you can add anywhere:
//   @ADDR            put the next bytes at ADDR instead (8000-FFFF)
//   steps N          run at most N instructions (default 50)
//   dump ADDR COUNT  afterwards, show COUNT bytes starting at ADDR
//   brk              let BRK (opcode 00) run instead of stopping there{nmi_doc}
//
// It prints a trace line before every instruction, like the nestest log.
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <string>
#include <vector>
#include "bus.h"
#include "cpu.h"
#include "trace.h"

namespace {{

// Reads a hex number; false if the text is not one.
bool parse_hex(const std::string& text, unsigned long& value) {{
    char* end = nullptr;
    value = std::strtoul(text.c_str(), &end, 16);
    return !text.empty() && *end == '\\0';
}}

}}  // namespace

int main() {{
    std::vector<std::uint8_t> rom(0x4000, 0);
    rom[0x3FFC] = 0x00;  // reset vector: C000
    rom[0x3FFD] = 0xC0;
    unsigned long at = 0xC000;
    int steps = 50;
    bool run_brk = false, bad = false;
    unsigned long dump_addr = 0, dump_count = 0;
{nmi_decl}
    std::string word;
    while (std::cin >> word) {{
        unsigned long byte = 0;
        if (word[0] == '@') {{
            bad = !parse_hex(word.substr(1), at);
        }} else if (word == "steps") {{
            if (!(std::cin >> steps)) bad = true;
        }} else if (word == "dump") {{
            std::string a, n;
            bad = !(std::cin >> a >> n) || !parse_hex(a, dump_addr) || !parse_hex(n, dump_count);
        }} else if (word == "brk") {{
            run_brk = true;
{nmi_parse}        }} else if (parse_hex(word, byte) && byte <= 0xFF && at >= 0x8000 && at <= 0xFFFF) {{
            rom[(at - 0x8000) % 0x4000] = static_cast<std::uint8_t>(byte);
            at++;
        }} else {{
            bad = true;
        }}
        if (bad) {{
            std::printf("I did not understand \\"%s\\" in the program input.\\n", word.c_str());
            return 1;
        }}
    }}

    Bus bus;
    bus.reset();
    bus.load_prg(rom);
    Cpu cpu(bus);
    cpu.reset();

    int i;
    for (i = 0; i < steps; i++) {{
{nmi_run}        if (bus.read(cpu.pc) == 0x00 && !run_brk) {{
            break;
        }}
        std::printf("%s\\n", trace_line(cpu, bus).c_str());
        cpu.step();
    }}
    std::printf("End   %s A:%02X X:%02X Y:%02X P:%02X SP:%02X CYC:%llu\\n",
                i < steps ? "(BRK)" : "     ", cpu.a, cpu.x, cpu.y, cpu.p, cpu.sp,
                static_cast<unsigned long long>(cpu.cycles));
    for (unsigned long k = 0; k < dump_count; k++) {{
        if (k % 16 == 0) std::printf("%s%04lX:", k ? "\\n" : "", (dump_addr + k) & 0xFFFF);
        std::printf(" %02X", bus.read(static_cast<std::uint16_t>(dump_addr + k)));
    }}
    if (dump_count) std::printf("\\n");
}}
"""

NESTEST_MAIN = r"""// Opcode's nestest runner. Provided by the course.
//
// nestest.nes is a test cartridge that runs every official 6502 instruction
// in every interesting situation. nestest.log is what a real 6502 does,
// one line per instruction. This program runs your CPU through the test and
// compares it with the log line by line, stopping at the first difference.
//
// Program input: how many lines to compare (leave it empty for all of them).
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <sstream>
#include <string>
#include <vector>
#include "bus.h"
#include "cpu.h"
#include "trace.h"

namespace {

// The instruction text of a log line: what follows the seven numbers.
std::string instruction_text(const std::string& line) {
    std::size_t pos = 0;
    for (int i = 0; i < 7 && pos != std::string::npos; i++) pos = line.find(' ', pos + 1);
    return pos == std::string::npos ? "?" : line.substr(pos + 1);
}

// P as letters, with '.' for flags that are clear: "NV-..I.C"
std::string flags_text(unsigned p) {
    const std::string names = "NV-BDIZC";
    std::string out;
    for (int bit = 7; bit >= 0; bit--) out += (p >> bit) & 1 ? names[7 - bit] : '.';
    return out;
}

}  // namespace

int main() {
    long limit = 1L << 30;
    if (!(std::cin >> limit)) limit = 1L << 30;

    std::ifstream rom("nestest.nes", std::ios::binary);
    std::ifstream log("nestest.log");
    if (!rom || !log) {
        std::printf("Could not open the nestest files.\n");
        return 1;
    }
    std::vector<std::uint8_t> file((std::istreambuf_iterator<char>(rom)), std::istreambuf_iterator<char>());
    if (file.size() < 0x4010) {
        std::printf("nestest.nes is too short.\n");
        return 1;
    }

    Bus bus;
    bus.reset();
    bus.load_prg(std::vector<std::uint8_t>(file.begin() + 16, file.begin() + 16 + 0x4000));  // skip the 16-byte iNES header
    Cpu cpu(bus);
    cpu.reset();
    cpu.pc = 0xC000;  // nestest's automatic mode starts here

    std::string expected, previous;
    long n = 0;
    while (n < limit && std::getline(log, expected)) {
        std::istringstream fields(expected);
        unsigned pc, a, x, y, p, sp;
        unsigned long long cyc;
        if (!(fields >> std::hex >> pc >> a >> x >> y >> p >> sp >> std::dec >> cyc)) break;
        n++;
        if (pc != cpu.pc || a != cpu.a || x != cpu.x || y != cpu.y || p != cpu.p || sp != cpu.sp || cyc != cpu.cycles) {
            std::printf("Line %ld is different.\n", n);
            std::printf("The real 6502 at this point:  PC:%04X A:%02X X:%02X Y:%02X P:%02X SP:%02X CYC:%llu\n", pc, a, x, y, p, sp, cyc);
            std::printf("Your CPU at this point:       PC:%04X A:%02X X:%02X Y:%02X P:%02X SP:%02X CYC:%llu\n",
                        cpu.pc, cpu.a, cpu.x, cpu.y, cpu.p, cpu.sp, static_cast<unsigned long long>(cpu.cycles));
            if (p != cpu.p) {
                std::printf("Flags, real: %s   yours: %s\n", flags_text(p).c_str(), flags_text(cpu.p).c_str());
            }
            if (n > 1) {
                std::printf("The instruction that went wrong is most likely the one before: %s\n", instruction_text(previous).c_str());
            } else {
                std::printf("Your CPU does not start the way nestest expects. Check Cpu::reset.\n");
            }
            return 0;
        }
        previous = expected;
        if (n > limit - 5 || n <= 3) {
            std::printf("%5ld  %s\n", n, trace_line(cpu, bus).c_str());
        } else if (n == 4) {
            std::printf("  ...\n");
        }
        cpu.step();
    }
    std::printf("All %ld lines match the log.\n", n);
    if (n >= 5003) {
        std::printf("nestest's own result codes: $02 = %02X, $03 = %02X (00 means every test passed)\n", bus.read(0x02), bus.read(0x03));
    }
}
"""
