(() => {
const R = String.raw;

Course.add({
  id: 'cpp-inheritance',
  part: 'cpp',
  title: 'Inheritance and virtual functions',
  summary: 'Building a class on top of another, and calling the right version of a function through a base class: virtual, override, abstract classes and std::unique_ptr to a base.',
  blocks: [
    { t: 'p', html: 'NES cartridges are not all wired the same way. Small games connect their ROM chips straight to the console; bigger ones add a <em>mapper</em> chip that swaps parts of the ROM in and out, and there are dozens of different mappers. The rest of the console does not care which one is inside: it just reads and writes the cartridge. C++ expresses "many kinds of the same thing" with <em>inheritance</em> and <em>virtual functions</em>.' },

    { t: 'h', text: 'A class built on another' },
    { t: 'p', html: 'A class can <em>derive</em> from another: it starts with everything the <em>base class</em> has and adds more. Write the base after a colon.' },
    { t: 'code', title: 'derive.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <string>'],
      [''],
      ['class Enemy {', 'The base class: what every enemy has in common.'],
      ['public:'],
      ['    Enemy(std::string name, int hp) : name_(name), hp_(hp) {}'],
      ['    void hit() {'],
      ['        if (hp_ > 0) hp_--;'],
      ['    }'],
      ['    bool defeated() const { return hp_ == 0; }'],
      ['    const std::string& name() const { return name_; }'],
      ['private:'],
      ['    std::string name_;'],
      ['    int hp_;'],
      ['};'],
      [''],
      ['class Koopa : public Enemy {', '<code>Koopa</code> derives from <code>Enemy</code>. <code>public</code> here means everything public in <code>Enemy</code> stays public in <code>Koopa</code>; it is what you want almost always.'],
      ['public:'],
      ['    Koopa() : Enemy("Koopa", 2) {}', 'The derived constructor must construct its base first. It does that at the start of its initialiser list.'],
      ['    void hide() { in_shell_ = true; }', '<code>Koopa</code> adds things <code>Enemy</code> does not have.'],
      ['    bool in_shell() const { return in_shell_; }'],
      ['private:'],
      ['    bool in_shell_ = false;'],
      ['};'],
      [''],
      ['int main() {'],
      ['    Koopa k;'],
      ['    k.hit();', '<code>hit</code> comes from <code>Enemy</code>: a <code>Koopa</code> is an <code>Enemy</code>.'],
      ['    k.hide();'],
      [R`    std::cout << k.name() << " shell=" << k.in_shell() << " defeated=" << k.defeated() << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'A derived class cannot touch its base\'s <code>private</code> members: <code>Koopa</code> cannot write <code>hp_</code> directly, only call <code>hit()</code>. If a base wants to share a member with its derived classes, but not with everyone, it marks it <code>protected</code>.' },

    { t: 'h', text: 'Using a derived object as its base' },
    { t: 'p', html: 'Because a <code>Koopa</code> is an <code>Enemy</code>, a reference or pointer to <code>Enemy</code> can refer to a <code>Koopa</code>. That lets one function handle every kind of enemy. But which version of a function does it call when the derived class has its own?' },
    { t: 'code', title: 'virtual.cpp', run: true, lines: [
      ['#include <iostream>'],
      [''],
      ['class Enemy {'],
      ['public:'],
      ['    virtual ~Enemy() = default;', 'A base class meant to be used this way needs a <em>virtual destructor</em>. You will see why below; for now, always add this line.'],
      ['    virtual int damage() const { return 1; }', '<code>virtual</code> means: when called through a reference or pointer to <code>Enemy</code>, look at what the object really is and run <em>its</em> version.'],
      ['    const char* name() const { return "an enemy"; }', 'Not virtual: through an <code>Enemy&amp;</code>, this version always runs.'],
      ['};'],
      [''],
      ['class Bowser : public Enemy {'],
      ['public:'],
      ['    int damage() const override { return 4; }', '<code>override</code> says "this replaces a virtual function of the base". If the base has no such function (a typo, a missing <code>const</code>), the compiler stops you, which catches a whole family of silent bugs.'],
      ['    const char* name() const { return "Bowser"; }', 'This hides the base\'s <code>name</code>, but only when called on a <code>Bowser</code> directly.'],
      ['};'],
      [''],
      ['void attack(const Enemy& e) {', 'This function knows nothing about <code>Bowser</code>.'],
      [R`    std::cout << e.name() << " hits for " << e.damage() << "\n";`, '<code>damage()</code> is virtual, so the real object\'s version runs. <code>name()</code> is not, so <code>Enemy</code>\'s runs.'],
      ['}'],
      [''],
      ['int main() {'],
      ['    Enemy plain;'],
      ['    Bowser boss;'],
      ['    attack(plain);'],
      ['    attack(boss);', 'Prints "an enemy hits for 4": the virtual function found <code>Bowser</code>\'s version, the plain one did not.'],
      [R`    std::cout << boss.name() << "\n";`],
      ['}'],
    ] },
    { t: 'p', html: 'Calling the right version for the real object, through a reference or pointer to the base, is called <em>polymorphism</em>. Each object of a class with virtual functions carries a hidden pointer to a table of its class\'s versions, and a virtual call looks the function up there. It costs a little more than a normal call, which is fine for a cartridge access and something to keep in mind in the innermost loops.' },

    { t: 'h', text: 'Abstract classes: only the shape' },
    { t: 'p', html: 'Sometimes the base class has no sensible version of a function at all. Writing <code>= 0</code> instead of a body makes it a <em>pure virtual</em> function. A class with one is <em>abstract</em>: you cannot create objects of it, only of derived classes that supply every missing function. An abstract class with only pure virtual functions is an <em>interface</em>: a list of what something can do, with no opinion on how.' },
    { t: 'code', title: 'abstract.cpp', run: true, lines: [
      ['#include <cstdint>'],
      ['#include <cstdio>'],
      ['#include <memory>'],
      ['#include <vector>'],
      [''],
      ['class Cartridge {', 'An interface: anything that can be read from.'],
      ['public:'],
      ['    virtual ~Cartridge() = default;'],
      ['    virtual std::uint8_t read(std::uint16_t addr) const = 0;', 'Pure virtual: no body here.'],
      ['};'],
      [''],
      ['class Blank : public Cartridge {'],
      ['public:'],
      ['    std::uint8_t read(std::uint16_t) const override { return 0xFF; }', 'A parameter you do not use can be left unnamed.'],
      ['};'],
      [''],
      ['class Counting : public Cartridge {'],
      ['public:'],
      ['    std::uint8_t read(std::uint16_t addr) const override { return addr & 0xFF; }'],
      ['};'],
      [''],
      ['int main() {'],
      ['    // Cartridge c;   would not compile: Cartridge is abstract'],
      ['    std::vector<std::unique_ptr<Cartridge>> carts;', 'The usual way to keep objects of different derived classes together: a vector of <code>unique_ptr</code>s to the base. Each object lives on the heap with its own size and type.'],
      ['    carts.push_back(std::make_unique<Blank>());', 'A <code>unique_ptr&lt;Blank&gt;</code> converts to a <code>unique_ptr&lt;Cartridge&gt;</code> automatically.'],
      ['    carts.push_back(std::make_unique<Counting>());'],
      ['    for (const auto& c : carts) {'],
      [R`        std::printf("%02X ", c->read(0x8042));`, 'One line of code, a different function for each cartridge.'],
      ['    }'],
      [R`    std::printf("\n");`],
      ['}', 'When <code>carts</code> is destroyed, each <code>unique_ptr</code> deletes its object through a <code>Cartridge*</code>. The virtual destructor is what makes that run <code>Blank</code>\'s and <code>Counting</code>\'s destructors instead of only <code>Cartridge</code>\'s.'],
    ] },
    { t: 'note', kind: 'warn', html: 'Deleting a derived object through a pointer to a base without a virtual destructor is undefined behaviour: the derived part is never cleaned up, and anything can happen. The rule is simple: if a class has any virtual function, give it <code>virtual ~Name() = default;</code>.' },

    { t: 'h', text: 'When to use it' },
    { t: 'p', html: 'Inheritance is for "is a kind of" relationships, where code must work with any of the kinds without knowing which one it has: cartridge mappers, sound channels in a mixer, enemies in a list. For "has a" relationships (a console has a CPU) use members, as in lesson 8. If you are not sure, prefer members: they are simpler.' },
    { t: 'note', kind: 'nes', html: 'In the mapper lesson you will write an abstract <code>Mapper</code> class with virtual <code>read</code> and <code>write</code> functions, then one derived class per mapper chip: <code>Nrom</code>, <code>Uxrom</code>, <code>Cnrom</code>, <code>Mmc1</code>, <code>Mmc3</code>. The cartridge loader creates the right one with <code>std::make_unique</code>, and the bus only ever sees a <code>Mapper&amp;</code>.' },

    { t: 'quiz', q: '<code>Base</code> has <code>virtual void f()</code> and <code>Derived</code> overrides it. Which version runs for <code>Base&amp; r = derived_object; r.f();</code>?', options: ['<code>Base::f</code>, because <code>r</code> is a <code>Base&amp;</code>', '<code>Derived::f</code>, because the object is a <code>Derived</code>', 'Neither: it does not compile'], answer: 1, explain: 'That is exactly what <code>virtual</code> is for: the call is decided by the real type of the object, not the type of the reference.' },
    { t: 'quiz', q: 'What does <code>override</code> add?', options: ['It makes the function virtual', 'The compiler checks that it really replaces a virtual function of the base', 'It makes the function faster'], answer: 1, explain: 'Without <code>override</code>, a typo or a missing <code>const</code> quietly creates a new, unrelated function. With it, that is a compile error.' },
  ],

  exercises: [
    {
      id: 'cpp-inheritance-1',
      title: 'Goomba and Bowser',
      prompt: '<p><code>enemies.h</code> has an <code>Enemy</code> base class with two virtual functions, <code>name()</code> and <code>damage()</code>, and a non-virtual <code>describe()</code> that uses them. It also has the start of two derived classes. Finish them, in <code>enemies.h</code>:</p><ul><li><code>Goomba</code>: 1 hit point, name <code>"Goomba"</code>, the default damage.</li><li><code>Bowser</code>: 5 hit points, name <code>"Bowser"</code>, damage 4.</li></ul><p>Mark every function you replace with <code>override</code>.</p>',
      files: {
        'main.cpp': R`#include <iostream>
#include "enemies.h"

int main() {
    Goomba g;
    Bowser b;
    const Enemy& boss = b;
    std::cout << g.describe() << "\n";
    std::cout << boss.describe() << "\n";
}
`,
        'enemies.h': R`#pragma once
#include <string>

class Enemy {
public:
    explicit Enemy(int hp) : hp_(hp) {}
    virtual ~Enemy() = default;

    virtual std::string name() const { return "Enemy"; }
    virtual int damage() const { return 1; }

    void hit() { if (hp_ > 0) hp_--; }
    bool defeated() const { return hp_ == 0; }
    std::string describe() const {
        return name() + ": " + std::to_string(hp_) + " hp, " + std::to_string(damage()) + " damage";
    }

private:
    int hp_;
};

class Goomba : public Enemy {
public:
    Goomba() : Enemy(1) {}
};

class Bowser : public Enemy {
public:
    Bowser() : Enemy(1) {}
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "enemies.h"
int main() {
    int t = 0;
    std::cin >> t;
    Goomba g;
    Bowser b;
    if (t == 1) { std::cout << g.describe() << "\n"; std::cout << b.describe() << "\n"; }
    if (t == 2) { const Enemy& e1 = g; const Enemy& e2 = b; std::cout << e1.name() << " " << e1.damage() << " " << e2.name() << " " << e2.damage() << "\n"; }
    if (t == 3) { int hits = 0; while (!b.defeated()) { b.hit(); hits++; } g.hit(); std::cout << hits << " " << g.defeated() << "\n"; }
}
` },
      tests: [
        { name: 'Each enemy describes itself', stdin: '1', expect: 'Goomba: 1 hp, 1 damage\nBowser: 5 hp, 4 damage\n' },
        { name: 'The right versions run through an Enemy&', stdin: '2', expect: 'Goomba 1 Bowser 4\n' },
        { name: 'Hit points', stdin: '3', expect: '5 1\n' },
      ],
      rules: [{ re: '\\boverride\\b', must: true, msg: 'Mark the functions you replace with override.' }],
      hints: [
        'Inside <code>Goomba</code>, add <code>std::string name() const override { return "Goomba"; }</code>. It keeps the base\'s <code>damage()</code>.',
        'In <code>Bowser</code>, change the constructor to pass 5 to <code>Enemy</code>, and override both <code>name()</code> and <code>damage()</code>. The signatures must match the base exactly, <code>const</code> included.',
      ],
      solution: { 'enemies.h': R`#pragma once
#include <string>

class Enemy {
public:
    explicit Enemy(int hp) : hp_(hp) {}
    virtual ~Enemy() = default;

    virtual std::string name() const { return "Enemy"; }
    virtual int damage() const { return 1; }

    void hit() { if (hp_ > 0) hp_--; }
    bool defeated() const { return hp_ == 0; }
    std::string describe() const {
        return name() + ": " + std::to_string(hp_) + " hp, " + std::to_string(damage()) + " damage";
    }

private:
    int hp_;
};

class Goomba : public Enemy {
public:
    Goomba() : Enemy(1) {}
    std::string name() const override { return "Goomba"; }
};

class Bowser : public Enemy {
public:
    Bowser() : Enemy(5) {}
    std::string name() const override { return "Bowser"; }
    int damage() const override { return 4; }
};
` },
    },
    {
      id: 'cpp-inheritance-2',
      title: 'A room full of enemies',
      prompt: '<p>This time <code>enemies.h</code> has an abstract <code>Enemy</code> and three finished kinds: <code>Goomba</code>, <code>Koopa</code> and <code>Bowser</code>. Write two functions in <code>main.cpp</code>:</p><ul><li><code>std::unique_ptr&lt;Enemy&gt; make_enemy(const std::string&amp; kind)</code>: given <code>"goomba"</code>, <code>"koopa"</code> or <code>"bowser"</code>, returns a new enemy of that kind. For anything else, returns <code>nullptr</code>.</li><li><code>int total_damage(const std::vector&lt;std::unique_ptr&lt;Enemy&gt;&gt;&amp; enemies)</code>: the sum of every enemy\'s <code>damage()</code>.</li></ul><p>Run reads enemy kinds from the input, one per word, and prints what it built.</p>',
      files: {
        'main.cpp': R`#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include "enemies.h"

std::unique_ptr<Enemy> make_enemy(const std::string& kind) {
    return nullptr;
}

int total_damage(const std::vector<std::unique_ptr<Enemy>>& enemies) {
    return 0;
}

int main() {
    std::vector<std::unique_ptr<Enemy>> room;
    std::string kind;
    while (std::cin >> kind) {
        std::unique_ptr<Enemy> e = make_enemy(kind);
        if (e) {
            room.push_back(std::move(e));
        } else {
            std::cout << "unknown enemy: " << kind << "\n";
        }
    }
    for (const auto& e : room) {
        std::cout << e->name() << "\n";
    }
    std::cout << "total damage " << total_damage(room) << "\n";
}
`,
        'enemies.h': R`#pragma once
#include <string>

class Enemy {
public:
    virtual ~Enemy() = default;
    virtual std::string name() const = 0;
    virtual int damage() const = 0;
};

class Goomba : public Enemy {
public:
    std::string name() const override { return "Goomba"; }
    int damage() const override { return 1; }
};

class Koopa : public Enemy {
public:
    std::string name() const override { return "Koopa"; }
    int damage() const override { return 2; }
};

class Bowser : public Enemy {
public:
    std::string name() const override { return "Bowser"; }
    int damage() const override { return 4; }
};
`,
      },
      stdin: 'goomba koopa goomba bowser lakitu',
      harness: { 'check.cpp': R`#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include "enemies.h"
std::unique_ptr<Enemy> make_enemy(const std::string& kind);
int total_damage(const std::vector<std::unique_ptr<Enemy>>& enemies);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { for (const char* k : {"goomba", "koopa", "bowser"}) { auto e = make_enemy(k); std::cout << (e ? e->name() : "nullptr") << " "; } std::cout << "\n"; }
    if (t == 2) { for (const char* k : {"Goomba", "lakitu", ""}) { auto e = make_enemy(k); std::cout << (e ? e->name() : "nullptr") << " "; } std::cout << "\n"; }
    if (t == 3) { std::vector<std::unique_ptr<Enemy>> v; std::cout << total_damage(v) << " "; v.push_back(make_enemy("bowser")); v.push_back(make_enemy("koopa")); v.push_back(make_enemy("goomba")); v.push_back(make_enemy("koopa")); std::cout << total_damage(v) << "\n"; }
    if (t == 4) { auto a = make_enemy("goomba"); auto b = make_enemy("goomba"); std::cout << (a.get() != b.get()) << "\n"; }
}
` },
      tests: [
        { name: 'Each kind is built', stdin: '1', expect: 'Goomba Koopa Bowser \n' },
        { name: 'Unknown kinds give nullptr', stdin: '2', expect: 'nullptr nullptr nullptr \n' },
        { name: 'Adding up the damage', stdin: '3', expect: '0 9\n' },
        { name: 'Every call builds a new enemy', stdin: '4', expect: '1\n' },
      ],
      hints: [
        'In <code>make_enemy</code>, compare <code>kind</code> with each name: <code>if (kind == "goomba") return std::make_unique&lt;Goomba&gt;();</code>. The <code>unique_ptr&lt;Goomba&gt;</code> becomes a <code>unique_ptr&lt;Enemy&gt;</code> on its way out.',
        'In <code>total_damage</code>, loop with <code>for (const auto&amp; e : enemies)</code> and add <code>e-&gt;damage()</code>: the virtual call finds each kind\'s value.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include "enemies.h"

std::unique_ptr<Enemy> make_enemy(const std::string& kind) {
    if (kind == "goomba") return std::make_unique<Goomba>();
    if (kind == "koopa") return std::make_unique<Koopa>();
    if (kind == "bowser") return std::make_unique<Bowser>();
    return nullptr;
}

int total_damage(const std::vector<std::unique_ptr<Enemy>>& enemies) {
    int total = 0;
    for (const auto& e : enemies) {
        total += e->damage();
    }
    return total;
}

int main() {
    std::vector<std::unique_ptr<Enemy>> room;
    std::string kind;
    while (std::cin >> kind) {
        std::unique_ptr<Enemy> e = make_enemy(kind);
        if (e) {
            room.push_back(std::move(e));
        } else {
            std::cout << "unknown enemy: " << kind << "\n";
        }
    }
    for (const auto& e : room) {
        std::cout << e->name() << "\n";
    }
    std::cout << "total damage " << total_damage(room) << "\n";
}
` },
    },
    {
      id: 'cpp-inheritance-3',
      title: 'RAM and ROM',
      prompt: '<p>Everything the CPU talks to can be described by one interface. <code>devices.h</code> declares it:</p><pre>class Device {\npublic:\n    virtual ~Device() = default;\n    virtual std::uint8_t read(std::uint16_t offset) const = 0;\n    virtual void write(std::uint16_t offset, std::uint8_t value) = 0;\n};</pre><p>and two devices, <code>Ram</code> and <code>Rom</code>. Write their member functions in <code>main.cpp</code>:</p><ul><li><code>Ram(int size)</code>: <code>size</code> bytes, all 0. <code>read</code> and <code>write</code> use the byte at <code>offset % size</code>, so the memory repeats (mirrors) like the NES\'s RAM.</li><li><code>Rom(std::vector&lt;std::uint8_t&gt; bytes)</code>: keeps the bytes. <code>read</code> mirrors the same way; <code>write</code> does nothing, because a ROM cannot be changed.</li></ul>',
      files: {
        'main.cpp': R`#include <cstdio>
#include "devices.h"

Ram::Ram(int size) {}

std::uint8_t Ram::read(std::uint16_t offset) const {
    return 0;
}

void Ram::write(std::uint16_t offset, std::uint8_t value) {

}

Rom::Rom(std::vector<std::uint8_t> bytes) {}

std::uint8_t Rom::read(std::uint16_t offset) const {
    return 0;
}

void Rom::write(std::uint16_t offset, std::uint8_t value) {

}

void poke_and_peek(Device& d) {
    d.write(0x0001, 0x42);
    std::printf("%02X %02X\n", d.read(0x0001), d.read(0x0801));
}

int main() {
    Ram ram(0x800);
    Rom rom({0xA9, 0x01, 0x00, 0x60});
    poke_and_peek(ram);
    poke_and_peek(rom);
}
`,
        'devices.h': R`#pragma once
#include <cstdint>
#include <vector>

class Device {
public:
    virtual ~Device() = default;
    virtual std::uint8_t read(std::uint16_t offset) const = 0;
    virtual void write(std::uint16_t offset, std::uint8_t value) = 0;
};

class Ram : public Device {
public:
    explicit Ram(int size);
    std::uint8_t read(std::uint16_t offset) const override;
    void write(std::uint16_t offset, std::uint8_t value) override;

private:
    std::vector<std::uint8_t> bytes_;
};

class Rom : public Device {
public:
    explicit Rom(std::vector<std::uint8_t> bytes);
    std::uint8_t read(std::uint16_t offset) const override;
    void write(std::uint16_t offset, std::uint8_t value) override;  // ignored

private:
    std::vector<std::uint8_t> bytes_;
};
`,
      },
      harness: { 'check.cpp': R`#include <cstdio>
#include <iostream>
#include <memory>
#include "devices.h"
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { Ram r(0x800); Device& d = r; std::printf("%02X ", d.read(0x10)); d.write(0x10, 0x99); std::printf("%02X ", d.read(0x10)); std::printf("%02X\n", d.read(0x11)); }
    if (t == 2) { Ram r(0x800); r.write(0x1FFF, 0x7E); std::printf("%02X ", r.read(0x07FF)); std::printf("%02X ", r.read(0x0FFF)); r.write(0x0800, 0x01); std::printf("%02X\n", r.read(0x0000)); }
    if (t == 3) { Rom r({0x4C, 0x00, 0xC0}); const Device& d = r; for (int i = 0; i < 6; i++) std::printf("%02X ", d.read(i)); std::printf("\n"); }
    if (t == 4) { std::unique_ptr<Device> d = std::make_unique<Rom>(std::vector<std::uint8_t>{1, 2, 3, 4}); d->write(1, 0xFF); d->write(5, 0xFF); std::printf("%02X ", d->read(1)); std::printf("%02X\n", d->read(0x4001)); }
    if (t == 5) { std::vector<std::unique_ptr<Device>> parts; parts.push_back(std::make_unique<Ram>(4)); parts.push_back(std::make_unique<Rom>(std::vector<std::uint8_t>(16, 0xEA))); for (auto& p : parts) { p->write(6, 0x33); std::printf("%02X ", p->read(2)); } std::printf("\n"); }
}
` },
      tests: [
        { name: 'RAM keeps what you write', stdin: '1', expect: '00 99 00\n' },
        { name: 'RAM is mirrored', stdin: '2', expect: '7E 7E 01\n' },
        { name: 'ROM reads its bytes, mirrored', stdin: '3', expect: '4C 00 C0 4C 00 C0 \n' },
        { name: 'Writes to ROM are ignored', stdin: '4', expect: '02 02\n' },
        { name: 'Different devices behind one interface', stdin: '5', expect: '33 EA \n' },
      ],
      hints: [
        'The constructors fill <code>bytes_</code> in their initialiser lists: <code>Ram::Ram(int size) : bytes_(size, 0) {}</code> and <code>Rom::Rom(std::vector&lt;std::uint8_t&gt; bytes) : bytes_(bytes) {}</code>.',
        '<code>read</code> is <code>return bytes_[offset % bytes_.size()];</code> in both classes. <code>Ram::write</code> stores into the same element; <code>Rom::write</code> stays empty.',
      ],
      solution: { 'main.cpp': R`#include <cstdio>
#include "devices.h"

Ram::Ram(int size) : bytes_(size, 0) {}

std::uint8_t Ram::read(std::uint16_t offset) const {
    return bytes_[offset % bytes_.size()];
}

void Ram::write(std::uint16_t offset, std::uint8_t value) {
    bytes_[offset % bytes_.size()] = value;
}

Rom::Rom(std::vector<std::uint8_t> bytes) : bytes_(bytes) {}

std::uint8_t Rom::read(std::uint16_t offset) const {
    return bytes_[offset % bytes_.size()];
}

void Rom::write(std::uint16_t offset, std::uint8_t value) {
    // A ROM cannot be changed.
}

void poke_and_peek(Device& d) {
    d.write(0x0001, 0x42);
    std::printf("%02X %02X\n", d.read(0x0001), d.read(0x0801));
}

int main() {
    Ram ram(0x800);
    Rom rom({0xA9, 0x01, 0x00, 0x60});
    poke_and_peek(ram);
    poke_and_peek(rom);
}
` },
    },
  ],
});
})();
