// Builds a small iNES file in memory for the tests.
static uint8_t rom_file[16 + 512 + 2 * 0x4000 + 0x2000];

static long make_rom(int prg_banks, int chr_banks, uint8_t flags6, uint8_t flags7) {
    memset(rom_file, 0, sizeof rom_file);
    memcpy(rom_file, "NES\x1A", 4);
    rom_file[4] = (uint8_t)prg_banks;
    rom_file[5] = (uint8_t)chr_banks;
    rom_file[6] = flags6;
    rom_file[7] = flags7;
    long trainer = (flags6 & 0x04) ? 512 : 0;
    uint8_t *p = rom_file + 16 + trainer;
    for (long i = 0; i < prg_banks * 0x4000L; i++) *p++ = (uint8_t)(i * 7 + (i >> 8));
    for (long i = 0; i < chr_banks * 0x2000L; i++) *p++ = (uint8_t)(0xA0 ^ i ^ (i >> 4));
    return 16 + trainer + prg_banks * 0x4000L + chr_banks * 0x2000L;
}

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
