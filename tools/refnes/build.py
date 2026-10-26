"""Builds lessons/nes-data.js for lessons 16-22 (cartridge, PPU, sprites,
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

STAGED = {name: open(name + '.staged.c').read() for name in ('cart', 'bus', 'ppu', 'controller')}
CPU_STAGED = open('../ref6502/cpu.staged.c').read()
CPU_C = stage(CPU_STAGED, 11)
OLD_BUS_C = open('../ref6502/bus.c').read()

SKELETON = {
    'cart': '#include <stdlib.h>\n#include <string.h>\n#include "cart.h"\n\n// Write the cartridge here. cart.h lists the functions to write.\n',
    'ppu': '#include <string.h>\n#include "ppu.h"\n#include "cart.h"\n\n// Write the PPU here. ppu.h lists the functions.\n',
    'controller': '#include "controller.h"\n\n// Write the controllers here. controller.h lists the functions.\n',
}


def learner(name, n):
    """The learner's file `name` after exercise stage n."""
    if name == 'cpu.c':
        return CPU_C if n < 34 else stage(CPU_STAGED, n)
    if name == 'cart.c':
        return SKELETON['cart'] if n < 13 else stage(STAGED['cart'], n)
    if name == 'ppu.c':
        return SKELETON['ppu'] if n < 16 else stage(STAGED['ppu'], n)
    if name == 'bus.c':
        return OLD_BUS_C if n < 15 else stage(STAGED['bus'], n)
    if name == 'controller.c':
        return SKELETON['controller'] if n < 25 else stage(STAGED['controller'], n)
    raise KeyError(name)


def inline_includes(src, folder='course'):
    def repl(m):
        return open(os.path.join(folder, m.group(1))).read().rstrip('\n')
    return re.sub(r'#include "(\w+\.inc)"', repl, src)


def course_program(name, n):
    return inline_includes(stage(open(os.path.join('course', name)).read(), n))


def rominfo(memory):
    src = open('course/rominfo.c').read()
    if memory:
        src = src.replace('#ifdef SHOW_MEMORY\n', '').replace('#endif\n    free(data);', '    free(data);')
    else:
        src = re.sub(r'#ifdef SHOW_MEMORY\n.*?#endif\n', '', src, flags=re.S)
    return src


def nestest_cart():
    src = NESTEST_MAIN.replace('#include "bus.h"\n', '#include "bus.h"\n#include "cart.h"\n')
    old = '    bus_reset();\n    bus_load_prg(file + 16, 0x4000);  // skip the 16-byte iNES header\n'
    assert old in src
    new = ('    if (cart_load(file, (long)got) != CART_OK) {\n'
           '        printf("cart_load could not read nestest.nes.\\n");\n'
           '        return 1;\n'
           '    }\n'
           '    bus_reset();\n')
    src = src.replace(old, new)
    return src.replace("// Opcode's nestest runner. Provided by the course.\n",
                       "// Opcode's nestest runner, now through the cartridge. Provided by the course.\n")


# Headers that grew during the course are staged too. The version a stage
# sees is called 'bus.h@22' (bus.h from stage 22 on); the first one keeps
# the plain name.
STAGED_HEADERS = {'bus.h': [15, 22], 'ppu.h': [16, 23, 28], 'cart.h': [13, 31, 33], 'cpu.h': [15, 34]}
HEADERS = {n: open(n).read() for n in ('palette.h', 'screen.h', 'controller.h')}
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
HEADERS['palette.c'] = open('palette.c').read()
HEADERS['trace.h'] = TRACE_H
HEADERS['trace.c'] = trace_c()

MAINS = {
    13: rominfo(False),
    14: rominfo(True),
    15: nestest_cart(),
    16: inline_includes(open('course/ppumon.c').read()),
    17: inline_includes(open('course/chrview.c').read()),
    18: inline_includes(open('course/regmon.c').read()),
    19: inline_includes(open('course/busmon.c').read()),
    20: inline_includes(open('course/timeline.c').read()),
    21: course_program('nes.c', 21),
    22: course_program('oamview.c', 22),
    23: course_program('linemon.c', 23),
    24: course_program('nes.c', 24),
    25: course_program('padmon.c', 25),
    26: course_program('nes.c', 26),
    27: course_program('nes.c', 27),
    28: course_program('scrollmon.c', 28),
    29: course_program('nes.c', 29),
    30: course_program('nes.c', 30),
    31: course_program('nes.c', 31),
    32: course_program('nes.c', 32),
    33: course_program('irqmon.c', 33),
    34: course_program('nes.c', 34),
}

NES = ['cpu.h', 'bus.h', 'cart.h', 'ppu.h', 'palette.h', 'palette.c', 'screen.h']
EMU = ['ppu.c', 'bus.c', 'cart.c', 'cpu.c']
DEMO = ['opcode-demo.nes']

# For every stage: course files (besides main.c), learner files (first one is
# opened), which files the exercise changes, the test program and its tests.
STAGES = {
    13: dict(course=['cart.h'], learner=['cart.c'], changes=['cart.c'], harness='h13', tests=[1, 2, 3, 4]),
    14: dict(course=['cart.h'], learner=['cart.c'], changes=['cart.c'], harness='h14', tests=[1, 2, 3, 4, 5, 6], data=['nestest.nes']),
    15: dict(course=['cpu.h', 'bus.h', 'cart.h', 'trace.h', 'trace.c'], learner=['bus.c', 'cart.c', 'cpu.c'], changes=['bus.c'],
             harness=None, tests=['10', '1000', ''], data=['nestest.nes'], log=True),
    16: dict(course=['ppu.h', 'cart.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h16', tests=[1, 2, 3, 4, 5]),
    17: dict(course=['ppu.h', 'cart.h', 'screen.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h17', tests=[1, 2, 3], data=['nestest.nes']),
    18: dict(course=['ppu.h', 'cart.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h18', tests=[1, 2, 3, 4, 5, 6]),
    19: dict(course=['bus.h', 'cart.h', 'ppu.h'], learner=['ppu.c', 'bus.c', 'cart.c'], changes=['ppu.c', 'bus.c'], harness='h19', tests=[1, 2, 3, 4]),
    20: dict(course=['ppu.h', 'cart.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h20', tests=[1, 2, 3, 4, 5]),
    21: dict(course=['cpu.h', 'bus.h', 'cart.h', 'ppu.h', 'palette.h', 'palette.c', 'screen.h'], learner=['ppu.c', 'bus.c', 'cart.c', 'cpu.c'],
             changes=['ppu.c'], harness='h21', tests=[1, 2, 3, 4, 5, 6, 7], data=['nestest.nes']),
    22: dict(course=NES, learner=['bus.c', 'ppu.c', 'cart.c', 'cpu.c'], changes=['bus.c'], harness='h22', tests=[1, 2, 3, 4, 5], data=DEMO),
    23: dict(course=NES, learner=EMU, changes=['ppu.c'], harness='h23', tests=[1, 2, 3, 4, 5], data=DEMO),
    24: dict(course=NES, learner=EMU, changes=['ppu.c'], harness='h24', tests=[1, 2, 3, 4, 5, 6, 7], data=DEMO),
    25: dict(course=NES + ['controller.h'], learner=['controller.c'] + EMU, changes=['controller.c'], harness='h25',
             tests=[1, 2, 3, 4, 5]),
    26: dict(course=NES + ['controller.h'], learner=['bus.c', 'controller.c', 'ppu.c', 'cart.c', 'cpu.c'], changes=['bus.c'],
             harness='h26', tests=[1, 2, 3, 4], data=DEMO),
    27: dict(course=NES + ['controller.h'], learner=EMU + ['controller.c'], changes=['ppu.c'], harness='h27',
             tests=[1, 2, 3, 4, 5, 6], data=DEMO),
    28: dict(course=NES + ['controller.h'], learner=EMU + ['controller.c'], changes=['ppu.c'], harness='h28', tests=[1, 2, 3, 4, 5]),
    29: dict(course=NES + ['controller.h'], learner=EMU + ['controller.c'], changes=['ppu.c'], harness='h29',
             tests=[1, 2, 3, 4, 5, 6], data=DEMO),
    30: dict(course=NES + ['controller.h'], learner=['cart.c', 'ppu.c', 'bus.c', 'cpu.c', 'controller.c'], changes=['cart.c'],
             harness='h30', tests=[1, 2, 3, 4, 5]),
    31: dict(course=NES + ['controller.h'], learner=['cart.c', 'ppu.c', 'bus.c', 'cpu.c', 'controller.c'], changes=['cart.c', 'ppu.c'],
             harness='h31', tests=[1, 2, 3, 4, 5]),
    32: dict(course=NES + ['controller.h'], learner=['cart.c', 'ppu.c', 'bus.c', 'cpu.c', 'controller.c'], changes=['cart.c'],
             harness='h32', tests=[1, 2, 3, 4]),
    33: dict(course=NES + ['controller.h'], learner=['cart.c', 'ppu.c', 'bus.c', 'cpu.c', 'controller.c'], changes=['cart.c', 'ppu.c'],
             harness='h33', tests=[1, 2, 3, 4, 5]),
    34: dict(course=NES + ['controller.h'], learner=['cpu.c', 'cart.c', 'ppu.c', 'bus.c', 'controller.c'], changes=['cpu.c'],
             harness='h34', tests=[1, 2, 3, 4], data=['opcode-mmc3.nes']),
}

SCREEN_STUB = '#include "screen.h"\nvoid screen_show(const uint32_t *p) { (void)p; }\nvoid screen_loop(void (*f)(void)) { (void)f; }\nuint8_t screen_buttons(void) { return 0; }\n'


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        raise SystemExit('failed: ' + ' '.join(cmd))
    return r.stdout


def main():
    tmp = tempfile.mkdtemp()
    for rom in ('nestest.nes', 'opcode-demo.nes', 'opcode-mmc3.nes'):
        open(os.path.join(tmp, rom), 'wb').write(open(os.path.join(ROOT, 'nes', rom), 'rb').read())
    open(os.path.join(tmp, 'nestest.log'), 'w').write(open(os.path.join(ROOT, 'nes', 'nestest-official.log')).read())
    out = {'headers': HEADERS, 'stages': {}, 'busBefore': OLD_BUS_C}
    for n, spec in STAGES.items():
        d = os.path.join(tmp, 's%d' % n)
        os.makedirs(d)
        course = [header(name, n) for name in spec['course']]
        files = {key.split('@')[0]: HEADERS[key] for key in course}
        files['main.c'] = MAINS[n]
        for name in spec['learner']:
            files[name] = learner(name, n)
        for name, text in files.items():
            open(os.path.join(d, name), 'w').write(text)
        # Headers the course program does not list, in case a learner file includes them.
        for name in ('screen.h', 'palette.h', 'palette.c', 'cpu.h', 'bus.h', 'cart.h', 'ppu.h', 'controller.h'):
            if not os.path.exists(os.path.join(d, name)):
                open(os.path.join(d, name), 'w').write(HEADERS[header(name, n)])
        open(os.path.join(d, 'screen_stub.c'), 'w').write(SCREEN_STUB)
        sources = [f for f in files if f.endswith('.c') and f != 'main.c']
        extra = [os.path.join(d, 'screen_stub.c')]
        if 'palette.c' not in sources and n >= 17:
            extra.append(os.path.join(d, 'palette.c'))
        flags = ['gcc', '-std=c11', '-Wall', '-Wno-unused-function', '-Werror', '-O1', '-I', d]
        # The course program must build (Run).
        run(flags + ['-o', os.path.join(d, 'run'), os.path.join(d, 'main.c')] + [os.path.join(d, f) for f in sources] + extra)
        tests = []
        if spec['harness']:
            harness = inline_includes(open('harness/%s.c' % spec['harness']).read(), 'harness')
            open(os.path.join(d, 'check_main.c'), 'w').write(harness)
            run(flags + ['-o', os.path.join(d, 'check'), os.path.join(d, 'check_main.c')] + [os.path.join(d, f) for f in sources] + extra)
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
