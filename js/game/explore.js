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

  // ------------------------------------------------------------ carnet de l'expédition
  // Chaque moment marquant est noté avec l'heure : le rapport du matin en fait
  // le carnet du survivant, à la première personne.
  E.ev = function (type, data) {
    if (!E.active) return;
    var d = data || {};
    d.type = type; d.m = G().st.minute;
    E.events.push(d);
  };

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
    E.kills = []; E.spared = []; E.provoked = {}; E.events = [];
    E.w0 = s.wound; E.startBag = U.copy(bag);
    C.Combat.noises = []; C.Combat.shots = [];
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
    // Soldats : ronde, vigilance, hostilité mémorisée
    est.objects.forEach(function (o) { if (o.kind === 'guard') C.Combat.init(o, ls); });

    ls.visits++;
    home.stats.scavenged++;
    var gs = est.objects.filter(function (o) { return o.kind === 'guard'; });
    E.ev('enter', { visits: ls.visits, guards: gs.length, hostile: gs.some(function (g) { return g.attitude === 'hostile'; }) });
    s.x = 230; s.f = 1; s.y = C.FLOORS[1].y; s.facing = 1; s.path = []; s.act = null; s.run = false; s.hidden = false;

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
      var step = C.Surv.speed(s) * gm * (s.run ? 1.75 : 1);
      while (step > 0 && s.path.length) {
        var wp = s.path[0];
        var dx = wp.x - s.x, dy = wp.y - s.y, d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dx) > 0.5) s.facing = dx > 0 ? 1 : -1;
        if (d <= step) { s.x = wp.x; s.y = wp.y; s.f = wp.f; s.path.shift(); step -= d; }
        else { s.x += dx / d * step; s.y += dy / d * step; step = 0; }
      }
    }
    C.Actions.tick(s, gm);
    if (!E.active) return;
    C.Combat.update(dt * (C.Main.speed || 0), gm);
    if (!E.active) return;
    if (!E.bellRung && st.minute >= BELL) {
      E.bellRung = true;
      if (C.Audio.ready) { C.Audio.sfx.alert(); }
      if (C.UI) C.UI.toast('Il est 4 h. Le jour se lève dans une heure : il faut rentrer.', 'alert');
      E.ev('bell');
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
    var keep = ['searched', 'loot', 'locked', 'open', 'broken', 'hp'];
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

    var bag = reason === 'dead' ? {} : est.inventory;
    // Mila : libérée, ou laissée au soldat ivre
    var mila = ls.npc.mila;
    if (mila && !mila.rescued && mila.talk && !mila.abandoned && !C.Combat.freed('brute')) {
      mila.abandoned = true;
      E.ev('abandon');
      E.notes.push({ t: first(s) + ' a laissé la jeune femme avec le soldat ivre. Personne n\'en parle.', k: 'bad' });
      E.effects.push(function () { G().moralAll(-6, { bad: true, key: 'abandoned' }); });
    }
    C.Combat.consequences(s, E.notes, E.effects);
    E.ev('leave', { reason: reason });
    // Restaure le refuge
    C.STAIRS = E.saved.STAIRS; C.WALLS = E.saved.WALLS; C.WINDOWS = E.saved.WINDOWS; C.SLOTS = E.saved.SLOTS;
    C.DECOR = E.saved.DECOR; C.THEME = E.saved.THEME; C.NAV_START = E.saved.NAV_START;
    G().st = home;
    est.log.forEach(function (l) { home.log.push(l); });
    s.x = E.homePos.x; s.y = E.homePos.y; s.f = E.homePos.f; s.facing = E.homePos.facing;
    E.active = false;
    if (C.UI) C.UI.showExploreHud(false);

    // Conséquences morales, appliquées au groupe une fois rentré
    var owners = Object.keys(E.stolen);
    if (owners.length) {
      owners.forEach(function (ow) {
        var od = C.OWNERS[ow] || { text: ' a volé ceux qui s\'abritaient là.', moral: -9, key: 'stole' };
        // Prendre à l'armée n'est pas voler des gens dans le besoin
        if (!od.moral) { E.notes.push({ t: first(s) + od.text, k: 'info' }); return; }
        home.stats.stole++;
        ls.angry = true;
        E.notes.push({ t: first(s) + od.text, k: 'bad' });
        G().moralAll(od.moral, { bad: true, key: od.key });
        if (od.horvat) home.flags.horvat = home.day + 3;
        // Ce qu'on apprendra plus tard (une seule fois par lieu)
        if (od.later && !ls.laterSet) {
          ls.laterSet = true;
          (home.flags.later = home.flags.later || []).push({ day: home.day + od.later.days, text: od.later.text, moral: od.later.moral, key: od.later.key });
        }
      });
    }
    E.effects.forEach(function (fn) { fn(); });
    if (reason === 'dead') {
      E.notes.unshift({ t: first(s) + ' a été abattu(e) sur place. Son corps et son sac sont restés là-bas.', k: 'bad' });
      C.Surv.kill(s, 'pillage');
    }
    if (reason === 'time') E.notes.unshift({ t: 'Le jour se levait : ' + first(s) + ' a dû rentrer en hâte.', k: 'info' });

    C.Render.dirty = true; C.Render.pops = []; C.Render.npcSay = {}; C.Render.bubbles = {};
    var plan = E.plan;
    plan.scav.explored = { items: bag, notes: E.notes, dead: reason === 'dead', exp: E.summary(s, bag, reason) };
    C.Combat.noises = []; C.Combat.shots = [];
    C.Main.setSpeed(0);
    if (E.onDone) E.onDone(plan);
  };

  // ------------------------------------------------------------ bilan et carnet
  E.summary = function (s, bag, reason) {
    var ev = E.events, gained = {}, k;
    for (k in bag) { var d = (bag[k] || 0) - (E.startBag[k] || 0); if (d > 0) gained[k] = d; }
    var met = {};
    ev.forEach(function (e) { if (e.name && /talk|help|donate|trade|rescue/.test(e.type)) met[e.name] = true; });
    var n = 0; for (k in gained) n += gained[k];
    return {
      sid: s.id, loc: E.loc, start: 20 * 60, end: ev.length ? ev[ev.length - 1].m : 20 * 60, reason: reason,
      gained: gained, gainedN: n, weight: E.weight(bag), cap: E.capacity(s),
      searched: ev.filter(function (e) { return e.type === 'loot'; }).length,
      met: Object.keys(met).length,
      kills: E.kills.length, spared: E.spared.length,
      hits: ev.filter(function (e) { return e.type === 'hit'; }).length,
      wound: Math.round(Math.max(0, s.wound - E.w0)),
      stole: ev.some(function (e) { return e.type === 'steal' && e.owner !== 'armee'; }),
      story: E.story(s, ev, reason, bag)
    };
  };

  // « la caisse », « l'armoire », « le coffre »
  function withArticle(name) {
    var n = name.toLowerCase();
    if (/^[aeéèêiouyh]/.test(n)) return 'l\'' + n;
    var masc = { coffre: 1, tas: 1, meuble: 1, placard: 1, bureau: 1, classeur: 1, lit: 1, sac: 1, corps: 1 };
    return (masc[n.split(' ')[0]] ? 'le ' : 'la ') + n;
  }

  // Carnet à la première personne (accordé au genre du survivant)
  E.story = function (s, ev, reason, bag) {
    var fe = s.look && s.look.female ? 'e' : '';
    var out = [], lootLines = 0, hitLines = 0, hideLines = 0, talked = {};
    function add(m, t, k) { out.push({ m: m, t: t, k: k || '' }); }
    var locName = E.def.name;
    ev.forEach(function (e) {
      switch (e.type) {
        case 'enter':
          add(e.m, (e.visits > 1 ? 'De retour à : ' : 'Arrivé' + fe + ' à : ') + locName + '. Je me glisse à l\'intérieur sans un bruit.');
          if (e.guards) add(e.m, e.hostile ? 'Des soldats partout. S\'ils me voient, ils tirent.' : 'Des soldats gardent l\'endroit. Je garde les mains bien en vue.', 'bad');
          break;
        case 'loot':
          lootLines++;
          if (lootLines <= 4) add(e.m, (e.name === 'Corps' ? 'Sur le corps du soldat' : 'Dans ' + withArticle(e.name)) + ' : ' + C.itemsText(e.items) + '.');
          else if (lootLines === 5) add(e.m, 'Et d\'autres choses encore, ici et là.');
          break;
        case 'steal':
          add(e.m, e.owner === 'armee' ? 'Je me suis servi' + fe + ' dans les réserves de l\'armée. Eux ne manqueront de rien.' : 'J\'ai pris ce qui ne m\'appartenait pas. Ils n\'avaient déjà presque rien.', e.owner === 'armee' ? '' : 'bad');
          break;
        case 'caught': add(e.m, 'Un soldat m\'a vu' + fe + ' faire. « Voleur ! »', 'bad'); break;
        case 'help': add(e.m, e.name + ' avait besoin de ' + C.itemsText(e.items) + '. Je le lui ai donné.' + (e.reward ? ' En échange : ' + C.itemsText(e.reward) + '.' : ''), 'good'); break;
        case 'donate': add(e.m, 'J\'ai laissé ' + C.itemsText(e.items) + ' pour ' + e.name + '.', 'good'); break;
        case 'trade': add(e.m, 'Troc avec ' + e.name + ' : ' + C.itemsText(e.gave) + ' contre ' + C.itemsText(e.got) + '.'); break;
        case 'talk':
          if (talked[e.name]) break;
          talked[e.name] = true;
          add(e.m, 'J\'ai échangé quelques mots avec ' + e.name + '.');
          break;
        case 'warn': add(e.m, '« Halte ! » Un soldat m\'a mis' + fe + ' en joue et m\'a ordonné de reculer.', 'bad'); break;
        case 'provoked':
          add(e.m, {
            zone: 'Je n\'ai pas reculé assez vite. Ils ont ouvert le feu.',
            theft: 'Ils ont ouvert le feu. Toute la garnison était après moi.',
            attack: 'J\'ai frappé le premier. Maintenant, ils étaient tous après moi.',
            shot_at: 'J\'ai tiré. Tout l\'endroit s\'est réveillé.'
          }[e.why] || 'Ils m\'ont repéré' + fe + '.', 'bad');
          break;
        case 'hide':
          hideLines++;
          if (hideLines <= 2) add(e.m, 'Je me suis terré' + fe + ' dans un coin sombre, le souffle coupé, pendant qu\'un soldat passait à quelques pas.');
          break;
        case 'hit':
          hitLines++;
          if (hitLines === 1) add(e.m, e.dmg >= 30 ? 'Une balle m\'a touché' + fe + '. La douleur m\'a coupé le souffle.' : 'J\'ai été touché' + fe + '. Je saigne.', 'bad');
          else if (hitLines === 2) add(e.m, 'Encore touché' + fe + '. Je ne sens plus mon bras.', 'bad');
          break;
        case 'kill':
          add(e.m, {
            fight: 'J\'ai tué un soldat. C\'était lui ou moi. Je me le répète.',
            asleep: 'Il dormait. Je l\'ai tué avant qu\'il ouvre les yeux.',
            unprovoked: 'Il ne m\'avait rien fait. Je l\'ai tué quand même.',
            surrender: 'Il s\'était rendu. Il suppliait. Je l\'ai tué quand même.',
            villain: 'Le soldat ivre ne fera plus de mal à personne.'
          }[e.kind] || 'J\'ai tué quelqu\'un.', e.kind === 'villain' ? '' : 'bad');
          break;
        case 'spare': add(e.m, 'Un soldat s\'est rendu, à genoux. Je l\'ai laissé partir.', 'good'); break;
        case 'rescue': add(e.m, e.name + ' est libre. Elle m\'a serré la main sans un mot, puis m\'a donné ' + C.itemsText(e.items) + '.', 'good'); break;
        case 'abandon': add(e.m, 'J\'ai laissé la jeune femme là-haut avec lui. Je n\'ai rien fait.', 'bad'); break;
        case 'bell': add(e.m, '4 h. Le ciel pâlit déjà. Il faut rentrer.'); break;
        case 'leave':
          if (reason === 'dead') { add(e.m, 'Le carnet s\'arrête là.', 'dead'); break; }
          var w = E.weight(bag), cap = E.capacity(s);
          var how = w >= cap * 0.8 ? 'le sac plein à craquer' : w >= cap * 0.4 ? 'le sac à moitié plein' : w > 0 ? 'presque les mains vides' : 'les mains vides';
          add(e.m, reason === 'time' ? 'Le jour se levait. J\'ai couru jusqu\'au refuge, ' + how + '.' : 'Rentré' + fe + ' avant l\'aube, ' + how + '.', 'end');
          break;
      }
    });
    return out;
  };

  // ------------------------------------------------------------ personnages
  E.npcDef = function (o) { return C.NPCS[o.npc]; };
  E.npcState = function (o) { var ls = locState(E.home, E.loc); if (!ls.npc[o.npc]) ls.npc[o.npc] = {}; return ls.npc[o.npc]; };

  // Bulle au-dessus d'un personnage non joueur ou du survivant
  E.say = function (who, text, secs) {
    if (!C.Render) return;
    if (who.kind === 'npc' || who.kind === 'guard') {
      C.Render.npcSay = C.Render.npcSay || {};
      C.Render.npcSay[who.uid] = { text: text, until: performance.now() + (secs || 5) * 1000 };
    } else C.Render.bubbles[who.id] = { text: text, until: performance.now() + (secs || 4.5) * 1000 };
  };

  E.talk = function (s, o) {
    var d = E.npcDef(o), ns = E.npcState(o), ls = locState(E.home, E.loc);
    // Retenue par un soldat : libre quand il n'est plus là
    if (d.rescued) {
      ns.talk = (ns.talk || 0) + 1;
      if (!C.Combat.freed('brute')) { E.say(o, d.greet[(ns.talk - 1) % d.greet.length], 5); return; }
      if (!ns.rescued) {
        ns.rescued = true; ns.helped = true;
        G().addItems(d.reward);
        if (C.Render.pop) C.Render.pop(s, Object.keys(d.reward).map(function (k) { return { item: k, n: d.reward[k] }; }));
        E.home.stats.helped++;
        E.notes.push({ t: first(s) + ' a libéré ' + d.name + ' du soldat qui la retenait.', k: 'good' });
        E.ev('rescue', { name: d.name, items: U.copy(d.reward) });
        E.effects.push(function () { G().moralAll(10, { good: true, key: 'helped' }); });
      }
      E.say(o, d.rescued[(ns.talk - 1) % d.rescued.length], 6);
      return;
    }
    var pool = ls.angry && d.afterSteal ? d.afterSteal : ns.helped && d.after ? d.after : d.greet;
    ns.talk = (ns.talk || 0) + 1;
    E.say(o, pool[(ns.talk - 1) % pool.length]);
    E.ev('talk', { name: d.name });
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
    E.ev('help', { name: d.name, items: U.copy(need.items), reward: need.reward ? U.copy(need.reward) : null });
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
    E.ev('donate', { name: d.name, items: U.copy(items) });
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
    E.ev('steal', { owner: o.owner });
    // Matériel de l'armée : grave seulement si un soldat voit faire
    if (o.owner === 'armee') { C.Combat.witnessTheft(E.s, o.owner); return; }
    // Les habitants réagissent sur le moment
    var npc = G().st.objects.filter(function (x) { return x.kind === 'npc' && C.NPCS[x.npc] && C.NPCS[x.npc].afterSteal; })[0];
    if (npc) E.say(npc, C.NPCS[npc.npc].afterSteal[0], 6);
  };
})(window.CQR);
