"""Builds the course's mapper test cartridges:

  nes/opcode-uxrom.nes   mapper 2
  nes/opcode-cnrom.nes   mapper 3
  nes/opcode-mmc1.nes    mapper 1
  nes/opcode-mmc3.nes    mapper 4

Each one shows the start of every PRG bank it can switch in (each bank
begins with the text "PRG BANK n"), cycles through its CHR banks twice a
second (a tile that is drawn as digit n in CHR bank n), and the MMC3 one
splits the screen with its scanline IRQ: the rows below the split scroll.

  python3 mappers.py
"""
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..'))

from asm6502 import assemble  # noqa: E402
from font import font_bytes, digit_tile  # noqa: E402

COMMON = """
PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
PPUSCROLL = $2005
PPUADDR   = $2006
PPUDATA   = $2007
CTRL      = $80            ; NMI on, background tiles from 0000
WINDOW    = $8000          ; where the switchable PRG bank appears

frame     = $00
chrbank   = $01
bankno    = $02
tmp       = $10

.org FIXED

reset:
    sei
    cld
    ldx #$FF
    txs
    inx
    stx PPUCTRL
    stx PPUMASK
    bit PPUSTATUS
@vblank1:
    bit PPUSTATUS
    bpl @vblank1
    lda #0
@clear:
    sta $00,x
    inx
    bne @clear
@vblank2:
    bit PPUSTATUS
    bpl @vblank2
    jsr mapper_init

    lda #$3F                ; palette: black, white text, gold digit
    sta PPUADDR
    lda #$00
    sta PPUADDR
    ldx #0
@palette:
    lda palette,x
    sta PPUDATA
    inx
    cpx #8
    bne @palette

    lda #$20                ; clear both nametables
    sta PPUADDR
    lda #$00
    sta PPUADDR
    tax
    ldy #8
@blank:
    sta PPUDATA
    inx
    bne @blank
    dey
    bne @blank

    ldx #0                  ; the texts: high, low, length, then the characters
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

    ldx #0                  ; every PRG bank: switch it in, copy its first 12 bytes to the screen
@bank:
    cpx #NPRG
    beq @banks_done
    stx bankno
    txa
    jsr select_prg
    ldx bankno
    lda row_hi,x
    sta PPUADDR
    lda row_lo,x
    sta PPUADDR
    ldy #0
@copy:
    lda WINDOW,y
    sta PPUDATA
    iny
    cpy #12
    bne @copy
    ldx bankno
    inx
    jmp @bank
@banks_done:

    lda #CTRL
    sta PPUCTRL
    CLI_IF_IRQ
forever:
    jmp forever

nmi:
    pha
    txa
    pha
    tya
    pha
    inc frame
    lda frame
    and #31                 ; a new CHR bank twice a second
    bne @same
    inc chrbank
    lda chrbank
    cmp #NCHR
    bne @same
    lda #0
    sta chrbank
@same:
    lda chrbank
    jsr select_chr
    bit PPUSTATUS
    lda #0
    sta PPUSCROLL
    sta PPUSCROLL
    lda #CTRL
    sta PPUCTRL
    lda #$0A
    sta PPUMASK
    NMI_EXTRA
    pla
    tay
    pla
    tax
    pla
    rti

irq:
    IRQ_BODY
    rti

palette:
    .byte $0F, $30, $28, $16, $0F, $30, $28, $16

ROWS

TEXTS

MAPPER_CODE

.org $FFFA
    .word nmi, reset, irq
"""

# A table in ROM whose bytes equal their index: UxROM and CNROM boards have
# bus conflicts, so a game writes the bank number to a byte that holds it.
BANKTABLE = "banktable:\n    .byte " + ", ".join(str(i) for i in range(16)) + "\n"

MAPPERS = {
    2: dict(name='uxrom', title='MAPPER 2: UXROM', prg16=8, fixed=0xC000, nprg=7, nchr=1,
            prg_text='PRG BANKS AT 8000:', chr_text='CHR: 8 KB OF RAM', code="""
mapper_init:                ; CHR RAM: copy the font into it
    lda #$02
    sta PPUADDR
    lda #$00
    sta PPUADDR
    lda #<font
    sta tmp
    lda #>font
    sta tmp+1
    ldx #4
    ldy #0
@font:
    lda (tmp),y
    sta PPUDATA
    iny
    bne @font
    inc tmp+1
    dex
    bne @font
    rts
select_prg:                 ; A = 16 KB bank for 8000
    tay
    lda banktable,y
    sta banktable,y
    rts
select_chr:
    rts
""" + BANKTABLE),
    3: dict(name='cnrom', title='MAPPER 3: CNROM', prg16=1, fixed=0xC000, nprg=0, nchr=4, chr_units=4, unit=0x2000,
            prg_text='PRG: 16 KB, NOTHING SWITCHES', chr_text='CHR BANK (8 KB):', code="""
mapper_init:
    rts
select_prg:
    rts
select_chr:                 ; A = 8 KB CHR bank
    tay
    lda banktable,y
    sta banktable,y
    rts
""" + BANKTABLE),
    1: dict(name='mmc1', title='MAPPER 1: MMC1', prg16=8, fixed=0xC000, nprg=7, nchr=8, chr_units=8, unit=0x1000,
            prg_text='PRG BANKS AT 8000:', chr_text='CHR BANK (4 KB):', code="""
mapper_init:
    lda #$80                ; reset the serial port
    sta $8000
    lda #$1E                ; control: vertical mirroring, PRG mode 3, CHR in 4 KB banks
    ldx #5
@control:
    sta $8000
    lsr a
    dex
    bne @control
    rts
select_prg:                 ; A = 16 KB bank for 8000, one bit per write
    ldx #5
@bit:
    sta $E000
    lsr a
    dex
    bne @bit
    rts
select_chr:                 ; A = 4 KB bank for 0000
    ldx #5
@bit:
    sta $A000
    lsr a
    dex
    bne @bit
    rts
"""),
    4: dict(name='mmc3', title='MAPPER 4: MMC3', prg16=8, fixed=0xE000, nprg=8, nchr=8, chr_units=32, unit=0x800,
            prg_text='PRG BANKS AT 8000 (R6):', chr_text='CHR BANK (2 KB, R1):', irq=True, code="""
IRQ_LINE = 151              ; the counter reaches 0 at dot 260 of scanline 150
mapper_init:
    ldx #0                  ; R0-R5: 2 KB banks 0 and 1, then 1 KB banks 4-7
@regs:
    stx $8000
    lda chr_init,x
    sta $8001
    inx
    cpx #6
    bne @regs
    lda #0                  ; vertical mirroring
    sta $A000
    rts
chr_init:
    .byte 0, 2, 4, 5, 6, 7
select_prg:                 ; A = 8 KB bank for 8000 (R6)
    ldx #6
    stx $8000
    sta $8001
    rts
select_chr:                 ; A = 2 KB bank n + 1 for 0800 (R1 counts in 1 KB)
    clc
    adc #1
    asl a
    ldx #1
    stx $8000
    sta $8001
    rts
"""),
}

NMI_IRQ = """lda #IRQ_LINE
    sta $C000               ; latch
    sta $C001               ; reload
    sta $E001               ; enable"""
IRQ_IRQ = """pha
    sta $E000               ; acknowledge (and disable until the next frame)
    bit PPUSTATUS
    lda frame               ; scroll what is below the split
    sta PPUSCROLL
    lda #0
    sta PPUSCROLL
    pla"""


def texts(m):
    lines = [(2, 2, 'OPCODE MAPPER TEST'), (3, 2, m['title']), (5, 2, m['prg_text']), (16, 2, m['chr_text'])]
    if m['nchr'] > 1:
        lines.append((16, 2 + len(m['chr_text']) + 1, '\xF0'))
    if m.get('irq'):
        lines += [(19, 2, 'THE IRQ SPLITS THE SCREEN HERE:'), (20, 2, 'FROM HERE ON, THE ROWS SCROLL.'),
                  (22, 2, '>>>> MMC3 SCANLINE IRQ >>>>'), (24, 2, 'TOP: STILL. BOTTOM: MOVES.')]
    out = ['texts:']
    for row, col, text in lines:
        addr = 0x2000 + row * 32 + col
        codes = ', '.join(str(ord(c)) for c in text)
        out.append('    .byte $%02X, $%02X, %d, %s' % (addr >> 8, addr & 0xFF, len(text), codes))
    out.append('    .byte 0')
    return '\n'.join(out)


def rows(n):
    addrs = [0x2000 + (6 + k) * 32 + 4 for k in range(max(n, 1))]
    return ('row_hi:\n    .byte ' + ', '.join('$%02X' % (a >> 8) for a in addrs) +
            '\nrow_lo:\n    .byte ' + ', '.join('$%02X' % (a & 0xFF) for a in addrs))


def chr_data(m):
    if 'chr_units' not in m:
        return b''                                   # CHR RAM
    unit = m['unit']
    data = bytearray(m['chr_units'] * unit)
    for k in range(m['chr_units']):
        base = k * unit
        if unit >= 0x1000 or k == 0:                 # the font, wherever tiles 20-5F can come from
            data[base + 0x200:base + 0x600] = font_bytes()
        # Tile F0 sits at 0F00 of the pattern table: in the 2 KB bank at 0800,
        # that is 0700 into the bank.
        off = 0xF00 if unit >= 0x1000 else 0x700
        shown = k if unit != 0x800 else k - 1        # MMC3: select_chr(n) maps bank n + 1
        data[base + off:base + off + 16] = digit_tile(shown)
    if len(data) % 0x2000:
        data += bytes(0x2000 - len(data) % 0x2000)
    return bytes(data)


def build(number):
    m = MAPPERS[number]
    src = COMMON.replace('.org FIXED', '.org $%04X' % m['fixed'])
    src = src.replace('#NPRG', '#%d' % m['nprg']).replace('#NCHR', '#%d' % m['nchr'])
    src = src.replace('    CLI_IF_IRQ', '    cli' if m.get('irq') else '')
    src = src.replace('    NMI_EXTRA', '    ' + NMI_IRQ if m.get('irq') else '')
    src = src.replace('    IRQ_BODY', '    ' + IRQ_IRQ if m.get('irq') else '')
    src = src.replace('ROWS', rows(m['nprg'])).replace('TEXTS', texts(m))
    code = m['code']
    if number == 2:
        code += 'font:\n' + '\n'.join('    .byte ' + ', '.join('$%02X' % b for b in font_bytes()[i:i + 16])
                                       for i in range(0, 0x400, 16)) + '\n'
    src = src.replace('MAPPER_CODE', code)
    mem, _ = assemble(src)
    # PRG: every switchable bank starts with its name; the fixed code is last.
    prg_size = m['prg16'] * 0x4000
    prg = bytearray(prg_size)
    bank_size = 0x2000 if number == 4 else 0x4000
    for k in range(prg_size // bank_size):
        text = ('PRG BANK %d' % k).ljust(12).encode()
        prg[k * bank_size:k * bank_size + 12] = text
    base = 0x10000 - prg_size
    for addr, b in mem.items():
        if addr >= m['fixed']:
            prg[addr - base] = b
    chr_rom = chr_data(m)
    flags6 = ((number & 0x0F) << 4) | 0x01
    header = bytes([0x4E, 0x45, 0x53, 0x1A, m['prg16'], len(chr_rom) // 0x2000, flags6, number & 0xF0]) + bytes(8)
    return m['name'], header + bytes(prg) + chr_rom


if __name__ == '__main__':
    for number in MAPPERS:
        name, rom = build(number)
        path = os.path.join(ROOT, 'nes', 'opcode-%s.nes' % name)
        open(path, 'wb').write(rom)
        print('wrote', path, len(rom), 'bytes')
