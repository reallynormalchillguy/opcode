#include "controller.h"

void Controllers::reset() {
    held_.fill(0);
    shift_.fill(0);
    strobe_ = false;
}

void Controllers::set(int port, std::uint8_t buttons) {
    held_[port] = buttons;
}

void Controllers::write(std::uint8_t value) {
    strobe_ = value & 1;
    if (strobe_) {               // the controllers take a picture of their buttons
        shift_ = held_;
    }
}

std::uint8_t Controllers::read(int port) {
    if (strobe_) {               // while strobe is on, every read is button A, live
        return held_[port] & 1;
    }
    std::uint8_t bit = shift_[port] & 1;
    shift_[port] = static_cast<std::uint8_t>((shift_[port] >> 1) | 0x80);   // after 8 reads: always 1
    return bit;
}
