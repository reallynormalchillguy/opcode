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

## Credits

- Clang/LLD in WebAssembly and the in-memory file system: [binji/wasm-clang](https://github.com/binji/wasm-clang)
  (Apache 2.0, LLVM licence: `compiler/LICENSE.*`).
- [CodeMirror 5](https://codemirror.net/5/) (MIT).
- Fonts: Archivo and IBM Plex Mono (SIL Open Font License).
