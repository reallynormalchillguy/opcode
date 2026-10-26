"""Builds lessons/cpu-data.js from the reference CPU.

  python3 build.py

1. Checks the opcode table against the reference cpu.c (cycles and page penalties).
2. Cuts the staged reference into the cpu.c of every exercise stage.
3. Compiles each stage natively with the course's test bench and runs the
   test programs to get the expected output.
4. Runs nestest with the final stage.
5. Writes everything the CPU lessons need into lessons/cpu-data.js.
"""
import json, os, re, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
os.chdir(HERE)

from opcodes import table
from stage import stage
from gen_trace import TRACE_H, trace_c
from gen_main import bench, NESTEST_MAIN
from tests import TESTS, NESTEST, clean

STARTER = """#include "cpu.h"
#include "bus.h"

void cpu_reset(Cpu *cpu) {
    // Set the registers to their power-on values.
}

int cpu_step(Cpu *cpu) {
    // Fetch one opcode, run it, and return how many cycles it took.
    return 2;
}
"""

FINAL_STAGE = 11


def check_table(src):
    t = table()
    full = stage(src, FINAL_STAGE)
    problems = 0
    for op, (mn, mode, cyc, extra) in t.items():
        m = re.search(r'case 0x%02X:(.*?)break;' % op, full, re.S)
        if not m:
            print('missing case for %02X %s' % (op, mn)); problems += 1; continue
        body = m.group(1)
        if mode == 'rel':
            if 'branch(' not in body:
                print('branch expected for %02X' % op); problems += 1
            continue
        c = re.search(r'cycles = (\d+)( \+ page_crossed)?', body)
        if not c or int(c.group(1)) != cyc or bool(c.group(2)) != bool(extra):
            print('cycles differ for %02X %s %s: table %d%s, code %s' % (op, mn, mode, cyc, '+' if extra else '', c and c.group(0)))
            problems += 1
    cases = set(int(x, 16) for x in re.findall(r'case 0x([0-9A-F]{2}):', full))
    if cases != set(t):
        print('cases not in the table:', sorted('%02X' % x for x in cases - set(t)))
        problems += 1
    return problems


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print(r.stdout, r.stderr)
        raise SystemExit('command failed: %s' % ' '.join(cmd))
    return r.stdout


def main():
    src = open('cpu.staged.c').read()
    if check_table(src):
        raise SystemExit('opcode table and reference disagree')

    stages = {0: STARTER}
    for n in range(1, FINAL_STAGE + 1):
        stages[n] = stage(src, n)

    files = {
        'cpu.h': open('cpu.h').read(),
        'bus.h': open('bus.h').read(),
        'trace.h': TRACE_H,
        'trace.c': trace_c(),
        'bench.c': bench(False),
        'bench-nmi.c': bench(True),
        'nestest-main.c': NESTEST_MAIN,
    }
    bus_c = open('bus.c').read()

    tmp = tempfile.mkdtemp()
    for name, text in files.items():
        open(os.path.join(tmp, name), 'w').write(text)
    open(os.path.join(tmp, 'bus.c'), 'w').write(bus_c)

    tests = {}
    for n in range(1, FINAL_STAGE + 1):
        open(os.path.join(tmp, 'cpu.c'), 'w').write(stages[n])
        exe = os.path.join(tmp, 'bench%d' % n)
        main_c = 'bench-nmi.c' if n >= 11 else 'bench.c'
        run(['gcc', '-std=c11', '-Wall', '-Wno-unused-function', '-Werror', '-O1', '-I', tmp, '-o', exe,
             os.path.join(tmp, main_c), os.path.join(tmp, 'cpu.c'), os.path.join(tmp, 'bus.c'), os.path.join(tmp, 'trace.c')])
        tests[n] = []
        for name, program in TESTS[n]:
            stdin = clean(program)
            out = subprocess.run([exe], input=stdin, capture_output=True, text=True).stdout
            tests[n].append({'name': name, 'stdin': stdin, 'expect': out})

    # nestest with the final stage
    exe = os.path.join(tmp, 'nestest')
    run(['gcc', '-std=c11', '-Wall', '-Wno-unused-function', '-Werror', '-O1', '-I', tmp, '-o', exe,
         os.path.join(tmp, 'nestest-main.c'), os.path.join(tmp, 'cpu.c'), os.path.join(tmp, 'bus.c'), os.path.join(tmp, 'trace.c')])
    os.makedirs(os.path.join(tmp, 'n'), exist_ok=True)
    open(os.path.join(tmp, 'n', 'nestest.nes'), 'wb').write(open(os.path.join(ROOT, 'nes', 'nestest.nes'), 'rb').read())
    open(os.path.join(tmp, 'n', 'nestest.log'), 'w').write(open(os.path.join(ROOT, 'nes', 'nestest-official.log')).read())
    tests[12] = []
    for name, stdin in NESTEST:
        out = subprocess.run([exe], input=stdin, capture_output=True, text=True, cwd=os.path.join(tmp, 'n')).stdout
        tests[12].append({'name': name, 'stdin': stdin, 'expect': out})
    if 'All 5003 lines match' not in tests[12][-1]['expect'] or '$02 = 00, $03 = 00' not in tests[12][-1]['expect']:
        raise SystemExit('reference fails nestest:\n' + tests[12][-1]['expect'])

    data = {
        'files': files,
        'stages': {str(k): v for k, v in stages.items()},
        'tests': {str(k): v for k, v in tests.items()},
        'opcodes': [[op] + list(v) for op, v in sorted(table().items())],
        'busC': bus_c,
    }
    out = ('// Generated by tools/ref6502/build.py from the reference 6502. Do not edit by hand.\n'
           'window.CPU_DATA = ' + json.dumps(data, indent=1) + ';\n')
    open(os.path.join(ROOT, 'lessons', 'cpu-data.js'), 'w').write(out)
    print('wrote lessons/cpu-data.js:', len(out), 'bytes')
    for n in sorted(tests):
        for t in tests[n]:
            print('--- stage %d: %s' % (n, t['name']))
            print(t['expect'], end='')


if __name__ == '__main__':
    main()
