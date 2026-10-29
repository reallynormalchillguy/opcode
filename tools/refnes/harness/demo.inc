namespace {

// Run Opcode's demo cartridge with scripted buttons.
bool demo_start() {
    std::vector<std::uint8_t> data = read_file("opcode-demo.nes");
    if (data.empty()) { std::printf("opcode-demo.nes is missing\n"); return false; }
    LoadResult r = cart.load(data);
    if (r != LoadResult::Ok) { std::printf("load returned LoadResult::%s\n", result_name(r)); return false; }
    bus.reset();
    ppu.reset();
    cpu.reset();
    return true;
}

void demo_frame() {
    for (long cycles = 0; cycles < 200000; ) {
        int c = cpu.step();
        c += bus.take_stall();
        cycles += c;
        for (int i = 0; i < 3 * c; i++) ppu.tick();
        if (ppu.take_nmi()) cpu.nmi();
        if (ppu.take_frame()) break;
    }
}

// The buttons for frame f of a walk to the right that jumps onto the chips.
std::uint8_t demo_buttons(int f) {
    struct Step { int until; std::uint8_t buttons; };
    const Step script[] = {
        {30, 0}, {89, 0x80}, {92, 0x81}, {140, 0x80}, {143, 0x81}, {190, 0x80}, {193, 0x81},
        {260, 0x82}, {263, 0x83}, {330, 0x82}, {333, 0x83}, {100000, 0x82},
    };
    int i = 0;
    while (f > script[i].until) i++;
    return script[i].buttons;                  // 80 Right, 01 A, 02 B: the order of controller.h
}

}  // namespace
