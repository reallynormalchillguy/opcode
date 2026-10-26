"""Cut cpu.staged.c into the cpu.c a learner has after exercise stage N.
Blocks: '//@ N' (N and later), '//@ N-M' (N to M), '//@ end'."""
import re, sys

def stage(src, n):
    out, keep = [], [True]
    for line in src.splitlines():
        m = re.match(r'^//@ (\d+)(?:-(\d+))?\s*$', line)
        if m:
            lo = int(m.group(1)); hi = int(m.group(2)) if m.group(2) else 99
            keep.append(keep[-1] and lo <= n <= hi)
            continue
        if line.strip() == '//@ end':
            keep.pop(); continue
        if keep[-1]:
            out.append(line)
    text = '\n'.join(out) + '\n'
    return re.sub(r'\n{3,}', '\n\n', text)

if __name__ == '__main__':
    src = open('cpu.staged.c').read()
    n = int(sys.argv[1])
    sys.stdout.write(stage(src, n))
