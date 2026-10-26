#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

static void w(int reg, uint8_t v) { ppu_register_write(reg, v); }
static uint8_t rd(int reg) { return ppu_register_read(reg); }

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 0, 0x01, 0));
    ppu_reset();
    if (t == 1) {
        w(6, 0x20); w(6, 0x05); w(7, 0x41); w(7, 0x42);
        printf("2005=%02X 2006=%02X 2007=%02X\n", ppu_read(0x2005), ppu_read(0x2006), ppu_read(0x2007));
    }
    if (t == 2) {
        ppu_write(0x2105, 0x41); ppu_write(0x2106, 0x42);
        w(6, 0x21); w(6, 0x05);
        uint8_t a = rd(7), b = rd(7), c = rd(7);
        printf("three reads from 2105: %02X %02X %02X\n", a, b, c);
    }
    if (t == 3) {
        w(0, 0x04);
        w(6, 0x20); w(6, 0x00); w(7, 0x01); w(7, 0x02); w(7, 0x03);
        printf("2000=%02X 2020=%02X 2040=%02X 2001=%02X\n", ppu_read(0x2000), ppu_read(0x2020), ppu_read(0x2040), ppu_read(0x2001));
    }
    if (t == 4) {
        w(6, 0x3F); w(6, 0x00); w(7, 0x0F); w(7, 0x16);
        ppu_write(0x2F00, 0x77);
        w(6, 0x3F); w(6, 0x00);
        uint8_t a = rd(7);
        w(6, 0x20); w(6, 0x00);
        uint8_t b = rd(7);
        printf("palette read: %02X, then a nametable read gives the buffer: %02X\n", a, b);
    }
    if (t == 5) {
        w(6, 0x21);
        uint8_t s = rd(2);
        w(6, 0x20); w(6, 0x00); w(7, 0x5A);
        printf("PPUSTATUS read %02X; 2000=%02X 2100=%02X\n", s, ppu_read(0x2000), ppu_read(0x2100));
    }
    if (t == 6) {
        w(6, 0x3F); w(6, 0xFF); w(7, 0x30); w(7, 0x55);
        printf("3FFF=%02X 0000=%02X\n", ppu_read(0x3FFF), ppu_read(0x0000));
        w(6, 0x7F); w(6, 0x00); w(7, 0x12);
        printf("writing PPUADDR 7F00 reaches 3F00: %02X\n", ppu_read(0x3F00));
    }
    return 0;
}
