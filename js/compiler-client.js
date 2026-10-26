/*
 * Opcode — main-thread client for the compiler and program runner.
 *
 *   Compiler.start()                      begin downloading the toolchain
 *   Compiler.onStatus(fn)                 fn({ state, text, fraction })
 *   await Compiler.build(files)           { ok, wasm, diagnostics, ms }
 *   await Compiler.run(wasm, opts)        { exitCode, trap, stdout, stderr, timedOut, stopped }
 *   Compiler.stop()                       stop the running program
 */
(function () {
  'use strict';

  const BASE = 'compiler/';
  let worker = null;
  let memfsModule = null;
  let readyResolve;
  let readyReject;
  const ready = new Promise((res, rej) => { readyResolve = res; readyReject = rej; });
  ready.catch(() => {});
  const listeners = [];
  let status = { state: 'idle', text: 'Compiler not loaded', fraction: 0 };
  let nextId = 1;
  const pending = new Map();
  let running = null;

  function setStatus(s) {
    status = Object.assign({}, status, s);
    listeners.forEach((fn) => fn(status));
  }

  function start() {
    if (worker) return ready;
    worker = new Worker(BASE + 'compile-worker.js');
    setStatus({ state: 'loading', text: 'Downloading the C compiler', fraction: 0 });
    worker.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'status') {
        if (m.text === 'Compiler ready') return;
        setStatus({ state: 'loading', text: m.text, fraction: m.fraction });
      } else if (m.type === 'ready') {
        memfsModule = m.memfsModule;
        setStatus({ state: 'ready', text: 'Compiler ready', fraction: 1 });
        readyResolve();
      } else if (m.type === 'failed') {
        setStatus({ state: 'failed', text: m.error });
        readyReject(new Error(m.error));
      } else if (m.type === 'built') {
        const p = pending.get(m.id);
        pending.delete(m.id);
        if (p) p(m.result);
      }
    };
    worker.onerror = (e) => {
      setStatus({ state: 'failed', text: e.message || 'The compiler worker crashed' });
      readyReject(new Error(e.message));
    };
    worker.postMessage({ type: 'init', base: '' });
    return ready;
  }

  async function build(files, options = {}) {
    start();
    await ready;
    const id = nextId++;
    return new Promise((resolve) => {
      pending.set(id, resolve);
      worker.postMessage({ type: 'build', id, files, options });
    });
  }

  // opts: { stdin, timeoutMs, onOutput(text, fd) }
  function run(wasm, opts = {}) {
    stop();
    return new Promise((resolve) => {
      const w = new Worker(BASE + 'run-worker.js');
      let stdout = '';
      let stderr = '';
      const finish = (extra) => {
        clearTimeout(timer);
        w.terminate();
        if (running && running.worker === w) running = null;
        resolve(Object.assign({ stdout, stderr }, extra));
      };
      const timeoutMs = opts.timeoutMs || 10000;
      const timer = setTimeout(() => finish({ exitCode: null, timedOut: true, timeoutMs }), timeoutMs);
      running = { worker: w, stop: () => finish({ exitCode: null, stopped: true }) };
      w.onmessage = (e) => {
        const m = e.data;
        if (m.type === 'output') {
          if (m.fd === 2) stderr += m.text; else stdout += m.text;
          if (opts.onOutput) opts.onOutput(m.text, m.fd);
        } else if (m.type === 'done') {
          finish(m.result);
        }
      };
      w.onerror = (e) => finish({ exitCode: null, trap: e.message || 'The program crashed' });
      w.postMessage({ memfsModule, wasm, stdin: opts.stdin || '' });
    });
  }

  function stop() {
    if (running) running.stop();
  }

  window.Compiler = {
    start,
    build,
    run,
    stop,
    get status() { return status; },
    get isRunning() { return !!running; },
    onStatus(fn) { listeners.push(fn); fn(status); },
  };
})();
