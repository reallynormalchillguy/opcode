/* Opcode — cartridges (.nes files) the learner loads, kept in this browser.
   Uses IndexedDB because ROMs can be far bigger than localStorage allows.
   If storage is unavailable, ROMs last for this visit only. */
(function () {
  'use strict';

  const DB = 'opcode';
  const STORE = 'roms';
  const KEEP = 8; // most recent ROMs kept
  const memory = new Map(); // name -> { name, bytes, added }

  function open() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(DB, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'name' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const result = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
      t.onerror = () => reject(t.error);
    });
  }

  async function list() {
    try {
      const all = await tx('readonly', (s) => s.getAll());
      for (const r of all || []) memory.set(r.name, r);
    } catch (e) { /* memory only */ }
    return [...memory.values()].sort((a, b) => b.added - a.added).map((r) => r.name);
  }

  async function get(name) {
    if (memory.has(name)) return memory.get(name).bytes;
    try {
      const r = await tx('readonly', (s) => s.get(name));
      if (r) { memory.set(name, r); return r.bytes; }
    } catch (e) { /* not stored */ }
    return null;
  }

  async function put(name, bytes) {
    const rec = { name, bytes, added: Date.now() };
    memory.set(name, rec);
    try {
      await tx('readwrite', (s) => s.put(rec));
      const names = await list();
      for (const old of names.slice(KEEP)) {
        memory.delete(old);
        await tx('readwrite', (s) => s.delete(old));
      }
    } catch (e) { /* memory only */ }
  }

  function isINes(bytes) {
    return bytes.length >= 16 && bytes[0] === 0x4E && bytes[1] === 0x45 && bytes[2] === 0x53 && bytes[3] === 0x1A;
  }

  // Delete every stored cartridge.
  async function clear() {
    memory.clear();
    try { await tx('readwrite', (s) => s.clear()); } catch (e) { /* nothing stored */ }
  }

  window.RomStore = { list, get, put, clear, isINes };
})();
