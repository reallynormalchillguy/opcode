(() => {
const R = String.raw;

Course.add({
  id: 'cpp-bits',
  part: 'cpp',
  title: 'Bits, bytes and hexadecimal',
  summary: 'Binary and hex, exact-size integer types, wrap-around, signed bytes, printing bytes, and the operators that read and change single bits.',
  blocks: [
    { t: 'p', html: 'This is the lesson you will use most inside the emulator. The 6502 is an 8-bit processor: its registers hold one byte, its status register is eight separate on/off flags packed into one byte, and its addresses are two bytes glued together. Working with that means working with individual bits.' },

    { t: 'h', text: 'Binary and hexadecimal' },
    { t: 'p', html: 'A <em>bit</em> is a 0 or a 1. A <em>byte</em> is 8 bits, so it can hold 2<sup>8</sup> = 256 different patterns: 0 to 255. The bits are numbered from the right, starting at 0, and bit <em>n</em> is worth 2<sup>n</sup>:' },
    { t: 'table', head: ['Bit', '7', '6', '5', '4', '3', '2', '1', '0'], rows: [
      ['Worth', '128', '64', '32', '16', '8', '4', '2', '1'],
      ['0b10010110', '1', '0', '0', '1', '0', '1', '1', '0'],
    ] },
    { t: 'p', html: 'That pattern is 128 + 16 + 4 + 2 = 150. Writing bytes as 8 binary digits is tiring, so programmers use <em>hexadecimal</em>, base 16, with digits 0-9 then A-F (10 to 15). The trick that makes hex so useful: <strong>one hex digit is exactly four bits</strong>. You can convert by splitting the byte in half:' },
    { t: 'table', head: ['Binary', '1001', '0110'], rows: [
      ['Hex digit', '9', '6'],
    ] },
    { t: 'p', html: 'So <code>0b10010110</code> is <code>0x96</code>. Each half of a byte is called a <em>nibble</em>. With practice you read <code>0x96</code> as "bits 7, 4, 2 and 1" without thinking; the table of 16 nibbles (<code>0</code> = 0000 to <code>F</code> = 1111) is worth learning by heart. In C++ you write hex as <code>0x96</code> and binary as <code>0b10010110</code>. Long numbers can have <code>\'</code> separators: <code>0b1001\'0110</code>.' },

    { t: 'h', text: 'Integers with an exact size' },
    { t: 'p', html: 'The language does not promise how big an <code>int</code> is. For emulation you need exact sizes, so you include <code>&lt;cstdint&gt;</code> and use its types:' },
    { t: 'table', head: ['Type', 'Bits', 'Range'], rows: [
      ['<code>std::uint8_t</code>', '8', '0 to 255'],
      ['<code>std::int8_t</code>', '8', '-128 to 127'],
      ['<code>std::uint16_t</code>', '16', '0 to 65,535'],
      ['<code>std::uint32_t</code>', '32', '0 to about 4.29 billion'],
    ] },
    { t: 'p', html: 'From here on, the emulator uses <code>std::uint8_t</code> for every byte and register and <code>std::uint16_t</code> for every address.' },

    { t: 'h', text: 'Printing bytes' },
    { t: 'p', html: '<code>std::uint8_t</code> is really another name for <code>unsigned char</code>, and that has a surprising effect: <code>std::cout</code> prints it as a <em>character</em>, not as a number.' },
    { t: 'code', title: 'print.cpp', run: true, lines: [
      ['#include <cstdint>'],
      ['#include <cstdio>', 'The C library\'s <code>printf</code>, available in C++ as <code>std::printf</code>.'],
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    std::uint8_t a = 65;'],
      [R`    std::cout << a << "\n";`, 'Prints <code>A</code>: character number 65.'],
      [R`    std::cout << static_cast<int>(a) << "\n";`, 'Convert to <code>int</code> first to see the number.'],
      ['    std::uint16_t pc = 0xC000;'],
      [R`    std::printf("PC:%04X A:%02X\n", pc, a);`, '<code>printf</code> fills each <code>%</code> placeholder with the next argument. <code>%X</code> is hex in capitals; <code>%02X</code> pads it with zeros to 2 digits, <code>%04X</code> to 4. <code>%d</code> is a decimal <code>int</code>, <code>%s</code> a C string, <code>%c</code> one character.'],
      ['}'],
    ] },
    { t: 'p', html: 'You can get the same with <code>std::cout &lt;&lt; std::hex &lt;&lt; std::uppercase &lt;&lt; std::setw(2) &lt;&lt; std::setfill(\'0\')</code>, but for lines of fixed-width hex, which emulators print constantly, <code>std::printf</code> is shorter. Do not mix the two in one program unless you finish each line with one of them: they share the output, and C++ keeps them in order, but mixing mid-line is hard to read.' },
    { t: 'note', kind: 'warn', html: '<code>printf</code> trusts the placeholders: if they do not match the arguments, it prints garbage. Clang checks them for you and warns when a type does not fit, so read those warnings.' },

    { t: 'h', text: 'Wrap-around' },
    { t: 'p', html: 'Unsigned integers never overflow into an error. When a result does not fit, only the low bits are kept, so the value wraps around like a car\'s odometer. This is defined behaviour, and it is exactly how the 6502\'s registers behave.' },
    { t: 'code', title: 'wrap.cpp', run: true, lines: [
      ['#include <cstdint>'],
      ['#include <cstdio>'],
      [''],
      ['int main() {'],
      ['    std::uint8_t x = 255;'],
      ['    x++;', '255 + 1 is 256, which needs 9 bits. Only the low 8 bits are kept: 0.'],
      [R`    std::printf("%d\n", x);`, 'A <code>uint8_t</code> is converted to <code>int</code> when passed to <code>printf</code>, so <code>%d</code> works.'],
      ['    std::uint8_t y = 3;'],
      ['    y = y - 5;', '3 - 5 wraps the other way: 254.'],
      [R`    std::printf("%d\n", y);`],
      ['    std::uint16_t pc = 0xFFFF;'],
      ['    pc++;', 'The same at 16 bits: 0xFFFF + 1 is 0x0000.'],
      [R`    std::printf("%04X\n", pc);`],
      ['}'],
    ] },
    { t: 'note', kind: 'warn', html: 'Arithmetic happens in <code>int</code> at least. <code>std::uint8_t a = 200, b = 100; int s = a + b;</code> gives 300, not 44. The wrap only happens when you store the result back into a <code>std::uint8_t</code>. That is useful: the 6502 needs to know whether an addition went past 255 (its <em>carry</em>), and computing in <code>int</code> first lets you see it.' },

    { t: 'h', text: 'Negative numbers in a byte' },
    { t: 'p', html: 'The same 8 bits can be read as unsigned (0 to 255) or as signed (-128 to 127). Signed bytes use <em>two\'s complement</em>: patterns from <code>0x80</code> to <code>0xFF</code> mean -128 to -1. So <code>0xFF</code> is -1 and <code>0xFE</code> is -2. Bit 7 tells you the sign, which is why the 6502 calls it the <em>negative</em> flag.' },
    { t: 'code', title: 'signed.cpp', run: true, lines: [
      ['#include <cstdint>'],
      ['#include <cstdio>'],
      [''],
      ['int main() {'],
      ['    std::uint8_t raw = 0xFC;'],
      ['    auto offset = static_cast<std::int8_t>(raw);', 'The cast reads the same bits as signed. <code>0xFC</code> is 252 unsigned and -4 signed.'],
      [R`    std::printf("%d as signed is %d\n", raw, offset);`],
      ['    std::uint16_t pc = 0xC010;'],
      ['    auto target = static_cast<std::uint16_t>(pc + offset);', 'A 6502 branch instruction stores its jump distance as one signed byte, so it can jump up to 128 bytes back or 127 forward. This line is how your emulator will compute the target.'],
      [R`    std::printf("branch from %04X to %04X\n", pc, target);`],
      ['}'],
    ] },

    { t: 'h', text: 'Bitwise operators' },
    { t: 'p', html: 'These operators work on each bit position separately:' },
    { t: 'table', head: ['Operator', 'Name', 'Each result bit is 1 when…', 'Example'], rows: [
      ['<code>a &amp; b</code>', 'and', 'both bits are 1', '<code>0b1100 &amp; 0b1010</code> = <code>0b1000</code>'],
      ['<code>a | b</code>', 'or', 'either bit is 1', '<code>0b1100 | 0b1010</code> = <code>0b1110</code>'],
      ['<code>a ^ b</code>', 'exclusive or', 'the bits are different', '<code>0b1100 ^ 0b1010</code> = <code>0b0110</code>'],
      ['<code>~a</code>', 'not', 'the bit was 0', '<code>~0b1100</code> (in 4 bits) = <code>0b0011</code>'],
      ['<code>a &lt;&lt; n</code>', 'shift left', 'moves every bit up <em>n</em> places', '<code>0b0011 &lt;&lt; 2</code> = <code>0b1100</code>'],
      ['<code>a &gt;&gt; n</code>', 'shift right', 'moves every bit down <em>n</em> places', '<code>0b1100 &gt;&gt; 2</code> = <code>0b0011</code>'],
    ] },
    { t: 'p', html: 'Do not confuse <code>&amp;</code> with <code>&amp;&amp;</code>, or <code>|</code> with <code>||</code>. The doubled ones are logical (true or false); the single ones work bit by bit. (And yes, <code>&lt;&lt;</code> is the same symbol <code>std::cout</code> uses: with numbers on both sides it shifts.)' },

    { t: 'h', text: 'Reading and changing one bit' },
    { t: 'p', html: 'A <em>mask</em> is a number with 1s only in the bits you care about. <code>1 &lt;&lt; n</code> is the mask for bit <em>n</em>. Four idioms cover almost everything:' },
    { t: 'code', title: 'flags.cpp', run: true, lines: [
      ['#include <cstdint>'],
      ['#include <cstdio>'],
      [''],
      ['constexpr std::uint8_t kCarry = 1 << 0;', 'Name each bit once, as a constant.'],
      ['constexpr std::uint8_t kZero = 1 << 1;'],
      [''],
      ['int main() {'],
      ['    std::uint8_t p = 0;'],
      ['    p |= kZero;', '<strong>Set</strong> a bit: or-ing with the mask turns that bit on and leaves the others alone.'],
      ['    p |= kCarry;'],
      ['    p &= ~kCarry;', '<strong>Clear</strong> a bit: <code>~mask</code> has every bit on except that one, and and-ing keeps all the others.'],
      ['    p ^= kZero;', '<strong>Toggle</strong> a bit: exclusive-or flips it.'],
      ['    p ^= kZero;'],
      ['    if (p & kZero) {', '<strong>Test</strong> a bit: the result is non-zero (true) only if that bit is on.'],
      [R`        std::printf("zero flag is set\n");`],
      ['    }'],
      ['    int bit4 = (0x96 >> 4) & 1;', 'Another way to read bit <em>n</em> as exactly 0 or 1: shift it down to position 0, then keep only that bit.'],
      [R`    std::printf("p=%02X bit4=%d\n", p, bit4);`],
      ['}'],
    ] },
    { t: 'p', html: 'Masking is also the fast way to keep an index inside an array whose size is a power of two: <code>ram[addr &amp; 0x7FF]</code> can never go past index <code>0x7FF</code>, and it does the same job as <code>addr % 0x800</code> for unsigned numbers.' },

    { t: 'h', text: 'Two bytes make an address' },
    { t: 'p', html: 'The 6502 stores 16-bit values as two bytes, the <em>low</em> byte first and the <em>high</em> byte second. This order is called <em>little-endian</em>. Gluing and splitting them is pure shifting and masking:' },
    { t: 'code', title: 'address.cpp', run: true, lines: [
      ['#include <cstdint>'],
      ['#include <cstdio>'],
      [''],
      ['int main() {'],
      ['    std::uint8_t lo = 0x34, hi = 0x12;'],
      ['    auto addr = static_cast<std::uint16_t>(hi << 8 | lo);', 'Move the high byte up into bits 15 to 8, then or the low byte into bits 7 to 0: <code>0x1234</code>. The arithmetic happens in <code>int</code>, so the cast says we want 16 bits back.'],
      [R`    std::printf("%04X\n", addr);`],
      ['    std::uint8_t lo2 = addr & 0xFF;', 'Keep the low 8 bits.'],
      ['    std::uint8_t hi2 = addr >> 8;', 'Shift the high 8 bits down.'],
      [R`    std::printf("%02X %02X\n", hi2, lo2);`],
      ['}'],
    ] },
    { t: 'note', kind: 'nes', html: 'When a NES powers on, the CPU reads the two bytes at <code>0xFFFC</code> and <code>0xFFFD</code>, glues them into an address exactly like this, and starts running there. That address is the <em>reset vector</em>, and it is the first thing your emulator will compute.' },

    { t: 'quiz', q: 'What is <code>0x3C</code> in binary?', options: ['<code>0b00111100</code>', '<code>0b00110011</code>', '<code>0b11000011</code>'], answer: 0, explain: '<code>3</code> is <code>0011</code> and <code>C</code> (12) is <code>1100</code>. Put the nibbles side by side.' },
    { t: 'quiz', q: 'Which line turns off bit 7 of <code>p</code> and leaves every other bit as it was?', options: ['<code>p &amp;= 0x80;</code>', '<code>p &amp;= ~0x80;</code>', '<code>p ^= 0x80;</code>'], answer: 1, explain: '<code>~0x80</code> has every bit on except bit 7. The first option clears every bit <em>except</em> bit 7, and the third flips bit 7, which turns it on if it was off.' },
    { t: 'quiz', q: 'What does <code>std::uint8_t v = 66; std::cout &lt;&lt; v;</code> print?', options: ['66', 'B', '0x42'], answer: 1, explain: '<code>std::uint8_t</code> is an <code>unsigned char</code>, so <code>std::cout</code> prints character 66, which is <code>B</code>. Cast to <code>int</code> or use <code>printf</code> to see the number.' },
  ],

  exercises: [
    {
      id: 'cpp-bits-1',
      title: 'Print in binary',
      prompt: '<p>Neither <code>std::cout</code> nor <code>printf</code> prints binary directly, so write <code>void print_bin8(std::uint8_t v)</code>. It prints exactly 8 characters, <code>0</code> or <code>1</code>, from bit 7 down to bit 0, then a new line.</p><pre>print_bin8(0x96) prints 10010110\nprint_bin8(5)    prints 00000101</pre>',
      files: { 'main.cpp': R`#include <cstdint>
#include <iostream>

void print_bin8(std::uint8_t v) {

}

int main() {
    print_bin8(0x96);
    print_bin8(5);
}
` },
      harness: { 'check.cpp': R`#include <cstdint>
#include <iostream>
void print_bin8(std::uint8_t v);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { print_bin8(0x96); print_bin8(5); }
    if (t == 2) { print_bin8(0); print_bin8(0xFF); }
    if (t == 3) { print_bin8(0x80); print_bin8(0x01); print_bin8(0x3C); }
}
` },
      tests: [
        { name: 'The examples', stdin: '1', expect: '10010110\n00000101\n' },
        { name: 'All zeros and all ones', stdin: '2', expect: '00000000\n11111111\n' },
        { name: 'The top bit, the bottom bit, and 0x3C', stdin: '3', expect: '10000000\n00000001\n00111100\n' },
      ],
      rules: [{ re: 'bitset', must: false, msg: 'Work the bits out yourself, without std::bitset.' }],
      hints: [
        'Loop <code>bit</code> from 7 down to 0. Bit number <code>bit</code> is <code>(v &gt;&gt; bit) &amp; 1</code>.',
        'Print a character, not a number: <code>std::cout &lt;&lt; (((v &gt;&gt; bit) &amp; 1) ? \'1\' : \'0\');</code>, then <code>"\\n"</code> after the loop.',
      ],
      solution: { 'main.cpp': R`#include <cstdint>
#include <iostream>

void print_bin8(std::uint8_t v) {
    for (int bit = 7; bit >= 0; bit--) {
        std::cout << (((v >> bit) & 1) ? '1' : '0');
    }
    std::cout << "\n";
}

int main() {
    print_bin8(0x96);
    print_bin8(5);
}
` },
    },
    {
      id: 'cpp-bits-2',
      title: 'The status register',
      prompt: '<p>The 6502 keeps eight flags in one byte called <code>P</code>. From bit 7 to bit 0 they are:</p><pre>N V - B D I Z C</pre><p>(Negative, oVerflow, unused, Break, Decimal, Interrupt disable, Zero, Carry.) <code>flags.h</code> defines a mask for each. Write:</p><ul><li><code>std::uint8_t set_flag(std::uint8_t p, std::uint8_t flag, bool on)</code>: returns <code>p</code> with that flag turned on or off. Other bits stay as they were.</li><li><code>bool get_flag(std::uint8_t p, std::uint8_t flag)</code></li><li><code>void print_flags(std::uint8_t p)</code>: prints the 8 letters <code>NV-BDIZC</code>, but with <code>.</code> in place of each flag that is off, then a new line. Bit 5 always prints <code>-</code>. For example <code>0x24</code> prints <code>..-..I..</code></li></ul>',
      files: {
        'main.cpp': R`#include <cstdint>
#include <iostream>
#include "flags.h"

std::uint8_t set_flag(std::uint8_t p, std::uint8_t flag, bool on) {
    return p;
}

bool get_flag(std::uint8_t p, std::uint8_t flag) {
    return false;
}

void print_flags(std::uint8_t p) {

}

int main() {
    std::uint8_t p = 0x24;
    print_flags(p);
    p = set_flag(p, kFlagC, true);
    p = set_flag(p, kFlagI, false);
    print_flags(p);
    std::cout << "carry=" << get_flag(p, kFlagC) << "\n";
}
`,
        'flags.h': R`#pragma once
#include <cstdint>

constexpr std::uint8_t kFlagC = 0x01;  // carry
constexpr std::uint8_t kFlagZ = 0x02;  // zero
constexpr std::uint8_t kFlagI = 0x04;  // interrupt disable
constexpr std::uint8_t kFlagD = 0x08;  // decimal (ignored by the NES)
constexpr std::uint8_t kFlagB = 0x10;  // break
constexpr std::uint8_t kFlagU = 0x20;  // unused
constexpr std::uint8_t kFlagV = 0x40;  // overflow
constexpr std::uint8_t kFlagN = 0x80;  // negative
`,
      },
      harness: { 'check.cpp': R`#include <cstdint>
#include <cstdio>
#include <iostream>
#include "flags.h"
std::uint8_t set_flag(std::uint8_t p, std::uint8_t flag, bool on);
bool get_flag(std::uint8_t p, std::uint8_t flag);
void print_flags(std::uint8_t p);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { std::printf("%02X ", set_flag(0x24, kFlagC, true)); std::printf("%02X ", set_flag(0x24, kFlagI, false)); std::printf("%02X ", set_flag(0x24, kFlagI, true)); std::printf("%02X\n", set_flag(0x00, kFlagN, true)); }
    if (t == 2) { std::printf("%02X ", set_flag(0xFF, kFlagZ, false)); std::printf("%02X\n", set_flag(0x81, kFlagN, false)); }
    if (t == 3) std::cout << get_flag(0x24, kFlagI) << get_flag(0x24, kFlagC) << get_flag(0x80, kFlagN) << get_flag(0x7F, kFlagN) << "\n";
    if (t == 4) { print_flags(0x24); print_flags(0x00); print_flags(0xFF); print_flags(0xC3); }
}
` },
      tests: [
        { name: 'Turning flags on and off', stdin: '1', expect: '25 20 24 80\n' },
        { name: 'Other bits are left alone', stdin: '2', expect: 'FD 01\n' },
        { name: 'Reading flags', stdin: '3', expect: '1010\n' },
        { name: 'Printing the flags', stdin: '4', expect: '..-..I..\n..-.....\nNV-BDIZC\nNV-...ZC\n' },
      ],
      hints: [
        '<code>set_flag</code>: <code>p | flag</code> turns it on, <code>p &amp; ~flag</code> turns it off. Both are computed as <code>int</code>, so return them with <code>static_cast&lt;std::uint8_t&gt;(...)</code>.',
        '<code>get_flag</code>: <code>(p &amp; flag) != 0</code>. For <code>print_flags</code>, loop over bits 7 to 0 with the text <code>"NV-BDIZC"</code> in a <code>std::string</code>: character <code>7 - bit</code> is the letter for that bit.',
      ],
      solution: { 'main.cpp': R`#include <cstdint>
#include <iostream>
#include <string>
#include "flags.h"

std::uint8_t set_flag(std::uint8_t p, std::uint8_t flag, bool on) {
    if (on) {
        return static_cast<std::uint8_t>(p | flag);
    }
    return static_cast<std::uint8_t>(p & ~flag);
}

bool get_flag(std::uint8_t p, std::uint8_t flag) {
    return (p & flag) != 0;
}

void print_flags(std::uint8_t p) {
    const std::string names = "NV-BDIZC";
    for (int bit = 7; bit >= 0; bit--) {
        if (bit == 5) {
            std::cout << '-';
        } else if ((p >> bit) & 1) {
            std::cout << names[7 - bit];
        } else {
            std::cout << '.';
        }
    }
    std::cout << "\n";
}

int main() {
    std::uint8_t p = 0x24;
    print_flags(p);
    p = set_flag(p, kFlagC, true);
    p = set_flag(p, kFlagI, false);
    print_flags(p);
    std::cout << "carry=" << get_flag(p, kFlagC) << "\n";
}
` },
    },
    {
      id: 'cpp-bits-3',
      title: 'Little-endian',
      prompt: '<p>The starting code names a 64 KB memory type: <code>using Memory = std::array&lt;std::uint8_t, 0x10000&gt;;</code>. Write two functions that read and write 16-bit values in it, low byte first:</p><pre>std::uint16_t read16(const Memory&amp; mem, std::uint16_t addr)\nvoid write16(Memory&amp; mem, std::uint16_t addr, std::uint16_t value)</pre><p>The low byte is at <code>addr</code> and the high byte at <code>addr + 1</code>. If <code>addr</code> is <code>0xFFFF</code>, the high byte is at <code>0x0000</code>: addresses wrap around. Store <code>addr + 1</code> in a <code>std::uint16_t</code> and it wraps for you.</p>',
      files: { 'main.cpp': R`#include <array>
#include <cstdint>
#include <cstdio>

using Memory = std::array<std::uint8_t, 0x10000>;

std::uint16_t read16(const Memory& mem, std::uint16_t addr) {
    return 0;
}

void write16(Memory& mem, std::uint16_t addr, std::uint16_t value) {

}

int main() {
    static Memory mem{};
    mem[0xFFFC] = 0x00;
    mem[0xFFFD] = 0xC0;
    std::printf("reset vector: %04X\n", read16(mem, 0xFFFC));
    write16(mem, 0x0010, 0xBEEF);
    std::printf("%02X %02X\n", mem[0x0010], mem[0x0011]);
}
` },
      harness: { 'check.cpp': R`#include <array>
#include <cstdint>
#include <cstdio>
#include <iostream>
using Memory = std::array<std::uint8_t, 0x10000>;
std::uint16_t read16(const Memory& mem, std::uint16_t addr);
void write16(Memory& mem, std::uint16_t addr, std::uint16_t value);
static Memory mem{};
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { mem[0xFFFC] = 0x00; mem[0xFFFD] = 0xC0; mem[0x10] = 0x34; mem[0x11] = 0x12; std::printf("%04X ", read16(mem, 0xFFFC)); std::printf("%04X\n", read16(mem, 0x10)); }
    if (t == 2) { write16(mem, 0x0200, 0xBEEF); std::printf("%02X %02X ", mem[0x200], mem[0x201]); std::printf("%04X\n", read16(mem, 0x200)); }
    if (t == 3) { mem[0xFFFF] = 0xCD; mem[0x0000] = 0xAB; std::printf("%04X ", read16(mem, 0xFFFF)); write16(mem, 0xFFFF, 0x1234); std::printf("%02X %02X\n", mem[0xFFFF], mem[0x0000]); }
    if (t == 4) { mem[0x300] = 0x11; mem[0x303] = 0x44; write16(mem, 0x301, 0x3322); for (int i = 0; i < 4; i++) std::printf("%02X", mem[0x300 + i]); std::printf("\n"); }
}
` },
      tests: [
        { name: 'Reading the reset vector', stdin: '1', expect: 'C000 1234\n' },
        { name: 'Writing puts the low byte first', stdin: '2', expect: 'EF BE BEEF\n' },
        { name: 'Wrapping at FFFF', stdin: '3', expect: 'ABCD 34 12\n' },
        { name: 'Neighbouring bytes are left alone', stdin: '4', expect: '11223344\n' },
      ],
      hints: [
        'Read: <code>std::uint16_t next = addr + 1;</code> wraps <code>0xFFFF</code> to <code>0x0000</code>. Then return <code>static_cast&lt;std::uint16_t&gt;(mem[next] &lt;&lt; 8 | mem[addr])</code>.',
        'Write: <code>mem[addr] = value &amp; 0xFF;</code> and <code>mem[next] = value &gt;&gt; 8;</code>',
      ],
      solution: { 'main.cpp': R`#include <array>
#include <cstdint>
#include <cstdio>

using Memory = std::array<std::uint8_t, 0x10000>;

std::uint16_t read16(const Memory& mem, std::uint16_t addr) {
    std::uint16_t next = addr + 1;
    return static_cast<std::uint16_t>(mem[next] << 8 | mem[addr]);
}

void write16(Memory& mem, std::uint16_t addr, std::uint16_t value) {
    std::uint16_t next = addr + 1;
    mem[addr] = value & 0xFF;
    mem[next] = value >> 8;
}

int main() {
    static Memory mem{};
    mem[0xFFFC] = 0x00;
    mem[0xFFFD] = 0xC0;
    std::printf("reset vector: %04X\n", read16(mem, 0xFFFC));
    write16(mem, 0x0010, 0xBEEF);
    std::printf("%02X %02X\n", mem[0x0010], mem[0x0011]);
}
` },
    },
    {
      id: 'cpp-bits-4',
      title: 'CPU registers',
      prompt: '<p>Your first emulator class. <code>registers.h</code> declares a <code>Registers</code> class with the 6502\'s registers: <code>a</code>, <code>x</code>, <code>y</code> and <code>sp</code> are <code>std::uint8_t</code>, <code>pc</code> is <code>std::uint16_t</code>. Write its three member functions:</p><ul><li><code>void reset(std::uint16_t start)</code>: sets <code>a</code>, <code>x</code> and <code>y</code> to 0, <code>sp</code> to <code>0xFD</code>, and <code>pc</code> to <code>start</code>.</li><li><code>void inx()</code>: the INX instruction. Adds 1 to <code>x</code> and 1 to <code>pc</code> (INX is one byte long).</li><li><code>void print() const</code>: prints the registers in the format the famous <em>nestest</em> log uses, two hex digits each and four for the PC, then a new line:</li></ul><pre>PC:C000 A:00 X:00 Y:00 SP:FD</pre><p>Notice what happens when <code>x</code> is 255 and you add 1: it wraps around to 0, exactly like the real register.</p>',
      files: {
        'main.cpp': R`#include <cstdio>
#include "registers.h"

void Registers::reset(std::uint16_t start) {

}

void Registers::inx() {

}

void Registers::print() const {

}

int main() {
    Registers r;
    r.reset(0xC000);
    r.print();
    r.inx();
    r.print();
}
`,
        'registers.h': R`#pragma once
#include <cstdint>

class Registers {
public:
    void reset(std::uint16_t start);
    void inx();
    void print() const;

    // Public for now, so tests can set them directly. In the emulator
    // they will be private.
    std::uint8_t a = 0;    // accumulator
    std::uint8_t x = 0;    // index register X
    std::uint8_t y = 0;    // index register Y
    std::uint8_t sp = 0;   // stack pointer
    std::uint16_t pc = 0;  // program counter
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "registers.h"
int main() {
    int t = 0;
    std::cin >> t;
    Registers r;
    r.a = 9; r.x = 9; r.y = 9; r.sp = 9; r.pc = 9;
    if (t == 1) { r.reset(0xC000); r.print(); }
    if (t == 2) { r.reset(0x8000); r.inx(); r.inx(); r.print(); }
    if (t == 3) { r.reset(0x0005); r.x = 0xFE; r.a = 0x3C; r.y = 0xB; r.inx(); r.print(); r.inx(); r.print(); }
    if (t == 4) { r.reset(0xFFFF); r.inx(); r.print(); }
}
` },
      tests: [
        { name: 'Reset sets every register', stdin: '1', expect: 'PC:C000 A:00 X:00 Y:00 SP:FD\n' },
        { name: 'INX twice', stdin: '2', expect: 'PC:8002 A:00 X:02 Y:00 SP:FD\n' },
        { name: 'X wraps from FF to 00', stdin: '3', expect: 'PC:0006 A:3C X:FF Y:0B SP:FD\nPC:0007 A:3C X:00 Y:0B SP:FD\n' },
        { name: 'PC wraps from FFFF to 0000', stdin: '4', expect: 'PC:0000 A:00 X:01 Y:00 SP:FD\n' },
      ],
      hints: [
        'Inside the member functions the registers are just <code>a</code>, <code>x</code>, <code>pc</code> and so on: <code>x++;</code> and <code>pc++;</code>',
        'Use <code>%02X</code> for the 8-bit registers and <code>%04X</code> for the PC: <code>std::printf("PC:%04X A:%02X X:%02X Y:%02X SP:%02X\\n", pc, a, x, y, sp);</code>',
      ],
      solution: { 'main.cpp': R`#include <cstdio>
#include "registers.h"

void Registers::reset(std::uint16_t start) {
    a = 0;
    x = 0;
    y = 0;
    sp = 0xFD;
    pc = start;
}

void Registers::inx() {
    x++;
    pc++;
}

void Registers::print() const {
    std::printf("PC:%04X A:%02X X:%02X Y:%02X SP:%02X\n", pc, a, x, y, sp);
}

int main() {
    Registers r;
    r.reset(0xC000);
    r.print();
    r.inx();
    r.print();
}
` },
    },
  ],
});
})();
