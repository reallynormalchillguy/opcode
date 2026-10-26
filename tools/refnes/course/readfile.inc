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

// Read game.nes and plug it in. Prints a message and returns 0 on failure.
static int plug_in_cartridge(void) {
    long size = 0;
    uint8_t *data = read_file("game.nes", &size);
    if (!data) {
        printf("Could not read the cartridge file.\n");
        return 0;
    }
    int r = cart_load(data, size);
    free(data);
    if (r == CART_UNSUPPORTED_MAPPER) {
        printf("This cartridge uses mapper %d, which your emulator does not have yet.\n", cart_mapper());
        return 0;
    }
    if (r != CART_OK) {
        printf("cart_load could not read this cartridge (it returned %d).\n", r);
        return 0;
    }
    return 1;
}
