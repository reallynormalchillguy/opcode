/* Opcode — compile worker. Keeps clang + lld loaded between builds. */
self.importScripts('wasi-runtime.js', 'toolchain.js');

let toolchain = null;

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === 'init') {
    if (toolchain) return;
    toolchain = new self.OpcodeToolchain(msg.base, (text, fraction) => {
      self.postMessage({ type: 'status', text, fraction });
    });
    try {
      await toolchain.ready;
      self.postMessage({ type: 'ready', memfsModule: toolchain.memfsModule });
    } catch (e) {
      self.postMessage({ type: 'failed', error: String(e && e.message || e) });
    }
    return;
  }
  if (msg.type === 'build') {
    try {
      const result = await toolchain.build(msg.files, msg.options || {});
      const transfer = result.wasm ? [result.wasm.buffer] : [];
      self.postMessage({ type: 'built', id: msg.id, result }, transfer);
    } catch (e) {
      self.postMessage({ type: 'built', id: msg.id, result: { ok: false, diagnostics: `Internal error: ${e && e.message}\n` } });
    }
  }
};
