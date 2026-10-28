/*
 * Opcode — clang + lld driver. Compiles a set of C files to a wasm program.
 * Runs inside a Web Worker (compile-worker.js) and in Node for tests.
 */

(function (global) {
  'use strict';

  const { MemFS, App, untar, fetchBytes } = global.OpcodeWasi;

  const CLANG_ARGS = [
    '-disable-free',
    '-isysroot', '/',
    '-internal-isystem', '/include',
    '-internal-isystem', '/lib/clang/8.0.1/include',
    '-ferror-limit', '19',
    '-fmessage-length', '0',
    '-fcolor-diagnostics',
    // Uninitialised globals are "common" symbols by default in Clang 8,
    // which its WebAssembly backend cannot handle. Newer compilers default
    // to -fno-common too.
    '-fno-common',
  ];

  // C++ looks in libc++'s headers first; they wrap the C ones.
  const CXX_ARGS = ['-internal-isystem', '/include/c++/v1'];
  const DEFAULT_OPT = '-O2';

  // The standard headers most programs use, compiled once when the compiler
  // loads (a "precompiled header"). Reading <iostream> and friends takes
  // most of a C++ build; with this, a build takes a fraction of a second.
  const PCH_HEADERS = ['iostream', 'iomanip', 'string', 'vector', 'array', 'map', 'memory', 'algorithm', 'utility',
    'functional', 'cstdint', 'cstdio', 'cstdlib', 'cstring', 'cmath'];
  const PCH_SOURCE = PCH_HEADERS.map((h) => `#include <${h}>\n`).join('');

  class Toolchain {
    // base: URL prefix where the compiler files live.
    // onStatus: (text, fraction|null) => void
    constructor(base, onStatus = () => {}) {
      this.base = base;
      this.onStatus = onStatus;
      this.buildCount = 0;
      this.output = [];
      this.decoder = new TextDecoder();
      this.ready = this.load();
    }

    async load() {
      const files = [
        ['memfs.wasm', 0.02],
        ['sysroot.tar.gz', 0.03],
        ['clang.wasm.gz', 0.58],
        ['lld.wasm.gz', 0.37],
      ];
      const sizes = { 'memfs.wasm': 345442, 'sysroot.tar.gz': 1774321, 'clang.wasm.gz': 10519136, 'lld.wasm.gz': 6705467 };
      let doneWeight = 0;
      const bytes = {};
      for (const [name, weight] of files) {
        this.onStatus('Downloading the C++ compiler', doneWeight);
        bytes[name] = await fetchBytes(this.base + name, (got, total) => {
          const t = total || sizes[name];
          this.onStatus('Downloading the C++ compiler', doneWeight + weight * Math.min(1, got / t));
        });
        doneWeight += weight;
      }
      this.onStatus('Preparing the compiler', 1);
      const [memfsMod, clangMod, lldMod] = await Promise.all([
        WebAssembly.compile(bytes['memfs.wasm']),
        WebAssembly.compile(bytes['clang.wasm.gz']),
        WebAssembly.compile(bytes['lld.wasm.gz']),
      ]);
      this.memfsModule = memfsMod;
      this.clang = clangMod;
      this.lld = lldMod;
      this.sysroot = bytes['sysroot.tar.gz'];
      await this.freshFileSystem();
      this.onStatus('Preparing the C++ library', 1);
      await this.makePch();
      this.onStatus('Compiler ready', null);
    }

    async makePch() {
      this.memfs.addFile('opcode-std.h', PCH_SOURCE);
      const r = await this.tool(this.clang, [
        'clang', '-cc1', '-emit-pch', ...CXX_ARGS, ...CLANG_ARGS, DEFAULT_OPT, '-std=c++17',
        '-x', 'c++-header', 'opcode-std.h', '-o', 'opcode-std.pch',
      ]);
      this.pch = r.code === 0 ? this.memfs.getFileContents('opcode-std.pch').slice() : null;
    }

    // The in-memory file system has a fixed number of file slots and no
    // cheap way to delete, so it is rebuilt from the headers every so often.
    async freshFileSystem() {
      this.memfs = new MemFS(this.memfsModule, (b) => this.output.push(this.decoder.decode(b, { stream: true })));
      await this.memfs.ready;
      untar(this.sysroot, this.memfs);
      if (this.pch) {
        this.memfs.addFile('opcode-std.h', PCH_SOURCE);
        this.memfs.addFile('opcode-std.pch', this.pch);
      }
      // Functions the page provides to programs (screen.h).
      this.memfs.addFile('opcode.imports', 'screen_show\nscreen_loop\nscreen_buttons\nscreen_audio\n');
      this.buildsInFs = 0;
    }

    async tool(module, argv) {
      this.output = [];
      const app = new App(module, this.memfs, argv);
      let code;
      try {
        code = await app.run();
      } catch (e) {
        this.output.push(`\n[internal compiler error: ${e.message}]\n`);
        code = 1;
      }
      return { code, text: this.output.join('') };
    }

    // files: { 'main.c': '...', 'cpu.h': '...' }
    // Returns { ok, wasm?: Uint8Array, diagnostics: string, ms }
    async build(files, options = {}) {
      await this.ready;
      const t0 = Date.now();
      if (this.buildsInFs >= 24) await this.freshFileSystem();
      this.buildsInFs++;
      const dir = `w${++this.buildCount}`;
      this.memfs.addDirectory(dir);
      for (const [name, text] of Object.entries(files)) {
        this.memfs.addFile(`${dir}/${name}`, text);
      }
      const clean = (s) => s.split(`${dir}/`).join('');
      const sources = Object.keys(files).filter((n) => /\.(c|cpp)$/.test(n));
      if (sources.length === 0) {
        return { ok: false, diagnostics: 'There is no .cpp file to compile.\n', ms: 0 };
      }
      let diagnostics = '';
      const objects = [];
      const opt = options.opt || DEFAULT_OPT;
      for (const src of sources) {
        const cxx = src.endsWith('.cpp');
        const obj = `${dir}/${src.replace(/\.(c|cpp)$/, '.o')}`;
        const pch = cxx && this.pch && opt === DEFAULT_OPT ? ['-include-pch', 'opcode-std.pch'] : [];
        const r = await this.tool(this.clang, [
          'clang', '-cc1', '-emit-obj', ...(cxx ? CXX_ARGS : []), ...CLANG_ARGS, ...pch,
          '-I', dir, opt, cxx ? '-std=c++17' : '-std=c11', '-Wall', '-Wno-unused-variable', '-Wno-unused-function',
          ...(options.defines || []).map((d) => `-D${d}`),
          ...((options.fileDefines && options.fileDefines[src]) || []).map((d) => `-D${d}`),
          ...((options.fileFlags && options.fileFlags[src]) || []),
          '-o', obj, '-x', cxx ? 'c++' : 'c', `${dir}/${src}`,
        ]);
        diagnostics += clean(r.text);
        if (r.code !== 0) return { ok: false, diagnostics, ms: Date.now() - t0 };
        objects.push(obj);
      }
      const wasm = `${dir}/program.wasm`;
      const libdir = 'lib/wasm32-wasi';
      const r = await this.tool(this.lld, [
        'wasm-ld', '--no-threads',
        '-z', `stack-size=${options.stackSize || 1048576}`,
        `-L${libdir}`, `${libdir}/crt1.o`, ...objects,
        '-lc++', '-lc++abi', '-lc', '/lib/clang/8.0.1/lib/wasi/libclang_rt.builtins-wasm32.a',
        '--allow-undefined-file=opcode.imports',
        '--export-table',
        '-o', wasm,
      ]);
      diagnostics += clean(r.text);
      if (r.code !== 0) return { ok: false, diagnostics, ms: Date.now() - t0, linkError: true };
      const bytes = this.memfs.getFileContents(wasm);
      // This old linker can produce a broken program instead of an error when
      // a function is called with a different signature than it was defined
      // with (only possible across files). Catch that here.
      if (!WebAssembly.validate(bytes)) {
        diagnostics += 'error: a function is used with different parameters or return type than it was defined with. Check that every declaration (including the ones in header files) matches its definition exactly.\n';
        return { ok: false, diagnostics, ms: Date.now() - t0, linkError: true };
      }
      return { ok: true, wasm: bytes, diagnostics, ms: Date.now() - t0 };
    }
  }

  global.OpcodeToolchain = Toolchain;
})(typeof self !== 'undefined' ? self : globalThis);
