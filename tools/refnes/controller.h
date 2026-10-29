#pragma once
#include <array>
#include <cstdint>

// The buttons, as bits of a byte. The controller sends them in this order:
// A first, Right last.
constexpr std::uint8_t kButtonA = 0x01;
constexpr std::uint8_t kButtonB = 0x02;
constexpr std::uint8_t kButtonSelect = 0x04;
constexpr std::uint8_t kButtonStart = 0x08;
constexpr std::uint8_t kButtonUp = 0x10;
constexpr std::uint8_t kButtonDown = 0x20;
constexpr std::uint8_t kButtonLeft = 0x40;
constexpr std::uint8_t kButtonRight = 0x80;

// The two controller ports. One class for both, because the strobe at 4016
// reaches both controllers at once.
class Controllers {
public:
    // Power on: nothing held, strobe off.
    void reset();

    // The buttons held on controller `port` (0 or 1) right now.
    void set(int port, std::uint8_t buttons);

    // The CPU writes 4016: bit 0 is the strobe, for both controllers.
    void write(std::uint8_t value);

    // The CPU reads 4016 (port 0) or 4017 (port 1): the next button, 1 if held.
    std::uint8_t read(int port);

private:
    std::array<std::uint8_t, 2> held_{};    // the buttons held on each controller
    std::array<std::uint8_t, 2> shift_{};   // what is left to send: the next button is bit 0
    bool strobe_ = false;                   // true while the CPU keeps bit 0 of 4016 high
};
