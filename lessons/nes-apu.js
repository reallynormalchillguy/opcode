(function () {
  const N = window.NesLesson;

  const lengthTable = '10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14, 12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30';

  Course.add({
    id: 'nes-apu',
    part: 'nes',
    title: 'Sound: the APU',
    summary: 'The NES\'s sound chip: two pulse channels, a triangle, noise and recorded samples, the frame counter that shapes their notes, and how the five are mixed into the sound you hear.',
    blocks: [
      { t: 'p', html: 'The last chip is not a separate chip at all: the NES\'s sound, the <em>APU</em> (audio processing unit), is built into the same Ricoh 2A03 as the CPU. It has five channels, each a tiny machine that makes one kind of sound. The game sets them up through the registers at <code>$4000</code>-<code>$4017</code> and they play on their own; a music engine typically writes a few registers once per frame, in the NMI.' },
      { t: 'p', html: 'Your APU will do what the real one does: on every CPU cycle, move each channel on and know what level it outputs. The course\'s <code>main.c</code> calls <code>apu_tick()</code> once per CPU cycle, reads the five levels with <code>apu_channel()</code>, mixes them, and turns them into 44,100 samples a second for the page to play. From the first exercise you will hear what you build.' },
      { t: 'p', html: 'The Cartridge menu now starts on <code>opcode-sound.nes</code>, which plays each channel on its own (the screen says which), then all of them together. Click Run, and turn the sound on if your computer is muted: the screen\'s bar has a sound button.' },

      { t: 'h', text: 'Pulse channels' },
      { t: 'p', html: 'Two channels make square-ish waves: the melody and harmony of most NES music. Each has four registers (pulse 2 is the same at <code>$4004</code>-<code>$4007</code>):' },
      { t: 'table', head: ['Register', 'Bits', 'Meaning'], rows: [
        ['<code>$4000</code>', '<code>DDLC VVVV</code>', 'D: duty, the shape of the wave. L: halt the length counter (and loop the envelope). C: constant volume. V: the volume (or the envelope\'s speed).'],
        ['<code>$4001</code>', '<code>EPPP NSSS</code>', 'The sweep: slides the note up or down (exercise 2).'],
        ['<code>$4002</code>', '<code>TTTT TTTT</code>', 'The period\'s low 8 bits.'],
        ['<code>$4003</code>', '<code>LLLL LTTT</code>', 'The period\'s high 3 bits, and the note\'s length: an index into a table. Writing it also restarts the wave.'],
      ] },
      { t: 'p', html: 'The <em>period</em> is how long each step of the wave lasts. A pulse channel\'s timer counts down once every 2 CPU cycles (an <em>APU cycle</em>); when it reaches 0 it reloads the period and the wave moves one step on. The wave has 8 steps, so one cycle of it takes <code>(period + 1) × 16</code> CPU cycles, and the note is <code>1789773 / (16 × (period + 1))</code> Hz. A period of 253 is 440 Hz, the A above middle C.' },
      { t: 'p', html: 'The duty picks which of the 8 steps are high:' },
      { t: 'code', title: 'apu.c, the four waves', lines: [
        ['static const uint8_t DUTY[4][8] = {', ''],
        ['    { 0, 1, 0, 0, 0, 0, 0, 0 },', '12.5%: thin and buzzy.'],
        ['    { 0, 1, 1, 0, 0, 0, 0, 0 },', '25%: the classic NES lead.'],
        ['    { 0, 1, 1, 1, 1, 0, 0, 0 },', '50%: a true square wave, round and hollow.'],
        ['    { 1, 0, 0, 1, 1, 1, 1, 1 },', '75%: the 25% wave upside down, which sounds the same.'],
        ['};', ''],
      ] },
      { t: 'p', html: 'A channel outputs its volume (0-15) when the current step is 1, and 0 otherwise. It is also silent when its <em>length counter</em> is 0, and when its period is below 8 (too high a note: the real chip silences it).' },
      { t: 'p', html: 'The length counter is how a note ends by itself. Writing <code>$4003</code> loads it from a table with the top 5 bits as the index:' },
      { t: 'code', title: 'apu.c', lines: [
        [`static const uint8_t LENGTHS[32] = { ${lengthTable} };`, 'In half frames (about 1/120 s each). Index 1 is 254: almost endless; games that end their notes themselves use that, or halt the counter.'],
      ] },
      { t: 'p', html: '<code>$4015</code> switches the channels on and off: bit 0 pulse 1, bit 1 pulse 2, bit 2 triangle, bit 3 noise, bit 4 DMC. A channel that is off has its length counter set to 0, and a write to <code>$4003</code> only loads the length while the channel is on. Reading <code>$4015</code> tells the game which length counters are above 0.' },

      { t: 'h', text: 'The frame counter' },
      { t: 'p', html: 'The APU has its own slow clock, the <em>frame counter</em>, that shapes notes over time. It counts CPU cycles and, at fixed points, sends <em>quarter frame</em> and <em>half frame</em> clocks to the channels:' },
      { t: 'table', head: ['CPU cycles (4-step mode)', 'What happens'], rows: [
        ['7457', 'Quarter frame: envelopes (and the triangle\'s linear counter).'],
        ['14913', 'Quarter and half frame: also length counters and sweeps.'],
        ['22371', 'Quarter frame.'],
        ['29829', 'Quarter and half frame, and the frame IRQ (unless <code>$4017</code> bit 6 inhibits it). At 29830 the count starts again.'],
      ] },
      { t: 'p', html: 'Writing <code>$4017</code> restarts the count. Bit 7 picks the 5-step mode instead: no IRQ, a half frame at 37281, a sequence 37282 cycles long, and an immediate quarter and half frame when the write happens. Bit 6 inhibits (and clears) the frame IRQ; reading <code>$4015</code> also clears it, and shows it in bit 6.' },
      { t: 'p', html: '<strong>Envelopes</strong> turn a fixed volume into a note that fades. With C clear, the volume is a <em>decay level</em>: a write to the 4th register restarts it at 15, and every V + 1 quarter frames it goes down by one, to 0 (or back to 15, if L is set). <strong>Sweeps</strong> slide the pitch: every P + 1 half frames, the period changes by <code>period &gt;&gt; S</code>, down if N is set (a higher note), up otherwise. Pulse 1 subtracts one more than pulse 2 when it goes down, a quirk of how the two were wired. Whatever the sweep is doing, a channel whose next period would be above <code>$7FF</code> is silent.' },

      { t: 'h', text: 'Triangle and noise' },
      { t: 'p', html: 'The <strong>triangle</strong> (<code>$4008</code>-<code>$400B</code>) plays a 32-step staircase from 15 down to 0 and back up, the soft sound of NES bass lines. It has no volume control at all: it is either playing or holding still. Its timer runs at the full CPU speed, so its note is <code>1789773 / (32 × (period + 1))</code> Hz, an octave below a pulse channel with the same period. Besides the length counter it has a <em>linear counter</em> (<code>$4008</code> bits 0-6), counted down on quarter frames, for finer note lengths. The step only moves while both counters are above 0.' },
      { t: 'p', html: 'The <strong>noise</strong> channel (<code>$400C</code>-<code>$400F</code>) is a random number generator: a 15-bit shift register. On each step, bit 0 is XORed with bit 1 (or bit 6, in the short mode set by <code>$400E</code> bit 7), the register shifts right, and the result goes into bit 14. The channel outputs its volume when bit 0 is 0. Its speed is one of 16 periods from a table, from 4 CPU cycles (a hiss) to 4068 (a rumble), and it has an envelope and a length counter like the pulses. Drums, explosions, wind.' },

      { t: 'h', text: 'The DMC: recorded sound' },
      { t: 'p', html: 'The fifth channel plays samples stored in the cartridge: drums, voices. Each byte holds 8 one-bit steps, played lowest bit first: a 1 moves the output level (0-127) up by 2, a 0 moves it down by 2. This is <em>delta modulation</em>, and it is why NES voices sound gritty.' },
      { t: 'table', head: ['Register', 'Meaning'], rows: [
        ['<code>$4010</code>', 'Bit 7: IRQ at the end of the sample. Bit 6: loop. Bits 0-3: the speed, one of 16 rates from 428 CPU cycles per bit down to 54.'],
        ['<code>$4011</code>', 'Set the output level directly (some games play sound by writing this very fast).'],
        ['<code>$4012</code>', 'The sample\'s address: <code>$C000 + value × 64</code>.'],
        ['<code>$4013</code>', 'Its length: <code>value × 16 + 1</code> bytes.'],
      ] },
      { t: 'p', html: 'Writing <code>$4015</code> with bit 4 set starts the sample (if it is not already playing); bit 4 clear stops it. The DMC is two machines: a <em>memory reader</em> that keeps a one-byte buffer filled, reading the cartridge through <code>bus_read</code>, and an <em>output unit</em> that plays a byte bit by bit and takes the next one from the buffer. On the real console the reader pauses the CPU for a few cycles each time; your emulator leaves that out, as almost no game depends on it.' },

      { t: 'h', text: 'Mixing' },
      { t: 'p', html: 'The NES does not add its channels up: it joins them through resistors, which makes louder channels count for a bit less. The course\'s <code>main.c</code> uses the formulas worked out from the circuit:' },
      { t: 'code', title: 'main.c, the mixer', lines: [
        ['int p = apu_channel(0) + apu_channel(1);', 'The two pulses share one output.'],
        ['float pulse = p ? 95.88f / (8128.0f / p + 100.0f) : 0;', 'At most 0.26.'],
        ['float tnd = 159.79f / (1.0f / (t / 8227.0f + n / 12241.0f + d / 22638.0f) + 100.0f);', 'Triangle, noise and DMC share the other. At most 0.74.'],
        ['return pulse + tnd;', 'The level, 0 to about 1.'],
      ] },
      { t: 'p', html: 'That gives one level per CPU cycle: 1.79 million a second, far more than a sound card wants. <code>main.c</code> averages them in groups of about 40.5 cycles, which gives 735 samples per frame and 44,100 per second at 60 frames a second, and removes the constant part of the signal (the real console has a capacitor that does the same), so a silent channel that holds a level does not push the speaker out. Then <code>screen_audio()</code> sends the frame\'s samples to the page, which plays them a few frames behind, so that small delays do not cause gaps.' },
      { t: 'note', kind: 'nes', html: 'When the last exercise passes, your NES is complete: CPU, picture, sprites, controllers, scrolling, mappers 0-4 and sound. Load your own cartridges and listen.' },

      { t: 'quiz', q: 'Pulse 1 has period 126. What note does it play?', options: ['About 880 Hz', 'About 440 Hz', 'About 1760 Hz'], answer: 0, explain: '<code>1789773 / (16 × 127)</code> ≈ 880.8 Hz: the A one octave above the 440 Hz of period 253.' },
      { t: 'quiz', q: 'The triangle and pulse 1 both have period 253. How do their notes compare?', options: ['The triangle is an octave lower', 'They are the same note', 'The triangle is an octave higher'], answer: 0, explain: 'The triangle\'s timer runs every CPU cycle but its wave has 32 steps: <code>32 × 254</code> cycles per wave, twice the pulse\'s <code>16 × 254</code>. Half the frequency: an octave lower.' },
      { t: 'quiz', q: 'A game writes <code>$4013</code> = 2 and <code>$4012</code> = 4. Which bytes does the DMC play?', options: ['33 bytes from <code>$C100</code>', '2 bytes from <code>$C004</code>', '32 bytes from <code>$C040</code>'], answer: 0, explain: 'Length <code>2 × 16 + 1</code> = 33 bytes, from <code>$C000 + 4 × 64</code> = <code>$C100</code>.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-apu-1',
        stage: 35,
        title: 'Two pulse channels',
        rom: 'opcode-sound.nes',
        timeoutMs: 15000,
        prompt: `<p>Start <code>apu.c</code> with the functions in <code>apu.h</code>, for the two pulse channels only (no envelope, sweep or frame counter yet):</p>
<ul><li>For each channel keep: enabled, duty, step (0-7), period (11 bits), timer, length, halt and volume. <code>apu_reset</code> clears everything.</li>
<li><code>apu_write</code>: <code>$4000</code>/<code>$4004</code> set duty (bits 6-7), halt (bit 5) and volume (bits 0-3); <code>$4002</code>/<code>$4006</code> the period's low byte; <code>$4003</code>/<code>$4007</code> its high 3 bits, the length from <code>LENGTHS[value &gt;&gt; 3]</code> if the channel is enabled, and step = 0. <code>$4015</code>: bits 0 and 1 enable the pulses; a disabled channel's length becomes 0.</li>
<li><code>apu_tick</code>: count CPU cycles; on every other one (the 1st, 3rd, 5th…), each pulse's timer: at 0, reload the period and move the step on (<code>(step + 1) &amp; 7</code>), otherwise count down.</li>
<li><code>apu_channel(0 or 1)</code>: 0 if the length is 0, the period is below 8, or <code>DUTY[duty][step]</code> is 0; otherwise the volume. Other channels: 0.</li>
<li><code>apu_read_status</code>: bit 0 if pulse 1's length is above 0, bit 1 for pulse 2.</li></ul>
<p>And in <code>bus.c</code> (include <code>apu.h</code>): writes to <code>$4000</code>-<code>$4013</code>, <code>$4015</code> and <code>$4017</code> go to <code>apu_write</code>; reading <code>$4015</code> returns <code>apu_read_status()</code>. Run: the first two parts of the song play.</p>`,
        names: ['The period sets the note, the volume the loudness', 'The four duties', '4015 and the length counter', 'Too high a note is silent', 'Pulse 2, through the bus'],
        hints: [
          'Keep the two channels in an array of structs, <code>static Pulse pulse[2];</code>, so <code>$4000</code>-<code>$4003</code> and <code>$4004</code>-<code>$4007</code> share one function: the channel is <code>(addr &gt;&gt; 2) &amp; 1</code> and the register <code>addr &amp; 3</code>.',
          'The 1st, 3rd, 5th… cycle: keep a <code>long cycle</code>, add 1 at the start of <code>apu_tick</code>, and clock the pulses when <code>cycle &amp; 1</code>.',
          'In <code>bus.c</code>, <code>$4014</code> (OAM DMA) and <code>$4016</code> (the controllers) already have their cases: put the APU\'s after them, and before the cartridge.',
        ],
      }),
      N.exercise({
        id: 'nes-apu-2',
        stage: 36,
        title: 'The frame counter: envelopes, lengths and sweeps',
        rom: 'opcode-sound.nes',
        timeoutMs: 15000,
        prompt: `<p>Give the APU its frame counter:</p>
<ul><li>In <code>apu_tick</code>, count cycles (1 on the first tick after a reset or a <code>$4017</code> write). 4-step mode: a quarter frame at 7457 and 22371, quarter and half frame at 14913 and 29829, where the frame IRQ flag is also set unless inhibited; back to 0 at 29830. 5-step mode: the same but nothing at 29829, quarter and half frame at 37281, back to 0 at 37282.</li>
<li><code>$4017</code>: bit 7 the mode, bit 6 inhibit (which clears the flag); restart the count; in 5-step mode, a quarter and half frame at once. Reading <code>$4015</code> shows the flag in bit 6 and clears it. <code>int apu_irq(void)</code> returns the flag.</li>
<li>Half frames: each pulse's length counter counts down to 0 unless halted, then its sweep. Quarter frames: each pulse's envelope.</li>
<li>Envelopes and sweeps as the lesson describes. <code>$4000</code> now sets the envelope (loop = bit 5, constant = bit 4, period = bits 0-3), <code>$4003</code> restarts it, <code>$4001</code> sets the sweep (enabled, period, negate, shift) and asks it to reload. The volume comes from the envelope, and a pulse is also silent when the sweep's target is above <code>$7FF</code>.</li></ul>`,
        names: ['Length counters end notes', 'Envelopes fade and loop', 'Sweeps, and silence above 7FF', 'The frame IRQ', '5-step mode clocks at once'],
        hints: [
          'Envelope, on a quarter frame: <code>if (start) { start = 0; decay = 15; divider = period; } else if (divider &gt; 0) divider--; else { divider = period; if (decay &gt; 0) decay--; else if (loop) decay = 15; }</code>',
          'Sweep target: <code>change = period &gt;&gt; shift</code>; up is <code>period + change</code>, down is <code>period - change</code>, and pulse 1 subtracts 1 more. On a half frame: if the divider is 0, the sweep enabled, the shift above 0 and the channel not silent, set the period to the target; then if the divider is 0 or a reload was asked, divider = P (and clear the reload), else count it down.',
          'The flags of a pulse register can be stored twice: <code>halt</code> and the envelope\'s <code>loop</code> are the same bit 5.',
        ],
      }),
      N.exercise({
        id: 'nes-apu-3',
        stage: 37,
        title: 'Triangle and noise',
        rom: 'opcode-sound.nes',
        timeoutMs: 15000,
        prompt: `<p>Add channels 2 and 3:</p>
<ul><li><strong>Triangle</strong>, <code>$4008</code>: control (bit 7, which also halts the length counter) and the linear counter's reload value (bits 0-6). <code>$400A</code>/<code>$400B</code>: the period as for the pulses; <code>$400B</code> also loads the length (if enabled) and sets the linear counter's reload flag. Its timer counts every CPU cycle; at 0 it reloads and moves the step (0-31) on, but only while the length and the linear counter are both above 0. Output: the 32-step table, 15 down to 0, 0 up to 15 (7 if the period is below 2, too high to hear).</li>
<li>The linear counter, on quarter frames: if the reload flag is set, load it, otherwise count down to 0; then if control is clear, clear the reload flag.</li>
<li><strong>Noise</strong>, <code>$400C</code>: halt, constant and volume like <code>$4000</code> (an envelope). <code>$400E</code>: mode (bit 7) and the period from the table (bits 0-3). <code>$400F</code>: the length (if enabled) and the envelope's restart. Every <code>period</code> CPU cycles, step the shift register (it starts at 1). Output: 0 if bit 0 is 1 or the length is 0, otherwise the envelope's volume.</li>
<li><code>$4015</code> bits 2 and 3 enable them; status bits 2 and 3 report their lengths. Half frames count both lengths down; quarter frames clock the noise's envelope and the linear counter.</li></ul>`,
        names: ['The triangle\'s staircase and its note', 'The linear counter stops it', 'Noise, in both modes', 'Status, and the noise envelope'],
        hints: [
          'Noise periods: <code>4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068</code>. Count the timer down from <code>period - 1</code> so a step comes every <code>period</code> cycles.',
          'One noise step: <code>int other = mode ? 6 : 1; int feedback = (shift ^ (shift &gt;&gt; other)) &amp; 1; shift = (shift &gt;&gt; 1) | (feedback &lt;&lt; 14);</code>',
          'Reuse the pulse channels\' envelope code for the noise: a struct with the envelope\'s fields, and functions that take a pointer to it.',
        ],
      }),
      N.exercise({
        id: 'nes-apu-4',
        stage: 38,
        title: 'The DMC',
        rom: 'opcode-sound.nes',
        timeoutMs: 20000,
        prompt: `<p>The last channel, 4 (include <code>bus.h</code>: it reads the cartridge):</p>
<ul><li><code>$4010</code>: IRQ enabled (bit 7; clearing it also clears the DMC's IRQ flag), loop (bit 6), rate (bits 0-3, from the table in the hint). <code>$4011</code>: the level = bits 0-6. <code>$4012</code>: start = <code>$C000 + value × 64</code>. <code>$4013</code>: length = <code>value × 16 + 1</code>.</li>
<li><code>$4015</code> bit 4: if clear, no bytes remain; if set and none remain, restart (address = start, remaining = length). Any <code>$4015</code> write clears the DMC's IRQ flag.</li>
<li>Every CPU cycle, the memory reader: if the buffer is empty and bytes remain, read <code>bus_read(address)</code> into it, move the address on (after <code>$FFFF</code> comes <code>$8000</code>), and count down; at 0, restart if looping, otherwise set the IRQ flag if enabled.</li>
<li>Then the output unit, every <code>rate</code> cycles: unless silent, bit 0 of the shift register moves the level up 2 (if at most 125) or down 2 (if at least 2); shift right; after 8 bits, take the buffer's byte into the shift register if there is one (and stop being silent), or become silent. Start with 8 bits to go, silent.</li>
<li><code>apu_channel(4)</code> is the level; status bit 4 is "bytes remain", bit 7 the DMC's IRQ flag; <code>apu_irq()</code> includes it.</li></ul>
<p>Run: the whole song, the recorded kick drum included.</p>`,
        names: ['4011 sets the level', 'Playing bits from the cartridge', 'The end: IRQ, looping and stopping', 'The whole song'],
        hints: [
          'Rates: <code>428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54</code>. As with the noise, count the timer down from <code>rate - 1</code>.',
          'The order in a tick matters for the tests: first the memory reader, then the output unit.',
        ],
      }),
    ],
  });
})();
