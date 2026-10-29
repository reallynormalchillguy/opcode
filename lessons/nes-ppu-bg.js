(function () {
  const N = window.NesLesson;

  Course.add({
    id: 'nes-ppu-bg',
    part: 'nes',
    title: 'Drawing the background',
    summary: 'Nametables and attributes, the rest of the PPU\'s registers, the timing of a frame and the NMI, and then the first real picture from your emulator.',
    blocks: [
      { t: 'p', html: 'You have tiles and colours. To draw a screen the PPU needs to know which tile goes where, which palette each part uses, where the screen is scrolled to, and when to do it all. At the end of this lesson your emulator runs a cartridge and shows its picture, live.' },

      { t: 'h', text: 'Nametables: which tile goes where' },
      { t: 'p', html: 'The screen is 32 tiles across and 30 down. A <em>nametable</em> is 960 bytes, one tile number per position, row by row: the tile at column <code>tx</code>, row <code>ty</code> is at <code>$2000 + ty × 32 + tx</code>. The last 64 bytes of each 1 KB table, from <code>$23C0</code>, are its <em>attribute table</em>.' },
      { t: 'p', html: 'Attributes say which of the four background palettes to use. They are coarse: one byte covers a 4 × 4-tile block (32 × 32 pixels), and gives a palette to each 2 × 2-tile quarter of it:' },
      { t: 'figure', html: `<div class="attr-fig">
  <div class="attr-block"><span class="q q0">bits 0-1</span><span class="q q1">bits 2-3</span><span class="q q2">bits 4-5</span><span class="q q3">bits 6-7</span></div>
  <div class="attr-text"><p>The byte for the block holding tile <code>tx</code>, <code>ty</code> is at <code>$23C0 + (ty / 4) × 8 + tx / 4</code>.</p><p>Inside it, the quarter is chosen by bit 1 of <code>tx</code> (right half) and bit 1 of <code>ty</code> (bottom half): <code>shift = ((ty &amp; 2) &lt;&lt; 1) | (tx &amp; 2)</code>, and the palette is <code>(byte &gt;&gt; shift) &amp; 3</code>.</p></div>
</div>`, caption: 'One attribute byte colours a 32 × 32-pixel block: two bits for each 16 × 16 quarter. This is why NES backgrounds change colour in 16-pixel steps.' },
      { t: 'p', html: 'So to colour one pixel of the background the PPU needs four reads: the tile number from the nametable, the attribute byte, and the two pattern bytes of the tile\'s row.' },

      { t: 'h', text: 'The rest of the registers' },
      { t: 'table', head: ['Register', 'Bits'], rows: [
        ['<code>$2000</code> PPUCTRL', '0-1: which nametable is at the top-left of the screen. 2: PPUDATA increment, 1 or 32. 3: sprite pattern table. 4: background pattern table (<code>$0000</code> or <code>$1000</code>). 5: sprite size. 7: raise an NMI at the start of each vertical blank.'],
        ['<code>$2001</code> PPUMASK', '1: show the background in the leftmost 8 pixels. 2: the same for sprites. 3: show the background. 4: show sprites. (0 is greyscale and 5-7 tint the colours; this course ignores them.)'],
        ['<code>$2003</code> OAMADDR, <code>$2004</code> OAMDATA', 'An address and a data port into the 256 bytes of sprite memory, like PPUADDR and PPUDATA. Writes move the address on; reads do not. Sprites are next lesson; for now just store the bytes.'],
        ['<code>$2005</code> PPUSCROLL', 'Two writes: the horizontal scroll, then the vertical one. It shares the write latch with PPUADDR.'],
      ] },

      { t: 'h', text: 'Scrolling: a window on four screens' },
      { t: 'p', html: 'Put the four nametables side by side as a 2 × 2 square and you have a world of 512 × 480 pixels. The screen is a 256 × 240 window on it. PPUCTRL\'s two low bits say which nametable the window starts in, and PPUSCROLL moves it by up to 255 pixels across and 239 down from there. When the window runs off the right or bottom edge, it wraps around to the other side. With mirroring, two of the four tables are copies, so a game that scrolls sideways uses vertical mirroring and keeps writing new columns just off-screen.' },
      { t: 'code', title: 'which world pixel is screen pixel x, y?', lines: [
        ['int origin_x = ((ctrl_ & 0x01) ? 256 : 0) + scroll_x_;', 'Nametables 1 and 3 are on the right.'],
        ['int origin_y = ((ctrl_ & 0x02) ? 240 : 0) + scroll_y_;', 'Nametables 2 and 3 are at the bottom.'],
        ['int wx = (origin_x + x) % 512;', 'Wrap around the world.'],
        ['int wy = (origin_y + y) % 480;'],
        ['int table = (wx / 256) + 2 * (wy / 240);', 'Which of the four nametables, 0-3.'],
        ['int tx = (wx % 256) / 8, ty = (wy % 240) / 8;', 'The tile inside it.'],
      ] },
      { t: 'note', html: 'Real games change the scroll in the middle of a frame (a status bar that does not scroll, for example). That works with this model as long as you draw each scanline when the PPU reaches it, which is what you will do. A few games also scroll by writing PPUADDR mid-frame; the Scrolling lesson replaces this model with the PPU\'s real internal registers.' },

      { t: 'h', text: 'The timing of a frame' },
      { t: 'p', html: 'You built this clock in lesson 12: 341 dots per scanline, 262 scanlines per frame. Now the scanlines get meaning:' },
      { t: 'table', head: ['Scanlines', 'What happens'], rows: [
        ['0-239', 'Visible: the PPU draws one line of the picture each.'],
        ['240', 'Idle.'],
        ['241, dot 1', 'The vertical blank starts: bit 7 of PPUSTATUS is set, and if bit 7 of PPUCTRL is set, the PPU raises the NMI. The picture is finished.'],
        ['242-260', 'The vertical blank: about 2,270 CPU cycles in which the game may safely change video memory.'],
        ['261, dot 1', 'The pre-render line: bits 5-7 of PPUSTATUS are cleared, ready for the next frame.'],
      ] },
      { t: 'p', html: 'Reading PPUSTATUS clears its vblank bit. Games often wait for the blank by reading <code>$2002</code> in a loop until bit 7 is set. One more detail: if a game turns NMIs on (PPUCTRL bit 7) while the vblank bit is already set, the NMI happens right away.' },
      { t: 'p', html: 'Your PPU draws each visible scanline in one go, when its dot counter reaches 256 (the real PPU draws one dot at a time, but the result is the same for the background, as long as nothing changes in the middle of a line).' },

      { t: 'h', text: 'Putting the console together' },
      { t: 'p', html: 'The last exercise\'s <code>main.cpp</code> is a complete NES, apart from sprites, sound and controllers. Each frame it repeats:' },
      { t: 'code', title: 'main.cpp, run_frame', lines: [
        ['int c = cpu.step();', 'One instruction.'],
        ['for (int i = 0; i < 3 * c; i++) ppu.tick();', 'Three dots for every CPU cycle.'],
        ['if (ppu.take_nmi()) cpu.nmi();', 'The PPU asked for an NMI: interrupt the CPU before its next instruction.'],
        ['if (ppu.take_frame()) break;', 'A picture is finished.'],
        ['// then:'],
        ['screen_show(ppu.pixels());', 'Show it on the page. <code>screen.h</code> is provided by the course; <code>screen_loop</code> calls <code>run_frame</code> 60 times a second until you press Stop.'],
      ] },
      { t: 'p', html: 'The console\'s parts are created once, in this order, each given references to the parts it talks to: <code>Cartridge cart; Ppu ppu(cart); Bus bus(cart, ppu); Cpu cpu(bus);</code>. They are declared outside <code>main</code>, in an unnamed namespace, so that <code>run_frame</code> can reach them. <code>main</code> ends with <code>screen_loop(run_frame);</code>, which never returns: from then on the page calls <code>run_frame</code> 60 times a second.' },
      { t: 'note', kind: 'nes', html: 'Try your own mapper 0 games: title screens of games like Donkey Kong or Balloon Fight should appear. Sprites (the characters) are missing until the next lesson, and some games, Super Mario Bros. among them, freeze after a moment because they wait for a sprite to be drawn.' },

      { t: 'quiz', q: 'Which byte holds the tile number at column 3, row 2 of the first nametable?', options: ['<code>$2023</code>', '<code>$2043</code>', '<code>$2032</code>'], answer: 1, explain: '<code>$2000 + 2 × 32 + 3</code> = <code>$2000 + $40 + 3</code> = <code>$2043</code>.' },
      { t: 'quiz', q: 'Tile column 6, row 1 is coloured by which bits of which attribute byte?', options: ['Bits 2-3 of <code>$23C1</code>', 'Bits 6-7 of <code>$23C1</code>', 'Bits 2-3 of <code>$23C0</code>'], answer: 0, explain: 'The byte is <code>$23C0 + (1 / 4) × 8 + 6 / 4</code> = <code>$23C1</code>. Column 6 has bit 1 set (right half), row 1 does not (top half): top-right, bits 2-3.' },
      { t: 'quiz', q: 'PPUCTRL is <code>$01</code> and the scroll is 0, 0. Which nametable is at the top-left of the screen?', options: ['<code>$2000</code>', '<code>$2400</code>', '<code>$2800</code>'], answer: 1, explain: 'Bits 0-1 are 01: nametable 1, at <code>$2400</code>.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-ppu-bg-1',
        stage: 19,
        title: 'Every register, through the bus',
        stdin: 'w 2006 3F\nw 2006 00\nw 2007 2A\np 3F00\nw 2003 05\nw 2004 77\nw 2003 05\nr 2004\nr 3FFC',
        prompt: `<p>Finish the registers in <code>ppu.cpp</code>, clearing each one in <code>reset</code>:</p>
<ul><li><strong>1 PPUMASK</strong>: store the byte in <code>mask_</code>.</li>
<li><strong>3 OAMADDR</strong>: store it in <code>oam_addr_</code>. <strong>4 OAMDATA</strong>: a write stores at <code>oam_[oam_addr_]</code> and adds 1 to <code>oam_addr_</code> (a <code>std::uint8_t</code>, so it wraps); a read returns <code>oam_[oam_addr_]</code> without moving.</li>
<li><strong>5 PPUSCROLL</strong>: the first write is <code>scroll_x_</code>, the second <code>scroll_y_</code>, using and flipping the same <code>write_latch_</code> as PPUADDR.</li></ul>
<p>Then connect the PPU to the bus. The new <code>bus.h</code> builds the bus with both parts, <code>Bus bus(cart, ppu);</code>, and keeps the PPU in <code>ppu_</code>. In <code>bus.cpp</code>, addresses <code>2000</code>-<code>3FFF</code> go to <code>ppu_.register_read(addr &amp; 7)</code> and <code>ppu_.register_write(addr &amp; 7, value)</code>. Run opens a monitor of the CPU's bus.</p>`,
        names: ['PPU registers through the bus, and their mirrors', 'OAMADDR and OAMDATA', 'PPUSCROLL shares the write latch', 'RAM and the cartridge still work'],
        hints: [
          'In <code>Bus::read</code>, after the RAM case: <code>if (addr &lt; 0x4000) return ppu_.register_read(addr &amp; 7);</code> and the same shape in <code>Bus::write</code>.',
          'OAMDATA write: <code>oam_[oam_addr_++] = value;</code> Because <code>oam_addr_</code> is a <code>std::uint8_t</code>, the <code>++</code> wraps from 255 to 0 on its own.',
        ],
      }),
      N.exercise({
        id: 'nes-ppu-bg-2',
        stage: 20,
        title: 'Timing and the NMI',
        stdin: '80',
        prompt: `<p>Give the PPU a clock, with the members <code>scanline_</code> (0-261), <code>dot_</code> (0-340), <code>nmi_pending_</code> and <code>frame_ready_</code>, all cleared by <code>reset</code>. The getters <code>scanline()</code> and <code>dot()</code> are already in <code>ppu.h</code>. Write:</p>
<pre>void Ppu::tick()
bool Ppu::take_nmi()     // return nmi_pending_, then clear it
bool Ppu::take_frame()   // return frame_ready_, then clear it</pre>
<p><code>tick</code> first looks at where it is, then moves on one dot:</p>
<ul><li>At scanline 241, dot 1: set bit 7 of <code>status_</code>, set <code>frame_ready_</code>, and if bit 7 of <code>ctrl_</code> is set, <code>nmi_pending_</code>.</li>
<li>At scanline 261, dot 1: clear bits 5-7 of <code>status_</code>.</li>
<li>Then <code>dot_++</code>; after 340 comes dot 0 of the next scanline; after scanline 261 comes 0.</li></ul>
<p>Two changes to the registers: reading PPUSTATUS now clears bit 7 of <code>status_</code> (after making the value it returns), and a PPUCTRL write that turns bit 7 on while bit 7 of <code>status_</code> is set raises an NMI straight away.</p>`,
        names: ['Dots and scanlines', 'A frame is 89,342 dots', 'The vertical blank flag', 'NMIs only when PPUCTRL asks', 'Turning NMIs on during the blank'],
        hints: [
          'The order matters: check the events for the current position, then advance. That way the flag is set during the tick that happens <em>at</em> scanline 241, dot 1.',
          'PPUCTRL: <code>if (!(ctrl_ &amp; 0x80) &amp;&amp; (value &amp; 0x80) &amp;&amp; (status_ &amp; 0x80)) nmi_pending_ = true;</code> before <code>ctrl_ = value;</code>',
        ],
      }),
      N.exercise({
        id: 'nes-ppu-bg-3',
        stage: 21,
        title: 'Draw the background',
        timeoutMs: 15000,
        prompt: `<p>The big one. Write <code>void Ppu::render_scanline(int y)</code>, and call it from <code>tick</code> when <code>scanline_ &lt; 240</code> and <code>dot_ == 256</code>. For each <code>x</code> from 0 to 255 it sets <code>pixels_[y * 256 + x]</code>, the picture that <code>pixels()</code> returns (and that <code>reset</code> should clear):</p>
<ul><li>If PPUMASK bit 3 is clear, or <code>x &lt; 8</code> and PPUMASK bit 1 is clear: the backdrop, <code>kNesPalette[read(0x3F00) &amp; 0x3F]</code>.</li>
<li>Otherwise: find the world pixel and the tile as in the lesson, read the tile number and the attribute byte, get that row of the tile with your <code>tile_row</code> (pattern table from PPUCTRL bit 4), and pick colour <code>c = colours[wx % 8]</code> from the eight it returns.</li>
<li>Colour 0 shows the backdrop. Colours 1-3 come from <code>read(0x3F00 + palette * 4 + c)</code>. Turn the colour number into RGB with <code>kNesPalette</code> (add <code>#include "palette.h"</code>).</li></ul>
<p>Then press Run. <code>main.cpp</code> runs the whole console, and the cartridge's picture appears under the editor. Load one of your own mapper 0 games from the Cartridge menu too.</p>`,
        names: ['Background off shows the backdrop', 'One tile in the corner', 'Hiding the left column', 'Attributes choose the palette', 'Scrolling', 'PPUCTRL picks the nametable and the tiles', 'nestest\'s menu screen'],
        hints: [
          'Work out once per line what does not depend on <code>x</code>: the backdrop colour, <code>origin_x</code>, <code>origin_y</code>, <code>wy</code> and the pattern table. The row inside the tile is <code>(wy % 240) % 8</code>. A pointer to the start of the line saves arithmetic: <code>std::uint32_t* row = &amp;pixels_[y * kPpuWidth];</code>',
          'Nametable base: <code>0x2000 + table * 0x400</code>. Tile number at <code>base + ty * 32 + tx</code>, attribute at <code>base + 0x3C0 + (ty / 4) * 8 + tx / 4</code>, palette <code>(attr &gt;&gt; (((ty &amp; 2) &lt;&lt; 1) | (tx &amp; 2))) &amp; 3</code>.',
        ],
      }),
    ],
  });
})();
