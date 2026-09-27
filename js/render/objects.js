/* =========================================================
   Dessin des objets du refuge (couche statique)
   Chaque fonction dessine l'objet posé au sol en (o.x, yFloor)
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch;
  var WOOD = '#6b6152', WOOD2 = '#5a5145', METAL = '#55575a', METAL2 = '#46484b', CLOTH = '#7a7468', DARK = '#3a3834';

  var D = C.ObjDraw = {};

  // ---------------------------------------------------------------- matières
  // Chaque couleur « de matière » reçoit une vraie texture photo (bois usé,
  // tôle rouillée, gravats), peinte dans le contour crayonné.
  var MAT = {};
  [METAL, METAL2, '#56595c', '#3b3c3e', '#3f3f40', '#5d6064', '#6a5a4a'].forEach(function (c) { MAT[c] = { k: 'rust', tile: 70 }; });
  [WOOD, '#77695a', '#81735f', '#6e5a4a', '#5b4f43'].forEach(function (c) { MAT[c] = { k: 'planks', tile: 90 }; });
  [WOOD2, '#5f564a', '#5a5044', '#6f685c', '#4c473f'].forEach(function (c) { MAT[c] = { k: 'cabinet', tile: 90 }; });
  ['#524d45', '#4d4841', '#57514a'].forEach(function (c) { MAT[c] = { k: 'rubble', tile: 110, alpha: 0.95 }; });
  [CLOTH, '#6f6a5f', '#686257', '#8a8478'].forEach(function (c) { MAT[c] = { k: 'plaster2', tile: 120, alpha: 0.55 }; });

  function bbox(pts) {
    var b = { x: Infinity, y: Infinity, x2: -Infinity, y2: -Infinity };
    pts.forEach(function (p) { b.x = Math.min(b.x, p[0]); b.y = Math.min(b.y, p[1]); b.x2 = Math.max(b.x2, p[0]); b.y2 = Math.max(b.y2, p[1]); });
    return b;
  }
  function mat(ctx, pts, color) {
    var m = MAT[color];
    if (!m || !C.Tex || !C.Tex.ready) return;
    var b = bbox(pts), w = b.x2 - b.x, h = b.y2 - b.y;
    // Veinage dans le sens de la longueur
    var rot = (m.k === 'planks' || m.k === 'cabinet') && w > h * 1.3 ? Math.PI / 2 : 0;
    C.Tex.paint(ctx, pts, m.k, { tile: m.tile, alpha: m.alpha || 0.85, blend: 'overlay', rot: rot, ox: b.x * 2.3, oy: b.y * 1.7 });
  }
  // Remplissages texturés (même signature que SK.fill / SK.fillRect)
  function P(ctx, r, pts, color, j) { SK.fill(ctx, r, pts, color, j); mat(ctx, pts, color); }
  function F(ctx, r, x, y, w, h, color, j) { P(ctx, r, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, j); }

  // Boîte englobante (pour le survol / clic)
  D.bounds = function (o) {
    var y = C.FLOORS[o.f].y;
    if (o.kind === 'hole') { var hs = D.holeSize(o); return { x: o.x - hs.w / 2 - 10, y: y - D.HOLE_CY - hs.h / 2 - 8, w: hs.w + 20, h: hs.h + 16 }; }
    if (o.kind === 'guard' && C.GUARD_TYPES && C.GUARD_TYPES[o.type] && (C.GUARD_TYPES[o.type].unseen || (C.Combat && C.Combat.hidden(o)))) return { x: -9999, y: -9999, w: 0, h: 0 };
    if (o.kind === 'npc' && C.NPCS && C.NPCS[o.npc]) {
      var nd = C.NPCS[o.npc], nh = C.Figure.BASE * nd.look.h;
      if (nd.pose === 'lie') { var ly = o.onBed ? y - 42 : y - 9; return { x: o.x - nh * 0.58, y: ly - 22, w: nh * 1.1, h: 30 }; }
      return { x: o.x - 22, y: y - nh * (nd.pose === 'sit' ? 0.82 : 1.05), w: 44, h: nh * (nd.pose === 'sit' ? 0.82 : 1.05) };
    }
    if (o.kind === 'blackboard') return { x: o.x - o.w / 2 - 5, y: y - 155, w: o.w + 10, h: o.h + 14 };
    return { x: o.x - o.w / 2, y: y - o.h, w: o.w, h: o.h };
  };

  function legs(ctx, r, x, y, w, h, n) {
    for (var i = 0; i < (n || 2); i++) {
      var lx = x + (i === 0 ? 4 : w - 8);
      F(ctx, r, lx, y, 4, h, WOOD2, 0.4);
      SK.line(ctx, r, lx, y, lx, y + h, { w: 1, passes: 1 });
      SK.line(ctx, r, lx + 4, y, lx + 4, y + h, { w: 0.8, passes: 1 });
    }
  }
  function box(ctx, r, x, y, w, h, color, hatch) {
    F(ctx, r, x, y, w, h, color, 0.8);
    if (hatch) SK.hatch(ctx, r, x, y, w, h, { gap: hatch, alpha: 0.28 });
    SK.rect(ctx, r, x, y, w, h, { w: 1.3 });
  }
  function pipeUp(ctx, r, x, fromY, f) {
    var top = C.FLOORS[f].ceil;
    F(ctx, r, x - 5, top, 10, fromY - top, METAL2, 0.3);
    SK.line(ctx, r, x - 5, top, x - 5, fromY, { w: 1 });
    SK.line(ctx, r, x + 5, top, x + 5, fromY, { w: 1 });
    for (var yy = top + 20; yy < fromY; yy += 34) SK.line(ctx, r, x - 6, yy, x + 6, yy, { w: 0.8, passes: 1 });
  }

  D.frontdoor = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - o.h;
    F(ctx, r, x - 4, top - 6, o.w + 8, o.h + 6, '#2a2825', 0.5);
    box(ctx, r, x, top, o.w, o.h, WOOD2, 5);
    SK.rect(ctx, r, x + 6, top + 10, o.w - 12, 36, { w: 0.8, passes: 1 });
    SK.rect(ctx, r, x + 6, top + 54, o.w - 12, 40, { w: 0.8, passes: 1 });
    P(ctx, r, [[x + o.w - 9, y - 52], [x + o.w - 5, y - 52], [x + o.w - 5, y - 46], [x + o.w - 9, y - 46]], '#222', 0.2);
    if (o.level >= 1) {
      [[top + 22, -0.18], [top + 58, 0.2], [top + 86, -0.1]].forEach(function (p) {
        var cy = p[0];
        P(ctx, r, [[x - 6, cy + p[1] * 20], [x + o.w + 6, cy - p[1] * 20], [x + o.w + 6, cy - p[1] * 20 + 9], [x - 6, cy + p[1] * 20 + 9]], WOOD, 0.8);
        SK.poly(ctx, r, [[x - 6, cy + p[1] * 20], [x + o.w + 6, cy - p[1] * 20], [x + o.w + 6, cy - p[1] * 20 + 9], [x - 6, cy + p[1] * 20 + 9]], true, { w: 0.9 });
      });
    }
    if (o.level >= 2) {
      F(ctx, r, x + 2, top + 30, o.w - 4, 42, METAL, 0.5);
      SK.rect(ctx, r, x + 2, top + 30, o.w - 4, 42, { w: 1.2 });
      for (var i = 0; i < 4; i++) { ctx.fillStyle = '#222'; ctx.fillRect(x + 6 + (i % 2) * (o.w - 16), top + 34 + Math.floor(i / 2) * 32, 3, 3); }
    }
  };

  D.workbench = function (ctx, r, o, y) {
    var w = 120, x = o.x - w / 2, top = y - 50;
    // Panneau d'outils au mur
    F(ctx, r, x + 10, top - 70, w - 20, 56, '#6f685c', 0.6);
    SK.rect(ctx, r, x + 10, top - 70, w - 20, 56, { w: 0.9 });
    SK.hatch(ctx, r, x + 10, top - 70, w - 20, 56, { gap: 7, alpha: 0.15, angle: 0.8 });
    SK.line(ctx, r, x + 24, top - 62, x + 24, top - 28, { w: 2 });   // marteau
    F(ctx, r, x + 18, top - 66, 13, 7, METAL, 0.3);
    SK.line(ctx, r, x + 42, top - 64, x + 50, top - 26, { w: 1.6 }); // tournevis
    SK.poly(ctx, r, [[x + 62, top - 60], [x + 76, top - 60], [x + 72, top - 30], [x + 66, top - 30]], true, { w: 1 }); // pince
    if (o.level >= 2) { SK.line(ctx, r, x + 86, top - 64, x + 100, top - 24, { w: 2.2 }); F(ctx, r, x + 84, top - 66, 18, 10, METAL, 0.3); }
    // Plateau
    F(ctx, r, x, top, w, 10, WOOD, 0.5);
    SK.rect(ctx, r, x, top, w, 10, { w: 1.5 });
    legs(ctx, r, x + 2, top + 10, w - 4, 40);
    SK.line(ctx, r, x + 8, top + 34, x + w - 8, top + 34, { w: 1 });
    // Étau
    F(ctx, r, x + w - 30, top - 16, 18, 16, METAL, 0.4);
    SK.rect(ctx, r, x + w - 30, top - 16, 18, 16, { w: 1 });
    SK.line(ctx, r, x + w - 34, top - 8, x + w - 8, top - 8, { w: 1.4 });
    // Bazar
    F(ctx, r, x + 12, top - 9, 20, 9, WOOD2, 0.4);
    SK.rect(ctx, r, x + 12, top - 9, 20, 9, { w: 0.8 });
    SK.stain(ctx, x + 50, top - 3, 8, 0.35);
    if (o.level >= 3) {
      F(ctx, r, x + 44, top - 20, 22, 20, METAL2, 0.4);
      SK.rect(ctx, r, x + 44, top - 20, 22, 20, { w: 1 });
      SK.line(ctx, r, x + 55, top - 20, x + 60, top - 34, { w: 1 });
    }
    // Chiffre de niveau
    for (var i = 0; i < o.level; i++) SK.line(ctx, r, x + 6 + i * 5, top + 16, x + 6 + i * 5, top + 24, { w: 1.2, passes: 1 });
  };

  D.stock = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - o.h;
    F(ctx, r, x, top, o.w, o.h, '#4c473f', 0.5);
    SK.hatch(ctx, r, x, top, o.w, o.h, { gap: 5, alpha: 0.2 });
    SK.line(ctx, r, x, top, x, y, { w: 1.6 });
    SK.line(ctx, r, x + o.w, top, x + o.w, y, { w: 1.6 });
    var shelves = [top + 4, top + 34, top + 64, y - 3];
    shelves.forEach(function (sy) { F(ctx, r, x - 2, sy, o.w + 4, 4, WOOD, 0.3); SK.line(ctx, r, x - 2, sy, x + o.w + 2, sy, { w: 1.2 }); });
    // Contenu : proportionnel à ce que possède le groupe
    var total = 0, inv = C.Game.st.inventory;
    for (var k in inv) total += inv[k];
    if (C.Props && C.Props.ready && stockProps(ctx, o, x, shelves, inv)) return;
    var n = Math.min(24, Math.round(total / 3));
    var rr = SK.rng(77);
    for (var i = 0; i < n; i++) {
      var shelf = i % 3, slot = Math.floor(i / 3);
      var bx = x + 6 + slot * 11.5 + rr.next() * 2, by = shelves[shelf + 1];
      var kind = rr.next();
      if (kind < 0.4) { var hh = 12 + rr.next() * 8; F(ctx, r, bx, by - hh, 10, hh, '#7d7568', 0.4); SK.rect(ctx, r, bx, by - hh, 10, hh, { w: 0.7, passes: 1 }); }
      else if (kind < 0.75) { F(ctx, r, bx, by - 10, 8, 10, METAL, 0.3); SK.line(ctx, r, bx, by - 7, bx + 8, by - 7, { w: 0.6, passes: 1 }); SK.rect(ctx, r, bx, by - 10, 8, 10, { w: 0.7, passes: 1 }); }
      else { P(ctx, r, [[bx, by], [bx + 3, by - 18], [bx + 7, by - 18], [bx + 10, by]], '#5d6660', 0.4); SK.poly(ctx, r, [[bx, by], [bx + 3, by - 18], [bx + 7, by - 18], [bx + 10, by]], false, { w: 0.7, passes: 1 }); }
    }
  };

  // Étagères de la réserve garnies de vrais objets, selon l'inventaire.
  // Chaque groupe d'objets devient un « paquet » (1 image pour ~3 unités).
  var STOCK_PROPS = [
    // [objet détouré, hauteur, étage de rangement (0 = haut, 2 = sol), objets d'inventaire]
    ['russian_food_cans_01', 17, 0, ['conserve']],
    ['can_rusted', 16, 0, ['sucre', 'cafe', 'legumes', 'viande']],
    ['wine_bottles_01', 18, 0, ['alcool']],
    ['medical_box', 13, 1, ['bandage', 'medicaments', 'remede']],
    ['ammo_box', 16, 1, ['munitions', 'pistolet', 'fusil']],
    ['cardboard_box_01', 20, 1, ['livres', 'cigarettes', 'tabac', 'herbes', 'engrais', 'bijoux', 'filtre']],
    ['plastic_bottle_gallon', 22, 2, ['eau']],
    ['metal_jerrycan', 24, 2, ['carburant']],
    ['wooden_crate_02', 18, 2, ['composants', 'pieces_meca', 'pieces_elec', 'bois']]
  ];
  function stockProps(ctx, o, x, shelves, inv) {
    var rows = [[], [], []];
    STOCK_PROPS.forEach(function (sp) {
      var n = 0;
      sp[3].forEach(function (id) { n += inv[id] || 0; });
      var packs = Math.min(4, Math.ceil(n / 3));
      for (var i = 0; i < packs; i++) rows[sp[2]].push(sp);
    });
    rows.forEach(function (row, ri) {
      var base = shelves[ri + 1] - 1, cx = x + 5, limit = x + o.w - 4;
      row.forEach(function (sp, i) {
        var w = sp[1] * C.Props.aspect(sp[0]);
        if (w > 30) w = 30;
        if (cx + w > limit) return;
        C.Props.draw(ctx, sp[0], cx + w / 2, base, sp[1], { maxW: 30, flip: i % 2 === 1, line: 0.6, noShadow: true, shade: 0.12 });
        cx += w + 1;
      });
    });
    return true;
  }

  D.rubble = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    if (o.block) {
      // Éboulis jusqu'au plafond : poutres et gravats
      var top = C.FLOORS[o.f].ceil;
      var pts = [[x - 10, y], [x + 4, y - o.h * 0.6], [x + o.w * 0.3, y - o.h * 0.9], [x + o.w * 0.5, top], [x + o.w * 0.75, y - o.h * 0.85], [x + o.w + 10, y]];
      P(ctx, r, pts, '#4d4841', 2);
      SK.hatchPoly(ctx, r, pts, { gap: 4, alpha: 0.4, angle: -0.6 });
      SK.hatchPoly(ctx, r, pts, { gap: 7, alpha: 0.25, angle: 0.7 });
      SK.line(ctx, r, x - 8, top + 20, x + o.w + 12, y - 30, { w: 7, color: WOOD2, passes: 1 });
      SK.line(ctx, r, x - 8, top + 20, x + o.w + 12, y - 30, { w: 1.2 });
      SK.line(ctx, r, x + o.w + 4, top + 6, x - 4, y - 70, { w: 6, color: WOOD, passes: 1 });
      SK.line(ctx, r, x + o.w + 4, top + 6, x - 4, y - 70, { w: 1.2 });
      for (var i = 0; i < 18; i++) SK.stone(ctx, r, x + r.next() * o.w, y - 6 - r.next() * o.h * 0.75, 5 + r.next() * 7, r.next() < 0.5 ? '#6a645a' : '#5b564e');
      return;
    }
    var p = [[x - 6, y], [x + o.w * 0.2, y - o.h * 0.7], [x + o.w * 0.45, y - o.h], [x + o.w * 0.7, y - o.h * 0.75], [x + o.w + 6, y]];
    P(ctx, r, p, '#524d45', 1.5);
    SK.hatchPoly(ctx, r, p, { gap: 4, alpha: 0.35 });
    for (var j = 0; j < 12; j++) SK.stone(ctx, r, x + 6 + r.next() * (o.w - 12), y - 4 - r.next() * o.h * 0.6, 4 + r.next() * 5, r.next() < 0.5 ? '#6a645a' : '#5e594f');
    SK.line(ctx, r, x + 8, y - o.h * 0.5, x + o.w - 4, y - o.h * 0.9, { w: 4, color: WOOD2, passes: 1 });
    SK.line(ctx, r, x + 8, y - o.h * 0.5, x + o.w - 4, y - o.h * 0.9, { w: 1 });
  };

  D.door = function (ctx, r, o, y) {
    var top = y - o.h, x = o.x - o.w / 2;
    F(ctx, r, x - 5, top - 5, o.w + 10, o.h + 5, '#2b2825', 0.4);
    if (o.open) {
      P(ctx, r, [[x - 2, top], [x + 10, top + 8], [x + 10, y - 2], [x - 2, y]], WOOD2, 0.4);
      SK.poly(ctx, r, [[x - 2, top], [x + 10, top + 8], [x + 10, y - 2], [x - 2, y]], true, { w: 1.1 });
      return;
    }
    box(ctx, r, x, top, o.w, o.h, WOOD2, 6);
    SK.rect(ctx, r, x + 4, top + 8, o.w - 8, 40, { w: 0.7, passes: 1 });
    SK.rect(ctx, r, x + 4, top + 56, o.w - 8, 48, { w: 0.7, passes: 1 });
    F(ctx, r, x + o.w - 10, y - 58, 7, 12, METAL, 0.2);
    SK.rect(ctx, r, x + o.w - 10, y - 58, 7, 12, { w: 0.8 });
    // Cadenas
    ctx.strokeStyle = SK.INK; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(x + o.w - 6.5, y - 62, 4, Math.PI, 0); ctx.stroke();
  };

  D.grate = function (ctx, r, o, y) {
    var top = C.FLOORS[o.f].ceil + 4, x = o.x - o.w / 2;
    SK.line(ctx, r, x - 2, top, x + o.w + 2, top, { w: 2.5 });
    SK.line(ctx, r, x - 2, y - 2, x + o.w + 2, y - 2, { w: 2.5 });
    SK.line(ctx, r, x - 2, top + (y - top) / 2, x + o.w + 2, top + (y - top) / 2, { w: 2 });
    for (var i = 0; i <= 3; i++) SK.line(ctx, r, x + i * o.w / 3, top, x + i * o.w / 3, y, { w: 2.2, color: '#232323' });
  };

  // ---------------------------------------------------------------- trous
  // Brèche dans le mur : ouverte (ciel, ruines, gravats, courant d'air)
  // ou barricadée (planches clouées, contrefort, chiffons dans les jours)
  D.HOLE_CY = 96;
  D.holeSize = function (o) { return { w: o.w * 1.4, h: o.h * 1.45 }; };

  function pathOf(ctx, pts) {
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.closePath();
  }
  // Contour déchiqueté : alternance de pointes et d'encoches « en escalier » de briques
  function jagged(r, cx, cy, rw, rh, n, lo, hi) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + (r.next() - 0.5) * 0.18;
      var k = lo + r.next() * (hi - lo) + (i % 2 ? -0.06 : 0.05);
      var px = cx + Math.cos(a) * rw * k, py = cy + Math.sin(a) * rh * k;
      pts.push([px, py]);
      if (r.next() < 0.45) pts.push([px + (r.next() < 0.5 ? 5 : -5), py]); // marche de brique
    }
    return pts;
  }
  // Maçonnerie mise à nu (rangées de briques) dans un polygone
  function bricks(ctx, r, pts, cx, cy, rw, rh) {
    ctx.save();
    pathOf(ctx, pts); ctx.clip();
    ctx.fillStyle = '#6a5a4d'; ctx.fillRect(cx - rw, cy - rh, rw * 2, rh * 2);
    var row = 0;
    for (var by = cy - rh; by < cy + rh; by += 7, row++) {
      for (var bx = cx - rw - (row % 2) * 8; bx < cx + rw; bx += 16) {
        var tone = ['#76655a', '#6b5b4f', '#5f5147', '#7d6b5c'][Math.floor(r.next() * 4)];
        ctx.fillStyle = tone; ctx.fillRect(bx + 1, by + 1, 14, 5);
      }
      ctx.strokeStyle = 'rgba(25,22,20,0.55)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx - rw, by); ctx.lineTo(cx + rw, by); ctx.stroke();
    }
    SK.hatch(ctx, r, cx - rw, cy - rh, rw * 2, rh * 2, { gap: 5, alpha: 0.18, angle: 0.6 });
    ctx.restore();
    if (C.Tex) C.Tex.paint(ctx, pts, 'brick', { tile: 90, alpha: 0.75, blend: 'overlay', ox: cx * 3 });
  }

  D.hole = function (ctx, r, o, y) {
    var hs = D.holeSize(o), cx = o.x, cy = y - D.HOLE_CY;
    var rw = hs.w / 2, rh = hs.h / 2;
    var winter = C.World && C.Game.st && C.World.isWinter(C.Game.st);

    // Enduit arraché autour de la brèche : briques à nu
    var ring = jagged(r, cx, cy, rw * 1.5, rh * 1.42, 14, 0.82, 1.05);
    SK.stain(ctx, cx, cy + rh * 0.4, rw * 1.9, 0.35);
    bricks(ctx, r, ring, cx, cy, rw * 1.6, rh * 1.55);
    // Bord de l'enduit (arête claire + trait)
    SK.poly(ctx, r, ring, true, { w: 0.8, passes: 1, color: '#9b9384', alpha: 0.7 });
    SK.poly(ctx, r, ring, true, { w: 1.1, passes: 1 });
    // Fissures qui partent dans le mur
    for (var c = 0; c < 5; c++) {
      var a = r.next() * Math.PI * 2;
      SK.crack(ctx, r, cx + Math.cos(a) * rw * 1.35, cy + Math.sin(a) * rh * 1.3, 22 + r.next() * 26, a, 0);
    }

    var hole = jagged(r, cx, cy, rw, rh, 16, 0.78, 1.02);

    if (!o.boarded) {
      // ---------- OUVERT : on voit la ville dehors
      ctx.save();
      pathOf(ctx, hole); ctx.clip();
      var g = ctx.createLinearGradient(0, cy - rh, 0, cy + rh);
      if (winter) { g.addColorStop(0, '#b4bcc6'); g.addColorStop(1, '#7a828b'); }
      else { g.addColorStop(0, '#a9a8a2'); g.addColorStop(1, '#66655f'); }
      ctx.fillStyle = g; ctx.fillRect(cx - rw - 4, cy - rh - 4, rw * 2 + 8, rh * 2 + 8);
      // Colonne de fumée lointaine
      SK.stain(ctx, cx + rw * 0.45, cy - rh * 0.5, rh * 0.7, 0.35, '60,58,55');
      SK.stain(ctx, cx + rw * 0.3, cy - rh * 0.9, rh * 0.6, 0.25, '60,58,55');
      // Immeubles en ruine au loin
      var skyline = [[cx - rw - 4, cy + rh + 4]], sx = cx - rw - 4;
      while (sx < cx + rw + 4) {
        var bw = 8 + r.next() * 14, top = cy - rh * (0.05 + r.next() * 0.55);
        skyline.push([sx, top + r.next() * 6], [sx + bw * 0.4, top - (r.next() < 0.4 ? 6 : 0)], [sx + bw, top + r.next() * 8]);
        sx += bw;
      }
      skyline.push([cx + rw + 4, cy + rh + 4]);
      P(ctx, r, skyline, '#3b3a38', 0.6);
      for (var wi = 0; wi < 10; wi++) {
        ctx.fillStyle = 'rgba(20,20,22,0.8)';
        ctx.fillRect(cx - rw + r.next() * rw * 2, cy - rh * 0.1 + r.next() * rh * 0.8, 2.5, 3.5);
      }
      // Rue et gravats au premier plan
      P(ctx, r, [[cx - rw - 4, cy + rh + 4], [cx - rw - 4, cy + rh * 0.45], [cx - rw * 0.2, cy + rh * 0.62], [cx + rw * 0.5, cy + rh * 0.4], [cx + rw + 4, cy + rh * 0.55], [cx + rw + 4, cy + rh + 4]], '#26252a', 0.8);
      if (winter) P(ctx, r, [[cx - rw - 4, cy + rh * 0.5], [cx - rw * 0.2, cy + rh * 0.64], [cx + rw * 0.5, cy + rh * 0.44], [cx + rw + 4, cy + rh * 0.58], [cx + rw + 4, cy + rh * 0.66], [cx - rw - 4, cy + rh * 0.6]], '#c9ccd0', 0.5);
      ctx.restore();

      // Épaisseur du mur : briques cassées qui dépassent sur le bord
      for (var i = 0; i < hole.length; i += 2) {
        var p = hole[i];
        var dx = p[0] - cx, dy = p[1] - cy, len = Math.sqrt(dx * dx + dy * dy) || 1;
        SK.stone(ctx, r, p[0] - dx / len * 3, p[1] - dy / len * 2, 3 + r.next() * 3, r.next() < 0.5 ? '#6f5e50' : '#5c4e43');
      }
      SK.poly(ctx, r, hole, true, { w: 2 });
      // Ombre intérieure du bas (tranche du mur)
      ctx.save(); pathOf(ctx, hole); ctx.clip();
      ctx.fillStyle = 'rgba(15,14,13,0.55)';
      ctx.fillRect(cx - rw - 4, cy + rh * 0.72, rw * 2 + 8, rh);
      ctx.restore();
      // Fer à béton tordu
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(cx - rw * 0.35, cy - rh * 0.92); ctx.quadraticCurveTo(cx - rw * 0.2, cy - rh * 0.4, cx - rw * 0.42, cy - rh * 0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + rw * 0.55, cy - rh * 0.8); ctx.quadraticCurveTo(cx + rw * 0.72, cy - rh * 0.45, cx + rw * 0.52, cy - rh * 0.3); ctx.stroke();
      // Neige accumulée sur le rebord
      if (winter) {
        P(ctx, r, [[cx - rw * 0.7, cy + rh * 0.78], [cx - rw * 0.2, cy + rh * 0.7], [cx + rw * 0.4, cy + rh * 0.74], [cx + rw * 0.72, cy + rh * 0.82], [cx + rw * 0.4, cy + rh * 0.9], [cx - rw * 0.4, cy + rh * 0.9]], '#d9dbde', 0.6);
      }
      // Coulure de plâtre sous la brèche et tas de gravats au sol
      SK.stain(ctx, cx, y - 6, rw * 1.1, 0.3, '120,112,100');
      var pile = [[cx - rw * 1.2, y], [cx - rw * 0.7, y - 10], [cx - rw * 0.15, y - 18], [cx + rw * 0.4, y - 12], [cx + rw * 1.1, y]];
      P(ctx, r, pile, '#57514a', 1.5);
      SK.hatchPoly(ctx, r, pile, { gap: 4, alpha: 0.35 });
      for (var s = 0; s < 11; s++) SK.stone(ctx, r, cx - rw + r.next() * rw * 2, y - 3 - r.next() * 12, 3 + r.next() * 4, r.next() < 0.5 ? '#6f5e50' : '#66625a');
      // Plâtre au sol
      for (var q = 0; q < 14; q++) { ctx.fillStyle = 'rgba(170,162,148,0.7)'; ctx.fillRect(cx - rw * 1.4 + r.next() * rw * 2.8, y - 2 - r.next() * 3, 2, 1.5); }
      return;
    }

    // ---------- BARRICADÉ : planches épaisses, clous, contrefort
    P(ctx, r, hole, '#141416', 0.4); // fond noir visible seulement dans les jours
    var n = Math.max(4, Math.round(hs.h / 15));
    var ph = hs.h / n + 3;
    var woods = ['#77695a', '#6b6152', '#5f564a', '#81735f'];
    var gapY = -1;
    for (var k = 0; k < n; k++) {
      var yy = cy - rh - 4 + k * (ph - 1.5);
      var tilt = (r.next() - 0.5) * 7;
      var over = 14 + r.next() * 10, over2 = 14 + r.next() * 10;
      var bp = [[cx - rw - over, yy + tilt], [cx + rw + over2, yy - tilt], [cx + rw + over2 - 2, yy - tilt + ph], [cx - rw - over + 1, yy + tilt + ph]];
      P(ctx, r, bp, woods[Math.floor(r.next() * woods.length)], 0.6);
      // Veines du bois
      ctx.save(); pathOf(ctx, bp); ctx.clip();
      ctx.strokeStyle = 'rgba(30,26,22,0.35)'; ctx.lineWidth = 0.6;
      for (var v = 0; v < 3; v++) {
        var vy = yy + 3 + v * (ph - 6) / 2 + (r.next() - 0.5) * 2;
        ctx.beginPath(); ctx.moveTo(cx - rw - over, vy + tilt * 0.8);
        ctx.bezierCurveTo(cx - rw * 0.3, vy - 1.5, cx + rw * 0.3, vy + 1.5, cx + rw + over2, vy - tilt * 0.8); ctx.stroke();
      }
      // Nœud
      var kx = cx - rw * 0.6 + r.next() * rw * 1.2;
      ctx.beginPath(); ctx.ellipse(kx, yy + ph / 2, 3.2, 1.8, 0, 0, Math.PI * 2); ctx.stroke();
      // Arête supérieure éclairée
      ctx.fillStyle = 'rgba(200,185,160,0.18)'; ctx.fillRect(cx - rw - over, yy + (tilt < 0 ? tilt : -tilt) - 1, rw * 2 + over + over2, 2.4);
      ctx.restore();
      SK.poly(ctx, r, bp, true, { w: 1.1, passes: 1 });
      // Clous aux deux extrémités
      [[bp[0][0] + 6, (bp[0][1] + bp[3][1]) / 2], [bp[1][0] - 7, (bp[1][1] + bp[2][1]) / 2]].forEach(function (nl) {
        ctx.fillStyle = '#1c1b1a'; ctx.beginPath(); ctx.arc(nl[0], nl[1], 1.7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,215,205,0.55)'; ctx.fillRect(nl[0] - 0.8, nl[1] - 1.2, 1, 1);
        ctx.strokeStyle = 'rgba(60,40,25,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(nl[0], nl[1] + 1); ctx.lineTo(nl[0] + 0.5, nl[1] + 5); ctx.stroke(); // coulure de rouille
      });
      if (k === 1) gapY = yy + ph - 1;
    }
    // Chiffon bourré dans un interstice
    if (gapY > 0) {
      var gx = cx + rw * (r.next() - 0.5) * 0.8;
      var rag = [[gx - 8, gapY - 1], [gx - 2, gapY - 5], [gx + 7, gapY - 2], [gx + 9, gapY + 3], [gx + 1, gapY + 5], [gx - 7, gapY + 3]];
      P(ctx, r, rag, '#8b8474', 0.6);
      SK.hatchPoly(ctx, r, rag, { gap: 3, alpha: 0.3, angle: 1.2 });
      SK.poly(ctx, r, rag, true, { w: 0.8, passes: 1 });
    }
    // Plaque de tôle clouée sur un coin (grandes brèches)
    if (o.w >= 80) {
      var tx = cx + rw * 0.25, ty = cy - rh * 0.55;
      F(ctx, r, tx, ty, rw * 0.6, rh * 0.75, '#5d6064', 0.5);
      SK.hatch(ctx, r, tx, ty, rw * 0.6, rh * 0.75, { gap: 3, alpha: 0.2, angle: 1.57 });
      SK.rect(ctx, r, tx, ty, rw * 0.6, rh * 0.75, { w: 1 });
      ctx.fillStyle = '#1c1b1a';
      [[tx + 3, ty + 3], [tx + rw * 0.6 - 5, ty + 3], [tx + 3, ty + rh * 0.75 - 5], [tx + rw * 0.6 - 5, ty + rh * 0.75 - 5]].forEach(function (p) { ctx.fillRect(p[0], p[1], 2, 2); });
    }
    // Contrefort en diagonale
    var d1 = [cx - rw - 6, cy + rh + 2], d2 = [cx + rw + 6, cy - rh - 2];
    var ang = Math.atan2(d2[1] - d1[1], d2[0] - d1[0]), nx = -Math.sin(ang) * 6, ny = Math.cos(ang) * 6;
    var brace = [[d1[0] - nx, d1[1] - ny], [d2[0] - nx, d2[1] - ny], [d2[0] + nx, d2[1] + ny], [d1[0] + nx, d1[1] + ny]];
    P(ctx, r, brace, '#5a5044', 0.6);
    SK.hatchPoly(ctx, r, brace, { gap: 4, alpha: 0.2, angle: ang });
    SK.poly(ctx, r, brace, true, { w: 1.2, passes: 1 });
    ctx.fillStyle = '#1c1b1a';
    [0.12, 0.5, 0.88].forEach(function (t) { ctx.beginPath(); ctx.arc(d1[0] + (d2[0] - d1[0]) * t, d1[1] + (d2[1] - d1[1]) * t, 1.8, 0, Math.PI * 2); ctx.fill(); });
    // Sol balayé : quelques briques récupérées empilées
    F(ctx, r, cx + rw * 0.6, y - 7, 15, 7, '#6f5e50', 0.3); SK.rect(ctx, r, cx + rw * 0.6, y - 7, 15, 7, { w: 0.8, passes: 1 });
    F(ctx, r, cx + rw * 0.6 + 16, y - 7, 15, 7, '#5f5147', 0.3); SK.rect(ctx, r, cx + rw * 0.6 + 16, y - 7, 15, 7, { w: 0.8, passes: 1 });
    F(ctx, r, cx + rw * 0.6 + 8, y - 14, 15, 7, '#76655a', 0.3); SK.rect(ctx, r, cx + rw * 0.6 + 8, y - 14, 15, 7, { w: 0.8, passes: 1 });
  };

  // ---------------------------------------------------------------- exploration
  // Personnage non joueur : dessiné comme un survivant (même rendu)
  D.npc = function (ctx, r, o, y) {
    var d = C.NPCS && C.NPCS[o.npc];
    if (!d) return;
    var fake = {
      id: 'npc_' + o.npc, look: d.look, traits: [], path: [], x: o.x, y: y, f: o.f, anim: 0,
      moral: d.pose === 'lie' ? 30 : 60, fatigue: 30, wound: (d.cond && d.cond.wound) || 0, sick: (d.cond && d.cond.sick) || 0,
      act: d.pose === 'lie' ? { kind: 'sleepfloor', phase: 'work' } : d.pose === 'sit' ? { kind: 'rest', phase: 'work' } : null
    };
    var H = C.Figure.BASE * d.look.h;
    var dir = o.facing || 1;
    if (d.pose === 'lie') {
      var ly = o.onBed ? y - 42 : y - 9;
      if (!o.onBed) {
        // Couverture / carton au sol
        var mat = [[o.x - H * 0.62, y - 2], [o.x - H * 0.6, y - 8], [o.x + H * 0.5, y - 9], [o.x + H * 0.52, y - 1]];
        P(ctx, r, mat, '#5d574c', 0.6); SK.poly(ctx, r, mat, true, { w: 0.9, passes: 1 });
      }
      C.Figure.draw(ctx, fake, o.x + H * 0.45, ly, 1, { t: 0, pose: C.Figure.pose(fake, 0) });
      // Couverture sur le corps
      var bl = [[o.x - H * 0.28, ly + 8], [o.x - H * 0.25, ly - 12], [o.x + H * 0.2, ly - 13], [o.x + H * 0.48, ly - 8], [o.x + H * 0.5, ly + 8]];
      P(ctx, r, bl, d.blanket || '#77705f', 0.6);
      SK.hatchPoly(ctx, r, bl, { gap: 3.5, alpha: 0.3, angle: 0.9 });
      SK.poly(ctx, r, bl, false, { w: 1, passes: 1 });
      if (d.blood) { ctx.fillStyle = 'rgba(110,25,20,0.55)'; ctx.beginPath(); ctx.ellipse(o.x + H * 0.3, ly - 4, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); }
      return;
    }
    if (d.pose === 'sit') {
      // Assis sur une caisse
      var cw = 36, chh = H * 0.28, cx = o.x - 6 * dir - cw / 2;
      F(ctx, r, cx, y - chh, cw, chh, WOOD, 0.4); SK.rect(ctx, r, cx, y - chh, cw, chh, { w: 1, passes: 1 });
      SK.line(ctx, r, cx, y - chh / 2, cx + cw, y - chh / 2, { w: 0.7, passes: 1 });
    }
    C.Figure.draw(ctx, fake, o.x, y, dir, { t: 0.4, pose: C.Figure.pose(fake, 0.4) });
  };

  // Sortie : porte entrouverte sur la nuit
  D.exit = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - o.h;
    ctx.fillStyle = '#10100f'; ctx.fillRect(x - 4, top - 6, o.w + 8, o.h + 6);
    var g = ctx.createLinearGradient(x, 0, x + o.w, 0);
    g.addColorStop(0, 'rgba(120,140,170,0.35)'); g.addColorStop(1, 'rgba(60,70,90,0.1)');
    ctx.fillStyle = g; ctx.fillRect(x, top, o.w, o.h);
    // battant ouvert
    var leaf = [[x + o.w, top], [x + o.w + 14, top + 8], [x + o.w + 14, y - 2], [x + o.w, y]];
    P(ctx, r, leaf, WOOD2, 0.4); SK.poly(ctx, r, leaf, true, { w: 1.1 });
    SK.rect(ctx, r, x - 4, top - 6, o.w + 8, o.h + 6, { w: 1.6 });
    // flèche peinte à la main sur le mur
    ctx.strokeStyle = 'rgba(220,210,185,0.7)'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + o.w + 44, top + 30); ctx.lineTo(x + o.w + 24, top + 30); ctx.moveTo(x + o.w + 31, top + 23); ctx.lineTo(x + o.w + 24, top + 30); ctx.lineTo(x + o.w + 31, top + 37); ctx.stroke();
  };

  // Banc d'église (vu de côté)
  D.pew = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    F(ctx, r, x, y - 22, o.w, 5, WOOD, 0.3); SK.rect(ctx, r, x, y - 22, o.w, 5, { w: 1, passes: 1 });
    F(ctx, r, x + o.w - 8, y - 42, 6, 42, WOOD2, 0.3); SK.rect(ctx, r, x + o.w - 8, y - 42, 6, 42, { w: 1, passes: 1 });
    F(ctx, r, x + 2, y - 22, 5, 22, WOOD2, 0.3); SK.rect(ctx, r, x + 2, y - 22, 5, 22, { w: 0.8, passes: 1 });
    F(ctx, r, x + o.w * 0.5, y - 22, 5, 22, WOOD2, 0.3);
    SK.line(ctx, r, x + o.w - 8, y - 34, x + o.w * 0.3, y - 34, { w: 0.8, passes: 1, alpha: 0.6 });
  };

  // Autel : nappe, cierges, croix
  D.altar = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    F(ctx, r, x, y - o.h, o.w, o.h, '#6b6152', 0.4); SK.rect(ctx, r, x, y - o.h, o.w, o.h, { w: 1.2 });
    var cloth = [[x - 4, y - o.h - 2], [x + o.w + 4, y - o.h - 2], [x + o.w + 2, y - o.h + 26], [x - 2, y - o.h + 26]];
    P(ctx, r, cloth, '#cfc8b8', 0.4); SK.poly(ctx, r, cloth, true, { w: 0.9, passes: 1 });
    [x + 16, x + o.w - 20].forEach(function (cx) {
      F(ctx, r, cx, y - o.h - 22, 5, 20, '#e2dccd', 0.2); SK.rect(ctx, r, cx, y - o.h - 22, 5, 20, { w: 0.6, passes: 1 });
      ctx.fillStyle = 'rgba(255,200,120,0.9)'; ctx.beginPath(); ctx.ellipse(cx + 2.5, y - o.h - 26, 1.8, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    });
    SK.line(ctx, r, o.x, y - o.h - 2, o.x, y - o.h - 40, { w: 2.4 });
    SK.line(ctx, r, o.x - 10, y - o.h - 30, o.x + 10, y - o.h - 30, { w: 2.4 });
  };

  // Caches remplacées par de vrais objets détourés quand ils sont chargés
  var CACHE_PROPS = { caisse: 'wooden_crate_02', valise: 'vintage_suitcase', etagere: 'worn_metal_rack' };

  D.cache = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - o.h;
    if (o.variant === 'epave') {
      // Carcasse de voiture : caisse cabossée, vitres éclatées, jantes nues
      var ex = o.x - o.w / 2, eh = o.h, rust = '#5d5147';
      var body = [[ex, y - 12], [ex + 4, y - eh * 0.55], [ex + o.w * 0.22, y - eh * 0.6], [ex + o.w * 0.34, y - eh], [ex + o.w * 0.74, y - eh], [ex + o.w * 0.86, y - eh * 0.58], [ex + o.w - 2, y - eh * 0.5], [ex + o.w, y - 12]];
      P(ctx, r, body, rust, 0.9);
      SK.hatchPoly(ctx, r, body, { gap: 4, alpha: 0.28, angle: 1.1 });
      SK.poly(ctx, r, body, true, { w: 1.4 });
      var win = [[ex + o.w * 0.38, y - eh * 0.92], [ex + o.w * 0.72, y - eh * 0.92], [ex + o.w * 0.8, y - eh * 0.6], [ex + o.w * 0.3, y - eh * 0.6]];
      P(ctx, r, win, o.searched ? '#1b1a18' : '#2a2c2e', 0.3); SK.poly(ctx, r, win, true, { w: 1 });
      SK.line(ctx, r, ex + o.w * 0.45, y - eh * 0.9, ex + o.w * 0.52, y - eh * 0.66, { w: 0.7, passes: 1, alpha: 0.7 });
      SK.line(ctx, r, ex + o.w * 0.56, y - eh * 0.6, ex + o.w * 0.56, y - 14, { w: 0.9, passes: 1 });
      [ex + o.w * 0.2, ex + o.w * 0.8].forEach(function (wx) {
        ctx.fillStyle = '#1a1917'; ctx.beginPath(); ctx.arc(wx, y - 9, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6a6c6e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wx, y - 9, 6, 0, Math.PI * 2); ctx.stroke();
      });
      for (var bh = 0; bh < 5; bh++) { ctx.fillStyle = '#141312'; ctx.beginPath(); ctx.arc(ex + 20 + r.next() * (o.w - 40), y - eh * (0.2 + r.next() * 0.3), 1.8, 0, Math.PI * 2); ctx.fill(); }
      if (o.searched) SK.poly(ctx, r, [[ex + o.w * 0.86, y - eh * 0.58], [ex + o.w + 14, y - eh * 0.9], [ex + o.w + 10, y - eh * 0.5]], false, { w: 1 });
      return;
    }
    if (o.variant === 'baluchon') {
      // Objets donnés, noués dans un tissu et posés par terre
      var bn = [[o.x - 20, y], [o.x - 17, y - 16], [o.x - 6, y - 24], [o.x + 8, y - 23], [o.x + 18, y - 14], [o.x + 20, y]];
      P(ctx, r, bn, '#7a6e5c', 0.8); SK.hatchPoly(ctx, r, bn, { gap: 3, alpha: 0.28, angle: 0.8 }); SK.poly(ctx, r, bn, true, { w: 1.1 });
      SK.line(ctx, r, o.x - 4, y - 24, o.x - 10, y - 32, { w: 1.4, passes: 1 }); SK.line(ctx, r, o.x + 2, y - 24, o.x + 9, y - 31, { w: 1.4, passes: 1 });
      return;
    }
    if (o.variant === 'corps') {
      // Corps d'un soldat, allongé dans une flaque sombre
      var T = C.GUARD_TYPES && C.GUARD_TYPES[o.gtype];
      ctx.fillStyle = 'rgba(70,14,12,0.55)'; ctx.beginPath(); ctx.ellipse(o.x, y - 2, 46, 5, 0, 0, Math.PI * 2); ctx.fill();
      if (T) {
        var fake = { id: 'corps' + o.uid, look: T.look, traits: [], path: [], x: o.x, y: y, f: o.f, anim: 0, moral: 40, fatigue: 0, wound: 80, sick: 0, act: { kind: 'sleepfloor', phase: 'work' } };
        var H = C.Figure.BASE * T.look.h;
        C.Figure.draw(ctx, fake, o.x + H * 0.45, y - 9, 1, { t: 0, pose: C.Figure.pose(fake, 0) });
      }
      return;
    }
    if (o.variant === 'tas') {
      // Tas de débris : ce qui reste après avoir déblayé ou démonté
      var tp = [[x - 4, y], [x + o.w * 0.25, y - o.h * 0.8], [x + o.w * 0.55, y - o.h], [x + o.w + 4, y]];
      P(ctx, r, tp, '#57514a', 1); SK.hatchPoly(ctx, r, tp, { gap: 4, alpha: 0.35 });
      for (var st = 0; st < 5; st++) SK.stone(ctx, r, x + 6 + r.next() * (o.w - 12), y - 3 - r.next() * 8, 3 + r.next() * 3, '#6a645a');
      if (C.Props && C.Props.has('can_rusted')) C.Props.draw(ctx, 'can_rusted', o.x + 8, y - 2, 12, { line: 0.5, noShadow: true });
      return;
    }
    var cp = CACHE_PROPS[o.variant];
    if (cp && C.Props && C.Props.has(cp)) {
      if (o.variant === 'etagere') {
        C.Props.draw(ctx, cp, o.x, y, o.h, { maxW: o.w });
        // Bocaux et conserves posés au pied tant que ce n'est pas fouillé
        if (!o.searched) {
          C.Props.draw(ctx, 'can_rusted', o.x - 14, y, 16, { line: 0.6 });
          C.Props.draw(ctx, 'plastic_bottle_gallon', o.x + 12, y, 20, { line: 0.6 });
          C.Props.draw(ctx, 'russian_food_cans_01', o.x - 2, y - o.h * 0.45, 14, { line: 0.6, noShadow: true });
        }
      } else {
        C.Props.draw(ctx, cp, o.x, y, o.h, { maxW: o.w + 12, shade: o.searched ? 0.3 : 0 });
        // Couvercle soulevé / fermoir ouvert une fois fouillé
        if (o.searched && o.variant === 'caisse') SK.poly(ctx, r, [[x, top + 4], [x + 10, top - 16], [x + o.w + 10, top - 16], [x + o.w, top + 4]], false, { w: 1 });
      }
      return;
    }
    switch (o.variant) {
      case 'caisse':
        box(ctx, r, x, top, o.w, o.h, WOOD, 0);
        for (var i = 1; i < 4; i++) SK.line(ctx, r, x, top + i * o.h / 4, x + o.w, top + i * o.h / 4, { w: 0.7, passes: 1 });
        SK.line(ctx, r, x + 3, top + 3, x + o.w - 3, y - 3, { w: 1 });
        if (o.searched) SK.poly(ctx, r, [[x, top], [x + 10, top - 22], [x + o.w + 10, top - 22], [x + o.w, top]], false, { w: 1 });
        break;
      case 'etagere':
        SK.line(ctx, r, x, top, x, y, { w: 1.6 }); SK.line(ctx, r, x + o.w, top, x + o.w, y, { w: 1.6 });
        for (var s = 0; s < 4; s++) {
          var sy = top + 4 + s * (o.h - 6) / 3;
          SK.line(ctx, r, x - 2, sy, x + o.w + 2, sy, { w: 1.3 });
          if (!o.searched && s > 0) for (var k = 0; k < 4; k++) if (r.next() < 0.7) { var jx = x + 6 + k * 15; F(ctx, r, jx, sy - 14, 10, 14, '#6d6a62', 0.3); SK.rect(ctx, r, jx, sy - 14, 10, 14, { w: 0.6, passes: 1 }); }
        }
        break;
      case 'armoire':
        box(ctx, r, x, top, o.w, o.h, WOOD2, 7);
        SK.line(ctx, r, o.x, top + 4, o.x, y - 6, { w: 1 });
        F(ctx, r, x - 3, top - 5, o.w + 6, 6, WOOD, 0.3);
        SK.rect(ctx, r, x - 3, top - 5, o.w + 6, 6, { w: 1 });
        if (o.searched) {
          P(ctx, r, [[x + o.w, top + 4], [x + o.w + 18, top + 12], [x + o.w + 18, y - 12], [x + o.w, y - 6]], WOOD, 0.3);
          SK.poly(ctx, r, [[x + o.w, top + 4], [x + o.w + 18, top + 12], [x + o.w + 18, y - 12], [x + o.w, y - 6]], true, { w: 1 });
        }
        ctx.fillStyle = '#1d1d1d'; ctx.fillRect(o.x - 5, y - o.h / 2, 2, 5); ctx.fillRect(o.x + 3, y - o.h / 2, 2, 5);
        break;
      case 'coffre':
        box(ctx, r, x, top + 10, o.w, o.h - 10, WOOD2, 5);
        P(ctx, r, [[x, top + 10], [x + 4, top], [x + o.w - 4, top], [x + o.w, top + 10]], WOOD, 0.5);
        SK.poly(ctx, r, [[x, top + 10], [x + 4, top], [x + o.w - 4, top], [x + o.w, top + 10]], false, { w: 1.2 });
        SK.line(ctx, r, x + 10, top, x + 10, y, { w: 2, color: METAL2 });
        SK.line(ctx, r, x + o.w - 10, top, x + o.w - 10, y, { w: 2, color: METAL2 });
        if (o.locked) { F(ctx, r, o.x - 5, top + 12, 10, 10, METAL, 0.2); SK.rect(ctx, r, o.x - 5, top + 12, 10, 10, { w: 0.9 }); ctx.strokeStyle = SK.INK; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(o.x, top + 12, 4, Math.PI, 0); ctx.stroke(); }
        break;
      case 'pharmacie':
        // Armoire métallique émaillée, croix peinte, vitre fêlée
        box(ctx, r, x, top, o.w, o.h, '#8f8c84', 0);
        SK.hatch(ctx, r, x, top, o.w, o.h, { gap: 9, alpha: 0.12, angle: -1.2 });
        F(ctx, r, x + 5, top + 8, o.w - 10, o.h * 0.42, o.searched ? '#2b2a27' : '#4d5354', 0.2);
        SK.rect(ctx, r, x + 5, top + 8, o.w - 10, o.h * 0.42, { w: 1 });
        if (!o.searched) {
          for (var fl = 0; fl < 3; fl++) { var fx = x + 10 + fl * (o.w - 22) / 2; F(ctx, r, fx, top + 8 + o.h * 0.42 - 16, 7, 14, fl === 1 ? '#6f5a3c' : '#a7a298', 0.2); SK.rect(ctx, r, fx, top + 8 + o.h * 0.42 - 16, 7, 14, { w: 0.6, passes: 1 }); }
        }
        SK.line(ctx, r, x + 8, top + 12, x + o.w * 0.55, top + o.h * 0.3, { w: 0.6, passes: 1, alpha: 0.7 });
        SK.line(ctx, r, x + 5, top + o.h * 0.55, x + o.w - 5, top + o.h * 0.55, { w: 1 });
        var ccx = o.x, ccy = top + o.h * 0.74;
        ctx.fillStyle = 'rgba(128,40,34,0.82)';
        ctx.fillRect(ccx - 3.5, ccy - 11, 7, 22); ctx.fillRect(ccx - 11, ccy - 3.5, 22, 7);
        if (o.locked) { F(ctx, r, x + o.w - 12, top + o.h * 0.58, 7, 10, METAL, 0.2); SK.rect(ctx, r, x + o.w - 12, top + o.h * 0.58, 7, 10, { w: 0.8, passes: 1 }); }
        if (o.searched) {
          P(ctx, r, [[x + o.w, top + 6], [x + o.w + 16, top + 14], [x + o.w + 16, top + o.h * 0.5], [x + o.w, top + o.h * 0.5 + 4]], '#8f8c84', 0.3);
          SK.poly(ctx, r, [[x + o.w, top + 6], [x + o.w + 16, top + 14], [x + o.w + 16, top + o.h * 0.5], [x + o.w, top + o.h * 0.5 + 4]], true, { w: 1 });
        }
        break;
      case 'valise':
        box(ctx, r, x, top, o.w, o.h, '#5b4f43', 4);
        SK.poly(ctx, r, [[o.x - 10, top], [o.x - 8, top - 7], [o.x + 8, top - 7], [o.x + 10, top]], false, { w: 1.2 });
        SK.line(ctx, r, x, top + o.h / 2, x + o.w, top + o.h / 2, { w: 0.8 });
        break;
    }
  };

  D.furniture = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - o.h;
    if (o.variant === 'commode') {
      box(ctx, r, x, top, o.w, o.h - 6, WOOD, 6);
      legs(ctx, r, x + 2, y - 6, o.w - 4, 6);
      for (var i = 1; i < 3; i++) SK.line(ctx, r, x + 2, top + i * (o.h - 6) / 3, x + o.w - 2, top + i * (o.h - 6) / 3, { w: 0.8 });
      SK.crack(ctx, r, x + 10, top + 4, 30, 0.8);
    } else if (o.variant === 'bibliotheque') {
      box(ctx, r, x, top, o.w, o.h, WOOD2, 0);
      for (var s = 0; s < 4; s++) {
        var sy = top + 6 + s * (o.h - 8) / 4 + (o.h - 8) / 4;
        SK.line(ctx, r, x, sy, x + o.w, sy, { w: 1.1 });
        var bx = x + 4;
        while (bx < x + o.w - 8) {
          var bw = 4 + r.next() * 5, bh = 14 + r.next() * 10;
          if (r.next() < 0.8) { F(ctx, r, bx, sy - bh, bw, bh, r.next() < 0.5 ? '#6e665a' : '#4d4740', 0.2); SK.line(ctx, r, bx, sy - bh, bx, sy, { w: 0.5, passes: 1 }); }
          bx += bw + 0.5;
        }
      }
    } else {
      box(ctx, r, x, top, o.w, o.h, WOOD, 8);
      SK.line(ctx, r, o.x, top + 4, o.x, y - 4, { w: 1 });
      SK.crack(ctx, r, x + 6, top + 20, 40, 1.3);
    }
  };

  D.bed = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    if (o.metal) { hospitalBed(ctx, r, o, x, y); return; }
    F(ctx, r, x, y - 30, 8, 30, WOOD2, 0.3); SK.rect(ctx, r, x, y - 44, 8, 44, { w: 1.2 });
    F(ctx, r, x + o.w - 8, y - 22, 8, 22, WOOD2, 0.3); SK.rect(ctx, r, x + o.w - 8, y - 30, 8, 30, { w: 1.2 });
    box(ctx, r, x + 6, y - 22, o.w - 12, 10, WOOD, 0);
    P(ctx, r, [[x + 8, y - 22], [x + 10, y - 32], [x + o.w - 10, y - 33], [x + o.w - 8, y - 22]], '#8a8478', 1);
    SK.poly(ctx, r, [[x + 8, y - 22], [x + 10, y - 32], [x + o.w - 10, y - 33], [x + o.w - 8, y - 22]], true, { w: 1 });
    P(ctx, r, [[x + 12, y - 32], [x + 14, y - 40], [x + 36, y - 40], [x + 38, y - 32]], '#a19b8e', 1);
    SK.poly(ctx, r, [[x + 12, y - 32], [x + 14, y - 40], [x + 36, y - 40], [x + 38, y - 32]], true, { w: 0.9 });
    var bl = [[x + 40, y - 34], [x + o.w - 10, y - 35], [x + o.w - 6, y - 16], [x + 44, y - 18]];
    P(ctx, r, bl, '#686257', 1);
    SK.hatchPoly(ctx, r, bl, { gap: 4, alpha: 0.3, angle: 0.9 });
    SK.poly(ctx, r, bl, true, { w: 1 });
  };

  // Lit d'hôpital : cadre en tube, roulettes, drap clair
  function hospitalBed(ctx, r, o, x, y) {
    [x + 4, x + o.w - 8].forEach(function (lx, i) {
      var hh = i ? 34 : 48;
      SK.line(ctx, r, lx, y - 6, lx, y - hh, { w: 2.2, color: METAL2 });
      SK.line(ctx, r, lx + 4, y - 6, lx + 4, y - hh, { w: 2.2, color: METAL2 });
      SK.line(ctx, r, lx - 1, y - hh, lx + 5, y - hh, { w: 2, color: METAL2 });
      SK.line(ctx, r, lx, y - hh + 12, lx + 4, y - hh + 12, { w: 1, passes: 1 });
      ctx.strokeStyle = SK.INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx + 2, y - 3, 3, 0, Math.PI * 2); ctx.stroke();
    });
    F(ctx, r, x + 6, y - 22, o.w - 12, 6, METAL, 0.2); SK.rect(ctx, r, x + 6, y - 22, o.w - 12, 6, { w: 1 });
    var sheet = [[x + 8, y - 22], [x + 10, y - 32], [x + o.w - 10, y - 33], [x + o.w - 8, y - 22]];
    P(ctx, r, sheet, '#aaa497', 0.8); SK.poly(ctx, r, sheet, true, { w: 1 });
    var pil = [[x + 12, y - 32], [x + 14, y - 40], [x + 36, y - 40], [x + 38, y - 32]];
    P(ctx, r, pil, '#bcb6a8', 0.8); SK.poly(ctx, r, pil, true, { w: 0.9 });
    SK.stain(ctx, x + o.w * 0.6, y - 27, 10, 0.12);
    // Pied à perfusion
    var px = x + o.w + 10;
    SK.line(ctx, r, px, y, px, y - 92, { w: 1.3 });
    SK.line(ctx, r, px - 8, y, px + 8, y, { w: 1.3 });
    SK.line(ctx, r, px - 7, y - 92, px + 7, y - 92, { w: 1 });
    F(ctx, r, px - 5, y - 90, 10, 16, '#b7b8ae', 0.2); SK.rect(ctx, r, px - 5, y - 90, 10, 16, { w: 0.8, passes: 1 });
    ctx.strokeStyle = 'rgba(40,38,34,0.6)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(px, y - 74); ctx.quadraticCurveTo(px - 10, y - 50, x + o.w - 30, y - 34); ctx.stroke();
  }

  // Recoin sombre : renfoncement dans le mur, rideau déchiré (cachette)
  D.hide = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - o.h;
    var rec = [[x, y], [x, top + 10], [o.x, top], [x + o.w, top + 10], [x + o.w, y]];
    P(ctx, r, rec, '#1b1a18', 0.4);
    var g = ctx.createLinearGradient(x, 0, x + o.w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.5, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g; ctx.beginPath(); rec.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
    SK.poly(ctx, r, rec, false, { w: 1.2 });
    // Rideau de toile qui pend d'un côté
    var cur = [[x + 2, top + 10], [x + 16, top + 8], [x + 13, y - 20], [x + 19, y - 2], [x + 2, y - 4]];
    P(ctx, r, cur, '#4b463d', 0.8); SK.hatchPoly(ctx, r, cur, { gap: 3, alpha: 0.3, angle: 0.1 }); SK.poly(ctx, r, cur, true, { w: 0.8, passes: 1 });
  };

  // Sacs de sable empilés
  D.sandbags = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, bw = 30, rows = 3;
    for (var j = 0; j < rows; j++) {
      var n = Math.floor(o.w / bw) - (j % 2 ? 1 : 0);
      for (var i = 0; i < n; i++) {
        var bx = x + i * bw + (j % 2 ? bw / 2 : 0), by = y - (j + 1) * 12;
        var bag = [[bx, by + 12], [bx + 2, by + 2], [bx + bw / 2, by], [bx + bw - 2, by + 2], [bx + bw, by + 12]];
        P(ctx, r, bag, '#6f6553', 0.8); SK.hatchPoly(ctx, r, bag, { gap: 3.5, alpha: 0.25, angle: 1.3 }); SK.poly(ctx, r, bag, true, { w: 0.9, passes: 1 });
      }
    }
  };

  // Tableau noir d'une salle de classe (craie à moitié effacée)
  D.blackboard = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - 150;
    F(ctx, r, x - 5, top - 5, o.w + 10, o.h + 10, WOOD, 0.3); SK.rect(ctx, r, x - 5, top - 5, o.w + 10, o.h + 10, { w: 1.2 });
    SK.fillRect(ctx, r, x, top, o.w, o.h, '#2f3530', 0.3); SK.rect(ctx, r, x, top, o.w, o.h, { w: 1 });
    ctx.save();
    ctx.strokeStyle = 'rgba(215,210,195,0.55)'; ctx.fillStyle = 'rgba(215,210,195,0.6)'; ctx.lineWidth = 1;
    ctx.font = '11px "Special Elite", monospace';
    ctx.fillText('7 × 8 = 56', x + 10, top + 18);
    ctx.globalAlpha = 0.35; ctx.fillText('la paix', x + 14, top + 38); ctx.globalAlpha = 1;
    // Maison et soleil dessinés par un enfant
    ctx.beginPath(); ctx.moveTo(x + 70, top + o.h - 10); ctx.lineTo(x + 70, top + o.h - 28); ctx.lineTo(x + 82, top + o.h - 38); ctx.lineTo(x + 94, top + o.h - 28); ctx.lineTo(x + 94, top + o.h - 10); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + o.w - 22, top + o.h - 26, 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(215,210,195,0.12)'; ctx.fillRect(x + 20, top + 44, 42, 12);
    ctx.restore();
    SK.line(ctx, r, x, top + o.h + 7, x + o.w, top + o.h + 7, { w: 1.4 });
    F(ctx, r, x + 12, top + o.h + 4, 10, 3, '#d8d2c4', 0);
  };

  // Pupitre d'écolier
  D.desk = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    var lid = [[x - 2, y - o.h], [x + o.w + 2, y - o.h - 5], [x + o.w + 2, y - o.h + 1], [x - 2, y - o.h + 6]];
    P(ctx, r, lid, WOOD, 0.4); SK.poly(ctx, r, lid, true, { w: 1 });
    F(ctx, r, x + 4, y - o.h + 6, o.w - 8, 12, WOOD2, 0.3); SK.rect(ctx, r, x + 4, y - o.h + 6, o.w - 8, 12, { w: 0.9, passes: 1 });
    SK.line(ctx, r, x + 6, y - o.h + 18, x + 6, y, { w: 1.6, color: METAL2 });
    SK.line(ctx, r, x + o.w - 6, y - o.h + 18, x + o.w - 6, y, { w: 1.6, color: METAL2 });
    SK.line(ctx, r, x + 6, y - 10, x + o.w - 6, y - 10, { w: 1, passes: 1, color: METAL2 });
    // Encrier et cahier oublié
    ctx.fillStyle = '#1d1d1d'; ctx.beginPath(); ctx.arc(x + o.w - 12, y - o.h - 3, 2.4, 0, Math.PI * 2); ctx.fill();
    F(ctx, r, x + 10, y - o.h - 4, 16, 4, '#b9b2a1', 0);
  };

  D.stove = function (ctx, r, o, y) {
    var x = o.x - 32, top = y - 60;
    pipeUp(ctx, r, o.x + 18, top - 4, o.f);
    box(ctx, r, x, top, 64, 50, METAL, 5);
    legs(ctx, r, x + 2, y - 10, 60, 10);
    SK.rect(ctx, r, x + 8, top + 14, 24, 22, { w: 1 });
    for (var i = 0; i < 3; i++) SK.line(ctx, r, x + 11, top + 20 + i * 6, x + 29, top + 20 + i * 6, { w: 0.7, passes: 1 });
    // Marmite
    P(ctx, r, [[x + 6, top], [x + 8, top - 18], [x + 34, top - 18], [x + 36, top]], '#3f3f40', 0.5);
    SK.poly(ctx, r, [[x + 6, top], [x + 8, top - 18], [x + 34, top - 18], [x + 36, top]], true, { w: 1.1 });
    SK.line(ctx, r, x + 3, top - 16, x + 39, top - 16, { w: 1.3 });
    if (o.level >= 2) { SK.rect(ctx, r, x + 40, top + 14, 16, 26, { w: 1 }); SK.line(ctx, r, x + 44, top + 27, x + 52, top + 27, { w: 1 }); }
  };

  D.heater = function (ctx, r, o, y) {
    var cx = o.x;
    pipeUp(ctx, r, cx, y - 80, o.f);
    var body = [];
    for (var i = 0; i <= 16; i++) {
      var t = i / 16, a = Math.PI * t;
      body.push([cx + Math.sin(a) * (24 + (o.level - 1) * 3), y - 14 - t * 62]);
    }
    for (i = 16; i >= 0; i--) {
      var a2 = Math.PI * (i / 16);
      body.push([cx - Math.sin(a2) * (24 + (o.level - 1) * 3), y - 14 - (i / 16) * 62]);
    }
    P(ctx, r, body, '#3b3c3e', 0.5);
    SK.hatchPoly(ctx, r, body, { gap: 4, alpha: 0.3, angle: 1.2 });
    SK.poly(ctx, r, body, true, { w: 1.3, passes: 1 });
    F(ctx, r, cx - 20, y - 82, 40, 8, METAL2, 0.3); SK.rect(ctx, r, cx - 20, y - 82, 40, 8, { w: 1 });
    F(ctx, r, cx - 22, y - 16, 44, 6, METAL2, 0.3); SK.rect(ctx, r, cx - 22, y - 16, 44, 6, { w: 1 });
    legs(ctx, r, cx - 22, y - 10, 44, 10);
    // Porte du foyer
    SK.rect(ctx, r, cx - 11, y - 46, 22, 18, { w: 1.1 });
    for (i = 0; i < 4; i++) SK.line(ctx, r, cx - 8 + i * 5.5, y - 44, cx - 8 + i * 5.5, y - 30, { w: 0.8, passes: 1 });
    if (o.level >= 3) SK.rect(ctx, r, cx - 16, y - 70, 32, 10, { w: 0.9 });
  };

  D.collector = function (ctx, r, o, y) {
    var cx = o.x;
    var top = C.FLOORS[o.f].ceil;
    // Tuyau vers le toit
    SK.line(ctx, r, cx + 10, top, cx + 10, y - 86, { w: 5, color: METAL2, passes: 1 });
    SK.line(ctx, r, cx + 7, top, cx + 7, y - 86, { w: 0.9 }); SK.line(ctx, r, cx + 13, top, cx + 13, y - 86, { w: 0.9 });
    // Entonnoir
    P(ctx, r, [[cx - 22, y - 86], [cx + 26, y - 86], [cx + 8, y - 68], [cx - 4, y - 68]], METAL, 0.5);
    SK.poly(ctx, r, [[cx - 22, y - 86], [cx + 26, y - 86], [cx + 8, y - 68], [cx - 4, y - 68]], true, { w: 1.1 });
    if (o.level >= 2) { F(ctx, r, cx - 8, y - 72, 20, 6, '#6d6d6a', 0.3); SK.rect(ctx, r, cx - 8, y - 72, 20, 6, { w: 0.8 }); }
    // Tonneau
    var bpts = [[cx - 26, y], [cx - 30, y - 34], [cx - 26, y - 66], [cx + 26, y - 66], [cx + 30, y - 34], [cx + 26, y]];
    P(ctx, r, bpts, '#56595c', 0.6);
    SK.hatchPoly(ctx, r, bpts, { gap: 6, alpha: 0.2, angle: 1.5 });
    SK.poly(ctx, r, bpts, true, { w: 1.3 });
    SK.line(ctx, r, cx - 29, y - 20, cx + 29, y - 20, { w: 1.1 });
    SK.line(ctx, r, cx - 29, y - 48, cx + 29, y - 48, { w: 1.1 });
    // Robinet
    SK.line(ctx, r, cx + 26, y - 12, cx + 36, y - 12, { w: 2 }); SK.line(ctx, r, cx + 36, y - 12, cx + 36, y - 6, { w: 1.5 });
  };

  D.rattrap = function (ctx, r, o, y) {
    var x = o.x - 24;
    box(ctx, r, x, y - 20, 48, 20, WOOD, 4);
    for (var i = 0; i < 6; i++) SK.line(ctx, r, x + 30 + i * 3, y - 20, x + 30 + i * 3, y, { w: 0.6, passes: 1 });
    SK.poly(ctx, r, [[x + 4, y - 20], [x + 14, y - 30], [x + 26, y - 20]], false, { w: 1 });
  };

  function plants(ctx, r, x, y, w, n, h, leafy) {
    for (var i = 0; i < n; i++) {
      var px = x + (i + 0.5) * w / n;
      var ph = h * (0.6 + r.next() * 0.5);
      SK.line(ctx, r, px, y, px + (r.next() - 0.5) * 6, y - ph, { w: 1, passes: 1, color: '#2e3129' });
      for (var l = 0; l < (leafy ? 4 : 2); l++) {
        var ly = y - ph * (0.3 + l * 0.2), side = l % 2 ? 1 : -1;
        P(ctx, r, [[px, ly], [px + side * 9, ly - 5], [px + side * 3, ly - 2]], '#4c5245', 0.5);
      }
    }
  }
  D.garden = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    box(ctx, r, x, y - 26, o.w, 26, WOOD, 5);
    F(ctx, r, x + 4, y - 30, o.w - 8, 6, '#3a342c', 0.8);
    var need = 5, g = o.growth || 0;
    if (g > 0) plants(ctx, r, x + 4, y - 28, o.w - 8, 6, 6 + g * 5, g >= need);
    if (o.watered > 0) { SK.stain(ctx, x + 30, y - 28, 12, 0.3); SK.stain(ctx, x + 80, y - 28, 12, 0.3); }
    // Arrosoir
    P(ctx, r, [[x + o.w + 2, y], [x + o.w + 4, y - 14], [x + o.w + 16, y - 14], [x + o.w + 18, y]], METAL, 0.5);
    SK.poly(ctx, r, [[x + o.w + 2, y], [x + o.w + 4, y - 14], [x + o.w + 16, y - 14], [x + o.w + 18, y]], true, { w: 0.9, passes: 1 });
  };
  D.herbgarden = function (ctx, r, o, y) {
    var x = o.x - o.w / 2;
    for (var i = 0; i < 3; i++) {
      var px = x + 4 + i * 25;
      var pts = [[px, y - 20], [px + 20, y - 20], [px + 16, y], [px + 4, y]];
      P(ctx, r, pts, '#6e5a4a', 0.5);
      SK.poly(ctx, r, pts, true, { w: 1 });
      var g = o.growth || 0;
      if (g > 0) plants(ctx, r, px + 3, y - 20, 14, 2, 5 + g * 6, g >= 3);
    }
  };

  D.still = function (ctx, r, o, y) {
    var cx = o.x - 10;
    // Cuve
    var pts = [];
    for (var i = 0; i <= 20; i++) { var a = Math.PI * i / 20; pts.push([cx - Math.cos(a) * 26, y - 16 - Math.sin(a) * 50]); }
    pts.push([cx + 26, y - 8]); pts.push([cx - 26, y - 8]);
    P(ctx, r, pts, '#6a5a4a', 0.5);
    SK.hatchPoly(ctx, r, pts, { gap: 5, alpha: 0.25, angle: 1.3 });
    SK.poly(ctx, r, pts, true, { w: 1.2, passes: 1 });
    legs(ctx, r, cx - 24, y - 10, 48, 10);
    // Serpentin
    SK.line(ctx, r, cx, y - 66, cx + 30, y - 76, { w: 2 });
    SK.line(ctx, r, cx + 30, y - 76, cx + 34, y - 50, { w: 2 });
    for (i = 0; i < 4; i++) { ctx.strokeStyle = SK.INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx + 36, y - 46 + i * 8, 10, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    // Seau
    P(ctx, r, [[cx + 28, y], [cx + 26, y - 18], [cx + 48, y - 18], [cx + 46, y]], METAL, 0.4);
    SK.poly(ctx, r, [[cx + 28, y], [cx + 26, y - 18], [cx + 48, y - 18], [cx + 46, y]], true, { w: 1 });
  };

  D.herbshop = function (ctx, r, o, y) {
    var x = o.x - o.w / 2, top = y - 40;
    // Herbes suspendues
    SK.line(ctx, r, x, top - 34, x + o.w, top - 34, { w: 0.8 });
    for (var i = 0; i < 5; i++) {
      var hx = x + 10 + i * 18;
      SK.line(ctx, r, hx, top - 34, hx, top - 26, { w: 0.6, passes: 1 });
      P(ctx, r, [[hx - 5, top - 26], [hx + 5, top - 26], [hx + 2, top - 10], [hx - 2, top - 10]], '#4c5245', 0.8);
    }
    F(ctx, r, x, top, o.w, 8, WOOD, 0.4); SK.rect(ctx, r, x, top, o.w, 8, { w: 1.3 });
    legs(ctx, r, x + 2, top + 8, o.w - 4, 32);
    // Bocaux
    for (i = 0; i < 4; i++) {
      var jx = x + 8 + i * 20, jh = 10 + (i % 2) * 6;
      F(ctx, r, jx, top - jh, 12, jh, '#7d8579', 0.3);
      SK.rect(ctx, r, jx, top - jh, 12, jh, { w: 0.8, passes: 1 });
      SK.line(ctx, r, jx - 1, top - jh, jx + 13, top - jh, { w: 1.4, passes: 1 });
    }
    // Mortier
    P(ctx, r, [[x + o.w - 20, top], [x + o.w - 22, top - 10], [x + o.w - 6, top - 10], [x + o.w - 8, top]], '#77736b', 0.4);
    SK.poly(ctx, r, [[x + o.w - 20, top], [x + o.w - 22, top - 10], [x + o.w - 6, top - 10], [x + o.w - 8, top]], true, { w: 0.9 });
  };

  D.armchair = function (ctx, r, o, y) {
    var x = o.x - 32;
    if (C.Props && C.Props.has('ArmChair_01')) {
      C.Props.draw(ctx, 'ArmChair_01', o.x, y, 76, { maxW: 72, shade: 0.28 });
      return;
    }
    var back = [[x + 4, y - 20], [x + 2, y - 68], [x + 22, y - 72], [x + 24, y - 30]];
    P(ctx, r, back, CLOTH, 1); SK.hatchPoly(ctx, r, back, { gap: 4, alpha: 0.3 }); SK.poly(ctx, r, back, true, { w: 1.3 });
    var seat = [[x + 4, y - 12], [x + 4, y - 30], [x + 62, y - 30], [x + 62, y - 12]];
    P(ctx, r, seat, '#6f6a5f', 1); SK.hatchPoly(ctx, r, seat, { gap: 5, alpha: 0.25, angle: 0.5 }); SK.poly(ctx, r, seat, true, { w: 1.2 });
    var arm = [[x + 50, y - 26], [x + 52, y - 44], [x + 66, y - 44], [x + 66, y - 14]];
    P(ctx, r, arm, CLOTH, 1); SK.poly(ctx, r, arm, true, { w: 1.2 });
    legs(ctx, r, x + 4, y - 12, 60, 12);
    SK.line(ctx, r, x + 20, y - 58, x + 30, y - 48, { w: 0.8, passes: 1 }); // déchirure
  };

  D.radio = function (ctx, r, o, y) {
    var x = o.x - 26, top = y - 38;
    F(ctx, r, x, top, 52, 6, WOOD, 0.3); SK.rect(ctx, r, x, top, 52, 6, { w: 1.2 });
    legs(ctx, r, x + 2, top + 6, 48, 32);
    // Vrai poste à lampes posé sur la table
    if (C.Props && C.Props.has('vintage_radio_transceiver')) {
      C.Props.draw(ctx, 'vintage_radio_transceiver', o.x, top, 40, { maxW: 60, noShadow: true, line: 0.7 });
      return;
    }
    box(ctx, r, x + 6, top - 26, 40, 26, '#5e554a', 0);
    ctx.strokeStyle = SK.INK; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 18, top - 13, 8, 0, Math.PI * 2); ctx.stroke();
    for (var i = 0; i < 3; i++) SK.line(ctx, r, x + 12, top - 17 + i * 4, x + 24, top - 17 + i * 4, { w: 0.5, passes: 1 });
    SK.rect(ctx, r, x + 30, top - 20, 12, 7, { w: 0.8, passes: 1 });
    ctx.beginPath(); ctx.arc(x + 36, top - 7, 2.5, 0, Math.PI * 2); ctx.stroke();
    SK.line(ctx, r, x + 40, top - 26, x + 52, top - 58, { w: 1 });
  };
})(window.CQR);
