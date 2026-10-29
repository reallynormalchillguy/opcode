namespace {

// Builds a small iNES file in memory for the tests.
std::vector<std::uint8_t> make_rom(int prg_banks, int chr_banks, std::uint8_t flags6, std::uint8_t flags7) {
    std::vector<std::uint8_t> f(16, 0);
    f[0] = 'N'; f[1] = 'E'; f[2] = 'S'; f[3] = 0x1A;
    f[4] = static_cast<std::uint8_t>(prg_banks);
    f[5] = static_cast<std::uint8_t>(chr_banks);
    f[6] = flags6;
    f[7] = flags7;
    if (flags6 & 0x04) f.resize(16 + 512, 0);
    for (long i = 0; i < prg_banks * 0x4000L; i++) f.push_back(static_cast<std::uint8_t>(i * 7 + (i >> 8)));
    for (long i = 0; i < chr_banks * 0x2000L; i++) f.push_back(static_cast<std::uint8_t>(0xA0 ^ i ^ (i >> 4)));
    return f;
}

std::vector<std::uint8_t> read_file(const char* name) {
    std::ifstream f(name, std::ios::binary);
    return std::vector<std::uint8_t>(std::istreambuf_iterator<char>(f), std::istreambuf_iterator<char>());
}

const char* result_name(LoadResult r) {
    switch (r) {
    case LoadResult::Ok: return "Ok";
    case LoadResult::NotInes: return "NotInes";
    case LoadResult::TooShort: return "TooShort";
    case LoadResult::UnsupportedMapper: return "UnsupportedMapper";
    }
    return "?";
}

}  // namespace
