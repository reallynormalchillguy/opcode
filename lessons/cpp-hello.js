Course.add({
  id: 'cpp-hello',
  part: 'cpp',
  title: 'Hello, C++',
  summary: 'What a compiler does, the shape of every C++ program, and how to read an error.',
  blocks: [
    { t: 'p', html: 'By the end of this course you will have written a program that pretends to be a Nintendo Entertainment System: it reads the same bytes a real cartridge holds and runs them, instruction by instruction, until Mario appears on screen. That program will be written in C++, so C++ is where we start.' },
    { t: 'p', html: 'C++ (1985, the same year the NES reached America) grew out of C, a small language that lets you say exactly which bytes go where in memory. C++ keeps that control and adds tools for organising big programs: classes, ready-made containers like <code>std::vector</code>, and objects that clean up after themselves. An emulator needs both. The NES has 2 KB of RAM, a handful of hardware registers and a cartridge, and you will model each part as a C++ class built from plain bytes.' },

    { t: 'h', text: 'What happens when you press Run' },
    { t: 'p', html: 'A computer cannot run C++ directly. It runs <em>machine code</em>: numbered instructions for its processor. A <em>compiler</em> is the program that translates your C++ text into machine code. This site has a real C++ compiler (Clang, the same one used on Macs and in Android) running inside your browser, so nothing is sent to a server.' },
    { t: 'list', items: [
      '<strong>Compile.</strong> Clang reads your <code>.cpp</code> files. If something is not valid C++, it stops and tells you where.',
      '<strong>Link.</strong> The linker joins your code with the standard library (the code behind <code>std::cout</code>, for example) into one program.',
      '<strong>Run.</strong> The program starts at <code>main</code> and runs top to bottom. Whatever it prints appears in the console.',
    ] },
    { t: 'note', kind: 'nes', html: 'An emulator does the job of the processor in the last step. A NES cartridge holds machine code for the NES processor (a 6502). Your emulator will read those numbers one at a time and do what each one says.' },

    { t: 'h', text: 'Your first program' },
    { t: 'p', html: 'Every line below does something. Click a line to see what it means, then run it.' },
    { t: 'code', title: 'hello.cpp', run: true, lines: [
      ['#include <iostream>', 'Brings in the standard input/output streams. Without it, the compiler does not know what <code>std::cout</code> is. Lines that start with <code>#</code> are handled before compiling, by the preprocessor.'],
      [''],
      ['int main() {', 'Every C++ program starts in a function called <code>main</code>. <code>int</code> says it gives back a whole number when it finishes. The empty <code>()</code> say it takes no inputs. The <code>{</code> opens the function body.'],
      ['    std::cout << "Hello, NES!\\n";', '<code>std::cout</code> is the console output (<em>c-out</em>). <code>&lt;&lt;</code> sends what is on its right into it. The text in double quotes is a <em>string</em>; <code>\\n</code> is one character: a new line. The semicolon ends the statement; C++ needs one after almost every statement.'],
      ['    return 0;', 'Ends <code>main</code> and hands 0 back to whoever started the program. By convention 0 means "everything went fine" and any other number means an error. (In <code>main</code> you may leave it out, and 0 is returned for you.)'],
      ['}', 'Closes the function body opened by <code>{</code>.'],
    ] },
    { t: 'p', html: 'The <code>std::</code> in front of <code>cout</code> says it comes from the standard library\'s <em>namespace</em>, <code>std</code>: a family name that keeps its many names apart from yours. You will meet namespaces properly later; for now, everything from the standard library starts with <code>std::</code>.' },
    { t: 'p', html: 'The indentation (four spaces inside the braces) is for people. The compiler ignores it, but you should keep it: it shows at a glance which lines belong to which block.' },

    { t: 'h', text: 'Printing more than one thing' },
    { t: 'p', html: '<code>std::cout</code> prints exactly what you give it and nothing more. Several <code>&lt;&lt;</code> in a row print one thing after another; if you leave out <code>\\n</code>, the next text continues on the same line.' },
    { t: 'code', title: 'lines.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    std::cout << "Player 1";', 'No <code>\\n</code> here, so the cursor stays at the end of this text.'],
      ['    std::cout << " ready\\n";', 'This continues the same line, then ends it.'],
      ['    std::cout << "Player " << 2 << "\\n" << "ready" << std::endl;', 'One statement can chain many <code>&lt;&lt;</code>. A number is printed as a number. <code>std::endl</code> ends the line too (and makes sure the text is shown right away).'],
      ['}'],
    ] },

    { t: 'h', text: 'Escape sequences' },
    { t: 'p', html: 'Some characters cannot be typed directly inside a string. You write them with a backslash first. These are the ones you will use most:' },
    { t: 'table', head: ['You write', 'You get'], rows: [
      ['<code>\\n</code>', 'a new line'],
      ['<code>\\t</code>', 'a tab (jumps to the next column stop)'],
      ['<code>\\"</code>', 'a double quote, without ending the string'],
      ['<code>\\\\</code>', 'one backslash'],
    ] },

    { t: 'h', text: 'Comments' },
    { t: 'p', html: 'Comments are notes for people. The compiler throws them away.' },
    { t: 'code', title: 'comments.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['/* A block comment can span', '<code>/*</code> starts a block comment and <code>*/</code> ends it, even many lines later.'],
      ['   several lines. */'],
      ['int main() {'],
      ['    // A line comment runs to the end of the line.', '<code>//</code> comments out the rest of the line.'],
      ['    std::cout << "Comments are not printed\\n"; // not even this one'],
      ['}'],
    ] },

    { t: 'h', text: 'Reading an error' },
    { t: 'p', html: 'You will see compiler errors every day. They are not failures; they are the compiler pointing at the exact spot it could not understand. Run this broken program:' },
    { t: 'code', title: 'broken.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['int main() {'],
      ['    std::cout << "Almost there\\n"', 'The semicolon is missing at the end of this line.'],
      ['    return 0;'],
      ['}'],
    ] },
    { t: 'p', html: 'The message starts with <code>broken.cpp:4:34</code>: file, line 4, column 34. Then it says what it expected (<code>expected \';\' after expression</code>), shows the line, and puts a <code>^</code> under the spot. Always fix the <em>first</em> error first: one mistake often causes several messages after it.' },
    { t: 'note', kind: 'warn', html: 'An error says the program could not be built, so nothing ran. A <em>warning</em> means it was built, but the compiler thinks something looks wrong. Treat warnings as bugs until you are sure they are not.' },

    { t: 'quiz', q: 'What does <code>return 0;</code> at the end of <code>main</code> tell the system?', options: [
      'That the program printed zero lines',
      'That the program finished successfully',
      'That the program should start again',
    ], answer: 1, explain: 'By convention 0 means success. Programs return other numbers to report what went wrong.' },
    { t: 'quiz', q: 'What does this print?<pre>std::cout &lt;&lt; "A";\nstd::cout &lt;&lt; "B\\n";\nstd::cout &lt;&lt; "C";</pre>', options: [
      'A, B and C on three lines',
      '<code>AB</code> on one line, then <code>C</code> on the next',
      '<code>ABC</code> on one line',
    ], answer: 1, explain: 'Only the <code>\\n</code> after B ends a line. A and B share the first line; C starts the second.' },
  ],

  exercises: [
    {
      id: 'cpp-hello-1',
      title: 'Title screen',
      prompt: '<p>Make the program print exactly these two lines:</p><pre>Opcode\nLearning C++, one byte at a time.</pre><p>Capital letters, spaces and the full stop all count.</p>',
      files: { 'main.cpp': '#include <iostream>\n\nint main() {\n    // Print the two lines here.\n\n    return 0;\n}\n' },
      tests: [{ name: 'Prints the title screen', expect: 'Opcode\nLearning C++, one byte at a time.\n' }],
      hints: [
        'Use one <code>std::cout &lt;&lt; ...;</code> per line, and end each string with <code>\\n</code>.',
        'The first line is <code>std::cout &lt;&lt; "Opcode\\n";</code>',
      ],
      solution: { 'main.cpp': '#include <iostream>\n\nint main() {\n    std::cout << "Opcode\\n";\n    std::cout << "Learning C++, one byte at a time.\\n";\n    return 0;\n}\n' },
    },
    {
      id: 'cpp-hello-2',
      title: 'Escape artist',
      prompt: '<p>Print exactly these three lines. Each one needs an escape sequence.</p><pre>Mario says: "Let\'s go!"\nROMs live in C:\\nes\\roms\nA\tB</pre><p>The last line is <code>A</code>, a tab, then <code>B</code>.</p>',
      files: { 'main.cpp': '#include <iostream>\n\nint main() {\n\n    return 0;\n}\n' },
      tests: [{ name: 'Prints quotes, backslashes and a tab', expect: 'Mario says: "Let\'s go!"\nROMs live in C:\\nes\\roms\nA\tB\n' }],
      hints: [
        'A double quote inside a string is written <code>\\"</code>.',
        'Careful with the path: <code>\\n</code> inside <code>C:\\nes</code> would become a new line. To print one backslash you write <code>\\\\</code>.',
        'A tab is <code>\\t</code>. The single quote in <em>Let\'s</em> needs no escape inside double quotes.',
      ],
      solution: { 'main.cpp': '#include <iostream>\n\nint main() {\n    std::cout << "Mario says: \\"Let\'s go!\\"\\n";\n    std::cout << "ROMs live in C:\\\\nes\\\\roms\\n";\n    std::cout << "A\\tB\\n";\n    return 0;\n}\n' },
    },
  ],
});
