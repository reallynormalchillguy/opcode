(function () {
  const C = window.CpuLesson;

  Course.add({
    id: 'nes-cpu-bus',
    part: 'nes',
    title: 'The 6502: registers and the bus',
    summary: 'What is inside the CPU, how it runs a program one byte at a time, and the first instructions of your own 6502.',
    blocks: [
      { t: 'p', html: 'The 6502 was designed in 1975 to be cheap, and it shows: it has very few parts. That makes it a perfect first processor to build. Over this lesson and the next two you will write all of it, in one file, <code>cpu.c</code>, and by the end it will run the same test program that real emulator authors use to prove their CPU is right.' },

      { t: 'h', text: 'Six registers' },
      { t: 'p', html: 'A <em>register</em> is a variable that lives inside the processor. The 6502 has six, and your <code>Cpu</code> struct in <code>cpu.h</code> has one field for each:' },
      { t: 'table', head: ['Register', 'Size', 'What it is for'], rows: [
        ['<code>A</code>, the accumulator', '8 bits', 'Where arithmetic and logic happen. Most data passes through it.'],
        ['<code>X</code> and <code>Y</code>', '8 bits', 'Index registers: counters, and offsets added to addresses (like <code>i</code> in <code>a[i]</code>).'],
        ['<code>SP</code>, the stack pointer', '8 bits', 'Where the next byte goes on the stack, which lives at <code>$0100</code>-<code>$01FF</code>.'],
        ['<code>PC</code>, the program counter', '16 bits', 'The address of the next instruction to run.'],
        ['<code>P</code>, the status register', '8 bits', 'Eight one-bit flags describing the last result. You met them in lesson 10.'],
      ] },
      { t: 'p', html: 'That is all the state a 6502 has. Everything else, including every variable a game uses, lives in the 2 KB of RAM on the other side of the bus.' },

      { t: 'h', text: 'The flags' },
      { t: 'table', head: ['Bit', 'Flag', 'Meaning'], rows: [
        ['7', '<code>N</code>, negative', 'Bit 7 of the last result. In signed terms: the result was negative.'],
        ['6', '<code>V</code>, overflow', 'A signed addition or subtraction gave a result that does not fit in -128 to 127.'],
        ['5', 'unused', 'Has no meaning. Reads as 1.'],
        ['4', '<code>B</code>, break', 'Not really in the register at all: it only appears in copies of <code>P</code> pushed to the stack.'],
        ['3', '<code>D</code>, decimal', 'Switches arithmetic to decimal mode on other 6502s. The NES chip has that circuit removed, so the flag can be set but does nothing.'],
        ['2', '<code>I</code>, interrupt disable', 'When set, the CPU ignores ordinary interrupt requests (IRQ). It never blocks the NMI.'],
        ['1', '<code>Z</code>, zero', 'The last result was zero.'],
        ['0', '<code>C</code>, carry', 'The carry out of an addition, a comparison result, or the bit shifted out of a shift.'],
      ] },
      { t: 'p', html: 'Most instructions that produce a value set <code>Z</code> and <code>N</code> from it. You will write that as a one-line helper and call it everywhere.' },

      { t: 'h', text: 'Fetch, decode, execute' },
      { t: 'p', html: 'A program is just bytes in memory. Each instruction starts with an <em>opcode</em> byte that says what to do and how many more bytes, its <em>operands</em>, follow. The CPU repeats three steps forever:' },
      { t: 'list', items: [
        '<strong>Fetch</strong>: read the byte at <code>PC</code> and move <code>PC</code> forward.',
        '<strong>Decode</strong>: work out which instruction that opcode is.',
        '<strong>Execute</strong>: fetch any operand bytes, do the work, and update registers, flags and memory.',
      ] },
      { t: 'p', html: 'Here is a tiny program, as bytes, with what each instruction does:' },
      { t: 'table', head: ['Bytes', 'Written as', 'Does'], rows: [
        ['<code>A9 05</code>', '<code>LDA #$05</code>', 'Load the number 5 into A. The <code>#</code> means "this very value" (an <em>immediate</em> operand).'],
        ['<code>AA</code>', '<code>TAX</code>', 'Copy A into X. No operand: one byte.'],
        ['<code>E8</code>', '<code>INX</code>', 'Add 1 to X.'],
        ['<code>4C 00 C0</code>', '<code>JMP $C000</code>', 'Continue at <code>$C000</code>. The address is two bytes, low byte first.'],
      ] },
      { t: 'p', html: 'In C, decoding is a <code>switch</code> on the opcode, exactly like your opcode decoder in lesson 3. The skeleton of the whole CPU is this:' },
      { t: 'code', title: 'cpu.c (the shape)', lines: [
        ['static uint8_t fetch(Cpu *cpu) {', '<code>static</code>: only <code>cpu.c</code> needs this helper (lesson 11).'],
        ['    return bus_read(cpu->pc++);', 'Read the byte at PC through the bus, then move PC on. <code>pc++</code> uses the old value, then adds one.'],
        ['}'],
        [''],
        ['int cpu_step(Cpu *cpu) {'],
        ['    uint8_t opcode = fetch(cpu);'],
        ['    int cycles = 2;'],
        ['    switch (opcode) {'],
        ['    case 0xEA:              // NOP', 'One <code>case</code> per opcode. NOP does nothing, which still takes 2 cycles.'],
        ['        cycles = 2;'],
        ['        break;'],
        ['    case 0xE8:              // INX'],
        ['        cpu->x++;', '<code>x</code> is a <code>uint8_t</code>, so 255 + 1 wraps to 0, just like the real register.'],
        ['        set_zn(cpu, cpu->x);', 'Update Z and N from the new value.'],
        ['        cycles = 2;'],
        ['        break;'],
        ['    }'],
        ['    cpu->cycles += cycles;', 'Keep the running total. The PPU will use it to stay in step.'],
        ['    return cycles;'],
        ['}'],
      ] },

      { t: 'h', text: 'Cycles' },
      { t: 'p', html: 'Every instruction takes a fixed number of CPU cycles, from 2 to 7, and sometimes one or two more in special cases you will meet in the next lesson. The tables in these lessons give the count for every opcode. Getting cycles exactly right matters: the picture chip runs 3 dots per cycle, and games rely on that timing.' },

      { t: 'h', text: 'Power on' },
      { t: 'p', html: 'After a reset, the registers start like this. These are the values the test log you will compare against expects:' },
      { t: 'table', head: ['Register', 'Value', 'Why'], rows: [
        ['<code>A</code>, <code>X</code>, <code>Y</code>', '<code>$00</code>', 'A clean start.'],
        ['<code>SP</code>', '<code>$FD</code>', 'The reset sequence moves the stack pointer down three times from <code>$00</code>, without writing anything.'],
        ['<code>P</code>', '<code>$24</code>', 'Interrupt disable on, plus bit 5, which always reads as 1.'],
        ['<code>PC</code>', 'the reset vector', 'Read from <code>$FFFC</code> and <code>$FFFD</code>, with your <code>bus_read16</code>.'],
        ['cycles', '7', 'The reset sequence itself takes 7 cycles.'],
      ] },

      { t: 'h', text: 'Your test bench' },
      { t: 'p', html: 'For the next exercises, <code>main.c</code> is a test bench. You type a program as hex bytes into Program input, it puts them in a test cartridge at <code>$C000</code>, resets your CPU and runs it, printing one line per instruction <em>before</em> running it:' },
      { t: 'code', title: 'Program input → console', lines: [
        ['A9 05 AA E8'],
        [''],
        ['C000  A9 05     LDA #$05    A:00 X:00 Y:00 P:24 SP:FD CYC:7', 'Address, the instruction\'s bytes, the instruction in readable form, then the registers and the cycle count before it runs.'],
        ['C002  AA        TAX         A:05 X:00 Y:00 P:24 SP:FD CYC:9', 'LDA took 2 cycles: CYC went from 7 to 9, and A is now 5.'],
        ['C003  E8        INX         A:05 X:05 Y:00 P:24 SP:FD CYC:11'],
        ['End   (BRK) A:05 X:06 Y:00 P:24 SP:FD CYC:13', 'It stops at the first <code>00</code> byte, BRK, which is what empty cartridge space contains.'],
      ] },
      { t: 'p', html: 'This is the same layout as the nestest log, so the habit of reading it will pay off in lesson 15. The other files with a padlock (<code>cpu.h</code>, <code>trace.c</code>) belong to the course: <code>trace.c</code> is a disassembler that turns bytes back into readable instructions for these lines.' },

      { t: 'h', text: 'The stack' },
      { t: 'p', html: 'The stack is page 1 of memory, <code>$0100</code> to <code>$01FF</code>, used as a pile of bytes. <code>SP</code> holds the low byte of the next free slot. Pushing writes at <code>$0100 + SP</code> and then decreases <code>SP</code>; pulling increases <code>SP</code> first and then reads. So the stack grows <em>down</em>, from <code>$01FF</code> towards <code>$0100</code>.' },
      { t: 'p', html: 'Games use it to save registers (<code>PHA</code> pushes A, <code>PLA</code> pulls it back) and the CPU uses it for return addresses when calling subroutines, which you will add in lesson 15.' },
      { t: 'note', kind: 'warn', html: '<code>PHP</code> pushes a copy of <code>P</code> with bits 4 (B) and 5 set. <code>PLP</code> pulls into <code>P</code> but ignores bit 4 and keeps bit 5 set. It is an odd rule, and the test log checks it.' },

      { t: 'quiz', q: 'SP is <code>$FD</code>. The program runs <code>PHA</code>. Where does A go, and what is SP afterwards?', options: ['<code>$01FD</code>, then SP is <code>$FC</code>', '<code>$01FC</code>, then SP is <code>$FC</code>', '<code>$00FD</code>, then SP is <code>$FE</code>'], answer: 0, explain: 'Push writes at <code>$0100 + SP</code> first, then decreases SP.' },
      { t: 'quiz', q: 'Which of these does <em>not</em> change the Z and N flags?', options: ['<code>LDA #$00</code>', '<code>INX</code>', '<code>SEC</code>'], answer: 2, explain: 'Loads, transfers and increments set Z and N from their result. Flag instructions like SEC only touch their own flag.' },
    ],

    exercises: [
      C.exercise({
        id: 'nes-cpu-bus-1',
        stage: 1,
        title: 'Power on',
        prompt: `<p>Start <code>cpu.c</code>, the heart of the emulator. Write:</p>
<ul>
<li><code>static uint8_t fetch(Cpu *cpu)</code>: returns the byte at <code>pc</code> (through <code>bus_read</code>) and adds 1 to <code>pc</code>.</li>
<li><code>static uint16_t fetch16(Cpu *cpu)</code>: two fetches, low byte first.</li>
<li><code>cpu_reset</code>: A, X and Y to 0, SP to <code>$FD</code>, P to <code>FLAG_I | FLAG_U</code> (<code>$24</code>), PC from the reset vector with <code>bus_read16(0xFFFC)</code>, and <code>cycles</code> to 7.</li>
<li><code>cpu_step</code>: fetch the opcode, then a <code>switch</code> with two instructions. Any other opcode counts as 2 cycles and does nothing. Add the cycles to <code>cpu-&gt;cycles</code> and return them.</li>
</ul>
<table><tr><th>Bytes</th><th>Instruction</th><th>Cycles</th><th>Does</th></tr>
<tr><td><code>EA</code></td><td>NOP</td><td>2</td><td>nothing</td></tr>
<tr><td><code>4C lo hi</code></td><td>JMP $hilo</td><td>3</td><td>PC becomes the two operand bytes, low byte first</td></tr></table>`,
        hints: [
          '<code>cpu_reset</code> is six assignments. For PC: <code>cpu-&gt;pc = bus_read16(0xFFFC);</code>',
          'In <code>cpu_step</code>: <code>uint8_t opcode = fetch(cpu); int cycles = 2; switch (opcode) { case 0xEA: cycles = 2; break; case 0x4C: cpu-&gt;pc = fetch16(cpu); cycles = 3; break; } cpu-&gt;cycles += cycles; return cycles;</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-bus-2',
        stage: 2,
        title: 'Registers and flags',
        prompt: `<p>Add three flag helpers to <code>cpu.c</code> (you wrote the first two in lesson 10):</p>
<pre>static void set_flag(Cpu *cpu, uint8_t flag, int on)
static int get_flag(const Cpu *cpu, uint8_t flag)
static void set_zn(Cpu *cpu, uint8_t value)  // Z if value is 0, N if bit 7 is set</pre>
<p>Then these instructions. All are 2 cycles.</p>
<ul>
<li><strong>Immediate loads</strong> <code>LDA #</code> (<code>A9</code>), <code>LDX #</code> (<code>A2</code>), <code>LDY #</code> (<code>A0</code>): the operand is the next byte. Set Z and N.</li>
<li><strong>Transfers</strong> <code>TAX</code> (<code>AA</code>), <code>TAY</code> (<code>A8</code>), <code>TXA</code> (<code>8A</code>), <code>TYA</code> (<code>98</code>): copy one register to another. Set Z and N from the copied value.</li>
<li><strong>Increments</strong> <code>INX</code> (<code>E8</code>), <code>INY</code> (<code>C8</code>), <code>DEX</code> (<code>CA</code>), <code>DEY</code> (<code>88</code>). Set Z and N.</li>
<li><strong>Flags</strong>: <code>CLC</code> <code>18</code> and <code>SEC</code> <code>38</code> clear and set C; <code>CLI</code> <code>58</code> and <code>SEI</code> <code>78</code> for I; <code>CLD</code> <code>D8</code> and <code>SED</code> <code>F8</code> for D; <code>CLV</code> <code>B8</code> clears V. These change only their own flag.</li>
</ul>`,
        hints: [
          '<code>set_zn</code>: <code>set_flag(cpu, FLAG_Z, value == 0); set_flag(cpu, FLAG_N, value &amp; 0x80);</code>',
          'Each instruction is one line, for example <code>case 0xA9: cpu-&gt;a = fetch(cpu); set_zn(cpu, cpu-&gt;a); cycles = 2; break;</code> and <code>case 0x38: set_flag(cpu, FLAG_C, 1); cycles = 2; break;</code>',
        ],
      }),
      C.exercise({
        id: 'nes-cpu-bus-3',
        stage: 3,
        title: 'The stack',
        prompt: `<p>Add the stack. First two helpers:</p>
<pre>static void push(Cpu *cpu, uint8_t value)  // write at 0x0100 | sp, then sp--
static uint8_t pull(Cpu *cpu)               // sp++, then read 0x0100 | sp</pre>
<p>Then six instructions:</p>
<table><tr><th>Opcode</th><th>Instruction</th><th>Cycles</th><th>Does</th></tr>
<tr><td><code>48</code></td><td>PHA</td><td>3</td><td>push A</td></tr>
<tr><td><code>08</code></td><td>PHP</td><td>3</td><td>push P with bits 4 and 5 set: <code>cpu-&gt;p | FLAG_B | FLAG_U</code></td></tr>
<tr><td><code>68</code></td><td>PLA</td><td>4</td><td>pull into A, set Z and N</td></tr>
<tr><td><code>28</code></td><td>PLP</td><td>4</td><td>pull into P, but clear B and set bit 5</td></tr>
<tr><td><code>BA</code></td><td>TSX</td><td>2</td><td>copy SP to X, set Z and N</td></tr>
<tr><td><code>9A</code></td><td>TXS</td><td>2</td><td>copy X to SP, no flags</td></tr></table>`,
        hints: [
          '<code>push</code>: <code>bus_write(0x0100 | cpu-&gt;sp, value); cpu-&gt;sp--;</code> and <code>pull</code> is the reverse order: <code>cpu-&gt;sp++; return bus_read(0x0100 | cpu-&gt;sp);</code>',
          'PLP: <code>cpu-&gt;p = (pull(cpu) &amp; (uint8_t)~FLAG_B) | FLAG_U;</code>',
        ],
      }),
    ],
  });
})();
