#pragma once
#include <array>
#include <cstdint>
#include <vector>

// How the PPU's 2 KB of nametable memory appears in its four nametable slots.
enum class Mirroring {
    Horizontal,  // 2000 = 2400 and 2800 = 2C00 (for games that scroll up and down)
    Vertical,    // 2000 = 2800 and 2400 = 2C00 (for games that scroll sideways)
};

// What Cartridge::load returns.
enum class LoadResult {
    Ok,
    NotInes,            // the file does not start with "NES" and 1A
    TooShort,           // the file is shorter than its header says
    UnsupportedMapper,  // a mapper this emulator does not have yet
};

// A game cartridge: its ROM chips, its RAM, and how they are wired.
class Cartridge {
public:
    // Read an iNES file that is already in memory. On success, the new
    // cartridge replaces any earlier one; on failure, nothing changes.
    LoadResult load(const std::vector<std::uint8_t>& file);

    // What the header said.
    int mapper() const { return mapper_; }
    int prg_banks() const { return prg_banks_; }   // in 16 KB units
    int chr_banks() const { return chr_banks_; }   // in 8 KB units; 0 means 8 KB of CHR RAM instead
    Mirroring mirroring() const { return mirroring_; }
    bool has_battery() const { return battery_; }

    // The cartridge as the CPU sees it: 4020-FFFF.
    std::uint8_t cpu_read(std::uint16_t addr);
    void cpu_write(std::uint16_t addr, std::uint8_t value);

    // The cartridge as the PPU sees it: pattern tables at 0000-1FFF.
    std::uint8_t ppu_read(std::uint16_t addr);
    void ppu_write(std::uint16_t addr, std::uint8_t value);

private:
    // What the header says.
    int mapper_ = 0;
    int prg_banks_ = 0;
    int chr_banks_ = 0;
    Mirroring mirroring_ = Mirroring::Horizontal;
    bool battery_ = false;

    // The cartridge's memory.
    std::vector<std::uint8_t> prg_;                // program ROM: prg_banks * 16 KB
    std::vector<std::uint8_t> chr_;                // pattern tables: CHR ROM, or 8 KB of CHR RAM
    bool chr_is_ram_ = false;
    std::array<std::uint8_t, 0x2000> prg_ram_{};   // 6000-7FFF
};
