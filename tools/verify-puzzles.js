// Controlla TUTTI i puzzle pre-generati in puzzles.js: soluzione unica e valida.
// Uso: node tools/verify-puzzles.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const E = require('../app/src/main/assets/engine.js');

const code = fs.readFileSync(path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'puzzles.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(code, sandbox);
const P = sandbox.window.PUZZLES;

function decode(s) {
  const [n, reg, sol] = s.split('|');
  const N = +n;
  const regions = [];
  for (let r = 0; r < N; r++) regions.push(reg.substr(r * N, N).split('').map(Number));
  return { n: N, regions, solution: sol.split('').map(Number) };
}

let bad = 0;
function check(s, label) {
  const p = decode(s);
  if (E.countSolutions(p.n, p.regions, 2) !== 1) { console.log('non unica:', label); bad++; return; }
  const cats = p.solution.map((c) => Array.from({ length: p.n }, (_, k) => k === c));
  if (!E.check(p.n, p.regions, cats).solved) { console.log('soluzione non valida:', label); bad++; }
  const ids = new Set(p.regions.flat());
  if (ids.size !== p.n) { console.log('numero zone errato:', label); bad++; }
}
P.levels.forEach((s, i) => check(s, 'livello ' + (i + 1)));
P.daily.forEach((s, i) => check(s, 'giorno ' + (P.dailyStart + i)));
const sizes = {};
P.levels.forEach((s) => { const n = s.split('|')[0]; sizes[n] = (sizes[n] || 0) + 1; });
console.log('Livelli:', P.levels.length, '| Giorni:', P.daily.length, '| Per dimensione:', JSON.stringify(sizes));
console.log(bad === 0 ? 'TUTTI I PUZZLE SONO VALIDI' : 'ERRORI: ' + bad);
process.exit(bad ? 1 : 0);
