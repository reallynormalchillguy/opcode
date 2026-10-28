(() => {
const R = String.raw;

Course.add({
  id: 'cpp-arrays',
  part: 'cpp',
  title: 'Arrays and vectors',
  summary: 'Many values of one type in a row: std::array for a fixed size, std::vector for one that grows, loops over both, and grids.',
  blocks: [
    { t: 'p', html: 'The NES has 2048 bytes of RAM. You are not going to declare 2048 variables. An <em>array</em> is one name for many values of the same type, stored next to each other in memory and numbered from 0. C++ gives you two you will use all the time: <code>std::array</code>, whose size is fixed when you write the program, and <code>std::vector</code>, which can grow while it runs.' },

    { t: 'h', text: 'std::array: a fixed number of values' },
    { t: 'code', title: 'scores.cpp', run: true, lines: [
      ['#include <array>', 'Brings in <code>std::array</code>.'],
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    std::array<int, 5> scores = {120, 85, 300, 40, 95};', 'The type goes in angle brackets: 5 values of type <code>int</code>. The size must be known when the program is compiled.'],
      [R`    std::cout << "first: " << scores[0] << "\n";`, 'Elements are numbered from 0. <code>scores[0]</code> is the first one.'],
      [R`    std::cout << "last:  " << scores[4] << "\n";`, 'With 5 elements, the last index is 4, not 5.'],
      ['    scores[1] = 999;', 'An element works like any other variable: you can assign to it.'],
      ['    for (int i = 0; i < 5; i++) {', 'The classic loop: <code>i</code> goes 0, 1, 2, 3, 4. Counting from 0 and stopping before the size fits arrays exactly.'],
      [R`        std::cout << "scores[" << i << "] = " << scores[i] << "\n";`, 'The index can be any expression, here the loop variable.'],
      ['    }'],
      [R`    std::cout << scores.size() << " scores\n";`, '<code>.size()</code> asks the array how many elements it has. A function that belongs to a value like this is called a <em>member function</em>; you will write your own in lesson 8.'],
      ['}'],
    ] },
    { t: 'p', html: 'Missing values are filled with zero: <code>std::array&lt;int, 5&gt; a = {1, 2};</code> holds 1, 2, 0, 0, 0, and <code>std::array&lt;int, 5&gt; a{};</code> is all zeros. Without an initialiser the values are whatever happened to be in memory, so always initialise.' },

    { t: 'h', text: 'Looping over every element' },
    { t: 'p', html: 'When you want every element in order and do not need the index, the <em>range-based for</em> loop says exactly that:' },
    { t: 'code', title: 'total.cpp', run: true, lines: [
      ['#include <array>'],
      ['#include <iostream>'],
      [''],
      ['constexpr int kLevels = 4;', 'Write the count in one place, as a named constant, instead of scattering the number 4 around your code.'],
      [''],
      ['int main() {'],
      ['    std::array<int, kLevels> times = {91, 104, 77, 130};'],
      ['    int total = 0;'],
      ['    for (int t : times) {', 'Read it as "for each <code>t</code> in <code>times</code>". Each time round, <code>t</code> is a copy of the next element.'],
      ['        total += t;'],
      ['    }'],
      [R`    std::cout << times.size() << " levels, " << total << " seconds\n";`],
      ['}'],
    ] },

    { t: 'h', text: 'Staying inside the array' },
    { t: 'p', html: 'This is the most important fact about arrays in C++. If you write <code>scores[5]</code> or <code>scores[-1]</code> on a 5-element array, <code>[]</code> does not stop you. It reads or writes whatever memory happens to sit there: another variable, part of another array, or something the program needs to keep running.' },
    { t: 'p', html: '<code>scores.at(i)</code> does the same job as <code>scores[i]</code> but checks the index first, and stops the program with an error if it is outside the array. It costs a comparison on every access, so emulators use <code>[]</code> in the hot paths and make sure the index is right, for example by masking it (you will see how in lesson 10).' },
    { t: 'code', title: 'outside.cpp', run: true, lines: [
      ['#include <array>'],
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    std::array<int, 3> lives = {3, 3, 3};'],
      ['    for (int i = 0; i <= 3; i++) {', 'A classic bug: <code>&lt;=</code> instead of <code>&lt;</code>, so the loop reaches index 3.'],
      [R`        std::cout << lives.at(i) << "\n";`, '<code>.at(3)</code> notices and stops the program. With <code>lives[3]</code> it would quietly print some other number.'],
      ['    }'],
      ['}'],
    ] },
    { t: 'note', kind: 'warn', html: 'Out-of-bounds access with <code>[]</code> does not reliably crash. Often the program keeps going with a corrupted value and fails much later, somewhere unrelated. When a bug makes no sense, check your indexes first, especially loops that use <code>&lt;=</code> instead of <code>&lt;</code>.' },

    { t: 'h', text: 'std::vector: a list that grows' },
    { t: 'p', html: 'Often you do not know the size until the program runs: the number of lines in a file, or the size of a cartridge. <code>std::vector</code> holds any number of elements and grows when you add more.' },
    { t: 'code', title: 'vector.cpp', run: true, stdin: '4\n10 20 30 40', lines: [
      ['#include <iostream>'],
      ['#include <vector>'],
      [''],
      ['int main() {'],
      ['    std::vector<int> values;', 'An empty vector of <code>int</code>s. No size in the angle brackets: it starts with 0 elements.'],
      ['    int n = 0;'],
      ['    std::cin >> n;'],
      ['    for (int i = 0; i < n; i++) {'],
      ['        int v = 0;'],
      ['        std::cin >> v;'],
      ['        values.push_back(v);', '<code>push_back</code> adds an element at the end. The vector makes room as needed.'],
      ['    }'],
      [R`    std::cout << values.size() << " values, first " << values[0] << ", last " << values.back() << "\n";`, 'Indexing works as for <code>std::array</code>. <code>back()</code> is the last element.'],
      [''],
      ['    std::vector<int> ram(2048, 0);', 'Another way to start: 2048 elements, all 0. Note the parentheses: <code>(count, value)</code>.'],
      ['    ram[0x10] = 7;'],
      [R`    std::cout << ram.size() << " bytes of RAM, ram[16] = " << ram[16] << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'Other things a vector can do: <code>v.pop_back()</code> removes the last element, <code>v.clear()</code> removes them all, <code>v.resize(n)</code> changes the size, and <code>v.empty()</code> is <code>true</code> when there are no elements. Unlike plain arrays in C, two vectors (or two <code>std::array</code>s) can be copied with <code>=</code> and compared with <code>==</code>.' },

    { t: 'h', text: 'Passing them to functions' },
    { t: 'p', html: 'Arguments are copies, and that includes vectors: passing a vector of a million elements by value copies a million elements. To let a function <em>look at</em> the caller\'s vector without copying it, write the parameter as <code>const std::vector&lt;int&gt;&amp;</code>. The <code>&amp;</code> makes it a <em>reference</em> to the caller\'s vector, and <code>const</code> promises not to change it. Leave out <code>const</code> when the function is meant to change it.' },
    { t: 'code', title: 'fill.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <vector>'],
      [''],
      ['void fill(std::vector<int>& v, int value) {', 'No <code>const</code>: this function changes the caller\'s vector.'],
      ['    for (int& x : v) {', 'With <code>&amp;</code> in the loop too, <code>x</code> is each element itself, not a copy, so assigning to it changes the vector.'],
      ['        x = value;'],
      ['    }'],
      ['}'],
      [''],
      ['int sum(const std::vector<int>& v) {', '<code>const</code> reference: no copy, and the compiler stops you if you try to change it by mistake.'],
      ['    int total = 0;'],
      ['    for (int x : v) {'],
      ['        total += x;'],
      ['    }'],
      ['    return total;'],
      ['}'],
      [''],
      ['int main() {'],
      ['    std::vector<int> coins(6);', 'Six elements, all 0.'],
      ['    fill(coins, 10);'],
      ['    coins[2] = 50;'],
      [R`    std::cout << sum(coins) << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'References get their own lesson (lesson 7). For now, the rule of thumb: pass small things like <code>int</code> by value, and containers by <code>const&amp;</code>, or by plain <code>&amp;</code> when the function should change them.' },

    { t: 'h', text: 'Grids' },
    { t: 'p', html: 'An array\'s elements can themselves be arrays. <code>std::array&lt;std::array&lt;int, 8&gt;, 3&gt;</code> is 3 rows of 8 <code>int</code>s. The first index picks the row, the second the column. Long types like this get a short name with <code>using</code>.' },
    { t: 'code', title: 'grid.cpp', run: true, lines: [
      ['#include <array>'],
      ['#include <iostream>'],
      [''],
      ['using Map = std::array<std::array<int, 8>, 3>;', 'From here on, <code>Map</code> means this type. <code>using</code> creates an alias; it does not create anything new.'],
      [''],
      ['int main() {'],
      ['    Map map = {{', 'The outer braces belong to the outer array. Each inner pair of braces is one row.'],
      ['        {1, 1, 1, 1, 1, 1, 1, 1},'],
      ['        {1, 0, 0, 2, 0, 0, 0, 1},'],
      ['        {1, 1, 1, 1, 1, 1, 1, 1},'],
      ['    }};'],
      ['    const std::array<char, 3> symbols = {\' \', \'#\', \'*\'};', 'A lookup table: the value in the map is used as an index to pick the character to draw.'],
      ['    for (const auto& row : map) {', 'Each element of <code>map</code> is a whole row. <code>auto</code> lets the compiler fill in the type, and <code>const&amp;</code> avoids copying the row.'],
      ['        for (int cell : row) {'],
      ['            std::cout << symbols[cell];', '<code>cell</code> is 0, 1 or 2, and that number picks a symbol.'],
      ['        }'],
      [R`        std::cout << "\n";`],
      ['    }'],
      ['}'],
    ] },
    { t: 'p', html: 'In memory, the rows sit one after another: all of row 0, then all of row 1. So <code>map[row][col]</code> lives at position <code>row * 8 + col</code> from the start. Emulators often use one flat array and do that arithmetic themselves, for example <code>pixels[y * 256 + x]</code> for a 256-pixel-wide screen.' },
    { t: 'note', kind: 'nes', html: 'NES graphics are stored as 8×8 tiles in which every pixel is a number from 0 to 3. The same lookup idea you just used, value to symbol, is how the PPU turns those numbers into colours: the number picks an entry in a palette.' },

    { t: 'quiz', q: 'An array is declared as <code>std::array&lt;int, 10&gt; a;</code>. Which is the last valid element?', options: ['<code>a[10]</code>', '<code>a[9]</code>', '<code>a[11]</code>'], answer: 1, explain: 'Indexes run from 0 to size minus 1. <code>a[10]</code> is one past the end; <code>[]</code> will not stop you from using it, which is exactly the danger.' },
    { t: 'quiz', q: 'A function <code>void double_all(std::vector&lt;int&gt; v)</code> doubles each element of <code>v</code>. After calling it on your vector, what do you see?', options: ['The doubled values', 'The original values, because <code>v</code> is a copy', 'It does not compile'], answer: 1, explain: 'Without <code>&amp;</code>, the parameter is a copy and the function doubles the copy. To change the caller\'s vector the parameter must be <code>std::vector&lt;int&gt;&amp;</code>.' },
  ],

  exercises: [
    {
      id: 'cpp-arrays-1',
      title: 'Backwards',
      prompt: '<p>Read a count <code>n</code> (at least 1), then <code>n</code> whole numbers. Print them in reverse order, separated by single spaces, on one line.</p><p>For the input <code>5</code> then <code>1 2 3 4 5</code>:</p><pre>5 4 3 2 1</pre><p>Store the numbers in a <code>std::vector</code>: there is no limit on <code>n</code>.</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <vector>

int main() {
    int n = 0;
    std::cin >> n;
    std::vector<int> values;

    // Read the n numbers into values, then print them backwards.

}
` },
      stdin: '5\n1 2 3 4 5',
      tests: [
        { name: 'Five numbers', stdin: '5\n1 2 3 4 5', expect: '5 4 3 2 1\n' },
        { name: 'One number', stdin: '1\n42', expect: '42\n' },
        { name: 'Negative numbers', stdin: '4\n-1 0 -30 7', expect: '7 -30 0 -1\n' },
        { name: 'A thousand numbers', stdin: '1000\n' + Array.from({ length: 1000 }, (_, i) => i).join(' '), expect: Array.from({ length: 1000 }, (_, i) => 999 - i).join(' ') + '\n' },
      ],
      hints: [
        'Read with a loop: read one number into a variable, then <code>values.push_back(v);</code>',
        'Print with a loop that starts at <code>n - 1</code> and goes down to 0. Print a space before every number except the first one you print.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <vector>

int main() {
    int n = 0;
    std::cin >> n;
    std::vector<int> values;

    for (int i = 0; i < n; i++) {
        int v = 0;
        std::cin >> v;
        values.push_back(v);
    }
    for (int i = n - 1; i >= 0; i--) {
        if (i != n - 1) {
            std::cout << " ";
        }
        std::cout << values[i];
    }
    std::cout << "\n";
}
` },
    },
    {
      id: 'cpp-arrays-2',
      title: 'Best and worst',
      prompt: '<p>Write two functions that look through a vector of scores (it has at least one element):</p><pre>int max_index(const std::vector&lt;int&gt;&amp; scores)  // index of the largest value\nint count_above(const std::vector&lt;int&gt;&amp; scores, int limit)  // how many are greater than limit</pre><p>If the largest value appears more than once, return the <em>first</em> index where it appears.</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <vector>

int max_index(const std::vector<int>& scores) {
    return 0;
}

int count_above(const std::vector<int>& scores, int limit) {
    return 0;
}

int main() {
    std::vector<int> scores = {40, 95, 12, 95, 60, 3};
    std::cout << max_index(scores) << "\n";
    std::cout << count_above(scores, 50) << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
#include <vector>
int max_index(const std::vector<int>& scores);
int count_above(const std::vector<int>& scores, int limit);
int main() {
    int t = 0;
    std::cin >> t;
    std::vector<int> a = {40, 95, 12, 95, 60, 3};
    std::vector<int> b = {-7};
    std::vector<int> c = {-5, -2, -9, -2, -30};
    std::vector<int> d = {1, 2, 3, 4};
    if (t == 1) std::cout << max_index(a) << " " << max_index(d) << "\n";
    if (t == 2) std::cout << max_index(b) << " " << max_index(c) << "\n";
    if (t == 3) std::cout << count_above(a, 50) << " " << count_above(a, 95) << " " << count_above(c, -10) << "\n";
}
` },
      tests: [
        { name: 'Largest value, first time it appears', stdin: '1', expect: '1 3\n' },
        { name: 'One element and all negative', stdin: '2', expect: '0 1\n' },
        { name: 'Counting values above a limit', stdin: '3', expect: '3 0 4\n' },
      ],
      hints: [
        'For <code>max_index</code>, keep the index of the best value seen so far, starting with 0. Loop from index 1 with an ordinary <code>for</code> (you need the index), and only replace it when you find a value that is strictly greater.',
        'Starting the best value at 0 instead of at <code>scores[0]</code> would break when every score is negative. For <code>count_above</code> a range-based for is enough.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <vector>

int max_index(const std::vector<int>& scores) {
    int best = 0;
    for (int i = 1; i < static_cast<int>(scores.size()); i++) {
        if (scores[i] > scores[best]) {
            best = i;
        }
    }
    return best;
}

int count_above(const std::vector<int>& scores, int limit) {
    int count = 0;
    for (int s : scores) {
        if (s > limit) {
            count++;
        }
    }
    return count;
}

int main() {
    std::vector<int> scores = {40, 95, 12, 95, 60, 3};
    std::cout << max_index(scores) << "\n";
    std::cout << count_above(scores, 50) << "\n";
}
` },
    },
    {
      id: 'cpp-arrays-3',
      title: 'Draw a tile',
      prompt: '<p>A NES tile is 8×8 pixels, and each pixel is a number from 0 to 3. The starting code names the type with <code>using Tile = std::array&lt;std::array&lt;int, 8&gt;, 8&gt;;</code>. Write <code>void draw_tile(const Tile&amp; tile)</code>, which prints the tile as 8 lines of 8 characters, using this table:</p><table><tr><th>Pixel</th><th>Character</th></tr><tr><td>0</td><td><code>.</code></td></tr><tr><td>1</td><td><code>:</code></td></tr><tr><td>2</td><td><code>o</code></td></tr><tr><td>3</td><td><code>@</code></td></tr></table><p>The starting code has a tile you can Run to see your result. Check uses other tiles too.</p>',
      files: { 'main.cpp': R`#include <array>
#include <iostream>

using Tile = std::array<std::array<int, 8>, 8>;

void draw_tile(const Tile& tile) {

}

int main() {
    const Tile coin = {{
        {0, 0, 3, 3, 3, 3, 0, 0},
        {0, 3, 2, 2, 2, 2, 3, 0},
        {3, 2, 2, 1, 1, 2, 2, 3},
        {3, 2, 1, 2, 2, 1, 2, 3},
        {3, 2, 1, 2, 2, 1, 2, 3},
        {3, 2, 2, 1, 1, 2, 2, 3},
        {0, 3, 2, 2, 2, 2, 3, 0},
        {0, 0, 3, 3, 3, 3, 0, 0},
    }};
    draw_tile(coin);
}
` },
      harness: { 'check.cpp': R`#include <array>
#include <iostream>
using Tile = std::array<std::array<int, 8>, 8>;
void draw_tile(const Tile& tile);
int main() {
    int t = 0;
    std::cin >> t;
    Tile tile{};
    for (int y = 0; y < 8; y++)
        for (int x = 0; x < 8; x++)
            tile[y][x] = t == 1 ? 0 : t == 2 ? (x + y) % 4 : (x == y ? 3 : (x == 7 - y ? 1 : 2 * (y < 4)));
    draw_tile(tile);
}
` },
      tests: [
        { name: 'An empty tile', stdin: '1', expect: '........\n........\n........\n........\n........\n........\n........\n........\n' },
        { name: 'All four values', stdin: '2', expect: '.:o@.:o@\n:o@.:o@.\no@.:o@.:\n@.:o@.:o\n.:o@.:o@\n:o@.:o@.\no@.:o@.:\n@.:o@.:o\n' },
        { name: 'Two diagonals', stdin: '3', expect: '@oooooo:\no@oooo:o\noo@oo:oo\nooo@:ooo\n...:@...\n..:..@..\n.:....@.\n:......@\n' },
      ],
      hints: [
        'Make a lookup table: <code>const std::array&lt;char, 4&gt; symbols = {\'.\', \':\', \'o\', \'@\'};</code>',
        'Two nested loops, rows outside and pixels inside: <code>for (const auto&amp; row : tile)</code> and <code>for (int p : row)</code>. Print <code>symbols[p]</code>, and a new line after each row.',
      ],
      solution: { 'main.cpp': R`#include <array>
#include <iostream>

using Tile = std::array<std::array<int, 8>, 8>;

void draw_tile(const Tile& tile) {
    const std::array<char, 4> symbols = {'.', ':', 'o', '@'};
    for (const auto& row : tile) {
        for (int p : row) {
            std::cout << symbols[p];
        }
        std::cout << "\n";
    }
}

int main() {
    const Tile coin = {{
        {0, 0, 3, 3, 3, 3, 0, 0},
        {0, 3, 2, 2, 2, 2, 3, 0},
        {3, 2, 2, 1, 1, 2, 2, 3},
        {3, 2, 1, 2, 2, 1, 2, 3},
        {3, 2, 1, 2, 2, 1, 2, 3},
        {3, 2, 2, 1, 1, 2, 2, 3},
        {0, 3, 2, 2, 2, 2, 3, 0},
        {0, 0, 3, 3, 3, 3, 0, 0},
    }};
    draw_tile(coin);
}
` },
    },
  ],
});
})();
