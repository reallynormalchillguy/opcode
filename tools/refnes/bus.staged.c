#include <string.h>
#include "bus.h"
#include "cart.h"
//@ 19
#include "ppu.h"
//@ end
//@ 26
#include "controller.h"
//@ end

static uint8_t ram[0x800];
//@ 22
static int stall;                // cycles the CPU has to wait after an OAM DMA
//@ end

void bus_reset(void) {
    memset(ram, 0, sizeof ram);
//@ 22
    stall = 0;
//@ end
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
//@ 26
    if (addr == 0x4016 || addr == 0x4017) {         // the controllers
        // Only bit 0 comes from the controller. The others keep what was last
        // on the data bus, the 40 of the address: some games check for it.
        return (uint8_t)(0x40 | controller_read(addr - 0x4016));
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
//@ 22
    } else if (addr == 0x4014) {                    // OAMDMA: copy a page of memory to the sprites
        uint16_t page = (uint16_t)(value << 8);
        for (int i = 0; i < 256; i++) {
            ppu_register_write(4, bus_read((uint16_t)(page | i)));
        }
        stall += 513;                               // the CPU waits while it happens
//@ end
//@ 26
    } else if (addr == 0x4016) {                    // the strobe of both controllers
        controller_write(value);
//@ end
    } else if (addr >= 0x4020) {
        cart_cpu_write(addr, value);
    }
}

//@ 22
int bus_take_stall(void) {
    int s = stall;
    stall = 0;
    return s;
}

//@ end
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
