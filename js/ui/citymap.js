/* =========================================================
   Carte de la ville (écran de la nuit)
   Comme dans This War of Mine : un plan crayonné de la ville en ruine,
   le refuge au milieu, les lieux de pillage épinglés dessus. On choisit
   la sortie de la nuit en cliquant sur un repère.
   Le tracé (fleuve, rues, pâtés de maisons) est fixe : c'est toujours
   la même ville.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  var W = 1000, H = 540;

  // Position des lieux sur la carte (le refuge est en REFUGE)
  var REFUGE = { x: 395, y: 300 };
  var POS = {
    maison_abandonnee: { x: 300, y: 225 }, ecole: { x: 470, y: 205 }, vieux_couple: { x: 270, y: 375 },
    immeuble: { x: 520, y: 330 }, boulangerie: { x: 410, y: 420 }, eglise: { x: 355, y: 120 },
    chantier: { x: 640, y: 150 }, supermarche: { x: 660, y: 300 }, garage: { x: 150, y: 455 },
    hopital: { x: 590, y: 440 }, villa: { x: 140, y: 110 }, carrefour: { x: 790, y: 240 },
    entrepot: { x: 860, y: 450 }, avant_poste: { x: 900, y: 110 }
  };
  var DANGER_COL = ['#5f7a3e', '#c08a2c', '#c4582f', '#9c2f22'];
  var ICON = { aucun: 'pack', civils: 'user', bandits: 'skull', militaires: 'shield' };

  var CM = C.CityMap = {};

  // Pâtés de maisons : grille irrégulière, quelques-uns en ruine
  function blocks(r) {
    var out = '';
    for (var by = 20; by < H - 20; by += 70) {
      for (var bx = 20; bx < W - 20; bx += 90) {
        var w = 60 + r.next() * 22, h = 44 + r.next() * 18;
        var x = bx + r.next() * 10, y = by + r.next() * 10;
        var ruin = r.next() < 0.22;
        out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + h.toFixed(1) + '" class="' + (ruin ? 'cm-ruin' : 'cm-block') + '"/>';
        if (ruin) out += '<circle cx="' + (x + w * r.next()).toFixed(1) + '" cy="' + (y + h * r.next()).toFixed(1) + '" r="' + (5 + r.next() * 7).toFixed(1) + '" class="cm-crater"/>';
      }
    }
    return out;
  }

  function streets() {
    var avenues = [
      'M0 265 C 200 255, 420 280, 1000 250',          // grande avenue est-ouest
      'M0 400 C 240 395, 520 410, 1000 390',
      'M0 170 C 300 165, 600 180, 1000 165',
      'M230 0 C 225 180, 240 360, 220 540',            // nord-sud
      'M430 0 C 440 200, 420 380, 440 540',
      'M720 0 C 700 220, 740 380, 720 540',
      'M560 0 L 1000 520'                              // diagonale vers le port
    ];
    var ink = '', paper = '';
    avenues.forEach(function (d) {
      ink += '<path d="' + d + '" class="cm-street-ink"/>';
      paper += '<path d="' + d + '" class="cm-street"/>';
    });
    return ink + paper;
  }

  // st : état du jeu · sel : id choisi · onPick(id)
  CM.render = function (box, st, sel, onPick, info) {
    var r = C.Sketch && C.Sketch.rng ? C.Sketch.rng(4242) : { next: Math.random };
    var svg = '<svg class="city-map" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">' +
      '<defs>' +
        '<filter id="cmRough"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter>' +
        '<pattern id="cmHatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="7" stroke="#6e6352" stroke-width="1" opacity=".35"/></pattern>' +
        '<radialGradient id="cmVig" cx="50%" cy="50%" r="70%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#2a2014" stop-opacity=".45"/></radialGradient>' +
      '</defs>' +
      '<rect width="' + W + '" height="' + H + '" class="cm-paper"/>' +
      '<g filter="url(#cmRough)">' + blocks(r) +
        '<path d="M0 505 C 180 470, 330 520, 520 490 S 820 430, 1000 470 L 1000 540 L 0 540 Z" class="cm-river"/>' +
        '<text x="120" y="528" class="cm-river-t">le fleuve</text>' +
        streets() +
      '</g>';

    // Trajet vers le lieu choisi
    if (sel && POS[sel]) {
      var p = POS[sel];
      svg += '<path d="M' + REFUGE.x + ' ' + REFUGE.y + ' Q ' + ((REFUGE.x + p.x) / 2) + ' ' + (Math.min(REFUGE.y, p.y) - 40) + ' ' + p.x + ' ' + p.y + '" class="cm-route"/>';
    }

    // Refuge
    svg += '<g class="cm-home" transform="translate(' + REFUGE.x + ',' + REFUGE.y + ')">' +
      '<path d="M-16 6 L0 -10 L16 6 L16 22 L-16 22 Z" /><text y="40" text-anchor="middle">Le refuge</text></g>';

    // Lieux
    C.LOCATIONS.forEach(function (l) {
      var p2 = POS[l.id]; if (!p2) return;
      var open = l.unlock <= st.day, ls = st.locations[l.id] || {};
      var on = l.id === sel;
      var icon = l.id === 'carrefour' ? 'alert' : ICON[l.residents] || 'pack';
      var ico = C.Icon(icon).replace('<svg class="ico"', '<svg x="-10" y="-10" width="20" height="20" class="ico"');
      var hostile = Object.keys(ls.hostile || {}).length > 0;
      svg += '<g class="cm-pin' + (open ? '' : ' locked') + (on ? ' on' : '') + '" data-id="' + l.id + '" transform="translate(' + p2.x + ',' + p2.y + ')">' +
        (on ? '<circle r="27" class="cm-ring"/>' : '') +
        '<circle r="18" fill="' + (open ? DANGER_COL[l.danger] : '#8d8472') + '" class="cm-dot"/>' +
        '<g color="#f3ead6">' + ico + '</g>' +
        (open && ls.visits ? '<circle cx="15" cy="-14" r="8" class="cm-visits"/><text x="15" y="-10" text-anchor="middle" class="cm-visits-t">' + ls.visits + '</text>' : '') +
        (hostile ? '<circle cx="-15" cy="-14" r="6" class="cm-hostile"/>' : '') +
        '<text y="36" text-anchor="middle" class="cm-name">' + U.esc(l.name) + '</text>' +
        (open ? '' : '<text y="52" text-anchor="middle" class="cm-lock">jour ' + l.unlock + '</text>') +
        '</g>';
    });
    svg += '<rect width="' + W + '" height="' + H + '" fill="url(#cmVig)" pointer-events="none"/>';
    // Légende
    // Légende en bandeau, sur le fleuve (là où il n'y a aucun lieu)
    svg += '<g class="cm-legend" transform="translate(' + (W / 2 - 60) + ',' + (H - 30) + ')"><rect width="410" height="24" rx="2"/>' +
      C.DANGER_LABELS.map(function (lb, i) { return '<circle cx="' + (16 + i * 100) + '" cy="12" r="7" fill="' + DANGER_COL[i] + '"/><text x="' + (28 + i * 100) + '" y="17">' + lb + '</text>'; }).join('') + '</g>';
    svg += '</svg>';

    box.innerHTML = '<div class="cm-wrap">' + svg + '<div class="cm-tip hidden"></div></div>';
    var tip = box.querySelector('.cm-tip'), wrap = box.querySelector('.cm-wrap');
    Array.prototype.forEach.call(box.querySelectorAll('.cm-pin'), function (g) {
      var id = g.getAttribute('data-id'), l = C.locationDef(id);
      g.addEventListener('mouseenter', function () {
        tip.innerHTML = info(l);
        tip.classList.remove('hidden');
        var bb = g.getBoundingClientRect(), wb = wrap.getBoundingClientRect();
        tip.style.left = Math.min(wb.width - 250, Math.max(0, bb.left - wb.left - 110)) + 'px';
        tip.style.top = (bb.bottom - wb.top + 6) + 'px';
      });
      g.addEventListener('mouseleave', function () { tip.classList.add('hidden'); });
      g.addEventListener('click', function () {
        if (l.unlock > st.day) { if (C.Audio.ready) C.Audio.sfx.deny(); return; }
        if (C.Audio.ready) C.Audio.sfx.click();
        onPick(id);
      });
    });
  };
})(window.CQR);
