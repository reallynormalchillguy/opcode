(() => {
const R = String.raw;

Course.add({
  id: 'cpp-functions',
  part: 'cpp',
  title: 'Functions',
  summary: 'Naming a piece of work so you can use it again: parameters, return values, scope, declarations and overloading.',
  blocks: [
    { t: 'p', html: 'Every program so far lived inside <code>main</code>. That works for twenty lines; it does not work for an emulator with thousands. A <em>function</em> is a named piece of work. You write it once, give it inputs, and it hands back a result. <code>main</code> is itself a function, and you have already used others that someone else wrote.' },

    { t: 'h', text: 'Writing and calling a function' },
    { t: 'code', title: 'square.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int square(int n) {', 'A <em>definition</em>: the return type (<code>int</code>), the name (<code>square</code>), and the <em>parameters</em> in parentheses. Here there is one parameter, an <code>int</code> called <code>n</code>.'],
      ['    return n * n;', '<code>return</code> ends the function and hands this value back to whoever called it.'],
      ['}'],
      [''],
      ['int main() {'],
      ['    int a = square(4);', 'A <em>call</em>. The value 4 is the <em>argument</em>: it is copied into the parameter <code>n</code>, the body runs, and the returned 16 is stored in <code>a</code>.'],
      [R`    std::cout << a << "\n";`],
      [R`    std::cout << square(a) + square(2) << "\n";`, 'A call is an expression, so it can go anywhere a value can: inside another expression, or as an argument to another function.'],
      ['}'],
    ] },
    { t: 'p', html: 'A function can take several parameters, separated by commas, and the arguments are matched to them in order. A function that returns nothing has the return type <code>void</code>; it can still use a bare <code>return;</code> to stop early.' },
    { t: 'code', title: 'banner.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['void print_line(char c, int length) {', 'Two parameters of different types. <code>void</code> means this function does its job (printing) and gives back no value.'],
      ['    for (int i = 0; i < length; i++) {'],
      ['        std::cout << c;'],
      ['    }'],
      [R`    std::cout << "\n";`],
      ['}'],
      [''],
      ['int main() {'],
      ['    print_line(\'=\', 12);', 'Arguments in the same order as the parameters: first the character, then the length.'],
      [R`    std::cout << "  PLAYER 1\n";`],
      ['    print_line(\'-\', 12);'],
      ['}'],
    ] },

    { t: 'h', text: 'Arguments are copies' },
    { t: 'p', html: 'When you call a function, each argument is <em>copied</em> into its parameter. The function works on its copy. Changing the parameter does not change the caller\'s variable:' },
    { t: 'code', title: 'copies.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['void lose_life(int lives) {'],
      ['    lives = lives - 1;', 'This changes the local copy only. It disappears when the function returns.'],
      [R`    std::cout << "inside: " << lives << "\n";`],
      ['}'],
      [''],
      ['int main() {'],
      ['    int lives = 3;'],
      ['    lose_life(lives);'],
      [R`    std::cout << "outside: " << lives << "\n";`, 'Still 3. The two variables called <code>lives</code> are different boxes that happen to share a name.'],
      ['}'],
    ] },
    { t: 'p', html: 'The simple fix is to return the new value: <code>lives = lose_life(lives);</code>. When a function needs to change the caller\'s variable directly, C++ lets you pass a <em>reference</em> instead of a copy. That is lesson 7.' },

    { t: 'h', text: 'Scope: where a name exists' },
    { t: 'p', html: 'A variable declared inside a pair of braces exists only inside those braces, from its declaration to the closing <code>}</code>. This is its <em>scope</em>. Parameters are in scope for the whole function body. Two functions can each have a variable called <code>i</code> without interfering.' },
    { t: 'p', html: 'A variable declared outside every function is a <em>global</em>: every function in the file can see and change it. Globals are tempting and make programs hard to follow, because any function might be the one that changed the value. Pass values in and return results instead. In lesson 8 you will learn a much better home for state that several functions share: a class.' },

    { t: 'h', text: 'Declare before you use' },
    { t: 'p', html: 'The compiler reads your file from top to bottom. To compile a call, it must already know the function\'s name, parameter types and return type. If <code>main</code> comes first and calls a function defined further down, you add a <em>declaration</em> (also called a prototype) at the top: the first line of the function with a semicolon instead of a body.' },
    { t: 'code', title: 'prototype.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int larger(int a, int b);', 'A declaration: it promises that a function with this exact shape exists somewhere. The body comes later.'],
      [''],
      ['int main() {'],
      [R`    std::cout << larger(7, 12) << "\n";`, 'This call compiles because of the declaration above, even though the definition is further down.'],
      ['}'],
      [''],
      ['int larger(int a, int b) {', 'The definition must match the declaration.'],
      ['    if (a > b) {'],
      ['        return a;'],
      ['    }'],
      ['    return b;', 'A function can have several <code>return</code> statements. The first one reached ends it.'],
      ['}'],
    ] },
    { t: 'p', html: 'This is exactly what <code>#include &lt;iostream&gt;</code> does: it pastes in a file full of declarations. In lesson 12 you will write your own header files.' },

    { t: 'h', text: 'One name, several versions' },
    { t: 'p', html: 'In C++ two functions may share a name if their parameter types differ. This is called <em>overloading</em>. The compiler picks the version whose parameters match the arguments you pass. <code>std::cout &lt;&lt;</code> works this way: there is one version for <code>int</code>, one for text, one for <code>char</code> and so on.' },
    { t: 'code', title: 'overload.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['void show(int value) {', 'One <code>show</code> takes an <code>int</code>…'],
      [R`    std::cout << "number " << value << "\n";`],
      ['}'],
      [''],
      ['void show(char c) {', '…another takes a <code>char</code>.'],
      [R`    std::cout << "letter " << c << "\n";`],
      ['}'],
      [''],
      ['int area(int w, int h = 8) {', 'A <em>default argument</em>: if the caller leaves out <code>h</code>, it is 8. Defaults go at the end of the parameter list.'],
      ['    return w * h;'],
      ['}'],
      [''],
      ['int main() {'],
      ['    show(64);', '64 is an <code>int</code>, so the first version runs.'],
      ['    show(\'M\');', '<code>\'M\'</code> is a <code>char</code>, so the second one does.'],
      [R`    std::cout << area(8) << " " << area(8, 16) << "\n";`, 'An 8×8 sprite and an 8×16 sprite.'],
      ['}'],
    ] },
    { t: 'note', kind: 'warn', html: 'Overloads that differ only in their return type are not allowed: the compiler chooses by arguments, and the return type is not part of a call.' },

    { t: 'h', text: 'Functions that call themselves' },
    { t: 'p', html: 'A function may call itself. This is called <em>recursion</em>, and it fits problems that contain smaller copies of themselves. Every recursive function needs a case that stops without calling itself again, or it would run until it runs out of memory.' },
    { t: 'code', title: 'factorial.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int factorial(int n) {'],
      ['    if (n <= 1) {', 'The <em>base case</em>: the answer is known without recursing.'],
      ['        return 1;'],
      ['    }'],
      ['    return n * factorial(n - 1);', 'Each call waits for a smaller call to finish: 5 × 4 × 3 × 2 × 1.'],
      ['}'],
      [''],
      ['int main() {'],
      [R`    std::cout << "5! = " << factorial(5) << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'Emulators rarely need recursion, and a loop is usually simpler. It is enough to recognise it.' },

    { t: 'h', text: 'Small functions with good names' },
    { t: 'p', html: 'A good function does one thing and its name says what. If you cannot name a function without the word "and", it probably wants to be two functions. Compare reading these two lines:' },
    { t: 'code', title: 'names.cpp', lines: [
      ['uint8_t value = bus.read(address);', 'You can tell what happens without opening the function.'],
      ['uint8_t value = do_stuff(address, 1, 0);', 'You cannot.'],
    ] },
    { t: 'note', kind: 'nes', html: 'Your emulator will be built from functions like these: <code>read</code> and <code>write</code> to reach memory, <code>step</code> to run one instruction, <code>tick</code> to draw one pixel. Each one is small and testable on its own, which is how you will find bugs.' },

    { t: 'quiz', q: 'What does this print?<pre>int twice(int x) { x = x * 2; return x; }\n\nint main() {\n    int n = 5;\n    twice(n);\n    std::cout &lt;&lt; n;\n}</pre>', options: ['10', '5', 'It does not compile'], answer: 1, explain: '<code>twice</code> doubles its own copy and returns 10, but the result is never stored. <code>n</code> is still 5. To keep it you would write <code>n = twice(n);</code>.' },
    { t: 'quiz', q: 'There are two functions, <code>void show(int)</code> and <code>void show(char)</code>. Which one does <code>show(\'A\')</code> call?', options: [
      '<code>show(int)</code>, because a char is a number',
      '<code>show(char)</code>, because the argument is a char',
      'Neither: two functions cannot share a name',
    ], answer: 1, explain: 'The compiler picks the overload whose parameter types match the arguments best. <code>\'A\'</code> is a <code>char</code>, an exact match.' },
  ],

  exercises: [
    {
      id: 'cpp-functions-1',
      title: 'Clamp',
      prompt: '<p>Write the function <code>int clamp(int value, int low, int high)</code>. It returns <code>value</code> unchanged if it is between <code>low</code> and <code>high</code>, <code>low</code> if it is smaller, and <code>high</code> if it is larger.</p><p>You will use this to keep a sprite on the 256-pixel-wide screen: <code>clamp(300, 0, 255)</code> is 255.</p>',
      files: { 'main.cpp': R`#include <iostream>

int clamp(int value, int low, int high) {
    // Replace this line with your code.
    return 0;
}

int main() {
    std::cout << clamp(300, 0, 255) << "\n";
    std::cout << clamp(-4, 0, 255) << "\n";
    std::cout << clamp(128, 0, 255) << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
int clamp(int value, int low, int high);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) std::cout << clamp(5, 0, 10) << " " << clamp(0, 0, 10) << " " << clamp(10, 0, 10) << "\n";
    if (t == 2) std::cout << clamp(-1, 0, 10) << " " << clamp(-1000, -50, 50) << "\n";
    if (t == 3) std::cout << clamp(11, 0, 10) << " " << clamp(300, 0, 255) << "\n";
}
` },
      tests: [
        { name: 'Values inside the range stay the same', stdin: '1', expect: '5 0 10\n' },
        { name: 'Values below low become low', stdin: '2', expect: '0 -50\n' },
        { name: 'Values above high become high', stdin: '3', expect: '10 255\n' },
      ],
      hints: [
        'Two <code>if</code> statements are enough: one for <code>value &lt; low</code>, one for <code>value &gt; high</code>.',
        'Each <code>if</code> can <code>return</code> right away. If neither matches, return <code>value</code> at the end.',
      ],
      solution: { 'main.cpp': R`#include <iostream>

int clamp(int value, int low, int high) {
    if (value < low) {
        return low;
    }
    if (value > high) {
        return high;
    }
    return value;
}

int main() {
    std::cout << clamp(300, 0, 255) << "\n";
    std::cout << clamp(-4, 0, 255) << "\n";
    std::cout << clamp(128, 0, 255) << "\n";
}
` },
    },
    {
      id: 'cpp-functions-2',
      title: 'Wrap around',
      prompt: '<p>When a NES game scrolls past the right edge of its background, it comes back on the left. Write <code>int wrap(int value, int size)</code>, which keeps <code>value</code> inside 0 to <code>size - 1</code> by wrapping around:</p><pre>wrap(260, 256) is 4\nwrap(-1, 256)  is 255\nwrap(42, 256)  is 42</pre><p>Careful: in C++, <code>-1 % 256</code> is -1, not 255. Your function has to fix negative results.</p>',
      files: { 'main.cpp': R`#include <iostream>

int wrap(int value, int size) {
    return 0;
}

int main() {
    std::cout << wrap(260, 256) << "\n";
    std::cout << wrap(-1, 256) << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
int wrap(int value, int size);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) std::cout << wrap(42, 256) << " " << wrap(0, 256) << " " << wrap(255, 256) << "\n";
    if (t == 2) std::cout << wrap(256, 256) << " " << wrap(260, 256) << " " << wrap(1000, 8) << "\n";
    if (t == 3) std::cout << wrap(-1, 256) << " " << wrap(-256, 256) << " " << wrap(-9, 8) << "\n";
}
` },
      tests: [
        { name: 'Values already inside', stdin: '1', expect: '42 0 255\n' },
        { name: 'Values past the end', stdin: '2', expect: '0 4 0\n' },
        { name: 'Negative values', stdin: '3', expect: '255 0 7\n' },
      ],
      hints: [
        'Start with <code>int r = value % size;</code>. For positive values that is already the answer.',
        'If <code>r</code> is negative, adding <code>size</code> once brings it into range.',
      ],
      solution: { 'main.cpp': R`#include <iostream>

int wrap(int value, int size) {
    int r = value % size;
    if (r < 0) {
        r += size;
    }
    return r;
}

int main() {
    std::cout << wrap(260, 256) << "\n";
    std::cout << wrap(-1, 256) << "\n";
}
` },
    },
    {
      id: 'cpp-functions-3',
      title: 'Memory mirrors',
      prompt: '<p>This one is real emulator code. The NES CPU sees addresses from <code>0x0000</code> to <code>0xFFFF</code>, but some of them are <em>mirrors</em>: different addresses that reach the same place.</p><ul><li>The console has only 2 KB of RAM (<code>0x800</code> bytes), but addresses <code>0x0000</code> to <code>0x1FFF</code> all reach it: the RAM repeats every <code>0x800</code> bytes.</li><li>The picture chip (PPU) has 8 registers, at <code>0x2000</code> to <code>0x2007</code>, and they repeat every 8 bytes up to <code>0x3FFF</code>.</li></ul><p>Write two functions:</p><pre>int ram_index(int address)    // 0x0000-0x1FFF -> 0 to 0x7FF\nint ppu_register(int address) // 0x2000-0x3FFF -> 0 to 7</pre><p>For example <code>ram_index(0x0801)</code> is 1 and <code>ppu_register(0x2009)</code> is 1. You will only be given addresses in the right ranges.</p>',
      files: { 'main.cpp': R`#include <iostream>

int ram_index(int address) {
    return 0;
}

int ppu_register(int address) {
    return 0;
}

int main() {
    std::cout << std::hex << std::uppercase;
    std::cout << ram_index(0x0801) << "\n";
    std::cout << ppu_register(0x2009) << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
int ram_index(int address);
int ppu_register(int address);
int main() {
    int t = 0;
    std::cin >> t;
    std::cout << std::hex << std::uppercase;
    if (t == 1) std::cout << ram_index(0x0000) << " " << ram_index(0x07FF) << " " << ram_index(0x0123) << "\n";
    if (t == 2) std::cout << ram_index(0x0800) << " " << ram_index(0x1801) << " " << ram_index(0x1FFF) << "\n";
    if (t == 3) std::cout << ppu_register(0x2000) << " " << ppu_register(0x2007) << " " << ppu_register(0x2002) << "\n";
    if (t == 4) std::cout << ppu_register(0x2008) << " " << ppu_register(0x3456) << " " << ppu_register(0x3FFF) << "\n";
}
` },
      tests: [
        { name: 'RAM addresses without mirroring', stdin: '1', expect: '0 7FF 123\n' },
        { name: 'Mirrored RAM addresses', stdin: '2', expect: '0 1 7FF\n' },
        { name: 'The eight PPU registers', stdin: '3', expect: '0 7 2\n' },
        { name: 'Mirrored PPU registers', stdin: '4', expect: '0 6 7\n' },
      ],
      hints: [
        'Mirroring every <code>0x800</code> bytes is the remainder after dividing by <code>0x800</code>.',
        'For the PPU, subtract <code>0x2000</code> first, then take the remainder after dividing by 8.',
      ],
      solution: { 'main.cpp': R`#include <iostream>

int ram_index(int address) {
    return address % 0x800;
}

int ppu_register(int address) {
    return (address - 0x2000) % 8;
}

int main() {
    std::cout << std::hex << std::uppercase;
    std::cout << ram_index(0x0801) << "\n";
    std::cout << ppu_register(0x2009) << "\n";
}
` },
    },
  ],
});
})();
