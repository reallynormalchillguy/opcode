(() => {
const R = String.raw;

Course.add({
  id: 'cpp-strings',
  part: 'cpp',
  title: 'Characters and strings',
  summary: 'A char is a small number; std::string is a sequence of them. Reading, measuring, comparing, searching and building text.',
  blocks: [
    { t: 'p', html: 'Your emulator will read text too: a ROM\'s file name, commands typed into a debugger, lines of a test log to compare against. C++ handles text with two types: <code>char</code> for one character and <code>std::string</code> for a sequence of them.' },

    { t: 'h', text: 'A character is a number' },
    { t: 'p', html: 'A <code>char</code> holds one byte, and the character you see is just a number interpreted through a table called ASCII. <code>\'A\'</code> is 65, <code>\'B\'</code> is 66, <code>\'a\'</code> is 97, <code>\'0\'</code> is 48. Because they are numbers you can do arithmetic with them:' },
    { t: 'code', title: 'ascii.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    char c = \'A\';', 'Single quotes: one character. Double quotes would make a string.'],
      [R`    std::cout << c << " is " << static_cast<int>(c) << "\n";`, 'Printed as a <code>char</code>, you see the letter; converted to <code>int</code>, you see its number.'],
      ['    char next = c + 2;', '65 + 2 is 67, which is <code>\'C\'</code>.'],
      [R`    std::cout << next << "\n";`],
      ['    char digit = \'7\';'],
      ['    int value = digit - \'0\';', 'The digits are in order in the table, so subtracting <code>\'0\'</code> turns the character <code>\'7\'</code> into the number 7.'],
      [R`    std::cout << value * 2 << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: '<code>&lt;cctype&gt;</code> has ready-made tests and conversions: <code>std::isdigit(c)</code>, <code>std::isalpha(c)</code>, <code>std::isspace(c)</code>, <code>std::isupper(c)</code>, and <code>std::toupper(c)</code> and <code>std::tolower(c)</code>, which return the converted character as an <code>int</code>.' },

    { t: 'h', text: 'std::string' },
    { t: 'code', title: 'string.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <string>'],
      [''],
      ['int main() {'],
      ['    std::string name = "Link";', 'A string that owns its characters. It grows and shrinks as needed; you never worry about its size.'],
      [R`    std::cout << name << " has " << name.size() << " characters\n";`, '<code>.size()</code> is the number of characters, like a vector\'s.'],
      [R`    std::cout << "first: " << name[0] << ", last: " << name.back() << "\n";`, 'Indexing gives one <code>char</code>, numbered from 0. <code>[]</code> does not check the index, just like with arrays; <code>.at(i)</code> does.'],
      ['    name[0] = \'Z\';', 'The characters can be changed one by one.'],
      ['    std::string title = "The Legend of " + name;', '<code>+</code> joins strings into a new one.'],
      ['    title += \'!\';', '<code>+=</code> adds to the end, here one <code>char</code>.'],
      [R`    std::cout << title << "\n";`],
      ['    std::string empty;', 'A string starts empty if you give it no value. <code>empty.size()</code> is 0 and <code>empty.empty()</code> is <code>true</code>.'],
      [R`    std::cout << "[" << empty << "] " << empty.empty() << "\n";`, 'A <code>bool</code> prints as 1 or 0.'],
      ['}'],
    ] },

    { t: 'h', text: 'Walking along a string' },
    { t: 'p', html: 'A string works with the same loops as a vector: an index loop when you need the position, a range-based for when you do not. Use <code>char&amp;</code> in the loop when you want to change the characters.' },
    { t: 'code', title: 'count.cpp', run: true, lines: [
      ['#include <cctype>'],
      ['#include <iostream>'],
      ['#include <string>'],
      [''],
      ['int main() {'],
      ['    std::string text = "Press START, then A+B 20 times";'],
      ['    int letters = 0, digits = 0;'],
      ['    for (char c : text) {', 'Each character in turn.'],
      ['        if (std::isalpha(c)) letters++;', 'An <code>if</code> with a single statement may leave out the braces. Keep it on one line when you do, so it stays obvious.'],
      ['        if (std::isdigit(c)) digits++;'],
      ['    }'],
      [R`    std::cout << letters << " letters, " << digits << " digits\n";`],
      [''],
      ['    for (char& c : text) {', 'With <code>&amp;</code>, <code>c</code> is the character inside the string, so changing it changes <code>text</code>.'],
      ['        c = static_cast<char>(std::tolower(c));', '<code>tolower</code> returns an <code>int</code>; the cast says on purpose that we want it back as a <code>char</code>.'],
      ['    }'],
      [R`    std::cout << text << "\n";`],
      ['}'],
    ] },

    { t: 'h', text: 'Comparing and searching' },
    { t: 'table', head: ['You write', 'You get'], rows: [
      ['<code>a == b</code>, <code>a != b</code>', 'Whether two strings hold the same characters.'],
      ['<code>a &lt; b</code>', 'Whether <code>a</code> comes first in dictionary order (by character number, so all capitals come before small letters).'],
      ['<code>s.find("ab")</code>', 'The position where <code>"ab"</code> first appears, or <code>std::string::npos</code> if it does not.'],
      ['<code>s.substr(pos, n)</code>', 'A new string: <code>n</code> characters starting at <code>pos</code>. Leave out <code>n</code> to take everything to the end.'],
      ['<code>std::to_string(42)</code>', 'The text <code>"42"</code>.'],
      ['<code>std::stoi("42")</code>', 'The number 42. (It stops the program if the text is not a number, so it is only for text you trust.)'],
    ] },
    { t: 'code', title: 'command.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <string>'],
      [''],
      ['int main() {'],
      ['    std::string command = "poke 0300 42";'],
      ['    std::size_t space = command.find(\' \');', '<code>std::size_t</code> is the type sizes and positions have: a whole number that is never negative.'],
      ['    if (space != std::string::npos) {', 'Always check for <code>npos</code> before using the position.'],
      ['        std::string verb = command.substr(0, space);'],
      ['        std::string rest = command.substr(space + 1);'],
      [R`        std::cout << "verb [" << verb << "] rest [" << rest << "]\n";`],
      ['        if (verb == "poke") {', 'Comparing with <code>==</code> compares the characters.'],
      [R`            std::cout << "write a byte\n";`],
      ['        }'],
      ['    }'],
      [R`    std::cout << "frame " + std::to_string(60) << "\n";`],
      ['}'],
    ] },

    { t: 'h', text: 'Reading text' },
    { t: 'p', html: '<code>std::cin &gt;&gt; word</code> reads one word into a string: it skips spaces, then stops at the next one. <code>std::getline(std::cin, line)</code> reads a whole line, spaces included, and drops the new line at the end.' },
    { t: 'code', title: 'readline.cpp', run: true, stdin: 'Super Mario Bros.\nZelda', lines: [
      ['#include <iostream>'],
      ['#include <string>'],
      [''],
      ['int main() {'],
      ['    std::string line;'],
      ['    while (std::getline(std::cin, line)) {', '<code>getline</code> gives back the stream, which counts as false when there was nothing left to read. So this loop reads every line until the input ends.'],
      [R`        std::cout << "[" << line << "] " << line.size() << " characters\n";`],
      ['    }'],
      ['}'],
    ] },
    { t: 'note', kind: 'warn', html: 'Mixing <code>std::cin &gt;&gt; n</code> and <code>std::getline</code> has a trap: <code>&gt;&gt;</code> leaves the new line after the number unread, so the next <code>getline</code> reads an empty line. Read every line with <code>getline</code>, or call <code>std::cin.ignore()</code> once after the number to skip that new line.' },

    { t: 'h', text: 'Bytes that are not text' },
    { t: 'p', html: 'Much of the data an emulator handles is bytes that are not text at all, and those can contain any value, including 0. A <code>std::string</code> can technically hold them, but use the right type to say what you mean: a <code>std::vector</code> of bytes, which you will meet in lesson 10.' },
    { t: 'note', kind: 'nes', html: 'A NES ROM file starts with the four bytes <code>N</code>, <code>E</code>, <code>S</code> and <code>0x1A</code> (an invisible character, written <code>\'\\x1A\'</code> in C++). Checking those four bytes is the first thing your cartridge loader will do.' },

    { t: 'quiz', q: 'What does this print?<pre>std::string s = "NES";\ns += \'!\';\nstd::cout &lt;&lt; s.size();</pre>', options: ['3', '4', '5'], answer: 1, explain: 'Three letters plus the added <code>!</code>. <code>size()</code> counts characters.' },
    { t: 'quiz', q: '<code>s.find("x")</code> does not find an <code>x</code>. What does it return?', options: ['0', '-1', '<code>std::string::npos</code>'], answer: 2, explain: '0 would mean "found at the start". <code>npos</code> is a special huge value meaning "not found", and positions are never negative.' },
  ],

  exercises: [
    {
      id: 'cpp-strings-1',
      title: 'Title screen caps',
      prompt: '<p>Read one line of text and print it in capital letters, with every space replaced by an underscore. Keep everything else as it is.</p><p>For the input <code>Press start 2 play!</code>:</p><pre>PRESS_START_2_PLAY!</pre>',
      files: { 'main.cpp': R`#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);

    // Change line, then print it.

}
` },
      stdin: 'Press start 2 play!',
      tests: [
        { name: 'A short sentence', stdin: 'Press start 2 play!', expect: 'PRESS_START_2_PLAY!\n' },
        { name: 'Already in capitals', stdin: 'GAME OVER', expect: 'GAME_OVER\n' },
        { name: 'Several spaces in a row', stdin: 'a  b   c', expect: 'A__B___C\n' },
        { name: 'No spaces at all', stdin: 'x-y_z', expect: 'X-Y_Z\n' },
      ],
      hints: [
        'Loop with <code>for (char&amp; c : line)</code> so you can change each character.',
        'If <code>c == \' \'</code> store <code>\'_\'</code>, otherwise store <code>static_cast&lt;char&gt;(std::toupper(c))</code>. Then print the whole line.',
      ],
      solution: { 'main.cpp': R`#include <cctype>
#include <iostream>
#include <string>

int main() {
    std::string line;
    std::getline(std::cin, line);

    for (char& c : line) {
        if (c == ' ') {
            c = '_';
        } else {
            c = static_cast<char>(std::toupper(c));
        }
    }
    std::cout << line << "\n";
}
` },
    },
    {
      id: 'cpp-strings-2',
      title: 'Count the words',
      prompt: '<p>Write <code>int count_words(const std::string&amp; line)</code>. A word is a run of characters that are not spaces; words are separated by one or more spaces, and there may be spaces at the start or the end.</p><pre>count_words("load mario.nes")     is 2\ncount_words("   step   10  ")     is 2\ncount_words("")                   is 0</pre><p>Only the space character <code>\' \'</code> separates words.</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <string>

int count_words(const std::string& line) {
    return 0;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << count_words(line) << "\n";
    }
}
` },
      stdin: 'load mario.nes\n   step   10  ',
      harness: { 'check.cpp': R`#include <iostream>
#include <string>
int count_words(const std::string& line);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) std::cout << count_words("load mario.nes") << " " << count_words("run") << " " << count_words("poke 0300 42") << "\n";
    if (t == 2) std::cout << count_words("   step   10  ") << " " << count_words(" a b c ") << "\n";
    if (t == 3) std::cout << count_words("") << " " << count_words("     ") << "\n";
    if (t == 4) std::cout << count_words(std::string(5000, 'x') + " y") << "\n";
}
` },
      tests: [
        { name: 'Single spaces', stdin: '1', expect: '2 1 3\n' },
        { name: 'Extra spaces at the start, middle and end', stdin: '2', expect: '2 3\n' },
        { name: 'Empty lines and only spaces', stdin: '3', expect: '0 0\n' },
        { name: 'A very long word', stdin: '4', expect: '2\n' },
      ],
      hints: [
        'Counting spaces does not work when there are several in a row. Count the places where a word <em>starts</em> instead: a character that is not a space, where the previous character was a space (or there was no previous character).',
        'Keep a <code>bool in_word = false;</code>. For each character: if it is a space, set <code>in_word</code> to false; otherwise, if <code>in_word</code> is false, count one word and set it to true.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <string>

int count_words(const std::string& line) {
    int words = 0;
    bool in_word = false;
    for (char c : line) {
        if (c == ' ') {
            in_word = false;
        } else if (!in_word) {
            words++;
            in_word = true;
        }
    }
    return words;
}

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::cout << count_words(line) << "\n";
    }
}
` },
    },
    {
      id: 'cpp-strings-3',
      title: 'Read a hex number',
      prompt: '<p>Your emulator\'s debugger will take addresses typed in hex, like <code>C000</code>. Write <code>int parse_hex(const std::string&amp; s)</code>, which turns a string of hex digits into its value, without <code>std::stoi</code>, <code>std::hex</code> or any other ready-made conversion.</p><p>Hex digits are <code>0</code>-<code>9</code> (worth 0 to 9) and <code>A</code>-<code>F</code> or <code>a</code>-<code>f</code> (worth 10 to 15). Each new digit multiplies what you had by 16 and adds its own value: <code>"1F"</code> is 1 × 16 + 15 = 31.</p><p>If the string contains anything that is not a hex digit, or is empty, return <code>-1</code>. Strings will have at most 6 digits.</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <string>

int parse_hex(const std::string& s) {
    return 0;
}

int main() {
    std::cout << parse_hex("1F") << "\n";
    std::cout << parse_hex("C000") << "\n";
    std::cout << parse_hex("G7") << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
#include <string>
int parse_hex(const std::string& s);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) std::cout << parse_hex("0") << " " << parse_hex("9") << " " << parse_hex("1F") << "\n";
    if (t == 2) std::cout << parse_hex("C000") << " " << parse_hex("fffc") << " " << parse_hex("Ab") << "\n";
    if (t == 3) std::cout << parse_hex("G7") << " " << parse_hex("") << " " << parse_hex("12 ") << " " << parse_hex("0x10") << "\n";
}
` },
      tests: [
        { name: 'Small values', stdin: '1', expect: '0 9 31\n' },
        { name: 'Addresses, in both cases', stdin: '2', expect: '49152 65532 171\n' },
        { name: 'Invalid input returns -1', stdin: '3', expect: '-1 -1 -1 -1\n' },
      ],
      rules: [{ re: '\\b(sto[a-z]+|strto[a-z]*|s?scanf|atoi|hex)\\b', must: false, msg: 'Convert the digits yourself, without std::stoi, std::hex, strtol or scanf.' }],
      hints: [
        'Write a helper <code>int hex_digit(char c)</code> that returns the digit\'s value or -1. If <code>c</code> is between <code>\'0\'</code> and <code>\'9\'</code>, its value is <code>c - \'0\'</code>; between <code>\'a\'</code> and <code>\'f\'</code>, it is <code>c - \'a\' + 10</code>.',
        'Check for the empty string first. Then keep a running total: <code>value = value * 16 + digit;</code>, returning -1 as soon as a digit is invalid.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <string>

int hex_digit(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

int parse_hex(const std::string& s) {
    if (s.empty()) {
        return -1;
    }
    int value = 0;
    for (char c : s) {
        int digit = hex_digit(c);
        if (digit < 0) {
            return -1;
        }
        value = value * 16 + digit;
    }
    return value;
}

int main() {
    std::cout << parse_hex("1F") << "\n";
    std::cout << parse_hex("C000") << "\n";
    std::cout << parse_hex("G7") << "\n";
}
` },
    },
  ],
});
})();
