(() => {
const R = String.raw;

Course.add({
  id: 'cpp-files',
  part: 'cpp',
  title: 'Programs in many files',
  summary: 'Header files, classes split across .h and .cpp, namespaces, and how the compiler and linker turn many files into one program.',
  blocks: [
    { t: 'p', html: 'Your emulator will have a CPU, a bus, a cartridge, a picture chip, a sound chip and a controller. Putting all of that in one file would make a file of several thousand lines that nobody can find their way around. C++ programs are split into <em>modules</em>: each class gets a header (<code>.h</code>) that says what the rest of the program may use, and a source file (<code>.cpp</code>) with the code.' },

    { t: 'h', text: 'What #include really does' },
    { t: 'p', html: '<code>#include "file.h"</code> is handled by the preprocessor before compiling, and it is crude: it pastes the entire contents of <code>file.h</code> in place of that line. Nothing more. Angle brackets (<code>&lt;vector&gt;</code>) look in the system folders; double quotes look next to your own files first.' },

    { t: 'h', text: 'A module: header plus source' },
    { t: 'p', html: 'The header holds <em>declarations</em>: the class with its members and member function declarations, and any free functions others need. The source file holds the <em>definitions</em>: the function bodies. Here is a small module that keeps score:' },
    { t: 'code', title: 'score.h', lines: [
      ['#pragma once', 'Include this file only once per <code>.cpp</code>, even if it is included several times (directly, or through other headers). Without it, the class would be defined twice, which is an error. Older code does the same with an <em>include guard</em>: <code>#ifndef SCORE_H</code> / <code>#define SCORE_H</code> at the top and <code>#endif</code> at the bottom.'],
      [''],
      ['class Score {'],
      ['public:'],
      ['    void add(int points);', 'Declarations only. Any file that includes <code>score.h</code> can use a <code>Score</code>.'],
      ['    int total() const;'],
      ['private:'],
      ['    int total_ = 0;', 'The private data has to be in the header too: the compiler needs to know how big a <code>Score</code> is to create one.'],
      ['};'],
    ] },
    { t: 'code', title: 'score.cpp', lines: [
      ['#include "score.h"', 'A module includes its own header. If the definitions below do not match the declarations, the compiler tells you here.'],
      [''],
      ['namespace {', 'An <em>unnamed namespace</em>: everything inside is private to this file. No other file can see or call <code>bonus</code>, so its name can never clash with a <code>bonus</code> somewhere else.'],
      [''],
      ['int bonus(int points) {'],
      ['    return points >= 1000 ? points / 10 : 0;', 'The <code>? :</code> operator: if the condition holds, the first value, otherwise the second.'],
      ['}'],
      [''],
      ['}  // namespace'],
      [''],
      ['void Score::add(int points) {'],
      ['    total_ += points + bonus(points);'],
      ['}'],
      [''],
      ['int Score::total() const {'],
      ['    return total_;'],
      ['}'],
    ] },
    { t: 'code', title: 'main.cpp', lines: [
      ['#include <iostream>'],
      ['#include "score.h"', 'Now <code>main.cpp</code> knows what a <code>Score</code> looks like, without knowing anything about how its functions work.'],
      [''],
      ['int main() {'],
      ['    Score score;'],
      ['    score.add(200);'],
      ['    score.add(1000);'],
      [R`    std::cout << score.total() << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'Short member functions, like one-line getters, may be written inside the class in the header; those are fine because a function defined inside its class is automatically allowed to appear in several files. Everything longer goes in the <code>.cpp</code>.' },

    { t: 'h', text: 'Compiling and linking' },
    { t: 'p', html: 'Each <code>.cpp</code> file is compiled <em>on its own</em> into an object file. While compiling <code>main.cpp</code>, the compiler only sees <code>main.cpp</code> plus the headers it includes; it trusts the declarations and leaves a note saying "this calls <code>Score::add(int)</code>, which lives somewhere else". Then the <em>linker</em> takes all the object files and connects every such note to the one definition. When you press Run, every <code>.cpp</code> in the editor is compiled and then linked together.' },
    { t: 'p', html: 'That split explains the kinds of error you will meet:' },
    { t: 'table', head: ['Message', 'Stage', 'Usual cause'], rows: [
      ['<code>use of undeclared identifier \'Score\'</code>', 'Compiling', 'You forgot to include the header, or misspelled the name.'],
      ['<code>wasm-ld: error: undefined symbol: Score::add(int)</code> (on a PC: <em>undefined reference</em>)', 'Linking', 'The declaration exists, but no <code>.cpp</code> file defines it, or the definition\'s name or parameter types are different (<code>Score::add(long)</code> is a different function), or you forgot the <code>Score::</code>.'],
      ['<code>duplicate symbol</code> (on a PC: <em>multiple definition</em>)', 'Linking', 'A function was <em>defined</em> in a header outside any class, so every file that includes it defines it again.'],
    ] },
    { t: 'note', kind: 'warn', html: 'Headers hold declarations. Function bodies outside a class go in <code>.cpp</code> files. (A function body in a header is allowed only if it is marked <code>inline</code>, which tells the linker that the copies are all the same.) Constants are fine in headers: <code>constexpr int kRamSize = 0x800;</code> works in any number of files.' },

    { t: 'h', text: 'Namespaces' },
    { t: 'p', html: 'Big programs, and the libraries they use, have many names. Two libraries that both define a <code>Bus</code> would clash. A <em>namespace</em> is a family name that keeps names apart: the standard library puts everything in <code>std</code>, which is why you write <code>std::vector</code>.' },
    { t: 'code', title: 'namespace.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['namespace nes {', 'Everything until the matching brace is in the namespace <code>nes</code>.'],
      ['constexpr int kWidth = 256;'],
      ['constexpr int kHeight = 240;'],
      ['int pixels() { return kWidth * kHeight; }'],
      ['}  // namespace nes'],
      [''],
      ['namespace gameboy {', 'A different family, with its own <code>kWidth</code>. No clash.'],
      ['constexpr int kWidth = 160;'],
      ['}'],
      [''],
      ['int main() {'],
      [R`    std::cout << nes::kWidth << " " << gameboy::kWidth << "\n";`, 'Outside a namespace, write its name and <code>::</code> in front.'],
      ['    using nes::pixels;', '<code>using</code> brings one name in, so you can write it without the prefix in this block.'],
      [R`    std::cout << pixels() << "\n";`],
      ['}'],
    ] },
    { t: 'note', kind: 'warn', html: 'You will see <code>using namespace std;</code> in many examples online. It pulls every name in the standard library into your code, where they can collide with yours (<code>std::count</code>, <code>std::data</code> and <code>std::size</code> are common surprises). Never put it in a header; in this course we simply write <code>std::</code>.' },

    { t: 'h', text: 'Talking to C code' },
    { t: 'p', html: 'C++ encodes parameter types into the names it gives the linker, so that overloads can coexist; C does not. To call a function written in C, or written by the browser like the screen functions you will use later, its declaration is wrapped in <code>extern "C" { ... }</code>. You will see that line at the top of <code>screen.h</code>, and you never have to write it yourself.' },

    { t: 'h', text: 'The shape of your emulator' },
    { t: 'p', html: 'From the next part on, you will build the emulator as these modules. Each one is small enough to understand on its own:' },
    { t: 'table', head: ['Module', 'Its job'], rows: [
      ['<code>bus.h</code> / <code>bus.cpp</code>', 'Decides what each CPU address reaches: RAM, a PPU register, the controller or the cartridge.'],
      ['<code>cpu.h</code> / <code>cpu.cpp</code>', 'The 6502: registers, flags and all 151 official instructions.'],
      ['<code>cartridge.h</code> / <code>cartridge.cpp</code>', 'Reads the iNES file and creates the right mapper.'],
      ['<code>ppu.h</code> / <code>ppu.cpp</code>', 'The picture chip: tiles, palettes, sprites and scrolling, one pixel at a time.'],
      ['<code>apu.h</code> / <code>apu.cpp</code>', 'The sound chip.'],
      ['<code>main.cpp</code>', 'Loads the ROM, runs frames, shows them and reads the keyboard.'],
    ] },
    { t: 'note', kind: 'nes', html: 'The second exercise below is the first version of the <code>Bus</code> class. You will keep extending it all the way to the end of the course.' },

    { t: 'quiz', q: 'Your program compiles, but linking fails with <code>undefined symbol: Ppu::tick()</code>. What is the most likely cause?', options: [
      'ppu.h is not included in main.cpp',
      '<code>Ppu::tick</code> is declared in the class but no .cpp file defines it (or it was defined without <code>Ppu::</code>)',
      'A missing semicolon in ppu.h',
    ], answer: 1, explain: 'Compiling succeeded, so every file could see the declaration. The linker could not find a definition to connect the call to. A body written as <code>void tick() { ... }</code> without <code>Ppu::</code> defines an unrelated free function.' },
    { t: 'quiz', q: 'Why put a helper function inside <code>namespace { ... }</code> in a .cpp file?', options: [
      'It makes the function faster',
      'Only that file can use it, so it cannot clash with another file\'s function of the same name',
      'It makes the function part of the class',
    ], answer: 1, explain: 'An unnamed namespace makes names private to the file. It is the C++ way of keeping a module\'s helpers to itself.' },
  ],

  exercises: [
    {
      id: 'cpp-files-1',
      title: 'A hexdump module',
      prompt: '<p>Every emulator needs a way to look at raw memory. Create a module made of <code>hex.h</code> and <code>hex.cpp</code> with one function:</p><pre>void hexdump(const std::vector&lt;std::uint8_t&gt;&amp; data, std::uint16_t base);</pre><p>It prints the bytes 16 per line. Each line starts with the address of its first byte (<code>base</code> plus the offset) as 4 hex digits and a colon, followed by each byte as a space and 2 hex digits. The last line may be shorter. For 20 bytes at <code>0xC000</code>:</p><pre>C000: 4C F5 C5 60 78 D8 A2 FF 9A AD 02 20 10 FB AD 02\nC010: 20 10 FB A9</pre><p><code>main.cpp</code> is already written and must not change. <code>hex.h</code> needs <code>#pragma once</code>, the includes for the types it uses, and the declaration; <code>hex.cpp</code> needs the definition.</p>',
      files: {
        'main.cpp': R`#include <cstdint>
#include <vector>
#include "hex.h"

int main() {
    const std::vector<std::uint8_t> code = {
        0x4C, 0xF5, 0xC5, 0x60, 0x78, 0xD8, 0xA2, 0xFF, 0x9A, 0xAD,
        0x02, 0x20, 0x10, 0xFB, 0xAD, 0x02, 0x20, 0x10, 0xFB, 0xA9,
    };
    hexdump(code, 0xC000);
}
`,
        'hex.h': '// Declare hexdump here.\n',
        'hex.cpp': R`#include <cstdio>
#include "hex.h"

// Define hexdump here.
`,
      },
      harness: { 'main.cpp': R`#include <cstdint>
#include <cstdio>
#include <iostream>
#include <vector>
#include "hex.h"
#include "hex.h"
int main() {
    int t = 0;
    std::cin >> t;
    std::vector<std::uint8_t> d;
    for (int i = 0; i < 40; i++) d.push_back(static_cast<std::uint8_t>(i * 7 + 3));
    auto first = [&](int n) { return std::vector<std::uint8_t>(d.begin(), d.begin() + n); };
    if (t == 1) hexdump(first(20), 0xC000);
    if (t == 2) hexdump(first(16), 0x0000);
    if (t == 3) hexdump(first(3), 0x8001);
    if (t == 4) hexdump(d, 0x01F8);
    if (t == 5) { hexdump({}, 0x1234); std::printf("end\n"); }
}
` },
      tests: [
        { name: 'Two lines', stdin: '1', expect: 'C000: 03 0A 11 18 1F 26 2D 34 3B 42 49 50 57 5E 65 6C\nC010: 73 7A 81 88\n' },
        { name: 'Exactly one full line', stdin: '2', expect: '0000: 03 0A 11 18 1F 26 2D 34 3B 42 49 50 57 5E 65 6C\n' },
        { name: 'A short dump at an odd address', stdin: '3', expect: '8001: 03 0A 11\n' },
        { name: 'Three lines', stdin: '4', expect: '01F8: 03 0A 11 18 1F 26 2D 34 3B 42 49 50 57 5E 65 6C\n0208: 73 7A 81 88 8F 96 9D A4 AB B2 B9 C0 C7 CE D5 DC\n0218: E3 EA F1 F8 FF 06 0D 14\n' },
        { name: 'Nothing to print', stdin: '5', expect: 'end\n' },
      ],
      hints: [
        '<code>hex.h</code>: <code>#pragma once</code>, then <code>#include &lt;cstdint&gt;</code> and <code>#include &lt;vector&gt;</code>, then the declaration ending in a semicolon.',
        'In <code>hex.cpp</code>, loop over every index <code>i</code>. When <code>i % 16 == 0</code>, end the previous line (unless <code>i</code> is 0) and print the address with <code>std::printf("%04X:", static_cast&lt;std::uint16_t&gt;(base + i))</code>. Print each byte with <code>" %02X"</code>, and a final new line if anything was printed.',
      ],
      solution: {
        'hex.h': R`#pragma once
#include <cstdint>
#include <vector>

void hexdump(const std::vector<std::uint8_t>& data, std::uint16_t base);
`,
        'hex.cpp': R`#include <cstdio>
#include "hex.h"

void hexdump(const std::vector<std::uint8_t>& data, std::uint16_t base) {
    for (std::size_t i = 0; i < data.size(); i++) {
        if (i % 16 == 0) {
            if (i > 0) {
                std::printf("\n");
            }
            std::printf("%04X:", static_cast<std::uint16_t>(base + i));
        }
        std::printf(" %02X", data[i]);
    }
    if (!data.empty()) {
        std::printf("\n");
    }
}
`,
      },
    },
    {
      id: 'cpp-files-2',
      title: 'The bus, version 1',
      prompt: '<p>The <em>bus</em> connects the CPU to everything else: every read and write the CPU makes goes through it. <code>bus.h</code> declares the <code>Bus</code> class, with the console\'s 2 KB of RAM as a private <code>std::array</code>. Write its member functions in <code>bus.cpp</code>:</p><ul><li><code>void reset()</code>: sets all of RAM to 0.</li><li><code>std::uint8_t read(std::uint16_t addr) const</code>: addresses <code>0x0000</code>-<code>0x1FFF</code> read RAM, mirrored every <code>0x800</code> bytes (you did this in lesson 4). Every other address returns 0 for now.</li><li><code>void write(std::uint16_t addr, std::uint8_t value)</code>: writes RAM the same way. Writes to every other address are ignored for now.</li></ul><p><code>main.cpp</code> runs commands so you can try it: <code>w 0801 AB</code> writes, <code>r 0001</code> reads, <code>z 0</code> resets. Do not change it or <code>bus.h</code>.</p>',
      files: {
        'main.cpp': R`#include <cstdio>
#include <iostream>
#include "bus.h"

// Commands: "w ADDR VALUE" writes, "r ADDR" reads, "z 0" resets. Numbers in hex.
int main() {
    Bus bus;
    bus.reset();
    char cmd = 0;
    unsigned addr = 0, value = 0;
    while (std::cin >> cmd >> std::hex >> addr) {
        if (cmd == 'w' && std::cin >> value) {
            bus.write(static_cast<std::uint16_t>(addr), static_cast<std::uint8_t>(value));
        } else if (cmd == 'r') {
            std::printf("%04X: %02X\n", addr, bus.read(static_cast<std::uint16_t>(addr)));
        } else if (cmd == 'z') {
            bus.reset();
        }
    }
}
`,
        'bus.h': R`#pragma once
#include <array>
#include <cstdint>

class Bus {
public:
    void reset();
    std::uint8_t read(std::uint16_t addr) const;
    void write(std::uint16_t addr, std::uint8_t value);

private:
    std::array<std::uint8_t, 0x800> ram_{};
};
`,
        'bus.cpp': R`#include "bus.h"

// Write the Bus member functions here.
`,
      },
      stdin: 'w 0801 AB\nr 0001\nr 1001',
      tests: [
        { name: 'Write and read back', stdin: 'w 0000 42\nr 0000\nw 07FF 99\nr 07FF', expect: '0000: 42\n07FF: 99\n' },
        { name: 'RAM is mirrored up to 1FFF', stdin: 'w 0801 AB\nr 0001\nr 1001\nr 1801\nw 1FFF 5A\nr 07FF', expect: '0001: AB\n1001: AB\n1801: AB\n07FF: 5A\n' },
        { name: 'Other addresses read 0 and ignore writes', stdin: 'w 4000 12\nr 4000\nw 8000 FF\nr 8000\nr 0000\nr 2000', expect: '4000: 00\n8000: 00\n0000: 00\n2000: 00\n' },
        { name: 'reset clears RAM', stdin: 'w 0010 77\nz 0\nr 0010', expect: '0010: 00\n' },
      ],
      hints: [
        'Each definition starts with <code>Bus::</code>, and <code>read</code> keeps its <code>const</code>: <code>std::uint8_t Bus::read(std::uint16_t addr) const { ... }</code>',
        '<code>reset</code> can be <code>ram_.fill(0);</code>. In <code>read</code> and <code>write</code>, check <code>addr &lt; 0x2000</code> and use <code>ram_[addr % 0x800]</code> (or <code>ram_[addr &amp; 0x7FF]</code>).',
      ],
      solution: { 'bus.cpp': R`#include "bus.h"

void Bus::reset() {
    ram_.fill(0);
}

std::uint8_t Bus::read(std::uint16_t addr) const {
    if (addr < 0x2000) {
        return ram_[addr & 0x7FF];
    }
    return 0;
}

void Bus::write(std::uint16_t addr, std::uint8_t value) {
    if (addr < 0x2000) {
        ram_[addr & 0x7FF] = value;
    }
}
` },
    },
    {
      id: 'cpp-files-3',
      title: 'The master clock',
      prompt: '<p>The NES picture chip draws one dot per tick, 341 dots per scanline and 262 scanlines per frame (240 visible, the rest are time for the game to work). It ticks exactly 3 times for every CPU cycle. Your emulator keeps the two in step with a clock. <code>clock.h</code> declares the <code>MasterClock</code> class; write its member functions in <code>clock.cpp</code>:</p><ul><li><code>void reset()</code>: dot 0, scanline 0, frame 0.</li><li><code>void cpu_cycles(int cycles)</code>: advances the picture chip by <code>3 * cycles</code> dots. After dot 340 comes dot 0 of the next scanline; after scanline 261 comes scanline 0 of the next frame.</li><li><code>int dot() const</code>, <code>int scanline() const</code> and <code>long frame() const</code> return the current position.</li></ul><p>Keep the numbers 341 and 262 as named constants inside an unnamed namespace in <code>clock.cpp</code>. One frame is 341 × 262 = 89,342 dots, which is 29,780 CPU cycles plus a third.</p>',
      files: {
        'main.cpp': R`#include <iostream>
#include "clock.h"

int main() {
    MasterClock clock;
    clock.cpu_cycles(114);
    std::cout << "frame " << clock.frame() << ", scanline " << clock.scanline() << ", dot " << clock.dot() << "\n";
    clock.cpu_cycles(29781);
    std::cout << "frame " << clock.frame() << ", scanline " << clock.scanline() << ", dot " << clock.dot() << "\n";
}
`,
        'clock.h': R`#pragma once

class MasterClock {
public:
    void reset();
    void cpu_cycles(int cycles);
    int dot() const;
    int scanline() const;
    long frame() const;

private:
    int dot_ = 0;
    int scanline_ = 0;
    long frame_ = 0;
};
`,
        'clock.cpp': R`#include "clock.h"

// Write the MasterClock member functions here.
`,
      },
      harness: { 'main.cpp': R`#include <iostream>
#include "clock.h"
static MasterClock c;
static void show() { std::cout << c.frame() << " " << c.scanline() << " " << c.dot() << "\n"; }
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { c.cpu_cycles(1); show(); c.cpu_cycles(100); show(); }
    if (t == 2) { c.cpu_cycles(113); show(); c.cpu_cycles(1); show(); c.cpu_cycles(1); show(); }
    if (t == 3) { c.cpu_cycles(29780); show(); c.cpu_cycles(1); show(); }
    if (t == 4) { for (int i = 0; i < 60 * 29781; i++) c.cpu_cycles(1); show(); }
    if (t == 5) { c.cpu_cycles(5000); c.reset(); show(); c.cpu_cycles(200000); show(); }
}
` },
      tests: [
        { name: 'A few cycles', stdin: '1', expect: '0 0 3\n0 0 303\n' },
        { name: 'Crossing into the next scanline', stdin: '2', expect: '0 0 339\n0 1 1\n0 1 4\n' },
        { name: 'Crossing into the next frame', stdin: '3', expect: '0 261 339\n1 0 1\n' },
        { name: 'One second, a cycle at a time', stdin: '4', expect: '60 0 60\n' },
        { name: 'Reset, then a big jump', stdin: '5', expect: '0 0 0\n6 187 181\n' },
      ],
      rules: [{ re: 'namespace\\s*\\{', must: true, msg: 'Keep the constants in an unnamed namespace (namespace { ... }) in clock.cpp.' }],
      hints: [
        'At the top of <code>clock.cpp</code>: <code>namespace { constexpr int kDotsPerLine = 341; constexpr int kLinesPerFrame = 262; }</code>',
        'In <code>cpu_cycles</code>, loop <code>3 * cycles</code> times: <code>dot_++</code>; when it reaches <code>kDotsPerLine</code>, set it to 0 and <code>scanline_++</code>; when that reaches <code>kLinesPerFrame</code>, set it to 0 and <code>frame_++</code>.',
      ],
      solution: { 'clock.cpp': R`#include "clock.h"

namespace {

constexpr int kDotsPerLine = 341;
constexpr int kLinesPerFrame = 262;

}  // namespace

void MasterClock::reset() {
    dot_ = 0;
    scanline_ = 0;
    frame_ = 0;
}

void MasterClock::cpu_cycles(int cycles) {
    for (int i = 0; i < 3 * cycles; i++) {
        dot_++;
        if (dot_ == kDotsPerLine) {
            dot_ = 0;
            scanline_++;
            if (scanline_ == kLinesPerFrame) {
                scanline_ = 0;
                frame_++;
            }
        }
    }
}

int MasterClock::dot() const {
    return dot_;
}

int MasterClock::scanline() const {
    return scanline_;
}

long MasterClock::frame() const {
    return frame_;
}
` },
    },
  ],
});
})();
