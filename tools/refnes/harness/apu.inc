// Helpers for the sound tests.
static long ticks;

static void run_cycles(long n) {
    for (long i = 0; i < n; i++) { apu_tick(); ticks++; }
}

// Follow channel ch for `cycles` CPU cycles: the highest value, and the
// cycles between the first rising edges.
static void measure(int ch, long cycles, const char *label) {
    int prev = apu_channel(ch), peak = prev, edges = 0;
    long first = -1, second = -1, high = 0;
    for (long i = 0; i < cycles; i++) {
        apu_tick();
        int v = apu_channel(ch);
        if (v > peak) peak = v;
        if (v > 0) high++;
        if (v > prev) {
            edges++;
            if (first < 0) first = i; else if (second < 0) second = i;
        }
        prev = v;
    }
    printf("%-28s peak %3d, %4ld rises, ", label, peak, (long)edges);
    if (second > 0) printf("one every %ld cycles, on %ld%% of the time\n", second - first, high * 100 / cycles);
    else printf("no repeating wave\n");
}
