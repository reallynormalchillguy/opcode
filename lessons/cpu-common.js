/* Opcode — helpers shared by the three CPU lessons (13 to 15). */
(function () {
  'use strict';

  const D = window.CPU_DATA;

  const MODE_LABEL = {
    imp: 'Implied', acc: 'A', imm: '#$nn', zp: '$nn', zpx: '$nn,X', zpy: '$nn,Y',
    abs: '$nnnn', abx: '$nnnn,X', aby: '$nnnn,Y', ind: '($nnnn)', izx: '($nn,X)', izy: '($nn),Y', rel: 'Branch',
  };
  const MODE_ORDER = ['imp', 'acc', 'imm', 'zp', 'zpx', 'zpy', 'abs', 'abx', 'aby', 'ind', 'izx', 'izy', 'rel'];

  // An opcode grid: one row per instruction, one column per addressing mode.
  // Each cell shows the opcode and its cycles; "+" means one more cycle when
  // an index crosses into the next page.
  function opcodeTable(mnemonics, onlyModes) {
    const rows = mnemonics.map((mn) => [mn, D.opcodes.filter((o) => o[1] === mn && (!onlyModes || onlyModes.includes(o[2])))]);
    const used = MODE_ORDER.filter((m) => rows.some(([, ops]) => ops.some((o) => o[2] === m)));
    const head = `<tr><th>Instruction</th>${used.map((m) => `<th>${MODE_LABEL[m]}</th>`).join('')}</tr>`;
    const body = rows.map(([mn, ops]) => {
      const cells = used.map((m) => {
        const o = ops.find((x) => x[2] === m);
        if (!o) return '<td></td>';
        const hex = o[0].toString(16).toUpperCase().padStart(2, '0');
        const cyc = m === 'rel' ? '2+' : `${o[3]}${o[4] ? '+' : ''}`;
        return `<td><code>${hex}</code><span class="op-cyc">${cyc}</span></td>`;
      }).join('');
      return `<tr><th>${mn}</th>${cells}</tr>`;
    }).join('');
    return `<div class="op-table-wrap"><table class="op-table">${head}${body}</table></div>`;
  }

  // A project exercise for CPU stage `stage` (see tools/ref6502).
  function exercise(opts) {
    const stage = opts.stage;
    const nestest = stage === 12;
    const main = nestest ? D.files['nestest-main.cpp'] : stage >= 11 ? D.files['bench-nmi.cpp'] : D.files['bench.cpp'];
    const before = D.stages[String(Math.min(stage, 12) - 1)] || D.stages['11'];
    const after = nestest ? D.stages['11'] : D.stages[String(stage)];
    const ex = {
      id: opts.id,
      title: opts.title,
      prompt: opts.prompt,
      project: {
        course: {
          'main.cpp': main,
          'bus.h': D.files['bus.h'],
          'trace.h': D.files['trace.h'],
          'trace.cpp': D.files['trace.cpp'],
        },
        learner: {
          'cpu.cpp': { starter: nestest ? D.stages['11'] : before },
          'cpu.h': { starter: D.files['cpu.h'] },
          'bus.cpp': { starter: D.busCpp },
        },
        open: 'cpu.cpp',
      },
      stdin: opts.stdin != null ? opts.stdin : D.tests[String(stage)][0].stdin,
      tests: D.tests[String(stage)].map((t) => Object.assign({}, t, nestest ? { timeoutMs: 20000 } : {})),
      hints: opts.hints,
      solution: { 'cpu.cpp': after },
    };
    if (nestest) {
      ex.data = { 'nestest.nes': 'nes/nestest.nes', 'nestest.log': 'nes/nestest-official.log' };
      ex.starterMayPass = true;
    }
    if (opts.rules) ex.rules = opts.rules;
    return ex;
  }

  window.CpuLesson = { opcodeTable, exercise, data: D };
})();
