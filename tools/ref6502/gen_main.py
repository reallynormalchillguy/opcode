"""The course-owned main.c files for the CPU lessons."""

def bench(with_nmi):
    nmi_doc = "\n//   nmi N            signal an NMI just before instruction number N" if with_nmi else ""
    nmi_decl = "    int nmi_at = -1;\n" if with_nmi else ""
    nmi_parse = """        } else if (strcmp(tok, "nmi") == 0) {
            if (scanf("%d", &nmi_at) != 1) bad = 1;
""" if with_nmi else ""
    nmi_run = """        if (i == nmi_at) {
            printf("---- NMI ----\\n");
            cpu_nmi(&cpu);
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
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <stdint.h>
#include "bus.h"
#include "cpu.h"
#include "trace.h"

static uint8_t rom[0x4000];

int main(void) {{
    char tok[32];
    unsigned at = 0xC000;
    int steps = 50, run_brk = 0, bad = 0;
    unsigned dump_addr = 0, dump_count = 0;
{nmi_decl}
    rom[0x3FFC] = 0x00;  // reset vector: C000
    rom[0x3FFD] = 0xC0;
    while (scanf("%31s", tok) == 1) {{
        if (tok[0] == '@') {{
            at = (unsigned)strtoul(tok + 1, NULL, 16);
        }} else if (strcmp(tok, "steps") == 0) {{
            if (scanf("%d", &steps) != 1) bad = 1;
        }} else if (strcmp(tok, "dump") == 0) {{
            if (scanf("%x %x", &dump_addr, &dump_count) != 2) bad = 1;
        }} else if (strcmp(tok, "brk") == 0) {{
            run_brk = 1;
{nmi_parse}        }} else {{
            char *end;
            unsigned long byte = strtoul(tok, &end, 16);
            if (*end != '\\0' || byte > 0xFF || at < 0x8000 || at > 0xFFFF) {{
                bad = 1;
            }} else {{
                rom[(at - 0x8000) % 0x4000] = (uint8_t)byte;
                at++;
            }}
        }}
        if (bad) {{
            printf("I did not understand \\"%s\\" in the program input.\\n", tok);
            return 1;
        }}
    }}

    bus_reset();
    bus_load_prg(rom, 0x4000);
    Cpu cpu;
    cpu_reset(&cpu);

    char line[128];
    int i;
    for (i = 0; i < steps; i++) {{
{nmi_run}        if (bus_read(cpu.pc) == 0x00 && !run_brk) {{
            break;
        }}
        trace_line(&cpu, line, sizeof line);
        printf("%s\\n", line);
        cpu_step(&cpu);
    }}
    printf("End   %s A:%02X X:%02X Y:%02X P:%02X SP:%02X CYC:%llu\\n",
           i < steps ? "(BRK)" : "     ", cpu.a, cpu.x, cpu.y, cpu.p, cpu.sp, (unsigned long long)cpu.cycles);
    for (unsigned k = 0; k < dump_count; k++) {{
        if (k % 16 == 0) printf("%s%04X:", k ? "\\n" : "", (dump_addr + k) & 0xFFFF);
        printf(" %02X", bus_read((uint16_t)(dump_addr + k)));
    }}
    if (dump_count) printf("\\n");
    return 0;
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
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cpu.h"
#include "trace.h"

static uint8_t file[0x4010 + 0x2000];

// The instruction text of a log line: what follows the seven numbers.
static const char *instruction_text(char *line) {
    char *text = line;
    for (int i = 0; i < 7 && text; i++) text = strchr(text + 1, ' ');
    if (!text) return "?";
    text[strcspn(text, "\n")] = '\0';
    return text + 1;
}

// P as letters, with '.' for flags that are clear: "NV-..I.C"
static void flags_text(uint8_t p, char out[9]) {
    const char *names = "NV-BDIZC";
    for (int bit = 7; bit >= 0; bit--) out[7 - bit] = (p >> bit) & 1 ? names[7 - bit] : '.';
    out[8] = '\0';
}

int main(void) {
    int limit = 1 << 30;
    if (scanf("%d", &limit) != 1) limit = 1 << 30;

    FILE *rom = fopen("nestest.nes", "rb");
    FILE *log = fopen("nestest.log", "r");
    if (!rom || !log) {
        printf("Could not open the nestest files.\n");
        return 1;
    }
    size_t got = fread(file, 1, sizeof file, rom);
    fclose(rom);
    if (got < 0x4010) {
        printf("nestest.nes is too short.\n");
        return 1;
    }

    bus_reset();
    bus_load_prg(file + 16, 0x4000);  // skip the 16-byte iNES header
    Cpu cpu;
    cpu_reset(&cpu);
    cpu.pc = 0xC000;                  // nestest's automatic mode starts here

    char expected[160], previous[160] = "", mine[160];
    int n = 0;
    while (n < limit && fgets(expected, sizeof expected, log)) {
        unsigned pc, a, x, y, p, sp;
        unsigned long long cyc;
        if (sscanf(expected, "%x %x %x %x %x %x %llu", &pc, &a, &x, &y, &p, &sp, &cyc) != 7) break;
        n++;
        if (pc != cpu.pc || a != cpu.a || x != cpu.x || y != cpu.y || p != cpu.p || sp != cpu.sp || cyc != cpu.cycles) {
            printf("Line %d is different.\n", n);
            printf("The real 6502 at this point:  PC:%04X A:%02X X:%02X Y:%02X P:%02X SP:%02X CYC:%llu\n", pc, a, x, y, p, sp, cyc);
            printf("Your CPU at this point:       PC:%04X A:%02X X:%02X Y:%02X P:%02X SP:%02X CYC:%llu\n",
                   cpu.pc, cpu.a, cpu.x, cpu.y, cpu.p, cpu.sp, (unsigned long long)cpu.cycles);
            if (p != cpu.p) {
                char real_flags[9], your_flags[9];
                flags_text((uint8_t)p, real_flags);
                flags_text(cpu.p, your_flags);
                printf("Flags, real: %s   yours: %s\n", real_flags, your_flags);
            }
            if (n > 1) {
                printf("The instruction that went wrong is most likely the one before: %s\n", instruction_text(previous));
            } else {
                printf("Your CPU does not start the way nestest expects. Check cpu_reset.\n");
            }
            return 0;
        }
        memcpy(previous, expected, sizeof previous);
        if (n > limit - 5 || n <= 3) {
            trace_line(&cpu, mine, sizeof mine);
            printf("%5d  %s\n", n, mine);
        } else if (n == 4) {
            printf("  ...\n");
        }
        cpu_step(&cpu);
    }
    printf("All %d lines match the log.\n", n);
    if (n >= 5003) {
        printf("nestest's own result codes: $02 = %02X, $03 = %02X (00 means every test passed)\n", bus_read(0x02), bus_read(0x03));
    }
    return 0;
}
"""
