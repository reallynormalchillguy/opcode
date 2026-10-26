#ifndef PPU_H
#define PPU_H

#include <stdint.h>

#define PPU_WIDTH 256
#define PPU_HEIGHT 240

// Power on: clear the PPU's memory and registers.
void ppu_reset(void);

// The PPU's own bus, 0000-3FFF:
//   0000-1FFF pattern tables (the cartridge's CHR)
//   2000-2FFF four nametables (2 KB of video RAM, mirrored), repeated up to 3EFF
//   3F00-3F1F palette RAM, repeated up to 3FFF
uint8_t ppu_read(uint16_t addr);
void ppu_write(uint16_t addr, uint8_t value);

// Row `row` (0-7) of tile `tile` in the pattern table at `table` (0x0000 or
// 0x1000), as eight colour numbers 0-3, left to right.
void ppu_tile_row(uint16_t table, uint8_t tile, int row, uint8_t out[8]);

// The eight registers the CPU sees at 2000-2007. reg is 0 to 7.
uint8_t ppu_register_read(int reg);
void ppu_register_write(int reg, uint8_t value);

// Advance the PPU by one dot.
void ppu_tick(void);

// Each returns 1 once, the first time it is asked after the event happened.
int ppu_take_nmi(void);    // the PPU wants to interrupt the CPU
int ppu_take_frame(void);  // a frame has been finished

// Where the PPU is in the frame: scanline 0-261, dot 0-340.
int ppu_scanline(void);
int ppu_dot(void);

// The finished picture: 256 x 240 pixels, each 0x00RRGGBB.
const uint32_t *ppu_pixels(void);

#endif
