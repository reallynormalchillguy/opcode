/* Opcode — progress and saved code, kept in this browser (localStorage). */
(function () {
  'use strict';

  const KEY = 'opcode.cpp.v1';   // the C course used opcode.v1
  // project.files: the learner's own emulator files, shared by every NES exercise.
  let state = { solved: {}, code: {}, stdin: {}, hintsSeen: {}, last: null, project: { files: {} } };

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
    if (!state.project || !state.project.files) state.project = { files: {} };
  } catch (e) { /* storage unavailable: progress lasts for this visit only */ }

  let saveTimer = null;
  let wiped = false; // after wipe(), nothing is written again until the page reloads
  function save() {
    if (wiped) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 250);
  }

  function flush() {
    clearTimeout(saveTimer);
    if (wiped) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // Forget everything: solved exercises, code, the emulator project.
  function wipe() {
    wiped = true;
    clearTimeout(saveTimer);
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  }

  window.Progress = {
    flush,
    wipe,
    isSolved: (exId) => !!state.solved[exId],
    markSolved(exId) { state.solved[exId] = Date.now(); save(); },
    getCode: (exId) => state.code[exId] || null,
    setCode(exId, files) { state.code[exId] = files; save(); },
    clearCode(exId) { delete state.code[exId]; save(); },
    getStdin: (exId) => state.stdin[exId],
    setStdin(exId, text) { state.stdin[exId] = text; save(); },
    hintsSeen: (exId) => state.hintsSeen[exId] || 0,
    setHintsSeen(exId, n) { state.hintsSeen[exId] = n; save(); },
    get last() { return state.last; },
    setLast(route) { state.last = route; save(); },
    lessonDone(lesson) {
      const ex = lesson.exercises || [];
      return ex.length > 0 && ex.every((e) => state.solved[e.id]);
    },

    // The emulator project.
    projectFile: (name) => (name in state.project.files ? state.project.files[name] : null),
    projectFiles: () => Object.assign({}, state.project.files),
    setProjectFile(name, text) { state.project.files[name] = text; save(); },
    // The text of a file the learner saved in an earlier exercise (or null).
    exerciseFile(exId, name) {
      const files = state.code[exId];
      return files && name in files ? files[name] : null;
    },
  };
})();
