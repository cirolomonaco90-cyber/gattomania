/*
 * Mostrilli - interfaccia e logica di gioco.
 * Il motore (engine.js) decide i livelli; qui c'e' tutto cio' che si vede e si sente:
 * home, plancia, animazioni, suoni, mostro del giorno, condivisione e pubblicita'.
 */
(function () {
  'use strict';

  var E = window.Engine, C = window.Creatures;
  var PLAY_URL = 'https://play.google.com/store/apps/details?id=it.mostrilli.app';
  var PRIVACY_URL = 'https://cirolomonaco90-cyber.github.io/gattomania/privacy.html';
  var VERSION = '1.0';
  var Native = window.Android || null; // ponte verso l'app Android (AdMob, vibrazione, condivisione)
  var DAILY_EPOCH = E.dayNumber(new Date(2026, 9, 1));

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }

  /* ------------------------------------------------------------------ testi */
  var I18N = {
    it: {
      tagline: 'Il puzzle dei mostriciattoli', play: 'Gioca', level: 'Livello {n}',
      daily: 'Mostro del giorno', dailyNew: 'NUOVO', dailyDone: 'Fatto ✓ {t}', dailyN: 'Mostro del giorno #{n}',
      how: 'Come si gioca', undo: 'Indietro', hint: 'Aiuto', restart: 'Ricomincia',
      rulesTitle: 'Come si gioca',
      rules: 'Metti **1 mostrillo** in ogni riga, in ogni colonna e in ogni zona colorata. Due mostrilli non possono toccarsi, nemmeno in diagonale!',
      tapRule: 'Tocca una volta per segnare ✕ (qui non c\'è), due volte per mettere il mostrillo.',
      letsgo: 'Si parte!', close: 'Chiudi',
      praise: ['Fantastico!', 'Bravissimo!', 'Che mente!', 'Perfetto!', 'Mitico!'],
      time: 'Tempo', next: 'Avanti', share: 'Condividi', home: 'Home', streakTxt: '🔥 {n} giorni di fila!',
      noHints: 'Finiti gli aiuti!', noHintsTxt: 'Guarda un breve video per ricevere 3 aiuti.',
      watch: '📺 Guarda: +3 aiuti', nothanks: 'No grazie',
      gotHints: '+3 aiuti!', adNotReady: 'Video non disponibile, riprova tra poco',
      settings: 'Impostazioni', sound: 'Suoni', haptics: 'Vibrazione', privacy: 'Informativa sulla privacy',
      consent: 'Gestisci consenso pubblicità', copied: 'Copiato! Incollalo dove vuoi', restartQ: 'Ricominciare questo livello?',
      yes: 'Sì', no: 'No', fakeAd: 'Pubblicità di prova', hintDone: 'Mostrillo sbagliato tolto!',
      shareDaily: 'Mostrilli 🔥 Mostro del giorno #{n}', shareLevel: 'Mostrilli – Livello {n}',
      shareLine: '⏱ {t}  {s}', shareCta: 'Riesci a fare meglio? 👇', collected: 'Mostrilli trovati'
    },
    en: {
      tagline: 'The cute monster puzzle', play: 'Play', level: 'Level {n}',
      daily: 'Daily Monster', dailyNew: 'NEW', dailyDone: 'Done ✓ {t}', dailyN: 'Daily Monster #{n}',
      how: 'How to play', undo: 'Undo', hint: 'Hint', restart: 'Restart',
      rulesTitle: 'How to play',
      rules: 'Place **1 monster** in every row, every column and every color zone. No two monsters can touch, not even diagonally!',
      tapRule: 'Tap once to mark ✕ (not here), twice to place a monster.',
      letsgo: "Let's go!", close: 'Close',
      praise: ['Awesome!', 'Brilliant!', 'Big brain!', 'Perfect!', 'Legend!'],
      time: 'Time', next: 'Next', share: 'Share', home: 'Home', streakTxt: '🔥 {n}-day streak!',
      noHints: 'Out of hints!', noHintsTxt: 'Watch a short video to get 3 hints.',
      watch: '📺 Watch: +3 hints', nothanks: 'No thanks',
      gotHints: '+3 hints!', adNotReady: 'Video not available, try again soon',
      settings: 'Settings', sound: 'Sound', haptics: 'Vibration', privacy: 'Privacy policy',
      consent: 'Manage ad consent', copied: 'Copied! Paste it anywhere', restartQ: 'Restart this level?',
      yes: 'Yes', no: 'No', fakeAd: 'Test ad', hintDone: 'Wrong monster removed!',
      shareDaily: 'Mostrilli 🔥 Daily Monster #{n}', shareLevel: 'Mostrilli – Level {n}',
      shareLine: '⏱ {t}  {s}', shareCta: 'Can you beat it? 👇', collected: 'Monsters found'
    }
  };

  /* -------------------------------------------------------------- salvataggi */
  var KEY = 'mostrilli_v1';
  function defaults() {
    return { level: 1, stars: {}, wins: 0, sinceAd: 0, streak: 0, lastDaily: -1, daily: {}, hints: 3,
      sound: true, haptics: true, seenTutorial: false, saves: {}, lang: null, noAds: false };
  }
  var S = (function () {
    var d = defaults();
    try { var j = JSON.parse(localStorage.getItem(KEY)); if (j) for (var k in j) d[k] = j[k]; } catch (e) { /* primo avvio */ }
    return d;
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage non disponibile */ } }

  var lang = S.lang || (((navigator.language || 'it').slice(0, 2) === 'it') ? 'it' : 'en');
  function t(k, v) {
    var s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
    if (typeof s === 'string' && v) for (var x in v) s = s.split('{' + x + '}').join(v[x]);
    return s;
  }
  function rich(s) { return s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
  function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function today() { return E.dayNumber(new Date()); }
  function currentStreak() { return S.lastDaily >= today() - 1 ? S.streak : 0; }
  function totalStars() { var n = 0; for (var k in S.stars) n += S.stars[k]; return n; }

  /* ----------------------------------------------------------------- suoni */
  var AC = null;
  function ctx() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = false; } }
    if (AC && AC.state === 'suspended') AC.resume();
    return AC;
  }
  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!S.sound) return;
    var a = ctx(); if (!a) return;
    var t0 = a.currentTime + (delay || 0);
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var SFX = {
    mark: function () { tone(520, 0.07, 'triangle', 0.14, 380); },
    place: function (id) { var b = 330 + (id % 9) * 38; tone(b, 0.16, 'square', 0.1, b * 1.9); tone(b * 1.5, 0.2, 'sine', 0.12, b * 2.2, 0.05); },
    remove: function () { tone(500, 0.12, 'triangle', 0.13, 220); },
    bad: function () { tone(150, 0.22, 'sawtooth', 0.09, 90); },
    hint: function () { [660, 880, 1320].forEach(function (f, i) { tone(f, 0.14, 'sine', 0.13, 0, i * 0.07); }); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.28, 'triangle', 0.17, 0, i * 0.11); tone(f * 2, 0.2, 'sine', 0.06, 0, i * 0.11); }); },
    tap: function () { tone(700, 0.06, 'sine', 0.12, 900); }
  };
  function buzz(ms) {
    if (!S.haptics) return;
    if (Native && Native.vibrate) { try { Native.vibrate(ms); } catch (e) { /* ignora */ } }
    else if (navigator.vibrate) navigator.vibrate(ms);
  }

  /* -------------------------------------------------------------- pubblicita' */
  var rewardedCb = null;
  var Ads = {
    interstitial: function () {
      if (S.noAds) return;
      if (Native && Native.showInterstitial) { try { Native.showInterstitial(); } catch (e) { /* ignora */ } }
    },
    rewarded: function (cb) {
      if (Native && Native.showRewarded) { rewardedCb = cb; try { Native.showRewarded(); } catch (e) { rewardedCb = null; cb(false, 'error'); } return; }
      // Nel browser (anteprima di sviluppo) simula un video di 2 secondi.
      var d = document.createElement('div'); d.className = 'fakead'; d.textContent = t('fakeAd') + ' …';
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); cb(true); }, 2000);
    }
  };
  window.onRewardedResult = function (ok, reason) {
    var cb = rewardedCb; rewardedCb = null; if (cb) cb(!!ok, reason);
  };
  window.onAdHeight = function (px) {
    document.documentElement.style.setProperty('--ad-h', (px || 0) + 'px');
    setTimeout(fitBoard, 60);
  };

  /* ------------------------------------------------------------------- puzzle */
  function decode(str) {
    var p = str.split('|'), n = +p[0], regions = [], r;
    for (r = 0; r < n; r++) regions.push(p[1].substr(r * n, n).split('').map(Number));
    return { n: n, regions: regions, solution: p[2].split('').map(Number) };
  }
  function getLevel(level) {
    var P = window.PUZZLES;
    if (P && P.levels && P.levels.length) { var p = decode(P.levels[(level - 1) % P.levels.length]); p.seed = E.seedForLevel(level); return p; }
    var q = E.levelPuzzle(level); q.seed = E.seedForLevel(level); return q;
  }
  function getDaily(day) {
    var P = window.PUZZLES, i = P ? day - P.dailyStart : -1, p;
    if (P && P.daily && i >= 0 && i < P.daily.length) p = decode(P.daily[i]);
    else { var d = new Date(day * 86400000); p = E.dailyPuzzle(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
    p.seed = day * 977; return p;
  }
  // A ogni zona tocca un mostrillo diverso; l'assegnazione cambia da livello a livello.
  function creatureMap(n, seed) {
    var rand = E.rng(seed * 31 + 7), a = [0, 1, 2, 3, 4, 5, 6, 7, 8], i;
    for (i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
    return a.slice(0, n);
  }

  /* -------------------------------------------------------------------- stato */
  var G = null; // partita in corso
  var modals = [];
  var XSVG = '<svg class="xmark" viewBox="0 0 40 40"><path d="M9 9 L31 31 M31 9 L9 31" stroke="#2b2140" stroke-width="6" stroke-linecap="round" fill="none"/></svg>';

  function show(name) {
    $$('.screen').forEach(function (s) { s.classList.toggle('active', s.id === name); });
  }

  /* -------------------------------------------------------------------- sfondo */
  function buildBackground() {
    var bg = $('#bg'), h = '';
    for (var i = 0; i < 11; i++) {
      var left = Math.round((i * 53 + 7) % 92), top = Math.round((i * 37 + 11) % 88);
      h += '<div class="drift" style="left:' + left + '%;top:' + top + '%;animation-duration:' + (5 + (i % 5)) + 's;animation-delay:-' + (i % 4) + 's">' + C.svg(i % 9, 'idle') + '</div>';
    }
    bg.innerHTML = h;
  }

  /* ---------------------------------------------------------------------- home */
  function renderHome() {
    var day = today(), done = S.daily[day], streak = currentStreak();
    var order = [3, 0, 6, 1, 2], pos = [[2, 30], [22, 8], [38, 0], [60, 10], [78, 32]], par = '';
    order.forEach(function (idx, i) {
      var big = i === 2 ? 'width:112px;height:112px;' : '';
      par += '<div class="m" style="left:' + pos[i][0] + '%;top:' + pos[i][1] + 'px;animation-delay:-' + (i * 0.35) + 's;' + big + '">' + C.svg(idx, i === 2 ? 'happy' : 'idle') + '</div>';
    });
    $('#home').innerHTML =
      '<div class="topbar"><div class="pill" aria-label="streak">🔥 ' + streak + '</div><div class="pill">⭐ ' + totalStars() + '</div>' +
      '<button class="round" id="bSettings" aria-label="' + t('settings') + '">⚙️</button></div>' +
      '<div class="hero"><div class="parade">' + par + '</div><h1 class="logo">Mostrilli</h1><p class="tag">' + t('tagline') + '</p></div>' +
      '<div class="menu">' +
      '<button class="btn green" id="bPlay"><span>▶ ' + t('play') + '<span class="sub">' + t('level', { n: S.level }) + '</span></span></button>' +
      '<button class="btn orange" id="bDaily"><span>📅 ' + t('daily') + '<span class="sub">' + (done ? t('dailyDone', { t: fmt(done.time) }) : t('dailyN', { n: day - DAILY_EPOCH + 1 })) + '</span></span>' +
      (done ? '' : '<span class="badge">' + t('dailyNew') + '</span>') + '</button>' +
      '</div><div class="bottomrow"><button class="btn white small" id="bHow">❓ ' + t('how') + '</button></div>';
    $('#bPlay').onclick = function () { SFX.tap(); startGame('level', S.level); };
    $('#bDaily').onclick = function () { SFX.tap(); startGame('daily', today()); };
    $('#bHow').onclick = function () { SFX.tap(); showTutorial(); };
    $('#bSettings').onclick = function () { SFX.tap(); showSettings(); };
  }

  /* ------------------------------------------------------------------ partita */
  function saveKey(mode, id) { return mode + ':' + id; }

  function startGame(mode, id) {
    var puzzle = mode === 'daily' ? getDaily(id) : getLevel(id);
    var n = puzzle.n, cells = [], r, c;
    for (r = 0; r < n; r++) { cells.push([]); for (c = 0; c < n; c++) cells[r].push(0); }
    G = { mode: mode, id: id, n: n, regions: puzzle.regions, solution: puzzle.solution,
      map: creatureMap(n, puzzle.seed), cells: cells, hist: [], elapsed: 0, hintsUsed: 0,
      started: false, won: false, els: [], conf: null };
    var sv = S.saves[saveKey(mode, id)];
    if (sv && sv.cells && sv.cells.length === n * n) {
      for (var i = 0; i < n * n; i++) cells[Math.floor(i / n)][i % n] = +sv.cells.charAt(i);
      G.elapsed = sv.elapsed || 0; G.hintsUsed = sv.hintsUsed || 0; G.started = G.elapsed > 0;
    }
    renderGameShell();
    show('game');
    requestAnimationFrame(function () { fitBoard(); refreshAll(false); });
  }

  function renderGameShell() {
    var title = G.mode === 'daily' ? t('dailyN', { n: G.id - DAILY_EPOCH + 1 }) : t('level', { n: G.id });
    $('#game').innerHTML =
      '<div class="topbar"><button class="round" id="bBack" aria-label="' + t('home') + '">←</button><h2>' + title + '</h2>' +
      '<button class="round" id="bSet2" aria-label="' + t('settings') + '">⚙️</button></div>' +
      '<div class="timer" id="timer">0:00</div>' +
      '<div id="boardArea"><div class="board" id="board" style="--n:' + G.n + '"></div></div>' +
      '<div class="strip" id="strip"></div>' +
      '<div class="controls"><button class="btn blue" id="bUndo">↶ ' + t('undo') + '</button>' +
      '<button class="btn orange" id="bHint">💡 ' + t('hint') + '<span class="hcount" id="hcount">' + S.hints + '</span></button>' +
      '<button class="btn pink" id="bRestart">⟲</button></div>';
    var board = $('#board'), n = G.n, r, c, h = '';
    for (r = 0; r < n; r++) {
      G.els.push([]);
      for (c = 0; c < n; c++) {
        var reg = G.regions[r][c], cls = 'cell';
        if (c < n - 1 && G.regions[r][c + 1] !== reg) cls += ' br';
        if (r < n - 1 && G.regions[r + 1][c] !== reg) cls += ' bb';
        if (c === n - 1) cls += ' lastc';
        if (r === n - 1) cls += ' lastr';
        h += '<div class="' + cls + '" data-r="' + r + '" data-c="' + c + '" style="background-color:' + C.LIST[G.map[reg]].bg + '"></div>';
      }
    }
    board.innerHTML = h;
    $$('.cell', board).forEach(function (el) { G.els[+el.dataset.r][+el.dataset.c] = el; });
    board.addEventListener('pointerdown', function (ev) {
      var el = ev.target.closest('.cell'); if (!el) return;
      ev.preventDefault(); tapCell(+el.dataset.r, +el.dataset.c);
    });
    var s = '';
    for (var i = 0; i < n; i++) s += '<div class="chip" id="chip' + i + '" style="--bg:' + C.LIST[G.map[i]].bg + '">' + C.svg(G.map[i], 'idle') + '</div>';
    $('#strip').innerHTML = s;
    $('#bBack').onclick = function () { SFX.tap(); goHome(); };
    $('#bSet2').onclick = function () { SFX.tap(); showSettings(); };
    $('#bUndo').onclick = undo;
    $('#bHint').onclick = useHint;
    $('#bRestart').onclick = askRestart;
  }

  function fitBoard() {
    var area = $('#boardArea'), b = $('#board');
    if (!area || !b) return;
    var s = Math.floor(Math.min(area.clientWidth, area.clientHeight));
    if (s > 0) { b.style.width = s + 'px'; b.style.height = s + 'px'; }
  }
  window.addEventListener('resize', function () { setTimeout(fitBoard, 50); });

  function catsMatrix() {
    return G.cells.map(function (row) { return row.map(function (v) { return v === 2; }); });
  }

  // Aggiorna conflitti, espressioni, collezione in alto e controlla la vittoria.
  function refreshAll(popRC) {
    var res = E.check(G.n, G.regions, catsMatrix());
    G.conf = res.conflict;
    var r, c, newBad = false;
    for (r = 0; r < G.n; r++) for (c = 0; c < G.n; c++) {
      var wasBad = G.els[r][c].classList.contains('bad');
      renderCell(r, c, popRC && popRC[0] === r && popRC[1] === c);
      if (!wasBad && G.els[r][c].classList.contains('bad')) newBad = true;
    }
    if (newBad) { SFX.bad(); buzz(30); }
    var got = {};
    for (r = 0; r < G.n; r++) for (c = 0; c < G.n; c++) if (G.cells[r][c] === 2 && !G.conf[r][c]) got[G.regions[r][c]] = true;
    for (var i = 0; i < G.n; i++) { var chip = $('#chip' + i); if (chip) chip.classList.toggle('got', !!got[i]); }
    updTimer();
    var hc = $('#hcount'); if (hc) hc.textContent = S.hints;
    persist();
    if (res.solved && !G.won) win();
  }

  function renderCell(r, c, pop) {
    var el = G.els[r][c], v = G.cells[r][c];
    var mood = G.won ? 'happy' : (v === 2 && G.conf && G.conf[r][c] ? 'worried' : 'idle');
    var key = v + ':' + mood;
    if (el._key !== key) {
      el._key = key;
      el.innerHTML = v === 0 ? '' : v === 1 ? XSVG : C.svg(G.map[G.regions[r][c]], mood);
      if (v === 2 && pop) {
        el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
        setTimeout(function () { el.classList.remove('pop'); }, 450);
      }
    }
    el.classList.toggle('bad', v === 2 && mood === 'worried');
    el.setAttribute('aria-label', v === 2 ? 'mostrillo' : v === 1 ? 'x' : '');
  }

  function persist() {
    if (!G || G.won) return;
    var s = '';
    for (var r = 0; r < G.n; r++) for (var c = 0; c < G.n; c++) s += G.cells[r][c];
    S.saves[saveKey(G.mode, G.id)] = { cells: s, elapsed: G.elapsed, hintsUsed: G.hintsUsed };
    var keys = Object.keys(S.saves);
    while (keys.length > 6) delete S.saves[keys.shift()];
    save();
  }

  function tapCell(r, c) {
    if (!G || G.won) return;
    var prev = G.cells[r][c], next = (prev + 1) % 3;
    G.hist.push([r, c, prev]); G.started = true;
    G.cells[r][c] = next;
    if (next === 1) { SFX.mark(); buzz(8); }
    else if (next === 2) { SFX.place(G.map[G.regions[r][c]]); buzz(14); }
    else { SFX.remove(); }
    refreshAll(next === 2 ? [r, c] : false);
  }

  function undo() {
    if (!G || G.won || !G.hist.length) return;
    var h = G.hist.pop();
    G.cells[h[0]][h[1]] = h[2];
    SFX.remove(); buzz(8);
    refreshAll(false);
  }

  function askRestart() {
    if (!G || G.won) return;
    var m = openModal('<h3>' + t('restartQ') + '</h3><div class="row h"><button class="btn green small" id="mYes">' + t('yes') + '</button><button class="btn white small" id="mNo">' + t('no') + '</button></div>');
    $('#mNo', m).onclick = function () { closeModal(m); };
    $('#mYes', m).onclick = function () {
      closeModal(m);
      for (var r = 0; r < G.n; r++) for (var c = 0; c < G.n; c++) G.cells[r][c] = 0;
      G.hist = []; G.elapsed = 0; G.started = false; G.hintsUsed = 0;
      refreshAll(false);
    };
  }

  function useHint() {
    if (!G || G.won) return;
    if (S.hints <= 0) { offerRewarded(); return; }
    var r, c, wrong = [], missing = [];
    for (r = 0; r < G.n; r++) {
      var sc = G.solution[r];
      for (c = 0; c < G.n; c++) if (G.cells[r][c] === 2 && c !== sc) wrong.push([r, c]);
      if (G.cells[r][sc] !== 2) missing.push([r, sc]);
    }
    var target, removing = false;
    if (wrong.length) { target = wrong[Math.floor(Math.random() * wrong.length)]; removing = true; }
    else if (missing.length) target = missing[Math.floor(Math.random() * missing.length)];
    else return;
    G.hist.push([target[0], target[1], G.cells[target[0]][target[1]]]);
    G.cells[target[0]][target[1]] = removing ? 0 : 2;
    G.hintsUsed++; G.started = true; S.hints--;
    SFX.hint(); buzz(20);
    var el = G.els[target[0]][target[1]];
    el.classList.remove('hinted'); void el.offsetWidth; el.classList.add('hinted');
    refreshAll(removing ? false : target);
    if (removing) toast(t('hintDone'));
  }

  function offerRewarded() {
    var m = openModal('<h3>' + t('noHints') + '</h3><p>' + t('noHintsTxt') + '</p><div class="row">' +
      '<button class="btn orange" id="mWatch">' + t('watch') + '</button><button class="btn white small" id="mNo">' + t('nothanks') + '</button></div>');
    $('#mNo', m).onclick = function () { closeModal(m); };
    $('#mWatch', m).onclick = function () {
      closeModal(m);
      Ads.rewarded(function (ok, reason) {
        if (ok) { S.hints += 3; save(); var hc = $('#hcount'); if (hc) hc.textContent = S.hints; toast(t('gotHints')); SFX.hint(); }
        else toast(t('adNotReady'));
      });
    };
  }

  /* ------------------------------------------------------------------ timer */
  function updTimer() { var el = $('#timer'); if (el && G) el.textContent = '⏱ ' + fmt(G.elapsed); }
  (function () {
    var last = Date.now();
    setInterval(function () {
      var now = Date.now(), dt = now - last; last = now;
      if (!G || G.won || !G.started || document.hidden || modals.length) return;
      if (!$('#game').classList.contains('active')) return;
      G.elapsed += Math.min(dt, 500); updTimer();
      if (Math.floor(G.elapsed / 1000) % 5 === 0) persist();
    }, 250);
  })();
  document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });

  /* ----------------------------------------------------------------- vittoria */
  function starsFor() {
    var n = G.n, base = G.elapsed <= n * 13000 ? 3 : G.elapsed <= n * 28000 ? 2 : 1;
    if (G.hintsUsed >= 3) base = 1; else if (G.hintsUsed >= 1) base = Math.min(base, 2);
    return base;
  }

  function win() {
    G.won = true;
    var stars = starsFor(), key = G.mode === 'daily' ? 'D' + G.id : 'L' + G.id;
    S.stars[key] = Math.max(S.stars[key] || 0, stars);
    delete S.saves[saveKey(G.mode, G.id)];
    if (G.mode === 'level') { if (G.id === S.level) S.level = G.id + 1; S.wins++; S.sinceAd++; }
    else {
      S.daily[G.id] = { time: G.elapsed, stars: stars };
      if (S.lastDaily !== G.id) { S.streak = S.lastDaily === G.id - 1 ? S.streak + 1 : 1; S.lastDaily = G.id; }
    }
    save();
    var r, c, k = 0;
    for (r = 0; r < G.n; r++) for (c = 0; c < G.n; c++) {
      renderCell(r, c, false);
      if (G.cells[r][c] === 2) { G.els[r][c].style.setProperty('--d', (k++ * 0.09) + 's'); G.els[r][c].classList.add('dance'); }
    }
    SFX.win(); buzz(60);
    confetti();
    setTimeout(function () { showWin(stars); }, 1100);
  }

  function showWin(stars) {
    var praise = I18N[lang].praise[Math.floor(Math.random() * I18N[lang].praise.length)];
    var s = '';
    for (var i = 1; i <= 3; i++) s += '<span class="' + (i <= stars ? '' : 'off') + '">⭐</span>';
    var mons = '';
    G.map.slice(0, Math.min(G.n, 6)).forEach(function (idx, i) { mons += '<div class="wm" style="--d:' + (i * 0.1) + 's">' + C.svg(idx, 'happy') + '</div>'; });
    var extra = G.mode === 'daily' ? '<div class="bignum">' + t('streakTxt', { n: S.streak }) + '</div>' : '';
    var m = openModal('<h3>' + praise + '</h3><div class="stars">' + s + '</div><div class="winmons">' + mons + '</div>' +
      '<div class="bignum">' + t('time') + ' ' + fmt(G.elapsed) + '</div>' + extra +
      '<div class="row"><button class="btn green" id="mNext">' + (G.mode === 'level' ? t('next') + ' ▶' : t('home')) + '</button>' +
      '<button class="btn blue" id="mShare">📤 ' + t('share') + '</button>' +
      (G.mode === 'level' ? '<button class="btn white small" id="mHome">' + t('home') + '</button>' : '') + '</div>', { sticky: true });
    $('#mShare', m).onclick = shareResult;
    $('#mNext', m).onclick = function () {
      closeModal(m); interstitialIfDue();
      if (G.mode === 'level') startGame('level', S.level); else goHome();
    };
    var h = $('#mHome', m); if (h) h.onclick = function () { closeModal(m); interstitialIfDue(); goHome(); };
  }

  function interstitialIfDue() {
    if (S.sinceAd >= 3 && S.wins >= 3) { S.sinceAd = 0; save(); Ads.interstitial(); }
  }

  function shareResult() {
    var stars = starsFor(), s = '';
    for (var i = 1; i <= 3; i++) s += i <= stars ? '⭐' : '▫️';
    var head = G.mode === 'daily' ? t('shareDaily', { n: G.id - DAILY_EPOCH + 1 }) : t('shareLevel', { n: G.id });
    var grid = G.regions.map(function (row) { return row.map(function (g) { return C.LIST[G.map[g]].sq; }).join(''); }).join('\n');
    var text = head + '\n' + t('shareLine', { t: fmt(G.elapsed), s: s }) + '\n\n' + grid + '\n\n' + t('shareCta') + '\n' + PLAY_URL;
    if (Native && Native.share) { try { Native.share(text); return; } catch (e) { /* prova il resto */ } }
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(text); toast(t('copied')); } catch (e) { toast(text); }
  }

  /* ------------------------------------------------------------------ modali */
  function openModal(html, opts) {
    var ov = document.createElement('div'); ov.className = 'overlay';
    ov.innerHTML = '<div class="card">' + html + '</div>';
    ov._sticky = !!(opts && opts.sticky);
    ov.addEventListener('pointerdown', function (ev) { if (ev.target === ov && !ov._sticky) closeModal(ov); });
    $('#modal-root').appendChild(ov); modals.push(ov);
    return ov.firstChild;
  }
  function closeModal(card) {
    var ov = card.classList.contains('overlay') ? card : card.parentNode;
    var i = modals.indexOf(ov); if (i >= 0) modals.splice(i, 1);
    if (ov.parentNode) ov.parentNode.removeChild(ov);
  }
  function toast(msg) {
    var el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function showTutorial() {
    // Mini plancia 4x4 d'esempio: le zone sono A, B, C, D e c'e' un solo mostrillo per zona.
    var reg = [[0, 0, 1, 1], [0, 0, 1, 1], [2, 2, 3, 3], [2, 2, 3, 3]], sol = [1, 3, 0, 2], mon = [3, 0, 2, 6], h = '', r, c;
    for (r = 0; r < 4; r++) for (c = 0; c < 4; c++) {
      var cls = 'cell' + (c < 3 && reg[r][c + 1] !== reg[r][c] ? ' br' : '') + (r < 3 && reg[r + 1][c] !== reg[r][c] ? ' bb' : '') + (c === 3 ? ' lastc' : '') + (r === 3 ? ' lastr' : '');
      var has = sol[r] === c;
      h += '<div class="' + cls + (has ? ' pop' : '') + '" style="background-color:' + C.LIST[mon[reg[r][c]]].bg + '">' + (has ? C.svg(mon[reg[r][c]], 'happy') : '') + '</div>';
    }
    var m = openModal('<h3>' + t('rulesTitle') + '</h3><div class="board demo">' + h + '</div><p>' + rich(t('rules')) + '</p><p>' + t('tapRule') + '</p>' +
      '<div class="row"><button class="btn green" id="mOk">' + t('letsgo') + '</button></div>');
    $('#mOk', m).onclick = function () { SFX.tap(); closeModal(m); S.seenTutorial = true; save(); };
  }

  function privacyOptionsNeeded() {
    try { return !!(Native && Native.privacyOptionsRequired && Native.privacyOptionsRequired()); } catch (e) { return false; }
  }

  function showSettings() {
    function row(id, label, on) { return '<div class="toggle ' + (on ? 'on' : '') + '" id="' + id + '"><span>' + label + '</span><span class="sw"></span></div>'; }
    var m = openModal('<h3>' + t('settings') + '</h3>' + row('tSound', '🔊 ' + t('sound'), S.sound) + row('tHap', '📳 ' + t('haptics'), S.haptics) +
      '<a class="link" id="lPriv">' + t('privacy') + '</a>' + (privacyOptionsNeeded() ? '<a class="link" id="lCons">' + t('consent') + '</a>' : '') +
      '<a class="link" id="lLang">' + (lang === 'it' ? 'English' : 'Italiano') + '</a>' +
      '<div class="row"><button class="btn white small" id="mClose">' + t('close') + '</button></div><p style="font-size:13px;margin:10px 0 0;color:#9a8dbb">v' + VERSION + '</p>');
    $('#tSound', m).onclick = function () { S.sound = !S.sound; save(); this.classList.toggle('on', S.sound); if (S.sound) SFX.tap(); };
    $('#tHap', m).onclick = function () { S.haptics = !S.haptics; save(); this.classList.toggle('on', S.haptics); buzz(20); };
    $('#lPriv', m).onclick = function () { if (Native && Native.openUrl) Native.openUrl(PRIVACY_URL); else window.open(PRIVACY_URL, '_blank'); };
    var lc = $('#lCons', m); if (lc) lc.onclick = function () { Native.showPrivacyOptions(); };
    $('#lLang', m).onclick = function () { S.lang = lang === 'it' ? 'en' : 'it'; save(); lang = S.lang; closeModal(m); if (G && $('#game').classList.contains('active')) startGame(G.mode, G.id); else renderHome(); };
    $('#mClose', m).onclick = function () { closeModal(m); };
  }

  /* ------------------------------------------------------------------ navigazione */
  function goHome() {
    persist(); G = null; renderHome(); show('home');
  }
  // Il tasto "indietro" di Android chiama questa funzione: true = gestito qui.
  window.handleBack = function () {
    if (modals.length) { var top = modals[modals.length - 1]; if (!top._sticky) { closeModal(top); } return true; }
    if ($('#game').classList.contains('active')) { goHome(); return true; }
    return false;
  };

  /* ------------------------------------------------------------------ coriandoli */
  function confetti() {
    var cv = $('#confetti'), cx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    var cols = C.LIST.map(function (x) { return x.main; }).concat(['#ffffff', '#ffd23f']), ps = [], i;
    for (i = 0; i < 130; i++) ps.push({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * 0.45, vx: (Math.random() - .5) * 15, vy: -Math.random() * 16 - 4,
      s: 6 + Math.random() * 8, c: cols[i % cols.length], r: Math.random() * 6, vr: (Math.random() - .5) * .4, round: i % 3 === 0 });
    var t0 = performance.now();
    (function frame(now) {
      var dt = now - t0; cx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(function (p) {
        p.vy += .42; p.x += p.vx; p.y += p.vy; p.vx *= .992; p.r += p.vr;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.globalAlpha = Math.max(0, 1 - dt / 3400);
        if (p.round) { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, 7); cx.fill(); } else cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66);
        cx.restore();
      });
      if (dt < 3400) requestAnimationFrame(frame); else cx.clearRect(0, 0, cv.width, cv.height);
    })(t0);
  }

  /* ---------------------------------------------------------------------- avvio */
  buildBackground();
  renderHome();
  show('home');
  if (!S.seenTutorial) setTimeout(showTutorial, 500);

  // Solo per i collaudi automatici in browser.
  window.__gm = { state: function () { return G; }, S: S, startGame: startGame, tapCell: tapCell };
})();
