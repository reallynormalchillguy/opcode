(function () {
  const N = window.NesLesson;

  const loopyFigure = `<div class="bit-groups">
  <div class="bit-group g-fy"><span class="bits">yyy</span><b>fine y</b><small>bits 12-14: the row inside the tile</small></div>
  <div class="bit-group g-nt"><span class="bits">NN</span><b>nametable</b><small>bits 10-11</small></div>
  <div class="bit-group g-cy"><span class="bits">YYYYY</span><b>coarse y</b><small>bits 5-9: tile row, 0-29</small></div>
  <div class="bit-group g-cx"><span class="bits">XXXXX</span><b>coarse x</b><small>bits 0-4: tile column, 0-31</small></div>
</div>`;

  Course.add({
    id: 'nes-scroll',
    part: 'nes',
    title: 'Scrolling',
    summary: 'Sprite 0 hit and the split screen, then the PPU\'s real scroll registers (v, t, fine x and w) and how they move while the picture is drawn. Then Super Mario Bros.',
    blocks: [
      { t: 'p', html: 'Almost every scrolling NES game keeps part of the screen still: a status bar with the score, the time and the lives, while the level moves under it. The PPU has one scroll position. Games get two by changing the scroll in the middle of the frame, just after the PPU has drawn the status bar. This lesson is about how they know when, and how the PPU really keeps its scroll.' },

      { t: 'h', text: 'Sprite 0 hit' },
      { t: 'p', html: 'The CPU cannot see where the PPU is in the frame. There is no register with the scanline number. There is one signal: bit 6 of PPUSTATUS, <em>sprite 0 hit</em>. The PPU sets it at the first pixel where a non-transparent pixel of sprite 0 is drawn over a non-transparent background pixel.' },
      { t: 'p', html: 'So a game puts sprite 0 where the status bar ends, over a coloured part of it. Super Mario Bros. hides it behind the bottom of the coin icon; the demo does the same with its byte icon. Then, in its NMI, the game sets the scroll for the status bar, waits for bit 6 to be cleared (that happens at the end of the vertical blank), waits for it to be set again, and writes the level\'s scroll:' },
      { t: 'code', title: 'the demo\'s NMI, after drawing the status bar (6502)', lines: [
        ['wait: BIT $2002', 'BIT copies bit 6 of the byte read into the V flag.'],
        ['BVC wait', 'Not hit yet: ask again. (The demo gives up after a while, which is why it did not freeze in the last lesson. Super Mario Bros. waits for ever.)'],
        ['LDA camera', 'The PPU has just drawn sprite 0\'s line.'],
        ['STA $2005', 'The level\'s horizontal scroll: from the next lines on, the picture moves.'],
      ] },
      { t: 'table', head: ['Sprite 0 hit rules', ''], rows: [
        ['Both pixels opaque', 'Sprite 0\'s pixel and the background pixel both have a colour number other than 0. The sprite\'s priority does not matter: behind the background still counts.'],
        ['Both layers on', 'PPUMASK bits 3 and 4. In the leftmost 8 pixels, a layer that is hidden there (bits 1 and 2) cannot hit.'],
        ['Not at x = 255', 'A quirk of the hardware: the last column never hits.'],
        ['Once per frame', 'The bit stays set until the pre-render line (261, dot 1) clears it, along with bits 5 and 7. Reading PPUSTATUS does not clear it.'],
      ] },
      { t: 'p', html: 'Bit 5 of PPUSTATUS is <em>sprite overflow</em>: set when more than eight sprites are on one line. On the real PPU it is buggy (it sometimes misses, sometimes fires wrongly), so few games use it. Yours sets it whenever <code>sprites_on_line</code> counts more than 8 and something is being drawn.' },

      { t: 'h', text: 'The PPU\'s real scroll: v, t, fine x and w' },
      { t: 'p', html: 'Your PPU has kept the scroll as two numbers, <code>scroll_x_</code> and <code>scroll_y_</code>, separate from the PPUADDR address. The real PPU has no such numbers. It has four registers, which the people who worked them out named <em>loopy</em> registers, after one of them:' },
      { t: 'list', items: [
        '<strong><code>v</code></strong>, 15 bits: the current VRAM address. PPUDATA reads and writes use it, and while the picture is drawn it points at the tile being drawn.',
        '<strong><code>t</code></strong>, 15 bits: a temporary address. Writes to PPUCTRL, PPUSCROLL and PPUADDR build the next value of <code>v</code> in it.',
        '<strong><code>fine x</code></strong>, 3 bits: the horizontal scroll inside a tile, 0-7.',
        '<strong><code>w</code></strong>, 1 bit: the write toggle shared by PPUSCROLL and PPUADDR (your <code>write_latch_</code>).',
      ] },
      { t: 'p', html: 'While drawing, <code>v</code> and <code>t</code> are not plain addresses but the scroll position, cut into fields that match a nametable address:' },
      { t: 'figure', html: loopyFigure, caption: 'A 15-bit scroll position. The low 12 bits, plus <code>$2000</code>, are the address of the tile in the nametables: <code>$2000 | (v &amp; $0FFF)</code>. Fine y is above them, so it does not get in the way.' },
      { t: 'table', head: ['Access', 'What changes'], rows: [
        ['PPUCTRL write', '<code>t</code> bits 10-11 = the value\'s bits 0-1 (the nametable).'],
        ['PPUSTATUS read', '<code>w = 0</code>.'],
        ['PPUSCROLL, w = 0', '<code>t</code> bits 0-4 = value &gt;&gt; 3 (coarse x); <code>fine x</code> = value &amp; 7; <code>w = 1</code>.'],
        ['PPUSCROLL, w = 1', '<code>t</code> bits 12-14 = value &amp; 7 (fine y), bits 5-9 = value &gt;&gt; 3 (coarse y); <code>w = 0</code>.'],
        ['PPUADDR, w = 0', '<code>t</code> bits 8-13 = value &amp; <code>$3F</code>, bit 14 = 0; <code>w = 1</code>.'],
        ['PPUADDR, w = 1', '<code>t</code> bits 0-7 = value; then <code>v = t</code>; <code>w = 0</code>.'],
        ['PPUDATA read or write', 'Uses <code>v</code>, then adds 1 or 32 to it.'],
      ] },
      { t: 'p', html: 'Look at the last PPUADDR row. Only that write changes <code>v</code> straight away; the others only prepare <code>t</code>. And PPUADDR and PPUSCROLL write the same bits, which is why a game always sets the scroll again after using PPUADDR.' },

      { t: 'h', text: 'How v moves while the picture is drawn' },
      { t: 'p', html: 'When rendering is on (PPUMASK bit 3 or 4), the PPU walks <code>v</code> through the nametables as it draws. Your PPU draws a whole line at dot 256, so it needs three moves:' },
      { t: 'table', head: ['When', 'What happens to v'], rows: [
        ['Dot 256 of lines 0-239 and 261', 'Down one row of pixels: fine y + 1. After fine y 7: fine y = 0 and coarse y + 1. After coarse y 29: coarse y = 0 and switch to the nametable below (flip bit 11). If coarse y was 31 (a game scrolled into the attribute rows), it wraps to 0 without switching.'],
        ['Dot 257 of the same lines', 'Back to the left edge: copy the horizontal bits from <code>t</code> (coarse x and bit 10).'],
        ['Dots 280-304 of line 261', 'Back to the top: copy the vertical bits from <code>t</code> (fine y, coarse y and bit 11).'],
      ] },
      { t: 'p', html: 'This explains how mid-frame scroll changes behave. A PPUSCROLL write during the frame changes <code>t</code>: its horizontal part reaches <code>v</code> at the next dot 257, so it takes effect a line later, and its vertical part waits for the next frame. A PPUADDR write changes <code>v</code> at once, so games that need to change the vertical scroll in the middle of the frame, like The Legend of Zelda under its status bar, write PPUADDR instead.' },
      { t: 'p', html: 'Drawing a line from <code>v</code>: start at tile <code>$2000 | (v &amp; $0FFF)</code>, row <code>fine y</code> of it, <code>fine x</code> pixels in. Move one tile right for each 8 pixels; after column 31 the next tile is column 0 of the nametable to the right (flip bit 10). The attribute byte of a tile is at <code>$23C0 | (v &amp; $0C00) | ((v &gt;&gt; 4) &amp; $38) | ((v &gt;&gt; 2) &amp; $07)</code>: the same nametable, row coarse y / 4, column coarse x / 4.' },
      { t: 'note', kind: 'nes', html: 'When the last exercise passes, try Super Mario Bros. if you have the cartridge: it is mapper 0, and your emulator now has everything it needs. The course cannot include it, so load your own dump of a cartridge you own from the Cartridge menu.' },

      { t: 'quiz', q: 'Sprite 0 is behind the background (priority 1), and its coloured pixels are over coloured background pixels. Is bit 6 set?', options: ['Yes', 'No: the sprite is not drawn there', 'Only if PPUMASK bit 2 is set'], answer: 0, explain: 'Priority decides what shows, not whether they overlap. Games use exactly this to hide sprite 0 behind the status bar.' },
      { t: 'quiz', q: 'A game writes <code>$7D</code> to PPUSCROLL (with w = 0). What are coarse x and fine x?', options: ['15 and 5', '125 and 0', '12 and 5'], answer: 0, explain: '<code>$7D</code> = 125 = 15 × 8 + 5. Coarse x is <code>125 &gt;&gt; 3</code> = 15, fine x is <code>125 &amp; 7</code> = 5.' },
      { t: 'quiz', q: 'In the middle of the frame, a game writes a new vertical scroll with two PPUSCROLL writes. When does the picture move?', options: ['On the next line', 'In the next frame', 'At once'], answer: 1, explain: 'The vertical bits go into <code>t</code>, and reach <code>v</code> only on the pre-render line. The horizontal bits are copied every line at dot 257.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-scroll-1',
        stage: 27,
        title: 'Sprite 0 hit',
        rom: 'opcode-demo.nes',
        controller: true,
        timeoutMs: 20000,
        prompt: `<p>In <code>draw_sprites</code>:</p>
<ul><li><strong>Sprite 0 hit</strong>: when the sprite being drawn is sprite 0 (<code>found[n] == 0</code>), its pixel is not see-through, the background pixel is not see-through (<code>bg_pixel[x] != 0</code>) and <code>x != 255</code>, set bit 6 of <code>status_</code>. Do it before the priority check, where the pixel has just been taken.</li>
<li><strong>Sprite overflow</strong>: if <code>sprites_on_line</code> counted more than 8 sprites and PPUMASK bit 3 or 4 is set, set bit 5 of <code>status_</code>. Do it before the check that returns when sprites are off.</li></ul>
<p>Your pre-render line already clears both bits, and the left-column rules come for free: a hidden pixel never reaches this code. Then Run and play: the status bar stays still.</p>`,
        names: ['Hit on the line where they overlap', 'No hit without overlap, or with another sprite', 'Not at x 255, not in a hidden left column', 'The bit stays until the pre-render line', 'Sprite overflow', 'The demo\'s status bar stays still'],
        hints: [
          'The pixel is taken just after <code>if (c == 0 || taken[x]) continue;</code> and <code>taken[x] = true;</code>. Sprite 0 is always first in <code>found</code> when it is on the line, so nothing can have taken its pixels before.',
          'Overflow, right after the call: <code>if ((mask_ &amp; 0x18) &amp;&amp; count &gt; 8) status_ |= 0x20;</code>',
        ],
      }),
      N.exercise({
        id: 'nes-scroll-2',
        stage: 28,
        title: 'The loopy registers',
        stdin: '2000 00\n2002\n2005 7D\n2005 5E\n2006 3D\n2006 F0\n2007 11',
        prompt: `<p>The new <code>ppu.h</code> replaces <code>vram_addr_</code>, <code>write_latch_</code>, <code>scroll_x_</code> and <code>scroll_y_</code> with the four registers: <code>std::uint16_t v_, t_;</code>, <code>std::uint8_t fine_x_;</code> and <code>bool w_;</code>. Clear them in <code>reset</code>, and make every register access follow the table in the lesson: PPUCTRL also sets <code>t_</code>'s nametable bits, PPUSTATUS clears <code>w_</code>, PPUSCROLL and PPUADDR build <code>t_</code> (and the second PPUADDR write copies it to <code>v_</code>), PPUDATA uses and moves <code>v_</code> (keep it to 15 bits: <code>&amp; 0x7FFF</code>).</p>
<p>Add the member function <code>ppu.h</code> now declares, for the tests and the monitor. It returns the four values in a small struct, <code>Ppu::ScrollRegs</code>, declared inside the class:</p>
<pre>Ppu::ScrollRegs Ppu::scroll_regs() const   // return ScrollRegs{v_, t_, fine_x_, w_};</pre>
<p>Drawing still uses the old model for now: work out <code>origin_x</code> and <code>origin_y</code> from <code>t_</code> instead of <code>scroll_x_</code>, <code>scroll_y_</code> and PPUCTRL: <code>origin_x = nametable x bit (10) × 256 + coarse x × 8 + fine_x_</code>, and <code>origin_y = nametable y bit (11) × 240 + coarse y × 8 + fine y</code>. Run takes register accesses in Program input and shows the registers after each.</p>`,
        names: ['PPUCTRL and PPUSTATUS', 'PPUSCROLL', 'PPUADDR', 'PPUDATA uses v', 'PPUSCROLL and PPUADDR share w'],
        hints: [
          'PPUSCROLL, first write: <code>t_ = static_cast&lt;std::uint16_t&gt;((t_ &amp; ~0x001F) | (value &gt;&gt; 3)); fine_x_ = value &amp; 7;</code> Second: <code>t_ = static_cast&lt;std::uint16_t&gt;((t_ &amp; ~0x73E0) | ((value &amp; 7) &lt;&lt; 12) | ((value &amp; 0xF8) &lt;&lt; 2));</code>',
          'PPUADDR, first write: <code>t_ = static_cast&lt;std::uint16_t&gt;((t_ &amp; 0x00FF) | ((value &amp; 0x3F) &lt;&lt; 8));</code> (this also clears bit 14). Second: <code>t_ = static_cast&lt;std::uint16_t&gt;((t_ &amp; 0xFF00) | value); v_ = t_;</code>',
          'PPUCTRL keeps storing <code>ctrl_</code> as before (the increment, pattern tables and NMI bits still live there) and also sets <code>t_ = static_cast&lt;std::uint16_t&gt;((t_ &amp; ~0x0C00) | ((value &amp; 3) &lt;&lt; 10));</code>',
        ],
      }),
      N.exercise({
        id: 'nes-scroll-3',
        stage: 29,
        title: 'Draw from v',
        rom: 'opcode-demo.nes',
        controller: true,
        timeoutMs: 20000,
        prompt: `<p>Now make the picture come from <code>v_</code>:</p>
<ul><li>In <code>tick</code>, when PPUMASK bit 3 or 4 is set and the scanline is 0-239 or 261: at dot 256 move <code>v_</code> down a row (write <code>void Ppu::increment_y()</code>, as the lesson describes), at dot 257 copy the horizontal bits (<code>v_ = (v_ &amp; ~0x041F) | (t_ &amp; 0x041F)</code>), and on line 261 at dots 280-304 copy the vertical bits (mask <code>0x7BE0</code>). Keep drawing the line at dot 256 before moving <code>v_</code>.</li>
<li>Change <code>draw_background</code> to the new declaration in <code>ppu.h</code>, <code>draw_background(std::uint32_t* row, std::array&lt;std::uint8_t, kPpuWidth&gt;&amp; bg_pixel)</code>: no <code>y</code>, everything comes from <code>v_</code>, <code>fine_x_</code> and PPUCTRL bit 4. Walk a copy of <code>v_</code> one tile at a time, starting <code>fine_x_</code> pixels to the left of the screen.</li></ul>
<p>The old <code>origin</code> model goes. Then Run, and load your own games: everything in mapper 0 should play.</p>`,
        names: ['Scrolling and nametables', 'Across into the next nametable', 'Down into the next nametable, and the attribute rows', 'Mid-frame scroll writes', 'A mid-frame PPUADDR write', 'The demo, scrolled'],
        hints: [
          'The loop: <code>std::uint16_t addr = v_; int x = -fine_x_; while (x &lt; kPpuWidth) { …read the tile at 0x2000 | (addr &amp; 0x0FFF), its attribute, the row fine y of it; draw its 8 pixels at x, x + 1 … skipping those below 0 or above 255; then move addr right… }</code>',
          'Moving right: <code>if ((addr &amp; 0x1F) == 31) addr = (addr &amp; ~0x1F) ^ 0x0400; else addr++;</code> The palette quarter is <code>((addr &gt;&gt; 4) &amp; 4) | (addr &amp; 2)</code>: bit 1 of coarse y, shifted into place, and bit 1 of coarse x.',
          'The tests run each picture twice: <code>v_</code> only gets its first value from <code>t_</code> on a pre-render line, so the first frame after a reset starts wherever <code>v_</code> happened to be.',
        ],
      }),
    ],
  });
})();
