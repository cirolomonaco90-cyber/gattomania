// Pre-genera i livelli cosi' l'app li carica all'istante (senza calcoli sul telefono).
// Uso: node tools/build-puzzles.js [numLivelli] [giorniDaily] [dataInizio ISO]
// Scrive app/src/main/assets/puzzles.js
const fs = require('fs');
const path = require('path');
const E = require('../app/src/main/assets/engine.js');

const LEVELS = parseInt(process.argv[2] || '300', 10);
const DAYS = parseInt(process.argv[3] || '800', 10);
const START = process.argv[4] ? new Date(process.argv[4]) : new Date('2026-10-01T12:00:00Z');

function enc(p) {
  return p.n + '|' + p.regions.map((r) => r.join('')).join('') + '|' + p.solution.join('');
}

const levels = [];
for (let l = 1; l <= LEVELS; l++) {
  const p = E.levelPuzzle(l);
  if (!p) throw new Error('livello non generato ' + l);
  levels.push(enc(p));
}
const startDay = E.dayNumber(new Date(START.getUTCFullYear(), START.getUTCMonth(), START.getUTCDate()));
const daily = [];
for (let d = 0; d < DAYS; d++) {
  const date = new Date(START.getUTCFullYear(), START.getUTCMonth(), START.getUTCDate() + d);
  const p = E.dailyPuzzle(date);
  if (!p) throw new Error('daily non generato ' + d);
  daily.push(enc(p));
}
const out = '/* Generato da tools/build-puzzles.js: non modificare a mano. */\n' +
  'window.PUZZLES = ' + JSON.stringify({ levels: levels, dailyStart: startDay, daily: daily }) + ';\n';
const file = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'puzzles.js');
fs.writeFileSync(file, out);
console.log('Scritti', levels.length, 'livelli e', daily.length, 'puzzle giornalieri,', (out.length / 1024).toFixed(0), 'KB');
