#pragma once
#include <array>
#include <cstdint>
#include <vector>
//@ 30
#include <memory>
//@ end

// How the PPU's 2 KB of nametable memory appears in its four nametable slots.
enum class Mirroring {
    Horizontal,  // 2000 = 2400 and 2800 = 2C00 (for games that scroll up and down)
    Vertical,    // 2000 = 2800 and 2400 = 2C00 (for games that scroll sideways)
//@ 31
    OneLow,      // all four are the first 1 KB (one-screen, set by some mappers)
    OneHigh,     // all four are the second 1 KB
//@ end
};

// What Cartridge::load returns.
enum class LoadResult {
    Ok,
    NotInes,            // the file does not start with "NES" and 1A
    TooShort,           // the file is shorter than its header says
    UnsupportedMapper,  // a mapper this emulator does not have yet
};
//@ 30

// The chip on the cartridge that decides which banks of PRG and CHR the CPU
// and the PPU see. Each kind of mapper is a class derived from this one.
//
// The CPU's 8000-FFFF is cut into four 8 KB windows and the PPU's 0000-1FFF
// into eight 1 KB windows. For each window the mapper keeps where it starts
// in PRG or CHR; reads just follow those offsets.
class Mapper {
public:
    Mapper(std::size_t prg_size, std::size_t chr_size, Mirroring mirroring)
        : mirroring_(mirroring), prg_size_(prg_size), chr_size_(chr_size) {}
    virtual ~Mapper() = default;

    // Power on: the mapper's registers to their first values, and the windows.
    virtual void reset() = 0;

    // The CPU writes to 8000-FFFF. That is ROM, so the mapper takes the byte
    // as a command.
    virtual void write(std::uint16_t addr, std::uint8_t value) = 0;
//@ end
//@ 33

    // The PPU calls this once per scanline while it draws. Only MMC3 counts.
    virtual void scanline() {}

    // True while the mapper asks the CPU for an IRQ.
    virtual bool irq() const { return false; }
//@ end
//@ 30

    // The mirroring the cartridge has now: some mappers change it.
    Mirroring mirroring() const { return mirroring_; }

    // Where CPU address 8000-FFFF, and PPU address 0000-1FFF, are in PRG and CHR.
    std::size_t prg_offset(std::uint16_t addr) const { return prg_map_[(addr - 0x8000) >> 13] + (addr & 0x1FFF); }
    std::size_t chr_offset(std::uint16_t addr) const { return chr_map_[(addr >> 10) & 7] + (addr & 0x03FF); }

protected:
    // Point 8 KB window w (0-3, for 8000-E000) at 8 KB bank n of PRG, or 1 KB
    // window w (0-7, for 0000-1C00) at 1 KB bank n of CHR. A negative n counts
    // from the end: -1 is the last bank. Numbers past the end wrap around.
    void map_prg(int w, int n);
    void map_chr(int w, int n);
    Mirroring mirroring_;

private:
    std::size_t prg_size_;
    std::size_t chr_size_;
    std::array<std::size_t, 4> prg_map_{};
    std::array<std::size_t, 8> chr_map_{};
};

// Mapper 0, NROM: nothing switches.
class Nrom : public Mapper {
public:
    using Mapper::Mapper;   // the same constructor as Mapper's
    void reset() override;
    void write(std::uint16_t addr, std::uint8_t value) override;
};

// Mapper 2, UxROM: 16 KB at 8000 switches, the last 16 KB stays at C000.
class Uxrom : public Mapper {
public:
    using Mapper::Mapper;   // the same constructor as Mapper's
    void reset() override;
    void write(std::uint16_t addr, std::uint8_t value) override;

private:
    void update_banks();
    std::uint8_t bank_ = 0;
};

// Mapper 3, CNROM: all 8 KB of CHR switch at once.
class Cnrom : public Mapper {
public:
    using Mapper::Mapper;   // the same constructor as Mapper's
    void reset() override;
    void write(std::uint16_t addr, std::uint8_t value) override;

private:
    void update_banks();
    std::uint8_t bank_ = 0;
};
//@ end
//@ 31

// Mapper 1, MMC1: registers written one bit at a time.
class Mmc1 : public Mapper {
public:
    using Mapper::Mapper;
    void reset() override;
    void write(std::uint16_t addr, std::uint8_t value) override;

private:
    void update_banks();
    std::uint8_t shift_ = 0x10;     // the serial port; the 1 marks where the 5 bits end
    std::uint8_t control_ = 0x0C;   // mirroring (bits 0-1), PRG mode (2-3), CHR mode (4)
    std::uint8_t chr0_ = 0;
    std::uint8_t chr1_ = 0;
    std::uint8_t prg_ = 0;
};
//@ end
//@ 32

// Mapper 4, MMC3: eight bank registers and a scanline counter.
class Mmc3 : public Mapper {
public:
    using Mapper::Mapper;
    void reset() override;
    void write(std::uint16_t addr, std::uint8_t value) override;
//@ end
//@ 33
    void scanline() override;
    bool irq() const override { return irq_line_; }
//@ end
//@ 32

private:
    void update_banks();
    std::uint8_t select_ = 0;               // which register 8001 fills (bits 0-2), PRG mode (6), CHR mode (7)
    std::array<std::uint8_t, 8> r_{};       // R0-R7: the banks
//@ end
//@ 33
    std::uint8_t irq_latch_ = 0;            // the scanline counter
    std::uint8_t irq_counter_ = 0;
    bool irq_reload_ = false;
    bool irq_enabled_ = false;
    bool irq_line_ = false;                 // true while the cartridge asks the CPU for an IRQ
//@ end
//@ 32
};
//@ end

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
//@ 13-30
    Mirroring mirroring() const { return mirroring_; }
//@ end
//@ 31
    // The mirroring now: the mapper can change it while the game runs.
    Mirroring mirroring() const { return chip_ ? chip_->mirroring() : mirroring_; }
//@ end
    bool has_battery() const { return battery_; }

    // The cartridge as the CPU sees it: 4020-FFFF.
    std::uint8_t cpu_read(std::uint16_t addr);
    void cpu_write(std::uint16_t addr, std::uint8_t value);

    // The cartridge as the PPU sees it: pattern tables at 0000-1FFF.
    std::uint8_t ppu_read(std::uint16_t addr);
    void ppu_write(std::uint16_t addr, std::uint8_t value);
//@ 33

    // MMC3's scanline counter: the PPU calls scanline() once per scanline
    // while it draws, and irq() is true while the cartridge wants an IRQ.
    void scanline() { if (chip_) chip_->scanline(); }
    bool irq() const { return chip_ && chip_->irq(); }
//@ end

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
//@ 30
    std::unique_ptr<Mapper> chip_;                 // the mapper chip; empty until a cartridge is loaded
//@ end
};
