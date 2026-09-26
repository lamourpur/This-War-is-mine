/* =========================================================
   CEUX QUI RESTENT — utilitaires communs
   Tout le jeu vit dans l'espace de noms global CQR.
   ========================================================= */
window.CQR = window.CQR || {};

(function (C) {
  'use strict';

  // ---- Générateur pseudo-aléatoire déterministe (mulberry32), état sauvegardable
  function RNG(seed) { this.s = (seed >>> 0) || 1; }
  RNG.prototype.next = function () {
    var t = (this.s = (this.s + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  // entries : [[valeur, poids], ...]
  RNG.prototype.weighted = function (entries) {
    var total = 0, i;
    for (i = 0; i < entries.length; i++) total += entries[i][1];
    if (total <= 0) return null;
    var r = this.next() * total;
    for (i = 0; i < entries.length; i++) {
      r -= entries[i][1];
      if (r <= 0) return entries[i][0];
    }
    return entries[entries.length - 1][0];
  };
  RNG.prototype.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(this.next() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  C.RNG = RNG;

  // RNG de la partie (recréé à chaque chargement depuis state.rngS)
  C.R = new RNG(Date.now());

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  C.util = {
    hashStr: hashStr,
    clamp: function (v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    fmtClock: function (min) {
      min = Math.floor(min) % 1440;
      var h = Math.floor(min / 60), m = min % 60;
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },
    fmtDur: function (min) {
      min = Math.round(min);
      if (min < 60) return min + ' min';
      var h = Math.floor(min / 60), m = min % 60;
      return h + ' h' + (m ? ' ' + (m < 10 ? '0' : '') + m : '');
    },
    el: function (tag, cls, html) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (html != null) e.innerHTML = html;
      return e;
    },
    esc: function (s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    },
    copy: function (o) { return JSON.parse(JSON.stringify(o)); },
    // Accord simple « 1 bois / 3 bois »
    qty: function (n, id) {
      var it = C.ITEMS[id];
      return n + ' ' + (it ? it.name.toLowerCase() : id);
    },
    costText: function (cost) {
      var parts = [];
      for (var k in cost) parts.push(cost[k] + '× ' + (C.ITEMS[k] ? C.ITEMS[k].name : k));
      return parts.join(', ');
    }
  };
})(window.CQR);
