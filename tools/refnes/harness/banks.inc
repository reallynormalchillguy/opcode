// A cartridge whose every byte says which bank it is in: PRG bytes hold
// their 8 KB bank number, CHR bytes their 1 KB bank number.
static uint8_t banked[16 + 0x40000 + 0x20000];

static long make_banked(int mapper, int prg16, int chr8, uint8_t mirror_bit) {
    memset(banked, 0, sizeof banked);
    memcpy(banked, "NES\x1A", 4);
    banked[4] = (uint8_t)prg16;
    banked[5] = (uint8_t)chr8;
    banked[6] = (uint8_t)(((mapper & 0x0F) << 4) | mirror_bit);
    banked[7] = (uint8_t)(mapper & 0xF0);
    uint8_t *p = banked + 16;
    for (long o = 0; o < prg16 * 0x4000L; o++) *p++ = (uint8_t)(o / 0x2000);
    for (long o = 0; o < chr8 * 0x2000L; o++) *p++ = (uint8_t)(o / 0x400);
    return 16 + prg16 * 0x4000L + chr8 * 0x2000L;
}

static void show_prg(const char *label) {
    printf("%-24s 8000:%2d A000:%2d C000:%2d E000:%2d\n", label, cart_cpu_read(0x8000), cart_cpu_read(0xA000),
           cart_cpu_read(0xC000), cart_cpu_read(0xE000));
}

static void show_chr(const char *label) {
    printf("%-24s", label);
    for (int i = 0; i < 8; i++) printf(" %2d", cart_ppu_read((uint16_t)(i * 0x400)));
    printf("\n");
}
