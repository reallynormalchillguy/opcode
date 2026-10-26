; Opcode's demo cartridge: a robot walks and jumps through a two-screen
; level collecting bytes. The status bar stays still while the level
; scrolls, split with sprite 0 like Super Mario Bros.
; Built by build_demo.py, which adds the tables after DATA.

PPUCTRL   = $2000
PPUMASK   = $2001
PPUSTATUS = $2002
OAMADDR   = $2003
PPUSCROLL = $2005
PPUADDR   = $2006
PPUDATA   = $2007
OAMDMA    = $4014
JOY1      = $4016

CTRL_BASE = $90        ; NMI on, background tiles from 1000, sprites from 0000
MASK_ON   = $1E        ; background and sprites on, left column shown
TIMEOUT   = 7          ; how long to wait for sprite 0 before giving up

BTN_A     = $80
BTN_B     = $40
BTN_START = $10
BTN_LEFT  = $02
BTN_RIGHT = $01

OAM       = $0200      ; the sprites, copied to the PPU every frame
UPDATES   = $0300      ; tiles to write in the next NMI: high, low, tile

buttons   = $00
pressed   = $01        ; buttons that went down this frame
hero_xl   = $02        ; robot x in the level, 0-496
hero_xh   = $03
hero_y    = $04        ; robot y on screen
hero_yf   = $05        ; fraction of y
vy_lo     = $06        ; vertical speed, 8.8 fixed point
vy_hi     = $07
on_ground = $08
facing    = $09        ; 0 right, $40 left (the flip bit of the sprites)
cam_l     = $0A        ; left edge of the screen in the level, 0-256
cam_h     = $0B
frame     = $0C
got       = $0D        ; bit n set: byte n collected
count     = $0E
upd_len   = $0F
paused    = $10
walking   = $11
drone_xl  = $12
drone_xh  = $13
drone_dir = $14
ctrl_now  = $15        ; PPUCTRL for the level (nametable bit = camera high bit)
tmp       = $20        ; $20-$27: scratch

.org $C000

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
    sta $0100,x
    sta $0300,x
    sta $0400,x
    sta $0500,x
    sta $0600,x
    sta $0700,x
    inx
    bne @clear
    lda #$FF
@hide:
    sta OAM,x
    inx
    bne @hide
@vblank2:
    bit PPUSTATUS
    bpl @vblank2

    lda #$3F                ; palettes
    sta PPUADDR
    lda #$00
    sta PPUADDR
    ldx #0
@palette:
    lda palettes,x
    sta PPUDATA
    inx
    cpx #32
    bne @palette

    lda #$20                ; both nametables, 2 KB
    sta PPUADDR
    lda #$00
    sta PPUADDR
    lda #<nametables
    sta tmp
    lda #>nametables
    sta tmp+1
    ldx #8
    ldy #0
@nametable:
    lda (tmp),y
    sta PPUDATA
    iny
    bne @nametable
    inc tmp+1
    dex
    bne @nametable

    lda #24
    sta hero_xl
    lda #176
    sta hero_y
    lda #1
    sta on_ground
    lda #200
    sta drone_xl
    jsr camera
    jsr build_oam
    lda #CTRL_BASE
    sta PPUCTRL
forever:
    jmp forever

; ---------- Every frame ----------

nmi:
    pha
    txa
    pha
    tya
    pha
    lda #0                  ; sprites
    sta OAMADDR
    lda #>OAM
    sta OAMDMA
    ldx #0                  ; tiles that changed
@update:
    cpx upd_len
    beq @updated
    lda UPDATES,x
    sta PPUADDR
    lda UPDATES+1,x
    sta PPUADDR
    lda UPDATES+2,x
    sta PPUDATA
    inx
    inx
    inx
    jmp @update
@updated:
    lda #0
    sta upd_len
    lda #CTRL_BASE          ; the status bar: nametable 2000, no scroll
    sta PPUCTRL
    bit PPUSTATUS
    lda #0
    sta PPUSCROLL
    sta PPUSCROLL
    lda #MASK_ON
    sta PPUMASK
    jsr read_pad

    ldx #0                  ; wait until last frame's sprite 0 hit is cleared
@cleared:
    bit PPUSTATUS
    bvc @wait
    dex
    bne @cleared
@wait:
    ldx #0                  ; then wait for this frame's, under the status bar
    ldy #TIMEOUT
@hit:
    bit PPUSTATUS
    bvs @split
    dex
    bne @hit
    dey
    bne @hit
@split:
    lda cam_l               ; the level: scrolled by the camera
    sta PPUSCROLL
    lda #0
    sta PPUSCROLL
    lda ctrl_now
    sta PPUCTRL

    jsr update
    pla
    tay
    pla
    tax
    pla
irq:
    rti

read_pad:
    lda buttons
    sta tmp
    lda #1
    sta JOY1
    lda #0
    sta JOY1
    ldx #8
@bit:
    lda JOY1
    lsr a
    rol buttons
    dex
    bne @bit
    lda tmp
    eor #$FF
    and buttons
    sta pressed
    rts

update:
    inc frame
    lda pressed
    and #BTN_START
    beq @no_pause
    lda paused
    eor #1
    sta paused
    jsr show_pause
@no_pause:
    lda paused
    bne @done
    jsr move_drone
    jsr move_hero
    jsr collect
    jsr camera
    jsr build_oam
@done:
    rts

; Queue tile A for address tmp+1:tmp.
queue:
    ldx upd_len
    sta UPDATES+2,x
    lda tmp+1
    sta UPDATES,x
    lda tmp
    sta UPDATES+1,x
    inx
    inx
    inx
    stx upd_len
    rts

show_pause:
    lda #$20
    sta tmp+1
    lda #$2E
    sta tmp
    ldy #0
@char:
    lda #0
    ldx paused
    beq @put
    lda pause_text,y
@put:
    jsr queue
    inc tmp
    iny
    cpy #5
    bne @char
    rts

pause_text:
    .byte "PAUSE"

; ---------- The robot ----------

move_hero:
    lda #0
    sta walking
    lda #1                  ; speed: 1 pixel a frame, 2 with B held
    sta tmp+2
    lda buttons
    and #BTN_B
    beq @speed
    inc tmp+2
@speed:
    lda buttons
    and #BTN_RIGHT
    beq @not_right
    lda #0
    sta facing
    inc walking
    ldy tmp+2
@right:
    jsr step_right
    dey
    bne @right
@not_right:
    lda buttons
    and #BTN_LEFT
    beq @not_left
    lda #$40
    sta facing
    inc walking
    ldy tmp+2
@left:
    jsr step_left
    dey
    bne @left
@not_left:
    lda pressed             ; jump
    and #BTN_A
    beq @gravity
    lda on_ground
    beq @gravity
    lda #$00
    sta vy_lo
    lda #$FC                ; -4 pixels a frame
    sta vy_hi
@gravity:
    clc
    lda vy_lo
    adc #$30
    sta vy_lo
    lda vy_hi
    adc #0
    sta vy_hi
    bmi @move               ; going up
    cmp #4                  ; falling: at most 4 pixels a frame
    bcc @move
    lda #4
    sta vy_hi
    lda #0
    sta vy_lo
@move:
    clc
    lda hero_yf
    adc vy_lo
    sta hero_yf
    lda hero_y
    adc vy_hi
    sta hero_y
    jsr floor_under         ; land on the floor
    sec
    sbc #16
    sta tmp+1
    lda vy_hi
    bmi @air
    lda hero_y
    cmp tmp+1
    bcc @air
    lda tmp+1
    sta hero_y
    lda #0
    sta hero_yf
    sta vy_lo
    sta vy_hi
    lda #1
    sta on_ground
    rts
@air:
    lda #0
    sta on_ground
    rts

; A = column (0-31) of the level x in tmp+5:A.
column:
    lsr a
    lsr a
    lsr a
    lsr a
    ldx tmp+5
    beq @low
    ora #$10
@low:
    rts

; A = column the robot's left edge is in.
hero_column:
    lda hero_xh
    sta tmp+5
    lda hero_xl
    jmp column

step_right:
    jsr hero_column
    clc
    adc #1                  ; the column the right edge moves into
    cmp #32
    bcs @blocked
    tax
    lda hero_y
    clc
    adc #16                 ; feet
    cmp floor,x
    beq @ok
    bcs @blocked            ; the floor there is higher than the feet
@ok:
    inc hero_xl
    bne @blocked
    inc hero_xh
@blocked:
    rts

step_left:
    lda hero_xl
    ora hero_xh
    beq @blocked
    lda hero_xl
    sec
    sbc #1
    sta tmp+4
    lda hero_xh
    sbc #0
    sta tmp+5
    lda tmp+4
    jsr column
    tax
    lda hero_y
    clc
    adc #16
    cmp floor,x
    beq @ok
    bcs @blocked
@ok:
    lda hero_xl
    bne @low
    dec hero_xh
@low:
    dec hero_xl
@blocked:
    rts

; A = the highest floor under the robot's feet.
floor_under:
    jsr hero_column
    tax
    lda floor,x
    sta tmp+6
    lda hero_xl
    clc
    adc #15
    pha
    lda hero_xh
    adc #0
    sta tmp+5
    pla
    jsr column
    tax
    lda floor,x
    cmp tmp+6
    bcc @higher
    lda tmp+6
@higher:
    rts

; ---------- Bytes, the drone and the camera ----------

collect:
    ldx #0
@each:
    lda bit_mask,x
    and got
    bne @next
    lda byte_xl,x           ; close in x: byte_x - hero_x + 5 in 0-18
    sec
    sbc hero_xl
    sta tmp
    lda byte_xh,x
    sbc hero_xh
    sta tmp+1
    lda tmp
    clc
    adc #5
    sta tmp
    lda tmp+1
    adc #0
    bne @next
    lda tmp
    cmp #19
    bcs @next
    lda byte_y,x            ; and in y
    sec
    sbc hero_y
    clc
    adc #5
    cmp #19
    bcs @next
    lda bit_mask,x
    ora got
    sta got
    inc count
    txa
    pha
    lda #$20                ; the count in the status bar
    sta tmp+1
    lda #$57
    sta tmp
    lda count
    ora #$30
    jsr queue
    pla
    tax
@next:
    inx
    cpx #6
    bne @each
    rts

move_drone:
    lda frame
    and #1
    beq @done
    lda drone_dir
    bne @left
    inc drone_xl
    bne @turn_right
    inc drone_xh
@turn_right:
    lda drone_xh
    beq @done
    lda drone_xl
    cmp #$D6
    bcc @done
    lda #1
    sta drone_dir
    rts
@left:
    lda drone_xl
    bne @low
    dec drone_xh
@low:
    dec drone_xl
    lda drone_xh
    bne @done
    lda drone_xl
    cmp #32
    bcs @done
    lda #0
    sta drone_dir
@done:
    rts

camera:
    lda hero_xl             ; camera = robot x - 120, kept in 0-256
    sec
    sbc #120
    sta cam_l
    lda hero_xh
    sbc #0
    sta cam_h
    bpl @not_negative
    lda #0
    sta cam_l
    sta cam_h
@not_negative:
    lda cam_h
    beq @ok
    lda #0
    sta cam_l
    lda #1
    sta cam_h
@ok:
    lda cam_h
    ora #CTRL_BASE
    sta ctrl_now
    rts

; ---------- Sprites ----------

build_oam:
    lda #22                 ; sprite 0: behind the byte icon's bottom row
    sta OAM
    lda #9
    sta OAM+1
    lda #$23
    sta OAM+2
    lda #168
    sta OAM+3

    lda hero_xl             ; the robot: sprites 1-4
    sec
    sbc cam_l
    sta tmp
    lda hero_y
    sec
    sbc #1
    sta OAM+4
    sta OAM+8
    clc
    adc #8
    sta OAM+12
    sta OAM+16
    lda facing
    sta OAM+6
    sta OAM+10
    sta OAM+14
    sta OAM+18
    lda tmp
    sta OAM+7
    sta OAM+15
    clc
    adc #8
    sta OAM+11
    sta OAM+19
    ldx #3                  ; legs together, or apart every 8 frames when walking
    lda walking
    beq @legs
    lda frame
    and #8
    beq @legs
    ldx #5
@legs:
    stx tmp+1
    inx
    stx tmp+2
    lda facing
    bne @facing_left
    lda #1
    sta OAM+5
    lda #2
    sta OAM+9
    lda tmp+1
    sta OAM+13
    lda tmp+2
    sta OAM+17
    jmp @bytes
@facing_left:               ; flipped: the right half's tiles go on the left
    lda #2
    sta OAM+5
    lda #1
    sta OAM+9
    lda tmp+2
    sta OAM+13
    lda tmp+1
    sta OAM+17

@bytes:                     ; the bytes: sprites 5-10
    ldx #0
    ldy #20
@byte:
    lda bit_mask,x
    and got
    bne @hide_byte
    lda byte_xl,x
    sec
    sbc cam_l
    sta tmp
    lda byte_xh,x
    sbc cam_h
    bne @hide_byte
    lda tmp
    cmp #249
    bcs @hide_byte
    sta OAM+3,y
    lda frame
    lsr a
    lsr a
    lsr a
    lsr a
    and #1
    clc
    adc byte_y,x
    sec
    sbc #1
    sta OAM,y
    lda #7
    sta OAM+1,y
    lda #1
    sta OAM+2,y
    jmp @next_byte
@hide_byte:
    lda #$FF
    sta OAM,y
@next_byte:
    iny
    iny
    iny
    iny
    inx
    cpx #6
    bne @byte

    lda drone_xl            ; the drone: sprite 11, behind the background
    sec
    sbc cam_l
    sta tmp
    lda drone_xh
    sbc cam_h
    bne @hide_drone
    lda tmp
    cmp #249
    bcs @hide_drone
    sta OAM+47
    lda #177
    sta OAM+44
    lda #8
    sta OAM+45
    lda #$22
    sta OAM+46
    rts
@hide_drone:
    lda #$FF
    sta OAM+44
    rts

bit_mask:
    .byte 1, 2, 4, 8, 16, 32, 64, 128

DATA

.org $FFFA
    .word nmi, reset, irq
