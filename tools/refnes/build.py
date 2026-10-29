"""Builds lessons/nes-data.js for lessons 17 onwards (cartridge, PPU, sprites,
controllers, scrolling and mappers).

  python3 build.py

Cuts the staged reference files into the learner files of every exercise
stage (13-34, continuing the CPU's 1-12), compiles each stage natively with
its test program, runs the tests to get the expected output, and writes
everything the lessons need. Run tests/lessons.test.js afterwards to check
the same in the browser's compiler.
"""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
os.chdir(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'ref6502'))

from stage import stage
from gen_trace import TRACE_H, trace_c
from gen_main import NESTEST_MAIN

# The last stage that has been written in C++ so far.
LAST_STAGE = 21

STAGED = {name: open(name + '.staged.cpp').read() for name in ('cart', 'bus', 'ppu')}
CPU_STAGED = open('../ref6502/cpu.staged.cpp').read()
CPU_CPP = stage(CPU_STAGED, 11)
CPU_H = open('../ref6502/cpu.h').read()
OLD_BUS_CPP = open('../ref6502/bus.cpp').read()

SKELETON = {
    'cart': '#include "cart.h"\n\n// Write the Cartridge member functions here. cart.h lists them.\n',
    'ppu': '#include "ppu.h"\n\n// Write the Ppu member functions here. ppu.h lists them.\n',
}


def learner(name, n):
    """The learner's file `name` after exercise stage n."""
    if name == 'cpu.cpp':
        return CPU_CPP if n < 34 else stage(CPU_STAGED, n)
    if name == 'cpu.h':
        return CPU_H
    if name == 'cart.cpp':
        return SKELETON['cart'] if n < 13 else stage(STAGED['cart'], n)
    if name == 'ppu.cpp':
        return SKELETON['ppu'] if n < 16 else stage(STAGED['ppu'], n)
    if name == 'bus.cpp':
        return OLD_BUS_CPP if n < 15 else stage(STAGED['bus'], n)
    raise KeyError(name)


def inline_includes(src, folder='course'):
    def repl(m):
        return open(os.path.join(folder, m.group(1))).read().rstrip('\n')
    return re.sub(r'#include "(\w+\.inc)"', repl, src)


def course_program(name, n):
    return inline_includes(stage(open(os.path.join('course', name)).read(), n))


def rominfo(memory):
    src = open('course/rominfo.cpp').read()
    if memory:
        src = src.replace('#ifdef SHOW_MEMORY\n', '').replace('#endif\n}', '}')
    else:
        src = re.sub(r'#ifdef SHOW_MEMORY\n.*?#endif\n', '', src, flags=re.S)
    return inline_includes(src)


def nestest_cart():
    src = NESTEST_MAIN.replace('#include "bus.h"\n', '#include "bus.h"\n#include "cart.h"\n')
    old = ('    Bus bus;\n    bus.reset();\n'
           '    bus.load_prg(std::vector<std::uint8_t>(file.begin() + 16, file.begin() + 16 + 0x4000));  // skip the 16-byte iNES header\n')
    assert old in src
    new = ('    Cartridge cart;\n'
           '    if (cart.load(file) != LoadResult::Ok) {\n'
           '        std::printf("Cartridge::load could not read nestest.nes.\\n");\n'
           '        return 1;\n'
           '    }\n'
           '    Bus bus(cart);\n'
           '    bus.reset();\n')
    src = src.replace(old, new)
    return src.replace("// Opcode's nestest runner. Provided by the course.\n",
                       "// Opcode's nestest runner, now through the cartridge. Provided by the course.\n")


# Headers that grew during the course are staged too. The version a stage
# sees is called 'bus.h@19' (bus.h from stage 19 on); the first one keeps
# the plain name.
STAGED_HEADERS = {'bus.h': [15, 19], 'ppu.h': [16], 'cart.h': [13], 'screen.h': [17]}
HEADERS = {n: open(n).read() for n in ('palette.h', 'palette.cpp')}
for _name, _starts in STAGED_HEADERS.items():
    for _i, _n in enumerate(_starts):
        HEADERS[_name if _i == 0 else '%s@%d' % (_name, _n)] = stage(open(_name).read(), _n)


def header(name, n):
    """The key of the version of header `name` that stage n uses."""
    starts = STAGED_HEADERS.get(name)
    if not starts:
        return name
    first = ([k for k in starts if k <= n] or starts)[-1]
    return name if first == starts[0] else '%s@%d' % (name, first)
HEADERS['trace.h'] = TRACE_H
HEADERS['trace.cpp'] = trace_c()

MAINS = {
    13: rominfo(False),
    14: rominfo(True),
    15: nestest_cart(),
    16: inline_includes(open('course/ppumon.cpp').read()),
    17: inline_includes(open('course/chrview.cpp').read()),
    18: inline_includes(open('course/regmon.cpp').read()),
    19: inline_includes(open('course/busmon.cpp').read()),
    20: inline_includes(open('course/timeline.cpp').read()),
    21: course_program('nes.cpp', 21),
}

NES = ['bus.h', 'cart.h', 'ppu.h', 'palette.h', 'palette.cpp', 'screen.h']
EMU = ['ppu.cpp', 'bus.cpp', 'cart.cpp', 'cpu.cpp', 'cpu.h']

# For every stage: course files (besides main.cpp), learner files (first one
# is opened), which files the exercise changes, the test program and its tests.
STAGES = {
    13: dict(course=['cart.h'], learner=['cart.cpp'], changes=['cart.cpp'], harness='h13', tests=[1, 2, 3, 4]),
    14: dict(course=['cart.h'], learner=['cart.cpp'], changes=['cart.cpp'], harness='h14', tests=[1, 2, 3, 4, 5, 6], data=['nestest.nes']),
    15: dict(course=['bus.h', 'cart.h', 'trace.h', 'trace.cpp'], learner=['bus.cpp', 'cart.cpp', 'cpu.cpp', 'cpu.h'], changes=['bus.cpp'],
             harness=None, tests=['10', '1000', ''], data=['nestest.nes'], log=True),
    16: dict(course=['ppu.h', 'cart.h'], learner=['ppu.cpp', 'cart.cpp'], changes=['ppu.cpp'], harness='h16', tests=[1, 2, 3, 4, 5]),
    17: dict(course=['ppu.h', 'cart.h', 'screen.h'], learner=['ppu.cpp', 'cart.cpp'], changes=['ppu.cpp'], harness='h17', tests=[1, 2, 3], data=['nestest.nes']),
    18: dict(course=['ppu.h', 'cart.h'], learner=['ppu.cpp', 'cart.cpp'], changes=['ppu.cpp'], harness='h18', tests=[1, 2, 3, 4, 5, 6]),
    19: dict(course=['bus.h', 'cart.h', 'ppu.h'], learner=['ppu.cpp', 'bus.cpp', 'cart.cpp'], changes=['ppu.cpp', 'bus.cpp'], harness='h19', tests=[1, 2, 3, 4]),
    20: dict(course=['ppu.h', 'cart.h'], learner=['ppu.cpp', 'cart.cpp'], changes=['ppu.cpp'], harness='h20', tests=[1, 2, 3, 4, 5]),
    21: dict(course=NES, learner=EMU, changes=['ppu.cpp'], harness='h21', tests=[1, 2, 3, 4, 5, 6, 7], data=['nestest.nes']),
}

SCREEN_STUB = ('#include "screen.h"\nextern "C" {\nvoid screen_show(const std::uint32_t*) {}\nvoid screen_loop(void (*)()) {}\n'
               'std::uint8_t screen_buttons() { return 0; }\nvoid screen_audio(const float*, int) {}\n}\n')
CXX = ['g++', '-std=c++17', '-fno-exceptions', '-Wall', '-Wno-unused-function', '-Werror', '-O1']


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        raise SystemExit('failed: ' + ' '.join(cmd))
    return r.stdout


def main():
    tmp = tempfile.mkdtemp()
    for rom in ('nestest.nes', 'opcode-demo.nes', 'opcode-mmc3.nes', 'opcode-sound.nes'):
        open(os.path.join(tmp, rom), 'wb').write(open(os.path.join(ROOT, 'nes', rom), 'rb').read())
    open(os.path.join(tmp, 'nestest.log'), 'w').write(open(os.path.join(ROOT, 'nes', 'nestest-official.log')).read())
    out = {'headers': HEADERS, 'stages': {}, 'busBefore': OLD_BUS_CPP}
    for n, spec in STAGES.items():
        if n > LAST_STAGE:
            continue
        d = os.path.join(tmp, 's%d' % n)
        os.makedirs(d)
        course = [header(name, n) for name in spec['course']]
        files = {key.split('@')[0]: HEADERS[key] for key in course}
        files['main.cpp'] = MAINS[n]
        for name in spec['learner']:
            files[name] = learner(name, n)
        for name, text in files.items():
            open(os.path.join(d, name), 'w').write(text)
        # Headers the course program does not list, in case a learner file includes them.
        for name in ('screen.h', 'palette.h', 'palette.cpp', 'bus.h', 'cart.h', 'ppu.h'):
            if not os.path.exists(os.path.join(d, name)):
                open(os.path.join(d, name), 'w').write(HEADERS[header(name, n)])
        if not os.path.exists(os.path.join(d, 'cpu.h')):
            open(os.path.join(d, 'cpu.h'), 'w').write(CPU_H)
        open(os.path.join(d, 'screen_stub.cpp'), 'w').write(SCREEN_STUB)
        sources = [f for f in files if f.endswith('.cpp') and f != 'main.cpp']
        extra = [os.path.join(d, 'screen_stub.cpp')]
        if 'palette.cpp' not in sources and n >= 17:
            extra.append(os.path.join(d, 'palette.cpp'))
        flags = CXX + ['-I', d]
        # The course program must build (Run).
        run(flags + ['-o', os.path.join(d, 'run'), os.path.join(d, 'main.cpp')] + [os.path.join(d, f) for f in sources] + extra)
        tests = []
        if spec['harness']:
            harness = inline_includes(open('harness/%s.cpp' % spec['harness']).read(), 'harness')
            open(os.path.join(d, 'check_main.cpp'), 'w').write(harness)
            run(flags + ['-o', os.path.join(d, 'check'), os.path.join(d, 'check_main.cpp')] + [os.path.join(d, f) for f in sources] + extra)
            for t in spec['tests']:
                res = subprocess.run([os.path.join(d, 'check')], input=str(t), capture_output=True, text=True, cwd=tmp)
                tests.append({'stdin': str(t), 'expect': res.stdout})
        else:
            harness = None
            for t in spec['tests']:
                res = subprocess.run([os.path.join(d, 'run')], input=t, capture_output=True, text=True, cwd=tmp)
                tests.append({'stdin': t, 'expect': res.stdout})
        out['stages'][str(n)] = {
            'main': MAINS[n],
            'course': course,
            'learner': spec['learner'],
            'changes': spec['changes'],
            'starters': {name: learner(name, n - 1) for name in spec['learner']},
            'solution': {name: learner(name, n) for name in spec['changes']},
            'harness': harness,
            'tests': tests,
            'data': spec.get('data', []),
            'log': bool(spec.get('log')),
        }
        print('=== stage', n)
        for t in tests:
            print('--- input', repr(t['stdin']))
            print(t['expect'], end='')
    js = ('// Generated by tools/refnes/build.py from the reference NES. Do not edit by hand.\n'
          'window.NES_DATA = ' + json.dumps(out, indent=1) + ';\n')
    open(os.path.join(ROOT, 'lessons', 'nes-data.js'), 'w').write(js)
    print('wrote lessons/nes-data.js', len(js), 'bytes')


if __name__ == '__main__':
    main()
