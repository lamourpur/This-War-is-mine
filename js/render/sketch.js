/* =========================================================
   Primitives de dessin « crayonné »
   Traits doublés et tremblés, hachures, taches, grain.
   Toutes déterministes (RNG local) pour éviter le scintillement.
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch = {};

  SK.INK = '#171614';
  SK.INK2 = '#2b2926';
  SK.PAPER = '#b9b2a4';

  SK.rng = function (seed) { return new C.RNG(seed || 1); };

  // Trait tremblé (2 passes par défaut)
  SK.line = function (ctx, r, x1, y1, x2, y2, opts) {
    opts = opts || {};
    var w = opts.w || 1.3, passes = opts.passes || 2, j = opts.j != null ? opts.j : 1.2;
    var len = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) || 1;
    var nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    ctx.strokeStyle = opts.color || SK.INK;
    ctx.lineCap = 'round';
    for (var p = 0; p < passes; p++) {
      var bow = (r.next() - 0.5) * Math.min(len * 0.04, 4) * (opts.bow || 1);
      var ax = x1 + (r.next() - 0.5) * j * 2, ay = y1 + (r.next() - 0.5) * j * 2;
      var bx = x2 + (r.next() - 0.5) * j * 2, by = y2 + (r.next() - 0.5) * j * 2;
      // Dépassement léger aux extrémités, comme un vrai trait de crayon
      var over = opts.over != null ? opts.over : 2;
      var ex = (x2 - x1) / len * over * r.next(), ey = (y2 - y1) / len * over * r.next();
      ctx.globalAlpha = (opts.alpha || 0.9) * (p === 0 ? 1 : 0.55);
      ctx.lineWidth = w * (p === 0 ? 1 : 0.7) * (0.85 + r.next() * 0.3);
      ctx.beginPath();
      ctx.moveTo(ax - ex, ay - ey);
      ctx.quadraticCurveTo((ax + bx) / 2 + nx * bow, (ay + by) / 2 + ny * bow, bx + ex, by + ey);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  SK.poly = function (ctx, r, pts, close, opts) {
    for (var i = 0; i < pts.length - 1; i++) SK.line(ctx, r, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], opts);
    if (close) SK.line(ctx, r, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], opts);
  };

  SK.rect = function (ctx, r, x, y, w, h, opts) {
    SK.poly(ctx, r, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, opts);
  };

  // Remplissage légèrement irrégulier
  SK.fill = function (ctx, r, pts, color, j) {
    j = j == null ? 1 : j;
    ctx.fillStyle = color;
    ctx.beginPath();
    pts.forEach(function (p, i) {
      var x = p[0] + (r.next() - 0.5) * j, y = p[1] + (r.next() - 0.5) * j;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
  };
  SK.fillRect = function (ctx, r, x, y, w, h, color, j) {
    SK.fill(ctx, r, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, j);
  };

  // Hachures dans un rectangle (angle en radians)
  SK.hatch = function (ctx, r, x, y, w, h, opts) {
    opts = opts || {};
    var gap = opts.gap || 6, ang = opts.angle != null ? opts.angle : -0.9;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    var cx = x + w / 2, cy = y + h / 2, R = Math.sqrt(w * w + h * h) / 2 + 4;
    var ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.strokeStyle = opts.color || SK.INK;
    ctx.lineWidth = opts.w || 0.8;
    for (var d = -R; d < R; d += gap * (0.8 + r.next() * 0.4)) {
      var px = cx - sa * d, py = cy + ca * d;
      var l1 = R * (0.6 + r.next() * 0.4), l2 = R * (0.6 + r.next() * 0.4);
      ctx.globalAlpha = (opts.alpha || 0.35) * (0.6 + r.next() * 0.4);
      ctx.beginPath();
      ctx.moveTo(px - ca * l1, py - sa * l1);
      ctx.lineTo(px + ca * l2 + (r.next() - 0.5) * 2, py + sa * l2 + (r.next() - 0.5) * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  // Hachures dans un polygone quelconque
  SK.hatchPoly = function (ctx, r, pts, opts) {
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    pts.forEach(function (p) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); });
    ctx.save();
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
    ctx.closePath(); ctx.clip();
    SK.hatch(ctx, r, minx, miny, maxx - minx, maxy - miny, opts);
    ctx.restore();
  };

  // Tache / auréole d'humidité
  SK.stain = function (ctx, x, y, rad, alpha, color) {
    if (SK.noStain) return; // silhouettes de surbrillance : pas d'auréoles diffuses
    var g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(' + (color || '30,26,20') + ',' + alpha + ')');
    g.addColorStop(0.7, 'rgba(' + (color || '30,26,20') + ',' + alpha * 0.4 + ')');
    g.addColorStop(1, 'rgba(' + (color || '30,26,20') + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  };

  // Fissure ramifiée
  SK.crack = function (ctx, r, x, y, len, ang, depth) {
    depth = depth || 0;
    var steps = 4 + Math.floor(r.next() * 4);
    var px = x, py = y;
    ctx.strokeStyle = SK.INK; ctx.lineWidth = Math.max(0.4, 1.1 - depth * 0.3);
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(px, py);
    for (var i = 0; i < steps; i++) {
      ang += (r.next() - 0.5) * 0.9;
      px += Math.cos(ang) * len / steps; py += Math.sin(ang) * len / steps;
      ctx.lineTo(px, py);
      if (depth < 2 && r.next() < 0.25) { ctx.stroke(); SK.crack(ctx, r, px, py, len * 0.45, ang + (r.next() - 0.5) * 1.6, depth + 1); ctx.beginPath(); ctx.moveTo(px, py); }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // Gribouillis de remplissage (ombre dense)
  SK.scribble = function (ctx, r, x, y, w, h, n, alpha) {
    ctx.strokeStyle = SK.INK; ctx.lineWidth = 0.7;
    ctx.globalAlpha = alpha || 0.3;
    ctx.beginPath();
    var px = x + r.next() * w, py = y + r.next() * h;
    ctx.moveTo(px, py);
    for (var i = 0; i < n; i++) {
      px = x + r.next() * w; py = y + r.next() * h;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  // Brique / pierre irrégulière
  SK.stone = function (ctx, r, cx, cy, s, color) {
    var pts = [];
    var n = 5 + Math.floor(r.next() * 3);
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + r.next() * 0.4;
      var rr = s * (0.6 + r.next() * 0.5);
      pts.push([cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr * 0.8]);
    }
    SK.fill(ctx, r, pts, color || '#57534c', 0.5);
    SK.poly(ctx, r, pts, true, { w: 0.9, passes: 1, j: 0.5 });
    return pts;
  };

  // Texture de grain (papier) générée une fois
  SK.makeGrain = function (size) {
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var x = c.getContext('2d');
    var img = x.createImageData(size, size);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.random() * 38;
    }
    x.putImageData(img, 0, 0);
    return c;
  };
})(window.CQR);
