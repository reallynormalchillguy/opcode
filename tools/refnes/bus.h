#pragma once
#include <array>
#include <cstdint>
#include "cart.h"
//@ 19
#include "ppu.h"
//@ end
//@ 26
#include "controller.h"
//@ end

// The CPU bus: every address the CPU can read or write goes through here.
class Bus {
public:
//@ 15-18
    explicit Bus(Cartridge& cart) : cart_(cart) {}
//@ end
//@ 19-25
    Bus(Cartridge& cart, Ppu& ppu) : cart_(cart), ppu_(ppu) {}
//@ end
//@ 26
    Bus(Cartridge& cart, Ppu& ppu, Controllers& controllers) : cart_(cart), ppu_(ppu), controllers_(controllers) {}
//@ end

    // Clear the work RAM.
    void reset();

    // Read or write one byte, wherever the address leads.
    std::uint8_t read(std::uint16_t addr);
    void write(std::uint16_t addr, std::uint8_t value);

    // Name of the part of the console an address reaches.
    const char* region(std::uint16_t addr) const;

    // Read a 16-bit little-endian value through read().
    std::uint16_t read16(std::uint16_t addr);
//@ 22

    // How many cycles the CPU has to wait because of an OAM DMA (a write to
    // 4014). Returns them once, then 0 until the next DMA.
    int take_stall();
//@ end

private:
    std::array<std::uint8_t, 0x800> ram_{};   // 2 KB of work RAM
    Cartridge& cart_;                         // 4020-FFFF
//@ 19
    Ppu& ppu_;                                // its registers at 2000-3FFF
//@ end
//@ 26
    Controllers& controllers_;                // 4016 and 4017
//@ end
//@ 22
    int stall_ = 0;                           // cycles the CPU has to wait after an OAM DMA
//@ end
};
