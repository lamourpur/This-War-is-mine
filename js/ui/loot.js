/* =========================================================
   Fouille : fenêtre de transfert par glisser-déposer
   À gauche le contenu du meuble fouillé, à droite la réserve du refuge.
   - glisser une pile d'un côté à l'autre : toute la pile passe
   - clic : un seul objet · Maj+clic ou double-clic : toute la pile
   - « Tout prendre » vide le meuble
   Ce qui reste dans le meuble y reste : on peut revenir le chercher.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  var UI = C.UI;
  function G() { return C.Game; }
  function first(s) { return s.name.split(' ')[0]; }

  var SLOTS = 12;

  UI.openLoot = function (o, s) {
    var st = G().st;
    o.loot = o.loot || {};
    var taken = {};                         // bilan net (pris − déposés) pour le retour à la fermeture
    var name = o.label || (o.kind === 'cache' && C.CACHE_NAMES[o.variant]) || G().objName(o).replace(/\s*\(.*\)$/, '');
    var p = UI.panel(name, 'Fouille de ' + U.esc(first(s)) + ' — glissez les objets d\'un côté à l\'autre', { wide: true, foot: true });
    p.classList.add('loot-panel');

    var wrap = U.el('div', 'loot-wrap');
    var left = side('cache', name, 'Contenu');
    var mid = U.el('div', 'loot-mid', C.Icon('trade') + '<span>Glisser</span>');
    var inBag = C.Explore && C.Explore.active;   // en exploration : le sac, limité en poids
    var right = side('stock', inBag ? 'Sac de ' + first(s) : 'Réserve du refuge', inBag ? 'Sac' : 'Réserve');
    var meter = null;
    if (inBag) { meter = U.el('div', 'bag-meter'); right.el.insertBefore(meter, right.grid); }
    wrap.appendChild(left.el); wrap.appendChild(mid); wrap.appendChild(right.el);
    p.body.appendChild(wrap);
    var hint = U.el('p', 'loot-hint', 'Clic : un objet · Maj + clic ou double-clic : toute la pile · Glisser-déposer : toute la pile');
    p.body.appendChild(hint);

    var takeAll = U.el('button', 'btn primary', 'Tout prendre');
    takeAll.addEventListener('click', function () {
      Object.keys(o.loot).forEach(function (id) { move('cache', id, o.loot[id]); });
    });
    var close = U.el('button', 'btn', 'Fermer');
    close.addEventListener('click', function () { UI.closeModal(); });
    p.foot.appendChild(close); p.foot.appendChild(takeAll);

    function side(key, title, label) {
      var el = U.el('div', 'loot-side ' + key);
      el.innerHTML = '<div class="loot-title"><span class="tb-k">' + label + '</span><b>' + U.esc(title) + '</b></div>';
      var grid = U.el('div', 'loot-grid');
      el.appendChild(grid);
      // cible de dépôt
      el.addEventListener('dragover', function (e) {
        var from = e.dataTransfer.types.indexOf('text/cqr-from') >= 0 ? drag.from : null;
        if (from && from !== key) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drop'); }
      });
      el.addEventListener('dragleave', function (e) { if (!el.contains(e.relatedTarget)) el.classList.remove('drop'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault(); el.classList.remove('drop');
        if (drag.from && drag.from !== key) move(drag.from, drag.id, drag.from === 'cache' ? (o.loot[drag.id] || 0) : G().count(drag.id));
      });
      return { el: el, grid: grid };
    }

    var drag = { from: null, id: null };

    // Déplace n objets « id » depuis from ('cache' ou 'stock')
    function move(from, id, n) {
      if (!n) return;
      var one = {}; one[id] = n;
      if (from === 'cache') {
        n = Math.min(n, o.loot[id] || 0); if (!n) return;
        if (inBag) {
          var fit = C.Explore.canTake(id);
          if (fit <= 0) { flashFull(); return; }
          n = Math.min(n, fit);
        }
        one[id] = n;
        o.loot[id] -= n; if (o.loot[id] <= 0) delete o.loot[id];
        G().addItems(one);
        taken[id] = (taken[id] || 0) + n;
      } else {
        n = Math.min(n, G().count(id)); if (!n) return;
        one[id] = n;
        G().removeItems(one);
        o.loot[id] = (o.loot[id] || 0) + n;
        taken[id] = (taken[id] || 0) - n;
      }
      if (C.Audio.ready) C.Audio.sfx.pickup();
      render();
    }

    function flashFull() {
      if (C.Audio.ready) C.Audio.sfx.deny();
      if (!meter) return;
      meter.classList.remove('full'); void meter.offsetWidth; meter.classList.add('full');
    }

    function slot(from, id, n) {
      var it = C.ITEMS[id];
      var b = U.el('div', 'loot-slot');
      b.draggable = true;
      b.innerHTML = C.ItemArt.img(id, 46) + '<span class="q">' + n + '</span><span class="nm">' + U.esc(it ? it.name : id) + '</span>';
      b.title = (it ? it.name : id) + ' × ' + n + (it && it.desc ? ' — ' + it.desc : '');
      b.addEventListener('dragstart', function (e) {
        drag.from = from; drag.id = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/cqr-from', from);
        // image de glisser : l'illustration de l'objet
        var img = b.querySelector('img'); if (img && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(img, 23, 23);
        b.classList.add('dragging');
      });
      b.addEventListener('dragend', function () { b.classList.remove('dragging'); drag.from = null; });
      b.addEventListener('click', function (e) { move(from, id, e.shiftKey ? n : 1); });
      b.addEventListener('dblclick', function (e) { e.preventDefault(); move(from, id, from === 'cache' ? (o.loot[id] || 0) : G().count(id)); });
      return b;
    }

    function fill(grid, from, entries) {
      grid.innerHTML = '';
      // Sac : une case par pile, et les cases vides jusqu'à la capacité
      if (from === 'stock' && inBag) {
        var cap = C.Explore.capacity(s), used = 0;
        entries.forEach(function (en) {
          var st = C.stackOf(en[0]), left = en[1];
          while (left > 0) { var n = Math.min(st, left); var sl = slot(from, en[0], n); if (n >= st) sl.classList.add('full-stack'); sl.querySelector('.q').textContent = n + '/' + st; grid.appendChild(sl); left -= n; used++; }
        });
        for (var j = used; j < cap; j++) grid.appendChild(U.el('div', 'loot-slot empty'));
        if (used > cap) Array.prototype.slice.call(grid.children, cap).forEach(function (c) { c.classList.add('over'); });
        return;
      }
      entries.forEach(function (en) { grid.appendChild(slot(from, en[0], en[1])); });
      for (var i = entries.length; i < Math.max(SLOTS, entries.length + (entries.length % 4 ? 4 - entries.length % 4 : 0)); i++) grid.appendChild(U.el('div', 'loot-slot empty'));
    }

    function render() {
      var ce = Object.keys(o.loot).filter(function (k) { return o.loot[k] > 0; }).map(function (k) { return [k, o.loot[k]]; });
      fill(left.grid, 'cache', ce);
      if (!ce.length) left.grid.insertAdjacentHTML('afterbegin', '<div class="loot-empty">Vide</div>');
      var inv = st.inventory;
      var se = Object.keys(C.ITEMS).filter(function (k) { return (inv[k] || 0) > 0; }).map(function (k) { return [k, inv[k]]; });
      fill(right.grid, 'stock', se);
      takeAll.disabled = !ce.length;
      if (meter) {
        var cap = C.Explore.capacity(s), wgt = C.Explore.weight(st.inventory);
        meter.innerHTML = '<span>Cases</span><div class="bm-bar"><i style="width:' + Math.min(100, wgt / cap * 100) + '%"></i></div><b>' + wgt + ' / ' + cap + '</b>';
        meter.classList.toggle('heavy', wgt >= cap);
      }
      fitRows(left.grid); fitRows(right.grid);
    }
    // Hauteur = 3 rangées entières (jamais de rangée coupée par le défilement)
    function fitRows(grid) {
      requestAnimationFrame(function () {
        var sl = grid.querySelector('.loot-slot');
        if (!sl) return;
        var gap = parseFloat(getComputedStyle(grid).rowGap) || 6;
        grid.style.maxHeight = (sl.offsetHeight * 3 + gap * 2 + 3) + 'px';
      });
    }
    render();

    UI.modal(p, {
      onClose: function () {
        // Bilan : les objets pris montent au-dessus du survivant, et le journal les consigne
        var gains = [];
        Object.keys(taken).forEach(function (id) { if (taken[id]) gains.push({ item: id, n: taken[id] }); });
        if (gains.length && C.Render.pop) C.Render.pop(s, gains);
        var got = {}; gains.forEach(function (g) { if (g.n > 0) got[g.item] = g.n; });
        if (inBag && Object.keys(got).length) C.Explore.ev('loot', { name: name, items: got });
        if (inBag && o.owner) C.Explore.markStolen(o, got);
        if (Object.keys(got).length) G().log(first(s) + ' a pris dans ' + name.toLowerCase() + ' : ' + C.itemsText(got) + '.', 'action');
        // Baluchon vidé : il n'a plus de raison d'être là
        if (o.variant === 'baluchon' && !Object.keys(o.loot).some(function (k) { return o.loot[k] > 0; })) G().removeObject(o);
        G().markDirty();
        if (C.UI.buildCards) C.UI.buildCards();
      }
    });
  };
})(window.CQR);
