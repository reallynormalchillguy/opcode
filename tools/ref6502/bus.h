#ifndef BUS_H
#define BUS_H

#include <stdint.h>

// The CPU bus: every address the CPU can read or write.
void bus_reset(void);
uint8_t bus_read(uint16_t addr);
void bus_write(uint16_t addr, uint8_t value);

// Name of the part of the console an address reaches.
const char *bus_region(uint16_t addr);

// Plug in a mapper 0 cartridge's program ROM (16 KB or 32 KB).
void bus_load_prg(const uint8_t *data, int size);

// Read a 16-bit little-endian value through the bus.
uint16_t bus_read16(uint16_t addr);

#endif
