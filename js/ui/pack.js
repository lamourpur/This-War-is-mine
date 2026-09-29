/* =========================================================
   Préparer l'expédition (écran plein, comme dans This War of Mine)
   Une fois le lieu et l'explorateur choisis : la réserve à gauche, le sac
   à droite, on glisse les objets de l'un à l'autre. À côté, ce que l'on
   sait du lieu (portes fermées, grilles, habitants et leurs besoins…),
   et les objets de la réserve qui pourraient servir là-bas sont signalés.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util, UI = C.UI;
  function G() { return C.Game; }
  function first(s) { return s.name.split(' ')[0]; }
  function I(n) { return C.Icon(n); }

  // Outils, armes et munitions du sac → équipement (défense, pillage abstrait)
  UI.syncBag = function (plan) {
    var b = plan.scav.bag;
    plan.scav.equip = [];
    Object.keys(b).forEach(function (id) {
      var it = C.ITEMS[id];
      if (it.tool || it.weapon || it.armor) for (var i = 0; i < b[id]; i++) plan.scav.equip.push(id);
    });
    plan.scav.ammo = b.munitions || 0;
  };

  function toolsText(tools) { return (tools || []).map(function (t) { return C.ITEMS[t].name.toLowerCase(); }).join(' ou '); }

  // Ce que l'on sait du lieu. Chaque ligne : { icon, t, k (bad|info|good), need: [ids utiles] }
  UI.locationIntel = function (st, id) {
    var l = C.locationDef(id), ls = st.locations[id] || {}, map = C.MAPS[id], out = [];
    var hostile = Object.keys(ls.hostile || {}).length > 0;
    if (!ls.visits) {
      out.push({ icon: 'help', t: 'Jamais exploré. Vous ne savez pas ce qui vous attend là-bas.', k: 'info' });
      out.push({ icon: l.residents === 'aucun' ? 'pack' : l.residents === 'civils' ? 'user' : 'shield', t: 'On dit : ' + C.RESIDENT_LABELS[l.residents].toLowerCase() + ' · ' + C.DANGER_LABELS[l.danger].toLowerCase() + '.', k: l.danger >= 2 ? 'bad' : 'info' });
      if (l.stash) out.push({ icon: 'alert', t: 'Une réserve y serait fermée à clé (' + toolsText(l.stash.tool) + ').', k: 'info', need: l.stash.tool });
      if (l.residents === 'militaires' || l.residents === 'bandits') out.push({ icon: 'shield', t: 'Des hommes armés : une arme, des munitions et un gilet peuvent sauver la vie.', k: 'bad', need: ['pistolet', 'pistolet_silencieux', 'fusil', 'fusil_pompe', 'fusil_assaut', 'fusil_lunette', 'munitions', 'gilet', 'casque', 'couteau', 'hachette'] });
      return out;
    }
    out.push({ icon: 'journal', t: 'Déjà exploré ' + ls.visits + ' fois.' + (hostile ? ' Ses occupants vous en veulent.' : ''), k: hostile ? 'bad' : 'info' });
    if (!map) return out;
    var armed = {}, doors = 0, doorTools = [], locked = [], grates = 0, blocks = 0;
    map.objects.forEach(function (d) {
      if (d.only && !C.Explore.onlyOK(d, ls)) return;
      var sv = ls.map && ls.map[d.key];
      if (sv === 'gone') return;
      var o = U.copy(d); if (sv) for (var k in sv) o[k] = sv[k];
      if (o.kind === 'door' && !o.open) { doors++; (o.tools || []).forEach(function (t) { if (doorTools.indexOf(t) < 0) doorTools.push(t); }); }
      else if (o.kind === 'cache' && o.locked) locked.push(o);
      else if (o.kind === 'grate') grates++;
      else if (o.kind === 'rubble' && o.block) blocks++;
      else if (o.kind === 'guard') {
        var T = C.GUARD_TYPES[o.type] || {};
        if (T.unseen) armed['Un tireur embusqué'] = (armed['Un tireur embusqué'] || 0) + 1;
        else { var nm = /soldat|sergent|intendant/i.test(o.type + ' ' + (T.name || '')) ? 'soldat' : 'homme armé'; armed[nm] = (armed[nm] || 0) + 1; }
      } else if (o.kind === 'npc' && C.NPCS[o.npc]) {
        var nd = C.NPCS[o.npc], ns = (ls.npc || {})[o.npc] || {};
        if (!ns.talk && !ns.helped) return;               // pas encore rencontré
        if (nd.need && !ns.helped) out.push({ icon: 'user', t: nd.name + ' a besoin de : ' + C.itemsText(nd.need.items) + '.', k: 'good', need: Object.keys(nd.need.items) });
        if (nd.trade && !ls.angry && !ns.robbed) {
          var likes = Object.keys(nd.trade.likes || {}).filter(function (x) { return nd.trade.likes[x] > 1.25; });
          out.push({ icon: 'trade', t: nd.name + ' fait du troc' + (likes.length ? ' et paie bien : ' + likes.map(function (x) { return C.ITEMS[x].name.toLowerCase(); }).join(', ') : '') + '.', k: 'info', need: likes });
        }
      }
    });
    if (doors) out.push({ icon: 'door', t: (doors > 1 ? doors + ' portes fermées' : 'Une porte fermée') + ' à clé : ' + toolsText(doorTools) + '.', k: 'info', need: doorTools });
    locked.forEach(function (o) { out.push({ icon: 'alert', t: (o.label || C.CACHE_NAMES[o.variant] || 'Un coffre') + ' verrouillé : ' + toolsText(o.tools) + '.', k: 'info', need: o.tools }); });
    if (grates) out.push({ icon: 'wrench', t: 'Une grille soudée barre un passage : il faut une scie à métaux.', k: 'info', need: ['scie'] });
    if (blocks) out.push({ icon: 'hammer', t: 'Un éboulis bloque un passage : une pelle ira deux fois plus vite.', k: 'info', need: ['pelle'] });
    var ak = Object.keys(armed);
    if (ak.length) out.push({ icon: 'shield', t: 'Présence armée : ' + ak.map(function (k) { return k.indexOf('Un ') === 0 ? k.toLowerCase() : armed[k] + ' ' + k + (armed[k] > 1 ? 's' : ''); }).join(', ') + (hostile ? ', hostiles.' : '.'), k: 'bad', need: ['pistolet', 'pistolet_silencieux', 'fusil', 'fusil_pompe', 'fusil_assaut', 'fusil_lunette', 'munitions', 'gilet', 'casque', 'couteau', 'hachette'] });
    if (out.length === 1) out.push({ icon: 'pack', t: 'Rien de particulier à prévoir. Gardez de la place pour le butin.', k: 'good' });
    return out;
  };

  // plan : plan de nuit · s : explorateur · onGo : départ
  UI.openPack = function (plan, s, onGo, onClose) {
    var st = G().st, loc = C.locationDef(plan.scav.loc), bag = plan.scav.bag, cap = C.Explore.capacity(s) - (s.gearSlots || 0);
    var p = UI.panel('Préparer l\'expédition', U.esc(first(s)) + ' part vers : ' + U.esc(loc.name) + ' · glissez les objets dans son sac', { dark: true, foot: true, noClose: true, wide: true });
    p.classList.add('pack-screen');

    // Bandeau : l'explorateur et le lieu
    var ban = U.el('div', 'pack-banner');
    ban.style.backgroundImage = 'url(assets/locations/' + loc.id + '.jpg)';
    var who = U.el('div', 'pack-who');
    who.appendChild(UI.portrait(s, 64, 78));
    var traits = s.traits.map(function (t) { return C.TRAITS[t].name; }).join(', ');
    who.appendChild(U.el('div', '', '<b>' + U.esc(s.name) + '</b><span>' + U.esc(C.Surv.states(s).map(function (x) { return x.t; }).join(', ') || 'En forme') + '</span><i>' + U.esc(traits) + '</i>'));
    ban.appendChild(who);
    ban.appendChild(U.el('div', 'pack-loc', '<b>' + U.esc(loc.name) + '</b><span class="danger' + loc.danger + '">' + C.DANGER_LABELS[loc.danger] + '</span>'));
    p.body.appendChild(ban);

    var wrap = U.el('div', 'pack-wrap');
    p.body.appendChild(wrap);
    var res = side('res', 'Réserve du refuge', 'Réserve');
    var sac = side('bag', 'Sac de ' + first(s), 'Sac');
    var meter = U.el('div', 'bag-meter'); sac.el.insertBefore(meter, sac.grid);
    var intelBox = U.el('div', 'pack-intel');
    wrap.appendChild(res.el); wrap.appendChild(U.el('div', 'loot-mid', I('trade') + '<span>Glisser</span>')); wrap.appendChild(sac.el); wrap.appendChild(intelBox);
    p.body.appendChild(U.el('p', 'loot-hint', 'Glisser-déposer : toute la pile · Clic : un objet · Maj + clic : toute la pile. Ce que vous emportez prend des cases, qui ne serviront plus au butin.'));

    var intel = UI.locationIntel(st, loc.id), useful = {};
    intel.forEach(function (it) { (it.need || []).forEach(function (id) { if (!useful[id]) useful[id] = it.t; }); });
    intelBox.innerHTML = '<div class="loot-title"><span class="tb-k">Ce que l\'on sait</span><b>' + U.esc(loc.name) + '</b></div>' +
      intel.map(function (it) { return '<div class="pi ' + (it.k || '') + '">' + I(it.icon) + '<span>' + U.esc(it.t) + '</span></div>'; }).join('') +
      '<div class="pi-legend"><i class="star">★</i> utile là-bas</div>';

    var drag = { from: null, id: null };
    function side(key, title, label) {
      var el = U.el('div', 'loot-side ' + key);
      el.innerHTML = '<div class="loot-title"><span class="tb-k">' + label + '</span><b>' + U.esc(title) + '</b></div>';
      var grid = U.el('div', 'loot-grid');
      el.appendChild(grid);
      el.addEventListener('dragover', function (e) { if (drag.from && drag.from !== key) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; el.classList.add('drop'); } });
      el.addEventListener('dragleave', function (e) { if (!el.contains(e.relatedTarget)) el.classList.remove('drop'); });
      el.addEventListener('drop', function (e) {
        e.preventDefault(); el.classList.remove('drop');
        if (drag.from && drag.from !== key) move(drag.from, drag.id, drag.n);
      });
      return { el: el, grid: grid };
    }
    function avail(id) { return G().count(id) - (bag[id] || 0); }
    // Déplace jusqu'à n objets ; vers le sac, autant que la place le permet
    function move(from, id, n) {
      if (from === 'res') {
        n = Math.min(n, avail(id));
        for (; n > 0; n--) { var t = U.copy(bag); t[id] = (t[id] || 0) + n; if (C.Explore.slots(t) <= cap) break; }
        if (n <= 0) { if (C.Audio.ready) C.Audio.sfx.deny(); meter.classList.remove('full'); void meter.offsetWidth; meter.classList.add('full'); return; }
        bag[id] = (bag[id] || 0) + n;
      } else {
        n = Math.min(n, bag[id] || 0); if (!n) return;
        bag[id] -= n; if (bag[id] <= 0) delete bag[id];
      }
      if (C.Audio.ready) C.Audio.sfx.pickup();
      UI.syncBag(plan);
      render();
    }
    function slot(from, id, n, label) {
      var it = C.ITEMS[id];
      var b = U.el('div', 'loot-slot' + (from === 'res' && useful[id] ? ' useful' : ''));
      b.draggable = true;
      b.innerHTML = C.ItemArt.img(id, 46) + '<span class="q">' + (label || n) + '</span><span class="nm">' + U.esc(it.name) + '</span>' + (from === 'res' && useful[id] ? '<i class="star">★</i>' : '');
      b.title = it.name + ' × ' + n + (from === 'res' && useful[id] ? ' — utile là-bas : ' + useful[id] : it.desc ? ' — ' + it.desc : '');
      b.addEventListener('dragstart', function (e) {
        drag.from = from; drag.id = id; drag.n = from === 'res' ? avail(id) : n;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        var img = b.querySelector('img'); if (img && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(img, 23, 23);
        b.classList.add('dragging');
      });
      b.addEventListener('dragend', function () { b.classList.remove('dragging'); drag.from = null; });
      b.addEventListener('click', function (e) { move(from, id, e.shiftKey ? (from === 'res' ? avail(id) : n) : 1); });
      return b;
    }
    function render() {
      // Réserve : ce qui n'est pas déjà dans le sac, les objets utiles d'abord
      res.grid.innerHTML = '';
      var ids = Object.keys(C.ITEMS).filter(function (k) { return avail(k) > 0; });
      ids.sort(function (a, b) { return (useful[b] ? 1 : 0) - (useful[a] ? 1 : 0); });
      ids.forEach(function (k) { res.grid.appendChild(slot('res', k, avail(k))); });
      if (!ids.length) res.grid.innerHTML = '<div class="loot-empty">La réserve est vide</div>';
      // Sac : une case par pile, cases vides jusqu'à la capacité
      sac.grid.innerHTML = '';
      var used = 0;
      Object.keys(bag).forEach(function (k) {
        var stk = C.stackOf(k), left = bag[k];
        while (left > 0) { var n = Math.min(stk, left); var sl = slot('bag', k, n, n + '/' + stk); if (n >= stk) sl.classList.add('full-stack'); sac.grid.appendChild(sl); left -= n; used++; }
      });
      for (var j = used; j < cap; j++) sac.grid.appendChild(U.el('div', 'loot-slot empty'));
      meter.innerHTML = '<span>Cases</span><div class="bm-bar"><i style="width:' + Math.min(100, used / cap * 100) + '%"></i></div><b>' + used + ' / ' + cap + '</b>';
      var gun = Object.keys(bag).some(function (x) { return C.ITEMS[x].ammo; });
      warn.innerHTML = gun && !bag.munitions ? I('alert') + '<span>Pas de munitions dans le sac : l\'arme à feu ne pourra pas tirer.</span>' : '';
    }
    var warn = U.el('p', 'pack-warn');
    sac.el.appendChild(warn);

    var back = U.el('button', 'btn ghost', '← Retour');
    back.addEventListener('click', function () { UI.closeModal(); });
    var empty = U.el('button', 'btn ghost', 'Vider le sac');
    empty.addEventListener('click', function () { Object.keys(bag).forEach(function (k) { delete bag[k]; }); UI.syncBag(plan); render(); });
    var go = U.el('button', 'btn', 'Partir en exploration');
    go.addEventListener('click', function () { UI.closeModal(); if (onGo) onGo(); });
    p.foot.appendChild(back); p.foot.appendChild(empty); p.foot.appendChild(go);
    render();
    UI.modal(p, { onClose: onClose });
  };
})(window.CQR);
