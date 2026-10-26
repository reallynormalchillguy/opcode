#ifndef SCREEN_H
#define SCREEN_H

#include <stdint.h>

// Provided by the page, not by C. They work in this course's workbench.

// Show a 256 x 240 picture under the editor. Each pixel is 0x00RRGGBB.
void screen_show(const uint32_t *pixels);

// After main returns, call frame() about 60 times a second until Stop is
// pressed. Call it once, at the end of main.
void screen_loop(void (*frame)(void));

// The controller buttons held right now: bit 0 A, 1 B, 2 Select, 3 Start,
// 4 Up, 5 Down, 6 Left, 7 Right. The picture must be clicked first.
uint8_t screen_buttons(void);

#endif
