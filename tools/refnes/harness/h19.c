#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "ppu.h"
#include "common.inc"

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 0, 0x01, 0));
    bus_reset();
    ppu_reset();
    if (t == 1) {
        bus_write(0x2006, 0x3F); bus_write(0x2006, 0x00); bus_write(0x2007, 0x2A);
        bus_write(0x3FFE, 0x21); bus_write(0x3FFE, 0x08); bus_write(0x3FFF, 0x33);
        printf("3F00=%02X 2108=%02X\n", ppu_read(0x3F00), ppu_read(0x2108));
    }
    if (t == 2) {
        bus_write(0x2003, 0x10); bus_write(0x2004, 0xAA); bus_write(0x2004, 0xBB);
        bus_write(0x2003, 0x10);
        uint8_t a = bus_read(0x2004), b = bus_read(0x2004);
        bus_write(0x2003, 0x11);
        printf("OAM: %02X %02X %02X\n", a, b, bus_read(0x2004));
    }
    if (t == 3) {
        bus_write(0x2005, 0x12);
        bus_write(0x2006, 0x34);
        bus_write(0x2007, 0x5A);
        printf("after one PPUSCROLL write, PPUADDR took the low byte: 0034=%02X\n", ppu_read(0x0034));
        bus_read(0x2002);
        bus_write(0x2006, 0x20); bus_write(0x2006, 0x10); bus_write(0x2007, 0x6B);
        printf("after reading PPUSTATUS, both bytes again: 2010=%02X\n", ppu_read(0x2010));
    }
    if (t == 4) {
        bus_write(0x0001, 0x77);
        printf("RAM %02X, cartridge %02X %02X\n", bus_read(0x0801), bus_read(0x8000), bus_read(0xC123));
    }
    return 0;
}
