(() => {
const R = String.raw;

Course.add({
  id: 'cpp-references',
  part: 'cpp',
  title: 'References and pointers',
  summary: 'Every variable lives at an address. References give a variable a second name; pointers hold an address you can change or leave empty.',
  blocks: [
    { t: 'p', html: 'In lesson 4 a function could not change the caller\'s variable, because it only received a copy. In lesson 5 you used <code>&amp;</code> to pass a vector without copying it. This lesson explains what was going on, because an emulator is full of parts that must reach each other: the CPU has to reach the bus, the bus has to reach the cartridge.' },

    { t: 'h', text: 'Variables live at addresses' },
    { t: 'p', html: 'Memory is one long row of bytes, each with a number: its <em>address</em>. Every variable occupies some of those bytes. <code>&amp;x</code> (the address-of operator) gives the address where <code>x</code> lives.' },
    { t: 'code', title: 'address.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    int lives = 3;'],
      ['    int coins = 99;'],
      [R`    std::cout << "lives is at " << &lives << "\n";`, 'Addresses are printed in hex. In this browser they are small numbers; on a PC they are much longer.'],
      [R`    std::cout << "coins is at " << &coins << "\n";`, 'A different address: each variable has its own place.'],
      [R`    std::cout << sizeof(lives) << " bytes each\n";`, '<code>sizeof</code> gives the size of a type or variable in bytes. An <code>int</code> is 4.'],
      ['}'],
    ] },
    { t: 'p', html: 'This is the same idea as the NES\'s memory: its CPU sees 65536 bytes numbered <code>0x0000</code> to <code>0xFFFF</code>, and a game stores the number of lives at some fixed address.' },

    { t: 'h', text: 'References: a second name' },
    { t: 'p', html: 'A <em>reference</em> is another name for a variable that already exists. You declare one with <code>&amp;</code> after the type. From then on, using the reference is exactly using the original: same box, same address.' },
    { t: 'code', title: 'reference.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    int score = 100;'],
      ['    int& points = score;', '<code>points</code> is now another name for <code>score</code>. A reference must be given its variable when it is declared, and it stays tied to that variable forever.'],
      ['    points += 50;', 'This changes <code>score</code>, because there is only one box.'],
      [R`    std::cout << score << "\n";`],
      [R`    std::cout << (&points == &score) << "\n";`, 'Same address: prints 1 (true).'],
      ['}'],
    ] },
    { t: 'p', html: 'A reference on its own like that is rarely useful. Where references shine is as parameters: a reference parameter is another name for the caller\'s variable, so the function can change it.' },
    { t: 'code', title: 'lose_life.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['void lose_life(int& lives) {', 'The parameter is a reference. No copy is made: inside the function, <code>lives</code> <em>is</em> the caller\'s variable.'],
      ['    lives = lives - 1;'],
      ['}'],
      [''],
      ['void split(int address, int& high, int& low) {', 'Two answers at once: a function returns one value, but it can fill in as many reference parameters as it needs. These are called <em>output parameters</em>.'],
      ['    high = address / 256;'],
      ['    low = address % 256;'],
      ['}'],
      [''],
      ['int main() {'],
      ['    int lives = 3;'],
      ['    lose_life(lives);', 'The call looks exactly the same as before. Only the function\'s parameter changed.'],
      [R`    std::cout << "lives: " << lives << "\n";`, 'Now it is 2.'],
      ['    int hi = 0, lo = 0;'],
      ['    split(0xC123, hi, lo);'],
      [R`    std::cout << std::hex << hi << " " << lo << "\n";`],
      ['}'],
    ] },
    { t: 'table', head: ['Parameter', 'Use it when'], rows: [
      ['<code>int x</code>', 'The function only reads a small value. A copy is cheap.'],
      ['<code>const std::string&amp; s</code>', 'The function only reads something big. No copy, and <code>const</code> forbids changes.'],
      ['<code>int&amp; x</code>, <code>std::vector&lt;int&gt;&amp; v</code>', 'The function is meant to change the caller\'s variable.'],
    ] },

    { t: 'h', text: 'Pointers: an address in a variable' },
    { t: 'p', html: 'A <em>pointer</em> is a variable whose value is an address. Its type says what kind of thing lives there: <code>int*</code> is "pointer to <code>int</code>". Two operators go with it: <code>&amp;x</code> takes the address of <code>x</code>, and <code>*p</code> follows the pointer to the thing it points at (this is called <em>dereferencing</em>).' },
    { t: 'code', title: 'pointer.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    int a = 10;'],
      ['    int b = 20;'],
      ['    int* p = &a;', '<code>p</code> holds the address of <code>a</code>. We say <code>p</code> points to <code>a</code>.'],
      ['    *p = 11;', 'Follow the pointer and write there: this changes <code>a</code>.'],
      ['    p = &b;', 'Unlike a reference, a pointer can be changed to point somewhere else.'],
      ['    *p += 5;', 'Now this changes <code>b</code>.'],
      [R`    std::cout << a << " " << b << "\n";`],
      [''],
      ['    int* nothing = nullptr;', '<code>nullptr</code> means "points to nothing". A pointer can be empty; a reference cannot.'],
      ['    if (nothing == nullptr) {', 'Always check a pointer that might be empty before following it. Dereferencing <code>nullptr</code> is a bug that crashes the program, or worse.'],
      [R`        std::cout << "no target\n";`],
      ['    }'],
      ['}'],
    ] },
    { t: 'p', html: 'The <code>&amp;</code> and <code>*</code> symbols mean different things in different places, which is confusing at first:' },
    { t: 'table', head: ['Where', '<code>&amp;</code> means', '<code>*</code> means'], rows: [
      ['In a type: <code>int&amp; r</code>, <code>int* p</code>', 'reference to', 'pointer to'],
      ['In an expression: <code>&amp;x</code>, <code>*p</code>', 'address of', 'the thing pointed at'],
    ] },

    { t: 'h', text: 'Pointers to objects, and the arrow' },
    { t: 'p', html: 'When a pointer points to something with members, like a string, <code>p-&gt;size()</code> is a shorter way of writing <code>(*p).size()</code>: follow the pointer, then use the member.' },
    { t: 'code', title: 'arrow.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <string>'],
      ['#include <vector>'],
      [''],
      ['const std::string* find_title(const std::vector<std::string>& titles, char first) {', 'Returns a pointer to the first title starting with that letter, or <code>nullptr</code> if there is none. A pointer is the natural way to say "maybe nothing".'],
      ['    for (const std::string& t : titles) {'],
      ['        if (!t.empty() && t[0] == first) {'],
      ['            return &t;', 'The address of the element inside the vector, not of a copy.'],
      ['        }'],
      ['    }'],
      ['    return nullptr;'],
      ['}'],
      [''],
      ['int main() {'],
      ['    std::vector<std::string> titles = {"Metroid", "Zelda", "Mario"};'],
      ['    const std::string* found = find_title(titles, \'Z\');'],
      ['    if (found) {', 'A pointer counts as <code>true</code> when it is not <code>nullptr</code>.'],
      [R`        std::cout << *found << " has " << found->size() << " letters\n";`],
      ['    }'],
      ['    if (!find_title(titles, \'Q\')) {'],
      [R`        std::cout << "nothing starts with Q\n";`],
      ['    }'],
      ['}'],
    ] },

    { t: 'h', text: 'Pointers and arrays' },
    { t: 'p', html: 'The elements of an array or vector sit next to each other, so from a pointer to one element you can reach the next by adding 1: <code>p + 1</code> points to the following element (the compiler multiplies by the element\'s size for you). <code>v.data()</code> gives a pointer to a vector\'s first element. You will rarely need this, but you will see it in older code and in the code that talks to the browser\'s screen.' },
    { t: 'code', title: 'walk.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <vector>'],
      [''],
      ['int main() {'],
      ['    std::vector<int> v = {5, 10, 15, 20};'],
      ['    const int* p = v.data();', 'A pointer to the first element. <code>const int*</code>: we will only read through it.'],
      ['    const int* end = p + v.size();', 'One past the last element. It must never be dereferenced; it only marks where to stop.'],
      ['    while (p != end) {'],
      [R`        std::cout << *p << "\n";`],
      ['        p++;', 'Move to the next element.'],
      ['    }'],
      ['}'],
    ] },

    { t: 'h', text: 'Which one to use' },
    { t: 'list', items: [
      'Prefer a <strong>reference</strong> when there is always something there: a function parameter that must be a real object.',
      'Use a <strong>pointer</strong> when the target can be missing (<code>nullptr</code>), or when it must change to point at something else later.',
      'Never keep a reference or pointer to a local variable after its function returns. The variable is gone, and the pointer now leads to memory used for something else.',
    ] },
    { t: 'note', kind: 'nes', html: 'In your emulator, the CPU will hold a reference or pointer to the bus, and the bus a pointer to the cartridge. That is how one part reaches another without copying it: there is only one bus, and everyone who needs it points to it.' },

    { t: 'quiz', q: 'What does this print?<pre>int a = 1;\nint&amp; r = a;\nr = 5;\nstd::cout &lt;&lt; a;</pre>', options: ['1', '5', 'It does not compile'], answer: 1, explain: '<code>r</code> is another name for <code>a</code>, so assigning to <code>r</code> assigns to <code>a</code>.' },
    { t: 'quiz', q: 'Given <code>int x = 7; int* p = &amp;x;</code>, which expression is 7?', options: ['<code>p</code>', '<code>&amp;p</code>', '<code>*p</code>'], answer: 2, explain: '<code>p</code> is the address of <code>x</code>, <code>&amp;p</code> is the address of the pointer itself, and <code>*p</code> follows the pointer to <code>x</code>.' },
  ],

  exercises: [
    {
      id: 'cpp-references-1',
      title: 'Swap and sort three',
      prompt: '<p>Write <code>void swap_values(int&amp; a, int&amp; b)</code>, which exchanges the two values, and then <code>void sort3(int&amp; a, int&amp; b, int&amp; c)</code>, which rearranges three values so that <code>a &lt;= b &lt;= c</code>. Use your <code>swap_values</code> inside <code>sort3</code>.</p><p>(The standard library has <code>std::swap</code>, but write your own this time.)</p>',
      files: { 'main.cpp': R`#include <iostream>

void swap_values(int& a, int& b) {

}

void sort3(int& a, int& b, int& c) {

}

int main() {
    int x = 3, y = 1, z = 2;
    sort3(x, y, z);
    std::cout << x << " " << y << " " << z << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
void swap_values(int& a, int& b);
void sort3(int& a, int& b, int& c);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { int a = 1, b = 2; swap_values(a, b); std::cout << a << " " << b << "\n"; swap_values(a, a); std::cout << a << "\n"; }
    if (t == 2) { int v[6][3] = {{1,2,3},{1,3,2},{2,1,3},{2,3,1},{3,1,2},{3,2,1}}; for (auto& r : v) { sort3(r[0], r[1], r[2]); std::cout << r[0] << r[1] << r[2] << " "; } std::cout << "\n"; }
    if (t == 3) { int a = 5, b = -5, c = 5; sort3(a, b, c); std::cout << a << " " << b << " " << c << "\n"; }
}
` },
      tests: [
        { name: 'Swapping two values', stdin: '1', expect: '2 1\n2\n' },
        { name: 'All six orders of 1, 2, 3', stdin: '2', expect: '123 123 123 123 123 123 \n' },
        { name: 'Equal and negative values', stdin: '3', expect: '-5 5 5\n' },
      ],
      rules: [{ re: 'std::swap|\\bswap\\s*\\(', must: false, msg: 'Write the swap yourself in swap_values, without std::swap.' }],
      hints: [
        'Swapping needs a third variable: <code>int tmp = a; a = b; b = tmp;</code>',
        'Three comparisons sort three values: if <code>a &gt; b</code> swap them; if <code>b &gt; c</code> swap them; then if <code>a &gt; b</code> swap them again.',
      ],
      solution: { 'main.cpp': R`#include <iostream>

void swap_values(int& a, int& b) {
    int tmp = a;
    a = b;
    b = tmp;
}

void sort3(int& a, int& b, int& c) {
    if (a > b) swap_values(a, b);
    if (b > c) swap_values(b, c);
    if (a > b) swap_values(a, b);
}

int main() {
    int x = 3, y = 1, z = 2;
    sort3(x, y, z);
    std::cout << x << " " << y << " " << z << "\n";
}
` },
    },
    {
      id: 'cpp-references-2',
      title: 'Two answers at once',
      prompt: '<p>Write <code>void min_max(const std::vector&lt;int&gt;&amp; values, int&amp; low, int&amp; high)</code>. It looks at the values (there is at least one) and stores the smallest in <code>low</code> and the largest in <code>high</code>.</p><p>The function returns nothing: its results go through the two output parameters.</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <vector>

void min_max(const std::vector<int>& values, int& low, int& high) {

}

int main() {
    std::vector<int> times = {91, 104, 77, 130, 88};
    int fastest = 0, slowest = 0;
    min_max(times, fastest, slowest);
    std::cout << fastest << " " << slowest << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
#include <vector>
void min_max(const std::vector<int>& values, int& low, int& high);
int main() {
    int t = 0;
    std::cin >> t;
    int lo = 12345, hi = 12345;
    if (t == 1) { min_max({91, 104, 77, 130, 88}, lo, hi); std::cout << lo << " " << hi << "\n"; }
    if (t == 2) { min_max({42}, lo, hi); std::cout << lo << " " << hi << "\n"; }
    if (t == 3) { min_max({-3, -90, -1, -50}, lo, hi); std::cout << lo << " " << hi << "\n"; }
    if (t == 4) { std::vector<int> v; for (int i = 0; i < 1000; i++) v.push_back((i * 7919) % 1009); min_max(v, lo, hi); std::cout << lo << " " << hi << "\n"; }
}
` },
      tests: [
        { name: 'A few values', stdin: '1', expect: '77 130\n' },
        { name: 'One value is both', stdin: '2', expect: '42 42\n' },
        { name: 'All negative', stdin: '3', expect: '-90 -1\n' },
        { name: 'A thousand values', stdin: '4', expect: '0 1008\n' },
      ],
      hints: [
        'Start both answers at the first value: <code>low = values[0]; high = values[0];</code> Starting them at 0 would be wrong for all-negative or all-positive inputs.',
        'Then loop over every value and update <code>low</code> or <code>high</code> when you find a smaller or larger one.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <vector>

void min_max(const std::vector<int>& values, int& low, int& high) {
    low = values[0];
    high = values[0];
    for (int v : values) {
        if (v < low) low = v;
        if (v > high) high = v;
    }
}

int main() {
    std::vector<int> times = {91, 104, 77, 130, 88};
    int fastest = 0, slowest = 0;
    min_max(times, fastest, slowest);
    std::cout << fastest << " " << slowest << "\n";
}
` },
    },
    {
      id: 'cpp-references-3',
      title: 'Find a byte',
      prompt: '<p>Write <code>int* find_value(std::vector&lt;int&gt;&amp; memory, int value)</code>. It returns a pointer to the <em>first</em> element of <code>memory</code> equal to <code>value</code>, or <code>nullptr</code> if there is none.</p><p>Because the pointer leads to the element inside the vector, the caller can change it through the pointer. A debugger uses exactly this to find a value in RAM and change it (that is how cheat codes find the number of lives).</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <vector>

int* find_value(std::vector<int>& memory, int value) {
    return nullptr;
}

int main() {
    std::vector<int> ram = {0, 7, 3, 7, 1};
    int* lives = find_value(ram, 3);
    if (lives != nullptr) {
        *lives = 99;
    }
    for (int v : ram) {
        std::cout << v << " ";
    }
    std::cout << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
#include <vector>
int* find_value(std::vector<int>& memory, int value);
int main() {
    int t = 0;
    std::cin >> t;
    std::vector<int> ram = {0, 7, 3, 7, 1};
    if (t == 1) { int* p = find_value(ram, 3); std::cout << (p ? p - ram.data() : -1) << "\n"; }
    if (t == 2) { int* p = find_value(ram, 7); std::cout << (p ? p - ram.data() : -1) << "\n"; if (p) *p = 8; std::cout << ram[1] << ram[3] << "\n"; }
    if (t == 3) { std::cout << (find_value(ram, 5) == nullptr ? "nullptr" : "found") << "\n"; std::vector<int> none; std::cout << (find_value(none, 0) == nullptr ? "nullptr" : "found") << "\n"; }
    if (t == 4) { int* p = find_value(ram, 0); std::cout << (p ? p - ram.data() : -1) << " "; p = find_value(ram, 1); std::cout << (p ? p - ram.data() : -1) << "\n"; }
}
` },
      tests: [
        { name: 'Finds a value in the middle', stdin: '1', expect: '2\n' },
        { name: 'Points into the vector, at the first match', stdin: '2', expect: '1\n87\n' },
        { name: 'Missing values give nullptr', stdin: '3', expect: 'nullptr\nnullptr\n' },
        { name: 'First and last elements', stdin: '4', expect: '0 4\n' },
      ],
      hints: [
        'Loop with a reference so you have the element itself: <code>for (int&amp; x : memory)</code>.',
        'When <code>x == value</code>, return <code>&amp;x</code>. After the loop, return <code>nullptr</code>.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <vector>

int* find_value(std::vector<int>& memory, int value) {
    for (int& x : memory) {
        if (x == value) {
            return &x;
        }
    }
    return nullptr;
}

int main() {
    std::vector<int> ram = {0, 7, 3, 7, 1};
    int* lives = find_value(ram, 3);
    if (lives != nullptr) {
        *lives = 99;
    }
    for (int v : ram) {
        std::cout << v << " ";
    }
    std::cout << "\n";
}
` },
    },
  ],
});
})();
