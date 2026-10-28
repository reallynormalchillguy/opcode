(function () {
  const C = window.CpuLesson;

  Course.add({
    id: 'nes-cpu-ops',
    part: 'nes',
    title: 'Every instruction, checked by nestest',
    summary: 'Logic, comparisons, addition with carry and overflow, shifts, subroutines and interrupts; then the test that every NES emulator has to pass.',
    blocks: [
      { t: 'p', html: 'With the addressing modes written, every remaining instruction is an operation that takes an address, plus one line per opcode. This lesson goes through what each operation does, with the details that are easy to get wrong. At the end, your CPU runs <em>nestest</em>: about five thousand instructions compared, one by one, with a log taken from a real NES.' },

      { t: 'h', text: 'Logic' },
      { t: 'p', html: '<code>AND</code>, <code>ORA</code> and <code>EOR</code> combine A with the operand bit by bit (<code>&amp;</code>, <code>|</code> and <code>^</code> in C++), store the result in A, and set Z and N. <code>BIT</code> is the odd one: it does not change A at all. It sets Z if <code>A &amp; M</code> is zero, and copies bit 7 of the operand into N and bit 6 into V. Games use it to test a hardware register\'s top bits in a single instruction.' },

      { t: 'h', text: 'Comparisons' },
      { t: 'p', html: '<code>CMP</code>, <code>CPX</code> and <code>CPY</code> work out the register minus the operand and throw the result away, keeping only flags. They are always followed by a branch:' },
      { t: 'table', head: ['After comparing R with M', 'C', 'Z', 'N'], rows: [
        ['R &gt; M', '1', '0', 'bit 7 of R - M'],
        ['R = M', '1', '1', '0'],
        ['R &lt; M', '0', '0', 'bit 7 of R - M'],
      ] },
      { t: 'p', html: 'So <code>BCS</code> after a compare means "greater or equal", <code>BEQ</code> means "equal" and <code>BCC</code> means "less than". One function can serve all three: <code>compare(x, addr)</code>.' },

      { t: 'h', text: 'Addition, carry and overflow' },
      { t: 'p', html: '<code>ADC</code> means add with carry: <code>A + M + C</code>. The carry flag is the ninth bit: it lets a program add 16-bit numbers one byte at a time, with the carry from the low bytes feeding into the high bytes. After the addition:' },
      { t: 'list', items: [
        '<strong>C</strong> is set if the sum was more than 255 (compute in an <code>unsigned</code>, which is wider than 8 bits, and look).',
        '<strong>V</strong> is set if the result is wrong <em>as a signed number</em>: two positives gave a negative, or two negatives gave a positive. For example <code>$50 + $50</code> is 80 + 80 = 160, which does not fit in -128 to 127, so the result <code>$A0</code> reads as -96.',
        '<strong>Z</strong> and <strong>N</strong> from the 8-bit result, as usual.',
      ] },
      { t: 'code', title: 'cpu.cpp', lines: [
        ['void Cpu::add(std::uint8_t m) {'],
        ['    unsigned sum = a + m + (get_flag(kFlagC) ? 1 : 0);', 'Up to 255 + 255 + 1 = 511, which fits easily in an <code>unsigned</code>.'],
        ['    auto result = static_cast<std::uint8_t>(sum);'],
        ['    set_flag(kFlagC, sum > 0xFF);'],
        ['    set_flag(kFlagV, (~(a ^ m) & (a ^ result)) & 0x80);', 'Read it as: A and M had the <em>same</em> sign bit (<code>~(a ^ m)</code>), and the result\'s sign is <em>different</em> from A\'s (<code>a ^ result</code>). Both conditions are true only in bit 7 when overflow happened.'],
        ['    a = result;'],
        ['    set_zn(a);'],
        ['}'],
      ] },
      { t: 'p', html: '<code>SBC</code> subtracts with borrow: <code>A - M - (1 - C)</code>. Note the carry works backwards here: C set means "no borrow". The trick every emulator uses is that this equals <code>A + (~M) + C</code>, so <code>SBC</code> is <code>add(~M)</code> and all the flags come out right for free.' },
      { t: 'note', html: 'The decimal flag would make ADC and SBC work in decimal on other 6502s. The NES\'s chip has that circuit removed, so your emulator ignores D completely, apart from storing it.' },

      { t: 'h', text: 'Shifts and rotates' },
      { t: 'table', head: ['Instruction', 'Does', 'Carry gets'], rows: [
        ['<code>ASL</code>', 'shift left, 0 comes in at bit 0', 'the old bit 7'],
        ['<code>LSR</code>', 'shift right, 0 comes in at bit 7', 'the old bit 0'],
        ['<code>ROL</code>', 'shift left, the old carry comes in at bit 0', 'the old bit 7'],
        ['<code>ROR</code>', 'shift right, the old carry comes in at bit 7', 'the old bit 0'],
      ] },
      { t: 'p', html: 'All four set Z and N from the result. They work on A (accumulator mode, <code>ASL A</code>) or directly on memory. On memory they are <em>read-modify-write</em> instructions, like <code>INC</code> and <code>DEC</code>: read the byte, change it, write it back. A neat way to share the code is to write each operation as "value in, value out", and one helper to apply it to memory:' },
      { t: 'code', title: 'cpu.cpp', lines: [
        ['std::uint8_t Cpu::asl(std::uint8_t v) {', 'Value in, value out. Works for A and for memory alike.'],
        ['    set_flag(kFlagC, v & 0x80);'],
        ['    v = static_cast<std::uint8_t>(v << 1);'],
        ['    set_zn(v);'],
        ['    return v;'],
        ['}'],
        [''],
        ['void Cpu::modify(std::uint16_t addr, Change change) {', '<code>Change</code> is defined in <code>cpu.h</code>: <code>using Change = std::uint8_t (Cpu::*)(std::uint8_t);</code>. It is a <em>pointer to a member function</em>: it can point at <code>asl</code>, <code>rol</code>, <code>inc</code>… any member of <code>Cpu</code> that takes a byte and returns a byte.'],
        ['    bus_.write(addr, (this->*change)(bus_.read(addr)));', '<code>this</code> is a pointer to the object the member function was called on: this CPU. <code>(this-&gt;*change)(v)</code> calls the member function <code>change</code> points at, on this CPU, with <code>v</code>. The syntax is unusual; this is the only place you need it.'],
        ['}'],
        [''],
        ['case 0x0A: a = asl(a); cost = 2; break;', '<code>ASL A</code>'],
        ['case 0x06: modify(addr_zp(), &Cpu::asl); cost = 5; break;', '<code>ASL $nn</code>. <code>&amp;Cpu::asl</code> is the address of the member function, the value <code>modify</code> receives.'],
      ] },

      { t: 'h', text: 'Subroutines' },
      { t: 'p', html: '<code>JSR $nnnn</code> calls a subroutine: it pushes a return address on the stack, high byte first, and jumps. <code>RTS</code> pulls it back and returns. The detail that matters: <code>JSR</code> pushes the address of its own <em>last byte</em> (the next instruction\'s address minus one), and <code>RTS</code> adds one after pulling. The test log checks the exact bytes on the stack.' },

      { t: 'h', text: 'Interrupts' },
      { t: 'p', html: 'An interrupt is a subroutine call that the hardware makes. On the NES, the PPU raises the NMI at the start of every vertical blank. The CPU then pushes PC (high byte first) and P, sets the I flag, and jumps to the address in the NMI vector at <code>$FFFA</code>. This takes 7 cycles. The handler ends with <code>RTI</code>, which pulls P (ignoring B, keeping bit 5 set, as <code>PLP</code> does) and then PC, <em>without</em> adding one.' },
      { t: 'p', html: '<code>BRK</code> is a software interrupt: the same sequence, through the vector at <code>$FFFE</code>, but it pushes P with the B flag set (so a handler can tell BRK from a hardware IRQ), and the return address skips one byte after the BRK opcode. Hardware interrupts push P with B clear.' },
      { t: 'table', head: ['Event', 'Pushes', 'Vector'], rows: [
        ['NMI', 'PC, then P with B clear', '<code>$FFFA</code>'],
        ['Reset', 'nothing', '<code>$FFFC</code>'],
        ['BRK', 'PC + 1, then P with B set', '<code>$FFFE</code>'],
        ['IRQ', 'PC, then P with B clear', '<code>$FFFE</code> (used by some mappers in a later lesson)'],
      ] },

      { t: 'h', text: 'The remaining instructions' },
      { t: 'figure', html: C.opcodeTable(['AND', 'ORA', 'EOR', 'BIT', 'CMP', 'CPX', 'CPY', 'ADC', 'SBC', 'ASL', 'LSR', 'ROL', 'ROR', 'INC', 'DEC', 'JSR', 'RTS', 'RTI', 'BRK']), caption: 'Opcode and cycles for each instruction and mode. A <code>+</code> means one more cycle when the index crosses a page. Read-modify-write instructions (ASL to DEC on memory) never take the extra cycle; their indexed forms always take the long time.' },

      { t: 'h', text: 'nestest' },
      { t: 'p', html: '<em>nestest</em>, written by Kevin Horton in 2004, is a cartridge that exercises every instruction with carefully chosen values and checks the flags after each one. With it comes a log from a known-correct emulator: the registers and cycle count before each of the first few thousand instructions. If your CPU produces exactly the same log, it behaves like a real 6502.' },
      { t: 'p', html: 'The last exercise\'s <code>main.cpp</code> runs nestest on your CPU and compares every line. When a line differs, it shows both versions. The instruction that went wrong is almost always the one on the line <em>before</em> the difference: look at which register or flag differs and work out what that instruction should have done.' },
      { t: 'note', kind: 'nes', html: 'After the official instructions, nestest goes on to test about a hundred <em>unofficial</em> opcodes: combinations the 6502\'s designers never documented but that happen to do something. Almost no game uses them, so the comparison here stops where they begin. Your <code>default:</code> case already treats unknown opcodes as a harmless 2-cycle NOP.' },

      { t: 'quiz', q: 'A is <code>$30</code>. After <code>CMP #$40</code>, which flags are set?', options: ['C', 'N only', 'Z and C'], answer: 1, explain: '<code>$30 &lt; $40</code>, so C is clear and Z is clear. <code>$30 - $40</code> is <code>$F0</code>, whose bit 7 is set, so N is set.' },
      { t: 'quiz', q: 'Carry is set and A is <code>$7F</code>. What does <code>ADC #$00</code> give?', options: ['<code>$7F</code>, no flags', '<code>$80</code> with N and V set', '<code>$80</code> with C set'], answer: 1, explain: '<code>$7F + 0 + 1</code> is <code>$80</code>. Two non-negative numbers produced a negative one, so V is set, and bit 7 gives N. There was no carry out.' },
      { t: 'quiz', q: 'JSR at <code>$C000</code> calls <code>$C100</code>. What 16-bit value does it push?', options: ['<code>$C000</code>', '<code>$C002</code>', '<code>$C003</code>'], answer: 1, explain: 'JSR is 3 bytes long, so the next instruction is at <code>$C003</code>. It pushes that minus one, <code>$C002</code>, and RTS adds the one back.' },
    ],

    exercises: [
      C.exercise({
        id: 'nes-cpu-ops-1',
        stage: 8,
        title: 'Logic and comparisons',
        prompt: `<p>Add the operations and all their opcodes from the table in the lesson:</p>
<pre>void Cpu::and_(std::uint16_t addr)   // the _ because "and" is a keyword in C++
void Cpu::ora(std::uint16_t addr)
void Cpu::eor(std::uint16_t addr)
void Cpu::bit(std::uint16_t addr)
void Cpu::compare(std::uint8_t reg, std::uint16_t addr)  // CMP, CPX, CPY</pre>
${C.opcodeTable(['AND', 'ORA', 'EOR', 'BIT', 'CMP', 'CPX', 'CPY'])}
<p>That is 36 opcodes. Copy-paste one block of eight and change the names; it is how every emulator author does it.</p>`,
        hints: [
          '<code>compare</code>: <code>std::uint8_t m = bus_.read(addr); set_flag(kFlagC, reg &gt;= m); set_zn(static_cast&lt;std::uint8_t&gt;(reg - m));</code>',
          '<code>bit</code>: Z from <code>(a &amp; m) == 0</code>, V from <code>m &amp; 0x40</code>, N from <code>m &amp; 0x80</code>. Then for example <code>case 0xDD: compare(a, addr_abx()); cost = 4 + page_crossed_; break;</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-ops-2',
        stage: 9,
        title: 'Add and subtract',
        prompt: `<p>Write <code>void Cpu::add(std::uint8_t m)</code> as in the lesson, then:</p>
<pre>void Cpu::adc(std::uint16_t addr)   // add(bus_.read(addr))
void Cpu::sbc(std::uint16_t addr)   // add the byte with every bit flipped</pre>
${C.opcodeTable(['ADC', 'SBC'])}`,
        hints: [
          'Compute the sum in an <code>unsigned</code> so you can see the ninth bit: <code>unsigned sum = a + m + (get_flag(kFlagC) ? 1 : 0);</code> The carry is <code>sum &gt; 0xFF</code>.',
          'Overflow: <code>(~(a ^ m) &amp; (a ^ result)) &amp; 0x80</code>, computed <em>before</em> you store the result in A. SBC: <code>add(static_cast&lt;std::uint8_t&gt;(~bus_.read(addr)));</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-ops-3',
        stage: 10,
        title: 'Shifts and memory changes',
        prompt: `<p>Write the "value in, value out" operations <code>asl</code>, <code>lsr</code>, <code>rol</code>, <code>ror</code>, <code>inc</code> and <code>dec</code>, each <code>std::uint8_t Cpu::op(std::uint8_t v)</code> and setting C (shifts and rotates only), Z and N. Then the <code>modify</code> helper from the lesson, and all the opcodes:</p>
${C.opcodeTable(['ASL', 'LSR', 'ROL', 'ROR', 'INC', 'DEC'])}
<p>The <code>A</code> column is the accumulator form: <code>a = asl(a);</code></p>`,
        hints: [
          'For the rotates, save the old carry before you change it: <code>int carry_in = get_flag(kFlagC) ? 1 : 0;</code> ROL is then <code>static_cast&lt;std::uint8_t&gt;(v &lt;&lt; 1 | carry_in)</code> and ROR is <code>static_cast&lt;std::uint8_t&gt;(v &gt;&gt; 1 | carry_in &lt;&lt; 7)</code>.',
          'Memory forms are one line each: <code>case 0xFE: modify(addr_abx(), &amp;Cpu::inc); cost = 7; break;</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-ops-4',
        stage: 11,
        title: 'Subroutines and interrupts',
        prompt: `<p>The last instructions. Add the <code>push16</code> (high byte first) and <code>pull16</code> (low byte first) helpers, then:</p>
<table><tr><th>Opcode</th><th>Instruction</th><th>Cycles</th><th>Does</th></tr>
<tr><td><code>20</code></td><td>JSR $nnnn</td><td>6</td><td>fetch the target, push <code>pc - 1</code>, jump</td></tr>
<tr><td><code>60</code></td><td>RTS</td><td>6</td><td>pull an address, jump to it plus 1</td></tr>
<tr><td><code>40</code></td><td>RTI</td><td>6</td><td>pull P (clear B, set bit 5), then pull PC</td></tr>
<tr><td><code>00</code></td><td>BRK</td><td>7</td><td>pc + 1, push PC, push P with B and bit 5 set, set I, PC from <code>$FFFE</code></td></tr></table>
<p>And the public member function:</p>
<pre>void Cpu::nmi()  // push PC, push P with B clear and bit 5 set,
                 // set I, PC from $FFFA, add 7 cycles</pre>
<p>The test bench now understands <code>nmi N</code>, which triggers an NMI just before instruction N.</p>`,
        hints: [
          '<code>push16</code>: <code>push(value &gt;&gt; 8); push(value &amp; 0xFF);</code> and <code>pull16</code> pulls the low byte first, then the high byte.',
          'JSR needs braces to declare a variable inside a <code>case</code>: <code>case 0x20: { std::uint16_t target = fetch16(); push16(static_cast&lt;std::uint16_t&gt;(pc - 1)); pc = target; cost = 6; break; }</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-ops-5',
        stage: 12,
        title: 'Pass nestest',
        prompt: `<p>Your CPU has every official instruction. Now prove it. <code>main.cpp</code> loads the nestest cartridge, starts your CPU at <code>$C000</code>, and compares it with the log of a real 6502, line by line.</p>
<p>Press Run. Leave Program input empty to compare all 5003 lines, or type a number to stop earlier. If a line differs, the console shows both versions: fix the instruction on the line before it, and run again.</p>
<p>When every line matches, nestest's own result codes at <code>$02</code> and <code>$03</code> should be <code>00</code>. That is the moment every emulator author waits for.</p>`,
        stdin: '',
        hints: [
          'Find the first register that differs. If it is P, compare the two values in binary: <code>NV-BDIZC</code>. A wrong C or V after an <code>ADC</code>, <code>SBC</code> or <code>CMP</code> is the most common mistake.',
          'If CYC differs, check the cycle count of the previous instruction against the tables, including the extra cycle for page crossings and for taken branches.',
        ],
      }),
    ],
  });
})();
