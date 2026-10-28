(function () {
  const C = window.CpuLesson;

  Course.add({
    id: 'nes-cpu-modes',
    part: 'nes',
    title: 'Addressing modes',
    summary: 'The thirteen ways a 6502 instruction says where its data is, page crossings, pointers in the zero page, and branches.',
    blocks: [
      { t: 'p', html: '<code>LDA</code> means "load A". But load it from where? The same operation can take its operand from the program itself, from a fixed address, from an address plus X, from a pointer stored in memory, and more. Each of these is an <em>addressing mode</em>, and each has its own opcode. <code>LDA</code> alone has eight.' },
      { t: 'p', html: 'The good news: you write each mode once, as a small function that works out an address, and every instruction reuses them. That idea turns 151 opcodes into a manageable amount of code.' },

      { t: 'h', text: 'The modes' },
      { t: 'table', head: ['Mode', 'Written', 'Bytes', 'The operand is at…'], rows: [
        ['Implied', '<code>INX</code>', '1', 'Nowhere: the instruction says everything.'],
        ['Accumulator', '<code>ASL A</code>', '1', 'Register A.'],
        ['Immediate', '<code>LDA #$05</code>', '2', 'The next byte of the program itself.'],
        ['Zero page', '<code>LDA $10</code>', '2', 'Address <code>$0010</code>: a one-byte address, so only <code>$00</code>-<code>$FF</code>.'],
        ['Zero page,X', '<code>LDA $10,X</code>', '2', '<code>$10 + X</code>, wrapping inside the zero page.'],
        ['Zero page,Y', '<code>LDX $10,Y</code>', '2', 'The same with Y (only LDX and STX have it).'],
        ['Absolute', '<code>LDA $0200</code>', '3', 'A full 16-bit address.'],
        ['Absolute,X / ,Y', '<code>LDA $0200,X</code>', '3', 'The address plus X (or Y).'],
        ['Indirect', '<code>JMP ($0200)</code>', '3', 'Only for JMP: jump to the address <em>stored</em> at <code>$0200</code>.'],
        ['(Indirect,X)', '<code>LDA ($20,X)</code>', '2', 'Add X to <code>$20</code>, read a 2-byte pointer there, use the address it holds.'],
        ['(Indirect),Y', '<code>LDA ($20),Y</code>', '2', 'Read a 2-byte pointer at <code>$20</code>, then add Y to it.'],
        ['Relative', '<code>BNE $C010</code>', '2', 'Only for branches: a signed jump distance.'],
      ] },

      { t: 'h', text: 'Immediate is an address too' },
      { t: 'p', html: 'In the last lesson you wrote <code>LDA #</code> as <code>a = fetch();</code>. There is a neater way to see it: an immediate operand is the byte at address <code>PC</code>. So the immediate "mode" can return an address, <code>pc++</code>, just like every other mode. Then each operation is written once and takes an address:' },
      { t: 'code', title: 'cpu.cpp', lines: [
        ['std::uint16_t Cpu::addr_imm() {', 'Returns where the operand is: right here in the program.'],
        ['    return pc++;'],
        ['}'],
        [''],
        ['std::uint16_t Cpu::addr_zpx() {'],
        ['    return static_cast<std::uint8_t>(fetch() + x);', 'The cast to <code>std::uint8_t</code> keeps the result in the zero page: <code>$FF + 2</code> is <code>$01</code>, not <code>$0101</code>. The real chip does exactly this.'],
        ['}'],
        [''],
        ['void Cpu::lda(std::uint16_t addr) {', 'The operation does not care where the address came from.'],
        ['    a = bus_.read(addr);'],
        ['    set_zn(a);'],
        ['}'],
        [''],
        ['// in Cpu::step:'],
        ['case 0xA9: lda(addr_imm()); cost = 2; break;', 'Each opcode is now one line: an operation, a mode and a cycle count.'],
        ['case 0xB5: lda(addr_zpx()); cost = 4; break;'],
      ] },

      { t: 'h', text: 'The zero page is special' },
      { t: 'p', html: 'Addresses <code>$0000</code>-<code>$00FF</code> are the <em>zero page</em>. Instructions that use it are one byte shorter and one cycle faster, so games keep their most-used variables there. When an index is added to a zero page address, the result <strong>stays in the zero page</strong>: the high byte is never touched. nestest checks this carefully, because it is the classic emulator mistake.' },

      { t: 'h', text: 'Crossing a page' },
      { t: 'p', html: 'A <em>page</em> is 256 bytes that share the same high byte: <code>$0200</code>-<code>$02FF</code> is page 2. In <code>LDA $02F0,X</code> with X = <code>$20</code>, the address is <code>$0310</code>: adding X carried into the high byte. The 6502 adds the low byte first and fixes the high byte one cycle later, so a read that crosses a page takes <strong>one extra cycle</strong>.' },
      { t: 'p', html: 'Only reads pay it. Stores and read-modify-write instructions always take the longer time, crossing or not, because they cannot risk writing to the wrong address first. In the tables, a <code>+</code> after the cycle count marks the instructions that pay the extra cycle.' },
      { t: 'code', title: 'cpu.cpp', lines: [
        ['std::uint16_t Cpu::addr_abx() {', '<code>page_crossed_</code> is a private member, declared in <code>cpu.h</code>. <code>Cpu::step</code> sets it back to <code>false</code> at the start of every instruction.'],
        ['    std::uint16_t base = fetch16();'],
        ['    auto addr = static_cast<std::uint16_t>(base + x);'],
        ['    page_crossed_ = (base & 0xFF00) != (addr & 0xFF00);', 'Compare the high bytes before and after adding X.'],
        ['    return addr;'],
        ['}'],
        [''],
        ['case 0xBD: lda(addr_abx()); cost = 4 + page_crossed_; break;', 'A read: 4 cycles, 5 if the page changed. In arithmetic, <code>true</code> counts as 1 and <code>false</code> as 0.'],
        ['case 0x9D: sta(addr_abx()); cost = 5; break;', 'A store: always 5.'],
      ] },

      { t: 'h', text: 'Pointers in the zero page' },
      { t: 'p', html: 'The two indirect modes are the 6502\'s version of the pointers from lesson 7. A 16-bit address is stored as two bytes in the zero page, low byte first, and the instruction follows it:' },
      { t: 'list', items: [
        '<code>LDA ($20),Y</code>, called <em>indirect indexed</em>: read the pointer at <code>$20</code>/<code>$21</code>, then add Y. This is how games walk through a table: the pointer says where the table starts, Y is the index. Like the other indexed reads, it costs one more cycle when adding Y crosses a page.',
        '<code>LDA ($20,X)</code>, called <em>indexed indirect</em>: add X to <code>$20</code> first (wrapping in the zero page), then read the pointer there. Useful for a list of pointers. Rarely used, but tested.',
      ] },
      { t: 'p', html: 'In both, the pointer\'s second byte also wraps inside the zero page: a pointer stored at <code>$FF</code> takes its high byte from <code>$00</code>.' },

      { t: 'h', text: 'A famous bug' },
      { t: 'p', html: '<code>JMP ($nnnn)</code> reads a 2-byte address from memory and jumps there. But the original 6502 has a bug: if the pointer sits at the very end of a page, say <code>$02FF</code>, it reads the low byte from <code>$02FF</code> and the high byte from <code>$0200</code>, not <code>$0300</code>. It never carries into the high byte of the pointer. Games were written for the real chip, so your emulator must have the bug too.' },

      { t: 'h', text: 'Branches' },
      { t: 'p', html: 'A branch jumps only if a flag is set or clear. Its operand is one signed byte, the distance from the end of the branch instruction (lesson 10\'s <code>branch_target</code>). There are eight, one for each value of four flags:' },
      { t: 'table', head: ['Opcode', 'Instruction', 'Jumps if'], rows: [
        ['<code>10</code> / <code>30</code>', 'BPL / BMI', 'N is clear / set (plus / minus)'],
        ['<code>50</code> / <code>70</code>', 'BVC / BVS', 'V is clear / set'],
        ['<code>90</code> / <code>B0</code>', 'BCC / BCS', 'C is clear / set'],
        ['<code>D0</code> / <code>F0</code>', 'BNE / BEQ', 'Z is clear / set (not equal / equal)'],
      ] },
      { t: 'p', html: 'A branch takes 2 cycles if it does not jump, 3 if it jumps, and 4 if it jumps into a different page than the next instruction would have been in.' },
      { t: 'code', title: 'a loop in 6502', lines: [
        ['C000  A2 05     LDX #$05', 'X = 5'],
        ['C002  CA        DEX', 'The loop starts here.'],
        ['C003  D0 FD     BNE $C002', '<code>$FD</code> is -3. The next instruction is at <code>$C005</code>, and <code>$C005 - 3</code> is <code>$C002</code>. So: while X is not zero, go back.'],
      ] },

      { t: 'h', text: 'Loads, stores and jumps: every opcode' },
      { t: 'figure', html: C.opcodeTable(['LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY', 'JMP']), caption: 'Each cell shows the opcode and its cycles. A <code>+</code> means one more cycle when the index crosses a page.' },

      { t: 'quiz', q: 'X is <code>$03</code>. Which address does <code>LDA $FE,X</code> read?', options: ['<code>$0101</code>', '<code>$0001</code>', '<code>$00FE</code>'], answer: 1, explain: 'Zero page indexing wraps inside the zero page: <code>($FE + 3) &amp; $FF</code> is <code>$01</code>.' },
      { t: 'quiz', q: 'Y is <code>$10</code>. How many cycles does <code>LDA $20F8,Y</code> take?', options: ['4', '5', '6'], answer: 1, explain: '<code>$20F8 + $10</code> is <code>$2108</code>: the high byte changed, so the read takes one extra cycle.' },
      { t: 'quiz', q: 'The bytes at <code>$C1FF</code>, <code>$C100</code> and <code>$C200</code> are <code>$34</code>, <code>$12</code> and <code>$56</code>. Where does <code>JMP ($C1FF)</code> go?', options: ['<code>$5634</code>', '<code>$1234</code>', '<code>$3412</code>'], answer: 1, explain: 'The low byte comes from <code>$C1FF</code> and, because of the bug, the high byte from <code>$C100</code>.' },
    ],

    exercises: [
      C.exercise({
        id: 'nes-cpu-modes-1',
        stage: 4,
        title: 'The zero page',
        prompt: `<p>Write the first addressing modes and the load and store operations:</p>
<pre>std::uint16_t Cpu::addr_imm()   // return pc++
std::uint16_t Cpu::addr_zp()    // one byte: the address itself
std::uint16_t Cpu::addr_zpx()   // that byte + x, kept in the zero page
std::uint16_t Cpu::addr_zpy()   // that byte + y, kept in the zero page

void Cpu::lda(std::uint16_t addr)  // and ldx, ldy: read, set Z and N
void Cpu::sta(std::uint16_t addr)  // and stx, sty: write, no flags</pre>
<p>Replace your three immediate loads with <code>lda(addr_imm())</code> and so on, then add these opcodes:</p>
${C.opcodeTable(['LDA', 'LDX', 'LDY', 'STA', 'STX', 'STY'], ['imm', 'zp', 'zpx', 'zpy'])}
<p>The other modes come in the next exercises.</p>`,
        hints: [
          'Each mode is one line. <code>addr_zpx</code>: <code>return static_cast&lt;std::uint8_t&gt;(fetch() + x);</code>',
          'Each opcode is one line too: <code>case 0xB5: lda(addr_zpx()); cost = 4; break;</code> and <code>case 0x96: stx(addr_zpy()); cost = 4; break;</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-modes-2',
        stage: 5,
        title: 'Absolute and indexed',
        prompt: `<p>Add full 16-bit addresses:</p>
<pre>std::uint16_t Cpu::addr_abs()   // fetch16
std::uint16_t Cpu::addr_abx()   // fetch16 + x, sets page_crossed_
std::uint16_t Cpu::addr_aby()   // fetch16 + y, sets page_crossed_</pre>
<p>Set <code>page_crossed_ = false;</code> at the start of <code>Cpu::step</code>. Then add every absolute and absolute-indexed load and store from the table in the lesson: reads with a <code>+</code> take <code>4 + page_crossed_</code> cycles; <code>STA $nnnn,X</code> and <code>STA $nnnn,Y</code> always take 5.</p>
<p>Finally, change <code>JMP</code> (<code>4C</code>) to use <code>addr_abs</code>: <code>pc = addr_abs();</code></p>`,
        hints: [
          '<code>page_crossed_ = (base &amp; 0xFF00) != (addr &amp; 0xFF00);</code> compares the high bytes before and after adding the index.',
          'There are 12 new opcodes: <code>AD BD B9</code> (LDA), <code>AE BE</code> (LDX), <code>AC BC</code> (LDY), <code>8D 9D 99</code> (STA), <code>8E</code> (STX), <code>8C</code> (STY).',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-modes-3',
        stage: 6,
        title: 'Pointers',
        prompt: `<p>Add the indirect modes:</p>
<pre>// A pointer stored in the zero page; its high byte comes from zp + 1, kept in the zero page
std::uint16_t Cpu::read_zp_pointer(std::uint8_t zp)
std::uint16_t Cpu::addr_izx()      // ($nn,X): add x first, then read the pointer
std::uint16_t Cpu::addr_izy()      // ($nn),Y: read the pointer, then add y; sets page_crossed_
std::uint16_t Cpu::addr_ind_jmp()  // JMP ($nnnn), with the page bug</pre>
<p>And these opcodes: <code>LDA ($nn,X)</code> <code>A1</code> 6 cycles, <code>LDA ($nn),Y</code> <code>B1</code> 5 + page_crossed_, <code>STA ($nn,X)</code> <code>81</code> 6, <code>STA ($nn),Y</code> <code>91</code> 6, and <code>JMP ($nnnn)</code> <code>6C</code> 5.</p>
<p>For the JMP bug: the high byte is read from <code>(ptr &amp; 0xFF00) | ((ptr + 1) &amp; 0x00FF)</code>.</p>`,
        hints: [
          '<code>read_zp_pointer</code>: <code>std::uint16_t lo = bus_.read(zp); std::uint16_t hi = bus_.read(static_cast&lt;std::uint8_t&gt;(zp + 1)); return static_cast&lt;std::uint16_t&gt;(hi &lt;&lt; 8 | lo);</code>',
          '<code>addr_izy</code> is like <code>addr_aby</code>, but the base comes from <code>read_zp_pointer(fetch())</code> instead of <code>fetch16()</code>.',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-modes-4',
        stage: 7,
        title: 'Branches',
        prompt: `<p>Write one helper for all eight branches:</p>
<pre>// Fetches the signed offset. If condition is false, returns 2.
// Otherwise moves pc and returns 3, or 4 if the target is in another page
// than the address of the next instruction.
int Cpu::branch(bool condition)</pre>
<p>Then each branch is one line: <code>case 0xD0: cost = branch(!get_flag(kFlagZ)); break;</code> (BNE). The eight opcodes are in the table in the lesson: <code>10 30 50 70 90 B0 D0 F0</code>.</p>`,
        hints: [
          'Fetch first, even when the branch is not taken: <code>auto offset = static_cast&lt;std::int8_t&gt;(fetch());</code> After the fetch, <code>pc</code> is already the address of the next instruction.',
          '<code>auto target = static_cast&lt;std::uint16_t&gt;(pc + offset);</code> Compare <code>pc &amp; 0xFF00</code> with <code>target &amp; 0xFF00</code> to choose 3 or 4, then set <code>pc = target;</code>',
        ],
      }),
    ],
  });
})();
