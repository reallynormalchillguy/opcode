/* Opcode — helpers shared by the cartridge and PPU lessons (16 onwards). */
(function () {
  'use strict';

  const D = window.NES_DATA;

  // A project exercise for stage `stage` (see tools/refnes/build.py).
  // names: one name per test, in order.
  function exercise(opts) {
    const S = D.stages[String(opts.stage)];
    const course = { 'main.c': S.main };
    for (const name of S.course) course[name] = D.headers[name];
    const learner = {};
    for (const name of S.learner) learner[name] = { starter: S.starters[name] };
    const ex = {
      id: opts.id,
      title: opts.title,
      prompt: opts.prompt,
      project: { course, learner, open: S.learner[0] },
      stdin: opts.stdin != null ? opts.stdin : '',
      tests: S.tests.map((t, i) => ({ name: opts.names[i], stdin: t.stdin, expect: t.expect, timeoutMs: opts.timeoutMs })),
      hints: opts.hints,
      solution: S.solution,
    };
    if (opts.names.length !== S.tests.length) throw new Error(`${opts.id}: ${S.tests.length} tests but ${opts.names.length} names`);
    if (S.harness) ex.harness = { 'main.c': S.harness };
    if (S.data) {
      ex.data = { 'nestest.nes': 'nes/nestest.nes' };
      if (S.log) ex.data['nestest.log'] = 'nes/nestest-official.log';
    }
    if (opts.rom !== false) ex.rom = true;
    if (opts.rules) ex.rules = opts.rules;
    return ex;
  }

  window.NesLesson = { exercise, data: D };
})();
