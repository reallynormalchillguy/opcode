/* Opcode — tiny C syntax highlighter for lesson code blocks. */
(function () {
  'use strict';

  const KEYWORDS = new Set(('auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false _Bool').split(' '));
  const TYPES = /^(u?int(8|16|32|64)_t|size_t|FILE|NULL)$/;

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const TOKEN = /(\/\/.*$)|(\/\*.*?\*\/)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b0[xX][0-9a-fA-F]+[uUlL]*\b|\b\d+(?:\.\d+)?[uUlLfF]*\b)|([A-Za-z_]\w*)|(\s+)|(.)/g;

  // Highlights one line of C. Returns HTML.
  function line(src) {
    if (/^\s*#/.test(src)) {
      const m = src.match(/^(\s*#\s*\w+)(.*)$/);
      if (m) return `<span class="tk-pre">${esc(m[1])}</span>${m[2] ? `<span class="tk-str">${esc(m[2])}</span>` : ''}`;
    }
    let out = '';
    let m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src)) !== null) {
      const [tok, lc, bc, str, chr, num, word] = m;
      if (lc || bc) out += `<span class="tk-com">${esc(tok)}</span>`;
      else if (str || chr) out += `<span class="tk-str">${esc(tok).replace(/(\\.|%[-+ 0#]*\d*(?:\.\d+)?(?:hh|h|ll|l|z)?[dicuxXfFeEgGspz%])/g, '<span class="tk-esc">$1</span>')}</span>`;
      else if (num) out += `<span class="tk-num">${esc(tok)}</span>`;
      else if (word && KEYWORDS.has(word)) out += `<span class="tk-key">${tok}</span>`;
      else if (word && TYPES.test(word)) out += `<span class="tk-type">${tok}</span>`;
      else if (word && src.slice(TOKEN.lastIndex).match(/^\s*\(/)) out += `<span class="tk-fn">${tok}</span>`;
      else out += esc(tok);
      if (TOKEN.lastIndex >= src.length) break;
    }
    return out;
  }

  window.Highlight = { line, esc };
})();
