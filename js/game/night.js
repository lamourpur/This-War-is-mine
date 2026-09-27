/* =========================================================
   La nuit : affectations (dormir / garder / piller),
   résolution du pillage, des raids, et passage à l'aube
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }
  function first(s) { return s.name.split(' ')[0]; }

  var Night = C.Night = {};

  Night.begin = function () {
    var st = G().st;
    if (st.phase !== 'day') return;
    st.phase = 'night';
    st.survivors.forEach(function (s) { if (s.alive) { C.Actions.cancel(s); s.path = []; } });
    if (st.visitor) { st.visitor = null; if (C.UI) C.UI.refreshDoor(); }
    st.visitorPlan = null;
    var back = [];
    st.survivors.forEach(function (s) {
      if (s.alive && s.away) {
        s.x = 240; s.f = 1; s.y = C.FLOORS[1].y;
        var where = { voisin: 'de chez le voisin', colis: 'avec un colis humanitaire', decombres: 'de l\'immeuble effondré', enfant: 'du centre de réfugiés', pain: 'de la distribution' }[s.away] || '';
        if (s.awayRisk && C.R.chance(s.awayRisk)) {
          s.wound = Math.min(95, s.wound + C.R.int(15, 30));
          back.push(first(s) + ' est rentré(e) blessé(e) : dehors, les rues ne pardonnent pas.');
        }
        if (s.awayReward && Object.keys(s.awayReward).length) { G().addItems(s.awayReward); back.push(first(s) + ' est rentré(e) ' + where + ' avec : ' + itemsText(s.awayReward) + '.'); }
        else back.push(first(s) + ' est rentré(e) ' + where + ', les mains vides mais le cœur un peu moins lourd.');
        s.awayRisk = 0;
        s.away = null;
        s.awayReward = null;
        s.fatigue = Math.min(100, s.fatigue + 20);
      }
    });
    back.forEach(function (t) { G().log(t, 'good'); });
    st.nightNotes = back;
    if (C.UI) { C.UI.buildCards(); C.UI.openNight(); }
  };

  function itemsText(items) {
    return C.itemsText(items);
  }
  Night.itemsText = itemsText;

  function weaponScore(id) {
    var it = C.ITEMS[id];
    return it && it.weapon ? it.weapon : 0;
  }

  // Estimation de la défense (affichée dans l'écran de nuit)
  Night.defense = function (st, guards, reservedItems) {
    var d = 0;
    var avail = {};
    for (var k in st.inventory) avail[k] = st.inventory[k] - ((reservedItems && reservedItems[k]) || 0);
    var weapons = ['fusil', 'pistolet', 'hachette', 'couteau'].filter(function (w) { return avail[w] > 0; });
    var ammo = avail.munitions || 0;
    var pool = [];
    weapons.forEach(function (w) { for (var i = 0; i < avail[w]; i++) pool.push(w); });
    var armed = [];
    guards.forEach(function (g) {
      var v = 1;
      if (G().hasTrait(g, 'combattant')) v += 1.2;
      if (g.wound >= 60 || g.fatigue >= 90) v *= 0.5;
      var w = null;
      for (var i = 0; i < pool.length; i++) {
        var it = C.ITEMS[pool[i]];
        if (it.ammo && ammo <= 0) continue;
        w = pool.splice(i, 1)[0]; break;
      }
      if (w) { v += weaponScore(w); if (C.ITEMS[w].ammo) ammo--; }
      armed.push({ s: g, w: w });
      d += v;
    });
    st.objects.forEach(function (o) {
      if (o.kind === 'hole') d += o.boarded ? 0.35 : -0.3;
      if (o.kind === 'frontdoor') d += o.level * 1.3;
    });
    return { value: Math.max(0, d), armed: armed };
  };

  Night.raidChance = function (st) {
    if (st.day < 3) return 0;
    var holes = st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
    var c = 0.1 + st.day * 0.006 + holes * 0.03 + (st.raidBonus || 0);
    if (C.World.crimeHigh(st)) c += 0.2;
    if (C.World.isWinter(st)) c += 0.05;
    return U.clamp(c, 0, 0.85);
  };

  // plan = { roles: {id: 'sleep'|'guard'|'scav'}, scav: {loc, stance, prio, equip:[ids]} }
  Night.resolve = function (plan) {
    var st = G().st, R = C.R;
    var rep = [];            // { t, k, sec }
    function add(sec, t, k) { rep.push({ sec: sec, t: t, k: k || 'info' }); }
    (st.nightNotes || []).forEach(function (t) { add('people', t, 'good'); });
    st.nightNotes = null;

    var present = G().present();
    var sleepers = present.filter(function (s) { return plan.roles[s.id] === 'sleep'; });
    var guards = present.filter(function (s) { return plan.roles[s.id] === 'guard'; });
    var scav = present.filter(function (s) { return plan.roles[s.id] === 'scav'; })[0] || null;

    // ---------------- Températures de la nuit
    var nightOut = st.weather.out - 3;
    var holes = st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
    var heat = 0, burned = 0;
    st.objects.forEach(function (o) {
      if (o.kind === 'heater' && o.fuel > 0) {
        var frac = Math.min(1, o.fuel / 600);
        heat = Math.max(heat, [0, 12, 17, 22][o.level] * frac);
        o.fuel = Math.max(0, o.fuel - 600);
        burned++;
      }
    });
    var nightTemp = Math.round(nightOut + 6 - holes * 1.8 + heat);
    st.nightTemp = nightTemp;

    // ---------------- Sommeil
    var beds = G().countBuilt('bed');
    sleepers.sort(function (a, b) { return b.fatigue - a.fatigue; });
    sleepers.forEach(function (s, i) {
      var inBed = i < beds;
      s.fatigue = inBed ? 0 : Math.max(0, s.fatigue - 55);
      C.Surv.feedHunger(s, 8, 10);
      if (s.wound > 0 && s.hunger < 70) s.wound = Math.max(0, s.wound - (s.bandaged > 0 ? 6 : 2) * (inBed ? 1.5 : 1));
      if (s.bandaged > 0) s.bandaged = Math.max(0, s.bandaged - 10);
      coldNight(s, nightTemp, inBed ? 0.6 : 1);
      if (!inBed && beds < sleepers.length) s.moral = Math.max(0, s.moral - 1.5);
    });
    if (sleepers.length > beds && sleepers.length) {
      var floorSl = sleepers.slice(beds).map(first);
      add('home', (floorSl.length > 1 ? floorSl.join(', ') + ' ont' : floorSl[0] + ' a') + ' dormi par terre et récupéré' + (floorSl.length > 1 ? '' : '') + ' moins bien.', 'info');
    }

    guards.forEach(function (s) {
      s.fatigue = Math.min(100, s.fatigue + 25);
      C.Surv.feedHunger(s, 10, 10);
      coldNight(s, nightTemp, 1);
    });

    // ---------------- Pillage
    var reserved = {};
    if (scav && plan.scav) {
      (plan.scav.equip || []).forEach(function (id) { reserved[id] = (reserved[id] || 0) + 1; });
      if (plan.scav.ammo) reserved.munitions = plan.scav.ammo;
    }
    if (!scav && plan.scav && plan.scav.explored && plan.scav.explored.dead) {
      // Le pilleur n'est pas revenu de l'exploration
      var dz = plan.scav.explored.exp && G().surv(plan.scav.explored.exp.sid), dfe = dz && dz.look && dz.look.female ? 'e' : '';
      plan.scav.explored.notes.forEach(function (nt) { add('scav', nt.t.replace(/\(e\)/g, dfe), nt.k); });
      st.pendingExp = plan.scav.explored.exp;
      st.lastScavLoc = plan.scav.loc;
      reserved = {};
    } else if (scav && plan.scav && plan.scav.loc && plan.scav.explored) {
      // Exploration jouée : le sac revient tel quel (l'équipement est déjà parti avec)
      // La fiche d'expédition (carnet, butin) est montrée dans le rapport ; ici, les conséquences
      var ex = plan.scav.explored;
      var xfe = scav.look && scav.look.female ? 'e' : '';
      ex.notes.forEach(function (nt) { add('scav', nt.t.replace(/\(e\)/g, xfe), nt.k); });
      st.pendingExp = ex.exp;
      var gotN = ex.exp ? ex.exp.gainedN : 0;
      if (gotN >= 6) { C.Mood.think(scav, 'scav_good'); scav.moral = Math.min(100, scav.moral + 2); }
      st.lastScavLoc = plan.scav.loc;
      scav.fatigue = Math.min(100, scav.fatigue + 35);
      C.Surv.feedHunger(scav, 12, 10);
      coldNight(scav, nightOut, 0.7);
      G().addItems(ex.items, true);
      reserved = {};
    } else if (scav && plan.scav && plan.scav.loc) {
      G().removeItems(reserved);
      var w0 = scav.wound, from = rep.length, fe = scav.look && scav.look.female ? 'e' : '';
      var res = scavenge(st, scav, plan.scav, add, R);
      // Pillage raconté : même fiche, récit à la troisième personne
      var told = rep.splice(from, rep.length - from);
      var nGot = 0; for (var rk in res.returnItems) nGot += res.returnItems[rk];
      st.pendingExp = {
        abstract: true, sid: scav.id, loc: plan.scav.loc, reason: scav.alive ? 'exit' : 'dead',
        gained: res.returnItems, gainedN: nGot, wound: Math.round(Math.max(0, scav.wound - w0)),
        story: told.filter(function (l) { return !/est parti\(e\) vers|est rentré\(e\) avec/.test(l.t); }).map(function (l) { return { t: l.t.replace(/\(e\)/g, fe), k: l.k === 'death' ? 'dead' : l.k === 'bad' ? 'bad' : l.k === 'good' ? 'good' : '' }; })
      };
      st.pendingExp.story.unshift({ t: first(scav) + ' est parti' + fe + ' à la tombée de la nuit. Direction : ' + C.locationDef(plan.scav.loc).name + '.' });
      if (scav.alive) st.pendingExp.story.push({ t: 'Rentré' + fe + ' avant l\'aube' + (nGot ? ', avec ' + nGot + ' objet' + (nGot > 1 ? 's' : '') + ' dans le sac.' : ', les mains vides.'), k: 'end' });
      st.lastScavLoc = plan.scav.loc;
      scav.fatigue = Math.min(100, scav.fatigue + 35);
      C.Surv.feedHunger(scav, 12, 10);
      coldNight(scav, nightOut, 0.7);
      if (scav.alive) G().addItems(res.returnItems, true);
      reserved = {};
    }

    // ---------------- Raid sur le refuge
    var chance = Night.raidChance(st);
    if (R.chance(chance)) {
      st.stats.raids++;
      var strength = R.range(1, 2.4 + st.day / 11) + (C.World.crimeHigh(st) ? 1 : 0);
      var def = Night.defense(st, guards, reserved);
      if (def.value >= strength) {
        st.stats.raidsRepelled++;
        var shots = def.armed.filter(function (a) { return a.w && C.ITEMS[a.w].ammo; });
        if (shots.length) G().removeItems({ munitions: Math.min(G().count('munitions'), shots.length * R.int(1, 2)) });
        add('home', 'Des pillards ont tenté d\'entrer cette nuit. ' + (guards.length ? guards.map(first).join(' et ') + (guards.length > 1 ? ' les ont' : ' les a') + ' repoussés.' : 'Les barricades ont tenu.'), 'good');
        guards.forEach(function (g) {
          g.moral = Math.min(100, g.moral + 3); C.Mood.think(g, 'repelled');
          if (R.chance(0.25)) { g.wound = Math.min(100, g.wound + R.int(8, 20)); add('home', first(g) + ' a été légèrement blessé(e) dans l\'affrontement.', 'bad'); }
        });
      } else {
        var frac = U.clamp((strength - def.value) / strength, 0.15, 0.6);
        var stolen = {};
        Object.keys(st.inventory).forEach(function (k) {
          if (R.chance(0.6)) {
            var n = Math.floor(st.inventory[k] * frac * R.range(0.6, 1.2));
            if (n > 0) stolen[k] = Math.min(n, st.inventory[k]);
          }
        });
        G().removeItems(stolen);
        add('home', 'Le refuge a été pillé pendant la nuit ! Volé : ' + itemsText(stolen) + '.', 'bad');
        var victims = guards.length ? guards : (R.chance(0.5) ? [R.pick(sleepers.length ? sleepers : present)] : []);
        victims.forEach(function (v) {
          if (!v || !v.alive) return;
          v.wound = Math.min(100, v.wound + R.int(guards.length ? 20 : 12, guards.length ? 48 : 32));
          add('home', first(v) + ' a été blessé(e) pendant l\'attaque.', 'bad');
          if (v.wound >= 100) C.Surv.kill(v, 'raid');
        });
        G().moralAll(-6, { key: 'raided' });
      }
    } else if (guards.length) {
      add('home', 'La nuit a été calme. ' + guards.map(first).join(' et ') + ' n\'' + (guards.length > 1 ? 'ont' : 'a') + ' rien vu passer.', 'info');
    }

    // ---------------- Divers
    if (burned) add('home', heat > 0 ? 'Le chauffage a tenu une partie de la nuit (' + nightTemp + ' °C dans le refuge).' : '', 'info');
    if (nightTemp < 5) add('home', 'Il a fait très froid cette nuit dans le refuge (' + nightTemp + ' °C).', 'bad');
    var nightRain = st.weather.type === 'pluie' && R.chance(0.6);

    Night.dawn(rep, nightRain);
  };

  function coldNight(s, temp, k) {
    if (temp < 8) {
      var add = (8 - temp) * 0.025 * 10 * k;
      if (G().hasTrait(s, 'endurant')) add *= 0.6;
      s.sick = Math.min(100, s.sick + add);
    } else if (s.sick > 0 && temp >= 10 && s.hunger < 45) s.sick = Math.max(0, s.sick - 3);
  }

  // ------------------------------------------------------------ pillage
  function scavenge(st, s, sp, add, R) {
    var def = C.locationDef(sp.loc), loc = st.locations[sp.loc];
    var n = first(s);
    var eq = sp.equip || [];
    var ammo = sp.ammo || 0;
    var carry = {};
    eq.forEach(function (id) { carry[id] = (carry[id] || 0) + 1; });
    if (ammo) carry.munitions = ammo;

    loc.visits++;
    st.stats.scavenged++;
    add('scav', n + ' est parti(e) vers : ' + def.name + '.', 'info');

    var stanceMult = { discret: 0.55, normal: 1, agressif: 1.35 }[sp.stance];
    var explore = (G().hasTrait(s, 'rapide') ? 1.3 : 1) * ({ discret: 0.8, normal: 1, agressif: 1.15 }[sp.stance]);
    if (s.fatigue >= 80) explore *= 0.75;
    if (s.wound >= 60) explore *= 0.7;
    var capacity = 12 + (G().hasTrait(s, 'grand_sac') ? 7 : 0);
    var used = 0;
    eq.forEach(function (id) { used += C.ITEMS[id].w; });
    capacity = Math.max(4, capacity - Math.floor(used / 2));

    // Pool de butin
    var pool = [];
    function pushPool(obj, src) { for (var k in obj) if (obj[k] > 0) pool.push({ id: k, n: obj[k], src: src }); }
    pushPool(loc.loot, 'loot');
    var tool = def.stash && !loc.stashTaken ? def.stash.tool.filter(function (t) { return eq.indexOf(t) >= 0; })[0] : null;
    if (tool) {
      pushPool(def.stash.loot, 'stash');
      add('scav', 'Avec ' + (tool === 'scie' ? 'la scie' : tool === 'pied_de_biche' ? 'le pied-de-biche' : 'le passe-partout') + ', ' + n + ' a ouvert une réserve verrouillée.', 'good');
    } else if (def.stash && !loc.stashTaken && loc.visits === 1) {
      add('scav', n + ' a repéré une réserve verrouillée (outil nécessaire : ' + def.stash.tool.map(function (t) { return C.ITEMS[t].name.toLowerCase(); }).join(' ou ') + ').', 'info');
    }
    var stealing = sp.stance === 'agressif' && loc.residentsLoot && !loc.residentsGone && def.residents === 'civils';
    if (stealing) pushPool(loc.residentsLoot, 'res');

    var prio = null;
    C.LOOT_PRIORITIES.forEach(function (p) { if (p[0] === sp.prio) prio = p[2]; });
    var budget = Math.round(14 * explore);
    var got = {}, stolenAny = false;
    var gotW = 0;
    var guard = 0;
    while (budget > 0 && pool.length && guard++ < 400) {
      var entries = pool.map(function (e, i) {
        var it = C.ITEMS[e.id];
        var w = (prio && prio.indexOf(e.id) >= 0 ? 5 : 1) * (0.6 + it.v / 18);
        if (gotW + it.w > capacity) w = 0;
        return [i, w];
      });
      var idx = R.weighted(entries);
      if (idx == null) break;
      var e = pool[idx], it2 = C.ITEMS[e.id];
      e.n--; gotW += it2.w; budget--;
      got[e.id] = (got[e.id] || 0) + 1;
      if (e.src === 'loot') loc.loot[e.id]--;
      else if (e.src === 'res') { loc.residentsLoot[e.id]--; stolenAny = true; }
      else if (e.src === 'stash') { loc.stashTaken = true; }
      if (e.n <= 0) pool.splice(idx, 1);
    }
    // La réserve verrouillée est considérée vidée si on l'a ouverte
    if (tool) loc.stashTaken = true;

    // Vol aux civils
    if (stolenAny) {
      st.stats.stole++;
      if (def.moral === 'vieux_couple') {
        add('scav', 'Le vieil homme a supplié. Sa femme pleurait. ' + n + ' a tout pris quand même.', 'bad');
        G().moralAll(-16, { bad: true, key: 'stole_old' });
        loc.residentsGone = true;
        st.flags.horvat = st.day + 3;
      } else {
        add('scav', n + ' a volé des gens qui vivaient là. Ils n\'ont rien pu faire.', 'bad');
        G().moralAll(-9, { bad: true, key: 'stole' });
      }
    }

    // Rencontre hostile
    var hostile = def.residents === 'bandits' || def.residents === 'militaires' || def.danger >= 3;
    var encounterChance = def.danger * 0.17 * stanceMult;
    if (stealing && def.residents === 'civils') encounterChance += 0.15;
    var died = false;
    if (R.chance(encounterChance)) {
      var weapon = null, wscore = 0;
      eq.forEach(function (id) {
        var it = C.ITEMS[id];
        if (!it.weapon) return;
        var sc = it.ammo && ammo <= 0 ? 0.5 : it.weapon;
        if (sc > wscore) { wscore = sc; weapon = id; }
      });
      var power = 1 + wscore + (G().hasTrait(s, 'combattant') ? 1.5 : 0) + (eq.indexOf('gilet') >= 0 ? 0.5 : 0);
      if (s.wound >= 60) power *= 0.6;
      var enemy = def.danger * 1.2 + R.range(0, 2) + (def.residents === 'militaires' ? 1 : 0);
      if (!hostile) enemy *= 0.6;
      var firearm = weapon && C.ITEMS[weapon].ammo && ammo > 0;
      if (firearm) { var used2 = Math.min(carry.munitions, R.int(1, 3)); carry.munitions -= used2; }
      var who = def.residents === 'militaires' ? 'des soldats' : def.residents === 'bandits' ? 'des bandits armés' : def.danger >= 3 ? 'le tireur embusqué' : 'des habitants furieux';
      if (power >= enemy) {
        add('scav', n + ' est tombé(e) sur ' + who + ' et s\'en est sorti(e)' + (weapon ? ' grâce à : ' + C.ITEMS[weapon].name.toLowerCase() + '.' : '.'), 'good');
        if (R.chance(0.35)) { var w1 = R.int(5, 15); s.wound = Math.min(100, s.wound + w1); add('scav', n + ' a été légèrement blessé(e).', 'bad'); }
        if (firearm && hostile && R.chance(0.5)) {
          st.stats.killed++;
          add('scav', n + ' a dû tuer quelqu\'un. Ça ne s\'efface pas.', 'bad');
          s.moral = Math.max(0, s.moral - (G().hasTrait(s, 'cynique') ? 4 : 12));
          C.Mood.think(s, 'killed_self');
          var bonus = { munitions: R.int(1, 4), conserve: R.int(0, 1) };
          for (var b in bonus) if (bonus[b]) got[b] = (got[b] || 0) + bonus[b];
        }
      } else {
        var wound = R.int(25, 55) * (eq.indexOf('gilet') >= 0 ? 0.5 : 1);
        s.wound = Math.min(100, s.wound + wound);
        add('scav', n + ' a été surpris(e) par ' + who + ' et a été ' + (wound > 40 ? 'gravement ' : '') + 'blessé(e) en fuyant.', 'bad');
        for (var k in got) got[k] = Math.floor(got[k] / 2);
        add('scav', 'Dans la fuite, ' + n + ' a abandonné une partie du butin.', 'bad');
        if (s.wound >= 100) died = true;
      }
    }

    if (died) {
      add('scav', n + ' n\'est pas revenu(e).', 'death');
      C.Surv.kill(s, 'pillage');
      return { returnItems: {} };
    }

    for (var id in got) if (!got[id]) delete got[id];
    var gotN = 0; for (id in got) gotN += got[id];
    if (s.wound >= 30) C.Mood.think(s, 'scav_bad');
    else if (gotN >= 6) { C.Mood.think(s, 'scav_good'); s.moral = Math.min(100, s.moral + 2); }
    add('scav', n + ' est rentré(e) avec : ' + itemsText(got) + '.', Object.keys(got).length ? 'good' : 'info');
    var ret = {};
    for (id in got) ret[id] = got[id];
    for (id in carry) if (carry[id] > 0) ret[id] = (ret[id] || 0) + carry[id];
    return { returnItems: ret };
  }

  // ------------------------------------------------------------ aube
  Night.dawn = function (rep, nightRain) {
    var st = G().st;
    function add(sec, t, k) { rep.push({ sec: sec, t: t, k: k || 'info' }); }
    var prevDay = st.day;
    st.day++;
    st.minute = C.World.DAY_START;
    st.raidBonus = 0;
    st.phase = 'day';

    var wasWinter = C.World.isWinter(Object.assign({}, st, { day: prevDay }));
    C.World.rollWeather(st);
    if (C.World.isWinter(st) && !wasWinter) { add('home', 'L\'hiver est arrivé. Le gel s\'installe sur la ville. Il va falloir chauffer le refuge.', 'bad'); G().alive().forEach(function (s) { C.Mood.think(s, 'winter'); }); }
    if (!C.World.isWinter(st) && wasWinter) add('home', 'Le redoux est là. Le pire du froid est passé.', 'good');
    if (st.day === st.crimeStart) add('home', 'Les rumeurs le disent : les bandes de pillards se multiplient dans le quartier.', 'bad');
    if (st.flags.horvat && st.day >= st.flags.horvat) {
      add('people', 'On raconte que le vieux couple Whitaker a été retrouvé mort dans sa maison. Ils n\'avaient plus rien.', 'bad');
      G().moralAll(-8, { bad: true, key: 'horvat' });
      st.flags.horvat = 0;
    }
    // Conséquences différées d'un vol pendant une exploration
    if (st.flags.later && st.flags.later.length) {
      st.flags.later = st.flags.later.filter(function (lt) {
        if (st.day < lt.day) return true;
        add('people', lt.text, 'bad');
        G().moralAll(lt.moral, { bad: true, key: lt.key });
        return false;
      });
    }

    // D'autres gens abandonnent des choses : les lieux déjà visités se regarnissent un peu
    C.LOCATIONS.forEach(function (l) {
      var ls = st.locations[l.id];
      if (!ls || !ls.visits || !C.R.chance(0.18)) return;
      var id = C.R.pick(['bois', 'composants', 'eau', 'legumes', 'conserve', 'livres', 'herbes', 'bois', 'composants']);
      ls.loot[id] = (ls.loot[id] || 0) + C.R.int(1, 3);
    });

    var tmp = [];
    C.World.dawnStations(st, tmp, nightRain);
    tmp.forEach(function (r) { add('home', r.t, r.k); });

    var people = [];
    st.survivors.forEach(function (s) {
      if (!s.alive) return;
      C.Surv.checkDeath(s, true);
      C.Surv.daily(s, st, people);
    });
    C.Mood.dawn(st, people);
    people.forEach(function (r) { add('people', r.t, r.k); });

    // Remise en place des survivants au rez-de-chaussée si nécessaire
    G().present().forEach(function (s, i) {
      s.path = []; s.act = null;
      if (!C.Nav.isReachable(s.f, s.x)) { s.f = 1; s.x = 600 + i * 60; }
      s.y = C.FLOORS[s.f].y;
    });

    C.World.planVisitor(st);
    C.World.planDayEvents(st);
    st.lastReport = { day: st.day, items: rep, loc: st.lastScavLoc || null, expedition: st.pendingExp || null };
    st.pendingExp = null;
    st.lastScavLoc = null;

    var alive = G().alive();
    if (!alive.length) { st.phase = 'over'; st.outcome = 'defeat'; }
    else if (st.day >= st.ceasefireDay) { st.phase = 'over'; st.outcome = 'victory'; }

    G().markDirty();
    if (st.phase === 'day') C.Save.write(0, st);
    if (C.UI) C.UI.openReport(st.lastReport);
  };
})(window.CQR);
