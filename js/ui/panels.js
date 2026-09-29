/* =========================================================
   Fenêtres : réserve, dossier d'un survivant, établi, journal,
   pause, sauvegardes, options, aide, visiteurs, rapport du
   matin, fin de partie
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util, UI = C.UI;
  function G() { return C.Game; }
  function I(n, c) { return C.Icon(n, c); }
  function first(s) { return s.name.split(' ')[0]; }

  var TRAIT_ICON = {
    cuisinier: 'hunger', negociateur: 'trade', rapide: 'ff', grand_sac: 'pack', bricoleur: 'hammer', combattant: 'shield',
    soigneur: 'health', empathique: 'moral', fumeur: 'c_confort', cafeinomane: 'c_confort', lecteur: 'journal', endurant: 'star', cynique: 'skull',
    discret: 'moon', costaud: 'pack', lent: 'clock', fragile: 'sick', econome: 'wrench'
  };
  UI.traitBadge = function (t) {
    return '<span class="trait" title="' + U.esc(C.TRAITS[t].desc) + '">' + I(TRAIT_ICON[t] || 'star') + C.TRAITS[t].name + '</span>';
  };

  // ------------------------------------------------ réserve
  UI.openStock = function () {
    var inv = G().st.inventory;
    var total = 0; for (var k in inv) total += inv[k];
    var p = UI.panel('Réserve', total + ' objets · valeur de troc estimée : ' + G().inventoryValue() + ' ¤', { wide: true });
    var html = '';
    var sh = C.Market && C.Market.current(G().st);
    if (sh) html += '<p class="trade-wants market">' + I('alert') + '<span><b>Pénurie en ville</b> : ' + U.esc(C.Market.wantedText(G().st)) + ' valent bien plus cher au troc en ce moment.</span></p>';
    C.ITEM_CATS.forEach(function (cat) {
      var ids = Object.keys(C.ITEMS).filter(function (id) { return C.ITEMS[id].cat === cat[0] && inv[id] > 0; });
      if (!ids.length) return;
      var n = 0; ids.forEach(function (id) { n += inv[id]; });
      html += '<div class="inv-cat"><h3>' + I('c_' + cat[0]) + cat[1] + ' <small>' + n + '</small></h3><div class="inv-grid">';
      ids.forEach(function (id) {
        var it = C.ITEMS[id];
        var hot = C.Market && C.Market.mult(id) > 1;
        var wl = C.WEAR_MAX[id] ? G().wearLeft(id) : null;
        var wtxt = wl != null ? ' — État de l\'exemplaire en service : ' + Math.round(wl * 100) + ' %' + (wl < 0.3 ? ' (va bientôt casser ; l\'atelier d\'armurier peut le remettre en état)' : '') : '';
        html += '<div class="inv-item' + (hot ? ' hot' : '') + '" title="' + U.esc(it.desc + wtxt) + (hot ? ' — Très recherché en ce moment !' : '') + '"><span class="inv-art">' + C.ItemArt.img(id, 52) + (wl != null ? '<i class="inv-wear' + (wl < 0.3 ? ' low' : '') + '" style="width:' + Math.round(wl * 100) + '%"></i>' : '') + '</span><span class="inv-name">' + it.name + '</span><span class="inv-qty">' + inv[id] + '</span></div>';
      });
      html += '</div></div>';
    });
    p.body.innerHTML = html || '<p class="empty-note">La réserve est vide. Il va falloir fouiller le refuge… et sortir la nuit.</p>';
    UI.modal(p);
  };

  // ------------------------------------------------ dossier d'un survivant
  UI.openBio = function (s) {
    if (s.merc) return;
    var d = C.survivorDef(s.defId);
    var p = UI.panel('Dossier', 'Survivant n° ' + (G().st.survivors.indexOf(s) + 1) + ' · refuge de la rue Maple', { wide: true });
    var grid = U.el('div', 'bio-grid');
    var left = U.el('div', 'bio-left');
    var photo = U.el('div', 'bio-photo');
    var cv = document.createElement('canvas');
    C.Render.portrait(cv, s, 212, 252);
    photo.appendChild(cv);
    var stampTxt = !s.alive ? ({ parti: 'Parti(e)' }[s.cause] || 'Décédé(e)') : s.moral < 15 ? 'Brisé(e)' : s.moral < 35 ? 'Déprimé(e)' : null;
    if (stampTxt) photo.appendChild(U.el('span', 'stamp', stampTxt));
    left.appendChild(photo);
    function gauge(icon, label, val, good) {
      var pct = Math.round(good ? val : 100 - val);
      var cls = pct < 30 ? 'crit' : pct < 55 ? 'warn' : '';
      return '<div class="bio-gauge">' + I(icon) + '<span>' + label + '</span><b><i class="' + cls + '" style="width:' + pct + '%"></i></b><em>' + pct + '</em></div>';
    }
    left.appendChild(U.el('div', '', gauge('hunger', 'Satiété', s.hunger) + gauge('fatigue', 'Énergie', s.fatigue) + gauge('wound', 'Blessures', s.wound) + gauge('sick', 'Santé', s.sick) + gauge('moral', 'Moral', s.moral, true)));
    grid.appendChild(left);

    var right = U.el('div', 'bio-right');
    var states = s.alive ? C.Surv.states(s).map(function (x) { return '<span class="tag l' + x.lv + (x.good ? ' good' : '') + '"' + (x.tip ? ' title="' + U.esc(x.tip) + '"' : '') + '>' + (x.k === 'good' ? '★ ' : '') + x.t + '</span>'; }).join('') + (C.Surv.thriving(s) ? '<p class="thrive-note">' + U.esc(C.Surv.THRIVE_TIP) + '</p>' : '') : '';
    right.innerHTML =
      '<div class="k">Nom</div><div class="bio-name">' + U.esc(s.name) + '</div>' +
      '<div class="bio-job">' + d.age + ' ans · ' + U.esc(d.job) + '</div>' +
      '<p class="bio-text">' + U.esc(d.bio) + '</p>' +
      '<div class="bio-mood"><b>' + (s.alive ? C.Surv.moralLabel(s) : 'Hors du refuge') + '</b>' + states + '</div>' +
      '<h3>' + I('star') + 'Traits</h3><div class="traits">' + s.traits.map(UI.traitBadge).join('') + '</div>' +
      '<div style="margin-top:10px">' + s.traits.map(function (t) { return '<div class="bio-trait"><b>' + C.TRAITS[t].name + '.</b> ' + C.TRAITS[t].desc + '</div>'; }).join('') + '</div>' +
      '<h3>' + I('journal') + 'Son histoire</h3>' +
      '<div class="bio-story">' + ((s.story || []).slice().reverse().map(function (x) { return '<div class="bs"><span>Jour ' + x.d + '</span>' + U.esc(x.t) + '</div>'; }).join('') || '<div class="bs">Rien encore.</div>') + '</div>' +
      '<h3>' + I('journal') + 'Pensées</h3>';
    var th = U.el('div', 'thoughts');
    var list = (s.thoughts || []).slice().reverse();
    if (!list.length) th.innerHTML = '<div class="th">Rien encore. Les jours passent, les pensées viendront.</div>';
    list.forEach(function (x) { th.appendChild(U.el('div', 'th', '<span>Jour ' + x.d + '</span>« ' + U.esc(x.t) + ' »')); });
    right.appendChild(th);
    grid.appendChild(right);
    p.body.appendChild(grid);
    UI.modal(p);
  };

  // ------------------------------------------------ établi
  var TAB_ICON = { outils: 'wrench', mobilier: 'bed', divers: 'stock', etabli: 'hammer' };
  UI.openCraft = function (wb, tab) {
    tab = tab || 'outils';
    var p = UI.panel('Établi', 'Niveau ' + wb.level + ' sur 3 · les ressources sont consommées au début du travail', { wide: true });
    var s = UI.selectedSurv();
    var who = U.el('div', 'who-line');
    var opts = G().present().map(function (x) {
      return '<option value="' + x.id + '"' + (s && x.id === s.id ? ' selected' : '') + '>' + U.esc(x.name) + (x.act ? ' (occupé·e)' : '') + (C.Game.hasTrait(x, 'bricoleur') ? ' — bricoleur' : '') + '</option>';
    }).join('');
    who.innerHTML = I('user') + '<span>Qui travaille :</span><select>' + opts + '</select>';
    p.body.appendChild(who);
    var sel = who.querySelector('select');

    var tabs = U.el('div', 'tabs');
    C.CRAFT_TABS.forEach(function (t) {
      var b = U.el('button', 'tab' + (t[0] === tab ? ' on' : ''), I(TAB_ICON[t[0]]) + t[1]);
      b.addEventListener('click', function () { UI.closeModal(); UI.openCraft(wb, t[0]); });
      tabs.appendChild(b);
    });
    p.body.appendChild(tabs);

    var grid = U.el('div', 'recipes');
    C.CRAFTS.filter(function (r) { return r.tab === tab; }).forEach(function (r) {
      if (r.upgradeWB && wb.level >= r.upgradeWB) return;
      var locked = wb.level < r.lvl;
      var el = U.el('div', 'recipe' + (locked ? ' locked' : ''));
      var desc = r.build ? C.BUILDINGS[r.build].desc : r.upgradeWB ? 'Débloque de nouvelles recettes.' : C.ITEMS[Object.keys(r.give)[0]].desc;
      var owned = r.build ? G().countBuilt(r.build) + G().st.pending.filter(function (x) { return x === r.build; }).length : null;
      var rc = C.craftCost(r, s);
      var cost = Object.keys(rc).map(function (k) {
        var ok = G().count(k) >= rc[k];
        return '<span class="chip ' + (ok ? 'ok' : 'ko') + '">' + C.ItemArt.img(k, 22) + rc[k] + (rc[k] < r.cost[k] ? '<s>' + r.cost[k] + '</s>' : '') + ' ' + C.ItemArt.shortName(k) + ' <small>(' + G().count(k) + ')</small></span>';
      }).join('');
      var time = r.time * (s && G().hasTrait(s, 'bricoleur') ? 0.65 : 1);
      var art = r.give ? C.ItemArt.img(Object.keys(r.give)[0], 56) : C.ItemArt.buildingImg(r.build || 'workbench', 56);
      el.innerHTML = '<div class="recipe-top"><span class="inv-art' + (r.give ? '' : ' bld') + '">' + art + '</span><h4>' + C.craftName(r) + (owned ? ' <small>· ' + owned + ' déjà</small>' : '') + '</h4></div><div class="rdesc">' + desc + '</div><div class="rcost">' + cost + '</div>' +
        '<div class="rfoot"><span class="rtime">' + (locked ? I('alert') + 'Établi niveau ' + r.lvl + ' requis' : I('clock') + U.fmtDur(time)) + '</span></div>';
      var btn = U.el('button', 'btn small', 'Fabriquer');
      btn.disabled = locked || !G().has(rc);
      btn.addEventListener('click', function () {
        var who2 = G().surv(sel.value);
        if (!who2) return;
        UI.closeModal();
        UI.select(who2.id);
        C.Actions.start(who2, wb, 'craft', { rid: r.id });
      });
      el.querySelector('.rfoot').appendChild(btn);
      grid.appendChild(el);
    });
    p.body.appendChild(grid);
    UI.modal(p);
  };

  // ------------------------------------------------ journal
  UI.openLog = function () {
    var p = UI.panel('Journal', 'Carnet tenu par le groupe depuis le premier jour');
    var st = G().st, html = '', day = -1;
    st.log.slice().reverse().forEach(function (e) {
      if (e.d !== day) { day = e.d; html += '<div class="log-day">Jour ' + day + '</div>'; }
      html += '<div class="log-entry ' + e.kind + '"><span class="t">' + U.fmtClock(e.t) + '</span>' + U.esc(e.text) + '</div>';
    });
    p.body.innerHTML = html || '<p class="empty-note">Rien encore.</p>';
    UI.modal(p);
  };

  // ------------------------------------------------ pause
  UI.openPause = function () {
    if (UI.topModal()) return;
    var p = UI.panel('Pause', 'Jour ' + G().st.day + ' · ' + U.fmtClock(G().st.minute), { small: true, dark: true });
    var list = U.el('div', 'menu-btns');
    [
      ['Reprendre', function () { UI.closeModal(); }],
      ['Sauvegarder', function () { UI.openSaves('save'); }],
      ['Charger', function () { UI.openSaves('load'); }],
      ['Options', function () { UI.openOptions(); }],
      ['Comment jouer', function () { UI.openHelp(); }],
      ['Quitter vers le menu', function () {
        UI.dialog('Quitter ?', '<p class="dialog-text">La progression depuis la dernière sauvegarde sera perdue.<br><i>La sauvegarde automatique a lieu chaque matin.</i></p>', [
          { label: 'Annuler', cls: 'ghost' },
          { label: 'Quitter', cls: 'danger', run: function () { UI.closeAllModals(); C.Menus.openMain(); } }
        ], { dark: true });
      }]
    ].forEach(function (b, i) {
      var el = U.el('button', 'mbtn', '<span class="num">0' + (i + 1) + '</span>' + b[0]);
      el.addEventListener('click', b[1]);
      list.appendChild(el);
    });
    p.body.appendChild(list);
    UI.modal(p);
  };

  // ------------------------------------------------ sauvegardes
  function fmtDate(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  function slotLabel(slot) { return slot === 0 ? 'Automatique' : 'Emplacement ' + slot; }

  // mode : 'save' | 'load'
  UI.openSaves = function (mode, fromMenu) {
    if (mode === 'save' && C.Explore && C.Explore.active) { UI.toast('Impossible de sauvegarder pendant l\'exploration : rentrez d\'abord au refuge.', 'warn'); return; }
    var p = UI.panel(mode === 'save' ? 'Sauvegarder' : 'Charger', mode === 'save' ? 'Choisissez un emplacement' : 'Emplacements du navigateur et fichiers .sav', { dark: true, foot: true });
    var box = U.el('div', 'slots');
    var slots = mode === 'save' ? [1, 2, 3] : [0, 1, 2, 3];
    slots.forEach(function (slot) {
      var d = C.Save.read(slot);
      var row = U.el('div', 'slot');
      row.appendChild(U.el('div', 'slot-num', slot === 0 ? I('clock') : String(slot)));
      var info = U.el('div', 'slot-info');
      if (d) info.innerHTML = '<b>Jour ' + d.meta.day + ' · ' + d.meta.clock + (d.meta.winter ? ' · hiver' : '') + '</b><small>' + slotLabel(slot) + ' — ' + U.esc(d.meta.names.join(', ') || 'Aucun survivant') + ' — ' + fmtDate(d.savedAt) + '</small>';
      else info.innerHTML = '<b>' + slotLabel(slot) + '</b><small>Vide</small>';
      row.appendChild(info);
      if (mode === 'save') {
        var b = U.el('button', 'btn', I('save') + (d ? 'Écraser' : 'Sauvegarder'));
        b.addEventListener('click', function () {
          var ok = C.Save.write(slot, G().st);
          UI.toast(ok ? 'Partie sauvegardée (' + slotLabel(slot).toLowerCase() + ').' : 'Impossible d\'écrire la sauvegarde dans le navigateur. Utilisez « Exporter ».', ok ? 'done' : 'alert');
          UI.closeModal(); UI.openSaves('save');
        });
        row.appendChild(b);
      } else if (d) {
        var l = U.el('button', 'btn', I('load') + 'Charger');
        l.addEventListener('click', function () { UI.closeAllModals(); C.Main.loadState(d.state); });
        row.appendChild(l);
      }
      if (d && slot !== 0) {
        var del = U.el('button', 'btn ghost', 'Supprimer');
        del.addEventListener('click', function () {
          UI.dialog('Supprimer ?', '<p class="dialog-text">Supprimer définitivement « ' + slotLabel(slot) + ' » ?</p>', [
            { label: 'Annuler', cls: 'ghost' },
            { label: 'Supprimer', cls: 'danger', run: function () { C.Save.remove(slot); UI.closeModal(); UI.openSaves(mode, fromMenu); } }
          ], { dark: true });
        });
        row.appendChild(del);
      }
      box.appendChild(row);
    });
    p.body.appendChild(box);
    p.body.appendChild(U.el('p', 'save-note', 'Les emplacements sont stockés dans le navigateur. Pour garder une partie dans le dossier du jeu (<b>saves/</b>) ou la transférer sur un autre ordinateur, utilisez <b>Exporter</b> puis <b>Importer</b>.'));

    if (mode === 'save') {
      var ex = U.el('button', 'btn ghost', I('save') + 'Exporter en .sav');
      ex.addEventListener('click', function () { C.Save.exportFile(G().st); UI.toast('Fichier de sauvegarde exporté.', 'done'); });
      p.foot.appendChild(ex);
    }
    var imp = U.el('button', 'btn ghost', I('load') + 'Importer un .sav');
    var input = document.createElement('input');
    input.type = 'file'; input.accept = '.sav,application/json'; input.style.display = 'none';
    input.addEventListener('change', function () {
      if (!input.files[0]) return;
      C.Save.importFile(input.files[0], function (err, data) {
        if (err) { UI.toast(err, 'alert'); return; }
        UI.closeAllModals();
        C.Main.loadState(data.state);
        UI.toast('Partie importée : jour ' + data.meta.day + '.', 'done');
      });
    });
    imp.addEventListener('click', function () { input.click(); });
    p.foot.appendChild(imp); p.foot.appendChild(input);
    UI.modal(p);
  };

  // ------------------------------------------------ options
  UI.openOptions = function () {
    var S = C.Main.settings;
    var p = UI.panel('Options', 'Son et affichage', { small: true, dark: true });
    [['master', 'Volume général'], ['music', 'Musique'], ['ambience', 'Ambiance (vent, guerre)'], ['sfx', 'Effets sonores']].forEach(function (o) {
      var line = U.el('div', 'opt-line', '<label>' + o[1] + '</label>');
      var inp = document.createElement('input');
      var out = document.createElement('output');
      inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.05; inp.value = S[o[0]];
      out.textContent = Math.round(S[o[0]] * 100);
      inp.addEventListener('input', function () { S[o[0]] = +inp.value; out.textContent = Math.round(S[o[0]] * 100); C.Main.applySettings(); });
      inp.addEventListener('change', function () { C.Save.saveSettings(S); });
      line.appendChild(inp); line.appendChild(out);
      p.body.appendChild(line);
    });
    // Luminosité : de 70 % à 160 %
    var bl = U.el('div', 'opt-line', '<label>Luminosité</label>');
    var bi = document.createElement('input'), bo = document.createElement('output');
    bi.type = 'range'; bi.min = 0.7; bi.max = 1.6; bi.step = 0.05; bi.value = S.brightness || 1;
    bo.textContent = Math.round((S.brightness || 1) * 100) + ' %';
    bi.addEventListener('input', function () { S.brightness = +bi.value; bo.textContent = Math.round(S.brightness * 100) + ' %'; C.Main.applySettings(); });
    bi.addEventListener('change', function () { C.Save.saveSettings(S); });
    bl.appendChild(bi); bl.appendChild(bo); p.body.appendChild(bl);
    function check(label, key, apply) {
      var l = U.el('div', 'opt-line', '<label>' + label + '</label>');
      var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = S[key];
      cb.addEventListener('change', function () { S[key] = cb.checked; if (apply) C.Main.applySettings(); C.Save.saveSettings(S); });
      l.appendChild(cb); p.body.appendChild(l);
    }
    check('Grain de pellicule', 'grain', true);
    check('Pause quand on frappe', 'autoPauseVisitor', false);
    check('Conseils de première fois', 'hints', false);
    UI.modal(p);
  };

  // ------------------------------------------------ aide : js/ui/help.js

  // ------------------------------------------------ visiteurs
  UI.openVisitor = function (s) {
    var st = G().st;
    var v = st.visitor;
    if (!v) { UI.toast('Il n\'y a plus personne.', 'info'); return; }
    var def = C.VISITORS[v.id];
    v.talking = true;
    var ctx = { st: st, v: v, s: s };
    var p = UI.panel(def.title, first(s) + ' entrouvre la porte…', { small: true, noClose: true });
    p.body.innerHTML = '<div class="visit-head"><div class="visit-face"></div><div class="dialog-text quote">' + def.text(ctx) + '</div></div>';
    // Portrait de la personne sur le pas de la porte
    var face = UI.visitorFace(v), fbox = p.body.querySelector('.visit-face');
    if (face) { fbox.appendChild(UI.portrait(face.s, 120, 144)); fbox.appendChild(U.el('span', 'visit-name', U.esc(face.name))); }
    else fbox.remove();
    var ch = U.el('div', 'choices');
    def.choices.forEach(function (c, i) {
      var label = typeof c.label === 'function' ? c.label(ctx) : c.label;
      var ok = true, reqTxt = '';
      if (c.req) { ok = G().has(c.req); reqTxt = 'Nécessite : ' + U.costText(c.req); }
      if (c.reqFn) { ok = c.reqFn(ctx); reqTxt = 'Nécessite : ' + (typeof c.reqText === 'function' ? c.reqText(ctx) : c.reqText); }
      var b = U.el('button', 'choice', '<span class="n">' + (i + 1) + '</span><span>' + U.esc(label) + (reqTxt ? '<small>' + U.esc(reqTxt) + (ok ? '' : ' — vous ne l\'avez pas') + '</small>' : '') + '</span>');
      b.disabled = !ok;
      b.addEventListener('click', function () {
        UI.closeModal();
        if (c.trade) {
          var tf = UI.visitorFace(v), sh = C.Market && C.Market.current(G().st);
          C.TradeUI.open(s, v.data.stock, function () { finishVisitor(); }, {
            name: v.id === 'marchand' ? 'Franko' : (tf && tf.name) || null, face: tf,
            faceLine: v.id === 'marchand' ? (sh ? 'Ce qui manque en ville, je le paie cher. Et je le vends cher.' : 'Voyons ce que vous avez. Pas de crédit.') : null
          });
          return;
        }
        var res = c.run(ctx);
        finishVisitor();
        if (res) { G().log(res, 'info'); UI.dialog(def.title, '<p class="dialog-text quote">' + res + '</p>', [{ label: 'Continuer' }]); }
        if (!c.trade) { var cl = String(typeof c.label === 'function' ? c.label(ctx) : c.label); C.Surv.bio(s, 'On a frappé à la porte : ' + def.title.charAt(0).toLowerCase() + def.title.slice(1) + '. Nous avons choisi : ' + cl.charAt(0).toLowerCase() + cl.slice(1) + '.'); }
      });
      ch.appendChild(b);
    });
    p.body.appendChild(ch);
    UI.modal(p);
    function finishVisitor() {
      st.visitor = null;
      UI.refreshDoor();
      UI.buildCards();
    }
  };

  // ------------------------------------------------ événements de la journée
  // Événement automatique important : simple fenêtre de récit
  UI.eventDialog = function (def, text) {
    if (C.Audio.ready) C.Audio.sfx.alert();
    UI.dialog(def.title, '<div class="event-head">' + I(def.icon || 'alert') + '<span>' + U.fmtClock(G().st.minute) + ' · jour ' + G().st.day + '</span></div><p class="dialog-text quote">' + text + '</p>', [{ label: 'Continuer' }], { stamp: 'Événement' });
  };

  // Événement à choix
  UI.openEvent = function (def, ctx) {
    if (C.Audio.ready) C.Audio.sfx.alert();
    var p = UI.panel(def.title, U.fmtClock(ctx.st.minute) + ' · jour ' + ctx.st.day, { small: true, noClose: true, stamp: 'Événement' });
    p.body.innerHTML = '<div class="event-head">' + I(def.icon || 'alert') + '</div><div class="dialog-text quote">' + def.text(ctx) + '</div>';
    var ch = U.el('div', 'choices');
    def.choices.forEach(function (c, i) {
      var label = typeof c.label === 'function' ? (ctx.s ? c.label(ctx) : null) : c.label;
      if (!label) return;
      var ok = true, reqTxt = '';
      if (c.req) { ok = G().has(c.req); reqTxt = 'Nécessite : ' + U.costText(c.req); }
      if (c.reqFn) { ok = c.reqFn(ctx); reqTxt = 'Nécessite : ' + (typeof c.reqText === 'function' ? c.reqText(ctx) : c.reqText); }
      var b = U.el('button', 'choice', '<span class="n">' + (i + 1) + '</span><span>' + U.esc(label) + (reqTxt ? '<small>' + U.esc(reqTxt) + (ok ? '' : ' — impossible') + '</small>' : '') + '</span>');
      b.disabled = !ok;
      b.addEventListener('click', function () {
        UI.closeModal();
        var res = c.run(ctx);
        UI.buildCards();
        if (res) { G().log(def.title + ' — ' + res, 'info'); UI.dialog(def.title, '<p class="dialog-text quote">' + res + '</p>', [{ label: 'Continuer' }]); }
      });
      ch.appendChild(b);
    });
    p.body.appendChild(ch);
    UI.modal(p);
  };

  // ------------------------------------------------ rapport du matin
  var WEATHER_ICON = { pluie: 'rain', neige: 'snow', nuageux: 'cloud', clair: 'sun' };
  UI.openReport = function (rep) {
    var st = G().st;
    C.Main.nightFade(false);
    var over = st.phase === 'over';
    var p = UI.panel('Jour ' + rep.day, over ? 'Le dernier matin' : 'Ce que la nuit a laissé', { foot: true, noClose: true, wide: true });
    var html = '';
    if (!over) html += '<div class="report-date">' + I(WEATHER_ICON[st.weather.type] || 'cloud') + C.World.weatherLabel(st.weather.type) + ' · ' + st.weather.out + ' °C dehors' + (C.World.isWinter(st) ? ' · hiver' : '') + '</div>';
    var secs = [['back', 'Ils sont revenus', 'door'], ['scav', 'Pillage', 'pack'], ['home', 'Au refuge', 'home'], ['people', 'Les survivants', 'moral'], ['market', 'Le marché', 'trade']];
    var any = false;
    secs.forEach(function (sc) {
      var lines = rep.items.filter(function (i) { return i.sec === sc[0] && i.t; });
      // Une nuit sans ligne de pillage garde sa fiche d'expédition
      if (!lines.length && !(sc[0] === 'scav' && rep.expedition)) return;
      any = true;
      html += '<div class="rep-sec"><h3>' + I(sc[2]) + sc[1] + '</h3>';
      // Photo du lieu pillé (la fiche d'expédition l'intègre déjà)
      if (sc[0] === 'scav' && rep.loc && !rep.expedition) html += '<div class="loc-photo sm" style="background-image:url(assets/locations/' + rep.loc + '.jpg)"><span>' + U.esc(C.locationDef(rep.loc).name) + '</span></div>';
      if (sc[0] === 'scav' && rep.expedition) { html += '<div class="exp-slot"></div>'; if (lines.length) html += '<div class="rep-sub">Ce que le groupe en retient</div>'; }
      lines.forEach(function (l) { html += '<div class="rep-line ' + l.k + '">' + U.esc(l.t) + '</div>'; });
      html += '</div>';
    });
    if (!any) html += '<div class="rep-line">Une nuit sans histoire. C\'est déjà beaucoup.</div>';
    html += '<div class="rep-sec"><h3>' + I('user') + 'État du groupe</h3><div class="rep-surv"></div></div>';
    p.body.innerHTML = html;
    var slot = p.body.querySelector('.exp-slot');
    if (slot && rep.expedition) slot.appendChild(expeditionCard(rep.expedition));
    var box = p.body.querySelector('.rep-surv');
    st.survivors.forEach(function (s) {
      if (!s.alive && s.deathDay < rep.day - 1) return;
      var states = s.alive ? C.Surv.states(s).map(function (x) { return x.t; }).join(', ') || 'Ça va.' : ({ parti: 'Parti(e)' }[s.cause] || 'Décédé(e)');
      var row = U.el('div', '');
      var pf = UI.portrait(s, 46, 56);
      if (!s.alive) pf.style.filter = 'grayscale(1)';
      row.appendChild(pf);
      row.appendChild(U.el('div', '', '<b>' + U.esc(first(s)) + '</b>' + U.esc(states)));
      box.appendChild(row);
    });
    rep.items.forEach(function (i) { if (i.t) G().log(i.t, i.k === 'death' ? 'death' : i.k); });
    var b = U.el('button', 'btn', over ? 'Continuer…' : 'Commencer la journée');
    b.addEventListener('click', function () {
      UI.closeModal();
      if (over) { UI.showEnding(); return; }
      UI.buildCards();
      UI.refreshDoor();
      C.Main.setSpeed(1);
      if (C.Mood.replayReactions) C.Mood.replayReactions();
    });
    p.foot.appendChild(b);
    UI.modal(p);
    if (!over && C.Main) C.Main.setSpeed(0);
  };

  // ------------------------------------------------ fiche d'expédition
  // Comme au retour d'une sortie dans le jeu d'origine : qui, où, combien de
  // temps, dans quel état, ce qui a été rapporté, et le carnet de la nuit.
  function hhmm(m) { m = Math.round(m) % 1440; return (m / 60 < 10 ? '0' : '') + Math.floor(m / 60) + ':' + (m % 60 < 10 ? '0' : '') + (m % 60); }
  function expeditionCard(x) {
    var s = G().surv(x.sid) || x.merc, loc = C.locationDef(x.loc);
    var fe = s && s.look && s.look.female ? 'e' : '';
    var dead = x.reason === 'dead' || (s && !s.alive);
    var stamp = dead ? 'N\'est pas revenu' + fe : x.wound >= 20 ? 'Blessé' + fe : x.reason === 'time' ? 'Rentré' + fe + ' à l\'aube' : 'Rentré' + fe;
    var el = U.el('div', 'exp' + (dead ? ' dead' : x.wound >= 20 ? ' hurt' : ''));
    var head = U.el('div', 'exp-head');
    head.style.backgroundImage = 'url(assets/locations/' + x.loc + '.jpg)';
    if (s) { var pf = UI.portrait(s, 84, 100); pf.classList.add('exp-pf'); if (dead) { pf.style.filter = 'grayscale(1) brightness(.75) contrast(1.1)'; pf.classList.add('gone'); } head.appendChild(pf); }
    var when = x.abstract ? 'Pillage de nuit' : 'Parti' + fe + ' à ' + hhmm(x.start) + (dead ? '' : ' · rentré' + fe + ' à ' + hhmm(x.end));
    head.appendChild(U.el('div', 'exp-id', '<span class="exp-k">Expédition de la nuit</span><b>' + U.esc(loc ? loc.name : '') + '</b><span class="exp-who">' + U.esc(s ? s.name : '') + ' · ' + when + '</span>'));
    head.appendChild(U.el('div', 'exp-stamp', U.esc(stamp)));
    el.appendChild(head);

    // Vignettes de bilan
    var tiles = [];
    tiles.push(['pack', dead ? '—' : x.gainedN, dead ? 'objets perdus' : 'objet' + (x.gainedN > 1 ? 's' : '') + ' rapporté' + (x.gainedN > 1 ? 's' : '')]);
    if (!x.abstract) {
      tiles.push(['stock', x.searched, 'meuble' + (x.searched > 1 ? 's' : '') + ' fouillé' + (x.searched > 1 ? 's' : '')]);
      tiles.push(['speech', x.met, 'rencontre' + (x.met > 1 ? 's' : '')]);
    }
    if (x.kills || x.spared) tiles.push(['skull', x.kills, 'tué' + (x.kills > 1 ? 's' : '') + (x.spared ? ' · ' + x.spared + ' épargné' + (x.spared > 1 ? 's' : '') : ''), 'bad']);
    if (x.stole) tiles.push(['alert', '!', 'vol', 'bad']);
    tiles.push(['wound', x.wound ? '+' + x.wound : '0', x.hits ? x.hits + ' blessure' + (x.hits > 1 ? 's' : '') + ' reçue' + (x.hits > 1 ? 's' : '') : 'blessure', x.wound >= 20 ? 'bad' : '']);
    el.appendChild(U.el('div', 'exp-stats', tiles.map(function (t) {
      return '<div class="exp-tile ' + (t[3] || '') + '">' + I(t[0]) + '<b>' + t[1] + '</b><span>' + t[2] + '</span></div>';
    }).join('')));

    var cols = U.el('div', 'exp-cols');
    // Butin
    var ids = Object.keys(x.gained || {}).filter(function (k) { return x.gained[k] > 0; });
    var lootHtml = '<h4>' + (dead ? 'Resté là-bas' : 'Rapporté au refuge') + '</h4>';
    if (dead) lootHtml += '<p class="exp-none">Le sac et l\'équipement sont perdus.</p>';
    else if (!ids.length) lootHtml += '<p class="exp-none">Rien. Les mains vides.</p>';
    else lootHtml += '<div class="exp-grid">' + ids.map(function (k) { return '<div class="exp-item" title="' + U.esc(C.ITEMS[k].name) + '">' + C.ItemArt.img(k, 46) + '<i>' + x.gained[k] + '</i><span>' + U.esc(C.ITEMS[k].name) + '</span></div>'; }).join('') + '</div>';
    cols.appendChild(U.el('div', 'exp-loot', lootHtml));
    // Carnet
    var diary = '<h4>' + (x.abstract ? 'Récit' : 'Carnet de ' + U.esc(s ? s.name.split(' ')[0] : '')) + '</h4>';
    (x.story || []).forEach(function (l) {
      diary += '<div class="exp-entry ' + (l.k || '') + '">' + (l.m != null ? '<time>' + hhmm(l.m) + '</time>' : '<time>·</time>') + '<p>' + U.esc(l.t) + '</p></div>';
    });
    cols.appendChild(U.el('div', 'exp-diary', diary));
    el.appendChild(cols);
    return el;
  }

  // ------------------------------------------------ fin de partie
  UI.showEnding = function () {
    var st = G().st;
    var win = st.outcome === 'victory';
    C.Save.remove(0);
    var p = UI.panel(win ? 'Cessez-le-feu' : 'Fin', win ? 'Jour ' + st.day : '', { dark: true, foot: true, noClose: true, wide: true });
    var html = '<div class="ending"><h1>' + (win ? 'La guerre est finie.' : 'Il n\'y a plus personne.') + '</h1>';
    html += '<p class="lead">' + (win
      ? 'Au matin du jour ' + st.day + ', la radio l\'annonce enfin : un cessez-le-feu a été signé. Les armes se taisent. Dehors, des gens sortent des caves et clignent des yeux dans la lumière.'
      : 'Le refuge est silencieux. Personne ne saura ce qui s\'est passé ici, sauf les murs.') + '</p><div class="epi"></div>';
    html += '<div class="stats">' +
      [['Jours', st.day - 1], ['Pillages', st.stats.scavenged], ['Raids', st.stats.raids], ['Repoussés', st.stats.raidsRepelled], ['Fabriqués', st.stats.crafted], ['Aidés', st.stats.helped], ['Vols', st.stats.stole]]
        .map(function (x) { return '<div><b>' + x[1] + '</b>' + x[0] + '</div>'; }).join('') + '</div></div>';
    p.body.innerHTML = html;
    var epi = p.body.querySelector('.epi');
    st.survivors.forEach(function (s) {
      var row = U.el('div', '');
      var pf = UI.portrait(s, 56, 68);
      pf.style.width = '62px'; pf.style.height = '74px';
      if (!s.alive) pf.style.filter = 'grayscale(1)';
      row.appendChild(pf);
      row.appendChild(U.el('div', '', '<b>' + U.esc(s.name) + '</b>' + epilogue(s, st)));
      epi.appendChild(row);
    });
    var b = U.el('button', 'btn', 'Retour au menu');
    b.addEventListener('click', function () { UI.closeAllModals(); C.Menus.openMain(); });
    p.foot.appendChild(b);
    UI.modal(p);
    if (win && C.Audio.ready) C.Audio.sfx.victory();
  };

  function epilogue(s, st) {
    var n = first(s);
    if (!s.alive) {
      return {
        faim: n + ' est mort(e) de faim, quelque part entre deux jours sans rien. On ne l\'a pas oublié(e).',
        blessures: n + ' n\'a pas survécu à ses blessures. Son nom est gravé sur le mur de la cave.',
        maladie: n + ' a été emporté(e) par la maladie, faute de médicaments.',
        pillage: n + ' est parti(e) une nuit et n\'est jamais revenu(e). Personne ne sait vraiment ce qui s\'est passé.',
        raid: n + ' est mort(e) en défendant le refuge.',
        parti: n + ' est parti(e) une nuit sans se retourner. Personne n\'a jamais su où.',
        suicide: n + ' n\'a pas vu la fin de la guerre. Le poids était trop lourd, et personne n\'a su l\'aider à le porter.'
      }[s.cause] || n + ' n\'a pas vu la fin de la guerre.';
    }
    var lines = [], f = !!(s.look && s.look.female), il = f ? 'elle' : 'il', Il = f ? 'Elle' : 'Il', lui = f ? 'elle' : 'lui';
    var k = s.kills || 0, th = (s.thefts || 0) + (s.robs || 0), hp = s.helps || 0;
    // Ce qu'on a fait pèse plus que l'humeur du dernier jour
    if (s.moral >= 60 && !(k >= 2 || s.execs)) lines.push(n + ' a traversé la guerre sans se perdre. Après, il y aura des nuits difficiles, mais il y aura des matins aussi.');
    else if (s.moral >= 30) lines.push(n + ' a survécu. Longtemps, le moindre bruit sourd ' + (f ? 'la' : 'le') + ' fera sursauter.');
    else lines.push(n + ' a survécu, mais quelque chose s\'est éteint. Il faudra des années pour que ça revienne. Si ça revient.');
    // Meurtres
    if (s.execs) lines.push(n + ' n\'a jamais pu se pardonner d\'avoir tué un homme qui se rendait. ' + Il + ' entend encore ses supplications, chaque nuit.');
    else if (k >= 3) lines.push(n + ' a tué, encore et encore, pour que les autres tiennent. ' + Il + ' ne parlera jamais de ces nuits-là ; les cauchemars, eux, ne se taisent pas.');
    else if (k >= 1) lines.push(n + ' a tué ' + (k > 1 ? 'deux fois' : 'un homme') + ' pour survivre. Le visage ' + (k > 1 ? 'de ' + (f ? 'ses' : 'ses') + ' victimes' : 'de cet homme') + ' revient, surtout quand tout est calme.');
    // Vols et braquages
    if (th >= 4) lines.push('Ce qu\'' + il + ' a pris aux autres pour nourrir le groupe, ' + il + ' le doit encore ; ' + il + ' n\'ose plus regarder ceux qui n\'avaient déjà presque rien.');
    else if (th >= 1) lines.push(n + ' repense parfois à ceux à qui ' + il + ' a pris de quoi manger. Ils en avaient besoin, eux aussi.');
    // Entraide et clémence
    if (hp >= 4) lines.push('Dans le quartier, beaucoup de gens se souviennent que ' + n + ' leur a tendu la main. Des inconnus ' + (f ? 'la' : 'le') + ' saluent encore dans la rue.');
    else if (hp >= 1) lines.push('Il y a quelqu\'un, quelque part, qui doit la vie ou un repas à ' + n + '. C\'est peu, et c\'est énorme.');
    if (s.spares) lines.push(n + ' a épargné des hommes qui se rendaient. ' + Il + ' ne sait pas s\'ils l\'ont mérité ; ' + il + ' sait seulement qu\'' + il + ' pourra se regarder dans un miroir.');
    // Le groupe et les voisins (visiteurs à la porte)
    var helpedG = st.stats.helped, refusedG = st.stats.refused || 0;
    var dark = k >= 2 || s.execs || th >= 4;   // celui qui a beaucoup pris ou tué ne tire pas fierté du groupe
    if (dark) { /* pas de ligne collective */ }
    else if (refusedG >= 4 && helpedG < refusedG) lines.push('Trop de portes sont restées fermées. ' + n + ' n\'a pas oublié les pas qui s\'éloignaient dans la rue.');
    else if (helpedG >= 5 && helpedG >= refusedG) lines.push('Ils ont ouvert leur porte quand personne d\'autre ne le faisait. ' + n + ' en garde une fierté discrète.');
    if (st.stats.betrayed) lines.push('Le groupe a donné ' + (st.stats.betrayed > 1 ? 'des noms' : 'un nom') + ' à la milice pour manger. ' + n + ' entend encore le camion s\'éloigner dans la rue.');
    if (!k && !th && !hp && st.stats.stole > 2) lines.push('Il y a des choses qu\'on a faites pour tenir et dont on ne parlera jamais.');
    return lines.join(' ');
  }
})(window.CQR);

// =========================================================
// Fabrication en série (munitions…) : combien de lots ?
// =========================================================
(function (C) {
  'use strict';
  var U = C.util, UI = C.UI;
  function G() { return C.Game; }

  UI.openBatch = function (s, o, r) {
    var max = r.batch;
    for (var k in r.cost) max = Math.min(max, Math.floor(G().count(k) / r.cost[k]));
    var n = Math.min(Math.max(1, Math.floor(max / 2) || 1), Math.max(1, max));
    var p = UI.panel(r.name, s.name.split(' ')[0] + ' à l\'atelier', { small: true, foot: true });
    p.classList.add('batch-panel');
    var body = U.el('div', 'batch');
    p.body.appendChild(body);
    function costRow(c) {
      return Object.keys(c).map(function (id) {
        var have = G().count(id), ok = have >= c[id];
        return '<span class="bt-item' + (ok ? '' : ' ko') + '" title="' + U.esc(C.ITEMS[id].name) + ' : ' + have + ' en réserve">' + C.ItemArt.img(id, 34) + '<b>' + c[id] + '</b></span>';
      }).join('');
    }
    function render() {
      var cost = {}, give = {}; for (var a in r.cost) cost[a] = r.cost[a] * n; for (var b in r.give) give[b] = r.give[b] * n;
      body.innerHTML =
        '<div class="bt-row"><button class="btn ghost bt-m">−</button><div class="bt-n"><b>' + n + '</b><span>lot' + (n > 1 ? 's' : '') + '</span></div><button class="btn ghost bt-p">+</button>' +
        '<input class="bt-range" type="range" min="1" max="' + Math.max(1, max) + '" value="' + n + '"' + (max < 2 ? ' disabled' : '') + '></div>' +
        '<div class="bt-sec"><span class="tb-k">Il faut</span><div class="bt-items">' + costRow(cost) + '</div></div>' +
        '<div class="bt-sec"><span class="tb-k">On obtient</span><div class="bt-items">' + costRow(give).replace(/ ko/g, '') + '</div></div>' +
        '<p class="bt-time">' + C.Icon('clock') + ' Durée : ' + U.fmtDur(r.time * n) + (max < 1 ? ' — <span class="ko">matériaux insuffisants</span>' : ' · au plus ' + max + ' lot' + (max > 1 ? 's' : '') + ' avec la réserve') + '</p>';
      body.querySelector('.bt-m').addEventListener('click', function () { n = Math.max(1, n - 1); render(); });
      body.querySelector('.bt-p').addEventListener('click', function () { n = Math.min(Math.max(1, max), n + 1); render(); });
      body.querySelector('.bt-range').addEventListener('input', function (e) { n = +e.target.value; render(); });
      ok.disabled = max < 1;
    }
    var cancel = U.el('button', 'btn ghost', 'Annuler');
    cancel.addEventListener('click', function () { UI.closeModal(); });
    var ok = U.el('button', 'btn', 'Fabriquer');
    ok.addEventListener('click', function () { UI.closeModal(); C.Actions.start(s, o, 'cook', { rid: r.id, n: n }); });
    p.foot.appendChild(cancel); p.foot.appendChild(ok);
    render();
    UI.modal(p);
  };
})(window.CQR);
