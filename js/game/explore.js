/* =========================================================
   Exploration de nuit (lieux jouables)
   Pendant l'exploration, le jeu bascule sur un « état de lieu » :
   plan du bâtiment, objets, un seul survivant et le sac comme
   inventaire. Tout le reste du moteur (déplacements, fouille par
   glisser-déposer, rendu, surbrillance…) fonctionne tel quel.
   Au retour, on restaure le refuge et la nuit se résout.
   Horloge : 20 h → 5 h (cloche à 4 h), ~1,6 minute de jeu par seconde.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }
  function first(s) { return s.name.split(' ')[0]; }

  var START = 20 * 60, BELL = 28 * 60, END = 29 * 60, RATE = 1.6;

  var E = C.Explore = { active: false };

  // Capacité du sac (poids) : 12, 18 avec le trait « grand sac »
  E.capacity = function (s) { return 12 + (s && G().hasTrait(s, 'grand_sac') ? 6 : 0); };
  E.weight = function (inv) { var w = 0; for (var k in inv) w += (inv[k] || 0) * (C.ITEMS[k] ? C.ITEMS[k].w : 1); return w; };
  E.room = function () { return E.active ? E.capacity(E.s) - E.weight(G().st.inventory) : Infinity; };

  function locState(home, id) {
    var ls = home.locations[id];
    if (!ls.map) ls.map = {};
    if (!ls.npc) ls.npc = {};
    return ls;
  }

  // ------------------------------------------------------------ entrée
  E.start = function (plan, onDone) {
    var home = G().st, s = G().surv(Object.keys(plan.roles).filter(function (k) { return plan.roles[k] === 'scav'; })[0]);
    var id = plan.scav.loc, map = C.MAPS[id], def = C.locationDef(id);
    var ls = locState(home, id);

    // Le sac part avec l'équipement choisi
    var bag = {};
    (plan.scav.equip || []).forEach(function (k) { bag[k] = (bag[k] || 0) + 1; });
    if (plan.scav.ammo) bag.munitions = plan.scav.ammo;
    G().removeItems(bag);

    E.active = true;
    E.plan = plan; E.onDone = onDone; E.s = s; E.loc = id; E.def = def; E.home = home;
    E.notes = []; E.effects = []; E.stolen = {}; E.helped = [];
    E.bellRung = false;
    E.homePos = { x: s.x, y: s.y, f: s.f, facing: s.facing };
    E.saved = { STAIRS: C.STAIRS, WALLS: C.WALLS, WINDOWS: C.WINDOWS, SLOTS: C.SLOTS, DECOR: C.DECOR, THEME: C.THEME, NAV_START: C.NAV_START };

    var est = {
      version: home.version, seed: home.seed + 911, rngS: 0,
      day: home.day, minute: START, phase: 'explore',
      ceasefireDay: home.ceasefireDay, winterStart: home.winterStart, winterLen: home.winterLen, crimeStart: home.crimeStart,
      weather: home.weather, inventory: bag, survivors: [s], objects: [], nextUid: 1,
      pending: [], locations: home.locations, visitor: null, visitorPlan: null, raidBonus: 0,
      log: [], stats: home.stats, lastReport: null, flags: home.flags, dayEvents: []
    };

    // Bascule du plan
    C.STAIRS = map.stairs; C.WALLS = map.walls; C.WINDOWS = map.windows; C.SLOTS = [];
    C.DECOR = map.decor || []; C.THEME = map.theme || null;
    C.NAV_START = { f: 1, x: 220 };
    G().st = est;

    map.objects.forEach(function (d) {
      var o = U.copy(d);
      var saved = ls.map[d.key];
      if (saved === 'gone') return;                       // gravats déblayés, meuble démonté
      if (saved) for (var k in saved) o[k] = saved[k];
      G().spawnObject(o);
    });
    // Tas de débris laissés lors d'une visite précédente
    (ls.extra || []).forEach(function (d) { G().spawnObject(U.copy(d)); });

    ls.visits++;
    home.stats.scavenged++;
    s.x = 230; s.f = 1; s.y = C.FLOORS[1].y; s.facing = 1; s.path = []; s.act = null;

    C.Render.dirty = true;
    C.Render.particles = [];
    C.Render.pops = [];
    C.Render.npcSay = {};
    C.Render.bubbles = {};
    if (C.UI) {
      C.UI.selected = s.id;
      C.UI.buildCards();
      C.UI.refreshPending && C.UI.refreshPending();
      C.UI.refreshDoor && C.UI.refreshDoor();
      C.UI.showExploreHud(true);
    }
    C.Main.showDuskButton(false);
    C.Main.setSpeed(1);
    if (ls.visits === 1) E.say(s, 'Doucement… Pas de bruit.');
  };

  // ------------------------------------------------------------ boucle
  E.update = function (dt) {
    if (!E.active) return;
    var st = G().st, s = E.s;
    var gm = dt * (C.Main.speed || 0) * RATE;
    if (gm <= 0) return;
    st.minute += gm;
    s.anim += gm;
    if (s.path.length) {
      var step = C.Surv.speed(s) * gm;
      while (step > 0 && s.path.length) {
        var wp = s.path[0];
        var dx = wp.x - s.x, dy = wp.y - s.y, d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dx) > 0.5) s.facing = dx > 0 ? 1 : -1;
        if (d <= step) { s.x = wp.x; s.y = wp.y; s.f = wp.f; s.path.shift(); step -= d; }
        else { s.x += dx / d * step; s.y += dy / d * step; step = 0; }
      }
    }
    C.Actions.tick(s, gm);
    if (!E.bellRung && st.minute >= BELL) {
      E.bellRung = true;
      if (C.Audio.ready) { C.Audio.sfx.alert(); }
      if (C.UI) C.UI.toast('Il est 4 h. Le jour se lève dans une heure : il faut rentrer.', 'alert');
      E.say(s, 'Il faut que je rentre avant le jour.');
    }
    if (st.minute >= END) E.finish('time');
  };

  // Temps restant (0..1) pour le HUD
  E.progress = function () { return U.clamp((G().st.minute - START) / (END - START), 0, 1); };

  // ------------------------------------------------------------ sortie
  E.finish = function (reason) {
    if (!E.active) return;
    var est = G().st, home = E.home, s = E.s, ls = home.locations[E.loc];
    C.Actions.cancel(s, true);
    s.path = []; s.act = null;
    // Mémorise l'état de chaque objet du lieu
    var keep = ['searched', 'loot', 'locked', 'open', 'broken'];
    var present = {}, mapKeys = {};
    C.MAPS[E.loc].objects.forEach(function (d) { mapKeys[d.key] = true; });
    ls.extra = [];
    est.objects.forEach(function (o) {
      if (!o.key) return;
      if (!mapKeys[o.key]) {
        // objet créé sur place (tas de débris) : conservé s'il reste quelque chose dedans
        var left = false; for (var lk in (o.loot || {})) if (o.loot[lk] > 0) left = true;
        if (left) { var c = U.copy(o); delete c.uid; ls.extra.push(c); }
        return;
      }
      present[o.key] = true;
      var rec = {};
      keep.forEach(function (k) { if (o[k] !== undefined) rec[k] = U.copy(o[k]); });
      ls.map[o.key] = rec;
    });
    C.MAPS[E.loc].objects.forEach(function (d) { if (!present[d.key]) ls.map[d.key] = 'gone'; });

    var bag = est.inventory;
    // Restaure le refuge
    C.STAIRS = E.saved.STAIRS; C.WALLS = E.saved.WALLS; C.WINDOWS = E.saved.WINDOWS; C.SLOTS = E.saved.SLOTS;
    C.DECOR = E.saved.DECOR; C.THEME = E.saved.THEME; C.NAV_START = E.saved.NAV_START;
    G().st = home;
    est.log.forEach(function (l) { home.log.push(l); });
    s.x = E.homePos.x; s.y = E.homePos.y; s.f = E.homePos.f; s.facing = E.homePos.facing;
    E.active = false;
    if (C.UI) C.UI.showExploreHud(false);

    // Conséquences morales, appliquées au groupe une fois rentré
    var stolenAny = Object.keys(E.stolen).length > 0;
    if (stolenAny) {
      home.stats.stole++;
      if (E.stolen.whitaker) {
        E.notes.push({ t: first(s) + ' a volé les Whitaker. Le vieil homme a supplié ; sa femme pleurait.', k: 'bad' });
        G().moralAll(-16, { bad: true, key: 'stole_old' });
        home.flags.horvat = home.day + 3;
        ls.angry = true;
      } else {
        E.notes.push({ t: first(s) + ' a volé ceux qui s\'abritaient là.', k: 'bad' });
        G().moralAll(-9, { bad: true, key: 'stole' });
        ls.angry = true;
      }
    }
    E.effects.forEach(function (fn) { fn(); });
    if (reason === 'time') E.notes.unshift({ t: 'Le jour se levait : ' + first(s) + ' a dû rentrer en hâte.', k: 'info' });

    C.Render.dirty = true; C.Render.pops = []; C.Render.npcSay = {}; C.Render.bubbles = {};
    var plan = E.plan;
    plan.scav.explored = { items: bag, notes: E.notes };
    C.Main.setSpeed(0);
    if (E.onDone) E.onDone(plan);
  };

  // ------------------------------------------------------------ personnages
  E.npcDef = function (o) { return C.NPCS[o.npc]; };
  E.npcState = function (o) { var ls = locState(E.home, E.loc); if (!ls.npc[o.npc]) ls.npc[o.npc] = {}; return ls.npc[o.npc]; };

  // Bulle au-dessus d'un personnage non joueur ou du survivant
  E.say = function (who, text, secs) {
    if (!C.Render) return;
    if (who.kind === 'npc') {
      C.Render.npcSay = C.Render.npcSay || {};
      C.Render.npcSay[who.uid] = { text: text, until: performance.now() + (secs || 5) * 1000 };
    } else C.Render.bubbles[who.id] = { text: text, until: performance.now() + (secs || 4.5) * 1000 };
  };

  E.talk = function (s, o) {
    var d = E.npcDef(o), ns = E.npcState(o), ls = locState(E.home, E.loc);
    var pool = ls.angry && d.afterSteal ? d.afterSteal : ns.helped && d.after ? d.after : d.greet;
    ns.talk = (ns.talk || 0) + 1;
    E.say(o, pool[(ns.talk - 1) % pool.length]);
    if (d.need && !ns.helped && ns.talk > 1) setTimeout(function () { if (E.active) E.say(o, d.need.ask); }, 1800);
  };

  E.help = function (s, o) {
    var d = E.npcDef(o), ns = E.npcState(o), need = d.need;
    if (!need || ns.helped || !G().has(need.items)) return;
    G().removeItems(need.items);
    ns.helped = true;
    if (need.reward) {
      // La récompense va dans le sac (ou reste par terre si le sac est plein : on la rapporte quand même)
      G().addItems(need.reward);
      if (C.Render.pop) C.Render.pop(s, Object.keys(need.reward).map(function (k) { return { item: k, n: need.reward[k] }; }));
    }
    E.say(o, need.thanks, 7);
    E.home.stats.helped++;
    var name = d.name;
    E.notes.push({ t: first(s) + ' a aidé ' + name + ' (' + C.itemsText(need.items) + ').', k: 'good' });
    E.effects.push(function () { G().moralAll(need.moral || 5, { good: true, key: 'helped' }); });
    G().log(first(s) + ' a aidé ' + name + '.', 'good');
    if (C.Audio.ready) C.Audio.sfx.pickup();
  };

  E.donate = function (s, o) {
    var d = E.npcDef(o), don = d.donate, ns = E.npcState(o);
    var items = G().has(don.items) ? don.items : don.alt && G().has(don.alt) ? don.alt : null;
    if (!items) return;
    G().removeItems(items);
    ns.donated = (ns.donated || 0) + 1;
    E.say(o, don.thanks, 6);
    E.home.stats.helped++;
    E.notes.push({ t: first(s) + ' a fait un don à ' + d.name + ' (' + C.itemsText(items) + ').', k: 'good' });
    E.effects.push(function () { G().moralAll(don.moral || 4, { good: true, key: 'helped' }); });
    if (C.Audio.ready) C.Audio.sfx.pickup();
  };

  // Stock du marchand : se reconstitue un peu entre les visites
  E.traderStock = function (o) {
    var d = E.npcDef(o), ns = E.npcState(o);
    if (!ns.stock) ns.stock = U.copy(d.trade.stock);
    if (d.trade.restock && ns.lastDay != null && E.home.day - ns.lastDay >= d.trade.restock) {
      for (var k in d.trade.stock) ns.stock[k] = Math.max(ns.stock[k] || 0, d.trade.stock[k]);
    }
    ns.lastDay = E.home.day;
    return ns.stock;
  };

  E.trade = function (s, o) {
    var d = E.npcDef(o);
    if (locState(E.home, E.loc).angry) { E.say(o, d.afterSteal ? d.afterSteal[1] : 'Je n\'ai rien à échanger avec vous.'); return; }
    E.say(o, d.trade.say || 'Voyons ce que vous avez.', 4);
    C.TradeUI.open(s, E.traderStock(o), null, { name: d.name, likes: d.trade.likes, bag: true });
  };

  // Un objet appartient-il aux habitants ? (prendre = voler)
  E.markStolen = function (o, items) {
    if (!o.owner) return;
    var any = false; for (var k in items) if (items[k] > 0) any = true;
    if (!any) return;
    E.stolen[o.owner] = true;
    // Les habitants réagissent sur le moment
    var npc = G().st.objects.filter(function (x) { return x.kind === 'npc' && C.NPCS[x.npc] && C.NPCS[x.npc].afterSteal; })[0];
    if (npc) E.say(npc, C.NPCS[npc.npc].afterSteal[0], 6);
  };
})(window.CQR);
