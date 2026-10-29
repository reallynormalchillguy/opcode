#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);

static void show(const char* what) {
    Ppu::ScrollRegs r = ppu.scroll_regs();
    std::printf("%-22s t=%04X v=%04X x=%d w=%d\n", what, r.t, r.v, r.fine_x, r.w ? 1 : 0);
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_rom(1, 0, 0x01, 0));
    ppu.reset();
    if (t == 1) {
        show("reset");
        ppu.register_write(0, 0x03); show("2000 = 03");
        ppu.register_write(0, 0x91); show("2000 = 91");
        ppu.register_read(2); show("read 2002");
    }
    if (t == 2) {
        ppu.register_write(5, 0x7D); show("2005 = 7D");
        ppu.register_write(5, 0x5E); show("2005 = 5E");
        ppu.register_write(5, 0xFF); show("2005 = FF");
        ppu.register_read(2); show("read 2002");
        ppu.register_write(5, 0x00); show("2005 = 00");
    }
    if (t == 3) {
        ppu.register_write(6, 0x3D); show("2006 = 3D");
        ppu.register_write(6, 0xF0); show("2006 = F0");
        ppu.register_write(6, 0x7F); show("2006 = 7F (bit 6 too)");
        ppu.register_write(6, 0x21); show("2006 = 21");
    }
    if (t == 4) {
        ppu.register_write(6, 0x21); ppu.register_write(6, 0x08);
        ppu.register_write(7, 0xAB); show("2007 write");
        ppu.register_write(0, 0x04); ppu.register_write(7, 0xCD); show("2007 write, +32");
        ppu.register_write(6, 0x21); ppu.register_write(6, 0x08);
        ppu.register_write(0, 0x00);
        std::uint8_t a = ppu.register_read(7), b = ppu.register_read(7), c = ppu.register_read(7);
        std::printf("read back from 2108: %02X %02X %02X (the first is the old buffer)\n", a, b, c);
        show("after 3 reads");
    }
    if (t == 5) {
        ppu.register_write(5, 0x7D);
        ppu.register_write(6, 0x04); show("2005 then 2006: w=0?");
        ppu.register_write(5, 0xFF); show("finishing with 2005");
    }
}
