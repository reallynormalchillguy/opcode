#pragma once
#include <array>
#include <cstdint>

class Bus;

// The sound chip: two pulse channels, a triangle, noise and the DMC.
class Apu {
public:
    // Power on: everything silent.
    void reset();

    // The CPU writes 4000-4013, 4015 or 4017.
    void write(std::uint16_t addr, std::uint8_t value);

    // The CPU reads 4015: which channels are still playing (and the IRQ flags).
    std::uint8_t read_status();

    // Advance the APU by one CPU cycle.
    void tick();

    // What channel ch is outputting right now: 0 and 1 the pulses, 2 the
    // triangle, 3 the noise (all 0-15), 4 the DMC (0-127).
    int channel(int ch) const;

    // True while the APU wants an IRQ (the frame counter's, or the DMC's).
    // You write it in the second exercise.
    bool irq() const;

    // The DMC reads its samples from memory, through the bus. The bus is
    // created after the APU (it needs the APU), so the console connects
    // them afterwards: apu.connect(&bus).
    void connect(Bus* bus) { bus_ = bus; }

private:
    Bus* bus_ = nullptr;
//@ 36

    // A volume: fixed, or one that falls from 15 to 0 (and can start again).
    struct Envelope {
        bool start = false;         // a write to the channel's 4th register: restart at the next quarter frame
        bool loop = false;          // after 0, go back to 15
        bool constant = false;      // the volume is `period`, fixed
        std::uint8_t period = 0;    // the fixed volume, or quarter frames between steps
        std::uint8_t divider = 0;
        std::uint8_t decay = 0;     // 15 down to 0

        void clock();
        int volume() const { return constant ? period : decay; }
    };
//@ end
//@ 35

    struct Pulse {
        bool enabled = false;       // its bit in 4015
        std::uint8_t duty = 0;      // which waveform, 0-3
        std::uint8_t step = 0;      // where in the waveform, 0-7
        std::uint16_t period = 0;   // 11 bits: APU cycles (2 CPU cycles) per step, minus 1
        std::uint16_t timer = 0;
        std::uint8_t length = 0;    // the length counter: at 0 the channel is silent
        bool halt = false;          // the length counter does not count down
//@ end
//@ 35-35
        std::uint8_t volume = 0;    // 0-15
//@ end
//@ 36
        Envelope env;
        bool sweep_enabled = false;
        bool sweep_negate = false;
        bool sweep_reload = false;
        std::uint8_t sweep_period = 0;
        std::uint8_t sweep_shift = 0;
        std::uint8_t sweep_divider = 0;
        int extra = 0;              // pulse 1 subtracts one more when its sweep goes down

        int sweep_target() const;   // the period the sweep would move to
        bool muted() const;         // too low or too high a note
        void sweep_clock();
//@ end
//@ 35

        void write(int reg, std::uint8_t value);
        void clock();
        int output() const;
    };

    std::array<Pulse, 2> pulse_{};
    long cycle_ = 0;                // CPU cycles since reset
//@ end
//@ 36

    // The frame counter
    long frame_cycle_ = 0;
    bool five_step_ = false;        // 4017 bit 7: 5-step sequence
    bool irq_inhibit_ = false;      // 4017 bit 6
    bool frame_irq_ = false;
    void quarter_frame();
    void half_frame();
//@ end
//@ 37

    struct Triangle {
        bool enabled = false;
        bool control = false;       // 4008 bit 7: holds the linear counter (and halts the length counter)
        std::uint8_t linear_period = 0;
        std::uint8_t linear = 0;    // the linear counter: a second, finer length counter
        bool linear_reload = false;
        std::uint16_t period = 0;
        std::uint16_t timer = 0;
        std::uint8_t step = 0;      // 0-31
        std::uint8_t length = 0;

        void write(int reg, std::uint8_t value);
    };

    struct Noise {
        bool enabled = false;
        bool halt = false;
        Envelope env;
        bool mode = false;          // 400E bit 7: short, metallic sequence
        std::uint16_t period = 4;   // CPU cycles per step
        std::uint16_t timer = 0;
        std::uint16_t shift = 1;    // the 15-bit random number generator
        std::uint8_t length = 0;

        void write(int reg, std::uint8_t value);
    };

    Triangle tri_;
    Noise noise_;
//@ end
//@ 38

    struct Dmc {
        bool irq_enabled = false;
        bool loop = false;
        bool irq = false;
        std::uint16_t rate = 428;   // CPU cycles per bit
        std::uint16_t timer = 0;
        std::uint8_t level = 0;     // the output, 0-127
        std::uint16_t start = 0;    // where the sample starts
        std::uint16_t length = 0;   // how many bytes it has
        std::uint16_t addr = 0;     // the next byte to fetch
        std::uint16_t remaining = 0;    // bytes still to fetch
        std::uint8_t buffer = 0;    // the byte fetched, waiting
        bool buffer_full = false;
        std::uint8_t shift = 0;     // the byte being played, bit 0 first
        std::uint8_t bits = 8;      // bits left in it
        bool silence = true;        // there was no byte to play

        void write(int reg, std::uint8_t value);
        void restart() { addr = start; remaining = length; }
    };

    Dmc dmc_;
    void dmc_clock();               // needs the bus, so it belongs to Apu
//@ end
//@ 35

    void set_enabled(std::uint8_t value);   // 4015
//@ end
};
