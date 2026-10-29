#pragma once
#include <array>
#include <cstdint>
#include <vector>
#include "cart.h"

constexpr int kPpuWidth = 256;
constexpr int kPpuHeight = 240;

// The picture chip. It reads tiles from the cartridge it is given.
class Ppu {
public:
    explicit Ppu(Cartridge& cart) : cart_(cart) {}

    // Power on: clear the PPU's memory and registers.
    void reset();

    // The PPU's own bus, 0000-3FFF:
    //   0000-1FFF pattern tables (the cartridge's CHR)
    //   2000-2FFF four nametables (2 KB of video RAM, mirrored), repeated up to 3EFF
    //   3F00-3F1F palette RAM, repeated up to 3FFF
    std::uint8_t read(std::uint16_t addr);
    void write(std::uint16_t addr, std::uint8_t value);

    // Row `row` (0-7) of tile `tile` in the pattern table at `table` (0x0000
    // or 0x1000), as eight colour numbers 0-3, left to right.
    std::array<std::uint8_t, 8> tile_row(std::uint16_t table, std::uint8_t tile, int row);

    // The eight registers the CPU sees at 2000-2007. reg is 0 to 7.
    std::uint8_t register_read(int reg);
    void register_write(int reg, std::uint8_t value);

    // Advance the PPU by one dot.
    void tick();

    // Each returns true once, the first time it is asked after the event happened.
    bool take_nmi();    // the PPU wants to interrupt the CPU
    bool take_frame();  // a frame has been finished

    // Where the PPU is in the frame: scanline 0-261, dot 0-340.
    int scanline() const { return scanline_; }
    int dot() const { return dot_; }

    // The finished picture: 256 x 240 pixels, each 0x00RRGGBB.
    const std::uint32_t* pixels() const { return pixels_.data(); }

private:
    Cartridge& cart_;

    // Memory
    std::array<std::uint8_t, 0x800> vram_{};      // 2 KB: two physical nametables
    std::array<std::uint8_t, 32> palette_ram_{};
    std::uint16_t nametable_index(std::uint16_t addr) const;   // which byte of vram_ for 2000-3EFF
    int palette_index(std::uint16_t addr) const;               // which byte of palette_ram_ for 3F00-3FFF

    // Registers
    std::uint8_t ctrl_ = 0;                        // 2000 PPUCTRL
    std::uint8_t mask_ = 0;                        // 2001 PPUMASK
    std::uint8_t status_ = 0;                      // 2002 PPUSTATUS
    std::uint8_t oam_addr_ = 0;                    // 2003 OAMADDR
    std::array<std::uint8_t, 256> oam_{};          // sprite memory, used in a later lesson
    std::uint8_t scroll_x_ = 0;                    // 2005 PPUSCROLL, first write
    std::uint8_t scroll_y_ = 0;                    // 2005 PPUSCROLL, second write
    std::uint16_t vram_addr_ = 0;                  // 2006 PPUADDR: where 2007 reads and writes
    bool write_latch_ = false;                     // false: the next 2005/2006 write is the first one
    std::uint8_t read_buffer_ = 0;                 // 2007 reads are delayed by one

    // Timing
    int scanline_ = 0;                             // 0-261
    int dot_ = 0;                                  // 0-340
    bool nmi_pending_ = false;
    bool frame_ready_ = false;

    // The picture
    std::vector<std::uint32_t> pixels_ = std::vector<std::uint32_t>(kPpuWidth * kPpuHeight);
    void render_scanline(int y);                   // draw row y of pixels_
};
