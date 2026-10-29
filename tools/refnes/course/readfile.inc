namespace {

// Read a whole file into memory. Empty if it cannot be read.
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
    return "an unknown result";
}

// Read game.nes and plug it into cart. Prints a message and returns false
// if that does not work.
bool plug_in_cartridge(Cartridge& cart) {
    std::vector<std::uint8_t> data = read_file("game.nes");
    if (data.empty()) {
        std::printf("Could not read the cartridge file.\n");
        return false;
    }
    LoadResult r = cart.load(data);
    if (r == LoadResult::UnsupportedMapper) {
        int mapper = data.size() >= 8 ? ((data[7] & 0xF0) | (data[6] >> 4)) : -1;
        std::printf("This cartridge uses mapper %d, which your emulator does not have yet.\n", mapper);
        return false;
    }
    if (r != LoadResult::Ok) {
        std::printf("Cartridge::load could not read this cartridge (it returned LoadResult::%s).\n", result_name(r));
        return false;
    }
    return true;
}

}  // namespace
