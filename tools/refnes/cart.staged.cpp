#include "cart.h"

LoadResult Cartridge::load(const std::vector<std::uint8_t>& file) {
    if (file.size() < 16) {
        return LoadResult::TooShort;
    }
    if (file[0] != 'N' || file[1] != 'E' || file[2] != 'S' || file[3] != 0x1A) {
        return LoadResult::NotInes;
    }
    int new_prg_banks = file[4];
    int new_chr_banks = file[5];
    std::uint8_t flags6 = file[6];
    std::uint8_t flags7 = file[7];
    std::size_t trainer = (flags6 & 0x04) ? 512 : 0;
    std::size_t needed = 16 + trainer + new_prg_banks * 0x4000 + new_chr_banks * 0x2000;
    if (file.size() < needed) {
        return LoadResult::TooShort;
    }
    int new_mapper = (flags7 & 0xF0) | (flags6 >> 4);
//@ 14-29
    if (new_mapper != 0) {
        return LoadResult::UnsupportedMapper;
    }
//@ end
//@ 14

    // Copy the ROMs into memory of our own, replacing any earlier cartridge.
    auto rom = file.begin() + 16 + trainer;
    auto chr_start = rom + new_prg_banks * 0x4000;
    prg_.assign(rom, chr_start);
    if (new_chr_banks) {
        chr_.assign(chr_start, chr_start + new_chr_banks * 0x2000);
    } else {
        chr_.assign(0x2000, 0);                     // 8 KB of CHR RAM, cleared
    }
    chr_is_ram_ = new_chr_banks == 0;
    prg_ram_.fill(0);
//@ end

    mapper_ = new_mapper;
    prg_banks_ = new_prg_banks;
    chr_banks_ = new_chr_banks;
    mirroring_ = (flags6 & 0x01) ? Mirroring::Vertical : Mirroring::Horizontal;
    battery_ = (flags6 & 0x02) != 0;
    return LoadResult::Ok;
}
//@ 14-29

std::uint8_t Cartridge::cpu_read(std::uint16_t addr) {
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram_[addr - 0x6000];
    }
    if (addr >= 0x8000 && !prg_.empty()) {
        return prg_[(addr - 0x8000) % prg_.size()];
    }
    return 0;
}

void Cartridge::cpu_write(std::uint16_t addr, std::uint8_t value) {
    if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram_[addr - 0x6000] = value;
    }
}

std::uint8_t Cartridge::ppu_read(std::uint16_t addr) {
    if (chr_.empty()) {
        return 0;
    }
    return chr_[addr & 0x1FFF];
}

void Cartridge::ppu_write(std::uint16_t addr, std::uint8_t value) {
    if (chr_is_ram_) {
        chr_[addr & 0x1FFF] = value;
    }
}
//@ end
