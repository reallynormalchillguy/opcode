// Run the cartridge for `frames` frames without showing them.
static Cpu cpu;

static void run_frames(int frames) {
    for (int f = 0; f < frames; f++) {
        for (long cycles = 0; cycles < 200000; ) {
            int c = cpu_step(&cpu);
            c += bus_take_stall();
            cycles += c;
            for (int i = 0; i < 3 * c; i++) {
                ppu_tick();
            }
            if (ppu_take_nmi()) {
                cpu_nmi(&cpu);
            }
            if (ppu_take_frame()) {
                break;
            }
        }
    }
}
