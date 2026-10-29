#include <array>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <fstream>
#include <iostream>
#include <iterator>
#include <vector>
#include "cart.h"
#include "ppu.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);

#include "banks.inc"

static void clocks(int n, const char* label) {
    std::printf("%-26s", label);
    for (int i = 0; i < n; i++) {
        cart.scanline();
        std::printf(" %d", cart.irq() ? 1 : 0);
    }
    std::printf("\n");
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_banked(4, 8, 8, 0));
    if (t == 1) {
        cart.cpu_write(0xC000, 3);
        cart.cpu_write(0xC001, 0);
        cart.cpu_write(0xE001, 0);
        clocks(10, "latch 3, enabled:");
        cart.cpu_write(0xE000, 0);
        std::printf("after E000: %d\n", cart.irq() ? 1 : 0);
        cart.cpu_write(0xE001, 0);
        clocks(5, "enabled again:");
    }
    if (t == 2) {
        cart.cpu_write(0xC000, 2);
        cart.cpu_write(0xC001, 0);
        clocks(6, "latch 2, disabled:");
        cart.cpu_write(0xE001, 0);
        cart.cpu_write(0xC000, 4);
        clocks(4, "latch 4 written, no reload:");
        cart.cpu_write(0xC001, 0);
        clocks(6, "after C001:");
    }
    if (t == 3) {
        cart.cpu_write(0xC000, 0);
        cart.cpu_write(0xC001, 0);
        cart.cpu_write(0xE001, 0);
        clocks(4, "latch 0:");
        cart.load(make_banked(2, 8, 0, 1));
        clocks(4, "UxROM never asks:");
    }
    if (t == 4) {
        ppu.reset();
        cart.cpu_write(0xC000, 20);
        cart.cpu_write(0xC001, 0);
        cart.cpu_write(0xE001, 0);
        ppu.register_write(1, 0x18);            // rendering on
        int seen = 0;
        long n = 0;
        while (n < 200000 && seen < 3) {
            ppu.tick();
            n++;
            if (cart.irq()) {
                std::printf("IRQ at scanline %d, dot %d\n", ppu.scanline(), ppu.dot());
                cart.cpu_write(0xE000, 0);
                cart.cpu_write(0xE001, 0);
                seen++;
            }
        }
    }
    if (t == 5) {
        ppu.reset();
        cart.cpu_write(0xC000, 5);
        cart.cpu_write(0xC001, 0);
        cart.cpu_write(0xE001, 0);
        ppu.register_write(1, 0x00);            // rendering off: no scanlines are counted
        for (long n = 0; n < 89342; n++) ppu.tick();
        std::printf("rendering off, one frame: IRQ %d\n", cart.irq() ? 1 : 0);
        ppu.register_write(1, 0x08);
        for (long n = 0; n < 89342; n++) ppu.tick();
        std::printf("background on, one frame: IRQ %d\n", cart.irq() ? 1 : 0);
    }
}
