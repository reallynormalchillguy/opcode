#ifndef CONTROLLER_H
#define CONTROLLER_H

#include <stdint.h>

// The buttons, as bits of a byte. The controller sends them in this order:
// A first, Right last.
#define BUTTON_A      0x01
#define BUTTON_B      0x02
#define BUTTON_SELECT 0x04
#define BUTTON_START  0x08
#define BUTTON_UP     0x10
#define BUTTON_DOWN   0x20
#define BUTTON_LEFT   0x40
#define BUTTON_RIGHT  0x80

// Power on: nothing held, strobe off.
void controller_reset(void);

// The buttons held on controller `port` (0 or 1) right now.
void controller_set(int port, uint8_t buttons);

// The CPU writes 4016: bit 0 is the strobe, for both controllers.
void controller_write(uint8_t value);

// The CPU reads 4016 (port 0) or 4017 (port 1): the next button, 1 if held.
uint8_t controller_read(int port);

#endif
