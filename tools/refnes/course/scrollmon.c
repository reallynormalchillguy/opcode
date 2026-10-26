// Opcode's scroll register monitor. Provided by the course.
// Each line of Program input is a register access: "2000 01" writes 01 to
// PPUCTRL, "2002" reads PPUSTATUS, "2005 7D" writes PPUSCROLL, and so on.
// After each one it prints v, t, fine x and w, with t cut into its parts.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"

static void bits(uint16_t value, int count, char *out) {
    for (int i = count - 1; i >= 0; i--) *out++ = (value >> i) & 1 ? '1' : '0';
    *out = 0;
}

static void show(void) {
    uint16_t v, t;
    uint8_t x;
    int w;
    ppu_scroll_regs(&v, &t, &x, &w);
    char fy[4], nt[3], cy[6], cx[6];
    bits(t >> 12, 3, fy);
    bits(t >> 10, 2, nt);
    bits(t >> 5, 5, cy);
    bits(t, 5, cx);
    printf("    t = %04X  %s %s %s %s  (fine y %d, nametable %d, coarse y %2d, coarse x %2d)\n", t, fy, nt, cy, cx,
           (t >> 12) & 7, (t >> 10) & 3, (t >> 5) & 31, t & 31);
    printf("    v = %04X   fine x = %d   w = %d\n", v, x, w);
}

int main(void) {
    static uint8_t rom[16 + 0x4000];
    memcpy(rom, "NES\x1A\x01\x00\x01", 7);           // an empty cartridge with CHR RAM
    cart_load(rom, sizeof rom);
    ppu_reset();
    char line[64];
    int n = 0;
    while (fgets(line, sizeof line, stdin)) {
        unsigned reg, value;
        int got = sscanf(line, "%x %x", &reg, &value);
        if (got < 1 || reg < 0x2000 || reg > 0x2007) continue;
        if (got == 2) {
            printf("write %02X to %04X\n", value & 0xFF, reg);
            ppu_register_write(reg & 7, (uint8_t)value);
        } else {
            printf("read %04X\n", reg);
            ppu_register_read(reg & 7);
        }
        show();
        n++;
    }
    if (n == 0) printf("Write register accesses in Program input, one per line, like: 2005 7D\n");
    return 0;
}
