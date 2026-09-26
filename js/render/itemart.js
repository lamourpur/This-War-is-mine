/* =========================================================
   Illustrations des objets — pictogrammes crayonnés
   Blanc cassé, contour d'encre épais et tremblé, ombres
   hachurées, rares touches de couleur sourde.
   Repère de dessin : carré de 64 × 64.
   C.ItemArt.img(id, taille) → <img> (rendu mis en cache)
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch;
  var INK = '#15130f', W1 = '#efe8d6', W2 = '#d6ccb4', W3 = '#aea48d', W4 = '#8a8170';
  var RUST = '#9b4a32', AMBER = '#c99a4a', GREEN = '#7d8a5c', RED = '#a8432a', BLUE = '#7f94a8', WOOD = '#b8a07a', WOOD2 = '#8f7a58', METAL = '#b9bcbe';

  var A = C.ItemArt = { cache: {} };

  // ------------------------------------------------------------ primitives
  var ctx, r;
  function path(pts) { ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath(); }
  function ell(cx, cy, rx, ry, rot, n) {
    n = n || 26; rot = rot || 0;
    var out = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
      out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return out;
  }
  function rect(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
  // Ombre hachurée sur la partie droite / basse d'une forme
  function shade(pts, from, alpha, gap) {
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    pts.forEach(function (p) { minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]); });
    ctx.save(); path(pts); ctx.clip();
    var x0 = minx + (maxx - minx) * (from == null ? 0.55 : from);
    SK.hatch(ctx, r, x0, miny - 2, maxx - x0 + 2, maxy - miny + 4, { gap: gap || 2.2, alpha: alpha || 0.5, angle: -0.95, w: 0.9, color: INK });
    ctx.restore();
  }
  // Forme pleine + contour d'encre
  function shape(pts, fill, opts) {
    opts = opts || {};
    ctx.fillStyle = fill || W1; path(pts); ctx.fill();
    if (opts.shade !== false) shade(pts, opts.from, opts.alpha);
    SK.poly(ctx, r, pts, true, { w: opts.w || 2.3, passes: 2, j: 0.45, over: 0.6, color: INK });
  }
  function line(x1, y1, x2, y2, w, color) { SK.line(ctx, r, x1, y1, x2, y2, { w: w || 1.6, passes: 1, j: 0.3, over: 0.4, color: color || INK }); }
  function dot(x, y, rad, color) { ctx.fillStyle = color || INK; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); }
  function rot(cx, cy, a, fn) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.translate(-cx, -cy); fn(); ctx.restore(); }

  // ------------------------------------------------------------ dessins
  var D = {
    eau: function () {
      var body = [[23, 22], [41, 22], [43, 28], [43, 55], [40, 58], [24, 58], [21, 55], [21, 28]];
      shape(body, W1);
      ctx.save(); path(body); ctx.clip();
      ctx.fillStyle = 'rgba(127,148,168,0.45)'; ctx.fillRect(18, 34, 30, 26);
      ctx.restore();
      line(22, 34, 42, 34, 1.2);
      shape(rect(21.5, 40, 21, 9), W2, { shade: false, w: 1.4 });
      shape([[27, 14], [37, 14], [38, 22], [26, 22]], W1, { w: 2 });
      shape(rect(26, 8, 12, 6), BLUE, { w: 2 });
      line(26, 25, 26, 52, 1.2, 'rgba(255,255,255,0.8)');
    },
    legumes: function () {
      // carotte
      rot(40, 30, 0.5, function () {
        shape([[36, 14], [44, 14], [41, 50], [39, 50]], '#c7875a', { from: 0.5 });
        [22, 30, 38].forEach(function (y) { line(37, y, 41, y + 1, 1); });
        line(40, 14, 34, 5, 1.8, GREEN); line(40, 14, 40, 4, 1.8, GREEN); line(40, 14, 46, 6, 1.8, GREEN);
      });
      // pommes de terre
      shape(ell(22, 44, 12, 9, -0.3), '#c9b48a');
      shape(ell(34, 51, 10, 7.5, 0.2), '#bba57c');
      dot(18, 42, 1.2); dot(25, 46, 1); dot(33, 50, 1);
    },
    viande: function () {
      var m = [[10, 30], [18, 18], [34, 14], [50, 20], [55, 32], [48, 46], [30, 52], [14, 46]];
      shape(m, '#b77a6c', { from: 0.5 });
      shape(ell(36, 32, 5.5, 5), W1, { shade: false, w: 1.6 });
      dot(36, 32, 1.8, W3);
      SK.poly(ctx, r, [[16, 30], [22, 24], [30, 22]], false, { w: 1.4, passes: 1, color: '#f0dcd0' });
      SK.poly(ctx, r, [[22, 42], [32, 46], [44, 42]], false, { w: 1.4, passes: 1, color: '#f0dcd0' });
    },
    conserve: function () {
      var body = [[16, 24], [48, 24], [48, 54], [16, 54]];
      shape(body, W1, { from: 0.6 });
      ctx.fillStyle = W2; path(ell(32, 54, 16, 4.5)); ctx.fill();
      SK.poly(ctx, r, ell(32, 54, 16, 4.5).slice(0, 14), false, { w: 2.2, passes: 1, color: INK });
      [32, 40, 48].forEach(function (y) { line(17, y, 47, y, 0.9, W4); });
      shape(rect(16, 34, 32, 10), '#b8a77f', { shade: false, w: 1.3 });
      // couvercle entrouvert
      rot(16, 24, -0.55, function () { shape(ell(32, 24, 16, 4.5), W2, { shade: false }); dot(20, 22, 1.4); });
      shape(ell(32, 24, 15, 3.8), '#3a352d', { shade: false, w: 1.6 });
    },
    repas: function () {
      [[24, 8], [32, 5], [40, 8]].forEach(function (p) { SK.poly(ctx, r, [[p[0], 26], [p[0] - 3, 20], [p[0] + 2, 14], [p[0] - 1, p[1]]], false, { w: 1.4, passes: 1, color: W4 }); });
      var bowl = [[8, 32], [56, 32], [52, 44], [42, 52], [22, 52], [12, 44]];
      shape(bowl, W1);
      shape(ell(32, 32, 24, 5), '#a88c5c', { shade: false });
      dot(24, 31, 1.5, '#6e5a3a'); dot(36, 33, 1.4, '#6e5a3a'); dot(42, 31, 1.2, GREEN);
      line(44, 30, 58, 14, 3, W2); line(44, 30, 58, 14, 1.2);
      shape(rect(22, 52, 20, 4), W2, { shade: false, w: 1.8 });
    },
    sucre: function () {
      var bag = [[16, 18], [48, 18], [52, 56], [12, 56]];
      shape(bag, '#d9ccad');
      SK.poly(ctx, r, [[16, 18], [20, 12], [26, 16], [32, 11], [38, 16], [44, 12], [48, 18]], false, { w: 2, passes: 1, color: INK });
      shape(rect(22, 30, 20, 12), W1, { shade: false, w: 1.3 });
      [[24, 33], [30, 36], [36, 33]].forEach(function (p) { shape(rect(p[0], p[1], 5, 5), W1, { shade: false, w: 1 }); });
      shape(rect(46, 48, 8, 8), W1, { w: 1.6 });
      shape(rect(50, 42, 7, 7), W1, { w: 1.6 });
    },
    bois: function () {
      [[10, 40, 0.05], [8, 29, -0.04], [12, 18, 0.08]].forEach(function (b) {
        rot(32, b[1] + 5, b[2], function () {
          var pl = rect(b[0], b[1], 46, 10);
          shape(pl, WOOD, { from: 0.1, alpha: 0.25 });
          line(b[0] + 4, b[1] + 4, b[0] + 30, b[1] + 3, 0.8, WOOD2);
          line(b[0] + 12, b[1] + 7, b[0] + 40, b[1] + 7, 0.8, WOOD2);
          ctx.fillStyle = WOOD2; path(ell(b[0] + 46, b[1] + 5, 2.5, 5)); ctx.fill();
          dot(b[0] + 6, b[1] + 5, 1);
        });
      });
    },
    composants: function () {
      // rouleau d'adhésif
      shape(ell(24, 38, 15, 15), '#b9b6ad');
      shape(ell(24, 38, 7, 7), '#2e2a24', { shade: false, w: 1.6 });
      line(36, 46, 50, 56, 5, '#b9b6ad'); line(36, 46, 50, 56, 1);
      // vis et clou
      rot(46, 22, 0.7, function () {
        shape(rect(44, 10, 4, 26), METAL, { w: 1.6 });
        shape(rect(40, 8, 12, 4), METAL, { w: 1.6 });
        [15, 19, 23, 27, 31].forEach(function (y) { line(43, y, 49, y + 2, 0.9); });
      });
      rot(14, 12, -0.3, function () { line(8, 8, 26, 12, 2.2); line(7, 5, 8, 11, 2.4); });
    },
    pieces_meca: function () {
      var g = [];
      for (var i = 0; i < 40; i++) {
        var a = i / 40 * Math.PI * 2, rr = (Math.floor(i / 2.5) % 2) ? 17 : 21;
        g.push([30 + Math.cos(a) * rr, 32 + Math.sin(a) * rr]);
      }
      shape(g, METAL, { from: 0.45 });
      shape(ell(30, 32, 7, 7), '#3a3834', { shade: false, w: 1.8 });
      shape(ell(30, 32, 3, 3), W1, { shade: false, w: 1 });
      // ressort
      for (var k = 0; k < 6; k++) SK.poly(ctx, r, ell(52, 12 + k * 4, 6, 2).slice(0, 14), false, { w: 1.6, passes: 1, color: INK });
    },
    pieces_elec: function () {
      var board = rect(10, 18, 44, 32);
      shape(board, '#8e9a74', { from: 0.6, alpha: 0.35 });
      [[16, 24, 46, 24], [16, 30, 30, 30], [30, 30, 30, 42], [38, 36, 50, 36], [16, 44, 26, 44]].forEach(function (l) { line(l[0], l[1], l[2], l[3], 1, '#d9cf9a'); });
      shape(rect(34, 26, 12, 8), '#2e2c29', { shade: false, w: 1.3 });
      [36, 40, 44].forEach(function (x) { line(x, 26, x, 23, 1); line(x, 34, x, 37, 1); });
      shape(ell(20, 38, 3.5, 3.5), '#c9b27a', { shade: false, w: 1.2 });
      // fil
      SK.poly(ctx, r, [[54, 30], [58, 36], [56, 46], [60, 56]], false, { w: 2, passes: 1, color: RED });
    },
    carburant: function () {
      var can = [[14, 18], [44, 18], [50, 24], [50, 58], [14, 58]];
      shape(can, '#8a5a3e', { from: 0.55 });
      SK.poly(ctx, r, [[16, 24], [46, 54]], false, { w: 1.4, passes: 1, color: '#c9936a' });
      SK.poly(ctx, r, [[46, 24], [16, 54]], false, { w: 1.4, passes: 1, color: '#c9936a' });
      shape(rect(18, 10, 16, 8), '#6e4630', { shade: false, w: 1.8 });
      shape(rect(22, 12, 8, 4), W2, { shade: false, w: 1 });
      shape([[44, 18], [50, 8], [56, 10], [50, 22]], METAL, { w: 1.8 });
    },
    filtre: function () {
      var cyl = [[18, 16], [46, 16], [46, 52], [18, 52]];
      shape(cyl, W2);
      for (var y = 22; y < 50; y += 4) line(19, y, 45, y, 0.9, W4);
      shape(ell(32, 16, 14, 4), W1, { shade: false });
      shape(ell(32, 16, 5, 1.8), '#3a352d', { shade: false, w: 1.2 });
      SK.poly(ctx, r, ell(32, 52, 14, 4).slice(0, 14), false, { w: 2.2, passes: 1, color: INK });
      dot(48, 30, 1.2, BLUE); dot(52, 36, 1.4, BLUE); dot(49, 42, 1, BLUE);
    },
    engrais: function () {
      var sack = [[14, 14], [50, 14], [54, 26], [52, 58], [12, 58], [10, 26]];
      shape(sack, '#b7a178');
      line(14, 14, 50, 14, 2.4);
      // feuille dessinée sur le sac
      var leaf = [[32, 26], [42, 34], [34, 48], [26, 40]];
      shape(leaf, GREEN, { shade: false, w: 1.5 });
      line(32, 28, 32, 46, 1);
      [[20, 52], [28, 54], [42, 53]].forEach(function (p) { dot(p[0], p[1], 1.2, '#5a4a32'); });
    },
    herbes: function () {
      for (var i = 0; i < 5; i++) {
        var x = 22 + i * 5, top = 8 + (i % 2) * 5;
        line(32, 50, x, top, 1.6, '#4c5a3a');
        for (var k = 0; k < 3; k++) {
          var yy = top + 6 + k * 9, sx = x + (32 - x) * (k * 9 + 6) / 42;
          shape(ell(sx - 4, yy, 4.5, 2, 0.6, 12), GREEN, { shade: false, w: 1 });
          shape(ell(sx + 4, yy + 3, 4.5, 2, -0.6, 12), '#8c9a66', { shade: false, w: 1 });
        }
      }
      shape(rect(27, 46, 10, 6), '#b8a07a', { shade: false, w: 1.6 });
      line(28, 58, 32, 52, 1.4); line(36, 58, 32, 52, 1.4);
    },
    tabac: function () {
      [-0.5, 0, 0.5].forEach(function (a, i) {
        rot(32, 50, a, function () {
          var leaf = [[32, 50], [22, 34], [24, 16], [32, 8], [40, 16], [42, 34]];
          shape(leaf, ['#9a7a4c', '#b08a52', '#8a6a40'][i], { from: 0.5, alpha: 0.35 });
          line(32, 48, 32, 12, 1, '#5a4228');
        });
      });
      shape(rect(28, 48, 8, 8), W2, { w: 1.6 });
    },
    livres: function () {
      shape(rect(10, 44, 44, 10), '#7d5a4a', { from: 0.1, alpha: 0.3 });
      shape(rect(13, 44, 38, 3), W1, { shade: false, w: 1 });
      rot(32, 38, -0.06, function () { shape(rect(12, 33, 42, 10), '#5e6a74', { from: 0.1, alpha: 0.3 }); shape(rect(15, 33, 36, 3), W1, { shade: false, w: 1 }); });
      rot(30, 24, 0.12, function () {
        shape(rect(14, 18, 34, 12), W2, { from: 0.1, alpha: 0.3 });
        line(18, 22, 30, 22, 1); line(18, 26, 26, 26, 1);
      });
    },
    bandage: function () {
      var box = rect(10, 18, 36, 30);
      shape(box, W1);
      shape([[25, 23], [31, 23], [31, 29], [37, 29], [37, 35], [31, 35], [31, 41], [25, 41], [25, 35], [19, 35], [19, 29], [25, 29]], RED, { shade: false, w: 1.4 });
      shape(ell(48, 46, 10, 10), W1);
      shape(ell(48, 46, 4, 4), W3, { shade: false, w: 1.4 });
      SK.poly(ctx, r, [[48, 36], [58, 30], [60, 22]], false, { w: 5, passes: 1, color: W1 });
      SK.poly(ctx, r, [[48, 36], [58, 30], [60, 22]], false, { w: 1, passes: 1, color: INK });
    },
    medicaments: function () {
      var bottle = [[18, 22], [42, 22], [42, 56], [18, 56]];
      shape(bottle, '#a8763e', { from: 0.6 });
      shape(rect(16, 12, 28, 10), W1, { w: 2 });
      [14, 17, 20].forEach(function (y) { line(17, y, 43, y, 0.8, W4); });
      shape(rect(20, 30, 20, 16), W1, { shade: false, w: 1.3 });
      ctx.fillStyle = RED; ctx.fillRect(28, 32, 4, 12); ctx.fillRect(24, 36, 12, 4);
      shape(ell(50, 50, 6, 3.5, 0.5), W1, { w: 1.6 });
      shape(ell(52, 40, 4, 4), W1, { w: 1.6 });
      line(46, 48, 54, 52, 0.9);
    },
    remede: function () {
      var jar = [[16, 20], [48, 20], [50, 26], [50, 56], [14, 56], [14, 26]];
      shape(jar, '#c9d0bf', { from: 0.6, alpha: 0.3 });
      ctx.save(); path(jar); ctx.clip();
      ctx.fillStyle = 'rgba(125,138,92,0.7)'; ctx.fillRect(10, 34, 44, 24);
      for (var i = 0; i < 6; i++) line(18 + i * 5, 54, 20 + i * 5, 36 + (i % 3) * 3, 1.2, '#3e4a2c');
      ctx.restore();
      SK.poly(ctx, r, jar, true, { w: 2.3, passes: 1, color: INK });
      shape(rect(20, 10, 24, 10), '#b8956a', { w: 2 });
      shape(rect(22, 38, 20, 10), W1, { shade: false, w: 1.2 });
      line(25, 43, 39, 43, 1);
    },
    cafe: function () {
      [[24, 6], [32, 4]].forEach(function (p) { SK.poly(ctx, r, [[p[0], 22], [p[0] - 3, 16], [p[0] + 2, 10], [p[0], p[1]]], false, { w: 1.4, passes: 1, color: W4 }); });
      var cup = [[12, 24], [44, 24], [42, 46], [36, 52], [20, 52], [14, 46]];
      shape(cup, W1);
      shape(ell(28, 24, 16, 4), '#5a3e2a', { shade: false, w: 1.8 });
      SK.poly(ctx, r, [[43, 30], [52, 30], [52, 40], [41, 42]], false, { w: 2.4, passes: 1, color: INK });
      shape(ell(30, 56, 22, 3.5), W2, { shade: false, w: 1.6 });
      shape(ell(52, 52, 3, 2, 0.4), '#5a3e2a', { shade: false, w: 1 });
      shape(ell(56, 56, 3, 2, -0.4), '#5a3e2a', { shade: false, w: 1 });
    },
    cigarettes: function () {
      [[22, 8], [30, 5], [38, 10]].forEach(function (c, i) {
        shape(rect(c[0], c[1], 6, 22), W1, { shade: false, w: 1.4 });
        ctx.fillStyle = '#c9a36a'; ctx.fillRect(c[0] + 0.5, c[1] + 16, 5, 5.5);
        if (i === 1) { dot(c[0] + 3, c[1], 2, '#e0874a'); }
      });
      var pack = rect(14, 22, 36, 36);
      shape(pack, '#b85a3e', { from: 0.6 });
      shape(rect(14, 22, 36, 8), W1, { shade: false, w: 1.6 });
      shape(ell(32, 44, 8, 6), W1, { shade: false, w: 1.2 });
      line(28, 44, 36, 44, 1);
    },
    alcool: function () {
      var bot = [[26, 20], [38, 20], [38, 28], [46, 36], [46, 58], [18, 58], [18, 36], [26, 28]];
      ctx.fillStyle = '#d7d0bc'; path(bot); ctx.fill();
      ctx.save(); path(bot); ctx.clip();
      ctx.fillStyle = 'rgba(201,154,74,0.85)'; ctx.fillRect(14, 38, 36, 24);
      ctx.restore();
      shade(bot, 0.6, 0.4);
      SK.poly(ctx, r, bot, true, { w: 2.3, passes: 2, j: 0.4, color: INK });
      shape(rect(27, 10, 10, 10), '#9a7a52', { w: 1.8 });
      shape(rect(22, 42, 20, 10), W1, { shade: false, w: 1.2 });
      line(25, 46, 39, 46, 1); line(25, 49, 34, 49, 0.8);
      line(21, 38, 21, 55, 1.2, 'rgba(255,255,255,0.8)');
    },
    pelle: function () {
      rot(32, 32, 0.65, function () {
        shape(rect(30, 2, 5, 36), WOOD, { w: 1.8, alpha: 0.3 });
        shape([[25, 2], [40, 2], [40, 6], [25, 6]], WOOD2, { w: 1.6 });
        shape([[22, 38], [43, 38], [44, 52], [32.5, 62], [21, 52]], METAL, { from: 0.5 });
        line(32.5, 40, 32.5, 58, 1);
      });
    },
    pied_de_biche: function () {
      rot(32, 32, 0.75, function () {
        shape(rect(29, 8, 6, 46), '#9b4a32', { from: 0.5, alpha: 0.4 });
        shape([[29, 54], [35, 54], [34, 60], [24, 62], [22, 58], [29, 57]], '#9b4a32', { shade: false, w: 2 });
        shape([[29, 8], [35, 8], [32, 2]], '#9b4a32', { shade: false, w: 1.8 });
        line(30, 57, 26, 60, 1.2, W2);
      });
    },
    passe_partout: function () {
      // Anneau et trois crochets en éventail
      SK.poly(ctx, r, ell(18, 18, 10, 10), true, { w: 3.2, passes: 2, color: INK });
      SK.poly(ctx, r, ell(18, 18, 10, 10), true, { w: 1.4, passes: 1, color: METAL });
      [[0.35, 0], [0.62, 1], [0.9, 2]].forEach(function (k) {
        rot(18, 18, k[0], function () {
          shape(rect(26, 16.5, 30, 3.6), METAL, { shade: false, w: 1.5 });
          if (k[1] === 0) SK.poly(ctx, r, [[56, 18], [60, 14]], false, { w: 2, passes: 1, color: INK });
          if (k[1] === 1) SK.poly(ctx, r, [[55, 20], [57, 15], [59, 20], [61, 15]], false, { w: 1.6, passes: 1, color: INK });
          if (k[1] === 2) SK.poly(ctx, r, [[56, 18], [60, 18], [60, 22]], false, { w: 1.8, passes: 1, color: INK });
        });
      });
    },    scie: function () {
      SK.poly(ctx, r, [[10, 44], [10, 22], [54, 22], [54, 44]], false, { w: 3, passes: 2, color: INK });
      shape(rect(10, 42, 44, 5), METAL, { shade: false, w: 1.4 });
      for (var x = 12; x < 54; x += 3) line(x, 47, x + 1.5, 49.5, 0.9);
      shape([[4, 38], [14, 38], [14, 56], [8, 58], [4, 52]], '#8a4a36', { from: 0.5 });
    },
    couteau: function () {
      rot(32, 32, -0.75, function () {
        shape([[29, 6], [37, 20], [37, 40], [29, 40]], METAL, { from: 0.6 });
        line(30, 10, 30, 38, 1, W1);
        shape(rect(26, 40, 14, 3), '#3a3834', { shade: false, w: 1.6 });
        shape(rect(28.5, 43, 9, 17), '#6b5140', { from: 0.5 });
        dot(33, 48, 1, W2); dot(33, 55, 1, W2);
      });
    },
    hachette: function () {
      rot(32, 32, 0.6, function () {
        shape(rect(29.5, 14, 6, 46), WOOD, { w: 1.8, alpha: 0.3 });
        shape([[22, 8], [36, 8], [36, 22], [22, 22], [14, 28], [10, 16], [14, 4]], METAL, { from: 0.3 });
        line(11, 6, 13, 26, 1.2, W1);
      });
    },
    pistolet: function () {
      shape([[8, 22], [52, 22], [54, 26], [54, 32], [24, 32], [8, 30]], '#5c5e60', { from: 0.3, alpha: 0.45 });
      shape([[24, 32], [36, 32], [34, 38], [26, 38]], '#5c5e60', { shade: false, w: 1.6 });
      shape([[34, 30], [44, 30], [48, 56], [36, 58]], '#6b5140', { from: 0.5 });
      SK.poly(ctx, r, [[28, 34], [30, 40], [36, 40]], false, { w: 1.6, passes: 1, color: INK });
      [14, 20, 26].forEach(function (x) { line(x, 24, x, 30, 0.9, W3); });
      shape(rect(49, 18, 3, 4), '#5c5e60', { shade: false, w: 1.2 });
    },
    fusil: function () {
      rot(32, 32, -0.5, function () {
        shape([[2, 28], [40, 28], [40, 33], [2, 33]], '#5c5e60', { shade: false, w: 1.6 });
        shape([[2, 33], [34, 33], [34, 36], [2, 36]], '#4a4c4e', { shade: false, w: 1.4 });
        shape([[14, 36], [30, 36], [30, 39], [14, 39]], '#8a6a4a', { shade: false, w: 1.4 });
        shape([[38, 26], [46, 26], [62, 32], [62, 44], [48, 38], [38, 36]], '#8a6a4a', { from: 0.4 });
        SK.poly(ctx, r, [[38, 36], [40, 42], [44, 38]], false, { w: 1.4, passes: 1, color: INK });
      });
    },
    munitions: function () {
      [[14, 0], [28, 0.08], [42, -0.06]].forEach(function (b, i) {
        rot(b[0] + 5, 36, b[1], function () {
          shape(rect(b[0], 20, 11, 28), i === 1 ? '#a8432a' : '#b35a3e', { from: 0.55, alpha: 0.35 });
          shape(rect(b[0] - 1, 46, 13, 10), AMBER, { from: 0.55, alpha: 0.35 });
          line(b[0] - 1, 50, b[0] + 12, 50, 1);
          line(b[0] + 2, 22, b[0] + 2, 44, 1, 'rgba(255,255,255,0.5)');
        });
      });
    },
    gilet: function () {
      var v = [[16, 8], [26, 8], [32, 16], [38, 8], [48, 8], [54, 22], [52, 58], [12, 58], [10, 22]];
      shape(v, '#6e7560', { from: 0.55, alpha: 0.4 });
      shape([[26, 8], [32, 16], [38, 8], [36, 24], [28, 24]], '#3a3d33', { shade: false, w: 1.4 });
      shape(rect(15, 34, 14, 12), '#5d6450', { shade: false, w: 1.4 });
      shape(rect(35, 34, 14, 12), '#5d6450', { shade: false, w: 1.4 });
      line(32, 24, 32, 58, 1.2);
      [[18, 30], [26, 30], [38, 30], [46, 30]].forEach(function (p) { dot(p[0], p[1], 1); });
    },
    bijoux: function () {
      // collier
      var pts = [];
      for (var i = 0; i <= 16; i++) { var a = Math.PI * 0.1 + i / 16 * Math.PI * 0.8; pts.push([32 + Math.cos(a) * 22, 14 + Math.sin(a) * 26]); }
      SK.poly(ctx, r, pts, false, { w: 1.4, passes: 1, color: INK });
      pts.forEach(function (p, i) { if (i % 2 === 0) dot(p[0], p[1], 1.6, AMBER); });
      shape([[32, 38], [38, 44], [32, 52], [26, 44]], BLUE, { from: 0.5, alpha: 0.4, w: 1.6 });
      line(32, 38, 32, 52, 0.8, W1);
      // bague
      shape(ell(48, 52, 8, 5), 'rgba(0,0,0,0)', { shade: false, w: 2.6 });
      SK.poly(ctx, r, ell(48, 52, 8, 5), true, { w: 1.6, passes: 1, color: AMBER });
      shape([[45, 44], [51, 44], [48, 40]], '#c9d0dc', { shade: false, w: 1.2 });
    },
    diamants: function () {
      // trois pierres taillées sur un petit sachet de velours
      shape([[14, 50], [20, 40], [44, 38], [52, 48], [46, 56], [18, 57]], '#4a3f55', { from: 0.5, alpha: 0.35 });
      [[26, 30, 9], [40, 34, 7], [33, 44, 6]].forEach(function (d, i) {
        var cx = d[0], cy = d[1], s = d[2];
        var g = [[cx - s, cy - s * 0.3], [cx - s * 0.5, cy - s * 0.9], [cx + s * 0.5, cy - s * 0.9], [cx + s, cy - s * 0.3], [cx, cy + s]];
        shape(g, i === 0 ? '#e6eef6' : '#cfdbe8', { shade: false, w: 1.6 });
        line(cx - s, cy - s * 0.3, cx + s, cy - s * 0.3, 0.9);
        line(cx - s * 0.5, cy - s * 0.9, cx - s * 0.2, cy - s * 0.3, 0.7); line(cx + s * 0.5, cy - s * 0.9, cx + s * 0.2, cy - s * 0.3, 0.7);
        line(cx - s * 0.2, cy - s * 0.3, cx, cy + s, 0.7); line(cx + s * 0.2, cy - s * 0.3, cx, cy + s, 0.7);
        dot(cx - s * 0.35, cy - s * 0.55, 1.1, '#ffffff');
      });
    },
    montre: function () {
      // montre à gousset en or, chaîne
      SK.poly(ctx, r, [[32, 12], [26, 8], [18, 10], [12, 16], [10, 24]], false, { w: 1.4, passes: 1, color: AMBER });
      shape(ell(32, 16, 3.5, 3.5), AMBER, { shade: false, w: 1.4 });
      shape(ell(32, 38, 17, 17), '#c9a24a', { from: 0.6, alpha: 0.35 });
      shape(ell(32, 38, 13, 13), '#efe8d6', { shade: false, w: 1.3 });
      for (var h = 0; h < 12; h++) { var a = h / 12 * Math.PI * 2; line(32 + Math.cos(a) * 10.5, 38 + Math.sin(a) * 10.5, 32 + Math.cos(a) * 12, 38 + Math.sin(a) * 12, 0.9); }
      line(32, 38, 32, 30, 1.5); line(32, 38, 37, 41, 1.3);
      dot(32, 38, 1.4);
    }
  };

  // ------------------------------------------------------------ rendu
  // Dessine l'objet id dans un canvas de taille px (pixels réels)
  A.render = function (id, px) {
    var c = document.createElement('canvas');
    c.width = c.height = px;
    ctx = c.getContext('2d');
    r = SK.rng(C.util.hashStr(id) % 100000 + 3);
    ctx.scale(px / 64, px / 64);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Ombre portée douce sous l'objet
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(33, 59, 20, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    var fn = D[id];
    if (fn) fn();
    else { shape(ell(32, 32, 16, 16), W2); }
    return c;
  };

  A.url = function (id, px) {
    px = px || 128;
    var k = id + '@' + px;
    if (!A.cache[k]) A.cache[k] = A.render(id, px).toDataURL('image/png');
    return A.cache[k];
  };

  // Balise <img> prête à l'emploi (taille CSS en px)
  A.img = function (id, size, cls) {
    size = size || 48;
    return '<img class="item-art' + (cls ? ' ' + cls : '') + '" src="' + A.url(id, Math.max(64, size * 2)) + '" width="' + size + '" height="' + size + '" alt="" draggable="false">';
  };


  // Vignette d'une construction, dessinée avec les mêmes fonctions que dans le refuge
  A.buildingUrl = function (kind, px) {
    px = px || 128;
    var k = 'b:' + kind + '@' + px;
    if (A.cache[k]) return A.cache[k];
    var b = C.BUILDINGS[kind];
    var c = document.createElement('canvas');
    c.width = c.height = px;
    var x = c.getContext('2d');
    // En file://, une texture photo « salit » le canvas (toDataURL interdit) : vignette sans texture
    var texOn = C.Tex && C.Tex.enabled, propsOn = C.Props && C.Props.enabled;
    if (location.protocol === 'file:') { if (C.Tex) C.Tex.enabled = false; if (C.Props) C.Props.enabled = false; }
    var s = Math.min(100 / b.w, 96 / (b.h + 8)) * px / 128;
    var o = { kind: kind, f: 1, x: 0, w: b.w, h: b.h, level: kind === 'workbench' ? 2 : 1, growth: 4, watered: 1, water: 2, fuel: 0 };
    x.fillStyle = 'rgba(0,0,0,0.22)';
    x.beginPath(); x.ellipse(px / 2, px * 0.9, px * 0.36, px * 0.05, 0, 0, Math.PI * 2); x.fill();
    x.save();
    x.translate(px / 2, px * 0.9);
    x.scale(s, s);
    x.translate(0, -C.FLOORS[1].y);
    if (C.ObjDraw[kind]) C.ObjDraw[kind](x, SK.rng(C.util.hashStr(kind)), o, C.FLOORS[1].y);
    x.restore();
    if (C.Tex) C.Tex.enabled = texOn;
    if (C.Props) C.Props.enabled = propsOn;
    A.cache[k] = c.toDataURL('image/png');
    return A.cache[k];
  };
  A.buildingImg = function (kind, size) {
    size = size || 48;
    return '<img class="item-art" src="' + A.buildingUrl(kind, Math.max(64, size * 2)) + '" width="' + size + '" height="' + size + '" alt="" draggable="false">';
  };
  A.has = function (id) { return !!D[id]; };
  A.shortName = function (id) { return C.ITEMS[id] ? C.ITEMS[id].name.toLowerCase() : id; };
})(window.CQR);
