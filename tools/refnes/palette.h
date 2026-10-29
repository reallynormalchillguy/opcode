#pragma once
#include <array>
#include <cstdint>

// The 64 colours the NES can show, as 0x00RRGGBB. The PPU stores colour
// numbers 0x00-0x3F in its palette RAM; this table turns them into RGB.
extern const std::array<std::uint32_t, 64> kNesPalette;
