#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

static void show(const char *what) {
    uint16_t v, t;
    uint8_t x;
    int w;
    ppu_scroll_regs(&v, &t, &x, &w);
    printf("%-22s t=%04X v=%04X x=%d w=%d\n", what, t, v, x, w);
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 0, 0x01, 0));
    ppu_reset();
    if (t == 1) {
        show("reset");
        ppu_register_write(0, 0x03); show("2000 = 03");
        ppu_register_write(0, 0x91); show("2000 = 91");
        ppu_register_read(2); show("read 2002");
    }
    if (t == 2) {
        ppu_register_write(5, 0x7D); show("2005 = 7D");
        ppu_register_write(5, 0x5E); show("2005 = 5E");
        ppu_register_write(5, 0xFF); show("2005 = FF");
        ppu_register_read(2); show("read 2002");
        ppu_register_write(5, 0x00); show("2005 = 00");
    }
    if (t == 3) {
        ppu_register_write(6, 0x3D); show("2006 = 3D");
        ppu_register_write(6, 0xF0); show("2006 = F0");
        ppu_register_write(6, 0x7F); show("2006 = 7F (bit 6 too)");
        ppu_register_write(6, 0x21); show("2006 = 21");
    }
    if (t == 4) {
        ppu_register_write(6, 0x21); ppu_register_write(6, 0x08);
        ppu_register_write(7, 0xAB); show("2007 write");
        ppu_register_write(0, 0x04); ppu_register_write(7, 0xCD); show("2007 write, +32");
        ppu_register_write(6, 0x21); ppu_register_write(6, 0x08);
        ppu_register_write(0, 0x00);
        uint8_t a = ppu_register_read(7), b = ppu_register_read(7), c = ppu_register_read(7);
        printf("read back from 2108: %02X %02X %02X (the first is the old buffer)\n", a, b, c);
        show("after 3 reads");
    }
    if (t == 5) {
        ppu_register_write(5, 0x7D);
        ppu_register_write(6, 0x04); show("2005 then 2006: w=0?");
        ppu_register_write(5, 0xFF); show("finishing with 2005");
    }
    return 0;
}
