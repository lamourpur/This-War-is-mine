/* =========================================================
   Troc avec les marchands
   Le marchand vend au prix de base et rachète moins cher.
   Un négociateur resserre fortement l'écart.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }

  var Trade = C.Trade = {};

  Trade.genTraderStock = function (st, R) {
    if (C.Market) return C.Market.traderStock(st, R);
    var pool = ['conserve', 'eau', 'legumes', 'bois', 'composants', 'pieces_meca', 'pieces_elec', 'bandage', 'medicaments', 'cafe', 'cigarettes', 'sucre', 'munitions', 'filtre', 'engrais', 'carburant', 'tabac', 'livres', 'herbes', 'pied_de_biche', 'passe_partout', 'couteau', 'pelle'];
    if (st.day > 10) pool.push('pistolet', 'hachette', 'scie');
    var stock = {};
    var n = R.int(6, 9);
    R.shuffle(pool).slice(0, n).forEach(function (id) {
      var it = C.ITEMS[id];
      stock[id] = it.tool || it.weapon ? 1 : R.int(1, it.v > 10 ? 3 : 6);
    });
    if (C.World.isWinter(st)) stock.bois = (stock.bois || 0) + R.int(3, 6);
    return stock;
  };

  // Valeur du moment : l'hiver renchérit le chauffage, les pénuries du
  // marché (C.Market) font flamber ce qui manque en ville
  function scarcity(id) {
    var st = G().st, k = 1;
    if (C.World.isWinter(st) && (id === 'bois' || id === 'carburant')) k = 1.3;
    if (C.Market) k = Math.max(k, C.Market.mult(id, st));
    return k;
  }
  Trade.scarcity = scarcity;
  Trade.sellPrice = function (id, nego) { return Math.max(1, Math.round(C.ITEMS[id].v * scarcity(id) * (nego ? 0.9 : 1))); };
  Trade.buyPrice = function (id, nego) { return Math.max(1, Math.round(C.ITEMS[id].v * scarcity(id) * (nego ? 0.95 : 0.7))); };

  var TradeUI = C.TradeUI = {};

  // Troc à la manière du jeu d'origine : quatre casiers.
  //   [ vos objets ] [ vous donnez | balance | vous recevez ] [ ses objets ]
  // On glisse une pile de ses objets vers l'offre (ou on clique : 1 objet,
  // Maj + clic : toute la pile) ; la balance penche selon la valeur des deux
  // offres ; « Échanger » quand l'offre lui convient.
  // opts : { name, likes ({objet: multiplicateur}), bag (échange depuis le sac), face, faceLine }
  TradeUI.open = function (s, stock, onDone, opts) {
    opts = opts || {};
    var nego = G().hasTrait(s, 'negociateur');
    var likes = opts.likes || {};
    var who = opts.name || 'Le marchand';
    var inBag = !!(opts.bag && C.Explore && C.Explore.active);
    if (C.UI.hint) setTimeout(function () { C.UI.hint('trade'); }, 400);
    var give = {}, take = {};
    // Ce qu'il recherche, il le paie plus cher
    function buyP(id) { return Math.max(1, Math.round(Trade.buyPrice(id, nego) * (likes[id] || 1))); }
    function sellP(id) { return Trade.sellPrice(id, nego); }
    var p = C.UI.panel('Troc' + (opts.name ? ' avec ' + U.esc(opts.name) : ''), U.esc(s.name.split(' ')[0]) + ' négocie' + (nego ? ' — négociateur : bien meilleurs prix' : ''), { foot: true, noClose: true, wide: true });
    p.classList.add('trade-panel');
    var head = U.el('div', 'trade-head');
    if (opts.face) {
      var fr = U.el('div', 'trade-face');
      fr.appendChild(C.UI.portrait(opts.face.s, 70, 84));
      fr.appendChild(U.el('div', '', '<b>' + U.esc(who) + '</b><span>' + U.esc(opts.faceLine || 'Voyons ce que vous avez.') + '</span>'));
      head.appendChild(fr);
    }
    var notes = U.el('div', 'trade-notes');
    var wantList = Object.keys(likes).filter(function (k) { return likes[k] > 1; });
    if (C.Market && C.Market.wanted(G().st).length) notes.appendChild(U.el('p', 'trade-wants market', C.Icon('alert') + '<span>Pénurie en ville : ' + U.esc(C.Market.wantedText(G().st)) + ' valent bien plus cher.</span>'));
    if (wantList.length) notes.appendChild(U.el('p', 'trade-wants', C.Icon('star') + '<span>' + U.esc(who) + ' recherche : ' + wantList.map(function (k) { return C.ITEMS[k].name.toLowerCase(); }).join(', ') + '</span>'));
    head.appendChild(notes);
    p.body.appendChild(head);

    var wrap = U.el('div', 'trade2');
    var zMine = zone('mine', inBag ? 'Sac de ' + s.name.split(' ')[0] : 'Votre réserve', inBag ? 'Sac' : 'Réserve');
    var center = U.el('div', 'trade-center');
    var zGive = zone('give', 'Vous donnez', 'Offre');
    var scale = U.el('div', 'trade-scale');
    var zTake = zone('take', 'Vous recevez', 'Demande');
    var zStock = zone('stock', who, 'Marchand');
    center.appendChild(zGive.el); center.appendChild(scale); center.appendChild(zTake.el);
    // Lâcher sur la balance : l'objet va dans l'offre qui convient
    center.addEventListener('dragover', function (e) { if (drag.from === 'mine' || drag.from === 'stock') { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
    center.addEventListener('drop', function (e) {
      e.preventDefault();
      if (drag.from === 'mine' || drag.from === 'stock') move(drag.from, drag.id, avail(drag.from, drag.id));
    });
    wrap.appendChild(zMine.el); wrap.appendChild(center); wrap.appendChild(zStock.el);
    p.body.appendChild(wrap);
    p.body.appendChild(U.el('p', 'loot-hint', 'Glisser-déposer : toute la pile · Clic : un objet · Maj + clic : toute la pile · Clic sur une offre : la reprendre'));

    // Ce qui reste disponible de chaque côté (hors offre)
    function mineLeft(id) { return G().count(id) - (give[id] || 0); }
    function stockLeft(id) { return (stock[id] || 0) - (take[id] || 0); }
    var PAIR = { mine: 'give', give: 'mine', stock: 'take', take: 'stock' };
    function avail(from, id) { return from === 'mine' ? mineLeft(id) : from === 'stock' ? stockLeft(id) : from === 'give' ? (give[id] || 0) : (take[id] || 0); }
    function move(from, id, n) {
      n = Math.min(n, avail(from, id)); if (n <= 0) return;
      if (from === 'mine') give[id] = (give[id] || 0) + n;
      else if (from === 'give') { give[id] -= n; if (give[id] <= 0) delete give[id]; }
      else if (from === 'stock') take[id] = (take[id] || 0) + n;
      else { take[id] -= n; if (take[id] <= 0) delete take[id]; }
      if (C.Audio.ready) C.Audio.sfx.pickup();
      render();
    }
    // Où va une pile lâchée sur une zone ? (on ne peut donner que ses
    // propres objets, ni prendre les siens sans passer par sa demande)
    function dest(from, target) {
      if (from === 'mine') return target === 'mine' || target === 'stock' ? null : 'give';
      if (from === 'stock') return target === 'stock' || target === 'mine' ? null : 'take';
      if (from === 'give') return target === 'mine' ? 'mine' : null;
      if (from === 'take') return target === 'stock' ? 'stock' : null;
    }

    var drag = { from: null, id: null };
    function zone(key, title, label) {
      var el = U.el('div', 'loot-side tz tz-' + key);
      el.innerHTML = '<div class="loot-title"><span class="tb-k">' + label + '</span><b>' + U.esc(title) + '</b><em class="tz-sum"></em></div>';
      var grid = U.el('div', 'loot-grid');
      el.appendChild(grid);
      el.addEventListener('dragover', function (e) {
        if (drag.from && dest(drag.from, key)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drop'); }
      });
      el.addEventListener('dragleave', function (e) { if (!el.contains(e.relatedTarget)) el.classList.remove('drop'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault(); e.stopPropagation(); el.classList.remove('drop');
        if (drag.from && dest(drag.from, key)) move(drag.from, drag.id, avail(drag.from, drag.id));
      });
      return { key: key, el: el, grid: grid, sum: el.querySelector('.tz-sum') };
    }

    function slot(from, id, n, price) {
      var it = C.ITEMS[id];
      var liked = (from === 'mine' || from === 'give') && (likes[id] || 1) > 1, rare = scarcity(id) > 1.4;
      var b = U.el('div', 'loot-slot' + (liked ? ' liked' : '') + (rare ? ' rare' : ''));
      b.draggable = true;
      b.innerHTML = C.ItemArt.img(id, 46) + '<span class="q">' + n + '</span><span class="nm">' + U.esc(it.name) + '</span><span class="pr">' + price + '¤</span>';
      b.title = it.name + ' × ' + n + ' — ' + price + ' ¤ pièce' + (liked ? ' (' + who + ' en recherche : il paie plus)' : rare ? ' (pénurie en ville)' : '') + (it.desc ? ' — ' + it.desc : '');
      b.addEventListener('dragstart', function (e) {
        drag.from = from; drag.id = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/cqr-trade', from);
        var img = b.querySelector('img'); if (img && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(img, 23, 23);
        b.classList.add('dragging');
        [zMine, zGive, zTake, zStock].forEach(function (z) { if (dest(from, z.key)) z.el.classList.add('can'); });
      });
      b.addEventListener('dragend', function () { b.classList.remove('dragging'); drag.from = null; [zMine, zGive, zTake, zStock].forEach(function (z) { z.el.classList.remove('can', 'drop'); }); });
      b.addEventListener('click', function (e) { move(from, id, e.shiftKey ? n : 1); });
      return b;
    }
    function fill(z, from, src, priceFn, min) {
      z.grid.innerHTML = '';
      var ids = Object.keys(src).filter(function (id) { return C.ITEMS[id] && avail(from, id) > 0; })
        .sort(function (a, b) { return C.ITEMS[a].cat.localeCompare(C.ITEMS[b].cat) || C.ITEMS[b].v - C.ITEMS[a].v; });
      ids.forEach(function (id) { z.grid.appendChild(slot(from, id, avail(from, id), priceFn(id))); });
      var cols = 4;
      var total = Math.max(min, ids.length + (ids.length % cols ? cols - ids.length % cols : 0));
      for (var i = ids.length; i < total; i++) z.grid.appendChild(U.el('div', 'loot-slot empty'));
      return ids.length;
    }
    function sum(obj, priceFn) { var t = 0; for (var k in obj) t += obj[k] * priceFn(k); return t; }

    var ok = U.el('button', 'btn', 'Échanger');
    function render() {
      fill(zMine, 'mine', G().st.inventory, buyP, 12);
      fill(zStock, 'stock', stock, sellP, 12);
      var ng = fill(zGive, 'give', give, buyP, 4), nt = fill(zTake, 'take', take, sellP, 4);
      if (!ng) zGive.grid.insertAdjacentHTML('afterbegin', '<div class="loot-empty">Glissez vos objets</div>');
      if (!nt) zTake.grid.insertAdjacentHTML('afterbegin', '<div class="loot-empty">Ce que vous voulez</div>');
      var gv = sum(give, buyP), tv = sum(take, sellP), diff = gv - tv;
      zGive.sum.textContent = gv + ' ¤'; zTake.sum.textContent = tv + ' ¤';
      // Sac : un échange qui l'alourdit doit tenir dans la place libre
      var over = 0;
      if (inBag) {
        var inv0 = G().st.inventory, inv1 = U.copy(inv0), k1;
        for (k1 in give) inv1[k1] = (inv1[k1] || 0) - give[k1];
        for (k1 in take) inv1[k1] = (inv1[k1] || 0) + take[k1];
        var before = C.Explore.slots(inv0), after = C.Explore.slots(inv1), cap = C.Explore.capacity(s);
        over = after > before ? after - Math.max(cap, before) : 0;
      }
      if (inBag) {
        var capB = C.Explore.capacity(s), usedB = C.Explore.slots(G().st.inventory);
        zMine.el.classList.add('bag');
        zMine.sum.textContent = usedB + ' / ' + capB + ' cases';
        zMine.sum.classList.toggle('full', usedB >= capB);
      }
      // Balance : penche du côté le plus lourd
      var tilt = U.clamp(diff / Math.max(10, gv + tv), -1, 1);
      var verdict = !gv && !tv ? 'Choisissez quoi échanger.' : over > 0 ? 'Le sac serait trop plein (' + over + ' case' + (over > 1 ? 's' : '') + ' de trop).' : !tv ? '« Et vous voulez quoi, en échange ? »' : diff >= 0 ? (diff > tv * 0.5 ? '« Marché conclu ! » (il y gagne largement)' : '« Ça me va. »') : '« Ce n\'est pas assez. Il manque ' + (-diff) + ' ¤. »';
      scale.innerHTML = '<div class="ts-beam" style="transform:rotate(' + (-tilt * 9).toFixed(1) + 'deg)"><i class="ts-pan l"></i><i class="ts-pan r"></i></div><div class="ts-post"></div>' +
        '<div class="ts-vals"><b class="' + (diff >= 0 ? 'ok' : 'ko') + '">' + gv + ' ¤</b><span>contre</span><b>' + tv + ' ¤</b></div>' +
        '<div class="trade-say' + (over > 0 || (tv && diff < 0) ? ' bad' : '') + '">' + U.esc(verdict) + '</div>';
      ok.disabled = !tv || diff < 0 || over > 0;
      fitRows(zMine.grid, 3); fitRows(zStock.grid, 3); fitRows(zGive.grid, 2); fitRows(zTake.grid, 2);
    }
    function fitRows(grid, rows) {
      requestAnimationFrame(function () {
        var sl = grid.querySelector('.loot-slot'); if (!sl) return;
        var gap = parseFloat(getComputedStyle(grid).rowGap) || 6;
        grid.style.maxHeight = (sl.offsetHeight * rows + gap * (rows - 1) + 3) + 'px';
      });
    }

    ok.addEventListener('click', function () {
      G().removeItems(give);
      G().addItems(take);
      for (var k in take) { stock[k] -= take[k]; if (stock[k] <= 0) delete stock[k]; }
      for (k in give) stock[k] = (stock[k] || 0) + give[k];
      var txt = 'Troc : donné ' + C.Night.itemsText(give) + ' — reçu ' + C.Night.itemsText(take) + '.';
      if (C.Explore && C.Explore.active) C.Explore.ev('trade', { name: who, gave: U.copy(give), got: U.copy(take) });
      G().log(txt, 'action');
      if (C.Render.pop) C.Render.pop(s, Object.keys(take).map(function (id) { return { item: id, n: take[id] }; }).concat(Object.keys(give).map(function (id) { return { item: id, n: -give[id] }; })));
      if (C.Audio.ready) C.Audio.sfx.pickup();
      give = {}; take = {};
      render();
    });
    var close = U.el('button', 'btn ghost', 'Terminer');
    close.addEventListener('click', function () { C.UI.closeModal(); if (onDone) onDone(); });
    p.foot.appendChild(close); p.foot.appendChild(ok);
    render();
    C.UI.modal(p);
  };
})(window.CQR);
