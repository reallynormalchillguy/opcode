(function () {
  const N = window.NesLesson;

  Course.add({
    id: 'nes-input',
    part: 'nes',
    title: 'Controllers and the frame loop',
    summary: 'How a NES controller sends eight buttons down one wire, the registers at $4016 and $4017, and the loop that runs your console 60 times a second.',
    blocks: [
      { t: 'p', html: 'Your emulator can show a game but not play it. A NES controller has eight buttons and a cable with one data wire, so the CPU cannot read all eight at once. It asks for them one at a time.' },

      { t: 'h', text: 'Eight buttons down one wire' },
      { t: 'p', html: 'Inside the controller is one chip, a <em>shift register</em> (a 4021): eight bits in a row that can take a snapshot of the buttons, then hand them out one bit per read, moving along each time. The CPU talks to it through two addresses:' },
      { t: 'table', head: ['Address', 'Read', 'Write'], rows: [
        ['<code>$4016</code>', 'Controller 1: the next button, in bit 0.', 'Bit 0 is the <em>strobe</em>, for both controllers. While it is 1 they keep taking snapshots; when it goes back to 0 the last snapshot stays, ready to be read.'],
        ['<code>$4017</code>', 'Controller 2: the next button, in bit 0.', 'Not the controllers: this belongs to the sound chip.'],
      ] },
      { t: 'p', html: 'So a game writes 1 then 0 to <code>$4016</code>, and reads it eight times. The buttons come out in a fixed order:' },
      { t: 'table', head: ['Read', '1', '2', '3', '4', '5', '6', '7', '8'], rows: [
        ['Button', 'A', 'B', 'Select', 'Start', 'Up', 'Down', 'Left', 'Right'],
        ['<code>controller.h</code>', '<code>01</code>', '<code>02</code>', '<code>04</code>', '<code>08</code>', '<code>10</code>', '<code>20</code>', '<code>40</code>', '<code>80</code>'],
      ] },
      { t: 'p', html: 'Two details games can notice. While the strobe is 1, every read returns button A as it is right now, because the snapshot keeps being retaken. And after the eighth read, an official controller returns 1 forever, because the register fills up with 1s from behind as it shifts.' },
      { t: 'code', title: 'the demo reads controller 1 (6502)', lines: [
        ['LDA #1', ''],
        ['STA $4016', 'Strobe on: snapshot.'],
        ['LDA #0', ''],
        ['STA $4016', 'Strobe off: the snapshot stays.'],
        ['LDX #8', 'Eight buttons.'],
        ['loop: LDA $4016', 'The next button, in bit 0.'],
        ['LSR A', 'Bit 0 goes into the carry.'],
        ['ROL buttons', 'And from the carry into a byte in RAM. After eight, A is in bit 7 and Right in bit 0.'],
        ['DEX', ''],
        ['BNE loop', ''],
      ] },
      { t: 'p', html: 'Only bit 0 of the byte comes from the controller. The other bits are whatever the data bus held last, which is the <code>$40</code> of the address the CPU just sent. So a read gives <code>$40</code> or <code>$41</code>. Most games look only at bit 0, but a few check the whole byte, so your bus returns <code>0x40 | button</code>.' },

      { t: 'h', text: 'Your keyboard is controller 1' },
      { t: 'p', html: 'The page turns keys into buttons, and <code>screen_buttons()</code> hands them to your program in the same bit order as <code>controller.h</code>. Click the picture first, so the keys go to it and not to the editor.' },
      { t: 'table', head: ['Button', 'Keys'], rows: [
        ['A', '<kbd>X</kbd> or <kbd>K</kbd>'],
        ['B', '<kbd>Z</kbd> or <kbd>J</kbd>'],
        ['Select', '<kbd>Shift</kbd>'],
        ['Start', '<kbd>Enter</kbd>'],
        ['The cross', 'Arrows, or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>'],
      ] },

      { t: 'h', text: 'The frame loop' },
      { t: 'p', html: 'The course\'s <code>main.c</code> has grown three lines since lesson 18. Here is the whole loop, which is the heart of every NES emulator:' },
      { t: 'code', title: 'main.c', lines: [
        ['static void run_frame(void) {', '<code>screen_loop</code> calls this 60 times a second, until you press Stop.'],
        ['    controller_set(0, screen_buttons());', 'New: the keys held right now become controller 1\'s buttons. The game reads them whenever it likes during the frame.'],
        ['    for (long cycles = 0; cycles < 200000; ) {', 'A safety limit, in case a broken PPU never finishes a frame. A real frame is about 29,781 CPU cycles.'],
        ['        int c = cpu_step(&cpu);', 'One instruction.'],
        ['        c += bus_take_stall();', 'New since the last lesson: an OAM DMA takes 513 more cycles.'],
        ['        cycles += c;', ''],
        ['        for (int i = 0; i < 3 * c; i++) ppu_tick();', 'The PPU runs three times as fast as the CPU.'],
        ['        if (ppu_take_nmi()) cpu_nmi(&cpu);', 'The vertical blank started: the game\'s NMI code runs next.'],
        ['        if (ppu_take_frame()) break;', 'The picture is finished.'],
        ['    }', ''],
        ['    screen_show(ppu_pixels());', 'Show it.'],
        ['}', ''],
      ] },
      { t: 'p', html: 'The console and the page agree on the speed: a NES makes 60 pictures a second (60.1, to be exact), and the page calls <code>run_frame</code> 60 times a second. Each call runs exactly one frame of the console\'s time, so the game runs at its real speed as long as your computer can emulate a frame in less than a 60th of a second. A frame is about 29,781 CPU cycles (some 10,000 instructions) and 89,342 PPU dots; a modern computer does that in a few milliseconds.' },
      { t: 'note', kind: 'nes', html: 'Play the demo once the last exercise passes: walk with the arrows, jump with <kbd>X</kbd>, run with <kbd>Z</kbd> held, pause with <kbd>Enter</kbd>. Watch the chips when the level scrolls: their tops slide out of line with their bottoms. The game is waiting for something your PPU does not do yet. That is the first thing in the next lesson, and the reason Super Mario Bros. still freezes.' },

      { t: 'quiz', q: 'A game strobes and reads <code>$4016</code> three times. Which buttons has it learned about?', options: ['A, B and Select', 'Right, Left and Down', 'Only A, three times'], answer: 0, explain: 'The order is A, B, Select, Start, Up, Down, Left, Right. Three reads give the first three. (Only A three times would happen if the strobe were still 1.)' },
      { t: 'quiz', q: 'B and Up are held. The game strobes, then reads <code>$4016</code> once. What byte does it get?', options: ['<code>$00</code>', '<code>$40</code>', '<code>$41</code>'], answer: 1, explain: 'The first read is button A, which is not held: bit 0 is 0. The other bits are the <code>$40</code> left on the bus.' },
      { t: 'quiz', q: 'Why does <code>main.c</code> add <code>bus_take_stall()</code> to the cycles?', options: ['So the PPU also moves on while the CPU waits for OAM DMA', 'So the game runs faster', 'Because the CPU runs instructions during the DMA'], answer: 0, explain: 'During the 513 cycles the CPU runs nothing, but time passes for the PPU. Without them every frame with a DMA would end up 1,539 dots shorter for the game.' },
    ],

    exercises: [
      N.exercise({
        id: 'nes-input-1',
        stage: 25,
        title: 'A controller',
        rom: false,
        controller: true,
        prompt: `<p>Write <code>controller.c</code>, with the functions in <code>controller.h</code>. Keep, for each of the two controllers, the buttons held and a shift register, plus one strobe flag:</p>
<ul><li><code>controller_reset()</code>: all of it 0.</li>
<li><code>controller_set(port, buttons)</code>: store the buttons held on that controller.</li>
<li><code>controller_write(value)</code>: the strobe is bit 0. When it is 1, both shift registers take a snapshot of their held buttons.</li>
<li><code>controller_read(port)</code>: while the strobe is 1, return bit 0 of that controller's held buttons. Otherwise return bit 0 of its shift register, and shift the register right by one, putting a 1 into bit 7.</li></ul>
<p>Run opens a tester: click the picture and press keys. It reads the buttons through your code every frame, the way a game does, and draws what it got.</p>`,
        names: ['Eight buttons, then 1s', 'While the strobe is on, button A, live', 'The snapshot is taken at the strobe', 'Two controllers', 'Before any strobe'],
        hints: [
          'Use arrays of two: <code>static uint8_t held[2], shift[2];</code> and <code>static int strobe;</code>',
          'The read: <code>uint8_t bit = shift[port] &amp; 1; shift[port] = (uint8_t)((shift[port] &gt;&gt; 1) | 0x80); return bit;</code>',
        ],
      }),
      N.exercise({
        id: 'nes-input-2',
        stage: 26,
        title: 'Plug the controllers in',
        rom: 'opcode-demo.nes',
        controller: true,
        timeoutMs: 15000,
        prompt: `<p>Connect the controllers in <code>bus.c</code> (include <code>controller.h</code>):</p>
<ul><li>Reading <code>4016</code> returns <code>0x40 | controller_read(0)</code>, and <code>4017</code> returns <code>0x40 | controller_read(1)</code>.</li>
<li>Writing <code>4016</code> calls <code>controller_write(value)</code>. Writes to <code>4017</code> do nothing.</li></ul>
<p>Then Run, click the picture and play.</p>`,
        names: ['4016 reads the buttons, with 40 from the bus', '4017 is controller 2', 'Only 4016 strobes', 'The demo, played by a script'],
        hints: [
          'Both are in <code>4000</code>-<code>401F</code>, so they have to come before the cartridge case, which takes everything from <code>4020</code>.',
          '<code>if (addr == 0x4016 || addr == 0x4017) return (uint8_t)(0x40 | controller_read(addr - 0x4016));</code>',
        ],
      }),
    ],
  });
})();
