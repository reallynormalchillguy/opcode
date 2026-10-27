# Test data

- `nestest.nes` — Kevin Horton's CPU test cartridge (2004), freely distributed
  for testing emulators. `nestest.txt` is its original documentation.
- `nestest-official.log` — the first 5003 lines of the standard nestest log
  (the official instructions), reformatted as
  `PC A X Y P SP CYC instruction-text` for the course's nestest runner.
- `opcode-demo.nes` — the course's own demo game (source in `tools/demo`), used
  from lesson 19 on and by the tests of stages 22-29.
- `opcode-uxrom.nes`, `opcode-cnrom.nes`, `opcode-mmc1.nes`, `opcode-mmc3.nes` — the
  course's mapper test cartridges (`tools/demo/mappers.py`), used in lesson 22.
- `opcode-sound.nes` — the course's sound test (`tools/demo/sound.py`), used in lesson 23.
