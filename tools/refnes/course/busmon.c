// Opcode's bus monitor. Provided by the course.
// Commands (numbers in hex), exactly what the CPU does:
//   r ADDR        read through bus_read
//   w ADDR VALUE  write through bus_write
//   p ADDR        peek at the PPU's memory directly, with ppu_read
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "ppu.h"

#include "readfile.inc"

int main(void) {
    if (!plug_in_cartridge()) return 1;
    bus_reset();
    ppu_reset();
    char cmd;
    unsigned a, v;
    while (scanf(" %c", &cmd) == 1) {
        if (cmd == 'r' && scanf("%x", &a) == 1) {
            printf("%04X: %02X  (%s)\n", a & 0xFFFF, bus_read((uint16_t)a), bus_region((uint16_t)a));
        } else if (cmd == 'w' && scanf("%x %x", &a, &v) == 2) {
            bus_write((uint16_t)a, (uint8_t)v);
        } else if (cmd == 'p' && scanf("%x", &a) == 1) {
            printf("PPU %04X = %02X\n", a & 0x3FFF, ppu_read((uint16_t)a));
        } else {
            printf("I did not understand that command.\n");
            return 1;
        }
    }
    return 0;
}
