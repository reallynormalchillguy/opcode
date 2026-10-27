#ifndef APU_H
#define APU_H

#include <stdint.h>

// The sound chip: two pulse channels, a triangle, noise and the DMC.

// Power on: everything silent.
void apu_reset(void);

// The CPU writes 4000-4013, 4015 or 4017.
void apu_write(uint16_t addr, uint8_t value);

// The CPU reads 4015: which channels are still playing (and the IRQ flags).
uint8_t apu_read_status(void);

// Advance the APU by one CPU cycle.
void apu_tick(void);

// What channel ch is outputting right now: 0 and 1 the pulses, 2 the
// triangle, 3 the noise (all 0-15), 4 the DMC (0-127).
int apu_channel(int ch);
//@ 36

// 1 while the APU wants an IRQ (the frame counter's, or the DMC's).
int apu_irq(void);
//@ end

#endif
