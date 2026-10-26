# Opcode

An interactive course that teaches C from zero and then guides you through
writing a NES emulator. A real C compiler (Clang 8 + LLD, compiled to
WebAssembly) runs inside the browser, so every example and exercise compiles
and runs locally, with no server.

## Run it locally

The site is plain HTML, CSS and JavaScript with no build step. It has to be
served over HTTP (not opened as a file) because the compiler runs in Web
Workers:

```
python -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Push the folder to GitHub and import the repository in Vercel. There is no
build command and no output directory to configure: Vercel serves the files
as they are. The first visit downloads the compiler (about 18 MB); after
that it comes from the browser cache.

## Project layout

| Path | What it does |
| --- | --- |
| `index.html` | Page structure: course map, lesson, workbench |
| `styles.css` | All styling (light and dark) |
| `js/app.js` | Course map, lesson rendering, workbench, Run/Check |
| `js/course.js` | Course outline and the lesson registry |
| `js/progress.js` | Progress and code saved in the browser (localStorage) |
| `js/checker.js` | Compares program output with the expected output |
| `js/compiler-client.js` | Talks to the compile and run workers |
| `js/highlight.js`, `js/console.js` | Code colouring and console output |
| `lessons/*.js` | One file per lesson: text, annotated code, quizzes, exercises |
| `compiler/` | Clang, LLD, the C headers/libraries and the WASI runtime |
| `vendor/` | CodeMirror 5 and the fonts (Archivo, IBM Plex Mono) |
| `tests/` | Node checks for the compiler and every lesson |

## Adding a lesson

Create `lessons/<id>.js` calling `Course.add({...})` (see the comment at the
top of `js/course.js` for the shape), use an id that exists in the outline,
and add a `<script>` tag for it in `index.html`. Then run:

```
node tests/lessons.test.js
```

It compiles every runnable example, checks that every exercise solution
passes its tests, and that the starter code does not.

Exercises can test the learner's functions directly with a `harness`: hidden
files (usually `check.c`) that are compiled together with the learner's code
when they press Check. The learner's own `main` is renamed so the harness
`main` runs instead. A harness file with the same name as a learner file (for
example `main.c`) replaces it during Check.

## The emulator project

From lesson 12 on, exercises use a `project` instead of `files` (see the
comment at the top of `js/course.js`). The learner's emulator files are kept
in one shared project in localStorage, so code written in one lesson is there
in the next. Course-owned files (headers, test programs) are read-only. The
workbench's Download button saves the whole project as a .zip
(`js/zip.js`).

## The reference 6502 (tools/ref6502)

The CPU lessons (13 to 15) are generated from a reference implementation:

- `cpu.staged.c` is a complete, nestest-passing 6502 with `//@ N` markers
  saying which exercise stage each part belongs to. `stage.py` cuts out the
  `cpu.c` a learner has after stage N.
- `opcodes.py` is the table of the 151 official opcodes; `gen_trace.py`
  makes the course's disassembler (`trace.c`), `gen_main.py` the test bench
  and the nestest runner, and `tests.py` holds the test programs.
- `python3 build.py` checks the table against the reference, compiles every
  stage with gcc, runs the tests and nestest, and writes
  `lessons/cpu-data.js`. Run it after changing anything in that folder, then
  `node tests/lessons.test.js` to check the same in the browser compiler.

## The reference cartridge, PPU and controllers (tools/refnes)

Lessons 16 to 22 work the same way. `cart.staged.c`, `bus.staged.c`,
`ppu.staged.c` and `controller.staged.c` hold a reference cartridge (iNES,
mappers 0-4 with MMC3's scanline IRQ), bus, PPU (background, sprites, sprite
0 hit, loopy scrolling) and controllers with `//@ N` markers for exercise
stages 13-34; the CPU's IRQ is stage 34 of `tools/ref6502/cpu.staged.c`.
Headers that grew during the course (`bus.h`, `ppu.h`, `cart.h`, `cpu.h`)
and the course's `nes.c` are staged the same way; a header version is stored
as `bus.h@22` (from stage 22 on). For a project whose files are newer than
an exercise, the app adds the newest headers its files include.
`course/` holds the programs the course provides (shown read-only to the
learner) and `harness/` the hidden test programs (`.inc` files are inlined).
`python3 build.py` compiles every stage with gcc, runs the tests and writes
`lessons/nes-data.js`.

## The demo cartridge (tools/demo)

`nes/opcode-demo.nes` is a small game written for the course in 6502
assembly (`demo.s`): a robot walks and jumps through a two-screen level,
with a status bar split with sprite 0. `art.py` holds its tiles, palettes
and level. `tools/asm6502.py` is the course's own small assembler (built on
the opcode table in `tools/ref6502`). Rebuild it with
`python3 tools/demo/build_demo.py`, then run `tools/refnes/build.py`, whose
tests use it. `python3 tools/demo/mappers.py` builds the mapper test
cartridges (`nes/opcode-uxrom.nes`, `-cnrom`, `-mmc1`, `-mmc3`): each shows
the start of every PRG bank it switches in and cycles its CHR banks, and the
MMC3 one splits the screen with its IRQ.

## The screen

Programs can draw with `screen.h` (`screen_show`, `screen_loop`,
`screen_buttons`). These are provided by the page: the linker allows them
as imports (`opcode.imports`), `compiler/program.js` implements them, and the
run worker calls the `screen_loop` callback about 60 times a second until the
learner presses Stop. Frames are shown over the lesson column.

## Credits

- Clang/LLD in WebAssembly and the in-memory file system: [binji/wasm-clang](https://github.com/binji/wasm-clang)
  (Apache 2.0, LLVM licence: `compiler/LICENSE.*`).
- [CodeMirror 5](https://codemirror.net/5/) (MIT).
- Fonts: Archivo and IBM Plex Mono (SIL Open Font License).
- `nes/opcode-demo.nes` and the `nes/opcode-*.nes` mapper tests: made for this course (`tools/demo`).
- `nes/nestest.nes`, its documentation and log: nestest by Kevin Horton,
  freely distributed for testing emulators. `nes/nestest-official.log` is
  the official-instruction part of the log, reformatted.
