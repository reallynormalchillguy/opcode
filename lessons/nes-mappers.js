(function () {
  const N = window.NesLesson;

  Course.add({
    id: 'nes-mappers',
    part: 'nes',
    title: 'Mappers 1 to 4',
    summary: 'Bank switching: how cartridges bigger than the CPU\'s 32 KB window work, the four most common mapper chips, and the IRQ that MMC3 games use to split the screen.',
    blocks: [
      { t: 'p', html: 'The CPU sees 32 KB of cartridge, <code>$8000</code>-<code>$FFFF</code>, and the PPU 8 KB of tiles. Super Mario Bros. fits in that. Most later games do not: The Legend of Zelda has 128 KB of program, Super Mario Bros. 3 has 384 KB in all. They work by <em>bank switching</em>: a chip on the cartridge, the <em>mapper</em>, decides which part of the ROM appears in each window of the CPU\'s and the PPU\'s view, and the game tells it to change while it runs.' },
      { t: 'p', html: 'There is no wire for "change bank". The CPU only has its bus, so the mapper listens to writes to <code>$8000</code>-<code>$FFFF</code>. Those addresses are ROM, so writing there does nothing to the ROM; the mapper takes the byte as a command. Each mapper chip has its own commands, and the iNES header\'s mapper number says which chip the cartridge had. Hundreds of numbers exist, but mappers 0 to 4 cover most of the games people know.' },

      { t: 'h', text: 'Windows and banks' },
      { t: 'p', html: 'The tidy way to emulate any mapper is to split each view into windows and keep, for each window, where it starts in the ROM. Reads just follow the table; the mapper\'s only job is to fill it in when the game writes a command.' },
      { t: 'code', title: 'cart.c, the windows', lines: [
        ['static long prg_map[4];', 'Four 8 KB windows: <code>8000</code>, <code>A000</code>, <code>C000</code>, <code>E000</code>. Each holds an offset into <code>prg</code>.'],
        ['static long chr_map[8];', 'Eight 1 KB windows for the PPU\'s <code>0000</code>-<code>1FFF</code>, offsets into <code>chr</code>.'],
        ['', ''],
        ['return prg[prg_map[(addr - 0x8000) >> 13] + (addr & 0x1FFF)];', 'A CPU read: bits 13-14 of the offset pick the window, the low 13 bits the byte in it.'],
        ['return chr[chr_map[addr >> 10] + (addr & 0x03FF)];', 'A PPU read: bits 10-12 pick the window.'],
      ] },
      { t: 'p', html: 'Mappers count banks in their own sizes (16 KB, 8 KB, 4 KB, 2 KB, 1 KB), so two helpers do the arithmetic: <code>map_prg(w, n)</code> points 8 KB window <code>w</code> at 8 KB bank <code>n</code>, and <code>map_chr(w, n)</code> points 1 KB window <code>w</code> at 1 KB bank <code>n</code>. A 16 KB bank <code>b</code> is the 8 KB banks <code>2b</code> and <code>2b + 1</code>. Bank numbers past the end of the ROM wrap around (<code>n % count</code>), as they do on real boards, and a negative <code>n</code> counts from the end, because many mappers keep "the last bank" fixed.' },

      { t: 'h', text: 'UxROM and CNROM: one register each' },
      { t: 'table', head: ['Mapper', 'Write to 8000-FFFF', 'Fixed'], rows: [
        ['2, UxROM (Mega Man, Castlevania, Contra)', 'Which 16 KB bank appears at <code>$8000</code>.', 'The last 16 KB at <code>$C000</code>, where the reset vector and the code that switches live. CHR is 8 KB of RAM: the game copies its tiles in.'],
        ['3, CNROM', 'Which 8 KB of CHR the PPU sees.', 'The program: 16 or 32 KB, as in mapper 0.'],
      ] },
      { t: 'note', html: 'These boards have <em>bus conflicts</em>: during the write, the ROM also puts its own byte on the data bus, and the two fight. Games avoid trouble by writing the bank number to an address whose ROM byte is that same number (a little table of 0, 1, 2 …). An emulator can ignore it.' },

      { t: 'h', text: 'MMC1: five writes for one register' },
      { t: 'p', html: 'Nintendo\'s MMC1 (The Legend of Zelda, Metroid, Mega Man 2) has four 5-bit registers but takes them one bit at a time: each write to <code>$8000</code>-<code>$FFFF</code> sends bit 0 of the byte into a shift register, and the fifth write moves the five bits into the register chosen by that write\'s address. A write with bit 7 set starts again, and also sets PRG mode 3.' },
      { t: 'code', title: 'the shift register', lines: [
        ['static uint8_t shift = 0x10;', 'Starts with a 1 in bit 4: a marker that moves down one bit per write.'],
        ['int full = shift & 1;', 'If the marker has reached bit 0, this is the fifth write.'],
        ['shift = (shift >> 1) | ((value & 1) << 4);', 'The new bit goes in at the top.'],
        ['if (full) { register = shift; shift = 0x10; }', 'Now <code>shift</code> holds the five bits, first one in bit 0.'],
      ] },
      { t: 'table', head: ['Fifth write to', 'Register', 'Bits'], rows: [
        ['<code>$8000</code>-<code>$9FFF</code>', 'Control', '0-1 mirroring: 0 one-screen (first 1 KB), 1 one-screen (second), 2 vertical, 3 horizontal. 2-3 PRG mode: 0 and 1 switch 32 KB at once (ignoring bit 0 of the bank), 2 fixes the first 16 KB at <code>$8000</code> and switches <code>$C000</code>, 3 switches <code>$8000</code> and fixes the last 16 KB at <code>$C000</code>. 4 CHR mode: 0 one 8 KB bank (bit 0 ignored), 1 two 4 KB banks.'],
        ['<code>$A000</code>-<code>$BFFF</code>', 'CHR bank 0', 'The 4 KB bank at <code>$0000</code> (or the 8 KB bank, in CHR mode 0).'],
        ['<code>$C000</code>-<code>$DFFF</code>', 'CHR bank 1', 'The 4 KB bank at <code>$1000</code> (CHR mode 1 only).'],
        ['<code>$E000</code>-<code>$FFFF</code>', 'PRG bank', 'Bits 0-3: the 16 KB bank. (Bit 4 turns PRG RAM off; ignored here.)'],
      ] },
      { t: 'p', html: 'At power-on the control register is <code>$0C</code>: PRG mode 3, so the last bank, with the reset vector, is at <code>$C000</code>. MMC1 also brings the first new mirroring: <em>one-screen</em>, where all four nametables are the same 1 KB. Your PPU\'s <code>nametable_index</code> needs two more cases.' },

      { t: 'h', text: 'MMC3: eight banks and a scanline counter' },
      { t: 'p', html: 'MMC3 (Super Mario Bros. 3, Mega Man 3 to 6, Kirby\'s Adventure) has finer banks and pairs of registers: in each 8 KB range of addresses, even addresses are one register and odd ones another.' },
      { t: 'table', head: ['Address', 'Even', 'Odd'], rows: [
        ['<code>$8000</code>-<code>$9FFF</code>', 'Bank select: bits 0-2 say which of R0-R7 the next odd write fills; bit 6 PRG mode; bit 7 CHR mode.', 'Bank data: the value for that register.'],
        ['<code>$A000</code>-<code>$BFFF</code>', 'Mirroring: 0 vertical, 1 horizontal.', 'PRG RAM protect (ignored here).'],
        ['<code>$C000</code>-<code>$DFFF</code>', 'IRQ latch: the count to start from.', 'IRQ reload: start again from the latch at the next scanline.'],
        ['<code>$E000</code>-<code>$FFFF</code>', 'IRQ off, and acknowledge the IRQ.', 'IRQ on.'],
      ] },
      { t: 'table', head: ['Window', 'Mode 0', 'Mode 1'], rows: [
        ['PRG <code>$8000</code>', 'R6', 'second-last 8 KB bank'],
        ['PRG <code>$A000</code>', 'R7', 'R7'],
        ['PRG <code>$C000</code>', 'second-last 8 KB bank', 'R6'],
        ['PRG <code>$E000</code>', 'last 8 KB bank', 'last 8 KB bank'],
        ['CHR <code>$0000</code>-<code>$0FFF</code>', 'R0 (2 KB), R1 (2 KB)', 'R2, R3, R4, R5 (1 KB each)'],
        ['CHR <code>$1000</code>-<code>$1FFF</code>', 'R2, R3, R4, R5 (1 KB each)', 'R0 (2 KB), R1 (2 KB)'],
      ] },
      { t: 'p', html: 'R0 and R1 are 2 KB banks counted in 1 KB units, so their bit 0 is ignored: R0 = 10 means 1 KB banks 10 and 11. In <code>chr_map</code> terms, CHR mode 1 just swaps the two halves: window <code>w</code> becomes <code>w ^ 4</code>.' },

      { t: 'h', text: 'IRQs' },
      { t: 'p', html: 'Sprite 0 hit gives a game one split per frame, and it has to wait in a loop for it. MMC3 can interrupt the CPU at any scanline the game picks, as often as it likes: that is how Super Mario Bros. 3 keeps its status bar at the bottom of the screen. The interrupt is the 6502\'s other one, the <em>IRQ</em>:' },
      { t: 'list', items: [
        'It goes through the vector at <code>$FFFE</code> (NMI uses <code>$FFFA</code>). Like NMI, it pushes PC and P (with B clear), sets I, and takes 7 cycles.',
        'Unlike NMI, the I flag holds it back: while I is set the CPU ignores IRQs. <code>SEI</code> and <code>CLI</code> exist for this. RTI pulls P back, and with it the old I.',
        'It is a level, not an event: the cartridge keeps the IRQ line up until the game acknowledges it (for MMC3, by writing <code>$E000</code>). If the line is still up after RTI, the CPU is interrupted again.',
      ] },
      { t: 'p', html: 'MMC3 counts scanlines by watching the PPU\'s address lines. The PPU fetches background tiles from one pattern table and sprites from the other, so once per scanline its address crosses from <code>$0xxx</code> to <code>$1xxx</code>, at about dot 260 when sprites use <code>$1000</code>, and only while rendering is on. Your PPU tells the cartridge directly: at dot 260 of each visible line and the pre-render line, when PPUMASK bit 3 or 4 is set, it calls <code>cart_scanline()</code>.' },
      { t: 'code', title: 'cart.c, one scanline', lines: [
        ['if (irq_counter == 0 || irq_reload) {', 'At 0, or after a write to <code>$C001</code>…'],
        ['    irq_counter = irq_latch; irq_reload = 0;', '…start again from the latch.'],
        ['} else {', ''],
        ['    irq_counter--;', ''],
        ['}', ''],
        ['if (irq_counter == 0 && irq_enabled) irq_line = 1;', 'Reaching 0 raises the IRQ line, if <code>$E001</code> turned it on.'],
      ] },
      { t: 'p', html: 'So a latch of N gives an IRQ every N + 1 scanlines. The course\'s <code>main.c</code> asks <code>cart_irq()</code> after every instruction and calls your <code>cpu_irq</code> while it is 1.' },
      { t: 'note', kind: 'nes', html: 'After the last exercise your emulator runs games on mappers 0 to 4, which is most of the NES library people remember. Load your own cartridges from the Cartridge menu. They are silent for now: sound is the next, and last, lesson. Beyond it, your emulator leaves out the other mappers, saving battery-backed RAM between visits (Zelda\'s save files are lost when you press Stop), and the rare four-screen boards: good next projects, now that you know how every part of the console fits together.' },

      { t: 'quiz', q: 'A UxROM game writes 5 to <code>$C000</code>. What does the CPU see at <code>$8000</code> and at <code>$C000</code>?', options: ['16 KB bank 5 at <code>$8000</code>, the last bank at <code>$C000</code>', 'Bank 5 at <code>$C000</code>', 'Bank 5 at both'], answer: 0, explain: 'Any write to <code>$8000</code>-<code>$FFFF</code> is the bank register, and it always controls <code>$8000</code>. <code>$C000</code> keeps the last bank.' },
      { t: 'quiz', q: 'An MMC1 game writes 1, 0, 1, 1, 0 (bit 0 of each byte) to <code>$E000</code>. Which PRG bank does it select?', options: ['13', '22', '11'], answer: 0, explain: 'The first bit written is bit 0: 1, then bit 1 = 0, bit 2 = 1, bit 3 = 1, bit 4 = 0. That is <code>01101</code> in binary, 13.' },
      { t: 'quiz', q: 'An MMC3 game sets the latch to 99, reloads and enables the IRQ during the vertical blank. Roughly where does the IRQ come?', options: ['On scanline 98', 'On scanline 99', 'After 99 frames'], answer: 0, explain: 'The pre-render line\'s clock loads 99, then each visible line counts down: line 0 makes it 98, and line 98 makes it 0. (The test cartridge sets 151, so its IRQ comes on line 150, and the picture moves from line 152, after the next copy at dot 257.)' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-mappers-1',
        stage: 30,
        title: 'Bank windows, UxROM and CNROM',
        rom: 'opcode-uxrom.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p>Rebuild <code>cart.c</code> around windows, as in the lesson:</p>
<ul><li>Make <code>chr_size</code> a static (like <code>prg_size</code>) and add <code>prg_map[4]</code>, <code>chr_map[8]</code>, the helpers <code>map_prg(w, n)</code> and <code>map_chr(w, n)</code> (wrapping <code>n</code> with <code>%</code>, negative from the end), and <code>update_banks()</code>, which fills both tables for the current mapper.</li>
<li>Mapper 0: <code>map_prg(i, i)</code> for the four windows (a 16 KB ROM wraps by itself) and <code>map_chr(i, i)</code>. Mapper 2: <code>$8000</code> gets 16 KB bank <code>bank</code>, <code>$C000</code> the last 16 KB. Mapper 3: PRG as mapper 0, CHR is 8 KB bank <code>bank</code>.</li>
<li>A static <code>uint8_t bank</code>: any write to <code>$8000</code>-<code>$FFFF</code> on mapper 2 or 3 stores it. After every such write, and at the end of <code>cart_load</code>, call <code>update_banks()</code> (<code>cart_load</code> also sets <code>bank</code> back to 0).</li>
<li>Reads and writes of PRG and CHR go through the tables. <code>cart_load</code> now accepts mappers 0, 2 and 3.</li></ul>
<p>Run plays <code>opcode-uxrom.nes</code>, which prints the start of each bank it switches in. Try <code>opcode-cnrom.nes</code> too, and your own UxROM games.</p>`,
        names: ['Mapper 0 through the windows', 'UxROM switches 8000, keeps the last bank', 'UxROM\'s CHR RAM and PRG RAM', 'CNROM switches all of CHR', 'Mappers 1 and 4 are not there yet'],
        hints: [
          '<code>map_prg</code>: <code>int count = prg_size / 0x2000; n %= count; if (n &lt; 0) n += count; prg_map[w] = n * 0x2000L;</code> (and the same with <code>0x400</code> for CHR). Guard against <code>count == 0</code> for a cartridge with no PRG.',
          'UxROM in 8 KB units: <code>map_prg(0, bank * 2); map_prg(1, bank * 2 + 1); map_prg(2, -2); map_prg(3, -1);</code>',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-2',
        stage: 31,
        title: 'MMC1',
        rom: 'opcode-mmc1.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p>Add mapper 1 to <code>cart.c</code>:</p>
<ul><li>Statics for the shift register (<code>0x10</code> after <code>cart_load</code>) and the four registers (control <code>0x0C</code>, the others 0).</li>
<li>Writes to <code>$8000</code>-<code>$FFFF</code> go to an <code>mmc1_write(addr, value)</code> that works as the lesson describes, including the reset with bit 7.</li>
<li>In <code>update_banks</code>, the PRG modes, the CHR modes, and the mirroring from bits 0-1 of control.</li></ul>
<p><code>cart.h</code> now has <code>MIRROR_ONE_LOW</code> and <code>MIRROR_ONE_HIGH</code>, and <code>cart_mirroring()</code> returns the mirroring as it is now. In <code>ppu.c</code>, make <code>nametable_index</code> handle all four: one-screen low uses physical table 0 for all four slots, one-screen high table 1.</p>`,
        names: ['PRG modes', 'CHR modes', 'Mirroring from the control register', 'Bit 7 starts again', 'One-screen mirroring in the PPU'],
        hints: [
          'Which register: <code>(addr &gt;&gt; 13) &amp; 3</code> is 0 for <code>8000</code>-<code>9FFF</code>, 1 for <code>A000</code>, 2 for <code>C000</code>, 3 for <code>E000</code>.',
          'Mirroring: <code>static const Mirroring M[4] = { MIRROR_ONE_LOW, MIRROR_ONE_HIGH, MIRROR_VERTICAL, MIRROR_HORIZONTAL }; mirroring = M[control &amp; 3];</code>',
          'PRG mode 0/1 in 8 KB units: <code>for (i = 0; i &lt; 4; i++) map_prg(i, (b &amp; ~1) * 2 + i);</code>',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-3',
        stage: 32,
        title: 'MMC3\'s banks',
        rom: 'opcode-mmc3.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p>Add mapper 4 to <code>cart.c</code>, without its IRQ for now:</p>
<ul><li>Statics: the bank select byte and <code>R[8]</code>, all 0 after <code>cart_load</code>.</li>
<li>Writes: <code>$8000</code> even sets bank select, odd sets <code>R[select &amp; 7]</code>; <code>$A000</code> even sets the mirroring (bit 0: 1 horizontal, 0 vertical). Ignore the other addresses for now.</li>
<li><code>update_banks</code>: the PRG and CHR layouts from the lesson's table.</li></ul>
<p>Run shows the MMC3 cartridge's banks. The bottom of its screen does not scroll yet: that needs the IRQ.</p>`,
        names: ['PRG modes and the fixed banks', 'CHR modes', 'Mirroring', 'Even and odd addresses'],
        hints: [
          'The address range is <code>addr &amp; 0xE000</code> (<code>0x8000</code>, <code>0xA000</code>, <code>0xC000</code> or <code>0xE000</code>) and even or odd is <code>addr &amp; 1</code>.',
          'CHR: <code>int inv = (select &amp; 0x80) ? 4 : 0;</code> then <code>map_chr(0 ^ inv, R[0] &amp; 0xFE); map_chr(1 ^ inv, R[0] | 1);</code> and so on, R2-R5 at windows <code>4 ^ inv</code> to <code>7 ^ inv</code>.',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-4',
        stage: 33,
        title: 'The scanline counter',
        rom: 'opcode-mmc3.nes',
        stdin: '5',
        timeoutMs: 15000,
        prompt: `<p>Give MMC3 its counter, in <code>cart.c</code>:</p>
<ul><li>Statics: <code>irq_latch</code>, <code>irq_counter</code>, <code>irq_reload</code>, <code>irq_enabled</code> and <code>irq_line</code>, all 0 after <code>cart_load</code>.</li>
<li>Writes: <code>$C000</code> even sets the latch; odd sets the counter to 0 and <code>irq_reload</code> to 1. <code>$E000</code> even turns the IRQ off and lowers <code>irq_line</code>; odd turns it on.</li>
<li><code>void cart_scanline(void)</code>: on mapper 4 only, count as in the lesson. <code>int cart_irq(void)</code> returns <code>irq_line</code>.</li></ul>
<p>In <code>ppu.c</code>'s <code>ppu_tick</code>, call <code>cart_scanline()</code> at dot 260 of lines 0-239 and 261, when PPUMASK bit 3 or 4 is set. Run prints, frame by frame, the scanline where the cartridge raised its IRQ line.</p>`,
        names: ['Counting down from the latch', 'Reload, and nothing while disabled', 'Latch 0, and other mappers', 'Clocked by the PPU', 'Only while rendering'],
        hints: [
          'Your PPU already has a block that runs only while rendering, on lines 0-239 and 261 (the one that moves <code>v</code>). Add <code>if (dot == 260) cart_scanline();</code> inside it.',
          'The order in <code>cart_scanline</code> matters: first reload or decrement, then check for 0.',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-5',
        stage: 34,
        title: 'IRQs in the CPU',
        rom: 'opcode-mmc3.nes',
        controller: true,
        timeoutMs: 20000,
        prompt: `<p>The last exercise. In <code>cpu.c</code>, write the function <code>cpu.h</code> now declares:</p>
<pre>int cpu_irq(Cpu *cpu)</pre>
<p>If the I flag is set, do nothing and return 0. Otherwise do what <code>cpu_nmi</code> does, with the vector at <code>$FFFE</code>: push PC, push P with B clear and U set, set I, jump, add 7 cycles; and return 1.</p>
<p><code>main.c</code> now calls it while <code>cart_irq()</code> is 1. Run: the bottom of the MMC3 cartridge's screen scrolls on its own, below the scanline the IRQ picked. Then load your own games.</p>`,
        names: ['Held back by I, taken after CLI', 'RTI ends it, I flag and all', 'NMI ignores I', 'The MMC3 cartridge\'s split'],
        hints: [
          '<code>cpu_nmi</code> already has the four lines you need. Put the check for <code>FLAG_I</code> before them.',
        ],
      }),
    ],
  });
})();
