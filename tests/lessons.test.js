// Checks every lesson: examples compile (except ones meant to fail),
// every exercise solution passes its tests, and starter code compiles
// but does not already pass. Run: node tests/lessons.test.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'compiler');
globalThis.fetch = async (url) => new Response(fs.readFileSync(path.join(dir, path.basename(url))));
require(path.join(dir, 'wasi-runtime.js'));
require(path.join(dir, 'toolchain.js'));
require(path.join(dir, 'program.js'));
const Checker = require(path.join(root, 'js', 'checker.js'));
globalThis.window = globalThis;
require(path.join(root, 'js', 'course.js'));
for (const f of fs.readdirSync(path.join(root, 'lessons')).sort()) require(path.join(root, 'lessons', f));

const EXPECT_FAIL = new Set(['broken.c']);
let failures = 0;
const fail = (msg) => { failures++; console.log('FAIL', msg); };

(async () => {
  const tc = new OpcodeToolchain('compiler/');
  await tc.ready;
  for (const entry of Course.flat().filter((e) => e.available)) {
    const lesson = Course.get(entry.id);
    console.log(`== ${lesson.id}`);
    for (const b of lesson.blocks.filter((b) => b.t === 'code' && b.run)) {
      const src = b.lines.map((l) => l[0]).join('\n') + '\n';
      const name = b.title || 'main.c';
      const r = await tc.build({ [name]: src });
      if (b.expect === 'error' || EXPECT_FAIL.has(name)) {
        if (r.ok) fail(`${name} should not compile`);
        console.log(`   ${name}: (expected error)\n${r.diagnostics.replace(/\x1b\[[0-9;]*m/g, '')}`);
        continue;
      }
      if (!r.ok) { fail(`${lesson.id} example ${name}: ${r.diagnostics}`); continue; }
      if (r.diagnostics && b.expect !== 'warning') fail(`${lesson.id} example ${name} has warnings: ${r.diagnostics}`);
      if (!r.diagnostics && b.expect === 'warning') fail(`${lesson.id} example ${name} should warn`);
      const out = await OpcodeProgram.runProgram({ memfsModule: tc.memfsModule, wasm: r.wasm, stdin: b.stdin || '' });
      console.log(`   ${name} -> ${JSON.stringify(out.stdout)}${out.exitCode ? ' exit ' + out.exitCode : ''}`);
    }
    let previousSolution = null;
    for (const ex of lesson.exercises || []) {
      let variants;
      let learnerNames = null;
      if (ex.project) {
        // Project exercises: course files plus the learner's files, starting
        // from each file's starter (what a learner arriving here would have).
        const empty = { file: () => null, exerciseFile: () => null, isSolved: () => false };
        const base = Course.resolveProject(ex, empty).files;
        learnerNames = Object.keys(ex.project.learner || {});
        variants = [['solution', Object.assign({}, base, ex.solution), true], ['starter', base, false]];
        // Each exercise should start where the previous one's solution ended.
        if (previousSolution) {
          for (const name of learnerNames) {
            if (previousSolution[name] != null && previousSolution[name] !== ex.project.learner[name].starter) {
              fail(`${ex.id}: starter of ${name} differs from the previous exercise's solution`);
            }
          }
        }
        previousSolution = Object.assign({}, previousSolution, ex.solution);
      } else {
        variants = [['solution', Object.assign({}, ex.files, ex.solution), true], ['starter', ex.files, false]];
      }
      for (const [label, given, shouldPass] of variants) {
        // The learner's program must build on its own (that is what Run does).
        const own = await tc.build(given);
        if (!own.ok) { if (shouldPass) fail(`${ex.id} ${label} does not compile for Run: ${own.diagnostics}`); continue; }
        const files = learnerNames ? Object.fromEntries(learnerNames.map((n) => [n, given[n]])) : given;
        const plan = Checker.checkBuild(ex, given);
        const r = await tc.build(plan.files, plan.options);
        if (!r.ok) { if (shouldPass) fail(`${ex.id} ${label} does not compile: ${r.diagnostics}`); continue; }
        if (shouldPass && r.diagnostics) fail(`${ex.id} solution has warnings: ${r.diagnostics}`);
        let allPass = true;
        for (const t of ex.tests) {
          const out = await OpcodeProgram.runProgram({ memfsModule: tc.memfsModule, wasm: r.wasm, stdin: t.stdin || '' });
          const c = Checker.compare(t.expect, out.stdout);
          if (!c.pass) { allPass = false; if (shouldPass) fail(`${ex.id} solution fails "${t.name}": got ${JSON.stringify(out.stdout)}`); }
        }
        const ruleFails = Checker.checkRules(ex.rules, files);
        if (shouldPass && ruleFails.length) fail(`${ex.id} solution breaks rules: ${ruleFails}`);
        if (!shouldPass && allPass && ex.tests.some((t) => t.expect !== '')) fail(`${ex.id} starter already passes`);
      }
      console.log(`   exercise ${ex.id} ok`);
    }
  }
  console.log(failures ? `\n${failures} failure(s)` : '\nAll lesson checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
