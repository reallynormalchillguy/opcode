/* Opcode — run worker. One per program run, so a stuck program can be stopped. */
self.importScripts('wasi-runtime.js', 'program.js');

let buttons = 0;
let started = false;

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'buttons') {
    buttons = msg.value;
    return;
  }
  if (started) return;
  started = true;
  const { memfsModule, wasm, stdin, files } = msg;

  let buffer = '';
  let bufferFd = 1;
  let last = Date.now();
  const flush = () => {
    if (buffer) self.postMessage({ type: 'output', text: buffer, fd: bufferFd });
    buffer = '';
    last = Date.now();
  };

  // Frames are sent at most once per animation frame; a program that shows
  // many frames in a row only shows the latest.
  let pendingFrame = null;
  let frameTimer = null;
  let framesShown = 0;
  const sendFrame = () => {
    frameTimer = null;
    if (!pendingFrame) return;
    self.postMessage({ type: 'frame', pixels: pendingFrame, count: framesShown }, [pendingFrame.buffer]);
    pendingFrame = null;
  };
  const screen = {
    show(rgba) {
      framesShown++;
      pendingFrame = rgba;
      if (!frameTimer) frameTimer = setTimeout(sendFrame, 0);
    },
    buttons: () => buttons,
    audio(samples) {
      self.postMessage({ type: 'audio', samples }, [samples.buffer]);
    },
  };

  let result;
  try {
    result = await self.OpcodeProgram.runProgram({
      memfsModule,
      wasm,
      stdin,
      files: files || {},
      screen,
      onOutput(text, fd) {
        if (fd !== bufferFd) { flush(); bufferFd = fd; }
        buffer += text;
        if (buffer.length > 4096 || Date.now() - last > 40) flush();
      },
    });
  } catch (e) {
    result = { exitCode: null, trap: 'The program could not run: ' + (e && e.message) };
  }
  flush();

  const finish = (r) => {
    flush();
    sendFrame();
    const out = Object.assign({}, r);
    delete out.app;
    delete out.stdout;
    delete out.stderr;
    out.framesShown = framesShown;
    self.postMessage({ type: 'done', result: out });
  };

  if (result.loopIndex == null || result.exitCode !== 0) {
    finish(result);
    return;
  }

  // The program called screen_loop(frame): call frame about 60 times a second
  // until the page stops this worker.
  self.postMessage({ type: 'looping' });
  const FRAME_MS = 1000 / 60;
  let next = performance.now();
  const tick = () => {
    try {
      self.OpcodeProgram.callLoop(result);
    } catch (e) {
      const limit = String(e && e.message).includes('__output_limit__');
      finish(limit ? { exitCode: null, truncated: true } : { exitCode: null, trap: self.OpcodeProgram.explainTrap(e && e.message) });
      return;
    }
    flush();
    self.postMessage({ type: 'tick' });
    next += FRAME_MS;
    const now = performance.now();
    if (next < now - 100) next = now; // fell behind: do not try to catch up
    setTimeout(tick, Math.max(0, next - now));
  };
  setTimeout(tick, 0);
};
