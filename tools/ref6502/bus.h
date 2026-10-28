#pragma once
#include <array>
#include <cstdint>
#include <vector>

// The CPU bus: every address the CPU can read or write goes through here.
class Bus {
public:
    // Clear the work RAM and the cartridge RAM.
    void reset();

    // Read or write one byte. read() is not const: on the real console,
    // reading some addresses changes something (a PPU register, for example).
    std::uint8_t read(std::uint16_t addr);
    void write(std::uint16_t addr, std::uint8_t value);

    // Name of the part of the console an address reaches.
    const char* region(std::uint16_t addr) const;

    // Plug in a mapper 0 cartridge's program ROM (16 KB or 32 KB).
    void load_prg(const std::vector<std::uint8_t>& prg);

    // Read a 16-bit little-endian value through read().
    std::uint16_t read16(std::uint16_t addr);

private:
    std::array<std::uint8_t, 0x800> ram_{};       // 2 KB of work RAM
    std::array<std::uint8_t, 0x2000> prg_ram_{};  // 8 KB of cartridge RAM at 6000-7FFF
    std::vector<std::uint8_t> prg_rom_;           // the program ROM; empty until load_prg
};
