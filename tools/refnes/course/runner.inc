namespace {

// The console, and a way to run the cartridge for `frames` frames without
// showing them.
Cartridge cart;
Ppu ppu(cart);
Bus bus(cart, ppu);
Cpu cpu(bus);

void run_frames(int frames) {
    for (int f = 0; f < frames; f++) {
        for (long cycles = 0; cycles < 200000; ) {
            int c = cpu.step();
            c += bus.take_stall();
            cycles += c;
            for (int i = 0; i < 3 * c; i++) {
                ppu.tick();
            }
            if (ppu.take_nmi()) {
                cpu.nmi();
            }
            if (ppu.take_frame()) {
                break;
            }
        }
    }
}

}  // namespace
