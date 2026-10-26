// Opcode's PPU register monitor. Provided by the course.
// Commands (numbers in hex), like the CPU writing to 2000-2007:
//   w REG VALUE  write VALUE to register REG (0-7), with ppu_register_write
//   r REG        read register REG, with ppu_register_read
//   p ADDR       peek at the PPU's memory directly, with ppu_read
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"

#include "readfile.inc"

static const char *NAMES[8] = { "PPUCTRL", "PPUMASK", "PPUSTATUS", "OAMADDR", "OAMDATA", "PPUSCROLL", "PPUADDR", "PPUDATA" };

int main(void) {
    if (!plug_in_cartridge()) return 1;
    ppu_reset();
    char cmd;
    unsigned a, v;
    while (scanf(" %c", &cmd) == 1) {
        if (cmd == 'w' && scanf("%x %x", &a, &v) == 2 && a < 8) {
            ppu_register_write((int)a, (uint8_t)v);
            printf("write %02X to %s\n", v & 0xFF, NAMES[a]);
        } else if (cmd == 'r' && scanf("%x", &a) == 1 && a < 8) {
            printf("read  %02X from %s\n", ppu_register_read((int)a), NAMES[a]);
        } else if (cmd == 'p' && scanf("%x", &a) == 1) {
            printf("peek  %04X = %02X\n", a & 0x3FFF, ppu_read((uint16_t)a));
        } else {
            printf("I did not understand that command.\n");
            return 1;
        }
    }
    return 0;
}
