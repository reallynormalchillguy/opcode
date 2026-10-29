#include "ppu.h"
//@ 21
#include "palette.h"
//@ end

void Ppu::reset() {
    vram_.fill(0);
    palette_ram_.fill(0);
//@ 18
    ctrl_ = 0;
    status_ = 0;
//@ end
//@ 18-27
    vram_addr_ = 0;
    write_latch_ = false;
//@ end
//@ 18
    read_buffer_ = 0;
//@ end
//@ 19
    mask_ = 0;
    oam_addr_ = 0;
    oam_.fill(0);
//@ end
//@ 19-27
    scroll_x_ = 0;
    scroll_y_ = 0;
//@ end
//@ 20
    scanline_ = 0;
    dot_ = 0;
    nmi_pending_ = false;
    frame_ready_ = false;
//@ end
//@ 21
    pixels_.assign(pixels_.size(), 0);
//@ end
}

// ---------- Memory ----------

std::uint16_t Ppu::nametable_index(std::uint16_t addr) const {
    int offset = (addr - 0x2000) & 0x0FFF;          // 0000-0FFF: four 1 KB tables
    int table = offset / 0x400;                     // 0, 1, 2 or 3
    int physical;
//@ 16-30
    if (cart_.mirroring() == Mirroring::Vertical) {
        physical = table & 1;                       // 0 1 / 0 1
    } else {
        physical = table >> 1;                      // 0 0 / 1 1
    }
//@ end
    return static_cast<std::uint16_t>(physical * 0x400 + (offset & 0x3FF));
}

int Ppu::palette_index(std::uint16_t addr) const {
    int i = addr & 0x1F;
    // 3F10, 3F14, 3F18 and 3F1C are the same bytes as 3F00, 3F04, 3F08, 3F0C.
    if ((i & 0x13) == 0x10) {
        i &= 0x0F;
    }
    return i;
}

std::uint8_t Ppu::read(std::uint16_t addr) {
    addr &= 0x3FFF;
    if (addr < 0x2000) {
        return cart_.ppu_read(addr);
    }
    if (addr < 0x3F00) {
        return vram_[nametable_index(addr)];
    }
    return palette_ram_[palette_index(addr)];
}

void Ppu::write(std::uint16_t addr, std::uint8_t value) {
    addr &= 0x3FFF;
    if (addr < 0x2000) {
        cart_.ppu_write(addr, value);
    } else if (addr < 0x3F00) {
        vram_[nametable_index(addr)] = value;
    } else {
        palette_ram_[palette_index(addr)] = value;
    }
}
//@ 17

// ---------- Tiles ----------

// A tile is 16 bytes: 8 bytes for bit 0 of each pixel (one byte per row),
// then 8 bytes for bit 1. In each byte, bit 7 is the leftmost pixel.
std::array<std::uint8_t, 8> Ppu::tile_row(std::uint16_t table, std::uint8_t tile, int row) {
    auto base = static_cast<std::uint16_t>(table + tile * 16 + row);
    std::uint8_t lo = read(base);
    std::uint8_t hi = read(static_cast<std::uint16_t>(base + 8));
    std::array<std::uint8_t, 8> out{};
    for (int x = 0; x < 8; x++) {
        int bit = 7 - x;
        out[x] = static_cast<std::uint8_t>(((lo >> bit) & 1) | (((hi >> bit) & 1) << 1));
    }
    return out;
}
//@ end
//@ 18

// ---------- The CPU's view: 2000-2007 ----------

std::uint8_t Ppu::register_read(int reg) {
    switch (reg) {
    case 2: {                                       // PPUSTATUS
        auto value = static_cast<std::uint8_t>((status_ & 0xE0) | (read_buffer_ & 0x1F));
//@ end
//@ 20
        status_ &= 0x7F;                            // reading clears the vblank flag
//@ end
//@ 18-27
        write_latch_ = false;                       // and resets the 2005/2006 latch
//@ end
//@ 18
        return value;
    }
//@ end
//@ 19
    case 4:                                         // OAMDATA
        return oam_[oam_addr_];
//@ end
//@ 18
    case 7: {                                       // PPUDATA
//@ end
//@ 18-27
        std::uint16_t addr = vram_addr_ & 0x3FFF;
//@ end
//@ 18
        std::uint8_t value;
        if (addr >= 0x3F00) {
            value = read(addr);                     // the palette answers at once
            read_buffer_ = read(static_cast<std::uint16_t>(addr - 0x1000));
        } else {
            value = read_buffer_;                   // everything else is one read late
            read_buffer_ = read(addr);
        }
//@ end
//@ 18-27
        vram_addr_ = static_cast<std::uint16_t>((vram_addr_ + ((ctrl_ & 0x04) ? 32 : 1)) & 0x3FFF);
//@ end
//@ 18
        return value;
    }
    }
    return 0;
}

void Ppu::register_write(int reg, std::uint8_t value) {
    switch (reg) {
    case 0:                                         // PPUCTRL
//@ end
//@ 20
        // Turning NMIs on during the vertical blank raises one straight away.
        if (!(ctrl_ & 0x80) && (value & 0x80) && (status_ & 0x80)) {
            nmi_pending_ = true;
        }
//@ end
//@ 18
        ctrl_ = value;
        break;
//@ end
//@ 19
    case 1:                                         // PPUMASK
        mask_ = value;
        break;
    case 3:                                         // OAMADDR
        oam_addr_ = value;
        break;
    case 4:                                         // OAMDATA
        oam_[oam_addr_++] = value;
        break;
//@ end
//@ 19-27
    case 5:                                         // PPUSCROLL
        if (!write_latch_) {
            scroll_x_ = value;
        } else {
            scroll_y_ = value;
        }
        write_latch_ = !write_latch_;
        break;
//@ end
//@ 18-27
    case 6:                                         // PPUADDR: high byte, then low byte
        if (!write_latch_) {
            vram_addr_ = static_cast<std::uint16_t>(((value & 0x3F) << 8) | (vram_addr_ & 0x00FF));
        } else {
            vram_addr_ = static_cast<std::uint16_t>((vram_addr_ & 0xFF00) | value);
        }
        write_latch_ = !write_latch_;
        break;
    case 7:                                         // PPUDATA
        write(vram_addr_, value);
        vram_addr_ = static_cast<std::uint16_t>((vram_addr_ + ((ctrl_ & 0x04) ? 32 : 1)) & 0x3FFF);
        break;
//@ end
//@ 18
    }
}
//@ end
//@ 21

// ---------- Drawing ----------

//@ end
//@ 21-23
// Draw scanline y of the background, using the scroll position and the
// nametable chosen in PPUCTRL.
void Ppu::render_scanline(int y) {
    std::uint32_t* row = &pixels_[y * kPpuWidth];
    std::uint32_t backdrop = kNesPalette[read(0x3F00) & 0x3F];
    if (!(mask_ & 0x08)) {                          // background off
        for (int x = 0; x < kPpuWidth; x++) row[x] = backdrop;
        return;
    }
    // The four nametables form a 512 x 480 world; the screen is a window on it.
    int origin_x = ((ctrl_ & 0x01) ? 256 : 0) + scroll_x_;
    int origin_y = ((ctrl_ & 0x02) ? 240 : 0) + scroll_y_;
    std::uint16_t pattern_table = (ctrl_ & 0x10) ? 0x1000 : 0x0000;
    int wy = (origin_y + y) % 480;
    for (int x = 0; x < kPpuWidth; x++) {
        if (x < 8 && !(mask_ & 0x02)) {             // left column hidden
            row[x] = backdrop;
            continue;
        }
        int wx = (origin_x + x) % 512;
        int table = (wx / 256) + 2 * (wy / 240);
        int tx = (wx % 256) / 8;                    // tile column, 0-31
        int ty = (wy % 240) / 8;                    // tile row, 0-29
        auto nt = static_cast<std::uint16_t>(0x2000 + table * 0x400);
        std::uint8_t tile = read(static_cast<std::uint16_t>(nt + ty * 32 + tx));
        std::uint8_t attr = read(static_cast<std::uint16_t>(nt + 0x3C0 + (ty / 4) * 8 + tx / 4));
        int shift = ((ty & 2) << 1) | (tx & 2);     // which 2 bits of the attribute byte
        int pal = (attr >> shift) & 3;
        int c = tile_row(pattern_table, tile, (wy % 240) % 8)[wx % 8];
        std::uint8_t colour = c == 0 ? read(0x3F00) : read(static_cast<std::uint16_t>(0x3F00 + pal * 4 + c));
        row[x] = kNesPalette[colour & 0x3F];
    }
}
//@ end
//@ 20

// ---------- Timing ----------

void Ppu::tick() {
//@ end
//@ 21
    if (scanline_ < kPpuHeight && dot_ == 256) {
        render_scanline(scanline_);
    }
//@ end
//@ 20
    if (scanline_ == 241 && dot_ == 1) {            // the vertical blank starts
        status_ |= 0x80;
        frame_ready_ = true;
        if (ctrl_ & 0x80) {
            nmi_pending_ = true;
        }
    }
    if (scanline_ == 261 && dot_ == 1) {            // the pre-render line
        status_ &= 0x1F;
    }
    dot_++;
    if (dot_ > 340) {
        dot_ = 0;
        scanline_++;
        if (scanline_ > 261) {
            scanline_ = 0;
        }
    }
}

bool Ppu::take_nmi() {
    bool n = nmi_pending_;
    nmi_pending_ = false;
    return n;
}

bool Ppu::take_frame() {
    bool f = frame_ready_;
    frame_ready_ = false;
    return f;
}
//@ end
