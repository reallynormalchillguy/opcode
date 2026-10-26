#include <stdlib.h>
#include <string.h>
#include "cart.h"

// What the header says.
static int mapper;
static int prg_banks;
static int chr_banks;
static Mirroring mirroring;
static int battery;
//@ 14

// The cartridge's memory.
static uint8_t *prg = NULL;      // program ROM: prg_banks * 16 KB
static long prg_size = 0;
static uint8_t *chr = NULL;      // pattern tables: CHR ROM, or 8 KB of CHR RAM
static int chr_is_ram = 0;
static uint8_t prg_ram[0x2000];  // 6000-7FFF
//@ end
//@ 30
static long chr_size = 0;

// Where each window of the CPU's and the PPU's view starts in prg and chr.
// The mapper changes these; reads and writes just follow them.
static long prg_map[4];          // 8 KB windows: 8000, A000, C000, E000
static long chr_map[8];          // 1 KB windows: 0000, 0400, ... 1C00

// The mappers' registers.
static uint8_t bank;             // mappers 2 and 3: their one register
//@ end
//@ 31
static uint8_t mmc1_shift;       // MMC1: the serial port; the 1 marks where the 5 bits end
static uint8_t mmc1_control;     // mirroring (bits 0-1), PRG mode (2-3), CHR mode (4)
static uint8_t mmc1_chr0, mmc1_chr1, mmc1_prg;
//@ end
//@ 32
static uint8_t mmc3_select;      // MMC3: which register 8001 fills (bits 0-2), PRG mode (6), CHR mode (7)
static uint8_t mmc3_regs[8];     // R0-R7: the banks
//@ end
//@ 33
static uint8_t irq_latch;        // MMC3's scanline counter
static uint8_t irq_counter;
static int irq_reload;
static int irq_enabled;
static int irq_line;             // 1 while the cartridge asks the CPU for an IRQ
//@ end
//@ 30

// Point 8 KB window w (0-3, for 8000-E000) at 8 KB bank n of PRG. A negative
// n counts from the end: -1 is the last bank. Numbers past the end wrap.
static void map_prg(int w, int n) {
    int count = (int)(prg_size / 0x2000);
    if (count == 0) {
        prg_map[w] = 0;
        return;
    }
    n %= count;
    if (n < 0) {
        n += count;
    }
    prg_map[w] = n * 0x2000L;
}

// Point 1 KB window w (0-7, for 0000-1C00) at 1 KB bank n of CHR.
static void map_chr(int w, int n) {
    int count = (int)(chr_size / 0x400);
    n %= count;
    if (n < 0) {
        n += count;
    }
    chr_map[w] = n * 0x400L;
}

// Work out every window from the mapper's registers.
static void update_banks(void) {
    switch (mapper) {
    case 0:                                         // NROM: nothing switches
        for (int i = 0; i < 4; i++) map_prg(i, i);  // 16 KB: windows 2-3 wrap to banks 0-1
        for (int i = 0; i < 8; i++) map_chr(i, i);
        break;
    case 2:                                         // UxROM: 16 KB at 8000 switches, the last 16 KB stays at C000
        map_prg(0, bank * 2);
        map_prg(1, bank * 2 + 1);
        map_prg(2, -2);
        map_prg(3, -1);
        for (int i = 0; i < 8; i++) map_chr(i, i);
        break;
    case 3:                                         // CNROM: all 8 KB of CHR switch at once
        for (int i = 0; i < 4; i++) map_prg(i, i);
        for (int i = 0; i < 8; i++) map_chr(i, bank * 8 + i);
        break;
//@ end
//@ 31
    case 1: {                                       // MMC1
        int b = mmc1_prg & 0x0F;
        switch ((mmc1_control >> 2) & 3) {
        case 0:
        case 1:                                     // 32 KB at once (the low bit is ignored)
            for (int i = 0; i < 4; i++) map_prg(i, (b & ~1) * 2 + i);
            break;
        case 2:                                     // the first 16 KB stays at 8000, C000 switches
            map_prg(0, 0);
            map_prg(1, 1);
            map_prg(2, b * 2);
            map_prg(3, b * 2 + 1);
            break;
        case 3:                                     // 8000 switches, the last 16 KB stays at C000
            map_prg(0, b * 2);
            map_prg(1, b * 2 + 1);
            map_prg(2, -2);
            map_prg(3, -1);
            break;
        }
        if (mmc1_control & 0x10) {                  // two 4 KB CHR banks
            for (int i = 0; i < 4; i++) {
                map_chr(i, mmc1_chr0 * 4 + i);
                map_chr(4 + i, mmc1_chr1 * 4 + i);
            }
        } else {                                    // one 8 KB bank (the low bit is ignored)
            for (int i = 0; i < 8; i++) map_chr(i, (mmc1_chr0 & ~1) * 4 + i);
        }
        static const Mirroring MMC1_MIRRORING[4] = { MIRROR_ONE_LOW, MIRROR_ONE_HIGH, MIRROR_VERTICAL, MIRROR_HORIZONTAL };
        mirroring = MMC1_MIRRORING[mmc1_control & 3];
        break;
    }
//@ end
//@ 32
    case 4: {                                       // MMC3
        const uint8_t *r = mmc3_regs;
        if (mmc3_select & 0x40) {                   // PRG mode 1: R6 at C000, the second-last bank at 8000
            map_prg(0, -2);
            map_prg(2, r[6]);
        } else {                                    // PRG mode 0: R6 at 8000, the second-last bank at C000
            map_prg(0, r[6]);
            map_prg(2, -2);
        }
        map_prg(1, r[7]);
        map_prg(3, -1);
        int inv = (mmc3_select & 0x80) ? 4 : 0;    // CHR mode 1 swaps the two halves
        map_chr(0 ^ inv, r[0] & 0xFE);              // R0 and R1 are 2 KB banks
        map_chr(1 ^ inv, r[0] | 1);
        map_chr(2 ^ inv, r[1] & 0xFE);
        map_chr(3 ^ inv, r[1] | 1);
        map_chr(4 ^ inv, r[2]);                     // R2-R5 are 1 KB banks
        map_chr(5 ^ inv, r[3]);
        map_chr(6 ^ inv, r[4]);
        map_chr(7 ^ inv, r[5]);
        break;
    }
//@ end
//@ 30
    }
}

// Every mapper register back to its power-on value.
static void reset_mapper(void) {
    bank = 0;
//@ end
//@ 31
    mmc1_shift = 0x10;
    mmc1_control = 0x0C;                            // PRG mode 3: the last bank at C000, where the reset vector is
    mmc1_chr0 = mmc1_chr1 = mmc1_prg = 0;
//@ end
//@ 32
    mmc3_select = 0;
    memset(mmc3_regs, 0, sizeof mmc3_regs);
//@ end
//@ 33
    irq_latch = irq_counter = 0;
    irq_reload = irq_enabled = irq_line = 0;
//@ end
//@ 30
    update_banks();
}
//@ end

int cart_load(const uint8_t *data, long size) {
    if (size < 16) {
        return CART_TOO_SHORT;
    }
    if (data[0] != 'N' || data[1] != 'E' || data[2] != 'S' || data[3] != 0x1A) {
        return CART_NOT_INES;
    }
    int new_prg_banks = data[4];
    int new_chr_banks = data[5];
    uint8_t flags6 = data[6];
    uint8_t flags7 = data[7];
    long trainer = (flags6 & 0x04) ? 512 : 0;
    long needed = 16 + trainer + new_prg_banks * 0x4000L + new_chr_banks * 0x2000L;
    if (size < needed) {
        return CART_TOO_SHORT;
    }
    int new_mapper = (flags7 & 0xF0) | (flags6 >> 4);
//@ 14-29
    if (new_mapper != 0) {
//@ end
//@ 30-30
    if (new_mapper != 0 && new_mapper != 2 && new_mapper != 3) {
//@ end
//@ 31-31
    if (new_mapper > 3) {
//@ end
//@ 32
    if (new_mapper > 4) {
//@ end
//@ 14
        return CART_UNSUPPORTED_MAPPER;
    }

    // Copy the ROMs into memory of our own, replacing any earlier cartridge.
    long new_prg_size = new_prg_banks * 0x4000L;
//@ end
//@ 14-29
    long chr_size = new_chr_banks ? new_chr_banks * 0x2000L : 0x2000L;
//@ end
//@ 30
    long new_chr_size = new_chr_banks ? new_chr_banks * 0x2000L : 0x2000L;
//@ end
//@ 14-29
    uint8_t *new_prg = malloc(new_prg_size);
    uint8_t *new_chr = malloc(chr_size);
//@ end
//@ 30
    uint8_t *new_prg = malloc(new_prg_size);
    uint8_t *new_chr = malloc(new_chr_size);
//@ end
//@ 14
    if (new_prg == NULL || new_chr == NULL) {
        free(new_prg);
        free(new_chr);
        return CART_NO_MEMORY;
    }
    const uint8_t *rom = data + 16 + trainer;
    memcpy(new_prg, rom, new_prg_size);
//@ end
//@ 14-29
    if (new_chr_banks) {
        memcpy(new_chr, rom + new_prg_size, chr_size);
    } else {
        memset(new_chr, 0, chr_size);
    }
//@ end
//@ 30
    if (new_chr_banks) {
        memcpy(new_chr, rom + new_prg_size, new_chr_size);
    } else {
        memset(new_chr, 0, new_chr_size);
    }
    chr_size = new_chr_size;
//@ end
//@ 14
    free(prg);
    free(chr);
    prg = new_prg;
    prg_size = new_prg_size;
    chr = new_chr;
    chr_is_ram = new_chr_banks == 0;
    memset(prg_ram, 0, sizeof prg_ram);
//@ end

    mapper = new_mapper;
    prg_banks = new_prg_banks;
    chr_banks = new_chr_banks;
    mirroring = (flags6 & 0x01) ? MIRROR_VERTICAL : MIRROR_HORIZONTAL;
    battery = (flags6 & 0x02) != 0;
//@ 30
    reset_mapper();
//@ end
    return CART_OK;
}

int cart_mapper(void) { return mapper; }
int cart_prg_banks(void) { return prg_banks; }
int cart_chr_banks(void) { return chr_banks; }
Mirroring cart_mirroring(void) { return mirroring; }
int cart_has_battery(void) { return battery; }
//@ 14-29

uint8_t cart_cpu_read(uint16_t addr) {
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram[addr - 0x6000];
    }
    if (addr >= 0x8000 && prg_size > 0) {
        return prg[(addr - 0x8000) % prg_size];
    }
    return 0;
}

void cart_cpu_write(uint16_t addr, uint8_t value) {
    if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram[addr - 0x6000] = value;
    }
}

uint8_t cart_ppu_read(uint16_t addr) {
    if (chr == NULL) {
        return 0;
    }
    return chr[addr & 0x1FFF];
}

void cart_ppu_write(uint16_t addr, uint8_t value) {
    if (chr != NULL && chr_is_ram) {
        chr[addr & 0x1FFF] = value;
    }
}
//@ end
//@ 31

// MMC1 takes its registers one bit at a time: five writes of bit 0, and the
// address of the fifth write says which register gets them.
static void mmc1_write(uint16_t addr, uint8_t value) {
    if (value & 0x80) {                             // bit 7: start again
        mmc1_shift = 0x10;
        mmc1_control |= 0x0C;
        return;
    }
    int full = mmc1_shift & 1;                      // the marker reached bit 0: this is the fifth bit
    mmc1_shift = (uint8_t)((mmc1_shift >> 1) | ((value & 1) << 4));
    if (full) {
        switch ((addr >> 13) & 3) {
        case 0: mmc1_control = mmc1_shift; break;   // 8000-9FFF
        case 1: mmc1_chr0 = mmc1_shift; break;      // A000-BFFF
        case 2: mmc1_chr1 = mmc1_shift; break;      // C000-DFFF
        case 3: mmc1_prg = mmc1_shift; break;       // E000-FFFF
        }
        mmc1_shift = 0x10;
    }
}
//@ end
//@ 32

// MMC3 has pairs of registers: even and odd addresses in each 8 KB range.
static void mmc3_write(uint16_t addr, uint8_t value) {
    int odd = addr & 1;
    switch (addr & 0xE000) {
    case 0x8000:
        if (!odd) {
            mmc3_select = value;
        } else {
            mmc3_regs[mmc3_select & 7] = value;
        }
        break;
    case 0xA000:
        if (!odd) {                                 // the odd one protects PRG RAM: ignored here
            mirroring = (value & 1) ? MIRROR_HORIZONTAL : MIRROR_VERTICAL;
        }
        break;
//@ end
//@ 33
    case 0xC000:
        if (!odd) {
            irq_latch = value;                      // the count to start from
        } else {
            irq_counter = 0;                        // reload at the next scanline
            irq_reload = 1;
        }
        break;
    case 0xE000:
        if (!odd) {
            irq_enabled = 0;                        // off, and the IRQ is acknowledged
            irq_line = 0;
        } else {
            irq_enabled = 1;
        }
        break;
//@ end
//@ 32
    }
}
//@ end
//@ 30

uint8_t cart_cpu_read(uint16_t addr) {
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram[addr - 0x6000];
    }
    if (addr >= 0x8000 && prg_size > 0) {
        return prg[prg_map[(addr - 0x8000) >> 13] + (addr & 0x1FFF)];
    }
    return 0;
}

void cart_cpu_write(uint16_t addr, uint8_t value) {
    if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram[addr - 0x6000] = value;
        return;
    }
    if (addr < 0x8000) {
        return;
    }
    switch (mapper) {                               // ROM can't be written: these writes go to the mapper
    case 2:
    case 3:
        bank = value;
        break;
//@ end
//@ 31
    case 1:
        mmc1_write(addr, value);
        break;
//@ end
//@ 32
    case 4:
        mmc3_write(addr, value);
        break;
//@ end
//@ 30
    }
    update_banks();
}

uint8_t cart_ppu_read(uint16_t addr) {
    if (chr == NULL) {
        return 0;
    }
    addr &= 0x1FFF;
    return chr[chr_map[addr >> 10] + (addr & 0x03FF)];
}

void cart_ppu_write(uint16_t addr, uint8_t value) {
    if (chr != NULL && chr_is_ram) {
        addr &= 0x1FFF;
        chr[chr_map[addr >> 10] + (addr & 0x03FF)] = value;
    }
}
//@ end
//@ 33

// The PPU calls this once per scanline while it draws (see ppu.c).
void cart_scanline(void) {
    if (mapper != 4) {
        return;
    }
    if (irq_counter == 0 || irq_reload) {
        irq_counter = irq_latch;
        irq_reload = 0;
    } else {
        irq_counter--;
    }
    if (irq_counter == 0 && irq_enabled) {
        irq_line = 1;
    }
}

int cart_irq(void) {
    return irq_line;
}
//@ end
