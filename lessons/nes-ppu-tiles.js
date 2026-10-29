(function () {
  const N = window.NesLesson;

  // The 64 NES colours as a grid of swatches.
  function paletteFigure() {
    const src = N.data.headers['palette.cpp'];
    const values = [...src.matchAll(/0x([0-9A-F]{6})/g)].map((m) => m[1]);
    let html = '<div class="swatches">';
    values.forEach((rgb, i) => {
      const n = parseInt(rgb, 16);
      const light = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 128;
      html += `<span class="swatch${light ? ' light' : ''}" style="background:#${rgb}">${i.toString(16).toUpperCase().padStart(2, '0')}</span>`;
    });
    return html + '</div>';
  }

  Course.add({
    id: 'nes-ppu-tiles',
    part: 'nes',
    title: 'The PPU: tiles and palettes',
    summary: 'The picture chip\'s memory, how an 8 × 8 tile is stored in 16 bytes, how colour numbers become colours, and how the CPU reaches all of it through two registers.',
    blocks: [
      { t: 'p', html: 'The PPU draws 256 × 240 dots, 60 times a second. It does not keep a picture of those dots anywhere: there is not nearly enough memory. Instead, the screen is built from small reusable <em>tiles</em>, and the PPU works out every dot on the fly, as the TV beam passes, from a list of which tile goes where. This lesson is about the tiles, the colours and the PPU\'s memory. The next one puts them on the screen.' },

      { t: 'h', text: 'The PPU has its own bus' },
      { t: 'p', html: 'Like the CPU, the PPU reads and writes through a bus, but a separate one, with 14-bit addresses (<code>$0000</code>-<code>$3FFF</code>):' },
      { t: 'table', head: ['Addresses', 'What is there', 'Where it lives'], rows: [
        ['<code>$0000</code>-<code>$0FFF</code>', 'Pattern table 0: 256 tiles', 'The cartridge (CHR)'],
        ['<code>$1000</code>-<code>$1FFF</code>', 'Pattern table 1: 256 more tiles', 'The cartridge (CHR)'],
        ['<code>$2000</code>-<code>$2FFF</code>', 'Four nametables of 1 KB: which tile goes where on the screen', 'The console\'s 2 KB of video RAM'],
        ['<code>$3000</code>-<code>$3EFF</code>', 'A mirror of <code>$2000</code>-<code>$2EFF</code>', ''],
        ['<code>$3F00</code>-<code>$3F1F</code>', 'Palette RAM: 32 colour numbers', 'Inside the PPU'],
        ['<code>$3F20</code>-<code>$3FFF</code>', 'Mirrors of the palette RAM, every 32 bytes', ''],
      ] },
      { t: 'p', html: 'Your <code>Ppu::read</code> and <code>Ppu::write</code> are this table in code, just as <code>Bus::read</code> is the CPU\'s memory map.' },

      { t: 'h', text: 'Four nametables in 2 KB' },
      { t: 'p', html: 'There is room for four nametables at <code>$2000</code>, <code>$2400</code>, <code>$2800</code> and <code>$2C00</code>, arranged as a 2 × 2 square, but only 2 KB of RAM: enough for two. Each pair of slots shows the same 1 KB. Which pairs share is decided by how the cartridge is wired, and the iNES header tells you:' },
      { t: 'figure', html: `<div class="mirrors">
  <div><div class="mirror-grid"><span class="nt a">2000<b>A</b></span><span class="nt b">2400<b>B</b></span><span class="nt a">2800<b>A</b></span><span class="nt b">2C00<b>B</b></span></div><p><strong>Vertical</strong> mirroring: left and right are different, for games that scroll sideways.</p></div>
  <div><div class="mirror-grid"><span class="nt a">2000<b>A</b></span><span class="nt a">2400<b>A</b></span><span class="nt b">2800<b>B</b></span><span class="nt b">2C00<b>B</b></span></div><p><strong>Horizontal</strong> mirroring: top and bottom are different, for games that scroll up and down.</p></div>
</div>`, caption: 'The names describe where the copies are: with vertical mirroring, each table is mirrored in the one below it.' },
      { t: 'p', html: 'In code: take the offset inside <code>$2000</code>-<code>$2FFF</code>, work out which of the four tables it is (0-3), turn that into physical table 0 or 1, and add the position inside the table.' },

      { t: 'h', text: 'A tile is 16 bytes' },
      { t: 'p', html: 'A tile is 8 × 8 pixels, and each pixel is a 2-bit colour number, 0 to 3. The 16 bytes are two <em>bit planes</em>: the first 8 bytes hold bit 0 of every pixel, one byte per row; the next 8 hold bit 1. In each byte, bit 7 is the leftmost pixel. Tile <em>n</em> of a pattern table starts at <code>table + n × 16</code>.' },
      { t: 'code', title: 'one row of a tile', lines: [
        ['plane 0 (byte r):      1 0 0 0 0 0 0 1   = $81', 'Bit 0 of each of the row\'s 8 pixels.'],
        ['plane 1 (byte r + 8):  1 1 1 1 1 1 1 1   = $FF', 'Bit 1 of the same pixels.'],
        ['colour numbers:        3 2 2 2 2 2 2 3', 'Put the two bits together, plane 1 as the high bit: <code>(lo bit) | (hi bit) &lt;&lt; 1</code>.'],
      ] },
      { t: 'p', html: 'The tile has no colours, only numbers. The same tile can be drawn in different colours by pairing it with a different palette, which is how so much fits in so little memory.' },

      { t: 'h', text: 'From numbers to colours' },
      { t: 'p', html: 'The NES can show 64 colours, numbered <code>$00</code>-<code>$3F</code>. (A few are duplicates, and <code>$0D</code> is a "blacker than black" that confused some TVs.) The PPU turns them into a TV signal, so there is no single correct RGB value for each; emulators use tables like this one, which is <code>kNesPalette</code> in <code>palette.cpp</code>:' },
      { t: 'figure', html: paletteFigure(), caption: 'The 64 colours of the palette used in this course, with their numbers.' },
      { t: 'p', html: 'Palette RAM holds which of those 64 colours each palette uses. It is 32 bytes: eight palettes of four entries.' },
      { t: 'table', head: ['Addresses', 'Use'], rows: [
        ['<code>$3F00</code>', 'The backdrop: shown wherever every layer has colour number 0.'],
        ['<code>$3F01</code>-<code>$3F03</code>', 'Background palette 0, colours 1-3'],
        ['<code>$3F05</code>-<code>$3F07</code>, <code>$3F09</code>-<code>$3F0B</code>, <code>$3F0D</code>-<code>$3F0F</code>', 'Background palettes 1, 2 and 3'],
        ['<code>$3F11</code>-<code>$3F1F</code>', 'The four sprite palettes, in the same layout'],
      ] },
      { t: 'p', html: 'Colour number 0 in a tile is never drawn with its palette\'s first entry: it means "transparent", and shows the backdrop. That is why <code>$3F10</code>, <code>$3F14</code>, <code>$3F18</code> and <code>$3F1C</code> are not real memory: they are mirrors of <code>$3F00</code>, <code>$3F04</code>, <code>$3F08</code> and <code>$3F0C</code>. Games do write to <code>$3F10</code>, expecting it to change the backdrop.' },

      { t: 'h', text: 'The CPU\'s door: PPUADDR and PPUDATA' },
      { t: 'p', html: 'The CPU cannot reach the PPU\'s bus directly. It has eight registers at <code>$2000</code>-<code>$2007</code>, and to put bytes into video memory it uses two of them:' },
      { t: 'code', title: 'setting the backdrop to black, in 6502', lines: [
        ['LDA $2002', 'Read PPUSTATUS. Among other things, this resets the <em>write latch</em>, so the next PPUADDR write counts as the first one.'],
        ['LDA #$3F'],
        ['STA $2006', 'PPUADDR, first write: the high byte of the address.'],
        ['LDA #$00'],
        ['STA $2006', 'Second write: the low byte. The PPU\'s address is now <code>$3F00</code>.'],
        ['LDA #$0F'],
        ['STA $2007', 'PPUDATA: write <code>$0F</code> (black) at <code>$3F00</code>, then the address moves on by 1, or by 32 if bit 2 of PPUCTRL is set (to write a column of a nametable).'],
      ] },
      { t: 'p', html: 'Reading through PPUDATA has a quirk: the value comes from an internal buffer filled by the <em>previous</em> read. So the first read after setting an address returns stale data and games throw it away. Palette reads are the exception: they answer at once (and quietly refill the buffer with the nametable byte "underneath").' },
      { t: 'note', kind: 'nes', html: 'The write latch is shared with PPUSCROLL (<code>$2005</code>), which you will meet next lesson. One stray write to either register shifts every write after it, until PPUSTATUS is read. Real games read <code>$2002</code> first for exactly this reason.' },

      { t: 'quiz', q: 'With vertical mirroring, which address shares its byte with <code>$2C10</code>?', options: ['<code>$2810</code>', '<code>$2410</code>', '<code>$2010</code>'], answer: 1, explain: 'Vertical mirroring: <code>$2000</code> = <code>$2800</code> and <code>$2400</code> = <code>$2C00</code>. The right-hand tables share one physical table.' },
      { t: 'quiz', q: 'Byte r of a tile is <code>$F0</code> and byte r + 8 is <code>$0F</code>. What are the colour numbers of row r?', options: ['<code>1 1 1 1 2 2 2 2</code>', '<code>2 2 2 2 1 1 1 1</code>', '<code>3 3 3 3 0 0 0 0</code>'], answer: 0, explain: 'The left four pixels have bit 0 set and bit 1 clear: 1. The right four have only bit 1 set: 2.' },
      { t: 'quiz', q: 'A game writes <code>$21</code> to <code>$3F10</code>. What changes on screen?', options: ['Nothing: sprite palette 0\'s first colour is transparent', 'The backdrop, because <code>$3F10</code> mirrors <code>$3F00</code>', 'Sprite palette 0, colour 1'], answer: 1, explain: '<code>$3F10</code> is a mirror of <code>$3F00</code>, the backdrop colour.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-ppu-tiles-1',
        stage: 16,
        title: 'The PPU\'s memory',
        stdin: 'w 2000 11\nw 2400 22\nr 2800\nr 2C00\nw 3F10 0F\nr 3F00\nr 0000',
        prompt: `<p>Start <code>ppu.cpp</code>. <code>ppu.h</code> declares the <code>Ppu</code> class: it is built with a reference to the cartridge (<code>Ppu ppu(cart);</code>), keeps it in <code>cart_</code>, and already lists the private members for this lesson and the next, so do not be alarmed by its length. Write:</p>
<pre>void Ppu::reset()                                       // clear vram_ and palette_ram_
std::uint8_t Ppu::read(std::uint16_t addr)
void Ppu::write(std::uint16_t addr, std::uint8_t value)
std::uint16_t Ppu::nametable_index(std::uint16_t addr) const
int Ppu::palette_index(std::uint16_t addr) const</pre>
<p><code>read</code> and <code>write</code> first keep 14 bits (<code>addr &amp;= 0x3FFF</code>), then:</p>
<ul><li><code>0000</code>-<code>1FFF</code>: the cartridge, <code>cart_.ppu_read</code> and <code>cart_.ppu_write</code>.</li>
<li><code>2000</code>-<code>3EFF</code>: video RAM, at <code>vram_[nametable_index(addr)]</code>, which uses <code>cart_.mirroring()</code> as in the lesson.</li>
<li><code>3F00</code>-<code>3FFF</code>: palette RAM, at <code>palette_ram_[palette_index(addr)]</code>: index <code>addr &amp; 0x1F</code>, where 10, 14, 18 and 1C are the same bytes as 00, 04, 08 and 0C.</li></ul>
<p>Run opens a monitor with the cartridge from the menu plugged in: <code>r ADDR</code> and <code>w ADDR VALUE</code>.</p>`,
        names: ['Vertical mirroring', 'Horizontal mirroring', 'Palette RAM and its mirrors', 'Pattern tables are the cartridge', 'reset clears the memory'],
        hints: [
          'Nametables: <code>int offset = (addr - 0x2000) &amp; 0x0FFF; int table = offset / 0x400;</code> Vertical: physical table <code>table &amp; 1</code>. Horizontal: <code>table &gt;&gt; 1</code>. The index is <code>physical * 0x400 + (offset &amp; 0x3FF)</code>.',
          'Palette: <code>int i = addr &amp; 0x1F; if ((i &amp; 0x13) == 0x10) i &amp;= 0x0F;</code> The mask <code>0x13</code> keeps bit 4 and the two lowest bits: it equals <code>0x10</code> exactly for 10, 14, 18 and 1C.',
        ],
      }),
      N.exercise({
        id: 'nes-ppu-tiles-2',
        stage: 17,
        title: 'Decode tiles',
        stdin: '41',
        prompt: `<p>Write the member function that decodes one row of a tile:</p>
<pre>// One row (0-7) of a tile in the pattern table at table
// (0x0000 or 0x1000), as eight colour numbers 0-3, left to right.
std::array&lt;std::uint8_t, 8&gt; Ppu::tile_row(std::uint16_t table, std::uint8_t tile, int row)</pre>
<p>Read both planes with your <code>read</code>: the low plane at <code>table + tile * 16 + row</code>, the high plane 8 bytes later. It returns the eight numbers in a <code>std::array</code>: returning a small array by value is cheap, and clearer than filling one the caller passes in.</p>
<p>Then press Run: it draws <strong>every tile</strong> of the cartridge on the screen, in greys. With <code>nestest.nes</code> you will see its font. Try a game of yours too.</p>`,
        names: ['A tile with all four colours', 'A tile in the second pattern table', 'Tiles from nestest'],
        hints: [
          'For pixel <code>x</code> (0 = left), the bit is <code>7 - x</code>: <code>(lo &gt;&gt; (7 - x)) &amp; 1</code>.',
          '<code>std::array&lt;std::uint8_t, 8&gt; out{};</code> then in a loop <code>out[x] = static_cast&lt;std::uint8_t&gt;(((lo &gt;&gt; bit) &amp; 1) | (((hi &gt;&gt; bit) &amp; 1) &lt;&lt; 1));</code> and finally <code>return out;</code>',
        ],
      }),
      N.exercise({
        id: 'nes-ppu-tiles-3',
        stage: 18,
        title: 'PPUADDR and PPUDATA',
        stdin: 'w 6 3F\nw 6 00\nw 7 0F\nw 6 20\nw 6 00\nw 7 48\nw 7 49\nr 2\nw 6 20\nw 6 00\nr 7\nr 7\nr 7\np 3F00',
        prompt: `<p>Give the CPU its door into the PPU. Clear the registers <code>ctrl_</code>, <code>status_</code>, <code>vram_addr_</code>, <code>write_latch_</code> and <code>read_buffer_</code> in <code>reset</code>, and write:</p>
<pre>std::uint8_t Ppu::register_read(int reg)                 // reg 0-7 is 2000-2007
void Ppu::register_write(int reg, std::uint8_t value)</pre>
<table><tr><th>Register</th><th>Write</th><th>Read</th></tr>
<tr><td>0 PPUCTRL</td><td>store in <code>ctrl_</code></td><td></td></tr>
<tr><td>2 PPUSTATUS</td><td></td><td>return <code>(status_ &amp; 0xE0) | (read_buffer_ &amp; 0x1F)</code> and set <code>write_latch_</code> to false</td></tr>
<tr><td>6 PPUADDR</td><td>first write: high 6 bits of <code>vram_addr_</code>; second: low byte; flip the latch each time</td><td></td></tr>
<tr><td>7 PPUDATA</td><td><code>write(vram_addr_, value)</code>, then add the increment</td><td>palette (3F00 and up): the byte itself, and refill the buffer from <code>addr - 0x1000</code>; otherwise return the buffer and refill it from <code>vram_addr_</code>; then add the increment</td></tr></table>
<p>The increment is 32 if bit 2 of <code>ctrl_</code> is set, otherwise 1, and <code>vram_addr_</code> always stays below 4000. Other registers come in the next lesson; reads of them return 0.</p>`,
        names: ['PPUADDR then PPUDATA writes', 'Reads come one late', 'PPUCTRL bit 2 adds 32', 'The palette answers at once', 'Reading PPUSTATUS resets the latch', 'Addresses stay below 4000'],
        hints: [
          'First PPUADDR write: <code>vram_addr_ = static_cast&lt;std::uint16_t&gt;(((value &amp; 0x3F) &lt;&lt; 8) | (vram_addr_ &amp; 0x00FF));</code> second: <code>vram_addr_ = static_cast&lt;std::uint16_t&gt;((vram_addr_ &amp; 0xFF00) | value);</code> and <code>write_latch_ = !write_latch_;</code> after either.',
          'After each PPUDATA access: <code>vram_addr_ = static_cast&lt;std::uint16_t&gt;((vram_addr_ + ((ctrl_ &amp; 0x04) ? 32 : 1)) &amp; 0x3FFF);</code> A <code>switch (reg)</code> with one <code>case</code> per register keeps both functions readable.',
        ],
      }),
    ],
  });
})();
