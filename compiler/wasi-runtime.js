/*
 * Opcode — WASI runtime for the in-browser C toolchain.
 *
 * Adapted from binji/wasm-clang (shared.js), Copyright 2020 WebAssembly
 * Community Group participants, licensed under the Apache License 2.0
 * (see LICENSE.wasm-clang). Changes: C-only, UTF-8 aware I/O, exit codes
 * returned instead of thrown, clock support, no canvas bindings.
 */

(function (global) {
  'use strict';

  const ESUCCESS = 0;
  const utf8 = new TextEncoder();

  class ProcExit extends Error {
    constructor(code) {
      super(`process exited with code ${code}`);
      this.code = code;
    }
  }

  function bindAll(obj, names) {
    const out = {};
    for (const name of names) out[name] = obj[name].bind(obj);
    return out;
  }

  function readCStr(u8, o, len = -1) {
    const end = len === -1 ? u8.length : o + len;
    let i = o;
    while (i < end && u8[i] !== 0) i++;
    return new TextDecoder().decode(u8.subarray(o, i));
  }

  class Memory {
    constructor(memory) {
      this.memory = memory;
      this.refresh();
    }
    refresh() {
      this.buffer = this.memory.buffer;
      this.u8 = new Uint8Array(this.buffer);
      this.u32 = new Uint32Array(this.buffer);
    }
    check() {
      if (this.buffer !== this.memory.buffer || this.buffer.byteLength === 0) this.refresh();
    }
    read32(o) { return this.u32[o >> 2]; }
    write8(o, v) { this.u8[o] = v; }
    write32(o, v) { this.u32[o >> 2] = v; }
    write64(o, lo, hi = 0) { this.write32(o, lo); this.write32(o + 4, hi); }
    readStr(o, len) { return readCStr(this.u8, o, len); }
    write(o, buf) {
      if (buf instanceof ArrayBuffer) buf = new Uint8Array(buf);
      else if (typeof buf === 'string') buf = utf8.encode(buf);
      new Uint8Array(this.buffer, o, buf.length).set(buf);
      return buf.length;
    }
    writeStr(o, str) {
      const n = this.write(o, str);
      this.write8(o + n, 0);
      return n + 1;
    }
  }

  // In-memory file system (itself a small wasm module) that also provides
  // the WASI file-descriptor functions used by clang, lld and user programs.
  class MemFS {
    constructor(module, hostWrite) {
      this.hostWrite = hostWrite; // (bytes: Uint8Array, fd: number) => void
      this.stdin = new Uint8Array(0);
      this.stdinPos = 0;
      this.hostMem = null;
      const env = bindAll(this, ['abort', 'host_write', 'host_read', 'memfs_log', 'copy_in', 'copy_out']);
      this.ready = WebAssembly.instantiate(module, { env }).then((instance) => {
        this.exports = instance.exports;
        this.mem = new Memory(this.exports.memory);
        this.exports.init();
      });
    }

    setStdin(str) {
      this.stdin = utf8.encode(str || '');
      this.stdinPos = 0;
    }

    addDirectory(path) {
      this.mem.check();
      const n = this.mem.write(this.exports.GetPathBuf(), path);
      this.exports.AddDirectoryNode(n);
    }

    addFile(path, contents) {
      if (typeof contents === 'string') contents = utf8.encode(contents);
      else if (contents instanceof ArrayBuffer) contents = new Uint8Array(contents);
      this.mem.check();
      const n = this.mem.write(this.exports.GetPathBuf(), path);
      const inode = this.exports.AddFileNode(n, contents.length);
      const addr = this.exports.GetFileNodeAddress(inode);
      this.mem.check();
      this.mem.write(addr, contents);
    }

    getFileContents(path) {
      this.mem.check();
      const n = this.mem.write(this.exports.GetPathBuf(), path);
      const inode = this.exports.FindNode(n);
      const addr = this.exports.GetFileNodeAddress(inode);
      const size = this.exports.GetFileNodeSize(inode);
      return new Uint8Array(this.mem.buffer, addr, size).slice();
    }

    abort() { throw new Error('memfs abort'); }

    host_write(fd, iovs, iovsLen, nwrittenOut) {
      const m = this.hostMem;
      m.check();
      let size = 0;
      const chunks = [];
      for (let i = 0; i < iovsLen; i++) {
        const buf = m.read32(iovs); iovs += 4;
        const len = m.read32(iovs); iovs += 4;
        chunks.push(m.u8.slice(buf, buf + len));
        size += len;
      }
      m.write32(nwrittenOut, size);
      const all = new Uint8Array(size);
      let o = 0;
      for (const c of chunks) { all.set(c, o); o += c.length; }
      this.hostWrite(all, fd);
      return ESUCCESS;
    }

    host_read(fd, iovs, iovsLen, nreadOut) {
      const m = this.hostMem;
      m.check();
      let size = 0;
      for (let i = 0; i < iovsLen; i++) {
        const buf = m.read32(iovs); iovs += 4;
        const len = m.read32(iovs); iovs += 4;
        const n = Math.min(len, this.stdin.length - this.stdinPos);
        if (n === 0) break;
        m.u8.set(this.stdin.subarray(this.stdinPos, this.stdinPos + n), buf);
        size += n;
        this.stdinPos += n;
        if (n !== len) break;
      }
      m.write32(nreadOut, size);
      return ESUCCESS;
    }

    memfs_log(buf, len) {
      this.mem.check();
      console.log(this.mem.readStr(buf, len));
    }

    copy_out(clangDst, memfsSrc, size) {
      this.hostMem.check();
      this.mem.check();
      new Uint8Array(this.hostMem.buffer, clangDst, size)
        .set(new Uint8Array(this.mem.buffer, memfsSrc, size));
    }

    copy_in(memfsDst, clangSrc, size) {
      this.mem.check();
      this.hostMem.check();
      new Uint8Array(this.mem.buffer, memfsDst, size)
        .set(new Uint8Array(this.hostMem.buffer, clangSrc, size));
    }
  }

  // One running WASI program (clang, lld, or the learner's program).
  class App {
    constructor(module, memfs, argv, extraImports = {}) {
      this.argv = argv;
      this.environ = { USER: 'opcode' };
      this.memfs = memfs;
      const wasi = bindAll(this, [
        'proc_exit', 'environ_sizes_get', 'environ_get', 'args_sizes_get',
        'args_get', 'random_get', 'clock_time_get', 'clock_res_get', 'poll_oneoff', 'sched_yield',
      ]);
      Object.assign(wasi, memfs.exports);
      const imports = { wasi_unstable: wasi, env: extraImports };
      this.ready = WebAssembly.instantiate(module, imports).then((instance) => {
        this.instance = instance;
        this.exports = instance.exports;
        this.mem = new Memory(this.exports.memory);
        this.memfs.hostMem = this.mem;
      });
    }

    // Runs _start. Resolves to the exit code; rejects on a trap.
    async run() {
      await this.ready;
      this.memfs.hostMem = this.mem;
      try {
        this.exports._start();
        return 0;
      } catch (e) {
        if (e instanceof ProcExit) return e.code;
        throw e;
      }
    }

    proc_exit(code) { throw new ProcExit(code); }

    environ_sizes_get(countOut, sizeOut) {
      this.mem.check();
      let size = 0;
      const names = Object.keys(this.environ);
      for (const n of names) size += utf8.encode(`${n}=${this.environ[n]}`).length + 1;
      this.mem.write32(countOut, names.length);
      this.mem.write32(sizeOut, size);
      return ESUCCESS;
    }

    environ_get(ptrs, buf) {
      this.mem.check();
      for (const n of Object.keys(this.environ)) {
        this.mem.write32(ptrs, buf); ptrs += 4;
        buf += this.mem.writeStr(buf, `${n}=${this.environ[n]}`);
      }
      this.mem.write32(ptrs, 0);
      return ESUCCESS;
    }

    args_sizes_get(argcOut, sizeOut) {
      this.mem.check();
      let size = 0;
      for (const a of this.argv) size += utf8.encode(a).length + 1;
      this.mem.write32(argcOut, this.argv.length);
      this.mem.write32(sizeOut, size);
      return ESUCCESS;
    }

    args_get(ptrs, buf) {
      this.mem.check();
      for (const a of this.argv) {
        this.mem.write32(ptrs, buf); ptrs += 4;
        buf += this.mem.writeStr(buf, a);
      }
      this.mem.write32(ptrs, 0);
      return ESUCCESS;
    }

    random_get(buf, len) {
      this.mem.check();
      const data = new Uint8Array(this.mem.buffer, buf, len);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 256) | 0;
      return ESUCCESS;
    }

    clock_time_get(clockId, precision, timeOut) {
      this.mem.check();
      // 0 = realtime, others = monotonic. Nanoseconds as a 64-bit value.
      const ms = clockId === 0 ? Date.now() : performance.now();
      const ns = BigInt(Math.floor(ms * 1e6));
      new DataView(this.mem.buffer).setBigUint64(timeOut, ns, true);
      return ESUCCESS;
    }

    clock_res_get(clockId, resOut) {
      this.mem.check();
      new DataView(this.mem.buffer).setBigUint64(resOut, 1000n, true);
      return ESUCCESS;
    }

    poll_oneoff() { return 52; /* ENOSYS */ }
    sched_yield() { return ESUCCESS; }
  }

  // Minimal tar reader (GNU format) for the sysroot.
  function untar(bytes, memfs) {
    let off = 0;
    const str = (len) => { const s = readCStr(bytes, off, len); off += len; return s; };
    const align = () => { off = (off + 511) & ~511; };
    while (off + 512 <= bytes.length) {
      const start = off;
      const name = str(100);
      if (!name) break;
      off = start + 124;
      const size = parseInt(str(12), 8) || 0;
      off = start + 156;
      const type = str(1);
      off = start + 345;
      const prefix = str(155);
      const path = prefix ? `${prefix}/${name}` : name;
      off = start + 512;
      if (type === '0' || type === '') {
        memfs.addFile(path, bytes.subarray(off, off + size));
        off += size;
        align();
      } else if (type === '5') {
        memfs.addDirectory(path.replace(/\/$/, ''));
      } else {
        off += size;
        align();
      }
    }
  }

  // Fetch a file that may be gzip-compressed. Works whether or not the
  // server already decoded it.
  async function fetchBytes(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download ${url} (${res.status})`);
    const total = Number(res.headers.get('content-length')) || 0;
    let received = 0;
    const reader = res.body.getReader();
    const parts = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      received += value.length;
      if (onProgress) onProgress(received, total);
    }
    let bytes = new Uint8Array(received);
    let o = 0;
    for (const p of parts) { bytes.set(p, o); o += p.length; }
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    return bytes;
  }

  global.OpcodeWasi = { Memory, MemFS, App, ProcExit, untar, fetchBytes };
})(typeof self !== 'undefined' ? self : globalThis);
