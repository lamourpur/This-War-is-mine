/* =========================================================
   Rendu du refuge
   - Couche statique (décor + objets), redessinée seulement
     quand quelque chose change (Render.dirty)
   - Couche dynamique à chaque image : survivants, lumières,
     particules, météo, surbrillance, obscurité, grain
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch, U = C.util;
  var W = C.WORLD.W, H = C.WORLD.H;

  var R = C.Render = {
    dirty: true, scale: 1, ox: 0, oy: 0, dpr: 1,
    hoverObj: null, hoverSurv: null, particles: [], shakeT: 0, flashT: 0,
    placing: null, time: 0, grainOn: true
  };

  R.init = function (canvas) {
    R.canvas = canvas;
    R.ctx = canvas.getContext('2d');
    R.staticCanvas = document.createElement('canvas');
    R.grain = SK.makeGrain(256);
    R.resize();
    window.addEventListener('resize', R.resize);
  };

  R.resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = Math.floor(window.innerWidth * dpr), ch = Math.floor(window.innerHeight * dpr);
    R.canvas.width = cw; R.canvas.height = ch;
    R.canvas.style.width = window.innerWidth + 'px';
    R.canvas.style.height = window.innerHeight + 'px';
    R.dpr = dpr;
    // La maison (x 140 → 1460) doit tenir entre la colonne des fiches et le bord droit
    var wide = window.innerWidth > 900;
    var leftUI = (wide ? (window.innerWidth > 1100 ? 336 : 290) : 0) * dpr;
    var rightUI = (wide ? 96 : 0) * dpr;
    var houseW = C.WORLD.right - C.WORLD.left;
    R.scale = Math.min((cw - leftUI - rightUI - 20 * dpr) / houseW, (ch - 40 * dpr) / (H - 60), cw / W * 1.25);
    var extra = Math.max(0, (cw - leftUI - rightUI - 20 * dpr) - houseW * R.scale);
    R.ox = leftUI + 10 * dpr - C.WORLD.left * R.scale + extra / 2;
    R.oy = Math.max(70 * dpr - 40 * R.scale, (ch - H * R.scale) / 2 + 20 * dpr);
    R.staticCanvas.width = Math.ceil(W * R.scale);
    R.staticCanvas.height = Math.ceil(H * R.scale);
    R.dirty = true;
  };

  R.toWorld = function (px, py) {
    return { x: (px * R.dpr - R.ox) / R.scale, y: (py * R.dpr - R.oy) / R.scale };
  };
  R.toScreen = function (wx, wy) {
    return { x: (wx * R.scale + R.ox) / R.dpr, y: (wy * R.scale + R.oy) / R.dpr };
  };

  // ============================================================ couche statique
  function buildStatic() {
    var st = C.Game.st;
    var c = R.staticCanvas, ctx = c.getContext('2d');
    ctx.setTransform(R.scale, 0, 0, R.scale, 0, 0);
    var r = SK.rng(st.seed % 100000 + 7);
    C.Nav.computeRegions();

    drawOutside(ctx, SK.rng(11));
    drawHouse(ctx, SK.rng(23));
    drawDecor(ctx, st);

    // Objets : trous d'abord (au mur), puis le reste
    var objs = st.objects.slice().sort(function (a, b) { return (a.kind === 'hole' ? 0 : 1) - (b.kind === 'hole' ? 0 : 1); });
    objs.forEach(function (o) {
      var fn = C.ObjDraw[o.kind];
      if (fn) fn(ctx, SK.rng(o.uid * 97 + 13), o, C.FLOORS[o.f].y);
    });

    // Brouillard sur les zones inaccessibles
    C.Nav.regions.forEach(function (rg) {
      if (rg.reach) return;
      var fl = C.FLOORS[rg.f];
      var x0 = Math.max(rg.x0, C.WORLD.left + 6), x1 = Math.min(rg.x1, C.WORLD.right - 6);
      var pad = 0;
      C.Game.st.objects.forEach(function (o) {
        if (o.f === rg.f && C.Game.isBlocking(o) && (Math.abs(o.x - rg.x0) < 1 || Math.abs(o.x - rg.x1) < 1)) pad = Math.max(pad, o.w / 2);
      });
      if (Math.abs(x0 - rg.x0) < 1 && rg.x0 > C.WORLD.left + 10) x0 += pad;
      if (Math.abs(x1 - rg.x1) < 1 && rg.x1 < C.WORLD.right - 10) x1 -= pad;
      ctx.fillStyle = 'rgba(12,11,10,0.86)';
      ctx.fillRect(x0, fl.ceil, x1 - x0, fl.y - fl.ceil);
      var rr = SK.rng(rg.f * 31 + Math.round(rg.x0));
      SK.scribble(ctx, rr, x0 + 6, fl.ceil + 6, x1 - x0 - 12, fl.y - fl.ceil - 12, 60, 0.18);
    });
  }

  // Objets détourés du décor (C.DECOR), cachés si une construction occupe la place
  function drawDecor(ctx, st) {
    if (!C.Props.ready || !C.DECOR) return;
    C.DECOR.forEach(function (d) {
      var w = d.h * C.Props.aspect(d.p);
      if (!d.out && st.objects.some(function (o) {
        return o.f === d.f && o.kind !== 'hole' && Math.abs(o.x - d.x) < (o.w || 60) / 2 + w / 2 - 4;
      })) return;
      var y = (d.out ? C.WORLD.ground : C.FLOORS[d.f].y) - (d.dy || 0);
      if (d.wall) {
        // Clou au mur
        ctx.fillStyle = '#1c1b1a'; ctx.beginPath(); ctx.arc(d.x, y - d.h + 2, 1.6, 0, Math.PI * 2); ctx.fill();
      }
      C.Props.draw(ctx, d.p, d.x, y + 1, d.h, { flip: d.flip, shade: d.shade != null ? d.shade : d.out ? 0.25 : 0.08, noShadow: d.wall });
    });
  }

  function drawOutside(ctx, r) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#595855'); g.addColorStop(0.5, '#7a776f'); g.addColorStop(1, '#5a5650');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Fumée lointaine
    for (var i = 0; i < 5; i++) {
      var sx = r.range(0, W), sy = r.range(80, 400);
      for (var k = 0; k < 8; k++) SK.stain(ctx, sx + k * 14 + r.range(-10, 10), sy - k * 40, 40 + k * 10, 0.08, '60,58,55');
    }
    // Silhouettes de la ville en ruine (deux plans)
    [['#4d4b47', 0.55, 3], ['#3a3835', 0.8, 5]].forEach(function (layer, li) {
      ctx.fillStyle = layer[0];
      var x = -20;
      while (x < W + 20) {
        var bw = r.range(40, 110), bh = r.range(120, 340) * layer[1] + li * 40;
        var top = C.WORLD.ground - bh;
        ctx.fillStyle = layer[0];
        ctx.beginPath();
        ctx.moveTo(x, C.WORLD.ground);
        ctx.lineTo(x, top + r.range(0, 20));
        var steps = 3 + Math.floor(r.next() * layer[2]);
        for (var s = 1; s <= steps; s++) ctx.lineTo(x + bw * s / steps, top + r.range(-8, 40) * (r.next() < 0.3 ? 2 : 1));
        ctx.lineTo(x + bw, C.WORLD.ground);
        ctx.closePath(); ctx.fill();
        // Fenêtres vides
        if (li === 1) {
          ctx.fillStyle = '#26241f';
          for (var wy = top + 30; wy < C.WORLD.ground - 20; wy += 30) for (var wx = x + 8; wx < x + bw - 12; wx += 18) if (r.next() < 0.5) ctx.fillRect(wx, wy, 7, 12);
          ctx.fillStyle = layer[0];
        }
        x += bw + r.range(-5, 20);
      }
    });
    // Sol extérieur et terre sous le niveau de la rue
    SK.fillRect(ctx, r, 0, C.WORLD.ground, W, H - C.WORLD.ground, '#3b3833', 0);
    C.Tex.paint(ctx, { x: 0, y: C.WORLD.ground, w: W, h: H - C.WORLD.ground }, 'debris', { tile: 200, alpha: 0.8, blend: 'overlay' });
    SK.hatch(ctx, r, 0, C.WORLD.ground + 6, W, H - C.WORLD.ground, { gap: 5, alpha: 0.25, angle: -0.5 });
    SK.hatch(ctx, r, 0, C.WORLD.ground + 6, W, H - C.WORLD.ground, { gap: 9, alpha: 0.15, angle: 0.6 });
    SK.line(ctx, r, 0, C.WORLD.ground, W, C.WORLD.ground, { w: 1.8 });
    // Débris dans la rue
    [[20, 110], [1480, 1590]].forEach(function (z) {
      for (var i = 0; i < 16; i++) SK.stone(ctx, r, r.range(z[0], z[1]), C.WORLD.ground - r.range(2, 18), r.range(4, 10), '#5b564e');
    });
    // Lampadaire tordu à gauche
    SK.line(ctx, r, 60, C.WORLD.ground, 70, C.WORLD.ground - 220, { w: 3 });
    SK.line(ctx, r, 70, C.WORLD.ground - 220, 110, C.WORLD.ground - 200, { w: 2.5 });
  }

  function drawHouse(ctx, r) {
    var L = C.WORLD.left, Rr = C.WORLD.right;
    // Toit endommagé
    var roofTop = 40, eave = C.FLOORS[3].ceil - 12;
    var roofL = [[L - 30, eave], [W / 2 - 160, roofTop], [W / 2 + 40, roofTop + 14], [W / 2 + 90, eave - 50], [W / 2 + 140, eave - 20], [W / 2 + 190, eave - 60], [Rr + 30, eave]];
    SK.fill(ctx, r, roofL, '#3c3a36', 1);
    C.Tex.paint(ctx, roofL, 'rust', { tile: 130, alpha: 0.75, blend: 'overlay' });
    C.Tex.paint(ctx, roofL, 'planks', { tile: 100, alpha: 0.3, blend: 'multiply', rot: 0.4 });
    SK.hatchPoly(ctx, r, roofL, { gap: 5, alpha: C.Tex.ready ? 0.25 : 0.45, angle: -0.5 });
    SK.poly(ctx, r, roofL, false, { w: 1.6 });
    // Chevrons exposés dans la brèche
    for (var i = 0; i < 6; i++) {
      var rx = W / 2 + 60 + i * 34;
      SK.line(ctx, r, rx, eave, rx + 50 - i * 6, roofTop + 40 + i * 12, { w: 3.5, color: '#2e2b27', passes: 1 });
      SK.line(ctx, r, rx, eave, rx + 50 - i * 6, roofTop + 40 + i * 12, { w: 1 });
    }
    var TH = C.THEME || {};
    if (TH.church) {
      // Clocher et croix
      var bx = W / 2 - 220, bw = 120, btop = roofTop - 70;
      var tower = [[bx, eave], [bx, btop + 40], [bx + bw / 2, btop - 30], [bx + bw, btop + 40], [bx + bw, eave]];
      SK.fill(ctx, r, tower, '#3e3b36', 1);
      C.Tex.paint(ctx, tower, 'brickPlaster', { tile: 90, alpha: 0.7, blend: 'overlay' });
      SK.poly(ctx, r, tower, true, { w: 1.6 });
      SK.fillRect(ctx, r, bx + 36, btop + 60, 48, 60, '#1f1d1a', 0.5);
      ctx.strokeStyle = SK.INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx + 60, btop + 60, 24, Math.PI, 0); ctx.stroke();
      SK.line(ctx, r, bx + 60, btop - 30, bx + 60, btop - 80, { w: 3 });
      SK.line(ctx, r, bx + 44, btop - 62, bx + 76, btop - 62, { w: 3 });
    } else if (TH.hospital) {
      // Hôpital : drap à croix rouge tendu sur le toit, visible des avions
      var fx = W / 2 - 330, fy = roofTop + 34;
      SK.line(ctx, r, fx, eave - 6, fx, fy - 30, { w: 2.2 });
      var flag = [[fx, fy - 30], [fx + 92, fy - 24], [fx + 88, fy + 26], [fx, fy + 22]];
      SK.fill(ctx, r, flag, '#c9c2b2', 0.8);
      SK.poly(ctx, r, flag, true, { w: 1.3 });
      ctx.fillStyle = 'rgba(132,38,32,0.85)';
      ctx.fillRect(fx + 38, fy - 18, 14, 38); ctx.fillRect(fx + 26, fy - 6, 38, 14);
      SK.stain(ctx, fx + 70, fy + 12, 16, 0.2);
    } else if (TH.military) {
      // Poste militaire : mât et drapeau en lambeaux, barbelés, sacs de sable
      var mx = W / 2 - 320;
      SK.line(ctx, r, mx, eave - 4, mx, roofTop - 40, { w: 2.4 });
      var fl2 = [[mx, roofTop - 40], [mx + 70, roofTop - 34], [mx + 58, roofTop - 22], [mx + 72, roofTop - 10], [mx, roofTop - 4]];
      SK.fill(ctx, r, fl2, '#5a5c48', 0.8); SK.poly(ctx, r, fl2, true, { w: 1.1 });
      for (var bw2 = 0; bw2 < 7; bw2++) {
        var bx2 = W / 2 - 250 + bw2 * 26;
        ctx.strokeStyle = SK.INK; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.arc(bx2, eave - 14, 9, 0, Math.PI * 2); ctx.stroke();
      }
      SK.line(ctx, r, W / 2 - 262, eave - 14, W / 2 - 250 + 7 * 26, eave - 14, { w: 0.8, passes: 1 });
    } else if (TH.school) {
      // École : clocheton et horloge arrêtée
      var cx0 = W / 2 - 260, cw = 80, ctop = roofTop - 10;
      var cup = [[cx0, eave], [cx0, ctop + 30], [cx0 + cw / 2, ctop - 20], [cx0 + cw, ctop + 30], [cx0 + cw, eave]];
      SK.fill(ctx, r, cup, '#48443e', 1);
      C.Tex.paint(ctx, cup, 'plaster', { tile: 90, alpha: 0.6, blend: 'overlay' });
      SK.poly(ctx, r, cup, true, { w: 1.5 });
      var ox = cx0 + cw / 2, oy = ctop + 58;
      ctx.fillStyle = '#c9c2b0'; ctx.beginPath(); ctx.arc(ox, oy, 17, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = SK.INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ox, oy, 17, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + 7, oy - 6); ctx.moveTo(ox, oy); ctx.lineTo(ox - 2, oy + 12); ctx.stroke();
      SK.crack(ctx, r, ox - 10, oy - 12, 20, 0.9);
    } else {
      // Cheminée
      SK.fillRect(ctx, r, W / 2 - 300, roofTop + 20, 34, 70, '#46423c', 0.5);
      SK.rect(ctx, r, W / 2 - 300, roofTop + 20, 34, 70, { w: 1.2 });
    }

    // Murs du fond, par pièce
    var tones = ['#8a8478', '#7f796d', '#8e8778', '#837d70', '#7a7468', '#8b8577'];
    C.FLOORS.forEach(function (fl, f) {
      var walls = C.WALLS.filter(function (w) { return w.f === f; }).map(function (w) { return w.x; });
      var xs = [L].concat(walls).concat([Rr]);
      for (var k = 0; k < xs.length - 1; k++) {
        var x0 = xs[k], x1 = xs[k + 1], tone = tones[(f * 2 + k) % tones.length];
        if (f === 0) tone = ['#6e6a61', '#6a665d'][k % 2];
        SK.fillRect(ctx, r, x0, fl.ceil, x1 - x0, fl.y - fl.ceil, tone, 0);
        var room = { x: x0, y: fl.ceil, w: x1 - x0, h: fl.y - fl.ceil };
        // Papier peint (rayures) ou béton
        if (f > 0) {
          var wt = TH.walls ? TH.walls[f] : ['wallpaper', 'peeling', 'plaster2', 'wallpaper', 'peeling'][(f * 2 + k) % 5];
          if (C.Tex.ready) {
            // Matière réelle du mur, puis crasse en multiplication
            C.Tex.paint(ctx, room, wt, { tile: 240, alpha: 0.9, blend: 'overlay', ox: x0 * 1.7, oy: f * 90 });
            C.Tex.paint(ctx, room, 'plaster2', { tile: 300, alpha: 0.22, blend: 'multiply', ox: x0, oy: 40 });
            // Soubassement plus sale au pied du mur
            C.Tex.paint(ctx, { x: x0, y: fl.y - 34, w: x1 - x0, h: 34 }, 'debris', { tile: 160, alpha: 0.25, blend: 'multiply' });
          }
          ctx.globalAlpha = C.Tex.ready ? 0.04 : 0.08; ctx.fillStyle = '#2a2723';
          var sw = 10 + ((f + k) % 3) * 6;
          if (wt === 'wallpaper' || !C.Tex.ready) for (var sx = x0; sx < x1; sx += sw * 2) ctx.fillRect(sx, fl.ceil, sw * 0.5, fl.y - fl.ceil);
          ctx.globalAlpha = 1;
          // Plinthe
          SK.line(ctx, r, x0, fl.y - 10, x1, fl.y - 10, { w: 0.8, passes: 1 });
        } else {
          // Cave : béton brut et briques
          C.Tex.paint(ctx, room, k % 2 ? 'brickPlaster' : 'plaster', { tile: 300, alpha: 0.8, blend: 'overlay', ox: x0 * 1.3 });
          C.Tex.paint(ctx, room, 'plaster2', { tile: 260, alpha: 0.25, blend: 'multiply' });
          if (!C.Tex.ready) for (var by = fl.ceil + 18; by < fl.y; by += 18) SK.line(ctx, r, x0, by, x1, by, { w: 0.5, passes: 1, alpha: 0.3 });
        }
        SK.hatch(ctx, r, x0, fl.ceil, x1 - x0, fl.y - fl.ceil, { gap: 11, alpha: 0.1, angle: -1.1 });
        // Taches et fissures (moins marquées dans une maison encore habitée)
        var dirt = TH.dirt != null ? TH.dirt / 0.3 : 1;
        for (var s = 0; s < 3; s++) SK.stain(ctx, r.range(x0 + 20, x1 - 20), r.range(fl.ceil + 10, fl.y - 30), r.range(20, 55), r.range(0.1, 0.22) * dirt);
        SK.stain(ctx, r.range(x0, x1), fl.ceil + 4, 60, 0.18);
        SK.crack(ctx, r, r.range(x0 + 20, x1 - 20), fl.ceil + 2, r.range(40, 90), Math.PI / 2 + r.range(-0.5, 0.5));
        if (r.next() < 0.6) SK.crack(ctx, r, r.range(x0 + 20, x1 - 20), fl.y - 12, r.range(30, 60), -Math.PI / 2 + r.range(-0.5, 0.5));
        // Cadre au mur
        if (f > 0 && r.next() < 0.6) {
          var px = r.range(x0 + 40, x1 - 80), py = fl.ceil + 30;
          var tilt = r.range(-0.08, 0.08);
          ctx.save(); ctx.translate(px + 18, py + 14); ctx.rotate(tilt);
          SK.fillRect(ctx, r, -18, -14, 36, 28, '#6c665a', 0.3);
          SK.rect(ctx, r, -18, -14, 36, 28, { w: 1.1 });
          SK.rect(ctx, r, -13, -9, 26, 18, { w: 0.6, passes: 1 });
          ctx.restore();
        }
      }
      // Ampoule
      for (var lx = L + 180; lx < Rr - 100; lx += 420) {
        SK.line(ctx, r, lx, fl.ceil, lx, fl.ceil + 18, { w: 0.7, passes: 1 });
        ctx.strokeStyle = SK.INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(lx, fl.ceil + 22, 4, 0, Math.PI * 2); ctx.stroke();
      }
    });

    // Fenêtres
    C.WINDOWS.forEach(function (wn) {
      var fl = C.FLOORS[wn.f];
      var ww = wn.vent ? 50 : 62, wh = wn.vent ? 18 : wn.tall ? 104 : 74;
      var wx = wn.x - ww / 2, wy = wn.vent ? fl.ceil + 8 : wn.tall ? fl.ceil + 14 : fl.ceil + 28;
      var g = ctx.createLinearGradient(0, wy, 0, wy + wh);
      g.addColorStop(0, '#8d8b86'); g.addColorStop(1, '#5e5c58');
      ctx.fillStyle = g; ctx.fillRect(wx, wy, ww, wh);
      if (wn.tall) {
        // Vitrail : losanges de verre teinté, arc en ogive
        var cols = ['rgba(150,60,50,0.55)', 'rgba(70,90,130,0.55)', 'rgba(170,140,60,0.5)', 'rgba(80,110,80,0.5)'];
        for (var vy = 0; vy < 6; vy++) for (var vx = 0; vx < 3; vx++) { ctx.fillStyle = cols[(vx + vy) % 4]; ctx.fillRect(wx + vx * ww / 3 + 1, wy + vy * wh / 6 + 1, ww / 3 - 2, wh / 6 - 2); }
        ctx.strokeStyle = SK.INK; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(wx - 4, wy + 10); ctx.quadraticCurveTo(wn.x, wy - 34, wx + ww + 4, wy + 10); ctx.stroke();
      }
      if (!wn.vent && !wn.tall) {
        // silhouette extérieure
        ctx.fillStyle = '#4a4844';
        ctx.fillRect(wx, wy + wh * 0.55, ww * 0.4, wh * 0.45);
        ctx.fillRect(wx + ww * 0.55, wy + wh * 0.35, ww * 0.45, wh * 0.65);
      }
      SK.rect(ctx, r, wx - 4, wy - 4, ww + 8, wh + 8, { w: 1.6 });
      SK.fillRect(ctx, r, wx - 8, wy + wh + 2, ww + 16, 6, '#5b564e', 0.3);
      SK.rect(ctx, r, wx - 8, wy + wh + 2, ww + 16, 6, { w: 1 });
      SK.line(ctx, r, wn.x, wy, wn.x, wy + wh, { w: 1.4 });
      if (!wn.vent) SK.line(ctx, r, wx, wy + wh / 2, wx + ww, wy + wh / 2, { w: 1.4 });
      if (wn.broken) {
        for (var k = 0; k < 4; k++) SK.line(ctx, r, wx + r.range(0, ww), wy + r.range(0, wh), wx + r.range(0, ww), wy + r.range(0, wh), { w: 0.6, passes: 1 });
      } else if (!wn.vent && !wn.tall) {
        // Scotch en croix
        SK.line(ctx, r, wx + 3, wy + 3, wx + ww - 3, wy + wh - 3, { w: 2, color: '#9d978a', passes: 1 });
        SK.line(ctx, r, wx + ww - 3, wy + 3, wx + 3, wy + wh - 3, { w: 2, color: '#9d978a', passes: 1 });
      }
    });

    // Escaliers (dessinés avant les dalles : le limon passe sous la dalle du haut)
    C.STAIRS.forEach(function (s) {
      // hi = extrémité haute, lo = extrémité basse
      var ua = C.FLOORS[s.a.f].y < C.FLOORS[s.b.f].y;
      var hi = ua ? s.a : s.b, lo = ua ? s.b : s.a;
      var ux = hi.x, uy = C.FLOORS[hi.f].y, dx = lo.x, dy = C.FLOORS[lo.f].y;
      var n = 11, thick = 14, railH = 46;
      ctx.save();
      // Rien ne descend sous le sol de l'étage du bas
      ctx.beginPath(); ctx.rect(Math.min(ux, dx) - 40, uy - railH - 10, Math.abs(dx - ux) + 80, dy - uy + railH + 10); ctx.clip();
      // Limon
      var pts = [[ux, uy], [dx, dy], [dx, dy + thick], [ux, uy + thick]];
      SK.fill(ctx, r, pts, '#4a443c', 0.5);
      C.Tex.paint(ctx, pts, 'planks', { tile: 90, alpha: 0.8, blend: 'overlay', rot: Math.atan2(dy - uy, dx - ux) + Math.PI / 2 });
      SK.hatchPoly(ctx, r, pts, { gap: 4, alpha: 0.35 });
      // Marches
      for (var i = 0; i < n; i++) {
        var t0 = i / n, t1 = (i + 1) / n;
        var x0 = U.lerp(ux, dx, t0), y0 = U.lerp(uy, dy, t0);
        var x1 = U.lerp(ux, dx, t1), y1 = U.lerp(uy, dy, t1);
        SK.poly(ctx, r, [[x0, y0], [x1, y0], [x1, y1]], false, { w: 1.1, passes: 1 });
      }
      SK.line(ctx, r, ux, uy + thick, dx, dy + thick, { w: 1.3 });
      // Rampe : commence sous la dalle du haut (elle ne dépasse pas dans la pièce au-dessus)
      var tr = U.clamp((railH + 14) / (dy - uy), 0, 0.5);
      var rx0 = U.lerp(ux, dx, tr), ry0 = U.lerp(uy, dy, tr) - railH;
      SK.line(ctx, r, rx0, ry0, dx, dy - railH, { w: 1.4 });
      for (var j = 0; j <= 5; j++) {
        var tt = U.lerp(tr, 1, j / 5);
        var tx = U.lerp(ux, dx, tt), ty = U.lerp(uy, dy, tt);
        SK.line(ctx, r, tx, ty, tx, ty - railH, { w: j === 5 ? 1.6 : 0.8, passes: 1 });
      }
      ctx.restore();
    });

    // Dalles entre les étages
    C.FLOORS.forEach(function (fl, f) {
      var y0 = fl.y, h = f === 0 ? 30 : 12;
      SK.fillRect(ctx, r, L - 12, y0, Rr - L + 24, h, '#35322d', 0);
      C.Tex.paint(ctx, { x: L - 12, y: y0, w: Rr - L + 24, h: h }, 'debris', { tile: 90, alpha: 0.85, blend: 'overlay', oy: y0 });
      // Plancher : lames de bois vues en coupe
      if (f > 0) C.Tex.paint(ctx, { x: L, y: y0, w: Rr - L, h: 4 }, 'floor', { tile: 110, alpha: 0.85, blend: 'overlay', rot: Math.PI / 2 });
      SK.hatch(ctx, r, L - 12, y0, Rr - L + 24, h, { gap: 4, alpha: C.Tex.ready ? 0.18 : 0.35, angle: -0.4 });
      SK.line(ctx, r, L - 12, y0, Rr + 12, y0, { w: 1.8 });
      SK.line(ctx, r, L - 12, y0 + h, Rr + 12, y0 + h, { w: 1.2 });
      // Parquet / carrelage
      if (f > 0) for (var px = L + 10; px < Rr; px += 26) SK.line(ctx, r, px, y0 - 2, px + 2, y0, { w: 0.5, passes: 1, alpha: 0.5 });
    });
    // Plafond du dernier étage
    SK.fillRect(ctx, r, L - 12, C.FLOORS[3].ceil - 12, Rr - L + 24, 12, '#35322d', 0);
    SK.hatch(ctx, r, L - 12, C.FLOORS[3].ceil - 12, Rr - L + 24, 12, { gap: 4, alpha: 0.35 });
    SK.line(ctx, r, L - 12, C.FLOORS[3].ceil, Rr + 12, C.FLOORS[3].ceil, { w: 1.5 });

    // Cloisons intérieures avec passage
    C.WALLS.forEach(function (w) {
      var fl = C.FLOORS[w.f];
      var top = fl.ceil, doorTop = fl.y - 118;
      SK.fillRect(ctx, r, w.x - 7, top, 14, doorTop - top, '#4b4740', 0.3);
      C.Tex.paint(ctx, { x: w.x - 7, y: top, w: 14, h: doorTop - top }, 'brickPlaster', { tile: 90, alpha: 0.8, blend: 'overlay' });
      SK.hatch(ctx, r, w.x - 7, top, 14, doorTop - top, { gap: 3, alpha: 0.4 });
      SK.line(ctx, r, w.x - 7, top, w.x - 7, doorTop, { w: 1.3 });
      SK.line(ctx, r, w.x + 7, top, w.x + 7, doorTop, { w: 1.3 });
      SK.line(ctx, r, w.x - 12, doorTop, w.x + 12, doorTop, { w: 1.6 });
      // Chambranle
      SK.line(ctx, r, w.x - 10, doorTop, w.x - 10, fl.y, { w: 0.9, alpha: 0.6 });
      SK.line(ctx, r, w.x + 10, doorTop, w.x + 10, fl.y, { w: 0.9, alpha: 0.6 });
    });

    // Murs extérieurs (briques)
    [[L - 14, 18], [Rr - 4, 18]].forEach(function (wl) {
      var top = C.FLOORS[3].ceil - 12, bot = C.FLOORS[0].y + 30;
      SK.fillRect(ctx, r, wl[0], top, wl[1], bot - top, '#4e4943', 0);
      C.Tex.paint(ctx, { x: wl[0], y: top, w: wl[1], h: bot - top }, 'brick', { tile: 70, alpha: 0.95, blend: 'overlay', ox: wl[0] });
      if (!C.Tex.ready) for (var by = top; by < bot; by += 8) {
        SK.line(ctx, r, wl[0], by, wl[0] + wl[1], by, { w: 0.5, passes: 1, alpha: 0.5 });
        var off = (Math.floor(by / 8) % 2) * 9;
        SK.line(ctx, r, wl[0] + off, by, wl[0] + off, by + 8, { w: 0.5, passes: 1, alpha: 0.5 });
      }
      SK.line(ctx, r, wl[0], top, wl[0], bot, { w: 1.8 });
      SK.line(ctx, r, wl[0] + wl[1], top, wl[0] + wl[1], bot, { w: 1.8 });
    });
    // Ouverture de la porte d'entrée dans le mur gauche
    var df = C.FLOORS[1];
    ctx.fillStyle = '#2a2825'; ctx.fillRect(L - 15, df.y - 112, 20, 112);

    // Petits débris au sol
    C.FLOORS.forEach(function (fl) {
      for (var d = 0; d < 10; d++) SK.stone(ctx, r, r.range(L + 20, Rr - 20), fl.y - 2, r.range(1.5, 3.5), '#4b4740');
    });
  }

  // ============================================================ survivants
  // Position, pose et point d'ancrage du prénom d'un survivant
  function place(s, t) {
    var a = s.act, o = a && a.uid ? C.Game.obj(a.uid) : null;
    var H = C.Figure.height(s), P = C.Figure.pose(s, t);
    var x = s.x, y = s.y, dir = s.facing || 1, floorY = C.FLOORS[s.f].y, headX;
    if (P.kind === 'lie') {
      headX = o ? o.x - 40 : s.x - 0.45 * H;
      x = headX + 0.93 * H;
      y = o ? floorY - 42 : floorY - 9;
    } else if (P.kind === 'sit' && o) {
      x = o.x - 8; dir = 1;
    }
    var topY = P.kind === 'lie' ? y - 22 : s.y - H - 14;
    var lx = P.kind === 'lie' ? headX + 0.4 * H : s.x;
    return { o: o, H: H, P: P, x: x, y: y, dir: dir, headX: headX, topY: topY, lx: lx };
  }
  // Réserve la place du prénom (et du repère) avant le dessin des bulles
  function reserveLabel(ctx, s, t) {
    var L = place(s, t);
    ctx.save(); ctx.font = '22px "Bebas Neue", Impact, sans-serif';
    var w = ctx.measureText(s.name.split(' ')[0]).width;
    ctx.restore();
    R.bubbleRects.push({ x: L.lx - w / 2 - 8, y: L.topY - 30, w: w + 16, h: 30, label: true });
  }

  function drawSurvivor(ctx, s, t, sel, hov) {
    var a = s.act, def = a ? C.ACT[a.kind] : null;
    var working = a && a.phase === 'work';
    var Lp = place(s, t);
    var o = Lp.o, H = Lp.H, P = Lp.P, x = Lp.x, y = Lp.y, dir = Lp.dir, headX = Lp.headX;
    // Caché dans l'ombre : à peine visible
    if (s.hidden) ctx.globalAlpha = 0.42;
    C.Figure.draw(ctx, s, x, y, dir, { t: t, pose: P });
    ctx.globalAlpha = 1;
    if (s.hurtT > 0) { ctx.fillStyle = 'rgba(160,30,20,' + (s.hurtT * 0.8) + ')'; ctx.beginPath(); ctx.arc(x, y - H * 0.6, 26, 0, Math.PI * 2); ctx.fill(); }

    // Couverture sur le lit
    if (P.kind === 'lie' && o) {
      var r = SK.rng(U.hashStr(s.id) + 5);
      var bl = [[headX + 0.24 * H, y + 8], [headX + 0.27 * H, y - 11], [headX + 0.6 * H, y - 13], [x - 4, y - 9], [x + 6, y + 8]];
      SK.fill(ctx, r, bl, '#6c665b', 0.6);
      SK.hatchPoly(ctx, r, bl, { gap: 3.5, alpha: 0.3, angle: 0.9 });
      SK.poly(ctx, r, bl, false, { w: 1.1, passes: 1 });
    }

    // Fumée de cigarette
    if (working && a.kind === 'smoke' && Math.random() < 0.08) {
      R.spawn({ x: s.x + dir * 14, y: s.y - H * 0.88, vx: 0, vy: -10, life: 2, t: 0, kind: 'smoke', size: 1.5 });
    }

    // --- Indicateurs
    var topY = Lp.topY;
    if (P.kind === 'lie') {
      ctx.fillStyle = 'rgba(230,222,200,0.75)';
      ctx.font = '18px "Bebas Neue", sans-serif';
      var zt = (t * 0.8) % 1;
      ctx.globalAlpha = 1 - zt;
      ctx.fillText('z', headX + 10 + zt * 8, topY - zt * 16);
      ctx.globalAlpha = 1 - ((zt + 0.5) % 1);
      ctx.fillText('Z', headX + 18 + ((zt + 0.5) % 1) * 8, topY - 6 - ((zt + 0.5) % 1) * 16);
      ctx.globalAlpha = 1;
    }
    if (working && !def.loop && a.dur > 0) {
      var pw = 44, pr = U.clamp(a.prog / a.dur, 0, 1);
      ctx.fillStyle = 'rgba(15,14,12,0.75)'; ctx.fillRect(s.x - pw / 2 - 2, topY - 2, pw + 4, 8);
      ctx.fillStyle = '#d8ccb0'; ctx.fillRect(s.x - pw / 2, topY, pw * pr, 4);
    }
    var lx = Lp.lx;
    if (sel || hov) {
      ctx.save();
      ctx.font = '22px "Bebas Neue", Impact, sans-serif';
      ctx.textAlign = 'center';
      // Prénom lisible sur tous les fonds : contour sombre + lueur
      ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(14,12,10,0.85)';
      ctx.strokeText(s.name.split(' ')[0], lx, topY - 8);
      ctx.shadowColor = sel ? 'rgba(255,210,140,0.7)' : 'transparent'; ctx.shadowBlur = sel ? 8 * R.scale : 0;
      ctx.fillStyle = sel ? '#f3e6c6' : 'rgba(239,227,196,0.75)';
      ctx.fillText(s.name.split(' ')[0], lx, topY - 8);
      ctx.restore();
    }
    // Alerte d'état critique
    var crit = s.hunger >= 70 || s.wound >= 60 || s.sick >= 60 || s.moral < 15;
    if (crit && Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#c9a36a'; ctx.font = '26px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', lx + 18, topY + 6); ctx.textAlign = 'left';
    }
    // Bulle de dialogue
    var b = R.bubbles[s.id];
    if (b && b.until > performance.now()) drawBubble(ctx, b.text, lx, topY - (sel || hov ? 30 : 8), b.until - performance.now());
  }

  function drawBubble(ctx, text, x, y, left) {
    ctx.save();
    ctx.font = '15px "Special Elite", monospace';
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var tst = cur ? cur + ' ' + w : w; if (ctx.measureText(tst).width > 220 && cur) { lines.push(cur); cur = w; } else cur = tst; });
    if (cur) lines.push(cur);
    var w = 0; lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
    var h = lines.length * 18 + 10, bx = x - w / 2 - 10, by = y - h - 8;
    bx = U.clamp(bx, C.WORLD.left, C.WORLD.right - w - 16);
    // Évite de recouvrir une autre bulle ou un prénom : d'abord en glissant
    // sur le côté (la pointe doit rester sous la bulle), sinon vers le haut
    var bw2 = w + 16;
    function hits(px, py) {
      return R.bubbleRects.some(function (q) { return px < q.x + q.w + 4 && px + bw2 > q.x - 4 && py < q.y + q.h + 4 && py + h + 8 > q.y; });
    }
    if (hits(bx, by)) {
      var cands = [];
      R.bubbleRects.forEach(function (q) { cands.push(q.x - bw2 - 6, q.x + q.w + 6); });
      cands.sort(function (a, b) { return Math.abs(a - bx) - Math.abs(b - bx); });
      for (var ci = 0; ci < cands.length; ci++) {
        var nx = cands[ci];
        if (nx < C.WORLD.left || nx + bw2 > C.WORLD.right) continue;
        if (x < nx + 10 || x > nx + bw2 - 10) continue;   // la pointe doit partir du dessous de la bulle
        if (!hits(nx, by)) { bx = nx; break; }
      }
    }
    var moved = true, guard = 0;
    while (moved && guard++ < 6) {
      moved = false;
      R.bubbleRects.forEach(function (q) {
        if (bx < q.x + q.w + 4 && bx + w + 16 > q.x - 4 && by < q.y + q.h + 4 && by + h + 8 > q.y) { by = q.y - h - 12; moved = true; }
      });
    }
    R.bubbleRects.push({ x: bx, y: by, w: w + 16, h: h });
    var tailY = Math.max(by + h + 8, y);
    ctx.globalAlpha = Math.min(1, left / 400);
    ctx.fillStyle = 'rgba(226,217,195,0.94)';
    ctx.beginPath();
    ctx.moveTo(bx + 4, by); ctx.lineTo(bx + w + 12, by); ctx.lineTo(bx + w + 16, by + 4); ctx.lineTo(bx + w + 16, by + h - 4); ctx.lineTo(bx + w + 12, by + h);
    ctx.lineTo(x + 6, by + h); ctx.lineTo(x - 2, tailY); ctx.lineTo(x - 4, by + h); ctx.lineTo(bx + 4, by + h); ctx.lineTo(bx, by + h - 4); ctx.lineTo(bx, by + 4); ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a1816'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#211e1a';
    lines.forEach(function (l, i) { ctx.fillText(l, bx + 9, by + 19 + i * 18); });
    ctx.restore();
  }

  R.bubbles = {};
  R.bubbleRects = [];

  // Portrait (buste) : fond sombre, personnage cadré à la poitrine
  // canvas : élément cible · s : survivant (ou définition) · w,h : taille CSS
  R.portrait = function (canvas, s, w, h) {
    w = w || 60; h = h || 70;
    var dpr = 2;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    C.Portrait.draw(ctx, s, w, h);
  };
  // Survivant sélectionné : halo lumineux qui épouse sa silhouette (redessinée
  // à chaque image hors écran, car elle s'anime), plus une lueur au sol
  var SEL = { c: null, sil: null };
  function selectionGlow(ctx, s, t) {
    var L = place(s, t), sc = R.scale;
    var span = L.H * 1.25;
    var x0 = L.x - span, y0 = L.y - L.H * 1.2, ww = span * 2, hh = L.H * 1.35;
    var cw = Math.ceil(ww * sc), ch = Math.ceil(hh * sc);
    if (!SEL.c) { SEL.c = document.createElement('canvas'); }
    var c = SEL.c;
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    var x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, cw, ch);
    x.setTransform(sc, 0, 0, sc, -x0 * sc, -y0 * sc);
    C.Figure.draw(x, s, L.x, L.y, L.dir, { t: t, pose: L.P });
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#ffe6b8'; x.fillRect(0, 0, cw, ch);
    var pulse = 0.8 + Math.sin(t * 3) * 0.2;
    // Lueur au sol, sous les pieds
    if (L.P.kind !== 'lie') {
      ctx.save();
      ctx.translate(L.x, L.y); ctx.scale(1, 0.22);
      var g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
      g.addColorStop(0, 'rgba(255,215,150,' + 0.35 * pulse + ')'); g.addColorStop(1, 'rgba(255,215,150,0)');
      ctx.fillStyle = g; ctx.fillRect(-40, -40, 80, 80);
      ctx.restore();
    }
    // Halo : silhouette floutée (large puis serrée) ; le personnage est dessiné par-dessus ensuite
    ctx.save();
    ctx.shadowColor = 'rgba(255,208,140,' + pulse + ')';
    ctx.shadowBlur = 16 * sc;
    ctx.drawImage(c, x0, y0, ww, hh);
    ctx.shadowBlur = 4 * sc;
    ctx.shadowColor = 'rgba(255,240,210,' + 0.9 * pulse + ')';
    ctx.drawImage(c, x0, y0, ww, hh);
    ctx.restore();
  }

  // ============================================================ particules
  R.spawn = function (p) { if (R.particles.length < 500) R.particles.push(p); };

  R.shake = function (amount) {
    R.shakeT = 0.6; R.shakeAmt = amount || 4; R.flashT = 0.25;
    // Poussière qui tombe des plafonds
    for (var i = 0; i < 26; i++) {
      var f = Math.floor(Math.random() * 4);
      R.spawn({ x: C.WORLD.left + Math.random() * (C.WORLD.right - C.WORLD.left), y: C.FLOORS[f].ceil + 2, vx: 0, vy: 20 + Math.random() * 40, life: 1.5 + Math.random(), t: 0, kind: 'dust', size: 1 + Math.random() * 2 });
    }
  };

  function updateParticles(dt, st) {
    var list = R.particles;
    for (var i = list.length - 1; i >= 0; i--) {
      var p = list[i];
      p.t += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.kind === 'dust') p.vy += 30 * dt;
      if (p.kind === 'blood') { p.vy += 420 * dt; if (p.floorY == null) p.floorY = C.FLOORS.reduce(function (b, fl) { return fl.y >= p.y && (b == null || fl.y < b) ? fl.y : b; }, null); if (p.floorY != null && p.y > p.floorY) { p.y = p.floorY; p.vx = 0; p.vy = 0; } }
      if (p.kind === 'smoke' || p.kind === 'steam') { p.vx += (Math.random() - 0.5) * 6 * dt; p.size += dt * 5; }
      if (p.t >= p.life) list.splice(i, 1);
    }
    // Émissions
    var spd = C.Main ? C.Main.speed : 1;
    if (spd === 0) return;
    st.survivors.forEach(function (s) {
      if (!s.alive || s.away || !s.act || s.act.phase !== 'work') return;
      var k = s.act.kind;
      if ((k === 'clear' || k === 'dismantle' || k === 'cut') && Math.random() < dt * 8) {
        R.spawn({ x: s.x + s.facing * 18 + (Math.random() - 0.5) * 20, y: s.y - 10 - Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, life: 0.8 + Math.random() * 0.6, t: 0, kind: 'dust', size: 1.5 + Math.random() * 2 });
      }
      if ((k === 'craft' || k === 'upgrade' || k === 'board' || k === 'doorup') && Math.random() < dt * 5) {
        R.spawn({ x: s.x + s.facing * 16, y: s.y - 34, vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 60, life: 0.35, t: 0, kind: 'spark', size: 1.2 });
      }
      if (k === 'cook' && Math.random() < dt * 4) {
        var o = C.Game.obj(s.act.uid);
        if (o) R.spawn({ x: o.x - 12 + Math.random() * 10, y: C.FLOORS[o.f].y - 82, vx: 0, vy: -18, life: 2, t: 0, kind: 'steam', size: 3 });
      }
    });
    // Bidon-poêle dans la rue : fumée
    if (C.Props.has('barrel_stove') && Math.random() < dt * 2.5) R.spawn({ x: 1574 + (Math.random() - 0.5) * 10, y: C.WORLD.ground - 46, vx: -6, vy: -16, life: 3, t: 0, kind: 'smoke', size: 2.5 });
    st.objects.forEach(function (o) {
      if (o.kind === 'still' && o.brewUntil && Math.random() < dt * 1.5) R.spawn({ x: o.x - 10, y: C.FLOORS[o.f].y - 70, vx: 0, vy: -12, life: 2.4, t: 0, kind: 'steam', size: 2 });
    });
    // Météo extérieure
    var wt = st.weather.type;
    if (wt === 'pluie' || wt === 'neige') {
      var n = wt === 'pluie' ? 70 : 22;
      for (var j = 0; j < n * dt * 10; j++) {
        var zx;
        var zone = Math.random();
        if (zone < 0.25) zx = Math.random() * (C.WORLD.left - 20);
        else if (zone < 0.5) zx = C.WORLD.right + 20 + Math.random() * (W - C.WORLD.right - 20);
        else zx = Math.random() * W;
        var maxY = (zx < C.WORLD.left - 14 || zx > C.WORLD.right + 14) ? C.WORLD.ground : 120;
        if (wt === 'pluie') R.spawn({ x: zx, y: -10, vx: -40, vy: 700, life: maxY / 700, t: 0, kind: 'rain' });
        else R.spawn({ x: zx, y: -10, vx: -10, vy: 45 + Math.random() * 25, life: maxY / 55, t: 0, kind: 'snow', size: 1 + Math.random() * 1.8 });
      }
    }
  }

  function drawParticles(ctx) {
    R.particles.forEach(function (p) {
      var a = 1 - p.t / p.life;
      switch (p.kind) {
        case 'dust': ctx.fillStyle = 'rgba(160,150,130,' + (a * 0.7) + ')'; ctx.fillRect(p.x, p.y, p.size, p.size); break;
        case 'blood': ctx.fillStyle = 'rgba(110,22,18,' + Math.min(1, a * 1.6) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break;
        case 'spark': ctx.fillStyle = 'rgba(255,220,150,' + a + ')'; ctx.fillRect(p.x, p.y, 2, 2); break;
        case 'steam': case 'smoke':
          ctx.fillStyle = 'rgba(210,205,195,' + (a * 0.18) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break;
        case 'draft':
          ctx.strokeStyle = 'rgba(205,215,228,' + (Math.sin(Math.PI * p.t / p.life) * 0.28) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(p.x + p.size * 0.5 * Math.sign(p.vx), p.y - 4 + Math.sin(p.t * 5) * 3, p.x + p.size * Math.sign(p.vx), p.y + 1);
          ctx.stroke(); break;
        case 'rain':
          ctx.strokeStyle = 'rgba(200,200,205,0.35)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + 12); ctx.stroke(); break;
        case 'snow':
          ctx.fillStyle = 'rgba(235,235,240,0.8)';
          ctx.beginPath(); ctx.arc(p.x + Math.sin(p.t * 2 + p.x) * 6, p.y, p.size, 0, Math.PI * 2); ctx.fill(); break;
      }
    });
  }

  // ============================================================ lumière
  function darkness(st) {
    if (st.phase === 'explore') return 0.4;
    if (st.phase !== 'day') return 0.55;
    var m = st.minute;
    if (m < 7 * 60) return U.lerp(0.4, 0.05, (m - 360) / 60);
    if (m > 18 * 60) return U.lerp(0.05, 0.5, (m - 1080) / 120);
    return 0.05;
  }

  function drawLights(ctx, st, t) {
    // Exploration : lueur de lampe de poche autour du pilleur
    if (st.phase === 'explore' && C.Explore.s) {
      var s0 = C.Explore.s, lf = 0.92 + Math.sin(t * 5.3) * 0.04;
      var lx = s0.x + (s0.facing || 1) * 18, ly = s0.y - 60;
      var lg = ctx.createRadialGradient(lx, ly, 6, lx, ly, 170 * lf);
      lg.addColorStop(0, 'rgba(255,225,170,0.26)'); lg.addColorStop(0.5, 'rgba(230,190,130,0.1)'); lg.addColorStop(1, 'rgba(200,160,100,0)');
      ctx.fillStyle = lg; ctx.fillRect(lx - 180, ly - 180, 360, 360);
    }
    if (st.phase === 'explore' && C.Combat) C.Combat.drawLights(ctx, t);
    // Lueur du bidon-poêle dans la rue
    if (C.Props.has('barrel_stove')) {
      var bf = 0.8 + Math.sin(t * 9) * 0.1 + Math.sin(t * 17.3) * 0.08;
      var bg = ctx.createRadialGradient(1574, C.WORLD.ground - 44, 2, 1574, C.WORLD.ground - 44, 70 * bf);
      bg.addColorStop(0, 'rgba(255,160,70,' + (0.35 * bf) + ')'); bg.addColorStop(1, 'rgba(200,110,40,0)');
      ctx.fillStyle = bg; ctx.fillRect(1574 - 80, C.WORLD.ground - 124, 160, 160);
    }
    st.objects.forEach(function (o) {
      var y = C.FLOORS[o.f].y;
      var lit = (o.kind === 'heater' && o.fuel > 0);
      var cooking = o.kind === 'stove' && o.user && (function () { var s = C.Game.surv(o.user); return s && s.act && s.act.phase === 'work' && s.act.kind === 'cook'; })();
      if (!lit && !cooking) return;
      var fl = 0.85 + Math.sin(t * 7 + o.uid) * 0.08 + Math.sin(t * 13.3) * 0.05;
      var cx = o.x, cy = y - (lit ? 38 : 20);
      var rad = (lit ? 190 + o.level * 30 : 110) * fl;
      var g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
      g.addColorStop(0, 'rgba(255,170,80,' + (0.32 * fl) + ')');
      g.addColorStop(0.4, 'rgba(230,140,60,' + (0.12 * fl) + ')');
      g.addColorStop(1, 'rgba(200,120,50,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      if (lit) {
        ctx.fillStyle = 'rgba(255,190,110,' + (0.7 * fl) + ')';
        ctx.fillRect(cx - 9, y - 44, 18, 14);
      }
    });
  }

  // ============================================================ surbrillance
  // L'objet survolé est redessiné seul hors écran ; sa silhouette sert à
  // tracer un halo lumineux qui en épouse la forme (pas de cadre).
  var HL = { key: null };
  function buildHighlight(o) {
    var s = R.scale, fl = C.FLOORS[o.f], bb = C.ObjDraw.bounds(o);
    var pad = 40;
    var x0 = bb.x - pad, x1 = bb.x + bb.w + pad;
    var y0 = Math.min(bb.y, fl.ceil) - 6, y1 = fl.y + 8;
    var cw = Math.max(1, Math.ceil((x1 - x0) * s)), ch = Math.max(1, Math.ceil((y1 - y0) * s));
    var obj = document.createElement('canvas'); obj.width = cw; obj.height = ch;
    var ox = obj.getContext('2d');
    ox.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
    var fn = C.ObjDraw[o.kind];
    if (fn) fn(ox, SK.rng(o.uid * 97 + 13), o, fl.y);
    // Silhouette claire de l'objet (redessiné sans auréoles ni ombres diffuses)
    var sil = document.createElement('canvas'); sil.width = cw; sil.height = ch;
    var sx = sil.getContext('2d');
    sx.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
    SK.noStain = true;
    try { if (fn) fn(sx, SK.rng(o.uid * 97 + 13), o, fl.y); } finally { SK.noStain = false; }
    sx.setTransform(1, 0, 0, 1, 0, 0);
    sx.globalCompositeOperation = 'source-in';
    sx.fillStyle = '#ffe9bf'; sx.fillRect(0, 0, cw, ch);
    return { obj: obj, sil: sil, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function highlight(ctx, o, t) {
    var key = o.uid + ':' + R.staticVersion + ':' + R.scale;
    if (HL.key !== key) { HL.key = key; HL.data = buildHighlight(o); }
    var d = HL.data;
    var pulse = 0.75 + Math.sin(t * 3.2) * 0.25;
    ctx.save();
    // Halo : silhouette floutée, deux passes (large et diffuse, puis serrée)
    ctx.shadowColor = 'rgba(255,214,150,' + pulse + ')';
    ctx.shadowBlur = 24 * R.scale;
    ctx.globalAlpha = 1;
    ctx.drawImage(d.sil, d.x, d.y, d.w, d.h);
    ctx.drawImage(d.sil, d.x, d.y, d.w, d.h);
    ctx.shadowBlur = 5 * R.scale;
    ctx.shadowColor = 'rgba(255,238,205,' + (0.85 * pulse) + ')';
    ctx.drawImage(d.sil, d.x, d.y, d.w, d.h);
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    // L'objet par-dessus (recouvre la silhouette), légèrement éclairé
    ctx.globalAlpha = 1;
    ctx.drawImage(d.obj, d.x, d.y, d.w, d.h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.07 + 0.04 * pulse;
    ctx.drawImage(d.sil, d.x, d.y, d.w, d.h);
    ctx.restore();
  }

  // ============================================================ fin d'action
  // Les objets gagnés (icône + « +3 ») montent au-dessus du survivant puis
  // s'effacent ; à défaut, un mot bref écrit à la main. Pas de boîte de texte.
  R.pops = [];
  var popArt = {};
  function artFor(g) {
    var k = g.item ? g.item : 'b:' + g.building;
    if (!popArt[k]) {
      if (g.item) popArt[k] = C.ItemArt.render(g.item, 96);
      else { var im = new Image(); im.src = C.ItemArt.buildingUrl(g.building, 96); popArt[k] = im; }
    }
    return popArt[k];
  }
  // kind : 'warn' pour un refus / empêchement (texte rouille, qui tremble)
  R.pop = function (s, gains, tag, kind) {
    var warn = kind === 'warn';
    // Un nouveau refus remplace le précédent (clics répétés)
    if (warn) R.pops = R.pops.filter(function (p) { return !(p.sid === s.id && p.warn); });
    // Décale si un autre retour est encore affiché au-dessus du même survivant
    var stack = R.pops.filter(function (p) { return p.sid === s.id && p.t < 1.2; }).length;
    // au-dessus de la bulle de parole éventuelle
    var bb = R.bubbles && R.bubbles[s.id], talking = bb && bb.until > performance.now();
    var lines = null;
    if (tag) {
      // Découpe en lignes courtes (mesure avec la police du rendu)
      var mc = R.ctx; mc.save(); mc.font = (warn ? '15px' : '17px') + ' "Special Elite", monospace';
      lines = []; var cur = '';
      var txt = tag.replace(/× /g, '× ').replace(/ :/g, ' :');
      // Lignes équilibrées : largeur cible = total / nombre de lignes nécessaire
      var full = mc.measureText(txt).width, nlin = Math.ceil(full / 280), target = full / nlin + 14;
      var wrap = function (max) {
        lines = []; cur = '';
        txt.split(' ').forEach(function (wd) {
          var tst = cur ? cur + ' ' + wd : wd;
          if (cur && mc.measureText(tst).width > max) { lines.push(cur); cur = wd; } else cur = tst;
        });
        if (cur) lines.push(cur);
      };
      wrap(target);
      if (lines.length > nlin) wrap(280);
      var tw = 0; lines.forEach(function (l) { tw = Math.max(tw, mc.measureText(l).width); });
      mc.restore();
    }
    var x = U.clamp(s.x, C.WORLD.left + 130, C.WORLD.right - 130);
    var y = s.y - C.Figure.height(s) - (talking ? 66 : 40) - stack * 48;
    // Largeur / hauteur approximatives, pour ne pas chevaucher un voisin
    var bw = gains && gains.length ? gains.length * 50 : (tw || 100) + 16, bh = gains && gains.length ? 50 : (lines ? lines.length * 19 + 4 : 24);
    // Décalage latéral (on garde la hauteur pour ne pas déborder sur l'étage du dessus)
    for (var tries = 0; tries < 6; tries++) {
      var other = null;
      R.pops.forEach(function (p) {
        if (!other && p.sid !== s.id && Math.abs(p.x - x) < (bw + p.bw) / 2 && y > p.y - p.bh - bh && y - bh < p.y) other = p;
      });
      if (!other) break;
      var dir = x >= other.x ? 1 : -1;
      x = other.x + dir * ((bw + other.bw) / 2 + 18);
      if (x < C.WORLD.left + bw / 2 || x > C.WORLD.right - bw / 2) { x = U.clamp(x, C.WORLD.left + bw / 2, C.WORLD.right - bw / 2); y -= bh; }
    }
    R.pops.push({ sid: s.id, x: x, y: y, bw: bw, bh: bh, gains: (gains || []).slice(0, 6), tag: tag, lines: lines, warn: warn, t: 0,
      life: gains && gains.length ? 3.4 : warn ? 2.8 + tag.length * 0.03 : 2.6 });
  };
  function drawPops(ctx, dt) {
    var run = !C.Main || C.Main.speed > 0;
    for (var i = R.pops.length - 1; i >= 0; i--) {
      var p = R.pops[i];
      p.t += run ? dt : dt * 0.35;
      if (p.t >= p.life) { R.pops.splice(i, 1); continue; }
      var k = p.t / p.life;
      var a = Math.min(1, p.t / 0.18) * (k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1);
      var rise = 30 * (1 - Math.pow(1 - k, 2));
      // léger rebond à l'apparition
      var pop = p.t < 0.25 ? 0.7 + 0.3 * Math.sin(p.t / 0.25 * Math.PI / 2) * 1.08 : 1;
      var y = p.y - rise;
      ctx.save();
      ctx.globalAlpha = a;
      if (p.gains.length) {
        var sz = 40 * pop, gap = 10, n = p.gains.length;
        var tw = n * sz + (n - 1) * gap, x0 = p.x - tw / 2;
        p.gains.forEach(function (g, j) {
          var gx = x0 + j * (sz + gap), gy = y - sz;
          var sh = ctx.createRadialGradient(gx + sz / 2, gy + sz / 2, 2, gx + sz / 2, gy + sz / 2, sz * 0.75);
          sh.addColorStop(0, 'rgba(10,9,8,0.55)'); sh.addColorStop(1, 'rgba(10,9,8,0)');
          ctx.fillStyle = sh; ctx.fillRect(gx - sz * 0.3, gy - sz * 0.3, sz * 1.6, sz * 1.6);
          var img = artFor(g);
          if (img && (img.width || img.naturalWidth)) ctx.drawImage(img, gx, gy, sz, sz);
          var txt = (g.n > 0 ? '+' : '−') + Math.abs(g.n);
          ctx.font = '19px "Bebas Neue", sans-serif';
          ctx.textAlign = 'left';
          ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(12,11,10,0.9)'; ctx.lineJoin = 'round';
          ctx.strokeText(txt, gx + sz - 8, gy + sz + 2);
          ctx.fillStyle = g.n > 0 ? '#efe4c8' : '#d98b6c';
          ctx.fillText(txt, gx + sz - 8, gy + sz + 2);
        });
      } else if (p.lines) {
        var lh = p.warn ? 18 : 20, nl = p.lines.length;
        // Un refus monte peu et tremble brièvement, comme un « non » de la tête
        var tx = p.x + (p.warn && p.t < 0.35 ? Math.sin(p.t * 60) * 3 * (1 - p.t / 0.35) : 0);
        var ty = p.warn ? p.y - rise * 0.35 : y;
        ctx.font = (p.warn ? '15px' : '17px') + ' "Special Elite", monospace';
        ctx.textAlign = 'center';
        var w = 0; p.lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
        var top = ty - (nl - 1) * lh;
        var cyy = top + (nl - 1) * lh / 2 - 6;
        var sh2 = ctx.createRadialGradient(tx, cyy, 2, tx, cyy, Math.max(w * 0.7, nl * lh));
        sh2.addColorStop(0, 'rgba(10,9,8,' + (p.warn ? 0.62 : 0.5) + ')'); sh2.addColorStop(1, 'rgba(10,9,8,0)');
        ctx.fillStyle = sh2; ctx.fillRect(tx - w, top - 30, w * 2, nl * lh + 44);
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,11,10,0.85)'; ctx.lineJoin = 'round';
        ctx.fillStyle = p.warn ? '#e8a585' : '#efe4c8';
        p.lines.forEach(function (l, li) { ctx.strokeText(l, tx, top + li * lh); ctx.fillText(l, tx, top + li * lh); });
        if (!p.warn) {
          // petit trait souligné, tracé à la main
          ctx.strokeStyle = 'rgba(239,228,200,0.7)'; ctx.lineWidth = 1.2;
          var ul = Math.min(1, p.t / 0.4);
          ctx.beginPath(); ctx.moveTo(tx - w / 2, ty + 5); ctx.quadraticCurveTo(tx, ty + 7, tx - w / 2 + w * ul, ty + 4); ctx.stroke();
        }
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
  }

  // ============================================================ trous ouverts
  // Lumière froide qui tombe de la brèche, halo glacé, courant d'air,
  // et pluie / neige qui entrent dans la pièce
  function holeFx(ctx, st, t, dt) {
    var dayLight = st.phase === 'day' ? U.clamp(1 - darkness(st) * 2, 0, 1) : 0;
    var run = C.Main && C.Main.speed > 0;
    var wt = st.weather.type;
    st.objects.forEach(function (o) {
      if (o.kind !== 'hole' || o.boarded) return;
      var hs = C.ObjDraw.holeSize(o), fy = C.FLOORS[o.f].y;
      var cx = o.x, cy = fy - C.ObjDraw.HOLE_CY, rw = hs.w / 2, rh = hs.h / 2;
      // Faisceau de jour jusqu'au sol
      if (dayLight > 0) {
        var g = ctx.createLinearGradient(0, cy, 0, fy);
        g.addColorStop(0, 'rgba(200,208,220,' + (0.22 * dayLight) + ')');
        g.addColorStop(1, 'rgba(200,208,220,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - rw * 0.7, cy); ctx.lineTo(cx + rw * 0.7, cy);
        ctx.lineTo(cx + rw * 1.9, fy); ctx.lineTo(cx - rw * 1.3, fy); ctx.closePath(); ctx.fill();
      }
      // Halo de froid qui pulse
      var pulse = 0.14 + Math.sin(t * 1.6 + o.uid) * 0.04;
      var cg = ctx.createRadialGradient(cx, cy, rw * 0.6, cx, cy, rw * 2.6);
      cg.addColorStop(0, 'rgba(150,175,205,' + pulse + ')');
      cg.addColorStop(1, 'rgba(150,175,205,0)');
      ctx.fillStyle = cg;
      ctx.fillRect(cx - rw * 2.6, cy - rh * 2.6, rw * 5.2, rh * 5.2);
      if (!run) return;
      // Courant d'air
      if (Math.random() < dt * 2.2) {
        R.spawn({ x: cx + (Math.random() - 0.5) * rw, y: cy + (Math.random() - 0.5) * rh, vx: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40), vy: 4 + Math.random() * 10, life: 1.4 + Math.random(), t: 0, kind: 'draft', size: 10 + Math.random() * 14 });
      }
      // Intempéries qui entrent
      if ((wt === 'neige' && Math.random() < dt * 6) || (wt === 'pluie' && Math.random() < dt * 10)) {
        var px = cx + (Math.random() - 0.5) * rw * 1.4, py = cy + (Math.random() - 0.3) * rh;
        if (wt === 'neige') R.spawn({ x: px, y: py, vx: (Math.random() - 0.5) * 30, vy: 22 + Math.random() * 16, life: (fy - py) / 30, t: 0, kind: 'snow', size: 0.8 + Math.random() * 1.2 });
        else R.spawn({ x: px, y: py, vx: -8, vy: 260, life: (fy - 4 - py) / 260, t: 0, kind: 'rain' });
      }
    });
  }

  // ============================================================ image
  R.frame = function (dt, t) {
    var st = C.Game.st;
    if (!st) return;
    R.time = t;
    if (R.dirty) { buildStatic(); R.dirty = false; R.staticVersion = (R.staticVersion || 0) + 1; }
    var ctx = R.ctx, s = R.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0d0c0b';
    ctx.fillRect(0, 0, R.canvas.width, R.canvas.height);

    var sx = 0, sy = 0;
    if (R.shakeT > 0) {
      R.shakeT -= dt;
      sx = (Math.random() - 0.5) * R.shakeAmt * R.shakeT * 2; sy = (Math.random() - 0.5) * R.shakeAmt * R.shakeT * 2;
    }
    ctx.drawImage(R.staticCanvas, R.ox + sx * s, R.oy + sy * s);
    ctx.setTransform(s, 0, 0, s, R.ox + sx * s, R.oy + sy * s);

    updateParticles(dt, st);

    // Emplacements de construction (mode placement)
    if (R.placing) {
      var bdef = C.BUILDINGS[R.placing];
      C.UI.freeSlots(R.placing).forEach(function (sl) {
        var fy = C.FLOORS[sl.f].y;
        var hov = R.hoverSlot === sl.id;
        ctx.fillStyle = hov ? 'rgba(230,215,170,0.28)' : 'rgba(230,215,170,0.1)';
        ctx.fillRect(sl.x - sl.w / 2, fy - bdef.h - 10, sl.w, bdef.h + 10);
        ctx.setLineDash([6, 5]); ctx.strokeStyle = hov ? '#f0e2bd' : 'rgba(240,226,189,0.6)'; ctx.lineWidth = 1.5;
        ctx.strokeRect(sl.x - sl.w / 2, fy - bdef.h - 10, sl.w, bdef.h + 10);
        ctx.setLineDash([]);
      });
    }

    // Surbrillance de l'objet survolé
    var ho = R.hoverObj;
    if (ho && !R.placing && ho.kind !== 'guard') highlight(ctx, ho, t);

    // Stations en panne
    st.objects.forEach(function (o) {
      if (!o.broken) return;
      var bb = C.ObjDraw.bounds(o);
      var cx = bb.x + bb.w / 2, cy = bb.y - 10 + Math.sin(t * 3) * 2;
      ctx.fillStyle = 'rgba(168,67,42,0.92)';
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3e0'; ctx.font = '20px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', cx, cy + 7); ctx.textAlign = 'left';
      if (Math.random() < dt * 3) R.spawn({ x: cx + (Math.random() - 0.5) * 20, y: bb.y + 10, vx: 0, vy: -14, life: 2, t: 0, kind: 'smoke', size: 2.5 });
    });

    holeFx(ctx, st, t, dt);

    // Soldats, zones gardées, bruit et tirs (exploration)
    if (st.phase === 'explore' && C.Combat) C.Combat.draw(ctx, t);

    // Survivants
    var sel = C.UI ? C.UI.selected : null;
    var list = st.survivors.filter(function (x) { return x.alive && !x.away; });
    list.forEach(function (x) { if (x.id === sel) selectionGlow(ctx, x, t); });
    list.sort(function (a, b) { return (a.id === sel) - (b.id === sel); });
    R.bubbleRects = [];
    // Les prénoms affichés passent avant : les bulles les contournent
    list.forEach(function (x) { if (x.id === sel || R.hoverSurv === x) reserveLabel(ctx, x, t); });
    list.forEach(function (x) { drawSurvivor(ctx, x, t, x.id === sel, R.hoverSurv === x); });
    // Répliques des personnages rencontrés en exploration
    if (R.npcSay) {
      var nowMs = performance.now();
      Object.keys(R.npcSay).forEach(function (uid) {
        var b = R.npcSay[uid];
        if (b.until <= nowMs) { delete R.npcSay[uid]; return; }
        var o = C.Game.obj(+uid);
        if (!o) return;
        var bb = C.ObjDraw.bounds(o);
        drawBubble(ctx, b.text, o.x, bb.y - 6, b.until - nowMs);
      });
    }

    drawParticles(ctx);

    // Obscurité, puis lumières chaudes par-dessus
    var dk = darkness(st);
    if (dk > 0) { ctx.fillStyle = 'rgba(8,9,16,' + dk + ')'; ctx.fillRect(-20, -20, W + 40, H + 40); }
    ctx.globalCompositeOperation = 'lighter';
    drawLights(ctx, st, t);
    ctx.globalCompositeOperation = 'source-over';

    // Lumière froide de l'hiver
    if (C.World.isWinter(st)) { ctx.fillStyle = 'rgba(120,140,170,0.07)'; ctx.fillRect(0, 0, W, H); }
    drawPops(ctx, dt);
    if (R.flashT > 0) { R.flashT -= dt; ctx.fillStyle = 'rgba(255,230,190,' + (R.flashT * 0.5) + ')'; ctx.fillRect(0, 0, W, H); }

    // Mode combat : action et chance de toucher près du curseur (au-dessus de tout)
    if (st.phase === 'explore' && C.Combat) C.Combat.drawCursor(ctx);
    // États graves au-dessus des survivants, étiquette de l'objet survolé
    list.forEach(function (x) { stateBadges(ctx, x, t); });
    hoverLabel(ctx, st, t);

    // Vignette + grain (espace écran)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var cw = R.canvas.width, ch = R.canvas.height;
    var vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    if (R.grainOn) {
      ctx.globalAlpha = 0.55;
      var gx = Math.floor(Math.random() * 256), gy = Math.floor(Math.random() * 256);
      if (!R.grainPat) R.grainPat = ctx.createPattern(R.grain, 'repeat');
      ctx.fillStyle = R.grainPat;
      ctx.translate(-gx, -gy);
      ctx.fillRect(gx, gy, cw, ch);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
    }
  };

  // ============================================================ lisibilité
  // Icônes d'état au-dessus de la tête (faim, fatigue, blessure, maladie, moral)
  // dès que l'état est sérieux : orange (niveau 2), rouge (niveau 3).
  var BADGE_ICON = { hunger: 'hunger', fatigue: 'fatigue', wound: 'wound', sick: 'sick', moral: 'moral' };
  function stateBadges(ctx, s, t) {
    if (!s.alive || s.away) return;
    var sts = C.Surv.states(s).filter(function (x) { return x.lv >= 2 && BADGE_ICON[x.k]; });
    if (!sts.length) return;
    var L = place(s, t), n = sts.length, size = 20, gap = 4;
    var sel = C.UI && C.UI.selected === s.id;
    var y0 = L.topY - (sel || R.hoverSurv === s ? 44 : 22);
    var x0 = L.lx - (n * size + (n - 1) * gap) / 2;
    sts.forEach(function (st2, i) {
      var cx = x0 + i * (size + gap) + size / 2, cy = y0;
      var col = st2.lv >= 3 ? '#d9533c' : '#e0a340';
      var pulse = st2.lv >= 3 ? 0.75 + 0.25 * Math.sin(t * 5) : 1;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(18,15,12,0.85)';
      ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.translate(cx - 7.5, cy - 7.5); ctx.scale(15 / 24, 15 / 24);
      ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      C.IconPaths(BADGE_ICON[st2.k]).forEach(function (p) { ctx.stroke(p); });
      ctx.restore();
    });
  }

  // Étiquette de l'objet survolé : son nom et l'action principale
  var hoverCache = { uid: null, until: 0, lines: null };
  function hoverLabel(ctx, st, t) {
    var o = R.hoverObj;
    if (!o || R.placing || (C.UI && C.UI.contextOpen && C.UI.contextOpen())) return;
    if (o.kind === 'guard' && C.Explore && C.Explore.mode === 'combat') return;   // (étiquette de combat)
    var now = performance.now();
    if (hoverCache.uid !== o.uid || now > hoverCache.until) {
      var s = C.UI.selectedSurv ? C.UI.selectedSurv() : null;
      var m = C.Actions.menu(s, o), first = m.entries.filter(function (e) { return e.enabled; })[0];
      var sub = !C.Nav.objectReachable(o) ? 'Inaccessible pour l\'instant' : first ? '› ' + first.label + (first.sub ? ' · ' + first.sub.replace(/<[^>]+>/g, '') : '') : (m.entries.length ? m.entries[0].reason || '' : '');
      hoverCache = { uid: o.uid, until: now + 250, lines: [m.title || C.Game.objName(o), sub] };
    }
    var bb = C.ObjDraw.bounds(o), lines = hoverCache.lines;
    ctx.save();
    ctx.font = '19px "Bebas Neue", sans-serif';
    var w1 = ctx.measureText(lines[0].toUpperCase()).width;
    ctx.font = '12px "Barlow Semi Condensed", sans-serif';
    var w2 = lines[1] ? ctx.measureText(lines[1]).width : 0;
    var tw = Math.max(w1, w2) + 22, th = lines[1] ? 40 : 26;
    var x = U.clamp(bb.x + bb.w / 2 - tw / 2, C.WORLD.left, C.WORLD.right - tw), y = Math.max(C.FLOORS[3].ceil - 20, bb.y - th - 10);
    ctx.fillStyle = 'rgba(20,17,14,0.9)'; ctx.fillRect(x, y, tw, th);
    ctx.strokeStyle = 'rgba(219,168,76,0.8)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
    ctx.fillStyle = '#efe6d0'; ctx.font = '19px "Bebas Neue", sans-serif'; ctx.fillText(lines[0].toUpperCase(), x + 11, y + 20);
    if (lines[1]) { ctx.fillStyle = '#d8b777'; ctx.font = '12px "Barlow Semi Condensed", sans-serif'; ctx.fillText(lines[1], x + 11, y + 34); }
    ctx.restore();
  }

  // ============================================================ sélection
  R.pick = function (wx, wy) {
    var st = C.Game.st;
    var list = st.survivors.filter(function (s) { return s.alive && !s.away; });
    for (var i = list.length - 1; i >= 0; i--) {
      var s = list[i], Hh = C.Figure.height(s);
      var lying = s.act && s.act.phase === 'work' && (s.act.kind === 'sleep' || s.act.kind === 'sleepfloor');
      if (lying) { if (Math.abs(wx - s.x) < Hh / 2 && wy > s.y - 50 && wy < s.y + 4) return { surv: s }; }
      else if (Math.abs(wx - s.x) < 18 && wy > s.y - Hh - 6 && wy < s.y + 4) return { surv: s };
    }
    // Objets : les plus petits d'abord (pour pouvoir cliquer ce qui est devant)
    var objs = st.objects.slice().sort(function (a, b) { return a.w * a.h - b.w * b.h; });
    for (var j = 0; j < objs.length; j++) {
      var b = C.ObjDraw.bounds(objs[j]);
      if (wx >= b.x - 4 && wx <= b.x + b.w + 4 && wy >= b.y - 4 && wy <= b.y + b.h + 4) return { obj: objs[j] };
    }
    return null;
  };

  // Étage sous le pointeur (pour les déplacements)
  R.floorAt = function (wx, wy) {
    if (wx < C.WORLD.left || wx > C.WORLD.right) return null;
    for (var f = 0; f < C.FLOORS.length; f++) {
      var fl = C.FLOORS[f];
      if (wy >= fl.ceil && wy <= fl.y + 10) return f;
    }
    return null;
  };
})(window.CQR);