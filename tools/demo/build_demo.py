"""Builds nes/opcode-demo.nes, the course's demo cartridge.

  python3 build_demo.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

import art  # noqa: E402
from asm6502 import assemble, ines  # noqa: E402


def byte_lines(label, data):
    out = [label + ':']
    for i in range(0, len(data), 16):
        out.append('    .byte ' + ', '.join('$%02X' % b for b in data[i:i + 16]))
    return '\n'.join(out)


def source():
    xs = [x for x, _ in art.BYTES]
    data = '\n'.join([
        byte_lines('floor', art.FLOOR),
        byte_lines('byte_xl', [x & 0xFF for x in xs]),
        byte_lines('byte_xh', [x >> 8 for x in xs]),
        byte_lines('byte_y', [y for _, y in art.BYTES]),
        byte_lines('palettes', art.PALETTES),
        byte_lines('nametables', art.nametables()),
    ])
    return open(os.path.join(HERE, 'demo.s')).read().replace('\nDATA\n', '\n' + data + '\n')


def build():
    mem, symbols = assemble(source())
    rom = ines(mem, 1, art.chr_rom(), flags6=0x01)
    return rom, symbols


if __name__ == '__main__':
    rom, symbols = build()
    path = os.path.join(ROOT, 'nes', 'opcode-demo.nes')
    open(path, 'wb').write(rom)
    code_end = symbols['floor']
    print('wrote', path, len(rom), 'bytes; code ends at %04X' % code_end)
