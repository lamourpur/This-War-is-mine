/* =========================================================
   Interface principale : bandeau d'état, dossiers des
   survivants, notes contextuelles, notifications, fenêtres
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function $(id) { return document.getElementById(id); }
  function G() { return C.Game; }
  function I(n, c) { return C.Icon(n, c); }
  function first(s) { return s.name.split(' ')[0]; }

  var UI = C.UI = { selected: null, modalOpen: false, cardEls: {} };

  UI.init = function () {
    // Vitesses
    var sp = $('tb-speed');
    [[0, 'pause', 'Pause (Espace)'], [1, 'play', 'Vitesse normale (1)'], [2, 'ff', 'Vitesse ×2 (2)'], [4, 'fff', 'Vitesse ×4 (3)']].forEach(function (d) {
      var b = U.el('button', '', I(d[1]));
      b.dataset.speed = d[0]; b.title = d[2];
      b.addEventListener('click', function () { C.Main.setSpeed(d[0]); if (C.Audio.ready) C.Audio.sfx.click(); });
      sp.appendChild(b);
    });
    // Passer la journée (jusqu'à 20 h)
    var sk = U.el('button', 'tb-skip', I('moon'));
    sk.title = 'Passer la journée : le temps défile jusqu\'au soir (N)';
    sk.addEventListener('click', function () { if (C.Main.skipping) C.Main.stopSkip(); else C.Main.skipDay(); });
    sp.appendChild(sk);
    $('btn-stock').querySelector('.rb-ico').innerHTML = I('stock');
    $('btn-log').querySelector('.rb-ico').innerHTML = I('journal');
    $('btn-menu').querySelector('.rb-ico').innerHTML = I('menu');
    $('btn-place').querySelector('.rb-ico').innerHTML = I('place');
    $('btn-stock').title = 'Réserve (I)'; $('btn-log').title = 'Journal (J)'; $('btn-menu').title = 'Menu (Échap)';
    $('btn-stock').addEventListener('click', function () { UI.openStock(); });
    $('btn-log').addEventListener('click', function () { UI.openLog(); });
    $('btn-menu').addEventListener('click', function () { UI.openPause(); });
    $('btn-place').addEventListener('click', function () { UI.startPlacing(); });
    $('door-alert').innerHTML = I('door') + '<div><b>On frappe à la porte</b><span>Cliquez pour envoyer quelqu\'un ouvrir</span></div>';
    $('door-alert').addEventListener('click', function () {
      var door = G().objectsOf('frontdoor')[0];
      var s = UI.selectedSurv() || G().present().filter(function (x) { return x.moral >= 15; })[0];
      if (s && door) { UI.select(s.id); C.Actions.start(s, door, 'answer'); }
    });
    document.addEventListener('mousedown', function (e) {
      var cm = $('ctxmenu');
      if (!cm.classList.contains('hidden') && !cm.contains(e.target) && e.target.id !== 'game' && !e.target.closest('.card-btn')) UI.closeContext();
    });
  };

  UI.show = function (on) { $('hud').classList.toggle('hidden', !on); };

  // ------------------------------------------------ sélection
  UI.selectedSurv = function () {
    var s = UI.selected ? G().surv(UI.selected) : null;
    return s && s.alive && !s.away ? s : null;
  };
  UI.select = function (id) {
    UI.selected = id;
    Object.keys(UI.cardEls).forEach(function (k) { UI.cardEls[k].classList.toggle('sel', k === id); });
  };
  UI.cycle = function (dir) {
    var list = G().present();
    if (!list.length) return;
    var i = list.findIndex(function (s) { return s.id === UI.selected; });
    i = (i + (dir || 1) + list.length) % list.length;
    UI.select(list[i].id);
  };

  // Portrait dessiné du survivant (mis à jour quand son humeur change)
  UI.portrait = function (s, w, h) {
    var box = U.el('div', 'card-pf');
    var cv = document.createElement('canvas');
    C.Render.portrait(cv, s, w, h);
    box.appendChild(cv);
    return box;
  };
  function moodKey(s) { return [s.moral < 35, s.moral < 15, s.fatigue >= 55, s.sick >= 30, s.alive].join(); }

  // ------------------------------------------------ dossiers des survivants
  UI.buildCards = function () {
    var box = $('cards');
    box.innerHTML = '';
    UI.cardEls = {};
    G().st.survivors.forEach(function (s) {
      if (!s.alive && G().st.day - (s.deathDay || G().st.day) > 1) return;
      var d = C.survivorDef(s.defId);
      var el = U.el('div', 'card');
      var pf = UI.portrait(s, 64, 78);
      el.appendChild(pf);
      el.dataset.pk = moodKey(s);
      var body = U.el('div', 'card-body');
      body.innerHTML =
        '<div class="card-head"><span class="card-name">' + U.esc(first(s)) + '</span><span class="card-job">' + U.esc(d.job) + '</span></div>' +
        '<div class="meters">' +
          '<div class="meter" data-k="hunger" title="Faim">' + I('hunger') + '<b><span></span></b></div>' +
          '<div class="meter" data-k="fatigue" title="Fatigue">' + I('fatigue') + '<b><span></span></b></div>' +
          '<div class="meter" data-k="health" title="Santé (blessures, maladie)">' + I('health') + '<b><span></span></b></div>' +
          '<div class="meter" data-k="moral" title="Moral">' + I('moral') + '<b><span></span></b></div>' +
        '</div>';
      el.appendChild(body);
      el.appendChild(U.el('div', 'tags'));
      var foot = U.el('div', 'card-foot', '<span class="card-act"></span>');
      if (s.alive) {
        var bBio = U.el('button', 'card-btn', I('user') + 'Fiche'); bBio.title = 'Biographie, traits et pensées';
        var bNeed = U.el('button', 'card-btn', I('hunger') + 'Besoins'); bNeed.title = 'Manger, se soigner, consommer…';
        bBio.addEventListener('click', function (e) { e.stopPropagation(); UI.openBio(s); });
        bNeed.addEventListener('click', function (e) {
          e.stopPropagation();
          if (!s.alive || s.away) return;
          UI.select(s.id);
          var r = bNeed.getBoundingClientRect();
          UI.openPersonal(s, r.right + 180, r.top - 20);
        });
        foot.appendChild(bBio); foot.appendChild(bNeed);
      }
      el.appendChild(foot);
      el.addEventListener('click', function () {
        if (!s.alive || s.away) return;
        UI.select(s.id);
        if (C.Audio.ready) C.Audio.sfx.click();
      });
      el.addEventListener('dblclick', function () { UI.openBio(s); });
      el.addEventListener('mouseenter', function () { UI.showTooltip(el, s); });
      el.addEventListener('mouseleave', function () { UI.hideTooltip(); });
      box.appendChild(el);
      UI.cardEls[s.id] = el;
    });
    if (!UI.selectedSurv()) {
      var p = G().present()[0];
      UI.selected = p ? p.id : null;
    }
    UI.select(UI.selected);
    UI.updateCards();
  };

  var METER_NAME = { hunger: 'Satiété', fatigue: 'Énergie', health: 'Santé', moral: 'Moral' };
  function meterSet(el, pct, lv) {
    el.querySelector('span').style.width = U.clamp(pct, 0, 100) + '%';
    el.title = METER_NAME[el.dataset.k] + ' : ' + Math.round(U.clamp(pct, 0, 100)) + ' %' + (lv === 2 ? ' — critique' : lv === 1 ? ' — à surveiller' : '');
    el.classList.toggle('crit', lv === 2);
    el.classList.toggle('warn', lv === 1);
  }

  UI.updateCards = function () {
    G().st.survivors.forEach(function (s) {
      var el = UI.cardEls[s.id];
      if (!el) return;
      el.classList.toggle('dead', !s.alive);
      el.classList.toggle('away', !!s.away);
      el.classList.toggle('broken', s.alive && !s.away && s.moral < 15);
      var q = function (k) { return el.querySelector('[data-k="' + k + '"]'); };
      meterSet(q('hunger'), 100 - s.hunger, s.hunger >= 70 ? 2 : s.hunger >= 45 ? 1 : 0);
      meterSet(q('fatigue'), 100 - s.fatigue, s.fatigue >= 80 ? 2 : s.fatigue >= 55 ? 1 : 0);
      var health = 100 - Math.max(s.wound, s.sick);
      meterSet(q('health'), health, health <= 40 ? 2 : health <= 70 ? 1 : 0);
      meterSet(q('moral'), s.moral, s.moral < 15 ? 2 : s.moral < 35 ? 1 : 0);
      var tags = el.querySelector('.tags');
      var html = '';
      if (!s.alive) html = '<span class="tag l3">' + ({ parti: 'Parti(e)' }[s.cause] || 'Décédé(e)') + '</span>';
      else C.Surv.states(s).forEach(function (t) { html += '<span class="tag l' + t.lv + '">' + t.t + '</span>'; });
      if (tags.innerHTML !== html) tags.innerHTML = html;
      var act = el.querySelector('.card-act');
      var txt = !s.alive ? '' : s.away ? (G().AWAY_TEXT[s.away] || 'Absent(e)') : C.Actions.label(s);
      if (act.textContent !== txt) act.textContent = txt;
      var k = moodKey(s);
      if (el.dataset.pk !== k) {
        el.dataset.pk = k;
        C.Render.portrait(el.querySelector('.card-pf canvas'), s, 64, 78);
      }
    });
  };

  UI.showTooltip = function (anchor, s) {
    var tt = $('tooltip');
    var d = C.survivorDef(s.defId);
    var last = s.thoughts && s.thoughts.length ? s.thoughts[s.thoughts.length - 1].t : null;
    tt.innerHTML = '<h4>' + U.esc(s.name) + '</h4><div class="tt-sub">' + d.age + ' ans · ' + U.esc(d.job) + ' · ' + (s.alive ? C.Surv.moralLabel(s) : 'Disparu(e)') + '</div>' +
      (last ? '<div class="tt-quote">« ' + U.esc(last) + ' »</div>' : '') +
      '<div class="tt-traits">' + s.traits.map(function (t) { return '<span class="tag">' + C.TRAITS[t].name + '</span>'; }).join('') + '</div>' +
      '<div class="tt-hint">Double-clic ou « Fiche » pour le dossier complet</div>';
    var r = anchor.getBoundingClientRect();
    tt.style.left = (r.right + 22) + 'px';
    tt.style.top = Math.min(r.top, window.innerHeight - 220) + 'px';
    tt.classList.remove('hidden');
  };
  UI.hideTooltip = function () { $('tooltip').classList.add('hidden'); };

  // ------------------------------------------------ bandeau d'état
  var WEATHER_ICON = { pluie: 'rain', neige: 'snow', nuageux: 'cloud', clair: 'sun' };
  var lastWeather = null;
  UI.updateTop = function () {
    var st = G().st;
    $('tb-day').textContent = st.day;
    $('tb-clock').textContent = U.fmtClock(st.minute);
    var h = st.minute / 60;
    var exploring = C.Explore && C.Explore.active;
    $('tb-phase').textContent = exploring ? (h >= 28 ? 'Aube proche' : 'Nuit') : h < 9 ? 'Matin' : h < 13 ? 'Journée' : h < 17 ? 'Après-midi' : h < 19 ? 'Soir' : 'Crépuscule';
    var p = (exploring ? C.Explore.progress() : U.clamp((st.minute - 360) / 840, 0, 1)) * 100;
    $('tb-fill').style.left = p + '%'; $('tb-fill').style.right = '0';
    $('tb-sun').style.left = p + '%';
    var wk = st.weather.type + C.World.isWinter(st);
    if (wk !== lastWeather) {
      lastWeather = wk;
      $('tb-wico').innerHTML = I(WEATHER_ICON[st.weather.type] || 'cloud');
      $('tb-weather').textContent = C.World.weatherLabel(st.weather.type);
      $('tb-season').textContent = C.World.isWinter(st) ? 'Hiver' : (C.World.daysToWinter(st) > 0 && C.World.daysToWinter(st) <= 3 ? 'Froid à venir' : 'Automne');
      $('tb-season').className = 'tb-k' + (C.World.isWinter(st) ? ' cold' : '');
    }
    var tin = C.World.shelterTemp(st);
    var eo = $('tb-out'), ei = $('tb-in');
    eo.textContent = st.weather.out + '°';
    ei.textContent = tin + '°';
    eo.className = st.weather.out < 0 ? 'freezing' : st.weather.out < 8 ? 'cold' : '';
    ei.className = tin < 0 ? 'freezing' : tin < 8 ? 'cold' : tin >= 15 ? 'warm' : '';
    ei.parentNode.title = 'Refuge : ' + C.World.tempLabel(tin);
    document.querySelectorAll('#tb-speed button[data-speed]').forEach(function (b) { b.classList.toggle('on', +b.dataset.speed === C.Main.speed); });
    var skb = document.querySelector('#tb-speed .tb-skip');
    if (skb) { skb.classList.toggle('on', !!C.Main.skipping); skb.disabled = st.phase !== 'day'; }
  };

  UI.refreshDoor = function () {
    var v = G().st.visitor, el = $('door-alert');
    el.classList.toggle('hidden', !v);
    // Vignette du visiteur dans l'alerte (on voit qui frappe, comme par le judas)
    var old = el.querySelector('.card-pf'); if (old) old.remove();
    if (v) { var pf = UI.visitorPortrait(v, 44, 52); if (pf) el.insertBefore(pf, el.firstChild); }
    el.classList.toggle('with-face', !!(v && el.querySelector('.card-pf')));
  };
  // Portrait d'un visiteur : fiche du survivant (réfugié) ou visage du visiteur
  UI.visitorFace = function (v) {
    if (!v) return null;
    if (v.id === 'refugie' && v.data && v.data.recruit) {
      var d = C.survivorDef(v.data.recruit);
      return { s: { id: d.id, defId: d.id, moral: 45, fatigue: 60 }, name: d.name };
    }
    var vp = C.VISITOR_PEOPLE && C.VISITOR_PEOPLE[v.id];
    if (!vp) return null;
    var st = vp.state || {};
    return { s: { id: 'v_' + v.id, defId: 'v_' + v.id, moral: st.moral != null ? st.moral : 70, fatigue: st.fatigue || 20, wound: st.wound || 0, sick: st.sick || 0 }, name: vp.name };
  };
  UI.visitorPortrait = function (v, w, h) {
    var f = UI.visitorFace(v);
    if (!f) return null;
    return UI.portrait(f.s, w, h);
  };
  UI.refreshPending = function () {
    var n = G().st.pending.length;
    $('btn-place').classList.toggle('hidden', n === 0);
    $('place-count').textContent = n;
  };
  UI.refreshStockBadge = function () {};

  // ------------------------------------------------ notifications
  var TOAST_ICON = { warn: 'alert', alert: 'alert', done: 'star', info: 'speech' };
  UI.toast = function (text, kind) {
    var box = $('toasts');
    var t = U.el('div', 'toast ' + (kind || ''), I(TOAST_ICON[kind] || 'speech') + '<span>' + U.esc(text) + '</span>');
    box.appendChild(t);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { t.classList.add('out'); }, kind === 'alert' ? 6500 : 4500);
    setTimeout(function () { t.remove(); }, kind === 'alert' ? 7100 : 5100);
  };
  UI.floatMoral = function (delta) {
    var el = U.el('div', 'float-moral', (delta > 0 ? '+ ' : '− ') + 'moral');
    el.style.color = delta > 0 ? '#b5c78f' : '#ec9570';
    el.style.left = '350px'; el.style.top = (110 + Math.random() * 60) + 'px';
    $('hud').appendChild(el);
    setTimeout(function () { el.remove(); }, 2300);
  };
  UI.deathNotice = function (s, txt) {
    var html = '<div class="death-row"><div class="death-pf"></div><div><p class="dialog-text">' + U.esc(txt) + '</p><p class="dialog-text"><i>Le groupe est sous le choc.</i></p></div></div>';
    var p = UI.dialog('Un de moins', html, [{ label: 'Continuer' }], { dark: true });
    var slot = p && p.body && p.body.querySelector('.death-pf');
    if (slot) { var pf = UI.portrait(s, 84, 100); pf.style.cssText = 'width:90px;height:106px;filter:grayscale(1)'; slot.appendChild(pf); }
  };

  // ------------------------------------------------ notes contextuelles
  function iconFor(label) {
    var l = label.toLowerCase();
    if (/dorm|repos/.test(l)) return 'bed';
    if (/mang|cuisin|soupe|ragoût|viande|récolt|arros|gnôle|distill/.test(l)) return 'hunger';
    if (/pans|médic|remède|soign|bandage/.test(l)) return 'health';
    if (/parler|réconfort/.test(l)) return 'speech';
    if (/fiche/.test(l)) return 'user';
    if (/lire/.test(l)) return 'journal';
    if (/radio|musique|informations/.test(l)) return 'radio';
    if (/brûler|chauff/.test(l)) return 'sun';
    if (/porte|ouvrir la porte/.test(l)) return 'door';
    if (/réserve/.test(l)) return 'stock';
    if (/café|fumer|boire/.test(l)) return 'c_confort';
    if (/sélection/.test(l)) return 'user';
    if (/interromp/.test(l)) return 'close';
    if (/améliorer|renforc|barricad|blind/.test(l)) return 'shield';
    return 'hammer';
  }
  function itemBtn(e) {
    var b = U.el('button', 'cm-item');
    b.disabled = !e.enabled;
    b.innerHTML = (e.art ? '<span class="cm-art">' + C.ItemArt.img(e.art, 34) + '</span>' : I(e.icon || iconFor(e.label))) + '<div><div class="cm-label">' + U.esc(e.label) + '</div>' + (e.sub ? '<div class="cm-sub">' + e.sub + '</div>' : '') + (!e.enabled && e.reason ? '<div class="cm-reason">' + U.esc(e.reason) + '</div>' : '') + '</div>';
    b.addEventListener('click', function () { UI.closeContext(); e.go(); });
    return b;
  }

  UI.openContext = function (o, sx, sy) {
    var s = UI.selectedSurv();
    var m = C.Actions.menu(s, o);
    var cm = $('ctxmenu');
    var face = (o.kind === 'npc' || o.kind === 'guard') && C.npcPortrait ? C.npcPortrait(o) : null;
    var html = '<div class="cm-title">' + U.esc(m.title) + '</div>';
    if (m.desc) html += '<div class="cm-desc">' + U.esc(m.desc) + '</div>';
    if (face) html = '<div class="cm-face-row"><div class="cm-face"></div><div>' + html + '</div></div>';
    if (m.hint && m.entries.length && o.kind !== 'stock') html += '<div class="cm-hint">' + U.esc(m.hint) + '</div>';
    else if (s && m.entries.length) html += '<div class="cm-hint who">' + U.esc(first(s)) + ' peut :</div>';
    cm.innerHTML = html;
    if (face) cm.querySelector('.cm-face').appendChild(UI.portrait(face.s, 58, 70));
    m.entries.forEach(function (e) { cm.appendChild(itemBtn(e)); });
    if (!m.entries.length && !m.desc) return;
    UI.placeMenu(cm, sx, sy);
    if (C.Audio.ready) C.Audio.sfx.open();
  };
  UI.openPersonal = function (s, sx, sy) {
    var cm = $('ctxmenu');
    cm.innerHTML = '<div class="cm-title">' + U.esc(first(s)) + '</div><div class="cm-desc">' + C.Surv.moralLabel(s) + ' — actions sur place, sans se déplacer.</div>';
    C.Actions.personal(s).forEach(function (e) { e.sub = U.esc(e.sub); cm.appendChild(itemBtn(e)); });
    if (s.act) cm.appendChild(itemBtn({ label: 'Interrompre l\'action en cours', enabled: true, icon: 'close', go: function () { C.Actions.cancel(s); } }));
    UI.placeMenu(cm, sx, sy);
    if (C.Audio.ready) C.Audio.sfx.open();
  };
  // Clic sur un autre survivant : sélection ou interaction
  UI.openSurvMenu = function (s, b, sx, sy) {
    var cm = $('ctxmenu');
    var states = C.Surv.states(b).map(function (x) { return x.t; }).join(', ');
    cm.innerHTML = '<div class="cm-title">' + U.esc(first(b)) + '</div><div class="cm-desc">' + C.Surv.moralLabel(b) + (states ? ' · ' + U.esc(states) : '') + '</div>';
    cm.appendChild(itemBtn({ label: 'Sélectionner ' + first(b), enabled: true, icon: 'user', go: function () { UI.select(b.id); } }));
    cm.appendChild(U.el('div', 'cm-hint who', U.esc(first(s)) + ' peut :'));
    C.Actions.survMenu(s, b).forEach(function (e) { e.sub = U.esc(e.sub); cm.appendChild(itemBtn(e)); });
    cm.appendChild(itemBtn({ label: 'Voir la fiche de ' + first(b), enabled: true, icon: 'journal', go: function () { UI.openBio(b); } }));
    UI.placeMenu(cm, sx, sy);
    if (C.Audio.ready) C.Audio.sfx.open();
  };

  UI.placeMenu = function (cm, sx, sy) {
    cm.classList.remove('hidden');
    var w = cm.offsetWidth, h = cm.offsetHeight;
    var x = U.clamp(sx - w / 2, 8, window.innerWidth - w - 8);
    var y = sy + 18;
    if (y + h > window.innerHeight - 8) y = Math.max(8, sy - h - 18);
    cm.style.left = x + 'px'; cm.style.top = y + 'px';
  };
  UI.closeContext = function () { $('ctxmenu').classList.add('hidden'); };
  UI.contextOpen = function () { return !$('ctxmenu').classList.contains('hidden'); };

  // ------------------------------------------------ fenêtres modales
  var modalStack = [];
  UI.modal = function (panel, opts) {
    opts = opts || {};
    var layer = $('modal-layer');
    if (modalStack.length) modalStack[modalStack.length - 1].el.style.display = 'none';
    modalStack.push({ el: panel, opts: opts });
    layer.appendChild(panel);
    layer.classList.remove('hidden');
    UI.modalOpen = true;
    UI.closeContext();
    UI.hideTooltip();
    if (C.Audio.ready) C.Audio.sfx.page();
    return panel;
  };
  UI.closeModal = function () {
    var top = modalStack.pop();
    if (top) {
      top.el.remove();
      if (top.opts.onClose) top.opts.onClose();
    }
    if (modalStack.length) modalStack[modalStack.length - 1].el.style.display = '';
    else { $('modal-layer').classList.add('hidden'); UI.modalOpen = false; }
  };
  UI.closeAllModals = function () { while (modalStack.length) UI.closeModal(); };
  UI.topModal = function () { return modalStack.length ? modalStack[modalStack.length - 1] : null; };

  // Panneau standard — opts : small, wide, dark, foot, noClose
  UI.panel = function (title, sub, opts) {
    opts = opts || {};
    var p = U.el('div', 'panel' + (opts.small ? ' small' : '') + (opts.wide ? ' wide' : '') + (opts.dark ? ' dark' : ''));
    var head = U.el('div', 'panel-head', '<div><h2>' + title + '</h2>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>');
    if (opts.stamp) head.appendChild(U.el('span', 'stamp', opts.stamp));
    if (!opts.noClose) {
      var x = U.el('button', 'x-btn', I('close'));
      x.title = 'Fermer (Échap)';
      x.addEventListener('click', function () { UI.closeModal(); });
      head.appendChild(x);
    }
    p.appendChild(head);
    p.body = U.el('div', 'panel-body');
    p.appendChild(p.body);
    if (opts.foot) { p.foot = U.el('div', 'panel-foot'); p.appendChild(p.foot); }
    return p;
  };

  // Boîte de dialogue simple : buttons = [{label, run, cls}]
  UI.dialog = function (title, html, buttons, opts) {
    opts = opts || {};
    var p = UI.panel(title, opts.sub, { small: true, dark: opts.dark, foot: true, noClose: true, stamp: opts.stamp });
    p.body.innerHTML = html;
    (buttons || [{ label: 'OK' }]).forEach(function (b) {
      var el = U.el('button', 'btn' + (b.cls ? ' ' + b.cls : ''), U.esc(b.label));
      el.addEventListener('click', function () { UI.closeModal(); if (b.run) b.run(); });
      p.foot.appendChild(el);
    });
    UI.modal(p, { onClose: opts.onClose });
    return p;
  };

  // ------------------------------------------------ placement des constructions
  UI.freeSlots = function (type) {
    var b = C.BUILDINGS[type];
    var st = G().st;
    return C.SLOTS.filter(function (sl) {
      if (sl.small && !b.small) return false;
      if (!C.Nav.isReachable(sl.f, sl.x)) return false;
      var half = Math.max(sl.w, b.w) / 2 - 4;
      for (var i = 0; i < st.objects.length; i++) {
        var o = st.objects[i];
        if (o.f !== sl.f || o.kind === 'hole') continue;
        if (Math.abs(o.x - sl.x) < half + o.w / 2 - 6) return false;
      }
      for (var j = 0; j < C.STAIRS.length; j++) {
        var s = C.STAIRS[j];
        if ((s.a.f === sl.f && Math.abs(s.a.x - sl.x) < 30) || (s.b.f === sl.f && Math.abs(s.b.x - sl.x) < 30)) return false;
      }
      return true;
    });
  };

  UI.startPlacing = function () {
    var st = G().st;
    if (!st.pending.length) return;
    var type = st.pending[0];
    if (!UI.freeSlots(type).length) {
      UI.toast('Aucun emplacement libre pour : ' + C.BUILDINGS[type].name + '. Dégagez de la place (gravats, meubles, pièces fermées).', 'warn');
      return;
    }
    C.Render.placing = type;
    $('placing-hint').innerHTML = 'Installer : <b>' + C.BUILDINGS[type].name + '</b> — cliquez sur un emplacement libre · <b>Échap</b> pour annuler';
    $('placing-hint').classList.remove('hidden');
    $('game').classList.add('placing');
  };
  UI.stopPlacing = function () {
    C.Render.placing = null;
    C.Render.hoverSlot = null;
    $('placing-hint').classList.add('hidden');
    $('game').classList.remove('placing');
  };
  UI.placeAt = function (slot) {
    var st = G().st;
    var type = C.Render.placing;
    var o = G().spawnObject({ kind: type, f: slot.f, x: slot.x });
    if (type === 'garden' || type === 'herbgarden') { o.growth = 0; o.watered = 0; }
    if (type === 'collector') o.water = 0;
    if (type === 'heater') o.fuel = 0;
    st.pending.splice(st.pending.indexOf(type), 1);
    UI.stopPlacing();
    UI.refreshPending();
    G().log(C.BUILDINGS[type].name + ' installé(e).', 'action');
    // Nuage de poussière à la pose, plutôt qu'un message
    var fy = C.FLOORS[slot.f].y;
    for (var i = 0; i < 18; i++) C.Render.spawn({ x: slot.x + (Math.random() - 0.5) * (o.w || 60), y: fy - Math.random() * 12, vx: (Math.random() - 0.5) * 60, vy: -15 - Math.random() * 30, life: 0.9 + Math.random() * 0.6, t: 0, kind: 'dust', size: 1.5 + Math.random() * 2.5 });
    if (C.Audio.ready) C.Audio.sfx.hammer();
    if (st.pending.length) setTimeout(UI.startPlacing, 200);
  };

  UI.onActionDone = function () {};

  // Rafraîchissement périodique (appelé par la boucle)
  var acc = 0;
  UI.tick = function (dt) {
    acc += dt;
    UI.updateTop();
    if (acc > 0.25) { acc = 0; UI.updateCards(); UI.updateExploreHud(); }
  };

  // Bandeau pendant que la journée défile
  UI.showSkip = function (on) {
    var b = $('skip-banner');
    if (!b) {
      b = U.el('div', 'hidden', '<span class="sk-moon">' + I('moon') + '</span><span class="sk-t">La journée passe…</span><button class="btn ghost sk-stop">Arrêter</button>');
      b.id = 'skip-banner';
      b.querySelector('.sk-stop').addEventListener('click', function () { C.Main.stopSkip(); });
      $('hud').appendChild(b);
    }
    b.classList.toggle('hidden', !on);
    document.body.classList.toggle('skipping', !!on);
  };

  // ------------------------------------------------ exploration de nuit
  function wpnArt(id, sz) { return id === 'poings' ? '<i class="xh-fist">' + I('fist') + '</i>' : C.ItemArt.img(id, sz); }
  UI.showExploreHud = function (on) {
    var h = $('explore-hud');
    if (!h) {
      h = U.el('div', '', '');
      h.id = 'explore-hud';
      h.innerHTML = '<div class="xh-loc"><span class="tb-k">Exploration</span><b></b></div>' +
        '<div class="xh-bag"><span class="tb-k">Sac (cases)</span><div class="bm-bar"><i></i></div><em></em></div>' +
        '<div class="xh-mode" title="Mode exploration / mode combat (touche C)">' +
          '<button class="xh-m" data-m="explore">' + I('speech') + '<span>Exploration</span></button>' +
          '<button class="xh-m" data-m="combat">' + I('skull') + '<span>Combat</span></button>' +
          '<kbd>C</kbd></div>' +
        '<div class="xh-wpn" title="Arme en main (touche A)"><button class="xh-wb"></button><kbd>A</kbd><div class="xh-wl hidden"></div></div>' +
        '<button class="btn xh-home">' + I('home') + 'Rentrer</button>';
      Array.prototype.forEach.call(h.querySelectorAll('.xh-m'), function (b) {
        b.addEventListener('click', function () { C.Combat.setMode(b.dataset.m); });
      });
      var wl = h.querySelector('.xh-wl');
      h.querySelector('.xh-wb').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!wl.classList.contains('hidden')) { wl.classList.add('hidden'); return; }
        var cur = C.Combat.weapon();
        wl.innerHTML = '<div class="xh-wt">Arme en main</div>' + C.Combat.weapons().map(function (w) {
          return '<button data-w="' + w.id + '" class="' + (w.id === cur ? 'on' : '') + (w.ok ? '' : ' off') + '">' + wpnArt(w.id, 26) +
            '<span>' + U.esc(w.name) + '</span><small>' + (w.gun ? (w.ok ? G().count('munitions') + ' mun.' : w.why) : w.id === 'poings' ? 'à mains nues' : 'corps à corps') + '</small></button>';
        }).join('');
        Array.prototype.forEach.call(wl.querySelectorAll('button'), function (b) {
          b.addEventListener('click', function (ev) { ev.stopPropagation(); C.Combat.setWeapon(b.dataset.w); wl.classList.add('hidden'); });
        });
        wl.classList.remove('hidden');
      });
      document.addEventListener('click', function () { wl.classList.add('hidden'); });
      h.querySelector('.xh-home').addEventListener('click', function () {
        var s = C.Explore.s, ex = G().st.objects.filter(function (o) { return o.kind === 'exit'; })[0];
        if (s && ex) C.Actions.start(s, ex, 'leave');
      });
      $('hud').appendChild(h);
    }
    h.classList.toggle('hidden', !on);
    document.body.classList.toggle('exploring', !!on);
    if (on) { h.querySelector('.xh-loc b').textContent = C.Explore.def.name; UI.updateExploreHud(); }
  };
  UI.updateExploreHud = function () {
    if (!C.Explore || !C.Explore.active) return;
    var h = $('explore-hud'); if (!h) return;
    var cap = C.Explore.capacity(C.Explore.s), w = C.Explore.weight(G().st.inventory);
    h.querySelector('.bm-bar i').style.width = Math.min(100, w / cap * 100) + '%';
    h.querySelector('.xh-bag em').textContent = w + ' / ' + cap;
    h.classList.toggle('late', G().st.minute >= 28 * 60);
    var mode = C.Explore.mode || 'explore';
    Array.prototype.forEach.call(h.querySelectorAll('.xh-m'), function (b) { b.classList.toggle('on', b.dataset.m === mode); });
    h.classList.toggle('combat', mode === 'combat');
    var w = C.Combat.weapon(), gun = C.Combat.isGun(w);
    var key = w + ':' + (gun ? G().count('munitions') : '');
    var wb = h.querySelector('.xh-wb');
    if (wb.dataset.k !== key) {
      wb.dataset.k = key;
      wb.innerHTML = wpnArt(w, 30) + '<span class="tb-k">En main</span><b>' + U.esc((C.Combat.GUNS[w] || C.Combat.MELEE[w]).name) + '</b>' + (gun ? '<em>' + G().count('munitions') + ' mun.</em>' : '');
    }
    // Des soldats vous tirent dessus et vous êtes en exploration : le bouton combat clignote
    var danger = C.Combat.guards().some(function (g) { return g.state === 'alert' && !g.dead; });
    h.classList.toggle('danger', danger && mode !== 'combat');
  };
})(window.CQR);
