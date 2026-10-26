// Opcode's cartridge inspector. Provided by the course.
// It reads game.nes (choose it with the Cartridge menu) and shows what
// your cart.c makes of it.
#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include "cart.h"

static uint8_t *read_file(const char *name, long *size) {
    FILE *f = fopen(name, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    *size = ftell(f);
    fseek(f, 0, SEEK_SET);
    uint8_t *data = malloc(*size);
    if (data && fread(data, 1, *size, f) != (size_t)*size) { free(data); data = NULL; }
    fclose(f);
    return data;
}

static const char *result_name(int r) {
    switch (r) {
    case CART_OK: return "CART_OK";
    case CART_NOT_INES: return "CART_NOT_INES";
    case CART_TOO_SHORT: return "CART_TOO_SHORT";
    case CART_UNSUPPORTED_MAPPER: return "CART_UNSUPPORTED_MAPPER";
    case CART_NO_MEMORY: return "CART_NO_MEMORY";
    }
    return "an unknown code";
}

int main(void) {
    long size = 0;
    uint8_t *data = read_file("game.nes", &size);
    if (!data) {
        printf("Could not read the cartridge file.\n");
        return 1;
    }
    printf("File size: %ld bytes\n", size);
    int r = cart_load(data, size);
    printf("cart_load returned %d (%s)\n", r, result_name(r));
    if (r != CART_OK) return 0;
    printf("Mapper:     %d\n", cart_mapper());
    printf("PRG ROM:    %d x 16 KB\n", cart_prg_banks());
    if (cart_chr_banks()) printf("CHR ROM:    %d x 8 KB\n", cart_chr_banks());
    else printf("CHR:        8 KB of CHR RAM\n");
    printf("Mirroring:  %s\n", cart_mirroring() == MIRROR_VERTICAL ? "vertical" : "horizontal");
    printf("Battery:    %s\n", cart_has_battery() ? "yes" : "no");
#ifdef SHOW_MEMORY
    printf("\nThe CPU's view (cart_cpu_read):\n");
    printf("Reset vector at FFFC: %02X%02X\n", cart_cpu_read(0xFFFD), cart_cpu_read(0xFFFC));
    printf("8000:");
    for (int i = 0; i < 16; i++) printf(" %02X", cart_cpu_read((uint16_t)(0x8000 + i)));
    printf("\nC000:");
    for (int i = 0; i < 16; i++) printf(" %02X", cart_cpu_read((uint16_t)(0xC000 + i)));
    printf("\n\nThe PPU's view (cart_ppu_read): the first tile, 16 bytes\n0000:");
    for (int i = 0; i < 16; i++) printf(" %02X", cart_ppu_read((uint16_t)i));
    printf("\n");
#endif
    free(data);
    return 0;
}
