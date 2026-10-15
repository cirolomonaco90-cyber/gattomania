/*
 * I Mostrilli: nove creature originali, una per zona colorata.
 * Tutte disegnate in SVG (nessuna immagine esterna, l'app pesa pochissimo).
 * Ogni creatura ha: colore di sfondo della zona (bg), colore del corpo (main),
 * un accento (acc), l'emoji-quadrato usata nella condivisione e i nomi.
 */
(function (root) {
  'use strict';
  var INK = '#2b2140';

  var LIST = [
    { id: 'fiamma',  bg: '#FFC8C0', main: '#FF6B4A', acc: '#FFC93C', sq: '🟥', name: { it: 'Fiammì',     en: 'Flamy' } },
    { id: 'goccia',  bg: '#CDE8FF', main: '#3FA2F6', acc: '#BDE3FF', sq: '🟦', name: { it: 'Gocciolo',   en: 'Droppy' } },
    { id: 'foglia',  bg: '#D4F5C9', main: '#4CC35E', acc: '#A7E8A0', sq: '🟩', name: { it: 'Fogliolo',   en: 'Leafy' } },
    { id: 'scintilla', bg: '#FFF3B0', main: '#FFC933', acc: '#FFFFFF', sq: '🟨', name: { it: 'Scintillo', en: 'Sparky' } },
    { id: 'roccia',  bg: '#E6DDD2', main: '#A58B73', acc: '#7C9A5B', sq: '🟫', name: { it: 'Sassolo',    en: 'Rocky' } },
    { id: 'nuvola',  bg: '#E4E8FF', main: '#FFFFFF', acc: '#BFC8FF', sq: '⬜', name: { it: 'Nuvolo',     en: 'Cloudy' } },
    { id: 'ombra',   bg: '#E3D3F5', main: '#7E4BC9', acc: '#C9A8FF', sq: '🟪', name: { it: 'Ombrino',    en: 'Shady' } },
    { id: 'zucca',   bg: '#FFD592', main: '#FF9A2E', acc: '#4CC35E', sq: '🟧', name: { it: 'Zuccotto',   en: 'Pumpy' } },
    { id: 'carbone', bg: '#D3D3DE', main: '#3D3A4F', acc: '#FF8A3D', sq: '⬛', name: { it: 'Carbonino',  en: 'Sooty' } }
  ];

  function eyes(mood, ey, dark) {
    var s = '';
    if (mood === 'happy') {
      s += '<path d="M31 ' + (ey + 3) + ' Q38 ' + (ey - 9) + ' 45 ' + (ey + 3) + '" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>';
      s += '<path d="M55 ' + (ey + 3) + ' Q62 ' + (ey - 9) + ' 69 ' + (ey + 3) + '" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>';
      if (dark) {
        s = s.replace(/stroke="#2b2140"/g, 'stroke="#FFFFFF"');
      }
      return '<g class="eyes">' + s + '</g>';
    }
    var px = mood === 'worried' ? 0 : 1;
    [38, 62].forEach(function (cx) {
      s += '<ellipse cx="' + cx + '" cy="' + ey + '" rx="7.5" ry="8.5" fill="#fff" stroke="' + INK + '" stroke-width="2.5"/>';
      s += '<circle cx="' + (cx + px) + '" cy="' + (ey + 1.5) + '" r="4.2" fill="' + INK + '"/>';
      s += '<circle cx="' + (cx + px + 1.6) + '" cy="' + (ey - 0.6) + '" r="1.5" fill="#fff"/>';
    });
    if (mood === 'worried') {
      s += '<path d="M29 ' + (ey - 8) + ' L45 ' + (ey - 13) + '" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
      s += '<path d="M71 ' + (ey - 8) + ' L55 ' + (ey - 13) + '" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
    }
    return '<g class="eyes">' + s + '</g>';
  }

  function mouth(mood, ey, dark) {
    var ink = dark ? '#FFE3C2' : INK;
    if (mood === 'happy') {
      return '<path d="M40 ' + (ey + 14) + ' Q50 ' + (ey + 30) + ' 60 ' + (ey + 14) + ' Z" fill="#FF5C7A" stroke="' + ink + '" stroke-width="2.5" stroke-linejoin="round"/>';
    }
    if (mood === 'worried') {
      return '<path d="M43 ' + (ey + 20) + ' Q50 ' + (ey + 14) + ' 57 ' + (ey + 20) + '" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
    }
    return '<path d="M43 ' + (ey + 15) + ' Q50 ' + (ey + 22) + ' 57 ' + (ey + 15) + '" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
  }

  function blush(ey) {
    return '<ellipse cx="27" cy="' + (ey + 12) + '" rx="6" ry="3.6" fill="#FF7FA0" opacity=".55"/>' +
           '<ellipse cx="73" cy="' + (ey + 12) + '" rx="6" ry="3.6" fill="#FF7FA0" opacity=".55"/>';
  }

  function star(cx, cy, spikes, outer, inner) {
    var pts = [];
    for (var i = 0; i < spikes * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = Math.PI * i / spikes - Math.PI / 2;
      pts.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1));
    }
    return pts.join(' ');
  }

  var st = 'stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

  // Corpi: restituiscono {svg, ey, dark}
  var BODY = [
    function (c) { // Fiammì: tondo con ciuffo di fiamma
      return { ey: 58, svg:
        '<ellipse cx="38" cy="90" rx="10" ry="5" fill="' + c.main + '" ' + st + '/><ellipse cx="62" cy="90" rx="10" ry="5" fill="' + c.main + '" ' + st + '/>' +
        '<path d="M50 6 C58 20 70 24 63 38 C58 33 54 34 50 40 C46 34 42 33 37 38 C30 24 42 20 50 6Z" fill="' + c.acc + '" ' + st + '/>' +
        '<ellipse cx="50" cy="62" rx="33" ry="29" fill="' + c.main + '" ' + st + '/>' +
        '<ellipse cx="50" cy="76" rx="17" ry="11" fill="#FFD9A8" opacity=".9"/>' };
    },
    function (c) { // Gocciolo: goccia
      return { ey: 62, svg:
        '<path d="M50 5 C50 5 17 44 17 65 C17 83 31 95 50 95 C69 95 83 83 83 65 C83 44 50 5 50 5Z" fill="' + c.main + '" ' + st + '/>' +
        '<path d="M30 62 C30 52 36 44 42 38" fill="none" stroke="' + c.acc + '" stroke-width="6" stroke-linecap="round" opacity=".9"/>' };
    },
    function (c) { // Fogliolo: tondo con due foglie
      return { ey: 60, svg:
        '<path d="M50 32 C42 12 26 10 19 15 C22 27 34 35 50 32Z" fill="' + c.acc + '" ' + st + '/>' +
        '<path d="M50 32 C58 12 74 10 81 15 C78 27 66 35 50 32Z" fill="' + c.acc + '" ' + st + '/>' +
        '<circle cx="50" cy="63" r="32" fill="' + c.main + '" ' + st + '/>' +
        '<path d="M50 32 L50 22" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' };
    },
    function (c) { // Scintillo: palla di pelo elettrica a punte
      return { ey: 54, svg:
        '<polygon points="' + star(50, 54, 12, 44, 33) + '" fill="' + c.main + '" ' + st + '/>' +
        '<path d="M56 4 L43 24 L53 24 L46 40 L63 18 L52 18 Z" fill="#fff" ' + st + '/>' };
    },
    function (c) { // Sassolo: roccia con muschio
      return { ey: 56, svg:
        '<path d="M18 80 L12 52 L29 24 L58 15 L83 32 L90 62 L76 86 L40 90Z" fill="' + c.main + '" ' + st + '/>' +
        '<path d="M29 24 L40 36 M83 32 L70 40 M76 86 L68 72" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>' +
        '<path d="M29 24 L58 15 L64 26 C52 24 42 28 36 34Z" fill="' + c.acc + '" ' + st + '/>' };
    },
    function (c) { // Nuvolo: nuvola
      var circ = [[33, 62, 21], [52, 46, 25], [70, 60, 21], [50, 68, 23]];
      var out = '', fill = '';
      circ.forEach(function (k) {
        out += '<circle cx="' + k[0] + '" cy="' + k[1] + '" r="' + k[2] + '" fill="' + c.main + '" ' + st + '/>';
      });
      circ.forEach(function (k) {
        fill += '<circle cx="' + k[0] + '" cy="' + k[1] + '" r="' + (k[2] - 1.4) + '" fill="' + c.main + '"/>';
      });
      return { ey: 56, svg: out + fill +
        '<path d="M30 80 C42 90 60 90 72 80" fill="none" stroke="' + c.acc + '" stroke-width="6" stroke-linecap="round"/>' };
    },
    function (c) { // Ombrino: spiritello con cornini
      return { ey: 48, svg:
        '<path d="M30 24 L23 5 L41 15Z" fill="' + c.acc + '" ' + st + '/><path d="M70 24 L77 5 L59 15Z" fill="' + c.acc + '" ' + st + '/>' +
        '<path d="M19 92 L19 52 C19 27 33 12 50 12 C67 12 81 27 81 52 L81 92 L69 82 L59 92 L50 82 L41 92 L31 82Z" fill="' + c.main + '" ' + st + '/>' };
    },
    function (c) { // Zuccotto: zucca
      return { ey: 58, svg:
        '<path d="M45 32 L48 12 L58 14 L55 34Z" fill="' + c.acc + '" ' + st + '/>' +
        '<ellipse cx="50" cy="62" rx="37" ry="30" fill="' + c.main + '" ' + st + '/>' +
        '<path d="M50 32 C38 42 38 80 50 92 M50 32 C62 42 62 80 50 92" fill="none" stroke="' + INK + '" stroke-width="2.5" opacity=".35"/>' };
    },
    function (c) { // Carbonino: pelo di fuliggine con braciola
      var pts = star(50, 56, 14, 38, 30);
      return { ey: 54, dark: true, svg:
        '<polygon points="' + pts + '" fill="' + c.main + '" ' + st + '/>' +
        '<circle cx="74" cy="24" r="8" fill="' + c.acc + '" ' + st + '/><circle cx="76" cy="22" r="2.6" fill="#FFE3A0"/>' };
    }
  ];

  // Restituisce il markup SVG (stringa) del mostrillo con indice idx.
  // mood: 'idle' | 'happy' | 'worried'
  function svg(idx, mood) {
    var c = LIST[idx % LIST.length];
    var b = BODY[idx % LIST.length](c);
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="mon mon-' + c.id + '">' +
      b.svg + blush(b.ey) + eyes(mood || 'idle', b.ey, b.dark) + mouth(mood || 'idle', b.ey, b.dark) + '</svg>';
  }

  root.Creatures = { LIST: LIST, svg: svg, INK: INK };
})(typeof self !== 'undefined' ? self : this);
