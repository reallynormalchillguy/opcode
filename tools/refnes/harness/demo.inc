// Run Opcode's demo cartridge with scripted buttons.
static Cpu demo_cpu;

static int demo_start(void) {
    long size = 0;
    uint8_t *data = read_file("opcode-demo.nes", &size);
    if (!data) { printf("opcode-demo.nes is missing\n"); return 0; }
    int r = cart_load(data, size);
    free(data);
    if (r != CART_OK) { printf("cart_load returned %d\n", r); return 0; }
    bus_reset();
    ppu_reset();
    cpu_reset(&demo_cpu);
    return 1;
}

static void demo_frame(void) {
    for (long cycles = 0; cycles < 200000; ) {
        int c = cpu_step(&demo_cpu);
        c += bus_take_stall();
        cycles += c;
        for (int i = 0; i < 3 * c; i++) ppu_tick();
        if (ppu_take_nmi()) cpu_nmi(&demo_cpu);
        if (ppu_take_frame()) break;
    }
}

// The buttons for frame f of a walk to the right that jumps onto the chips.
static uint8_t demo_buttons(int f) {
    static const struct { int until; uint8_t buttons; } SCRIPT[] = {
        { 30, 0 }, { 89, 0x80 }, { 92, 0x81 }, { 140, 0x80 }, { 143, 0x81 }, { 190, 0x80 }, { 193, 0x81 },
        { 260, 0x82 }, { 263, 0x83 }, { 330, 0x82 }, { 333, 0x83 }, { 100000, 0x82 },
    };
    int i = 0;
    while (f > SCRIPT[i].until) i++;
    return SCRIPT[i].buttons;                  // 80 Right, 01 A, 02 B: the order of controller.h
}
