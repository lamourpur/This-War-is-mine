/* =========================================================
   Plans à géométrie libre (lieux d'exploration)
   Comme dans le jeu d'origine, chaque lieu a sa propre forme : hangar
   haut de plafond, mezzanine, cour à ciel ouvert, toit praticable,
   sous-sol… plus large que l'écran (la caméra défile).

   Un plan « layout » (dans C.MAPS) décrit :
     world   : { W, H, left, right, ground, view }  taille du monde, largeur cadrée
     floors  : niveaux praticables { y, ceil, x0, x1, name, ground, catwalk,
               out (à ciel ouvert), roof, segs: [{x0, x1, out, tex}], support }
     start   : { f, x }  point d'entrée (sortie du plan)
     rooms   : fonds (murs du fond) { x0, x1, top, bottom, wall, tone,
               columns, truss, lamps: [x…], racks: [{x0, x1, h, levels}] }
     shells  : bâtiments { x0, x1, top, bottom, wall, roof: 'saw'|'flat'|'gable',
               left/right: false (pas de mur), gaps: {left|right: [{y0, y1, shutter}]} }
     stairs  : { a, b, type: 'stairs'|'metal'|'ladder'|'hole'|'link' }
     windows : { f, x, y?, w?, h?, kind: 'strip'|'vent'|…, broken }
     fences  : grillages { f, x0, x1 }
     things  : décor dessiné { kind: 'forklift'|'container'|'truck', f, x, flip }
     lights  : { x, y, kind: 'brasero'|'lamp'|'searchlight', r }
     backdrop: { far: 'city', mid: ['cranes', 'containers', 'chimneys'] }
   Le rendu reprend le trait crayonné et les textures du refuge.
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch, U = C.util;
  var L = C.Layout = {};
  var INK = '#1c1b1a';

  function tex(ctx, shape, k, o) { if (C.Tex && C.Tex.ready) C.Tex.paint(ctx, shape, k, o); }
  function fl(f) { return C.FLOORS[f]; }

  // ============================================================ arrière-plan
  // Trois plans de ville qui défilent moins vite que le lieu (parallaxe).
  var BD = {};
  function buildLayer(m, depth) {
    var Wd = C.WORLD.W, g = C.WORLD.ground;
    var p = depth.p, LW = Math.ceil(Wd * (2 - p) + 600), LH = g + 20;
    var k = 0.5;                                   // résolution : 0,5 px par unité (flou lointain)
    var cv = document.createElement('canvas');
    cv.width = Math.ceil(LW * k); cv.height = Math.ceil(LH * k);
    var ctx = cv.getContext('2d');
    ctx.setTransform(k, 0, 0, k, 0, 0);
    var r = SK.rng(depth.seed);
    ctx.fillStyle = depth.color;
    ctx.strokeStyle = depth.color;
    var kinds = depth.kinds;
    // Silhouettes de la ville (immeubles éventrés)
    if (kinds.indexOf('city') >= 0) {
      var x = -20;
      while (x < LW + 20) {
        var bw = r.range(50, 140), bh = r.range(90, 300) * depth.hk;
        var top = g - bh;
        ctx.beginPath(); ctx.moveTo(x, g); ctx.lineTo(x, top + r.range(0, 20));
        var steps = 3 + Math.floor(r.next() * 4);
        for (var s = 1; s <= steps; s++) ctx.lineTo(x + bw * s / steps, top + r.range(-8, 40) * (r.next() < 0.3 ? 2 : 1));
        ctx.lineTo(x + bw, g); ctx.closePath(); ctx.fill();
        if (depth.windows) {
          ctx.fillStyle = 'rgba(20,19,17,0.55)';
          for (var wy = top + 26; wy < g - 20; wy += 28) for (var wx = x + 8; wx < x + bw - 12; wx += 17) if (r.next() < 0.45) ctx.fillRect(wx, wy, 7, 11);
          ctx.fillStyle = depth.color;
        }
        x += bw + r.range(-6, 24);
      }
      // Un dôme et un clocher, au loin
      var dx = LW * 0.37;
      ctx.beginPath(); ctx.arc(dx, g - 250 * depth.hk, 70, Math.PI, 0); ctx.lineTo(dx + 70, g); ctx.lineTo(dx - 70, g); ctx.closePath(); ctx.fill();
      ctx.fillRect(dx - 4, g - 250 * depth.hk - 110, 8, 45);
      var sx = LW * 0.71;
      ctx.beginPath(); ctx.moveTo(sx - 24, g); ctx.lineTo(sx - 24, g - 300 * depth.hk); ctx.lineTo(sx, g - 420 * depth.hk); ctx.lineTo(sx + 24, g - 300 * depth.hk); ctx.lineTo(sx + 24, g); ctx.closePath(); ctx.fill();
    }
    // Grues du port : pylônes en treillis, flèche, câble
    if (kinds.indexOf('cranes') >= 0) {
      [0.12, 0.3, 0.55, 0.8].forEach(function (fx, i) {
        var cx = LW * fx + r.range(-80, 80), h = r.range(340, 440), arm = r.range(220, 320) * (i % 2 ? -1 : 1);
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - 30, g); ctx.lineTo(cx - 8, g - h); ctx.lineTo(cx + 8, g - h); ctx.lineTo(cx + 30, g); ctx.stroke();
        ctx.lineWidth = 1.6;
        for (var yy = 0; yy < h - 20; yy += 26) {
          var a0 = 30 - 22 * yy / h, a1 = 30 - 22 * (yy + 26) / h;
          ctx.beginPath(); ctx.moveTo(cx - a0, g - yy); ctx.lineTo(cx + a1, g - yy - 26); ctx.moveTo(cx + a0, g - yy); ctx.lineTo(cx - a1, g - yy - 26); ctx.stroke();
        }
        ctx.fillRect(cx - 18, g - h - 30, 36, 30);                     // cabine
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx - arm * 0.25, g - h - 12); ctx.lineTo(cx + arm, g - h - 4); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx, g - h - 60); ctx.lineTo(cx + arm, g - h - 4); ctx.moveTo(cx, g - h - 60); ctx.lineTo(cx - arm * 0.25, g - h - 12); ctx.stroke();
        ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, g - h - 30); ctx.lineTo(cx, g - h - 60); ctx.stroke();
        var hx = cx + arm * r.range(0.5, 0.9);
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(hx, g - h - 6); ctx.lineTo(hx, g - h + r.range(80, 200)); ctx.stroke();
      });
    }
    // Piles de conteneurs sur les quais
    if (kinds.indexOf('containers') >= 0) {
      for (var c = 0; c < 14; c++) {
        var bx = r.range(0, LW), n = 1 + Math.floor(r.next() * 3);
        for (var j = 0; j < n; j++) {
          var cw = r.next() < 0.5 ? 120 : 60, ox = r.range(-20, 20);
          ctx.fillRect(bx + ox, g - (j + 1) * 52, cw, 50);
          ctx.fillStyle = 'rgba(20,19,17,0.35)';
          for (var rib = 4; rib < cw - 2; rib += 7) ctx.fillRect(bx + ox + rib, g - (j + 1) * 52 + 3, 1.5, 44);
          ctx.fillStyle = depth.color;
        }
      }
    }
    // Cheminées d'usine
    if (kinds.indexOf('chimneys') >= 0) {
      [0.2, 0.47, 0.63, 0.9].forEach(function (fx) {
        var cx = LW * fx + r.range(-60, 60), h = r.range(260, 380);
        ctx.beginPath(); ctx.moveTo(cx - 20, g); ctx.lineTo(cx - 12, g - h); ctx.lineTo(cx + 12, g - h); ctx.lineTo(cx + 20, g); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - 15, g - h - 8, 30, 10);
        // Une cheminée sur deux porte encore une fumée d'incendie
        if (r.next() < 0.6) for (var k2 = 0; k2 < 9; k2++) SK.stain(ctx, cx + k2 * 16 + r.range(-8, 8), g - h - 20 - k2 * 34, 26 + k2 * 8, 0.1, '40,38,35');
      });
    }
    // Ruines proches : pans de murs, poteaux tordus
    if (kinds.indexOf('ruins') >= 0) {
      var x2 = 0;
      while (x2 < LW) {
        var w2 = r.range(60, 200), h2 = r.range(40, 170);
        ctx.beginPath(); ctx.moveTo(x2, g); ctx.lineTo(x2, g - h2 * 0.6);
        ctx.lineTo(x2 + w2 * 0.3, g - h2); ctx.lineTo(x2 + w2 * 0.55, g - h2 * 0.7); ctx.lineTo(x2 + w2 * 0.8, g - h2 * 0.85); ctx.lineTo(x2 + w2, g - h2 * 0.3); ctx.lineTo(x2 + w2, g); ctx.closePath(); ctx.fill();
        if (r.next() < 0.3) { ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x2 + w2 + 20, g); ctx.lineTo(x2 + w2 + 26, g - 180); ctx.lineTo(x2 + w2 + 50, g - 170); ctx.stroke(); }
        x2 += w2 + r.range(80, 320);
      }
    }
    return { cv: cv, LW: LW, LH: LH, p: p, x0: Wd / 2 - LW / 2 };
  }
  function layers(m) {
    var key = m.id || 'plan';
    if (BD[key] && BD[key].W === C.WORLD.W) return BD[key].list;
    var bd = m.backdrop || {};
    var list = [
      buildLayer(m, { p: 0.08, seed: 101, color: '#5f5d58', kinds: [bd.far || 'city'], hk: 1.2, windows: false }),
      buildLayer(m, { p: 0.3, seed: 202, color: '#4a4844', kinds: bd.mid || ['city'], hk: 1, windows: true }),
      buildLayer(m, { p: 0.62, seed: 303, color: '#3a3834', kinds: bd.near || ['ruins'], hk: 0.8 })
    ];
    BD[key] = { W: C.WORLD.W, list: list };
    return list;
  }

  // Ciel + trois plans, dessinés à chaque image (parallaxe selon la caméra)
  L.drawBackdrop = function (ctx, m, R, shx, shy, t) {
    var cw = R.canvas.width, ch = R.canvas.height, s = R.scale;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, '#4a4945'); g.addColorStop(0.55, '#6e6b64'); g.addColorStop(1, '#585550');
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(s, 0, 0, s, R.ox + shx * s, R.oy + shy * s);
    var cx = R.cam ? R.cam.cx : C.WORLD.W / 2, mid = C.WORLD.W / 2;
    layers(m).forEach(function (ly) {
      var off = (cx - mid) * (1 - ly.p);
      ctx.drawImage(ly.cv, ly.x0 + off, C.WORLD.ground + 20 - ly.LH, ly.LW, ly.LH);
    });
    // La terre continue au-delà des bords du plan
    ctx.fillStyle = '#2f2c28'; ctx.fillRect(-6000, C.WORLD.ground + 2, C.WORLD.W + 12000, 6000);
    ctx.restore();
  };

  // ============================================================ couche statique
  L.drawStatic = function (ctx, m) {
    var r = SK.rng(4242);
    earth(ctx, r, m);
    (m.fences || []).forEach(function (fe, i) { fence(ctx, SK.rng(120 + i), fe); });
    (m.rooms || []).forEach(function (rm, i) { room(ctx, SK.rng(900 + i), rm); });
    windows(ctx, SK.rng(77));
    (m.shells || []).forEach(function (sh, i) { shell(ctx, SK.rng(500 + i), sh); });
    (m.things || []).forEach(function (th, i) { thing(ctx, SK.rng(700 + i), th); });
    C.STAIRS.forEach(function (st, i) { if (st.type !== 'hole' && st.type !== 'link') stairs(ctx, SK.rng(300 + i), st); });
    C.FLOORS.forEach(function (f, i) { slab(ctx, SK.rng(40 + i), f, i); });
    C.STAIRS.forEach(function (st, i) { if (st.type === 'hole') hole(ctx, SK.rng(350 + i), st); });
    partitions(ctx, SK.rng(66));
  };
  // Devant le décor : rambardes, grillages, poteaux
  L.drawFront = function (ctx, m) {
    C.FLOORS.forEach(function (f, i) { if (f.catwalk) railing(ctx, SK.rng(80 + i), f, i); });
  };

  // Terre et sol extérieur sous tout le plan
  function earth(ctx, r, m) {
    var W = C.WORLD.W, H = C.WORLD.H, g = C.WORLD.ground;
    SK.fillRect(ctx, r, 0, g, W, H - g, '#34312c', 0);
    tex(ctx, { x: 0, y: g, w: W, h: H - g }, 'debris', { tile: 200, alpha: 0.8, blend: 'overlay' });
    SK.hatch(ctx, r, 0, g + 6, W, H - g, { gap: 5, alpha: 0.22, angle: -0.5 });
    SK.hatch(ctx, r, 0, g + 6, W, H - g, { gap: 9, alpha: 0.14, angle: 0.6 });
  }

  // Mur du fond d'un volume (pièce, hangar, cave)
  function room(ctx, r, rm) {
    var x0 = rm.x0, x1 = rm.x1, top = rm.top, bot = rm.bottom, w = x1 - x0, h = bot - top;
    var shape = { x: x0, y: top, w: w, h: h };
    SK.fillRect(ctx, r, x0, top, w, h, rm.tone || '#7d776b', 0);
    tex(ctx, shape, rm.wall || 'plaster', { tile: rm.tile || 240, alpha: 0.9, blend: 'overlay', ox: x0 * 1.3, oy: top });
    tex(ctx, shape, 'plaster2', { tile: 320, alpha: 0.2, blend: 'multiply', ox: x0 });
    // Crasse au pied du mur, coulures depuis le haut
    tex(ctx, { x: x0, y: bot - 40, w: w, h: 40 }, 'debris', { tile: 160, alpha: 0.25, blend: 'multiply' });
    SK.hatch(ctx, r, x0, top, w, h, { gap: 11, alpha: 0.08, angle: -1.1 });
    var n = Math.max(2, Math.round(w / 260));
    for (var s = 0; s < n; s++) SK.stain(ctx, r.range(x0 + 20, x1 - 20), r.range(top + 10, bot - 30), r.range(25, 70), r.range(0.08, 0.2));
    for (var c = 0; c < n; c++) SK.crack(ctx, r, r.range(x0 + 20, x1 - 20), top + 2, r.range(40, 110), Math.PI / 2 + r.range(-0.5, 0.5));
    // Hangar : poteaux d'acier, croix de contreventement, poutre de roulement
    if (rm.columns) {
      for (var cx = x0 + rm.columns / 2; cx < x1 - 20; cx += rm.columns) {
        SK.fillRect(ctx, r, cx - 7, top, 14, h, '#4a4b4c', 0.3);
        tex(ctx, { x: cx - 7, y: top, w: 14, h: h }, 'rust', { tile: 70, alpha: 0.8, blend: 'overlay' });
        SK.line(ctx, r, cx - 7, top, cx - 7, bot, { w: 1.3 }); SK.line(ctx, r, cx + 7, top, cx + 7, bot, { w: 1.3 });
        for (var by = top + 40; by < bot - 20; by += 90) SK.line(ctx, r, cx - 9, by, cx + 9, by, { w: 0.8, passes: 1 });
      }
      if (rm.bracing) for (var bx = x0 + rm.columns / 2; bx + rm.columns < x1 - 20; bx += rm.columns * 2) {
        var yA = top + 90, yB = Math.min(bot - 60, top + 90 + rm.columns * 0.9);
        SK.line(ctx, r, bx + 7, yA, bx + rm.columns - 7, yB, { w: 0.9, passes: 1, alpha: 0.7 });
        SK.line(ctx, r, bx + rm.columns - 7, yA, bx + 7, yB, { w: 0.9, passes: 1, alpha: 0.7 });
      }
    }
    if (rm.rail) {
      SK.fillRect(ctx, r, x0, rm.rail - 10, w, 12, '#454648', 0.3);
      SK.line(ctx, r, x0, rm.rail - 10, x1, rm.rail - 10, { w: 1.4 }); SK.line(ctx, r, x0, rm.rail + 2, x1, rm.rail + 2, { w: 1.2 });
    }
    // Rayonnages à palettes (fond) : montants, lisses, charges
    (rm.racks || []).forEach(function (rk) { rack(ctx, SK.rng(Math.round(rk.x0)), rk, bot); });
    // Charpente en treillis sous le toit
    if (rm.truss) {
      var t0 = top + 6, t1 = top + rm.truss;
      SK.line(ctx, r, x0, t0, x1, t0, { w: 2.2 }); SK.line(ctx, r, x0, t1, x1, t1, { w: 2 });
      var up = true;
      for (var tx = x0; tx < x1 - 30; tx += 40) {
        SK.line(ctx, r, tx, up ? t1 : t0, tx + 40, up ? t0 : t1, { w: 1, passes: 1 });
        up = !up;
      }
    }
    // Suspensions industrielles
    (rm.lamps || []).forEach(function (lx) {
      var ly = top + (rm.truss || 20) + 60;
      SK.line(ctx, r, lx, top + (rm.truss || 10), lx, ly - 20, { w: 0.8, passes: 1 });
      if (C.Props && C.Props.has('hanging_industrial_lamp')) C.Props.draw(ctx, 'hanging_industrial_lamp', lx, ly + 20, 46, { noShadow: true, line: 0.6 });
      else { ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(lx - 16, ly + 10); ctx.lineTo(lx, ly - 6); ctx.lineTo(lx + 16, ly + 10); ctx.closePath(); ctx.stroke(); }
    });
    // Enseigne peinte au pochoir
    if (rm.sign) {
      ctx.save(); ctx.font = (rm.sign.size || 28) + 'px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(222,212,190,0.42)';
      ctx.fillText(rm.sign.t, rm.sign.x, rm.sign.y); ctx.restore();
    }
    if (rm.border) {
      SK.line(ctx, r, x0, top, x0, bot, { w: 2 }); SK.line(ctx, r, x1, top, x1, bot, { w: 2 });
    }
  }

  // Rayonnage à palettes : 2 à 4 niveaux chargés de caisses et de sacs
  function rack(ctx, r, rk, floorY) {
    var x0 = rk.x0, x1 = rk.x1, top = floorY - (rk.h || 300), lv = rk.levels || 3;
    var bayW = 110;
    for (var ux = x0; ux <= x1 + 1; ux += bayW) {
      SK.fillRect(ctx, r, ux - 4, top, 8, floorY - top, '#5a4c3e', 0.2);
      SK.line(ctx, r, ux - 4, top, ux - 4, floorY, { w: 1.1 }); SK.line(ctx, r, ux + 4, top, ux + 4, floorY, { w: 1.1 });
      for (var hy = top + 12; hy < floorY; hy += 24) SK.line(ctx, r, ux - 4, hy, ux + 4, hy + 12, { w: 0.5, passes: 1, alpha: 0.6 });
    }
    for (var l = 0; l < lv; l++) {
      var by = top + (floorY - top) * (l + 1) / lv - (l === lv - 1 ? 0 : 0);
      if (l < lv - 1) {
        SK.fillRect(ctx, r, x0 - 4, by - 8, x1 - x0 + 8, 8, '#6a5a44', 0.2);
        SK.line(ctx, r, x0 - 4, by - 8, x1 + 4, by - 8, { w: 1.2 }); SK.line(ctx, r, x0 - 4, by, x1 + 4, by, { w: 1 });
      }
      // Charges sur les palettes (certaines baies vides : déjà pillées)
      var shelfY = l === lv - 1 ? floorY : by - 8, ceilY = top + (floorY - top) * l / lv + 10;
      for (var bx = x0 + 8; bx < x1 - 20; bx += bayW) {
        if (r.next() < 0.3) continue;
        var ph = Math.min(shelfY - ceilY - 10, r.range(40, 70));
        SK.fillRect(ctx, r, bx, shelfY - 7, bayW - 16, 7, '#6b5d48', 0.3);
        SK.line(ctx, r, bx, shelfY - 7, bx + bayW - 16, shelfY - 7, { w: 0.7, passes: 1 });
        var cx = bx + 3;
        while (cx < bx + bayW - 26) {
          var cw = r.range(18, 34), chh = r.range(ph * 0.5, ph);
          var col = ['#6f6a5e', '#7b705c', '#5d5a52', '#716b60'][Math.floor(r.next() * 4)];
          SK.fillRect(ctx, r, cx, shelfY - 7 - chh, cw, chh, col, 0.3);
          SK.rect(ctx, r, cx, shelfY - 7 - chh, cw, chh, { w: 0.7, passes: 1 });
          if (r.next() < 0.5) SK.line(ctx, r, cx, shelfY - 7 - chh * 0.5, cx + cw, shelfY - 7 - chh * 0.5, { w: 0.4, passes: 1, alpha: 0.6 });
          cx += cw + 2;
        }
      }
    }
  }

  // Fenêtres : ordinaires, bandeaux vitrés d'usine, soupiraux
  function windows(ctx, r) {
    (C.WINDOWS || []).forEach(function (wn) {
      var F = fl(wn.f);
      var ww = wn.w || (wn.vent ? 50 : 62), wh = wn.h || (wn.vent ? 18 : 74);
      var wx = wn.x - ww / 2, wy = wn.y != null ? wn.y : wn.vent ? F.ceil + 8 : F.ceil + 28;
      var g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, '#8d8b86'); g.addColorStop(1, '#5e5c58');
      ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      if (wn.kind === 'strip') {
        // Bandeau vitré d'usine : petits carreaux, beaucoup cassés ou noircis
        var cols = Math.max(3, Math.round(ww / 26)), rows = Math.max(2, Math.round(wh / 24));
        for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
          var px = wx + i * ww / cols, py = wy + j * wh / rows, rv = r.next();
          if (rv < 0.25) { ctx.fillStyle = 'rgba(40,38,34,0.75)'; ctx.fillRect(px + 1, py + 1, ww / cols - 2, wh / rows - 2); }
          else if (rv < 0.45 && wn.broken) { ctx.fillStyle = 'rgba(120,118,112,0.5)'; ctx.fillRect(px + 1, py + 1, ww / cols - 2, wh / rows - 2); }
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 1;
        for (i = 1; i < cols; i++) { ctx.beginPath(); ctx.moveTo(wx + i * ww / cols, wy); ctx.lineTo(wx + i * ww / cols, wy + wh); ctx.stroke(); }
        for (j = 1; j < rows; j++) { ctx.beginPath(); ctx.moveTo(wx, wy + j * wh / rows); ctx.lineTo(wx + ww, wy + j * wh / rows); ctx.stroke(); }
        SK.rect(ctx, r, wx - 3, wy - 3, ww + 6, wh + 6, { w: 1.6 });
        return;
      }
      if (!wn.vent) {
        ctx.fillStyle = '#4a4844';
        ctx.fillRect(wx, wy + wh * 0.55, ww * 0.4, wh * 0.45);
        ctx.fillRect(wx + ww * 0.55, wy + wh * 0.35, ww * 0.45, wh * 0.65);
      }
      SK.rect(ctx, r, wx - 4, wy - 4, ww + 8, wh + 8, { w: 1.6 });
      SK.fillRect(ctx, r, wx - 8, wy + wh + 2, ww + 16, 6, '#5b564e', 0.3);
      SK.line(ctx, r, wn.x, wy, wn.x, wy + wh, { w: 1.4 });
      if (!wn.vent) SK.line(ctx, r, wx, wy + wh / 2, wx + ww, wy + wh / 2, { w: 1.4 });
      if (wn.broken) for (var k = 0; k < 4; k++) SK.line(ctx, r, wx + r.range(0, ww), wy + r.range(0, wh), wx + r.range(0, ww), wy + r.range(0, wh), { w: 0.6, passes: 1 });
      else if (wn.boarded) for (var b = 0; b < 3; b++) { var yy = wy + 8 + b * (wh - 16) / 2; SK.fillRect(ctx, r, wx - 6, yy - 5, ww + 12, 10, '#6b6152', 0.5); SK.rect(ctx, r, wx - 6, yy - 5, ww + 12, 10, { w: 0.9, passes: 1 }); }
    });
  }

  // Bâtiment : murs extérieurs (avec ouvertures) et toit
  function shell(ctx, r, sh) {
    var x0 = sh.x0, x1 = sh.x1, top = sh.top, bot = sh.bottom, th = sh.thick || 16;
    var gaps = sh.gaps || {};
    [['left', x0 - th / 2], ['right', x1 - th / 2]].forEach(function (side) {
      if (sh[side[0]] === false) return;
      var wx = side[1], list = (gaps[side[0]] || []).slice().sort(function (a, b) { return a.y0 - b.y0; });
      var y = top;
      list.concat([{ y0: bot + 30, y1: bot + 30 }]).forEach(function (gp) {
        if (gp.y0 > y) {
          SK.fillRect(ctx, r, wx, y, th, gp.y0 - y, '#4e4943', 0);
          tex(ctx, { x: wx, y: y, w: th, h: gp.y0 - y }, sh.wall || 'brick', { tile: 70, alpha: 0.95, blend: 'overlay', ox: wx });
          SK.line(ctx, r, wx, y, wx, gp.y0, { w: 1.8 }); SK.line(ctx, r, wx + th, y, wx + th, gp.y0, { w: 1.8 });
          if (gp.y0 < bot + 20) SK.line(ctx, r, wx - 3, gp.y0, wx + th + 3, gp.y0, { w: 1.6 });
        }
        // Rideau métallique relevé au-dessus de l'ouverture
        if (gp.shutter) {
          var sw = gp.shutter, sx = side[0] === 'left' ? wx - sw + th : wx;
          SK.fillRect(ctx, r, sx, gp.y0, sw, 26, '#55575a', 0.3);
          tex(ctx, { x: sx, y: gp.y0, w: sw, h: 26 }, 'shutter', { tile: 80, alpha: 0.9, blend: 'overlay' });
          for (var sl = gp.y0 + 5; sl < gp.y0 + 26; sl += 5) SK.line(ctx, r, sx, sl, sx + sw, sl, { w: 0.6, passes: 1 });
          SK.rect(ctx, r, sx, gp.y0, sw, 26, { w: 1.3 });
        }
        y = Math.max(y, gp.y1);
      });
    });
    // Toit
    if (sh.roof === 'saw') {
      var n = Math.max(2, Math.round((x1 - x0) / 250)), tw = (x1 - x0) / n, rh = sh.roofH || 80;
      for (var i = 0; i < n; i++) {
        var a = x0 + i * tw, b = a + tw;
        var slope = [[a, top], [b, top - rh], [b, top]];
        var broken = sh.broken && sh.broken.indexOf(i) >= 0;
        if (!broken) {
          SK.fill(ctx, r, slope, '#3c3a36', 0.8);
          tex(ctx, slope, 'corrugated', { tile: 120, alpha: 0.85, blend: 'overlay', rot: -Math.atan2(rh, tw) });
          SK.hatchPoly(ctx, r, slope, { gap: 6, alpha: 0.25, angle: -0.35 });
        } else {
          // Tôles arrachées : il ne reste que les pannes
          for (var pn = 0.2; pn < 1; pn += 0.2) SK.line(ctx, r, a + tw * pn, top - rh * pn, a + tw * pn, top, { w: 1.4 });
          SK.line(ctx, r, a, top, a + tw * 0.35, top - rh * 0.35, { w: 1.6 });
        }
        SK.poly(ctx, r, slope, false, { w: 1.6 });
        // Face vitrée verticale (sheds)
        ctx.fillStyle = 'rgba(95,94,90,0.9)'; ctx.fillRect(b - 5, top - rh + 6, 5, rh - 6);
        SK.line(ctx, r, b, top - rh, b, top, { w: 1.8 });
      }
      SK.line(ctx, r, x0 - 10, top, x1 + 10, top, { w: 2 });
    } else if (sh.roof === 'flat') {
      var pt = top - 14;
      SK.fillRect(ctx, r, x0 - 10, pt, x1 - x0 + 20, 14, '#3f3c37', 0);
      tex(ctx, { x: x0 - 10, y: pt, w: x1 - x0 + 20, h: 14 }, 'concrete', { tile: 90, alpha: 0.85, blend: 'overlay' });
      SK.hatch(ctx, r, x0 - 10, pt, x1 - x0 + 20, 14, { gap: 4, alpha: 0.3 });
      SK.rect(ctx, r, x0 - 10, pt, x1 - x0 + 20, 14, { w: 1.5 });
      // Acrotère (petit muret au bord du toit)
      [x0 - 10, x1 - 2].forEach(function (px) { SK.fillRect(ctx, r, px, pt - 22, 12, 22, '#4a4640', 0.3); SK.rect(ctx, r, px, pt - 22, 12, 22, { w: 1.2 }); });
    } else if (sh.roof === 'gable') {
      var peak = [[x0 - 30, top], [(x0 + x1) / 2, top - (sh.roofH || 120)], [x1 + 30, top]];
      SK.fill(ctx, r, peak, '#3c3a36', 1);
      tex(ctx, peak, 'rust', { tile: 130, alpha: 0.75, blend: 'overlay' });
      SK.poly(ctx, r, peak, false, { w: 1.6 });
    }
  }

  // Escaliers : bois, métal (hangar), échelle
  function stairs(ctx, r, s) {
    var ua = fl(s.a.f).y < fl(s.b.f).y, hi = ua ? s.a : s.b, lo = ua ? s.b : s.a;
    var ux = hi.x, uy = fl(hi.f).y, dx = lo.x, dy = fl(lo.f).y;
    if (s.type === 'ladder') {
      var lx = ux, top = uy - 46, bot = dy;
      [lx - 13, lx + 13].forEach(function (rx) {
        SK.fillRect(ctx, r, rx - 2.5, top, 5, bot - top, '#4c4d4f', 0.2);
        SK.line(ctx, r, rx - 2.5, top, rx - 2.5, bot, { w: 1.1 }); SK.line(ctx, r, rx + 2.5, top, rx + 2.5, bot, { w: 1.1 });
      });
      for (var ry = top + 14; ry < bot - 4; ry += 18) SK.line(ctx, r, lx - 12, ry, lx + 12, ry, { w: 1.4, passes: 1 });
      return;
    }
    var metal = s.type === 'metal', n = Math.max(8, Math.round((dy - uy) / 16)), thick = metal ? 8 : 14, railH = 46;
    ctx.save();
    ctx.beginPath(); ctx.rect(Math.min(ux, dx) - 40, uy - railH - 10, Math.abs(dx - ux) + 80, dy - uy + railH + 10); ctx.clip();
    var pts = [[ux, uy], [dx, dy], [dx, dy + thick], [ux, uy + thick]];
    SK.fill(ctx, r, pts, metal ? '#4c4d4f' : '#4a443c', 0.5);
    tex(ctx, pts, metal ? 'rust' : 'planks', { tile: 90, alpha: 0.8, blend: 'overlay', rot: Math.atan2(dy - uy, dx - ux) + Math.PI / 2 });
    for (var i = 0; i < n; i++) {
      var t0 = i / n, t1 = (i + 1) / n;
      var x0 = U.lerp(ux, dx, t0), y0 = U.lerp(uy, dy, t0), x1 = U.lerp(ux, dx, t1), y1 = U.lerp(uy, dy, t1);
      SK.poly(ctx, r, [[x0, y0], [x1, y0], [x1, y1]], false, { w: metal ? 0.9 : 1.1, passes: 1 });
    }
    SK.line(ctx, r, ux, uy + thick, dx, dy + thick, { w: 1.3 });
    var tr = U.clamp((railH + 14) / (dy - uy), 0, 0.5);
    SK.line(ctx, r, U.lerp(ux, dx, tr), U.lerp(uy, dy, tr) - railH, dx, dy - railH, { w: metal ? 1.8 : 1.4 });
    for (var j = 0; j <= 5; j++) {
      var tt = U.lerp(tr, 1, j / 5), tx = U.lerp(ux, dx, tt), ty = U.lerp(uy, dy, tt);
      SK.line(ctx, r, tx, ty, tx, ty - railH, { w: j === 5 ? 1.6 : 0.8, passes: 1 });
    }
    ctx.restore();
  }

  // Dalle / plancher / passerelle / sol extérieur
  function slab(ctx, r, F, f) {
    var x0 = F.x0 != null ? F.x0 : C.WORLD.left, x1 = F.x1 != null ? F.x1 : C.WORLD.right, y = F.y;
    if (F.noSlab) return;
    if (F.catwalk) {
      // Suspentes jusqu'à la charpente (pont roulant)
      if (F.hang) for (var hx = x0 + 40; hx < x1; hx += 150) SK.line(ctx, r, hx, F.hang, hx, y, { w: 1.3, passes: 1 });
      SK.fillRect(ctx, r, x0, y, x1 - x0, 7, '#46474a', 0.2);
      tex(ctx, { x: x0, y: y, w: x1 - x0, h: 7 }, 'grate', { tile: 40, alpha: 0.9, blend: 'overlay' });
      SK.line(ctx, r, x0, y, x1, y, { w: 1.6 }); SK.line(ctx, r, x0, y + 7, x1, y + 7, { w: 1 });
      // Poutre sous la passerelle
      SK.fillRect(ctx, r, x0, y + 7, x1 - x0, 9, '#3d3e40', 0.2);
      SK.line(ctx, r, x0, y + 16, x1, y + 16, { w: 1.3 });
      for (var bx = x0 + 10; bx < x1; bx += 30) SK.line(ctx, r, bx, y + 7, bx + 15, y + 16, { w: 0.6, passes: 1 });
      // Poteaux jusqu'au sol du dessous
      if (F.support) for (var px = x0 + 30; px < x1 - 10; px += F.supportGap || 240) {
        SK.fillRect(ctx, r, px - 5, y + 16, 10, F.support - y - 16, '#4a4b4c', 0.2);
        SK.line(ctx, r, px - 5, y + 16, px - 5, F.support, { w: 1.2 }); SK.line(ctx, r, px + 5, y + 16, px + 5, F.support, { w: 1.2 });
      }
      return;
    }
    var segs = F.segs || [{ x0: x0, x1: x1, out: F.out, tex: F.tex }];
    var th = F.thick || (F.ground ? 28 : 14);
    segs.forEach(function (sg) {
      var t = sg.tex || (sg.out ? 'asphalt' : F.ground ? 'hangarFloor' : 'debris');
      SK.fillRect(ctx, r, sg.x0, y, sg.x1 - sg.x0, th, sg.out ? '#3b3934' : '#35322d', 0);
      tex(ctx, { x: sg.x0, y: y, w: sg.x1 - sg.x0, h: th }, t, { tile: 90, alpha: 0.9, blend: 'overlay', oy: y });
      SK.hatch(ctx, r, sg.x0, y, sg.x1 - sg.x0, th, { gap: 4, alpha: 0.2, angle: -0.4 });
      SK.line(ctx, r, sg.x0, y, sg.x1, y, { w: 1.8 });
      if (!F.ground) SK.line(ctx, r, sg.x0, y + th, sg.x1, y + th, { w: 1.2 });
      // Bord de trottoir, flaques, débris dehors ; joints de dalle dedans
      if (sg.out) {
        for (var d = 0; d < (sg.x1 - sg.x0) / 60; d++) SK.stone(ctx, r, r.range(sg.x0 + 10, sg.x1 - 10), y - r.range(1, 6), r.range(2, 6), '#57524a');
        for (var pd = 0; pd < (sg.x1 - sg.x0) / 400; pd++) { ctx.fillStyle = 'rgba(30,32,36,0.35)'; ctx.beginPath(); ctx.ellipse(r.range(sg.x0 + 30, sg.x1 - 30), y + 2, r.range(20, 50), 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
      } else if (F.ground) {
        for (var jx = sg.x0 + 60; jx < sg.x1; jx += 120) SK.line(ctx, r, jx, y, jx - 6, y + th, { w: 0.5, passes: 1, alpha: 0.5 });
        for (var dd = 0; dd < (sg.x1 - sg.x0) / 90; dd++) SK.stone(ctx, r, r.range(sg.x0 + 10, sg.x1 - 10), y - 2, r.range(1.5, 3.5), '#4b4740');
      } else {
        for (var dd2 = 0; dd2 < (sg.x1 - sg.x0) / 110; dd2++) SK.stone(ctx, r, r.range(sg.x0 + 10, sg.x1 - 10), y - 2, r.range(1.5, 3.5), '#4b4740');
      }
    });
  }

  // Trou dans le plancher : bords arrachés, planche en travers, corde qui descend
  function hole(ctx, r, s) {
    var ua = fl(s.a.f).y < fl(s.b.f).y, hi = ua ? s.a : s.b, lo = ua ? s.b : s.a;
    var x = hi.x, y = fl(hi.f).y, th = fl(hi.f).thick || (fl(hi.f).ground ? 28 : 14), hw = s.w || 70, by = fl(lo.f).y;
    var gap = [[x - hw / 2, y - 1], [x - hw / 2 + 8, y + th * 0.6], [x - hw / 4, y + th + 2], [x + hw / 4, y + th + 4], [x + hw / 2 - 6, y + th * 0.5], [x + hw / 2, y - 1]];
    ctx.fillStyle = '#141311'; ctx.beginPath(); gap.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
    SK.poly(ctx, r, gap, false, { w: 1.3 });
    for (var k = 0; k < 5; k++) SK.stone(ctx, r, x + r.range(-hw / 2, hw / 2), y + th + r.range(4, 20), r.range(2, 4), '#4d4841');
    // Fers à béton tordus
    SK.line(ctx, r, x - hw / 2 + 4, y + 8, x - hw / 2 + 18, y + th + 10, { w: 1, passes: 1 });
    SK.line(ctx, r, x + hw / 2 - 4, y + 10, x + hw / 2 - 20, y + th + 6, { w: 1, passes: 1 });
    // Corde nouée à une poutre, jusqu'en bas
    ctx.strokeStyle = '#6b5d48'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x + 6, y - 4); ctx.quadraticCurveTo(x + 10, (y + by) / 2, x + 4, by - 6); ctx.stroke();
    for (var kn = y + 30; kn < by - 20; kn += 34) { ctx.fillStyle = '#5a4d3b'; ctx.beginPath(); ctx.arc(x + 6 + Math.sin(kn) * 1.5, kn, 2.4, 0, Math.PI * 2); ctx.fill(); }
    // Tas de gravats en bas
    var pile = [[x - 50, by], [x - 24, by - 16], [x + 4, by - 22], [x + 34, by - 12], [x + 56, by]];
    SK.fill(ctx, r, pile, '#57514a', 1); SK.hatchPoly(ctx, r, pile, { gap: 4, alpha: 0.3 }); SK.poly(ctx, r, pile, false, { w: 1.1 });
  }

  // Cloisons (avec passage), jusqu'au plafond du niveau
  function partitions(ctx, r) {
    (C.WALLS || []).forEach(function (w) {
      var F = fl(w.f), top = F.ceil, doorTop = F.y - 118;
      SK.fillRect(ctx, r, w.x - 7, top, 14, doorTop - top, '#4b4740', 0.3);
      tex(ctx, { x: w.x - 7, y: top, w: 14, h: doorTop - top }, w.tex || 'brickPlaster', { tile: 90, alpha: 0.8, blend: 'overlay' });
      SK.line(ctx, r, w.x - 7, top, w.x - 7, doorTop, { w: 1.3 }); SK.line(ctx, r, w.x + 7, top, w.x + 7, doorTop, { w: 1.3 });
      SK.line(ctx, r, w.x - 12, doorTop, w.x + 12, doorTop, { w: 1.6 });
      SK.line(ctx, r, w.x - 10, doorTop, w.x - 10, F.y, { w: 0.9, alpha: 0.6 }); SK.line(ctx, r, w.x + 10, doorTop, w.x + 10, F.y, { w: 0.9, alpha: 0.6 });
    });
  }

  // Rambarde de passerelle (sauf devant les escaliers et échelles)
  function railing(ctx, r, F, f) {
    var x0 = F.x0, x1 = F.x1, y = F.y, rh = 40;
    var skip = [];
    C.STAIRS.forEach(function (s) {
      [s.a, s.b].forEach(function (e) { if (e.f === f) skip.push(e.x); });
    });
    function open(x) { return skip.some(function (sx) { return Math.abs(sx - x) < 34; }); }
    var seg = null;
    for (var x = x0; x <= x1; x += 6) {
      if (!open(x)) { if (seg == null) seg = x; }
      else if (seg != null) { rail(seg, x - 6); seg = null; }
    }
    if (seg != null) rail(seg, x1);
    function rail(a, b) {
      if (b - a < 12) return;
      SK.fillRect(ctx, r, a, y - rh - 2, b - a, 4, '#4a4b4d', 0.1);
      SK.line(ctx, r, a, y - rh - 2, b, y - rh - 2, { w: 2.2 }); SK.line(ctx, r, a, y - rh + 2, b, y - rh + 2, { w: 1 });
      SK.line(ctx, r, a, y - rh / 2, b, y - rh / 2, { w: 1.5, passes: 1 });
      SK.fillRect(ctx, r, a, y - 7, b - a, 7, '#3f4042', 0.1); SK.line(ctx, r, a, y - 7, b, y - 7, { w: 1.1, passes: 1 });
      for (var px = a; px <= b; px += 40) SK.line(ctx, r, px, y, px, y - rh - 2, { w: 2, passes: 1 });
      SK.line(ctx, r, b, y, b, y - rh - 2, { w: 2, passes: 1 });
    }
  }

  // Grillage sur poteaux, barbelés au-dessus
  function fence(ctx, r, fe) {
    var y = fl(fe.f).y, h = fe.h || 110;
    ctx.save();
    ctx.strokeStyle = 'rgba(30,29,27,0.5)'; ctx.lineWidth = 0.6;
    for (var x = fe.x0; x < fe.x1; x += 9) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 9, y - h); ctx.moveTo(x + 9, y); ctx.lineTo(x, y - h); ctx.stroke();
    }
    ctx.restore();
    for (var px = fe.x0; px <= fe.x1; px += 120) {
      SK.line(ctx, r, px, y, px, y - h - 10, { w: 2.4 });
      SK.line(ctx, r, px, y - h - 10, px + 14, y - h - 22, { w: 1.4, passes: 1 });
    }
    SK.line(ctx, r, fe.x0, y - h, fe.x1, y - h, { w: 1.2 });
    // Barbelé
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8;
    for (var bx = fe.x0; bx < fe.x1; bx += 14) { ctx.beginPath(); ctx.arc(bx + 7, y - h - 16, 6, 0, Math.PI * 2); ctx.stroke(); }
    if (fe.hole) {
      // Grillage découpé : un passage
      ctx.fillStyle = 'rgba(0,0,0,0)';
      SK.poly(ctx, r, [[fe.hole - 20, y], [fe.hole - 24, y - 60], [fe.hole + 6, y - 72], [fe.hole + 22, y - 40], [fe.hole + 20, y]], false, { w: 1.4 });
    }
  }

  // Grand décor dessiné : chariot élévateur, conteneur, camion bâché
  function thing(ctx, r, th) {
    var y = fl(th.f).y, x = th.x, d = th.flip ? -1 : 1;
    if (th.kind === 'forklift') {
      ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
      var body = [[-60, -14], [-60, -52], [-30, -58], [10, -58], [14, -14]];
      SK.fill(ctx, r, body, '#6a5c3c', 0.6); tex(ctx, body, 'rust', { tile: 60, alpha: 0.7, blend: 'overlay' }); SK.poly(ctx, r, body, true, { w: 1.4 });
      // Cabine (arceau)
      SK.line(ctx, r, -40, -58, -34, -120, { w: 2.2 }); SK.line(ctx, r, 6, -58, 0, -120, { w: 2.2 }); SK.line(ctx, r, -38, -120, 2, -120, { w: 2.4 });
      SK.fillRect(ctx, r, -30, -80, 18, 22, '#3a3834', 0.3);                 // siège
      // Mât et fourches
      SK.fillRect(ctx, r, 16, -140, 8, 126, '#4c4d4f', 0.2); SK.rect(ctx, r, 16, -140, 8, 126, { w: 1.2 });
      SK.line(ctx, r, 24, -12, 64, -12, { w: 2.6 }); SK.line(ctx, r, 24, -40, 24, -12, { w: 2 });
      [[-44, 0], [-2, 0]].forEach(function (w) { ctx.fillStyle = '#1b1a18'; ctx.beginPath(); ctx.arc(w[0], y * 0 - 11, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5e6062'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w[0], -11, 5, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
    } else if (th.kind === 'container') {
      var w = th.w || 240, h = th.h || 110, x0 = x - w / 2;
      SK.fillRect(ctx, r, x0, y - h, w, h, th.color || '#5b5448', 0.4);
      tex(ctx, { x: x0, y: y - h, w: w, h: h }, 'corrugated2', { tile: 90, alpha: 0.9, blend: 'overlay', rot: Math.PI / 2 });
      for (var rib = x0 + 8; rib < x0 + w - 4; rib += 12) SK.line(ctx, r, rib, y - h + 6, rib, y - 6, { w: 0.5, passes: 1, alpha: 0.6 });
      SK.rect(ctx, r, x0, y - h, w, h, { w: 1.6 });
      SK.line(ctx, r, x0, y - h + 6, x0 + w, y - h + 6, { w: 1 }); SK.line(ctx, r, x0, y - 6, x0 + w, y - 6, { w: 1 });
      if (th.text) { ctx.save(); ctx.font = '22px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(210,200,180,0.35)'; ctx.fillText(th.text, x0 + 20, y - h + 36); ctx.restore(); }
    } else if (th.kind === 'truck') {
      ctx.save(); ctx.translate(x, y); ctx.scale(d, 1);
      var bed = [[-150, -30], [-150, -130], [40, -130], [40, -30]];
      SK.fill(ctx, r, bed, '#4f5242', 0.6); tex(ctx, bed, 'plaster2', { tile: 80, alpha: 0.5, blend: 'overlay' });
      SK.hatchPoly(ctx, r, bed, { gap: 5, alpha: 0.25, angle: 1.3 }); SK.poly(ctx, r, bed, true, { w: 1.5 });
      for (var hb = -130; hb < 40; hb += 42) SK.line(ctx, r, hb, -130, hb + 6, -30, { w: 0.7, passes: 1, alpha: 0.6 });
      var cab = [[44, -30], [44, -100], [90, -100], [112, -64], [112, -30]];
      SK.fill(ctx, r, cab, '#4a4d3e', 0.6); tex(ctx, cab, 'rust', { tile: 60, alpha: 0.6, blend: 'overlay' }); SK.poly(ctx, r, cab, true, { w: 1.5 });
      SK.fillRect(ctx, r, 60, -94, 34, 26, '#2a2c2e', 0.2);
      SK.fillRect(ctx, r, -156, -34, 272, 10, '#2f2e2b', 0.2);
      [-110, -70, 80].forEach(function (wx) { ctx.fillStyle = '#1a1917'; ctx.beginPath(); ctx.arc(wx, -14, 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#5a5c5e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(wx, -14, 7, 0, Math.PI * 2); ctx.stroke(); });
      ctx.restore();
    }
  }

  // ============================================================ lumières
  L.drawLights = function (ctx, m, t) {
    (m.lights || []).forEach(function (li, i) {
      var fl2 = 0.85 + Math.sin(t * 7 + i) * 0.08 + Math.sin(t * 13.3 + i) * 0.05;
      if (li.kind === 'brasero') {
        var rad = (li.r || 170) * fl2;
        var g = ctx.createRadialGradient(li.x, li.y, 3, li.x, li.y, rad);
        g.addColorStop(0, 'rgba(255,160,70,' + (0.4 * fl2) + ')'); g.addColorStop(0.4, 'rgba(220,120,50,' + (0.14 * fl2) + ')'); g.addColorStop(1, 'rgba(200,110,40,0)');
        ctx.fillStyle = g; ctx.fillRect(li.x - rad, li.y - rad, rad * 2, rad * 2);
        // Flammes
        ctx.fillStyle = 'rgba(255,190,110,' + (0.7 * fl2) + ')';
        for (var k = 0; k < 3; k++) { var fx = li.x - 8 + k * 8, fh = 8 + 6 * Math.abs(Math.sin(t * (9 + k) + k)); ctx.beginPath(); ctx.moveTo(fx - 4, li.y + 4); ctx.quadraticCurveTo(fx, li.y - fh, fx + 4, li.y + 4); ctx.fill(); }
        if (C.Render && Math.random() < 0.08) C.Render.spawn({ x: li.x + (Math.random() - 0.5) * 12, y: li.y - 6, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 30, life: 0.8, t: 0, kind: 'spark', size: 1 });
        if (C.Render && Math.random() < 0.05) C.Render.spawn({ x: li.x, y: li.y - 12, vx: -4, vy: -14, life: 3, t: 0, kind: 'smoke', size: 3 });
      } else if (li.kind === 'lamp') {
        var rr = li.r || 150;
        var g2 = ctx.createRadialGradient(li.x, li.y, 2, li.x, li.y + rr * 0.4, rr);
        g2.addColorStop(0, 'rgba(255,225,170,' + (0.24 * (li.a || 1)) + ')'); g2.addColorStop(1, 'rgba(230,190,130,0)');
        ctx.fillStyle = g2; ctx.fillRect(li.x - rr, li.y - rr * 0.5, rr * 2, rr * 1.9);
      } else if (li.kind === 'searchlight') {
        // Faisceau de projecteur qui balaie la cour
        var ang = (li.a0 || 2.2) + Math.sin(t * (li.speed || 0.35) + i) * (li.spread || 0.45);
        var len = li.len || 900, half = 0.07;
        var ex1 = li.x + Math.cos(ang - half) * len, ey1 = li.y + Math.sin(ang - half) * len;
        var ex2 = li.x + Math.cos(ang + half) * len, ey2 = li.y + Math.sin(ang + half) * len;
        var g3 = ctx.createRadialGradient(li.x, li.y, 4, li.x, li.y, len);
        g3.addColorStop(0, 'rgba(235,235,215,0.3)'); g3.addColorStop(1, 'rgba(235,235,215,0)');
        ctx.fillStyle = g3;
        ctx.beginPath(); ctx.moveTo(li.x, li.y); ctx.lineTo(ex1, ey1); ctx.lineTo(ex2, ey2); ctx.closePath(); ctx.fill();
        li.beam = { ang: ang, half: half, len: len };
      }
    });
  };

  // ============================================================ météo
  // Où s'arrête la pluie : sur un toit, sinon au sol extérieur
  L.rainStop = function (m, x) {
    var y = C.WORLD.ground;
    (m.shells || []).forEach(function (sh) { if (x >= sh.x0 - 10 && x <= sh.x1 + 10) y = Math.min(y, sh.top - (sh.roof === 'flat' ? 14 : 0)); });
    C.FLOORS.forEach(function (F) {
      if (F.out && x >= F.x0 && x <= F.x1) y = Math.min(y, F.y);
      (F.segs || []).forEach(function (sg) { if (sg.out && x >= sg.x0 && x <= sg.x1) y = Math.min(y, F.y); });
    });
    return y;
  };
  // Découpe « ciel » pour les lueurs d'obus : les bâtiments en sont exclus
  L.shellPath = function (ctx, m) {
    (m.shells || []).forEach(function (sh) { ctx.rect(sh.x0 - 20, sh.top - (sh.roofH || 30), sh.x1 - sh.x0 + 40, C.WORLD.H); });
  };
  L.drawSnow = function (ctx, m, c) {
    var th = 1.5 + 7 * c;
    ctx.save();
    ctx.fillStyle = 'rgba(232,234,238,' + (0.55 + 0.35 * c) + ')';
    function band(x0, x1, y) {
      ctx.beginPath(); ctx.moveTo(x0, y + 1);
      for (var x = x0; x <= x1; x += 16) ctx.lineTo(x, y - th + Math.sin(x * 0.07) * th * 0.25);
      ctx.lineTo(x1, y + 1); ctx.closePath(); ctx.fill();
    }
    C.FLOORS.forEach(function (F) {
      if (F.out) band(F.x0, F.x1, F.y);
      (F.segs || []).forEach(function (sg) { if (sg.out) band(sg.x0, sg.x1, F.y); });
    });
    (m.shells || []).forEach(function (sh) {
      if (sh.roof === 'flat') band(sh.x0 - 10, sh.x1 + 10, sh.top - 14);
      else if (sh.roof === 'saw') {
        var n = Math.max(2, Math.round((sh.x1 - sh.x0) / 250)), tw = (sh.x1 - sh.x0) / n, rh = sh.roofH || 80;
        for (var i = 0; i < n; i++) {
          if (sh.broken && sh.broken.indexOf(i) >= 0) continue;
          var a = sh.x0 + i * tw;
          ctx.beginPath(); ctx.moveTo(a, sh.top); ctx.lineTo(a + tw, sh.top - rh); ctx.lineTo(a + tw, sh.top - rh - th * 0.6); ctx.lineTo(a, sh.top - th * 0.6); ctx.closePath(); ctx.fill();
        }
      }
    });
    ctx.restore();
  };
})(window.CQR);
