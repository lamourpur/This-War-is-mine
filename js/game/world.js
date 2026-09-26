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

  // Température intérieure : extérieur + isolation − trous + chauffage
  World.shelterTemp = function (st) {
    var holes = st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
    return Math.round(st.weather.out + 6 - holes * 1.8 + World.heaterOutput(st));
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
    if (st.visitorPlan && !st.visitor && st.minute >= st.visitorPlan.at) {
      var v = C.VISITORS[st.visitorPlan.id];
      st.visitor = { id: st.visitorPlan.id, until: st.minute + 120, data: st.visitorPlan.data };
      st.visitorPlan = null;
      if (C.Audio.ready) C.Audio.sfx.knock();
      G().toast('On frappe à la porte d\'entrée !', 'alert');
      G().log('Quelqu\'un a frappé à la porte.', 'info');
      if (C.UI) C.UI.refreshDoor();
    }
    if (st.visitor && !st.visitor.talking && st.minute > st.visitor.until) {
      st.visitor = null;
      G().toast('Personne n\'a ouvert. Le visiteur est reparti.', 'info');
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

  World.planVisitor = function (st) {
    var R = C.R;
    st.visitorPlan = null;
    if (st.day < 2 || !R.chance(0.55)) return;
    var entries = [];
    for (var id in C.VISITORS) {
      var v = C.VISITORS[id];
      if (st.day < v.minDay) continue;
      if (v.canAppear && !v.canAppear(st)) continue;
      entries.push([id, v.weight]);
    }
    var pick = R.weighted(entries);
    if (!pick) return;
    var def = C.VISITORS[pick];
    st.visitorPlan = { id: pick, at: R.int(8 * 60, 16 * 60), data: def.init ? def.init(st, R) : {} };
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
        if (used[id] || st.day < (d.minDay || 1)) continue;
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
    st.objects.forEach(function (o) {
      if (o.kind === 'rattrap' && !o.catch && C.R.chance(0.5)) {
        o.catch = 1;
        report.push({ t: 'Un rat s\'est fait prendre dans le piège.', k: 'good' });
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
    if (toC > 0 && toC <= 2) pool.push('Les bandes armées se multiplient en ville. La police conseille de barricader les logements.');
    if (World.crimeHigh(st)) pool.push('Vague de pillages dans les quartiers ouest. Plusieurs abris attaqués cette semaine.');
    if (st.ceasefireDay - st.day <= 5) pool.push('Des pourparlers de cessez-le-feu auraient débuté. Rien n\'est encore signé.');
    if (!pool.length || R.chance(0.25)) pool.push(R.pick(C.NEWS_FILLER));
    return pool[0];
  };
})(window.CQR);
