/* =========================================================
   Monde : horloge, météo, températures, stations, visiteurs
   1 seconde réelle = 1 minute de jeu (vitesse x1)
   Journée jouable : 6 h → 20 h, puis la nuit
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }

  var DAY_START = 6 * 60, DAY_END = 20 * 60;

  var World = C.World = { DAY_START: DAY_START, DAY_END: DAY_END };

  World.isWinter = function (st) { return st.day >= st.winterStart && st.day < st.winterStart + st.winterLen; };
  World.daysToWinter = function (st) { return st.winterStart - st.day; };
  World.crimeHigh = function (st) { return st.day >= st.crimeStart && st.day < st.crimeStart + 6; };
  World.now = function (st) { return st.day * 1440 + st.minute; };

  // « Curb on Crime » : après la vague de criminalité, deux jours sans aucune attaque
  World.crimeCurb = function (st) { return st.day >= st.crimeStart + 6 && st.day < st.crimeStart + 8; };
  // Accalmie hivernale : quelques jours de plein froid sans attaque, seulement
  // signalés à la radio (les pillards restent chez eux)
  World.calmStart = function (st) {
    if (st.calmStart == null) {
      var c = st.winterStart + 2 + ((st.seed || 0) % Math.max(1, st.winterLen - 5)), end = st.winterStart + st.winterLen;
      // Pas pendant la vague de criminalité ni juste après : on décale
      if (c < st.crimeStart + 8 && c + 3 > st.crimeStart) c = st.crimeStart + 8;
      if (c + 3 > end) c = Math.max(st.winterStart + 1, Math.min(st.crimeStart - 3, end - 3));
      st.calmStart = c;
    }
    return st.calmStart;
  };
  World.winterCalm = function (st) { var c = World.calmStart(st); return st.day >= c && st.day < c + 3 && World.isWinter(st); };
  World.noRaids = function (st) { return World.winterCalm(st) || World.crimeCurb(st); };

  // Combats en ville : des zones sont bouclées quelques jours (annoncé à la radio)
  // st.flags.closures = [{ id, from, until }]
  World.closures = function (st) { return (st.flags && st.flags.closures) || []; };
  World.closed = function (st, id) { return World.closures(st).some(function (c) { return c.id === id && st.day >= c.from && st.day < c.until; }); };
  World.closedUntil = function (st, id) { var r = 0; World.closures(st).forEach(function (c) { if (c.id === id && st.day >= c.from && st.day < c.until) r = c.until; }); return r; };
  // À l'aube : annonces, réouvertures, nouvelle zone de combats
  World.dawnClosures = function (st, add) {
    var R = C.R, list = st.flags.closures = (st.flags.closures || []).filter(function (c) { return st.day <= c.until + 1; });
    list.forEach(function (c) {
      var nm = C.locationDef(c.id).name;
      if (st.day === c.from) add('home', 'Les combats ont éclaté autour de « ' + nm + ' ». La zone est bouclée pendant ' + (c.until - c.from) + ' jours.', 'bad');
      if (st.day === c.until) add('home', 'Les combats se sont éloignés de « ' + nm + ' » : on peut de nouveau s\'y rendre.', 'good');
    });
    if (st.day < 6 || list.some(function (c) { return st.day <= c.until; }) || !R.chance(0.3)) return;
    var cand = C.LOCATIONS.filter(function (l) { return l.unlock <= st.day && !World.closed(st, l.id); });
    if (cand.length < 6) return;
    var l = R.pick(cand), from = st.day + R.int(2, 4);
    list.push({ id: l.id, from: from, until: from + R.int(3, 4) });
  };

  // Météo du jour (tirée à l'aube)
  World.rollWeather = function (st) {
    var R = C.R, w = st.weather;
    if (World.isWinter(st)) {
      var mid = st.winterStart + st.winterLen / 2;
      var depth = 1 - Math.abs(st.day - mid) / (st.winterLen / 2 + 1);
      w.out = Math.round(-2 - depth * 12 + R.range(-2, 2));
      w.type = R.chance(0.55) ? 'neige' : R.chance(0.5) ? 'nuageux' : 'clair';
    } else {
      var toW = World.daysToWinter(st);
      var base = toW > 0 ? U.clamp(6 + toW * 0.9, 6, 15) : 9;
      w.out = Math.round(base + R.range(-3, 3));
      w.type = R.chance(0.35) ? 'pluie' : R.chance(0.5) ? 'nuageux' : 'clair';
    }
    if (C.Audio.ready) C.Audio.setWeather(w.type);
  };

  World.weatherLabel = function (t) {
    return { pluie: 'Pluie', neige: 'Neige', nuageux: 'Couvert', clair: 'Ciel dégagé' }[t] || t;
  };

  World.heaterOutput = function (st) {
    var out = 0;
    st.objects.forEach(function (o) {
      if (o.kind === 'heater' && o.fuel > 0 && !o.broken) out = Math.max(out, [0, 12, 17, 22][o.level]);
    });
    return out;
  };

  // Le chauffage réchauffe la pièce jusqu'à une température de confort, pas au-delà :
  // poêle 17 °C, chauffage amélioré 20 °C, chauffage complet 22 °C. `output` = ce qu'il
  // peut ajouter (12 / 17 / 22) ; s'il fait déjà chaud, il n'ajoute rien.
  World.heated = function (base, output, full) {
    if (output <= 0) return base;
    var f = full || output;
    var target = f >= 22 ? 22 : f >= 17 ? 20 : 17;
    return base + Math.min(output, Math.max(0, target - base));
  };
  // Température intérieure : extérieur + isolation − trous, puis chauffage
  World.shelterTemp = function (st) {
    var holes = st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
    return Math.round(World.heated(st.weather.out + 6 - holes * 1.8, World.heaterOutput(st)));
  };

  World.tempLabel = function (t) {
    if (t >= 15) return 'Confortable';
    if (t >= 8) return 'Frais';
    if (t >= 0) return 'Froid';
    return 'Glacial';
  };

  // Avance le monde de gm minutes (hors survivants)
  World.update = function (st, gm) {
    st.minute += gm;
    var winter = World.isWinter(st);

    st.objects.forEach(function (o) {
      if (o.kind === 'heater' && o.fuel > 0) {
        o.fuel = Math.max(0, o.fuel - gm);
        if (o.fuel === 0) { G().toast('Le chauffage s\'est éteint.', 'warn'); G().markDirty(); }
      }
      if (o.kind === 'still' && o.brewUntil && World.now(st) >= o.brewUntil) {
        o.ready = (o.ready || 0) + o.brewGive; o.brewUntil = 0;
        G().toast('La gnôle est prête à la distillerie.', 'done'); G().markDirty();
      }
      if (o.kind === 'collector' && !o.broken && (st.weather.type === 'pluie' || st.weather.type === 'neige')) {
        var cap = o.level >= 2 ? 8 : 4;
        var rate = (o.level >= 2 ? 8 : 4) / 840 * (st.weather.type === 'neige' ? 0.5 : 1);
        o.acc = (o.acc || 0) + rate * gm;
        if (o.acc >= 1) {
          var add = Math.floor(o.acc); o.acc -= add;
          var before = o.water || 0;
          o.water = Math.min(cap, before + add);
          if (o.water !== before) G().markDirty();
        }
      }
    });

    // Visiteurs
    if (!st.visitorPlan && !st.visitor && st.visitorQueue && st.visitorQueue.length) st.visitorPlan = st.visitorQueue.shift();
    if (st.visitorPlan && !st.visitor && st.minute >= st.visitorPlan.at) {
      var v = C.VISITORS[st.visitorPlan.id];
      // On attend à la porte un bon moment (4 h de jeu) avant de repartir
      st.visitor = { id: st.visitorPlan.id, until: st.minute + 240, data: st.visitorPlan.data };
      st.visitorPlan = null;
      if (C.Audio.ready) C.Audio.sfx.knock();
      G().toast('On frappe à la porte d\'entrée !', 'alert');
      G().log('Quelqu\'un a frappé à la porte.', 'info');
      if (C.UI) C.UI.refreshDoor();
    }
    if (st.visitor && !st.visitor.talking && st.minute > st.visitor.until) {
      var gone = C.VISITORS[st.visitor.id], parti = st.visitor.done;
      if (!parti && gone && gone.onMissed) gone.onMissed(st, st.visitor.data || {});
      st.visitor = null;
      if (!parti) G().toast('Personne n\'a ouvert. Le visiteur est reparti.', 'info');
      if (C.UI) C.UI.refreshDoor();
    }

    if (st.dayEvents && st.dayEvents.length && st.minute >= st.dayEvents[0].at) {
      World.fireEvent(st, st.dayEvents.shift().id);
    }

    if (st.minute >= DAY_END) {
      st.minute = DAY_END;
      C.Night.begin();
    }
  };

  // Comme dans This War of Mine : quelqu'un frappe presque chaque jour,
  // parfois deux personnes dans la même journée. Les histoires en cours et
  // Sonny passent en priorité.
  function pickRandomVisitor(st, R, not) {
    var entries = [];
    for (var id in C.VISITORS) {
      var v = C.VISITORS[id];
      if (v.story || v.scheduled || id === not) continue;
      if (st.day < v.minDay) continue;
      if (v.canAppear && !v.canAppear(st)) continue;
      entries.push([id, typeof v.weight === 'function' ? v.weight(st) : v.weight]);
    }
    var pick = R.weighted(entries);
    if (!pick) return null;
    var def = C.VISITORS[pick];
    if (def.once && C.Story) C.Story.state(st, def.once).planned = true;
    return { id: pick, data: def.init ? def.init(st, R) : {} };
  }
  World.planVisitor = function (st) {
    var R = C.R;
    st.visitorPlan = null;
    st.visitorQueue = [];
    if (st.day < 2) return;
    var first = null;
    var due = C.Story && C.Story.due(st);
    if (due) first = { id: due.step, data: due.data || {} };
    else if (C.Market && C.Market.frankoDue(st) && C.VISITORS.marchand) {
      C.Market.frankoPlanned(st);
      first = { id: 'marchand', data: C.VISITORS.marchand.init(st, R) };
    } else if (R.chance(0.85)) first = pickRandomVisitor(st, R);
    if (!first) return;
    first.at = R.int(8 * 60, 13 * 60);
    st.visitorPlan = first;
    // Une deuxième visite dans l'après-midi, de temps en temps
    if (R.chance(first.id === 'marchand' || due ? 0.35 : 0.25)) {
      var second = pickRandomVisitor(st, R, first.id);
      if (second) { second.at = Math.min(17 * 60 + 30, first.at + R.int(180, 300)); st.visitorQueue.push(second); }
    }
  };

  // Événements aléatoires de la journée (0 à 2 par jour)
  World.planDayEvents = function (st) {
    var R = C.R;
    st.dayEvents = [];
    if (st.day < 2) return;
    var n = R.chance(0.72) ? (R.chance(0.3) ? 2 : 1) : 0;
    var used = {};
    for (var i = 0; i < n; i++) {
      var entries = [];
      for (var id in C.DAY_EVENTS) {
        var d = C.DAY_EVENTS[id];
        if (!d.weight || used[id] || st.day < (d.minDay || 1)) continue;
        if (d.cond && !d.cond(st)) continue;
        entries.push([id, d.weight]);
      }
      var pick = R.weighted(entries);
      if (!pick) break;
      used[pick] = true;
      var at = R.int(7 * 60 + 30, 18 * 60);
      if (st.visitorPlan && Math.abs(st.visitorPlan.at - at) < 60) at = (at + 150) % (18 * 60) + (at + 150 >= 18 * 60 ? 8 * 60 : 0);
      st.dayEvents.push({ id: pick, at: at });
    }
    st.dayEvents.sort(function (a, b) { return a.at - b.at; });
    if (C.Uniques) C.Uniques.plan(st);
    if (C.Threat) C.Threat.plan(st);
  };

  World.fireEvent = function (st, id) {
    var def = C.DAY_EVENTS[id];
    if (!def || (def.cond && !def.cond(st))) return;
    var ctx = { st: st, s: C.DayEvents.fittest(), d: {} };
    if (def.run) {
      var res = def.run(ctx);
      if (!res) return;
      G().log(def.title + ' — ' + res.text, res.major ? 'bad' : 'info');
      if (res.major && C.UI) C.UI.eventDialog(def, res.text);
      else G().toast(res.text, 'info');
      if (C.UI) C.UI.buildCards();
      return;
    }
    if (C.UI) C.UI.openEvent(def, ctx);
  };

  // Mise à jour de l'aube : jardins, pièges, eau de pluie nocturne
  World.dawnStations = function (st, report, nightRain) {
    if (C.Cellar) C.Cellar.dawn(st, report);
    st.objects.forEach(function (o) {
      // Le piège prend un rat une nuit sur deux ; il peut en garder deux
      // avant qu'on le relève (clic sur le piège, « Relever le piège »)
      if (o.kind === 'rattrap' && (o.catch || 0) < 2 && C.R.chance(0.5)) {
        o.catch = (o.catch || 0) + 1;
        report.push({ t: o.catch > 1 ? 'Deux rats attendent dans le piège : il faut le relever.' : 'Un rat s\'est fait prendre dans le piège. Il faut aller le relever.', k: 'good' });
        if (C.Game.markDirty) C.Game.markDirty();
      }
      if ((o.kind === 'garden' || o.kind === 'herbgarden') && o.watered > 0) {
        var need = C.Actions.growNeed(o);
        if ((o.growth || 0) < need) {
          o.growth = (o.growth || 0) + 1;
          if (o.growth >= need) report.push({ t: (o.kind === 'garden' ? 'Le potager' : 'Le jardin d\'herbes') + ' est prêt à être récolté.', k: 'good' });
        }
        o.watered--;
      }
      if (o.kind === 'collector' && nightRain) {
        var cap = o.level >= 2 ? 8 : 4;
        o.water = Math.min(cap, (o.water || 0) + (o.level >= 2 ? 3 : 2));
      }
    });
  };

  // Nouvelles de la radio
  World.news = function (st) {
    var toW = World.daysToWinter(st);
    var R = C.R;
    var pool = [];
    if (toW > 0 && toW <= 3) pool.push('Météo : une vague de froid polaire approche. Les températures vont chuter sous zéro d\'ici ' + toW + ' jour' + (toW > 1 ? 's' : '') + '.');
    else if (World.isWinter(st)) {
      var left = st.winterStart + st.winterLen - st.day;
      pool.push(left <= 2 ? 'Météo : le redoux est attendu dans les prochains jours.' : 'Météo : le grand froid va durer. Protégez-vous, chauffez vos abris.');
    } else if (toW > 3) pool.push('Météo : temps de saison, ' + (st.weather.type === 'pluie' ? 'averses fréquentes.' : 'nuageux avec des éclaircies.'));
    var toC = st.crimeStart - st.day;
    if (toC > 0 && toC <= 4) pool.push('Les bandes armées se multiplient en ville. La police conseille de barricader les logements.');
    if (World.crimeHigh(st)) pool.push('Vague de pillages dans les quartiers ouest. Plusieurs abris attaqués cette semaine.');
    var toCurb = st.crimeStart + 6 - st.day;
    if (toCurb > 0 && toCurb <= 3 && World.crimeHigh(st)) pool.push('La milice annonce un renforcement des patrouilles : les bandes commencent à reculer.');
    if (World.crimeCurb(st)) pool.push('Les patrouilles ont repris le contrôle des rues. Les pillards se font discrets.');
    var toCalm = World.calmStart(st) - st.day;
    if (World.isWinter(st) && (World.winterCalm(st) || (toCalm > 0 && toCalm <= 3))) pool.push('Météo : froid mortel sur toute la ville. Les rues se vident, même les bandes armées restent à couvert.');
    World.closures(st).forEach(function (c) {
      var nm = C.locationDef(c.id).name, toF = c.from - st.day;
      if (toF > 0 && toF <= 3) pool.push('Les combats entre l\'armée et les rebelles se rapprochent de « ' + nm + ' ». La zone sera bouclée d\'ici ' + toF + ' jour' + (toF > 1 ? 's' : '') + '.');
      else if (World.closed(st, c.id)) pool.push('Échanges de tirs autour de « ' + nm + ' ». Les civils sont priés d\'éviter le secteur.');
    });
    if (C.Market && C.Market.soonText(st)) pool.push(C.Market.soonText(st));
    var toCf = st.ceasefireDay - st.day;
    if (toCf <= 7 && toCf > 5) pool.push('Les Casques bleus ont quitté la capitale : ils se dirigent vers notre région pour imposer le cessez-le-feu. Arrivée prévue d\'ici une semaine.');
    if (toCf <= 5) pool.push(toCf <= 2 ? 'Des convois de Casques bleus ont été aperçus aux portes de la ville.' : 'Des pourparlers de cessez-le-feu auraient débuté. Rien n\'est encore signé.');
    var sh = C.Market && C.Market.current(st);
    if (sh && R.chance(0.7)) pool.unshift(sh.radio + ' Au marché noir, ' + C.Market.wantedText(st) + ' atteignent des prix jamais vus.');
    if (!pool.length || R.chance(0.25)) pool.push(R.pick(C.NEWS_FILLER));
    // Une info parmi celles du moment (les annonces à venir sortent en priorité)
    return pool.length > 1 && R.chance(0.6) ? R.pick(pool) : pool[0];
  };
})(window.CQR);
