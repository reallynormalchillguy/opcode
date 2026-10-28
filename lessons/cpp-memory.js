(() => {
const R = String.raw;

Course.add({
  id: 'cpp-memory',
  part: 'cpp',
  title: 'Memory and ownership',
  summary: 'How long things live: the stack, the heap, destructors, RAII, std::unique_ptr, and moving instead of copying.',
  blocks: [
    { t: 'p', html: 'A cartridge can hold anything from 24 KB to over a megabyte, and you only find out how big when the file is opened. So the emulator needs memory whose size is decided while it runs, and it needs that memory to be given back when it is no longer needed. This lesson is about who owns each piece of memory and when it is released.' },

    { t: 'h', text: 'The stack: automatic lifetime' },
    { t: 'p', html: 'Every variable you have written so far is <em>automatic</em>: it is created when its declaration runs and destroyed at the closing brace of its block. These live on the <em>stack</em>, a region of memory that grows when a function is called and shrinks when it returns. It is fast and needs no bookkeeping, but it is small (here, 1 MB in total), and nothing on it outlives its block.' },
    { t: 'p', html: 'A class can run code at the moment one of its objects is destroyed. That function is the <em>destructor</em>: its name is the class name with a <code>~</code> in front.' },
    { t: 'code', title: 'lifetime.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <string>'],
      [''],
      ['class Noisy {'],
      ['public:'],
      ['    explicit Noisy(std::string name) : name_(name) {'],
      [R`        std::cout << "  hello " << name_ << "\n";`, 'The constructor runs when the object is created…'],
      ['    }'],
      ['    ~Noisy() {', '…and the destructor when it is destroyed. It takes no parameters and returns nothing.'],
      [R`        std::cout << "  bye " << name_ << "\n";`],
      ['    }'],
      ['private:'],
      ['    std::string name_;'],
      ['};'],
      [''],
      ['int main() {'],
      ['    Noisy a("a");'],
      ['    {', 'A bare pair of braces starts a new block.'],
      ['        Noisy b("b");'],
      [R`        std::cout << "  inside the block\n";`],
      ['    }', '<code>b</code> is destroyed here, at the end of its block.'],
      ['    Noisy c("c");'],
      [R`    std::cout << "  end of main\n";`],
      ['}', '<code>c</code> and then <code>a</code> are destroyed here: in the reverse order of creation.'],
    ] },

    { t: 'h', text: 'RAII: let the destructor clean up' },
    { t: 'p', html: 'This guarantee, that the destructor always runs when an object goes away, is the foundation of how C++ manages memory and every other resource. A class that grabs something in its constructor and gives it back in its destructor makes leaks impossible: however the block is left (the end of the block, a <code>return</code> in the middle, a <code>break</code>), the cleanup happens. The idea has an awkward name, <em>RAII</em> ("resource acquisition is initialisation"), and you have been relying on it all along: <code>std::vector</code> and <code>std::string</code> allocate memory as they grow and release it in their destructors.' },

    { t: 'h', text: 'The heap: memory you ask for' },
    { t: 'p', html: 'The <em>heap</em> is the rest of the program\'s memory: much larger than the stack, and its pieces live until someone releases them. The low-level way to use it is <code>new</code>, which allocates and returns a pointer, and <code>delete</code>, which releases.' },
    { t: 'code', title: 'raw.cpp', lines: [
      ['int* score = new int(0);', 'Allocates one <code>int</code> on the heap and returns its address.'],
      ['*score = 100;'],
      ['delete score;', 'Every <code>new</code> needs exactly one <code>delete</code>. Forget it and the memory is lost until the program ends (a <em>leak</em>). Do it twice, or use the pointer afterwards, and the program\'s memory gets corrupted.'],
    ] },
    { t: 'p', html: 'Keeping every <code>new</code> paired with exactly one <code>delete</code> by hand is how countless bugs are made. Modern C++ almost never writes them directly. Instead, a small object owns the heap memory and its destructor releases it.' },

    { t: 'h', text: 'std::unique_ptr: one owner' },
    { t: 'p', html: '<code>std::unique_ptr&lt;T&gt;</code> (from <code>&lt;memory&gt;</code>) is a pointer that <em>owns</em> what it points to. When the <code>unique_ptr</code> is destroyed, it deletes its object. You create one with <code>std::make_unique</code>.' },
    { t: 'code', title: 'unique.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <memory>'],
      ['#include <string>'],
      [''],
      ['class Cart {'],
      ['public:'],
      ['    explicit Cart(std::string title) : title_(title) {}'],
      [R`    ~Cart() { std::cout << "  " << title_ << " released\n"; }`],
      ['    const std::string& title() const { return title_; }'],
      ['private:'],
      ['    std::string title_;'],
      ['};'],
      [''],
      ['int main() {'],
      ['    std::unique_ptr<Cart> cart = std::make_unique<Cart>("Metroid");', 'Allocates a <code>Cart</code> on the heap, passing <code>"Metroid"</code> to its constructor, and hands ownership to <code>cart</code>.'],
      [R`    std::cout << cart->title() << "\n";`, 'It is used like a pointer: <code>-&gt;</code> and <code>*</code>.'],
      [''],
      ['    // std::unique_ptr<Cart> copy = cart;   would not compile', 'Only one owner: a <code>unique_ptr</code> cannot be copied.'],
      ['    std::unique_ptr<Cart> other = std::move(cart);', '<code>std::move</code> <em>transfers</em> ownership. Now <code>other</code> owns the cart and <code>cart</code> is empty.'],
      [R`    std::cout << "cart is " << (cart ? "full" : "empty") << "\n";`, 'An empty <code>unique_ptr</code> is like <code>nullptr</code>: it counts as false.'],
      [''],
      ['    other = std::make_unique<Cart>("Zelda");', 'Giving <code>other</code> a new cart releases the one it had.'],
      [R`    std::cout << "end of main\n";`],
      ['}', 'Zelda is released here, when <code>other</code> is destroyed. Not one <code>delete</code> anywhere.'],
    ] },
    { t: 'p', html: 'For a whole array on the heap there is <code>std::unique_ptr&lt;int[]&gt;</code>: <code>auto data = std::make_unique&lt;int[]&gt;(n);</code> allocates <code>n</code> <code>int</code>s, all zero, which you use as <code>data[i]</code>. In practice <code>std::vector</code> is usually the better choice, because it also remembers its size.' },

    { t: 'h', text: 'Copying and moving' },
    { t: 'p', html: 'Copying a vector copies every element. Often you do not need a copy, because the original is about to disappear anyway: then <code>std::move</code> lets the new variable take over the original\'s memory instead, which costs almost nothing. The moved-from variable is left empty (but still valid, so you can assign to it again).' },
    { t: 'code', title: 'move.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <utility>', '<code>std::move</code> lives here.'],
      ['#include <vector>'],
      [''],
      ['std::vector<int> make_frame(int width, int height) {'],
      ['    std::vector<int> pixels(width * height, 0);'],
      ['    return pixels;', 'Returning a local vector does not copy it: the compiler moves it (or builds it in place) automatically. Returning containers by value is normal and cheap.'],
      ['}'],
      [''],
      ['int main() {'],
      ['    std::vector<int> frame = make_frame(256, 240);'],
      ['    std::vector<int> shown = std::move(frame);', 'No copy of 61440 pixels: <code>shown</code> takes over the memory.'],
      [R`    std::cout << shown.size() << " " << frame.size() << "\n";`, '<code>frame</code> is now empty.'],
      ['}'],
    ] },

    { t: 'h', text: 'How a vector grows' },
    { t: 'p', html: 'A vector keeps its elements in one block of heap memory, usually with some spare room. <code>size()</code> is how many elements it holds; <code>capacity()</code> is how many fit before it must grow. When it is full, <code>push_back</code> allocates a bigger block (typically double), moves the elements across, and releases the old one.' },
    { t: 'code', title: 'growth.cpp', run: true, lines: [
      ['#include <iostream>'],
      ['#include <vector>'],
      [''],
      ['int main() {'],
      ['    std::vector<int> v;'],
      ['    for (int i = 0; i < 10; i++) {'],
      ['        v.push_back(i);'],
      [R`        std::cout << v.size() << "/" << v.capacity() << " ";`],
      ['    }'],
      [R`    std::cout << "\n";`],
      ['    v.reserve(1000);', 'If you know roughly how many elements are coming, <code>reserve</code> allocates the room once, up front.'],
      [R`    std::cout << v.size() << "/" << v.capacity() << "\n";`],
      ['}'],
    ] },
    { t: 'note', kind: 'warn', html: 'Because growing moves the elements, any pointer or reference to an element of a vector becomes invalid after a <code>push_back</code> that grows it. It still points at the old, released block. This is called a <em>dangling</em> pointer, and it is the heap version of keeping a pointer to a local variable after its function returned.' },

    { t: 'h', text: 'Rules of thumb' },
    { t: 'list', items: [
      'Make objects ordinary variables (or members) whenever you can. Most objects never need the heap.',
      'For a sequence of anything, use <code>std::vector</code>.',
      'When something must live on the heap, own it with a <code>std::unique_ptr</code> created by <code>std::make_unique</code>.',
      'Plain pointers and references are fine for <em>using</em> something someone else owns; they never delete it.',
    ] },
    { t: 'note', kind: 'nes', html: 'Your emulator will read the cartridge file into a <code>std::vector&lt;std::uint8_t&gt;</code>, and the console will hold the cartridge in a <code>std::unique_ptr</code>. Loading another game is just assigning a new one: the old cartridge and all its memory are released automatically.' },

    { t: 'quiz', q: 'When does a local object\'s destructor run?', options: ['When the program ends', 'At the closing brace of the block it was declared in', 'Only when you call it yourself'], answer: 1, explain: 'Automatic objects are destroyed when their block ends, in the reverse order of creation. That is what makes RAII reliable.' },
    { t: 'quiz', q: 'After <code>auto b = std::move(a);</code> where <code>a</code> is a <code>std::unique_ptr</code>, what does <code>a</code> hold?', options: ['A copy of the same object', 'Nothing: it is empty', 'A pointer to <code>b</code>'], answer: 1, explain: 'Ownership moved to <code>b</code>. A <code>unique_ptr</code> cannot be copied, so the only way to hand it over leaves the original empty.' },
  ],

  exercises: [
    {
      id: 'cpp-memory-1',
      title: 'Make a range',
      prompt: '<p>Write <code>std::vector&lt;int&gt; make_range(int start, int count)</code>. It returns a vector holding <code>start</code>, <code>start + 1</code>, <code>start + 2</code> and so on, <code>count</code> values in total. If <code>count</code> is 0 or less, it returns an empty vector.</p><p>Notice what you do not have to do: nobody frees anything. The vector cleans up after itself.</p>',
      files: { 'main.cpp': R`#include <iostream>
#include <vector>

std::vector<int> make_range(int start, int count) {
    return {};
}

int main() {
    for (int v : make_range(5, 4)) {
        std::cout << v << " ";
    }
    std::cout << "\n";
}
` },
      harness: { 'check.cpp': R`#include <iostream>
#include <vector>
std::vector<int> make_range(int start, int count);
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { for (int v : make_range(5, 4)) std::cout << v << " "; std::cout << "\n"; }
    if (t == 2) { std::vector<int> r = make_range(-3, 100000); long long s = 0; for (int v : r) s += v; std::cout << r.size() << " " << r.front() << " " << r.back() << " " << s << "\n"; }
    if (t == 3) { std::cout << make_range(1, 0).size() << " " << make_range(1, -5).size() << "\n"; }
}
` },
      tests: [
        { name: 'A short range', stdin: '1', expect: '5 6 7 8 \n' },
        { name: 'A long range with negative numbers', stdin: '2', expect: '100000 -3 99996 4999650000\n' },
        { name: 'No elements gives an empty vector', stdin: '3', expect: '0 0\n' },
      ],
      hints: [
        'Create an empty <code>std::vector&lt;int&gt; result;</code>, and <code>push_back(start + i)</code> in a loop that runs <code>count</code> times.',
        'A loop that runs while <code>i &lt; count</code> runs zero times when <code>count</code> is 0 or negative, so that case needs nothing special. Return <code>result</code> at the end.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include <vector>

std::vector<int> make_range(int start, int count) {
    std::vector<int> result;
    for (int i = 0; i < count; i++) {
        result.push_back(start + i);
    }
    return result;
}

int main() {
    for (int v : make_range(5, 4)) {
        std::cout << v << " ";
    }
    std::cout << "\n";
}
` },
    },
    {
      id: 'cpp-memory-2',
      title: 'A list that grows',
      prompt: '<p>To see what <code>std::vector</code> does inside, build a small one yourself. <code>int_list.h</code> declares:</p><pre>class IntList {\npublic:\n    void push(int value);\n    int get(int i) const;\n    int size() const;\n    int capacity() const;\nprivate:\n    std::unique_ptr&lt;int[]&gt; data_;   // empty to begin with\n    int size_ = 0;\n    int capacity_ = 0;\n};</pre><p>Write the four member functions. When <code>push</code> finds the list full, it grows: to a capacity of 4 the first time, then double. Growing means allocating a new array with <code>std::make_unique&lt;int[]&gt;(new_capacity)</code>, copying the old elements across, and handing the new array to <code>data_</code> (assigning to a <code>unique_ptr</code> releases the old array for you).</p><p>There is no destructor to write: when an <code>IntList</code> is destroyed, <code>data_</code> releases the memory.</p>',
      files: {
        'main.cpp': R`#include <iostream>
#include "int_list.h"

void IntList::push(int value) {

}

int IntList::get(int i) const {
    return 0;
}

int IntList::size() const {
    return 0;
}

int IntList::capacity() const {
    return 0;
}

int main() {
    IntList list;
    for (int i = 1; i <= 10; i++) {
        list.push(i * i);
    }
    std::cout << "size=" << list.size() << " capacity=" << list.capacity() << " last=" << list.get(list.size() - 1) << "\n";
}
`,
        'int_list.h': R`#pragma once
#include <memory>

class IntList {
public:
    void push(int value);
    int get(int i) const;
    int size() const;
    int capacity() const;

private:
    std::unique_ptr<int[]> data_;   // empty to begin with
    int size_ = 0;
    int capacity_ = 0;
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "int_list.h"
int main() {
    int t = 0;
    std::cin >> t;
    IntList l;
    if (t == 1) { std::cout << l.size() << " " << l.capacity() << "\n"; }
    if (t == 2) { for (int i = 0; i < 9; i++) { l.push(i); std::cout << l.size() << "/" << l.capacity() << " "; } std::cout << "\n"; for (int i = 0; i < l.size(); i++) std::cout << l.get(i); std::cout << "\n"; }
    if (t == 3) { for (int i = 0; i < 100000; i++) l.push(i * 3); long long s = 0; for (int i = 0; i < l.size(); i++) s += l.get(i); std::cout << l.size() << " " << l.capacity() << " " << s << "\n"; }
    if (t == 4) { for (int r = 0; r < 200; r++) { IntList tmp; for (int i = 0; i < 5000; i++) tmp.push(i); } std::cout << "no leak\n"; }
}
` },
      tests: [
        { name: 'A new list is empty', stdin: '1', expect: '0 0\n' },
        { name: 'Capacity goes 4, 8, 16', stdin: '2', expect: '1/4 2/4 3/4 4/4 5/8 6/8 7/8 8/8 9/16 \n012345678\n' },
        { name: 'A hundred thousand items', stdin: '3', expect: '100000 131072 14999850000\n' },
        { name: 'Lists release their memory', stdin: '4', expect: 'no leak\n' },
      ],
      hints: [
        'In <code>push</code>, first check <code>if (size_ == capacity_)</code>. The new capacity is <code>capacity_ == 0 ? 4 : capacity_ * 2</code>.',
        'Then: <code>auto bigger = std::make_unique&lt;int[]&gt;(new_capacity);</code>, copy <code>bigger[i] = data_[i]</code> for each of the <code>size_</code> elements, then <code>data_ = std::move(bigger); capacity_ = new_capacity;</code>. Finally <code>data_[size_++] = value;</code>',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include "int_list.h"

void IntList::push(int value) {
    if (size_ == capacity_) {
        int new_capacity = capacity_ == 0 ? 4 : capacity_ * 2;
        auto bigger = std::make_unique<int[]>(new_capacity);
        for (int i = 0; i < size_; i++) {
            bigger[i] = data_[i];
        }
        data_ = std::move(bigger);
        capacity_ = new_capacity;
    }
    data_[size_++] = value;
}

int IntList::get(int i) const {
    return data_[i];
}

int IntList::size() const {
    return size_;
}

int IntList::capacity() const {
    return capacity_;
}

int main() {
    IntList list;
    for (int i = 1; i <= 10; i++) {
        list.push(i * i);
    }
    std::cout << "size=" << list.size() << " capacity=" << list.capacity() << " last=" << list.get(list.size() - 1) << "\n";
}
` },
    },
    {
      id: 'cpp-memory-3',
      title: 'The cartridge slot',
      prompt: '<p>A console has one cartridge slot. <code>slot.h</code> declares a <code>Cart</code> class whose destructor prints a message, so you can see exactly when a cartridge is released, and a <code>Slot</code> that owns at most one <code>Cart</code> through a <code>std::unique_ptr</code>. Write <code>Slot</code>\'s member functions:</p><ul><li><code>void insert(std::unique_ptr&lt;Cart&gt; cart)</code>: the slot takes ownership. If a cartridge was already inside, it is released.</li><li><code>std::unique_ptr&lt;Cart&gt; eject()</code>: hands the cartridge back to the caller; the slot is empty afterwards. Ejecting an empty slot returns an empty pointer.</li><li><code>bool empty() const</code></li><li><code>std::string title() const</code>: the cartridge\'s title, or <code>"(empty)"</code>.</li></ul>',
      files: {
        'main.cpp': R`#include <iostream>
#include "slot.h"

void Slot::insert(std::unique_ptr<Cart> cart) {

}

std::unique_ptr<Cart> Slot::eject() {
    return nullptr;
}

bool Slot::empty() const {
    return true;
}

std::string Slot::title() const {
    return "(empty)";
}

int main() {
    Slot slot;
    slot.insert(std::make_unique<Cart>("Metroid"));
    std::cout << "playing " << slot.title() << "\n";
    slot.insert(std::make_unique<Cart>("Zelda"));
    std::cout << "playing " << slot.title() << "\n";
    std::unique_ptr<Cart> shelf = slot.eject();
    std::cout << "slot: " << slot.title() << ", shelf: " << (shelf ? shelf->title() : "nothing") << "\n";
}
`,
        'slot.h': R`#pragma once
#include <iostream>
#include <memory>
#include <string>

class Cart {
public:
    explicit Cart(std::string title) : title_(title) {}
    ~Cart() { std::cout << "[" << title_ << " released]\n"; }
    const std::string& title() const { return title_; }

private:
    std::string title_;
};

class Slot {
public:
    void insert(std::unique_ptr<Cart> cart);  // releases any cart already inside
    std::unique_ptr<Cart> eject();            // the slot is empty afterwards
    bool empty() const;
    std::string title() const;                // or "(empty)"

private:
    std::unique_ptr<Cart> cart_;
};
`,
      },
      harness: { 'check.cpp': R`#include <iostream>
#include "slot.h"
int main() {
    int t = 0;
    std::cin >> t;
    if (t == 1) { Slot s; std::cout << s.empty() << " " << s.title() << "\n"; s.insert(std::make_unique<Cart>("Kirby")); std::cout << s.empty() << " " << s.title() << "\n"; }
    if (t == 2) { Slot s; s.insert(std::make_unique<Cart>("A")); std::cout << "swap\n"; s.insert(std::make_unique<Cart>("B")); std::cout << s.title() << "\n"; }
    if (t == 3) { Slot s; s.insert(std::make_unique<Cart>("C")); auto c = s.eject(); std::cout << s.empty() << " " << s.title() << " " << (c ? c->title() : "none") << "\n"; c.reset(); std::cout << "after\n"; }
    if (t == 4) { Slot s; auto c = s.eject(); std::cout << (c ? "cart" : "nothing") << "\n"; s.insert(nullptr); std::cout << s.empty() << "\n"; }
    if (t == 5) { { Slot s; s.insert(std::make_unique<Cart>("D")); const Slot& v = s; std::cout << v.title() << "\n"; } std::cout << "after\n"; }
}
` },
      tests: [
        { name: 'An empty slot, then a cartridge', stdin: '1', expect: '1 (empty)\n0 Kirby\n[Kirby released]\n' },
        { name: 'Inserting releases the old cartridge', stdin: '2', expect: 'swap\n[A released]\nB\n[B released]\n' },
        { name: 'Ejecting hands the cartridge over', stdin: '3', expect: '1 (empty) C\n[C released]\nafter\n' },
        { name: 'Ejecting an empty slot', stdin: '4', expect: 'nothing\n1\n' },
        { name: 'The slot releases its cartridge when destroyed', stdin: '5', expect: 'D\n[D released]\nafter\n' },
      ],
      hints: [
        '<code>insert</code> is one line: <code>cart_ = std::move(cart);</code> The parameter cannot be copied, so it has to be moved. Assigning over a full <code>unique_ptr</code> releases what it held.',
        '<code>eject</code> is <code>return std::move(cart_);</code>, which leaves <code>cart_</code> empty. For <code>empty()</code>, compare <code>cart_</code> with <code>nullptr</code>; for <code>title()</code>, check <code>empty()</code> first and then use <code>cart_-&gt;title()</code>.',
      ],
      solution: { 'main.cpp': R`#include <iostream>
#include "slot.h"

void Slot::insert(std::unique_ptr<Cart> cart) {
    cart_ = std::move(cart);
}

std::unique_ptr<Cart> Slot::eject() {
    return std::move(cart_);
}

bool Slot::empty() const {
    return cart_ == nullptr;
}

std::string Slot::title() const {
    if (empty()) {
        return "(empty)";
    }
    return cart_->title();
}

int main() {
    Slot slot;
    slot.insert(std::make_unique<Cart>("Metroid"));
    std::cout << "playing " << slot.title() << "\n";
    slot.insert(std::make_unique<Cart>("Zelda"));
    std::cout << "playing " << slot.title() << "\n";
    std::unique_ptr<Cart> shelf = slot.eject();
    std::cout << "slot: " << slot.title() << ", shelf: " << (shelf ? shelf->title() : "nothing") << "\n";
}
` },
    },
  ],
});
})();
