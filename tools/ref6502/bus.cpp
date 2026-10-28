#include "bus.h"

void Bus::reset() {
    ram_.fill(0);
    prg_ram_.fill(0);
}

void Bus::load_prg(const std::vector<std::uint8_t>& prg) {
    prg_rom_ = prg;
}

std::uint8_t Bus::read(std::uint16_t addr) {
    if (addr < 0x2000) {
        return ram_[addr & 0x7FF];
    }
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram_[addr - 0x6000];
    }
    if (addr >= 0x8000 && !prg_rom_.empty()) {
        return prg_rom_[(addr - 0x8000) % prg_rom_.size()];
    }
    return 0;
}

void Bus::write(std::uint16_t addr, std::uint8_t value) {
    if (addr < 0x2000) {
        ram_[addr & 0x7FF] = value;
    } else if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram_[addr - 0x6000] = value;
    }
}

const char* Bus::region(std::uint16_t addr) const {
    if (addr < 0x2000) return "RAM";
    if (addr < 0x4000) return "PPU";
    if (addr < 0x4018) return "APU/IO";
    if (addr < 0x4020) return "Disabled";
    if (addr < 0x6000) return "Expansion";
    if (addr < 0x8000) return "Cartridge RAM";
    return "Cartridge ROM";
}

std::uint16_t Bus::read16(std::uint16_t addr) {
    std::uint16_t lo = read(addr);
    std::uint16_t hi = read(static_cast<std::uint16_t>(addr + 1));
    return static_cast<std::uint16_t>(hi << 8 | lo);
}
