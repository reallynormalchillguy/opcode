// Opcode's controller tester. Provided by the course.
// Click the picture and press keys. Every frame it does what a game does:
// writes 1 then 0 to the strobe and reads the 8 buttons one at a time,
// through your Controllers class. It draws the buttons it read and prints
// them when they change.
#include <array>
#include <cstdint>
#include <cstdio>
#include <vector>
#include "controller.h"
#include "screen.h"

namespace {

Controllers controllers;
std::vector<std::uint32_t> pixels(256 * 240);
int last = -1;

void box(int x, int y, int w, int h, std::uint32_t colour) {
    for (int j = y; j < y + h; j++)
        for (int i = x; i < x + w; i++) pixels[j * 256 + i] = colour;
}

void frame() {
    controllers.set(0, screen_buttons());
    controllers.write(1);
    controllers.write(0);
    int got = 0;
    for (int i = 0; i < 8; i++) {
        got |= (controllers.read(0) & 1) << i;
    }
    const std::uint32_t body = 0xC8C4BE, dark = 0x303035, red = 0xC8102E, on = 0xF8D838;
    box(0, 0, 256, 240, 0x22263A);
    box(24, 70, 208, 100, body);                    // the controller
    box(40, 96, 56, 48, 0xA8A49E);
    box(60, 102, 16, 36, dark);
    box(46, 112, 44, 16, dark);                     // the cross
    if (got & kButtonUp) box(60, 102, 16, 12, on);
    if (got & kButtonDown) box(60, 126, 16, 12, on);
    if (got & kButtonLeft) box(46, 112, 14, 16, on);
    if (got & kButtonRight) box(76, 112, 14, 16, on);
    box(106, 124, 18, 6, (got & kButtonSelect) ? on : dark);
    box(132, 124, 18, 6, (got & kButtonStart) ? on : dark);
    box(166, 116, 20, 20, (got & kButtonB) ? on : red);
    box(196, 116, 20, 20, (got & kButtonA) ? on : red);
    screen_show(pixels.data());
    if (got != last) {
        const std::array<const char*, 8> names = {"A", "B", "Select", "Start", "Up", "Down", "Left", "Right"};
        std::printf("read:");
        for (int i = 0; i < 8; i++) std::printf(" %s", (got >> i) & 1 ? names[i] : ".");
        std::printf("\n");
        last = got;
    }
}

}  // namespace

int main() {
    controllers.reset();
    std::printf("Click the picture, then press keys: arrows, X (A), Z (B), Enter (Start), Shift (Select).\n");
    screen_loop(frame);
}
