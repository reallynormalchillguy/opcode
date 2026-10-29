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
#include "controller.h"
#include "common.inc"

Cartridge cart;
Ppu ppu(cart);
Controllers controllers;
Bus bus(cart, ppu, controllers);
Cpu cpu(bus);

#include "demo.inc"

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    cart.load(make_rom(1, 1, 0x00, 0));
    bus.reset();
    ppu.reset();
    controllers.reset();
    if (t == 1) {
        controllers.set(0, kButtonB | kButtonDown);
        bus.write(0x4016, 1);
        bus.write(0x4016, 0);
        std::printf("4016 reads:");
        for (int i = 0; i < 9; i++) std::printf(" %02X", bus.read(0x4016));
        std::printf("\n");
    }
    if (t == 2) {
        controllers.set(0, kButtonA);
        controllers.set(1, kButtonStart);
        bus.write(0x4016, 1);
        bus.write(0x4016, 0);
        std::printf("4017 reads:");
        for (int i = 0; i < 8; i++) std::printf(" %02X", bus.read(0x4017));
        std::printf("\n4016 reads:");
        for (int i = 0; i < 8; i++) std::printf(" %02X", bus.read(0x4016));
        std::printf("\n");
    }
    if (t == 3) {
        controllers.set(0, kButtonRight);
        bus.write(0x4017, 1);                    // 4017 is not the strobe (it belongs to the sound chip)
        bus.write(0x4016, 0);
        std::printf("4016 reads after writing 1 to 4017 only:");
        for (int i = 0; i < 8; i++) std::printf(" %d", bus.read(0x4016) & 1);
        std::printf("\n");
    }
    if (t == 4) {
        if (!demo_start()) return 0;
        controllers.reset();
        for (int f = 1; f <= 260; f++) {
            controllers.set(0, demo_buttons(f));
            demo_frame();
            if (f % 52 == 0) {
                int x = bus.read(0x0002) | bus.read(0x0003) << 8;
                int y = bus.read(0x0004);
                std::printf("frame %3d: robot at x %3d, y %3d, %d bytes collected\n", f, x, y, bus.read(0x000E));
            }
        }
    }
}
