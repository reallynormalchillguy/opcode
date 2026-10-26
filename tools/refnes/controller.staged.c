#include "controller.h"

static uint8_t held[2];          // the buttons held on each controller
static uint8_t shift[2];         // what is left to send: the next button is bit 0
static int strobe;               // 1 while the CPU keeps bit 0 of 4016 high

void controller_reset(void) {
    held[0] = held[1] = 0;
    shift[0] = shift[1] = 0;
    strobe = 0;
}

void controller_set(int port, uint8_t buttons) {
    held[port] = buttons;
}

void controller_write(uint8_t value) {
    strobe = value & 1;
    if (strobe) {                // the controllers take a picture of their buttons
        shift[0] = held[0];
        shift[1] = held[1];
    }
}

uint8_t controller_read(int port) {
    if (strobe) {                // while strobe is on, every read is button A, live
        return held[port] & 1;
    }
    uint8_t bit = shift[port] & 1;
    shift[port] = (uint8_t)((shift[port] >> 1) | 0x80);   // after 8 reads: always 1
    return bit;
}
