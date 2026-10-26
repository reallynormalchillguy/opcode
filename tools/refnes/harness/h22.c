#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "common.inc"
#include "demo.inc"

static uint8_t oam_byte(int i) {
    ppu_register_write(3, (uint8_t)i);
    return ppu_register_read(4);
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 1, 0x00, 0));
    bus_reset();
    ppu_reset();
    if (t == 1) {
        for (int i = 0; i < 256; i++) bus_write((uint16_t)(0x0200 + i), (uint8_t)(i * 3));
        bus_write(0x2003, 0);
        bus_write(0x4014, 0x02);
        printf("OAM after a DMA from page 02:");
        for (int i = 0; i < 8; i++) printf(" %02X", oam_byte(i));
        printf(" ...");
        for (int i = 252; i < 256; i++) printf(" %02X", oam_byte(i));
        printf("\n");
    }
    if (t == 2) {
        bus_write(0x4014, 0x07);
        int first = bus_take_stall();
        int again = bus_take_stall();
        printf("stall after one DMA: %d, asked again: %d\n", first, again);
        bus_write(0x4014, 0x07);
        bus_write(0x4014, 0x07);
        printf("after two: %d\n", bus_take_stall());
        bus_write(0x0000, 5);
        printf("after an ordinary write: %d\n", bus_take_stall());
    }
    if (t == 3) {
        for (int i = 0; i < 256; i++) bus_write((uint16_t)(0x0300 + i), (uint8_t)i);
        bus_write(0x2003, 0x10);
        bus_write(0x4014, 0x03);
        printf("OAMADDR 10 first: OAM[10]=%02X OAM[11]=%02X OAM[FF]=%02X OAM[00]=%02X OAM[0F]=%02X\n",
               oam_byte(0x10), oam_byte(0x11), oam_byte(0xFF), oam_byte(0x00), oam_byte(0x0F));
    }
    if (t == 4) {
        bus_write(0x2003, 0);
        bus_write(0x4014, 0xC0);
        int same = 0;
        for (int i = 0; i < 256; i++) same += oam_byte(i) == bus_read((uint16_t)(0xC000 + i));
        printf("DMA from cartridge page C0: %d of 256 bytes copied\n", same);
        for (int i = 0; i < 256; i++) bus_write((uint16_t)(0x0100 + i), 0xAA);
        bus_write(0x2003, 0);
        bus_write(0x4014, 0x09);              // 0900 is RAM again (0100, mirrored)
        same = 0;
        for (int i = 0; i < 256; i++) same += oam_byte(i) == 0xAA;
        printf("DMA from page 09, a mirror of page 01: %d of 256\n", same);
    }
    if (t == 5) {
        if (!demo_start()) return 0;
        for (int f = 0; f < 60; f++) demo_frame();
        printf("opcode-demo.nes after 60 frames, sprites on screen:\n");
        for (int i = 0; i < 64; i++) {
            if (oam_byte(i * 4) >= 0xEF) continue;
            printf("  %2d: Y %3d tile %02X attr %02X X %3d\n", i, oam_byte(i * 4), oam_byte(i * 4 + 1), oam_byte(i * 4 + 2), oam_byte(i * 4 + 3));
        }
    }
    return 0;
}
