#ifndef BUS_H
#define BUS_H

#include <stdint.h>

// The CPU bus: every address the CPU can read or write.
void bus_reset(void);
uint8_t bus_read(uint16_t addr);
void bus_write(uint16_t addr, uint8_t value);

// Read a 16-bit little-endian value through the bus.
uint16_t bus_read16(uint16_t addr);
//@ 22

// How many cycles the CPU has to wait because of an OAM DMA (a write to
// 4014). Returns them once, then 0 until the next DMA.
int bus_take_stall(void);
//@ end

// Name of the part of the console an address reaches.
const char *bus_region(uint16_t addr);

#endif
