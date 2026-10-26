/* Opcode — run worker. One per program run, so a stuck program can be stopped. */
self.importScripts('wasi-runtime.js', 'program.js');

self.onmessage = async (event) => {
  const { memfsModule, wasm, stdin } = event.data;
  let buffer = '';
  let bufferFd = 1;
  let last = Date.now();
  const flush = () => {
    if (buffer) self.postMessage({ type: 'output', text: buffer, fd: bufferFd });
    buffer = '';
    last = Date.now();
  };
  let result;
  try {
    result = await self.OpcodeProgram.runProgram({
      memfsModule,
      wasm,
      stdin,
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
  delete result.stdout;
  delete result.stderr;
  self.postMessage({ type: 'done', result });
};
