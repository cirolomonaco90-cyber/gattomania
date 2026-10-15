// Collaudo del motore: ogni livello deve avere UNA sola soluzione,
// essere deterministico e risolvibile. Uso: node tools/test-engine.js
const E = require('../app/src/main/assets/engine.js');
let fail = 0;
const t0 = Date.now();
let worst = 0;

function verify(p, label) {
  if (!p) { console.log('FALLITO (nessun puzzle):', label); fail++; return; }
  const n = p.n;
  if (E.countSolutions(n, p.regions, 2) !== 1) { console.log('soluzione non unica:', label); fail++; }
  const cats = p.solution.map((c) => Array.from({ length: n }, (_, k) => k === c));
  const res = E.check(n, p.regions, cats);
  if (!res.solved) { console.log('la soluzione dichiarata non risulta valida:', label); fail++; }
  // ogni zona ha esattamente un gatto nella soluzione
  const seen = new Set(p.solution.map((c, r) => p.regions[r][c]));
  if (seen.size !== n) { console.log('zone senza gatto:', label); fail++; }
  // zone connesse
  for (let id = 0; id < n; id++) {
    const cells = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (p.regions[r][c] === id) cells.push([r, c]);
    const key = (a) => a[0] + ',' + a[1];
    const set = new Set(cells.map(key)); const stack = [cells[0]]; const vis = new Set([key(cells[0])]);
    while (stack.length) {
      const [r, c] = stack.pop();
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const q = [r + dr, c + dc];
        if (set.has(key(q)) && !vis.has(key(q))) { vis.add(key(q)); stack.push(q); }
      }
    }
    if (vis.size !== cells.length) { console.log('zona non connessa:', label, id); fail++; }
  }
}

for (let level = 1; level <= 60; level++) {
  const t = Date.now();
  const p = E.levelPuzzle(level);
  worst = Math.max(worst, Date.now() - t);
  verify(p, 'livello ' + level);
  const again = E.levelPuzzle(level);
  if (JSON.stringify(p.regions) !== JSON.stringify(again.regions)) { console.log('non deterministico:', level); fail++; }
}
for (let d = 0; d < 40; d++) {
  const date = new Date(Date.UTC(2026, 9, 15 + d, 12));
  const t = Date.now();
  const p = E.dailyPuzzle(date);
  worst = Math.max(worst, Date.now() - t);
  verify(p, 'giorno +' + d);
}
console.log('Tempo totale ms:', Date.now() - t0, '| generazione peggiore ms:', worst);
console.log(fail === 0 ? 'TUTTO OK' : 'ERRORI: ' + fail);
process.exit(fail ? 1 : 0);
