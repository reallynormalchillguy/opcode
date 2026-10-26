// Opcode's PPU memory monitor. Provided by the course.
// It plugs in game.nes (for its pattern tables and mirroring), then runs
// commands from Program input (numbers in hex):
//   r ADDR        read a byte from the PPU's bus with ppu_read
//   w ADDR VALUE  write a byte with ppu_write
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"

#include "readfile.inc"

int main(void) {
    if (!plug_in_cartridge()) return 1;
    ppu_reset();
    printf("Cartridge mirroring: %s\n", cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal");
    char cmd;
    unsigned addr, value;
    while (scanf(" %c", &cmd) == 1) {
        if (cmd == 'r' && scanf("%x", &addr) == 1) {
            printf("%04X: %02X\n", addr, ppu_read((uint16_t)addr));
        } else if (cmd == 'w' && scanf("%x %x", &addr, &value) == 2) {
            ppu_write((uint16_t)addr, (uint8_t)value);
        } else {
            printf("Unknown command '%c'\n", cmd);
        }
    }
    return 0;
}
