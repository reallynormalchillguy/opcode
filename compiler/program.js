/*
 * Opcode — runs a compiled learner program (wasm) with stdin/stdout.
 * Used by run-worker.js (one disposable worker per run) and Node tests.
 */

(function (global) {
  'use strict';

  const { MemFS, App } = global.OpcodeWasi;

  // Plain-English explanations for WebAssembly traps.
  function explainTrap(message) {
    const m = String(message);
    if (/out of bounds/.test(m)) {
      return 'Your program read or wrote memory it does not own (in C this is usually a bad pointer or an array index out of range). On a normal PC this is called a segmentation fault.';
    }
    if (/divide by zero|division by zero/i.test(m)) return 'Your program divided an integer by zero.';
    if (/integer overflow/i.test(m)) return 'An integer division overflowed (for example INT_MIN / -1).';
    if (/unreachable/.test(m)) return 'Your program called abort() or reached code that should never run (a failed assert also does this).';
    if (/call stack|too much recursion|stack overflow/i.test(m)) return 'The call stack overflowed. This usually means a recursive function never stops calling itself.';
    if (/indirect call/.test(m)) return 'Your program called a function through a bad function pointer.';
    return m;
  }

  // Returns { exitCode, trap?: string, stdout, stderr, truncated }
  async function runProgram({ memfsModule, wasm, stdin = '', onOutput, maxOutput = 200000, argv = ['program'], env = {} }) {
    const decoders = { 1: new TextDecoder(), 2: new TextDecoder() };
    let stdout = '';
    let stderr = '';
    let total = 0;
    let truncated = false;
    const memfs = new MemFS(memfsModule, (bytes, fd) => {
      if (truncated) return;
      const text = decoders[fd === 2 ? 2 : 1].decode(bytes, { stream: true });
      total += text.length;
      if (total > maxOutput) {
        truncated = true;
        throw new Error('__output_limit__');
      }
      if (fd === 2) stderr += text; else stdout += text;
      if (onOutput) onOutput(text, fd);
    });
    await memfs.ready;
    memfs.setStdin(stdin);
    let app;
    try {
      const module = wasm instanceof WebAssembly.Module ? wasm : await WebAssembly.compile(wasm);
      app = new App(module, memfs, argv, env);
      await app.ready;
    } catch (e) {
      return { exitCode: null, trap: 'The program could not be started: ' + (e && e.message), stdout, stderr, truncated };
    }
    try {
      const exitCode = await app.run();
      return { exitCode, stdout, stderr, truncated };
    } catch (e) {
      if (truncated) return { exitCode: null, stdout, stderr, truncated };
      return { exitCode: null, trap: explainTrap(e && e.message), rawTrap: String(e && e.message), stdout, stderr, truncated };
    }
  }

  global.OpcodeProgram = { runProgram, explainTrap };
})(typeof self !== 'undefined' ? self : globalThis);
