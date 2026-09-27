/* =========================================================
   État de la partie + API centrale (C.Game)
   Tout ce qui est sauvegardé vit dans C.Game.st
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;

  var Game = C.Game = {
    st: null,

    // ------------------------------------------------ création
    newGame: function (groupIds, seed) {
      seed = seed || (Date.now() & 0x7fffffff);
      C.R = new C.RNG(seed);
      var R = C.R;
      var st = {
        version: 1, seed: seed, rngS: 0,
        day: 1, minute: 6 * 60, phase: 'day',
        ceasefireDay: R.int(30, 45),
        winterStart: R.int(12, 19),
        winterLen: R.int(8, 13),
        crimeStart: R.int(9, 17),
        weather: { type: 'nuageux', out: 12 },
        inventory: {},
        survivors: [],
        objects: [],
        nextUid: 1,
        pending: [],
        locations: {},
        visitor: null, visitorPlan: null,
        raidBonus: 0,
        log: [],
        stats: { stole: 0, helped: 0, refused: 0, killed: 0, crafted: 0, raids: 0, raidsRepelled: 0, scavenged: 0 },
        lastReport: null,
        tutorial: 0,
        flags: {}
      };
      Game.st = st;

      C.INITIAL_OBJECTS.forEach(function (o) { Game.spawnObject(U.copy(o)); });
      Game.addItems(C.START_ITEMS, true);

      C.LOCATIONS.forEach(function (l) {
        st.locations[l.id] = {
          visits: 0,
          loot: U.copy(l.loot),
          residentsLoot: l.residentsLoot ? U.copy(l.residentsLoot) : null,
          stashTaken: false,
          residentsGone: false
        };
      });

      groupIds.forEach(function (id) { Game.addSurvivor(id, true); });
      C.World.rollWeather(st);
      C.World.planVisitor(st);
      C.World.planDayEvents(st);
      Game.log('Jour 1. La ville est encerclée. Il faut tenir jusqu\'à la fin des combats.', 'story');
      return st;
    },

    load: function (state) {
      Game.st = state;
      C.R = new C.RNG(state.rngS || state.seed);
      // Les trajets en cours ne sont pas restaurés : on repart d'un état stable
      state.survivors.forEach(function (s) {
        s.path = [];
        // Une action encore en trajet (ou une conversation) ne peut pas reprendre telle quelle
        if (s.act && (s.act.phase === 'walk' || s.act.kind === 'talk' || s.act.kind === 'listen')) s.act = null;
        Game.migrateSurvivor(s);
      });
      Game.markDirty();
    },

    // ------------------------------------------------ objets du refuge
    spawnObject: function (o) {
      var st = Game.st;
      o.uid = st.nextUid++;
      if (C.BUILDINGS[o.kind]) {
        var b = C.BUILDINGS[o.kind];
        o.w = o.w || b.w; o.h = o.h || b.h;
        o.level = o.level || 1;
      }
      st.objects.push(o);
      Game.markDirty();
      return o;
    },
    removeObject: function (o) {
      var st = Game.st;
      var i = st.objects.indexOf(o);
      if (i >= 0) st.objects.splice(i, 1);
      Game.markDirty();
    },
    obj: function (uid) {
      var objs = Game.st.objects;
      for (var i = 0; i < objs.length; i++) if (objs[i].uid === uid) return objs[i];
      return null;
    },
    objectsOf: function (kind) {
      return Game.st.objects.filter(function (o) { return o.kind === kind; });
    },
    countBuilt: function (kind) { return Game.objectsOf(kind).length; },
    objName: function (o) {
      if (o.kind === 'bed' && o.metal) return 'Lit d\'hôpital';
      if (C.BUILDINGS[o.kind]) {
        var n = C.BUILDINGS[o.kind].name;
        var b = C.BUILDINGS[o.kind];
        if (b.maxLevel && o.level > 1) n += ' (niv. ' + o.level + ')';
        return n;
      }
      switch (o.kind) {
        case 'frontdoor': return o.level ? (o.level === 1 ? 'Porte barricadée' : 'Porte blindée') : 'Porte d\'entrée';
        case 'stock': return 'Réserve';
        case 'rubble': return o.block ? 'Éboulis' : 'Gravats';
        case 'door': return o.open ? 'Porte forcée' : 'Porte verrouillée';
        case 'grate': return 'Grille métallique';
        case 'cache':
          if (o.variant === 'baluchon') return o.label || 'Baluchon';
          var cn = o.label || C.CACHE_NAMES[o.variant] || 'Meuble';
          var masc = /^(coffre|tas|paquetage|corps|meuble)/i.test(cn);
          return cn + (o.searched ? (masc ? ' (fouillé)' : ' (fouillée)') : o.locked ? (masc ? ' verrouillé' : ' verrouillée') : '');
        case 'furniture': return C.FURNITURE_NAMES[o.variant] || 'Meuble';
        case 'hole': return o.boarded ? 'Trou barricadé' : 'Trou dans le mur';
        case 'npc': return C.NPCS && C.NPCS[o.npc] ? C.NPCS[o.npc].name : 'Quelqu\'un';
        case 'exit': return 'Sortie';
        case 'pew': return 'Banc d\'église';
        case 'altar': return 'Autel';
        case 'blackboard': return 'Tableau noir';
        case 'guard': return C.GUARD_TYPES[o.type] ? C.GUARD_TYPES[o.type].name : 'Soldat';
        case 'hide': return 'Recoin sombre';
        case 'sandbags': return 'Sacs de sable';
        case 'desk': return 'Pupitre';
      }
      return o.kind;
    },
    isBlocking: function (o) {
      if (o.kind === 'rubble') return !!o.block;
      if (o.kind === 'door') return !o.open;
      if (o.kind === 'grate') return true;
      return false;
    },
    markDirty: function () { if (C.Render) C.Render.dirty = true; },

    // ------------------------------------------------ inventaire
    count: function (id) { return Game.st.inventory[id] || 0; },
    has: function (cost) {
      for (var k in cost) if (Game.count(k) < cost[k]) return false;
      return true;
    },
    missing: function (cost) {
      var m = [];
      for (var k in cost) if (Game.count(k) < cost[k]) m.push(k);
      return m;
    },
    addItems: function (items, silent) {
      var inv = Game.st.inventory;
      for (var k in items) {
        if (!items[k]) continue;
        inv[k] = (inv[k] || 0) + items[k];
      }
      Game.markDirty();
      if (!silent && C.UI) C.UI.refreshStockBadge && C.UI.refreshStockBadge();
    },
    removeItems: function (items) {
      var inv = Game.st.inventory;
      for (var k in items) {
        inv[k] = Math.max(0, (inv[k] || 0) - items[k]);
        if (!inv[k]) delete inv[k];
      }
      Game.markDirty();
    },
    foodCount: function () {
      return Game.count('conserve') + Game.count('repas') + Game.count('legumes') + Game.count('viande');
    },
    payFood: function (n) {
      ['legumes', 'viande', 'repas', 'conserve'].forEach(function (k) {
        var take = Math.min(n, Game.count(k));
        if (take > 0) { var o = {}; o[k] = take; Game.removeItems(o); n -= take; }
      });
    },
    inventoryValue: function () {
      var v = 0, inv = Game.st.inventory;
      for (var k in inv) v += inv[k] * (C.ITEMS[k] ? C.ITEMS[k].v : 0);
      return v;
    },

    // ------------------------------------------------ survivants
    addSurvivor: function (defId, initial) {
      var d = C.survivorDef(defId);
      var st = Game.st;
      var R = C.R;
      var s = {
        id: defId + '_' + st.nextUid++,
        defId: defId, name: d.name, traits: d.traits.slice(), look: U.copy(d.look),
        hunger: initial ? R.int(10, 25) : R.int(35, 55),
        fatigue: initial ? R.int(5, 20) : R.int(30, 50),
        wound: 0, sick: initial ? 0 : R.int(0, 15),
        moral: initial ? R.int(62, 75) : R.int(45, 60),
        alive: true, cause: null,
        f: 1, x: 620 + st.survivors.length * 70, y: C.FLOORS[1].y,
        facing: 1, path: [], act: null, anim: R.next() * 10,
        away: null, awayReward: null,
        bandaged: 0, lastSmoke: st.day, lastCoffee: st.day, lastBook: -1,
        brokenDays: 0, readToday: 0, restToday: 0
      };
      Game.migrateSurvivor(s);
      if (!initial) { s.x = 240; }
      st.survivors.push(s);
      if (!initial) Game.log(d.name + ' rejoint le groupe.', 'good');
      if (C.UI && C.UI.buildCards) C.UI.buildCards();
      return s;
    },
    // Champs ajoutés au fil des versions (et apparence toujours à jour)
    migrateSurvivor: function (s) {
      var d = C.survivorDef(s.defId);
      if (d) { s.look = U.copy(d.look); s.traits = d.traits.slice(); s.name = d.name; }
      if (!s.thoughts) s.thoughts = [];
      if (s.grief == null) s.grief = 0;
      if (!s.talkedToday) s.talkedToday = {};
      if (s.comfortedToday == null) s.comfortedToday = false;
    },
    alive: function () { return Game.st.survivors.filter(function (s) { return s.alive; }); },
    present: function () { return Game.st.survivors.filter(function (s) { return s.alive && !s.away; }); },
    surv: function (id) {
      var l = Game.st.survivors;
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return null;
    },
    hasTrait: function (s, t) { return s.traits.indexOf(t) >= 0; },
    first: function (s) { return s.name.split(' ')[0]; },
    availableRecruits: function () {
      var used = {};
      Game.st.survivors.forEach(function (s) { used[s.defId] = true; });
      return C.SURVIVOR_POOL.filter(function (d) { return !used[d.defId || d.id] && !used[d.id]; });
    },

    // Variation de moral pour tout le groupe
    // opts.bad : action moralement discutable (les empathiques souffrent plus)
    // opts.good : bonne action (les empathiques en profitent plus)
    moralAll: function (delta, opts) {
      opts = opts || {};
      Game.alive().forEach(function (s) {
        if (s.away) return;
        var d = delta;
        if (Game.hasTrait(s, 'empathique') && (opts.bad || opts.good)) d *= 1.6;
        if (Game.hasTrait(s, 'cynique')) { if (opts.bad) d *= 0.35; else if (opts.good) d *= 0.5; }
        s.moral = U.clamp(s.moral + d, 0, 100);
        if (opts.key && C.Mood && s.id !== opts.except) C.Mood.think(s, opts.key, opts.vars);
      });
      if (delta !== 0 && C.UI && C.UI.floatMoral) C.UI.floatMoral(delta);
    },

    // reward : objets rapportés le soir (sinon tirage) · risk : probabilité d'être blessé(e)
    sendAway: function (s, reason, reward, risk) {
      C.Actions.cancel(s, true);
      s.path = [];
      s.away = reason;
      s.awayRisk = risk || 0;
      var R = C.R;
      if (reward) { s.awayReward = reward; if (C.UI) C.UI.buildCards(); return; }
      var rewards = [
        { conserve: R.int(1, 2), composants: R.int(1, 3) },
        { bois: R.int(3, 5), cigarettes: 1 },
        { legumes: R.int(2, 3), eau: 2 },
        { pieces_meca: 1, composants: 2 },
        { cafe: 1, sucre: 2 }
      ];
      s.awayReward = R.pick(rewards);
      if (C.UI) C.UI.buildCards();
    },

    AWAY_TEXT: {
      voisin: 'Parti(e) aider un voisin', colis: 'Parti(e) chercher un colis largué', decombres: 'Parti(e) dégager des blessés',
      enfant: 'Raccompagne une enfant perdue', pain: 'Fait la queue pour du pain'
    },

    // ------------------------------------------------ journal
    log: function (text, kind) {
      var st = Game.st;
      st.log.push({ d: st.day, t: Math.floor(st.minute), text: text, kind: kind || 'info' });
      if (st.log.length > 400) st.log.splice(0, st.log.length - 400);
    },
    toast: function (text, kind) { if (C.UI) C.UI.toast(text, kind); }
  };
})(window.CQR);
