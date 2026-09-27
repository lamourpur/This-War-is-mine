/* =========================================================
   Soldats, discrétion et combat (exploration de nuit)
   Inspiré de This War of Mine :
   - les soldats patrouillent, regardent devant eux et entendent le bruit
     (fouille, pied-de-biche, course, coups de feu) : cercles de bruit ;
   - un soldat qui aperçoit le survivant devient soupçonneux (« ? »),
     puis le repère (« ! ») ;
   - neutres : ils tolèrent les civils, mais avertissent ceux qui entrent
     dans leur zone, puis tirent ; voler sous leurs yeux ou attaquer l'un
     d'eux rend tout leur groupe hostile (mémorisé pour les visites suivantes) ;
   - hostiles : tirent à vue, cherchent l'intrus là où ils l'ont vu en dernier ;
   - le survivant peut se cacher dans les recoins sombres, frapper
     (attaque furtive mortelle par-derrière avec une lame), tirer ;
   - un soldat grièvement blessé peut fuir ou se rendre : l'épargner ou
     l'achever pèse sur le moral.
   Temps : « rs » = secondes réelles × vitesse de jeu.
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }
  function E() { return C.Explore; }
  function first(s) { return s.name.split(' ')[0]; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function chance(p) { return Math.random() < p; }

  var K = C.Combat = { noises: [], shots: [] };

  // ------------------------------------------------------------ armes du survivant
  // stealth : 'kill' = attaque furtive mortelle, sinon dégâts de l'attaque furtive
  K.MELEE = {
    hachette: { name: 'hachette', tool: 'hatchet', dmg: [30, 46], time: 1.25, stealth: 'kill' },
    couteau: { name: 'couteau', tool: 'knife', dmg: [22, 34], time: 0.9, stealth: 'kill' },
    pied_de_biche: { name: 'pied-de-biche', tool: 'crowbar', dmg: [20, 30], time: 1.2, stealth: 75 },
    pelle: { name: 'pelle', tool: 'shovel', dmg: [18, 28], time: 1.4, stealth: 65 },
    poings: { name: 'poings', tool: null, dmg: [6, 12], time: 1.0, stealth: 30 }
  };
  K.GUNS = {
    fusil: { name: 'fusil', tool: 'rifle', dmg: [55, 80], acc: 0.86, range: 620, time: 1.7 },
    pistolet: { name: 'pistolet', tool: 'pistol', dmg: [34, 50], acc: 0.8, range: 500, time: 1.1 }
  };
  var REACH = 46;

  K.bestMelee = function () {
    var ids = ['hachette', 'couteau', 'pied_de_biche', 'pelle'];
    for (var i = 0; i < ids.length; i++) if (G().count(ids[i]) > 0) return ids[i];
    return 'poings';
  };
  K.bestGun = function () {
    if (G().count('munitions') <= 0) return null;
    if (G().count('fusil') > 0) return 'fusil';
    if (G().count('pistolet') > 0) return 'pistolet';
    return null;
  };

  // ------------------------------------------------------------ soldats
  K.type = function (g) { return C.GUARD_TYPES[g.type]; };
  K.guards = function () { return G().st.objects.filter(function (o) { return o.kind === 'guard'; }); };
  K.active = function () { return E() && E().active && K.guards().length > 0; };

  // Prépare un soldat posé par le plan (à l'entrée dans le lieu)
  K.init = function (g, ls) {
    var T = K.type(g);
    g.w = 44; g.h = 94;
    g.y = C.FLOORS[g.f].y;
    g.hp = g.hp != null ? g.hp : T.hp;
    g.maxHp = T.hp;
    g.ammo = T.ammo;
    g.path = []; g.anim = Math.random() * 10;
    g.home = g.x; g.homeF = g.f; g.homeFacing = g.facing || 1;
    g.facing = g.facing || 1;
    g.susp = 0; g.warned = 0; g.cool = 0; g.aimT = 0; g.idleT = rand(1, 3);
    g.state = g.sleep ? 'sleep' : 'patrol';
    g.sleep = undefined;
    if ((ls.hostile || {})[g.group]) g.attitude = 'hostile';
    g.attitudeAtStart = g.attitude;
    g.look = T.look;
    g.id = 'g' + g.uid;
  };

  function sayG(g, kind, secs) {
    var T = K.type(g), pool = T.say[kind] || C.GUARD_TYPES.soldat.say[kind];
    if (!pool) return;
    g.lastSay = g.lastSay || {};
    var now = performance.now();
    if (g.lastSay[kind] && now - g.lastSay[kind] < 3500) return;
    g.lastSay[kind] = now;
    E().say(g, U.pick ? U.pick(pool) : pool[Math.floor(Math.random() * pool.length)], secs || 3.5);
  }
  K.say = sayG;

  function onFloor(s) { return Math.abs(s.y - C.FLOORS[s.f].y) < 2; }
  function zoneAt(f, x) {
    var zs = (C.MAPS[E().loc] || {}).zones || [];
    for (var i = 0; i < zs.length; i++) if (zs[i].f === f && x >= zs[i].x0 && x <= zs[i].x1) return zs[i];
    return null;
  }
  K.zoneAt = zoneAt;
  K.zones = function () { return E() && E().active ? ((C.MAPS[E().loc] || {}).zones || []) : []; };

  K.isHidden = function (s) { return !!(s.act && s.act.kind === 'hide' && s.act.phase === 'work'); };

  // Un soldat voit-il le survivant ?
  K.sees = function (g, s) {
    if (!s || !s.alive || g.dead) return false;
    if (g.state === 'sleep' || g.state === 'surrender' || g.state === 'flee') return false;
    if (s.f !== g.f || !onFloor(s) || Math.abs(g.y - C.FLOORS[g.f].y) > 2) return false;
    var dx = s.x - g.x, dist = Math.abs(dx);
    var T = K.type(g), range = T.sight * (g.state === 'alert' || g.state === 'search' ? 1.35 : 1);
    if (dist > range) return false;
    if (K.isHidden(s)) return dist < 28 && (g.state === 'alert' || g.state === 'search');
    // Regarde devant lui ; il sent quelqu'un tout près dans son dos
    if (dx * g.facing < -30) return false;
    return C.Nav.clear(g.f, g.x, s.x);
  };

  // ------------------------------------------------------------ bruit
  // radius : portée (px) ; les étages atténuent le son
  K.noise = function (f, x, radius, src) {
    K.noises.push({ f: f, x: x, r: radius, t: 0, life: 0.9 });
    K.guards().forEach(function (g) {
      if (g.dead || g.state === 'surrender' || g.state === 'flee') return;
      var d = Math.abs(g.x - x) + Math.abs(g.f - f) * 260;
      var r = g.state === 'sleep' ? radius * 0.55 : radius;
      if (d > r) return;
      hear(g, f, x, src);
    });
  };
  function hear(g, f, x, src) {
    var loud = src === 'shot' || src === 'fight';
    if (g.state === 'sleep') { g.state = 'patrol'; sayG(g, 'suspect'); }
    if (g.state === 'alert') { if (!g.sawNow) g.last = { f: f, x: x }; return; }
    if (g.state === 'warn' || g.state === 'watch') return;
    // Coups de feu, bagarre : un hostile (ou un camarade) accourt, arme prête
    if (loud && g.attitude === 'hostile') { goAlert(g, { f: f, x: x }, true); return; }
    g.state = 'investigate'; g.last = { f: f, x: x }; g.susp = Math.max(g.susp, 0.45); g.lookT = 0;
    goTo(g, f, x);
    sayG(g, 'suspect');
  }

  // ------------------------------------------------------------ déplacements
  function goTo(g, f, x) {
    var p = C.Nav.findPath({ f: g.f, x: g.x }, { f: f, x: U.clamp(x, C.WORLD.walkMin, C.WORLD.walkMax) });
    g.path = p || [];
  }
  function move(g, gm, fast) {
    if (!g.path.length) return false;
    var T = K.type(g), step = (fast ? T.run : T.walk) * gm * (g.hp < g.maxHp * 0.4 ? 0.7 : 1);
    while (step > 0 && g.path.length) {
      var wp = g.path[0];
      var dx = wp.x - g.x, dy = wp.y - g.y, d = Math.sqrt(dx * dx + dy * dy);
      if (Math.abs(dx) > 0.5) g.facing = dx > 0 ? 1 : -1;
      if (d <= step) { g.x = wp.x; g.y = wp.y; g.f = wp.f; g.path.shift(); step -= d; }
      else { g.x += dx / d * step; g.y += dy / d * step; step = 0; }
    }
    g.anim += gm;
    return true;
  }

  // ------------------------------------------------------------ hostilité
  function goAlert(g, where, silent) {
    if (g.dead || g.state === 'surrender' || g.state === 'flee') return;
    var was = g.state;
    g.attitude = 'hostile';
    g.state = 'alert'; g.susp = 1; g.lostT = 0;
    if (where) g.last = where;
    // Le temps d'épauler : une seconde pour réagir (se cacher, fuir, tirer le premier)
    if (was !== 'alert') { g.aimT = rand(1.1, 1.6); if (!silent) sayG(g, 'attack', 3); }
  }
  // Tout le groupe devient hostile (et s'en souviendra)
  K.provoke = function (group, why, s) {
    var ls = E().home.locations[E().loc];
    ls.hostile = ls.hostile || {};
    if (!ls.hostile[group]) {
      ls.hostile[group] = true;
      E().provoked = E().provoked || {};
      E().provoked[group] = why;
      E().ev('provoked', { why: why, group: group });
      if (C.Audio.ready) C.Audio.sfx.alert();
    }
    K.guards().forEach(function (g) {
      if (g.group !== group || g.dead) return;
      var sees = s && K.sees(g, s);
      goAlert(g, s ? { f: s.f, x: s.x } : null, !sees && g.state === 'sleep');
    });
  };
  // Le survivant vole du matériel gardé : les soldats qui le voient réagissent
  K.witnessTheft = function (s, owner) {
    var seen = K.guards().filter(function (g) { return !g.dead && K.sees(g, s) && (g.susp > 0.3 || Math.abs(g.x - s.x) < 220); });
    if (!seen.length) return false;
    E().ev('caught');
    K.provoke(seen[0].group, 'theft', s);
    E().say(seen[0], 'Voleur !', 3);
    return true;
  };

  // ------------------------------------------------------------ tir et coups
  function hitSurvivor(s, dmg, from) {
    if (G().count('gilet') > 0) dmg *= 0.55;
    s.wound = Math.min(100, s.wound + dmg);
    s.hurtT = 0.35;
    E().ev('hit', { dmg: Math.round(dmg) });
    blood(s.x, s.y - 55, from && from.x < s.x ? 1 : -1);
    if (C.Render.shake) C.Render.shake(3);
    if (C.Render.pop) C.Render.pop(s, [], dmg >= 30 ? 'Gravement touché' : 'Touché', 'warn');
    if (C.Audio.ready && C.Audio.sfx.hit) C.Audio.sfx.hit();
    // Un survivant touché lâche sa cachette et arrête ce qu'il fait
    if (s.act && s.act.kind !== 'shoot' && s.act.kind !== 'attack') { C.Actions.cancel(s); }
    if (s.wound >= 100) setTimeout(function () { if (E().active) E().finish('dead'); }, 900);
  }
  function blood(x, y, dir) {
    for (var i = 0; i < 9; i++) C.Render.spawn({ x: x, y: y + rand(-8, 8), vx: dir * rand(20, 90), vy: rand(-60, 10), life: rand(0.4, 0.9), t: 0, kind: 'blood', size: rand(1.5, 3) });
  }
  function shotFx(x0, y0, x1, y1, hit) {
    K.shots.push({ x0: x0, y0: y0, x1: x1, y1: y1, t: 0, life: 0.12, hit: hit });
    if (C.Audio.ready && C.Audio.sfx.shot) C.Audio.sfx.shot();
  }
  K.shotFx = shotFx;

  function guardFire(g, s) {
    var T = K.type(g);
    var dist = Math.abs(s.x - g.x);
    var moving = s.path && s.path.length > 0;
    var cover = s.act && s.act.kind === 'hide' && s.act.phase === 'work';
    var p = T.acc * (1 - 0.5 * dist / T.range) * (moving ? (s.run ? 0.55 : 0.75) : 1) * (cover ? 0.35 : 1) * (g.hp < g.maxHp * 0.5 ? 0.75 : 1);
    g.ammo--;
    var hit = chance(p);
    shotFx(g.x + g.facing * 30, g.y - 62, s.x + (hit ? 0 : rand(-30, 30)), s.y - rand(40, 70), hit);
    K.noise(g.f, g.x, 1100, 'shot');
    g.fireT = 0.15;
    if (hit) hitSurvivor(s, rand(T.dmg[0], T.dmg[1]), g);
  }
  function guardStrike(g, s) {
    var T = K.type(g);
    g.strikeT = 0.3;
    K.noise(g.f, g.x, 260, 'fight');
    if (chance(0.6)) hitSurvivor(s, rand(10, 20) * (T.weapon ? 1 : 0.8), g);
  }

  // Blessure d'un soldat : peut fuir ou se rendre
  K.hurtGuard = function (g, dmg, s, how) {
    if (g.dead) return;
    g.hp -= dmg;
    g.hurtT = 0.35;
    blood(g.x, g.y - 55, s && s.x < g.x ? 1 : -1);
    if (C.Audio.ready && C.Audio.sfx.hit) C.Audio.sfx.hit();
    if (g.hp <= 0) { K.killGuard(g, s, how); return; }
    // Attaquer un soldat engage tout son groupe
    K.provoke(g.group, 'attack', s);
    sayG(g, 'hurt', 2);
    if (g.hp < g.maxHp * 0.3 && !g.gaveUp && chance(0.55)) {
      g.gaveUp = true;
      g.state = 'flee'; g.fleeT = rand(2.5, 4);
      var away = s && s.x < g.x ? C.WORLD.walkMax : C.WORLD.walkMin;
      goTo(g, g.f, away);
      sayG(g, 'surrender', 4);
    }
  };

  K.killGuard = function (g, s, how) {
    g.dead = true;
    var T = K.type(g);
    // Qui a commencé ? (pèse sur la conscience du survivant)
    var why = (E().provoked || {})[g.group];
    var kind;
    if (g.state === 'surrender' || how === 'execute') kind = 'surrender';
    else if (T.villain) kind = 'villain';
    else if (g.state === 'sleep') kind = 'asleep';
    else if (g.attitudeAtStart === 'hostile' || why === 'zone' || why === 'theft') kind = 'fight';
    else kind = 'unprovoked';
    E().kills.push({ type: g.type, name: T.name, kind: kind });
    E().ev('kill', { kind: kind, name: T.name });
    G().removeObject(g);
    // Le corps : on peut le fouiller (arme, munitions, affaires)
    var loot = U.copy(T.loot);
    if (T.weapon) loot[T.weapon] = 1;
    if (g.ammo > 0) loot.munitions = (loot.munitions || 0) + Math.min(g.ammo, 6);
    G().spawnObject({ key: g.key + '_corps', kind: 'cache', variant: 'corps', gtype: g.type, f: g.f, x: U.clamp(g.x, C.WORLD.walkMin + 30, C.WORLD.walkMax - 30), w: 90, h: 26, facing: g.facing, loot: loot, dead: true });
    G().markDirty();
    // Le reste du groupe apprend la mort d'un camarade (s'il l'entend ou le voit)
    if (how !== 'stealth') K.provoke(g.group, 'attack', s);
    if (s) { s.facing = g.x >= s.x ? 1 : -1; }
    // Le soldat ivre parti ou mort : la jeune femme est libre
  };

  // ------------------------------------------------------------ IA des soldats
  K.update = function (rs, gm) {
    var s = E().s;
    K.noises.forEach(function (n) { n.t += rs; });
    K.noises = K.noises.filter(function (n) { return n.t < n.life; });
    K.shots.forEach(function (n) { n.t += rs; });
    K.shots = K.shots.filter(function (n) { return n.t < n.life; });
    if (s.hurtT > 0) s.hurtT -= rs;

    // Bruit du survivant : course, travail bruyant
    s.noiseT = (s.noiseT || 0) - rs;
    if (s.noiseT <= 0) {
      s.noiseT = 0.7;
      var r = 0;
      if (s.path.length && s.run) r = 230;
      var a = s.act;
      if (a && a.phase === 'work') r = Math.max(r, K.WORK_NOISE[a.kind === 'unlock' && a.p && a.p.tool === 'passe_partout' ? 'pick' : a.kind] || 0);
      if (r) K.noise(s.f, s.x, r, 'work');
    }
    if (!s.path.length) s.run = false;
    // Caché uniquement en restant dans le recoin
    s.hidden = K.isHidden(s);
    // Un soldat passe tout près pendant qu'on se cache : on le note au carnet
    if (!s.hidden) s.hideNoted = false;
    else if (!s.hideNoted && K.guards().some(function (g) { return g.f === s.f && g.state !== 'sleep' && Math.abs(g.x - s.x) < 140; })) { s.hideNoted = true; E().ev('hide'); }

    K.guards().forEach(function (g) { think(g, s, rs, gm); });

    // Délivrée, la personne retenue vient remercier d'elle-même quand on est là
    K.thankT = (K.thankT || 0) - rs;
    if (K.thankT <= 0) {
      K.thankT = 0.5;
      G().st.objects.forEach(function (o) {
        var d = o.kind === 'npc' && C.NPCS[o.npc];
        if (!d || !d.rescued || !K.freed('brute')) return;
        var ns = E().npcState(o);
        if (ns.rescued || s.f !== o.f || Math.abs(s.x - o.x) > 260) return;
        E().talk(s, o);
      });
    }
  };

  // (les coups et les tirs font leur propre bruit, au moment où ils partent)
  K.WORK_NOISE = { search: 90, pick: 120, unlock: 320, clear: 260, dismantle: 300, cut: 360 };

  function think(g, s, rs, gm) {
    var T = K.type(g);
    if (g.hurtT > 0) g.hurtT -= rs;
    if (g.fireT > 0) g.fireT -= rs;
    if (g.strikeT > 0) g.strikeT -= rs;
    var sees = K.sees(g, s);
    g.sawNow = sees;
    var dist = Math.abs(s.x - g.x);

    switch (g.state) {
      case 'sleep':
        // Quelqu'un qui s'active juste à côté finit par le réveiller
        if (s.f === g.f && dist < 60 && !s.hidden && s.act && s.act.phase === 'work' && chance(rs * 0.15)) { g.state = 'patrol'; sayG(g, 'suspect'); }
        return;

      case 'surrender':
        g.facing = s.x >= g.x ? 1 : -1;
        return;

      case 'flee':
        move(g, gm, true);
        g.fleeT -= rs;
        if (!g.path.length || g.fleeT <= 0) { g.state = 'surrender'; g.path = []; sayG(g, 'surrender', 5); }
        return;

      case 'warn':
        g.path = [];
        g.facing = s.x >= g.x ? 1 : -1;
        var z = zoneAt(s.f, s.x);
        var inZone = z && z.group === g.group && onFloor(s);
        if (!inZone) {
          g.state = 'watch'; g.watchT = 3; g.warned++;
          E().say(g, g.warned > 1 ? 'Et que je ne vous y reprenne plus.' : 'C\'est ça. Restez de ce côté.', 3);
          return;
        }
        g.warnT -= rs;
        if (g.warnT <= 0) { K.provoke(g.group, 'zone', s); return; }
        return;

      case 'watch':
        // Suit le civil du regard, puis reprend sa ronde
        g.path = [];
        if (sees) g.facing = s.x >= g.x ? 1 : -1;
        g.watchT -= rs;
        if (checkZone(g, s, sees)) return;
        if (g.watchT <= 0) { g.state = 'patrol'; g.susp = 0; }
        return;

      case 'alert':
        combat(g, s, sees, dist, rs, gm, T);
        return;

      case 'search':
        if (sees) { goAlert(g, { f: s.f, x: s.x }); return; }
        if (!move(g, gm, false)) {
          g.lookT = (g.lookT || 0) + rs;
          if (g.lookT > 1.6) { g.lookT = 0; g.facing = -g.facing; g.searchN = (g.searchN || 0) + 1; }
          if (g.searchN > 4) { g.state = 'patrol'; g.searchN = 0; g.susp = 0.3; goTo(g, homeFloor(g), g.home); sayG(g, 'lost'); }
        }
        return;

      case 'investigate':
        if (sees) { g.susp += rs * 1.2; }
        if (g.susp >= 1) { spotted(g, s); return; }
        if (!move(g, gm, false)) {
          g.lookT = (g.lookT || 0) + rs;
          if (g.lookT > 1.4) { g.lookT = 0; g.facing = -g.facing; g.lookN = (g.lookN || 0) + 1; }
          if (g.lookN >= 3) { g.lookN = 0; g.state = 'patrol'; g.susp = 0.2; goTo(g, homeFloor(g), g.home); }
        }
        return;

      default: // patrol
        // Un neutre qui vous a déjà vu vous laisse circuler, mais garde sa zone
        if (g.known && g.attitude !== 'hostile') {
          if (checkZone(g, s, sees)) return;
          patrol(g, rs, gm);
          return;
        }
        if (sees) {
          var close = 1 - dist / T.sight;
          g.susp += rs * (0.45 + close * 1.6) * (s.run ? 1.6 : 1) * (g.attitude === 'hostile' ? 1.3 : 0.9);
          if (g.susp > 0.3 && !g.saidSus) { g.saidSus = true; sayG(g, 'suspect'); }
          if (g.susp >= 1) { spotted(g, s); return; }
          if (g.attitude === 'hostile' && g.susp > 0.5) { g.path = []; g.facing = s.x >= g.x ? 1 : -1; }
        } else { g.susp = Math.max(0, g.susp - rs * 0.12); if (!g.susp) g.saidSus = false; }
        if (g.susp > 0.5) return;   // il s'arrête et scrute
        patrol(g, rs, gm);
        return;
    }
  }

  function homeFloor(g) { return g.homeF != null ? g.homeF : g.f; }

  // Repéré : un neutre se contente de surveiller (ou avertit dans sa zone)
  function spotted(g, s) {
    g.susp = 1;
    if (g.attitude === 'hostile') { goAlert(g, { f: s.f, x: s.x }); return; }
    g.state = 'watch'; g.watchT = 3.5; g.path = []; g.known = true;
    g.facing = s.x >= g.x ? 1 : -1;
    if (!checkZone(g, s, true)) sayG(g, 'greet', 4);
  }
  function checkZone(g, s, sees) {
    if (!sees) return false;
    var z = zoneAt(s.f, s.x);
    if (!z || z.group !== g.group || !onFloor(s)) return false;
    // Deuxième fois dans la zone : plus d'avertissement
    if (g.warned >= 2) { K.provoke(g.group, 'zone', s); sayG(g, 'attack'); return true; }
    g.state = 'warn'; g.warnT = g.warned ? 3 : 5.5; g.path = [];
    E().ev('warn', { name: K.type(g).name });
    sayG(g, g.warned ? 'warn2' : 'warn', 5);
    if (C.Audio.ready) C.Audio.sfx.alert();
    return true;
  }

  function patrol(g, rs, gm) {
    if (move(g, gm, false)) return;
    g.idleT -= rs;
    if (g.patrol) {
      if (g.idleT > 0) return;
      var tgt = Math.abs(g.x - g.patrol[0]) < 20 ? g.patrol[1] : g.patrol[0];
      goTo(g, homeFloor(g), tgt);
      g.idleT = rand(2, 4.5);
      if (chance(0.15)) sayG(g, 'idle');
    } else if (g.lookBack) {
      // Sentinelle : se retourne de temps en temps
      if (g.idleT <= 0) { g.facing = -g.facing; g.idleT = g.facing === g.homeFacing ? g.lookBack : rand(2.5, 3.5); }
    } else if (Math.abs(g.x - g.home) > 4) {
      goTo(g, homeFloor(g), g.home);
    } else {
      g.facing = g.homeFacing;
    }
  }

  function combat(g, s, sees, dist, rs, gm, T) {
    if (!s.alive || s.wound >= 100) { g.path = []; return; }
    if (sees) {
      g.last = { f: s.f, x: s.x }; g.lostT = 0;
      g.facing = s.x >= g.x ? 1 : -1;
      var gun = T.weapon && g.ammo > 0;
      if (gun && dist <= T.range) {
        g.path = [];
        // Ne pas se coller à un camarade qui tire déjà : recule d'un pas
        var mate = K.guards().some(function (o) { return o !== g && !o.dead && o.f === g.f && Math.abs(o.x - g.x) < 30 && o.uid < g.uid; });
        if (mate) g.x = U.clamp(g.x + (s.x >= g.x ? -1 : 1) * T.walk * gm, C.WORLD.walkMin, C.WORLD.walkMax);
        g.aimT -= rs;
        if (g.aimT <= 0) { guardFire(g, s); g.aimT = rand(1.3, 2.2) * (T.weapon === 'fusil' ? 1.15 : 1); }
        return;
      }
      if (!gun && dist <= REACH) {
        g.path = [];
        g.aimT -= rs;
        if (g.aimT <= 0) { guardStrike(g, s); g.aimT = rand(1.1, 1.6); }
        return;
      }
      // Se rapproche
      if (!g.path.length || g.repath <= 0) { goTo(g, s.f, s.x - (s.x >= g.x ? 1 : -1) * (gun ? 0 : 36)); g.repath = 0.5; }
      g.repath -= rs;
      move(g, gm, true);
      return;
    }
    // Hors de vue : va là où il l'a vu en dernier
    g.aimT = Math.max(g.aimT, 0.5);
    if (g.last && !g.path.length && (Math.abs(g.x - g.last.x) > 12 || g.f !== g.last.f)) { goTo(g, g.last.f, g.last.x); if (!g.path.length) g.last = null; }
    if (!move(g, gm, true)) {
      g.lostT = (g.lostT || 0) + rs;
      if (g.lostT > 1.2) { g.state = 'search'; g.lookT = 0; g.searchN = 0; }
    }
  }

  // ------------------------------------------------------------ actions du survivant
  // Phase de l'élan de frappe (0 → 1) pour l'animation
  K.swingPhase = function (s) {
    var a = s.act;
    if (!a || a.kind !== 'attack' || a.phase !== 'work') return 0;
    var def = K.MELEE[a.p.weapon] || K.MELEE.poings;
    var x = U.clamp(1 - (a.cd || 0) / def.time, 0, 1);
    return x < 0.75 ? x / 0.75 * 0.25 : 0.25 + (x - 0.75) / 0.25 * 0.75;
  };

  // Le soldat est-il pris au dépourvu (attaque furtive) ?
  K.unaware = function (g, s) {
    if (g.state === 'sleep') return true;
    if (g.state === 'alert' || g.state === 'warn' || g.state === 'surrender' || g.state === 'flee') return false;
    return (s.x - g.x) * g.facing < 0 || s.wasHidden;
  };

  K.tickSurv = function (s, a, gm) {
    var g = G().obj(a.uid);
    if (!g || g.kind !== 'guard') { s.act = null; s.path = []; return; }
    var rs = gm / 1.6;
    if (a.kind === 'attack') {
      var def = K.MELEE[a.p.weapon] || K.MELEE.poings;
      var near = g.f === s.f && onFloor(s) && Math.abs(g.x - s.x) <= REACH + 4;
      if (a.phase === 'walk') {
        if (near) { a.phase = 'work'; s.path = []; a.cd = 0.3; s.wasHidden = !!a.p.fromHide; return; }
        a.repath = (a.repath || 0) - rs;
        if (!s.path.length || a.repath <= 0) {
          a.repath = 0.4;
          var side = s.f === g.f ? (s.x < g.x ? -1 : 1) : (g.facing > 0 ? -1 : 1);
          var p = C.Nav.findPath({ f: s.f, x: s.x }, { f: g.f, x: U.clamp(g.x + side * (REACH - 10), C.WORLD.walkMin, C.WORLD.walkMax) });
          if (!p) { C.Render.pop(s, [], 'Impossible de l\'atteindre', 'warn'); C.Actions.cancel(s); return; }
          if (onFloor(s) || !s.path.length) s.path = p;
        }
        return;
      }
      if (!near) { a.phase = 'walk'; return; }
      if (a.cd === undefined) a.cd = 0.3;
      s.facing = g.x >= s.x ? 1 : -1;
      a.cd -= rs;
      if (a.cd > 0) return;
      a.cd = def.time;
      s.fatigue = Math.min(100, s.fatigue + 0.6);
      // Attaque furtive : par-derrière, endormi ou depuis une cachette
      if (!a.struck && K.unaware(g, s)) {
        a.struck = true;
        if (def.stealth === 'kill') { C.Render.pop(s, [], 'Attaque furtive', null); K.hurtGuard(g, 999, s, 'stealth'); K.noise(s.f, s.x, 90, 'work'); C.Actions.cancel(s); return; }
        K.hurtGuard(g, def.stealth, s, 'stealth');
        K.noise(s.f, s.x, 90, 'work');
        if (g.dead) { C.Actions.cancel(s); return; }
        return;
      }
      a.struck = true;
      if (g.state === 'surrender') { K.hurtGuard(g, 999, s, 'execute'); C.Actions.cancel(s); return; }
      K.noise(s.f, s.x, 240, 'fight');
      var hitP = 0.72 + (G().hasTrait(s, 'combattant') ? 0.15 : 0) - (s.wound >= 60 ? 0.2 : 0) - (s.fatigue >= 80 ? 0.1 : 0);
      if (chance(hitP)) {
        var dmg = rand(def.dmg[0], def.dmg[1]) * (G().hasTrait(s, 'combattant') ? 1.25 : 1);
        K.hurtGuard(g, dmg, s, 'melee');
      } else if (C.Render.pop) C.Render.pop(s, [], 'Raté', null);
      if (g.dead || g.state === 'flee') C.Actions.cancel(s);
      return;
    }
    if (a.kind === 'shoot') {
      var gd = K.GUNS[a.p.weapon];
      s.facing = g.x >= s.x ? 1 : -1;
      var d = Math.abs(g.x - s.x);
      if (g.f !== s.f || !onFloor(s) || d > gd.range || !C.Nav.clear(s.f, s.x, g.x)) { C.Render.pop(s, [], 'Plus en ligne de mire', 'warn'); C.Actions.cancel(s); return; }
      if (a.phase === 'walk') { a.phase = 'work'; a.cd = 0.55; s.path = []; }
      a.cd -= rs;
      if (a.cd > 0) return;
      if (G().count('munitions') <= 0) { C.Render.pop(s, [], 'Plus de munitions', 'warn'); C.Actions.cancel(s); return; }
      a.cd = gd.time;
      G().removeItems({ munitions: 1 });
      var surprised = K.unaware(g, s) && !a.fired;
      a.fired = true;
      var pH = gd.acc * (1 - 0.45 * d / gd.range) * (g.path.length ? 0.8 : 1) * (G().hasTrait(s, 'combattant') ? 1.15 : 1) * (surprised ? 1.25 : 1) * (s.wound >= 60 ? 0.8 : 1);
      var hit = chance(Math.min(0.95, pH));
      shotFx(s.x + s.facing * 34, s.y - 64, g.x + (hit ? 0 : rand(-30, 30)), g.y - rand(40, 70), hit);
      K.noise(s.f, s.x, 1100, 'shot');
      if (hit) K.hurtGuard(g, rand(gd.dmg[0], gd.dmg[1]) * (surprised ? 1.3 : 1), s, g.state === 'surrender' ? 'execute' : 'shot');
      else { K.provoke(g.group, 'shot_at', s); }
      if (g.dead || g.state === 'flee' || g.state === 'surrender') C.Actions.cancel(s);
      return;
    }
  };

  // Épargner un soldat qui se rend : il s'en va
  K.spare = function (s, g) {
    sayG(g, 'spared', 4);
    E().spared.push(g.type);
    E().ev('spare', { name: K.type(g).name });
    G().removeObject(g);
    G().markDirty();
  };

  // ------------------------------------------------------------ dialogue et troc
  K.talk = function (s, g) {
    if (g.attitude === 'hostile' || g.dead) return;
    var T = K.type(g);
    g.known = true;
    g.facing = s.x >= g.x ? 1 : -1;
    s.facing = g.x >= s.x ? 1 : -1;
    var ls = E().home.locations[E().loc];
    ls.npc = ls.npc || {};
    var ns = ls.npc[g.key] = ls.npc[g.key] || {};
    var lines = T.talk || [];
    E().ev('talk', { name: T.name });
    // Parler au soldat ivre, c'est avoir vu ce qui se passe
    if (g.group === 'brute') { ls.npc.mila = ls.npc.mila || {}; ls.npc.mila.talk = (ls.npc.mila.talk || 0) + 1; }
    if (!lines.length) { E().say(g, T.say.greet[0], 4); return; }
    var ln = lines[(ns.talk || 0) % lines.length];
    ns.talk = (ns.talk || 0) + 1;
    E().say(s, ln[0], 1.7);
    setTimeout(function () { if (E().active && !g.dead && g.attitude !== 'hostile') E().say(g, ln[1], 6); }, 1700);
  };
  K.trade = function (s, g) {
    var T = K.type(g);
    if (g.attitude === 'hostile' || !T.trade) return;
    var ls = E().home.locations[E().loc];
    ls.npc = ls.npc || {};
    var ns = ls.npc[g.key] = ls.npc[g.key] || {};
    if (!ns.stock) ns.stock = U.copy(T.trade.stock);
    if (T.trade.restock && ns.lastDay != null && E().home.day - ns.lastDay >= T.trade.restock) {
      for (var k in T.trade.stock) ns.stock[k] = Math.max(ns.stock[k] || 0, T.trade.stock[k]);
    }
    ns.lastDay = E().home.day;
    g.known = true;
    E().say(g, T.trade.say, 4);
    C.TradeUI.open(s, ns.stock, null, { name: T.name, likes: T.trade.likes, bag: true });
  };

  // Menu contextuel d'un soldat
  K.menu = function (s, g, m) {
    var T = K.type(g);
    function entry(label, sub, reason, go, art) { return { label: label, sub: sub || '', enabled: !reason, reason: reason || '', go: go, art: art }; }
    function start(kind, p) { return function () { C.Actions.start(s, g, kind, p); }; }
    var st2 = {
      sleep: 'Endormi.', surrender: 'Il se rend et supplie qu\'on l\'épargne.', flee: 'Il s\'enfuit, blessé.',
      alert: 'Il vous a repéré. Il tire à vue.', search: 'Il vous cherche.', warn: 'Il vous somme de partir.',
      investigate: 'Il a entendu quelque chose.', watch: 'Il vous surveille.'
    }[g.state];
    m.title = T.name;
    m.desc = st2 || (g.attitude === 'hostile' ? 'Hostile. Il tirera s\'il vous voit.' : 'Il tolère les civils… hors de sa zone.');
    if (!s) return m;
    if (g.state === 'surrender') {
      m.entries.push(entry('L\'épargner', 'il s\'en va', null, start('spare')));
      m.entries.push(entry('L\'achever', 'très mauvais pour le moral', null, start('attack', { weapon: K.bestMelee(), tool: (K.MELEE[K.bestMelee()] || {}).tool, execute: true })));
      return m;
    }
    if (g.attitude !== 'hostile' && g.state !== 'sleep') {
      m.entries.push(entry('Parler', '', null, start('gtalk', { what: 'talk' })));
      if (T.trade) m.entries.push(entry('Échanger', 'troc', null, start('gtalk', { what: 'trade' })));
    }
    // Mode exploration : on parle, on ne frappe pas (comme dans le jeu d'origine)
    if (E().mode !== 'combat') {
      m.entries.push(entry('Attaquer', 'passez en mode combat (touche C)', 'Mode exploration : on ne peut pas attaquer.', null));
      return m;
    }
    var mw = K.bestMelee(), md = K.MELEE[mw];
    var sneaky = K.unaware(g, s) || K.isHidden(s);
    var lbl = sneaky ? 'Attaque furtive (' + md.name + ')' : 'Attaquer (' + md.name + ')';
    var sub = sneaky ? (md.stealth === 'kill' ? 'le tue sur le coup' : 'coup violent par surprise') : 'corps à corps';
    function confirmNeutral(run) {
      if (g.attitude === 'hostile') return run;
      return function () {
        C.UI.dialog('Attaquer ?', '<p class="dialog-text">' + U.esc(T.name) + ' ne vous a pas menacé. Si vous l\'attaquez, ' + (T.villain ? 'il se défendra.' : 'tous les soldats du lieu deviendront hostiles.') + '</p>', [
          { label: 'Renoncer', cls: 'ghost' },
          { label: 'Attaquer', run: run }
        ]);
      };
    }
    m.entries.push(entry(lbl, sub, null, confirmNeutral(start('attack', { weapon: mw, tool: md.tool, fromHide: K.isHidden(s) })), mw === 'poings' ? null : mw));
    var gun = K.bestGun();
    if (gun || G().count('pistolet') || G().count('fusil')) {
      var gd = K.GUNS[gun || (G().count('fusil') ? 'fusil' : 'pistolet')];
      var d = Math.abs(g.x - s.x);
      var why = !gun ? 'Plus de munitions' : g.f !== s.f ? 'Pas au même étage' : d > gd.range ? 'Trop loin' : !C.Nav.clear(s.f, s.x, g.x) ? 'Pas de ligne de mire' : null;
      m.entries.push(entry('Tirer (' + gd.name + ')', G().count('munitions') + ' munition' + (G().count('munitions') > 1 ? 's' : '') + ' · très bruyant', why, confirmNeutral(start('shoot', { weapon: gun, tool: gd.tool })), gun || 'pistolet'));
    }
    return m;
  };

  // ------------------------------------------------------------ mode combat
  // Comme dans This War of Mine : un bouton (ou la touche C) fait passer du
  // mode exploration (parler, fouiller) au mode combat (arme en main, un clic
  // sur un ennemi l'attaque directement).
  K.setMode = function (mode) {
    if (!E() || !E().active) return;
    E().mode = mode;
    var s = E().s;
    if (C.Audio.ready) C.Audio.sfx.click();
    if (s && C.Render.pop) C.Render.pop(s, [], mode === 'combat' ? 'Mode combat' : 'Mode exploration', null);
    // Un soldat neutre n'aime pas voir une arme sortie tout près de lui
    if (mode === 'combat') K.guards().forEach(function (g) {
      if (g.attitude !== 'hostile' && !g.dead && K.sees(g, s) && Math.abs(g.x - s.x) < 260) E().say(g, g.type === 'brute' ? 'Tu veux te battre ? Vas-y, essaie.' : 'Doucement. Rangez ça.', 3);
    });
    if (C.UI && C.UI.updateExploreHud) C.UI.updateExploreHud();
  };
  K.toggleMode = function () { K.setMode(E().mode === 'combat' ? 'explore' : 'combat'); };

  // Ce que ferait un clic sur ce soldat en mode combat
  K.plan = function (s, g) {
    if (g.dead) return null;
    if (g.state === 'surrender') return { kind: 'menu', label: 'Il se rend' };
    var mw = K.bestMelee(), md = K.MELEE[mw];
    var unaware = K.unaware(g, s) || K.isHidden(s);
    // Attaque furtive à la lame d'abord : silencieuse
    if (unaware && md.stealth === 'kill' && g.f === s.f) return { kind: 'attack', p: { weapon: mw, tool: md.tool, fromHide: K.isHidden(s) }, label: 'Attaque furtive (' + md.name + ')', sub: 'le tue sur le coup' };
    var gun = K.bestGun();
    if (gun) {
      var gd = K.GUNS[gun], d = Math.abs(g.x - s.x);
      if (g.f === s.f && d <= gd.range && C.Nav.clear(s.f, s.x, g.x)) {
        var pH = Math.min(0.95, gd.acc * (1 - 0.45 * d / gd.range) * (G().hasTrait(s, 'combattant') ? 1.15 : 1) * (unaware ? 1.25 : 1) * (s.wound >= 60 ? 0.8 : 1));
        return { kind: 'shoot', p: { weapon: gun, tool: gd.tool }, label: 'Tirer (' + gd.name + ')', sub: Math.round(pH * 100) + ' % · ' + G().count('munitions') + ' mun.' };
      }
    }
    return { kind: 'attack', p: { weapon: mw, tool: md.tool, fromHide: K.isHidden(s) }, label: (unaware ? 'Attaque furtive (' : 'Frapper (') + md.name + ')', sub: unaware ? 'coup par surprise' : 'corps à corps' };
  };
  K.quickAttack = function (s, g, sx, sy) {
    var pl = K.plan(s, g);
    if (!pl) return;
    if (pl.kind === 'menu') { C.UI.openContext(g, sx, sy); return; }
    C.Actions.start(s, g, pl.kind, pl.p);
  };
  // Arme tenue en mode combat (pour le dessin)
  K.readyTool = function (s) {
    if (!E() || !E().active || E().mode !== 'combat' || s !== E().s) return null;
    var gun = K.bestGun();
    if (gun) return K.GUNS[gun].tool;
    return K.MELEE[K.bestMelee()].tool || 'fists';
  };

  // Mila est libre quand le soldat ivre n'est plus là (mort, parti ou à genoux)
  K.freed = function (group) {
    return !K.guards().some(function (g) { return g.group === group && !g.dead && g.state !== 'surrender'; });
  };

  // ------------------------------------------------------------ bilan moral (au retour)
  K.consequences = function (s, notes, effects) {
    var ex = E(), n = first(s);
    ex.kills.forEach(function (k) {
      var txt, self, group, key;
      switch (k.kind) {
        case 'surrender': txt = n + ' a abattu un ' + k.name.toLowerCase() + ' qui s\'était rendu et suppliait.'; self = 22; group = -12; key = 'killed_surrender'; break;
        case 'asleep': txt = n + ' a tué un ' + k.name.toLowerCase() + ' dans son sommeil.'; self = 14; group = -6; key = 'killed_group'; break;
        case 'villain': txt = n + ' a tué le ' + k.name.toLowerCase() + ' qui s\'en prenait à une jeune femme.'; self = 5; group = 0; key = 'killed_villain'; break;
        case 'unprovoked': txt = n + ' a tué un ' + k.name.toLowerCase() + ' qui ne l\'avait pas menacé(e).'; self = 14; group = -7; key = 'killed_group'; break;
        default: txt = n + ' a tué un ' + k.name.toLowerCase() + ' pour sauver sa peau.'; self = 8; group = -2; key = 'killed_group';
      }
      notes.push({ t: txt, k: 'bad' });
      G().st.stats.killed++;
      effects.push(function () {
        s.moral = Math.max(0, s.moral - (G().hasTrait(s, 'cynique') ? self * 0.3 : self));
        C.Mood.think(s, 'killed_self');
        if (group) G().moralAll(group, { bad: true, key: key, except: s.id, vars: { n: n } });
      });
    });
    ex.spared.forEach(function (t) {
      notes.push({ t: n + ' a laissé partir un ' + C.GUARD_TYPES[t].name.toLowerCase() + ' qui s\'était rendu.', k: 'good' });
      effects.push(function () { G().moralAll(2, { good: true }); });
    });
    var pv = ex.provoked || {};
    if (pv.garnison || pv.poste) notes.push({ t: 'Les soldats savent maintenant qu\'on vient les voler. Ils tireront à vue.', k: 'bad' });
  };

  // ------------------------------------------------------------ dessin
  K.draw = function (ctx, t) {
    if (!E() || !E().active) return;
    var s = E().s;
    // Zones gardées : bande rouge au sol et panneau
    K.zones().forEach(function (z) {
      var hostile = ((E().home.locations[E().loc] || {}).hostile || {})[z.group];
      var any = K.guards().some(function (g) { return g.group === z.group && !g.dead; });
      if (!any) return;
      var fy = C.FLOORS[z.f].y, ceil = C.FLOORS[z.f].ceil, x0 = Math.max(z.x0, C.WORLD.left + 4), x1 = Math.min(z.x1, C.WORLD.right - 4);
      var inside = s.f === z.f && s.x >= z.x0 && s.x <= z.x1;
      var pulse = inside ? 0.75 + 0.25 * Math.sin(t * 6) : 1;
      // Voile rouge sur la pièce, plus marqué quand on y est
      ctx.fillStyle = 'rgba(150,40,30,' + (inside ? 0.1 : 0.05) * pulse + ')';
      ctx.fillRect(x0, ceil, x1 - x0, fy - ceil);
      // Ligne peinte au sol (tirets)
      ctx.save();
      ctx.strokeStyle = 'rgba(200,70,50,' + (inside ? 0.85 : 0.55) + ')'; ctx.lineWidth = 3;
      ctx.setLineDash([14, 9]);
      ctx.beginPath(); ctx.moveTo(x0, fy - 2); ctx.lineTo(x1, fy - 2); ctx.stroke();
      ctx.setLineDash([]);
      // Frontière : poteau et panneau à l'entrée de la zone
      var edges = [];
      if (z.x0 > C.WORLD.left + 20) edges.push({ x: x0, d: 1 });
      if (z.x1 < C.WORLD.right - 20) edges.push({ x: x1, d: -1 });
      if (!edges.length) edges.push({ x: x0 + 40, d: 1 });
      edges.forEach(function (e) {
        ctx.strokeStyle = 'rgba(200,70,50,0.7)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, fy); ctx.lineTo(e.x, fy - 70); ctx.stroke();
        var px = e.d > 0 ? e.x + 4 : e.x - 118;
        ctx.fillStyle = 'rgba(28,24,20,0.85)'; ctx.fillRect(px, fy - 96, 114, 30);
        ctx.strokeStyle = 'rgba(200,70,50,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(px, fy - 96, 114, 30);
        ctx.fillStyle = hostile ? 'rgba(200,70,50,0.95)' : 'rgba(225,200,170,0.95)';
        ctx.font = '15px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(hostile ? 'ILS TIRENT À VUE' : 'ZONE INTERDITE', px + 57, fy - 84);
        ctx.font = '10px "Special Elite", monospace'; ctx.fillStyle = 'rgba(225,200,170,0.7)';
        ctx.fillText(z.label.toUpperCase(), px + 57, fy - 71);
      });
      ctx.restore();
    });
    // Cercles de bruit
    K.noises.forEach(function (n) {
      var k = n.t / n.life, fy = C.FLOORS[n.f].y - 40;
      ctx.strokeStyle = 'rgba(235,225,200,' + (0.35 * (1 - k)) + ')';
      ctx.lineWidth = 2;
      var vr = Math.min(n.r, 320);   // rayon affiché (les tirs portent bien plus loin)
      ctx.beginPath(); ctx.ellipse(n.x, fy, Math.max(4, vr * (0.25 + 0.75 * k)), Math.max(3, Math.min(vr, 150) * 0.5 * (0.25 + 0.75 * k)), 0, 0, Math.PI * 2); ctx.stroke();
    });
    // Soldats
    K.guards().forEach(function (g) { drawGuard(ctx, g, t); });
    // Tirs : traçante et éclair
    K.shots.forEach(function (sh) {
      var a = 1 - sh.t / sh.life;
      ctx.strokeStyle = 'rgba(255,230,170,' + (0.8 * a) + ')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(sh.x0, sh.y0); ctx.lineTo(sh.x1, sh.y1); ctx.stroke();
      var fl = ctx.createRadialGradient(sh.x0, sh.y0, 1, sh.x0, sh.y0, 26);
      fl.addColorStop(0, 'rgba(255,240,190,' + a + ')'); fl.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = fl; ctx.fillRect(sh.x0 - 26, sh.y0 - 26, 52, 52);
    });
  };

  // Mode combat : ce que fera le clic, écrit à côté du curseur (au premier plan)
  K.drawCursor = function (ctx) {
    if (!E() || !E().active || E().mode !== 'combat') return;
    var hv = C.Render.hoverObj, m = C.Render.mouse;
    if (!hv || hv.kind !== 'guard' || hv.dead || !m) return;
    var pl = K.plan(E().s, hv);
    if (!pl) return;
    ctx.save();
    ctx.font = '17px "Bebas Neue", sans-serif';
    var w1 = ctx.measureText(pl.label.toUpperCase()).width;
    ctx.font = '12px "Special Elite", monospace';
    var w2 = pl.sub ? ctx.measureText(pl.sub).width : 0;
    var tw = Math.max(w1, w2) + 20, th = pl.sub ? 38 : 24;
    var x = Math.min(m.x + 18, C.WORLD.W - tw - 6), y = m.y + 16;
    ctx.fillStyle = 'rgba(20,16,13,0.92)'; ctx.fillRect(x, y, tw, th);
    ctx.strokeStyle = '#b5543f'; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, tw, th);
    ctx.fillStyle = '#efe6d0'; ctx.font = '17px "Bebas Neue", sans-serif'; ctx.fillText(pl.label.toUpperCase(), x + 10, y + 18);
    if (pl.sub) { ctx.font = '12px "Special Elite", monospace'; ctx.fillStyle = '#d9a386'; ctx.fillText(pl.sub, x + 10, y + 32); }
    ctx.restore();
  };

  function modeOf(g) {
    if (g.state === 'sleep') return 'sleep';
    if (g.state === 'surrender') return 'surrender';
    if (g.hurtT > 0) return 'hurt';
    if (g.strikeT > 0) return 'strike';
    if (g.fireT > 0) return 'fire';
    if (g.state === 'alert' && g.sawNow && !g.path.length) return 'aim';
    if (g.state === 'warn') return 'aim';
    return 'patrol';
  }

  function drawGuard(ctx, g, t) {
    var T = K.type(g), mode = modeOf(g);
    var fake = { id: g.id, look: T.look, traits: [], path: g.path, x: g.x, y: g.y, f: g.f, anim: g.anim, moral: 70, fatigue: 20, wound: g.hp < 40 ? 40 : 0, sick: 0, act: null };
    var P = C.Figure.guardPose(g, t, mode, g.state === 'surrender' ? null : T.tool);
    var hov = C.Render.hoverObj === g;
    ctx.save();
    if (hov) { ctx.shadowColor = g.attitude === 'hostile' ? 'rgba(230,90,70,0.9)' : 'rgba(255,214,150,0.9)'; ctx.shadowBlur = 14 * (C.Render.scale || 1); }
    if (mode === 'sleep') {
      C.Figure.draw(ctx, fake, g.x + 40, g.y - 42, 1, { t: t, pose: P });
      ctx.restore();
      ctx.fillStyle = 'rgba(230,222,200,0.7)'; ctx.font = '16px "Bebas Neue", sans-serif';
      var zt = (t * 0.7) % 1; ctx.globalAlpha = 1 - zt; ctx.fillText('z', g.x - 20 + zt * 6, g.y - 70 - zt * 14); ctx.globalAlpha = 1;
      return;
    }
    C.Figure.draw(ctx, fake, g.x, g.y, g.facing, { t: t, pose: P });
    ctx.restore();
    // Indicateur de vigilance : « ? » qui se remplit, « ! » quand il vous a repéré
    var H = C.Figure.height(fake), iy = g.y - H - 22;
    var ic = null, fill = 0, col = '#e9dcc0';
    if (g.state === 'alert' || g.state === 'search') { ic = '!'; fill = 1; col = '#d9533c'; }
    else if (g.state === 'warn') { ic = '!'; fill = 1; col = '#e0a340'; }
    else if (g.state === 'surrender' || g.state === 'flee') { ic = null; }
    else if (g.susp > 0.05 || g.state === 'investigate') { ic = '?'; fill = Math.max(g.susp, 0.35); col = g.attitude === 'hostile' ? '#e0a340' : '#e9dcc0'; }
    if (ic) {
      ctx.save();
      ctx.fillStyle = 'rgba(15,14,12,0.7)';
      ctx.beginPath(); ctx.arc(g.x, iy, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(g.x, iy, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '19px "Bebas Neue", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(ic, g.x, iy + 7);
      ctx.restore();
    }
    // Barre de vie une fois blessé
    if (g.hp < g.maxHp) {
      var bw = 40, pr = U.clamp(g.hp / g.maxHp, 0, 1);
      ctx.fillStyle = 'rgba(15,14,12,0.75)'; ctx.fillRect(g.x - bw / 2 - 2, iy + 16, bw + 4, 6);
      ctx.fillStyle = '#b5543f'; ctx.fillRect(g.x - bw / 2, iy + 17, bw * pr, 4);
    }
  }

  // Faisceau des lampes des soldats (couche de lumière)
  K.drawLights = function (ctx, t) {
    if (!E() || !E().active) return;
    K.guards().forEach(function (g) {
      if (g.state === 'sleep' || g.state === 'surrender') return;
      var T = K.type(g), len = T.sight * 0.8, ox = g.x + g.facing * 16, oy = g.y - 58;
      var hostile = g.state === 'alert' || g.state === 'warn';
      var gr = ctx.createLinearGradient(ox, oy, ox + g.facing * len, oy);
      gr.addColorStop(0, hostile ? 'rgba(255,150,110,0.2)' : 'rgba(255,230,180,0.16)');
      gr.addColorStop(1, 'rgba(255,220,170,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(ox, oy - 3);
      ctx.lineTo(ox + g.facing * len, oy - 50); ctx.lineTo(ox + g.facing * len, oy + 58); ctx.lineTo(ox, oy + 3);
      ctx.closePath(); ctx.fill();
    });
  };
})(window.CQR);
