"""The 151 official 6502 opcodes: (opcode, mnemonic, mode, cycles, page_cross_extra).

Modes: imp acc imm zp zpx zpy abs abx aby ind izx izy rel
Branches take +1 cycle when taken and +1 more when the target is in another page.
"""

OPS = """
69 ADC imm 2 0|65 ADC zp 3 0|75 ADC zpx 4 0|6D ADC abs 4 0|7D ADC abx 4 1|79 ADC aby 4 1|61 ADC izx 6 0|71 ADC izy 5 1
29 AND imm 2 0|25 AND zp 3 0|35 AND zpx 4 0|2D AND abs 4 0|3D AND abx 4 1|39 AND aby 4 1|21 AND izx 6 0|31 AND izy 5 1
0A ASL acc 2 0|06 ASL zp 5 0|16 ASL zpx 6 0|0E ASL abs 6 0|1E ASL abx 7 0
90 BCC rel 2 0|B0 BCS rel 2 0|F0 BEQ rel 2 0|30 BMI rel 2 0|D0 BNE rel 2 0|10 BPL rel 2 0|50 BVC rel 2 0|70 BVS rel 2 0
24 BIT zp 3 0|2C BIT abs 4 0
00 BRK imp 7 0
18 CLC imp 2 0|D8 CLD imp 2 0|58 CLI imp 2 0|B8 CLV imp 2 0
C9 CMP imm 2 0|C5 CMP zp 3 0|D5 CMP zpx 4 0|CD CMP abs 4 0|DD CMP abx 4 1|D9 CMP aby 4 1|C1 CMP izx 6 0|D1 CMP izy 5 1
E0 CPX imm 2 0|E4 CPX zp 3 0|EC CPX abs 4 0
C0 CPY imm 2 0|C4 CPY zp 3 0|CC CPY abs 4 0
C6 DEC zp 5 0|D6 DEC zpx 6 0|CE DEC abs 6 0|DE DEC abx 7 0
CA DEX imp 2 0|88 DEY imp 2 0
49 EOR imm 2 0|45 EOR zp 3 0|55 EOR zpx 4 0|4D EOR abs 4 0|5D EOR abx 4 1|59 EOR aby 4 1|41 EOR izx 6 0|51 EOR izy 5 1
E6 INC zp 5 0|F6 INC zpx 6 0|EE INC abs 6 0|FE INC abx 7 0
E8 INX imp 2 0|C8 INY imp 2 0
4C JMP abs 3 0|6C JMP ind 5 0
20 JSR abs 6 0
A9 LDA imm 2 0|A5 LDA zp 3 0|B5 LDA zpx 4 0|AD LDA abs 4 0|BD LDA abx 4 1|B9 LDA aby 4 1|A1 LDA izx 6 0|B1 LDA izy 5 1
A2 LDX imm 2 0|A6 LDX zp 3 0|B6 LDX zpy 4 0|AE LDX abs 4 0|BE LDX aby 4 1
A0 LDY imm 2 0|A4 LDY zp 3 0|B4 LDY zpx 4 0|AC LDY abs 4 0|BC LDY abx 4 1
4A LSR acc 2 0|46 LSR zp 5 0|56 LSR zpx 6 0|4E LSR abs 6 0|5E LSR abx 7 0
EA NOP imp 2 0
09 ORA imm 2 0|05 ORA zp 3 0|15 ORA zpx 4 0|0D ORA abs 4 0|1D ORA abx 4 1|19 ORA aby 4 1|01 ORA izx 6 0|11 ORA izy 5 1
48 PHA imp 3 0|08 PHP imp 3 0|68 PLA imp 4 0|28 PLP imp 4 0
2A ROL acc 2 0|26 ROL zp 5 0|36 ROL zpx 6 0|2E ROL abs 6 0|3E ROL abx 7 0
6A ROR acc 2 0|66 ROR zp 5 0|76 ROR zpx 6 0|6E ROR abs 6 0|7E ROR abx 7 0
40 RTI imp 6 0|60 RTS imp 6 0
E9 SBC imm 2 0|E5 SBC zp 3 0|F5 SBC zpx 4 0|ED SBC abs 4 0|FD SBC abx 4 1|F9 SBC aby 4 1|E1 SBC izx 6 0|F1 SBC izy 5 1
38 SEC imp 2 0|F8 SED imp 2 0|78 SEI imp 2 0
85 STA zp 3 0|95 STA zpx 4 0|8D STA abs 4 0|9D STA abx 5 0|99 STA aby 5 0|81 STA izx 6 0|91 STA izy 6 0
86 STX zp 3 0|96 STX zpy 4 0|8E STX abs 4 0
84 STY zp 3 0|94 STY zpx 4 0|8C STY abs 4 0
AA TAX imp 2 0|A8 TAY imp 2 0|BA TSX imp 2 0|8A TXA imp 2 0|9A TXS imp 2 0|98 TYA imp 2 0
"""

def table():
    out = {}
    for chunk in OPS.replace('\n', '|').split('|'):
        chunk = chunk.strip()
        if not chunk:
            continue
        op, mn, mode, cyc, extra = chunk.split()
        out[int(op, 16)] = (mn, mode, int(cyc), int(extra))
    assert len(out) == 151, len(out)
    return out

SIZES = {'imp': 1, 'acc': 1, 'imm': 2, 'zp': 2, 'zpx': 2, 'zpy': 2, 'rel': 2, 'izx': 2, 'izy': 2,
         'abs': 3, 'abx': 3, 'aby': 3, 'ind': 3}
