namespace {

// A cartridge whose every byte says which bank it is in: PRG bytes hold
// their 8 KB bank number, CHR bytes their 1 KB bank number.
std::vector<std::uint8_t> make_banked(int mapper, int prg16, int chr8, std::uint8_t mirror_bit) {
    std::vector<std::uint8_t> f(16, 0);
    f[0] = 'N'; f[1] = 'E'; f[2] = 'S'; f[3] = 0x1A;
    f[4] = static_cast<std::uint8_t>(prg16);
    f[5] = static_cast<std::uint8_t>(chr8);
    f[6] = static_cast<std::uint8_t>(((mapper & 0x0F) << 4) | mirror_bit);
    f[7] = static_cast<std::uint8_t>(mapper & 0xF0);
    for (long o = 0; o < prg16 * 0x4000L; o++) f.push_back(static_cast<std::uint8_t>(o / 0x2000));
    for (long o = 0; o < chr8 * 0x2000L; o++) f.push_back(static_cast<std::uint8_t>(o / 0x400));
    return f;
}

void show_prg(const char* label) {
    std::printf("%-24s 8000:%2d A000:%2d C000:%2d E000:%2d\n", label, cart.cpu_read(0x8000), cart.cpu_read(0xA000),
                cart.cpu_read(0xC000), cart.cpu_read(0xE000));
}

void show_chr(const char* label) {
    std::printf("%-24s", label);
    for (int i = 0; i < 8; i++) std::printf(" %2d", cart.ppu_read(static_cast<std::uint16_t>(i * 0x400)));
    std::printf("\n");
}

}  // namespace
