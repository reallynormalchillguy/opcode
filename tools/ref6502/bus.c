#include <string.h>
#include "bus.h"

static uint8_t ram[0x800];
static uint8_t prg_ram[0x2000];
static uint8_t prg_rom[0x8000];
static int prg_size = 0;

void bus_reset(void) {
    memset(ram, 0, sizeof ram);
    memset(prg_ram, 0, sizeof prg_ram);
}

void bus_load_prg(const uint8_t *data, int size) {
    memcpy(prg_rom, data, size);
    prg_size = size;
}

uint8_t bus_read(uint16_t addr) {
    if (addr < 0x2000) {
        return ram[addr % 0x800];
    }
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram[addr - 0x6000];
    }
    if (addr >= 0x8000 && prg_size > 0) {
        return prg_rom[(addr - 0x8000) % prg_size];
    }
    return 0;
}

void bus_write(uint16_t addr, uint8_t value) {
    if (addr < 0x2000) {
        ram[addr % 0x800] = value;
    } else if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram[addr - 0x6000] = value;
    }
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

uint16_t bus_read16(uint16_t addr) {
    uint16_t lo = bus_read(addr);
    uint16_t hi = bus_read((uint16_t)(addr + 1));
    return (uint16_t)(hi << 8 | lo);
}
