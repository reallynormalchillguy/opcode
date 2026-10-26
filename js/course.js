/*
 * Opcode — course outline and lesson registry.
 *
 * Each lesson file calls Course.add({...}). Lessons listed in OUTLINE but
 * not yet added show up in the map as "coming soon".
 *
 * Lesson shape:
 *   id, part, title, summary,
 *   blocks: [
 *     { t: 'h', text }                       section heading
 *     { t: 'p', html }                       paragraph (inline HTML allowed)
 *     { t: 'list', items: [html] }
 *     { t: 'note', html, kind?: 'nes'|'warn' } callout
 *     { t: 'code', title?, lines: [[code, note?]], run?: true, stdin? }
 *     { t: 'quiz', q, options: [html], answer: index, explain }
 *     { t: 'table', head: [..], rows: [[..]] }
 *   ],
 *   exercises: [{ id, title, prompt, files, tests: [{ name, stdin?, expect }],
 *                 rules?: [{ re, flags?, must: true|false, msg }], hints, solution,
 *                 harness?: { 'check.c': ... } hidden files added on Check }]
 *
 * Emulator-project exercises use `project` instead of `files`:
 *   project: {
 *     course:  { 'main.c': text },   read-only files, always this version
 *     learner: { 'bus.c': { starter: text, from?: { exercise, file } } },
 *     open: 'bus.c',                 file shown first
 *   }
 * Learner files live in one shared project: the first exercise that needs a
 * file creates it (copying the learner's solved code from `from` when there
 * is some, otherwise `starter`); later exercises keep the learner's version.
 * `solution` then lists complete learner files.
 */
(function () {
  'use strict';

  const OUTLINE = [
    {
      id: 'c',
      title: 'C from zero',
      blurb: 'The language, from your first line to bits, pointers and memory.',
      lessons: [
        ['c-hello', 'Hello, C'],
        ['c-values', 'Values and variables'],
        ['c-control', 'Decisions and loops'],
        ['c-functions', 'Functions'],
        ['c-arrays', 'Arrays'],
        ['c-strings', 'Characters and strings'],
        ['c-pointers', 'Pointers'],
        ['c-structs', 'Structs and enums'],
        ['c-memory', 'The stack, the heap and malloc'],
        ['c-bits', 'Bits, bytes and hexadecimal'],
        ['c-files', 'Programs in many files'],
      ],
    },
    {
      id: 'nes',
      title: 'Build a NES',
      blurb: 'An emulator that runs real games, written by you, one chip at a time.',
      lessons: [
        ['nes-overview', 'How a NES works'],
        ['nes-cpu-bus', 'The 6502: registers and the bus'],
        ['nes-cpu-modes', 'Addressing modes'],
        ['nes-cpu-ops', 'Every instruction, checked by nestest'],
        ['nes-cart', 'Cartridges: iNES and mapper 0'],
        ['nes-ppu-tiles', 'The PPU: tiles and palettes'],
        ['nes-ppu-bg', 'Drawing the background'],
        ['nes-ppu-sprites', 'Sprites'],
        ['nes-input', 'Controllers and the frame loop'],
        ['nes-scroll', 'Scrolling'],
        ['nes-mappers', 'Mappers 1 to 4'],
      ],
    },
  ];

  const lessons = new Map();

  // Works out the files of a project exercise.
  // store: { file(name), exerciseFile(exId, name), isSolved(exId) }
  // Returns { files, readOnly: [names], created: { name: 'starter'|'imported' } }
  function resolveProject(ex, store) {
    const files = {};
    const created = {};
    for (const [name, spec] of Object.entries(ex.project.learner || {})) {
      const saved = store.file(name);
      if (saved != null) {
        files[name] = saved;
        continue;
      }
      const from = spec.from;
      const imported = from && store.isSolved(from.exercise) ? store.exerciseFile(from.exercise, from.file || name) : null;
      files[name] = imported != null ? imported : spec.starter;
      created[name] = imported != null ? 'imported' : 'starter';
    }
    const readOnly = Object.keys(ex.project.course || {});
    for (const name of readOnly) files[name] = ex.project.course[name];
    return { files, readOnly, created };
  }

  window.Course = {
    OUTLINE,
    resolveProject,
    add(lesson) { lessons.set(lesson.id, lesson); },
    get(id) { return lessons.get(id); },
    has(id) { return lessons.has(id); },
    // Flat list of outline entries with numbering.
    flat() {
      const out = [];
      let n = 0;
      for (const part of OUTLINE) {
        for (const [id, title] of part.lessons) {
          n += 1;
          out.push({ id, title, number: n, part: part.id, partTitle: part.title, available: lessons.has(id) });
        }
      }
      return out;
    },
  };
})();
