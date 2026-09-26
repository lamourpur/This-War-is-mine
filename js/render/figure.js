/* =========================================================
   Personnages : squelette articulé dessiné au crayon
   - jambes et bras en deux segments (cuisse/tibia, bras/avant-bras)
   - vrai cycle de marche, posture selon le moral et la fatigue
   - vêtements (manteau, col, boutons, écharpe), visage de profil
   - accessoires liés aux traits (sac, brassard, ceinture à outils…)
   - outil en main selon l'action (marteau, pelle, scie, cuillère…)
   Repère local : pieds en (0,0), personnage tourné vers +x.
   ========================================================= */
(function (C) {
  'use strict';

  var SK = C.Sketch, U = C.util;
  var F = C.Figure = { BASE: 92 };
  var INK = '#161513';

  F.height = function (s) { return F.BASE * s.look.h; };

  // ------------------------------------------------------------ primitives
  function vec(a, len) { return [Math.sin(a) * len, Math.cos(a) * len]; }
  function add(p, v) { return [p[0] + v[0], p[1] + v[1]]; }

  // Membre galbé : volume (renflement côté muscle), dégradé de lumière venant
  // de l'avant-haut, contour à l'encre, trame de tissu légère
  // opts : { bulge (renflement), crease (plis au bout), weave (trame) }
  function limb(ctx, r, a, b, w1, w2, color, ink, opts) {
    opts = opts || {};
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / L, ny = dx / L;
    if (nx < 0) { nx = -nx; ny = -ny; }          // n pointe vers l'avant (côté éclairé)
    var bu = (opts.bulge != null ? opts.bulge : 0.12) * (w1 + w2);
    var m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], wm = (w1 + w2) / 2;
    var p0 = [a[0] + nx * w1 / 2, a[1] + ny * w1 / 2], p1 = [b[0] + nx * w2 / 2, b[1] + ny * w2 / 2];
    var p2 = [b[0] - nx * w2 / 2, b[1] - ny * w2 / 2], p3 = [a[0] - nx * w1 / 2, a[1] - ny * w1 / 2];
    var c0 = [m[0] + nx * (wm / 2 + bu * 0.35), m[1] + ny * (wm / 2 + bu * 0.35)];
    var c1 = [m[0] - nx * (wm / 2 + bu), m[1] - ny * (wm / 2 + bu)];
    function path() {
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.quadraticCurveTo(c0[0], c0[1], p1[0], p1[1]);
      ctx.quadraticCurveTo(b[0] + dx / L * w2 * 0.75, b[1] + dy / L * w2 * 0.75, p2[0], p2[1]);   // bout arrondi
      ctx.quadraticCurveTo(c1[0], c1[1], p3[0], p3[1]);
      ctx.quadraticCurveTo(a[0] - dx / L * w1 * 0.75, a[1] - dy / L * w1 * 0.75, p0[0], p0[1]);
      ctx.closePath();
    }
    var g = ctx.createLinearGradient(m[0] + nx * wm * 0.6, m[1] + ny * wm * 0.6, m[0] - nx * wm * 0.7, m[1] - ny * wm * 0.7);
    g.addColorStop(0, shade(color, 1.28)); g.addColorStop(0.35, color); g.addColorStop(1, shade(color, 0.62));
    ctx.fillStyle = g;
    path(); ctx.fill();
    if (opts.weave !== false) {
      ctx.save(); path(); ctx.clip();
      ctx.strokeStyle = 'rgba(15,13,11,0.16)'; ctx.lineWidth = 0.45;
      for (var k = -3; k <= 3; k++) {
        var o1 = [a[0] - nx * k * wm * 0.22, a[1] - ny * k * wm * 0.22];
        ctx.beginPath(); ctx.moveTo(o1[0] - dx * 0.1, o1[1] - dy * 0.1); ctx.lineTo(o1[0] + dx * 1.1, o1[1] + dy * 1.1); ctx.stroke();
      }
      ctx.restore();
    }
    // Plis de tissu à l'articulation
    if (opts.crease) {
      ctx.strokeStyle = 'rgba(15,13,11,0.45)'; ctx.lineWidth = 0.6;
      for (var c = 0; c < 2; c++) {
        var q = [b[0] - dx / L * (2 + c * 2.2), b[1] - dy / L * (2 + c * 2.2)];
        ctx.beginPath(); ctx.moveTo(q[0] - nx * w2 * 0.45, q[1] - ny * w2 * 0.45);
        ctx.quadraticCurveTo(q[0] + dx / L * 1.2, q[1] + dy / L * 1.2, q[0] + nx * w2 * 0.1, q[1] + ny * w2 * 0.1); ctx.stroke();
      }
    }
    if (ink !== false) {
      ctx.strokeStyle = 'rgba(20,18,16,0.92)'; ctx.lineWidth = 0.95;
      path(); ctx.stroke();
      // liseré de lumière côté avant
      ctx.strokeStyle = 'rgba(240,230,205,0.22)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(p0[0] - nx * 0.8, p0[1] - ny * 0.8); ctx.quadraticCurveTo(c0[0] - nx * 0.8, c0[1] - ny * 0.8, p1[0] - nx * 0.8, p1[1] - ny * 0.8); ctx.stroke();
    }
  }

  function shade(color, k) {
    var n = parseInt(color.slice(1), 16);
    var R = Math.round(((n >> 16) & 255) * k), G2 = Math.round(((n >> 8) & 255) * k), B = Math.round((n & 255) * k);
    return 'rgb(' + Math.min(255, R) + ',' + Math.min(255, G2) + ',' + Math.min(255, B) + ')';
  }

  function polyPath(ctx, pts) {
    ctx.beginPath();
    pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
  }

  // ------------------------------------------------------------ poses
  // Angles des membres : 0 = vers le bas, positif = vers l'avant
  // jambe : a1 (cuisse), bend (flexion du genou, le tibia part vers l'arrière)
  // bras  : a (bras), bend (flexion du coude, l'avant-bras part vers l'avant)
  var TOOL_FOR = {
    craft: 'hammer', upgrade: 'hammer', board: 'hammer', doorup: 'hammer',
    cut: 'saw', dismantle: 'saw', cook: 'spoon', water: 'can', fuel: 'log',
    eat: 'food', coffee: 'cup', drink: 'cup', smoke: 'cig', read: 'book', heal: 'bandage', medicate: 'pill', care: 'bandage'
  };

  F.pose = function (s, t) {
    var a = s.act, working = a && a.phase === 'work', kind = working ? a.kind : null;
    var walking = s.path.length > 0;
    var ph = (s.x + s.y) * 0.085;
    var sw = Math.sin(t * 8 + s.anim);
    var low = s.moral < 35, tired = s.fatigue >= 70;
    var P = {
      kind: 'stand', lean: 0, head: 0, bob: 0, tool: null,
      legs: [{ a1: 0.06, bend: 0.04 }, { a1: -0.05, bend: 0.03 }],
      arms: [{ a: -0.06, bend: 0.18 }, { a: 0.05, bend: 0.22 }],
      eyes: 'open', mouth: low ? 'sad' : 'flat', brow: low ? 'sad' : 'calm'
    };

    if (kind === 'sleep' || kind === 'sleepfloor') {
      P.kind = 'lie'; P.eyes = 'closed';
      P.legs = [{ a1: 0.05, bend: 0.12 }, { a1: -0.02, bend: 0.06 }];
      P.arms = [{ a: 0.05, bend: 0.1 }, { a: 0.12, bend: 0.5 }];
      return P;
    }
    if (kind === 'rest' || kind === 'read') {
      P.kind = 'sit';
      P.legs = [{ a1: 1.45, bend: 1.3 }, { a1: 1.4, bend: 1.2 }];
      P.lean = -0.08;
      if (kind === 'read') { P.arms = [{ a: 0.35, bend: 1.5 }, { a: 0.45, bend: 1.55 }]; P.tool = 'book'; P.head = 0.28; }
      else { P.arms = [{ a: 0.55, bend: 0.5 }, { a: 0.65, bend: 0.45 }]; P.head = low ? 0.3 : 0.05; P.eyes = s.fatigue > 40 ? 'half' : 'open'; }
      return P;
    }

    if (walking) {
      P.kind = 'walk';
      var amp = s.wound >= 30 ? 0.3 : 0.44;
      P.legs = [
        { a1: amp * Math.sin(ph), bend: 0.08 + 0.8 * Math.max(0, Math.cos(ph)) },
        { a1: amp * Math.sin(ph + Math.PI), bend: 0.08 + 0.8 * Math.max(0, Math.cos(ph + Math.PI)) }
      ];
      P.arms = [
        { a: 0.38 * Math.sin(ph), bend: 0.25 + 0.25 * Math.max(0, Math.sin(ph)) },
        { a: -0.38 * Math.sin(ph), bend: 0.25 + 0.25 * Math.max(0, -Math.sin(ph)) }
      ];
      P.lean = 0.06 + (tired ? 0.08 : 0) + (low ? 0.05 : 0);
      P.head = low ? 0.2 : 0;
      return P;
    }

    switch (kind) {
      case 'clear':
        P.kind = 'dig'; P.lean = 0.38;
        P.legs = [{ a1: 0.32, bend: 0.45 }, { a1: -0.28, bend: 0.12 }];
        P.arms = [{ a: 0.75 + 0.35 * sw, bend: 0.25 }, { a: 0.45 + 0.35 * sw, bend: 0.35 }];
        P.tool = C.Game.count('pelle') > 0 ? 'shovel' : null;
        P.head = -0.1;
        break;
      case 'search': case 'collect': case 'unlock': case 'answer':
        if (kind === 'answer') { P.arms[1] = { a: 1.2, bend: 0.3 }; break; }
        P.kind = 'reach'; P.lean = 0.32;
        P.legs = [{ a1: 0.25, bend: 0.35 }, { a1: -0.18, bend: 0.1 }];
        P.arms = [{ a: 0.95 + 0.25 * Math.sin(t * 5), bend: 0.25 }, { a: 1.1 + 0.25 * Math.sin(t * 5 + 2), bend: 0.2 }];
        P.tool = kind === 'unlock' ? (a.p && a.p.tool === 'passe_partout' ? 'pick' : 'crowbar') : null;
        break;
      case 'fuel': case 'water':
        P.kind = 'crouch'; P.lean = 0.25;
        P.legs = [{ a1: 1.2, bend: 2.1 }, { a1: 0.7, bend: 1.7 }];
        P.arms = [{ a: 0.6, bend: 0.4 }, { a: 1.0 + 0.2 * Math.sin(t * 4), bend: 0.3 }];
        P.tool = TOOL_FOR[kind];
        break;
      case 'cut': case 'dismantle':
        P.kind = 'saw'; P.lean = 0.14;
        P.legs = [{ a1: 0.22, bend: 0.2 }, { a1: -0.16, bend: 0.06 }];
        P.arms = [{ a: 0.9, bend: 0.6 }, { a: 1.05 + 0.25 * Math.sin(t * 7), bend: 0.35 + 0.35 * Math.sin(t * 7) }];
        P.tool = 'saw';
        break;
      case 'cook':
        P.kind = 'work'; P.lean = 0.06;
        P.arms = [{ a: 0.25, bend: 0.4 }, { a: 0.75, bend: 0.85 + 0.25 * Math.sin(t * 4) }];
        P.tool = 'spoon';
        break;
      case 'craft': case 'upgrade': case 'board': case 'doorup':
        P.kind = 'work'; P.lean = 0.1;
        P.legs = [{ a1: 0.16, bend: 0.12 }, { a1: -0.12, bend: 0.05 }];
        var hit = 0.5 + 0.5 * sw;
        P.arms = [{ a: 0.8, bend: 0.7 }, { a: 1.0 + 1.25 * hit, bend: 0.35 + 0.25 * hit }];
        P.tool = (kind === 'craft' || kind === 'upgrade') && Math.floor(t / 3.5) % 2 ? 'saw' : 'hammer';
        if (P.tool === 'saw') P.arms[1] = { a: 1.05 + 0.25 * Math.sin(t * 7), bend: 0.4 + 0.35 * Math.sin(t * 7) };
        break;
      case 'eat': case 'coffee': case 'drink': case 'smoke':
        var m = 0.5 + 0.5 * Math.sin(t * 1.6);
        P.arms = [{ a: -0.05, bend: 0.2 }, { a: 0.35 + 0.1 * m, bend: 1.55 + 0.95 * m }];
        P.tool = TOOL_FOR[kind]; P.head = -0.05 * m;
        break;
      case 'heal': case 'medicate': case 'care':
        P.arms = [{ a: 0.5, bend: 1.2 + 0.2 * Math.sin(t * 3) }, { a: 0.6, bend: 1.4 + 0.2 * Math.sin(t * 3 + 1) }];
        P.tool = TOOL_FOR[kind]; P.head = 0.25;
        break;
      case 'talk':
        P.arms = [{ a: 0.02, bend: 0.3 }, { a: 0.45 + 0.25 * Math.sin(t * 2.3), bend: 0.9 + 0.5 * Math.sin(t * 3.1) }];
        P.head = 0.05 * Math.sin(t * 2); P.mouth = Math.sin(t * 9) > 0 ? 'open' : 'flat';
        break;
      case 'listen': case 'news': case 'music':
        P.arms = [{ a: 0.35, bend: 1.45 }, { a: 0.3, bend: 1.5 }];
        P.head = 0.12 + 0.06 * Math.sin(t * 1.3);
        break;
    }

    // Posture générale : moral bas / épuisement
    if (P.kind === 'stand') {
      var breath = Math.sin(t * 2 + s.anim) * 0.02;
      P.arms[0].a += breath; P.arms[1].a -= breath;
      if (low) { P.lean += 0.1; P.head += 0.3; P.arms = [{ a: 0.02, bend: 0.05 }, { a: 0.04, bend: 0.08 }]; }
      if (tired) { P.lean += 0.06; P.head += 0.12; P.eyes = 'half'; }
      // Toux quand malade
      if (s.sick >= 30 && Math.sin(t * 0.9 + s.anim) > 0.93) { P.head += 0.35; P.lean += 0.12; P.arms[1] = { a: 0.5, bend: 2.3 }; }
    }
    if (s.fatigue >= 55 && P.eyes === 'open') P.eyes = 'half';
    return P;
  };

  // ------------------------------------------------------------ dessin
  // opts : { t, sel, portrait }
  F.draw = function (ctx, s, x, y, dir, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    var L = s.look, H = F.height(s);
    var seed = U.hashStr(s.id) + Math.floor(t * 6);
    var r = SK.rng(seed);
    var P = opts.pose || F.pose(s, t);
    var coat = L.coat, pants = L.pants || '#2c2a27', skin = L.skin;
    var build = L.build;

    var thigh = 0.245 * H, shin = 0.245 * H, uarm = 0.17 * H, farm = 0.16 * H, ankle = 0.035 * H;
    var hw = 0.1 * H * build;             // demi-largeur du torse
    var torsoH = 0.31 * H;

    ctx.save();
    ctx.translate(x, y);
    if (P.kind === 'lie') {
      ctx.rotate(-Math.PI / 2);
    } else {
      // Ombre au sol
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath(); ctx.ellipse(0, 0, hw * 1.6, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.scale(dir, 1);
    }

    // Hauteur des hanches : le pied le plus bas touche le sol
    function legExt(l) { return thigh * Math.cos(l.a1) + shin * Math.cos(l.a1 - l.bend); }
    var hipY = -(Math.max(legExt(P.legs[0]), legExt(P.legs[1])) + ankle);
    var hip = [0, hipY];

    // ---- jambes
    function drawLeg(l, front) {
      var hp = [front ? 0.02 * H : -0.02 * H, hipY];
      var knee = add(hp, vec(l.a1, thigh));
      var ank = add(knee, vec(l.a1 - l.bend, shin));
      var col = front ? pants : shade(pants, 0.72);
      limb(ctx, r, hp, knee, 0.1 * H * Math.min(1.15, build), 0.074 * H, col, true, { bulge: 0.14, crease: l.bend > 0.3 });
      limb(ctx, r, knee, ank, 0.074 * H, 0.062 * H, col, true, { bulge: 0.1 });
      // Pli du pantalon au genou, ourlet tassé sur la chaussure
      SK.line(ctx, r, knee[0] - 1, knee[1] - 2, knee[0] + 2, knee[1] + 3, { w: 0.6, passes: 1, color: INK, alpha: 0.45 });
      var hemp = add(knee, vec(l.a1 - l.bend, shin * 0.9));
      SK.line(ctx, r, hemp[0] - 0.03 * H, hemp[1], hemp[0] + 0.03 * H, hemp[1] + 0.5, { w: 0.6, passes: 1, color: INK, alpha: 0.55 });
      // Chaussure : tige de cuir, semelle, reflet sur le bout
      var fa = (l.a1 - l.bend) * 0.35;
      ctx.save();
      ctx.translate(ank[0], ank[1]);
      ctx.rotate(-fa);
      var shoe = [[-0.032 * H, -0.03 * H], [0.028 * H, -0.036 * H], [0.06 * H, -0.012 * H], [0.092 * H, 0.004 * H], [0.094 * H, ankle * 0.72], [-0.038 * H, ankle * 0.72]];
      var sg = ctx.createLinearGradient(0, -0.035 * H, 0, ankle);
      sg.addColorStop(0, front ? '#3a342d' : '#221e1a'); sg.addColorStop(1, front ? '#171513' : '#0e0d0c');
      ctx.fillStyle = sg; polyPath(ctx, shoe); ctx.fill();
      ctx.fillStyle = '#0b0a09';
      ctx.fillRect(-0.04 * H, ankle * 0.68, 0.136 * H, ankle * 0.32);
      ctx.strokeStyle = 'rgba(20,18,16,0.95)'; ctx.lineWidth = 0.8; polyPath(ctx, shoe); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,220,200,0.3)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(0.045 * H, -0.018 * H); ctx.quadraticCurveTo(0.075 * H, -0.006 * H, 0.085 * H, 0.004 * H); ctx.stroke();
      // lacets
      ctx.strokeStyle = 'rgba(200,190,170,0.35)'; ctx.lineWidth = 0.5;
      for (var lc = 0; lc < 3; lc++) { ctx.beginPath(); ctx.moveTo(0.005 * H + lc * 0.011 * H, -0.03 * H + lc * 0.006 * H); ctx.lineTo(0.02 * H + lc * 0.011 * H, -0.024 * H + lc * 0.006 * H); ctx.stroke(); }
      ctx.restore();
    }

    // ---- bras (dans le repère du torse)
    function drawArm(ar, front, tool) {
      var sh = [front ? -hw * 0.02 : -hw * 0.45, -torsoH + 0.04 * H];
      var el = add(sh, vec(ar.a, uarm));
      var hand = add(el, vec(ar.a + ar.bend, farm));
      var col = front ? coat : shade(coat, 0.7);
      limb(ctx, r, sh, el, 0.072 * H * Math.min(1.2, build), 0.056 * H, col, true, { bulge: 0.16, crease: ar.bend > 0.45 });
      limb(ctx, r, el, hand, 0.056 * H, 0.048 * H, col, true, { bulge: 0.1 });
      // Poignet de manche (revers)
      var cuff = add(el, vec(ar.a + ar.bend, farm * 0.8));
      var cd = vec(ar.a + ar.bend, 1), cn = [-cd[1], cd[0]];
      ctx.strokeStyle = 'rgba(20,18,16,0.85)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cuff[0] - cn[0] * 0.03 * H, cuff[1] - cn[1] * 0.03 * H); ctx.lineTo(cuff[0] + cn[0] * 0.03 * H, cuff[1] + cn[1] * 0.03 * H); ctx.stroke();
      if (front && s.traits.indexOf('soigneur') >= 0) {
        var mid = add(sh, vec(ar.a, uarm * 0.45));
        ctx.save(); ctx.translate(mid[0], mid[1]); ctx.rotate(-ar.a);
        ctx.fillStyle = '#d9d4c8'; ctx.fillRect(-0.04 * H, -0.02 * H, 0.08 * H, 0.04 * H);
        ctx.fillStyle = '#8c3a2a'; ctx.fillRect(-0.006 * H, -0.017 * H, 0.012 * H, 0.034 * H); ctx.fillRect(-0.017 * H, -0.006 * H, 0.034 * H, 0.012 * H);
        ctx.restore();
      }
      if (tool) drawTool(tool, hand, ar.a + ar.bend);
      // Main : paume, doigts repliés, pouce
      var ha = ar.a + ar.bend, hd = vec(ha, 1), hn = [-hd[1], hd[0]];
      var hs = front ? skin : shade(skin, 0.72);
      var hg = ctx.createLinearGradient(hand[0] + hn[0] * 3, hand[1] + hn[1] * 3, hand[0] - hn[0] * 3, hand[1] - hn[1] * 3);
      hg.addColorStop(0, shade(hs.charAt(0) === '#' ? hs : skin, 1.12)); hg.addColorStop(1, shade(skin, front ? 0.7 : 0.55));
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.ellipse(hand[0] + hd[0] * 0.006 * H, hand[1] + hd[1] * 0.006 * H, 0.021 * H, 0.028 * H, -ha, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(22,21,19,0.85)'; ctx.lineWidth = 0.7; ctx.stroke();
      // pouce
      var th = [hand[0] + hn[0] * 0.02 * H - hd[0] * 0.004 * H, hand[1] + hn[1] * 0.02 * H - hd[1] * 0.004 * H];
      ctx.beginPath(); ctx.ellipse(th[0], th[1], 0.008 * H, 0.014 * H, -ha + 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // jointures
      ctx.strokeStyle = 'rgba(22,21,19,0.4)'; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.moveTo(hand[0] + hd[0] * 0.018 * H - hn[0] * 0.012 * H, hand[1] + hd[1] * 0.018 * H - hn[1] * 0.012 * H);
      ctx.lineTo(hand[0] + hd[0] * 0.018 * H + hn[0] * 0.012 * H, hand[1] + hd[1] * 0.018 * H + hn[1] * 0.012 * H); ctx.stroke();
      return hand;
    }

    function drawTool(tool, hand, ang) {
      var d = [Math.sin(ang), Math.cos(ang)];          // direction de l'avant-bras
      var n = [-d[1], d[0]];
      var o = { w: 1.6, passes: 1, j: 0.2, color: '#2b2622' };
      var tip;
      switch (tool) {
        case 'hammer':
          tip = [hand[0] + d[0] * 0.14 * H, hand[1] + d[1] * 0.14 * H];
          SK.line(ctx, r, hand[0] - d[0] * 3, hand[1] - d[1] * 3, tip[0], tip[1], { w: 2.2, passes: 1, color: '#5a4a3a' });
          SK.line(ctx, r, tip[0] - n[0] * 7, tip[1] - n[1] * 7, tip[0] + n[0] * 5, tip[1] + n[1] * 5, { w: 4.5, passes: 1, color: '#3a3c3f' });
          break;
        case 'shovel':
          var back = [hand[0] - d[0] * 0.12 * H, hand[1] - d[1] * 0.12 * H];
          tip = [hand[0] + d[0] * 0.38 * H, hand[1] + d[1] * 0.38 * H];
          SK.line(ctx, r, back[0], back[1], tip[0], tip[1], { w: 2.4, passes: 1, color: '#5a4a3a' });
          var bl = [[tip[0] - n[0] * 6, tip[1] - n[1] * 6], [tip[0] + n[0] * 6, tip[1] + n[1] * 6], [tip[0] + n[0] * 5 + d[0] * 14, tip[1] + n[1] * 5 + d[1] * 14], [tip[0] - n[0] * 5 + d[0] * 14, tip[1] - n[1] * 5 + d[1] * 14]];
          ctx.fillStyle = '#4a4c4f'; polyPath(ctx, bl); ctx.fill();
          SK.poly(ctx, r, bl, true, { w: 0.8, passes: 1, color: INK });
          break;
        case 'saw':
          var s0 = [hand[0] + d[0] * 3, hand[1] + d[1] * 3], s1 = [hand[0] + d[0] * 0.24 * H, hand[1] + d[1] * 0.24 * H];
          var blade = [s0, s1, [s1[0] + n[0] * 6, s1[1] + n[1] * 6], [s0[0] + n[0] * 9, s0[1] + n[1] * 9]];
          ctx.fillStyle = '#8b8d90'; polyPath(ctx, blade); ctx.fill();
          SK.poly(ctx, r, blade, true, { w: 0.7, passes: 1, color: INK });
          for (var i = 1; i < 8; i++) { var q = [U.lerp(s0[0], s1[0], i / 8) + n[0] * 8.5, U.lerp(s0[1], s1[1], i / 8) + n[1] * 8.5]; ctx.fillStyle = INK; ctx.fillRect(q[0], q[1], 1, 1); }
          ctx.fillStyle = '#5a4a3a'; ctx.fillRect(hand[0] - 3, hand[1] - 3, 6, 6);
          break;
        case 'crowbar':
          tip = [hand[0] + d[0] * 0.22 * H, hand[1] + d[1] * 0.22 * H];
          SK.line(ctx, r, hand[0] - d[0] * 4, hand[1] - d[1] * 4, tip[0], tip[1], { w: 2.4, passes: 1, color: '#6a2d22' });
          SK.line(ctx, r, tip[0], tip[1], tip[0] + n[0] * 5 - d[0] * 3, tip[1] + n[1] * 5 - d[1] * 3, { w: 2.2, passes: 1, color: '#6a2d22' });
          break;
        case 'pick':
          SK.line(ctx, r, hand[0], hand[1], hand[0] + d[0] * 9, hand[1] + d[1] * 9, { w: 1, passes: 1, color: '#9a9c9e' });
          break;
        case 'spoon':
          tip = [hand[0] + d[0] * 0.12 * H, hand[1] + d[1] * 0.12 * H];
          SK.line(ctx, r, hand[0], hand[1], tip[0], tip[1], o);
          ctx.fillStyle = '#2b2622'; ctx.beginPath(); ctx.ellipse(tip[0], tip[1], 2.5, 1.6, ang, 0, Math.PI * 2); ctx.fill();
          break;
        case 'can':
          ctx.fillStyle = '#55585b'; ctx.fillRect(hand[0] - 5, hand[1] - 2, 11, 9);
          SK.rect(ctx, r, hand[0] - 5, hand[1] - 2, 11, 9, { w: 0.7, passes: 1, color: INK });
          SK.line(ctx, r, hand[0] + 6, hand[1], hand[0] + 13, hand[1] - 5, { w: 1.4, passes: 1, color: INK });
          break;
        case 'log':
          SK.line(ctx, r, hand[0] - n[0] * 7, hand[1] - n[1] * 7, hand[0] + n[0] * 7, hand[1] + n[1] * 7, { w: 5, passes: 1, color: '#6b5a45' });
          break;
        case 'food': case 'cup':
          ctx.fillStyle = tool === 'cup' ? '#6b645a' : '#7b7f82';
          ctx.fillRect(hand[0] - 2.5, hand[1] - 6, 5, 7);
          SK.rect(ctx, r, hand[0] - 2.5, hand[1] - 6, 5, 7, { w: 0.6, passes: 1, color: INK });
          break;
        case 'cig':
          SK.line(ctx, r, hand[0], hand[1], hand[0] + 4, hand[1] - 2, { w: 1.4, passes: 1, color: '#e6e0d2' });
          ctx.fillStyle = '#e07a3a'; ctx.fillRect(hand[0] + 3.5, hand[1] - 3, 1.5, 1.5);
          break;
        case 'book':
          var bk = [[hand[0] - 2, hand[1] - 9], [hand[0] + 9, hand[1] - 11], [hand[0] + 10, hand[1] + 1], [hand[0] - 1, hand[1] + 3]];
          ctx.fillStyle = '#cfc6b2'; polyPath(ctx, bk); ctx.fill();
          SK.poly(ctx, r, bk, true, { w: 0.7, passes: 1, color: INK });
          SK.line(ctx, r, hand[0] + 4, hand[1] - 10, hand[0] + 4.5, hand[1] + 2, { w: 0.5, passes: 1, color: INK });
          break;
        case 'bandage':
          ctx.fillStyle = '#e4dfd3'; ctx.beginPath(); ctx.arc(hand[0] + 2, hand[1] - 2, 3.2, 0, Math.PI * 2); ctx.fill();
          break;
        case 'pill':
          ctx.fillStyle = '#d9d4c8'; ctx.fillRect(hand[0], hand[1] - 3, 3, 2);
          break;
      }
    }

    function torsoFrame(fn) {
      ctx.save();
      ctx.translate(hip[0], hip[1]);
      ctx.rotate(P.lean);
      fn();
      ctx.restore();
    }

    // 1. bras arrière
    torsoFrame(function () { drawArm(P.arms[0], false, null); });
    // 2. jambe arrière
    drawLeg(P.legs[1], false);
    // 3. sac à dos
    if (L.bag || s.traits.indexOf('grand_sac') >= 0) torsoFrame(function () {
      var bag = [[-hw * 0.9, -torsoH + 0.03 * H], [-hw * 0.9 - 0.1 * H, -torsoH + 0.05 * H], [-hw * 0.9 - 0.12 * H, -0.02 * H], [-hw * 0.8, 0]];
      ctx.fillStyle = '#4b4638'; polyPath(ctx, bag); ctx.fill();
      SK.hatchPoly(ctx, r, bag, { gap: 3, alpha: 0.35, angle: 1.2 });
      SK.poly(ctx, r, bag, true, { w: 1.1, passes: 1, color: INK });
      SK.line(ctx, r, -hw * 0.95 - 0.06 * H, -torsoH * 0.55, -hw * 0.95 - 0.1 * H, -torsoH * 0.55, { w: 0.8, passes: 1, color: INK });
    });
    // 4. jambe avant
    drawLeg(P.legs[0], true);

    // 5. torse + manteau
    torsoFrame(function () {
      var belly = build > 1.1 ? 0.03 * H : 0;
      var fem = !!L.female;
      // Silhouette : dos, omoplate, épaule arrondie, poitrine, taille, hanche
      var torso = [
        [-hw * 0.95, 0.02 * H], [-hw * (fem ? 0.9 : 1.02), -0.12 * H], [-hw * 1.02, -0.22 * H], [-hw * 0.88, -torsoH + 0.02 * H],
        [-hw * 0.45, -torsoH - 0.012 * H], [hw * 0.3, -torsoH - 0.012 * H], [hw * 0.8, -torsoH + 0.02 * H],
        [hw * (fem ? 1.12 : 1.0), -0.23 * H], [hw * (fem ? 0.9 : 0.98) + belly, -0.13 * H], [hw * (fem ? 1.02 : 0.96), 0.02 * H]
      ];
      function tpath(pts) {
        ctx.beginPath();
        var n = pts.length, m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
        ctx.moveTo(m0[0], m0[1]);
        for (var i = 0; i < n; i++) { var p = pts[i], q = pts[(i + 1) % n]; ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
        ctx.closePath();
      }
      var hem = (L.coatLen || 0) * H;
      var sway = P.kind === 'walk' ? Math.sin((s.x + s.y) * 0.085) * 2.5 : 0;
      var skirt = hem > 0 ? [[-hw * 0.97, -0.03 * H], [hw * 0.97, -0.03 * H], [hw * 1.12 + sway, hem], [hw * 0.3 + sway, hem + 0.006 * H], [-hw * 1.18 + sway, hem]] : null;
      function clothGrad() {
        var g = ctx.createLinearGradient(-hw * 1.1, 0, hw * 1.1, 0);
        g.addColorStop(0, shade(coat, 0.6)); g.addColorStop(0.55, coat); g.addColorStop(0.85, shade(coat, 1.22)); g.addColorStop(1, shade(coat, 1.05));
        return g;
      }
      // Capuche (sweat) : retombe dans le dos
      if (L.top === 'hoodie') {
        ctx.fillStyle = shade(coat, 0.75);
        ctx.beginPath(); ctx.ellipse(-hw * 0.45, -torsoH + 0.01 * H, hw * 0.55, 0.045 * H, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(20,18,16,0.9)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
      if (skirt) {
        ctx.fillStyle = clothGrad(); polyPath(ctx, skirt); ctx.fill();
        ctx.strokeStyle = 'rgba(20,18,16,0.9)'; ctx.lineWidth = 1; polyPath(ctx, skirt); ctx.stroke();
        // plis du pan
        ctx.strokeStyle = 'rgba(15,13,11,0.4)'; ctx.lineWidth = 0.6;
        [0.35, -0.2, -0.6].forEach(function (u) { ctx.beginPath(); ctx.moveTo(hw * u, -0.01 * H); ctx.quadraticCurveTo(hw * u + sway * 0.4 + 1, hem * 0.5, hw * u * 1.1 + sway, hem - 1); ctx.stroke(); });
      }
      ctx.fillStyle = clothGrad(); tpath(torso); ctx.fill();
      // Ombre portée des bras / aisselle, et bas du vêtement plus sombre
      ctx.save(); tpath(torso); ctx.clip();
      var vg = ctx.createLinearGradient(0, -torsoH, 0, 0.02 * H);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(0,0,0,0.05)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = vg; ctx.fillRect(-hw * 1.3, -torsoH - 2, hw * 2.6, torsoH + 4);
      SK.hatch(ctx, r, -hw * 1.2, -torsoH - 4, hw * 0.9, torsoH + 8, { gap: 2.4, alpha: 0.22, angle: -1.05 });
      // trame du tissu
      ctx.strokeStyle = 'rgba(15,13,11,0.1)'; ctx.lineWidth = 0.45;
      for (var tw = -hw * 1.2; tw < hw * 1.2; tw += 1.6) { ctx.beginPath(); ctx.moveTo(tw, -torsoH); ctx.lineTo(tw + 1, 0.02 * H); ctx.stroke(); }
      // Encolure ouverte : vêtement de dessous visible
      var inner = L.shirt || shade(coat, 1.35);
      var vn = [[hw * 0.12, -torsoH - 0.01 * H], [hw * 0.72, -torsoH + 0.012 * H], [hw * 0.62, -0.2 * H], [hw * 0.42, -0.2 * H]];
      ctx.fillStyle = inner; polyPath(ctx, vn); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(hw * 0.12, -torsoH - 0.01 * H, hw * 0.6, 0.025 * H);
      // Plis de drapé à la taille
      ctx.strokeStyle = 'rgba(15,13,11,0.42)'; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-hw * 0.6, -0.1 * H); ctx.quadraticCurveTo(-hw * 0.1, -0.07 * H, hw * 0.3, -0.11 * H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-hw * 0.3, -0.16 * H); ctx.quadraticCurveTo(0, -0.13 * H, hw * 0.25, -0.17 * H); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = 'rgba(20,18,16,0.95)'; ctx.lineWidth = 1.15;
      tpath(torso); ctx.stroke();
      // Couture latérale
      ctx.strokeStyle = 'rgba(15,13,11,0.35)'; ctx.lineWidth = 0.55;
      ctx.beginPath(); ctx.moveTo(-hw * 0.2, -torsoH + 0.05 * H); ctx.quadraticCurveTo(-hw * 0.3, -0.12 * H, -hw * 0.22, 0.02 * H); ctx.stroke();
      // Liseré de lumière côté face
      SK.line(ctx, r, hw * 0.92, -0.25 * H, hw * 0.95, -0.04 * H, { w: 1, passes: 1, color: 'rgba(235,225,200,0.3)' });
      // Revers / col selon le vêtement
      var collar = [[hw * 0.1, -torsoH - 0.008 * H], [hw * 0.45, -torsoH + 0.004 * H], [hw * 0.42, -0.2 * H], [hw * 0.3, -0.25 * H]];
      if (L.top === 'overcoat') collar = [[-hw * 0.2, -torsoH - 0.045 * H], [hw * 0.5, -torsoH - 0.03 * H], [hw * 0.55, -0.2 * H], [hw * 0.25, -0.26 * H]];
      ctx.fillStyle = shade(coat, 0.82); polyPath(ctx, collar); ctx.fill();
      ctx.strokeStyle = 'rgba(20,18,16,0.9)'; ctx.lineWidth = 0.75; polyPath(ctx, collar); ctx.stroke();
      // Fermeture : boutons (manteau) ou fermeture éclair (sweat, veste de travail)
      if (L.top === 'hoodie' || L.top === 'work') {
        ctx.strokeStyle = 'rgba(200,190,170,0.4)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.moveTo(hw * 0.62, -0.2 * H); ctx.lineTo(hw * 0.66, 0.0); ctx.stroke();
        if (L.top === 'hoodie') { SK.line(ctx, r, hw * 0.45, -torsoH + 0.01 * H, hw * 0.5, -0.2 * H, { w: 0.5, passes: 1, color: '#d8d0c0', alpha: 0.6 }); }
      } else {
        for (var b = 0; b < 3; b++) {
          ctx.fillStyle = '#131210'; ctx.beginPath(); ctx.arc(hw * 0.64, -0.19 * H + b * 0.065 * H, 0.95, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(220,210,190,0.35)'; ctx.fillRect(hw * 0.64 - 0.3, -0.19 * H + b * 0.065 * H - 0.6, 0.6, 0.4);
        }
      }
      // Poche à rabat
      var pk = [[hw * 0.05, -0.085 * H], [hw * 0.55, -0.09 * H], [hw * 0.53, -0.065 * H], [hw * 0.07, -0.062 * H]];
      ctx.fillStyle = shade(coat, 0.85); polyPath(ctx, pk); ctx.fill();
      ctx.strokeStyle = 'rgba(20,18,16,0.7)'; ctx.lineWidth = 0.6; polyPath(ctx, pk); ctx.stroke();
      // Gilet (cardigan) : bande de mailles côtelées au bas
      if (L.top === 'cardigan') {
        ctx.strokeStyle = 'rgba(15,13,11,0.35)'; ctx.lineWidth = 0.5;
        for (var cg = -hw * 0.9; cg < hw * 0.95; cg += 1.4) { ctx.beginPath(); ctx.moveTo(cg, -0.02 * H); ctx.lineTo(cg, 0.015 * H); ctx.stroke(); }
      }
      // Ceinture à outils (bricoleur)
      if (s.traits.indexOf('bricoleur') >= 0) {
        ctx.fillStyle = '#3b3128'; ctx.fillRect(-hw * 1.02, -0.03 * H, hw * 2.05, 0.035 * H);
        ctx.fillStyle = '#56483a'; ctx.fillRect(hw * 0.1, -0.02 * H, 0.05 * H, 0.06 * H);
        SK.rect(ctx, r, hw * 0.1, -0.02 * H, 0.05 * H, 0.06 * H, { w: 0.6, passes: 1, color: INK });
        SK.line(ctx, r, -hw * 0.3, -0.01 * H, -hw * 0.35, 0.07 * H, { w: 1.4, passes: 1, color: '#2e2b27' });
      }
      // Écharpe
      if (L.scarf) {
        ctx.fillStyle = L.scarf;
        ctx.beginPath(); ctx.ellipse(hw * 0.05, -torsoH + 0.005 * H, hw * 0.75, 0.03 * H, 0, 0, Math.PI * 2); ctx.fill();
        var tail = [[hw * 0.3, -torsoH + 0.02 * H], [hw * 0.55, -torsoH + 0.02 * H], [hw * 0.6 + sway * 0.5, -0.17 * H], [hw * 0.36 + sway * 0.5, -0.16 * H]];
        polyPath(ctx, tail); ctx.fill();
        SK.poly(ctx, r, tail, true, { w: 0.7, passes: 1, color: INK });
        SK.hatchPoly(ctx, r, tail, { gap: 2.5, alpha: 0.3, angle: 0.2 });
      }

      // 6. tête
      drawHead();
      // 7. bras avant (+ outil)
      drawArm(P.arms[1], true, P.tool);
    });

    function drawHead() {
      var neck = [0.01 * H, -torsoH];
      var ng = ctx.createLinearGradient(neck[0] - 0.03 * H, 0, neck[0] + 0.03 * H, 0);
      ng.addColorStop(0, shade(skin, 0.42)); ng.addColorStop(1, shade(skin, 0.72));
      ctx.fillStyle = ng;
      polyPath(ctx, [[neck[0] - 0.02 * H, neck[1] + 0.006 * H], [neck[0] - 0.006 * H, neck[1] - 0.042 * H], [neck[0] + 0.026 * H, neck[1] - 0.042 * H], [neck[0] + 0.026 * H, neck[1] + 0.006 * H]]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,18,16,0.8)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(neck[0] + 0.026 * H, neck[1] + 0.004 * H); ctx.lineTo(neck[0] + 0.026 * H, neck[1] - 0.038 * H); ctx.stroke();
      ctx.save();
      ctx.translate(neck[0] + 0.01 * H, neck[1] - 0.03 * H);
      ctx.rotate(P.head);
      var cy = -0.077 * H, rx = 0.069 * H, ry = 0.084 * H;
      var hc = L.hairColor || '#1f1d1a';
      // Masse de cheveux derrière la tête (longueur selon la coiffure)
      var hl = 'rgba(215,205,185,0.45)'; // reflets dans les cheveux
      function hairInk() { ctx.strokeStyle = 'rgba(15,13,11,0.9)'; ctx.lineWidth = 0.8; ctx.stroke(); ctx.fillStyle = hc; }
      ctx.fillStyle = hc;
      if (L.hair === 'long') {
        // longs et raides, tombent dans le dos jusqu'aux épaules
        var lb = [[rx * 0.2, cy - ry * 1.02], [-rx * 1.2, cy - ry * 0.45], [-rx * 1.38, cy + ry * 1.2], [-rx * 1.2, cy + ry * 2.05], [-rx * 0.15, cy + ry * 1.95], [rx * 0.05, cy + ry * 0.7]];
        polyPath(ctx, lb); ctx.fill(); hairInk();
        for (var ls = 0; ls < 4; ls++) SK.line(ctx, r, -rx * (1.05 - ls * 0.22), cy - ry * 0.2, -rx * (1.1 - ls * 0.25), cy + ry * 1.9, { w: 0.5, passes: 1, color: hl, alpha: 0.5 });
      } else if (L.hair === 'shoulder') {
        // mi-longs ondulés, s'arrêtent sur la nuque
        ctx.beginPath(); ctx.moveTo(rx * 0.2, cy - ry * 1.05);
        ctx.quadraticCurveTo(-rx * 1.5, cy - ry * 0.7, -rx * 1.35, cy + ry * 0.5);
        ctx.quadraticCurveTo(-rx * 1.55, cy + ry * 1.0, -rx * 1.1, cy + ry * 1.35);
        ctx.quadraticCurveTo(-rx * 0.7, cy + ry * 1.1, -rx * 0.35, cy + ry * 1.3);
        ctx.lineTo(-rx * 0.1, cy + ry * 0.6); ctx.closePath(); ctx.fill(); hairInk();
      } else if (L.hair === 'bob') {
        // carré droit à hauteur du menton
        polyPath(ctx, [[rx * 0.3, cy - ry * 1.05], [-rx * 1.2, cy - ry * 0.55], [-rx * 1.3, cy + ry * 0.95], [-rx * 0.2, cy + ry * 1.0], [rx * 0.0, cy + ry * 0.55]]); ctx.fill(); hairInk();
      } else if (L.hair === 'curly') {
        // boucles volumineuses jusqu'aux épaules
        [[-0.9, -0.7, 0.55], [-1.25, -0.1, 0.55], [-1.3, 0.55, 0.5], [-1.05, 1.1, 0.48], [-0.45, 1.15, 0.42], [-0.3, -1.0, 0.55], [0.35, -1.05, 0.45]].forEach(function (c3) {
          ctx.beginPath(); ctx.arc(rx * c3[0], cy + ry * c3[1], rx * c3[2], 0, Math.PI * 2); ctx.fill();
        });
      }
      if (L.hair === 'scarf') {
        ctx.fillStyle = L.scarfHead || '#4f4b45';
        polyPath(ctx, [[-rx * 0.6, cy + ry * 0.6], [-rx * 1.5, cy + ry * 1.3], [-rx * 1.1, cy + ry * 1.6], [-rx * 0.2, cy + ry * 1.0]]); ctx.fill();
      }
      // Profil du visage : crâne, front, nez, lèvres, menton, mâchoire
      var prof = [
        [0, cy - ry], [rx * 0.62, cy - ry * 0.82], [rx * 0.9, cy - ry * 0.45], [rx * 0.95, cy - ry * 0.18],
        [rx * (L.nose === 'broken' ? 1.2 : L.nose === 'small' ? 1.08 : 1.13), cy + ry * 0.14], [rx * 0.98, cy + ry * 0.26], [rx * 1.04, cy + ry * 0.42], [rx * 0.96, cy + ry * 0.55],
        [rx * 0.98, cy + ry * 0.72], [rx * 0.78, cy + ry * 0.9], [rx * 0.25, cy + ry * 0.95], [-rx * 0.3, cy + ry * 0.62],
        [-rx * 0.62, cy + ry * 0.55], [-rx * 1.0, cy + ry * 0.05], [-rx * 0.88, cy - ry * 0.62], [-rx * 0.45, cy - ry * 0.95]
      ];
      function smooth(pts) {
        ctx.beginPath();
        var n = pts.length;
        var m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
        ctx.moveTo(m0[0], m0[1]);
        for (var i = 0; i < n; i++) {
          var p = pts[i], q = pts[(i + 1) % n];
          // Le nez et les lèvres restent anguleux, le reste est arrondi
          if (i >= 3 && i <= 7) ctx.lineTo(p[0], p[1]);
          else ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        }
        ctx.closePath();
      }
      // Modelé : lumière venant de l'avant-haut, ombre vers la nuque
      var fg = ctx.createRadialGradient(rx * 0.55, cy - ry * 0.3, rx * 0.1, rx * 0.1, cy, rx * 1.35);
      fg.addColorStop(0, shade(skin, 1.14)); fg.addColorStop(0.5, skin); fg.addColorStop(1, shade(skin, 0.66));
      ctx.fillStyle = fg;
      smooth(prof); ctx.fill();
      ctx.save(); smooth(prof); ctx.clip();
      SK.hatch(ctx, r, -rx * 1.1, cy - ry, rx * 0.8, ry * 2.1, { gap: 2.2, alpha: 0.2, angle: -1.1 });
      // creux sous la pommette, ombre du menton sur la mâchoire, orbite
      ctx.fillStyle = 'rgba(30,22,18,0.2)';
      ctx.beginPath(); ctx.ellipse(rx * 0.35, cy + ry * 0.42, rx * 0.34, ry * 0.16, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(30,22,18,0.22)';
      ctx.beginPath(); ctx.ellipse(rx * 0.1, cy + ry * 0.85, rx * 0.6, ry * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      // reflet sur l'arête du nez et le front
      ctx.fillStyle = 'rgba(255,245,225,0.18)';
      ctx.beginPath(); ctx.ellipse(rx * 0.72, cy - ry * 0.55, rx * 0.14, ry * 0.22, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Barbe de trois jours : grain de poils
      if (L.beard === 'stubble') {
        ctx.save(); smooth(prof); ctx.clip();
        ctx.fillStyle = 'rgba(30,26,22,0.35)';
        var rr2 = SK.rng(U.hashStr(s.id) + 3);
        for (var sb = 0; sb < 40; sb++) ctx.fillRect(rx * (-0.2 + rr2.next() * 1.2), cy + ry * (0.3 + rr2.next() * 0.65), 0.45, 0.45);
        ctx.restore();
      }
      // Barbe
      if (L.beard) {
        ctx.save(); smooth(prof); ctx.clip();
        ctx.fillStyle = L.beard === 'full' ? hc : 'rgba(38,34,30,0.2)';
        polyPath(ctx, [[-rx * 0.35, cy + ry * 0.1], [rx * 0.25, cy + ry * 0.3], [rx * 0.7, cy + ry * 0.36], [rx * 1.2, cy + ry * 0.5], [rx * 1.2, cy + ry * 1.2], [-rx * 0.5, cy + ry * 1.2]]);
        ctx.fill();
        if (L.beard === 'full') { ctx.fillStyle = skin; ctx.fillRect(rx * 0.82, cy + ry * 0.47, rx * 0.25, ry * 0.07); }
        ctx.restore();
      }
      ctx.strokeStyle = INK; ctx.lineWidth = 1.15;
      smooth(prof); ctx.stroke();
      // Oreille : pavillon ombré, repli intérieur, lobe
      ctx.fillStyle = shade(skin, 0.85);
      ctx.beginPath(); ctx.ellipse(-rx * 0.3, cy + ry * 0.08, rx * 0.19, ry * 0.25, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 0.8; ctx.strokeStyle = INK;
      ctx.beginPath(); ctx.ellipse(-rx * 0.3, cy + ry * 0.08, rx * 0.19, ry * 0.25, -0.15, -1.4, 1.9); ctx.stroke();
      ctx.lineWidth = 0.5; ctx.strokeStyle = 'rgba(30,22,18,0.6)';
      ctx.beginPath(); ctx.arc(-rx * 0.32, cy + ry * 0.07, rx * 0.09, -1.0, 1.7); ctx.stroke();
      ctx.strokeStyle = INK;
      // Oeil, paupière, sourcil
      var ex = rx * 0.58, ey = cy - ry * 0.1;
      var blink = (t + (U.hashStr(s.id) % 7)) % 4.3 < 0.12;
      ctx.fillStyle = INK;
      // orbite ombrée (donne de la profondeur, évite l'œil « point noir »)
      ctx.fillStyle = 'rgba(40,32,26,0.22)';
      ctx.beginPath(); ctx.ellipse(ex, ey - 0.4, 2.6, 1.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = INK;
      if (P.eyes === 'closed' || blink) { ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(ex - 1.8, ey + 0.4); ctx.quadraticCurveTo(ex, ey + 1.3, ex + 1.6, ey + 0.4); ctx.stroke(); }
      else {
        var eh = P.eyes === 'half' ? 0.55 : 0.95;
        // amande : blanc de l'œil, iris vers l'avant, paupière supérieure appuyée
        ctx.fillStyle = 'rgba(226,218,202,0.9)';
        ctx.beginPath(); ctx.moveTo(ex - 1.7, ey + 0.1); ctx.quadraticCurveTo(ex, ey - eh * 1.3, ex + 1.7, ey); ctx.quadraticCurveTo(ex, ey + eh * 1.1, ex - 1.7, ey + 0.1); ctx.fill();
        ctx.fillStyle = INK;
        ctx.beginPath(); ctx.ellipse(ex + 0.55, ey - 0.05, 0.75, eh * 0.95, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 0.75; ctx.beginPath(); ctx.moveTo(ex - 1.8, ey + 0.1); ctx.quadraticCurveTo(ex, ey - eh * 1.4, ex + 1.8, ey - 0.1); ctx.stroke();
      }
      // sourcil : épaisseur propre au personnage
      ctx.lineWidth = L.brow === 'heavy' ? 1.6 : L.brow === 'thin' ? 0.8 : 1.1;
      ctx.strokeStyle = L.brow === 'thin' ? shade(hc.length === 7 ? hc : '#2a2622', 1.3) : INK;
      ctx.beginPath();
      if (P.brow === 'sad') { ctx.moveTo(ex - 2.6, ey - 2.4); ctx.lineTo(ex + 2.2, ey - 4.0); }
      else { ctx.moveTo(ex - 2.6, ey - 3.2); ctx.quadraticCurveTo(ex, ey - 4.3, ex + 2.4, ey - 3.4); }
      ctx.stroke();
      ctx.strokeStyle = INK;
      // Bouche (sourire propre au personnage quand il va bien)
      var mx = rx * 0.9, my = cy + ry * 0.5;
      ctx.lineWidth = 0.8; ctx.beginPath();
      if (P.mouth === 'open') { ctx.ellipse(mx - 0.6, my, 1.1, 1.0, 0, 0, Math.PI * 2); ctx.fill(); }
      else if (P.mouth === 'sad') { ctx.moveTo(mx - 3, my + 0.9); ctx.quadraticCurveTo(mx - 1.5, my - 0.3, mx + 0.4, my + 0.6); ctx.stroke(); }
      else if (L.smile && (s.moral == null || s.moral >= 45)) { ctx.moveTo(mx - 3.2, my - 0.4); ctx.quadraticCurveTo(mx - 1.2, my + 1.3, mx + 0.5, my - 0.3); ctx.stroke(); }
      else { ctx.moveTo(mx - 3, my + 0.2); ctx.lineTo(mx + 0.4, my + 0.2); ctx.stroke(); }
      if (L.lips) { ctx.fillStyle = 'rgba(90,50,45,0.35)'; ctx.beginPath(); ctx.ellipse(mx - 1.2, my + 0.3, 1.9, 0.9, 0, 0, Math.PI * 2); ctx.fill(); }
      // Lunettes
      if (L.glasses) {
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.ellipse(ex + 0.6, ey + 0.2, 2.6, 2.1, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ex - 2, ey - 0.3); ctx.lineTo(-rx * 0.3, cy - ry * 0.05); ctx.stroke();
      }
      // Cheveux
      ctx.fillStyle = hc;
      switch (L.hair) {
        case 'long': case 'shoulder': case 'bob':
          // dessus du crâne + mèche qui encadre le visage
          var top = [[rx * 0.85, cy - ry * 0.45], [rx * 0.45, cy - ry * 1.14], [-rx * 0.55, cy - ry * 1.12], [-rx * 1.18, cy - ry * 0.3], [-rx * 1.0, cy + ry * 0.55], [-rx * 0.45, cy + ry * 0.35], [-rx * 0.15, cy - ry * 0.4], [rx * 0.5, cy - ry * 0.62]];
          polyPath(ctx, top); ctx.fill(); hairInk();
          if (L.hair === 'bob') {
            // frange droite sur le front
            polyPath(ctx, [[rx * 0.96, cy - ry * 0.28], [rx * 0.88, cy - ry * 0.75], [rx * 0.2, cy - ry * 1.0], [rx * 0.35, cy - ry * 0.3]]); ctx.fill(); hairInk();
          } else {
            // mèche latérale devant l'oreille
            polyPath(ctx, [[-rx * 0.05, cy - ry * 0.6], [-rx * 0.15, cy + ry * (L.hair === 'long' ? 1.0 : 0.7)], [-rx * 0.45, cy + ry * (L.hair === 'long' ? 1.1 : 0.8)], [-rx * 0.45, cy - ry * 0.5]]); ctx.fill();
          }
          SK.line(ctx, r, -rx * 0.9, cy - ry * 0.3, rx * 0.35, cy - ry * 1.02, { w: 0.5, passes: 1, color: hl, alpha: 0.55 });
          SK.line(ctx, r, -rx * 0.7, cy - ry * 0.05, rx * 0.55, cy - ry * 0.8, { w: 0.5, passes: 1, color: hl, alpha: 0.4 });
          break;
        case 'curly':
          [[0.55, -0.75, 0.38], [0.05, -1.05, 0.45], [-0.55, -0.95, 0.45], [-1.0, -0.45, 0.45], [-0.95, 0.2, 0.42], [-0.55, 0.45, 0.35], [0.75, -0.35, 0.25]].forEach(function (c3) {
            ctx.beginPath(); ctx.arc(rx * c3[0], cy + ry * c3[1], rx * c3[2], 0, Math.PI * 2); ctx.fill();
          });
          ctx.strokeStyle = hl; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.5;
          for (var cq = 0; cq < 6; cq++) { ctx.beginPath(); ctx.arc(-rx * 0.9 + cq * rx * 0.3, cy - ry * (0.6 + (cq % 2) * 0.3), rx * 0.14, 0.5, 3.6); ctx.stroke(); }
          ctx.globalAlpha = 1;
          break;
        case 'buzz':
          // coupe rase : ombre sombre sur le crâne, ligne de front nette
          ctx.globalAlpha = 0.85;
          polyPath(ctx, [[rx * 0.72, cy - ry * 0.6], [rx * 0.35, cy - ry * 1.04], [-rx * 0.5, cy - ry * 1.02], [-rx * 1.02, cy - ry * 0.35], [-rx * 0.95, cy + ry * 0.15], [-rx * 0.4, cy - ry * 0.05], [rx * 0.45, cy - ry * 0.66]]);
          ctx.fill(); ctx.globalAlpha = 1;
          break;
        case 'short': case 'messy': case 'bun':
          polyPath(ctx, [[rx * 0.75, cy - ry * 0.55], [rx * 0.35, cy - ry * 1.1], [-rx * 0.5, cy - ry * 1.08], [-rx * 1.1, cy - ry * 0.35], [-rx * 1.0, cy + ry * 0.3], [-rx * 0.35, cy + ry * 0.05], [-rx * 0.15, cy - ry * 0.45], [rx * 0.4, cy - ry * 0.62]]);
          ctx.fill(); hairInk();
          // mèches et reflet
          SK.line(ctx, r, -rx * 0.8, cy - ry * 0.4, rx * 0.3, cy - ry * 0.98, { w: 0.5, passes: 1, color: hl, alpha: 0.6 });
          SK.line(ctx, r, -rx * 0.9, cy - ry * 0.05, -rx * 0.1, cy - ry * 0.85, { w: 0.5, passes: 1, color: hl, alpha: 0.4 });
          if (L.hair === 'messy' && !L.hat) for (var k = 0; k < 6; k++) SK.line(ctx, r, -rx * 0.8 + k * rx * 0.3, cy - ry * 0.95, -rx * 0.9 + k * rx * 0.32 + (r.next() - 0.5) * 3, cy - ry * 1.3, { w: 1.2, passes: 1, color: hc });
          if (L.hair === 'bun') { ctx.beginPath(); ctx.arc(-rx * 0.85, cy - ry * 0.85, rx * 0.42, 0, Math.PI * 2); ctx.fill(); }
          SK.line(ctx, r, -rx * 0.9, cy - ry * 0.2, rx * 0.3, cy - ry * 1.0, { w: 0.5, passes: 1, color: 'rgba(200,190,170,0.25)' });
          break;
        case 'scarf':
          ctx.fillStyle = L.scarfHead || '#4f4b45';
          polyPath(ctx, [[rx * 0.85, cy - ry * 0.35], [rx * 0.45, cy - ry * 1.15], [-rx * 0.6, cy - ry * 1.15], [-rx * 1.25, cy - ry * 0.2], [-rx * 1.1, cy + ry * 0.75], [-rx * 0.35, cy + ry * 0.95], [-rx * 0.2, cy + ry * 0.1], [rx * 0.5, cy - ry * 0.5]]);
          ctx.fill();
          SK.poly(ctx, r, [[rx * 0.85, cy - ry * 0.35], [rx * 0.45, cy - ry * 1.15], [-rx * 0.6, cy - ry * 1.15], [-rx * 1.25, cy - ry * 0.2], [-rx * 1.1, cy + ry * 0.75]], false, { w: 0.8, passes: 1, color: INK });
          break;
        case 'bald':
          ctx.fillStyle = 'rgba(40,36,32,0.35)';
          polyPath(ctx, [[-rx * 1.05, cy - ry * 0.1], [-rx * 0.9, cy + ry * 0.3], [-rx * 0.4, cy + ry * 0.1], [-rx * 0.6, cy - ry * 0.3]]); ctx.fill();
          break;
      }
      if (L.hat === 'beanie') {
        ctx.fillStyle = L.hatColor || '#3b3935';
        ctx.beginPath(); ctx.ellipse(-rx * 0.1, cy - ry * 0.5, rx * 1.12, ry * 0.72, -0.15, Math.PI, 0); ctx.fill();
        ctx.fillRect(-rx * 1.2, cy - ry * 0.62, rx * 2.15, ry * 0.3);
        SK.line(ctx, r, -rx * 1.2, cy - ry * 0.32, rx * 0.95, cy - ry * 0.4, { w: 0.8, passes: 1, color: INK });
      }
      if (L.hat === 'cap') {
        ctx.fillStyle = L.hatColor || '#34322e';
        ctx.beginPath(); ctx.ellipse(-rx * 0.1, cy - ry * 0.55, rx * 1.08, ry * 0.62, -0.1, Math.PI, 0); ctx.fill();
        polyPath(ctx, [[rx * 0.6, cy - ry * 0.62], [rx * 1.6, cy - ry * 0.5], [rx * 1.5, cy - ry * 0.4], [rx * 0.6, cy - ry * 0.45]]); ctx.fill();
        SK.line(ctx, r, rx * 0.6, cy - ry * 0.5, rx * 1.6, cy - ry * 0.47, { w: 0.8, passes: 1, color: INK });
      }
      ctx.restore();
    }

    ctx.restore();
    return { top: y - H - 6, H: H };
  };
})(window.CQR);
