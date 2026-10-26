#ifndef CART_H
#define CART_H

#include <stdint.h>

// How the PPU's 2 KB of nametable memory appears in its four nametable slots.
typedef enum {
    MIRROR_HORIZONTAL = 0,  // 2000 = 2400 and 2800 = 2C00 (for games that scroll up and down)
    MIRROR_VERTICAL = 1,    // 2000 = 2800 and 2400 = 2C00 (for games that scroll sideways)
//@ 31
    MIRROR_ONE_LOW = 2,     // all four are the first 1 KB (one-screen, set by some mappers)
    MIRROR_ONE_HIGH = 3,    // all four are the second 1 KB
//@ end
} Mirroring;

// What cart_load returns.
#define CART_OK 0
#define CART_NOT_INES -1            // the file does not start with "NES" and 1A
#define CART_TOO_SHORT -2           // the file is shorter than its header says
#define CART_UNSUPPORTED_MAPPER -3  // a mapper this emulator does not have yet
#define CART_NO_MEMORY -4           // malloc failed

// Read an iNES file that is already in memory. Returns one of the codes above.
int cart_load(const uint8_t *data, long size);

// What the header said.
int cart_mapper(void);
int cart_prg_banks(void);   // in 16 KB units
int cart_chr_banks(void);   // in 8 KB units; 0 means 8 KB of CHR RAM instead
//@ 13-30
Mirroring cart_mirroring(void);
//@ end
//@ 31
Mirroring cart_mirroring(void);   // now: mappers can change it while the game runs
//@ end
int cart_has_battery(void);

// The cartridge as the CPU sees it: 4020-FFFF.
uint8_t cart_cpu_read(uint16_t addr);
void cart_cpu_write(uint16_t addr, uint8_t value);

// The cartridge as the PPU sees it: pattern tables at 0000-1FFF.
uint8_t cart_ppu_read(uint16_t addr);
void cart_ppu_write(uint16_t addr, uint8_t value);
//@ 33

// MMC3's scanline counter: the PPU calls cart_scanline once per scanline
// while it draws, and cart_irq is 1 while the cartridge wants an IRQ.
void cart_scanline(void);
int cart_irq(void);
//@ end

#endif
