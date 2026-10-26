#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "cart.h"
#include "common.inc"

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    if (t == 1) {
        printf("load %d\n", cart_load(rom_file, make_rom(1, 1, 0, 0)));
        printf("%02X %02X %02X %02X\n", cart_cpu_read(0x8000), cart_cpu_read(0x8123), cart_cpu_read(0xC123), cart_cpu_read(0xFFFF));
    }
    if (t == 2) {
        printf("load %d\n", cart_load(rom_file, make_rom(2, 1, 0, 0)));
        printf("%02X %02X %02X %02X\n", cart_cpu_read(0x8000), cart_cpu_read(0x8123), cart_cpu_read(0xC123), cart_cpu_read(0xFFFF));
    }
    if (t == 3) {
        printf("load %d\n", cart_load(rom_file, make_rom(1, 1, 0, 0)));
        cart_cpu_write(0x6000, 0x11);
        cart_cpu_write(0x7FFF, 0x22);
        cart_cpu_write(0x8000, 0x99);
        printf("%02X %02X %02X %02X\n", cart_cpu_read(0x6000), cart_cpu_read(0x7FFF), cart_cpu_read(0x6001), cart_cpu_read(0x8000));
    }
    if (t == 4) {
        printf("load %d\n", cart_load(rom_file, make_rom(1, 1, 0, 0)));
        printf("CHR ROM: %02X %02X %02X", cart_ppu_read(0x0000), cart_ppu_read(0x0011), cart_ppu_read(0x1FFF));
        cart_ppu_write(0x0000, 0x55);
        printf(" after a write: %02X\n", cart_ppu_read(0x0000));
        printf("load %d\n", cart_load(rom_file, make_rom(1, 0, 0, 0)));
        printf("CHR RAM: %02X", cart_ppu_read(0x0000));
        cart_ppu_write(0x0000, 0x55);
        cart_ppu_write(0x1FFF, 0x66);
        printf(" after writes: %02X %02X\n", cart_ppu_read(0x0000), cart_ppu_read(0x1FFF));
    }
    if (t == 5) {
        printf("load %d\n", cart_load(rom_file, make_rom(1, 1, 0, 0)));
        uint8_t before = cart_cpu_read(0x8123);
        printf("mapper 1: load %d\n", cart_load(rom_file, make_rom(1, 1, 0x10, 0)));
        printf("the first cartridge is still there: %s\n", cart_cpu_read(0x8123) == before ? "yes" : "no");
        long size = make_rom(2, 1, 0, 0);
        rom_file[16 + 0x123] = 0xEE;
        printf("load %d\n", cart_load(rom_file, size));
        printf("the new one replaced it: %02X\n", cart_cpu_read(0x8123));
    }
    if (t == 6) {
        long size = 0;
        uint8_t *data = read_file("nestest.nes", &size);
        int r = cart_load(data, size);
        printf("nestest: load %d, reset vector %02X%02X\n", r, cart_cpu_read(0xFFFD), cart_cpu_read(0xFFFC));
        free(data);
    }
    return 0;
}
