// Opcode's cartridge inspector. Provided by the course.
// It reads game.nes (choose it with the Cartridge menu) and shows what
// your Cartridge class makes of it.
#include <cstdint>
#include <cstdio>
#include <fstream>
#include <iterator>
#include <vector>
#include "cart.h"

#include "readfile.inc"

int main() {
    std::vector<std::uint8_t> data = read_file("game.nes");
    if (data.empty()) {
        std::printf("Could not read the cartridge file.\n");
        return 1;
    }
    std::printf("File size: %zu bytes\n", data.size());
    Cartridge cart;
    LoadResult r = cart.load(data);
    std::printf("load returned LoadResult::%s\n", result_name(r));
    if (r != LoadResult::Ok) return 0;
    std::printf("Mapper:     %d\n", cart.mapper());
    std::printf("PRG ROM:    %d x 16 KB\n", cart.prg_banks());
    if (cart.chr_banks()) std::printf("CHR ROM:    %d x 8 KB\n", cart.chr_banks());
    else std::printf("CHR:        8 KB of CHR RAM\n");
    std::printf("Mirroring:  %s\n", cart.mirroring() == Mirroring::Vertical ? "vertical" : "horizontal");
    std::printf("Battery:    %s\n", cart.has_battery() ? "yes" : "no");
#ifdef SHOW_MEMORY
    std::printf("\nThe CPU's view (cpu_read):\n");
    std::printf("Reset vector at FFFC: %02X%02X\n", cart.cpu_read(0xFFFD), cart.cpu_read(0xFFFC));
    std::printf("8000:");
    for (int i = 0; i < 16; i++) std::printf(" %02X", cart.cpu_read(static_cast<std::uint16_t>(0x8000 + i)));
    std::printf("\nC000:");
    for (int i = 0; i < 16; i++) std::printf(" %02X", cart.cpu_read(static_cast<std::uint16_t>(0xC000 + i)));
    std::printf("\n\nThe PPU's view (ppu_read): the first tile, 16 bytes\n0000:");
    for (int i = 0; i < 16; i++) std::printf(" %02X", cart.ppu_read(static_cast<std::uint16_t>(i)));
    std::printf("\n");
#endif
}
