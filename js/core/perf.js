/* =========================================================
   Outil de mesure des performances (F3 : afficher / masquer)
   - temps par image (moyenne, 95e centile, pire), logique / rendu
   - reconstructions du calque statique (nombre, durée, cause)
   - appels à markDirty par minute, avec leur origine
   - sections du rendu les plus coûteuses
   - images longues (> 33 ms) avec la cause probable
   F4 : copie le rapport dans le presse-papiers et la console.
   Aucun coût quand l'outil est masqué (quelques performance.now()).
   ========================================================= */
(function (C) {
  'use strict';
  var P = C.Perf = { on: false };
  var N = 240;                                  // images gardées
  var frames = [], secs = {}, secOrder = [];
  var cur = { logic: 0, render: 0, build: 0, secs: {} };
  var builds = [], dirtyLog = [], longs = [];
  var lastEnd = 0, lastCause = '', el = null, gfx = null, gctx = null, lastDraw = 0;
  var T0 = performance.now();

  var now = function () { return performance.now(); };

  // Section chronométrée : P.s('lumières') ... P.e()
  var stack = [];
  P.s = function (name) { stack.push([name, now()]); };
  P.e = function () {
    var s = stack.pop(); if (!s) return;
    var d = now() - s[1];
    cur.secs[s[0]] = (cur.secs[s[0]] || 0) + d;
  };
  P.logic = function (ms) { cur.logic += ms; };
  P.render = function (ms) { cur.render += ms; };
  P.built = function (ms, kind) {
    cur.build += ms;
    builds.push({ t: now() - T0, ms: ms, kind: kind || 'statique' });
    if (builds.length > 60) builds.shift();
  };
  // Appelé par Game.markDirty : on garde l'origine (fonction appelante)
  P.dirty = function () {
    var who = 'inconnu';
    try {
      var l = new Error().stack.split('\n');
      for (var i = 2; i < l.length; i++) {
        if (l[i].indexOf('perf.js') >= 0 || l[i].indexOf('markDirty') >= 0) continue;
        var m = /at (?:([\w.$<>\[\] ]+?) \()?.*?([\w.]+\.js):(\d+)/.exec(l[i]);
        if (m) { who = (m[1] || '?') + ' ' + m[2] + ':' + m[3]; break; }
      }
    } catch (e) {}
    dirtyLog.push({ t: now() - T0, who: who });
    if (dirtyLog.length > 400) dirtyLog.shift();
  };

  // Fin d'image (appelée par la boucle principale avec la durée totale)
  P.frame = function (total, dtGame) {
    var n = now();
    var f = { total: total, logic: cur.logic, render: cur.render, build: cur.build, secs: cur.secs, gap: lastEnd ? n - lastEnd : 0 };
    lastEnd = n;
    frames.push(f); if (frames.length > N) frames.shift();
    for (var k in cur.secs) { if (!secs[k]) { secs[k] = 0; secOrder.push(k); } }
    // image longue : on retient la cause la plus probable
    if (f.gap > 33 || total > 20) {
      var cause = f.build > 8 ? 'reconstruction du décor (' + f.build.toFixed(0) + ' ms)'
        : f.render > f.logic * 2 && f.render > 14 ? 'rendu (' + topSec(f.secs) + ')'
        : f.logic > 12 ? 'logique du jeu (' + f.logic.toFixed(0) + ' ms)'
        : f.gap > total + 12 ? 'pause hors du jeu : ramasse-miettes ou navigateur'
        : 'indéterminée';
      longs.push({ t: n - T0, gap: f.gap, total: total, cause: cause });
      if (longs.length > 30) longs.shift();
    }
    cur = { logic: 0, render: 0, build: 0, secs: {} };
    if (P.on && n - lastDraw > 250) { lastDraw = n; draw(); }
  };
  function topSec(s) {
    var best = '?', v = 0;
    for (var k in s) if (s[k] > v) { v = s[k]; best = k + ' ' + v.toFixed(0) + ' ms'; }
    return best;
  }

  function stats(key) {
    var a = frames.map(function (f) { return f[key]; }).sort(function (x, y) { return x - y; });
    if (!a.length) return { avg: 0, p95: 0, max: 0 };
    var sum = 0; a.forEach(function (v) { sum += v; });
    return { avg: sum / a.length, p95: a[Math.floor(a.length * 0.95)], max: a[a.length - 1] };
  }
  function secAvg() {
    var tot = {}, out = [];
    frames.forEach(function (f) { for (var k in f.secs) tot[k] = (tot[k] || 0) + f.secs[k]; });
    for (var k in tot) out.push([k, tot[k] / frames.length]);
    out.sort(function (a, b) { return b[1] - a[1]; });
    return out;
  }
  function dirtyTop() {
    var cut = now() - T0 - 60000, cnt = {}, total = 0;
    dirtyLog.forEach(function (d) { if (d.t >= cut) { cnt[d.who] = (cnt[d.who] || 0) + 1; total++; } });
    var out = Object.keys(cnt).map(function (k) { return [k, cnt[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
    return { total: total, top: out.slice(0, 6) };
  }

  P.report = function () {
    var t = stats('total'), g = stats('gap'), l = stats('logic'), r = stats('render');
    var fps = g.avg ? 1000 / g.avg : 0;
    var d = dirtyTop(), b = builds.filter(function (x) { return x.t > now() - T0 - 60000; });
    var bsum = 0, bmax = 0; b.forEach(function (x) { bsum += x.ms; bmax = Math.max(bmax, x.ms); });
    var L = [];
    L.push('=== Mesure Ceux Qui Restent ===');
    L.push('Écran ' + innerWidth + 'x' + innerHeight + ' · pixel ratio ' + (window.devicePixelRatio || 1) + ' · ' + frames.length + ' images mesurées');
    L.push('Images/s : ' + fps.toFixed(0) + ' · intervalle moyen ' + g.avg.toFixed(1) + ' ms · 95e centile ' + g.p95.toFixed(1) + ' ms · pire ' + g.max.toFixed(0) + ' ms');
    L.push('Travail par image : total ' + t.avg.toFixed(1) + ' ms (pire ' + t.max.toFixed(0) + ') · logique ' + l.avg.toFixed(1) + ' · rendu ' + r.avg.toFixed(1));
    L.push('Calque statique (60 s) : ' + b.length + ' reconstructions, ' + bsum.toFixed(0) + ' ms au total, pire ' + bmax.toFixed(0) + ' ms');
    L.push('markDirty (60 s) : ' + d.total + ' appels' + d.top.map(function (x) { return '\n   ' + x[1] + ' × ' + x[0]; }).join(''));
    L.push('Sections du rendu (ms par image) :' + secAvg().slice(0, 8).map(function (x) { return '\n   ' + x[1].toFixed(2) + '  ' + x[0]; }).join(''));
    var lg = longs.slice(-8);
    L.push('Images longues (' + longs.length + ') :' + (lg.length ? lg.map(function (x) { return '\n   à ' + (x.t / 1000).toFixed(1) + ' s : ' + x.gap.toFixed(0) + ' ms → ' + x.cause; }).join('') : ' aucune'));
    if (performance.memory) L.push('Mémoire JS : ' + (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' Mo');
    return L.join('\n');
  };

  function draw() {
    if (!el) {
      el = document.createElement('pre');
      el.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;margin:0;padding:8px 10px;max-width:560px;font:12px/1.35 monospace;color:#cfe8c0;background:rgba(5,8,5,.82);border:1px solid #3c5a30;pointer-events:none;white-space:pre-wrap';
      gfx = document.createElement('canvas'); gfx.width = 240; gfx.height = 44;
      gfx.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:rgba(5,8,5,.82);border:1px solid #3c5a30;pointer-events:none';
      gctx = gfx.getContext('2d');
      document.body.appendChild(el); document.body.appendChild(gfx);
    }
    el.textContent = P.report() + '\n[F3 masquer · F4 copier le rapport]';
    // histogramme : une barre par image, rouge si > 33 ms
    gctx.clearRect(0, 0, 240, 44);
    frames.slice(-240).forEach(function (f, i) {
      var h = Math.min(44, f.gap * 1.2);
      gctx.fillStyle = f.gap > 33 ? '#e0583c' : f.gap > 20 ? '#e0a340' : '#7fb85a';
      gctx.fillRect(i, 44 - h, 1, h);
    });
    gctx.fillStyle = '#ffffff55'; gctx.fillRect(0, 44 - 16.7 * 1.2, 240, 1);
  }

  P.toggle = function () {
    P.on = !P.on;
    if (!P.on && el) { el.remove(); gfx.remove(); el = gfx = null; }
    else { lastDraw = 0; }
  };
  P.copy = function () {
    var txt = P.report();
    try { console.log(txt); } catch (e) {}
    try { navigator.clipboard.writeText(txt); } catch (e) {}
    return txt;
  };

  window.addEventListener('keydown', function (e) {
    if (e.key === 'F3') { e.preventDefault(); P.toggle(); }
    else if (e.key === 'F4' && P.on) { e.preventDefault(); P.copy(); }
  });
})(window.CQR);
