#pragma once
#include <cstdint>

// Provided by the page, not by C++. They work in this course's workbench.
// extern "C" says they follow C's rules for names (lesson 12).
extern "C" {

// Show a 256 x 240 picture under the editor. Each pixel is 0x00RRGGBB.
void screen_show(const std::uint32_t* pixels);

// From now on, call frame() about 60 times a second until Stop is pressed.
// It never returns: call it once, at the end of main.
void screen_loop(void (*frame)());

// The controller buttons held right now: bit 0 A, 1 B, 2 Select, 3 Start,
// 4 Up, 5 Down, 6 Left, 7 Right. The picture must be clicked first.
std::uint8_t screen_buttons();
//@ 35

// Play sound: `count` samples at 44100 a second, each from -1 to 1. Send
// about 735 every frame; the page plays them one after another.
void screen_audio(const float* samples, int count);
//@ end

}
