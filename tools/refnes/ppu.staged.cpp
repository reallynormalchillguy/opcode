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
//@ 28
    v_ = 0;
    t_ = 0;
    fine_x_ = 0;
    w_ = false;
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
//@ 31
    switch (cart_.mirroring()) {
    case Mirroring::Vertical:
        physical = table & 1;                       // 0 1 / 0 1
        break;
    case Mirroring::Horizontal:
        physical = table >> 1;                      // 0 0 / 1 1
        break;
    case Mirroring::OneLow:
        physical = 0;                               // 0 0 / 0 0
        break;
    default:
        physical = 1;                               // 1 1 / 1 1
        break;
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
//@ 28
        w_ = false;                                 // and resets the 2005/2006 toggle
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
//@ 28
        std::uint16_t addr = v_ & 0x3FFF;
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
//@ 28
        v_ = static_cast<std::uint16_t>((v_ + ((ctrl_ & 0x04) ? 32 : 1)) & 0x7FFF);
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
//@ end
//@ 28
        t_ = static_cast<std::uint16_t>((t_ & ~0x0C00) | ((value & 0x03) << 10));   // nametable bits
//@ end
//@ 18
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
//@ 28
    case 5:                                         // PPUSCROLL
        if (!w_) {                                  // x: coarse x into t, fine x on its own
            t_ = static_cast<std::uint16_t>((t_ & ~0x001F) | (value >> 3));
            fine_x_ = value & 0x07;
        } else {                                    // y: coarse y and fine y into t
            t_ = static_cast<std::uint16_t>((t_ & ~0x73E0) | ((value & 0x07) << 12) | ((value & 0xF8) << 2));
        }
        w_ = !w_;
        break;
    case 6:                                         // PPUADDR: high byte, then low byte
        if (!w_) {
            t_ = static_cast<std::uint16_t>((t_ & 0x00FF) | ((value & 0x3F) << 8));
        } else {
            t_ = static_cast<std::uint16_t>((t_ & 0xFF00) | value);
            v_ = t_;                                // the second write sets the address
        }
        w_ = !w_;
        break;
    case 7:                                         // PPUDATA
        write(v_, value);
        v_ = static_cast<std::uint16_t>((v_ + ((ctrl_ & 0x04) ? 32 : 1)) & 0x7FFF);
        break;
//@ end
//@ 18
    }
}
//@ end
//@ 28

// The scroll registers, for tests and debuggers.
Ppu::ScrollRegs Ppu::scroll_regs() const {
    return ScrollRegs{v_, t_, fine_x_, w_};
}
//@ end
//@ 23

// ---------- Sprites ----------

// Which sprites are on scanline y. Puts the numbers (0-63) of the first eight
// into found, in OAM order, and returns how many there are in all: more than
// 8 means the PPU leaves some out.
int Ppu::sprites_on_line(int y, std::array<std::uint8_t, 8>& found) const {
    int height = (ctrl_ & 0x20) ? 16 : 8;           // PPUCTRL bit 5: 8 x 16 sprites
    int count = 0;
    for (int i = 0; i < 64; i++) {
        int top = oam_[i * 4] + 1;                  // a sprite appears one line below its Y
        if (y >= top && y < top + height) {
            if (count < 8) {
                found[count] = static_cast<std::uint8_t>(i);
            }
            count++;
        }
    }
    return count;
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
//@ end
//@ 24-28
// Draw scanline y of the background into row. bg_pixel gets the colour
// number (0-3) of every pixel: the sprites need to know where it is 0.
void Ppu::draw_background(int y, std::uint32_t* row, std::array<std::uint8_t, kPpuWidth>& bg_pixel) {
//@ end
//@ 21-28
    std::uint32_t backdrop = kNesPalette[read(0x3F00) & 0x3F];
    if (!(mask_ & 0x08)) {                          // background off
        for (int x = 0; x < kPpuWidth; x++) row[x] = backdrop;
//@ end
//@ 24-28
        bg_pixel.fill(0);
//@ end
//@ 21-28
        return;
    }
//@ end
//@ 21-27
    // The four nametables form a 512 x 480 world; the screen is a window on it.
    int origin_x = ((ctrl_ & 0x01) ? 256 : 0) + scroll_x_;
    int origin_y = ((ctrl_ & 0x02) ? 240 : 0) + scroll_y_;
//@ end
//@ 28-28
    // The scroll is in t_ now: nametable in bits 10-11, coarse x in 0-4,
    // coarse y in 5-9, fine y in 12-14, and fine x on its own.
    int origin_x = ((t_ >> 10) & 1) * 256 + (t_ & 0x1F) * 8 + fine_x_;
    int origin_y = ((t_ >> 11) & 1) * 240 + ((t_ >> 5) & 0x1F) * 8 + ((t_ >> 12) & 7);
//@ end
//@ 21-28
    std::uint16_t pattern_table = (ctrl_ & 0x10) ? 0x1000 : 0x0000;
    int wy = (origin_y + y) % 480;
    for (int x = 0; x < kPpuWidth; x++) {
        if (x < 8 && !(mask_ & 0x02)) {             // left column hidden
            row[x] = backdrop;
//@ end
//@ 24-28
            bg_pixel[x] = 0;
//@ end
//@ 21-28
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
//@ end
//@ 24-28
        bg_pixel[x] = static_cast<std::uint8_t>(c);
//@ end
//@ 21-28
        std::uint8_t colour = c == 0 ? read(0x3F00) : read(static_cast<std::uint16_t>(0x3F00 + pal * 4 + c));
        row[x] = kNesPalette[colour & 0x3F];
    }
}
//@ end
//@ 29
// Draw the background of the scanline v_ points at into row. bg_pixel gets
// the colour number (0-3) of every pixel: the sprites need to know where it
// is 0.
void Ppu::draw_background(std::uint32_t* row, std::array<std::uint8_t, kPpuWidth>& bg_pixel) {
    std::uint32_t backdrop = kNesPalette[read(0x3F00) & 0x3F];
    if (!(mask_ & 0x08)) {                          // background off
        for (int x = 0; x < kPpuWidth; x++) row[x] = backdrop;
        bg_pixel.fill(0);
        return;
    }
    std::uint16_t pattern_table = (ctrl_ & 0x10) ? 0x1000 : 0x0000;
    std::uint16_t addr = v_;                        // a copy that walks right, one tile at a time
    int fine_y = (v_ >> 12) & 7;
    int x = -fine_x_;                               // the first tile starts fine_x_ pixels off screen
    while (x < kPpuWidth) {
        std::uint8_t tile = read(static_cast<std::uint16_t>(0x2000 | (addr & 0x0FFF)));
        // Its attribute byte: same nametable, row coarse_y / 4, column coarse_x / 4.
        auto at = static_cast<std::uint16_t>(0x23C0 | (addr & 0x0C00) | ((addr >> 4) & 0x38) | ((addr >> 2) & 0x07));
        int shift = ((addr >> 4) & 4) | (addr & 2);
        int pal = (read(at) >> shift) & 3;
        auto colours = tile_row(pattern_table, tile, fine_y);
        for (int i = 0; i < 8; i++, x++) {
            if (x < 0 || x >= kPpuWidth) continue;
            int c = (x < 8 && !(mask_ & 0x02)) ? 0 : colours[i];   // left column hidden
            bg_pixel[x] = static_cast<std::uint8_t>(c);
            std::uint8_t colour = c == 0 ? read(0x3F00) : read(static_cast<std::uint16_t>(0x3F00 + pal * 4 + c));
            row[x] = kNesPalette[colour & 0x3F];
        }
        if ((addr & 0x001F) == 31) {                // the last column: on into the next nametable
            addr = static_cast<std::uint16_t>((addr & ~0x001F) ^ 0x0400);
        } else {
            addr++;
        }
    }
}

// Move v_ down one row of pixels: fine y, then coarse y, then into the
// nametable below after tile row 29.
void Ppu::increment_y() {
    if ((v_ & 0x7000) != 0x7000) {
        v_ += 0x1000;                               // fine y + 1
        return;
    }
    v_ &= static_cast<std::uint16_t>(~0x7000);      // fine y back to 0: the next tile row
    int y = (v_ >> 5) & 0x1F;
    if (y == 29) {
        y = 0;
        v_ ^= 0x0800;                               // the nametable below
    } else if (y == 31) {
        y = 0;                                      // rows 30-31 hold attributes: wrap, same nametable
    } else {
        y++;
    }
    v_ = static_cast<std::uint16_t>((v_ & ~0x03E0) | (y << 5));
}
//@ end
//@ 24

// Draw the sprites on scanline y over row.
void Ppu::draw_sprites(int y, std::uint32_t* row, const std::array<std::uint8_t, kPpuWidth>& bg_pixel) {
    std::array<std::uint8_t, 8> found{};
    int count = sprites_on_line(y, found);
//@ end
//@ 27
    if ((mask_ & 0x18) && count > 8) {
        status_ |= 0x20;                            // sprite overflow
    }
//@ end
//@ 24
    if (!(mask_ & 0x10)) {                          // sprites off
        return;
    }
    if (count > 8) {
        count = 8;
    }
    int height = (ctrl_ & 0x20) ? 16 : 8;
    std::array<bool, kPpuWidth> taken{};            // true where a sprite already has a pixel
    for (int n = 0; n < count; n++) {               // lower numbers first: they win
        const std::uint8_t* s = &oam_[found[n] * 4];    // Y, tile, attributes, X
        std::uint8_t attr = s[2];
        int row_in = y - (s[0] + 1);
        if (attr & 0x80) {                          // flipped vertically
            row_in = height - 1 - row_in;
        }
        std::uint16_t table;
        std::uint8_t tile = s[1];
        if (height == 16) {                         // 8 x 16: bit 0 picks the table, then two tiles
            table = (tile & 1) ? 0x1000 : 0x0000;
            tile &= 0xFE;
            if (row_in >= 8) {
                tile++;
                row_in -= 8;
            }
        } else {
            table = (ctrl_ & 0x08) ? 0x1000 : 0x0000;
        }
        auto colours = tile_row(table, tile, row_in);
        for (int i = 0; i < 8; i++) {
            int x = s[3] + i;
            if (x >= kPpuWidth) {
                break;
            }
            if (x < 8 && !(mask_ & 0x04)) {         // left column hidden
                continue;
            }
            int c = colours[(attr & 0x40) ? 7 - i : i];   // flipped horizontally
            if (c == 0 || taken[x]) {
                continue;
            }
            taken[x] = true;
//@ end
//@ 27
            if (found[n] == 0 && bg_pixel[x] != 0 && x != 255) {
                status_ |= 0x40;                    // sprite 0 hit
            }
//@ end
//@ 24
            if ((attr & 0x20) && bg_pixel[x] != 0) {    // behind the background
                continue;
            }
            std::uint8_t colour = read(static_cast<std::uint16_t>(0x3F10 + (attr & 3) * 4 + c));
            row[x] = kNesPalette[colour & 0x3F];
        }
    }
}

// Draw scanline y: the background, then the sprites over it.
void Ppu::render_scanline(int y) {
    std::uint32_t* row = &pixels_[y * kPpuWidth];
    std::array<std::uint8_t, kPpuWidth> bg_pixel{};
//@ end
//@ 24-28
    draw_background(y, row, bg_pixel);
//@ end
//@ 29
    draw_background(row, bg_pixel);
//@ end
//@ 24
    draw_sprites(y, row, bg_pixel);
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
//@ 29
    // While the picture is drawn, v_ moves along with it.
    if ((mask_ & 0x18) && (scanline_ < kPpuHeight || scanline_ == 261)) {
//@ end
//@ 33
        if (dot_ == 260) {
            cart_.scanline();                       // MMC3 counts scanlines here
        }
//@ end
//@ 29
        if (dot_ == 256) {
            increment_y();                          // the next row of pixels
        } else if (dot_ == 257) {                   // back to the left: the horizontal bits of t_
            v_ = static_cast<std::uint16_t>((v_ & ~0x041F) | (t_ & 0x041F));
        } else if (scanline_ == 261 && dot_ >= 280 && dot_ <= 304) {
            v_ = static_cast<std::uint16_t>((v_ & ~0x7BE0) | (t_ & 0x7BE0));   // a new frame: the vertical bits too
        }
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
