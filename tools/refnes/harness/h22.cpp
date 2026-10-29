#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "palette.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Bus bus(cart, ppu);
Cpu cpu(bus);

#include "demo.inc"

static std::uint8_t oam_byte(int i) {
    ppu.register_write(3, static_cast<std::uint8_t>(i));
    return ppu.register_read(4);
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_rom(1, 1, 0x00, 0));
    bus.reset();
    ppu.reset();
    if (t == 1) {
        for (int i = 0; i < 256; i++) bus.write(static_cast<std::uint16_t>(0x0200 + i), static_cast<std::uint8_t>(i * 3));
        bus.write(0x2003, 0);
        bus.write(0x4014, 0x02);
        std::printf("OAM after a DMA from page 02:");
        for (int i = 0; i < 8; i++) std::printf(" %02X", oam_byte(i));
        std::printf(" ...");
        for (int i = 252; i < 256; i++) std::printf(" %02X", oam_byte(i));
        std::printf("\n");
    }
    if (t == 2) {
        bus.write(0x4014, 0x07);
        int first = bus.take_stall();
        int again = bus.take_stall();
        std::printf("stall after one DMA: %d, asked again: %d\n", first, again);
        bus.write(0x4014, 0x07);
        bus.write(0x4014, 0x07);
        std::printf("after two: %d\n", bus.take_stall());
        bus.write(0x0000, 5);
        std::printf("after an ordinary write: %d\n", bus.take_stall());
    }
    if (t == 3) {
        for (int i = 0; i < 256; i++) bus.write(static_cast<std::uint16_t>(0x0300 + i), static_cast<std::uint8_t>(i));
        bus.write(0x2003, 0x10);
        bus.write(0x4014, 0x03);
        std::printf("OAMADDR 10 first:");
        for (int i : {0x10, 0x11, 0xFF, 0x00, 0x0F}) std::printf(" OAM[%02X]=%02X", i, oam_byte(i));
        std::printf("\n");
    }
    if (t == 4) {
        bus.write(0x2003, 0);
        bus.write(0x4014, 0xC0);
        int same = 0;
        for (int i = 0; i < 256; i++) same += oam_byte(i) == bus.read(static_cast<std::uint16_t>(0xC000 + i));
        std::printf("DMA from cartridge page C0: %d of 256 bytes copied\n", same);
        for (int i = 0; i < 256; i++) bus.write(static_cast<std::uint16_t>(0x0100 + i), 0xAA);
        bus.write(0x2003, 0);
        bus.write(0x4014, 0x09);              // 0900 is RAM again (0100, mirrored)
        same = 0;
        for (int i = 0; i < 256; i++) same += oam_byte(i) == 0xAA;
        std::printf("DMA from page 09, a mirror of page 01: %d of 256\n", same);
    }
    if (t == 5) {
        if (!demo_start()) return 0;
        for (int f = 0; f < 60; f++) demo_frame();
        std::printf("opcode-demo.nes after 60 frames, sprites on screen:\n");
        for (int i = 0; i < 64; i++) {
            if (oam_byte(i * 4) >= 0xEF) continue;
            std::printf("  %2d: Y %3d", i, oam_byte(i * 4));
            std::printf(" tile %02X", oam_byte(i * 4 + 1));
            std::printf(" attr %02X", oam_byte(i * 4 + 2));
            std::printf(" X %3d\n", oam_byte(i * 4 + 3));
        }
    }
}
