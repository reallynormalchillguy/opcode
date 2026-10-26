/* Opcode — the app: course map, lesson pages and the exercise workbench. */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, attrs = {}, html) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
    }
    if (html != null) node.innerHTML = html;
    return node;
  };
  const H = window.Highlight;
  const CV = window.ConsoleView;
  const TEST_TIMEOUT_MS = 5000;

  const current = {
    lesson: null,
    exIndex: 0,
    exercise: null,
    docs: {},          // file name -> CodeMirror.Doc
    readOnly: new Set(), // course-owned files in a project exercise
    activeFile: null,
    busy: false,
    hintsShown: 0,
    failedChecks: 0,
  };

  /* ---------- Compiler status (the power LED) ---------- */

  Compiler.onStatus((s) => {
    const led = $('#led');
    led.dataset.state = s.state;
    const pct = s.fraction != null ? Math.round(s.fraction * 100) : null;
    $('#compiler-status-text').textContent =
      s.state === 'loading' ? `${s.text}… ${pct != null ? pct + '%' : ''}` :
      s.state === 'ready' ? 'C compiler ready' :
      s.state === 'failed' ? `The compiler could not load: ${s.text}. Reload the page to try again.` : s.text;
    $('#compiler-meter').style.width = `${pct || 0}%`;
    $('#compiler-status').dataset.state = s.state;
  });

  /* ---------- Course map ---------- */

  function renderMap() {
    const nav = $('#course-map');
    nav.innerHTML = '';
    const flat = Course.flat();
    for (const part of Course.OUTLINE) {
      const section = el('section', { class: 'map-part' });
      section.appendChild(el('h2', { class: 'map-part-title' }, part.title));
      section.appendChild(el('p', { class: 'map-part-blurb' }, part.blurb));
      const ol = el('ol', { class: 'map-list' });
      for (const entry of flat.filter((f) => f.part === part.id)) {
        const lesson = Course.get(entry.id);
        const li = el('li');
        const isCurrent = current.lesson && current.lesson.id === entry.id;
        if (!entry.available) {
          li.appendChild(el('span', { class: 'map-item soon', title: 'Coming in a later update' },
            `<span class="map-no">${entry.number}</span><span class="map-name">${entry.title}</span><span class="map-soon">Soon</span>`));
        } else {
          const done = Progress.lessonDone(lesson);
          const pips = (lesson.exercises || []).map((ex) =>
            `<i class="pip${Progress.isSolved(ex.id) ? ' on' : ''}"></i>`).join('');
          const a = el('a', {
            class: `map-item${isCurrent ? ' current' : ''}${done ? ' done' : ''}`,
            href: `#/${entry.id}`,
            'aria-current': isCurrent ? 'page' : false,
          }, `<span class="map-no">${entry.number}</span><span class="map-name">${entry.title}</span><span class="pips" aria-label="${(lesson.exercises || []).filter((e) => Progress.isSolved(e.id)).length} of ${(lesson.exercises || []).length} exercises solved">${pips}</span>`);
          li.appendChild(a);
        }
        ol.appendChild(li);
      }
      section.appendChild(ol);
      nav.appendChild(section);
    }
  }

  /* ---------- Lesson page ---------- */

  function renderCode(block) {
    const fig = el('figure', { class: 'code' });
    const hasNotes = block.lines.some((l) => l[1]);
    const cap = el('figcaption', { class: 'code-cap' });
    cap.appendChild(el('span', { class: 'fname' }, H.esc(block.title || 'example.c')));
    if (hasNotes) cap.appendChild(el('span', { class: 'cap-hint' }, 'Marked lines open an explanation'));
    if (block.run) {
      const btn = el('button', { class: 'btn small', type: 'button' }, 'Run');
      btn.addEventListener('click', () => runExample(block, fig, btn));
      cap.appendChild(btn);
    }
    fig.appendChild(cap);
    const ol = el('ol', { class: 'lines' });
    block.lines.forEach(([code, note], i) => {
      const li = el('li', { class: note ? 'ln has-note' : 'ln' });
      const codeHtml = `<span class="no">${i + 1}</span><code>${H.line(code) || ' '}</code>`;
      if (note) {
        const id = `n-${Math.random().toString(36).slice(2, 9)}`;
        const row = el('button', { class: 'row', type: 'button', 'aria-expanded': 'false', 'aria-controls': id }, codeHtml);
        const noteEl = el('div', { class: 'note-body', id, hidden: true }, note);
        row.addEventListener('click', () => {
          const open = row.getAttribute('aria-expanded') === 'true';
          row.setAttribute('aria-expanded', String(!open));
          noteEl.hidden = open;
          li.classList.toggle('open', !open);
        });
        li.append(row, noteEl);
      } else {
        li.appendChild(el('div', { class: 'row' }, codeHtml));
      }
      ol.appendChild(li);
    });
    fig.appendChild(ol);
    if (block.run) fig.appendChild(el('div', { class: 'example-out', hidden: true }));
    return fig;
  }

  async function runExample(block, fig, btn) {
    const out = $('.example-out', fig);
    out.hidden = false;
    const name = block.title || 'example.c';
    const src = block.lines.map((l) => l[0]).join('\n') + '\n';
    btn.disabled = true;
    out.innerHTML = Compiler.status.state === 'ready' ? '<span class="muted">Compiling…</span>' : '<span class="muted">Waiting for the compiler to finish downloading…</span>';
    try {
      const r = await Compiler.build({ [name]: src });
      if (!r.ok) {
        out.innerHTML = `<pre class="diag">${CV.ansiToHtml(r.diagnostics)}</pre>`;
        return;
      }
      let html = '';
      if (r.diagnostics) html += `<pre class="diag">${CV.ansiToHtml(r.diagnostics)}</pre>`;
      if (block.stdin) html += `<div class="example-in">Input: <code>${H.esc(block.stdin)}</code></div>`;
      out.innerHTML = html + '<pre class="stdout"></pre>';
      const pre = $('.stdout', out);
      const res = await Compiler.run(r.wasm, {
        stdin: block.stdin || '',
        timeoutMs: 5000,
        onOutput: (text) => { pre.textContent += text; },
      });
      out.appendChild(el('div', { class: 'exit' }, describeExit(res)));
    } catch (e) {
      out.innerHTML = `<pre class="diag">${H.esc(String(e.message || e))}</pre>`;
    } finally {
      btn.disabled = false;
    }
  }

  function renderQuiz(block) {
    const box = el('div', { class: 'quiz' });
    box.appendChild(el('p', { class: 'quiz-q' }, block.q));
    const opts = el('div', { class: 'quiz-opts' });
    const explain = el('p', { class: 'quiz-explain', hidden: true });
    block.options.forEach((html, i) => {
      const b = el('button', { class: 'quiz-opt', type: 'button' }, html);
      b.addEventListener('click', () => {
        const right = i === block.answer;
        opts.querySelectorAll('.quiz-opt').forEach((o, j) => {
          o.classList.remove('picked', 'right', 'wrong');
          if (j === i) o.classList.add('picked', right ? 'right' : 'wrong');
        });
        explain.hidden = false;
        explain.className = `quiz-explain ${right ? 'right' : 'wrong'}`;
        explain.innerHTML = `<strong>${right ? 'Correct.' : 'Not quite.'}</strong> ${right ? block.explain : 'Try another answer.'}`;
      });
      opts.appendChild(b);
    });
    box.append(opts, explain);
    return box;
  }

  function renderBlock(b) {
    switch (b.t) {
      case 'h': return el('h2', { class: 'sec' }, H.esc(b.text));
      case 'p': return el('p', {}, b.html);
      case 'list': return el('ul', { class: 'list' }, b.items.map((i) => `<li>${i}</li>`).join(''));
      case 'note': return el('aside', { class: `callout ${b.kind || ''}` },
        `<span class="callout-label">${b.kind === 'nes' ? 'On the NES' : b.kind === 'warn' ? 'Watch out' : 'Note'}</span>${b.html}`);
      case 'code': return renderCode(b);
      case 'figure': return el('figure', { class: 'fig' }, `${b.html}${b.caption ? `<figcaption>${b.caption}</figcaption>` : ''}`);
      case 'quiz': return renderQuiz(b);
      case 'table': return el('table', { class: 'tbl' },
        `<thead><tr>${b.head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`);
      default: return el('div');
    }
  }

  function renderLesson(lesson) {
    const main = $('#lesson-content');
    main.innerHTML = '';
    const flat = Course.flat();
    const entry = flat.find((f) => f.id === lesson.id);
    const art = el('article', { class: 'lesson-body' });
    art.appendChild(el('p', { class: 'lesson-kicker' }, `Lesson ${entry.number} of ${flat.length}, in ${entry.partTitle}`));
    art.appendChild(el('h1', { class: 'lesson-title' }, H.esc(lesson.title)));
    art.appendChild(el('p', { class: 'lead' }, lesson.summary));
    lesson.blocks.forEach((b) => art.appendChild(renderBlock(b)));

    if (lesson.exercises && lesson.exercises.length) {
      art.appendChild(el('h2', { class: 'sec' }, 'Practice'));
      art.appendChild(el('p', {}, 'Each exercise opens in the workbench on the right. Check runs your program against several inputs; an exercise counts as solved when every test passes.'));
      const list = el('ol', { class: 'practice' });
      lesson.exercises.forEach((ex, i) => {
        const solved = Progress.isSolved(ex.id);
        const a = el('a', { href: `#/${lesson.id}/${i + 1}`, class: `practice-item${solved ? ' solved' : ''}` },
          `<span class="practice-name">${H.esc(ex.title)}</span><span class="practice-state">${solved ? 'Solved' : 'Not solved yet'}</span>`);
        list.appendChild(el('li')).appendChild(a);
      });
      art.appendChild(list);
    }

    const idx = flat.findIndex((f) => f.id === lesson.id);
    const prev = flat[idx - 1];
    const next = flat[idx + 1];
    const pager = el('nav', { class: 'pager', 'aria-label': 'Lessons' });
    if (prev) pager.appendChild(el('a', { href: `#/${prev.id}`, class: 'pager-prev' }, `<span>Previous</span>${H.esc(prev.title)}`));
    if (next) {
      pager.appendChild(next.available
        ? el('a', { href: `#/${next.id}`, class: 'pager-next' }, `<span>Next</span>${H.esc(next.title)}`)
        : el('div', { class: 'pager-next soon' }, `<span>Next, coming soon</span>${H.esc(next.title)}`));
    }
    art.appendChild(pager);
    main.appendChild(art);
    $('#lesson').scrollTop = 0;
  }

  /* ---------- Workbench ---------- */

  const editor = CodeMirror($('#editor'), {
    value: '',
    mode: 'text/x-csrc',
    lineNumbers: true,
    indentUnit: 4,
    tabSize: 4,
    indentWithTabs: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    extraKeys: {
      'Ctrl-Enter': () => run(),
      'Cmd-Enter': () => run(),
      'Shift-Ctrl-Enter': () => check(),
      'Shift-Cmd-Enter': () => check(),
      'Ctrl-/': 'toggleComment',
      'Cmd-/': 'toggleComment',
      Tab: (cm) => (cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ', 'end')),
    },
  });

  function currentFiles() {
    const files = {};
    for (const [name, doc] of Object.entries(current.docs)) files[name] = doc.getValue();
    return files;
  }

  // Only the files the learner writes (course files in a project are read-only).
  function learnerFiles() {
    const files = currentFiles();
    for (const name of current.readOnly) delete files[name];
    return files;
  }

  const isProject = (ex) => !!(ex && ex.project);

  function saveWork() {
    const ex = current.exercise;
    if (!ex) return;
    if (isProject(ex)) {
      for (const [name, text] of Object.entries(learnerFiles())) Progress.setProjectFile(name, text);
    }
    Progress.setCode(ex.id, learnerFiles());
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWork, 400);
  }

  function setFiles(files, readOnly = [], open) {
    current.docs = {};
    current.readOnly = new Set(readOnly);
    for (const [name, text] of Object.entries(files)) {
      const doc = CodeMirror.Doc(text, 'text/x-csrc');
      doc.on('change', scheduleSave);
      current.docs[name] = doc;
    }
    const names = Object.keys(files);
    current.activeFile = open && names.includes(open) ? open : names.includes('main.c') ? 'main.c' : names[0];
    showDoc(current.activeFile);
    renderFileTabs();
  }

  function showDoc(name) {
    editor.swapDoc(current.docs[name]);
    editor.setOption('readOnly', current.readOnly.has(name));
    $('#editor').classList.toggle('locked', current.readOnly.has(name));
    $('#btn-reset').disabled = current.readOnly.has(name);
  }

  const LOCK = '<svg class="lock" viewBox="0 0 12 14" aria-hidden="true"><rect x="1.5" y="6" width="9" height="7" rx="1.5" fill="currentColor"/><path d="M3.5 6V4.2a2.5 2.5 0 0 1 5 0V6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  function renderFileTabs() {
    const tabs = $('#file-tabs');
    tabs.innerHTML = '';
    for (const name of Object.keys(current.docs)) {
      const locked = current.readOnly.has(name);
      const b = el('button', {
        class: `file-tab${name === current.activeFile ? ' active' : ''}${locked ? ' is-locked' : ''}`,
        type: 'button', role: 'tab', 'aria-selected': String(name === current.activeFile),
        title: locked ? 'Provided by the course; read-only' : null,
      }, `${H.esc(name)}${locked ? LOCK : ''}`);
      b.addEventListener('click', () => openFile(name));
      tabs.appendChild(b);
    }
  }

  function openFile(name, line, col) {
    if (!current.docs[name]) return;
    current.activeFile = name;
    showDoc(name);
    renderFileTabs();
    if (line) {
      const pos = { line: line - 1, ch: Math.max(0, (col || 1) - 1) };
      editor.setCursor(pos);
      editor.scrollIntoView(pos, 80);
    }
    editor.focus();
  }

  function renderExerciseSwitch() {
    const sw = $('#ex-switch');
    sw.innerHTML = '';
    const list = current.lesson.exercises;
    sw.appendChild(el('span', { class: 'ex-count' }, `Exercise ${current.exIndex + 1} of ${list.length}`));
    const group = el('div', { class: 'ex-dots', role: 'tablist' });
    list.forEach((ex, i) => {
      const a = el('a', {
        href: `#/${current.lesson.id}/${i + 1}`,
        class: `ex-dot${i === current.exIndex ? ' active' : ''}${Progress.isSolved(ex.id) ? ' solved' : ''}`,
        title: `${ex.title}${Progress.isSolved(ex.id) ? ' (solved)' : ''}`,
      }, String(i + 1));
      group.appendChild(a);
    });
    sw.appendChild(group);
    if (isProject(current.exercise)) sw.appendChild(el('span', { class: 'project-pill', title: 'These files are your emulator. They are kept from one lesson to the next.' }, 'Emulator project'));
    $('#btn-download').hidden = !isProject(current.exercise);
  }

  function renderPrompt() {
    const ex = current.exercise;
    const box = $('#ex-prompt');
    box.innerHTML = ex.prompt;
    if (ex.harness && Object.keys(ex.harness).some((n) => n !== 'main.c' && n.endsWith('.c'))) {
      box.appendChild(el('p', { class: 'prompt-note' }, 'Check calls your functions directly with its own tests. Your <code>main</code> is just for trying things with Run.'));
    }
    if (current.hintsShown > 0) {
      const hints = el('div', { class: 'hints' });
      ex.hints.slice(0, current.hintsShown).forEach((h, i) => {
        hints.appendChild(el('p', { class: 'hint' }, `<span class="hint-label">Hint ${i + 1}</span>${h}`));
      });
      box.appendChild(hints);
    }
    const hb = $('#btn-hint');
    const left = ex.hints.length - current.hintsShown;
    hb.disabled = left <= 0;
    hb.textContent = left <= 0 ? 'No more hints' : current.hintsShown ? `Hint ${current.hintsShown + 1} of ${ex.hints.length}` : 'Hint';
  }

  const projectStore = {
    file: (name) => Progress.projectFile(name),
    exerciseFile: (exId, name) => Progress.exerciseFile(exId, name),
    isSolved: (exId) => Progress.isSolved(exId),
  };

  function loadExercise(lesson, index) {
    if (!lesson.exercises || !lesson.exercises.length) return;
    index = Math.max(0, Math.min(index, lesson.exercises.length - 1));
    clearTimeout(saveTimer);
    saveWork();
    const ex = lesson.exercises[index];
    current.exIndex = index;
    current.exercise = ex;
    current.hintsShown = Progress.hintsSeen(ex.id);
    current.failedChecks = 0;
    $('#ex-title').textContent = ex.title;
    renderExerciseSwitch();
    renderPrompt();
    let created = {};
    if (isProject(ex)) {
      const r = Course.resolveProject(ex, projectStore);
      created = r.created;
      for (const name of Object.keys(created)) Progress.setProjectFile(name, r.files[name]);
      setFiles(r.files, r.readOnly, ex.project.open);
    } else {
      setFiles(Progress.getCode(ex.id) || ex.files);
    }
    const saved = Progress.getStdin(ex.id);
    $('#stdin').value = saved != null ? saved : ex.stdin != null ? ex.stdin : ((!ex.harness && ex.tests[0] && ex.tests[0].stdin) || '');
    requestAnimationFrame(fitStdin);
    clearConsole();
    for (const [name, how] of Object.entries(created)) {
      const from = ex.project.learner[name].from;
      if (how === 'imported') consoleNote(`<strong>${H.esc(name)}</strong> was added to your emulator project, starting from your own solution to “${H.esc(exerciseTitle(from.exercise))}”.`, 'project');
      else consoleNote(`<strong>${H.esc(name)}</strong> was added to your emulator project.`, 'project');
    }
    if (isProject(ex)) {
      const here = new Set(Object.keys(ex.project.learner || {}));
      const later = Object.keys(Progress.projectFiles()).filter((n) => !here.has(n));
      if (later.length) {
        consoleNote(`Your project has grown since this exercise (it now also has ${later.map((n) => `<code>${H.esc(n)}</code>`).join(', ')}). The files shown here are your latest versions, so this older exercise may no longer build or pass. That is expected.`, 'muted');
      }
    }
    hideScreen();
    $('.tv-help').hidden = !ex.controller;
    renderRomPicker();
    consoleNote(Progress.isSolved(ex.id)
      ? 'You have already solved this one. Run and Check still work if you want to experiment.'
      : 'Write your code, then press Run to try it or Check to test it.');
  }

  function exerciseTitle(exId) {
    for (const entry of Course.flat()) {
      const lesson = Course.get(entry.id);
      const found = lesson && lesson.exercises.find((e) => e.id === exId);
      if (found) return found.title;
    }
    return exId;
  }

  function downloadProject() {
    saveWork();
    const files = Object.assign({}, Progress.projectFiles(), currentFiles());
    const zipFiles = {};
    for (const name of Object.keys(files).sort()) zipFiles[`opcode-nes/${name}`] = files[name];
    const url = URL.createObjectURL(Zip.makeZip(zipFiles));
    const a = el('a', { href: url, download: 'opcode-nes.zip' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------- Console ---------- */

  function clearConsole() {
    $('#console').innerHTML = '';
    $('#console-title').textContent = 'Console';
  }
  function consoleAppend(node) {
    const c = $('#console');
    c.appendChild(node);
    c.scrollTop = c.scrollHeight;
    return node;
  }
  function consoleNote(text, cls = '') {
    return consoleAppend(el('div', { class: `c-note ${cls}` }, text));
  }
  function consoleDiag(text) {
    if (!text) return null;
    return consoleAppend(el('pre', { class: 'diag' }, CV.linkify(CV.ansiToHtml(text))));
  }

  $('#console').addEventListener('click', (e) => {
    const loc = e.target.closest('.loc');
    if (loc) openFile(loc.dataset.file, Number(loc.dataset.line), Number(loc.dataset.col));
  });

  function describeExit(res) {
    if (res.frameStuck) return '<span class="bad">Stopped: one frame took more than 8 seconds. Is there a loop in your emulator that never ends?</span>';
    if (res.timedOut) return `<span class="bad">Stopped after ${res.timeoutMs / 1000} seconds. Is there a loop that never ends?</span>`;
    if (res.stopped) return '<span class="muted">Stopped.</span>';
    if (res.truncated) return '<span class="bad">Stopped: the program printed too much output. Is a loop printing forever?</span>';
    if (res.trap) return `<span class="bad">The program crashed. ${H.esc(res.trap)}</span>`;
    if (res.exitCode === 0) return '<span class="muted">Finished (exit code 0).</span>';
    return `<span class="bad">Finished with exit code ${res.exitCode}. A non-zero code usually means the program reported an error.</span>`;
  }

  /* ---------- Run, Check, Hint, Solution, Reset ---------- */

  function setBusy(busy, mode) {
    current.busy = busy;
    $('#btn-check').disabled = busy;
    const runBtn = $('#btn-run');
    runBtn.textContent = busy && mode === 'run' ? 'Stop' : 'Run';
    runBtn.classList.toggle('stop', busy && mode === 'run');
    runBtn.disabled = busy && mode !== 'run';
  }

  // Data files (ROMs, logs) an exercise gives its programs, fetched once.
  const dataCache = new Map();
  async function loadData(ex) {
    const out = {};
    for (const [name, url] of Object.entries(ex.data || {})) {
      if (!dataCache.has(url)) {
        dataCache.set(url, fetch(url).then((r) => {
          if (!r.ok) throw new Error(`Could not download ${url} (${r.status})`);
          return r.arrayBuffer();
        }).then((b) => new Uint8Array(b)));
      }
      try {
        out[name] = await dataCache.get(url);
      } catch (e) {
        dataCache.delete(url);
        throw e;
      }
    }
    return out;
  }

  async function buildCurrent(forCheck) {
    if (Compiler.status.state !== 'ready') consoleNote('Waiting for the compiler to finish downloading…', 'muted');
    const t = consoleNote('Compiling…', 'muted');
    const plan = forCheck ? Checker.checkBuild(current.exercise, currentFiles()) : { files: currentFiles(), options: {} };
    const r = await Compiler.build(plan.files, plan.options);
    t.remove();
    return r;
  }

  async function run() {
    if (current.busy) {
      if (Compiler.isRunning) Compiler.stop();
      return;
    }
    if (!current.exercise) return;
    Progress.setStdin(current.exercise.id, $('#stdin').value);
    saveWork();
    clearConsole();
    $('#console-title').textContent = 'Console: run';
    setBusy(true, 'run');
    try {
      const r = await buildCurrent();
      if (!r.ok) {
        consoleDiag(r.diagnostics);
        consoleNote(r.linkError ? linkAdvice(r.diagnostics) : 'The program did not compile, so nothing ran. Fix the first error above and try again.', 'bad');
        return;
      }
      consoleDiag(r.diagnostics);
      const pre = consoleAppend(el('pre', { class: 'stdout' }));
      const files = await loadData(current.exercise);
      if (current.exercise.rom) {
        const rom = await currentRom();
        if (rom) files['game.nes'] = rom;
      }
      hideScreen();
      const res = await Compiler.run(r.wasm, {
        files,
        stdin: $('#stdin').value,
        timeoutMs: 15000,
        onOutput: (text, fd) => {
          if (fd === 2) pre.appendChild(el('span', { class: 'stderr' })).textContent = text;
          else pre.appendChild(document.createTextNode(text));
          trimConsole(pre);
          $('#console').scrollTop = $('#console').scrollHeight;
        },
        onFrame: showFrame,
        onLooping: () => {
          setTvRunning(true);
          consoleNote('Running. Press Stop to end it.', 'muted');
        },
      });
      setTvRunning(false);
      if (!res.stdout && !res.stderr) pre.remove();
      consoleAppend(el('div', { class: 'exit' }, describeExit(res)));
    } catch (e) {
      consoleNote(`Something went wrong: ${H.esc(String(e.message || e))}`, 'bad');
    } finally {
      setBusy(false);
    }
  }

  /* ---------- Screen and controller ---------- */

  const screenCanvas = $('#screen');
  const screenCtx = screenCanvas.getContext('2d');
  let screenImage = null;

  let screenDismissed = false; // the learner went back to the lesson during this run

  function hideScreen() {
    $('#screen-wrap').hidden = true;
    $('#btn-tv-open').hidden = true;
    screenDismissed = false;
  }

  function showFrame(rgba) {
    if (!screenImage) screenImage = screenCtx.createImageData(256, 240);
    screenImage.data.set(rgba);
    screenCtx.putImageData(screenImage, 0, 0);
    $('#btn-tv-open').hidden = false;
    if (!screenDismissed) $('#screen-wrap').hidden = false;
  }

  $('#btn-tv-close').addEventListener('click', () => {
    screenDismissed = true;
    $('#screen-wrap').hidden = true;
  });
  $('#btn-tv-open').addEventListener('click', () => {
    screenDismissed = false;
    $('#screen-wrap').hidden = false;
    screenCanvas.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#screen-wrap').hidden) $('#btn-tv-close').click();
  });

  // Long-running programs can print a lot: keep only the end of it on screen.
  function trimConsole(pre) {
    const MAX = 60000;
    if (pre.textContent.length > MAX * 1.5) pre.textContent = '…\n' + pre.textContent.slice(-MAX);
  }

  // NES controller bits: A, B, Select, Start, Up, Down, Left, Right.
  const KEY_BITS = {
    KeyX: 0x01, KeyK: 0x01, KeyZ: 0x02, KeyJ: 0x02, ShiftLeft: 0x04, ShiftRight: 0x04, Enter: 0x08,
    ArrowUp: 0x10, KeyW: 0x10, ArrowDown: 0x20, KeyS: 0x20, ArrowLeft: 0x40, KeyA: 0x40, ArrowRight: 0x80, KeyD: 0x80,
  };
  let buttons = 0;
  function setKey(e, down) {
    const bit = KEY_BITS[e.code];
    if (!bit) return;
    e.preventDefault();
    buttons = down ? buttons | bit : buttons & ~bit;
    Compiler.setButtons(buttons);
  }
  screenCanvas.addEventListener('keydown', (e) => setKey(e, true));
  screenCanvas.addEventListener('keyup', (e) => setKey(e, false));
  screenCanvas.addEventListener('focus', () => $('#screen-wrap').classList.add('playing'));
  const setTvRunning = (on) => $('#screen-wrap').classList.toggle('running', on);
  screenCanvas.addEventListener('blur', () => {
    $('#screen-wrap').classList.remove('playing');
    buttons = 0;
    Compiler.setButtons(0);
  });
  screenCanvas.addEventListener('click', () => screenCanvas.focus());

  /* ---------- Cartridge picker ---------- */

  const BUILT_IN_ROMS = { 'nestest.nes': 'nes/nestest.nes' };
  const LOAD_OPTION = '__load__';

  async function renderRomPicker() {
    const ex = current.exercise;
    const row = $('#rom-row');
    row.hidden = !(ex && ex.rom);
    if (row.hidden) return;
    const select = $('#rom-select');
    const mine = await RomStore.list();
    const chosen = prefs.rom || 'builtin:nestest.nes';
    select.innerHTML = '';
    for (const name of Object.keys(BUILT_IN_ROMS)) select.appendChild(el('option', { value: `builtin:${name}` }, `${H.esc(name)} (comes with the course)`));
    for (const name of mine) select.appendChild(el('option', { value: `mine:${name}` }, H.esc(name)));
    select.appendChild(el('option', { value: LOAD_OPTION }, 'Load a .nes file from your computer…'));
    select.value = [...select.options].some((o) => o.value === chosen) ? chosen : 'builtin:nestest.nes';
  }

  async function currentRom() {
    const v = $('#rom-select').value || 'builtin:nestest.nes';
    if (v.startsWith('builtin:')) {
      const name = v.slice(8);
      return (await loadData({ data: { [name]: BUILT_IN_ROMS[name] } }))[name];
    }
    return RomStore.get(v.slice(5));
  }

  $('#rom-select').addEventListener('change', () => {
    const v = $('#rom-select').value;
    if (v === LOAD_OPTION) {
      $('#rom-file').click();
      renderRomPicker();
      return;
    }
    prefs.rom = v;
    savePrefs();
  });

  $('#rom-file').addEventListener('change', async () => {
    const file = $('#rom-file').files[0];
    $('#rom-file').value = '';
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!RomStore.isINes(bytes)) {
      consoleNote(`${H.esc(file.name)} is not an iNES file: .nes files start with the bytes <code>4E 45 53 1A</code>.`, 'bad');
      return;
    }
    await RomStore.put(file.name, bytes);
    prefs.rom = `mine:${file.name}`;
    savePrefs();
    await renderRomPicker();
    consoleNote(`${H.esc(file.name)} is loaded and stays in this browser. Press Run to use it.`, 'project');
  });

  function linkAdvice(diag) {
    const missing = [...new Set([...String(diag).matchAll(/undefined symbol: (\w+)/g)].map((m) => m[1]))];
    if (missing.length) {
      const names = missing.map((n) => `<code>${H.esc(n)}</code>`).join(', ');
      return `Every file compiled, but nothing defines ${names}. Write ${missing.length > 1 ? 'them' : 'it'} with exactly that name, and make sure it is not <code>static</code>.`;
    }
    return 'The program could not be linked. Check the names and parameters of the functions you call.';
  }

  function showLines(lines, highlight) {
    if (!lines.length) return '<span class="muted">(nothing)</span>';
    return lines.map((l, i) => `<span class="${i === highlight ? 'diff-line' : ''}">${H.esc(l) || ' '}</span>`).join('\n');
  }

  async function check() {
    if (current.busy || !current.exercise) return;
    const ex = current.exercise;
    saveWork();
    clearConsole();
    $('#console-title').textContent = 'Console: check';
    setBusy(true, 'check');
    try {
      const r = await buildCurrent(true);
      if (!r.ok) {
        consoleDiag(r.diagnostics);
        const harnessNames = Object.keys(ex.harness || {});
        const inHarness = harnessNames.some((n) => r.diagnostics.includes(`${n}:`));
        if (inHarness || (ex.harness && r.linkError)) {
          consoleNote('The checker could not call your code. Make sure every function asked for exists, with exactly the name, parameters and return type given in the task.', 'bad');
        } else {
          consoleNote('The program does not compile yet, so it cannot be tested. Fix the first error above.', 'bad');
        }
        current.failedChecks++;
        return;
      }
      consoleDiag(r.diagnostics);
      if (ex.harness && /signature mismatch/.test(r.diagnostics)) {
        consoleNote('A function does not have the parameters or return type the task asks for, so the checker cannot call it correctly. Compare your function\'s first line with the task.', 'bad');
      }
      const results = consoleAppend(el('ol', { class: 'tests' }));
      let firstFail = null;
      let passed = 0;
      const data = await loadData(ex);
      for (const t of ex.tests) {
        const li = results.appendChild(el('li', { class: 'test running' }, `<span class="mark"></span>${H.esc(t.name)}`));
        const res = await Compiler.run(r.wasm, { stdin: t.stdin || '', timeoutMs: t.timeoutMs || TEST_TIMEOUT_MS, files: data });
        const cmp = Checker.compare(t.expect, res.stdout);
        const ok = cmp.pass && !res.trap && !res.timedOut && !res.truncated;
        li.className = `test ${ok ? 'pass' : 'fail'}`;
        if (ok) passed++;
        else if (!firstFail) firstFail = { t, res, cmp };
      }
      const ruleFails = Checker.checkRules(ex.rules, learnerFiles());
      if (firstFail) {
        const { t, res, cmp } = firstFail;
        const box = consoleAppend(el('div', { class: 'fail-detail' }));
        let html = `<p class="fail-title">Test “${H.esc(t.name)}” did not pass.</p>`;
        if (t.stdin) html += `<p class="fail-in">Input: <code>${H.esc(t.stdin)}</code></p>`;
        if (res.timedOut || res.trap || res.truncated) {
          html += `<p>${describeExit(Object.assign({ timeoutMs: TEST_TIMEOUT_MS }, res))}</p>`;
        } else {
          const where = cmp.line != null ? `The first difference is on line ${cmp.line + 1}.` : '';
          html += `<div class="diff"><div><span class="diff-label">Expected</span><pre>${showLines(cmp.expectedLines, cmp.line)}</pre></div><div><span class="diff-label">Your program printed</span><pre>${showLines(cmp.actualLines, cmp.line)}</pre></div></div><p class="muted">${where}</p>`;
        }
        box.innerHTML = html;
        current.failedChecks++;
      } else if (ruleFails.length) {
        consoleAppend(el('div', { class: 'fail-detail' }, `<p class="fail-title">All outputs are right, but one requirement is not met.</p>${ruleFails.map((m) => `<p>${m}</p>`).join('')}`));
        current.failedChecks++;
      } else {
        const wasSolved = Progress.isSolved(ex.id);
        Progress.markSolved(ex.id);
        const nextEx = current.lesson.exercises[current.exIndex + 1];
        const box = consoleAppend(el('div', { class: 'success' }));
        const lessonDone = Progress.lessonDone(current.lesson);
        box.innerHTML = `<p class="success-title">All ${passed} tests passed.</p><p>${lessonDone && !nextEx ? 'Every exercise in this lesson is solved.' : wasSolved ? 'Still solved.' : 'Exercise solved.'}</p>`;
        const flat = Course.flat();
        const nextLesson = flat[flat.findIndex((f) => f.id === current.lesson.id) + 1];
        if (nextEx) {
          box.appendChild(el('a', { class: 'btn primary', href: `#/${current.lesson.id}/${current.exIndex + 2}` }, `Next exercise: ${H.esc(nextEx.title)}`));
        } else if (nextLesson && nextLesson.available) {
          box.appendChild(el('a', { class: 'btn primary', href: `#/${nextLesson.id}` }, `Next lesson: ${H.esc(nextLesson.title)}`));
        } else if (nextLesson) {
          box.appendChild(el('p', { class: 'muted' }, `The next lesson, ${H.esc(nextLesson.title)}, arrives in the next update.`));
        }
        renderExerciseSwitch();
        renderMap();
        refreshPractice();
      }
    } catch (e) {
      consoleNote(`Something went wrong: ${H.esc(String(e.message || e))}`, 'bad');
    } finally {
      setBusy(false);
    }
  }

  function refreshPractice() {
    document.querySelectorAll('.practice-item').forEach((a, i) => {
      const ex = current.lesson.exercises[i];
      const solved = ex && Progress.isSolved(ex.id);
      a.classList.toggle('solved', !!solved);
      $('.practice-state', a).textContent = solved ? 'Solved' : 'Not solved yet';
    });
  }

  function showHint() {
    const ex = current.exercise;
    if (!ex || current.hintsShown >= ex.hints.length) return;
    current.hintsShown++;
    Progress.setHintsSeen(ex.id, current.hintsShown);
    renderPrompt();
    const box = $('#ex-prompt');
    box.scrollTop = box.scrollHeight;
  }

  function showSolution() {
    const ex = current.exercise;
    if (!ex) return;
    if (!Progress.isSolved(ex.id) && current.failedChecks === 0 &&
        !confirm('Show the solution now? Trying a Check first, even a failing one, makes it stick much better.')) return;
    clearConsole();
    $('#console-title').textContent = 'Console: solution';
    const box = consoleAppend(el('div', { class: 'solution' }));
    for (const [name, text] of Object.entries(ex.solution)) {
      box.appendChild(el('p', { class: 'muted' }, `One possible solution, ${H.esc(name)}:`));
      box.appendChild(el('pre', { class: 'sol-code' }, text.split('\n').map(H.line).join('\n')));
    }
    const use = el('button', { class: 'btn', type: 'button' }, 'Replace my code with this');
    use.addEventListener('click', () => {
      const names = Object.keys(ex.solution).join(', ');
      if (!confirm(`Replace your ${names} with the solution? Your current code in ${Object.keys(ex.solution).length > 1 ? 'those files' : 'that file'} will be lost.`)) return;
      if (isProject(ex)) {
        for (const [name, text] of Object.entries(ex.solution)) {
          if (current.docs[name]) current.docs[name].setValue(text);
        }
      } else {
        setFiles(Object.assign({}, ex.files, ex.solution));
      }
      saveWork();
    });
    box.appendChild(use);
  }

  function resetCode() {
    const ex = current.exercise;
    if (!ex) return;
    if (isProject(ex)) {
      const name = current.activeFile;
      const spec = ex.project.learner && ex.project.learner[name];
      if (!spec) return;
      if (!confirm(`Replace ${name} with the course's version from the start of this exercise? It includes everything up to the previous exercise. Your own ${name} will be lost.`)) return;
      current.docs[name].setValue(spec.starter);
      saveWork();
      clearConsole();
      consoleNote(`${H.esc(name)} restored.`);
      return;
    }
    if (!confirm('Put the starting code back? Your changes to this exercise will be lost.')) return;
    Progress.clearCode(ex.id);
    setFiles(ex.files);
    clearConsole();
    consoleNote('Starting code restored.');
  }

  $('#btn-run').addEventListener('click', run);
  $('#btn-check').addEventListener('click', check);
  $('#btn-hint').addEventListener('click', showHint);
  $('#btn-solution').addEventListener('click', showSolution);
  $('#btn-reset').addEventListener('click', resetCode);
  $('#btn-clear').addEventListener('click', clearConsole);
  $('#btn-download').addEventListener('click', downloadProject);
  function fitStdin() {
    const t = $('#stdin');
    t.style.height = 'auto';
    t.style.height = `${Math.min(t.scrollHeight + 2, parseFloat(getComputedStyle(t).maxHeight) || 200)}px`;
  }
  $('#stdin').addEventListener('input', () => {
    if (current.exercise) Progress.setStdin(current.exercise.id, $('#stdin').value);
    fitStdin();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.target.closest('.CodeMirror')) {
      e.preventDefault();
      if (e.shiftKey) check(); else run();
    }
  });

  /* ---------- View settings: text size, course map, editor/console split ---------- */

  const PREFS_KEY = 'opcode.prefs';
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { prefs = {}; }
  function savePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }
  const root = document.documentElement;

  function applySize(size) {
    root.dataset.size = size;
    if (typeof fitStdin === 'function') requestAnimationFrame(fitStdin);
    document.querySelectorAll('.size-switch button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.size === size)));
    editor.refresh();
  }
  document.querySelectorAll('.size-switch button').forEach((b) => {
    b.addEventListener('click', () => { prefs.size = b.dataset.size; savePrefs(); applySize(prefs.size); });
  });
  applySize(root.dataset.size || 'm');

  const narrow = () => window.matchMedia('(max-width: 1100px)').matches;
  function setMap(state, remember) {
    root.dataset.map = state;
    $('#map-toggle').setAttribute('aria-expanded', String(state === 'open'));
    $('#map-toggle-text').textContent = state === 'open' ? 'Hide lessons' : 'Lessons';
    if (remember && !narrow()) { prefs.map = state; savePrefs(); }
  }
  $('#map-toggle').addEventListener('click', () => setMap(root.dataset.map === 'open' ? 'closed' : 'open', true));
  if (narrow()) root.dataset.map = 'closed';
  setMap(root.dataset.map || 'open', false);
  $('#course-map').addEventListener('click', (e) => {
    if (narrow() && e.target.closest('a')) setMap('closed', false);
  });
  $('#lesson').addEventListener('click', (e) => {
    if (narrow() && root.dataset.map === 'open' && !e.target.closest('#map-toggle')) setMap('closed', false);
  });

  const bench = $('#bench');
  function applySplit(ratio) {
    const r = Math.min(0.82, Math.max(0.22, ratio));
    bench.style.setProperty('--ed', `${r}fr`);
    bench.style.setProperty('--co', `${1 - r}fr`);
  }
  if (prefs.split) applySplit(prefs.split);
  const splitter = $('#splitter');
  const codePane = $('.code-pane');
  const outPane = $('.out-pane');
  function currentRatio() {
    const a = codePane.getBoundingClientRect().height;
    const b = outPane.getBoundingClientRect().height;
    return a / (a + b);
  }
  splitter.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('dragging');
    const startY = e.clientY;
    const a = codePane.getBoundingClientRect().height;
    const b = outPane.getBoundingClientRect().height;
    const move = (ev) => applySplit((a + ev.clientY - startY) / (a + b));
    const up = () => {
      splitter.classList.remove('dragging');
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      prefs.split = Math.min(0.82, Math.max(0.22, currentRatio()));
      savePrefs();
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
  });
  splitter.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    applySplit(currentRatio() + (e.key === 'ArrowUp' ? -0.05 : 0.05));
    prefs.split = currentRatio();
    savePrefs();
  });
  splitter.addEventListener('dblclick', () => { delete prefs.split; savePrefs(); bench.style.removeProperty('--ed'); bench.style.removeProperty('--co'); });
  new ResizeObserver(() => editor.refresh()).observe($('#editor'));

  function applyTask(hidden) {
    bench.classList.toggle('task-hidden', hidden);
    $('#btn-task').textContent = hidden ? 'Show task' : 'Hide task';
    $('#btn-task').setAttribute('aria-expanded', String(!hidden));
  }
  $('#btn-task').addEventListener('click', () => {
    prefs.taskHidden = !bench.classList.contains('task-hidden');
    savePrefs();
    applyTask(prefs.taskHidden);
  });
  applyTask(!!prefs.taskHidden);

  /* ---------- Routing ---------- */

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    let lessonId = parts[0];
    if (!lessonId || !Course.has(lessonId)) {
      const last = Progress.last;
      lessonId = last && Course.has(last.lesson) ? last.lesson : Course.flat()[0].id;
      const ex = last && last.lesson === lessonId ? last.ex : 0;
      history.replaceState(null, '', `#/${lessonId}${ex ? '/' + (ex + 1) : ''}`);
    }
    const lesson = Course.get(lessonId);
    const wanted = parts[1] ? Number(parts[1]) - 1 : null;
    const lessonChanged = !current.lesson || current.lesson.id !== lesson.id;
    if (lessonChanged) {
      current.lesson = lesson;
      renderLesson(lesson);
      const firstOpen = lesson.exercises.findIndex((e) => !Progress.isSolved(e.id));
      loadExercise(lesson, wanted != null ? wanted : Math.max(0, firstOpen));
    } else if (wanted != null && wanted !== current.exIndex) {
      loadExercise(lesson, wanted);
    }
    Progress.setLast({ lesson: lesson.id, ex: current.exIndex });
    renderMap();
    document.title = `${lesson.title} — Opcode`;
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', () => {
    saveWork();
    Progress.flush();
  });

  route();
  Compiler.start();
})();
