/* Opcode — helpers shared by the cartridge and PPU lessons (16 onwards). */
(function () {
  'use strict';

  const D = window.NES_DATA;

  // A project exercise for stage `stage` (see tools/refnes/build.py).
  // names: one name per test, in order.
  function exercise(opts) {
    const S = D.stages[String(opts.stage)];
    const course = { 'main.c': S.main };
    // Headers that changed over the course have versions: 'bus.h@22' is the
    // bus.h of stage 22 onwards.
    for (const key of S.course) course[key.split('@')[0]] = D.headers[key];
    const learner = {};
    for (const name of S.learner) learner[name] = { starter: S.starters[name] };
    // The newest version of every course header (and palette.c), for a
    // project whose files are newer than this exercise (see app.js).
    const fallback = {};
    const newest = {};
    for (const key of Object.keys(D.headers)) {
      const [name, from] = key.split('@');
      if (name === 'trace.c') continue;
      if (!(name in newest) || Number(from || 0) > newest[name]) {
        newest[name] = Number(from || 0);
        fallback[name] = D.headers[key];
      }
    }
    const ex = {
      id: opts.id,
      title: opts.title,
      prompt: opts.prompt,
      project: { course, learner, open: S.learner[0], fallback },
      stdin: opts.stdin != null ? opts.stdin : '',
      tests: S.tests.map((t, i) => ({ name: opts.names[i], stdin: t.stdin, expect: t.expect, timeoutMs: opts.timeoutMs })),
      hints: opts.hints,
      solution: S.solution,
    };
    if (opts.names.length !== S.tests.length) throw new Error(`${opts.id}: ${S.tests.length} tests but ${opts.names.length} names`);
    if (S.harness) ex.harness = { 'main.c': S.harness };
    if (S.data.length) {
      ex.data = {};
      for (const name of S.data) ex.data[name] = `nes/${name}`;
      if (S.log) ex.data['nestest.log'] = 'nes/nestest-official.log';
    }
    // rom: the built-in cartridge the picker starts on (true: nestest.nes).
    if (opts.rom !== false) ex.rom = opts.rom || true;
    if (opts.controller) ex.controller = true;
    if (opts.rules) ex.rules = opts.rules;
    return ex;
  }

  window.NesLesson = { exercise, data: D };
})();
