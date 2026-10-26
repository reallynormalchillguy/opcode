/*
 * Opcode — compares program output with what an exercise expects.
 * Works in the browser (window.Checker) and in Node (module.exports).
 */
(function (global) {
  'use strict';

  // Trailing spaces on a line and blank lines at the very end are ignored,
  // so a missing final "\n" or an extra space never fails a test.
  function normalize(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  // Returns { pass, line?: index of first different line, expectedLines, actualLines }
  function compare(expected, actual) {
    const e = normalize(expected);
    const a = normalize(actual);
    const n = Math.max(e.length, a.length);
    for (let i = 0; i < n; i++) {
      if (e[i] !== a[i]) return { pass: false, line: i, expectedLines: e, actualLines: a };
    }
    return { pass: true, expectedLines: e, actualLines: a };
  }

  function stripComments(src) {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ')
      .replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  }

  // rules: [{ re, flags, must, msg }] checked against all .c/.h files.
  function checkRules(rules, files) {
    const code = Object.values(files).map(stripComments).join('\n');
    const failed = [];
    for (const r of rules || []) {
      const found = new RegExp(r.re, r.flags || '').test(code);
      if (found !== (r.must !== false)) failed.push(r.msg);
    }
    return failed;
  }

  // What to compile for Check. Exercises with a `harness` (hidden test
  // files such as check.c) test the learner's functions directly: the
  // learner's own main() is renamed so the harness main() runs instead.
  function checkBuild(exercise, files) {
    if (!exercise.harness) return { files, options: {} };
    const fileDefines = {};
    for (const name of Object.keys(files)) {
      // Files the harness replaces (for example a hidden main.c) keep their main.
      if (name.endsWith('.c') && !(name in exercise.harness)) fileDefines[name] = ['main=opcode_learner_main'];
    }
    return { files: Object.assign({}, files, exercise.harness), options: { fileDefines } };
  }

  const api = { normalize, compare, checkRules, stripComments, checkBuild };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Checker = api;
})(typeof window !== 'undefined' ? window : globalThis);
