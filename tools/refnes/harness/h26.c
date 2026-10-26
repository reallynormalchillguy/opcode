#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"
#include "controller.h"
#include "common.inc"
#include "demo.inc"

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    cart_load(rom_file, make_rom(1, 1, 0x00, 0));
    bus_reset();
    ppu_reset();
    controller_reset();
    if (t == 1) {
        controller_set(0, BUTTON_B | BUTTON_DOWN);
        bus_write(0x4016, 1);
        bus_write(0x4016, 0);
        printf("4016 reads:");
        for (int i = 0; i < 9; i++) printf(" %02X", bus_read(0x4016));
        printf("\n");
    }
    if (t == 2) {
        controller_set(0, BUTTON_A);
        controller_set(1, BUTTON_START);
        bus_write(0x4016, 1);
        bus_write(0x4016, 0);
        printf("4017 reads:");
        for (int i = 0; i < 8; i++) printf(" %02X", bus_read(0x4017));
        printf("\n4016 reads:");
        for (int i = 0; i < 8; i++) printf(" %02X", bus_read(0x4016));
        printf("\n");
    }
    if (t == 3) {
        controller_set(0, BUTTON_RIGHT);
        bus_write(0x4017, 1);                    // 4017 is not the strobe (it belongs to the sound chip)
        bus_write(0x4016, 0);
        printf("4016 reads after writing 1 to 4017 only:");
        for (int i = 0; i < 8; i++) printf(" %d", bus_read(0x4016) & 1);
        printf("\n");
    }
    if (t == 4) {
        if (!demo_start()) return 0;
        controller_reset();
        for (int f = 1; f <= 260; f++) {
            controller_set(0, demo_buttons(f));
            demo_frame();
            if (f % 52 == 0) {
                printf("frame %3d: robot at x %3d, y %3d, %d bytes collected\n", f,
                       bus_read(0x0002) | bus_read(0x0003) << 8, bus_read(0x0004), bus_read(0x000E));
            }
        }
    }
    return 0;
}
