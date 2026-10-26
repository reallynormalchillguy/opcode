"""A small two-pass 6502 assembler for the course's own test ROMs.

  from asm6502 import assemble
  mem, symbols = assemble(source_text)     # mem: {address: byte}

Syntax (a subset of ca65):
  ; comment
  label:                 global label
  @loop:                 local label, belongs to the last global label
  NAME = expr            constant
  .org $C000             set the address
  .byte 1, $FF, "TEXT"   bytes (strings give their ASCII codes)
  .word label, $1234     16-bit little-endian values
  .res 16                16 zero bytes (or .res 16, $FF)
  lda #<label            < low byte, > high byte

Expressions: $hex, %binary, decimal, 'c', labels, + - * / & | ^ << >>
and parentheses. Zero-page addressing is used when the value is known in
the first pass and fits in a byte; otherwise absolute.
"""
import os, re, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ref6502'))
from opcodes import table  # noqa: E402

OPS = {}
for code, (mn, mode, _cyc, _extra) in table().items():
    OPS.setdefault(mn, {})[mode] = code
SIZES = {'imp': 1, 'acc': 1, 'imm': 2, 'zp': 2, 'zpx': 2, 'zpy': 2, 'rel': 2, 'izx': 2, 'izy': 2,
         'abs': 3, 'abx': 3, 'aby': 3, 'ind': 3}


class AsmError(Exception):
    pass


def _split_args(text):
    """Split on commas that are not inside quotes."""
    out, cur, quote = [], '', None
    for ch in text:
        if quote:
            cur += ch
            if ch == quote:
                quote = None
        elif ch in '"\'':
            quote = ch
            cur += ch
        elif ch == ',':
            out.append(cur.strip())
            cur = ''
        else:
            cur += ch
    if cur.strip():
        out.append(cur.strip())
    return out


class Assembler:
    def __init__(self):
        self.symbols = {}
        self.scope = ''

    def name(self, label):
        return self.scope + label if label.startswith('@') else label

    def value(self, expr, final):
        """Evaluate expr. In the first pass unknown labels give None."""
        expr = expr.strip()
        part = None
        if expr[:1] in '<>':
            part, expr = expr[0], expr[1:]
        py = expr
        py = re.sub(r"'(.)'", lambda m: str(ord(m.group(1))), py)
        py = re.sub(r'\$([0-9A-Fa-f]+)', lambda m: str(int(m.group(1), 16)), py)
        py = re.sub(r'%([01]+)', lambda m: str(int(m.group(1), 2)), py)
        unknown = []

        def sym(m):
            n = self.name(m.group(0))
            if n in self.symbols:
                return str(self.symbols[n])
            unknown.append(n)
            return '0'
        py = re.sub(r'@?[A-Za-z_][A-Za-z0-9_]*', sym, py)
        if unknown:
            if final:
                raise AsmError('unknown label: ' + ', '.join(unknown))
            return None
        if not re.fullmatch(r'[0-9+\-*/&|^<>() ]*', py):
            raise AsmError('bad expression: ' + expr)
        v = int(eval(py.replace('/', '//')))  # only digits and operators reach here
        if part == '<':
            v &= 0xFF
        elif part == '>':
            v = (v >> 8) & 0xFF
        return v

    def operand(self, mn, text):
        """Return (mode, expr) for an instruction operand."""
        t = text.strip()
        modes = OPS[mn]
        if t == '' or t.upper() == 'A':
            return ('acc' if 'acc' in modes else 'imp'), None
        if 'rel' in modes:
            return 'rel', t
        if t.startswith('#'):
            return 'imm', t[1:]
        m = re.fullmatch(r'\((.+),\s*[xX]\s*\)', t)
        if m:
            return 'izx', m.group(1)
        m = re.fullmatch(r'\((.+)\)\s*,\s*[yY]', t)
        if m:
            return 'izy', m.group(1)
        if t.startswith('(') and t.endswith(')') and 'ind' in modes:
            return 'ind', t[1:-1]
        m = re.fullmatch(r'(.+),\s*([xXyY])', t)
        if m:
            return 'ab' + m.group(2).lower(), m.group(1)
        return 'abs', t

    def run(self, src, final, sizes):
        mem = {}
        pc = 0
        self.scope = ''
        defined = set()
        for lineno, raw in enumerate(src.splitlines(), 1):
            line = raw.split(';', 1)[0] if '"' not in raw else re.sub(r';[^"]*$', '', raw)
            line = line.strip()
            try:
                m = re.match(r'^(@?[A-Za-z_][A-Za-z0-9_]*):\s*(.*)$', line)
                if m:
                    label = m.group(1)
                    if not label.startswith('@'):
                        self.scope = label
                    n = self.name(label)
                    if n in defined:
                        raise AsmError('label defined twice: ' + n)
                    defined.add(n)
                    self.symbols[n] = pc
                    line = m.group(2).strip()
                if not line:
                    continue
                m = re.match(r'^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$', line)
                if m:
                    v = self.value(m.group(2), final)
                    if v is not None:
                        self.symbols[m.group(1)] = v
                    continue
                word, _, rest = line.partition(' ')
                word = word.lower()
                if word == '.org':
                    pc = self.value(rest, True)
                    continue
                if word in ('.byte', '.word'):
                    for arg in _split_args(rest):
                        if arg.startswith('"'):
                            for ch in arg[1:-1]:
                                mem[pc] = ord(ch)
                                pc += 1
                            continue
                        v = self.value(arg, final) or 0
                        if word == '.byte':
                            if final and not 0 <= v <= 255 and not -128 <= v < 0:
                                raise AsmError('byte out of range: ' + arg)
                            mem[pc] = v & 0xFF
                            pc += 1
                        else:
                            mem[pc] = v & 0xFF
                            mem[pc + 1] = (v >> 8) & 0xFF
                            pc += 2
                    continue
                if word == '.res':
                    args = _split_args(rest)
                    count = self.value(args[0], True)
                    fill = self.value(args[1], True) if len(args) > 1 else 0
                    for _ in range(count):
                        mem[pc] = fill
                        pc += 1
                    continue
                mn = word.upper()
                if mn not in OPS:
                    raise AsmError('unknown instruction: ' + word)
                mode, expr = self.operand(mn, rest)
                v = self.value(expr, final) if expr is not None else None
                if mode in ('abs', 'abx', 'aby'):
                    if lineno in sizes:
                        mode = sizes[lineno]
                    else:
                        zp = {'abs': 'zp', 'abx': 'zpx', 'aby': 'zpy'}[mode]
                        if v is not None and 0 <= v < 256 and zp in OPS[mn]:
                            mode = zp
                        sizes[lineno] = mode
                if mode not in OPS[mn]:
                    raise AsmError('%s has no %s mode' % (mn, mode))
                mem[pc] = OPS[mn][mode]
                size = SIZES[mode]
                if final:
                    if mode == 'rel':
                        off = v - (pc + 2)
                        if not -128 <= off <= 127:
                            raise AsmError('branch too far (%d bytes)' % off)
                        mem[pc + 1] = off & 0xFF
                    elif size == 2:
                        if not 0 <= v <= 255:
                            raise AsmError('value does not fit in a byte: %s' % expr)
                        mem[pc + 1] = v
                    elif size == 3:
                        mem[pc + 1] = v & 0xFF
                        mem[pc + 2] = (v >> 8) & 0xFF
                pc += size
            except AsmError as e:
                raise AsmError('line %d: %s\n    %s' % (lineno, e, raw.strip())) from None
        return mem


def assemble(src):
    a = Assembler()
    sizes = {}
    a.run(src, False, sizes)
    a.run(src, False, sizes)  # labels after forward references settle
    mem = a.run(src, True, sizes)
    return mem, a.symbols


def ines(mem, prg_banks, chr_data, flags6=0x01, flags7=0x00):
    """An iNES file: PRG from mem (the last prg_banks x 16 KB below 10000)
    and the CHR bytes given."""
    base = 0x10000 - prg_banks * 0x4000
    prg = bytearray(prg_banks * 0x4000)
    for addr, b in mem.items():
        if not base <= addr <= 0xFFFF:
            raise AsmError('byte outside PRG ROM at %04X' % addr)
        prg[addr - base] = b
    header = bytes([0x4E, 0x45, 0x53, 0x1A, prg_banks, len(chr_data) // 0x2000, flags6, flags7]) + bytes(8)
    return header + bytes(prg) + bytes(chr_data)


if __name__ == '__main__':
    mem, syms = assemble(open(sys.argv[1]).read())
    for a in sorted(mem)[:64]:
        print('%04X %02X' % (a, mem[a]))
