#include <stdio.h>
#include <stdint.h>
#include "controller.h"

static void read8(int port, const char *label) {
    printf("%s:", label);
    for (int i = 0; i < 8; i++) printf(" %d", controller_read(port));
    printf("\n");
}

int main(void) {
    int t = 0;
    if (scanf("%d", &t) != 1) return 1;
    controller_reset();
    if (t == 1) {
        controller_set(0, BUTTON_A | BUTTON_RIGHT);
        controller_write(1);
        controller_write(0);
        read8(0, "A and Right held, 8 reads");
        printf("3 more reads: %d %d %d\n", controller_read(0), controller_read(0), controller_read(0));
        controller_set(0, BUTTON_START | BUTTON_UP);
        controller_write(1);
        controller_write(0);
        read8(0, "Start and Up, after a new strobe");
    }
    if (t == 2) {
        controller_set(0, BUTTON_A);
        controller_write(1);
        printf("strobe on, A held: %d %d %d", controller_read(0), controller_read(0), controller_read(0));
        controller_set(0, BUTTON_B);
        printf(", A let go: %d %d\n", controller_read(0), controller_read(0));
    }
    if (t == 3) {
        controller_set(0, BUTTON_LEFT);
        controller_write(1);
        controller_write(0);
        controller_set(0, BUTTON_DOWN);
        read8(0, "Left held at the strobe, Down after");
        controller_write(1);
        controller_write(0);
        read8(0, "next strobe");
    }
    if (t == 4) {
        controller_set(0, BUTTON_SELECT);
        controller_set(1, BUTTON_B | BUTTON_LEFT);
        controller_write(1);
        controller_write(0);
        read8(1, "controller 2");
        read8(0, "controller 1");
    }
    if (t == 5) {
        printf("nothing pressed, no strobe yet:");
        for (int i = 0; i < 3; i++) printf(" %d", controller_read(0));
        printf("\n");
    }
    return 0;
}
