#include <string.h>
#include "apu.h"
//@ 38
#include "bus.h"
//@ end

// ---------- Tables ----------

// How long a note lasts, in half frames, for each value of bits 3-7 written
// to 4003, 4007, 400B or 400F.
static const uint8_t LENGTHS[32] = {
    10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
    12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30,
};

// The pulse waveforms: 8 steps for each of the 4 duty settings.
static const uint8_t DUTY[4][8] = {
    { 0, 1, 0, 0, 0, 0, 0, 0 },     // 12.5%
    { 0, 1, 1, 0, 0, 0, 0, 0 },     // 25%
    { 0, 1, 1, 1, 1, 0, 0, 0 },     // 50%
    { 1, 0, 0, 1, 1, 1, 1, 1 },     // 75% (sounds like 25%)
};
//@ 37

// The triangle's 32 steps.
static const uint8_t TRIANGLE[32] = {
    15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
};

// The noise channel's 16 speeds, in CPU cycles per step.
static const uint16_t NOISE_PERIODS[16] = {
    4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068,
};
//@ end
//@ 38

// The DMC's 16 speeds, in CPU cycles per bit.
static const uint16_t DMC_RATES[16] = {
    428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54,
};
//@ end
//@ 36

// ---------- Envelope ----------

// A volume: fixed, or one that falls from 15 to 0 (and can start again).
typedef struct {
    int start;          // a write to the channel's 4th register: restart at the next quarter frame
    int loop;           // after 0, go back to 15
    int constant;       // 1: the volume is `period`, fixed
    uint8_t period;     // the fixed volume, or quarter frames between steps
    uint8_t divider;
    uint8_t decay;      // 15 down to 0
} Envelope;

static void envelope_clock(Envelope *e) {
    if (e->start) {
        e->start = 0;
        e->decay = 15;
        e->divider = e->period;
        return;
    }
    if (e->divider > 0) {
        e->divider--;
        return;
    }
    e->divider = e->period;
    if (e->decay > 0) {
        e->decay--;
    } else if (e->loop) {
        e->decay = 15;
    }
}

static int envelope_volume(const Envelope *e) {
    return e->constant ? e->period : e->decay;
}
//@ end

// ---------- Pulse channels ----------

typedef struct {
    int enabled;        // its bit in 4015
    uint8_t duty;       // which waveform, 0-3
    uint8_t step;       // where in the waveform, 0-7
    uint16_t period;    // 11 bits: APU cycles (2 CPU cycles) per step, minus 1
    uint16_t timer;
    uint8_t length;     // the length counter: at 0 the channel is silent
    int halt;           // the length counter does not count down
//@ 35-35
    uint8_t volume;     // 0-15
//@ end
//@ 36
    Envelope env;
    int sweep_enabled;
    int sweep_negate;
    int sweep_reload;
    uint8_t sweep_period;
    uint8_t sweep_shift;
    uint8_t sweep_divider;
    int extra;          // pulse 1 subtracts one more when its sweep goes down
//@ end
} Pulse;

static Pulse pulse[2];
static long cycle;      // CPU cycles since reset
//@ 36
static long frame_cycle;    // where the frame counter is
static int five_step;       // 4017 bit 7: 5-step sequence
static int irq_inhibit;     // 4017 bit 6
static int frame_irq;
//@ end
//@ 37

typedef struct {
    int enabled;
    int control;        // 4008 bit 7: holds the linear counter (and halts the length counter)
    uint8_t linear_period;
    uint8_t linear;     // the linear counter: a second, finer length counter
    int linear_reload;
    uint16_t period;
    uint16_t timer;
    uint8_t step;       // 0-31
    uint8_t length;
} Triangle;

typedef struct {
    int enabled;
    int halt;
    Envelope env;
    int mode;           // 400E bit 7: short, metallic sequence
    uint16_t period;    // CPU cycles per step
    uint16_t timer;
    uint16_t shift;     // the 15-bit random number generator
    uint8_t length;
} Noise;

static Triangle tri;
static Noise noise;
//@ end
//@ 38

typedef struct {
    int irq_enabled;
    int loop;
    int irq;
    uint16_t rate;      // CPU cycles per bit
    uint16_t timer;
    uint8_t level;      // the output, 0-127
    uint16_t start;     // where the sample starts
    uint16_t length;    // how many bytes it has
    uint16_t addr;      // the next byte to fetch
    uint16_t remaining; // bytes still to fetch
    uint8_t buffer;     // the byte fetched, waiting
    int buffer_full;
    uint8_t shift;      // the byte being played, bit 0 first
    uint8_t bits;       // bits left in it
    int silence;        // there was no byte to play
} Dmc;

static Dmc dmc;
//@ end

void apu_reset(void) {
    memset(pulse, 0, sizeof pulse);
    cycle = 0;
//@ 36
    pulse[0].extra = 1;
    frame_cycle = 0;
    five_step = 0;
    irq_inhibit = 0;
    frame_irq = 0;
//@ end
//@ 37
    memset(&tri, 0, sizeof tri);
    memset(&noise, 0, sizeof noise);
    noise.shift = 1;                                // the generator starts at 1
    noise.period = NOISE_PERIODS[0];
//@ end
//@ 38
    memset(&dmc, 0, sizeof dmc);
    dmc.rate = DMC_RATES[0];
    dmc.bits = 8;
    dmc.silence = 1;
//@ end
}
//@ 36

// ---------- Sweep ----------

// The period the sweep unit would move to.
static int sweep_target(const Pulse *p) {
    int change = p->period >> p->sweep_shift;
    if (p->sweep_negate) {
        int target = p->period - change - p->extra;
        return target < 0 ? 0 : target;
    }
    return p->period + change;
}

// Too low or too high a note: the channel is silenced.
static int pulse_muted(const Pulse *p) {
    return p->period < 8 || sweep_target(p) > 0x7FF;
}

static void sweep_clock(Pulse *p) {
    if (p->sweep_divider == 0 && p->sweep_enabled && p->sweep_shift > 0 && !pulse_muted(p)) {
        p->period = (uint16_t)sweep_target(p);
    }
    if (p->sweep_divider == 0 || p->sweep_reload) {
        p->sweep_divider = p->sweep_period;
        p->sweep_reload = 0;
    } else {
        p->sweep_divider--;
    }
}
//@ end

static void pulse_write(Pulse *p, int reg, uint8_t value) {
    switch (reg) {
    case 0:                                         // DDLC VVVV
        p->duty = value >> 6;
        p->halt = (value >> 5) & 1;
//@ 35-35
        p->volume = value & 0x0F;
//@ end
//@ 36
        p->env.loop = p->halt;
        p->env.constant = (value >> 4) & 1;
        p->env.period = value & 0x0F;
//@ end
        break;
    case 1:                                         // EPPP NSSS: the sweep
//@ 36
        p->sweep_enabled = value >> 7;
        p->sweep_period = (value >> 4) & 7;
        p->sweep_negate = (value >> 3) & 1;
        p->sweep_shift = value & 7;
        p->sweep_reload = 1;
//@ end
        break;
    case 2:                                         // the period's low 8 bits
        p->period = (uint16_t)((p->period & 0x0700) | value);
        break;
    case 3:                                         // LLLL LTTT: length, and the period's high 3 bits
        p->period = (uint16_t)((p->period & 0x00FF) | ((value & 7) << 8));
        if (p->enabled) {
            p->length = LENGTHS[value >> 3];
        }
        p->step = 0;                                // the waveform starts again
//@ 36
        p->env.start = 1;
//@ end
        break;
    }
}

static void pulse_clock(Pulse *p) {
    if (p->timer == 0) {
        p->timer = p->period;
        p->step = (p->step + 1) & 7;
    } else {
        p->timer--;
    }
}

static int pulse_output(const Pulse *p) {
    if (p->length == 0 || !DUTY[p->duty][p->step]) {
        return 0;
    }
//@ 35-35
    if (p->period < 8) {
        return 0;
    }
    return p->volume;
//@ end
//@ 36
    if (pulse_muted(p)) {
        return 0;
    }
    return envelope_volume(&p->env);
//@ end
}
//@ 37

// ---------- Triangle and noise ----------

static void triangle_write(int reg, uint8_t value) {
    switch (reg) {
    case 0:                                         // CRRR RRRR
        tri.control = value >> 7;
        tri.linear_period = value & 0x7F;
        break;
    case 2:
        tri.period = (uint16_t)((tri.period & 0x0700) | value);
        break;
    case 3:
        tri.period = (uint16_t)((tri.period & 0x00FF) | ((value & 7) << 8));
        if (tri.enabled) {
            tri.length = LENGTHS[value >> 3];
        }
        tri.linear_reload = 1;
        break;
    }
}

static void noise_write(int reg, uint8_t value) {
    switch (reg) {
    case 0:                                         // --LC VVVV, as the pulses
        noise.halt = (value >> 5) & 1;
        noise.env.loop = noise.halt;
        noise.env.constant = (value >> 4) & 1;
        noise.env.period = value & 0x0F;
        break;
    case 2:                                         // M--- PPPP
        noise.mode = value >> 7;
        noise.period = NOISE_PERIODS[value & 0x0F];
        break;
    case 3:                                         // LLLL L---
        if (noise.enabled) {
            noise.length = LENGTHS[value >> 3];
        }
        noise.env.start = 1;
        break;
    }
}
//@ end
//@ 38

// ---------- DMC ----------

static void dmc_restart(void) {
    dmc.addr = dmc.start;
    dmc.remaining = dmc.length;
}

static void dmc_write(int reg, uint8_t value) {
    switch (reg) {
    case 0:                                         // IL-- RRRR
        dmc.irq_enabled = value >> 7;
        if (!dmc.irq_enabled) {
            dmc.irq = 0;
        }
        dmc.loop = (value >> 6) & 1;
        dmc.rate = DMC_RATES[value & 0x0F];
        break;
    case 1:                                         // -DDD DDDD: set the output directly
        dmc.level = value & 0x7F;
        break;
    case 2:                                         // the sample starts at C000 + 64 x value
        dmc.start = (uint16_t)(0xC000 + value * 64);
        break;
    case 3:                                         // and is 16 x value + 1 bytes long
        dmc.length = (uint16_t)(value * 16 + 1);
        break;
    }
}

static void dmc_clock(void) {
    // The memory reader keeps the one-byte buffer full.
    if (!dmc.buffer_full && dmc.remaining > 0) {
        dmc.buffer = bus_read(dmc.addr);
        dmc.buffer_full = 1;
        dmc.addr = dmc.addr == 0xFFFF ? 0x8000 : (uint16_t)(dmc.addr + 1);
        dmc.remaining--;
        if (dmc.remaining == 0) {
            if (dmc.loop) {
                dmc_restart();
            } else if (dmc.irq_enabled) {
                dmc.irq = 1;
            }
        }
    }
    // The output unit plays one bit every `rate` CPU cycles.
    if (dmc.timer > 0) {
        dmc.timer--;
        return;
    }
    dmc.timer = (uint16_t)(dmc.rate - 1);
    if (!dmc.silence) {
        if (dmc.shift & 1) {
            if (dmc.level <= 125) dmc.level += 2;
        } else {
            if (dmc.level >= 2) dmc.level -= 2;
        }
    }
    dmc.shift >>= 1;
    dmc.bits--;
    if (dmc.bits == 0) {
        dmc.bits = 8;
        if (dmc.buffer_full) {
            dmc.shift = dmc.buffer;
            dmc.buffer_full = 0;
            dmc.silence = 0;
        } else {
            dmc.silence = 1;
        }
    }
}
//@ end
//@ 36

// ---------- The frame counter ----------

// About 240 times a second: envelopes (and the triangle's linear counter).
static void quarter_frame(void) {
    envelope_clock(&pulse[0].env);
    envelope_clock(&pulse[1].env);
//@ end
//@ 37
    envelope_clock(&noise.env);
    if (tri.linear_reload) {
        tri.linear = tri.linear_period;
    } else if (tri.linear > 0) {
        tri.linear--;
    }
    if (!tri.control) {
        tri.linear_reload = 0;
    }
//@ end
//@ 36
}

// About 120 times a second: length counters and sweeps.
static void half_frame(void) {
    for (int i = 0; i < 2; i++) {
        if (!pulse[i].halt && pulse[i].length > 0) {
            pulse[i].length--;
        }
        sweep_clock(&pulse[i]);
    }
//@ end
//@ 37
    if (!tri.control && tri.length > 0) {
        tri.length--;
    }
    if (!noise.halt && noise.length > 0) {
        noise.length--;
    }
//@ end
//@ 36
}
//@ end

// ---------- The CPU's view: 4000-4017 ----------

// 4015: a 1 bit turns a channel on, a 0 bit silences it at once.
static void set_enabled(uint8_t value) {
    for (int i = 0; i < 2; i++) {
        pulse[i].enabled = (value >> i) & 1;
        if (!pulse[i].enabled) {
            pulse[i].length = 0;
        }
    }
//@ 37
    tri.enabled = (value >> 2) & 1;
    if (!tri.enabled) {
        tri.length = 0;
    }
    noise.enabled = (value >> 3) & 1;
    if (!noise.enabled) {
        noise.length = 0;
    }
//@ end
//@ 38
    if (!(value & 0x10)) {
        dmc.remaining = 0;
    } else if (dmc.remaining == 0) {
        dmc_restart();
    }
    dmc.irq = 0;
//@ end
}

void apu_write(uint16_t addr, uint8_t value) {
    if (addr < 0x4008) {
        pulse_write(&pulse[(addr >> 2) & 1], addr & 3, value);
//@ 37
    } else if (addr < 0x400C) {
        triangle_write(addr & 3, value);
    } else if (addr < 0x4010) {
        noise_write(addr & 3, value);
//@ end
//@ 38
    } else if (addr < 0x4014) {
        dmc_write(addr & 3, value);
//@ end
    } else if (addr == 0x4015) {
        set_enabled(value);
//@ 36
    } else if (addr == 0x4017) {                    // the frame counter: MI-- ----
        five_step = value >> 7;
        irq_inhibit = (value >> 6) & 1;
        if (irq_inhibit) {
            frame_irq = 0;
        }
        frame_cycle = 0;
        if (five_step) {                            // the 5-step mode clocks everything at once
            quarter_frame();
            half_frame();
        }
//@ end
    }
}

uint8_t apu_read_status(void) {
    uint8_t s = 0;
    if (pulse[0].length > 0) s |= 0x01;
    if (pulse[1].length > 0) s |= 0x02;
//@ 37
    if (tri.length > 0) s |= 0x04;
    if (noise.length > 0) s |= 0x08;
//@ end
//@ 38
    if (dmc.remaining > 0) s |= 0x10;
    if (dmc.irq) s |= 0x80;
//@ end
//@ 36
    if (frame_irq) s |= 0x40;
    frame_irq = 0;                                  // reading acknowledges the frame IRQ
//@ end
    return s;
}

void apu_tick(void) {
    cycle++;
    if (cycle & 1) {                                // the pulses run at half the CPU's speed
        pulse_clock(&pulse[0]);
        pulse_clock(&pulse[1]);
    }
//@ 37
    if (tri.timer == 0) {                           // the triangle at the CPU's speed
        tri.timer = tri.period;
        if (tri.length > 0 && tri.linear > 0) {
            tri.step = (tri.step + 1) & 31;
        }
    } else {
        tri.timer--;
    }
    if (noise.timer == 0) {                         // the noise: one step every `period` cycles
        noise.timer = (uint16_t)(noise.period - 1);
        int other = noise.mode ? 6 : 1;
        int feedback = (noise.shift ^ (noise.shift >> other)) & 1;
        noise.shift = (uint16_t)((noise.shift >> 1) | (feedback << 14));
    } else {
        noise.timer--;
    }
//@ end
//@ 38
    dmc_clock();
//@ end
//@ 36
    frame_cycle++;
    if (frame_cycle == 7457 || frame_cycle == 22371) {
        quarter_frame();
    } else if (frame_cycle == 14913) {
        quarter_frame();
        half_frame();
    } else if (!five_step && frame_cycle == 29829) {
        quarter_frame();
        half_frame();
        if (!irq_inhibit) {
            frame_irq = 1;
        }
    } else if (five_step && frame_cycle == 37281) {
        quarter_frame();
        half_frame();
    }
    if (frame_cycle >= (five_step ? 37282 : 29830)) {
        frame_cycle = 0;
    }
//@ end
}

int apu_channel(int ch) {
    switch (ch) {
    case 0:
        return pulse_output(&pulse[0]);
    case 1:
        return pulse_output(&pulse[1]);
//@ 37
    case 2:
        return tri.period < 2 ? 7 : TRIANGLE[tri.step];   // too high to hear: the middle
    case 3:
        if ((noise.shift & 1) || noise.length == 0) {
            return 0;
        }
        return envelope_volume(&noise.env);
//@ end
//@ 38
    case 4:
        return dmc.level;
//@ end
    }
    return 0;
}
//@ 36

int apu_irq(void) {
//@ end
//@ 36-37
    return frame_irq;
//@ end
//@ 38
    return frame_irq || dmc.irq;
//@ end
//@ 36
}
//@ end
