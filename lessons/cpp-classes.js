(() => {
const R = String.raw;

Course.add({
  id: 'cpp-classes',
  part: 'cpp',
  title: 'Classes',
  summary: 'Grouping data and the functions that work on it into one type: structs, member functions, private data, constructors and enum class.',
  blocks: [
    { t: 'p', html: 'A sprite has a position, a tile number and a direction. The CPU has five registers. Passing each value around separately would be hopeless. A <em>class</em> bundles related values into one new type, together with the functions that work on them. Every part of your emulator will be one: <code>Cpu</code>, <code>Bus</code>, <code>Ppu</code>, <code>Cartridge</code>, <code>Controller</code>.' },

    { t: 'h', text: 'struct: values that belong together' },
    { t: 'code', title: 'struct.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['struct Sprite {', 'Defines a new type called <code>Sprite</code>. Nothing is created yet: this is the plan for what every sprite contains.'],
      ['    int x = 0;', 'A <em>member</em> (also called a field). <code>= 0</code> is its starting value in every new sprite.'],
      ['    int y = 0;'],
      ['    int tile = 0;'],
      ['    bool flip = false;'],
      ['};', 'Note the semicolon after the closing brace. Forgetting it gives a confusing error on the next line.'],
      [''],
      ['int main() {'],
      ['    Sprite mario;', 'A variable of the new type. It has its own <code>x</code>, <code>y</code>, <code>tile</code> and <code>flip</code>, all starting at their defaults.'],
      ['    mario.x = 40;', 'The dot reaches a member.'],
      ['    mario.tile = 0x32;'],
      ['    Sprite goomba{120, 200, 0x70, true};', 'Braces fill the members in order.'],
      ['    Sprite copy = goomba;', 'Assigning a struct copies every member.'],
      ['    copy.x = 0;'],
      [R`    std::cout << mario.x << " " << goomba.x << " " << copy.x << "\n";`, '<code>goomba</code> is unchanged: <code>copy</code> is a separate sprite.'],
      ['}'],
    ] },
    { t: 'p', html: 'Structs can contain any type, including arrays, strings and other structs, and you can make a <code>std::vector&lt;Sprite&gt;</code> just like a vector of <code>int</code>s. Pass them to functions by <code>const Sprite&amp;</code> to read them and by <code>Sprite&amp;</code> to change them.' },

    { t: 'h', text: 'Member functions' },
    { t: 'p', html: 'A function that only makes sense for one type can live inside it. Inside a <em>member function</em>, the members of the object it was called on are available by name.' },
    { t: 'code', title: 'member.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['struct Sprite {'],
      ['    int x = 0;'],
      ['    int y = 0;'],
      [''],
      ['    void move(int dx, int dy) {', 'A member function. It is called on one particular sprite, and <code>x</code> and <code>y</code> here mean that sprite\'s members.'],
      ['        x += dx;'],
      ['        y += dy;'],
      ['    }'],
      [''],
      ['    bool on_screen() const {', '<code>const</code> after the parentheses promises that this function only reads the object. It can be called on a <code>const Sprite</code>, and the compiler stops it from changing anything.'],
      ['        return x >= 0 && x < 256 && y >= 0 && y < 240;'],
      ['    }'],
      ['};'],
      [''],
      ['int main() {'],
      ['    Sprite s;'],
      ['    s.move(10, 20);', 'Called with a dot, like <code>v.push_back(1)</code>.'],
      ['    s.move(300, 0);'],
      [R`    std::cout << s.x << "," << s.y << " visible: " << s.on_screen() << "\n";`],
      ['}'],
    ] },

    { t: 'h', text: 'class: keeping the data private' },
    { t: 'p', html: 'If anyone can change a member, anyone can put it in an impossible state: a negative number of lives, a timer past its limit. A <code>class</code> separates what other code may use (<code>public</code>) from what only its own member functions may touch (<code>private</code>). The private part can then be changed freely without breaking the code that uses the class.' },
    { t: 'code', title: 'class.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['class Lives {'],
      ['public:', 'Everything after <code>public:</code> can be used from outside the class.'],
      ['    explicit Lives(int start) : count_(start) {}', 'A <em>constructor</em>: it has the class\'s name and no return type, and runs when an object is created. After the colon comes the <em>member initialiser list</em>, which gives each member its first value. <code>explicit</code> stops the compiler from turning a plain <code>int</code> into a <code>Lives</code> without being asked.'],
      [''],
      ['    void lose() {'],
      ['        if (count_ > 0) {', 'The class guards its own data: <code>count_</code> can never go below zero, because no code outside the class can touch it.'],
      ['            count_--;'],
      ['        }'],
      ['    }'],
      [''],
      ['    int count() const { return count_; }', 'A <em>getter</em>: read access without write access.'],
      ['    bool game_over() const { return count_ == 0; }'],
      [''],
      ['private:', 'Only member functions of <code>Lives</code> can use what follows.'],
      ['    int count_;', 'A common convention is to end private member names with <code>_</code>, so they cannot be mistaken for parameters or local variables.'],
      ['};'],
      [''],
      ['int main() {'],
      ['    Lives lives(2);', 'Creating the object calls the constructor with 2. <code>Lives lives{2};</code> works too.'],
      ['    lives.lose();'],
      ['    lives.lose();'],
      ['    lives.lose();'],
      [R`    std::cout << lives.count() << " " << lives.game_over() << "\n";`],
      ['    // lives.count_ = 5;   would not compile: count_ is private', 'Try removing the <code>//</code>: the compiler refuses.'],
      ['}'],
    ] },
    { t: 'p', html: 'The only difference between <code>struct</code> and <code>class</code> is the default: members of a <code>struct</code> are public unless you say otherwise, members of a <code>class</code> are private. By convention, use <code>struct</code> for plain bundles of data and <code>class</code> when the type protects its data with member functions.' },

    { t: 'h', text: 'Defining member functions outside the class' },
    { t: 'p', html: 'When a class has many member functions, the class body becomes hard to read. You can write only the <em>declarations</em> inside the class, and the bodies afterwards. The name <code>Class::function</code> says which class the function belongs to.' },
    { t: 'code', title: 'timer.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['class Timer {'],
      ['public:'],
      ['    explicit Timer(int frames);', 'Declarations only: a list of what the class can do.'],
      ['    void tick();'],
      ['    bool done() const;'],
      [''],
      ['private:'],
      ['    int left_;'],
      ['};'],
      [''],
      ['Timer::Timer(int frames) : left_(frames) {}', '<code>Timer::</code> in front: this is the constructor of <code>Timer</code>.'],
      [''],
      ['void Timer::tick() {', 'A member function defined outside. It still sees the private members, because it belongs to the class.'],
      ['    if (left_ > 0) {'],
      ['        left_--;'],
      ['    }'],
      ['}'],
      [''],
      ['bool Timer::done() const {', 'The <code>const</code> is repeated in the definition.'],
      ['    return left_ == 0;'],
      ['}'],
      [''],
      ['int main() {'],
      ['    Timer t(3);'],
      ['    int frames = 0;'],
      ['    while (!t.done()) {'],
      ['        t.tick();'],
      ['        frames++;'],
      ['    }'],
      [R`    std::cout << "done after " << frames << " frames\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'This is how real projects are laid out: the class with its declarations goes in a header file, and the member function bodies go in a <code>.cpp</code> file. In the exercises below the classes are already declared in headers; lesson 12 explains how headers work.' },

    { t: 'h', text: 'enum class: a fixed set of names' },
    { t: 'p', html: 'Some values come from a short, fixed list: the eight buttons on a controller, or the directions a character faces. An <code>enum class</code> gives each one a name. Using the names instead of plain numbers makes code readable and lets the compiler catch mistakes.' },
    { t: 'code', title: 'enum.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['enum class Button { A, B, Select, Start, Up, Down, Left, Right };', 'Eight names. Behind the scenes they are numbered 0 to 7 in this order, which is exactly the order the NES controller sends its buttons in.'],
      [''],
      ['const char* name(Button b) {', '<code>const char*</code> is how text written in quotes is passed around when you do not need a <code>std::string</code>: a pointer to its first character.'],
      ['    switch (b) {', 'A <code>switch</code> fits enums well. If you forget a value, Clang warns you.'],
      ['    case Button::A: return "A";', 'The names are written with the enum\'s name in front: <code>Button::A</code>. That keeps them from clashing with other names.'],
      ['    case Button::B: return "B";'],
      ['    case Button::Start: return "Start";'],
      ['    default: return "other";', '<code>default</code> handles every value not listed.'],
      ['    }'],
      ['}'],
      [''],
      ['int main() {'],
      ['    Button pressed = Button::Start;'],
      [R`    std::cout << name(pressed) << " is number " << static_cast<int>(pressed) << "\n";`, 'An <code>enum class</code> value does not turn into a number by itself; ask for the conversion with <code>static_cast</code>.'],
      ['    Button b = static_cast<Button>(1);', 'And back: number 1 is <code>Button::B</code>.'],
      [R`    std::cout << name(b) << "\n";`],
      ['}'],
    ] },

    { t: 'h', text: 'Objects made of objects' },
    { t: 'p', html: 'A member can be an object of another class. A whole machine is built this way, and each part keeps its own data private:' },
    { t: 'code', title: 'console.cpp', lines: [
      ['class Console {', 'A sketch of where the course is heading.'],
      ['public:'],
      ['    void step_frame();'],
      ['private:'],
      ['    Bus bus_;', 'The console owns one of each part.'],
      ['    Cpu cpu_;'],
      ['    Ppu ppu_;'],
      ['    Controller pad_;'],
      ['};'],
    ] },
    { t: 'note', kind: 'nes', html: 'Your emulator\'s <code>Cpu</code> class will have the five registers as private members, a <code>step()</code> member function that runs one instruction, and a few <code>const</code> getters so the tests can look at the registers without being able to change them.' },

    { t: 'quiz', q: 'A class has <code>private: int hp_;</code>. Where can <code>hp_</code> be used?', options: ['Anywhere in the program', 'Only in member functions of that class', 'Only in its constructor'], answer: 1, explain: 'Private members are reachable from the class\'s own member functions (constructors included), and nowhere else.' },
    { t: 'quiz', q: 'What does <code>const</code> mean in <code>int count() const;</code>?', options: ['The function returns a constant', 'The function does not change the object it is called on', 'The function cannot be called more than once'], answer: 1, explain: 'A <code>const</code> member function only reads the object. That is why it can be called on <code>const</code> objects and through <code>const&amp;</code> references.' },
  ],

  exercises: [
    {
      id: 'cpp-classes-1',
      title: 'Move a sprite',
      prompt: '<p>The file <code>sprite.h</code> declares the <code>Sprite</code> struct, with a member function <code>void move(int dx, int dy);</code> (look at it, but leave it as it is). Write its body in <code>main.cpp</code>, as <code>void Sprite::move(int dx, int dy)</code>:</p><ul><li>Add <code>dx</code> to <code>x</code> and <code>dy</code> to <code>y</code>.</li><li>Keep <code>x</code> between 0 and 248 and <code>y</code> between 0 and 232, so the 8×8 sprite stays fully on the 256×240 screen. Clamp values that go past those limits.</li><li>If the sprite moved left (<code>dx &lt; 0</code>) set <code>flip</code> to <code>true</code>; if it moved right, set it to <code>false</code>; if <code>dx</code> is 0, leave it as it was.</li></ul>',
      files: {
        'main.cpp': R`#include <iostream>
#include "sprite.h"

void Sprite::move(int dx, int dy) {

}

int main() {
    Sprite s{100, 100, 7, false};
    s.move(-30, 200);
    std::cout << "x=" << s.x << " y=" << s.y << " flip=" << s.flip << "\n";
}
`,
        'sprite.h': R`#pragma once

struct Sprite {
    int x = 0;
    int y = 0;
    int tile = 0;
    bool flip = false;   // true = drawn facing left

    void move(int dx, int dy);
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "sprite.h"
static void show(const Sprite& s) { std::cout << "x=" << s.x << " y=" << s.y << " tile=" << s.tile << " flip=" << s.flip << "\n"; }
int main() {
    int t = 0;
    std::cin >> t;
    Sprite s{100, 100, 7, false};
    if (t == 1) { s.move(5, -3); show(s); }
    if (t == 2) { s.move(500, 500); show(s); s.move(-1000, -1000); show(s); }
    if (t == 3) { s.move(-1, 0); show(s); s.move(0, 4); show(s); s.move(2, 0); show(s); }
}
` },
      tests: [
        { name: 'A small move', stdin: '1', expect: 'x=105 y=97 tile=7 flip=0\n' },
        { name: 'Clamped at the screen edges', stdin: '2', expect: 'x=248 y=232 tile=7 flip=0\nx=0 y=0 tile=7 flip=1\n' },
        { name: 'Facing follows the last horizontal move', stdin: '3', expect: 'x=99 y=100 tile=7 flip=1\nx=99 y=104 tile=7 flip=1\nx=101 y=104 tile=7 flip=0\n' },
      ],
      hints: [
        'Inside <code>Sprite::move</code>, the members are simply <code>x</code>, <code>y</code> and <code>flip</code>.',
        'Update the position first, then clamp with four <code>if</code>s (or a <code>clamp</code> function like the one from lesson 4), then set <code>flip</code> based on the sign of <code>dx</code>.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include "sprite.h"

static int clamp(int v, int lo, int hi) {
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
}

void Sprite::move(int dx, int dy) {
    x = clamp(x + dx, 0, 248);
    y = clamp(y + dy, 0, 232);
    if (dx < 0) flip = true;
    if (dx > 0) flip = false;
}

int main() {
    Sprite s{100, 100, 7, false};
    s.move(-30, 200);
    std::cout << "x=" << s.x << " y=" << s.y << " flip=" << s.flip << "\n";
}
` },
    },
    {
      id: 'cpp-classes-2',
      title: 'A divider',
      prompt: '<p>The NES sound chip is full of <em>dividers</em>: counters that let only one out of every N ticks through. <code>divider.h</code> declares the class:</p><pre>class Divider {\npublic:\n    explicit Divider(int period);\n    bool tick();          // true once every period ticks\n    int count() const;    // ticks since tick() last returned true\n    void reset();         // back to the state just after construction\nprivate:\n    int period_;\n    int count_;\n};</pre><p>Write the four member functions in <code>main.cpp</code>. With a period of 3, the calls to <code>tick()</code> return <code>false, false, true, false, false, true, …</code> and <code>count()</code> goes 1, 2, 0, 1, 2, 0. A new divider has a count of 0. The period is always at least 1.</p>',
      files: {
        'main.cpp': R`#include <iostream>
#include "divider.h"

// Write Divider::Divider, Divider::tick, Divider::count and Divider::reset here.

int main() {
    Divider d(3);
    for (int i = 0; i < 7; i++) {
        bool fired = d.tick();
        std::cout << fired << " (count " << d.count() << ")\n";
    }
}
`,
        'divider.h': R`#pragma once

class Divider {
public:
    explicit Divider(int period);
    bool tick();          // true once every period ticks
    int count() const;    // ticks since tick() last returned true
    void reset();         // back to the state just after construction

private:
    int period_;
    int count_;
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "divider.h"
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { Divider d(3); std::cout << d.count() << ":"; for (int i = 0; i < 7; i++) { bool f = d.tick(); std::cout << " " << f << d.count(); } std::cout << "\n"; }
    if (t == 2) { Divider d(1); for (int i = 0; i < 4; i++) std::cout << d.tick(); std::cout << " " << d.count() << "\n"; }
    if (t == 3) { Divider d(1000); int fired = 0; for (int i = 0; i < 4500; i++) fired += d.tick(); std::cout << fired << " " << d.count() << "\n"; }
    if (t == 4) { Divider d(4); d.tick(); d.tick(); d.reset(); std::cout << d.count(); for (int i = 0; i < 4; i++) std::cout << " " << d.tick(); std::cout << "\n"; }
    if (t == 5) { const Divider d(5); std::cout << d.count() << "\n"; }
}
` },
      tests: [
        { name: 'Period 3', stdin: '1', expect: '0: 01 02 10 01 02 10 01\n' },
        { name: 'Period 1 fires every tick', stdin: '2', expect: '1111 0\n' },
        { name: 'A long period', stdin: '3', expect: '4 500\n' },
        { name: 'reset starts again', stdin: '4', expect: '0 0 0 0 1\n' },
        { name: 'count works on a const divider', stdin: '5', expect: '0\n' },
      ],
      hints: [
        'The constructor stores the period and starts the count at 0: <code>Divider::Divider(int period) : period_(period), count_(0) {}</code>',
        'In <code>tick()</code>, add 1 to <code>count_</code>. If it has reached <code>period_</code>, set it back to 0 and return <code>true</code>; otherwise return <code>false</code>. Remember to repeat <code>const</code> in the definition of <code>count()</code>.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include "divider.h"

Divider::Divider(int period) : period_(period), count_(0) {}

bool Divider::tick() {
    count_++;
    if (count_ == period_) {
        count_ = 0;
        return true;
    }
    return false;
}

int Divider::count() const {
    return count_;
}

void Divider::reset() {
    count_ = 0;
}

int main() {
    Divider d(3);
    for (int i = 0; i < 7; i++) {
        bool fired = d.tick();
        std::cout << fired << " (count " << d.count() << ")\n";
    }
}
` },
    },
    {
      id: 'cpp-classes-3',
      title: 'Controller buttons',
      prompt: '<p>The NES controller has eight buttons, sent in this fixed order: A, B, Select, Start, Up, Down, Left, Right. <code>controller.h</code> declares an <code>enum class Button</code> in that order, and a <code>Controller</code> class that remembers which buttons are held down, in a private <code>std::array&lt;bool, 8&gt;</code>. Fill in its member functions in <code>main.cpp</code>:</p><ul><li><code>void press(Button b)</code> and <code>void release(Button b)</code></li><li><code>bool is_down(Button b) const</code></li><li><code>int held() const</code>: how many buttons are down right now.</li></ul><p>Pressing a button that is already down does nothing extra.</p>',
      files: {
        'main.cpp': R`#include <iostream>
#include "controller.h"

void Controller::press(Button b) {

}

void Controller::release(Button b) {

}

bool Controller::is_down(Button b) const {
    return false;
}

int Controller::held() const {
    return 0;
}

int main() {
    Controller pad;
    pad.press(Button::Start);
    pad.press(Button::A);
    pad.release(Button::A);
    std::cout << pad.is_down(Button::Start) << pad.is_down(Button::A) << " held " << pad.held() << "\n";
}
`,
        'controller.h': R`#pragma once
#include <array>

enum class Button { A, B, Select, Start, Up, Down, Left, Right };

class Controller {
public:
    void press(Button b);
    void release(Button b);
    bool is_down(Button b) const;
    int held() const;          // how many buttons are down

private:
    std::array<bool, 8> down_{};   // all false to begin with
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "controller.h"
int main() {
    int t = 0;
    std::cin >> t;
    Controller pad;
    auto show = [&]() { for (int i = 0; i < 8; i++) std::cout << pad.is_down(static_cast<Button>(i)); std::cout << " " << pad.held() << "\n"; };
    if (t == 1) { show(); pad.press(Button::A); show(); pad.press(Button::Right); show(); }
    if (t == 2) { pad.press(Button::Up); pad.press(Button::Up); show(); pad.release(Button::Up); show(); pad.release(Button::Down); show(); }
    if (t == 3) { for (int i = 0; i < 8; i++) pad.press(static_cast<Button>(i)); show(); pad.release(Button::Select); pad.release(Button::Left); show(); }
    if (t == 4) { pad.press(Button::B); const Controller& view = pad; std::cout << view.is_down(Button::B) << view.is_down(Button::Start) << " " << view.held() << "\n"; }
}
` },
      tests: [
        { name: 'Pressing buttons', stdin: '1', expect: '00000000 0\n10000000 1\n10000001 2\n' },
        { name: 'Pressing twice, releasing', stdin: '2', expect: '00001000 1\n00000000 0\n00000000 0\n' },
        { name: 'Every button in its place', stdin: '3', expect: '11111111 8\n11011101 6\n' },
        { name: 'Reading through a const reference', stdin: '4', expect: '10 1\n' },
      ],
      hints: [
        'The array is indexed by the button\'s number: <code>down_[static_cast&lt;int&gt;(b)] = true;</code>',
        'For <code>held()</code>, loop over <code>down_</code> with <code>for (bool d : down_)</code> and count the <code>true</code>s. Mark <code>is_down</code> and <code>held</code> <code>const</code> in their definitions too.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include "controller.h"

void Controller::press(Button b) {
    down_[static_cast<int>(b)] = true;
}

void Controller::release(Button b) {
    down_[static_cast<int>(b)] = false;
}

bool Controller::is_down(Button b) const {
    return down_[static_cast<int>(b)];
}

int Controller::held() const {
    int count = 0;
    for (bool d : down_) {
        if (d) count++;
    }
    return count;
}

int main() {
    Controller pad;
    pad.press(Button::Start);
    pad.press(Button::A);
    pad.release(Button::A);
    std::cout << pad.is_down(Button::Start) << pad.is_down(Button::A) << " held " << pad.held() << "\n";
}
` },
    },
  ],
});
})();
