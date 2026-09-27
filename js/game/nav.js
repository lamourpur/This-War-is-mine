/* =========================================================
   Déplacements dans le refuge
   Le refuge est une vue en coupe : chaque étage est une ligne
   horizontale, reliée aux autres par des escaliers. Les éboulis,
   portes verrouillées et grilles coupent le passage.
   ========================================================= */
(function (C) {
  'use strict';

  var Nav = C.Nav = {};

  function barriersOn(f) {
    return C.Game.st.objects.filter(function (o) { return o.f === f && C.Game.isBlocking(o); });
  }

  // Le passage entre a et b sur l'étage f est-il libre ?
  Nav.clear = function (f, a, b) {
    var lo = Math.min(a, b), hi = Math.max(a, b);
    var bs = barriersOn(f);
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].x > lo + 0.5 && bs[i].x < hi - 0.5) return false;
    }
    return true;
  };

  function pt(f, x) { return { f: f, x: x, y: C.FLOORS[f].y }; }

  // Plus court chemin (Dijkstra sur un petit graphe) — renvoie la liste des points à atteindre
  Nav.findPath = function (from, to) {
    var nodes = [from, to];
    C.STAIRS.forEach(function (s) { nodes.push(s.a, s.b); });
    var n = nodes.length;
    function neighbors(i) {
      var out = [];
      var a = nodes[i];
      for (var j = 0; j < n; j++) {
        if (j === i) continue;
        var b = nodes[j];
        if (a.f === b.f && Nav.clear(a.f, a.x, b.x)) out.push([j, Math.abs(a.x - b.x)]);
      }
      if (i >= 2) {
        var k = i - 2, pair = k % 2 === 0 ? i + 1 : i - 1;
        var sa = nodes[i], sb = nodes[pair];
        var dy = C.FLOORS[sa.f].y - C.FLOORS[sb.f].y;
        out.push([pair, Math.sqrt((sa.x - sb.x) * (sa.x - sb.x) + dy * dy) * 1.3]);
      }
      return out;
    }
    var dist = [], prev = [], done = [];
    for (var i = 0; i < n; i++) { dist[i] = Infinity; prev[i] = -1; done[i] = false; }
    dist[0] = 0;
    for (var iter = 0; iter < n; iter++) {
      var u = -1;
      for (i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity) break;
      done[u] = true;
      if (u === 1) break;
      neighbors(u).forEach(function (e) {
        var alt = dist[u] + e[1];
        if (alt < dist[e[0]]) { dist[e[0]] = alt; prev[e[0]] = u; }
      });
    }
    if (dist[1] === Infinity) return null;
    var chain = [];
    for (var c = 1; c !== -1; c = prev[c]) chain.unshift(c);
    var path = [];
    for (i = 1; i < chain.length; i++) {
      var nd = nodes[chain[i]];
      var last = path.length ? path[path.length - 1] : from;
      if (nd.f === last.f && Math.abs(nd.x - last.x) < 0.5) continue;
      path.push(pt(nd.f, nd.x));
    }
    return path;
  };

  // Point où un survivant doit se tenir pour agir sur un objet
  Nav.interactPoint = function (from, o) {
    var cands;
    if (C.Game.isBlocking(o)) {
      var off = o.w / 2 + 16;
      cands = [o.x - off, o.x + off];
    } else if (o.kind === 'frontdoor') {
      cands = [o.x + 34];
    } else if (o.kind === 'npc' || o.kind === 'guard') {
      // On se place à côté de la personne, pas sur elle
      var half = (o.w || 40) / 2 + 22;
      cands = [o.x - half, o.x + half];
    } else if (o.kind === 'exit') {
      cands = [o.x + 40];
    } else {
      cands = [o.x];
    }
    var best = null, bestLen = Infinity;
    cands.forEach(function (x) {
      x = C.util.clamp(x, C.WORLD.walkMin, C.WORLD.walkMax);
      var p = Nav.findPath(from, { f: o.f, x: x });
      if (!p) return;
      var len = 0, cur = from;
      p.forEach(function (w) { len += Math.abs(w.x - cur.x) + Math.abs(C.FLOORS[w.f].y - C.FLOORS[cur.f].y); cur = w; });
      if (len < bestLen) { bestLen = len; best = { f: o.f, x: x, path: p }; }
    });
    return best;
  };

  // Zones de chaque étage, et accessibilité depuis l'entrée (brouillard)
  Nav.computeRegions = function () {
    var regions = [];
    C.FLOORS.forEach(function (fl, f) {
      var xs = barriersOn(f).map(function (o) { return o; }).sort(function (a, b) { return a.x - b.x; });
      var start = C.WORLD.left;
      xs.forEach(function (b) {
        regions.push({ f: f, x0: start, x1: b.x, reach: false, id: regions.length });
        start = b.x;
      });
      regions.push({ f: f, x0: start, x1: C.WORLD.right, reach: false, id: regions.length });
    });
    function regionAt(f, x) {
      for (var i = 0; i < regions.length; i++) {
        var r = regions[i];
        if (r.f === f && x >= r.x0 && x <= r.x1) return r;
      }
      return null;
    }
    var startR = regionAt(1, 220);
    var queue = startR ? [startR] : [];
    if (startR) startR.reach = true;
    while (queue.length) {
      var r = queue.shift();
      C.STAIRS.forEach(function (s) {
        [[s.a, s.b], [s.b, s.a]].forEach(function (pair) {
          if (pair[0].f === r.f && pair[0].x >= r.x0 && pair[0].x <= r.x1) {
            var r2 = regionAt(pair[1].f, pair[1].x);
            if (r2 && !r2.reach) { r2.reach = true; queue.push(r2); }
          }
        });
      });
    }
    Nav.regions = regions;
    Nav.regionAt = regionAt;
    return regions;
  };

  Nav.isReachable = function (f, x) {
    if (!Nav.regions) Nav.computeRegions();
    var r = Nav.regionAt(f, x);
    return r ? r.reach : false;
  };

  // Un objet est-il atteignable (au moins un côté pour les barrières) ?
  Nav.objectReachable = function (o) {
    if (C.Game.isBlocking(o)) return Nav.isReachable(o.f, o.x - o.w / 2 - 10) || Nav.isReachable(o.f, o.x + o.w / 2 + 10);
    return Nav.isReachable(o.f, o.x);
  };
})(window.CQR);
