#include "cart.h"
//@ 30

// ---------- Mappers ----------

void Mapper::map_prg(int w, int n) {
    int count = static_cast<int>(prg_size_ / 0x2000);
    if (count == 0) {
        prg_map_[w] = 0;
        return;
    }
    n %= count;
    if (n < 0) {
        n += count;
    }
    prg_map_[w] = static_cast<std::size_t>(n) * 0x2000;
}

void Mapper::map_chr(int w, int n) {
    int count = static_cast<int>(chr_size_ / 0x400);
    n %= count;
    if (n < 0) {
        n += count;
    }
    chr_map_[w] = static_cast<std::size_t>(n) * 0x400;
}

// NROM: the windows never move. A 16 KB ROM fills windows 2-3 by wrapping.
void Nrom::reset() {
    for (int i = 0; i < 4; i++) map_prg(i, i);
    for (int i = 0; i < 8; i++) map_chr(i, i);
}

void Nrom::write(std::uint16_t, std::uint8_t) {}   // nothing to switch

// UxROM: the 16 KB at 8000 switch, the last 16 KB stays at C000.
void Uxrom::reset() {
    bank_ = 0;
    update_banks();
}

void Uxrom::write(std::uint16_t, std::uint8_t value) {
    bank_ = value;
    update_banks();
}

void Uxrom::update_banks() {
    map_prg(0, bank_ * 2);
    map_prg(1, bank_ * 2 + 1);
    map_prg(2, -2);
    map_prg(3, -1);
    for (int i = 0; i < 8; i++) map_chr(i, i);
}

// CNROM: all 8 KB of CHR switch at once.
void Cnrom::reset() {
    bank_ = 0;
    update_banks();
}

void Cnrom::write(std::uint16_t, std::uint8_t value) {
    bank_ = value;
    update_banks();
}

void Cnrom::update_banks() {
    for (int i = 0; i < 4; i++) map_prg(i, i);
    for (int i = 0; i < 8; i++) map_chr(i, bank_ * 8 + i);
}
//@ end
//@ 31

// MMC1 takes its registers one bit at a time: five writes of bit 0, and the
// address of the fifth write says which register gets them.
void Mmc1::reset() {
    shift_ = 0x10;
    control_ = 0x0C;            // PRG mode 3: the last bank at C000, where the reset vector is
    chr0_ = chr1_ = prg_ = 0;
    update_banks();
}

void Mmc1::write(std::uint16_t addr, std::uint8_t value) {
    if (value & 0x80) {                             // bit 7: start again
        shift_ = 0x10;
        control_ |= 0x0C;
        update_banks();
        return;
    }
    bool full = shift_ & 1;                         // the marker reached bit 0: this is the fifth bit
    shift_ = static_cast<std::uint8_t>((shift_ >> 1) | ((value & 1) << 4));
    if (full) {
        switch ((addr >> 13) & 3) {
        case 0: control_ = shift_; break;           // 8000-9FFF
        case 1: chr0_ = shift_; break;              // A000-BFFF
        case 2: chr1_ = shift_; break;              // C000-DFFF
        case 3: prg_ = shift_; break;               // E000-FFFF
        }
        shift_ = 0x10;
        update_banks();
    }
}

void Mmc1::update_banks() {
    int b = prg_ & 0x0F;
    switch ((control_ >> 2) & 3) {
    case 0:
    case 1:                                         // 32 KB at once (the low bit is ignored)
        for (int i = 0; i < 4; i++) map_prg(i, (b & ~1) * 2 + i);
        break;
    case 2:                                         // the first 16 KB stays at 8000, C000 switches
        map_prg(0, 0);
        map_prg(1, 1);
        map_prg(2, b * 2);
        map_prg(3, b * 2 + 1);
        break;
    case 3:                                         // 8000 switches, the last 16 KB stays at C000
        map_prg(0, b * 2);
        map_prg(1, b * 2 + 1);
        map_prg(2, -2);
        map_prg(3, -1);
        break;
    }
    if (control_ & 0x10) {                          // two 4 KB CHR banks
        for (int i = 0; i < 4; i++) {
            map_chr(i, chr0_ * 4 + i);
            map_chr(4 + i, chr1_ * 4 + i);
        }
    } else {                                        // one 8 KB bank (the low bit is ignored)
        for (int i = 0; i < 8; i++) map_chr(i, (chr0_ & ~1) * 4 + i);
    }
    const std::array<Mirroring, 4> modes = {Mirroring::OneLow, Mirroring::OneHigh, Mirroring::Vertical, Mirroring::Horizontal};
    mirroring_ = modes[control_ & 3];
}
//@ end
//@ 32

// MMC3 has pairs of registers: even and odd addresses in each 8 KB range.
void Mmc3::reset() {
    select_ = 0;
    r_.fill(0);
//@ end
//@ 33
    irq_latch_ = irq_counter_ = 0;
    irq_reload_ = irq_enabled_ = irq_line_ = false;
//@ end
//@ 32
    update_banks();
}

void Mmc3::write(std::uint16_t addr, std::uint8_t value) {
    bool odd = addr & 1;
    switch (addr & 0xE000) {
    case 0x8000:
        if (!odd) {
            select_ = value;
        } else {
            r_[select_ & 7] = value;
        }
        break;
    case 0xA000:
        if (!odd) {                                 // the odd one protects PRG RAM: ignored here
            mirroring_ = (value & 1) ? Mirroring::Horizontal : Mirroring::Vertical;
        }
        break;
//@ end
//@ 33
    case 0xC000:
        if (!odd) {
            irq_latch_ = value;                     // the count to start from
        } else {
            irq_counter_ = 0;                       // reload at the next scanline
            irq_reload_ = true;
        }
        break;
    case 0xE000:
        if (!odd) {
            irq_enabled_ = false;                   // off, and the IRQ is acknowledged
            irq_line_ = false;
        } else {
            irq_enabled_ = true;
        }
        break;
//@ end
//@ 32
    }
    update_banks();
}

void Mmc3::update_banks() {
    if (select_ & 0x40) {                           // PRG mode 1: R6 at C000, the second-last bank at 8000
        map_prg(0, -2);
        map_prg(2, r_[6]);
    } else {                                        // PRG mode 0: R6 at 8000, the second-last bank at C000
        map_prg(0, r_[6]);
        map_prg(2, -2);
    }
    map_prg(1, r_[7]);
    map_prg(3, -1);
    int inv = (select_ & 0x80) ? 4 : 0;             // CHR mode 1 swaps the two halves
    map_chr(0 ^ inv, r_[0] & 0xFE);                 // R0 and R1 are 2 KB banks
    map_chr(1 ^ inv, r_[0] | 1);
    map_chr(2 ^ inv, r_[1] & 0xFE);
    map_chr(3 ^ inv, r_[1] | 1);
    map_chr(4 ^ inv, r_[2]);                        // R2-R5 are 1 KB banks
    map_chr(5 ^ inv, r_[3]);
    map_chr(6 ^ inv, r_[4]);
    map_chr(7 ^ inv, r_[5]);
}
//@ end
//@ 33

// The PPU calls this once per scanline while it draws (see ppu.cpp).
void Mmc3::scanline() {
    if (irq_counter_ == 0 || irq_reload_) {
        irq_counter_ = irq_latch_;
        irq_reload_ = false;
    } else {
        irq_counter_--;
    }
    if (irq_counter_ == 0 && irq_enabled_) {
        irq_line_ = true;
    }
}
//@ end

// ---------- The cartridge ----------

LoadResult Cartridge::load(const std::vector<std::uint8_t>& file) {
    if (file.size() < 16) {
        return LoadResult::TooShort;
    }
    if (file[0] != 'N' || file[1] != 'E' || file[2] != 'S' || file[3] != 0x1A) {
        return LoadResult::NotInes;
    }
    int new_prg_banks = file[4];
    int new_chr_banks = file[5];
    std::uint8_t flags6 = file[6];
    std::uint8_t flags7 = file[7];
    std::size_t trainer = (flags6 & 0x04) ? 512 : 0;
    std::size_t needed = 16 + trainer + new_prg_banks * 0x4000 + new_chr_banks * 0x2000;
    if (file.size() < needed) {
        return LoadResult::TooShort;
    }
    int new_mapper = (flags7 & 0xF0) | (flags6 >> 4);
//@ 14-29
    if (new_mapper != 0) {
        return LoadResult::UnsupportedMapper;
    }
//@ end
//@ 30
    Mirroring header_mirroring = (flags6 & 0x01) ? Mirroring::Vertical : Mirroring::Horizontal;
    std::size_t prg_size = new_prg_banks * 0x4000;
    std::size_t chr_size = new_chr_banks ? new_chr_banks * 0x2000 : 0x2000;

    // The mapper chip: one class for each kind of board.
    std::unique_ptr<Mapper> chip;
    switch (new_mapper) {
    case 0: chip = std::make_unique<Nrom>(prg_size, chr_size, header_mirroring); break;
//@ end
//@ 31
    case 1: chip = std::make_unique<Mmc1>(prg_size, chr_size, header_mirroring); break;
//@ end
//@ 30
    case 2: chip = std::make_unique<Uxrom>(prg_size, chr_size, header_mirroring); break;
    case 3: chip = std::make_unique<Cnrom>(prg_size, chr_size, header_mirroring); break;
//@ end
//@ 32
    case 4: chip = std::make_unique<Mmc3>(prg_size, chr_size, header_mirroring); break;
//@ end
//@ 30
    default: return LoadResult::UnsupportedMapper;
    }
//@ end
//@ 14

    // Copy the ROMs into memory of our own, replacing any earlier cartridge.
    auto rom = file.begin() + 16 + trainer;
    auto chr_start = rom + new_prg_banks * 0x4000;
    prg_.assign(rom, chr_start);
    if (new_chr_banks) {
        chr_.assign(chr_start, chr_start + new_chr_banks * 0x2000);
    } else {
        chr_.assign(0x2000, 0);                     // 8 KB of CHR RAM, cleared
    }
    chr_is_ram_ = new_chr_banks == 0;
    prg_ram_.fill(0);
//@ end

    mapper_ = new_mapper;
    prg_banks_ = new_prg_banks;
    chr_banks_ = new_chr_banks;
    mirroring_ = (flags6 & 0x01) ? Mirroring::Vertical : Mirroring::Horizontal;
    battery_ = (flags6 & 0x02) != 0;
//@ 30
    chip_ = std::move(chip);
    chip_->reset();
//@ end
    return LoadResult::Ok;
}
//@ 14-29

std::uint8_t Cartridge::cpu_read(std::uint16_t addr) {
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram_[addr - 0x6000];
    }
    if (addr >= 0x8000 && !prg_.empty()) {
        return prg_[(addr - 0x8000) % prg_.size()];
    }
    return 0;
}

void Cartridge::cpu_write(std::uint16_t addr, std::uint8_t value) {
    if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram_[addr - 0x6000] = value;
    }
}

std::uint8_t Cartridge::ppu_read(std::uint16_t addr) {
    if (chr_.empty()) {
        return 0;
    }
    return chr_[addr & 0x1FFF];
}

void Cartridge::ppu_write(std::uint16_t addr, std::uint8_t value) {
    if (chr_is_ram_) {
        chr_[addr & 0x1FFF] = value;
    }
}
//@ end
//@ 30

std::uint8_t Cartridge::cpu_read(std::uint16_t addr) {
    if (addr >= 0x6000 && addr < 0x8000) {
        return prg_ram_[addr - 0x6000];
    }
    if (addr >= 0x8000 && chip_ && !prg_.empty()) {
        return prg_[chip_->prg_offset(addr)];
    }
    return 0;
}

void Cartridge::cpu_write(std::uint16_t addr, std::uint8_t value) {
    if (addr >= 0x6000 && addr < 0x8000) {
        prg_ram_[addr - 0x6000] = value;
    } else if (addr >= 0x8000 && chip_) {
        chip_->write(addr, value);                  // ROM can't be written: these writes go to the mapper
    }
}

std::uint8_t Cartridge::ppu_read(std::uint16_t addr) {
    if (!chip_) {
        return 0;
    }
    return chr_[chip_->chr_offset(addr)];
}

void Cartridge::ppu_write(std::uint16_t addr, std::uint8_t value) {
    if (chip_ && chr_is_ram_) {
        chr_[chip_->chr_offset(addr)] = value;
    }
}
//@ end
