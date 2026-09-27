/* =========================================================
   Actions des survivants
   Une action (s.act) est sérialisable :
   { kind, uid, p, prog, dur, phase: 'walk'|'work', paid }
   Le coût en ressources est payé à l'arrivée sur place et
   remboursé si l'action est interrompue.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }
  function st() { return C.Game.st; }
  function now() { return st().day * 1440 + st().minute; }
  function first(s) { return s.name.split(' ')[0]; }
  function lootLeft(o) { var l = o.loot || {}; for (var k in l) if (l[k] > 0) return true; return false; }
  // Exploration : le butin d'un meuble démonté ou de gravats reste en tas à fouiller
  function leavePile(s, o) {
    if (!lootLeft(o)) return;
    var pile = G().spawnObject({ key: (o.key || 'x') + '_tas', kind: 'cache', variant: 'tas', f: o.f, x: C.util.clamp(o.x, C.WORLD.walkMin + 20, C.WORLD.walkMax - 20), w: 56, h: 22, searched: true, loot: C.util.copy(o.loot), owner: o.owner });
    if (C.UI && C.UI.openLoot) C.UI.openLoot(pile, s);
  }
  // Refus ou empêchement : écrit dans la scène au-dessus du survivant (plus de message en bas)
  function warnAt(s, text) {
    if (s && C.Render && C.Render.pop) C.Render.pop(s, [], text, 'warn');
    else G().toast(text, 'warn');
  }
  function itemsText(items) {
    return C.itemsText(items);
  }
  function anySoigneur() {
    return G().present().some(function (x) { return G().hasTrait(x, 'soigneur'); });
  }

  // ---------------------------------------------------------------- définitions
  // work : action de travail (refusée si brisé ou épuisé)
  // excl : la station ne peut servir qu'à un survivant à la fois
  // inPlace : pas de déplacement
  // loop : action continue (sommeil, repos…)
  var ACT = {
    move: { label: 'Se déplace', inPlace: false, dur: function () { return 0; } },

    search: {
      work: true, label: 'Fouille', sound: 'search', fatigue: 2.5,
      check: function (s, o) { if (o.searched && !lootLeft(o)) return 'Déjà fouillé.'; if (o.locked) return 'C\'est verrouillé.'; },
      // Première fouille : 30 min ; y revenir chercher le reste est rapide
      dur: function (s, o) { return o && o.searched ? 5 : 30; },
      done: function (s, o) {
        var first0 = !o.searched;
        o.searched = true;
        G().markDirty();
        // Fenêtre de transfert par glisser-déposer (comme dans le jeu d'origine)
        if (C.UI && C.UI.openLoot && !C.UI.autoLoot) {
          C.UI.openLoot(o, s);
          return null;
        }
        var loot = o.loot || {};
        G().addItems(loot);
        o.loot = {};
        return first0 || Object.keys(loot).length ? first(s) + ' a trouvé : ' + itemsText(loot) + '.' : null;
      }
    },

    unlock: {
      work: true, label: 'Force la serrure', sound: 'search', fatigue: 3,
      check: function (s, o, p) { if (G().count(p.tool) < 1) return 'Il faut : ' + C.ITEMS[p.tool].name + '.'; },
      dur: function (s, o, p) { return p.tool === 'passe_partout' ? 45 : 30; },
      done: function (s, o, p) {
        if (o.kind === 'door') o.open = true; else o.locked = false;
        var msg = first(s) + ' a ouvert : ' + G().objName(o).toLowerCase() + '.';
        if (p.tool === 'passe_partout' && C.R.chance(0.3)) {
          G().removeItems({ passe_partout: 1 });
          msg += ' Le passe-partout s\'est brisé.';
        }
        G().markDirty();
        return msg;
      }
    },

    clear: {
      work: true, label: 'Déblaie', sound: 'dig', fatigue: 4.5,
      dur: function (s, o) { return o.work * (G().count('pelle') > 0 ? 0.5 : 1); },
      done: function (s, o) {
        G().removeObject(o);
        // En exploration, ce qu'on trouve reste en tas : on choisit ce qu'on met dans le sac
        if (C.Explore && C.Explore.active) { leavePile(s, o); return first(s) + ' a déblayé les gravats' + (o.block ? ' — le passage est libre !' : '.'); }
        G().addItems(o.loot || {});
        return first(s) + ' a déblayé les gravats' + (o.block ? ' — le passage est libre !' : '.') + ' Trouvé : ' + itemsText(o.loot || {}) + '.';
      }
    },

    cut: {
      work: true, label: 'Scie la grille', sound: 'saw', fatigue: 4,
      check: function () { if (G().count('scie') < 1) return 'Il faut une scie à métaux.'; },
      dur: function () { return 90; },
      done: function (s, o) { G().removeObject(o); return first(s) + ' a découpé la grille. Une nouvelle pièce est accessible.'; }
    },

    dismantle: {
      work: true, label: 'Démonte', sound: 'saw', fatigue: 4,
      dur: function (s, o) { return o.work * (G().count('hachette') > 0 ? 0.6 : 1); },
      done: function (s, o) {
        G().removeObject(o);
        if (C.Explore && C.Explore.active) {
          if (o.owner) C.Explore.markStolen(o, o.loot || {});
          leavePile(s, o);
          return first(s) + ' a démonté le meuble.';
        }
        G().addItems(o.loot || {});
        return first(s) + ' a démonté le meuble : ' + itemsText(o.loot || {}) + '.';
      }
    },

    // --- Exploration : personnages et sortie
    npc: {
      label: 'Parle', dur: function () { return 2; },
      done: function (s, o, p) { C.Explore[p.what](s, o); return null; }
    },
    // --- Exploration : soldats, cachettes, combat (voir combat.js)
    gtalk: {
      label: 'Parle', dur: function () { return 2; },
      done: function (s, o, p) { C.Combat[p.what](s, o); return null; }
    },
    spare: {
      label: 'Épargne', dur: function () { return 1; },
      done: function (s, o) { C.Combat.spare(s, o); return null; }
    },
    attack: { label: 'Se bat', inPlace: true, dur: function () { return 0; } },
    shoot: {
      label: 'Tire', inPlace: true, dur: function () { return 0; },
      check: function (s, o, p) {
        var gd = C.Combat.GUNS[p.weapon];
        if (!gd) return 'Pas d\'arme à feu.';
        if (G().count('munitions') < 1) return 'Plus de munitions.';
      }
    },
    hide: {
      label: 'Caché(e)', loop: true, dur: function () { return 0; },
      tick: function () { return false; }
    },
    leave: {
      label: 'Rentre au refuge', dur: function () { return 0; },
      done: function () { setTimeout(function () { C.Explore.finish('exit'); }, 0); return null; }
    },

    board: {
      work: true, label: 'Barricade', sound: 'hammer', fatigue: 4,
      check: function (s, o) { if (o.boarded) return 'Déjà barricadé.'; },
      cost: function () { return C.BOARD_COST; },
      dur: function (s) { return 60 * (G().hasTrait(s, 'bricoleur') ? 0.7 : 1); },
      done: function (s, o) { o.boarded = true; G().markDirty(); return first(s) + ' a barricadé le trou. Moins de courants d\'air, moins de visiteurs indésirables.'; }
    },

    craft: {
      work: true, excl: true, label: 'Fabrique', sound: 'craft', fatigue: 3.5,
      check: function (s, o, p) {
        var r = findCraft(p.rid);
        if (!r) return 'Recette inconnue.';
        if (o.level < r.lvl) return 'Établi niveau ' + r.lvl + ' requis.';
        if (r.upgradeWB && o.level !== r.upgradeWB - 1) return 'Déjà amélioré.';
      },
      cost: function (s, o, p) { return findCraft(p.rid).cost; },
      dur: function (s, o, p) { return findCraft(p.rid).time * (G().hasTrait(s, 'bricoleur') ? 0.65 : 1); },
      label2: function (s, o, p) { return C.craftName(findCraft(p.rid)); },
      done: function (s, o, p) {
        var r = findCraft(p.rid);
        st().stats.crafted++;
        if (r.upgradeWB) { o.level = r.upgradeWB; G().markDirty(); return 'L\'établi passe au niveau ' + o.level + ' : de nouvelles recettes sont disponibles.'; }
        if (r.build) {
          st().pending.push(r.build);
          if (C.UI) C.UI.refreshPending();
          return C.BUILDINGS[r.build].name + ' fabriqué(e). Cliquez sur « À installer » pour le placer.';
        }
        G().addItems(r.give);
        return first(s) + ' a fabriqué : ' + itemsText(r.give) + '.';
      }
    },

    upgrade: {
      work: true, excl: true, label: 'Améliore', sound: 'craft', fatigue: 3.5,
      check: function (s, o, p) { if (o.level >= p.level) return 'Déjà amélioré.'; },
      cost: function (s, o, p) { return C.BUILDINGS[o.kind].upgrades[p.level].cost; },
      dur: function (s, o, p) { return C.BUILDINGS[o.kind].upgrades[p.level].time * (G().hasTrait(s, 'bricoleur') ? 0.65 : 1); },
      done: function (s, o, p) { o.level = p.level; G().markDirty(); return C.BUILDINGS[o.kind].name + ' amélioré(e) au niveau ' + o.level + '.'; }
    },

    repair: {
      work: true, excl: true, label: 'Répare', sound: 'craft', fatigue: 3.5,
      check: function (s, o) { if (!o.broken) return 'Rien à réparer.'; },
      cost: function (s, o) { return Actions.repairCost(o); },
      dur: function (s) { return 60 * (G().hasTrait(s, 'bricoleur') ? 0.6 : 1); },
      done: function (s, o) { o.broken = false; G().markDirty(); return first(s) + ' a réparé : ' + G().objName(o).toLowerCase() + '.'; }
    },

    doorup: {
      work: true, label: 'Renforce la porte', sound: 'hammer', fatigue: 4,
      check: function (s, o, p) { if (o.level >= p.level) return 'Déjà fait.'; },
      cost: function (s, o, p) { return C.DOOR_UPGRADES[p.level].cost; },
      dur: function (s, o, p) { return C.DOOR_UPGRADES[p.level].time * (G().hasTrait(s, 'bricoleur') ? 0.65 : 1); },
      done: function (s, o, p) { o.level = p.level; G().markDirty(); return 'La porte d\'entrée est ' + (o.level === 1 ? 'barricadée' : 'blindée') + '. Le refuge est mieux défendu.'; }
    },

    cook: {
      work: true, excl: true, label: 'Cuisine', sound: 'cook', fatigue: 2,
      cost: function (s, o, p) { return findStation(o.kind, p.rid).cost; },
      dur: function (s, o, p) { return findStation(o.kind, p.rid).time; },
      done: function (s, o, p) {
        var r = findStation(o.kind, p.rid);
        var give = U.copy(r.give);
        if (o.kind === 'stove') {
          if (o.level >= 2) give.repas += 1;
          if (G().hasTrait(s, 'cuisinier')) give.repas += 1;
        }
        G().addItems(give);
        return first(s) + ' a préparé : ' + itemsText(give) + '.';
      }
    },

    distill: {
      work: true, excl: true, label: 'Lance la distillation', sound: 'craft', fatigue: 2,
      check: function (s, o) { if (o.brewUntil) return 'La distillation est déjà en cours.'; if (o.ready) return 'Récupérez d\'abord la gnôle.'; },
      cost: function (s, o, p) { return findStation('still', p.rid).cost; },
      dur: function (s, o, p) { return findStation('still', p.rid).time; },
      done: function (s, o, p) {
        var r = findStation('still', p.rid);
        o.brewUntil = now() + r.brew;
        o.brewGive = r.give.alcool;
        return 'La distillation a commencé. Il faudra attendre ' + U.fmtDur(r.brew) + '.';
      }
    },

    collect: {
      work: true, label: 'Récupère', sound: 'search', fatigue: 1.5,
      check: function (s, o) { if (!collectable(o)) return 'Rien à récupérer pour l\'instant.'; },
      dur: function () { return 15; },
      done: function (s, o) {
        var got = {};
        if (o.kind === 'collector') { got.eau = o.water; o.water = 0; }
        else if (o.kind === 'rattrap') { got.viande = o.catch; o.catch = 0; }
        else if (o.kind === 'still') { got.alcool = o.ready; o.ready = 0; }
        else if (o.kind === 'garden') { got.legumes = 4 + C.R.int(0, 2); o.growth = 0; }
        else if (o.kind === 'herbgarden') { got.herbes = 3; got.tabac = C.R.int(0, 2); o.growth = 0; }
        G().addItems(got);
        G().markDirty();
        return first(s) + ' a récupéré : ' + itemsText(got) + '.';
      }
    },

    water: {
      work: true, label: 'Arrose', sound: 'search', fatigue: 1.5,
      check: function (s, o) { if (o.watered > 0) return 'C\'est déjà arrosé.'; if (o.growth >= growNeed(o)) return 'Prêt à être récolté.'; },
      cost: function (s, o) { return o.kind === 'garden' ? { eau: 2 } : { eau: 1 }; },
      dur: function () { return 20; },
      done: function (s, o) { o.watered = 2; G().markDirty(); return 'Les plantations sont arrosées pour deux jours.'; }
    },

    fuel: {
      work: true, label: 'Alimente le feu', sound: 'search', fatigue: 1,
      cost: function (s, o, p) { var c = {}; c[p.item] = p.n; return c; },
      dur: function () { return 10; },
      done: function (s, o, p) {
        var hours = { bois: 3, livres: 2, carburant: 7 }[p.item] * p.n * [1, 1, 1.3, 1.6][o.level];
        o.fuel = (o.fuel || 0) + hours * 60;
        G().markDirty();
        return 'Le chauffage brûlera encore ' + U.fmtDur(o.fuel) + '.';
      }
    },

    sleep: {
      excl: true, loop: true, label: 'Dort', fatigue: -14,
      check: function (s) { if (s.fatigue < 8) return first(s) + ' n\'a pas sommeil.'; },
      dur: function () { return 0; },
      tick: function (s, o, p, gm) { if (s.fatigue <= 0) return true; }
    },
    sleepfloor: {
      inPlace: true, loop: true, label: 'Dort par terre', fatigue: -7,
      check: function (s) { if (s.fatigue < 8) return first(s) + ' n\'a pas sommeil.'; },
      dur: function () { return 0; },
      tick: function (s, o, p, gm) { if (s.fatigue <= 0) return true; }
    },
    rest: {
      excl: true, loop: true, label: 'Se repose', fatigue: -5,
      dur: function () { return 0; },
      tick: function (s, o, p, gm) {
        if (s.restToday < 10) { var d = 2.2 * gm / 60; s.moral = Math.min(100, s.moral + d); s.restToday += d; }
        if (s.fatigue <= 0 && s.restToday >= 10) return true;
      }
    },
    read: {
      excl: true, label: 'Lit', fatigue: -2, sound: 'page',
      check: function () { if (G().count('livres') < 1) return 'Il n\'y a aucun livre dans la réserve.'; },
      dur: function () { return 60; },
      done: function (s) {
        var base = G().hasTrait(s, 'lecteur') ? 16 : 7;
        var gain = Math.round(base / (1 + s.readToday));
        s.readToday++;
        s.moral = Math.min(100, s.moral + gain);
        return first(s) + ' a lu un moment' + (gain > 5 ? ', le regard un peu plus clair.' : '. Le livre ne parvient plus vraiment à le distraire.');
      }
    },
    news: {
      excl: true, label: 'Écoute les infos', fatigue: 0.5,
      dur: function () { return 30; },
      done: function (s) {
        var n = C.World.news(st());
        if (C.UI) C.UI.dialog('Radio', '<p class="radio-text">« ' + n + ' »</p>', [{ label: 'Éteindre' }]);
        G().log('Radio : ' + n, 'radio');
        return null;
      }
    },
    music: {
      excl: true, loop: true, label: 'Écoute de la musique', fatigue: -1,
      dur: function () { return 0; },
      tick: function (s, o, p, gm) {
        if (s.restToday < 14) { var d = 2.8 * gm / 60; s.moral = Math.min(100, s.moral + d); s.restToday += d; }
        else return true;
      }
    },
    answer: {
      label: 'Répond à la porte', fatigue: 0,
      check: function () { if (!st().visitor) return 'Personne ne frappe.'; },
      dur: function () { return 3; },
      done: function (s) { if (C.UI) C.UI.openVisitor(s); return null; }
    },

    // ---- actions sociales (vers un autre survivant)
    talk: {
      toSurv: true, label: 'Parle', fatigue: 0.5,
      label2: function (s, o, p) { var b = G().surv(p.sid); return (p.mode === 'comfort' ? 'réconforte ' : 'avec ') + (b ? first(b) : '…'); },
      check: function (s, o, p) {
        var b = G().surv(p.sid);
        if (!b || !b.alive || b.away || b === s) return 'Personne à qui parler.';
        if (b.act && b.act.phase === 'work' && (b.act.kind === 'sleep' || b.act.kind === 'sleepfloor')) return first(b) + ' dort.';
        if (b.act && (b.act.kind === 'talk' || b.act.kind === 'listen' || b.act.kind === 'care') && !(b.act.p && b.act.p.sid === s.id)) return first(b) + ' est déjà en pleine conversation.';
        if (p.mode === 'comfort') {
          if (s.moral < 35) return first(s) + ' est trop mal pour réconforter qui que ce soit.';
          if (b.comfortedToday) return first(b) + ' a déjà été réconforté(e) aujourd\'hui.';
          if (b.moral >= 60) return first(b) + ' n\'a pas besoin d\'être réconforté(e).';
        } else if (s.talkedToday && s.talkedToday[b.id]) return first(s) + ' et ' + first(b) + ' ont déjà discuté aujourd\'hui.';
      },
      dur: function (s, o, p) { return p.mode === 'comfort' ? 45 : 30; },
      begin: function (s, o, p) {
        var b = G().surv(p.sid);
        Actions.cancel(b, true); b.path = [];
        b.act = { kind: 'listen', uid: null, p: { sid: s.id }, prog: 0, dur: 0, phase: 'work' };
        s.facing = b.x >= s.x ? 1 : -1; b.facing = -s.facing;
        C.Mood.sayKey(s, p.mode === 'comfort' ? 'comfort_open' : 'talk_open');
      },
      done: function (s, o, p) {
        var b = G().surv(p.sid);
        if (!b || !b.alive) return null;
        var n1 = first(s), n2 = first(b);
        if (p.mode === 'comfort') {
          var gain = 14 * (G().hasTrait(s, 'empathique') ? 1.5 : 1) + (s.moral >= 70 ? 3 : 0);
          if (G().hasTrait(b, 'cynique')) gain *= 0.7;
          b.moral = Math.min(100, b.moral + gain);
          b.comfortedToday = true;
          b.brokenDays = 0;
          s.moral = U.clamp(s.moral + (G().hasTrait(s, 'empathique') ? 3 : -2), 0, 100);
          C.Mood.think(b, 'comforted', { n: n1 });
          C.Mood.think(s, 'comforter', { n: n2 });
          C.Mood.sayKey(b, 'comfort_reply');
          return n1 + ' a réconforté ' + n2 + '.';
        }
        s.moral = Math.min(100, s.moral + 5 + (G().hasTrait(b, 'empathique') ? 3 : 0));
        b.moral = Math.min(100, b.moral + 5 + (G().hasTrait(s, 'empathique') ? 3 : 0));
        s.talkedToday = s.talkedToday || {}; b.talkedToday = b.talkedToday || {};
        s.talkedToday[b.id] = true; b.talkedToday[s.id] = true;
        C.Mood.think(s, 'talked', { n: n2 });
        C.Mood.think(b, 'talked', { n: n1 });
        C.Mood.sayKey(b, 'talk_reply');
        return n1 + ' et ' + n2 + ' ont discuté un moment.';
      }
    },
    listen: {
      inPlace: true, loop: true, label: 'Écoute', fatigue: 0.5,
      dur: function () { return 0; },
      tick: function (s, o, p) {
        var t = G().surv(p.sid);
        return !t || !t.alive || !t.act || (t.act.kind !== 'talk' && t.act.kind !== 'care') || !t.act.p || t.act.p.sid !== s.id;
      }
    },
    care: {
      toSurv: true, label: 'Soigne', fatigue: 1,
      label2: function (s, o, p) { var b = G().surv(p.sid); return b ? first(b) : '…'; },
      check: function (s, o, p) {
        var b = G().surv(p.sid);
        if (!b || !b.alive || b.away || b === s) return 'Personne à soigner.';
        if (p.item === 'bandage' && b.wound <= 0) return first(b) + ' n\'est pas blessé(e).';
        if (p.item !== 'bandage' && b.sick <= 0) return first(b) + ' n\'est pas malade.';
        if (b.act && (b.act.kind === 'talk' || b.act.kind === 'care')) return first(b) + ' est occupé(e).';
      },
      cost: function (s, o, p) { var c = {}; c[p.item] = 1; return c; },
      dur: function (s) { return G().hasTrait(s, 'soigneur') ? 15 : 25; },
      begin: function (s, o, p) {
        var b = G().surv(p.sid);
        var asleep = b.act && b.act.phase === 'work' && (b.act.kind === 'sleep' || b.act.kind === 'sleepfloor');
        if (!asleep) { Actions.cancel(b, true); b.path = []; b.act = { kind: 'listen', uid: null, p: { sid: s.id }, prog: 0, dur: 0, phase: 'work' }; b.facing = b.x >= s.x ? -1 : 1; }
        s.facing = b.x >= s.x ? 1 : -1;
        C.Mood.sayKey(s, 'care_open');
      },
      done: function (s, o, p) {
        var b = G().surv(p.sid);
        if (!b || !b.alive) return null;
        var k = G().hasTrait(s, 'soigneur') ? 1.8 : 1.1;
        if (p.item === 'bandage') { b.wound = Math.max(0, b.wound - 22 * k); b.bandaged = 48; }
        else b.sick = Math.max(0, b.sick - (p.item === 'medicaments' ? 45 : 22) * k);
        b.moral = Math.min(100, b.moral + 3);
        C.Mood.think(b, 'cared', { n: first(s) });
        return first(s) + ' a soigné ' + first(b) + (k > 1.5 ? ', avec des gestes sûrs.' : '.');
      }
    },

    // ---- actions personnelles (sur place)
    eat: {
      inPlace: true, label: 'Mange', fatigue: 0,
      cost: function (s, o, p) { var c = {}; c[p.food] = 1; return c; },
      dur: function () { return 10; },
      done: function (s, o, p) {
        var f = C.FOODS[p.food];
        s.hunger = Math.max(0, s.hunger - f.hunger);
        s.starving = 0;
        s.moral = U.clamp(s.moral + f.moral, 0, 100);
        var msg = first(s) + ' a mangé : ' + C.ITEMS[p.food].name.toLowerCase() + '.';
        if (f.sick && C.R.chance(f.sick)) { s.sick = Math.min(100, s.sick + 18); msg += ' Ça passe mal…'; }
        return msg;
      }
    },
    heal: {
      inPlace: true, label: 'Se soigne', fatigue: 0,
      check: function (s) { if (s.wound <= 0) return first(s) + ' n\'est pas blessé(e).'; },
      cost: function () { return { bandage: 1 }; },
      dur: function () { return 15; },
      done: function (s) {
        var k = anySoigneur() ? 1.6 : 1;
        s.wound = Math.max(0, s.wound - 22 * k);
        s.bandaged = 48;
        return 'Blessure de ' + first(s) + ' pansée' + (k > 1 ? ' avec soin.' : '.');
      }
    },
    medicate: {
      inPlace: true, label: 'Prend un traitement', fatigue: 0,
      check: function (s) { if (s.sick <= 0) return first(s) + ' n\'est pas malade.'; },
      cost: function (s, o, p) { var c = {}; c[p.item] = 1; return c; },
      dur: function () { return 10; },
      done: function (s, o, p) {
        var k = anySoigneur() ? 1.5 : 1;
        s.sick = Math.max(0, s.sick - (p.item === 'medicaments' ? 45 : 22) * k);
        return first(s) + ' a pris : ' + C.ITEMS[p.item].name.toLowerCase() + '.';
      }
    },
    coffee: {
      inPlace: true, label: 'Boit un café', fatigue: 0,
      cost: function () { return { cafe: 1 }; },
      dur: function () { return 10; },
      done: function (s) { s.fatigue = Math.max(0, s.fatigue - 18); s.moral = Math.min(100, s.moral + (G().hasTrait(s, 'cafeinomane') ? 6 : 2)); s.lastCoffee = st().day; return first(s) + ' boit un café brûlant.'; }
    },
    smoke: {
      inPlace: true, label: 'Fume', fatigue: 0,
      cost: function () { return { cigarettes: 1 }; },
      dur: function () { return 10; },
      done: function (s) { s.moral = Math.min(100, s.moral + (G().hasTrait(s, 'fumeur') ? 9 : 4)); s.lastSmoke = st().day; return first(s) + ' fume une cigarette en silence.'; }
    },
    drink: {
      inPlace: true, label: 'Boit un verre', fatigue: 0,
      cost: function () { return { alcool: 1 }; },
      dur: function () { return 10; },
      done: function (s) { s.moral = Math.min(100, s.moral + 10); s.fatigue = Math.min(100, s.fatigue + 6); return first(s) + ' vide un verre de gnôle. Ça brûle, ça réchauffe.'; }
    }
  };
  C.ACT = ACT;

  function findCraft(id) { for (var i = 0; i < C.CRAFTS.length; i++) if (C.CRAFTS[i].id === id) return C.CRAFTS[i]; return null; }
  function findStation(kind, id) {
    var l = C.STATION_RECIPES[kind] || [];
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return null;
  }
  function growNeed(o) { return o.kind === 'garden' ? 5 : 3; }
  function collectable(o) {
    if (o.kind === 'collector') return o.water > 0;
    if (o.kind === 'rattrap') return o.catch > 0;
    if (o.kind === 'still') return o.ready > 0;
    if (o.kind === 'garden' || o.kind === 'herbgarden') return (o.growth || 0) >= growNeed(o);
    return false;
  }

  // ---------------------------------------------------------------- moteur
  var Actions = C.Actions = { findCraft: findCraft, findStation: findStation, growNeed: growNeed, collectable: collectable };

  // Raison pour laquelle un survivant refuse de travailler (ou null)
  Actions.refusal = function (s, def) {
    if (!def.work) return null;
    if (s.moral < 15) return first(s) + ' refuse de travailler, le moral brisé.';
    if (s.fatigue >= 95) return first(s) + ' est épuisé(e). Il faut dormir.';
    return null;
  };

  // Efficacité de travail selon l'état du survivant
  Actions.efficiency = function (s) {
    var e = 1;
    if (s.moral < 35) e *= 0.8;
    if (s.fatigue >= 80) e *= 0.65; else if (s.fatigue >= 55) e *= 0.85;
    if (s.wound >= 60) e *= 0.7; else if (s.wound >= 30) e *= 0.85;
    if (s.sick >= 60) e *= 0.7; else if (s.sick >= 30) e *= 0.85;
    if (s.hunger >= 70) e *= 0.8;
    return e;
  };

  Actions.start = function (s, o, kind, p) {
    var def = ACT[kind];
    p = p || {};
    if (!s || !s.alive || s.away) return false;
    var reason = (o && o.broken && kind !== 'repair' ? G().objName(o) + ' est en panne : il faut la réparer.' : null) || Actions.refusal(s, def) || (def.check ? def.check(s, o, p) : null);
    if (reason) { warnAt(s, reason, 'warn'); if (C.Audio.ready) C.Audio.sfx.deny(); return false; }
    if (def.work && s.moral < 35 && Math.random() < 0.2) {
      warnAt(s, first(s) + ' n\'a pas le cœur à ça…', 'warn');
      C.Mood.say(s, s.moral < 25 ? 'Laissez-moi…' : 'Pas maintenant.');
      return false;
    }
    if (o && def.excl && o.user && o.user !== s.id) {
      var other = G().surv(o.user);
      if (other && other.act && other.act.uid === o.uid) { warnAt(s, first(other) + ' utilise déjà ceci.', 'warn'); return false; }
    }
    Actions.cancel(s, true);

    var from = { f: s.f, x: s.x }, prefix = [];
    if (Math.abs(s.y - C.FLOORS[s.f].y) > 1 && s.path.length) {
      prefix = [s.path[0]]; from = { f: s.path[0].f, x: s.path[0].x };
    }
    var path = [];
    if (def.toSurv) {
      var tgt = G().surv(p.sid);
      var spot = targetSpot(s, tgt);
      var tp = spot ? C.Nav.findPath(from, spot) : null;
      if (!tp) { warnAt(s, 'Impossible de rejoindre ' + first(tgt) + '.', 'warn'); return false; }
      path = tp;
    } else if (o && !def.inPlace) {
      var ip = C.Nav.interactPoint(from, o);
      if (!ip) { warnAt(s, 'Impossible d\'y accéder.', 'warn'); return false; }
      path = ip.path;
    }
    s.path = prefix.concat(path);
    s.act = { kind: kind, uid: o ? o.uid : null, p: p, prog: 0, dur: 0, phase: 'walk', paid: null };
    if (o && def.excl) o.user = s.id;
    if (C.Audio.ready) C.Audio.sfx.click();
    return true;
  };

  // Place à côté d'un autre survivant
  function targetSpot(s, b) {
    if (!b) return null;
    var f = b.f, bx = b.x;
    if (b.path.length && Math.abs(b.y - C.FLOORS[b.f].y) > 1) { f = b.path[0].f; bx = b.path[0].x; }
    var lying = b.act && b.act.phase === 'work' && (b.act.kind === 'sleep' || b.act.kind === 'sleepfloor');
    var side = (s.f === f && s.x < bx) ? -1 : 1;
    return { f: f, x: U.clamp(bx + side * (lying ? 46 : 42), C.WORLD.walkMin, C.WORLD.walkMax) };
  }

  Actions.moveTo = function (s, f, x) {
    if (!s || !s.alive || s.away) return;
    Actions.cancel(s, true);
    var from = { f: s.f, x: s.x }, prefix = [];
    if (Math.abs(s.y - C.FLOORS[s.f].y) > 1 && s.path.length) { prefix = [s.path[0]]; from = { f: s.path[0].f, x: s.path[0].x }; }
    var p = C.Nav.findPath(from, { f: f, x: x });
    if (!p) { warnAt(s, 'Impossible d\'aller là.', 'warn'); return; }
    s.path = prefix.concat(p);
    s.act = { kind: 'move', uid: null, p: {}, prog: 0, dur: 0, phase: 'walk' };
  };

  Actions.cancel = function (s, silent) {
    var a = s.act;
    if (!a) return;
    if (a.paid) G().addItems(a.paid, true);
    if (a.uid) { var o = G().obj(a.uid); if (o && o.user === s.id) o.user = null; }
    s.act = null;
    if (!silent) s.path = [];
  };

  // Au chargement : reconstruit l'occupation des stations
  Actions.rebuildUsers = function () {
    st().objects.forEach(function (o) { o.user = null; });
    st().survivors.forEach(function (s) {
      if (s.act && s.act.uid) { var o = G().obj(s.act.uid); if (o && ACT[s.act.kind].excl) o.user = s.id; }
    });
  };

  Actions.label = function (s) {
    var a = s.act;
    if (!a) return s.away ? 'Absent(e)' : 'Attend';
    var def = ACT[a.kind];
    if (a.phase === 'walk' && a.kind !== 'move') return 'Se rend sur place…';
    if (def.label2) return def.label + ' : ' + def.label2(s, G().obj(a.uid), a.p);
    return def.label;
  };

  // Avance l'action du survivant de gm minutes de jeu
  Actions.tick = function (s, gm) {
    var a = s.act;
    if (!a) return;
    if (a.kind === 'attack' || a.kind === 'shoot') { C.Combat.tickSurv(s, a, gm); return; }
    var def = ACT[a.kind];
    var o = a.uid ? G().obj(a.uid) : null;
    if (a.uid && !o) { Actions.cancel(s); return; }

    if (a.phase === 'walk') {
      if (s.path.length) return;
      if (a.kind === 'move') { s.act = null; return; }
      if (def.toSurv) {
        var tb = G().surv(a.p.sid);
        if (tb && tb.alive && (tb.f !== s.f || Math.abs(tb.x - s.x) > 70 || Math.abs(tb.y - C.FLOORS[tb.f].y) > 1)) {
          a.tries = (a.tries || 0) + 1;
          var sp2 = targetSpot(s, tb);
          var np = a.tries < 6 && sp2 ? C.Nav.findPath({ f: s.f, x: s.x }, sp2) : null;
          if (np && np.length) { s.path = np; return; }
          warnAt(s, first(tb) + ' est hors d\'atteinte.', 'warn'); Actions.cancel(s); return;
        }
      }
      // Arrivé : vérifications, paiement
      var reason = Actions.refusal(s, def) || (def.check ? def.check(s, o, a.p) : null);
      if (reason) { warnAt(s, reason, 'warn'); Actions.cancel(s); return; }
      var cost = def.cost ? def.cost(s, o, a.p) : null;
      if (cost) {
        if (!G().has(cost)) { warnAt(s, 'Il manque des ressources : ' + U.costText(cost) + '.', 'warn'); Actions.cancel(s); return; }
        G().removeItems(cost);
        a.paid = U.copy(cost);
      }
      a.dur = def.dur(s, o, a.p);
      a.phase = 'work';
      if (o) s.facing = o.x >= s.x ? 1 : -1;
      if (def.begin) def.begin(s, o, a.p);
      if (!def.loop && a.dur <= 0) { finish(s, a, def, o); }
      return;
    }

    // Travail
    if (def.loop) {
      if (def.tick && def.tick(s, o, a.p, gm)) {
        if (o && o.user === s.id) o.user = null;
        s.act = null;
      }
      return;
    }
    a.prog += gm * (def.work ? Actions.efficiency(s) : 1);
    if (a.prog >= a.dur) finish(s, a, def, o);
  };

  // Mot court affiché dans la scène à la fin d'une action (sans objets gagnés)
  var TAGS = {
    // (avec la fenêtre de fouille, le bilan s'affiche à sa fermeture)
    search: function () { return C.UI && C.UI.openLoot && !C.UI.autoLoot ? null : 'Rien d\'utile'; },
    unlock: function () { return 'Ouvert'; },
    clear: function (s, o) { return o.block ? 'Passage libre' : 'Déblayé'; },
    cut: function () { return 'Passage libre'; },
    dismantle: function () { return 'Démonté'; },
    board: function () { return 'Barricadé'; },
    craft: function (s, o) { return 'Établi niveau ' + o.level; },
    upgrade: function (s, o) { return 'Niveau ' + o.level; },
    repair: function () { return 'Réparé'; },
    doorup: function (s, o) { return o.level === 1 ? 'Porte barricadée' : 'Porte blindée'; },
    distill: function (s, o) { return 'Distille · ' + U.fmtDur(o.brewUntil - now()); },
    water: function () { return 'Arrosé'; },
    fuel: function (s, o) { return 'Feu · ' + U.fmtDur(o.fuel); }
  };

  function finish(s, a, def, o) {
    a.paid = null;
    if (o && o.user === s.id) o.user = null;
    s.act = null;
    var before = U.copy(st().inventory), pendingBefore = st().pending.length;
    var msg = def.done ? def.done(s, o, a.p) : null;
    if (msg) G().log(msg, 'action');
    if (C.Audio.ready) C.Audio.sfx.pickup();
    // Retour visuel dans la scène, comme dans le jeu d'origine : les objets
    // obtenus s'élèvent au-dessus du survivant, sinon un mot bref
    if (def.work && C.Render && C.Render.pop) {
      var inv = st().inventory, gains = [], id;
      for (id in inv) if ((inv[id] || 0) > (before[id] || 0)) gains.push({ item: id, n: inv[id] - (before[id] || 0) });
      for (id in before) if ((inv[id] || 0) < before[id]) gains.push({ item: id, n: (inv[id] || 0) - before[id] });
      if (st().pending.length > pendingBefore) gains.push({ building: st().pending[st().pending.length - 1], n: 1 });
      var tag = gains.length ? null : (TAGS[a.kind] ? TAGS[a.kind](s, o, a.p) : null);
      if (gains.length || tag) C.Render.pop(s, gains, tag);
    }
    if (C.UI) C.UI.onActionDone && C.UI.onActionDone(s, a);
  }

  // ---------------------------------------------------------------- menus contextuels
  function E(label, sub, reason, go, art) { return { label: label, sub: sub || '', enabled: !reason, reason: reason || '', go: go, art: art }; }

  // Personnages rencontrés en exploration, et sortie du lieu
  function exploreMenu(s, o, m) {
    function go(kind, p) { return function () { Actions.start(s, o, kind, p); }; }
    if (o.kind === 'exit') {
      m.title = 'Sortie';
      m.desc = 'Rentrer au refuge avec ce que contient le sac. La nuit se termine pour ce survivant.';
      m.entries.push(E('Rentrer au refuge', '', null, go('leave')));
      return m;
    }
    var d = C.NPCS[o.npc], ns = C.Explore.npcState(o), angry = G().st.locations[C.Explore.loc].angry;
    m.title = d.name;
    m.desc = d.title + (angry ? ' — vous a vu voler.' : ns.helped ? ' — vous êtes venu en aide.' : '');
    if (!d.silent) m.entries.push(E('Parler', '', null, go('npc', { what: 'talk' })));
    if (d.need && !ns.helped) {
      var has = G().has(d.need.items);
      m.entries.push(E(d.need.label, C.itemsText(d.need.items), has ? null : 'Il faut : ' + C.itemsText(d.need.items) + ' (dans le sac)', go('npc', { what: 'help' }), Object.keys(d.need.items)[0]));
    }
    if (d.trade) m.entries.push(E('Échanger', angry ? 'refuse' : 'troc', angry ? 'Il ne veut plus traiter avec vous.' : null, go('npc', { what: 'trade' })));
    if (d.donate) {
      var can = G().has(d.donate.items) || (d.donate.alt && G().has(d.donate.alt));
      m.entries.push(E(d.donate.label, C.itemsText(d.donate.items) + (d.donate.alt ? ' ou ' + C.itemsText(d.donate.alt) : ''), can ? null : 'Rien à donner dans le sac', go('npc', { what: 'donate' }), Object.keys(d.donate.items)[0]));
    }
    if (!m.entries.length) m.desc = d.title + '. Endormie, brûlante de fièvre.';
    return m;
  }
  function costSub(cost, time) {
    var parts = [];
    if (cost) {
      for (var k in cost) {
        var ok = G().count(k) >= cost[k];
        parts.push('<span class="' + (ok ? 'ok' : 'ko') + '">' + cost[k] + ' ' + U.esc(C.ITEMS[k].name.toLowerCase()) + '</span>');
      }
    }
    if (time) parts.push('<span class="dur">' + U.fmtDur(time) + '</span>');
    return parts.join(' · ');
  }

  Actions.repairCost = function (o) {
    return o.kind === 'radio' ? { pieces_elec: 1, composants: 1 } : { composants: 3, pieces_meca: 1 };
  };

  Actions.menu = function (s, o) {
    var m = { title: G().objName(o), desc: '', entries: [] };
    var b = C.BUILDINGS[o.kind];
    if (b) m.desc = b.desc;
    var reach = C.Nav.objectReachable(o);
    if (!reach) { m.desc = 'Inaccessible pour l\'instant : il faut dégager le passage.'; return m; }
    if (!s) { m.hint = 'Sélectionnez un survivant pour agir.'; }
    // Décor d'un lieu exploré : rien à faire
    if (o.deco) { m.desc = C.Explore && C.Explore.active ? 'Ça ne vous servira à rien ici.' : ''; return m; }
    if (o.kind === 'npc' || o.kind === 'exit') return exploreMenu(s, o, m);
    if (o.kind === 'guard') return C.Combat.menu(s, o, m);
    if (o.kind === 'hide') {
      m.desc = 'Un recoin plongé dans l\'ombre. Caché ici, on échappe aux regards — tant qu\'on ne bouge pas.';
      m.entries.push(E('Se cacher', 'rester immobile dans l\'ombre', null, go('hide')));
      return m;
    }
    if (o.broken) {
      m.title += ' — en panne';
      m.desc = 'Hors d\'usage. Il faut la réparer avant de pouvoir s\'en servir.';
      var rc = Actions.repairCost(o);
      m.entries.push(E('Réparer', costSub(rc, 60), G().has(rc) ? null : 'Ressources insuffisantes', function () { Actions.start(s, o, 'repair'); }));
      if (!s) m.entries.forEach(function (e) { e.enabled = false; e.reason = e.reason || 'Aucun survivant sélectionné'; });
      return m;
    }
    function go(kind, p) { return function () { Actions.start(s, o, kind, p); }; }
    var pelle = G().count('pelle') > 0, hach = G().count('hachette') > 0;

    switch (o.kind) {
      case 'rubble':
        m.desc = o.block ? 'Un éboulis bloque complètement le passage.' : 'Un tas de gravats. Il y a sûrement quelque chose dessous.';
        m.entries.push(E('Déblayer' + (pelle ? ' (pelle)' : ''), costSub(null, o.work * (pelle ? 0.5 : 1)), null, go('clear')));
        break;
      case 'cache':
        if (o.searched) {
          if (!lootLeft(o)) { m.desc = 'Il n\'y a plus rien.'; break; }
          m.desc = 'Il reste des choses à l\'intérieur.';
          m.entries.push(E('Ouvrir', costSub(null, 5), null, go('search')));
          break;
        }
        if (o.locked) {
          m.desc = 'Verrouillé. Il faut le forcer ou le crocheter.';
          (o.tools || []).forEach(function (t) {
            m.entries.push(E('Ouvrir : ' + C.ITEMS[t].name.toLowerCase(), costSub(null, t === 'passe_partout' ? 45 : 30), G().count(t) ? null : 'Il faut : ' + C.ITEMS[t].name, go('unlock', { tool: t })));
          });
        } else if (o.owner && C.Explore && C.Explore.active && C.OWNERS[o.owner] && C.OWNERS[o.owner].military) {
          // Matériel de l'armée : le risque, c'est d'être vu
          var od = C.OWNERS[o.owner];
          var watcher = C.Combat.guards().filter(function (g) { return !g.dead && g.attitude !== 'hostile' && C.Combat.sees(g, s); })[0];
          m.desc = od.desc;
          m.entries.push(E('Fouiller', watcher ? '<span class="ko">un soldat vous regarde</span>' : costSub(null, 30) + ' · à l\'abri des regards', null, watcher ? function () {
            C.UI.dialog('Sous ses yeux ?', '<p class="dialog-text">' + U.esc(od.warn) + '</p>', [
              { label: 'Attendre', cls: 'ghost' },
              { label: 'Fouiller quand même', run: go('search') }
            ]);
          } : go('search')));
        } else if (o.owner && C.Explore && C.Explore.active) {
          // Les affaires des habitants : fouiller, c'est voler
          var ow = C.OWNERS[o.owner] || {};
          m.desc = ow.desc || 'Ce n\'est pas à vous. Les gens qui vivent ici en ont besoin.';
          m.entries.push(E('Fouiller (voler)', 'mauvais pour le moral', null, function () {
            C.UI.dialog('Voler ?', '<p class="dialog-text">' + U.esc(ow.warn || 'Ces affaires appartiennent aux gens qui vivent ici. Ils en ont besoin pour survivre, eux aussi.') + '</p><p class="dialog-text">Tout le groupe l\'apprendra.</p>', [
              { label: 'Renoncer', cls: 'ghost' },
              { label: 'Fouiller quand même', run: go('search') }
            ]);
          }));
        } else {
          m.desc = 'On peut le fouiller.';
          m.entries.push(E('Fouiller', costSub(null, 30), null, go('search')));
        }
        break;
      case 'door':
        if (o.open) { m.desc = 'La porte est ouverte.'; break; }
        m.desc = 'Une porte fermée à clé. Qu\'y a-t-il derrière ?';
        (o.tools || []).forEach(function (t) {
          m.entries.push(E('Ouvrir : ' + C.ITEMS[t].name.toLowerCase(), costSub(null, t === 'passe_partout' ? 45 : 30), G().count(t) ? null : 'Il faut : ' + C.ITEMS[t].name, go('unlock', { tool: t })));
        });
        break;
      case 'grate':
        m.desc = 'Une grille soudée condamne l\'accès. Une scie à métaux en viendrait à bout.';
        m.entries.push(E('Scier la grille', costSub(null, 90), G().count('scie') ? null : 'Il faut une scie à métaux (établi niv. 2)', go('cut')));
        break;
      case 'furniture':
        var fo = o.owner && C.Explore && C.Explore.active ? (C.OWNERS[o.owner] || {}) : null;
        var theft = fo && !fo.military;
        m.desc = fo ? (fo.furn || fo.desc || 'Le meuble de quelqu\'un. Le démonter, c\'est le voler.') : 'Un vieux meuble. Démonté, il fournira du bois.';
        m.entries.push(E('Démonter' + (hach ? ' (hachette)' : '') + (theft ? ' — voler' : ''), costSub(null, o.work * (hach ? 0.6 : 1)), null, go('dismantle')));
        break;
      case 'hole':
        m.desc = o.boarded ? 'Des planches clouées bouchent le trou.' : 'Le vent et le froid s\'engouffrent. Et n\'importe qui pourrait entrer.';
        if (!o.boarded) m.entries.push(E('Barricader', costSub(C.BOARD_COST, 60), G().has(C.BOARD_COST) ? null : 'Ressources insuffisantes', go('board')));
        break;
      case 'stock':
        m.desc = 'Tout ce que le groupe possède.';
        m.entries.push(E('Ouvrir la réserve', '', null, function () { C.UI.openStock(); }));
        break;
      case 'frontdoor':
        m.desc = st().visitor ? 'Quelqu\'un attend dehors.' : 'La seule porte vers l\'extérieur.';
        if (st().visitor) m.entries.push(E('Ouvrir la porte', '', null, go('answer')));
        [1, 2].forEach(function (lvl) {
          if (o.level === lvl - 1) {
            var u = C.DOOR_UPGRADES[lvl];
            m.entries.push(E(u.label, costSub(u.cost, u.time), G().has(u.cost) ? null : 'Ressources insuffisantes', go('doorup', { level: lvl })));
          }
        });
        break;
      case 'workbench':
        m.entries.push(E('Fabriquer…', 'Établi niveau ' + o.level, null, function () { C.UI.openCraft(o); }));
        break;
      case 'bed':
        m.entries.push(E('Dormir', 'jusqu\'à être reposé', null, go('sleep')));
        break;
      case 'armchair':
        m.entries.push(E('Se reposer', 'repos + moral', null, go('rest')));
        m.entries.push(E('Lire un livre', costSub(null, 60), G().count('livres') ? null : 'Aucun livre', go('read')));
        break;
      case 'radio':
        m.entries.push(E('Écouter les informations', costSub(null, 30), null, go('news')));
        m.entries.push(E('Écouter de la musique', 'moral', null, go('music')));
        break;
      case 'stove':
      case 'herbshop':
        C.STATION_RECIPES[o.kind].forEach(function (r) {
          var sub = costSub(r.cost, r.time);
          m.entries.push(E(r.name, sub, G().has(r.cost) ? null : 'Ingrédients manquants', go('cook', { rid: r.id })));
        });
        break;
      case 'still':
        if (o.brewUntil) m.desc = 'Distillation en cours : encore ' + U.fmtDur(o.brewUntil - now()) + '.';
        else if (o.ready) m.desc = 'La gnôle est prête.';
        if (o.ready) m.entries.push(E('Récupérer la gnôle', o.ready + ' gnôle', null, go('collect')));
        C.STATION_RECIPES.still.forEach(function (r) {
          m.entries.push(E(r.name, costSub(r.cost, r.time), o.brewUntil || o.ready ? 'Occupée' : (G().has(r.cost) ? null : 'Ingrédients manquants'), go('distill', { rid: r.id })));
        });
        break;
      case 'heater':
        m.desc = (o.fuel > 0 ? 'Allumé — encore ' + U.fmtDur(o.fuel) + ' de combustible.' : 'Éteint.') + ' ' + b.desc;
        [['bois', 1], ['bois', 3], ['livres', 2], ['carburant', 1]].forEach(function (f) {
          var c = {}; c[f[0]] = f[1];
          var hours = { bois: 3, livres: 2, carburant: 7 }[f[0]] * f[1] * [1, 1, 1.3, 1.6][o.level];
          m.entries.push(E('Brûler ' + f[1] + ' ' + C.ITEMS[f[0]].name.toLowerCase(), costSub(c) + ' · +' + U.fmtDur(hours * 60), G().has(c) ? null : 'Pas assez', go('fuel', { item: f[0], n: f[1] })));
        });
        break;
      case 'collector':
        m.desc = 'Eau collectée : ' + (o.water || 0) + ' / ' + (o.level >= 2 ? 8 : 4) + '. ' + b.desc;
        m.entries.push(E('Récupérer l\'eau', (o.water || 0) + ' eau', o.water > 0 ? null : 'Vide', go('collect')));
        break;
      case 'rattrap':
        m.desc = o.catch ? 'Quelque chose s\'est fait prendre !' : 'Le piège est armé. Il faut attendre la nuit.';
        if (o.catch) m.entries.push(E('Relever le piège', o.catch + ' viande', null, go('collect')));
        break;
      case 'garden':
      case 'herbgarden':
        var need = growNeed(o), g = o.growth || 0;
        m.desc = (g >= need ? 'Prêt à récolter !' : 'Croissance : ' + g + ' / ' + need + (o.watered > 0 ? ' — arrosé' : ' — a besoin d\'eau')) + '. Pousse chaque nuit s\'il est arrosé.';
        if (g >= need) m.entries.push(E('Récolter', '', null, go('collect')));
        else m.entries.push(E('Arroser', costSub(o.kind === 'garden' ? { eau: 2 } : { eau: 1 }, 20), o.watered > 0 ? 'Déjà arrosé' : null, go('water')));
        break;
    }

    // Améliorations de station
    if (b && b.upgrades && o.level < b.maxLevel) {
      var up = b.upgrades[o.level + 1];
      m.entries.push(E(up.label, costSub(up.cost, up.time), G().has(up.cost) ? null : 'Ressources insuffisantes', go('upgrade', { level: o.level + 1 })));
    }
    if (s) {
      m.entries.forEach(function (e) {
        if (!e.enabled) return;
      });
    } else {
      m.entries.forEach(function (e) { if (o.kind !== 'stock') { e.enabled = false; e.reason = e.reason || 'Aucun survivant sélectionné'; } });
    }
    return m;
  };

  // Interactions d'un survivant (s) avec un autre (b)
  Actions.survMenu = function (s, b) {
    var list = [];
    function add(label, sub, kind, p) {
      var reason = Actions.refusal(s, ACT[kind]) || ACT[kind].check(s, null, p);
      if (ACT[kind].cost && !reason && !G().has(ACT[kind].cost(s, null, p))) reason = 'Rien en réserve';
      list.push(E(label, sub, reason, function () { Actions.start(s, null, kind, p); }, p.item));
    }
    add('Parler avec ' + first(b), '+ moral pour les deux · 30 min · une fois par jour', 'talk', { sid: b.id, mode: 'talk' });
    if (b.moral < 60) add('Réconforter ' + first(b), '++ moral pour ' + first(b) + ' · 45 min', 'talk', { sid: b.id, mode: 'comfort' });
    if (b.wound > 0) add('Panser ' + first(b), '1 bandage (' + G().count('bandage') + ')' + (G().hasTrait(s, 'soigneur') ? ' · soins experts' : ''), 'care', { sid: b.id, item: 'bandage' });
    if (b.sick > 0) {
      add('Donner des médicaments à ' + first(b), G().count('medicaments') + ' en réserve', 'care', { sid: b.id, item: 'medicaments' });
      if (G().count('remede')) add('Donner un remède aux plantes à ' + first(b), G().count('remede') + ' en réserve', 'care', { sid: b.id, item: 'remede' });
    }
    return list;
  };

  // Actions personnelles d'un survivant (fiche)
  Actions.personal = function (s) {
    var list = [];
    function go(kind, p) { return function () { Actions.start(s, null, kind, p); }; }
    ['repas', 'conserve', 'legumes', 'viande'].forEach(function (f) {
      if (G().count(f) > 0) list.push(E('Manger : ' + C.ITEMS[f].name.toLowerCase(), '−' + C.FOODS[f].hunger + ' faim (' + G().count(f) + ' en réserve)', null, go('eat', { food: f }), f));
    });
    if (s.wound > 0) list.push(E('Panser la blessure', '1 bandage (' + G().count('bandage') + ')', G().count('bandage') ? null : 'Aucun bandage', go('heal'), 'bandage'));
    if (s.sick > 0) {
      list.push(E('Prendre des médicaments', G().count('medicaments') + ' en réserve', G().count('medicaments') ? null : 'Aucun', go('medicate', { item: 'medicaments' }), 'medicaments'));
      if (G().count('remede')) list.push(E('Prendre un remède aux plantes', G().count('remede') + ' en réserve', null, go('medicate', { item: 'remede' }), 'remede'));
    }
    if (G().count('cafe')) list.push(E('Boire un café', '−18 fatigue', null, go('coffee'), 'cafe'));
    if (G().count('cigarettes')) list.push(E('Fumer une cigarette', '+ moral', null, go('smoke'), 'cigarettes'));
    if (G().count('alcool')) list.push(E('Boire de la gnôle', '++ moral', null, go('drink'), 'alcool'));
    list.push(E('Dormir par terre', 'moins reposant qu\'un lit', null, go('sleepfloor')));
    return list;
  };
})(window.CQR);
