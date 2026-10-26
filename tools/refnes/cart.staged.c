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
//@ 14
    if (new_mapper != 0) {
        return CART_UNSUPPORTED_MAPPER;
    }

    // Copy the ROMs into memory of our own, replacing any earlier cartridge.
    long new_prg_size = new_prg_banks * 0x4000L;
    long chr_size = new_chr_banks ? new_chr_banks * 0x2000L : 0x2000L;
    uint8_t *new_prg = malloc(new_prg_size);
    uint8_t *new_chr = malloc(chr_size);
    if (new_prg == NULL || new_chr == NULL) {
        free(new_prg);
        free(new_chr);
        return CART_NO_MEMORY;
    }
    const uint8_t *rom = data + 16 + trainer;
    memcpy(new_prg, rom, new_prg_size);
    if (new_chr_banks) {
        memcpy(new_chr, rom + new_prg_size, chr_size);
    } else {
        memset(new_chr, 0, chr_size);
    }
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
    return CART_OK;
}

int cart_mapper(void) { return mapper; }
int cart_prg_banks(void) { return prg_banks; }
int cart_chr_banks(void) { return chr_banks; }
Mirroring cart_mirroring(void) { return mirroring; }
int cart_has_battery(void) { return battery; }
//@ 14

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
