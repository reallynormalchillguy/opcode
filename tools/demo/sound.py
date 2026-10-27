"""Builds nes/opcode-sound.nes, the course's sound test cartridge.

It plays each part of the APU on its own, saying on screen which, then all
of them together, and loops. The 6502 code is a tiny player: each frame it
follows a script of APU register writes and waits, made here from notes.

  python3 sound.py
"""
import math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

from asm6502 import assemble  # noqa: E402
from font import font_bytes  # noqa: E402

CPU = 1789773
NOTES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
SAMPLE_ADDR = 0xE000                 # where the DMC sample sits (C000 + 64 x 0x80)


def freq(note):
    name, octave = note[:-1], int(note[-1])
    n = NOTES[name] + 12 * (octave + 1) - 69
    return 440.0 * 2 ** (n / 12)


def pulse_period(note):
    return round(CPU / (16 * freq(note))) - 1


def triangle_period(note):
    return round(CPU / (32 * freq(note))) - 1


TEXTS = [
    'PULSE 1: A MELODY',
    'PULSE 2 JOINS: A HARMONY',
    'ENVELOPES, LENGTHS, SWEEPS',
    'TRIANGLE: THE BASS',
    'NOISE: THE DRUMS',
    'DMC: A RECORDED KICK DRUM',
    'ALL TOGETHER',
]


class Script:
    """APU writes per frame. Commands: (reg, value), ('wait', n), ('text', i), ('loop',)."""

    def __init__(self):
        self.out = []

    def w(self, reg, value):
        self.out.append((reg - 0x4000, value & 0xFF))

    def wait(self, frames):
        while frames > 0:
            n = min(frames, 255)
            self.out.append((0xFE, n))
            frames -= n

    def text(self, i):
        self.out.append((0xFD, i + 1))

    def loop_here(self):
        self.out.append(('label',))

    def bytes(self):
        data, loop = [], 0
        for cmd in self.out:
            if cmd[0] == 'label':
                loop = len(data)
                continue
            data += [cmd[0], cmd[1]]
        data += [0xFF, 0]
        return data, loop


BEAT = 8   # frames per eighth note

MELODY = ['E5', 'G5', 'A5', 'G5', 'E5', 'D5', 'C5', 'D5', 'E5', 'E5', 'G5', 'E5', 'D5', 'C5', 'D5', None]
HARMONY = ['C5', 'E5', 'F5', 'E5', 'C5', 'B4', 'A4', 'B4', 'C5', 'C5', 'E5', 'C5', 'B4', 'A4', 'G4', None]
BASS = ['C3', None, 'C3', None, 'A2', None, 'A2', None, 'F2', None, 'F2', None, 'G2', None, 'G2', None]
DRUMS = ['k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 'k', 's', 'h']


def pulse_note(s, ch, note, duty, volume):
    base = 0x4000 + 4 * ch
    if note is None:
        s.w(base, (duty << 6) | 0x30)                 # volume 0
        return
    p = pulse_period(note)
    s.w(base, (duty << 6) | 0x30 | volume)            # length counter halted, constant volume
    s.w(base + 2, p & 0xFF)
    s.w(base + 3, (p >> 8) | 0x08)


def triangle_note(s, note):
    if note is None:
        s.w(0x4008, 0x80)                             # linear counter 0: silent
        s.w(0x400B, 0x08)
        return
    p = triangle_period(note)
    s.w(0x4008, 0x7F | 0x80)                          # hold the linear counter at 127
    s.w(0x400A, p & 0xFF)
    s.w(0x400B, (p >> 8) | 0x08)


def drum(s, kind, dmc=False):
    if kind == 'k':
        if dmc:
            s.w(0x4015, 0x0F)                         # restart the sample
            s.w(0x4015, 0x1F)
        else:
            s.w(0x400C, 0x08 | 0x00 | 2)              # decaying, fast
            s.w(0x400E, 0x0C)
            s.w(0x400F, 0x08)
    elif kind == 's':
        s.w(0x400C, 0x00 | 4)
        s.w(0x400E, 0x06)
        s.w(0x400F, 0x08)
    elif kind == 'h':
        s.w(0x400C, 0x00 | 1)
        s.w(0x400E, 0x81)                             # the short, metallic sequence
        s.w(0x400F, 0x08)


def silence(s):
    s.w(0x4000, 0x30)
    s.w(0x4004, 0x30)
    s.w(0x4008, 0x80)
    s.w(0x400B, 0x08)
    s.w(0x400C, 0x30)


def song():
    s = Script()
    s.w(0x4017, 0x40)                                 # frame IRQ off
    s.w(0x4015, 0x0F)
    s.w(0x4001, 0x08)                                 # sweeps off (negate set, shift 0)
    s.w(0x4005, 0x08)
    s.loop_here()
    # 1: pulse 1 alone (constant volume: works from the first exercise)
    s.text(0)
    for note in MELODY:
        pulse_note(s, 0, note, 2, 10)
        s.wait(BEAT)
    # 2: with pulse 2
    s.text(1)
    for a, b in zip(MELODY, HARMONY):
        pulse_note(s, 0, a, 2, 9)
        pulse_note(s, 1, b, 1, 7)
        s.wait(BEAT)
    silence(s)
    # 3: envelopes (decaying notes that end on their own) and sweeps
    s.text(2)
    for note in MELODY[:8]:
        p = pulse_period(note)
        s.w(0x4000, 0x80 | 0x02)                      # 50%, decaying envelope, length counter on
        s.w(0x4002, p & 0xFF)
        s.w(0x4003, (p >> 8) | (0x02 << 3))           # length 20 half frames
        s.wait(BEAT)
    for start in ('C4', 'C5'):                        # two sweeps: up, then down
        p = pulse_period(start)
        s.w(0x4000, 0xBF)
        s.w(0x4001, 0x9B if start == "C4" else 0x93)  # enabled, every 2 half frames, negate on the first, shift 3
        s.w(0x4002, p & 0xFF)
        s.w(0x4003, (p >> 8) | 0x08)
        s.wait(30)
        s.w(0x4000, 0xB0)
        s.w(0x4001, 0x08)
        s.wait(6)
    # 4: the triangle
    s.text(3)
    for note in BASS * 2:
        triangle_note(s, note)
        s.wait(BEAT)
    triangle_note(s, None)
    # 5: the noise
    s.text(4)
    for kind in DRUMS * 2:
        drum(s, kind)
        s.wait(BEAT)
    # 6: the DMC
    s.text(5)
    s.w(0x4010, 0x0F)                                 # fastest rate, no loop, no IRQ
    s.w(0x4011, 0x40)
    s.w(0x4012, (SAMPLE_ADDR - 0xC000) // 64)
    s.w(0x4013, (len(kick_sample()) - 1) // 16)
    for i in range(8):
        drum(s, 'k', dmc=True)
        s.wait(BEAT * 2)
    # 7: everything
    s.text(6)
    for bar in range(2):
        for i in range(16):
            pulse_note(s, 0, MELODY[i], 2, 8)
            pulse_note(s, 1, HARMONY[i], 1, 5)
            triangle_note(s, BASS[i])
            kind = DRUMS[i]
            drum(s, kind, dmc=(kind == 'k'))
            s.wait(BEAT)
    silence(s)
    s.wait(40)
    return s.bytes()


def kick_sample():
    """A kick drum, as DMC bytes: each bit says up or down by 2."""
    rate = CPU / 54                                   # rate 15: 33 kHz
    n = int(rate * 0.18)
    target = []
    for i in range(n):
        t = i / rate
        f = 50 + 120 * math.exp(-t * 30)
        phase = 2 * math.pi * (50 * t + 120 * (1 - math.exp(-t * 30)) / 30)
        amp = math.exp(-t * 14)
        target.append(64 + 55 * amp * math.sin(phase))
        del f
    level = 64
    bits = []
    for v in target:
        if v > level and level <= 125:
            bits.append(1)
            level += 2
        else:
            bits.append(0)
            if level >= 2:
                level -= 2
    while len(bits) % 8:
        bits.append(0)
    data = [sum(bits[i + b] << b for b in range(8)) for i in range(0, len(bits), 8)]
    while (len(data) - 1) % 16:
        data.append(0x55)                             # up, down: stays put
    return bytes(data)


CODE = """
PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
PPUSCROLL = $2005
PPUADDR   = $2006
PPUDATA   = $2007
APU       = $4000

ptr       = $00            ; where the script is
wait      = $02            ; frames to wait
pending   = $03            ; a text to show in the next NMI (number + 1)

.org $C000
reset:
    sei
    cld
    ldx #$FF
    txs
    inx
    stx PPUCTRL
    stx PPUMASK
    stx $4015
    lda #$40
    sta $4017
    bit PPUSTATUS
@vblank1:
    bit PPUSTATUS
    bpl @vblank1
    txa
@clear:
    sta $00,x
    inx
    bne @clear
@vblank2:
    bit PPUSTATUS
    bpl @vblank2

    lda #$3F
    sta PPUADDR
    lda #$00
    sta PPUADDR
    ldx #0
@palette:
    lda palette,x
    sta PPUDATA
    inx
    cpx #4
    bne @palette

    lda #$20                ; clear the nametable
    sta PPUADDR
    lda #$00
    sta PPUADDR
    tax
    ldy #4
@blank:
    sta PPUDATA
    inx
    bne @blank
    dey
    bne @blank

    ldx #0                  ; fixed texts: high, low, length, characters
@text:
    lda texts,x
    beq @texts_done
    sta PPUADDR
    inx
    lda texts,x
    sta PPUADDR
    inx
    ldy texts,x
    inx
@char:
    lda texts,x
    sta PPUDATA
    inx
    dey
    bne @char
    jmp @text
@texts_done:

    lda #<script
    sta ptr
    lda #>script
    sta ptr+1
    lda #$80
    sta PPUCTRL
forever:
    jmp forever

nmi:
    pha
    txa
    pha
    tya
    pha
    lda pending             ; a new line of text
    beq @no_text
    sec
    sbc #1
    asl a
    tax
    lda part_texts,x
    sta $10
    lda part_texts+1,x
    sta $11
    lda #$21
    sta PPUADDR
    lda #$A2
    sta PPUADDR
    ldy #0
@line:
    lda ($10),y
    sta PPUDATA
    iny
    cpy #28
    bne @line
    lda #0
    sta pending
@no_text:
    bit PPUSTATUS
    lda #0
    sta PPUSCROLL
    sta PPUSCROLL
    lda #$80
    sta PPUCTRL
    lda #$0A
    sta PPUMASK
    jsr play
    pla
    tay
    pla
    tax
    pla
irq:
    rti

; Follow the script until it says to wait.
play:
    lda wait
    beq @next
    dec wait
    rts
@next:
    ldy #0
    lda (ptr),y
    cmp #$FE
    beq @wait
    cmp #$FD
    beq @text
    cmp #$FF
    beq @loop
    tax                     ; an APU register: 4000 + x
    iny
    lda (ptr),y
    sta APU,x
    jsr advance
    jmp @next
@wait:
    iny
    lda (ptr),y
    sec
    sbc #1
    sta wait
    jsr advance
    rts
@text:
    iny
    lda (ptr),y
    sta pending
    jsr advance
    jmp @next
@loop:
    lda #<script_loop
    sta ptr
    lda #>script_loop
    sta ptr+1
    jmp @next

advance:
    clc
    lda ptr
    adc #2
    sta ptr
    bcc @done
    inc ptr+1
@done:
    rts

palette:
    .byte $0F, $30, $21, $27

DATA

.org $FFFA
    .word nmi, reset, irq
"""


def build():
    data, loop = song()
    lines = []
    fixed = [(3, 2, 'OPCODE SOUND TEST'), (5, 2, 'EACH PART OF THE APU ON ITS OWN,'), (6, 2, 'THEN ALL TOGETHER.'),
             (11, 2, 'NOW PLAYING:')]
    lines.append('texts:')
    for row, col, text in fixed:
        addr = 0x2000 + row * 32 + col
        lines.append('    .byte $%02X, $%02X, %d, %s' % (addr >> 8, addr & 0xFF, len(text), ', '.join(str(ord(c)) for c in text)))
    lines.append('    .byte 0')
    lines.append('part_texts:\n    .word ' + ', '.join('part%d' % i for i in range(len(TEXTS))))
    for i, t in enumerate(TEXTS):
        lines.append('part%d:\n    .byte %s' % (i, ', '.join(str(ord(c)) for c in t.ljust(28))))
    for label, part in (('script', data[:loop]), ('script_loop', data[loop:])):
        lines.append(label + ':')
        for i in range(0, len(part), 16):
            lines.append('    .byte ' + ', '.join('$%02X' % b for b in part[i:i + 16]))
    src = CODE.replace('\nDATA\n', '\n' + '\n'.join(lines) + '\n')
    mem, symbols = assemble(src)
    assert symbols['script'] + len(data) < SAMPLE_ADDR, 'the script runs into the sample'
    prg = bytearray(0x4000)
    for addr, b in mem.items():
        prg[addr - 0xC000] = b
    kick = kick_sample()
    prg[SAMPLE_ADDR - 0xC000:SAMPLE_ADDR - 0xC000 + len(kick)] = kick
    chr_rom = bytearray(0x2000)
    chr_rom[0x200:0x600] = font_bytes()
    header = bytes([0x4E, 0x45, 0x53, 0x1A, 1, 1, 0x00, 0x00]) + bytes(8)
    return header + bytes(prg) + bytes(chr_rom), len(data), len(kick)


if __name__ == '__main__':
    rom, script_len, kick_len = build()
    path = os.path.join(ROOT, 'nes', 'opcode-sound.nes')
    open(path, 'wb').write(rom)
    print('wrote', path, len(rom), 'bytes; script', script_len, 'bytes; kick', kick_len, 'bytes')
