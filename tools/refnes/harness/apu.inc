namespace {

// Helpers for the sound tests.
long ticks = 0;

void run_cycles(long n) {
    for (long i = 0; i < n; i++) { apu.tick(); ticks++; }
}

// Follow channel ch for `cycles` CPU cycles: the highest value, and the
// cycles between the first rising edges.
void measure(int ch, long cycles, const char* label) {
    int prev = apu.channel(ch), peak = prev, edges = 0;
    long first = -1, second = -1, high = 0;
    for (long i = 0; i < cycles; i++) {
        apu.tick();
        int v = apu.channel(ch);
        if (v > peak) peak = v;
        if (v > 0) high++;
        if (v > prev) {
            edges++;
            if (first < 0) first = i; else if (second < 0) second = i;
        }
        prev = v;
    }
    std::printf("%-28s peak %3d, %4ld rises, ", label, peak, static_cast<long>(edges));
    if (second > 0) std::printf("one every %ld cycles, on %ld%% of the time\n", second - first, high * 100 / cycles);
    else std::printf("no repeating wave\n");
}

}  // namespace
