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
  // Ce que rend un contenant démonté au refuge (bois surtout)
  var SCRAP = {
    caisse: { work: 30, loot: { bois: 2 } },
    armoire: { work: 60, loot: { bois: 4, composants: 1 } },
    etagere: { work: 45, loot: { bois: 1, composants: 2 } },
    coffre: { work: 45, loot: { bois: 2, composants: 1 } },
    valise: { work: 20, loot: { composants: 1 } },
    palettes: { work: 40, loot: { bois: 3 } },
    caisse_mil: { work: 30, loot: { bois: 2 } }
  };
  function scrapOf(o) {
    if (o.kind !== 'cache' || o.owner || (C.Explore && C.Explore.active)) return null;
    return SCRAP[o.variant || 'caisse'] || null;
  }
  function lootLeft(o) { var l = o.loot || {}; for (var k in l) if (l[k] > 0) return true; return false; }
  // Exploration : le butin d'un meuble démonté ou de gravats reste en tas à fouiller
  function leavePile(s, o) {
    if (!lootLeft(o)) return;
    var pile = G().spawnObject({ key: (o.key || 'x') + '_tas', kind: 'cache', variant: 'tas', f: o.f, x: C.util.clamp(o.x, C.Nav.minX(o.f) + 20, C.Nav.maxX(o.f) - 20), w: 56, h: 22, searched: true, loot: C.util.copy(o.loot), owner: o.owner });
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
  // Durée de fouille (minutes de jeu) selon le contenant, comme dans
  // This War of Mine : un corps ou une valise se fouillent en un instant,
  // une armoire ou un coffre prennent plus de temps. En exploration,
  // 1 minute de jeu ≈ 0,6 s.
  var SEARCH_MIN = {
    corps: 4, baluchon: 3, valise: 6, pharmacie: 6, commode: 10, etagere: 10,
    caisse: 12, tas: 12, epave: 15, bibliotheque: 15, armoire: 16, coffre: 16
  };
  function searchTime(o) {
    if (!o) return 15;
    if (o.searched) return o.variant === 'corps' || o.variant === 'baluchon' ? 2 : 4;
    return SEARCH_MIN[o.variant] || 15;
  }

  var ACT = {
    move: { label: 'Se déplace', inPlace: false, dur: function () { return 0; } },

    search: {
      work: true, label: 'Fouille', sound: 'search', fatigue: 2.5,
      check: function (s, o) { if (o.searched && !lootLeft(o)) return 'Déjà fouillé.'; if (o.locked) return 'C\'est verrouillé.'; },
      // Selon le contenant ; y revenir chercher le reste est rapide
      dur: function (s, o) { return searchTime(o); },
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
        if (G().wear(p.tool, 1, s)) msg += ' ' + (p.tool === 'passe_partout' ? 'Le passe-partout s\'est brisé dans la serrure.' : 'L\'outil n\'a pas survécu.');
        G().markDirty();
        return msg;
      }
    },

    // Regarder par le trou de la serrure (exploration) : révèle la pièce
    peek: {
      label: 'Regarde par la serrure', fatigue: 0,
      dur: function () { return 3; },
      done: function (s, o) {
        o.peeked = true;
        G().markDirty();
        // La pièce regardée : le côté encore inexploré de la porte
        var side = !C.Nav.isReachable(o.f, o.x + 20) ? 1 : !C.Nav.isReachable(o.f, o.x - 20) ? -1 : (s.x < o.x ? 1 : -1);
        var x0 = side > 0 ? o.x : -1e9, x1 = side > 0 ? 1e9 : o.x;
        // Jusqu'au prochain obstacle de ce côté
        G().st.objects.forEach(function (b) {
          if (b === o || b.f !== o.f || !G().isBlocking(b)) return;
          if (side > 0 && b.x > o.x && b.x < x1) x1 = b.x;
          if (side < 0 && b.x < o.x && b.x > x0) x0 = b.x;
        });
        var inRoom = function (b) { return b.f === o.f && b.x > x0 && b.x < x1; };
        var gs = G().st.objects.filter(function (b) { return b.kind === 'guard' && !b.dead && inRoom(b) && !(C.GUARD_TYPES[b.type] || {}).unseen; });
        var npcs = G().st.objects.filter(function (b) { return b.kind === 'npc' && inRoom(b); });
        var caches = G().st.objects.filter(function (b) { return (b.kind === 'cache' || b.kind === 'furniture') && inRoom(b) && !b.searched; });
        var parts = [];
        if (gs.length) {
          var asleep = gs.filter(function (g) { return g.state === 'sleep'; }).length;
          var mil = gs.every(function (g) { return /soldat|sergent|garde/i.test(C.GUARD_TYPES[g.type].name || ''); });
          var noun1 = mil ? 'Un soldat' : 'Un homme armé', nounN = mil ? ' soldats' : ' hommes armés';
          parts.push(gs.length === 1 ? noun1 + (asleep ? ', endormi' : '') + '.' : (gs.length === 2 ? 'Deux' : gs.length === 3 ? 'Trois' : 'Plusieurs') + nounN + (asleep ? ' (' + (asleep === gs.length ? 'ils dorment' : asleep + ' dort') + ')' : '') + '.');
        }
        if (npcs.length) parts.push(npcs.length === 1 ? 'Quelqu\'un est là.' : npcs.length + ' personnes.');
        if (!gs.length && !npcs.length) parts.push('Personne, on dirait.');
        parts.push(caches.length ? (caches.length > 2 ? 'Des meubles, des caisses : de quoi fouiller.' : 'Quelques affaires à fouiller.') : 'Pas grand-chose à prendre.');
        var txt = 'Par la serrure… ' + parts.join(' ');
        if (C.Explore && C.Explore.active) { C.Explore.say(s, txt, 5); C.Explore.ev('peek', { guards: gs.length, npcs: npcs.length }); }
        return null;
      }
    },

    clear: {
      work: true, label: 'Déblaie', sound: 'dig', fatigue: 4.5,
      dur: function (s, o) { return o.work * (G().count('pelle') > 0 ? 0.5 : 1); },
      done: function (s, o) {
        G().removeObject(o);
        if (G().count('pelle') > 0) G().wear('pelle', 1, s);
        // En exploration, ce qu'on trouve reste en tas : on choisit ce qu'on met dans le sac
        if (C.Explore && C.Explore.active) { leavePile(s, o); return first(s) + ' a déblayé les gravats' + (o.block ? ' — le passage est libre !' : '.'); }
        G().addItems(o.loot || {});
        return first(s) + ' a déblayé les gravats' + (o.block ? ' — le passage est libre !' : '.') + ' Trouvé : ' + itemsText(o.loot || {}) + '.';
      }
    },

    // Lettre, journal, carnet trouvés dans un lieu : on les lit
    readnote: {
      label: 'Lit', inPlace: false, fatigue: 0,
      dur: function () { return 4; },
      done: function (s, o) {
        var first0 = !o.read;
        o.read = true;
        if (C.UI && C.UI.dialog) C.UI.dialog(o.title || G().objName(o), '<p class="dialog-text note-text">' + C.util.esc(o.text || '').replace(/\n/g, '<br>') + '</p>', [{ label: 'Refermer' }]);
        if (first0) {
          if (C.Explore && C.Explore.active) C.Explore.ev('note', { title: o.title || G().objName(o), line: o.journal });
          // Ce qu'on y apprend : une combinaison, une clé cachée…
          (o.opens || []).forEach(function (key) {
            var t = G().st.objects.filter(function (x) { return x.key === key; })[0];
            if (!t) return;
            if (t.kind === 'door') t.open = true; else t.locked = false;
            C.Nav.computeRegions(); G().markDirty();
          });
          if (o.say && C.Explore && C.Explore.active) C.Explore.say(s, o.say, 5);
          if (o.bio && C.Surv.bio) C.Surv.bio(s, o.bio);
        }
        return null;
      }
    },

    // Trappe de la cave : mène à l'abri souterrain (js/game/cellar.js)
    pry: {
      work: true, label: 'Force la trappe', sound: 'search', fatigue: 4,
      dur: function () { return G().count('pied_de_biche') > 0 ? 30 : 90; },
      done: function (s, o) { G().markDirty(); if (G().count('pied_de_biche') > 0) G().wear('pied_de_biche', 1, s); return C.Cellar.open(G().st, s, o); }
    },

    cut: {
      work: true, label: 'Scie la grille', sound: 'saw', fatigue: 4,
      check: function () { if (G().count('scie') < 1) return 'Il faut une scie à métaux.'; },
      dur: function () { return 90; },
      done: function (s, o) { G().removeObject(o); var br = G().wear('scie', 1, s); return first(s) + ' a découpé la grille. Une nouvelle pièce est accessible.' + (br ? ' La lame de la scie a cédé.' : ''); }
    },

    dismantle: {
      work: true, label: 'Démonte', sound: 'saw', fatigue: 4,
      dur: function (s, o, p) { return (p && p.scrap ? p.scrap.work : o.work) * (G().count('hachette') > 0 ? 0.6 : 1); },
      done: function (s, o, p) {
        G().removeObject(o);
        if (G().count('hachette') > 0) G().wear('hachette', 1, s);
        // Contenant vide du refuge : recyclé en matériaux, la place est libre
        if (p && p.scrap) {
          G().addItems(p.scrap.loot);
          G().markDirty();
          return first(s) + ' a démonté : ' + G().objName(o).toLowerCase() + ' (' + itemsText(p.scrap.loot) + '). La place est libre.';
        }
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
      cost: function (s, o, p) { return C.craftCost(findCraft(p.rid), s); },
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
      labelFn: function (s, o) { return o && o.kind === 'gunbench' ? 'Travaille à l\'atelier' : o && o.kind === 'herbshop' ? 'Prépare des remèdes' : 'Cuisine'; },
      cost: function (s, o, p) { return mult(findStation(o.kind, p.rid).cost, p.n); },
      dur: function (s, o, p) { return findStation(o.kind, p.rid).time * (p.n || 1); },
      done: function (s, o, p) {
        var r = findStation(o.kind, p.rid);
        var give = mult(r.give, p.n);
        if (o.kind === 'stove') {
          if (o.level >= 2) give.repas += 1;
          if (G().hasTrait(s, 'cuisinier')) give.repas += 1;
        }
        if (r.maintain) {
          var fixed = Object.keys(G().st.flags.wear || {}).filter(function (k) { return G().st.flags.wear[k] > 0 && G().count(k) > 0; });
          G().st.flags.wear = {};
          return first(s) + ' a remis les outils en état' + (fixed.length ? ' (' + fixed.map(function (k) { return C.ITEMS[k].name.toLowerCase(); }).join(', ') + ')' : '') + '.';
        }
        G().addItems(give);
        return first(s) + (o.kind === 'gunbench' ? ' a fabriqué : ' : ' a préparé : ') + itemsText(give) + '.';
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
    // Guitare : celui qui joue se détend, et tous ceux qui sont au refuge
    // (éveillés) en profitent un peu — comme dans le jeu d'origine
    guitar: {
      excl: true, loop: true, label: 'Joue de la guitare', fatigue: 0.4,
      dur: function () { return 0; },
      tick: function (s, o, p, gm) {
        var h = gm / 60;
        if (s.restToday < 16) { var d = 2.4 * h * (G().hasTrait(s, 'empathique') ? 1.3 : 1); s.moral = Math.min(100, s.moral + d); s.restToday += d; }
        G().present().forEach(function (b) {
          if (b === s || !b.alive || b.away) return;
          var sl = b.act && b.act.phase === 'work' && (b.act.kind === 'sleep' || b.act.kind === 'sleepfloor');
          if (sl || (b.listenToday || 0) >= 8) return;
          var k = 1.3 * h;
          b.moral = Math.min(100, b.moral + k); b.listenToday = (b.listenToday || 0) + k;
        });
        if (s.restToday >= 16 && G().present().every(function (b) { return b === s || (b.listenToday || 0) >= 8; })) return true;
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
      label2: function (s, o, p) { var b = G().surv(p.sid); return (p.mode === 'comfort' ? 'réconforte ' : p.mode === 'read' ? 'lit à ' : 'avec ') + (b ? first(b) : '…'); },
      check: function (s, o, p) {
        var b = G().surv(p.sid);
        if (!b || !b.alive || b.away || b === s) return 'Personne à qui parler.';
        if (b.act && b.act.phase === 'work' && (b.act.kind === 'sleep' || b.act.kind === 'sleepfloor')) return first(b) + ' dort.';
        if (b.act && (b.act.kind === 'talk' || b.act.kind === 'listen' || b.act.kind === 'care') && !(b.act.p && b.act.p.sid === s.id)) return first(b) + ' est déjà en pleine conversation.';
        if (p.mode === 'read') {
          if (G().count('livres') < 1) return 'Il n\'y a aucun livre dans la réserve.';
          if (b.readToDay === st().day) return 'On a déjà fait la lecture à ' + first(b) + ' aujourd\'hui.';
          if (b.moral >= 70) return first(b) + ' n\'en a pas besoin pour l\'instant.';
        } else if (p.mode === 'comfort') {
          if (s.moral < 35) return first(s) + ' est trop mal pour réconforter qui que ce soit.';
          if (b.comfortedToday) return first(b) + ' a déjà été réconforté(e) aujourd\'hui.';
          if (b.moral >= 60) return first(b) + ' n\'a pas besoin d\'être réconforté(e).';
        } else if (s.talkedToday && s.talkedToday[b.id]) return first(s) + ' et ' + first(b) + ' ont déjà discuté aujourd\'hui.';
      },
      dur: function (s, o, p) { return p.mode === 'read' ? 60 : p.mode === 'comfort' ? 45 : 30; },
      begin: function (s, o, p) {
        var b = G().surv(p.sid);
        Actions.cancel(b, true); b.path = [];
        b.act = { kind: 'listen', uid: null, p: { sid: s.id }, prog: 0, dur: 0, phase: 'work' };
        s.facing = b.x >= s.x ? 1 : -1; b.facing = -s.facing;
        C.Mood.sayKey(s, p.mode === 'comfort' ? 'comfort_open' : p.mode === 'read' ? 'read_open' : 'talk_open');
      },
      done: function (s, o, p) {
        var b = G().surv(p.sid);
        if (!b || !b.alive) return null;
        var n1 = first(s), n2 = first(b);
        if (p.mode === 'read') {
          // Lire à voix haute : une histoire pour oublier un moment (le livre n'est pas usé)
          var rg = 12 + (G().hasTrait(b, 'lecteur') ? 6 : 0) + (G().hasTrait(s, 'lecteur') ? 3 : 0) + (b.moral < 25 ? 4 : 0);
          if (G().hasTrait(b, 'cynique')) rg *= 0.75;
          b.moral = Math.min(100, b.moral + rg);
          b.readToDay = st().day; b.brokenDays = 0;
          s.moral = Math.min(100, s.moral + (G().hasTrait(s, 'lecteur') ? 5 : 3));
          C.Mood.think(b, 'readto', { n: n1 });
          C.Mood.sayKey(b, 'read_reply');
          return n1 + ' a lu à voix haute pour ' + n2 + '. Pendant une heure, la guerre était ailleurs.';
        }
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

    // ---- les morts
    bury: {
      work: true, label: 'Enterre', fatigue: 6, sound: 'search',
      dur: function (s) { return G().count('pelle') > 0 ? 90 : 160; },
      done: function (s, o) {
        var n = (o.name || '').split(' ')[0], fe = o.female ? 'e' : '';
        G().removeObject(o);
        G().spawnObject({ kind: 'memorial', sid: o.sid, name: o.name, female: o.female, day: st().day, f: o.f, x: o.x, w: 34, h: 44 });
        G().alive().forEach(function (b) {
          if (b.away) return;
          b.moral = Math.min(100, b.moral + 4);
          C.Mood.think(b, 'buried', { n: n });
          C.Surv.bio(b, 'Nous avons enterré ' + n + ' dans la cour, sous le vieux tilleul. ' + (b === s ? 'C\'est moi qui ai creusé.' : 'Personne n\'a su quoi dire.'));
        });
        if (G().count('pelle') > 0 && C.Game.wear) C.Game.wear('pelle', 2, s);
        return first(s) + ' a enterré ' + n + ' dans la cour. Le refuge respire un peu mieux.';
      }
    },
    mourn: {
      excl: true, label: 'Se recueille', fatigue: -1,
      check: function (s, o) { if (s.mournDay === st().day) return first(s) + ' s\'est déjà recueilli' + (s.look && s.look.female ? 'e' : '') + ' aujourd\'hui.'; },
      dur: function () { return 20; },
      done: function (s, o) {
        var n = (o.name || '').split(' ')[0];
        s.mournDay = st().day;
        var gain = s.grief > 0 ? 9 : 5;
        s.moral = Math.min(100, s.moral + gain);
        if (s.grief > 0) s.grief = Math.max(0, s.grief - 1);
        C.Mood.think(s, 'mourn', { n: n });
        return first(s) + ' s\'est recueilli' + (s.look && s.look.female ? 'e' : '') + ' un moment devant la photo de ' + n + '.';
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
    // Occupation d'un survivant désœuvré (automatique) : assis par terre,
    // adossé au mur… Un ordre du joueur l'interrompt aussitôt.
    idle: {
      inPlace: true, loop: true, fatigue: -1.5,
      label: function (s, o, p) { return p && p.pose === 'lean' ? 'Adossé(e) au mur' : 'Assis(e) par terre'; },
      dur: function () { return 0; },
      tick: function (s, o, p, gm) { p.left = (p.left == null ? 40 : p.left) - gm; if (p.left <= 0) return true; }
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

  // Recette fabriquée en plusieurs lots
  function mult(c, n) { var o = {}; for (var k in c) o[k] = c[k] * (n || 1); return o; }
  function missingOf(cost) { var o = {}; for (var k in cost) if (G().count(k) < cost[k]) o[k] = cost[k] - G().count(k); return o; }
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
  var Actions = C.Actions = { findCraft: findCraft, findStation: findStation, growNeed: growNeed, collectable: collectable, searchTime: searchTime };

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
    if (C.Surv.thriving(s)) e *= 1.15;
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
    if (C.Audio.ready && !p.auto) C.Audio.sfx.click();
    return true;
  };

  // Place à côté d'un autre survivant
  function targetSpot(s, b) {
    if (!b) return null;
    var f = b.f, bx = b.x;
    if (b.path.length && Math.abs(b.y - C.FLOORS[b.f].y) > 1) { f = b.path[0].f; bx = b.path[0].x; }
    var lying = b.act && b.act.phase === 'work' && (b.act.kind === 'sleep' || b.act.kind === 'sleepfloor');
    var side = (s.f === f && s.x < bx) ? -1 : 1;
    return { f: f, x: C.Nav.clampX(f, bx + side * (lying ? 46 : 42)) };
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
    if (def.labelFn) return def.labelFn(s, G().obj(a.uid), a.p);
    if (def.label2) return def.label + ' : ' + def.label2(s, G().obj(a.uid), a.p);
    return typeof def.label === 'function' ? def.label(s, G().obj(a.uid), a.p) : def.label;
  };

  // ---------------------------------------------------------------- oisiveté
  // Comme dans le jeu d'origine, un survivant désœuvré ne reste pas planté :
  // épuisé, il va dormir (un lit libre, sinon par terre) ; fatigué ou abattu,
  // il s'installe dans le fauteuil ; sinon il s'assoit par terre, s'adosse
  // au mur ou fait quelques pas. Un ordre du joueur passe toujours avant.
  function freeStation(kind) {
    return st().objects.filter(function (o) {
      if (o.kind !== kind || o.broken) return false;
      if (!o.user) return true;
      var u = G().surv(o.user);
      return !u || !u.alive || !u.act || u.act.uid !== o.uid;
    })[0] || null;
  }
  // ---------------------------------------------------------------- oisiveté
  // Quand personne ne leur dit quoi faire, les survivants s'occupent comme dans
  // le jeu d'origine. Dans l'ordre : le sommeil qui les rattrape, le manque
  // (cigarette, café), puis le moral (lire, se reposer), puis l'envie (lecture,
  // radio, guitare, discuter avec un autre), sinon quelques pas ou un coin de mur.
  var IDLE_SAY = {
    smoke: ['Une cigarette. Enfin.', 'Juste une, pour tenir.', 'Ça calme les nerfs.', 'Je n\'en pouvais plus.'],
    coffee: ['Un café… ça fait du bien.', 'Sans mon café, je ne suis rien.', 'Chaud, noir, amer. Parfait.'],
    read: ['Un chapitre, pour penser à autre chose.', 'Je relis ce livre pour la dixième fois.', 'Ça, au moins, ça ne change pas.'],
    music: ['Un peu de musique…', 'Ça couvre le bruit des obus.'],
    guitar: ['Je vais jouer un peu.', 'Écoutez, ça vous fera du bien.']
  };
  function pickOf(l) { return l[Math.floor(Math.random() * l.length)]; }

  Actions.autoIdle = function (s) {
    if (!s.alive || s.away || s.act || s.path.length) return;
    var G0 = G(), d = st().day;
    // Peut-il faire ça sans avertissement (auto : jamais de message d'erreur) ?
    function can(kind, o, p) {
      var def = ACT[kind];
      return !Actions.refusal(s, def) && !(def.check && def.check(s, o, p || {}));
    }
    function go(kind, o, p, say) {
      p = p || {}; p.auto = true;
      if (!can(kind, o, p)) return false;
      if (!Actions.start(s, o, kind, p)) return false;
      if (say && IDLE_SAY[say] && Math.random() < 0.7) C.Mood.say(s, pickOf(IDLE_SAY[say]), 3.5);
      return true;
    }
    // 1. Épuisé : il dort
    if (s.fatigue >= 75) {
      var bed = freeStation('bed');
      if (bed) { Actions.start(s, bed, 'sleep', { auto: true }); return; }
      Actions.start(s, null, 'sleepfloor', { auto: true });
      return;
    }
    // 2. Le manque : le fumeur et l'accro au café se servent (seulement dans ce cas)
    if (G0.hasTrait(s, 'fumeur') && d - s.lastSmoke >= 1 && G0.count('cigarettes') > 0 && go('smoke', null, {}, 'smoke')) return;
    if (G0.hasTrait(s, 'cafeinomane') && d - s.lastCoffee >= 1 && G0.count('cafe') > 0 && go('coffee', null, {}, 'coffee')) return;
    var chair = freeStation('armchair'), books = G0.count('livres') > 0 && (s.readToday || 0) < 2;
    // 3. Moral bas ou fatigue : le fauteuil, avec un livre si possible
    if (s.moral < 45 || s.fatigue >= 45) {
      if (chair) {
        if (s.moral < 60 && books && Math.random() < 0.6 && go('read', chair, {}, 'read')) return;
        if (go('rest', chair, {})) return;
      }
    }
    // 4. L'envie : tirage pondéré parmi ce qui est possible
    var others = G0.present().filter(function (b) { return b !== s && b.alive && !b.away && !b.act && !b.path.length; });
    var cands = [];
    if (chair && books) cands.push([G0.hasTrait(s, 'lecteur') ? 5 : s.moral < 70 ? 2 : 0.7, function () { return go('read', chair, {}, 'read'); }]);
    var radio = freeStation('radio');
    if (radio && s.moral < 80) cands.push([1.5, function () { return go('music', radio, {}, 'music'); }]);
    var guitar = freeStation('guitar');
    if (guitar && s.moral >= 40 && others.length) cands.push([G0.hasTrait(s, 'empathique') ? 2.5 : 1, function () { return go('guitar', guitar, {}, 'guitar'); }]);
    others.forEach(function (b) {
      var comfort = b.moral < 55 && s.moral >= 50 && !b.comfortedToday;
      var w = comfort ? (G0.hasTrait(s, 'empathique') ? 5 : 2.5) : 1.2;
      cands.push([w, function () { return go('talk', null, { sid: b.id, mode: comfort ? 'comfort' : 'talk' }); }]);
    });
    // Un tirage : ce qui ne s'est pas déclenché laisse la place au repos ordinaire
    var tot = 0; cands.forEach(function (c) { tot += c[0]; });
    if (tot > 0 && Math.random() < Math.min(0.85, 0.3 + tot * 0.12)) {
      var r = Math.random() * tot;
      for (var i = 0; i < cands.length; i++) { r -= cands[i][0]; if (r <= 0) { if (cands[i][1]()) return; break; } }
    }
    // 5. Sinon : quelques pas, ou un coin de mur
    var r2 = Math.random();
    if (r2 < 0.3) {
      for (var i2 = 0; i2 < 6; i2++) {
        var x = C.Nav.clampX(s.f, s.x + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 160));
        if (C.Nav.clear(s.f, s.x, x)) {
          var pth = C.Nav.findPath({ f: s.f, x: s.x }, { f: s.f, x: x });
          if (pth) { s.path = pth; s.act = { kind: 'move', uid: null, p: { auto: true }, prog: 0, dur: 0, phase: 'walk' }; return; }
        }
      }
    }
    Actions.start(s, null, 'idle', { auto: true, pose: r2 < 0.65 ? 'floor' : 'lean', left: 25 + Math.random() * 35 });
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
      m.entries.push(E('Rentrer au refuge', 'en courant', null, function () { C.Explore.goHome(); }));
      return m;
    }
    var d = C.NPCS[o.npc], ns = C.Explore.npcState(o), angry = G().st.locations[C.Explore.loc].angry;
    m.title = d.name;
    m.desc = d.title + (angry ? ' — vous a vu voler.' : ns.helped ? ' — vous êtes venu en aide.' : '');
    if (!d.silent) m.entries.push(E('Parler', '', null, go('npc', { what: 'talk' })));
    if (d.need && !ns.helped) {
      var pay = C.Explore.needPay(d.need), all = [d.need.items].concat(d.need.alts || []);
      m.entries.push(E(d.need.label, C.itemsText(pay || d.need.items) + (d.need.alts && !pay ? ' (ou ' + d.need.alts.map(C.itemsText).join(', ') + ')' : ''), pay ? null : 'Il faut : ' + all.map(C.itemsText).join(' ou ') + ' (dans le sac)', go('npc', { what: 'help' }), Object.keys(pay || d.need.items)[0]));
    }
    if (d.trade) m.entries.push(E('Échanger', angry ? 'refuse' : 'troc', angry ? 'Il ne veut plus traiter avec vous.' : null, go('npc', { what: 'trade' })));
    if (d.donate) {
      var dOpts = [d.donate.items].concat(d.donate.alt ? [d.donate.alt] : [], d.donate.alts || []);
      var shelled = !!(G().st.locations[C.Explore.loc] || {}).shelled && d.donate.alts;
      var can = dOpts.some(function (o2) { return G().has(o2); });
      m.entries.push(E(d.donate.label, dOpts.slice(0, 2).map(C.itemsText).join(' ou ') + (dOpts.length > 2 ? '…' : '') + (shelled ? ' · <span class="ok">surtout des médicaments</span>' : ''), can ? null : 'Rien à donner dans le sac', go('npc', { what: 'donate' }), Object.keys(d.donate.items)[0]));
    }
    // Braquage (arme en main, mode combat)
    if (C.Explore.canRob(o)) {
      var held = C.Combat.weapon(), armed = held && held !== 'poings';
      var why = !armed ? 'Il faut une arme en main' : C.Explore.mode !== 'combat' ? 'Passez en mode combat (touche C)' : null;
      m.entries.push(E('Menacer avec une arme', '<span class="ko">très mauvais pour le moral</span>', why, function () {
        C.UI.dialog('Braquer ' + U.esc(d.name) + ' ?', '<p class="dialog-text">' + U.esc(d.name) + ' ne vous a rien fait. Sous la menace, il vous donnera ce qu\'il a — et le groupe apprendra ce que vous avez fait.</p>', [
          { label: 'Renoncer', cls: 'ghost' },
          { label: 'Le menacer', run: go('npc', { what: 'rob' }) }
        ]);
      }, armed ? held : null));
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
        var scrap = scrapOf(o);
        if (scrap && (o.searched || !lootLeft(o)) && !o.locked) {
          // Au refuge, un contenant vide ne sert qu'à prendre de la place
          var empty = !lootLeft(o);
          if (empty) m.desc = 'Il n\'y a plus rien. Démonté, il laissera de la place pour construire.';
          else { m.desc = 'Il reste des choses à l\'intérieur.'; m.entries.push(E('Ouvrir', costSub(null, searchTime(o)), null, go('search'))); }
          m.entries.push(E('Démonter' + (hach ? ' (hachette)' : ''), costSub(null, scrap.work * (hach ? 0.6 : 1)) + ' · +' + itemsText(scrap.loot), empty ? null : 'Il faut d\'abord le vider', go('dismantle', { scrap: scrap })));
          break;
        }
        if (o.searched) {
          if (!lootLeft(o)) { m.desc = 'Il n\'y a plus rien.'; break; }
          m.desc = 'Il reste des choses à l\'intérieur.';
          m.entries.push(E('Ouvrir', costSub(null, searchTime(o)), null, go('search')));
          break;
        }
        if (o.locked) {
          m.desc = (o.tools || []).length ? 'Verrouillé. Il faut le forcer ou le crocheter.' : (o.lockedNote || 'Impossible à ouvrir pour l\'instant.');
          (o.tools || []).forEach(function (t) {
            m.entries.push(E('Ouvrir : ' + C.ITEMS[t].name.toLowerCase(), costSub(null, t === 'passe_partout' ? 45 : 30), G().count(t) ? null : 'Il faut : ' + C.ITEMS[t].name, go('unlock', { tool: t })));
          });
        } else if (o.owner && C.Explore && C.Explore.active && C.OWNERS[o.owner] && C.OWNERS[o.owner].military) {
          // Matériel de l'armée : le risque, c'est d'être vu
          var od = C.OWNERS[o.owner];
          var watcher = C.Combat.guards().filter(function (g) { return !g.dead && g.attitude !== 'hostile' && C.Combat.sees(g, s); })[0];
          m.desc = od.desc;
          m.entries.push(E('Fouiller', watcher ? '<span class="ko">un soldat vous regarde</span>' : costSub(null, searchTime(o)) + ' · à l\'abri des regards', null, watcher ? function () {
            C.UI.dialog('Sous ses yeux ?', '<p class="dialog-text">' + U.esc(od.warn) + '</p>', [
              { label: 'Attendre', cls: 'ghost' },
              { label: 'Fouiller quand même', run: go('search') }
            ]);
          } : go('search')));
        } else if (o.owner && C.Explore && C.Explore.active) {
          // Les affaires des habitants : regarder n'est pas voler ; c'est prendre qui l'est
          var ow = C.OWNERS[o.owner] || {};
          var watcher2 = C.Explore.npcWitness(s);
          m.desc = (ow.desc || 'Ce n\'est pas à vous. Les gens qui vivent ici en ont besoin.') + ' Y prendre quelque chose, c\'est voler.';
          m.entries.push(E('Fouiller', costSub(null, searchTime(o)) + (watcher2 ? ' · <span class="ko">' + U.esc(C.NPCS[watcher2.npc].name) + ' vous regarde</span>' : ' · personne ne vous voit'), null, go('search')));
        } else {
          m.desc = 'On peut le fouiller.';
          m.entries.push(E('Fouiller', costSub(null, searchTime(o)), null, go('search')));
        }
        break;
      case 'door':
        if (o.open) { m.desc = 'La porte est ouverte.'; break; }
        m.desc = o.peeked ? 'Une porte fermée à clé. Vous avez vu ce qu\'il y a derrière.' : 'Une porte fermée à clé. Qu\'y a-t-il derrière ?';
        if (C.Explore && C.Explore.active && !o.peeked) m.entries.push(E('Regarder par la serrure', costSub(null, 3) + ' · silencieux', null, go('peek')));
        (o.tools || []).forEach(function (t) {
          m.entries.push(E('Ouvrir : ' + C.ITEMS[t].name.toLowerCase(), costSub(null, t === 'passe_partout' ? 45 : 30), G().count(t) ? null : 'Il faut : ' + C.ITEMS[t].name, go('unlock', { tool: t })));
        });
        break;
      case 'corpse':
        var cd = st().day - (o.since || st().day);
        m.desc = 'Le corps de ' + (o.name || '').split(' ')[0] + ', sous un drap. ' + (cd >= 2 ? 'L\'odeur devient insupportable : tout le monde en souffre.' : cd >= 1 ? 'Personne n\'ose le regarder. Il faut l\'enterrer.' : 'Il faudra l\'enterrer, tant que c\'est encore possible.');
        m.entries.push(E('Enterrer' + (pelle ? ' (pelle)' : ''), costSub(null, pelle ? 90 : 160) + ' · fatigant', null, go('bury')));
        break;
      case 'memorial':
        m.desc = 'Une photo, une bougie, quelques mots écrits à la main. ' + (o.name || '').split(' ')[0] + ' repose dans la cour.';
        m.entries.push(E('Se recueillir', costSub(null, 20) + ' · moral', s && s.mournDay === st().day ? 'Déjà fait aujourd\'hui' : null, go('mourn')));
        break;
      case 'note':
        m.desc = o.read ? 'Déjà lu.' : (o.hint || 'Quelques lignes, écrites à la main.');
        m.entries.push(E(o.read ? 'Relire' : 'Lire', costSub(null, 4), null, go('readnote')));
        break;
      case 'trapdoor':
        if (o.open) { m.desc = 'La trappe ouverte. Un escalier de pierre descend vers l\'abri.'; break; }
        m.desc = 'Une trappe dans le sol de la cave, fermée par un cadenas rouillé. Un courant d\'air froid monte entre les planches.';
        m.entries.push(E(G().count('pied_de_biche') ? 'Forcer la trappe (pied-de-biche)' : 'Forcer la trappe (à la barre de fer)', costSub(null, G().count('pied_de_biche') ? 30 : 90), null, go('pry')));
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
      case 'guitar':
        m.entries.push(E('Jouer de la guitare', 'moral de tout le refuge', null, go('guitar')));
        break;
      case 'radio':
        m.entries.push(E('Écouter les informations', costSub(null, 30), null, go('news')));
        m.entries.push(E('Écouter de la musique', 'moral', null, go('music')));
        break;
      case 'gunbench':
        C.STATION_RECIPES.gunbench.forEach(function (r) {
          var worn = r.maintain ? Object.keys(C.WEAR_MAX).filter(function (k) { return G().count(k) > 0 && G().wearLeft(k) < 1; }) : null;
          m.entries.push(E(r.name + (r.batch ? '…' : ''), r.batch ? 'par ' + r.unit + ' : ' + costSub(r.cost, r.time) : costSub(r.cost, r.time) + (worn ? ' · ' + (worn.length ? worn.length + ' outil' + (worn.length > 1 ? 's' : '') + ' usé' + (worn.length > 1 ? 's' : '') : 'rien d\'usé') : ''),
            worn && !worn.length ? 'Tous les outils sont en bon état' : (G().has(r.cost) ? null : 'Il manque : ' + itemsText(missingOf(r.cost))),
            r.batch ? function () { C.UI.openBatch(s, o, r); } : go('cook', { rid: r.id })));
        });
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
    if (b.moral < 70) add('Lire à voix haute pour ' + first(b), '++ moral pour ' + first(b) + ' · 1 h · il faut un livre (' + G().count('livres') + ')', 'talk', { sid: b.id, mode: 'read', item: 'livres' });
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
