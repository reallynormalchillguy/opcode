// Opcode's scanline monitor. Provided by the course.
// It runs the cartridge for a number of frames (Program input, 60 if
// empty), then asks your ppu_sprites_on_line which sprites each scanline
// has, and prints the lines that have any, grouped.
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include "bus.h"
#include "cart.h"
#include "cpu.h"
#include "ppu.h"

#include "readfile.inc"
#include "runner.inc"

static void describe(int count, const uint8_t found[8], char *out) {
    int n = count > 8 ? 8 : count;
    out += sprintf(out, "%d sprite%s:", count, count == 1 ? "" : "s");
    for (int i = 0; i < n; i++) out += sprintf(out, " %d", found[i]);
    if (count > 8) sprintf(out, "  (%d left out)", count - 8);
}

int main(void) {
    if (!plug_in_cartridge()) return 1;
    int frames = 60;
    if (scanf("%d", &frames) != 1) frames = 60;
    bus_reset();
    ppu_reset();
    cpu_reset(&cpu);
    run_frames(frames);
    printf("After %d frames:\n", frames);
    char prev[128] = "", text[128];
    int start = 0;
    for (int y = 0; y <= 240; y++) {
        text[0] = 0;
        if (y < 240) {
            uint8_t found[8] = { 0 };
            int count = ppu_sprites_on_line(y, found);
            if (count > 0) describe(count, found, text);
        }
        if (strcmp(text, prev) != 0) {
            if (prev[0]) printf("lines %3d-%3d  %s\n", start, y - 1, prev);
            strcpy(prev, text);
            start = y;
        }
    }
    return 0;
}
