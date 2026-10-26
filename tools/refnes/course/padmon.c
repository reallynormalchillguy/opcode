// Opcode's controller tester. Provided by the course.
// Click the picture and press keys. Every frame it does what a game does:
// writes 1 then 0 to the strobe and reads the 8 buttons one at a time,
// through your controller.c. It draws the buttons it read and prints them
// when they change.
#include <stdio.h>
#include <stdint.h>
#include "controller.h"
#include "screen.h"

static uint32_t pixels[256 * 240];
static int last = -1;

static void box(int x, int y, int w, int h, uint32_t colour) {
    for (int j = y; j < y + h; j++)
        for (int i = x; i < x + w; i++) pixels[j * 256 + i] = colour;
}

static void frame(void) {
    controller_set(0, screen_buttons());
    controller_write(1);
    controller_write(0);
    int got = 0;
    for (int i = 0; i < 8; i++) {
        got |= (controller_read(0) & 1) << i;
    }
    const uint32_t BODY = 0xC8C4BE, DARK = 0x303035, RED = 0xC8102E, ON = 0xF8D838;
    box(0, 0, 256, 240, 0x22263A);
    box(24, 70, 208, 100, BODY);                    // the controller
    box(40, 96, 56, 48, 0xA8A49E);
    box(60, 102, 16, 36, DARK);
    box(46, 112, 44, 16, DARK);                     // the cross
    if (got & BUTTON_UP) box(60, 102, 16, 12, ON);
    if (got & BUTTON_DOWN) box(60, 126, 16, 12, ON);
    if (got & BUTTON_LEFT) box(46, 112, 14, 16, ON);
    if (got & BUTTON_RIGHT) box(76, 112, 14, 16, ON);
    box(106, 124, 18, 6, (got & BUTTON_SELECT) ? ON : DARK);
    box(132, 124, 18, 6, (got & BUTTON_START) ? ON : DARK);
    box(166, 116, 20, 20, (got & BUTTON_B) ? ON : RED);
    box(196, 116, 20, 20, (got & BUTTON_A) ? ON : RED);
    screen_show(pixels);
    if (got != last) {
        static const char *NAMES[8] = { "A", "B", "Select", "Start", "Up", "Down", "Left", "Right" };
        printf("read:");
        for (int i = 0; i < 8; i++) printf(" %s", (got >> i) & 1 ? NAMES[i] : ".");
        printf("\n");
        last = got;
    }
}

int main(void) {
    controller_reset();
    printf("Click the picture, then press keys: arrows, X (A), Z (B), Enter (Start), Shift (Select).\n");
    screen_loop(frame);
    return 0;
}
