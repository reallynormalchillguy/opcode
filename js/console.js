/* Opcode — console output with support for clang's ANSI colours. */
(function () {
  'use strict';

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Converts ANSI SGR sequences (bold, red, green...) to spans.
  function ansiToHtml(text) {
    let html = '';
    let open = 0;
    const parts = text.split(/\x1b\[([0-9;]*)m/);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { html += esc(parts[i]); continue; }
      const codes = parts[i].split(';').filter(Boolean).map(Number);
      while (open) { html += '</span>'; open--; }
      const cls = [];
      for (const c of codes) {
        if (c === 1) cls.push('a-bold');
        else if (c === 31 || c === 91) cls.push('a-red');
        else if (c === 32 || c === 92) cls.push('a-green');
        else if (c === 35 || c === 95) cls.push('a-magenta');
        else if (c === 36 || c === 96) cls.push('a-cyan');
        else if (c === 33 || c === 93) cls.push('a-yellow');
      }
      if (cls.length) { html += `<span class="${cls.join(' ')}">`; open++; }
    }
    while (open) { html += '</span>'; open--; }
    return html;
  }

  // Makes "main.c:4:29: error" clickable so it can jump to the line.
  function linkify(html) {
    return html.replace(/(^|\n|>)([\w.-]+\.[ch]):(\d+):(\d+):/g,
      (m, pre, file, line, col) => `${pre}<button class="loc" data-file="${file}" data-line="${line}" data-col="${col}">${file}:${line}:${col}</button>:`);
  }

  window.ConsoleView = { ansiToHtml, linkify, esc };
})();
