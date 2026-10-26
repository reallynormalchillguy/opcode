/* Opcode — progress and saved code, kept in this browser (localStorage). */
(function () {
  'use strict';

  const KEY = 'opcode.v1';
  let state = { solved: {}, code: {}, stdin: {}, hintsSeen: {}, last: null };

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
  } catch (e) { /* storage unavailable: progress lasts for this visit only */ }

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }, 250);
  }

  function flush() {
    clearTimeout(saveTimer);
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  window.Progress = {
    flush,
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
  };
})();
