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
  ];

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
      const sizes = { 'memfs.wasm': 345442, 'sysroot.tar.gz': 587988, 'clang.wasm.gz': 10519136, 'lld.wasm.gz': 6705467 };
      let doneWeight = 0;
      const bytes = {};
      for (const [name, weight] of files) {
        this.onStatus('Downloading the C compiler', doneWeight);
        bytes[name] = await fetchBytes(this.base + name, (got, total) => {
          const t = total || sizes[name];
          this.onStatus('Downloading the C compiler', doneWeight + weight * Math.min(1, got / t));
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
      this.memfs = new MemFS(memfsMod, (b) => this.output.push(this.decoder.decode(b, { stream: true })));
      await this.memfs.ready;
      untar(bytes['sysroot.tar.gz'], this.memfs);
      this.onStatus('Compiler ready', null);
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
      const dir = `w${++this.buildCount}`;
      this.memfs.addDirectory(dir);
      for (const [name, text] of Object.entries(files)) {
        this.memfs.addFile(`${dir}/${name}`, text);
      }
      const clean = (s) => s.split(`${dir}/`).join('');
      const sources = Object.keys(files).filter((n) => n.endsWith('.c'));
      if (sources.length === 0) {
        return { ok: false, diagnostics: 'There is no .c file to compile.\n', ms: 0 };
      }
      let diagnostics = '';
      const objects = [];
      const opt = options.opt || '-O2';
      for (const src of sources) {
        const obj = `${dir}/${src.replace(/\.c$/, '.o')}`;
        const r = await this.tool(this.clang, [
          'clang', '-cc1', '-emit-obj', ...CLANG_ARGS,
          '-I', dir, opt, '-std=c11', '-Wall', '-Wno-unused-variable', '-Wno-unused-function',
          ...(options.defines || []).map((d) => `-D${d}`),
          '-o', obj, '-x', 'c', `${dir}/${src}`,
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
        '-lc', '/lib/clang/8.0.1/lib/wasi/libclang_rt.builtins-wasm32.a',
        ...(options.allowUndefinedFile ? [`--allow-undefined-file=${options.allowUndefinedFile}`] : []),
        '-o', wasm,
      ]);
      diagnostics += clean(r.text);
      if (r.code !== 0) return { ok: false, diagnostics, ms: Date.now() - t0, linkError: true };
      return { ok: true, wasm: this.memfs.getFileContents(wasm), diagnostics, ms: Date.now() - t0 };
    }
  }

  global.OpcodeToolchain = Toolchain;
})(typeof self !== 'undefined' ? self : globalThis);
