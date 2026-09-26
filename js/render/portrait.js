/* =========================================================
   Portraits des survivants — bustes dessinés au crayon
   Anatomie du visage, ombrages hachurés, cheveux par mèches,
   vêtements et signes distinctifs propres à chacun.
   L'expression suit l'état : tristesse, fatigue, maladie, blessure.
   Repère logique : 200 × 240, tête centrée en (100, 96).
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch;
  var INK = '#1a1714';
  var CX = 100, CY = 100;

  // ------------------------------------------------------------ fiches physiques
  var SPEC = {
    // Rachel Donovan — infirmière, 34 ans : chignon brun, traits fins, stéthoscope
    vera: { skin: '#dcbba1', hair: '#3e2b20', hairStyle: 'bun', fw: 33, fh: 46, jaw: 0.74, eye: 1.02, iris: '#5b4632', brow: 2.0, nose: 'small', lips: 1.0, age: 0.25,
      clothes: 'coat', cloth: '#58585a', acc: ['stethoscope'], turn: 0.14 },
    // Frank Doyle — ancien boxeur, 41 ans : mâchoire carrée, nez cassé, cicatrice, crâne rasé
    tomas: { skin: '#d0a587', hair: '#2a2420', hairStyle: 'buzz', fw: 40, fh: 47, jaw: 1.0, eye: 0.82, iris: '#4f5d6a', brow: 3.2, nose: 'broken', lips: 0.85, age: 0.45,
      beard: 'stubble', clothes: 'leather', cloth: '#3b2f27', scar: true, cauli: true, build: 1.28, neck: 1.35, turn: 0.1 },
    // Tyler Brooks — coursier, 27 ans : visage fin, bonnet, mèches rebelles, sweat à capuche
    ilija: { skin: '#b88a67', hair: '#2b211b', hairStyle: 'messy', hat: 'beanie', hatColor: '#6d5747', fw: 32, fh: 46, jaw: 0.8, eye: 1.0, iris: '#3b2c22', brow: 2.2, nose: 'straight', lips: 1.0, age: 0.12,
      beard: 'light', clothes: 'hoodie', cloth: '#5b5b53', scarf: '#8b4a35', turn: 0.16 },
    // Martha Jenkins — cuisinière, 52 ans : visage rond et doux, foulard noué, gilet
    nada: { skin: '#7b5541', hair: '#1f1814', hairStyle: 'scarf', scarfHead: '#77503f', fw: 38, fh: 45, jaw: 0.95, eye: 0.95, iris: '#2b1d16', brow: 2.0, nose: 'wide', lips: 1.2, age: 0.55,
      clothes: 'cardigan', cloth: '#6c5a49', earrings: true, turn: 0.12, round: true },
    // Vince Carver — contrebandier, 45 ans : visage long, casquette plate, barbe, regard plissé, cigarette
    goran: { skin: '#c09a7a', hair: '#2b2622', hairStyle: 'short', hat: 'cap', hatColor: '#3a3935', fw: 34, fh: 50, jaw: 0.82, eye: 0.8, iris: '#3b3226', brow: 3.0, nose: 'long', lips: 0.8, age: 0.5,
      beard: 'full', beardColor: '#3b332c', clothes: 'overcoat', cloth: '#3e3a34', acc: ['cigarette'], squint: true, turn: 0.2 },
    // Emily Parker — étudiante, 23 ans : cheveux longs raie au milieu, taches de rousseur, crayon sur l'oreille
    lena: { skin: '#e2c3a8', hair: '#5a3924', hairStyle: 'long', fw: 31, fh: 45, jaw: 0.72, eye: 1.08, iris: '#4b6a5a', brow: 1.8, nose: 'small', lips: 1.05, age: 0.05,
      freckles: true, clothes: 'jacket', cloth: '#5d6457', scarf: '#7c8a5d', acc: ['pencil'], turn: 0.14 },
    // Marcus Reed — docker, 38 ans : large carrure, bonnet de docker, barbe de trois jours, veste de travail
    emir: { skin: '#5f4031', hair: '#161210', hairStyle: 'buzz', hat: 'beanie', hatColor: '#2f3235', fw: 41, fh: 48, jaw: 1.0, eye: 0.9, iris: '#1f1612', brow: 3.0, nose: 'wide', lips: 1.25, age: 0.3,
      beard: 'stubble', clothes: 'work', cloth: '#3f4843', build: 1.32, neck: 1.35, turn: 0.1 },
    // Eleanor Hayes — institutrice retraitée, 61 ans : chignon gris, lunettes rondes, rides, perles
    mira: { skin: '#dcc1ab', hair: '#bcb4a8', hairStyle: 'bun', fw: 33, fh: 46, jaw: 0.76, eye: 0.95, iris: '#5b6b79', brow: 1.7, nose: 'straight', lips: 0.85, age: 0.88,
      glasses: true, clothes: 'cardigan', cloth: '#6a5f5b', scarf: '#7d6064', earrings: true, turn: 0.12 }
  };

  // ------------------------------------------------------------ outils de dessin
  var ctx, r;

  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(c, k, to) {
    var a = hex(c), b = to ? hex(to) : [0, 0, 0];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
  }
  function dark(c, k) { return mix(c, k); }
  function light(c, k) { return mix(c, k, '#ffffff'); }
  function rgba(c, a) { var h = hex(c); return 'rgba(' + h[0] + ',' + h[1] + ',' + h[2] + ',' + a + ')'; }

  // Tracé lisse (Catmull-Rom → Bézier)
  function smooth(pts, closed) {
    var n = pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    var count = closed ? n : n - 1;
    for (var i = 0; i < count; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      if (!closed) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  }
  function fill(pts, color) { ctx.fillStyle = color; smooth(pts, true); ctx.fill(); }
  // Trait de crayon : passe principale + passe fantôme légèrement décalée
  function pencil(pts, closed, w, alpha, color) {
    ctx.save();
    ctx.strokeStyle = color || INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha == null ? 0.9 : alpha; ctx.lineWidth = w || 1.4;
    smooth(pts, closed); ctx.stroke();
    var j = pts.map(function (p) { return [p[0] + (r.next() - 0.5) * 1.3, p[1] + (r.next() - 0.5) * 1.3]; });
    ctx.globalAlpha *= 0.4; ctx.lineWidth *= 0.55;
    smooth(j, closed); ctx.stroke();
    ctx.restore();
  }
  function stroke(x1, y1, x2, y2, w, alpha, color) {
    ctx.save(); ctx.strokeStyle = color || INK; ctx.globalAlpha = alpha == null ? 0.8 : alpha; ctx.lineWidth = w || 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
  }
  function curve(x1, y1, cx, cy, x2, y2, w, alpha, color) {
    ctx.save(); ctx.strokeStyle = color || INK; ctx.globalAlpha = alpha == null ? 0.8 : alpha; ctx.lineWidth = w || 1; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke(); ctx.restore();
  }
  function dot(x, y, rad, color, alpha) { ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = color || INK; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // Hachures dans une forme
  function hatchIn(pts, x, y, w, h, gap, alpha, angle, color) {
    ctx.save(); smooth(pts, true); ctx.clip();
    SK.hatch(ctx, r, x, y, w, h, { gap: gap || 2.2, alpha: alpha || 0.3, angle: angle == null ? -0.95 : angle, w: 0.75, color: color || INK });
    ctx.restore();
  }
  // Dégradé d'ombre (gauche éclairée → droite dans l'ombre)
  function sideShade(pts, x0, x1, a0, a1, color) {
    ctx.save(); smooth(pts, true); ctx.clip();
    var g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba(color || '#20150e', a0)); g.addColorStop(1, rgba(color || '#20150e', a1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, 200, 240);
    ctx.restore();
  }

  // ------------------------------------------------------------ fond
  function background() {
    var g = ctx.createLinearGradient(0, 0, 0, 240);
    g.addColorStop(0, '#948c7d'); g.addColorStop(1, '#4d4840');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 200, 240);
    // Mur : traces verticales et tache de lumière derrière la tête
    var l = ctx.createRadialGradient(80, 80, 10, 90, 90, 130);
    l.addColorStop(0, 'rgba(235,225,200,0.35)'); l.addColorStop(1, 'rgba(235,225,200,0)');
    ctx.fillStyle = l; ctx.fillRect(0, 0, 200, 240);
    SK.hatch(ctx, r, 0, 0, 200, 240, { gap: 5, alpha: 0.08, angle: -1.2, w: 0.7, color: INK });
    for (var i = 0; i < 260; i++) dot(r.next() * 200, r.next() * 240, r.next() * 0.8, r.next() < 0.5 ? '#000' : '#fff', 0.06);
  }

  // ------------------------------------------------------------ géométrie du visage
  function facePts(S) {
    var w = S.fw, h = S.fh, j = S.jaw, t = S.turn * w, rd = S.round ? 1.06 : 1;
    return [
      [CX + t * 0.2, CY - h], [CX + w * 0.8, CY - h * 0.82], [CX + w * rd, CY - h * 0.32], [CX + w * 0.98 * rd, CY + h * 0.12],
      [CX + w * (0.62 + 0.3 * j), CY + h * 0.55], [CX + w * 0.42 + t * 0.4, CY + h * 0.9], [CX + t * 0.6, CY + h * 1.0],
      [CX - w * 0.42 + t * 0.4, CY + h * 0.9], [CX - w * (0.62 + 0.3 * j), CY + h * 0.55], [CX - w * 0.98 * rd, CY + h * 0.12],
      [CX - w * rd, CY - h * 0.32], [CX - w * 0.8, CY - h * 0.82]
    ];
  }

  // ------------------------------------------------------------ vêtements
  function torso(S) {
    var b = S.build || 1, nw = 15 * (S.neck || 1), sw = 78 * b;
    var body = [[CX - sw, 250], [CX - sw * 0.99, 212], [CX - sw * 0.84, 190], [CX - sw * 0.5, 178], [CX - nw - 6, 170], [CX + nw + 6, 170], [CX + sw * 0.5, 178], [CX + sw * 0.84, 190], [CX + sw * 0.99, 212], [CX + sw, 250]];
    fill(body, S.cloth);
    sideShade(body, CX - sw, CX + sw, 0, 0.45);
    hatchIn(body, CX + 8, 160, sw, 90, 2.4, 0.28);
    var lit = light(S.cloth, 0.25), dk = dark(S.cloth, 0.35);
    switch (S.clothes) {
      case 'coat': case 'overcoat': {
        var up = S.clothes === 'overcoat';
        fill([[CX - nw - 2, 172], [CX + nw + 2, 172], [CX + 6, 214], [CX - 6, 214]], '#cfc6b3');                 // chemise
        hatchIn([[CX - nw - 2, 172], [CX + nw + 2, 172], [CX + 6, 214], [CX - 6, 214]], CX, 170, 20, 50, 2, 0.25);
        var lL = [[CX - nw - 8, up ? 150 : 168], [CX - 4, 232], [CX - 22, 206], [CX - sw * 0.46, 182]];
        var lR = [[CX + nw + 8, up ? 150 : 168], [CX + 4, 232], [CX + 22, 206], [CX + sw * 0.46, 182]];
        fill(lL, lit); fill(lR, S.cloth);
        hatchIn(lR, CX, 150, 50, 90, 2, 0.35);
        pencil(lL, true, 1.3, 0.8); pencil(lR, true, 1.3, 0.8);
        dot(CX - 2, 236, 2.2, dk); dot(CX - 2, 236, 2.2, INK, 0.4);
        break;
      }
      case 'leather':
        fill([[CX - nw - 4, 171], [CX + nw + 4, 171], [CX + 4, 240], [CX - 4, 240]], '#d4ccbc');
        fill([[CX - nw - 12, 166], [CX - 10, 200], [CX - 34, 196], [CX - sw * 0.6, 182]], lit);
        fill([[CX + nw + 12, 166], [CX + 10, 200], [CX + 34, 196], [CX + sw * 0.6, 182]], dk);
        pencil([[CX - nw - 12, 166], [CX - 10, 200], [CX - 34, 196], [CX - sw * 0.6, 182]], true, 1.4, 0.8);
        pencil([[CX + nw + 12, 166], [CX + 10, 200], [CX + 34, 196], [CX + sw * 0.6, 182]], true, 1.4, 0.8);
        stroke(CX + 6, 202, CX + 8, 240, 1.4, 0.8);
        // reflets du cuir
        [[CX - 50, 205, CX - 40, 232], [CX - 38, 212, CX - 33, 238], [CX + 42, 210, CX + 48, 236]].forEach(function (l) { stroke(l[0], l[1], l[2], l[3], 2.2, 0.22, '#f3e6d0'); });
        break;
      case 'hoodie':
        fill([[CX - nw - 16, 176], [CX - nw - 8, 160], [CX + nw + 8, 160], [CX + nw + 16, 176], [CX, 188]], dk);           // capuche roulée
        pencil([[CX - nw - 16, 176], [CX - nw - 8, 160], [CX + nw + 8, 160], [CX + nw + 16, 176], [CX, 188]], true, 1.3, 0.8);
        curve(CX - 7, 186, CX - 9, 205, CX - 6, 222, 1.4, 0.9, '#d8d0c0');
        curve(CX + 7, 186, CX + 9, 205, CX + 8, 220, 1.4, 0.9, '#d8d0c0');
        stroke(CX - 44, 222, CX + 44, 224, 1, 0.35);
        break;
      case 'cardigan':
        fill([[CX - nw - 4, 170], [CX + nw + 4, 170], [CX + 3, 222], [CX - 3, 222]], '#ddd4c2');
        fill([[CX - nw - 3, 170], [CX - 2, 176], [CX - 12, 186]], '#f1ebdf'); fill([[CX + nw + 3, 170], [CX + 2, 176], [CX + 12, 186]], '#e4dccd');
        pencil([[CX - nw - 3, 170], [CX - 2, 176], [CX - 12, 186]], true, 1, 0.7); pencil([[CX + nw + 3, 170], [CX + 2, 176], [CX + 12, 186]], true, 1, 0.7);
        pencil([[CX - nw - 6, 168], [CX - 4, 226], [CX - 4, 250]], false, 1.5, 0.8); pencil([[CX + nw + 6, 168], [CX + 4, 226], [CX + 4, 250]], false, 1.5, 0.8);
        [230, 244].forEach(function (y) { dot(CX - 9, y, 2.2, '#e8dfcf'); dot(CX - 9, y, 2.2, INK, 0.3); });
        for (var k = 0; k < 9; k++) stroke(CX - 60 + k * 14, 200, CX - 62 + k * 14, 240, 0.7, 0.18); // maille
        break;
      case 'jacket':
        fill([[CX - nw - 6, 168], [CX - 3, 206], [CX - 16, 202]], lit); fill([[CX + nw + 6, 168], [CX + 3, 206], [CX + 16, 202]], S.cloth);
        pencil([[CX - nw - 6, 168], [CX - 3, 206], [CX - 16, 202]], true, 1.2, 0.8); pencil([[CX + nw + 6, 168], [CX + 3, 206], [CX + 16, 202]], true, 1.2, 0.8);
        stroke(CX, 206, CX + 1, 250, 1.6, 0.85);
        for (var z = 208; z < 245; z += 4) stroke(CX - 2, z, CX + 3, z, 0.8, 0.5);
        break;
      case 'work':
        fill([[CX - nw - 10, 164], [CX - 4, 196], [CX - 28, 194], [CX - sw * 0.55, 180]], '#5a4a3a');                        // col en velours
        fill([[CX + nw + 10, 164], [CX + 4, 196], [CX + 28, 194], [CX + sw * 0.55, 180]], '#4a3c2f');
        pencil([[CX - nw - 10, 164], [CX - 4, 196], [CX - 28, 194], [CX - sw * 0.55, 180]], true, 1.3, 0.8);
        pencil([[CX + nw + 10, 164], [CX + 4, 196], [CX + 28, 194], [CX + sw * 0.55, 180]], true, 1.3, 0.8);
        [-1, 1].forEach(function (sd) {
          var px = CX + sd * 38;
          fill([[px - 14, 210], [px + 14, 210], [px + 14, 220], [px - 14, 222]], dk);
          pencil([[px - 14, 210], [px + 14, 210], [px + 14, 220], [px - 14, 222]], true, 1, 0.7);
          dot(px, 216, 1.6, '#c9b27a');
        });
        stroke(CX, 196, CX + 2, 250, 1.6, 0.8);
        break;
    }
    pencil(body.slice(1, body.length - 1), false, 1.8, 0.9);
    // plis
    curve(CX - sw * 0.7, 200, CX - sw * 0.6, 215, CX - sw * 0.66, 238, 0.9, 0.35);
    curve(CX + sw * 0.72, 202, CX + sw * 0.64, 218, CX + sw * 0.7, 240, 0.9, 0.35);
    return nw;
  }

  function scarfFront(S, nw) {
    if (!S.scarf) return;
    var band = [[CX - nw - 18, 170], [CX - nw - 8, 156], [CX, 160], [CX + nw + 8, 156], [CX + nw + 18, 170], [CX + 8, 186], [CX - 10, 186]];
    fill(band, S.scarf);
    sideShade(band, CX - 30, CX + 30, 0, 0.4);
    hatchIn(band, CX - 30, 150, 60, 40, 2.2, 0.25, 0.2);
    pencil(band, true, 1.3, 0.85);
    curve(CX - 18, 166, CX, 174, CX + 16, 164, 0.9, 0.5);
    var tail = [[CX - 12, 180], [CX + 2, 182], [CX + 4, 226], [CX - 2, 232], [CX - 14, 226]];
    fill(tail, dark(S.scarf, 0.12));
    hatchIn(tail, CX - 16, 176, 22, 60, 2, 0.3, 0.1);
    pencil(tail, true, 1.2, 0.85);
    for (var i = 0; i < 4; i++) stroke(CX - 12 + i * 4, 228, CX - 13 + i * 4, 236, 1, 0.7, dark(S.scarf, 0.3));
  }

  // ------------------------------------------------------------ cheveux, couvre-chefs
  function hairBack(S) {
    var w = S.fw, h = S.fh;
    if (S.hairStyle === 'long') {
      var back = [[CX - w * 1.18, CY - h * 0.6], [CX, CY - h * 1.2], [CX + w * 1.18, CY - h * 0.6], [CX + w * 1.32, CY + h * 0.6], [CX + w * 1.25, CY + h * 1.9], [CX - w * 1.35, CY + h * 2.0], [CX - w * 1.35, CY + h * 0.6]];
      fill(back, dark(S.hair, 0.15));
      hatchIn(back, CX - 60, CY - 60, 120, 160, 2, 0.35, 1.3);
    }
    if (S.hairStyle === 'scarf') {
      var drape = [[CX - w * 1.02, CY + h * 0.3], [CX + w * 1.02, CY + h * 0.3], [CX + w * 1.08, CY + h * 1.05], [CX - w * 1.1, CY + h * 1.05]];
      // pan du foulard, discret, derrière la nuque
      fill([[CX - w * 0.9, CY + h * 0.5], [CX - w * 0.55, CY + h * 0.55], [CX - w * 0.6, CY + h * 1.05], [CX - w * 1.0, CY + h * 1.0]], dark(S.scarfHead, 0.25));
    }
    if (S.hairStyle === 'bun') {
      var bun = [];
      for (var i = 0; i < 16; i++) { var a = i / 16 * Math.PI * 2; bun.push([CX + w * 0.15 + Math.cos(a) * w * 0.42, CY - h * 1.08 + Math.sin(a) * w * 0.36]); }
      fill(bun, S.hair);
      hatchIn(bun, CX - 20, CY - h * 1.4, 50, 40, 1.8, 0.35, 0.6);
      for (var k = 0; k < 6; k++) curve(CX - w * 0.2 + k * 4, CY - h * 1.2, CX + w * 0.1 + k * 2, CY - h * 1.35, CX + w * 0.5, CY - h * 1.1 + k * 2, 0.8, 0.5, dark(S.hair, 0.4));
      pencil(bun, true, 1.2, 0.8);
    }
  }

  function hairFront(S, grayish) {
    var w = S.fw, h = S.fh, hc = S.hair, dk = dark(hc, 0.45), lt = light(hc, 0.3);
    var cap;
    switch (S.hairStyle) {
      case 'bun':
        cap = [[CX - w * 1.04, CY - h * 0.15], [CX - w * 1.02, CY - h * 0.7], [CX - w * 0.6, CY - h * 1.06], [CX, CY - h * 1.14], [CX + w * 0.62, CY - h * 1.06], [CX + w * 1.04, CY - h * 0.7], [CX + w * 1.05, CY - h * 0.15],
          [CX + w * 0.86, CY - h * 0.5], [CX + w * 0.35, CY - h * 0.72], [CX - w * 0.3, CY - h * 0.74], [CX - w * 0.86, CY - h * 0.5]];
        fill(cap, hc);
        hatchIn(cap, CX - 50, CY - 70, 100, 60, 2, 0.28, -0.4);
        // mèches tirées vers le chignon
        for (var i = 0; i < 16; i++) {
          var sx = CX - w * 0.9 + i * w * 0.12, sy = CY - h * (0.5 + 0.22 * Math.sin(i / 15 * Math.PI));
          curve(sx, sy, sx * 0.6 + CX * 0.4, CY - h * 1.1, CX + w * 0.1, CY - h * 1.12, 0.8, 0.55, i % 3 ? dk : lt);
        }
        break;
      case 'buzz':
        cap = [[CX - w * 1.02, CY - h * 0.25], [CX - w * 0.95, CY - h * 0.78], [CX - w * 0.5, CY - h * 1.04], [CX, CY - h * 1.07], [CX + w * 0.52, CY - h * 1.04], [CX + w * 0.97, CY - h * 0.78], [CX + w * 1.03, CY - h * 0.25],
          [CX + w * 0.88, CY - h * 0.55], [CX + w * 0.4, CY - h * 0.7], [CX - w * 0.4, CY - h * 0.7], [CX - w * 0.88, CY - h * 0.55]];
        ctx.save(); ctx.globalAlpha = 0.82; fill(cap, hc); ctx.restore();
        ctx.save(); smooth(cap, true); ctx.clip();
        for (var d = 0; d < 380; d++) dot(CX - w * 1.1 + r.next() * w * 2.2, CY - h * 1.1 + r.next() * h * 0.9, 0.55, r.next() < 0.5 ? dk : lt, 0.6);
        ctx.restore();
        break;
      case 'messy':
        // mèches qui dépassent sous le bonnet
        for (var m = 0; m < 14; m++) {
          var bx = CX - w * 1.05 + m * w * 0.16, by = CY - h * 0.56;
          curve(bx, by, bx + (r.next() - 0.3) * 8, by + 6, bx + (r.next() - 0.2) * 10, by + 10 + r.next() * 8, 1.6, 0.9, m % 2 ? hc : dk);
        }
        [[-1.02, 0.2], [1.0, 0.25]].forEach(function (p) {
          for (var q = 0; q < 5; q++) curve(CX + w * p[0], CY - h * 0.4 + q * 3, CX + w * p[0] * 1.12, CY - h * 0.2 + q * 4, CX + w * p[0] * 1.05, CY + h * p[1] + q * 2, 1.4, 0.85, hc);
        });
        break;
      case 'short':
        [-1, 1].forEach(function (sd) {
          var side = [[CX + sd * w * 1.02, CY - h * 0.6], [CX + sd * w * 1.06, CY - h * 0.05], [CX + sd * w * 0.92, CY + h * 0.08], [CX + sd * w * 0.9, CY - h * 0.45]];
          fill(side, hc);
          for (var q = 0; q < 6; q++) stroke(CX + sd * w * (0.92 + q * 0.02), CY - h * 0.55, CX + sd * w * (0.95 + q * 0.02), CY - h * 0.02, 0.8, 0.6, q % 2 ? '#8f877c' : dk);
        });
        break;
      case 'long':
        cap = [[CX - w * 1.1, CY - h * 0.1], [CX - w * 1.05, CY - h * 0.75], [CX - w * 0.55, CY - h * 1.1], [CX, CY - h * 1.16], [CX + w * 0.58, CY - h * 1.1], [CX + w * 1.08, CY - h * 0.75], [CX + w * 1.12, CY - h * 0.1],
          [CX + w * 0.92, CY - h * 0.35], [CX + w * 0.6, CY - h * 0.8], [CX + w * 0.08, CY - h * 0.96], [CX - w * 0.1, CY - h * 0.96], [CX - w * 0.6, CY - h * 0.8], [CX - w * 0.92, CY - h * 0.35]];
        fill(cap, hc);
        hatchIn(cap, CX - 50, CY - 70, 100, 70, 2, 0.25, 0.9);
        // rideaux de cheveux de part et d'autre du visage
        [-1, 1].forEach(function (sd) {
          var cur = [[CX + sd * w * 0.92, CY - h * 0.35], [CX + sd * w * 1.12, CY - h * 0.1], [CX + sd * w * 1.22, CY + h * 0.7], [CX + sd * w * 1.3, CY + h * 1.7], [CX + sd * w * 1.02, CY + h * 1.62], [CX + sd * w * 0.96, CY + h * 0.6]];
          fill(cur, sd < 0 ? hc : dark(hc, 0.1));
          for (var q = 0; q < 8; q++) curve(CX + sd * w * (0.95 + q * 0.04), CY - h * 0.3, CX + sd * w * (1.12 + q * 0.03), CY + h * 0.5, CX + sd * w * (1.04 + q * 0.035), CY + h * 1.6, 0.8, 0.55, q % 3 ? dk : lt);
        });
        curve(CX, CY - h * 1.15, CX - 1, CY - h * 1.05, CX + 1, CY - h * 0.95, 1.2, 0.8, dk); // raie
        for (var s2 = 0; s2 < 10; s2++) curve(CX - 1, CY - h * 1.1, CX - w * 0.4 - s2, CY - h * 1.0, CX - w * (0.6 + s2 * 0.04), CY - h * 0.55, 0.8, 0.5, dk);
        for (var s3 = 0; s3 < 10; s3++) curve(CX + 1, CY - h * 1.1, CX + w * 0.4 + s3, CY - h * 1.0, CX + w * (0.6 + s3 * 0.04), CY - h * 0.55, 0.8, 0.5, dk);
        break;
      case 'scarf': {
        var sc = S.scarfHead;
        var cloth = [[CX - w * 1.16, CY + h * 0.55], [CX - w * 1.2, CY - h * 0.35], [CX - w * 0.9, CY - h * 0.98], [CX, CY - h * 1.2], [CX + w * 0.92, CY - h * 0.98], [CX + w * 1.22, CY - h * 0.35], [CX + w * 1.18, CY + h * 0.55],
          [CX + w * 1.0, CY + h * 0.35], [CX + w * 0.96, CY - h * 0.35], [CX + w * 0.5, CY - h * 0.66], [CX - w * 0.5, CY - h * 0.66], [CX - w * 0.96, CY - h * 0.35], [CX - w * 1.0, CY + h * 0.35]];
        fill(cloth, sc);
        sideShade(cloth, CX - 50, CX + 50, 0, 0.45);
        hatchIn(cloth, CX + 5, CY - 70, 60, 120, 2, 0.3);
        for (var p = 0; p < 40; p++) { var px = CX - w * 1.1 + r.next() * w * 2.2, py = CY - h * 1.1 + r.next() * h * 1.6; dot(px, py, 0.9, light(sc, 0.35), 0.5); }
        curve(CX - w * 0.95, CY - h * 0.5, CX - w * 0.3, CY - h * 0.95, CX + w * 0.5, CY - h * 0.95, 1, 0.5);
        curve(CX - w * 1.1, CY, CX - w * 1.25, CY - h * 0.5, CX - w * 0.6, CY - h * 1.05, 1, 0.45);
        pencil(cloth, true, 1.4, 0.85);
        // nœud sur la nuque
        fill([[CX - w * 1.22, CY + h * 0.3], [CX - w * 1.55, CY + h * 0.5], [CX - w * 1.45, CY + h * 0.75], [CX - w * 1.2, CY + h * 0.55]], dark(sc, 0.15));
        pencil([[CX - w * 1.22, CY + h * 0.3], [CX - w * 1.55, CY + h * 0.5], [CX - w * 1.45, CY + h * 0.75], [CX - w * 1.2, CY + h * 0.55]], true, 1.1, 0.8);
        break;
      }
    }
    if (cap) pencil(cap.slice(0, 7), false, 1.3, 0.8);
  }

  function hat(S) {
    var w = S.fw, h = S.fh;
    if (S.hat === 'beanie') {
      var dome = [[CX - w * 1.12, CY - h * 0.5], [CX - w * 1.02, CY - h * 1.02], [CX - w * 0.5, CY - h * 1.32], [CX + w * 0.1, CY - h * 1.38], [CX + w * 0.62, CY - h * 1.28], [CX + w * 1.06, CY - h * 0.98], [CX + w * 1.14, CY - h * 0.5]];
      fill(dome, S.hatColor);
      sideShade(dome, CX - w, CX + w, 0, 0.45);
      for (var i = 0; i < 12; i++) curve(CX - w * 1.0 + i * w * 0.18, CY - h * 0.62, CX - w * 0.6 + i * w * 0.12, CY - h * 1.2, CX + w * 0.05, CY - h * 1.36, 0.8, 0.35);
      pencil(dome, true, 1.5, 0.9);
      var band = [[CX - w * 1.16, CY - h * 0.72], [CX + w * 1.16, CY - h * 0.72], [CX + w * 1.16, CY - h * 0.46], [CX - w * 1.16, CY - h * 0.46]];
      fill(band, dark(S.hatColor, 0.1));
      ctx.save(); smooth(band, true); ctx.clip();
      for (var k = 0; k < 26; k++) stroke(CX - w * 1.16 + k * w * 0.09, CY - h * 0.73, CX - w * 1.16 + k * w * 0.09, CY - h * 0.45, 0.9, 0.4);
      ctx.restore();
      sideShade(band, CX - w, CX + w, 0, 0.35);
      pencil(band, true, 1.4, 0.9);
    }
    if (S.hat === 'cap') {
      var crown = [[CX - w * 1.08, CY - h * 0.55], [CX - w * 0.95, CY - h * 0.98], [CX - w * 0.3, CY - h * 1.2], [CX + w * 0.5, CY - h * 1.18], [CX + w * 1.1, CY - h * 0.9], [CX + w * 1.2, CY - h * 0.55]];
      fill(crown, S.hatColor);
      hatchIn(crown, CX - 50, CY - 70, 100, 40, 1.7, 0.3, 0.3);
      sideShade(crown, CX - w, CX + w, 0, 0.4);
      pencil(crown, true, 1.5, 0.9);
      stroke(CX - w * 0.2, CY - h * 1.18, CX + w * 0.4, CY - h * 0.62, 0.9, 0.4);
      var brim = [[CX - w * 0.85, CY - h * 0.58], [CX + w * 1.45, CY - h * 0.56], [CX + w * 1.35, CY - h * 0.46], [CX - w * 0.7, CY - h * 0.47]];
      fill(brim, dark(S.hatColor, 0.2));
      pencil(brim, true, 1.4, 0.9);
    }
  }

  // ------------------------------------------------------------ visage
  function ears(S) {
    var w = S.fw, h = S.fh;
    [-1, 1].forEach(function (sd) {
      if (S.hairStyle === 'long' || S.hairStyle === 'scarf') return;
      var ex = CX + sd * w * 0.98 + (sd > 0 ? -S.turn * w * 0.6 : 0), ey = CY + h * 0.02;
      var ew = sd > 0 ? 5 : 7.5;
      var ear = [[ex, ey - 13], [ex + sd * ew, ey - 11], [ex + sd * ew * 1.15, ey - 2], [ex + sd * ew * (S.cauli ? 1.3 : 0.9), ey + 8], [ex + sd * 2, ey + 13], [ex - sd * 2, ey + 6]];
      fill(ear, dark(S.skin, 0.08));
      sideShade(ear, ex - 8, ex + 8, sd > 0 ? 0.1 : 0.3, sd > 0 ? 0.35 : 0.05);
      pencil(ear, true, 1.3, 0.85);
      curve(ex + sd * 2, ey - 8, ex + sd * ew * 0.9, ey - 4, ex + sd * 2, ey + 6, 0.9, 0.55);
      if (S.cauli) { dot(ex + sd * ew * 0.9, ey - 2, 1.4, dark(S.skin, 0.35), 0.6); dot(ex + sd * ew * 1.0, ey + 3, 1.2, dark(S.skin, 0.35), 0.6); }
      if (S.earrings) { dot(ex + sd * 2, ey + 14, 2.2, '#f2ede2'); dot(ex + sd * 2, ey + 14, 2.2, INK, 0.25); dot(ex + sd * 1.4, ey + 13.3, 0.7, '#fff'); }
    });
  }

  function eye(S, x, y, side, M) {
    var ew = S.fw * 0.27 * S.eye, eh = ew * 0.42;
    var lid = (M.tired ? 0.35 : 0) + (S.squint ? 0.3 : 0) + (M.down ? 0.2 : 0);
    var L = [x - ew, y + (side < 0 ? 0.5 : 0)], R2 = [x + ew, y + (side > 0 ? 0.5 : 0)];
    function almond() {
      ctx.beginPath();
      ctx.moveTo(L[0], L[1]);
      ctx.bezierCurveTo(x - ew * 0.5, y - eh * 1.55, x + ew * 0.45, y - eh * 1.5, R2[0], R2[1]);
      ctx.bezierCurveTo(x + ew * 0.45, y + eh * 1.05, x - ew * 0.5, y + eh * 1.1, L[0], L[1]);
      ctx.closePath();
    }
    // Orbite ombrée
    ctx.save();
    var og = ctx.createRadialGradient(x, y - eh, 1, x, y - eh * 0.5, ew * 1.6);
    og.addColorStop(0, rgba('#2a1a10', 0.22 + S.age * 0.1)); og.addColorStop(1, rgba('#2a1a10', 0));
    ctx.fillStyle = og; ctx.fillRect(x - ew * 2, y - ew * 2, ew * 4, ew * 3);
    ctx.restore();
    almond(); ctx.fillStyle = '#e9e1d2'; ctx.fill();
    ctx.save(); almond(); ctx.clip();
    var ix = x + S.turn * ew * 0.9, iy = y + (M.down ? eh * 0.35 : 0), ir = eh * 1.05;
    ctx.fillStyle = S.iris; ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
    dot(ix, iy, ir * 0.45, '#0e0b09');
    dot(ix - ir * 0.35, iy - ir * 0.35, ir * 0.24, '#fff', 0.85);
    // ombre de la paupière supérieure
    var sh = ctx.createLinearGradient(0, y - eh * 1.4, 0, y + eh * 0.2);
    sh.addColorStop(0, 'rgba(30,20,12,0.45)'); sh.addColorStop(1, 'rgba(30,20,12,0)');
    ctx.fillStyle = sh; ctx.fillRect(x - ew, y - eh * 1.5, ew * 2, eh * 1.8);
    if (lid > 0) { ctx.fillStyle = dark(S.skin, 0.12); ctx.fillRect(x - ew * 1.1, y - eh * 1.6, ew * 2.2, eh * (0.2 + lid * 2.1)); }
    ctx.restore();
    // paupière supérieure (trait épais, cils côté extérieur)
    ctx.save(); ctx.strokeStyle = INK; ctx.lineCap = 'round';
    ctx.lineWidth = 1.9; ctx.beginPath(); ctx.moveTo(L[0], L[1]);
    var ly = lid > 0 ? y - eh * (1.45 - lid * 1.6) : y - eh * 1.55;
    ctx.bezierCurveTo(x - ew * 0.5, ly, x + ew * 0.45, ly + eh * 0.05, R2[0], R2[1]); ctx.stroke();
    ctx.lineWidth = 1.1;
    var outer = side < 0 ? L : R2;
    stroke(outer[0], outer[1], outer[0] + side * 3, outer[1] - 2, 1.2, 0.9);
    // pli de la paupière
    ctx.globalAlpha = 0.45; ctx.lineWidth = 0.9; ctx.beginPath();
    ctx.moveTo(x - ew * 0.85, y - eh * 1.3); ctx.quadraticCurveTo(x, y - eh * 2.6, x + ew * 0.85, y - eh * 1.25); ctx.stroke();
    // paupière inférieure
    ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(x - ew * 0.8, y + eh * 0.55); ctx.quadraticCurveTo(x, y + eh * 1.35, x + ew * 0.85, y + eh * 0.4); ctx.stroke();
    ctx.restore();
    // cernes, pattes d'oie
    if (M.tired || S.age > 0.35) curve(x - ew * 0.7, y + eh * 1.6, x, y + eh * 2.6, x + ew * 0.8, y + eh * 1.4, 0.9, 0.18 + (M.tired ? 0.25 : 0) + S.age * 0.15);
    if (M.tired) { ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = '#3a2a3a'; ctx.beginPath(); ctx.ellipse(x, y + eh * 1.7, ew * 0.8, eh * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (S.age > 0.35) for (var k = 0; k < 3; k++) stroke(outer[0] + side * 2, outer[1] - 1 + k * 2.2, outer[0] + side * 6, outer[1] - 3 + k * 3.2, 0.7, 0.25 + S.age * 0.2);
  }

  function brow(S, x, y, side, M) {
    var ew = S.fw * 0.27 * S.eye;
    var inner = [x - side * ew * 0.95, y], outer = [x + side * ew * 1.15, y + 1.5];
    var tilt = M.sad ? -3.5 : (S.squint ? 2.5 : 0);
    inner[1] += tilt;
    var peak = [x + side * ew * 0.3, y - 3.2 + (M.sad ? -1 : 0)];
    var n = 16, col = dark(S.hair === '#bcb4a8' ? '#6f675c' : S.hair, 0.1);
    for (var i = 0; i < n; i++) {
      var t = i / (n - 1), u = 1 - t;
      var px = u * u * inner[0] + 2 * u * t * peak[0] + t * t * outer[0];
      var py = u * u * inner[1] + 2 * u * t * peak[1] + t * t * outer[1];
      var th = S.brow * (1 - t * 0.55);
      stroke(px - side * 0.5, py + th * 0.5, px + side * 2.2, py - th * 0.6, 1.1, 0.85, col);
    }
  }

  function nose(S, M) {
    var w = S.fw, h = S.fh, t = S.turn * w, nx = CX + t * 1.3;
    var tipY = CY + h * (S.nose === 'long' ? 0.36 : 0.3);
    var rad = S.nose === 'wide' ? 8.5 : S.nose === 'small' ? 5 : 6.5;
    // arête (ombre côté droit)
    if (S.nose === 'broken') {
      curve(nx + 3, CY - h * 0.1, nx + 9, CY + h * 0.05, nx + 5, tipY - 4, 1.2, 0.6);
      curve(nx + 7, CY + h * 0.02, nx + 11, CY + h * 0.06, nx + 8, CY + h * 0.12, 1, 0.5);
    } else {
      curve(nx + 3, CY - h * 0.12, nx + 6, CY + h * 0.1, nx + rad * 0.7, tipY - 3, 1.1, 0.5);
    }
    ctx.save();
    ctx.beginPath(); ctx.moveTo(nx + 3, CY - h * 0.1); ctx.quadraticCurveTo(nx + 8, CY + h * 0.12, nx + rad, tipY); ctx.lineTo(nx + rad + 4, tipY); ctx.quadraticCurveTo(nx + 12, CY, nx + 9, CY - h * 0.12); ctx.closePath();
    ctx.fillStyle = 'rgba(40,25,15,0.14)'; ctx.fill();
    ctx.restore();
    // bout du nez et narines
    curve(nx - rad, tipY + 1, nx, tipY + rad * 0.75, nx + rad, tipY, 1.4, 0.85);
    curve(nx - rad - 2, tipY - 2, nx - rad - 4, tipY + 3, nx - rad + 1, tipY + 4, 1.2, 0.8);
    curve(nx + rad + 1, tipY - 3, nx + rad + 4, tipY + 2, nx + rad - 1, tipY + 3, 1.2, 0.8);
    dot(nx - rad * 0.45, tipY + 2.4, 1.3, INK, 0.7);
    dot(nx + rad * 0.55, tipY + 2.2, 1.2, INK, 0.7);
    dot(nx - 2, tipY - 2, 2, '#fff', 0.2);
    // ombre sous le nez
    ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(nx + 3, tipY + rad * 0.95, rad * 0.9, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    return { x: nx, y: tipY, r: rad };
  }

  function mouth(S, M, N) {
    var w = S.fw, h = S.fh, t = S.turn * w;
    var mx = CX + t * 0.9, my = CY + h * 0.56, mw = w * 0.4 * (0.85 + S.lips * 0.2);
    var c = M.sad ? 2.4 : 0;
    var lipCol = dark(S.skin, 0.28);
    // sillons naso-géniens
    var al = 0.14 + S.age * 0.3;
    curve(N.x - N.r - 3, N.y + 2, mx - mw - 4, my - 6, mx - mw - 2, my + 4, 1, al);
    curve(N.x + N.r + 3, N.y + 1, mx + mw + 5, my - 6, mx + mw + 3, my + 4, 1, al * 0.8);
    // philtrum
    stroke(mx - 2, N.y + N.r * 0.9, mx - 2.5, my - 4, 0.7, 0.25); stroke(mx + 2.5, N.y + N.r * 0.9, mx + 2.5, my - 4, 0.7, 0.2);
    // lèvre supérieure
    var th = 3 * S.lips;
    ctx.save(); ctx.fillStyle = rgba(lipCol, 0.55);
    ctx.beginPath(); ctx.moveTo(mx - mw, my + c);
    ctx.quadraticCurveTo(mx - mw * 0.5, my - th, mx - 1.5, my - th * 0.7); ctx.lineTo(mx + 1.5, my - th * 0.7);
    ctx.quadraticCurveTo(mx + mw * 0.5, my - th, mx + mw, my + c);
    ctx.quadraticCurveTo(mx, my + 1, mx - mw, my + c); ctx.fill();
    // lèvre inférieure
    ctx.fillStyle = rgba(lipCol, 0.35);
    ctx.beginPath(); ctx.moveTo(mx - mw * 0.85, my + c * 0.8);
    ctx.quadraticCurveTo(mx, my + th * 2.1 + 1, mx + mw * 0.85, my + c * 0.8); ctx.quadraticCurveTo(mx, my + 1.5, mx - mw * 0.85, my + c * 0.8); ctx.fill();
    ctx.restore();
    // ligne de la bouche
    pencil([[mx - mw, my + c], [mx - mw * 0.45, my + 0.8], [mx, my + 1.2], [mx + mw * 0.45, my + 0.6], [mx + mw, my + c]], false, 1.5, 0.9);
    // ombre sous la lèvre, menton
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.ellipse(mx + 1, my + th * 2 + 4, mw * 0.55, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    curve(mx - mw * 0.4, CY + h * 0.86, mx, CY + h * 0.92, mx + mw * 0.5, CY + h * 0.85, 0.8, 0.25);
    return { x: mx, y: my, w: mw };
  }

  function face(S, M) {
    var w = S.fw, h = S.fh, F = facePts(S);
    fill(F, S.skin);
    // modelé : lumière à gauche, ombre à droite, bas du visage plus sombre
    sideShade(F, CX - w * 0.4, CX + w * 1.05, 0, 0.42);
    ctx.save(); smooth(F, true); ctx.clip();
    var hl = ctx.createRadialGradient(CX - w * 0.35, CY - h * 0.35, 2, CX - w * 0.35, CY - h * 0.3, w * 0.9);
    hl.addColorStop(0, 'rgba(255,245,228,0.28)'); hl.addColorStop(1, 'rgba(255,245,228,0)');
    ctx.fillStyle = hl; ctx.fillRect(0, 0, 200, 240);
    var jw = ctx.createLinearGradient(0, CY + h * 0.4, 0, CY + h);
    jw.addColorStop(0, 'rgba(40,25,15,0)'); jw.addColorStop(1, 'rgba(40,25,15,0.22)');
    ctx.fillStyle = jw; ctx.fillRect(0, 0, 200, 240);
    // pommettes
    ctx.fillStyle = rgba(dark(S.skin, 0.1), 0.0);
    var ck = ctx.createRadialGradient(CX - w * 0.55, CY + h * 0.2, 1, CX - w * 0.55, CY + h * 0.2, w * 0.4);
    ck.addColorStop(0, 'rgba(170,80,60,0.12)'); ck.addColorStop(1, 'rgba(170,80,60,0)');
    ctx.fillStyle = ck; ctx.fillRect(0, 0, 200, 240);
    ctx.restore();
    // hachures sous la pommette et le long de la mâchoire (côté ombre)
    hatchIn(F, CX + w * 0.35, CY + h * 0.05, w * 0.8, h * 0.9, 2.1, 0.3, -1.1);
    hatchIn(F, CX + w * 0.72, CY - h * 0.8, w * 0.4, h * 0.9, 2.4, 0.22, -0.5);
    // rides du front
    if (S.age > 0.4) [0.5, 0.38, 0.27].forEach(function (k, i) { if (i < 1 + S.age * 2.4) curve(CX - w * 0.5, CY - h * k, CX, CY - h * (k + 0.06), CX + w * 0.5, CY - h * k, 0.8, 0.12 + S.age * 0.18); });
    if (M.sad && S.age <= 0.4) curve(CX - w * 0.2, CY - h * 0.42, CX + 2, CY - h * 0.48, CX + w * 0.25, CY - h * 0.42, 0.7, 0.18);
    return F;
  }

  function beard(S, M) {
    if (!S.beard) return;
    var w = S.fw, h = S.fh, t = S.turn * w, F = facePts(S);
    var mx = CX + t * 0.9, my = CY + h * 0.56;
    if (S.beard === 'full') {
      var b = [[CX - w * 0.98, CY + h * 0.02], [CX - w * 0.9, CY + h * 0.55], [CX - w * 0.45, CY + h * 1.02], [CX + t * 0.6, CY + h * 1.14], [CX + w * 0.45, CY + h * 1.02], [CX + w * 0.92, CY + h * 0.55], [CX + w * 0.99, CY + h * 0.02],
        [CX + w * 0.7, CY + h * 0.3], [mx + w * 0.45, my - 5], [mx, my - 8], [mx - w * 0.45, my - 5], [CX - w * 0.7, CY + h * 0.3]];
      var col = S.beardColor || S.hair;
      fill(b, col);
      sideShade(b, CX - w, CX + w, 0, 0.4);
      for (var i = 0; i < 90; i++) {
        var px = CX - w * 0.9 + r.next() * w * 1.8, py = CY + h * 0.2 + r.next() * h * 0.9;
        stroke(px, py, px + (r.next() - 0.5) * 2, py + 3 + r.next() * 3, 0.7, 0.55, r.next() < 0.3 ? '#8b8175' : dark(col, 0.4));
      }
      pencil(b.slice(0, 7), false, 1.1, 0.6);
    } else {
      ctx.save(); smooth(F, true); ctx.clip();
      var n = S.beard === 'light' ? 260 : 620;
      for (var k = 0; k < n; k++) {
        var x = CX - w + r.next() * w * 2, y = CY + h * 0.2 + r.next() * h * 0.85;
        var inMouth = Math.abs(x - mx) < w * 0.42 && Math.abs(y - my) < 4;
        if (!inMouth) dot(x, y, 0.5, '#1d1612', 0.35 + r.next() * 0.25);
      }
      ctx.restore();
    }
  }

  function extras(S, M, N, Mo) {
    var w = S.fw, h = S.fh;
    if (S.freckles) for (var i = 0; i < 26; i++) {
      var sd = i % 2 ? 1 : -1;
      dot(N.x + sd * (6 + r.next() * w * 0.45), N.y - 8 + r.next() * 10, 0.8 + r.next() * 0.5, '#7a4a2e', 0.5);
    }
    if (S.scar) {
      var sx = CX - w * 0.42, sy = CY - h * 0.2;
      stroke(sx - 7, sy - 8, sx + 5, sy + 7, 2.2, 0.55, light(S.skin, 0.35));
      stroke(sx - 6, sy - 8, sx + 6, sy + 7, 0.6, 0.6);
    }
    if (S.glasses) {
      var ey = CY - h * 0.08, ew = w * 0.27 * S.eye, t = S.turn * w;
      [-1, 1].forEach(function (sd) {
        var x = CX + sd * w * 0.42 + t * 0.9;
        ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(x, ey, ew * 1.35, ew * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.35; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x - ew * 0.4, ey - ew * 0.4, ew * 0.8, Math.PI * 1.05, Math.PI * 1.45); ctx.stroke();
        ctx.restore();
      });
      curve(CX - w * 0.42 + t * 0.9 + ew * 1.35, ey - 1, CX + t, ey - 4, CX + w * 0.42 + t * 0.9 - ew * 1.35, ey - 1, 1.4, 0.9);
      stroke(CX - w * 0.42 + t * 0.9 - ew * 1.35, ey - 1, CX - w * 0.95, ey - 2, 1.3, 0.85);
    }
    (S.acc || []).forEach(function (a) {
      if (a === 'cigarette') {
        var cx = Mo.x + Mo.w - 1, cy = Mo.y + 2;
        stroke(cx, cy, cx + 16, cy + 5, 3.4, 1, '#ece6d8');
        stroke(cx, cy - 1.5, cx + 16, cy + 3.5, 0.7, 0.6);
        stroke(cx, cy + 1.5, cx + 16, cy + 6.5, 0.7, 0.6);
        dot(cx + 16.5, cy + 5, 1.8, '#d86a36');
        for (var s = 0; s < 3; s++) curve(cx + 17, cy + 3 - s * 8, cx + 24 + s * 2, cy - 6 - s * 8, cx + 18 - s, cy - 14 - s * 8, 1.2, 0.25 - s * 0.05, '#e9e4da');
      }
      if (a === 'pencil') {
        var px = CX - w * 1.02, py = CY - h * 0.25;
        stroke(px - 10, py - 6, px + 12, py + 8, 3.6, 1, '#d8b24a');
        stroke(px - 10, py - 6, px + 12, py + 8, 0.7, 0.5);
        stroke(px - 12, py - 7.3, px - 9, py - 5.4, 3, 1, '#e6c8a8');
        dot(px - 13, py - 8, 0.9);
      }
      if (a === 'stethoscope') {
        pencil([[CX - 22, 166], [CX - 30, 188], [CX - 24, 214], [CX - 10, 226]], false, 3, 0.95, '#2d2d2e');
        pencil([[CX + 22, 166], [CX + 28, 186], [CX + 20, 206], [CX + 6, 218], [CX - 10, 226]], false, 3, 0.95, '#2d2d2e');
        ctx.save(); ctx.fillStyle = '#b9bcbe'; ctx.beginPath(); ctx.arc(CX - 10, 230, 6, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
        dot(CX - 12, 228, 1.6, '#fff', 0.7);
      }
    });
  }

  function mood(S, M, F) {
    if (M.sick) { ctx.save(); smooth(F, true); ctx.clip(); ctx.fillStyle = 'rgba(120,145,110,0.16)'; ctx.fillRect(0, 0, 200, 240); ctx.restore(); for (var i = 0; i < 4; i++) dot(CX - S.fw * 0.5 + r.next() * S.fw, CY - S.fh * 0.6 + r.next() * 8, 1.2, '#f3f0e8', 0.6); }
    if (M.wounded) {
      var x = CX + S.fw * 0.45, y = CY - S.fh * 0.35;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-0.4);
      ctx.fillStyle = '#e6dcc6'; ctx.fillRect(-10, -4, 20, 8);
      ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.strokeRect(-10, -4, 20, 8);
      ctx.fillStyle = 'rgba(150,40,30,0.55)'; ctx.beginPath(); ctx.arc(1, 0, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (M.broken) { ctx.fillStyle = 'rgba(20,18,16,0.14)'; ctx.fillRect(0, 0, 200, 240); }
  }

  // ------------------------------------------------------------ portraits photo
  // Visages réalistes (assets/portraits, visages générés de personnes qui
  // n'existent pas, retravaillés au fusain). L'état du personnage est ajouté
  // par-dessus : fatigue, tristesse, maladie, blessure (bandage).
  var PHOTOS = {};
  Object.keys(SPEC).forEach(function (id) {
    var im = new Image();
    im.onload = function () {
      PHOTOS[id] = im;
      // Les fiches déjà affichées se redessinent avec le vrai visage
      clearTimeout(P_draw._t);
      P_draw._t = setTimeout(function () { if (C.UI && C.UI.buildCards && C.Game && C.Game.st) C.UI.buildCards(); }, 60);
    };
    im.src = 'assets/portraits/' + id + '.jpg';
  });

  function drawPhoto(c, im, s, w, h, M) {
    var iw = im.naturalWidth, ih = im.naturalHeight;
    // cadrage « couverture », visage gardé en haut du cadre
    var k = Math.max(w / iw, h / ih), dw = iw * k, dh = ih * k;
    var ox = (w - dw) / 2, oy = Math.min(0, (h - dh) * 0.35);
    c.save();
    c.beginPath(); c.rect(0, 0, w, h); c.clip();
    c.fillStyle = '#16140f'; c.fillRect(0, 0, w, h);
    c.drawImage(im, ox, oy, dw, dh);
    // repères du visage dans l'image source (portraits cadrés de la même façon)
    var fx = function (u) { return ox + u * dw; }, fy = function (v) { return oy + v * dh; };
    var fwid = dw * 0.5;
    // Moral : l'image se refroidit et s'assombrit
    var gloom = M.broken ? 0.36 : M.down ? 0.26 : M.sad ? 0.13 : 0;
    if (gloom) { c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(70,80,95,' + gloom * 2 + ')'; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(8,10,14,' + gloom * 0.6 + ')'; c.fillRect(0, 0, w, h); }
    // Maladie : teint verdâtre, sueur
    if (M.sick) {
      c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(165,190,150,0.55)'; c.fillRect(0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(245,245,235,0.55)';
      for (var i = 0; i < 6; i++) { c.beginPath(); c.arc(fx(0.36 + (i * 0.137) % 0.3), fy(0.24 + (i * 0.071) % 0.08), Math.max(0.8, dw * 0.006), 0, Math.PI * 2); c.fill(); }
    }
    // Fatigue : cernes et bords qui se ferment
    if (M.tired) {
      [0.37, 0.63].forEach(function (u) {
        var g = c.createRadialGradient(fx(u), fy(0.47), 1, fx(u), fy(0.47), fwid * 0.16);
        g.addColorStop(0, 'rgba(20,14,12,0.45)'); g.addColorStop(1, 'rgba(20,14,12,0)');
        c.fillStyle = g; c.fillRect(fx(u) - fwid * 0.2, fy(0.47) - fwid * 0.2, fwid * 0.4, fwid * 0.4);
      });
    }
    // Blessure : bandage de gaze sur le front, taché de sang
    if (M.wounded) {
      c.save();
      c.translate(fx(0.5), fy(0.29));
      c.rotate(-0.1);
      var bw = fwid * 1.2, bh = dh * 0.07, bend = bh * 0.35;
      // bande galbée (suit la courbe du front), bords effilochés
      var band = function () {
        c.beginPath();
        c.moveTo(-bw / 2, -bh / 2 + bend);
        c.quadraticCurveTo(0, -bh / 2 - bend, bw / 2, -bh / 2 + bend);
        c.lineTo(bw / 2 - 1, bh / 2 + bend);
        c.quadraticCurveTo(0, bh / 2 - bend, -bw / 2 + 1, bh / 2 + bend);
        c.closePath();
      };
      c.save(); band(); c.clip();
      var gz = c.createLinearGradient(0, -bh, 0, bh);
      gz.addColorStop(0, 'rgba(226,219,204,0.97)'); gz.addColorStop(1, 'rgba(176,168,152,0.97)');
      c.fillStyle = gz; c.fillRect(-bw, -bh * 2, bw * 2, bh * 4);
      c.strokeStyle = 'rgba(110,100,86,0.35)'; c.lineWidth = Math.max(0.5, dw * 0.0018);
      for (var j = -bw / 2; j < bw / 2; j += Math.max(2.5, dw * 0.011)) { c.beginPath(); c.moveTo(j, -bh); c.lineTo(j + bh * 0.4, bh); c.stroke(); }
      var bl = c.createRadialGradient(bw * 0.2, 0, 1, bw * 0.2, 0, bh * 1.2);
      bl.addColorStop(0, 'rgba(115,18,12,0.85)'); bl.addColorStop(0.6, 'rgba(115,18,12,0.35)'); bl.addColorStop(1, 'rgba(115,18,12,0)');
      c.fillStyle = bl; c.fillRect(-bw, -bh * 2, bw * 2, bh * 4);
      c.restore();
      band(); c.strokeStyle = 'rgba(30,24,20,0.55)'; c.lineWidth = Math.max(0.5, dw * 0.0025); c.stroke();
      c.restore();
      if ((s.wound || 0) >= 60) {
        // coupure et hématome sur la pommette
        var cg = c.createRadialGradient(fx(0.66), fy(0.56), 1, fx(0.66), fy(0.56), fwid * 0.14);
        cg.addColorStop(0, 'rgba(60,20,25,0.55)'); cg.addColorStop(1, 'rgba(60,20,25,0)');
        c.fillStyle = cg; c.fillRect(fx(0.66) - fwid * 0.15, fy(0.56) - fwid * 0.15, fwid * 0.3, fwid * 0.3);
        c.strokeStyle = 'rgba(110,15,12,0.85)'; c.lineWidth = Math.max(0.8, dw * 0.004);
        c.beginPath(); c.moveTo(fx(0.63), fy(0.55)); c.lineTo(fx(0.69), fy(0.575)); c.stroke();
      }
    }
    // Vignette finale
    var vg = c.createRadialGradient(w / 2, h * 0.42, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,' + (M.tired ? 0.6 : 0.4) + ')');
    c.fillStyle = vg; c.fillRect(0, 0, w, h);
    c.restore();
  }

  // ------------------------------------------------------------ assemblage
  P_draw.SPEC = SPEC;
  function P_draw(c, s, w, h) {
    var pk = s.defId || s.id;
    if (PHOTOS[pk]) {
      var MM = {
        sad: (s.moral != null ? s.moral : 80) < 55, down: (s.moral != null ? s.moral : 80) < 30, broken: (s.moral != null ? s.moral : 80) < 15,
        tired: (s.fatigue || 0) >= 55, sick: (s.sick || 0) >= 30, wounded: (s.wound || 0) >= 30
      };
      drawPhoto(c, PHOTOS[pk], s, w, h, MM);
      return;
    }
    ctx = c; var key = s.defId || s.id;
    var S0 = SPEC[key];
    if (!S0) S0 = SPEC[Object.keys(SPEC)[C.util.hashStr(String(key)) % 8]];
    // Tête agrandie pour un cadrage « photo d'identité »
    var S = {}; for (var kk in S0) S[kk] = S0[kk];
    S.fw = S0.fw * 1.24; S.fh = S0.fh * 1.24;
    r = SK.rng(C.util.hashStr(String(key)) % 100000 + 11);
    var M = {
      sad: (s.moral != null ? s.moral : 80) < 55, down: (s.moral != null ? s.moral : 80) < 30, broken: (s.moral != null ? s.moral : 80) < 15,
      tired: (s.fatigue || 0) >= 55, sick: (s.sick || 0) >= 30, wounded: (s.wound || 0) >= 30
    };
    var k = Math.max(w / 200, h / 240);
    ctx.save();
    ctx.translate((w - 200 * k) / 2, (h - 240 * k) / 2 + (h > 150 ? 0 : 4 * k));
    ctx.scale(k, k);
    background();
    hairBack(S);
    var nw = torso(S);
    // cou
    var neck = [[CX - nw, CY + S.fh * 0.5], [CX + nw, CY + S.fh * 0.5], [CX + nw + 3, 176], [CX - nw - 3, 176]];
    fill(neck, dark(S.skin, 0.08));
    sideShade(neck, CX - nw, CX + nw, 0.05, 0.35);
    ctx.save(); smooth(neck, true); ctx.clip();
    var ns = ctx.createLinearGradient(0, CY + S.fh * 0.6, 0, CY + S.fh * 1.25);
    ns.addColorStop(0, 'rgba(35,22,14,0.5)'); ns.addColorStop(1, 'rgba(35,22,14,0)');
    ctx.fillStyle = ns; ctx.fillRect(0, 0, 200, 240); ctx.restore();
    pencil([[CX - nw, CY + S.fh * 0.6], [CX - nw - 2, 172]], false, 1.2, 0.7);
    pencil([[CX + nw, CY + S.fh * 0.6], [CX + nw + 2, 172]], false, 1.2, 0.7);
    if (S.neck > 1.2) curve(CX - 4, 166, CX, 170, CX + 5, 166, 0.9, 0.35);
    scarfFront(S, nw);
    if (S.clothes === 'overcoat') {
      // col relevé de part et d'autre du cou
      [-1, 1].forEach(function (sd) {
        var col = [[CX + sd * (nw + 2), 176], [CX + sd * (nw + 4), 140], [CX + sd * (nw + 16), 146], [CX + sd * (nw + 26), 182]];
        fill(col, sd < 0 ? light(S.cloth, 0.15) : dark(S.cloth, 0.15));
        pencil(col, true, 1.4, 0.85);
      });
    }
    ears(S);
    var F = face(S, M);
    beard(S, M);
    var ey = CY - S.fh * 0.08, t = S.turn * S.fw;
    [-1, 1].forEach(function (sd) {
      var ex = CX + sd * S.fw * 0.42 + t * 0.9;
      brow(S, ex, ey - S.fw * 0.27 * S.eye * 1.35, sd, M);
      eye(S, ex, ey, sd, M);
    });
    var N = nose(S, M);
    var Mo = mouth(S, M, N);
    extras(S, M, N, Mo);
    pencil(F, true, 1.35, 0.8);
    hairFront(S);
    hat(S);
    if (S.hairStyle === 'long') { /* le crayon passe par-dessus les cheveux */ }
    mood(S, M, F);
    // Vignette finale
    var vg = ctx.createRadialGradient(100, 110, 60, 100, 120, 170);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, 200, 240);
    ctx.restore();
  }

  C.Portrait = { draw: P_draw, SPEC: SPEC };
})(window.CQR);
