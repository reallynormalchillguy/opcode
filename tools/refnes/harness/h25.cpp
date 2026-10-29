#include <cstdint>
#include <cstdio>
#include <iostream>
#include "controller.h"

Controllers pads;

static void read8(int port, const char* label) {
    std::printf("%s:", label);
    for (int i = 0; i < 8; i++) std::printf(" %d", pads.read(port));
    std::printf("\n");
}

static void reads(int port, int count) {
    for (int i = 0; i < count; i++) std::printf(" %d", pads.read(port));
}

int main() {
    int t = 0;
    if (!(std::cin >> t)) return 1;
    pads.reset();
    if (t == 1) {
        pads.set(0, kButtonA | kButtonRight);
        pads.write(1);
        pads.write(0);
        read8(0, "A and Right held, 8 reads");
        std::printf("3 more reads:"); reads(0, 3); std::printf("\n");
        pads.set(0, kButtonStart | kButtonUp);
        pads.write(1);
        pads.write(0);
        read8(0, "Start and Up, after a new strobe");
    }
    if (t == 2) {
        pads.set(0, kButtonA);
        pads.write(1);
        std::printf("strobe on, A held:"); reads(0, 3);
        pads.set(0, kButtonB);
        std::printf(", A let go:"); reads(0, 2); std::printf("\n");
    }
    if (t == 3) {
        pads.set(0, kButtonLeft);
        pads.write(1);
        pads.write(0);
        pads.set(0, kButtonDown);
        read8(0, "Left held at the strobe, Down after");
        pads.write(1);
        pads.write(0);
        read8(0, "next strobe");
    }
    if (t == 4) {
        pads.set(0, kButtonSelect);
        pads.set(1, kButtonB | kButtonLeft);
        pads.write(1);
        pads.write(0);
        read8(1, "controller 2");
        read8(0, "controller 1");
    }
    if (t == 5) {
        std::printf("nothing pressed, no strobe yet:"); reads(0, 3); std::printf("\n");
    }
}
