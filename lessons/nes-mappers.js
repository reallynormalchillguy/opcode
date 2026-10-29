(() => {
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
      { t: 'p', html: 'Every mapper chip needs those tables, and every chip does something different with a write. That is the shape lesson 11 was about: a base class with what they share, and one derived class per chip. <code>cart.h</code> now has it:' },
      { t: 'code', title: 'cart.h, the base class', lines: [
        ['class Mapper {', 'What every mapper chip has in common.'],
        ['public:', ''],
        ['    virtual ~Mapper() = default;', 'A class meant to be used through a base pointer needs a virtual destructor, so deleting a <code>Mapper*</code> runs the derived class\'s destructor too.'],
        ['    virtual void reset() = 0;', 'Pure virtual: each chip says what it does at power on…'],
        ['    virtual void write(std::uint16_t addr, std::uint8_t value) = 0;', '…and what it does with a write to <code>$8000</code>-<code>$FFFF</code>. Because of the <code>= 0</code>, nobody can create a plain <code>Mapper</code>.'],
        ['    std::size_t prg_offset(std::uint16_t addr) const { return prg_map_[(addr - 0x8000) >> 13] + (addr & 0x1FFF); }', 'A CPU read: bits 13-14 of the offset pick the window, the low 13 bits the byte in it. Not virtual: every chip reads the same way.'],
        ['    std::size_t chr_offset(std::uint16_t addr) const { return chr_map_[(addr >> 10) & 7] + (addr & 0x03FF); }', 'A PPU read: bits 10-12 pick the window.'],
        ['protected:', 'The derived classes can use what follows; the cartridge cannot.'],
        ['    void map_prg(int w, int n);', 'The helpers that fill in the tables (below).'],
        ['    void map_chr(int w, int n);', ''],
        ['    Mirroring mirroring_;', 'Some chips change the mirroring, so it lives here now.'],
        ['private:', 'Not even the derived classes touch these: they go through <code>map_prg</code> and <code>map_chr</code>.'],
        ['    std::array<std::size_t, 4> prg_map_{};', 'Four 8 KB windows: <code>8000</code>, <code>A000</code>, <code>C000</code>, <code>E000</code>. Each holds an offset into the PRG ROM.'],
        ['    std::array<std::size_t, 8> chr_map_{};', 'Eight 1 KB windows for the PPU\'s <code>0000</code>-<code>1FFF</code>, offsets into CHR.'],
        ['};', ''],
      ] },
      { t: 'p', html: 'Mappers count banks in their own sizes (16 KB, 8 KB, 4 KB, 2 KB, 1 KB), so the two helpers do the arithmetic: <code>map_prg(w, n)</code> points 8 KB window <code>w</code> at 8 KB bank <code>n</code>, and <code>map_chr(w, n)</code> points 1 KB window <code>w</code> at 1 KB bank <code>n</code>. A 16 KB bank <code>b</code> is the 8 KB banks <code>2b</code> and <code>2b + 1</code>. Bank numbers past the end of the ROM wrap around (<code>n % count</code>), as they do on real boards, and a negative <code>n</code> counts from the end, because many mappers keep "the last bank" fixed.' },

      { t: 'h', text: 'One class per chip' },
      { t: 'code', title: 'cart.h, a derived class', lines: [
        ['class Uxrom : public Mapper {', 'A UxROM is a Mapper.'],
        ['public:', ''],
        ['    using Mapper::Mapper;', 'Constructors are not inherited by default. This line says: Uxrom is built with the same arguments as Mapper, and passes them on.'],
        ['    void reset() override;', '<code>override</code> asks the compiler to check that this really replaces a virtual function of the base class. A typo in the name or the parameters becomes an error instead of a new, unused function.'],
        ['    void write(std::uint16_t addr, std::uint8_t value) override;', ''],
        ['private:', ''],
        ['    void update_banks();', 'Fills in the windows from the chip\'s registers.'],
        ['    std::uint8_t bank_ = 0;', 'The chip\'s one register.'],
        ['};', ''],
      ] },
      { t: 'p', html: 'The cartridge owns one chip and never needs to know which: it keeps a <code>std::unique_ptr&lt;Mapper&gt; chip_</code>, and <code>load</code> picks the class from the header\'s mapper number.' },
      { t: 'code', title: 'cart.cpp, in Cartridge::load', lines: [
        ['std::unique_ptr<Mapper> chip;', 'Empty for now. It will own the chip object, and delete it when it goes.'],
        ['switch (new_mapper) {', ''],
        ['case 0: chip = std::make_unique<Nrom>(prg_size, chr_size, header_mirroring); break;', 'Creates an <code>Nrom</code> on the heap. A <code>unique_ptr&lt;Mapper&gt;</code> can hold it, because an Nrom is a Mapper.'],
        ['case 2: chip = std::make_unique<Uxrom>(prg_size, chr_size, header_mirroring); break;', ''],
        ['default: return LoadResult::UnsupportedMapper;', 'Nothing has changed yet, so the old cartridge stays as it was (and <code>chip</code> is empty: nothing to delete).'],
        ['}', ''],
        ['// … copy the ROMs, as before …', ''],
        ['chip_ = std::move(chip);', 'The new chip replaces the old one, which is deleted here. A <code>unique_ptr</code> cannot be copied, only moved: there is always exactly one owner.'],
        ['chip_->reset();', 'A virtual call: it runs <code>Nrom::reset</code> or <code>Uxrom::reset</code>, whichever the object really is.'],
      ] },
      { t: 'p', html: 'From then on <code>cpu_read</code> returns <code>prg_[chip_-&gt;prg_offset(addr)]</code>, <code>ppu_read</code> uses <code>chr_offset</code>, and a CPU write to <code>$8000</code>-<code>$FFFF</code> becomes <code>chip_-&gt;write(addr, value)</code>. Adding a mapper means adding a class and one line in the <code>switch</code>; nothing else in the emulator changes.' },

      { t: 'h', text: 'UxROM and CNROM: one register each' },
      { t: 'table', head: ['Mapper', 'Write to 8000-FFFF', 'Fixed'], rows: [
        ['2, UxROM (Mega Man, Castlevania, Contra)', 'Which 16 KB bank appears at <code>$8000</code>.', 'The last 16 KB at <code>$C000</code>, where the reset vector and the code that switches live. CHR is 8 KB of RAM: the game copies its tiles in.'],
        ['3, CNROM', 'Which 8 KB of CHR the PPU sees.', 'The program: 16 or 32 KB, as in mapper 0.'],
      ] },
      { t: 'note', html: 'These boards have <em>bus conflicts</em>: during the write, the ROM also puts its own byte on the data bus, and the two fight. Games avoid trouble by writing the bank number to an address whose ROM byte is that same number (a little table of 0, 1, 2 …). An emulator can ignore it.' },

      { t: 'h', text: 'MMC1: five writes for one register' },
      { t: 'p', html: 'Nintendo\'s MMC1 (The Legend of Zelda, Metroid, Mega Man 2) has four 5-bit registers but takes them one bit at a time: each write to <code>$8000</code>-<code>$FFFF</code> sends bit 0 of the byte into a shift register, and the fifth write moves the five bits into the register chosen by that write\'s address. A write with bit 7 set starts again, and also sets PRG mode 3.' },
      { t: 'code', title: 'Mmc1::write, the shift register', lines: [
        ['std::uint8_t shift_ = 0x10;', 'A member that starts with a 1 in bit 4: a marker that moves down one bit per write.'],
        ['bool full = shift_ & 1;', 'If the marker has reached bit 0, this is the fifth write.'],
        ['shift_ = static_cast<std::uint8_t>((shift_ >> 1) | ((value & 1) << 4));', 'The new bit goes in at the top.'],
        ['if (full) { /* the register = shift_ */ shift_ = 0x10; }', 'Now <code>shift_</code> holds the five bits, first one in bit 0.'],
      ] },
      { t: 'table', head: ['Fifth write to', 'Register', 'Bits'], rows: [
        ['<code>$8000</code>-<code>$9FFF</code>', 'Control', '0-1 mirroring: 0 one-screen (first 1 KB), 1 one-screen (second), 2 vertical, 3 horizontal. 2-3 PRG mode: 0 and 1 switch 32 KB at once (ignoring bit 0 of the bank), 2 fixes the first 16 KB at <code>$8000</code> and switches <code>$C000</code>, 3 switches <code>$8000</code> and fixes the last 16 KB at <code>$C000</code>. 4 CHR mode: 0 one 8 KB bank (bit 0 ignored), 1 two 4 KB banks.'],
        ['<code>$A000</code>-<code>$BFFF</code>', 'CHR bank 0', 'The 4 KB bank at <code>$0000</code> (or the 8 KB bank, in CHR mode 0).'],
        ['<code>$C000</code>-<code>$DFFF</code>', 'CHR bank 1', 'The 4 KB bank at <code>$1000</code> (CHR mode 1 only).'],
        ['<code>$E000</code>-<code>$FFFF</code>', 'PRG bank', 'Bits 0-3: the 16 KB bank. (Bit 4 turns PRG RAM off; ignored here.)'],
      ] },
      { t: 'p', html: 'At power-on the control register is <code>$0C</code>: PRG mode 3, so the last bank, with the reset vector, is at <code>$C000</code>. MMC1 also brings the first new mirroring: <em>one-screen</em>, where all four nametables are the same 1 KB. The chip sets <code>mirroring_</code> (the base class made it <code>protected</code> for this), <code>Cartridge::mirroring()</code> now asks the chip, and your PPU\'s <code>nametable_index</code> needs two more cases.' },

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
      { t: 'p', html: 'R0 and R1 are 2 KB banks counted in 1 KB units, so their bit 0 is ignored: R0 = 10 means 1 KB banks 10 and 11. In window terms, CHR mode 1 just swaps the two halves: window <code>w</code> becomes <code>w ^ 4</code>.' },

      { t: 'h', text: 'IRQs' },
      { t: 'p', html: 'Sprite 0 hit gives a game one split per frame, and it has to wait in a loop for it. MMC3 can interrupt the CPU at any scanline the game picks, as often as it likes: that is how Super Mario Bros. 3 keeps its status bar at the bottom of the screen. The interrupt is the 6502\'s other one, the <em>IRQ</em>:' },
      { t: 'list', items: [
        'It goes through the vector at <code>$FFFE</code> (NMI uses <code>$FFFA</code>). Like NMI, it pushes PC and P (with B clear), sets I, and takes 7 cycles.',
        'Unlike NMI, the I flag holds it back: while I is set the CPU ignores IRQs. <code>SEI</code> and <code>CLI</code> exist for this. RTI pulls P back, and with it the old I.',
        'It is a level, not an event: the cartridge keeps the IRQ line up until the game acknowledges it (for MMC3, by writing <code>$E000</code>). If the line is still up after RTI, the CPU is interrupted again.',
      ] },
      { t: 'p', html: 'MMC3 counts scanlines by watching the PPU\'s address lines. The PPU fetches background tiles from one pattern table and sprites from the other, so once per scanline its address crosses from <code>$0xxx</code> to <code>$1xxx</code>, at about dot 260 when sprites use <code>$1000</code>, and only while rendering is on. Your PPU tells the cartridge directly: at dot 260 of each visible line and the pre-render line, when PPUMASK bit 3 or 4 is set, it calls <code>cart_.scanline()</code>.' },
      { t: 'p', html: 'Only MMC3 counts, so these are virtual functions that are <em>not</em> pure: the base class gives them a body that does nothing, and only <code>Mmc3</code> overrides them. The other chips inherit the empty versions and need no change at all.' },
      { t: 'code', title: 'cart.h, two more virtual functions', lines: [
        ['virtual void scanline() {}', 'In <code>Mapper</code>: by default, a scanline means nothing.'],
        ['virtual bool irq() const { return false; }', 'And by default, a mapper never asks for an IRQ.'],
        ['void scanline() override;', 'In <code>Mmc3</code>: its own version, which you write.'],
        ['bool irq() const override { return irq_line_; }', ''],
      ] },
      { t: 'code', title: 'cart.cpp, Mmc3::scanline', lines: [
        ['if (irq_counter_ == 0 || irq_reload_) {', 'At 0, or after a write to <code>$C001</code>…'],
        ['    irq_counter_ = irq_latch_; irq_reload_ = false;', '…start again from the latch.'],
        ['} else {', ''],
        ['    irq_counter_--;', ''],
        ['}', ''],
        ['if (irq_counter_ == 0 && irq_enabled_) irq_line_ = true;', 'Reaching 0 raises the IRQ line, if <code>$E001</code> turned it on.'],
      ] },
      { t: 'p', html: 'So a latch of N gives an IRQ every N + 1 scanlines. The course\'s <code>main.cpp</code> asks <code>cart.irq()</code> after every instruction and calls your <code>cpu.irq()</code> while it is true.' },
      { t: 'note', kind: 'nes', html: 'After the last exercise your emulator runs games on mappers 0 to 4, which is most of the NES library people remember. Load your own cartridges from the Cartridge menu. They are silent for now: sound is the next, and last, lesson. Beyond it, your emulator leaves out the other mappers, saving battery-backed RAM between visits (Zelda\'s save files are lost when you press Stop), and the rare four-screen boards: good next projects, now that you know how every part of the console fits together.' },

      { t: 'quiz', q: 'A UxROM game writes 5 to <code>$C000</code>. What does the CPU see at <code>$8000</code> and at <code>$C000</code>?', options: ['16 KB bank 5 at <code>$8000</code>, the last bank at <code>$C000</code>', 'Bank 5 at <code>$C000</code>', 'Bank 5 at both'], answer: 0, explain: 'Any write to <code>$8000</code>-<code>$FFFF</code> is the bank register, and it always controls <code>$8000</code>. <code>$C000</code> keeps the last bank.' },
      { t: 'quiz', q: 'An MMC1 game writes 1, 0, 1, 1, 0 (bit 0 of each byte) to <code>$E000</code>. Which PRG bank does it select?', options: ['13', '22', '11'], answer: 0, explain: 'The first bit written is bit 0: 1, then bit 1 = 0, bit 2 = 1, bit 3 = 1, bit 4 = 0. That is <code>01101</code> in binary, 13.' },
      { t: 'quiz', q: 'An MMC3 game sets the latch to 99, reloads and enables the IRQ during the vertical blank. Roughly where does the IRQ come?', options: ['On scanline 98', 'On scanline 99', 'After 99 frames'], answer: 0, explain: 'The pre-render line\'s clock loads 99, then each visible line counts down: line 0 makes it 98, and line 98 makes it 0. (The test cartridge sets 151, so its IRQ comes on line 150, and the picture moves from line 152, after the next copy at dot 257.)' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-mappers-1',
        stage: 30,
        title: 'The Mapper classes: NROM, UxROM and CNROM',
        rom: 'opcode-uxrom.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p>The new <code>cart.h</code> declares the <code>Mapper</code> base class, the derived classes <code>Nrom</code>, <code>Uxrom</code> and <code>Cnrom</code>, and a new member of <code>Cartridge</code>, <code>std::unique_ptr&lt;Mapper&gt; chip_</code>. In <code>cart.cpp</code>, write:</p>
<ul><li><code>Mapper::map_prg(w, n)</code> and <code>Mapper::map_chr(w, n)</code>: wrap <code>n</code> with <code>%</code> (negative from the end) and store the offset in <code>prg_map_[w]</code> or <code>chr_map_[w]</code>. The sizes are <code>prg_size_</code> and <code>chr_size_</code>, which the constructor stored.</li>
<li><code>Nrom::reset</code>: <code>map_prg(i, i)</code> for the four windows (a 16 KB ROM wraps by itself) and <code>map_chr(i, i)</code> for the eight. <code>Nrom::write</code> does nothing.</li>
<li><code>Uxrom</code> and <code>Cnrom</code>: <code>reset</code> sets <code>bank_</code> to 0 and calls <code>update_banks</code>; <code>write</code> stores the value in <code>bank_</code> and calls <code>update_banks</code>. UxROM's <code>update_banks</code>: <code>$8000</code> gets 16 KB bank <code>bank_</code>, <code>$C000</code> the last 16 KB, CHR as NROM. CNROM's: PRG as NROM, CHR is 8 KB bank <code>bank_</code>.</li>
<li>In <code>Cartridge::load</code>, after the size checks, create the chip with a <code>switch</code> on the mapper number, as in the lesson (0, 2 and 3; any other is <code>UnsupportedMapper</code>). At the end, move it into <code>chip_</code> and call <code>chip_-&gt;reset()</code>.</li>
<li><code>cpu_read</code> of <code>$8000</code>-<code>$FFFF</code> returns <code>prg_[chip_-&gt;prg_offset(addr)]</code>, and <code>cpu_write</code> there calls <code>chip_-&gt;write(addr, value)</code>. <code>ppu_read</code> and <code>ppu_write</code> use <code>chip_-&gt;chr_offset(addr)</code>. Before any cartridge is loaded, <code>chip_</code> is empty: check it first, and return 0.</li></ul>
<p>Run plays <code>opcode-uxrom.nes</code>, which prints the start of each bank it switches in. Try <code>opcode-cnrom.nes</code> too, and your own UxROM games.</p>`,
        names: ['NROM through the windows', 'UxROM switches 8000, keeps the last bank', 'UxROM\'s CHR RAM and PRG RAM', 'CNROM switches all of CHR', 'Mappers 1 and 4 are not there yet'],
        hints: [
          '<code>map_prg</code>: <code>int count = static_cast&lt;int&gt;(prg_size_ / 0x2000); n %= count; if (n &lt; 0) n += count; prg_map_[w] = static_cast&lt;std::size_t&gt;(n) * 0x2000;</code> (and the same with <code>0x400</code> for CHR). Guard against <code>count == 0</code> for a cartridge with no PRG.',
          'UxROM in 8 KB units: <code>map_prg(0, bank_ * 2); map_prg(1, bank_ * 2 + 1); map_prg(2, -2); map_prg(3, -1);</code>',
          'A parameter a function does not use can stay unnamed: <code>void Nrom::write(std::uint16_t, std::uint8_t) {}</code>',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-2',
        stage: 31,
        title: 'MMC1',
        rom: 'opcode-mmc1.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p><code>cart.h</code> now declares <code>class Mmc1 : public Mapper</code>, with the shift register and the four registers as members: <code>shift_</code>, <code>control_</code>, <code>chr0_</code>, <code>chr1_</code> and <code>prg_</code>. In <code>cart.cpp</code>:</p>
<ul><li><code>Mmc1::reset</code>: <code>shift_</code> to <code>0x10</code>, <code>control_</code> to <code>0x0C</code>, the others to 0, then <code>update_banks()</code>.</li>
<li><code>Mmc1::write(addr, value)</code> works as the lesson describes, including the reset with bit 7, and calls <code>update_banks()</code> when a register changes.</li>
<li><code>Mmc1::update_banks</code>: the PRG modes, the CHR modes, and <code>mirroring_</code> from bits 0-1 of <code>control_</code>.</li>
<li>In <code>Cartridge::load</code>, <code>case 1</code> creates an <code>Mmc1</code>.</li></ul>
<p><code>Mirroring</code> now has <code>OneLow</code> and <code>OneHigh</code>, and <code>Cartridge::mirroring()</code> returns the chip's mirroring as it is now. In <code>ppu.cpp</code>, make <code>nametable_index</code> handle all four: one-screen low uses physical table 0 for all four slots, one-screen high table 1.</p>`,
        names: ['PRG modes', 'CHR modes', 'Mirroring from the control register', 'Bit 7 starts again', 'One-screen mirroring in the PPU'],
        hints: [
          'Which register: <code>(addr &gt;&gt; 13) &amp; 3</code> is 0 for <code>8000</code>-<code>9FFF</code>, 1 for <code>A000</code>, 2 for <code>C000</code>, 3 for <code>E000</code>.',
          'Mirroring: <code>const std::array&lt;Mirroring, 4&gt; modes = {Mirroring::OneLow, Mirroring::OneHigh, Mirroring::Vertical, Mirroring::Horizontal}; mirroring_ = modes[control_ &amp; 3];</code>',
          'PRG mode 0/1 in 8 KB units: <code>for (int i = 0; i &lt; 4; i++) map_prg(i, (b &amp; ~1) * 2 + i);</code>',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-3',
        stage: 32,
        title: 'MMC3\'s banks',
        rom: 'opcode-mmc3.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p><code>cart.h</code> now declares <code>class Mmc3 : public Mapper</code>, with the bank select byte <code>select_</code> and the eight bank registers <code>std::array&lt;std::uint8_t, 8&gt; r_</code>. In <code>cart.cpp</code>, without its IRQ for now:</p>
<ul><li><code>Mmc3::reset</code>: everything to 0, then <code>update_banks()</code>.</li>
<li><code>Mmc3::write</code>: <code>$8000</code> even sets <code>select_</code>, odd sets <code>r_[select_ &amp; 7]</code>; <code>$A000</code> even sets <code>mirroring_</code> (bit 0: 1 horizontal, 0 vertical). Ignore the other addresses for now. Then <code>update_banks()</code>.</li>
<li><code>Mmc3::update_banks</code>: the PRG and CHR layouts from the lesson's table.</li>
<li>In <code>Cartridge::load</code>, <code>case 4</code> creates an <code>Mmc3</code>.</li></ul>
<p>Run shows the MMC3 cartridge's banks. The bottom of its screen does not scroll yet: that needs the IRQ.</p>`,
        names: ['PRG modes and the fixed banks', 'CHR modes', 'Mirroring', 'Even and odd addresses'],
        hints: [
          'The address range is <code>addr &amp; 0xE000</code> (<code>0x8000</code>, <code>0xA000</code>, <code>0xC000</code> or <code>0xE000</code>), which a <code>switch</code> handles well, and even or odd is <code>addr &amp; 1</code>.',
          'CHR: <code>int inv = (select_ &amp; 0x80) ? 4 : 0;</code> then <code>map_chr(0 ^ inv, r_[0] &amp; 0xFE); map_chr(1 ^ inv, r_[0] | 1);</code> and so on, R2-R5 at windows <code>4 ^ inv</code> to <code>7 ^ inv</code>.',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-4',
        stage: 33,
        title: 'The scanline counter',
        rom: 'opcode-mmc3.nes',
        stdin: '5',
        timeoutMs: 15000,
        prompt: `<p><code>cart.h</code> now gives <code>Mapper</code> the two virtual functions from the lesson, <code>scanline()</code> and <code>irq()</code>, and <code>Mmc3</code> the members <code>irq_latch_</code>, <code>irq_counter_</code>, <code>irq_reload_</code>, <code>irq_enabled_</code> and <code>irq_line_</code>. <code>Mmc3::irq()</code> is already written there, and so are <code>Cartridge::scanline()</code> and <code>Cartridge::irq()</code>, which pass the calls on to the chip. In <code>cart.cpp</code>:</p>
<ul><li><code>Mmc3::reset</code> also sets the five new members to 0 or <code>false</code>.</li>
<li><code>Mmc3::write</code>: <code>$C000</code> even sets the latch; odd sets the counter to 0 and <code>irq_reload_</code> to true. <code>$E000</code> even turns the IRQ off and lowers <code>irq_line_</code>; odd turns it on.</li>
<li><code>void Mmc3::scanline()</code>: count as in the lesson.</li></ul>
<p>In <code>ppu.cpp</code>'s <code>Ppu::tick</code>, call <code>cart_.scanline()</code> at dot 260 of lines 0-239 and 261, when PPUMASK bit 3 or 4 is set. Run prints, frame by frame, the scanline where the cartridge raised its IRQ line.</p>`,
        names: ['Counting down from the latch', 'Reload, and nothing while disabled', 'Latch 0, and other mappers', 'Clocked by the PPU', 'Only while rendering'],
        hints: [
          'Your PPU already has a block that runs only while rendering, on lines 0-239 and 261 (the one that moves <code>v_</code>). Add <code>if (dot_ == 260) cart_.scanline();</code> inside it.',
          'The order in <code>Mmc3::scanline</code> matters: first reload or decrement, then check for 0.',
          'Other mappers need nothing: they inherit <code>Mapper</code>\'s empty <code>scanline()</code> and an <code>irq()</code> that returns false.',
        ],
      }),
      N.exercise({
        id: 'nes-mappers-5',
        stage: 34,
        title: 'IRQs in the CPU',
        rom: 'opcode-mmc3.nes',
        controller: true,
        timeoutMs: 20000,
        prompt: `<p>The last exercise of the lesson. Your <code>cpu.h</code> has declared it since the CPU lessons; now write it in <code>cpu.cpp</code>:</p>
<pre>bool Cpu::irq()</pre>
<p>If the I flag is set, do nothing and return false. Otherwise do what <code>Cpu::nmi</code> does, with the vector at <code>$FFFE</code>: push PC, push P with B clear and U set, set I, jump, add 7 cycles; and return true.</p>
<p><code>main.cpp</code> now calls it while <code>cart.irq()</code> is true. Run: the bottom of the MMC3 cartridge's screen scrolls on its own, below the scanline the IRQ picked. Then load your own games.</p>`,
        names: ['Held back by I, taken after CLI', 'RTI ends it, I flag and all', 'NMI ignores I', 'The MMC3 cartridge\'s split'],
        hints: [
          '<code>Cpu::nmi</code> already has the four lines you need. Put the check for <code>kFlagI</code> before them.',
        ],
      }),
    ],
  });
})();
