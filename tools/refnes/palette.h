#ifndef PALETTE_H
#define PALETTE_H

#include <stdint.h>

// The 64 colours the NES can show, as 0x00RRGGBB. The PPU stores colour
// numbers 0x00-0x3F in its palette RAM; this table turns them into RGB.
extern const uint32_t NES_PALETTE[64];

#endif
