(function () {
  // ---------- Files shared by this lesson's project exercises ----------

  const R = String.raw;
  const D = window.CPU_DATA;

  // bus.h already declares everything this lesson builds.
  const BUS_H = D.files['bus.h'];

  // The learner's bus.cpp from lesson 12, and after each exercise here.
  const BUS_CPP_L12 = Course.get('cpp-files').exercises[1].solution['bus.cpp'];
  const REGION = R`
const char* Bus::region(std::uint16_t addr) const {
    if (addr < 0x2000) return "RAM";
    if (addr < 0x4000) return "PPU";
    if (addr < 0x4018) return "APU/IO";
    if (addr < 0x4020) return "Disabled";
    if (addr < 0x6000) return "Expansion";
    if (addr < 0x8000) return "Cartridge RAM";
    return "Cartridge ROM";
}
`;
  const BUS_CPP_1 = BUS_CPP_L12 + REGION;
  const BUS_CPP_3 = D.busCpp;
  const READ16 = BUS_CPP_3.slice(BUS_CPP_3.indexOf('\nstd::uint16_t Bus::read16'));
  const BUS_CPP_2 = BUS_CPP_3.slice(0, BUS_CPP_3.length - READ16.length) + '';
  if (!BUS_CPP_3.includes(REGION.trim())) throw new Error('nes-overview: bus.cpp versions disagree');

  const MONITOR = (level) => `// Opcode memory monitor. Commands (numbers in hex):
//   r ADDR        read a byte
//   w ADDR VALUE  write a byte
//   m ADDR        name the region of an address${level >= 2 ? `
//   p             plug in a 16 KB test cartridge` : ''}${level >= 3 ? `
//   v             show the reset vector` : ''}
#include <cstdint>
#include <cstdio>
#include <iostream>${level >= 2 ? '\n#include <vector>' : ''}
#include "bus.h"
${level >= 2 ? `
namespace {

void plug_test_cartridge(Bus& bus) {
    std::vector<std::uint8_t> rom(0x4000);
    for (int i = 0; i < 0x4000; i++) {
        rom[i] = static_cast<std::uint8_t>(i);
    }
    rom[0x3FFC] = 0x00;  // reset vector: C000
    rom[0x3FFD] = 0xC0;
    bus.load_prg(rom);
    std::printf("16 KB test cartridge plugged in\\n");
}

}  // namespace
` : ''}
int main() {
    Bus bus;
    bus.reset();
    char cmd = 0;
    unsigned addr = 0, value = 0;
    std::cin >> std::hex;
    while (std::cin >> cmd) {
        if (cmd == 'r' && std::cin >> addr) {
            std::printf("%04X: %02X\\n", addr, bus.read(static_cast<std::uint16_t>(addr)));
        } else if (cmd == 'w' && std::cin >> addr >> value) {
            bus.write(static_cast<std::uint16_t>(addr), static_cast<std::uint8_t>(value));
        } else if (cmd == 'm' && std::cin >> addr) {
            std::printf("%04X: %s\\n", addr, bus.region(static_cast<std::uint16_t>(addr)));${level >= 2 ? `
        } else if (cmd == 'p') {
            plug_test_cartridge(bus);` : ''}${level >= 3 ? `
        } else if (cmd == 'v') {
            std::printf("Reset vector: %04X\\n", bus.read16(0xFFFC));` : ''}
        } else {
            std::printf("Unknown command '%c'\\n", cmd);
            return 0;
        }
    }
}
`;

  const HARNESS_TOP = `#include <cstdint>
#include <cstdio>
#include <iostream>
#include <vector>
#include "bus.h"
`;

  // ---------- The lesson ----------

  Course.add({
    id: 'nes-overview',
    part: 'nes',
    title: 'How a NES works',
    summary: 'The chips inside the console, what every address reaches, how a frame is timed, and the plan for your emulator.',
    blocks: [
      { t: 'p', html: 'You now know enough C++ to build a computer. Before writing any of it, you need a map of the machine you are building. This lesson has no new C++ in it: it is the tour of the console, and the start of your emulator project.' },

      { t: 'h', text: 'What is inside the box' },
      { t: 'p', html: 'The Famicom came out in Japan in 1983 and the NES in America in 1985. Inside, the important parts are few:' },
      { t: 'list', items: [
        '<strong>The CPU</strong>, a Ricoh 2A03. Its core is a MOS 6502, the same processor family as the Apple II and the Commodore 64, running at about 1.79 MHz. The chip also contains the sound hardware and the controller ports.',
        '<strong>The PPU</strong> (picture processing unit), a Ricoh 2C02. It draws the picture, one dot at a time, from tiles and sprites. The CPU cannot draw anything itself; it can only tell the PPU what to draw.',
        '<strong>2 KB of work RAM</strong> for the CPU, and <strong>2 KB of video RAM</strong> for the PPU. That is all the memory the console has.',
        '<strong>The cartridge</strong>. It holds the game\'s program (<em>PRG ROM</em>) and usually its graphics (<em>CHR ROM</em>). It is not just storage: its chips are wired straight into the console, and some cartridges add memory or extra logic of their own.',
      ] },
      { t: 'figure', html: `<div class="chips">
  <div class="bus-col">
    <div class="bus-name">CPU bus, 64 KB of addresses</div>
    <div class="chip">CPU<small>6502 core, 1.79 MHz</small></div>
    <div class="dev">2 KB work RAM</div>
    <div class="dev link">8 PPU registers</div>
    <div class="dev">Sound and controllers</div>
    <div class="dev cart">Cartridge: PRG ROM, the program</div>
  </div>
  <div class="bus-col">
    <div class="bus-name">PPU bus, 16 KB of addresses</div>
    <div class="chip">PPU<small>draws 256 × 240 dots</small></div>
    <div class="dev cart">Cartridge: CHR ROM, the tiles</div>
    <div class="dev">2 KB video RAM: the backgrounds</div>
    <div class="dev">32 bytes of palette</div>
    <div class="dev">256 bytes of sprite data (OAM)</div>
  </div>
</div>`, caption: 'Two separate buses. The CPU reaches the PPU only through its eight registers; the PPU reaches back with one wire, the NMI interrupt, at the start of every vertical blank.' },

      { t: 'h', text: 'A bus is a list of addresses' },
      { t: 'p', html: 'The CPU puts a 16-bit address on its bus, from <code>$0000</code> to <code>$FFFF</code>, and reads or writes one byte there. (6502 programmers write hex with a dollar sign: <code>$FFFC</code> is <code>0xFFFC</code>.) Which chip answers depends only on the address. This table is the CPU\'s whole world, and it is exactly what your <code>Bus</code> class will implement:' },
      { t: 'figure', html: `<div class="memmap">
  <div class="mm-row" style="--h:1.9"><span class="mm-addr">$0000</span><span class="mm-block ram"></span><span class="mm-label"><strong>Work RAM</strong>, 2 KB</span></div>
  <div class="mm-row" style="--h:2.4"><span class="mm-addr">$0800</span><span class="mm-block ram mirror"></span><span class="mm-label">Mirrors of the RAM, three more times</span></div>
  <div class="mm-row" style="--h:3"><span class="mm-addr">$2000</span><span class="mm-block ppu mirror"></span><span class="mm-label"><strong>PPU registers</strong> <code>$2000</code>-<code>$2007</code>, mirrored every 8 bytes</span></div>
  <div class="mm-row" style="--h:1.9"><span class="mm-addr">$4000</span><span class="mm-block io"></span><span class="mm-label"><strong>Sound and I/O</strong> up to <code>$4017</code>; <code>$4016</code> and <code>$4017</code> are the controllers</span></div>
  <div class="mm-row" style="--h:2.4"><span class="mm-addr">$4018</span><span class="mm-block off"></span><span class="mm-label">Disabled test registers, then expansion space (almost never used)</span></div>
  <div class="mm-row" style="--h:3"><span class="mm-addr">$6000</span><span class="mm-block cart-ram"></span><span class="mm-label"><strong>Cartridge RAM</strong>, 8 KB, often battery-backed for save games</span></div>
  <div class="mm-row" style="--h:11"><span class="mm-addr">$8000</span><span class="mm-block cart"></span><span class="mm-label"><strong>Cartridge ROM</strong>, 32 KB: the game\'s program. The last six bytes, <code>$FFFA</code>-<code>$FFFF</code>, are the three <em>vectors</em>: where to go on NMI, on reset, and on IRQ.</span></div>
</div>`, caption: 'The CPU memory map, drawn roughly to scale. Half of everything the CPU can see belongs to the cartridge.' },

      { t: 'h', text: 'Why mirrors exist' },
      { t: 'p', html: 'The RAM chip holds <code>$800</code> bytes, so it needs 11 address wires. The designers simply did not connect the higher wires to it. The chip cannot tell <code>$0001</code> from <code>$0801</code>, <code>$1001</code> or <code>$1801</code>: in all four, the low 11 bits are the same. The same trick, cheaper wiring, makes the 8 PPU registers repeat across <code>$2000</code>-<code>$3FFF</code>.' },
      { t: 'p', html: 'That is why your <code>addr % 0x800</code> from lesson 4 is the right model, and why emulators usually write it as <code>addr &amp; 0x7FF</code>: keeping the low 11 bits is literally what the hardware does.' },

      { t: 'h', text: 'Cartridges and mappers' },
      { t: 'p', html: 'The CPU can only see 32 KB of cartridge ROM at once, and many games are much bigger: Super Mario Bros. 3 has 256 KB of program and graphics. Bigger cartridges contain a <em>mapper</em>, a chip that swaps which part of the ROM appears in the window at <code>$8000</code>-<code>$FFFF</code> when the game writes to certain addresses. This is called <em>bank switching</em>.' },
      { t: 'p', html: 'The simplest cartridges, called mapper 0 or NROM, have no mapper chip at all: 16 or 32 KB of program and 8 KB of graphics, wired straight in. Super Mario Bros., Donkey Kong, Balloon Fight and Excitebike are all mapper 0, and they are what your emulator will run first. A 16 KB game appears twice, at <code>$8000</code> and again at <code>$C000</code>, by the same unconnected-wire trick.' },

      { t: 'h', text: 'How a game starts' },
      { t: 'list', items: [
        'On power-on or reset, the CPU reads the two bytes at <code>$FFFC</code> and <code>$FFFD</code>, the <em>reset vector</em>, and starts running at that address. Since those bytes are in the cartridge ROM, the game decides where it starts.',
        'The game\'s start-up code switches off interrupts, waits for the PPU to warm up, clears RAM, and sets up the first screen.',
        'Then it turns on the <em>NMI</em>: from now on, every time the PPU finishes drawing the visible picture, it interrupts the CPU, which jumps to the address in the NMI vector at <code>$FFFA</code>.',
        'The game\'s logic runs in a loop. Its graphics updates happen in the NMI handler, because the only safe time to change what the PPU draws is the short pause between frames, the <em>vertical blank</em>.',
      ] },

      { t: 'h', text: 'Timing: everything is counted' },
      { t: 'p', html: 'A NES game is written for exact timing, and many depend on it. Your emulator does not run at the real speed of these chips; it keeps their <em>relative</em> timing exact by counting:' },
      { t: 'table', head: ['Quantity', 'Value (NTSC)'], rows: [
        ['CPU clock', 'about 1,789,773 cycles per second'],
        ['PPU clock', '3 dots for every CPU cycle'],
        ['One scanline', '341 dots'],
        ['One frame', '262 scanlines: 240 visible, then a few idle ones and the vertical blank from scanline 241'],
        ['Per frame', '89,342 dots, which is 29,780⅔ CPU cycles'],
        ['Frames per second', 'about 60.1'],
      ] },
      { t: 'p', html: 'Each 6502 instruction takes between 2 and 7 CPU cycles. The emulator runs one instruction, notes how many cycles it took, and lets the PPU catch up by three times that many dots. You built exactly this clock in lesson 12.' },

      { t: 'h', text: 'The plan for your emulator' },
      { t: 'code', title: 'the main loop (a sketch)', lines: [
        ['while (running) {', 'The whole emulator is this loop, run about 1.79 million times per emulated second.'],
        ['    int cycles = cpu.step();', 'Fetch the next instruction from the bus, do what it says, and return how many cycles it took. This is the next three lessons.'],
        ['    ppu.tick(cycles * 3);', 'Let the PPU draw that many dots. When it reaches the vertical blank it raises the NMI line, which the CPU notices next time.'],
        ['    if (ppu.frame_done()) {', 'About 60 times a second a frame is finished.'],
        ['        show_frame(ppu.pixels());', 'Copy the 256 × 240 pixels to the screen, here a canvas on the page.'],
        ['        read_controllers();', 'Turn the keyboard into button presses for the game.'],
        ['    }'],
        ['}'],
      ] },
      { t: 'p', html: 'You will build it in the order the data flows: the bus (you have started it), the CPU, the cartridge, then the PPU, the controllers, the extra mappers and the sound. Each part is a class, and the console holds one of each.' },

      { t: 'h', text: 'Your emulator project' },
      { t: 'p', html: 'From this lesson on, the workbench shows your <strong>emulator project</strong>. Unlike the earlier exercises, these files are kept from one exercise to the next and from one lesson to the next, and they grow into the finished emulator.' },
      { t: 'list', items: [
        'Files with a padlock belong to the course: the test program, and headers that define how the parts talk to each other. You can read them, but not change them, so every lesson can rely on them.',
        'Every other file is yours. Your <code>bus.cpp</code> from lesson 12 is the first one: if you solved that exercise, your own version is copied in.',
        'Reset restores only the open file, to how it was at the start of the current exercise.',
        'Download saves the whole project as a .zip, so you always have a copy outside the browser.',
      ] },
      { t: 'note', kind: 'warn', html: 'Your project lives in this browser\'s storage. Clearing your browsing data for this site deletes it, so download a copy from time to time.' },

      { t: 'quiz', q: 'The CPU reads address <code>$1A05</code>. What does it actually reach?', options: ['A PPU register', 'RAM byte <code>$0205</code>', 'Cartridge RAM'], answer: 1, explain: '<code>$1A05</code> is below <code>$2000</code>, so it is RAM, and only the low 11 bits count: <code>$1A05 &amp; $7FF</code> is <code>$0205</code>.' },
      { t: 'quiz', q: 'A 16 KB mapper 0 game is plugged in. The CPU reads <code>$C010</code>. Which byte of the ROM does it get?', options: ['Byte <code>$4010</code>', 'Byte <code>$0010</code>', 'None: the address is empty'], answer: 1, explain: 'The 16 KB ROM appears at <code>$8000</code> and again at <code>$C000</code>. <code>$C010 - $8000</code> is <code>$4010</code>, and <code>$4010 % $4000</code> is <code>$0010</code>.' },
      { t: 'quiz', q: 'Where does a game do its graphics updates, and why there?', options: [
        'Anywhere: the PPU copies everything at once at the end of the frame',
        'In the NMI handler, during the vertical blank, because the PPU is not drawing then',
        'In the reset code, because it only runs once',
      ], answer: 1, explain: 'While the PPU is drawing, changing its memory corrupts the picture. The vertical blank is the window when it is safe, and the NMI announces it.' },
    ],

    exercises: [
      {
        id: 'nes-overview-1',
        title: 'Name every region',
        prompt: '<p>Your <code>bus.cpp</code> is now part of the emulator project, and <code>bus.h</code> has grown: it already declares everything this lesson builds, and the private members those functions need. (A declared function that nobody calls yet costs nothing.) First, write the member function that names the part of the console an address reaches, following the memory map in the lesson:</p><pre>const char* Bus::region(std::uint16_t addr) const</pre><table><tr><th>Addresses</th><th>Return</th></tr><tr><td><code>0000</code>-<code>1FFF</code></td><td><code>"RAM"</code></td></tr><tr><td><code>2000</code>-<code>3FFF</code></td><td><code>"PPU"</code></td></tr><tr><td><code>4000</code>-<code>4017</code></td><td><code>"APU/IO"</code></td></tr><tr><td><code>4018</code>-<code>401F</code></td><td><code>"Disabled"</code></td></tr><tr><td><code>4020</code>-<code>5FFF</code></td><td><code>"Expansion"</code></td></tr><tr><td><code>6000</code>-<code>7FFF</code></td><td><code>"Cartridge RAM"</code></td></tr><tr><td><code>8000</code>-<code>FFFF</code></td><td><code>"Cartridge ROM"</code></td></tr></table><p>The memory monitor in <code>main.cpp</code> lets you try it: <code>m 4016</code> names an address.</p>',
        project: {
          course: { 'bus.h': BUS_H, 'main.cpp': MONITOR(1) },
          learner: { 'bus.cpp': { starter: BUS_CPP_L12, from: { exercise: 'cpp-files-2', file: 'bus.cpp' } } },
          open: 'bus.cpp',
        },
        stdin: 'm 0000\nm 1FFF\nm 2007\nm 4016\nm 8000',
        harness: { 'main.cpp': HARNESS_TOP + R`int main() {
    int t = 0;
    std::cin >> t;
    const Bus bus;
    const std::uint16_t a[] = {0x0000, 0x0800, 0x1FFF, 0x2000, 0x2007, 0x3FFF, 0x4000, 0x4016, 0x4017,
                               0x4018, 0x401F, 0x4020, 0x5FFF, 0x6000, 0x7FFF, 0x8000, 0xC000, 0xFFFF};
    int from = t == 1 ? 0 : t == 2 ? 6 : 12, to = t == 1 ? 6 : t == 2 ? 12 : 18;
    for (int i = from; i < to; i++) std::printf("%04X %s\n", a[i], bus.region(a[i]));
}
` },
        tests: [
          { name: 'RAM and the PPU registers', stdin: '1', expect: '0000 RAM\n0800 RAM\n1FFF RAM\n2000 PPU\n2007 PPU\n3FFF PPU\n' },
          { name: 'Sound, controllers and the gaps', stdin: '2', expect: '4000 APU/IO\n4016 APU/IO\n4017 APU/IO\n4018 Disabled\n401F Disabled\n4020 Expansion\n' },
          { name: 'The cartridge', stdin: '3', expect: '5FFF Expansion\n6000 Cartridge RAM\n7FFF Cartridge RAM\n8000 Cartridge ROM\nC000 Cartridge ROM\nFFFF Cartridge ROM\n' },
        ],
        hints: [
          'Start with <code>const char* Bus::region(std::uint16_t addr) const {</code> (the <code>const</code> at the end has to match <code>bus.h</code>). Check the ranges in increasing order, each with an upper limit: <code>if (addr &lt; 0x2000) return "RAM";</code>, then <code>if (addr &lt; 0x4000) return "PPU";</code> and so on.',
          'Because each <code>if</code> returns, every later check already knows the address is above the earlier limits. The last line, with no <code>if</code>, returns <code>"Cartridge ROM"</code>.',
        ],
        solution: { 'bus.cpp': BUS_CPP_1 },
      },
      {
        id: 'nes-overview-2',
        title: 'Plug in a cartridge',
        prompt: '<p>Time to connect the cartridge, mapper 0 style. <code>bus.h</code> already has the private members for it: <code>prg_ram_</code>, an 8 KB <code>std::array</code>, and <code>prg_rom_</code>, a <code>std::vector</code> that starts empty. In <code>bus.cpp</code>:</p><ul><li><strong>Cartridge RAM</strong> at <code>6000</code>-<code>7FFF</code> can be read and written. <code>reset</code> clears it, like the work RAM.</li><li><strong>Cartridge ROM</strong>: write <code>void Bus::load_prg(const std::vector&lt;std::uint8_t&gt;&amp; prg)</code>, which keeps a copy of the program ROM (16 KB or 32 KB). Reads from <code>8000</code>-<code>FFFF</code> return ROM bytes; a 16 KB ROM appears twice, so use <code>(addr - 0x8000) % prg_rom_.size()</code>. Writes to ROM are ignored. Before any ROM is loaded, reads there return 0.</li></ul><p>Try it in the monitor: <code>p</code> plugs in a test cartridge whose bytes count up from 00.</p>',
        project: {
          course: { 'bus.h': BUS_H, 'main.cpp': MONITOR(2) },
          learner: { 'bus.cpp': { starter: BUS_CPP_1 } },
          open: 'bus.cpp',
        },
        stdin: 'w 6000 42\nr 6000\np\nr 8005\nr C005\nr FFFD',
        harness: { 'main.cpp': HARNESS_TOP + R`int main() {
    int t = 0;
    std::cin >> t;
    std::vector<std::uint8_t> rom(0x8000);
    for (int i = 0; i < 0x8000; i++) rom[i] = static_cast<std::uint8_t>(i * 3 + (i >> 8));
    std::vector<std::uint8_t> half(rom.begin(), rom.begin() + 0x4000);
    Bus bus;
    bus.reset();
    auto show = [&](std::uint16_t a) { std::printf("%02X ", bus.read(a)); };
    if (t == 1) { show(0x8000); show(0xFFFF); }
    if (t == 2) { bus.load_prg(rom); show(0x8000); show(0x8123); show(0xC123); show(0xFFFF); }
    if (t == 3) { bus.load_prg(half); show(0x8123); show(0xC123); show(0xBFFF); show(0xFFFF); }
    if (t == 4) { bus.load_prg(half); half[0] = 0x99; bus.write(0x8000, 0x55); bus.write(0xC000, 0x55); show(0x8000); show(0xC000); }
    if (t == 5) { bus.write(0x6000, 0x11); bus.write(0x7FFF, 0x22); bus.write(0x0005, 0x33); show(0x6000); show(0x7FFF); show(0x6005); show(0x0805); std::printf("\n"); bus.reset(); show(0x6000); show(0x7FFF); }
    std::printf("\n");
}
` },
        tests: [
          { name: 'No cartridge yet: ROM reads 0', stdin: '1', expect: '00 00\n' },
          { name: 'A 32 KB ROM fills 8000-FFFF', stdin: '2', expect: '00 6A AA 7C\n' },
          { name: 'A 16 KB ROM appears twice', stdin: '3', expect: '6A 6A 3C 3C\n' },
          { name: 'The ROM is copied, and writes to it are ignored', stdin: '4', expect: '00 00\n' },
          { name: 'Cartridge RAM reads, writes and resets', stdin: '5', expect: '11 22 00 33\n00 00\n' },
        ],
        hints: [
          '<code>load_prg</code> is one line: assigning a vector copies it, <code>prg_rom_ = prg;</code>. In <code>reset</code>, add <code>prg_ram_.fill(0);</code>.',
          'In <code>read</code>, add two more cases after the RAM one: <code>addr &gt;= 0x6000 &amp;&amp; addr &lt; 0x8000</code> reads <code>prg_ram_[addr - 0x6000]</code>, and <code>addr &gt;= 0x8000 &amp;&amp; !prg_rom_.empty()</code> reads <code>prg_rom_[(addr - 0x8000) % prg_rom_.size()]</code>. Only the cartridge RAM case goes into <code>write</code>.',
        ],
        solution: { 'bus.cpp': BUS_CPP_2 },
      },
      {
        id: 'nes-overview-3',
        title: 'Follow the reset vector',
        prompt: '<p>The first thing the CPU does is read the reset vector. Write <code>std::uint16_t Bus::read16(std::uint16_t addr)</code>: it reads the low byte at <code>addr</code> and the high byte at <code>addr + 1</code>, <em>through <code>read</code></em>, so the memory map and the mirrors apply. If <code>addr</code> is <code>FFFF</code>, the high byte comes from <code>0000</code>.</p><p>In the monitor, <code>p</code> then <code>v</code> should print <code>Reset vector: C000</code>. In the next lesson, that is where your CPU starts.</p>',
        project: {
          course: { 'bus.h': BUS_H, 'main.cpp': MONITOR(3) },
          learner: { 'bus.cpp': { starter: BUS_CPP_2 } },
          open: 'bus.cpp',
        },
        stdin: 'p\nv',
        harness: { 'main.cpp': HARNESS_TOP + R`int main() {
    int t = 0;
    std::cin >> t;
    Bus bus;
    bus.reset();
    std::vector<std::uint8_t> rom(0x4000);
    for (int i = 0; i < 0x4000; i++) rom[i] = static_cast<std::uint8_t>(0xFF - i);
    rom[0x3FFA] = 0x34; rom[0x3FFB] = 0x12; rom[0x3FFC] = 0x00; rom[0x3FFD] = 0xC0; rom[0x3FFE] = 0xEF; rom[0x3FFF] = 0xBE;
    bus.load_prg(rom);
    auto show = [&](std::uint16_t a) { std::printf("%04X ", bus.read16(a)); };
    if (t == 1) { show(0xFFFA); show(0xFFFC); show(0xFFFE); }
    if (t == 2) { bus.write(0x0010, 0xCD); bus.write(0x0011, 0xAB); show(0x0010); show(0x1810); }
    if (t == 3) { bus.write(0x0000, 0x77); show(0xFFFF); show(0xBFFC); }
    std::printf("\n");
}
` },
        tests: [
          { name: 'The three vectors', stdin: '1', expect: '1234 C000 BEEF\n' },
          { name: 'Through RAM and its mirrors', stdin: '2', expect: 'ABCD ABCD\n' },
          { name: 'Wrapping at FFFF, and the ROM mirror', stdin: '3', expect: '77BE C000\n' },
        ],
        rules: [{ re: 'read16[\\s\\S]*\\bread\\s*\\(', must: true, msg: 'Read both bytes with read(), so the memory map applies.' }],
        hints: [
          'This is <code>read16</code> from lesson 10, but with <code>read(addr)</code> instead of <code>mem[addr]</code>. Inside a member function of <code>Bus</code>, <code>read</code> is the bus\'s own <code>read</code>.',
          '<code>std::uint16_t lo = read(addr); std::uint16_t hi = read(static_cast&lt;std::uint16_t&gt;(addr + 1)); return static_cast&lt;std::uint16_t&gt;(hi &lt;&lt; 8 | lo);</code>',
        ],
        solution: { 'bus.cpp': BUS_CPP_3 },
      },
    ],
  });
})();
