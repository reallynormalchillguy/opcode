#include "apu.h"
//@ 38
#include "bus.h"
//@ end

namespace {

// ---------- Tables ----------

// How long a note lasts, in half frames, for each value of bits 3-7 written
// to 4003, 4007, 400B or 400F.
const std::array<std::uint8_t, 32> kLengths = {
    10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
    12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30,
};

// The pulse waveforms: 8 steps for each of the 4 duty settings.
const std::array<std::array<std::uint8_t, 8>, 4> kDuty = {{
    {0, 1, 0, 0, 0, 0, 0, 0},       // 12.5%
    {0, 1, 1, 0, 0, 0, 0, 0},       // 25%
    {0, 1, 1, 1, 1, 0, 0, 0},       // 50%
    {1, 0, 0, 1, 1, 1, 1, 1},       // 75% (sounds like 25%)
}};
//@ 37

// The triangle's 32 steps.
const std::array<std::uint8_t, 32> kTriangle = {
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
};

// The noise channel's 16 speeds, in CPU cycles per step.
const std::array<std::uint16_t, 16> kNoisePeriods = {
    4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068,
};
//@ end
//@ 38

// The DMC's 16 speeds, in CPU cycles per bit.
const std::array<std::uint16_t, 16> kDmcRates = {
    428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54,
};
//@ end

}  // namespace

void Apu::reset() {
    pulse_ = {};                                    // every member back to its first value
    cycle_ = 0;
//@ 36
    pulse_[0].extra = 1;
    frame_cycle_ = 0;
    five_step_ = false;
    irq_inhibit_ = false;
    frame_irq_ = false;
//@ end
//@ 37
    tri_ = Triangle{};
    noise_ = Noise{};
//@ end
//@ 38
    dmc_ = Dmc{};
//@ end
}
//@ 36

// ---------- Envelope ----------

void Apu::Envelope::clock() {
    if (start) {
        start = false;
        decay = 15;
        divider = period;
        return;
    }
    if (divider > 0) {
        divider--;
        return;
    }
    divider = period;
    if (decay > 0) {
        decay--;
    } else if (loop) {
        decay = 15;
    }
}

// ---------- Sweep ----------

int Apu::Pulse::sweep_target() const {
    int change = period >> sweep_shift;
    if (sweep_negate) {
        int target = period - change - extra;
        return target < 0 ? 0 : target;
    }
    return period + change;
}

bool Apu::Pulse::muted() const {
    return period < 8 || sweep_target() > 0x7FF;
}

void Apu::Pulse::sweep_clock() {
    if (sweep_divider == 0 && sweep_enabled && sweep_shift > 0 && !muted()) {
        period = static_cast<std::uint16_t>(sweep_target());
    }
    if (sweep_divider == 0 || sweep_reload) {
        sweep_divider = sweep_period;
        sweep_reload = false;
    } else {
        sweep_divider--;
    }
}
//@ end

// ---------- Pulse channels ----------

void Apu::Pulse::write(int reg, std::uint8_t value) {
    switch (reg) {
    case 0:                                         // DDLC VVVV
        duty = value >> 6;
        halt = (value >> 5) & 1;
//@ 35-35
        volume = value & 0x0F;
//@ end
//@ 36
        env.loop = halt;
        env.constant = (value >> 4) & 1;
        env.period = value & 0x0F;
//@ end
        break;
    case 1:                                         // EPPP NSSS: the sweep
//@ 36
        sweep_enabled = value >> 7;
        sweep_period = (value >> 4) & 7;
        sweep_negate = (value >> 3) & 1;
        sweep_shift = value & 7;
        sweep_reload = true;
//@ end
        break;
    case 2:                                         // the period's low 8 bits
        period = static_cast<std::uint16_t>((period & 0x0700) | value);
        break;
    case 3:                                         // LLLL LTTT: length, and the period's high 3 bits
        period = static_cast<std::uint16_t>((period & 0x00FF) | ((value & 7) << 8));
        if (enabled) {
            length = kLengths[value >> 3];
        }
        step = 0;                                   // the waveform starts again
//@ 36
        env.start = true;
//@ end
        break;
    }
}

void Apu::Pulse::clock() {
    if (timer == 0) {
        timer = period;
        step = (step + 1) & 7;
    } else {
        timer--;
    }
}

int Apu::Pulse::output() const {
    if (length == 0 || !kDuty[duty][step]) {
        return 0;
    }
//@ 35-35
    if (period < 8) {
        return 0;
    }
    return volume;
//@ end
//@ 36
    if (muted()) {
        return 0;
    }
    return env.volume();
//@ end
}
//@ 37

// ---------- Triangle and noise ----------

void Apu::Triangle::write(int reg, std::uint8_t value) {
    switch (reg) {
    case 0:                                         // CRRR RRRR
        control = value >> 7;
        linear_period = value & 0x7F;
        break;
    case 2:
        period = static_cast<std::uint16_t>((period & 0x0700) | value);
        break;
    case 3:
        period = static_cast<std::uint16_t>((period & 0x00FF) | ((value & 7) << 8));
        if (enabled) {
            length = kLengths[value >> 3];
        }
        linear_reload = true;
        break;
    }
}

void Apu::Noise::write(int reg, std::uint8_t value) {
    switch (reg) {
    case 0:                                         // --LC VVVV, as the pulses
        halt = (value >> 5) & 1;
        env.loop = halt;
        env.constant = (value >> 4) & 1;
        env.period = value & 0x0F;
        break;
    case 2:                                         // M--- PPPP
        mode = value >> 7;
        period = kNoisePeriods[value & 0x0F];
        break;
    case 3:                                         // LLLL L---
        if (enabled) {
            length = kLengths[value >> 3];
        }
        env.start = true;
        break;
    }
}
//@ end
//@ 38

// ---------- DMC ----------

void Apu::Dmc::write(int reg, std::uint8_t value) {
    switch (reg) {
    case 0:                                         // IL-- RRRR
        irq_enabled = value >> 7;
        if (!irq_enabled) {
            irq = false;
        }
        loop = (value >> 6) & 1;
        rate = kDmcRates[value & 0x0F];
        break;
    case 1:                                         // -DDD DDDD: set the output directly
        level = value & 0x7F;
        break;
    case 2:                                         // the sample starts at C000 + 64 x value
        start = static_cast<std::uint16_t>(0xC000 + value * 64);
        break;
    case 3:                                         // and is 16 x value + 1 bytes long
        length = static_cast<std::uint16_t>(value * 16 + 1);
        break;
    }
}

void Apu::dmc_clock() {
    Dmc& d = dmc_;
    // The memory reader keeps the one-byte buffer full.
    if (!d.buffer_full && d.remaining > 0 && bus_) {
        d.buffer = bus_->read(d.addr);
        d.buffer_full = true;
        d.addr = d.addr == 0xFFFF ? 0x8000 : static_cast<std::uint16_t>(d.addr + 1);
        d.remaining--;
        if (d.remaining == 0) {
            if (d.loop) {
                d.restart();
            } else if (d.irq_enabled) {
                d.irq = true;
            }
        }
    }
    // The output unit plays one bit every `rate` CPU cycles.
    if (d.timer > 0) {
        d.timer--;
        return;
    }
    d.timer = static_cast<std::uint16_t>(d.rate - 1);
    if (!d.silence) {
        if (d.shift & 1) {
            if (d.level <= 125) d.level += 2;
        } else {
            if (d.level >= 2) d.level -= 2;
        }
    }
    d.shift >>= 1;
    d.bits--;
    if (d.bits == 0) {
        d.bits = 8;
        if (d.buffer_full) {
            d.shift = d.buffer;
            d.buffer_full = false;
            d.silence = false;
        } else {
            d.silence = true;
        }
    }
}
//@ end
//@ 36

// ---------- The frame counter ----------

// About 240 times a second: envelopes (and the triangle's linear counter).
void Apu::quarter_frame() {
    pulse_[0].env.clock();
    pulse_[1].env.clock();
//@ end
//@ 37
    noise_.env.clock();
    if (tri_.linear_reload) {
        tri_.linear = tri_.linear_period;
    } else if (tri_.linear > 0) {
        tri_.linear--;
    }
    if (!tri_.control) {
        tri_.linear_reload = false;
    }
//@ end
//@ 36
}

// About 120 times a second: length counters and sweeps.
void Apu::half_frame() {
    for (Pulse& p : pulse_) {
        if (!p.halt && p.length > 0) {
            p.length--;
        }
        p.sweep_clock();
    }
//@ end
//@ 37
    if (!tri_.control && tri_.length > 0) {
        tri_.length--;
    }
    if (!noise_.halt && noise_.length > 0) {
        noise_.length--;
    }
//@ end
//@ 36
}
//@ end

// ---------- The CPU's view: 4000-4017 ----------

// 4015: a 1 bit turns a channel on, a 0 bit silences it at once.
void Apu::set_enabled(std::uint8_t value) {
    for (int i = 0; i < 2; i++) {
        pulse_[i].enabled = (value >> i) & 1;
        if (!pulse_[i].enabled) {
            pulse_[i].length = 0;
        }
    }
//@ 37
    tri_.enabled = (value >> 2) & 1;
    if (!tri_.enabled) {
        tri_.length = 0;
    }
    noise_.enabled = (value >> 3) & 1;
    if (!noise_.enabled) {
        noise_.length = 0;
    }
//@ end
//@ 38
    if (!(value & 0x10)) {
        dmc_.remaining = 0;
    } else if (dmc_.remaining == 0) {
        dmc_.restart();
    }
    dmc_.irq = false;
//@ end
}

void Apu::write(std::uint16_t addr, std::uint8_t value) {
    if (addr < 0x4008) {
        pulse_[(addr >> 2) & 1].write(addr & 3, value);
//@ 37
    } else if (addr < 0x400C) {
        tri_.write(addr & 3, value);
    } else if (addr < 0x4010) {
        noise_.write(addr & 3, value);
//@ end
//@ 38
    } else if (addr < 0x4014) {
        dmc_.write(addr & 3, value);
//@ end
    } else if (addr == 0x4015) {
        set_enabled(value);
//@ 36
    } else if (addr == 0x4017) {                    // the frame counter: MI-- ----
        five_step_ = value >> 7;
        irq_inhibit_ = (value >> 6) & 1;
        if (irq_inhibit_) {
            frame_irq_ = false;
        }
        frame_cycle_ = 0;
        if (five_step_) {                           // the 5-step mode clocks everything at once
            quarter_frame();
            half_frame();
        }
//@ end
    }
}

std::uint8_t Apu::read_status() {
    std::uint8_t s = 0;
    if (pulse_[0].length > 0) s |= 0x01;
    if (pulse_[1].length > 0) s |= 0x02;
//@ 37
    if (tri_.length > 0) s |= 0x04;
    if (noise_.length > 0) s |= 0x08;
//@ end
//@ 38
    if (dmc_.remaining > 0) s |= 0x10;
    if (dmc_.irq) s |= 0x80;
//@ end
//@ 36
    if (frame_irq_) s |= 0x40;
    frame_irq_ = false;                             // reading acknowledges the frame IRQ
//@ end
    return s;
}

void Apu::tick() {
    cycle_++;
    if (cycle_ & 1) {                               // the pulses run at half the CPU's speed
        pulse_[0].clock();
        pulse_[1].clock();
    }
//@ 37
    if (tri_.timer == 0) {                          // the triangle at the CPU's speed
        tri_.timer = tri_.period;
        if (tri_.length > 0 && tri_.linear > 0) {
            tri_.step = (tri_.step + 1) & 31;
        }
    } else {
        tri_.timer--;
    }
    if (noise_.timer == 0) {                        // the noise: one step every `period` cycles
        noise_.timer = static_cast<std::uint16_t>(noise_.period - 1);
        int other = noise_.mode ? 6 : 1;
        int feedback = (noise_.shift ^ (noise_.shift >> other)) & 1;
        noise_.shift = static_cast<std::uint16_t>((noise_.shift >> 1) | (feedback << 14));
    } else {
        noise_.timer--;
    }
//@ end
//@ 38
    dmc_clock();
//@ end
//@ 36
    frame_cycle_++;
    if (frame_cycle_ == 7457 || frame_cycle_ == 22371) {
        quarter_frame();
    } else if (frame_cycle_ == 14913) {
        quarter_frame();
        half_frame();
    } else if (!five_step_ && frame_cycle_ == 29829) {
        quarter_frame();
        half_frame();
        if (!irq_inhibit_) {
            frame_irq_ = true;
        }
    } else if (five_step_ && frame_cycle_ == 37281) {
        quarter_frame();
        half_frame();
    }
    if (frame_cycle_ >= (five_step_ ? 37282 : 29830)) {
        frame_cycle_ = 0;
    }
//@ end
}

int Apu::channel(int ch) const {
    switch (ch) {
    case 0:
        return pulse_[0].output();
    case 1:
        return pulse_[1].output();
//@ 37
    case 2:
        return tri_.period < 2 ? 7 : kTriangle[tri_.step];    // too high to hear: the middle
    case 3:
        if ((noise_.shift & 1) || noise_.length == 0) {
            return 0;
        }
        return noise_.env.volume();
//@ end
//@ 38
    case 4:
        return dmc_.level;
//@ end
    }
    return 0;
}
//@ 36

bool Apu::irq() const {
//@ end
//@ 36-37
    return frame_irq_;
//@ end
//@ 38
    return frame_irq_ || dmc_.irq;
//@ end
//@ 36
}
//@ end
