#include <array>
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

static long until_frame() {
    long n = 0;
    do { ppu.tick(); n++; } while (!ppu.take_frame() && n < 1000000);
    return n;
}

static void where() { std::printf("%d, %d", ppu.scanline(), ppu.dot()); }

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_rom(1, 0, 0x01, 0));
    ppu.reset();
    if (t == 1) {
        std::printf("ticks: "); where();
        for (int i = 0; i < 340; i++) ppu.tick();
        std::printf(" -> "); where();
        ppu.tick();
        std::printf(" -> "); where();
        for (long i = 0; i < 341L * 261; i++) ppu.tick();
        std::printf(" -> "); where(); std::printf("\n");
    }
    if (t == 2) {
        long first = until_frame();
        long second = until_frame();
        std::printf("first frame after %ld dots, then every %ld dots\n", first, second);
    }
    if (t == 3) {
        long to_vblank = 241L * 341 + 1;
        for (long i = 0; i < to_vblank; i++) ppu.tick();
        std::printf("at %d,%d PPUSTATUS=%02X", ppu.scanline(), ppu.dot(), ppu.register_read(2));
        ppu.tick();
        std::printf(", one dot later %02X", ppu.register_read(2));
        std::printf(", read again %02X\n", ppu.register_read(2));
        ppu.take_frame();
        until_frame();
        std::uint8_t in_vblank = 0;
        while (!(ppu.scanline() == 261 && ppu.dot() == 2)) {
            ppu.tick();
            if (ppu.scanline() == 260 && ppu.dot() == 0) in_vblank = ppu.register_read(2) & 0x80;
        }
        std::printf("next frame: set during the blank %02X, cleared after 261,1: %02X\n", in_vblank, ppu.register_read(2));
    }
    if (t == 4) {
        int nmis = 0;
        for (int f = 0; f < 2; f++) { do { ppu.tick(); nmis += ppu.take_nmi(); } while (!ppu.take_frame()); }
        std::printf("NMI off: %d NMIs in 2 frames\n", nmis);
        ppu.register_read(2);                   // clear the vblank flag first
        ppu.register_write(0, 0x80);
        nmis = 0;
        for (int f = 0; f < 2; f++) { do { ppu.tick(); nmis += ppu.take_nmi(); } while (!ppu.take_frame()); }
        std::printf("NMI on: %d NMIs in 2 frames, at %d,%d\n", nmis, ppu.scanline(), ppu.dot());
        std::printf("asking twice: %d\n", ppu.take_nmi() ? 1 : 0);
    }
    if (t == 5) {
        ppu.register_write(0, 0x00);
        until_frame();
        std::printf("NMI turned on during the blank: ");
        ppu.register_write(0, 0x80);
        std::printf("%d\n", ppu.take_nmi() ? 1 : 0);
        ppu.register_read(2);
        ppu.register_write(0, 0x00);
        ppu.register_write(0, 0x80);
        std::printf("after PPUSTATUS was read: %d\n", ppu.take_nmi() ? 1 : 0);
    }
}
