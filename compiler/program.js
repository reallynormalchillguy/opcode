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

  const SCREEN_W = 256;
  const SCREEN_H = 240;

  // Returns { exitCode, trap?: string, stdout, stderr, truncated, app?, loopIndex? }
  // files: { 'name.nes': Uint8Array } placed next to the program, so it can fopen them.
  // screen: { show(rgba: Uint8ClampedArray), buttons() } for programs that use screen.h.
  //   If the program calls screen_loop(f), the result has `loopIndex`, and
  //   `callLoop(result)` runs one frame.
  async function runProgram({ memfsModule, wasm, stdin = '', onOutput, maxOutput = 200000, argv = ['program'], env = {}, files = {}, screen = {} }) {
    let loopIndex = null;
    let app;
    const screenEnv = {
      screen_show(ptr) {
        if (!screen.show) return;
        app.mem.check();
        const src = new Uint8Array(app.mem.buffer, ptr, SCREEN_W * SCREEN_H * 4);
        const rgba = new Uint8ClampedArray(SCREEN_W * SCREEN_H * 4);
        for (let i = 0; i < rgba.length; i += 4) {
          // 0x00RRGGBB stored little-endian: B, G, R, 0
          rgba[i] = src[i + 2];
          rgba[i + 1] = src[i + 1];
          rgba[i + 2] = src[i];
          rgba[i + 3] = 255;
        }
        screen.show(rgba);
      },
      screen_loop(index) { loopIndex = index; },
      screen_buttons() { return screen.buttons ? screen.buttons() & 0xFF : 0; },
    };
    env = Object.assign(screenEnv, env);
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
    try {
      const module = wasm instanceof WebAssembly.Module ? wasm : await WebAssembly.compile(wasm);
      app = new App(module, memfs, argv, env, files);
      await app.ready;
    } catch (e) {
      return { exitCode: null, trap: 'The program could not be started: ' + (e && e.message), stdout, stderr, truncated };
    }
    try {
      const exitCode = await app.run();
      return { exitCode, stdout, stderr, truncated, app, loopIndex };
    } catch (e) {
      if (truncated) return { exitCode: null, stdout, stderr, truncated };
      return { exitCode: null, trap: explainTrap(e && e.message), rawTrap: String(e && e.message), stdout, stderr, truncated };
    }
  }

  // Runs one frame of a program that called screen_loop. Throws on a trap.
  function callLoop(result) {
    const table = result.app.exports.__indirect_function_table;
    table.get(result.loopIndex)();
  }

  global.OpcodeProgram = { runProgram, callLoop, explainTrap, SCREEN_W, SCREEN_H };
})(typeof self !== 'undefined' ? self : globalThis);
