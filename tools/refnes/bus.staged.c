#include <string.h>
#include "bus.h"
#include "cart.h"
//@ 19
#include "ppu.h"
//@ end

static uint8_t ram[0x800];

void bus_reset(void) {
    memset(ram, 0, sizeof ram);
}

uint8_t bus_read(uint16_t addr) {
    if (addr < 0x2000) {
        return ram[addr % 0x800];
    }
//@ 19
    if (addr < 0x4000) {
        return ppu_register_read(addr & 7);
    }
//@ end
    if (addr >= 0x4020) {
        return cart_cpu_read(addr);
    }
    return 0;
}

void bus_write(uint16_t addr, uint8_t value) {
    if (addr < 0x2000) {
        ram[addr % 0x800] = value;
//@ 19
    } else if (addr < 0x4000) {
        ppu_register_write(addr & 7, value);
//@ end
    } else if (addr >= 0x4020) {
        cart_cpu_write(addr, value);
    }
}

uint16_t bus_read16(uint16_t addr) {
    uint16_t lo = bus_read(addr);
    uint16_t hi = bus_read((uint16_t)(addr + 1));
    return (uint16_t)(hi << 8 | lo);
}

const char *bus_region(uint16_t addr) {
    if (addr < 0x2000) return "RAM";
    if (addr < 0x4000) return "PPU";
    if (addr < 0x4018) return "APU/IO";
    if (addr < 0x4020) return "Disabled";
    if (addr < 0x6000) return "Expansion";
    if (addr < 0x8000) return "Cartridge RAM";
    return "Cartridge ROM";
}
