"""Test programs for each CPU exercise stage, as Program input for the test
bench (hex bytes; ';' starts a comment that is removed before use)."""

TESTS = {
    1: [
        ('Reset sets the registers', """
            EA          ; NOP
            steps 1
        """),
        ('NOP takes two cycles', """
            EA EA EA EA
        """),
        ('JMP goes to its address', """
            4C 10 C0    ; JMP $C010
            @C010
            EA          ; NOP
            4C 00 C0    ; JMP $C000
            steps 7
        """),
        ('The reset vector decides where to start', """
            @FFFC 00 D0 ; reset vector: D000
            @D000 EA EA
        """),
    ],
    2: [
        ('Immediate loads set Z and N', """
            A9 00       ; LDA #$00
            A9 80       ; LDA #$80
            A2 7F       ; LDX #$7F
            A0 FF       ; LDY #$FF
            A2 00       ; LDX #$00
        """),
        ('Transfers copy and set the flags', """
            A9 C0 AA A8 ; LDA #$C0, TAX, TAY
            A9 00 8A    ; LDA #$00, TXA
            A9 00 98    ; LDA #$00, TYA
            A2 00 8A    ; LDX #$00, TXA
        """),
        ('Increments and decrements wrap around', """
            A2 FE E8 E8 E8 CA
            A0 00 88 C8
        """),
        ('Flag instructions', """
            38 78 F8 18 58 D8 B8 38
        """),
    ],
    3: [
        ('PHA and PLA', """
            A9 42 48    ; LDA #$42, PHA
            A9 00 68    ; LDA #$00, PLA
            dump 01F8 8
        """),
        ('PLA sets Z and N', """
            A9 FF 48 A9 01 68
            A9 00 48 A9 01 68
        """),
        ('PHP pushes B and bit 5, PLP ignores B', """
            38 08       ; SEC, PHP
            18 A9 80    ; CLC, LDA #$80
            28          ; PLP
            dump 01FD 1
        """),
        ('TSX and TXS', """
            BA          ; TSX
            A2 F0 9A    ; LDX #$F0, TXS
            A9 01 48    ; LDA #$01, PHA
            BA          ; TSX
            dump 01F0 1
        """),
    ],
    4: [
        ('Store and load in the zero page', """
            A9 37 85 10 ; LDA #$37, STA $10
            A9 00 A5 10 ; LDA #$00, LDA $10
            A6 10 A4 10 ; LDX $10, LDY $10
            dump 0010 1
        """),
        ('Zero page,X wraps around inside the zero page', """
            A2 05 A9 AB ; LDX #$05, LDA #$AB
            95 FE       ; STA $FE,X  -> $03, not $0103
            A0 00 B4 FE ; LDY #$00, LDY $FE,X
            B5 FE       ; LDA $FE,X
            dump 0000 8
        """),
        ('Zero page,Y with LDX and STX', """
            A0 03 A2 99 ; LDY #$03, LDX #$99
            96 20       ; STX $20,Y
            A2 00 B6 20 ; LDX #$00, LDX $20,Y
            dump 0020 4
        """),
        ('STY in the zero page', """
            A2 01 A0 44 ; LDX #$01, LDY #$44
            84 80 94 80 ; STY $80, STY $80,X
            dump 0080 2
        """),
    ],
    5: [
        ('Absolute loads and stores', """
            A9 5A 8D 00 02  ; LDA #$5A, STA $0200
            A9 00 AD 00 02  ; LDA #$00, LDA $0200
            AE 00 02 AC 00 02
            8E 01 02 8C 02 02
            dump 0200 3
        """),
        ('Indexed reads from the cartridge', """
            A2 02 BD 00 C1  ; LDX #$02, LDA $C100,X
            A0 03 B9 00 C1  ; LDY #$03, LDA $C100,Y
            BE 00 C1        ; LDX $C100,Y
            BC 00 C1        ; LDY $C100,X
            @C100 10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F 20 21 22 23 24
        """),
        ('Crossing a page costs a cycle on reads', """
            A2 20 BD F0 C1  ; LDA $C1F0,X -> $C210
            A0 01 B9 FF C1  ; LDA $C1FF,Y -> $C200
            A0 01 B9 00 C1  ; LDA $C100,Y, same page
            @C200 66 @C210 77
        """),
        ('Stores and JMP', """
            A9 01 A2 10 9D 00 02  ; STA $0200,X
            A0 FF 99 01 02        ; STA $0201,Y -> $0300
            4C 13 C0              ; JMP $C013
            EA EA
            @C013 AD 00 03
            dump 0210 1
        """),
    ],
    6: [
        ('(zp),Y follows a pointer, then adds Y', """
            A9 00 85 10 A9 02 85 11 ; pointer at $10 -> $0200
            A0 05 A9 77 91 10       ; STA ($10),Y -> $0205
            A9 00 B1 10             ; LDA ($10),Y
            dump 0200 8
        """),
        ('(zp,X) adds X, then follows the pointer', """
            A9 00 85 22 A9 03 85 23 ; pointer at $22 -> $0300
            A2 02 A9 66 81 20       ; STA ($20,X)
            A9 00 A1 20             ; LDA ($20,X)
            dump 0300 1
        """),
        ('A pointer at $FF takes its high byte from $00', """
            A9 40 85 FF A9 02 85 00 ; pointer at $FF -> $0240
            A0 00 A9 EE 91 FF       ; STA ($FF),Y
            dump 0240 1
        """),
        ('(zp),Y crossing a page costs a cycle', """
            A9 F0 85 10 A9 C1 85 11 ; pointer at $10 -> $C1F0
            A0 20 B1 10             ; LDA ($10),Y -> $C210
            A0 01 B1 10             ; LDA ($10),Y -> $C1F1
            @C1F1 11 @C210 22
        """),
        ('JMP indirect, including its famous bug', """
            6C 50 C1        ; JMP ($C150)
            @C150 10 C0     ; -> $C010
            @C010 6C FF C1  ; JMP ($C1FF): high byte comes from $C100
            @C1FF 20 @C100 C0 @C200 D0
            @C020 A9 01     ; the right place
            @D020 A9 FF     ; where it would go without the bug
        """),
    ],
    7: [
        ('A counting loop with BNE', """
            A2 05       ; LDX #$05
            CA D0 FD    ; loop: DEX, BNE loop
            EA
            steps 20
        """),
        ('Branches not taken take 2 cycles, taken take 3', """
            A9 01 F0 02 ; LDA #$01, BEQ (not taken)
            D0 00       ; BNE +0 (taken)
            EA
        """),
        ('Every condition', """
            38 B0 01 EA ; SEC, BCS +1
            18 90 01 EA ; CLC, BCC +1
            A9 80 30 01 EA ; BMI
            A9 00 10 01 EA ; BPL
            F0 01 EA    ; BEQ
            A9 01 D0 01 EA ; BNE
            A9 40 48 28 ; set V with PHA, PLP
            70 01 EA    ; BVS
            B8 50 01 EA ; CLV, BVC
            steps 40
        """),
        ('A taken branch into another page costs 2 extra cycles', """
            @FFFC F8 C0 ; start at $C0F8
            @C0F8 A9 01 D0 10 ; BNE from $C0FA to $C10C
            @C10C A9 02
        """),
    ],
    8: [
        ('AND, ORA and EOR', """
            A9 F0 29 3C ; AND #$3C
            09 01       ; ORA #$01
            49 FF       ; EOR #$FF
            29 00       ; AND #$00
        """),
        ('Logic with other addressing modes', """
            A9 0F 85 10 ; STA $10
            A9 FF 25 10 ; AND $10
            A2 01 15 0F ; ORA $0F,X
            4D 00 C1    ; EOR $C100
            A0 01 31 20 ; AND ($20),Y with a zero pointer -> $0001
            @C100 FF
        """),
        ('BIT copies bits 7 and 6 into N and V', """
            A9 C0 85 10 ; STA $10
            A9 01 24 10 ; BIT $10
            A9 40 2C 00 C1 ; BIT $C100
            A9 80 2C 00 C1
            @C100 80
        """),
        ('CMP, CPX and CPY', """
            A9 40 C9 30 C9 40 C9 50
            A2 10 E0 10 E0 11
            A0 FF C0 01 C0 FF
            A9 05 85 10 C5 10 E4 10 C4 10
        """),
    ],
    9: [
        ('ADC with and without the carry', """
            18 A9 10 69 20 ; 10 + 20
            38 69 01       ; + 1 + carry
        """),
        ('ADC sets the carry', """
            18 A9 F0 69 20 ; F0 + 20 = 110
            69 00          ; + 0 + carry
        """),
        ('ADC sets the overflow flag', """
            18 A9 50 69 50 ; 80 + 80 overflows into negative
            18 A9 D0 69 90 ; -48 + -112 overflows into positive
            18 A9 50 69 D0 ; 80 + -48 does not overflow
        """),
        ('SBC', """
            38 A9 50 E9 F0 ; 50 - F0
            38 A9 50 E9 B0 ; 50 - B0: overflow
            18 A9 05 E9 01 ; 05 - 01 - 1 (carry clear means borrow)
            38 A9 05 E9 05 ; 05 - 05 = 0
        """),
        ('ADC and SBC with memory', """
            A9 05 85 10 18 A9 01 65 10 ; ADC $10
            38 E5 10                   ; SBC $10
            A2 01 18 7D FF C0          ; ADC $C0FF,X -> $C100, page cross
            @C100 30
        """),
    ],
    10: [
        ('Shifting the accumulator', """
            A9 81 0A    ; ASL A
            4A 4A       ; LSR A, LSR A
        """),
        ('Rotating through the carry', """
            38 A9 80 2A ; SEC, LDA #$80, ROL A
            2A          ; ROL A
            6A 6A 6A    ; ROR A x3
        """),
        ('Changing memory directly', """
            A9 7F 85 10 ; STA $10
            E6 10 C6 10 C6 10 ; INC, DEC, DEC
            06 10 46 10 ; ASL, LSR
            38 26 10 66 10 ; ROL, ROR
            dump 0010 1
        """),
        ('Read-modify-write with indexing takes 7 cycles', """
            A2 01 A9 81 8D 01 02 ; STA $0201
            FE 00 02    ; INC $0200,X
            1E 00 02    ; ASL $0200,X
            DE 00 02    ; DEC $0200,X
            5E 00 02    ; LSR $0200,X
            dump 0200 2
        """),
    ],
    11: [
        ('JSR and RTS', """
            20 10 C0    ; JSR $C010
            A2 02       ; LDX #$02
            @C010 A9 01 60 ; LDA #$01, RTS
            dump 01FC 2
        """),
        ('Nested subroutines', """
            20 10 C0 EA
            @C010 20 20 C0 60
            @C020 E8 60
        """),
        ('BRK and RTI', """
            brk
            @FFFE 20 C0 ; IRQ/BRK vector: C020
            @C020 A9 BB 40 ; LDA #$BB, RTI
            @C000 A9 01 00 EA A2 05
            steps 5
            dump 01FB 3
        """),
        ('An NMI interrupts the program', """
            nmi 2
            @FFFA 30 C0    ; NMI vector: C030
            @C030 E8 40    ; INX, RTI
            @C000 EA EA EA EA
            dump 01FB 3
        """),
    ],
}

NESTEST = [
    ('The first 10 lines of nestest', '10'),
    ('The first 1000 lines', '1000'),
    ('Every official instruction: 5003 lines', ''),
]


def clean(program):
    lines = []
    for line in program.strip().splitlines():
        line = line.split(';')[0].strip()
        if line:
            lines.append(' '.join(line.split()))
    return '\n'.join(lines)
