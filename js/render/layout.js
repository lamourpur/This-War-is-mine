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
    // Pavillons de banlieue : toits à deux pentes, cheminées, certains éventrés
    if (kinds.indexOf('houses') >= 0) {
      var hx = r.range(-40, 40);
      while (hx < LW) {
        var hw = r.range(90, 160), hh = r.range(60, 110) * depth.hk, rh = r.range(40, 70) * depth.hk;
        ctx.beginPath(); ctx.moveTo(hx, g); ctx.lineTo(hx, g - hh);
        if (r.next() < 0.25) { ctx.lineTo(hx + hw * 0.3, g - hh - rh * 0.8); ctx.lineTo(hx + hw * 0.45, g - hh - rh * 0.3); ctx.lineTo(hx + hw * 0.6, g - hh - rh * 0.6); }
        else ctx.lineTo(hx + hw / 2, g - hh - rh);
        ctx.lineTo(hx + hw, g - hh); ctx.lineTo(hx + hw, g); ctx.closePath(); ctx.fill();
        if (r.next() < 0.6) ctx.fillRect(hx + hw * 0.7, g - hh - rh * 0.7, 10, rh * 0.5);
        if (depth.windows) { ctx.fillStyle = 'rgba(20,19,17,0.5)'; ctx.fillRect(hx + hw * 0.2, g - hh + 16, 12, 16); ctx.fillRect(hx + hw * 0.62, g - hh + 16, 12, 16); ctx.fillStyle = depth.color; }
        hx += hw + r.range(20, 90);
      }
    }
    // Barres d'immeubles, fenêtres régulières, étages crevés
    if (kinds.indexOf('towers') >= 0) {
      var tx = r.range(-60, 0);
      while (tx < LW) {
        var tw = r.range(110, 190), tht = r.range(220, 380) * depth.hk;
        ctx.beginPath(); ctx.moveTo(tx, g); ctx.lineTo(tx, g - tht);
        var cut = r.next() < 0.5;
        ctx.lineTo(tx + tw * (cut ? 0.55 : 1), g - tht);
        if (cut) { ctx.lineTo(tx + tw * 0.7, g - tht + r.range(60, 140)); ctx.lineTo(tx + tw, g - tht + r.range(30, 90)); }
        ctx.lineTo(tx + tw, g); ctx.closePath(); ctx.fill();
        if (depth.windows) {
          ctx.fillStyle = 'rgba(20,19,17,0.5)';
          for (var ty = g - tht + 20; ty < g - 20; ty += 24) for (var twx = tx + 10; twx < tx + tw - 14; twx += 20) if (r.next() < 0.7) ctx.fillRect(twx, ty, 9, 12);
          ctx.fillStyle = depth.color;
        }
        tx += tw + r.range(40, 160);
      }
    }
    // Clochers et coupoles
    if (kinds.indexOf('steeples') >= 0) {
      [0.18, 0.52, 0.83].forEach(function (fx) {
        var cx = LW * fx + r.range(-60, 60), h = r.range(260, 360) * depth.hk;
        ctx.fillRect(cx - 26, g - h, 52, h);
        ctx.beginPath(); ctx.moveTo(cx - 32, g - h); ctx.lineTo(cx, g - h - 130); ctx.lineTo(cx + 32, g - h); ctx.closePath(); ctx.fill();
        ctx.fillRect(cx - 2, g - h - 170, 4, 44); ctx.fillRect(cx - 12, g - h - 156, 24, 4);
      });
    }
    // Arbres nus
    if (kinds.indexOf('trees') >= 0) {
      ctx.lineCap = 'round';
      for (var tr = 0; tr < LW / 150; tr++) {
        var bx0 = r.range(0, LW), bh0 = r.range(120, 240) * depth.hk;
        (function branch(x, y, a, len, wd, dep) {
          var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
          ctx.lineWidth = wd; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
          if (dep <= 0) return;
          branch(ex, ey, a - r.range(0.3, 0.6), len * 0.66, wd * 0.6, dep - 1);
          branch(ex, ey, a + r.range(0.3, 0.6), len * 0.62, wd * 0.6, dep - 1);
        })(bx0, g, -Math.PI / 2, bh0 * 0.45, 9, 4);
      }
      ctx.lineCap = 'butt';
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
      buildLayer(m, { p: 0.08, seed: 101, color: '#5f5d58', kinds: [].concat(bd.far || 'city'), hk: 1.2, windows: false }),
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
    (m.things || []).forEach(function (th, i) { if (th.back) thing(ctx, SK.rng(700 + i), th); });
    (m.fences || []).forEach(function (fe, i) { fence(ctx, SK.rng(120 + i), fe); });
    (m.rooms || []).forEach(function (rm, i) { room(ctx, SK.rng(900 + i), rm); });
    windows(ctx, SK.rng(77));
    (m.shells || []).forEach(function (sh, i) { shell(ctx, SK.rng(500 + i), sh); });
    (m.things || []).forEach(function (th, i) { if (!th.back) thing(ctx, SK.rng(700 + i), th); });
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
    // Ossature de béton inachevée : poteaux seuls, on voit la ville au travers
    if (rm.frame) {
      for (var fx = x0; fx <= x1 + 1; fx += rm.frame === true ? 200 : rm.frame) {
        SK.fillRect(ctx, r, fx - 10, top, 20, h, '#6a665e', 0.3);
        tex(ctx, { x: fx - 10, y: top, w: 20, h: h }, 'concrete', { tile: 80, alpha: 0.9, blend: 'overlay' });
        SK.line(ctx, r, fx - 10, top, fx - 10, bot, { w: 1.3 }); SK.line(ctx, r, fx + 10, top, fx + 10, bot, { w: 1.3 });
        // Fers en attente au sommet
        if (rm.rebar) for (var rb = -6; rb <= 6; rb += 6) SK.line(ctx, r, fx + rb, top, fx + rb + r.range(-4, 4), top - r.range(16, 30), { w: 0.8, passes: 1 });
      }
      return;
    }
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
    roomExtras(ctx, r, rm);
  }

  // ------------------------------------------------------------ habillage des pièces
  // Ce qui distingue une chambre d'une salle de classe ou d'une nef :
  //   paper (papier peint rayé), skirt (plinthe), wainscot {h, tex, tone} (faïence,
  //   lambris), frames (cadres), bulbs / tubes (éclairage), vault (arcs et piliers),
  //   boards (tableaux noirs), shelves (gondoles de magasin), clock, crucifix,
  //   attic ('left'|'right'|'both' : chevrons sous le toit), breach (mur crevé :
  //   on voit la ville au travers), signs (inscriptions), posters.
  function roomExtras(ctx, r, rm) {
    var x0 = rm.x0, x1 = rm.x1, top = rm.top, bot = rm.bottom, w = x1 - x0, h = bot - top;
    if (rm.paper) {
      ctx.save(); ctx.globalAlpha = C.Tex && C.Tex.ready ? 0.05 : 0.09; ctx.fillStyle = '#2a2723';
      var sw = rm.paper === true ? 12 : rm.paper;
      for (var sx = x0; sx < x1; sx += sw * 2) ctx.fillRect(sx, top, sw * 0.5, bot - top);
      ctx.restore();
      // Lés décollés
      for (var pl = 0; pl < Math.max(1, w / 400); pl++) {
        var px = r.range(x0 + 30, x1 - 60), py = r.range(top + 20, bot - 80);
        var flap = [[px, py], [px + 22, py + 4], [px + 16, py + 40], [px + 4, py + 30]];
        SK.fill(ctx, r, flap, '#8f8878', 0.4); SK.poly(ctx, r, flap, true, { w: 0.7, passes: 1 });
      }
    }
    if (rm.wainscot) {
      var wh = rm.wainscot.h || 60, wy = bot - wh;
      SK.fillRect(ctx, r, x0, wy, w, wh, rm.wainscot.tone || '#7e7a70', 0);
      tex(ctx, { x: x0, y: wy, w: w, h: wh }, rm.wainscot.tex || 'tiles', { tile: rm.wainscot.tile || 80, alpha: 0.9, blend: 'overlay', ox: x0 });
      if (rm.wainscot.grid !== false) {
        ctx.save(); ctx.strokeStyle = 'rgba(28,27,26,0.25)'; ctx.lineWidth = 0.6;
        var g = rm.wainscot.grid || 18;
        for (var gx = x0; gx < x1; gx += g) { ctx.beginPath(); ctx.moveTo(gx, wy); ctx.lineTo(gx, bot); ctx.stroke(); }
        for (var gy = wy; gy < bot; gy += g) { ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke(); }
        ctx.restore();
      }
      SK.line(ctx, r, x0, wy, x1, wy, { w: 1.2 });
      // Carreaux tombés
      for (var ct = 0; ct < w / 160; ct++) { ctx.fillStyle = 'rgba(40,38,34,0.45)'; ctx.fillRect(r.range(x0, x1 - 20), r.range(wy + 4, bot - 18), 16, 16); }
    }
    if (rm.skirt) SK.line(ctx, r, x0, bot - 10, x1, bot - 10, { w: 0.9, passes: 1 });
    // Arcs de nef et piliers
    if (rm.vault) {
      var gap = rm.vault === true ? 220 : rm.vault, spring = top + (rm.spring || 90);
      for (var vx = x0; vx <= x1 + 1; vx += gap) {
        SK.fillRect(ctx, r, vx - 12, spring, 24, bot - spring, '#8a8475', 0.3);
        tex(ctx, { x: vx - 12, y: spring, w: 24, h: bot - spring }, 'plaster', { tile: 90, alpha: 0.7, blend: 'overlay' });
        SK.line(ctx, r, vx - 12, spring, vx - 12, bot, { w: 1.3 }); SK.line(ctx, r, vx + 12, spring, vx + 12, bot, { w: 1.3 });
        SK.line(ctx, r, vx - 16, spring, vx + 16, spring, { w: 1.6 });
        SK.line(ctx, r, vx - 16, bot - 16, vx + 16, bot - 16, { w: 1.2 });
        if (vx + gap <= x1 + 1) {
          ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(vx + 12, spring); ctx.quadraticCurveTo(vx + gap / 2, top - 30, vx + gap - 12, spring); ctx.stroke();
          ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(vx + 12, spring + 10); ctx.quadraticCurveTo(vx + gap / 2, top - 12, vx + gap - 12, spring + 10); ctx.stroke();
          ctx.restore();
        }
      }
    }
    // Chevrons d'un grenier sous la pente du toit
    if (rm.attic) {
      var sides = rm.attic === 'both' ? ['left', 'right'] : [rm.attic];
      sides.forEach(function (sd) {
        var tri = sd === 'left' ? [[x0, top], [x0 + w * 0.45, top], [x0, bot - 20]] : [[x1, top], [x1 - w * 0.45, top], [x1, bot - 20]];
        SK.fill(ctx, r, tri, '#3a3631', 0.4); tex(ctx, tri, 'planks', { tile: 90, alpha: 0.6, blend: 'overlay', rot: sd === 'left' ? 0.9 : -0.9 });
        SK.poly(ctx, r, tri, true, { w: 1.3 });
        for (var k = 0.15; k < 1; k += 0.2) {
          var ax = sd === 'left' ? x0 + w * 0.45 * k : x1 - w * 0.45 * k;
          SK.line(ctx, r, ax, top, sd === 'left' ? x0 : x1, top + (bot - 20 - top) * k, { w: 2.2, color: '#2e2b27', passes: 1 });
        }
      });
      for (var bx = x0 + 60; bx < x1 - 40; bx += 180) SK.line(ctx, r, bx, top, bx, top + 18, { w: 3, color: '#2e2b27', passes: 1 });
    }
    (rm.boards || []).forEach(function (b) {
      var by = b.y || top + 26, bh = b.h || 64, bw = b.w || 150;
      SK.fillRect(ctx, r, b.x - bw / 2, by, bw, bh, '#2f3430', 0.2);
      SK.rect(ctx, r, b.x - bw / 2 - 3, by - 3, bw + 6, bh + 6, { w: 1.6 });
      SK.fillRect(ctx, r, b.x - bw / 2, by + bh + 2, bw, 5, '#5b564e', 0.2);
      ctx.save(); ctx.fillStyle = 'rgba(214,210,196,0.55)'; ctx.font = '13px "Special Elite", monospace';
      (b.text || ['12 - 3 = 9', 'Leçon : les fleuves']).forEach(function (t, i) { ctx.fillText(t, b.x - bw / 2 + 10, by + 20 + i * 18); });
      ctx.strokeStyle = 'rgba(214,210,196,0.3)'; ctx.lineWidth = 1;
      for (var k2 = 0; k2 < 3; k2++) { var sx2 = b.x - bw / 2 + r.range(10, bw - 40); ctx.beginPath(); ctx.moveTo(sx2, by + bh - 10); ctx.lineTo(sx2 + r.range(10, 30), by + bh - r.range(10, 24)); ctx.stroke(); }
      ctx.restore();
    });
    // Gondoles de magasin, basses, presque vides
    (rm.shelves || []).forEach(function (sh) {
      var h = sh.h || 120, sy = bot - h, lv = sh.levels || 4;
      SK.fillRect(ctx, r, sh.x0, sy, sh.x1 - sh.x0, h, '#6b6a66', 0.2);
      tex(ctx, { x: sh.x0, y: sy, w: sh.x1 - sh.x0, h: h }, 'plate', { tile: 80, alpha: 0.6, blend: 'overlay' });
      SK.rect(ctx, r, sh.x0, sy, sh.x1 - sh.x0, h, { w: 1.3 });
      for (var l = 1; l <= lv; l++) {
        var ly = sy + h * l / (lv + 0.4);
        SK.line(ctx, r, sh.x0, ly, sh.x1, ly, { w: 1.1, passes: 1 });
        for (var ix = sh.x0 + 4; ix < sh.x1 - 12; ix += r.range(10, 26)) {
          if (r.next() < 0.72) continue;                 // pillé
          var ih = r.range(8, h / (lv + 1) - 4);
          ctx.fillStyle = ['#8a7d63', '#6f6d62', '#7b5f4c', '#8c8676'][Math.floor(r.next() * 4)];
          ctx.fillRect(ix, ly - ih, r.range(6, 12), ih);
        }
      }
      if (sh.label) { ctx.save(); ctx.font = '14px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(222,212,190,0.5)'; ctx.fillText(sh.label, sh.x0 + 6, sy - 6); ctx.restore(); }
    });
    // Éclairage éteint : ampoules nues, tubes au néon
    (rm.bulbs || []).forEach(function (lx) {
      SK.line(ctx, r, lx, top, lx, top + 22, { w: 0.7, passes: 1 });
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, top + 27, 5, 0, Math.PI * 2); ctx.stroke();
    });
    (rm.tubes || []).forEach(function (lx, i) {
      SK.line(ctx, r, lx - 30, top, lx - 30, top + 10, { w: 0.6, passes: 1 }); SK.line(ctx, r, lx + 30, top, lx + 30, top + (i % 3 === 1 ? 26 : 10), { w: 0.6, passes: 1 });
      var ty = top + 10, tilt = i % 3 === 1 ? 0.25 : 0;
      ctx.save(); ctx.translate(lx, ty); ctx.rotate(tilt);
      SK.fillRect(ctx, r, -36, 0, 72, 7, '#b8b4a8', 0.2); SK.rect(ctx, r, -36, 0, 72, 7, { w: 1 });
      ctx.restore();
    });
    if (rm.clock) {
      var cx = rm.clock.x, cy = rm.clock.y || top + 40;
      ctx.fillStyle = '#c9c2b0'; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 6, cy - 5); ctx.moveTo(cx, cy); ctx.lineTo(cx - 2, cy + 10); ctx.stroke();
    }
    // Cage d'ascenseur : rails, câbles, contrepoids
    if (rm.shaft) {
      SK.fillRect(ctx, r, x0, top, w, h, '#2b2926', 0);
      tex(ctx, { x: x0, y: top, w: w, h: h }, 'concrete', { tile: 90, alpha: 0.6, blend: 'overlay' });
      [x0 + 8, x1 - 8].forEach(function (rx) { SK.line(ctx, r, rx, top, rx, bot, { w: 2.2, color: '#4a4b4d' }); });
      SK.line(ctx, r, x0 + w * 0.4, top, x0 + w * 0.4, bot - 40, { w: 0.8, passes: 1 });
      SK.line(ctx, r, x0 + w * 0.55, top, x0 + w * 0.55, bot - 40, { w: 0.8, passes: 1 });
      SK.fillRect(ctx, r, x1 - 22, top + h * 0.35, 12, 40, '#4a4640', 0.2); SK.rect(ctx, r, x1 - 22, top + h * 0.35, 12, 40, { w: 1 });
      for (var sy = top + 40; sy < bot; sy += 90) SK.line(ctx, r, x0, sy, x1, sy, { w: 0.6, passes: 1, alpha: 0.5 });
    }
    if (rm.bell) {
      // Cloche au repos sous son joug
      var bx0 = rm.bell.x, by0 = rm.bell.y || top + 20, bs = rm.bell.s || 1;
      SK.fillRect(ctx, r, bx0 - 50 * bs, by0 - 8, 100 * bs, 12, '#4a3e32', 0.3); SK.rect(ctx, r, bx0 - 50 * bs, by0 - 8, 100 * bs, 12, { w: 1.2 });
      var bell = [[bx0 - 30 * bs, by0 + 64 * bs], [bx0 - 24 * bs, by0 + 30 * bs], [bx0 - 14 * bs, by0 + 6], [bx0 + 14 * bs, by0 + 6], [bx0 + 24 * bs, by0 + 30 * bs], [bx0 + 30 * bs, by0 + 64 * bs]];
      SK.fill(ctx, r, bell, '#5d5646', 0.5); tex(ctx, bell, 'rust', { tile: 60, alpha: 0.7, blend: 'overlay' }); SK.poly(ctx, r, bell, true, { w: 1.5 });
      SK.line(ctx, r, bx0 - 32 * bs, by0 + 60 * bs, bx0 + 32 * bs, by0 + 60 * bs, { w: 2 });
      SK.line(ctx, r, bx0, by0 + 50 * bs, bx0 + 4, by0 + 74 * bs, { w: 1.6 });
      if (rm.bell.rope) SK.line(ctx, r, bx0 + 20, by0 + 30, bx0 + 24, bot - 30, { w: 1, color: '#6b5d48', passes: 1 });
    }
    if (rm.crucifix) {
      var kx = rm.crucifix.x, ky = rm.crucifix.y || top + 30, ks = rm.crucifix.s || 1;
      SK.fillRect(ctx, r, kx - 4 * ks, ky, 8 * ks, 70 * ks, '#4a3e32', 0.2); SK.fillRect(ctx, r, kx - 22 * ks, ky + 16 * ks, 44 * ks, 8 * ks, '#4a3e32', 0.2);
      SK.rect(ctx, r, kx - 4 * ks, ky, 8 * ks, 70 * ks, { w: 1.1 }); SK.rect(ctx, r, kx - 22 * ks, ky + 16 * ks, 44 * ks, 8 * ks, { w: 1.1 });
    }
    for (var fi = 0; fi < (rm.frames || 0); fi++) frame();
    function frame() {
      var fx = r.range(x0 + 40, x1 - 80), fy = top + r.range(24, 44), tilt = r.range(-0.1, 0.1), fw = r.range(30, 50), fh = r.range(24, 38);
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(tilt);
      SK.fillRect(ctx, r, -fw / 2, -fh / 2, fw, fh, '#6c665a', 0.3); SK.rect(ctx, r, -fw / 2, -fh / 2, fw, fh, { w: 1.1 }); SK.rect(ctx, r, -fw / 2 + 5, -fh / 2 + 5, fw - 10, fh - 10, { w: 0.6, passes: 1 });
      ctx.restore();
      // Trace plus claire d'un cadre décroché
      if (r.next() < 0.4) { ctx.fillStyle = 'rgba(200,192,176,0.12)'; ctx.fillRect(fx + 60, fy - 14, 34, 28); }
    }
    (rm.posters || []).forEach(function (p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
      SK.fillRect(ctx, r, -22, -30, 44, 60, '#b5ad98', 0.3); SK.rect(ctx, r, -22, -30, 44, 60, { w: 0.9, passes: 1 });
      ctx.font = '11px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(40,36,30,0.75)';
      (p.t || '').split('\n').forEach(function (t, i) { ctx.fillText(t, -18, -14 + i * 12); });
      ctx.restore();
    });
    (rm.signs || []).forEach(function (sg) {
      ctx.save(); ctx.font = (sg.size || 24) + 'px ' + (sg.font || '"Bebas Neue", sans-serif'); ctx.fillStyle = sg.color || 'rgba(222,212,190,0.42)';
      ctx.fillText(sg.t, sg.x, sg.y); ctx.restore();
    });
    // Mur crevé : on voit la ville au travers
    (rm.breach || []).forEach(function (b) {
      var pts = [], n = 14;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2, rr = (b.r || 60) * r.range(0.65, 1.1);
        pts.push([b.x + Math.cos(a) * rr * (b.sx || 1.3), Math.min(bot - 6, b.y + Math.sin(a) * rr)]);
      }
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000';
      ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
      ctx.restore();
      SK.poly(ctx, r, pts, true, { w: 1.5 });
      // Briques arrachées sur le pourtour
      pts.forEach(function (p) { if (r.next() < 0.6) { SK.fillRect(ctx, r, p[0] - 6, p[1] - 3, 12, 6, '#6e5a4a', 0.3); SK.rect(ctx, r, p[0] - 6, p[1] - 3, 12, 6, { w: 0.6, passes: 1 }); } });
    });
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
      if (wn.kind === 'shop') { ww = wn.w || 220; wh = wn.h || 120; wx = wn.x - ww / 2; wy = wn.y != null ? wn.y : F.y - wh - 24; }
      if (wn.kind === 'stained' || wn.kind === 'arch') { ww = wn.w || 56; wh = wn.h || 150; wx = wn.x - ww / 2; wy = wn.y != null ? wn.y : F.ceil + 40; }
      if (wn.kind === 'round') { ww = wh = wn.w || 90; wx = wn.x - ww / 2; wy = wn.y != null ? wn.y : F.ceil + 30; }
      var g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, '#8d8b86'); g.addColorStop(1, '#5e5c58');
      ctx.fillStyle = g;
      if (wn.kind === 'round') { ctx.beginPath(); ctx.arc(wn.x, wy + wh / 2, ww / 2, 0, Math.PI * 2); ctx.fill(); }
      else if (wn.kind === 'stained' || wn.kind === 'arch') { ctx.beginPath(); ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wn.x, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); ctx.fill(); }
      else ctx.fillRect(wx, wy, ww, wh);
      if (wn.kind === 'stained' || wn.kind === 'round') {
        // Vitrail : verres teintés, plombs, quelques carreaux soufflés
        var cols = ['rgba(150,60,50,0.55)', 'rgba(70,90,130,0.55)', 'rgba(170,140,60,0.5)', 'rgba(80,110,80,0.5)'];
        ctx.save(); ctx.beginPath();
        if (wn.kind === 'round') ctx.arc(wn.x, wy + wh / 2, ww / 2, 0, Math.PI * 2);
        else { ctx.moveTo(wx, wy + wh); ctx.lineTo(wx, wy + ww / 2); ctx.arc(wn.x, wy + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(wx + ww, wy + wh); ctx.closePath(); }
        ctx.clip();
        var cs = wn.kind === 'round' ? 15 : ww / 3;
        for (var vy = wy; vy < wy + wh; vy += cs) for (var vx = wx; vx < wx + ww; vx += cs) {
          var rv2 = r.next();
          ctx.fillStyle = wn.broken && rv2 < 0.25 ? 'rgba(20,19,17,0.8)' : cols[Math.floor(r.next() * 4)];
          ctx.fillRect(vx + 1, vy + 1, cs - 2, cs - 2);
        }
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        if (wn.kind === 'round') for (var sp = 0; sp < 8; sp++) { ctx.beginPath(); ctx.moveTo(wn.x, wy + wh / 2); ctx.lineTo(wn.x + Math.cos(sp * Math.PI / 4) * ww / 2, wy + wh / 2 + Math.sin(sp * Math.PI / 4) * ww / 2); ctx.stroke(); }
        ctx.restore();
        ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath();
        if (wn.kind === 'round') { ctx.arc(wn.x, wy + wh / 2, ww / 2 + 2, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(wn.x, wy + wh / 2, ww / 5, 0, Math.PI * 2); }
        else { ctx.moveTo(wx - 3, wy + wh + 2); ctx.lineTo(wx - 3, wy + ww / 2); ctx.arc(wn.x, wy + ww / 2, ww / 2 + 3, Math.PI, 0); ctx.lineTo(wx + ww + 3, wy + wh + 2); }
        ctx.stroke(); ctx.restore();
        if (wn.kind !== 'round') SK.fillRect(ctx, r, wx - 8, wy + wh + 2, ww + 16, 6, '#5b564e', 0.3);
        return;
      }
      if (wn.kind === 'arch') {
        ctx.fillStyle = '#4a4844'; ctx.fillRect(wx, wy + wh * 0.6, ww * 0.45, wh * 0.4);
        ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(wx - 4, wy + wh + 3); ctx.lineTo(wx - 4, wy + ww / 2); ctx.arc(wn.x, wy + ww / 2, ww / 2 + 4, Math.PI, 0); ctx.lineTo(wx + ww + 4, wy + wh + 3); ctx.stroke(); ctx.restore();
        SK.line(ctx, r, wn.x, wy, wn.x, wy + wh, { w: 1.3 }); SK.line(ctx, r, wx, wy + wh * 0.55, wx + ww, wy + wh * 0.55, { w: 1.2 });
        if (wn.shutters) { SK.fillRect(ctx, r, wx - 22, wy + 10, 18, wh - 10, '#4f4a3f', 0.3); SK.rect(ctx, r, wx - 22, wy + 10, 18, wh - 10, { w: 1 }); }
        SK.fillRect(ctx, r, wx - 8, wy + wh + 2, ww + 16, 6, '#5b564e', 0.3);
        if (wn.broken) for (var kb = 0; kb < 4; kb++) SK.line(ctx, r, wx + r.range(0, ww), wy + r.range(ww / 2, wh), wx + r.range(0, ww), wy + r.range(ww / 2, wh), { w: 0.6, passes: 1 });
        return;
      }
      if (wn.kind === 'shop') {
        // Vitrine : grande baie, verre éclaté, lettres peintes
        ctx.fillStyle = '#3b3a37'; ctx.fillRect(wx, wy + wh * 0.5, ww, wh * 0.5);
        if (wn.broken) {
          ctx.fillStyle = 'rgba(20,19,17,0.55)';
          ctx.beginPath(); ctx.moveTo(wx + ww * 0.3, wy); ctx.lineTo(wx + ww * 0.55, wy + wh * 0.4); ctx.lineTo(wx + ww * 0.4, wy + wh); ctx.lineTo(wx + ww * 0.8, wy + wh); ctx.lineTo(wx + ww * 0.7, wy + wh * 0.3); ctx.lineTo(wx + ww * 0.9, wy); ctx.closePath(); ctx.fill();
          for (var sh2 = 0; sh2 < 6; sh2++) SK.line(ctx, r, wx + ww * 0.55, wy + wh * 0.4, wx + r.range(0, ww), wy + r.range(0, wh), { w: 0.6, passes: 1 });
        }
        if (wn.text) { ctx.save(); ctx.font = '20px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(226,216,192,0.45)'; ctx.fillText(wn.text, wx + 12, wy + 26); ctx.restore(); }
        SK.rect(ctx, r, wx - 4, wy - 4, ww + 8, wh + 8, { w: 2 });
        SK.line(ctx, r, wx + ww / 2, wy, wx + ww / 2, wy + wh, { w: 1.2 });
        return;
      }
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
      if (sh.cross) {
        var kx = (x0 + x1) / 2, ky = top - (sh.roofH || 120);
        SK.line(ctx, r, kx, ky, kx, ky - 50, { w: 3 }); SK.line(ctx, r, kx - 15, ky - 34, kx + 15, ky - 34, { w: 3 });
      }
    } else if (sh.roof === 'tiles') {
      tileRoof(ctx, r, sh);
    } else if (sh.roof === 'ruin') {
      // Haut du bâtiment arraché : moignons de murs, fers à béton
      var rt = [[x0 - th / 2, top], [x0 - th / 2, top - r.range(30, 70)]];
      for (var rx = x0 + 30; rx < x1 - 20; rx += r.range(30, 70)) rt.push([rx, top - (r.next() < 0.35 ? r.range(40, 110) : r.range(0, 24))]);
      rt.push([x1 + th / 2, top - r.range(10, 60)], [x1 + th / 2, top]);
      SK.fill(ctx, r, rt, '#4e4943', 0.6); tex(ctx, rt, sh.wall || 'brick', { tile: 80, alpha: 0.85, blend: 'overlay' });
      SK.poly(ctx, r, rt, false, { w: 1.5 });
      for (var rb = 0; rb < (x1 - x0) / 60; rb++) {
        var rbx = r.range(x0, x1);
        SK.line(ctx, r, rbx, top - 4, rbx + r.range(-14, 14), top - r.range(24, 50), { w: 0.9, passes: 1 });
      }
    }
    (sh.chimneys || []).forEach(function (cx) {
      var cy = roofYAt(sh, cx);
      SK.fillRect(ctx, r, cx - 16, cy - 70, 32, 72, '#46423c', 0.4);
      tex(ctx, { x: cx - 16, y: cy - 70, w: 32, h: 72 }, 'brick', { tile: 60, alpha: 0.85, blend: 'overlay' });
      SK.rect(ctx, r, cx - 16, cy - 70, 32, 72, { w: 1.3 }); SK.fillRect(ctx, r, cx - 20, cy - 76, 40, 8, '#3e3a35', 0.2);
    });
    if (sh.tower) bellTower(ctx, r, sh.tower);
    if (sh.flag) flag(ctx, r, sh.flag, roofYAt(sh, sh.flag.x));
    if (sh.sign) {
      var sg = sh.sign, sy = sg.y != null ? sg.y : top - 44, sw = sg.w || sg.t.length * 20 + 30;
      SK.line(ctx, r, sg.x - sw / 2 + 20, sy + 34, sg.x - sw / 2 + 20, top, { w: 1.4 }); SK.line(ctx, r, sg.x + sw / 2 - 20, sy + 34, sg.x + sw / 2 - 20, top, { w: 1.4 });
      SK.fillRect(ctx, r, sg.x - sw / 2, sy, sw, 36, sg.tone || '#5d584e', 0.4);
      tex(ctx, { x: sg.x - sw / 2, y: sy, w: sw, h: 36 }, 'plate', { tile: 80, alpha: 0.7, blend: 'overlay' });
      SK.rect(ctx, r, sg.x - sw / 2, sy, sw, 36, { w: 1.5 });
      ctx.save(); ctx.font = '28px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(226,216,192,0.7)'; ctx.textAlign = 'center';
      // Lettres tombées
      var shown = sg.t.split('').map(function (ch, i) { return (sg.missing || []).indexOf(i) >= 0 ? ' ' : ch; }).join('');
      ctx.fillText(shown, sg.x, sy + 28); ctx.restore();
    }
  }

  // Hauteur du toit au-dessus d'un x (pour y planter cheminée, drapeau)
  function roofYAt(sh, x) {
    if (sh.roof === 'tiles' || sh.roof === 'gable') {
      var mid = sh.ridge != null ? sh.ridge : (sh.x0 + sh.x1) / 2, rh = sh.roofH || 120;
      var half = x < mid ? mid - (sh.x0 - 30) : (sh.x1 + 30) - mid;
      return sh.top - rh * Math.max(0, 1 - Math.abs(x - mid) / half);
    }
    return sh.top - (sh.roof === 'flat' ? 14 : 0);
  }

  // Toit à deux pentes en tuiles, éventuellement percé (chevrons à nu)
  function tileRoof(ctx, r, sh) {
    var x0 = sh.x0 - 30, x1 = sh.x1 + 30, top = sh.top, rh = sh.roofH || 120, mid = sh.ridge != null ? sh.ridge : (sh.x0 + sh.x1) / 2;
    var peak = [[x0, top], [mid, top - rh], [x1, top]];
    var hole = sh.hole;                                    // [xa, xb] : partie arrachée
    ctx.save();
    if (hole) { ctx.beginPath(); ctx.rect(-9999, -9999, 99999, 99999); holePath(ctx); ctx.clip('evenodd'); }
    SK.fill(ctx, r, peak, sh.tone || '#4a3b33', 1);
    tex(ctx, peak, 'rust', { tile: 130, alpha: 0.55, blend: 'overlay' });
    // Rangs de tuiles
    ctx.strokeStyle = 'rgba(28,27,26,0.45)'; ctx.lineWidth = 0.8;
    for (var ty = top - 8; ty > top - rh; ty -= 9) {
      var k = (top - ty) / rh, ax = x0 + (mid - x0) * k, bx = x1 - (x1 - mid) * k;
      ctx.beginPath(); ctx.moveTo(ax, ty); ctx.lineTo(bx, ty); ctx.stroke();
      for (var tx = ax + ((ty / 9) % 2 ? 6 : 0); tx < bx; tx += 12) { ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx, ty + 9); ctx.stroke(); }
    }
    ctx.restore();
    if (hole) {
      // Chevrons à nu dans la brèche
      for (var cx = hole[0] + 10; cx < hole[1]; cx += 26) {
        var cy = roofYAt(sh, cx);
        SK.line(ctx, r, cx, cy, cx + (cx < mid ? 1 : -1) * 4, top, { w: 3, color: '#2e2b27', passes: 1 });
      }
      holePath(ctx, true);
    }
    SK.poly(ctx, r, peak, false, { w: 1.7 });
    SK.line(ctx, r, x0 - 4, top, x1 + 4, top, { w: 2 });
    function holePath(c, stroke) {
      var pts = [], xa = hole[0], xb = hole[1];
      for (var x = xa; x <= xb; x += 14) pts.push([x, roofYAt(sh, x) - 2]);
      for (x = xb; x >= xa; x -= 14) pts.push([x, roofYAt(sh, x) + (roofYAt(sh, x) < top - 10 ? Math.min(top - roofYAt(sh, x) - 4, 26 + ((x * 7) % 19)) : 0)]);
      if (stroke) { SK.poly(ctx, r, pts, true, { w: 1.2 }); return; }
      c.moveTo(pts[0][0], pts[0][1]); pts.forEach(function (p) { c.lineTo(p[0], p[1]); }); c.closePath();
    }
  }

  // Clocher : tour, abat-son, flèche, croix (la cloche au repos)
  function bellTower(ctx, r, t) {
    var x = t.x, w = t.w || 120, bot = t.bottom, top = t.top;
    var body = [[x - w / 2, bot], [x - w / 2, top], [x + w / 2, top], [x + w / 2, bot]];
    SK.fill(ctx, r, body, '#4a463f', 0.6); tex(ctx, body, t.wall || 'brickPlaster', { tile: 100, alpha: 0.8, blend: 'overlay' });
    SK.poly(ctx, r, body, true, { w: 1.7 });
    // Baie de la cloche
    var by = top + 30, bw = w * 0.46, bh = 70;
    SK.fillRect(ctx, r, x - bw / 2, by, bw, bh, '#1f1d1a', 0.3);
    ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, by, bw / 2, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#1f1d1a'; ctx.fill(); ctx.restore();
    ctx.save(); ctx.fillStyle = '#5b5346'; ctx.beginPath(); ctx.moveTo(x - 14, by + 44); ctx.quadraticCurveTo(x - 12, by + 10, x, by + 8); ctx.quadraticCurveTo(x + 12, by + 10, x + 14, by + 44); ctx.closePath(); ctx.fill(); ctx.restore();
    SK.line(ctx, r, x - bw / 2, by + bh, x + bw / 2, by + bh, { w: 1.4 });
    // Flèche (brisée si t.broken)
    var sp = t.broken ? [[x - w / 2 - 8, top], [x - 10, top - 90], [x + 16, top - 60], [x + w / 2 + 8, top]] : [[x - w / 2 - 8, top], [x, top - (t.spire || 150)], [x + w / 2 + 8, top]];
    SK.fill(ctx, r, sp, '#3c3a36', 0.8); tex(ctx, sp, 'rust', { tile: 90, alpha: 0.7, blend: 'overlay' }); SK.poly(ctx, r, sp, true, { w: 1.6 });
    if (!t.broken) {
      var ct = top - (t.spire || 150);
      SK.line(ctx, r, x, ct, x, ct - 44, { w: 3 }); SK.line(ctx, r, x - 14, ct - 30, x + 14, ct - 30, { w: 3 });
    }
    if (t.clock) {
      var oy = top + 130;
      ctx.fillStyle = '#c9c2b0'; ctx.beginPath(); ctx.arc(x, oy, 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(x, oy, 20, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x + 8, oy - 7); ctx.moveTo(x, oy); ctx.lineTo(x - 2, oy + 13); ctx.stroke();
      SK.crack(ctx, r, x - 12, oy - 14, 22, 0.9);
    }
  }

  // Drapeau : croix rouge (hôpital), drap blanc, fanion de l'armée
  function flag(ctx, r, f, baseY) {
    var x = f.x, h = f.h || 110, ty = baseY - h;
    SK.line(ctx, r, x, baseY + 2, x, ty, { w: 2.4 });
    var cloth = [[x, ty], [x + 90, ty + 6], [x + 84, ty + 30], [x + 94, ty + 54], [x, ty + 50]];
    if (f.torn) cloth = [[x, ty], [x + 70, ty + 6], [x + 52, ty + 20], [x + 74, ty + 34], [x, ty + 42]];
    var col = f.kind === 'army' ? '#5a5c48' : '#c9c2b2';
    SK.fill(ctx, r, cloth, col, 0.8); SK.poly(ctx, r, cloth, true, { w: 1.2 });
    if (f.kind === 'cross') { ctx.fillStyle = 'rgba(132,38,32,0.85)'; ctx.fillRect(x + 38, ty + 10, 14, 34); ctx.fillRect(x + 27, ty + 20, 36, 13); }
    SK.stain(ctx, x + 60, ty + 30, 14, 0.2);
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
    if (s.type === 'debris') {
      // Pente d'éboulis : on grimpe sur les gravats d'un plancher effondré
      var foot = dx + (dx - ux) * 0.25;
      var pile = [[ux - (dx - ux) * 0.08, uy + 4], [U.lerp(ux, dx, 0.35), U.lerp(uy, dy, 0.3) - 6], [U.lerp(ux, dx, 0.7), U.lerp(uy, dy, 0.68) - 4], [foot, dy], [ux, dy]];
      SK.fill(ctx, r, pile, '#57514a', 1); tex(ctx, pile, 'rubble', { tile: 90, alpha: 0.9, blend: 'overlay' });
      SK.hatchPoly(ctx, r, pile, { gap: 4, alpha: 0.28 }); SK.poly(ctx, r, pile, false, { w: 1.3 });
      for (var k = 0; k < 10; k++) { var t = r.next(); SK.stone(ctx, r, U.lerp(ux, dx, t), U.lerp(uy, dy, t) - r.range(0, 6), r.range(2, 5), '#5f594f'); }
      // Poutre et planches qui dépassent
      SK.line(ctx, r, ux - 10, uy + 10, U.lerp(ux, dx, 0.6), U.lerp(uy, dy, 0.5) + 10, { w: 4, color: '#4a3e32', passes: 1 });
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
    if (F.scaffold) {
      // Plancher d'échafaudage : planches sur tubes
      SK.fillRect(ctx, r, x0, y, x1 - x0, 6, '#6b5d48', 0.3);
      tex(ctx, { x: x0, y: y, w: x1 - x0, h: 6 }, 'planks', { tile: 60, alpha: 0.9, blend: 'overlay' });
      SK.line(ctx, r, x0, y, x1, y, { w: 1.5 }); SK.line(ctx, r, x0, y + 6, x1, y + 6, { w: 1 });
      SK.line(ctx, r, x0, y - 40, x1, y - 40, { w: 1.6, color: '#4a4b4d' });
      for (var sx = x0; sx <= x1 + 1; sx += Math.max(80, (x1 - x0) / Math.round((x1 - x0) / 130))) {
        SK.line(ctx, r, sx, y - 44, sx, F.support || y + 6, { w: 2, color: '#4a4b4d' });
      }
      return;
    }
    var segs = F.segs || [{ x0: x0, x1: x1, out: F.out, tex: F.tex }];
    var th = F.thick || (F.ground ? 28 : 14);
    // Bout de dalle arraché (plancher effondré) : fers tordus, planches pendantes
    (F.broken || []).forEach(function (side) {
      var bx = side === 'left' ? x0 : x1, dir = side === 'left' ? 1 : -1;
      for (var k = 0; k < 4; k++) SK.line(ctx, r, bx + dir * k * 6, y + 6, bx - dir * r.range(10, 26), y + r.range(20, 50), { w: 0.9, passes: 1 });
      SK.line(ctx, r, bx + dir * 8, y + 2, bx - dir * 14, y + 60, { w: 4, color: '#4a3e32', passes: 1 });
    });
    // Mezzanine posée sur des poteaux
    if (F.support) for (var sp = x0 + 20; sp < x1 - 10; sp += F.supportGap || 200) {
      SK.fillRect(ctx, r, sp - 6, y + 14, 12, F.support - y - 14, '#4a4b4c', 0.2);
      SK.line(ctx, r, sp - 6, y + 14, sp - 6, F.support, { w: 1.2 }); SK.line(ctx, r, sp + 6, y + 14, sp + 6, F.support, { w: 1.2 });
    }
    if (F.carpet) {
      var cp = F.carpet;
      SK.fillRect(ctx, r, cp[0], y - 3, cp[1] - cp[0], 4, cp[2] || '#6a3f36', 0.2);
    }
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
    var y = fl(th.f).y - (th.dy || 0), x = th.x, d = th.flip ? -1 : 1;
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
    } else if (THINGS[th.kind]) {
      ctx.save(); ctx.translate(x, y); ctx.scale(d * (th.s || 1), th.s || 1);
      THINGS[th.kind](ctx, r, th);
      ctx.restore();
    }
  }

  function wheel(ctx, x, y, rad, burnt) {
    ctx.fillStyle = burnt ? '#2a2826' : '#1a1917'; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a5c5e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, rad * 0.45, 0, Math.PI * 2); ctx.stroke();
  }
  // Grand décor dessiné sur place (origine = pied de l'objet, au sol)
  var THINGS = {
    // Voiture abandonnée ou calcinée
    car: function (ctx, r, th) {
      var burnt = th.burnt, col = th.color || (burnt ? '#3a3632' : '#5c5a52');
      var body = [[-90, -14], [-92, -40], [-60, -46], [-38, -74], [30, -76], [58, -48], [92, -42], [94, -14]];
      SK.fill(ctx, r, body, col, 0.6); tex(ctx, body, 'rust', { tile: 70, alpha: burnt ? 0.95 : 0.6, blend: 'overlay' });
      SK.poly(ctx, r, body, true, { w: 1.5 });
      var glass = [[-32, -70], [-4, -71], [-4, -48], [-52, -47]], glass2 = [[2, -71], [26, -71], [48, -49], [2, -48]];
      [glass, glass2].forEach(function (g) { SK.fill(ctx, r, g, burnt ? '#1c1b19' : '#6d6c68', 0.2); SK.poly(ctx, r, g, true, { w: 1 }); });
      if (!burnt) SK.line(ctx, r, -30, -66, -14, -52, { w: 0.6, passes: 1 });
      SK.line(ctx, r, -2, -46, -2, -16, { w: 0.8, passes: 1 });
      if (th.door) { var dr = [[6, -46], [44, -46], [58, -20], [14, -18]]; SK.fill(ctx, r, dr, col, 0.4); SK.poly(ctx, r, dr, true, { w: 1.1 }); }
      wheel(ctx, -58, -12, 15, burnt); wheel(ctx, 60, -12, 15, burnt);
      if (burnt) for (var k = 0; k < 5; k++) SK.stain(ctx, r.range(-80, 80), r.range(-60, -20), r.range(12, 26), 0.25, '20,19,17');
    },
    // Autobus criblé de balles
    bus: function (ctx, r, th) {
      var body = [[-200, -16], [-200, -128], [190, -128], [206, -110], [206, -16]];
      SK.fill(ctx, r, body, th.color || '#6a6a5c', 0.6); tex(ctx, body, 'rust', { tile: 90, alpha: 0.7, blend: 'overlay' }); SK.poly(ctx, r, body, true, { w: 1.6 });
      for (var wx = -190; wx < 170; wx += 46) { var wd = [[wx, -116], [wx + 38, -116], [wx + 38, -80], [wx, -80]]; SK.fill(ctx, r, wd, '#2b2a28', 0.2); SK.poly(ctx, r, wd, true, { w: 1 }); }
      SK.line(ctx, r, -200, -70, 206, -70, { w: 1 });
      for (var b = 0; b < 26; b++) { ctx.fillStyle = '#161513'; ctx.beginPath(); ctx.arc(r.range(-190, 196), r.range(-66, -24), 1.8, 0, Math.PI * 2); ctx.fill(); }
      wheel(ctx, -140, -14, 17); wheel(ctx, 130, -14, 17);
    },
    // Char calciné, tourelle de travers
    tank: function (ctx, r, th) {
      var hull = [[-150, -20], [-164, -50], [-120, -66], [130, -66], [168, -48], [150, -20]];
      SK.fill(ctx, r, hull, '#43443a', 0.6); tex(ctx, hull, 'rust', { tile: 90, alpha: 0.8, blend: 'overlay' }); SK.poly(ctx, r, hull, true, { w: 1.6 });
      var tr = [[-60, -66], [-50, -104], [50, -108], [70, -66]];
      SK.fill(ctx, r, tr, '#3e3f36', 0.6); SK.poly(ctx, r, tr, true, { w: 1.5 });
      SK.line(ctx, r, 40, -92, 190, -118, { w: 5, color: '#33342e', passes: 1 }); SK.line(ctx, r, 40, -92, 190, -118, { w: 1.2 });
      var track = [[-156, -20], [156, -20], [140, 0], [-140, 0]];
      SK.fill(ctx, r, track, '#2a2a26', 0.4); SK.poly(ctx, r, track, true, { w: 1.4 });
      for (var k = -130; k <= 130; k += 36) wheel(ctx, k, -10, 9, true);
      for (var s = 0; s < 4; s++) SK.stain(ctx, r.range(-120, 120), r.range(-90, -30), r.range(18, 30), 0.25, '20,19,17');
    },
    // Cratère d'obus dans le sol
    crater: function (ctx, r, th) {
      var w = th.w || 160;
      var lip = [[-w / 2 - 20, 0], [-w / 2, -12], [-w / 4, -18], [w / 4, -16], [w / 2, -10], [w / 2 + 20, 0]];
      SK.fill(ctx, r, lip, '#4d4841', 1); SK.hatchPoly(ctx, r, lip, { gap: 4, alpha: 0.3 }); SK.poly(ctx, r, lip, false, { w: 1.2 });
      for (var k = 0; k < 8; k++) SK.stone(ctx, r, r.range(-w / 2, w / 2), r.range(-16, -4), r.range(2, 5), '#5a544b');
    },
    // Arbre mort, branches nues
    tree: function (ctx, r, th) {
      var h = th.h || 260;
      ctx.strokeStyle = '#2a2622'; ctx.lineCap = 'round';
      function br(x, y, a, len, wdt, depth) {
        var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
        ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
        if (depth <= 0) return;
        br(ex, ey, a - r.range(0.25, 0.6), len * r.range(0.55, 0.75), wdt * 0.62, depth - 1);
        if (r.next() < 0.85) br(ex, ey, a + r.range(0.25, 0.6), len * r.range(0.5, 0.72), wdt * 0.6, depth - 1);
      }
      br(0, 0, -Math.PI / 2 + r.range(-0.08, 0.08), h * 0.42, th.trunk || 14, 5);
      ctx.lineCap = 'butt';
    },
    // Grue à tour du chantier
    crane: function (ctx, r, th) {
      var h = th.h || 620, arm = th.arm || 520, back = th.back || 160;
      ctx.lineWidth = 1.3; ctx.strokeStyle = INK;
      [-14, 14].forEach(function (ox) { SK.line(ctx, r, ox, 0, ox, -h, { w: 2.4 }); });
      for (var y = 0; y > -h + 20; y -= 30) { ctx.beginPath(); ctx.moveTo(-14, y); ctx.lineTo(14, y - 30); ctx.moveTo(14, y); ctx.lineTo(-14, y - 30); ctx.stroke(); }
      SK.line(ctx, r, -back, -h, arm, -h, { w: 2.4 }); SK.line(ctx, r, -back, -h - 22, arm * 0.9, -h - 4, { w: 1.4 });
      for (var x = -back; x < arm - 20; x += 30) { ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x + 15, -h - 18 + (x / arm) * 14); ctx.stroke(); }
      SK.line(ctx, r, 0, -h - 60, arm * 0.9, -h, { w: 0.9 }); SK.line(ctx, r, 0, -h - 60, -back, -h - 22, { w: 0.9 }); SK.line(ctx, r, 0, -h, 0, -h - 60, { w: 2 });
      SK.fillRect(ctx, r, -back, -h + 2, 60, 40, '#46443f', 0.3); SK.rect(ctx, r, -back, -h + 2, 60, 40, { w: 1.2 });
      SK.fillRect(ctx, r, 16, -h + 4, 34, 30, '#5a564e', 0.3); SK.rect(ctx, r, 16, -h + 4, 34, 30, { w: 1.2 });
      var hx = th.hook || arm * 0.7; SK.line(ctx, r, hx, -h, hx, -h + (th.drop || 300), { w: 0.8 });
      if (th.load) { SK.fillRect(ctx, r, hx - 30, -h + (th.drop || 300), 60, 22, '#6b5d48', 0.3); SK.rect(ctx, r, hx - 30, -h + (th.drop || 300), 60, 22, { w: 1.1 }); }
    },
    // Hérissons antichars
    hedgehog: function (ctx, r, th) {
      for (var i = 0; i < (th.n || 1); i++) {
        var ox = i * 70;
        SK.line(ctx, r, ox - 30, 0, ox + 26, -60, { w: 5, color: '#3a3a36', passes: 1 }); SK.line(ctx, r, ox + 30, 0, ox - 26, -60, { w: 5, color: '#3a3a36', passes: 1 });
        SK.line(ctx, r, ox - 30, 0, ox + 26, -60, { w: 1.2 }); SK.line(ctx, r, ox + 30, 0, ox - 26, -60, { w: 1.2 });
        SK.line(ctx, r, ox, -2, ox + 4, -52, { w: 4, color: '#34342f', passes: 1 });
      }
    },
    // Mur de sacs de sable (poste de tir)
    sandwall: function (ctx, r, th) {
      var w = th.w || 140, rows = th.rows || 3;
      for (var j = 0; j < rows; j++) for (var i = 0; i < w / 34; i++) {
        var bx = -w / 2 + i * 34 + (j % 2 ? 17 : 0); if (bx > w / 2 - 20) continue;
        var by = -j * 16 - 16;
        ctx.fillStyle = ['#7a705c', '#6f6653', '#837a64'][(i + j) % 3];
        ctx.beginPath(); ctx.ellipse(bx + 16, by + 8, 17, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.stroke();
      }
    },
    // Tente de l'armée ou de réfugiés
    tent: function (ctx, r, th) {
      var w = th.w || 180, h = th.h || 110;
      var t = [[-w / 2, 0], [-w / 2 + 16, -h * 0.55], [0, -h], [w / 2 - 16, -h * 0.55], [w / 2, 0]];
      SK.fill(ctx, r, t, th.color || '#5b5c4a', 0.6); tex(ctx, t, 'plaster2', { tile: 90, alpha: 0.5, blend: 'overlay' });
      SK.hatchPoly(ctx, r, t, { gap: 6, alpha: 0.2, angle: 1.2 }); SK.poly(ctx, r, t, true, { w: 1.5 });
      var door = [[-24, 0], [0, -h * 0.7], [24, 0]]; SK.fill(ctx, r, door, '#22211e', 0.3); SK.poly(ctx, r, door, false, { w: 1 });
      SK.line(ctx, r, 0, -h, 0, -h - 16, { w: 1.6 });
    },
    // Muret de jardin ou de cour, avec grille
    wall: function (ctx, r, th) {
      var w = th.w || 300, h = th.h || 60;
      SK.fillRect(ctx, r, 0, -h, w, h, '#57514a', 0.3); tex(ctx, { x: 0, y: -h, w: w, h: h }, th.tex || 'brick', { tile: 70, alpha: 0.9, blend: 'overlay' });
      SK.rect(ctx, r, 0, -h, w, h, { w: 1.4 }); SK.fillRect(ctx, r, -4, -h - 6, w + 8, 7, '#4a4640', 0.2);
      if (th.rails) for (var x = 6; x < w; x += 14) SK.line(ctx, r, x, -h - 6, x, -h - 50, { w: 1.1, passes: 1 });
      if (th.rails) SK.line(ctx, r, 0, -h - 40, w, -h - 40, { w: 1 });
    },
    // Pont élévateur de garage, voiture dessus
    lift: function (ctx, r, th) {
      [-70, 70].forEach(function (px) { SK.fillRect(ctx, r, px - 7, -150, 14, 150, '#565a5c', 0.3); SK.rect(ctx, r, px - 7, -150, 14, 150, { w: 1.3 }); });
      SK.fillRect(ctx, r, -90, -104, 180, 8, '#4a4d50', 0.3); SK.rect(ctx, r, -90, -104, 180, 8, { w: 1.2 });
      ctx.save(); ctx.translate(0, -104); ctx.scale(0.85, 0.85); THINGS.car(ctx, r, { color: '#5d574c', door: true }); ctx.restore();
    },
    // Four à pain en briques, voûte noircie
    oven: function (ctx, r, th) {
      var w = th.w || 200, h = th.h || 150;
      var body = [[-w / 2, 0], [-w / 2, -h * 0.7], [-w / 3, -h], [w / 3, -h], [w / 2, -h * 0.7], [w / 2, 0]];
      SK.fill(ctx, r, body, '#5b4a3e', 0.5); tex(ctx, body, 'brick', { tile: 70, alpha: 0.95, blend: 'overlay' }); SK.poly(ctx, r, body, true, { w: 1.6 });
      ctx.save(); ctx.fillStyle = '#141311'; ctx.beginPath(); ctx.moveTo(-40, -30); ctx.lineTo(-40, -70); ctx.quadraticCurveTo(0, -100, 40, -70); ctx.lineTo(40, -30); ctx.closePath(); ctx.fill(); ctx.restore();
      SK.line(ctx, r, -50, -28, 50, -28, { w: 2 });
      SK.stain(ctx, 0, -90, 40, 0.3, '20,19,17');
      SK.fillRect(ctx, r, w / 2 - 50, -h - 90, 30, 92, '#4a3e35', 0.3); SK.rect(ctx, r, w / 2 - 50, -h - 90, 30, 92, { w: 1.2 });
    },
    // Cage de foot de la cour d'école
    goal: function (ctx, r, th) {
      SK.line(ctx, r, -80, 0, -80, -90, { w: 2.4 }); SK.line(ctx, r, 80, 0, 80, -90, { w: 2.4 }); SK.line(ctx, r, -80, -90, 80, -90, { w: 2.4 });
      ctx.strokeStyle = 'rgba(30,29,27,0.35)'; ctx.lineWidth = 0.5;
      for (var x = -76; x < 80; x += 10) { ctx.beginPath(); ctx.moveTo(x, -88); ctx.lineTo(x + 6, 0); ctx.stroke(); }
      for (var y = -80; y < 0; y += 10) { ctx.beginPath(); ctx.moveTo(-78, y); ctx.lineTo(78, y); ctx.stroke(); }
    },
    // Portique de balançoire, une chaîne cassée
    swing: function (ctx, r, th) {
      SK.line(ctx, r, -70, 0, -50, -130, { w: 2.2 }); SK.line(ctx, r, -30, 0, -50, -130, { w: 2.2 });
      SK.line(ctx, r, 70, 0, 50, -130, { w: 2.2 }); SK.line(ctx, r, 30, 0, 50, -130, { w: 2.2 });
      SK.line(ctx, r, -54, -130, 54, -130, { w: 2.4 });
      SK.line(ctx, r, -18, -130, -18, -38, { w: 0.8 }); SK.line(ctx, r, 10, -130, 10, -38, { w: 0.8 });
      SK.fillRect(ctx, r, -22, -40, 36, 5, '#5b4e3e', 0.2);
      SK.line(ctx, r, 26, -130, 30, -70, { w: 0.8 });
    },
    // Pompes à essence sous auvent
    pumps: function (ctx, r, th) {
      [-60, 60].forEach(function (px) {
        SK.fillRect(ctx, r, px - 16, -88, 32, 88, '#6a6a60', 0.4); tex(ctx, { x: px - 16, y: -88, w: 32, h: 88 }, 'rust', { tile: 60, alpha: 0.6, blend: 'overlay' });
        SK.rect(ctx, r, px - 16, -88, 32, 88, { w: 1.3 }); SK.fillRect(ctx, r, px - 10, -78, 20, 16, '#2a2a28', 0.2);
        SK.line(ctx, r, px + 16, -50, px + 26, -20, { w: 1.2 });
      });
      SK.line(ctx, r, -120, -170, 120, -170, { w: 2 }); SK.fillRect(ctx, r, -130, -186, 260, 16, '#57544c', 0.3); SK.rect(ctx, r, -130, -186, 260, 16, { w: 1.4 });
      SK.line(ctx, r, -110, -170, -110, 0, { w: 2.2 }); SK.line(ctx, r, 110, -170, 110, 0, { w: 2.2 });
    },
    // Kiosque à journaux
    kiosk: function (ctx, r, th) {
      var body = [[-50, 0], [-50, -100], [50, -100], [50, 0]];
      SK.fill(ctx, r, body, '#5f6152', 0.5); tex(ctx, body, 'plate', { tile: 60, alpha: 0.6, blend: 'overlay' }); SK.poly(ctx, r, body, true, { w: 1.4 });
      var roof = [[-64, -100], [0, -134], [64, -100]]; SK.fill(ctx, r, roof, '#46473d', 0.5); SK.poly(ctx, r, roof, true, { w: 1.4 });
      SK.fillRect(ctx, r, -38, -84, 76, 34, '#2a2a28', 0.2); SK.rect(ctx, r, -38, -84, 76, 34, { w: 1 });
      for (var k = 0; k < 4; k++) { ctx.fillStyle = 'rgba(190,182,160,0.5)'; ctx.fillRect(-44 + k * 22, -44, 16, 20); }
    },
    // Banc public
    bench: function (ctx, r, th) {
      SK.fillRect(ctx, r, -50, -30, 100, 6, '#5b4e3e', 0.2); SK.fillRect(ctx, r, -50, -56, 100, 6, '#5b4e3e', 0.2);
      SK.line(ctx, r, -44, 0, -44, -56, { w: 1.6 }); SK.line(ctx, r, 44, 0, 44, -56, { w: 1.6 });
    },
    // Échafaudage devant une façade (tubes et planches)
    scaffold: function (ctx, r, th) {
      var w = th.w || 200, h = th.h || 300, lv = th.levels || 3;
      for (var x = 0; x <= w; x += w / Math.max(1, Math.round(w / 120))) SK.line(ctx, r, x, 0, x, -h, { w: 2, color: '#4a4b4d' });
      for (var l = 1; l <= lv; l++) {
        var y = -h * l / lv;
        SK.fillRect(ctx, r, -6, y, w + 12, 6, '#6b5d48', 0.3); SK.line(ctx, r, -6, y, w + 6, y, { w: 1.3 });
        SK.line(ctx, r, 0, y + h / lv, w, y, { w: 0.8, passes: 1, alpha: 0.7 });
      }
    },
    // Rame de métro abandonnée sur sa voie (portes ouvertes, vitres brisées)
    train: function (ctx, r, th) {
      var w = th.w || 460, h = th.h || 118;
      SK.fillRect(ctx, r, -w / 2 - 40, -6, w + 80, 6, '#3a3834', 0.2);
      SK.line(ctx, r, -w / 2 - 40, -3, w / 2 + 40, -3, { w: 1.4 });
      var body = [[-w / 2, -14], [-w / 2, -h + 10], [-w / 2 + 12, -h], [w / 2 - 12, -h], [w / 2, -h + 10], [w / 2, -14]];
      SK.fill(ctx, r, body, th.color || '#5f6664', 0.5); tex(ctx, body, 'plate', { tile: 80, alpha: 0.7, blend: 'overlay' }); SK.poly(ctx, r, body, true, { w: 1.6 });
      SK.fillRect(ctx, r, -w / 2, -h * 0.42, w, 10, '#7a5a3e', 0.2);
      for (var wx = -w / 2 + 16; wx < w / 2 - 50; wx += 70) {
        var dark = r.next() < 0.5;
        SK.fillRect(ctx, r, wx, -h + 18, 46, 34, dark ? '#1c1b19' : '#3d4142', 0.2); SK.rect(ctx, r, wx, -h + 18, 46, 34, { w: 1 });
        if (!dark) SK.line(ctx, r, wx + 4, -h + 22, wx + 30, -h + 46, { w: 0.6, passes: 1 });
      }
      // Portes ouvertes (on peut y dormir)
      [-w / 4, w / 4].forEach(function (dx) { SK.fillRect(ctx, r, dx - 22, -h + 16, 44, h - 30, '#161513', 0.2); SK.rect(ctx, r, dx - 22, -h + 16, 44, h - 30, { w: 1.2 }); });
      [-w / 2 + 50, w / 2 - 50].forEach(function (bx) { wheel(ctx, bx - 18, -10, 9, true); wheel(ctx, bx + 18, -10, 9, true); });
      if (th.text) { ctx.save(); ctx.font = '16px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(222,212,190,0.5)'; ctx.fillText(th.text, -w / 2 + 16, -h * 0.42 - 6); ctx.restore(); }
    },
    // Panneau publicitaire sur deux poteaux, affiche déchirée
    billboard: function (ctx, r, th) {
      var w = th.w || 170, h = th.h || 90, top = -(th.lift || 40) - h;
      SK.line(ctx, r, -w / 3, 0, -w / 3, top + h, { w: 3 }); SK.line(ctx, r, w / 3, 0, w / 3, top + h, { w: 3 });
      SK.fillRect(ctx, r, -w / 2, top, w, h, '#b3aa94', 0.3); SK.rect(ctx, r, -w / 2, top, w, h, { w: 1.6 });
      var torn = [[-w / 2 + 20, top + 6], [w / 6, top + 10], [w / 5, top + h * 0.6], [-w / 6, top + h - 8], [-w / 2 + 10, top + h - 14]];
      SK.fill(ctx, r, torn, '#7d5a4a', 0.5); SK.poly(ctx, r, torn, true, { w: 0.8, passes: 1 });
      ctx.save(); ctx.font = '18px "Bebas Neue", sans-serif'; ctx.fillStyle = 'rgba(40,36,30,0.75)'; ctx.fillText(th.text || 'COCA-COLA', -w / 2 + 26, top + 30); ctx.restore();
      for (var b = 0; b < 7; b++) { ctx.fillStyle = '#161513'; ctx.beginPath(); ctx.arc(r.range(-w / 2 + 8, w / 2 - 8), r.range(top + 8, top + h - 8), 2, 0, Math.PI * 2); ctx.fill(); }
    },
    // Cabine d'ascenseur bloquée (grille en accordéon)
    cabin: function (ctx, r, th) {
      var w = th.w || 70, h = th.h || 120;
      SK.fillRect(ctx, r, -w / 2, -h, w, h, '#4d4a44', 0.3); tex(ctx, { x: -w / 2, y: -h, w: w, h: h }, 'plate', { tile: 60, alpha: 0.7, blend: 'overlay' });
      SK.rect(ctx, r, -w / 2, -h, w, h, { w: 1.5 });
      for (var gx = -w / 2 + 6; gx < w / 2 - 2; gx += 8) SK.line(ctx, r, gx, -h + 10, gx + 4, -8, { w: 0.6, passes: 1 });
      SK.line(ctx, r, 0, -h, 0, -h - (th.cable || 400), { w: 1, passes: 1 });
      if (th.crashed) { SK.line(ctx, r, -w / 2, -h, w / 2, -h + 14, { w: 1.4 }); SK.stone(ctx, r, -w / 2 - 8, -4, 4, '#5a544b'); }
    },
    // Barricade de meubles et de planches
    barricade: function (ctx, r, th) {
      var w = th.w || 120;
      var pile = [[-w / 2, 0], [-w / 2 + 10, -50], [-10, -80], [w / 4, -60], [w / 2, 0]];
      SK.fill(ctx, r, pile, '#4e453a', 0.8); tex(ctx, pile, 'planks', { tile: 60, alpha: 0.8, blend: 'overlay', rot: 0.4 }); SK.poly(ctx, r, pile, true, { w: 1.4 });
      for (var k = 0; k < 4; k++) SK.line(ctx, r, r.range(-w / 2, w / 2), r.range(-70, -10), r.range(-w / 2, w / 2), r.range(-70, -10), { w: 3, color: '#5b4e3e', passes: 1 });
    }
  };

  // ============================================================ lumières
  // Rectangle d'une fenêtre (mêmes règles que windows())
  function winRect(wn) {
    var F = fl(wn.f);
    var ww = wn.w || (wn.vent ? 50 : 62), wh = wn.h || (wn.vent ? 18 : 74);
    var wy = wn.y != null ? wn.y : wn.vent ? F.ceil + 8 : F.ceil + 28;
    if (wn.kind === 'shop') { ww = wn.w || 220; wh = wn.h || 120; wy = wn.y != null ? wn.y : F.y - wh - 24; }
    if (wn.kind === 'stained' || wn.kind === 'arch') { ww = wn.w || 56; wh = wn.h || 150; wy = wn.y != null ? wn.y : F.ceil + 40; }
    if (wn.kind === 'round') { ww = wh = wn.w || 90; wy = wn.y != null ? wn.y : F.ceil + 30; }
    return { x: wn.x - ww / 2, y: wy, w: ww, h: wh, floorY: F.y };
  }
  // Clair de lune qui tombe des fenêtres jusqu'au sol (sous un vitrail : coloré)
  function moonlight(ctx, m) {
    var k = m.mood && m.mood.moon != null ? m.mood.moon : 0.09;
    if (k <= 0) return;
    (C.WINDOWS || []).forEach(function (wn) {
      if (wn.boarded) return;
      var R = winRect(wn), a = k * 1.7 * (wn.vent ? 0.5 : 1);
      var drop = Math.min(R.floorY - R.y - R.h, 260), slant = 0.45 * (drop + R.h);
      var poly = [[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w + slant, R.floorY], [R.x + slant * 0.55, R.floorY]];
      if (R.floorY - (R.y + R.h) > 300) poly = [[R.x, R.y], [R.x + R.w, R.y], [R.x + R.w + 120, R.y + R.h + 260], [R.x + 60, R.y + R.h + 260]];
      var g = ctx.createLinearGradient(0, R.y, 0, poly[2][1]);
      var col = wn.kind === 'stained' || wn.kind === 'round' ? '190,150,120' : '150,170,210';
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')'); g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); poly.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fill();
      // Flaque de lumière au sol
      if (R.floorY - (R.y + R.h) <= 300) {
        var cx = (poly[2][0] + poly[3][0]) / 2, rw = (poly[2][0] - poly[3][0]) / 2 + 20;
        var g2 = ctx.createRadialGradient(cx, R.floorY - 2, 2, cx, R.floorY - 2, rw);
        g2.addColorStop(0, 'rgba(' + col + ',' + a * 0.9 + ')'); g2.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.fillStyle = g2; ctx.fillRect(cx - rw, R.floorY - 14, rw * 2, 16);
      }
    });
  }

  L.drawLights = function (ctx, m, t) {
    moonlight(ctx, m);
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
      } else if (li.kind === 'candle') {
        // Bougie, lampe à pétrole : petite lueur chaude qui tremble
        var cr = (li.r || 90) * (0.92 + Math.sin(t * 11 + i) * 0.06);
        var gc = ctx.createRadialGradient(li.x, li.y, 1, li.x, li.y, cr);
        gc.addColorStop(0, 'rgba(255,190,110,0.3)'); gc.addColorStop(1, 'rgba(240,160,80,0)');
        ctx.fillStyle = gc; ctx.fillRect(li.x - cr, li.y - cr, cr * 2, cr * 2);
        ctx.fillStyle = 'rgba(255,215,150,0.9)'; ctx.beginPath(); ctx.ellipse(li.x, li.y - 3, 1.6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
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
