// Node smoke test for the in-browser toolchain: node tests/toolchain.test.js
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'compiler');
globalThis.fetch = async (url) => new Response(fs.readFileSync(path.join(dir, path.basename(url))));
require(path.join(dir, 'wasi-runtime.js'));
require(path.join(dir, 'toolchain.js'));
require(path.join(dir, 'program.js'));

(async () => {
  let t = Date.now();
  const tc = new OpcodeToolchain('compiler/', (s, f) => {});
  await tc.ready;
  console.log('load ms', Date.now() - t);
  const cases = [
    { files: { 'main.c': '#include <stdio.h>\nint main(void){ printf("Hello, NES! ñ\\n"); double d=3.14159; printf("%.2f %lld %u\\n", d, (long long)1<<40, 0xFFu); return 0; }\n' } },
    { files: { 'main.c': '#include <stdio.h>\nint main(void){ int a,b; if(scanf("%d %d",&a,&b)!=2) return 3; printf("%d\\n", a+b); return 0; }\n' }, stdin: '20 22\n' },
    { files: { 'main.c': '#include <stdio.h>\nint main(void){ printf("hi\\n") return 0; }\n' } },
    { files: { 'main.c': '#include "add.h"\n#include <stdio.h>\nint main(void){ printf("%d\\n", add(2,3)); }\n', 'add.h': 'int add(int a, int b);\n', 'add.c': '#include "add.h"\nint add(int a,int b){return a+b;}\n' } },
    { files: { 'main.c': 'int f(int);\nint main(void){ return f(1); }\n' } },
    { files: { 'main.c': '#include <stdint.h>\n#include <stdio.h>\nint main(void){ int *p = (int*)0xFFFFFFF0; *p = 5; printf("%d", *p); }\n' } },
    { files: { 'main.c': '#include <stdlib.h>\n#include <stdio.h>\n#include <time.h>\nint main(void){ int *a=malloc(10000000*sizeof(int)); for(int i=0;i<10000000;i++)a[i]=i; long long s=0; for(int i=0;i<10000000;i++)s+=a[i]; printf("%lld %d\\n", s, (int)(clock()>=0)); free(a); return 7; }\n' } },
  ];
  for (const c of cases) {
    t = Date.now();
    const r = await tc.build(c.files);
    console.log('--- build ok=%s ms=%d', r.ok, Date.now() - t);
    if (r.diagnostics) console.log(JSON.stringify(r.diagnostics));
    if (r.ok) {
      const out = await OpcodeProgram.runProgram({ memfsModule: tc.memfsModule, wasm: r.wasm, stdin: c.stdin });
      console.log(JSON.stringify(out));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
