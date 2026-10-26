"""Builds lessons/nes-data.js for lessons 16-18 (cartridge and PPU).

  python3 build.py

Cuts the staged reference files into the learner files of every exercise
stage (13-21, continuing the CPU's 1-12), compiles each stage natively with
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

STAGED = {name: open(name + '.staged.c').read() for name in ('cart', 'bus', 'ppu')}
CPU_C = stage(open('../ref6502/cpu.staged.c').read(), 11)
OLD_BUS_C = open('../ref6502/bus.c').read()

SKELETON = {
    'cart': '#include <stdlib.h>\n#include <string.h>\n#include "cart.h"\n\n// Write the cartridge here. cart.h lists the functions to write.\n',
    'ppu': '#include <string.h>\n#include "ppu.h"\n#include "cart.h"\n\n// Write the PPU here. ppu.h lists the functions.\n',
}


def learner(name, n):
    """The learner's file `name` after exercise stage n."""
    if name == 'cpu.c':
        return CPU_C
    if name == 'cart.c':
        return SKELETON['cart'] if n < 13 else stage(STAGED['cart'], n)
    if name == 'ppu.c':
        return SKELETON['ppu'] if n < 16 else stage(STAGED['ppu'], n)
    if name == 'bus.c':
        return OLD_BUS_C if n < 15 else stage(STAGED['bus'], n)
    raise KeyError(name)


def inline_includes(src):
    def repl(m):
        return open(os.path.join('course', m.group(1))).read().rstrip('\n')
    return re.sub(r'#include "(\w+\.inc)"', repl, src)


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


HEADERS = {n: open(n).read() for n in ('cpu.h', 'bus.h', 'cart.h', 'ppu.h', 'palette.h', 'screen.h')}
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
    21: inline_includes(open('course/nes.c').read()),
}

# For every stage: course files (besides main.c), learner files (first one is
# opened), which files the exercise changes, the test program and its tests.
STAGES = {
    13: dict(course=['cart.h'], learner=['cart.c'], changes=['cart.c'], harness='h13', tests=[1, 2, 3, 4]),
    14: dict(course=['cart.h'], learner=['cart.c'], changes=['cart.c'], harness='h14', tests=[1, 2, 3, 4, 5, 6], data=True),
    15: dict(course=['cpu.h', 'bus.h', 'cart.h', 'trace.h', 'trace.c'], learner=['bus.c', 'cart.c', 'cpu.c'], changes=['bus.c'],
             harness=None, tests=['10', '1000', ''], data=True, log=True),
    16: dict(course=['ppu.h', 'cart.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h16', tests=[1, 2, 3, 4, 5]),
    17: dict(course=['ppu.h', 'cart.h', 'screen.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h17', tests=[1, 2, 3], data=True),
    18: dict(course=['ppu.h', 'cart.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h18', tests=[1, 2, 3, 4, 5, 6]),
    19: dict(course=['bus.h', 'cart.h', 'ppu.h'], learner=['ppu.c', 'bus.c', 'cart.c'], changes=['ppu.c', 'bus.c'], harness='h19', tests=[1, 2, 3, 4]),
    20: dict(course=['ppu.h', 'cart.h'], learner=['ppu.c', 'cart.c'], changes=['ppu.c'], harness='h20', tests=[1, 2, 3, 4, 5]),
    21: dict(course=['cpu.h', 'bus.h', 'cart.h', 'ppu.h', 'palette.h', 'palette.c', 'screen.h'], learner=['ppu.c', 'bus.c', 'cart.c', 'cpu.c'],
             changes=['ppu.c'], harness='h21', tests=[1, 2, 3, 4, 5, 6, 7], data=True),
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
    open(os.path.join(tmp, 'nestest.nes'), 'wb').write(open(os.path.join(ROOT, 'nes', 'nestest.nes'), 'rb').read())
    open(os.path.join(tmp, 'nestest.log'), 'w').write(open(os.path.join(ROOT, 'nes', 'nestest-official.log')).read())
    out = {'headers': HEADERS, 'stages': {}, 'busBefore': OLD_BUS_C}
    for n, spec in STAGES.items():
        d = os.path.join(tmp, 's%d' % n)
        os.makedirs(d)
        files = {name: HEADERS[name] for name in spec['course']}
        files['main.c'] = MAINS[n]
        for name in spec['learner']:
            files[name] = learner(name, n)
        for name, text in files.items():
            open(os.path.join(d, name), 'w').write(text)
        open(os.path.join(d, 'common.inc'), 'w').write(open('harness/common.inc').read())
        for name in ('screen.h', 'palette.h', 'palette.c', 'cpu.h', 'bus.h', 'cart.h', 'ppu.h'):
            if not os.path.exists(os.path.join(d, name)):
                open(os.path.join(d, name), 'w').write(HEADERS[name])
        open(os.path.join(d, 'screen_stub.c'), 'w').write(SCREEN_STUB)
        sources = [f for f in files if f.endswith('.c') and f != 'main.c']
        flags = ['gcc', '-std=c11', '-Wall', '-Wno-unused-function', '-Werror', '-O1', '-I', d]
        # The course program must build (Run).
        extra = [os.path.join(d, 'screen_stub.c')] if 'screen.h' in files or n == 21 else []
        if n == 21 or n == 17:
            extra = [os.path.join(d, 'screen_stub.c')] + ([os.path.join(d, 'palette.c')] if 'palette.c' not in files else [])
        run(flags + ['-o', os.path.join(d, 'run'), os.path.join(d, 'main.c')] + [os.path.join(d, f) for f in sources] + extra)
        tests = []
        if spec['harness']:
            hsrc = open('harness/%s.c' % spec['harness']).read()
            hsrc_inlined = hsrc.replace('#include "common.inc"', open('harness/common.inc').read().rstrip('\n'))
            open(os.path.join(d, 'check_main.c'), 'w').write(hsrc_inlined)
            hextra = [os.path.join(d, 'palette.c')] if (n == 21 and 'palette.c' not in sources) else []
            run(flags + ['-o', os.path.join(d, 'check'), os.path.join(d, 'check_main.c')] + [os.path.join(d, f) for f in sources] + hextra)
            for t in spec['tests']:
                res = subprocess.run([os.path.join(d, 'check')], input=str(t), capture_output=True, text=True, cwd=tmp)
                tests.append({'stdin': str(t), 'expect': res.stdout})
            harness = hsrc_inlined
        else:
            for t in spec['tests']:
                res = subprocess.run([os.path.join(d, 'run')], input=t, capture_output=True, text=True, cwd=tmp)
                tests.append({'stdin': t, 'expect': res.stdout})
            harness = None
        out['stages'][str(n)] = {
            'main': MAINS[n],
            'course': spec['course'],
            'learner': spec['learner'],
            'changes': spec['changes'],
            'starters': {name: learner(name, n - 1) for name in spec['learner']},
            'solution': {name: learner(name, n) for name in spec['changes']},
            'harness': harness,
            'tests': tests,
            'data': bool(spec.get('data')),
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
