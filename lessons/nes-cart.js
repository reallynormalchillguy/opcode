(function () {
  const N = window.NesLesson;

  Course.add({
    id: 'nes-cart',
    part: 'nes',
    title: 'Cartridges: iNES and mapper 0',
    summary: 'What is inside a .nes file, how to read its header safely, and how the cartridge plugs into the CPU and PPU.',
    blocks: [
      { t: 'p', html: 'Your CPU passes nestest, but so far you have fed it a test cartridge by hand. Real games come as <code>.nes</code> files. This lesson teaches your emulator to read them, and replaces the test cartridge from lesson 13 with a proper <code>Cartridge</code> class.' },

      { t: 'h', text: 'What a .nes file is' },
      { t: 'p', html: 'A cartridge contains chips: one or more ROMs with the game\'s program (<em>PRG ROM</em>), usually ROMs with its graphics (<em>CHR ROM</em>, the tiles), and sometimes RAM and extra logic. A <code>.nes</code> file is the contents of those ROM chips, one after the other, with a 16-byte header in front that says how big each part is and how the board is wired. The format is called <em>iNES</em>, after the emulator that introduced it in 1996.' },
      { t: 'table', head: ['Byte', 'Meaning'], rows: [
        ['0-3', 'The letters <code>N</code> <code>E</code> <code>S</code> and the byte <code>$1A</code>. Anything else is not an iNES file.'],
        ['4', 'Size of PRG ROM, in 16 KB units.'],
        ['5', 'Size of CHR ROM, in 8 KB units. 0 means the board has 8 KB of CHR <em>RAM</em> instead, which the game fills itself.'],
        ['6', 'Flags. Bit 0: mirroring (0 horizontal, 1 vertical). Bit 1: battery-backed RAM for saves. Bit 2: a 512-byte <em>trainer</em> comes before the PRG ROM. Bits 4-7: the low half of the mapper number.'],
        ['7', 'More flags. Bits 4-7: the high half of the mapper number.'],
        ['8-15', 'Rarely used extensions. You can ignore them.'],
      ] },
      { t: 'p', html: 'After the header come the trainer (if bit 2 says so, and it almost never does), then the PRG ROM, then the CHR ROM. Here is the start of <code>nestest.nes</code>:' },
      { t: 'code', title: 'nestest.nes, first 16 bytes', lines: [
        ['4E 45 53 1A  01 01 00 00  00 00 00 00 00 00 00 00', 'NES and 1A; 1 × 16 KB of PRG; 1 × 8 KB of CHR; flags 6 and 7 are 0: horizontal mirroring, no battery, no trainer, mapper 0. The file is 16 + 16384 + 8192 = 24,592 bytes long.'],
      ] },

      { t: 'h', text: 'Mappers' },
      { t: 'p', html: 'The mapper number names the circuit board, and with it how the ROMs appear in the CPU\'s and PPU\'s address space. Mapper 0 (NROM) is the plain board you met in lesson 13: no bank switching at all. A handful of mappers cover most of the library:' },
      { t: 'table', head: ['Mapper', 'Board', 'For example'], rows: [
        ['0', 'NROM', 'Super Mario Bros., Donkey Kong, Excitebike, Balloon Fight'],
        ['1', 'MMC1', 'The Legend of Zelda, Metroid, Mega Man 2'],
        ['2', 'UxROM', 'Mega Man, Castlevania, Contra'],
        ['3', 'CNROM', 'Gradius, Arkanoid'],
        ['4', 'MMC3', 'Super Mario Bros. 3, Kirby\'s Adventure'],
      ] },
      { t: 'p', html: 'The mapper number is split in two halves across bytes 6 and 7: <code>(flags7 &amp; 0xF0) | (flags6 &gt;&gt; 4)</code>. This lesson supports mapper 0 only; the last lesson of the course adds 1 to 4.' },

      { t: 'h', text: 'Never trust a file' },
      { t: 'p', html: 'Your emulator will read files you did not make. A broken or truncated file must not make it read past the end of its data (lesson 5: <code>[]</code> will not stop you). So <code>Cartridge::load</code> checks before it copies:' },
      { t: 'list', items: [
        'There are at least 16 bytes, and they start with <code>NES</code> and <code>$1A</code>.',
        'The file is at least as long as the header says: 16 + trainer + PRG + CHR.',
        'The mapper is one it knows.',
      ] },
      { t: 'p', html: 'Instead of printing errors, it returns a result, and the caller decides what to tell the user. <code>cart.h</code> defines the possible results as an <code>enum class</code> (lesson 8): <code>LoadResult::Ok</code>, <code>LoadResult::NotInes</code>, <code>LoadResult::TooShort</code> and <code>LoadResult::UnsupportedMapper</code>. A name says much more than a number like -2.' },

      { t: 'h', text: 'Two windows on the cartridge' },
      { t: 'p', html: 'The cartridge is connected to both buses at once. The CPU sees the program at <code>$8000</code>-<code>$FFFF</code> (and the board\'s RAM, if any, at <code>$6000</code>-<code>$7FFF</code>). The PPU sees the CHR at its own addresses <code>$0000</code>-<code>$1FFF</code>, its <em>pattern tables</em>. So the <code>Cartridge</code> class has two pairs of member functions: <code>cpu_read</code>/<code>cpu_write</code> and <code>ppu_read</code>/<code>ppu_write</code>. Mappers in a later lesson only change what happens inside them.' },
      { t: 'p', html: 'The ROMs are copied into two <code>std::vector</code> members, because their size is only known from the header (lesson 9). Loading a second cartridge replaces their contents, and the vectors release the old memory themselves.' },

      { t: 'h', text: 'Your own cartridges' },
      { t: 'p', html: 'From here on, exercises have a <strong>Cartridge</strong> menu above Program input. <code>nestest.nes</code> comes with the course. "Load a .nes file" lets you pick a file from your computer; it is kept in this browser, never uploaded anywhere, and the course program receives it as <code>game.nes</code>. Only use games you own: the usual way to get a <code>.nes</code> file legally is to dump your own cartridge.' },

      { t: 'quiz', q: 'Byte 6 is <code>$41</code> and byte 7 is <code>$00</code>. What do you know?', options: ['Mapper 4, vertical mirroring', 'Mapper 1, vertical mirroring', 'Mapper 4, horizontal mirroring'], answer: 0, explain: 'The high nibble of byte 6, 4, is the low half of the mapper number, and byte 7 adds nothing. Bit 0 of byte 6 is 1: vertical mirroring.' },
      { t: 'quiz', q: 'A file says 2 × 16 KB of PRG and 1 × 8 KB of CHR, with no trainer. It is 32,000 bytes long. What should <code>load</code> do?', options: ['Load it, and fill the missing bytes with zeros', 'Return <code>LoadResult::TooShort</code>', 'Read the bytes anyway: they are probably there'], answer: 1, explain: 'The header promises 16 + 32,768 + 8,192 = 40,976 bytes. Copying that much from a 32,000-byte buffer would read memory that does not belong to it.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-cart-1',
        stage: 13,
        title: 'Read the header',
        prompt: `<p>Start <code>cart.cpp</code>, a new part of your emulator. <code>cart.h</code> declares the <code>Cartridge</code> class: the getters (<code>mapper()</code>, <code>prg_banks()</code>, <code>chr_banks()</code>, <code>mirroring()</code>, <code>has_battery()</code>) are already written in the header, and return the private members <code>mapper_</code>, <code>prg_banks_</code> and so on. Write:</p>
<pre>LoadResult Cartridge::load(const std::vector&lt;std::uint8_t&gt;&amp; file)</pre>
<p>For now it only reads the header. In this order, it returns:</p>
<ul><li><code>LoadResult::TooShort</code> if the file has fewer than 16 bytes;</li>
<li><code>LoadResult::NotInes</code> if the first four bytes are not <code>'N' 'E' 'S' 0x1A</code>;</li>
<li><code>LoadResult::TooShort</code> if the file is shorter than 16 + trainer (512 if bit 2 of byte 6 is set) + PRG + CHR;</li>
<li>otherwise it saves the header values in the members and returns <code>LoadResult::Ok</code>.</li></ul>
<p>Run shows what your code makes of the cartridge chosen in the menu.</p>`,
        names: ['Two correct headers', 'The mapper number has two halves', 'Broken files are refused', 'A trainer adds 512 bytes'],
        hints: [
          'Compare sizes as <code>std::size_t</code>, the type <code>file.size()</code> returns: <code>std::size_t trainer = (file[6] &amp; 0x04) ? 512 : 0;</code> and <code>std::size_t needed = 16 + trainer + file[4] * 0x4000 + file[5] * 0x2000;</code>',
          'Mirroring: <code>mirroring_ = (file[6] &amp; 0x01) ? Mirroring::Vertical : Mirroring::Horizontal;</code> Mapper: <code>(file[7] &amp; 0xF0) | (file[6] &gt;&gt; 4)</code>. Battery: <code>(file[6] &amp; 0x02) != 0</code>.',
        ],
      }),
      N.exercise({
        id: 'nes-cart-2',
        stage: 14,
        title: 'Mapper 0',
        prompt: `<p>Now keep the cartridge's memory, in the members <code>prg_</code>, <code>chr_</code>, <code>chr_is_ram_</code> and <code>prg_ram_</code>. In <code>load</code>, after the size check:</p>
<ul><li>Return <code>LoadResult::UnsupportedMapper</code> if the mapper is not 0, without changing the cartridge already loaded.</li>
<li>Copy the PRG ROM (<code>prg_banks * 16 KB</code>) and the CHR (<code>chr_banks * 8 KB</code>) from the file into <code>prg_</code> and <code>chr_</code>. When there is no CHR ROM, <code>chr_</code> becomes 8 KB of CHR RAM, all zero, and <code>chr_is_ram_</code> is true.</li>
<li>Clear the 8 KB of cartridge RAM.</li></ul>
<p>Then the four access functions:</p>
<table><tr><th>Member function</th><th>Addresses</th><th>Does</th></tr>
<tr><td><code>cpu_read</code></td><td>6000-7FFF</td><td>cartridge RAM</td></tr>
<tr><td></td><td>8000-FFFF</td><td>PRG ROM, <code>(addr - 0x8000) % prg_.size()</code></td></tr>
<tr><td><code>cpu_write</code></td><td>6000-7FFF</td><td>cartridge RAM; ROM ignores writes</td></tr>
<tr><td><code>ppu_read</code></td><td>0000-1FFF</td><td>CHR, <code>addr &amp; 0x1FFF</code></td></tr>
<tr><td><code>ppu_write</code></td><td>0000-1FFF</td><td>only if it is CHR RAM</td></tr></table>`,
        names: ['16 KB of PRG appears twice', '32 KB of PRG', 'Cartridge RAM at 6000', 'CHR ROM and CHR RAM', 'Refusing other mappers, and loading again', 'nestest.nes'],
        hints: [
          'A vector can copy a range of another one: <code>auto rom = file.begin() + 16 + trainer;</code> then <code>prg_.assign(rom, rom + prg_banks * 0x4000);</code>. The CHR starts where the PRG ends. <code>chr_.assign(0x2000, 0);</code> makes 8 KB of zeros.',
          'Check the mapper before you touch any member: a failed <code>load</code> must leave the old cartridge working. <code>prg_ram_.fill(0);</code> clears the RAM.',
        ],
      }),
      N.exercise({
        id: 'nes-cart-3',
        stage: 15,
        title: 'Plug it into the bus',
        rom: false,
        prompt: `<p>The cartridge now owns everything from <code>4020</code> up, including the cartridge RAM. The new <code>bus.h</code> shows the change: the bus is built with a reference to the cartridge, <code>Bus bus(cart);</code>, and keeps it in <code>cart_</code>; <code>load_prg</code>, <code>prg_ram_</code> and <code>prg_rom_</code> are gone. Rewrite <code>bus.cpp</code> so that:</p>
<ul><li>it keeps only the 2 KB of work RAM itself;</li>
<li><code>read</code> and <code>write</code> pass every address from <code>4020</code> up to <code>cart_.cpu_read</code> and <code>cart_.cpu_write</code>;</li>
<li><code>Bus::load_prg</code> is deleted;</li>
<li><code>read16</code> and <code>region</code> stay.</li></ul>
<p>The test is the best one you have: <code>main.cpp</code> loads <code>nestest.nes</code> with your <code>Cartridge::load</code> and runs nestest through your new bus. Everything should still match.</p>`,
        names: ['The first 10 lines of nestest', 'The first 1000 lines', 'All 5003 lines'],
        timeoutMs: 20000,
        hints: [
          'In <code>read</code>: after the RAM case, <code>if (addr &gt;= 0x4020) return cart_.cpu_read(addr);</code> and <code>return 0;</code> for everything else. <code>reset</code> only clears <code>ram_</code> now.',
          'If the compiler says <code>prg_ram_</code> or <code>prg_rom_</code> is not a member, or that <code>load_prg</code> does not match any declaration, delete those lines from <code>bus.cpp</code>: the bus does not have them any more.',
        ],
      }),
    ],
  });
})();
