Course.add({
  id: 'c-files',
  part: 'c',
  title: 'Programs in many files',
  summary: 'Header files, include guards, static, and how the compiler and linker turn many .c files into one program.',
  blocks: [
    { t: 'p', html: 'Your emulator will have a CPU, a bus, a cartridge, a picture chip and a controller. Putting all of that in one file would make a file of several thousand lines that nobody can find their way around. C programs are split into <em>modules</em>: each part gets a <code>.c</code> file with its code and a <code>.h</code> file that says what the rest of the program may use.' },

    { t: 'h', text: 'What #include really does' },
    { t: 'p', html: '<code>#include "file.h"</code> is handled by the preprocessor before compiling, and it is crude: it pastes the entire contents of <code>file.h</code> in place of that line. Nothing more. Angle brackets (<code>&lt;stdio.h&gt;</code>) look in the system folders; double quotes look next to your own files first.' },

    { t: 'h', text: 'A module: header plus source' },
    { t: 'p', html: 'The header holds <em>declarations</em>: the types and function prototypes other files need. The source file holds the <em>definitions</em>: the function bodies. Here is a small module that counts score:' },
    { t: 'code', title: 'score.h', lines: [
      ['#ifndef SCORE_H', 'An <em>include guard</em>. The first time this file is pasted in, <code>SCORE_H</code> is not defined, so everything up to <code>#endif</code> is kept and <code>SCORE_H</code> gets defined. If the file is included a second time, the whole content is skipped. Without it, including a header twice defines its types twice, which is an error.'],
      ['#define SCORE_H'],
      [''],
      ['void score_add(int points);', 'Declarations only. Any file that includes <code>score.h</code> can call these.'],
      ['int score_get(void);'],
      [''],
      ['#endif'],
    ] },
    { t: 'code', title: 'score.c', lines: [
      ['#include "score.h"', 'A module includes its own header. If the definitions below do not match the declarations, the compiler will tell you here.'],
      [''],
      ['static int total = 0;', '<code>static</code> outside a function means "private to this file". No other file can see or change <code>total</code>; they have to go through the functions.'],
      [''],
      ['static int bonus(int points) {', 'A private helper. Marking helpers <code>static</code> keeps the module\'s public surface small and avoids name clashes with other files.'],
      ['    return points >= 1000 ? points / 10 : 0;', 'The <code>? :</code> operator: if the condition holds, the first value, otherwise the second.'],
      ['}'],
      [''],
      ['void score_add(int points) {'],
      ['    total += points + bonus(points);'],
      ['}'],
      [''],
      ['int score_get(void) {'],
      ['    return total;'],
      ['}'],
    ] },
    { t: 'code', title: 'main.c', lines: [
      ['#include <stdio.h>'],
      ['#include "score.h"', 'Now <code>main.c</code> knows the two functions exist, without knowing anything about how they work.'],
      [''],
      ['int main(void) {'],
      ['    score_add(200);'],
      ['    score_add(1000);'],
      ['    printf("%d\\n", score_get());'],
      ['    return 0;'],
      ['}'],
    ] },

    { t: 'h', text: 'Compiling and linking' },
    { t: 'p', html: 'Each <code>.c</code> file is compiled <em>on its own</em> into an object file. While compiling <code>main.c</code>, the compiler only sees <code>main.c</code> plus the headers it includes; it trusts the declarations and leaves a note saying "this calls <code>score_add</code>, which lives somewhere else". Then the <em>linker</em> takes all the object files and connects every such note to the real function.' },
    { t: 'p', html: 'That split explains the two kinds of error you will meet:' },
    { t: 'table', head: ['Message', 'Stage', 'Usual cause'], rows: [
      ['<code>call to undeclared function \'score_add\'</code> or <code>implicit declaration of function</code>', 'Compiling', 'You forgot to include the header, or misspelled the name.'],
      ['<code>wasm-ld: error: undefined symbol: score_add</code> (on a PC: <em>undefined reference</em>)', 'Linking', 'The declaration exists, but no <code>.c</code> file defines the function, or the definition is <code>static</code>, or its name is spelled differently.'],
      ['<code>duplicate symbol</code> (on a PC: <em>multiple definition</em>)', 'Linking', 'A function or variable was <em>defined</em> in a header, so every file that includes it defines it again.'],
    ] },
    { t: 'note', kind: 'warn', html: 'Headers hold declarations, never definitions. Put function bodies and variables with storage in <code>.c</code> files. The exception is <code>static inline</code> functions, which you will not need yet.' },

    { t: 'h', text: 'Sharing a variable between files' },
    { t: 'p', html: 'If a variable really must be shared, it is <em>defined</em> in exactly one <code>.c</code> file (<code>int frame_count = 0;</code>) and <em>declared</em> in a header with <code>extern</code> (<code>extern int frame_count;</code>), which means "it exists, in some other file". Use this sparingly. A module with private <code>static</code> state and functions to reach it is almost always easier to debug.' },

    { t: 'h', text: 'Constants and macros' },
    { t: 'p', html: '<code>#define</code> pastes text, just like <code>#include</code>. Headers are the usual place for shared constants: <code>#define RAM_SIZE 0x800</code>. Macros with parameters exist (<code>#define LOW_BYTE(x) ((x) &amp; 0xFF)</code>), but because they paste text they have traps: always wrap every parameter and the whole result in parentheses. When in doubt, write a small function instead.' },

    { t: 'h', text: 'The shape of your emulator' },
    { t: 'p', html: 'From the next part on, you will build the emulator as these modules. Each one is small enough to understand on its own:' },
    { t: 'table', head: ['Module', 'Its job'], rows: [
      ['<code>bus.c</code>', 'Decides what each CPU address reaches: RAM, a PPU register, the controller or the cartridge.'],
      ['<code>cpu.c</code>', 'The 6502: registers, flags and all 151 official instructions.'],
      ['<code>cart.c</code>', 'Reads the iNES file and maps cartridge memory (the mappers).'],
      ['<code>ppu.c</code>', 'The picture chip: tiles, palettes, sprites and scrolling, one pixel at a time.'],
      ['<code>input.c</code>', 'The controllers, read one bit at a time.'],
      ['<code>main.c</code>', 'Loads the ROM, runs frames, shows them and reads the keyboard.'],
    ] },
    { t: 'note', kind: 'nes', html: 'The second exercise below is the first version of <code>bus.c</code>. You will keep extending it all the way to the end of the course.' },

    { t: 'quiz', q: 'Your program compiles, but linking fails with <code>undefined symbol: ppu_tick</code>. What is the most likely cause?', options: [
      'ppu.h is not included in main.c',
      'ppu_tick is declared but no .c file in the build defines it (or it is static)',
      'A missing semicolon in ppu.h',
    ], answer: 1, explain: 'Compiling succeeded, so every file could see a declaration. The linker could not find a definition to connect the call to.' },
    { t: 'quiz', q: 'Why does <code>static int total;</code> at the top of <code>score.c</code> help?', options: [
      'It makes total faster',
      'Only code in score.c can use it, so nothing else can change it behind the module\'s back',
      'It keeps total at 0 forever',
    ], answer: 1, explain: 'File-level <code>static</code> hides a name from other files. The value can still change, but only through the module\'s own functions.' },
  ],

  exercises: [
    {
      id: 'c-files-1',
      title: 'A hexdump module',
      prompt: '<p>Every emulator needs a way to look at raw memory. Create a module made of <code>hex.h</code> and <code>hex.c</code> with one function:</p><pre>void hexdump(const uint8_t *data, int length, uint16_t base);</pre><p>It prints the bytes 16 per line. Each line starts with the address of its first byte (<code>base</code> plus the offset) as 4 hex digits and a colon, followed by each byte as a space and 2 hex digits. The last line may be shorter. For 20 bytes at <code>0xC000</code>:</p><pre>C000: 4C F5 C5 60 78 D8 A2 FF 9A AD 02 20 10 FB AD 02\nC010: 20 10 FB A9</pre><p><code>main.c</code> is already written and must not change. <code>hex.h</code> needs an include guard and the declaration; <code>hex.c</code> needs the definition.</p>',
      files: {
        'main.c': '#include <stdint.h>\n#include "hex.h"\n\nint main(void) {\n    const uint8_t code[20] = {\n        0x4C, 0xF5, 0xC5, 0x60, 0x78, 0xD8, 0xA2, 0xFF, 0x9A, 0xAD,\n        0x02, 0x20, 0x10, 0xFB, 0xAD, 0x02, 0x20, 0x10, 0xFB, 0xA9,\n    };\n    hexdump(code, 20, 0xC000);\n    return 0;\n}\n',
        'hex.h': '// Declare hexdump here, inside an include guard.\n',
        'hex.c': '#include <stdio.h>\n#include "hex.h"\n\n// Define hexdump here.\n',
      },
      harness: { 'main.c': '#include <stdio.h>\n#include <stdint.h>\n#include "hex.h"\n#include "hex.h"\nint main(void) {\n    int t = 0;\n    scanf("%d", &t);\n    uint8_t d[40];\n    for (int i = 0; i < 40; i++) d[i] = (uint8_t)(i * 7 + 3);\n    if (t == 1) hexdump(d, 20, 0xC000);\n    if (t == 2) hexdump(d, 16, 0x0000);\n    if (t == 3) hexdump(d, 3, 0x8001);\n    if (t == 4) hexdump(d, 40, 0x01F8);\n    if (t == 5) { hexdump(d, 0, 0x1234); printf("end\\n"); }\n    return 0;\n}\n' },
      tests: [
        { name: 'Two lines', stdin: '1', expect: 'C000: 03 0A 11 18 1F 26 2D 34 3B 42 49 50 57 5E 65 6C\nC010: 73 7A 81 88\n' },
        { name: 'Exactly one full line', stdin: '2', expect: '0000: 03 0A 11 18 1F 26 2D 34 3B 42 49 50 57 5E 65 6C\n' },
        { name: 'A short dump at an odd address', stdin: '3', expect: '8001: 03 0A 11\n' },
        { name: 'Three lines', stdin: '4', expect: '01F8: 03 0A 11 18 1F 26 2D 34 3B 42 49 50 57 5E 65 6C\n0208: 73 7A 81 88 8F 96 9D A4 AB B2 B9 C0 C7 CE D5 DC\n0218: E3 EA F1 F8 FF 06 0D 14\n' },
        { name: 'Nothing to print', stdin: '5', expect: 'end\n' },
      ],
      rules: [{ re: '#\\s*ifndef|#\\s*pragma\\s+once', must: true, msg: 'Give hex.h an include guard (#ifndef / #define / #endif). The checker includes it twice.' }],
      hints: [
        '<code>hex.h</code> is five lines: <code>#ifndef HEX_H</code>, <code>#define HEX_H</code>, <code>#include &lt;stdint.h&gt;</code>, the declaration ending in a semicolon, and <code>#endif</code>.',
        'In <code>hex.c</code>, loop over every byte. When <code>i % 16 == 0</code>, start a new line: print a new line first (except before the very first one), then the address <code>base + i</code> with <code>%04X:</code>. Print each byte with <code>" %02X"</code>, and finish with a new line if anything was printed.',
      ],
      solution: {
        'hex.h': '#ifndef HEX_H\n#define HEX_H\n\n#include <stdint.h>\n\nvoid hexdump(const uint8_t *data, int length, uint16_t base);\n\n#endif\n',
        'hex.c': '#include <stdio.h>\n#include "hex.h"\n\nvoid hexdump(const uint8_t *data, int length, uint16_t base) {\n    for (int i = 0; i < length; i++) {\n        if (i % 16 == 0) {\n            if (i > 0) {\n                printf("\\n");\n            }\n            printf("%04X:", (uint16_t)(base + i));\n        }\n        printf(" %02X", data[i]);\n    }\n    if (length > 0) {\n        printf("\\n");\n    }\n}\n',
      },
    },
    {
      id: 'c-files-2',
      title: 'The bus, version 1',
      prompt: '<p>The <em>bus</em> connects the CPU to everything else: every read and write the CPU makes goes through it. <code>bus.h</code> declares the interface. Write <code>bus.c</code>:</p><ul><li>Keep the 2 KB of RAM in a private array: <code>static uint8_t ram[0x800];</code></li><li><code>void bus_reset(void)</code>: sets all of RAM to 0.</li><li><code>uint8_t bus_read(uint16_t addr)</code>: addresses <code>0x0000</code>-<code>0x1FFF</code> read RAM, mirrored every <code>0x800</code> bytes (you did this in lesson 4). Every other address returns 0 for now.</li><li><code>void bus_write(uint16_t addr, uint8_t value)</code>: writes RAM the same way. Writes to every other address are ignored for now.</li></ul><p><code>main.c</code> runs commands so you can try it: <code>w 0801 AB</code> writes, <code>r 0001</code> reads. Do not change it or <code>bus.h</code>.</p>',
      files: {
        'main.c': '#include <stdio.h>\n#include <stdint.h>\n#include "bus.h"\n\n// Commands: "w ADDR VALUE" writes, "r ADDR" reads. All numbers in hex.\nint main(void) {\n    char cmd;\n    unsigned addr, value;\n    bus_reset();\n    while (scanf(" %c %x", &cmd, &addr) == 2) {\n        if (cmd == \'w\' && scanf("%x", &value) == 1) {\n            bus_write((uint16_t)addr, (uint8_t)value);\n        } else if (cmd == \'r\') {\n            printf("%04X: %02X\\n", addr, bus_read((uint16_t)addr));\n        }\n    }\n    return 0;\n}\n',
        'bus.h': '#ifndef BUS_H\n#define BUS_H\n\n#include <stdint.h>\n\nvoid bus_reset(void);\nuint8_t bus_read(uint16_t addr);\nvoid bus_write(uint16_t addr, uint8_t value);\n\n#endif\n',
        'bus.c': '#include <string.h>\n#include "bus.h"\n\n// Write the bus here.\n',
      },
      stdin: 'w 0801 AB\nr 0001\nr 1801\nw 4000 12\nr 4000',
      harness: {
        'main.c': '#include <stdio.h>\n#include <stdint.h>\n#include "bus.h"\nint main(void) {\n    char cmd;\n    unsigned addr, value;\n    bus_reset();\n    while (scanf(" %c %x", &cmd, &addr) == 2) {\n        if (cmd == \'w\' && scanf("%x", &value) == 1) {\n            bus_write((uint16_t)addr, (uint8_t)value);\n        } else if (cmd == \'r\') {\n            printf("%04X: %02X\\n", addr, bus_read((uint16_t)addr));\n        } else if (cmd == \'z\') {\n            bus_reset();\n        }\n    }\n    return 0;\n}\n',
        'bus.h': '#ifndef BUS_H\n#define BUS_H\n#include <stdint.h>\nvoid bus_reset(void);\nuint8_t bus_read(uint16_t addr);\nvoid bus_write(uint16_t addr, uint8_t value);\n#endif\n',
      },
      tests: [
        { name: 'Write and read back', stdin: 'w 0000 42\nr 0000\nw 07FF 99\nr 07FF', expect: '0000: 42\n07FF: 99\n' },
        { name: 'RAM is mirrored up to 1FFF', stdin: 'w 0801 AB\nr 0001\nr 1001\nr 1801\nw 1FFF 5A\nr 07FF', expect: '0001: AB\n1001: AB\n1801: AB\n07FF: 5A\n' },
        { name: 'Other addresses read 0 and ignore writes', stdin: 'w 4000 12\nr 4000\nw 8000 FF\nr 8000\nr 0000\nr 2000', expect: '4000: 00\n8000: 00\n0000: 00\n2000: 00\n' },
        { name: 'bus_reset clears RAM', stdin: 'w 0010 77\nz 0\nr 0010', expect: '0010: 00\n' },
      ],
      rules: [{ re: 'static\\s+uint8_t\\s+ram', must: true, msg: 'Keep RAM private to bus.c: static uint8_t ram[0x800];' }],
      hints: [
        'For reads: <code>if (addr &lt; 0x2000) return ram[addr % 0x800];</code> then <code>return 0;</code> Writes follow the same shape.',
        '<code>bus_reset</code> can use <code>memset(ram, 0, sizeof ram);</code> (that is why <code>string.h</code> is already included).',
      ],
      solution: {
        'bus.c': '#include <string.h>\n#include "bus.h"\n\nstatic uint8_t ram[0x800];\n\nvoid bus_reset(void) {\n    memset(ram, 0, sizeof ram);\n}\n\nuint8_t bus_read(uint16_t addr) {\n    if (addr < 0x2000) {\n        return ram[addr % 0x800];\n    }\n    return 0;\n}\n\nvoid bus_write(uint16_t addr, uint8_t value) {\n    if (addr < 0x2000) {\n        ram[addr % 0x800] = value;\n    }\n}\n',
      },
    },
    {
      id: 'c-files-3',
      title: 'The master clock',
      prompt: '<p>The NES picture chip draws one dot per tick, 341 dots per scanline and 262 scanlines per frame (240 visible, the rest are time for the game to work). It ticks exactly 3 times for every CPU cycle. Your emulator keeps the two in step with a clock module. <code>clock.h</code> declares it; write <code>clock.c</code>, keeping the state in private <code>static</code> variables:</p><ul><li><code>void clock_reset(void)</code>: dot 0, scanline 0, frame 0.</li><li><code>void clock_cpu_cycles(int cycles)</code>: advances the picture chip by <code>3 * cycles</code> dots. After dot 340 comes dot 0 of the next scanline; after scanline 261 comes scanline 0 of the next frame.</li><li><code>int clock_dot(void)</code>, <code>int clock_scanline(void)</code> and <code>long clock_frame(void)</code> return the current position.</li></ul><p>One frame is 341 × 262 = 89,342 dots, which is 29,780 CPU cycles plus a third.</p>',
      files: {
        'main.c': '#include <stdio.h>\n#include "clock.h"\n\nint main(void) {\n    clock_reset();\n    clock_cpu_cycles(114);\n    printf("frame %ld, scanline %d, dot %d\\n", clock_frame(), clock_scanline(), clock_dot());\n    clock_cpu_cycles(29781);\n    printf("frame %ld, scanline %d, dot %d\\n", clock_frame(), clock_scanline(), clock_dot());\n    return 0;\n}\n',
        'clock.h': '#ifndef CLOCK_H\n#define CLOCK_H\n\nvoid clock_reset(void);\nvoid clock_cpu_cycles(int cycles);\nint clock_dot(void);\nint clock_scanline(void);\nlong clock_frame(void);\n\n#endif\n',
        'clock.c': '#include "clock.h"\n\n// Write the clock here.\n',
      },
      harness: {
        'main.c': '#include <stdio.h>\n#include "clock.h"\nstatic void show(void) { printf("%ld %d %d\\n", clock_frame(), clock_scanline(), clock_dot()); }\nint main(void) {\n    int t = 0;\n    scanf("%d", &t);\n    clock_reset();\n    if (t == 1) { clock_cpu_cycles(1); show(); clock_cpu_cycles(100); show(); }\n    if (t == 2) { clock_cpu_cycles(113); show(); clock_cpu_cycles(1); show(); clock_cpu_cycles(1); show(); }\n    if (t == 3) { clock_cpu_cycles(29780); show(); clock_cpu_cycles(1); show(); }\n    if (t == 4) { for (int i = 0; i < 60 * 29781; i++) clock_cpu_cycles(1); show(); }\n    if (t == 5) { clock_cpu_cycles(5000); clock_reset(); show(); clock_cpu_cycles(200000); show(); }\n    return 0;\n}\n',
        'clock.h': '#ifndef CLOCK_H\n#define CLOCK_H\nvoid clock_reset(void);\nvoid clock_cpu_cycles(int cycles);\nint clock_dot(void);\nint clock_scanline(void);\nlong clock_frame(void);\n#endif\n',
      },
      tests: [
        { name: 'A few cycles', stdin: '1', expect: '0 0 3\n0 0 303\n' },
        { name: 'Crossing into the next scanline', stdin: '2', expect: '0 0 339\n0 1 1\n0 1 4\n' },
        { name: 'Crossing into the next frame', stdin: '3', expect: '0 261 339\n1 0 1\n' },
        { name: 'One second, a cycle at a time', stdin: '4', expect: '60 0 60\n' },
        { name: 'Reset, then a big jump', stdin: '5', expect: '0 0 0\n6 187 181\n' },
      ],
      rules: [{ re: '\\bstatic\\b', must: true, msg: 'Keep the clock\'s state private to clock.c with static variables.' }],
      hints: [
        'Keep three <code>static</code> variables: <code>dot</code>, <code>scanline</code> and <code>frame</code>. The simplest correct version adds dots one at a time in a loop of <code>3 * cycles</code> steps.',
        'Each step: <code>dot++</code>; if <code>dot == 341</code>, set it to 0 and <code>scanline++</code>; if <code>scanline == 262</code>, set it to 0 and <code>frame++</code>.',
      ],
      solution: {
        'clock.c': '#include "clock.h"\n\nstatic int dot = 0;\nstatic int scanline = 0;\nstatic long frame = 0;\n\nvoid clock_reset(void) {\n    dot = 0;\n    scanline = 0;\n    frame = 0;\n}\n\nvoid clock_cpu_cycles(int cycles) {\n    for (int i = 0; i < 3 * cycles; i++) {\n        dot++;\n        if (dot == 341) {\n            dot = 0;\n            scanline++;\n            if (scanline == 262) {\n                scanline = 0;\n                frame++;\n            }\n        }\n    }\n}\n\nint clock_dot(void) {\n    return dot;\n}\n\nint clock_scanline(void) {\n    return scanline;\n}\n\nlong clock_frame(void) {\n    return frame;\n}\n',
      },
    },
  ],
});
