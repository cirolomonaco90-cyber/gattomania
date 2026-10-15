/*
 * Gattomania - motore del puzzle.
 * Regole: griglia N x N divisa in N zone colorate. Va messo esattamente
 * un gatto in ogni riga, in ogni colonna e in ogni zona. Due gatti non
 * possono toccarsi, nemmeno in diagonale.
 *
 * Il generatore e' deterministico (seed): lo stesso seed produce sempre lo
 * stesso livello su qualsiasi telefono. Serve per il "gatto del giorno",
 * cosi' tutti giocano lo stesso puzzle e possono confrontarsi.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Generatore pseudo-casuale con seed (mulberry32): solo operazioni intere,
  // quindi identico su ogni dispositivo.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rand) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // Una soluzione e' una permutazione p (p[riga] = colonna) in cui righe
  // consecutive non hanno colonne adiacenti (|p[r]-p[r+1]| > 1).
  function randomSolution(n, rand) {
    var cols = [], used = [];
    function go(r) {
      if (r === n) return true;
      var order = [];
      for (var c = 0; c < n; c++) order.push(c);
      shuffle(order, rand);
      for (var k = 0; k < n; k++) {
        var c2 = order[k];
        if (used[c2]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c2) <= 1) continue;
        used[c2] = true; cols[r] = c2;
        if (go(r + 1)) return true;
        used[c2] = false;
      }
      return false;
    }
    return go(0) ? cols : null;
  }

  // Fa crescere N zone connesse, ognuna a partire da una cella della soluzione.
  function growRegions(n, solution, rand) {
    var reg = [], r, c;
    for (r = 0; r < n; r++) { reg.push([]); for (c = 0; c < n; c++) reg[r].push(-1); }
    var frontier = [];
    function push(rr, cc, id) {
      if (rr < 0 || cc < 0 || rr >= n || cc >= n || reg[rr][cc] !== -1) return;
      frontier.push([rr, cc, id]);
    }
    for (r = 0; r < n; r++) {
      reg[r][solution[r]] = r;
    }
    for (r = 0; r < n; r++) {
      var cc = solution[r];
      push(r - 1, cc, r); push(r + 1, cc, r); push(r, cc - 1, r); push(r, cc + 1, r);
    }
    var left = n * n - n;
    while (left > 0 && frontier.length) {
      var idx = Math.floor(rand() * frontier.length);
      var item = frontier[idx];
      frontier[idx] = frontier[frontier.length - 1];
      frontier.pop();
      if (reg[item[0]][item[1]] !== -1) continue;
      reg[item[0]][item[1]] = item[2];
      left--;
      push(item[0] - 1, item[1], item[2]); push(item[0] + 1, item[1], item[2]);
      push(item[0], item[1] - 1, item[2]); push(item[0], item[1] + 1, item[2]);
    }
    return reg;
  }

  // Conta le soluzioni (si ferma a "limit"). Per un livello valido deve essere 1.
  function countSolutions(n, regions, limit) {
    var colUsed = [], regUsed = [], pos = [], count = 0, i;
    for (i = 0; i < n; i++) { colUsed.push(false); regUsed.push(false); }
    function go(r) {
      if (count >= limit) return;
      if (r === n) { count++; return; }
      for (var c = 0; c < n; c++) {
        if (colUsed[c]) continue;
        var g = regions[r][c];
        if (regUsed[g]) continue;
        if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
        colUsed[c] = true; regUsed[g] = true; pos[r] = c;
        go(r + 1);
        colUsed[c] = false; regUsed[g] = false;
        if (count >= limit) return;
      }
    }
    go(0);
    return count;
  }

  // Le zone devono avere una dimensione sensata (niente zone da una sola
  // cella in livelli grandi, che sarebbero un regalo, ne' zone enormi).
  function regionSizesOk(n, regions) {
    var sizes = [], i, r, c;
    for (i = 0; i < n; i++) sizes.push(0);
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) sizes[regions[r][c]]++;
    var singles = 0;
    for (i = 0; i < n; i++) { if (sizes[i] === 1) singles++; if (sizes[i] > n * 2 + 2) return false; }
    return singles <= (n >= 7 ? 1 : 2);
  }

  // Sposta una cella di confine da una zona a un'altra vicina, mantenendo
  // le zone connesse. Serve a "riparare" i livelli con piu' soluzioni.
  function connectedWithout(n, regions, id, rx, cx) {
    var cells = [], r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (regions[r][c] === id && !(r === rx && c === cx)) cells.push([r, c]);
    if (!cells.length) return false;
    var seen = {}, stack = [cells[0]], count = 1;
    seen[cells[0][0] * n + cells[0][1]] = true;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (stack.length) {
      var cur = stack.pop();
      for (var d = 0; d < 4; d++) {
        var rr = cur[0] + dirs[d][0], cc = cur[1] + dirs[d][1];
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        if (regions[rr][cc] !== id || (rr === rx && cc === cx) || seen[rr * n + cc]) continue;
        seen[rr * n + cc] = true; count++; stack.push([rr, cc]);
      }
    }
    return count === cells.length;
  }

  function repair(n, regions, solution, rand, maxMoves) {
    var isSol = {}, r, c;
    for (r = 0; r < n; r++) isSol[r * n + solution[r]] = true;
    var best = countSolutions(n, regions, 400);
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var m = 0; m < maxMoves && best > 1; m++) {
      r = Math.floor(rand() * n); c = Math.floor(rand() * n);
      if (isSol[r * n + c]) continue;
      var d = dirs[Math.floor(rand() * 4)];
      var rr = r + d[0], cc = c + d[1];
      if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
      var from = regions[r][c], to = regions[rr][cc];
      if (from === to) continue;
      if (!connectedWithout(n, regions, from, r, c)) continue;
      regions[r][c] = to;
      var cnt = countSolutions(n, regions, 400);
      if (cnt <= best) best = cnt; else regions[r][c] = from;
    }
    return best;
  }

  function generate(n, seed) {
    var rand = rng(seed);
    for (var attempt = 0; attempt < 400; attempt++) {
      var sol = randomSolution(n, rand);
      if (!sol) continue;
      var regions = growRegions(n, sol, rand);
      var cnt = n <= 6 ? countSolutions(n, regions, 2) : repair(n, regions, sol, rand, 1500);
      if (cnt !== 1) continue;
      if (!regionSizesOk(n, regions)) continue;
      return { n: n, regions: regions, solution: sol, attempts: attempt + 1 };
    }
    return null;
  }

  // Progressione dei livelli: la griglia cresce piano piano (5x5 -> 9x9 entro il livello 20),
  // poi si alternano griglie grandi e qualche "respiro" piu' piccolo per non stancare.
  function sizeForLevel(level) {
    if (level <= 20) return Math.min(9, 5 + Math.floor((level - 1) / 5));
    var cycle = [9, 8, 9, 7, 9, 9, 8, 9, 6, 9];
    return cycle[(level - 21) % cycle.length];
  }
  function seedForLevel(level) { return (level * 7919 + 104729) >>> 0; }

  function levelPuzzle(level) {
    var p = generate(sizeForLevel(level), seedForLevel(level));
    if (p) p.level = level;
    return p;
  }

  // Gatto del giorno: stessa data => stesso puzzle per tutti. Dimensione 6-9.
  function dayNumber(date) {
    var d = date || new Date();
    return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  }
  function dailyPuzzle(date) {
    var day = dayNumber(date);
    var n = 6 + (day % 4); // 6,7,8,9 a rotazione
    var p = generate(n, (day * 2654435761) >>> 0);
    if (p) p.day = day;
    return p;
  }

  // Controllo di una situazione di gioco. cats = matrice n x n di booleani.
  // Restituisce le celle in conflitto e se il puzzle e' risolto.
  function check(n, regions, cats) {
    var conflict = [], r, c, i, j;
    for (r = 0; r < n; r++) { conflict.push([]); for (c = 0; c < n; c++) conflict[r].push(false); }
    var list = [];
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (cats[r][c]) list.push([r, c]);
    for (i = 0; i < list.length; i++) {
      for (j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        var bad = a[0] === b[0] || a[1] === b[1] ||
          regions[a[0]][a[1]] === regions[b[0]][b[1]] ||
          (Math.abs(a[0] - b[0]) <= 1 && Math.abs(a[1] - b[1]) <= 1);
        if (bad) { conflict[a[0]][a[1]] = true; conflict[b[0]][b[1]] = true; }
      }
    }
    var anyConflict = false;
    for (i = 0; i < list.length; i++) if (conflict[list[i][0]][list[i][1]]) anyConflict = true;
    return { conflict: conflict, count: list.length, solved: list.length === n && !anyConflict };
  }

  return {
    rng: rng, generate: generate, countSolutions: countSolutions, check: check,
    levelPuzzle: levelPuzzle, dailyPuzzle: dailyPuzzle, dayNumber: dayNumber,
    sizeForLevel: sizeForLevel, seedForLevel: seedForLevel
  };
});
