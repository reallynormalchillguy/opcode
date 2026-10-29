#include "bus.h"

void Bus::reset() {
    ram_.fill(0);
//@ 22
    stall_ = 0;
//@ end
}

std::uint8_t Bus::read(std::uint16_t addr) {
    if (addr < 0x2000) {
        return ram_[addr & 0x7FF];
    }
//@ 19
    if (addr < 0x4000) {
        return ppu_.register_read(addr & 7);
    }
//@ end
//@ 35
    if (addr == 0x4015) {                           // the sound chip's status
        return apu_.read_status();
    }
//@ end
//@ 26
    if (addr == 0x4016 || addr == 0x4017) {         // the controllers
        // Only bit 0 comes from the controller. The others keep what was last
        // on the data bus, the 40 of the address: some games check for it.
        return static_cast<std::uint8_t>(0x40 | controllers_.read(addr - 0x4016));
    }
//@ end
    if (addr >= 0x4020) {
        return cart_.cpu_read(addr);
    }
    return 0;
}

void Bus::write(std::uint16_t addr, std::uint8_t value) {
    if (addr < 0x2000) {
        ram_[addr & 0x7FF] = value;
//@ 19
    } else if (addr < 0x4000) {
        ppu_.register_write(addr & 7, value);
//@ end
//@ 22
    } else if (addr == 0x4014) {                    // OAMDMA: copy a page of memory to the sprites
        auto page = static_cast<std::uint16_t>(value << 8);
        for (int i = 0; i < 256; i++) {
            ppu_.register_write(4, read(static_cast<std::uint16_t>(page | i)));
        }
        stall_ += 513;                              // the CPU waits while it happens
//@ end
//@ 26
    } else if (addr == 0x4016) {                    // the strobe of both controllers
        controllers_.write(value);
//@ end
//@ 35
    } else if (addr <= 0x4013 && addr >= 0x4000) {  // the sound chip's channels
        apu_.write(addr, value);
    } else if (addr == 0x4015 || addr == 0x4017) {  // its switches and its frame counter
        apu_.write(addr, value);
//@ end
    } else if (addr >= 0x4020) {
        cart_.cpu_write(addr, value);
    }
}

//@ 22
int Bus::take_stall() {
    int s = stall_;
    stall_ = 0;
    return s;
}

//@ end
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
