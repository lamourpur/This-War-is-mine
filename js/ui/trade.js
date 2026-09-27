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

  // opts : { name (du marchand), likes ({objet: multiplicateur}), bag (échange depuis le sac, poids limité) }
  TradeUI.open = function (s, stock, onDone, opts) {
    opts = opts || {};
    var nego = G().hasTrait(s, 'negociateur');
    var likes = opts.likes || {};
    var who = opts.name || 'Le marchand';
    var mine = {}, theirs = {};
    // Ce que le marchand recherche, il le paie plus cher
    function buyP(id, n2) { return Math.max(1, Math.round(Trade.buyPrice(id, n2) * (likes[id] || 1))); }
    function sellP(id, n2) { return Trade.sellPrice(id, n2); }
    var p = C.UI.panel('Troc' + (opts.name ? ' avec ' + U.esc(opts.name) : ''), U.esc(s.name.split(' ')[0]) + ' négocie' + (nego ? ' — négociateur : bien meilleurs prix' : '') + ' · clic : 1, Maj+clic : 5', { foot: true, noClose: true, wide: true });
    if (opts.face) {
      var fr = U.el('div', 'trade-face');
      fr.appendChild(C.UI.portrait(opts.face.s, 70, 84));
      fr.appendChild(U.el('div', '', '<b>' + U.esc(who) + '</b><span>' + U.esc(opts.faceLine || 'Voyons ce que vous avez.') + '</span>'));
      p.body.appendChild(fr);
    }
    var wantList = Object.keys(likes).filter(function (k) { return likes[k] > 1; });
    var market = C.Market ? C.Market.wanted(G().st) : [];
    if (market.length) p.body.appendChild(U.el('p', 'trade-wants market', C.Icon('alert') + '<span>Pénurie en ville : ' + U.esc(C.Market.wantedText(G().st)) + ' valent bien plus cher en ce moment (à l\'achat comme à la vente).</span>'));
    if (wantList.length) p.body.appendChild(U.el('p', 'trade-wants', C.Icon('star') + '<span>' + U.esc(who) + ' recherche : ' + wantList.map(function (k) { return C.ITEMS[k].name.toLowerCase(); }).join(', ') + '</span>'));
    var wrap = U.el('div', 'trade');
    p.body.appendChild(wrap);

    function avail(obj, offered, id) { return (obj[id] || 0) - (offered[id] || 0); }

    function list(title, src, offered, priceFn, onPick) {
      var col = U.el('div', 'trade-col');
      col.innerHTML = '<h3>' + C.Icon(title === who ? 'trade' : 'stock') + U.esc(title) + '</h3>';
      var box = U.el('div', 'trade-list');
      Object.keys(src).filter(function (id) { return avail(src, offered, id) > 0; }).sort(function (a, b) { return C.ITEMS[a].cat.localeCompare(C.ITEMS[b].cat); }).forEach(function (id) {
        var liked = priceFn === buyP && (likes[id] || 1) > 1;
        var rare = scarcity(id) > 1.4;
        var row = U.el('div', 'trade-row' + (liked ? ' liked' : '') + (rare ? ' rare' : ''), '<span class="inv-art sm">' + C.ItemArt.img(id, 30) + '</span><span class="n">' + C.ITEMS[id].name + (liked ? ' <em>recherché</em>' : rare ? ' <em class="rare">pénurie</em>' : '') + '</span><span class="v">' + priceFn(id, nego) + '¤</span><span class="q">' + avail(src, offered, id) + '</span>');
        row.title = 'Clic : 1 · Maj+clic : 5';
        row.addEventListener('click', function (e) { onPick(id, e.shiftKey ? 5 : 1); });
        box.appendChild(row);
      });
      if (!box.children.length) box.innerHTML = '<div class="trade-row"><i>Rien</i></div>';
      col.appendChild(box);
      return col;
    }

    function sum(obj, priceFn) { var t = 0; for (var k in obj) t += obj[k] * priceFn(k, nego); return t; }

    function offerBox(obj, priceFn, onRemove) {
      var box = U.el('div', 'trade-offer');
      Object.keys(obj).forEach(function (id) {
        if (!obj[id]) return;
        var row = U.el('div', 'trade-row', '<span class="n">' + C.ITEMS[id].name + '</span><span class="q">' + obj[id] + '</span>');
        row.title = 'Retirer';
        row.addEventListener('click', function () { onRemove(id); });
        box.appendChild(row);
      });
      if (!box.children.length) box.innerHTML = '<i style="font-size:11px;color:#6a6252">—</i>';
      return box;
    }

    function wsum(obj) { var w = 0; for (var k in obj) w += obj[k] * (C.ITEMS[k] ? C.ITEMS[k].w : 1); return w; }
    function render() {
      wrap.innerHTML = '';
      var give = sum(mine, buyP), take = sum(theirs, sellP);
      wrap.appendChild(list(opts.bag ? 'Votre sac' : 'Votre réserve', G().st.inventory, mine, buyP, function (id, n) {
        mine[id] = Math.min((mine[id] || 0) + n, G().count(id)); render();
      }));
      var mid = U.el('div', 'trade-mid');
      var diff = give - take;
      var pct = U.clamp(50 + (diff / Math.max(10, give + take)) * 50, 0, 100);
      mid.appendChild(U.el('div', '', '<div class="lab">Vous donnez</div><b class="trade-verdict">' + give + ' ¤</b>'));
      mid.appendChild(offerBox(mine, buyP, function (id) { mine[id]--; if (!mine[id]) delete mine[id]; render(); }));
      var bal = U.el('div', 'balance'); var sp = U.el('span');
      sp.style.left = Math.min(50, pct) + '%'; sp.style.right = (100 - Math.max(50, pct)) + '%';
      sp.style.background = diff >= 0 ? '#3f5a2a' : '#a4472c';
      bal.appendChild(sp); mid.appendChild(bal);
      mid.appendChild(offerBox(theirs, sellP, function (id) { theirs[id]--; if (!theirs[id]) delete theirs[id]; render(); }));
      // Sac : un échange qui alourdit le sac doit tenir dans la place libre ;
      // un échange qui l'allège passe toujours (même si le sac déborde déjà)
      var over = 0;
      if (opts.bag && C.Explore && C.Explore.active) {
        var inv0 = G().st.inventory, inv1 = U.copy(inv0), k1;
        for (k1 in mine) inv1[k1] = (inv1[k1] || 0) - mine[k1];
        for (k1 in theirs) inv1[k1] = (inv1[k1] || 0) + theirs[k1];
        var before = C.Explore.slots(inv0), after = C.Explore.slots(inv1), cap = C.Explore.capacity(s);
        over = after > before ? after - Math.max(cap, before) : 0;
      }
      var verdict = !give && !take ? 'Choisissez quoi échanger.' : over > 0 ? 'Le sac serait trop plein (' + over + ' case' + (over > 1 ? 's' : '') + ' de trop).' : diff >= 0 ? (diff > take * 0.5 && take > 0 ? '« Marché conclu ! » (il y gagne)' : '« Ça me va. »') : '« Ce n\'est pas assez. »';
      mid.appendChild(U.el('div', '', '<div class="lab">Vous recevez</div><b class="trade-verdict">' + take + ' ¤</b>'));
      mid.appendChild(U.el('div', 'trade-say' + (over > 0 ? ' bad' : ''), verdict));
      wrap.appendChild(mid);
      wrap.appendChild(list(who, stock, theirs, sellP, function (id, n) {
        theirs[id] = Math.min((theirs[id] || 0) + n, stock[id]); render();
      }));
      ok.disabled = !(take > 0 || give > 0) || diff < 0 || !take || over > 0;
    }

    var ok = U.el('button', 'btn', 'Échanger');
    ok.addEventListener('click', function () {
      G().removeItems(mine);
      G().addItems(theirs);
      for (var k in theirs) { stock[k] -= theirs[k]; if (stock[k] <= 0) delete stock[k]; }
      for (k in mine) stock[k] = (stock[k] || 0) + mine[k];
      var txt = 'Troc : donné ' + C.Night.itemsText(mine) + ' — reçu ' + C.Night.itemsText(theirs) + '.';
      if (C.Explore && C.Explore.active) C.Explore.ev('trade', { name: who, gave: U.copy(mine), got: U.copy(theirs) });
      G().log(txt, 'action');
      C.UI.toast(txt, 'done');
      if (C.Audio.ready) C.Audio.sfx.pickup();
      mine = {}; theirs = {};
      render();
    });
    var close = U.el('button', 'btn ghost', 'Terminer');
    close.addEventListener('click', function () { C.UI.closeModal(); if (onDone) onDone(); });
    p.foot.appendChild(close); p.foot.appendChild(ok);
    render();
    C.UI.modal(p);
  };
})(window.CQR);
