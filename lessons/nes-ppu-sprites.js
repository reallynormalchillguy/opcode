(function () {
  const N = window.NesLesson;

  const oamFigure = `<div class="byte-row">
  <div class="byte-cell"><b>byte 0</b><span>Y</span><small>top edge − 1</small></div>
  <div class="byte-cell"><b>byte 1</b><span>tile</span><small>which tile</small></div>
  <div class="byte-cell"><b>byte 2</b><span>attributes</span><small>palette, flips, priority</small></div>
  <div class="byte-cell"><b>byte 3</b><span>X</span><small>left edge</small></div>
</div>`;

  Course.add({
    id: 'nes-ppu-sprites',
    part: 'nes',
    title: 'Sprites',
    summary: 'Sprite memory and OAM DMA, which sprites are on each scanline, and drawing them over the background with flips, priority and 8 × 16 sprites.',
    blocks: [
      { t: 'p', html: 'The background is a grid: every tile sits on an 8-pixel boundary and moves only when the whole screen scrolls. Anything that moves on its own, like a character, a bullet or a coin, is a <em>sprite</em>: a tile the PPU draws at any pixel position, over or behind the background. The PPU keeps 64 of them.' },
      { t: 'p', html: 'From this lesson on, the Cartridge menu starts on <code>opcode-demo.nes</code>, a small game made for this course: a robot that walks and jumps through a two-screen level, collecting bytes. Its source is in the course\'s repository (<code>tools/demo</code>). You will see it come to life one piece at a time.' },

      { t: 'h', text: 'Sprite memory: OAM' },
      { t: 'p', html: 'The 256 bytes you stored through OAMDATA last lesson are the sprites: <em>object attribute memory</em>, 64 sprites of 4 bytes each. Sprite <code>n</code> is bytes <code>n × 4</code> to <code>n × 4 + 3</code>:' },
      { t: 'figure', html: oamFigure, caption: 'One sprite. Y is one less than the first line it appears on: a sprite with Y = 99 is drawn from scanline 100. A Y of <code>EF</code> or more puts it below the picture, which is how games hide the sprites they do not use.' },
      { t: 'table', head: ['Attribute bits', 'Meaning'], rows: [
        ['0-1', 'Which sprite palette: 4 to 7, at <code>$3F10</code>-<code>$3F1F</code>. Colour 0 of a sprite is always see-through.'],
        ['5', 'Priority: 0 in front of the background, 1 behind it (the sprite only shows where the background is see-through, colour 0).'],
        ['6', 'Flip horizontally: draw the tile\'s row right to left.'],
        ['7', 'Flip vertically: draw the tile\'s rows bottom to top.'],
        ['2-4', 'Unused.'],
      ] },
      { t: 'p', html: 'Flips save tiles: the demo\'s robot has tiles for facing right only. To face left it draws the same tiles with bit 6 set, and swaps the left and right halves.' },

      { t: 'h', text: 'OAM DMA: 256 bytes in one write' },
      { t: 'p', html: 'Writing 256 bytes through OAMDATA would take the CPU more than 2,000 cycles, nearly the whole vertical blank. So games keep a copy of the sprites in RAM, usually at <code>$0200</code>-<code>$02FF</code>, change it during the frame, and in the NMI write the page number to <code>$4014</code>:' },
      { t: 'code', title: 'the demo\'s NMI, in 6502 assembly', lines: [
        ['LDA #$00', ''],
        ['STA $2003', 'OAMADDR = 0: the copy starts at sprite 0.'],
        ['LDA #$02', 'The page: <code>$0200</code>-<code>$02FF</code>.'],
        ['STA $4014', 'OAMDMA. The console copies <code>$0200</code>, <code>$0201</code> … <code>$02FF</code> into OAMDATA, one byte after another.'],
      ] },
      { t: 'p', html: 'The copy is done by the CPU chip itself, but not by your <code>cpu_step</code>: the processor stops running instructions for 513 cycles while it moves the bytes. Your bus does the copy at once and remembers the 513 cycles, and the course\'s <code>main.c</code> asks for them with <code>bus_take_stall()</code> and ticks the PPU for them too, so the frame keeps its length.' },

      { t: 'h', text: 'Eight sprites per scanline' },
      { t: 'p', html: 'Before drawing each scanline, the PPU looks through all 64 sprites in order and picks the ones that cover that line. It has room for only eight: the ninth and later are left out of that line. When too many sprites share a line, games change the order of their sprites every frame, so each one is missing only some of the time. That is the flicker you see in busy NES games.' },
      { t: 'p', html: 'A sprite covers the 8 lines from <code>Y + 1</code>, or 16 lines when PPUCTRL bit 5 is set. In 8 × 16 mode, the tile byte works differently: bit 0 picks the pattern table (<code>$0000</code> or <code>$1000</code>), and the sprite is the even tile <code>tile &amp; $FE</code> on top of the next one. A vertical flip flips the whole 16 lines, so the bottom tile goes on top.' },

      { t: 'h', text: 'Who wins a pixel' },
      { t: 'p', html: 'On each pixel of the line, the PPU decides in two steps:' },
      { t: 'list', items: [
        'Among the sprites on that line, the one with the <strong>lowest number</strong> that has a non-transparent pixel there takes it. The others are not drawn at that pixel, whatever their priority.',
        'That sprite pixel is drawn if its priority bit is 0, or if the background pixel is see-through (colour 0). Otherwise the background shows.',
      ] },
      { t: 'p', html: 'The order of the steps has an odd effect, which a few games use on purpose: a lower-numbered sprite that is behind the background still hides the higher-numbered sprites at that pixel, even ones that are in front. An invisible sprite can cut a piece out of the sprites after it.' },
      { t: 'code', title: 'ppu.c, the sprite part of a scanline (outline)', lines: [
        ['int count = ppu_sprites_on_line(y, found);', 'Which sprites, in order, up to 8.'],
        ['uint8_t taken[256] = { 0 };', 'Marks the pixels a sprite has already won.'],
        ['for each sprite n in found:', 'Lowest number first.'],
        ['    row_in = y - (Y + 1);  /* flipped V: height - 1 - row_in */', 'Which row of the tile this line shows.'],
        ['    ppu_tile_row(table, tile, row_in, colours);', 'Your function from lesson 17.'],
        ['    for i in 0..7: x = X + i; c = colours[flip H ? 7 - i : i];', ''],
        ['        if (c == 0 || taken[x]) continue;  taken[x] = 1;', 'See-through, or a lower sprite was here first.'],
        ['        if (behind && bg_pixel[x] != 0) continue;', 'The background covers it.'],
        ['        row[x] = colour from palette 4-7;', '<code>ppu_read(0x3F10 + palette * 4 + c)</code>'],
      ] },
      { t: 'p', html: 'For the second step the sprites need to know which background pixels were see-through. So the background drawing changes a little: it also fills an array <code>bg_pixel</code> with the colour number (0-3) of each pixel it draws, 0 where the background is off or hidden.' },
      { t: 'note', html: 'One more rule, from PPUMASK: sprites are hidden in the leftmost 8 pixels unless bit 2 is set, just as bit 1 does for the background. Games hide that column while they redraw it, so things do not pop in at the edge.' },

      { t: 'quiz', q: 'A sprite has Y = <code>$20</code> and the PPU makes 8 × 8 sprites. Which scanlines show it?', options: ['32 to 39', '33 to 40', '31 to 38'], answer: 1, explain: '<code>$20</code> is 32. A sprite starts one line below its Y, so 33, and covers 8 lines: 33 to 40.' },
      { t: 'quiz', q: 'In 8 × 16 mode, a sprite uses tile <code>$15</code>. What does it show?', options: ['Tiles <code>$15</code> and <code>$16</code> from <code>$0000</code>', 'Tiles <code>$14</code> and <code>$15</code> from <code>$1000</code>', 'Tiles <code>$14</code> and <code>$15</code> from <code>$0000</code>'], answer: 1, explain: 'Bit 0 is 1, so the pattern table is <code>$1000</code>; the top tile is <code>$15 &amp; $FE</code> = <code>$14</code>, and the bottom one <code>$15</code>.' },
      { t: 'quiz', q: 'Sprite 3 (behind the background) and sprite 7 (in front) both have a coloured pixel at x = 50, where the background is also coloured. What shows?', options: ['Sprite 7', 'The background', 'Sprite 3'], answer: 1, explain: 'Sprite 3 has the lower number, so it takes the pixel; it is behind a coloured background, so the background shows. Sprite 7 never gets a chance.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-ppu-sprites-1',
        stage: 22,
        title: 'OAM DMA',
        rom: 'opcode-demo.nes',
        stdin: '60',
        prompt: `<p>In <code>bus.c</code>, make a write to <code>4014</code> copy a page of memory to the sprites: for <code>i</code> from 0 to 255, read <code>bus_read(value * 256 + i)</code> and write it to OAMDATA with <code>ppu_register_write(4, ...)</code>. Starting at the current OAMADDR and moving it on is OAMDATA's own job.</p>
<p>Keep a private <code>stall</code> count of CPU cycles: each DMA adds 513 to it, <code>bus_reset</code> sets it to 0, and the new function in <code>bus.h</code> hands it over:</p>
<pre>int bus_take_stall(void)   // return stall, then set it to 0</pre>
<p>Run shows the sprites the demo has put in OAM after 60 frames (Program input). They are not on the picture yet: that is the next two exercises.</p>`,
        names: ['A DMA copies the page', 'The stall, once', 'DMA starts at OAMADDR', 'Pages in the cartridge and in mirrored RAM', 'The demo\'s sprites after 60 frames'],
        hints: [
          'Put the new case next to the PPU one in <code>bus_write</code>: <code>} else if (addr == 0x4014) {</code>. It has to come before the cartridge case, which takes everything from <code>4020</code>.',
          'Build the address as a <code>uint16_t</code>: <code>(uint16_t)(value &lt;&lt; 8 | i)</code>. Going through <code>bus_read</code> means a page in RAM, its mirrors or the cartridge all work.',
        ],
      }),
      N.exercise({
        id: 'nes-ppu-sprites-2',
        stage: 23,
        title: 'Which sprites are on a line',
        rom: 'opcode-demo.nes',
        stdin: '60',
        prompt: `<p>Write the function <code>ppu.h</code> now declares:</p>
<pre>int ppu_sprites_on_line(int y, uint8_t found[8])</pre>
<p>Go through sprites 0 to 63. A sprite is on line <code>y</code> when <code>y</code> is between <code>Y + 1</code> and <code>Y + height</code>, where <code>height</code> is 16 if PPUCTRL bit 5 is set, otherwise 8. Put the numbers of the first eight you find into <code>found</code>, in order, and return how many you found in all (so it can be more than 8).</p>
<p>Run lists, line by line, what your function says about the demo's screen: the robot is four sprites, two on each of its lines.</p>`,
        names: ['A sprite covers 8 lines from Y + 1', '8 × 16 sprites cover 16', 'Only the first eight are listed, all are counted', 'Y from EF up is off screen', 'The demo\'s sprites, line by line'],
        hints: [
          'Y is <code>oam[i * 4]</code>. Compute <code>int top = oam[i * 4] + 1;</code> as an <code>int</code>, so a Y of <code>FF</code> gives 256 and never matches a line.',
          'Count every match, but only store while <code>count &lt; 8</code>: <code>if (count &lt; 8) found[count] = i; count++;</code>',
        ],
      }),
      N.exercise({
        id: 'nes-ppu-sprites-3',
        stage: 24,
        title: 'Draw the sprites',
        rom: 'opcode-demo.nes',
        timeoutMs: 15000,
        prompt: `<p>Split <code>render_scanline</code> in two:</p>
<ul><li><code>static void draw_background(int y, uint32_t *row, uint8_t bg_pixel[256])</code>: your background code, which now also stores each pixel's colour number in <code>bg_pixel[x]</code> (0 for the backdrop, a hidden left column, or the background turned off).</li>
<li><code>static void draw_sprites(int y, uint32_t *row, const uint8_t bg_pixel[256])</code>: if PPUMASK bit 4 is set, draw the sprites on line <code>y</code> over <code>row</code>, as the lesson describes: lowest number first, a pixel already taken by a sprite stays taken, colour 0 is see-through, flips (bits 6 and 7), priority (bit 5), palettes 4-7, 8 × 16 sprites (PPUCTRL bit 5), the pattern table from PPUCTRL bit 3 for 8 × 8 sprites, and no sprite pixels at <code>x &lt; 8</code> unless PPUMASK bit 2 is set.</li></ul>
<p>Then <code>render_scanline(y)</code> calls both, with a <code>uint8_t bg_pixel[256]</code> of its own. Press Run: the robot, the bytes and a drone appear. The drone flies behind the bushes.</p>`,
        names: ['Two sprites over the backdrop', 'Flipped sprites', 'Priority, and the lowest number wins', '8 × 16 sprites', 'The left column and sprites off', 'Eight sprites on a line, no more', 'The demo\'s picture after 90 frames'],
        hints: [
          'The sprite\'s 4 bytes: <code>const uint8_t *s = &amp;oam[found[n] * 4];</code> then <code>s[0]</code> Y, <code>s[1]</code> tile, <code>s[2]</code> attributes, <code>s[3]</code> X. Its pixels run from <code>x = s[3]</code> to <code>s[3] + 7</code>; stop at 255.',
          'Flip vertically by changing the row: <code>row_in = height - 1 - row_in</code>. For 8 × 16, do that first, then pick the tile: <code>tile &amp; 0xFE</code>, plus 1 if <code>row_in &gt;= 8</code> (and then <code>row_in -= 8</code>).',
          'Behind the background: <code>if ((attr &amp; 0x20) &amp;&amp; bg_pixel[x] != 0) continue;</code> but only after marking <code>taken[x] = 1</code>, so the lower sprite still hides the ones after it.',
        ],
      }),
    ],
  });
})();
