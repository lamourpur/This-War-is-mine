/* =========================================================
   Besoins et état des survivants
   Échelles 0–100 :
     faim / fatigue / blessure / maladie : 0 = bien, 100 = mort (sauf fatigue)
     moral : 100 = serein, 0 = brisé
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function G() { return C.Game; }

  var Surv = C.Surv = {};

  Surv.speed = function (s) {
    var v = 95;
    if (G().hasTrait(s, 'rapide')) v *= 1.35;
    if (s.fatigue >= 80) v *= 0.8;
    if (s.wound >= 60) v *= 0.7; else if (s.wound >= 30) v *= 0.88;
    if (s.hunger >= 70) v *= 0.85;
    return v;
  };

  Surv.update = function (s, gm, env) {
    if (!s.alive || s.away) return;
    s.anim += gm;

    // --- Déplacement
    if (s.path.length) {
      var step = Surv.speed(s) * gm;
      while (step > 0 && s.path.length) {
        var wp = s.path[0];
        var dx = wp.x - s.x, dy = wp.y - s.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dx) > 0.5) s.facing = dx > 0 ? 1 : -1;
        if (d <= step) { s.x = wp.x; s.y = wp.y; s.f = wp.f; s.path.shift(); step -= d; }
        else { s.x += dx / d * step; s.y += dy / d * step; step = 0; }
      }
    }

    // --- Action
    C.Actions.tick(s, gm);

    // --- Besoins
    var h = gm / 60;
    var a = s.act, def = a ? C.ACT[a.kind] : null;
    var working = a && a.phase === 'work';
    var sleeping = working && (a.kind === 'sleep' || a.kind === 'sleepfloor');
    var inBed = working && a.kind === 'sleep';
    var cold = env.temp < 8;

    s.hunger += h * (sleeping ? 0.7 : 1.0) * (cold ? 1.2 : 1);

    var frate;
    if (working && def.fatigue != null) frate = def.fatigue;
    else if (s.path.length) frate = 1.6;
    else frate = 1.0;
    if (frate > 0) {
      if (G().hasTrait(s, 'endurant')) frate *= 0.75;
      if (s.sick >= 30) frate *= 1.25;
    }
    s.fatigue = U.clamp(s.fatigue + frate * h, 0, 100);

    // Blessures : guérison lente, meilleure si pansées et nourri
    if (s.bandaged > 0) s.bandaged = Math.max(0, s.bandaged - h);
    if (s.wound > 0) {
      if (s.hunger < 70 && s.sick < 60) s.wound = Math.max(0, s.wound - h * (s.bandaged > 0 ? 0.4 : 0.07) * (sleeping ? 1.5 : 1));
      else s.wound = Math.min(100, s.wound + h * 0.06);
    }

    // Maladie : le froid rend malade, la chaleur et la nourriture guérissent
    if (cold) {
      var k = (8 - env.temp) * 0.025;
      if (inBed) k *= 0.6;
      if (G().hasTrait(s, 'endurant')) k *= 0.6;
      s.sick = Math.min(100, s.sick + k * h);
    } else if (s.sick > 0 && env.temp >= 10 && s.hunger < 45) {
      s.sick = Math.max(0, s.sick - 0.12 * h * (sleeping ? 1.6 : 1));
    }
    if (s.hunger >= 70 && s.sick > 0) s.sick = Math.min(100, s.sick + 0.05 * h);
    if (s.fatigue >= 95) s.sick = Math.min(100, s.sick + 0.06 * h);

    // Moral : l'inconfort use, le calme répare doucement
    var dm = 0;
    if (env.temp < 5) dm -= 0.15;
    if (s.hunger >= 70) dm -= 0.25; else if (s.hunger >= 45) dm -= 0.1;
    if (s.wound >= 30 || s.sick >= 30) dm -= 0.1;
    if (dm === 0 && s.moral < 50 && s.hunger < 45) dm += 0.08;
    if (env.empath && dm > -0.05) dm += 0.03;
    s.moral = U.clamp(s.moral + dm * h, 0, 100);

    Surv.checkDeath(s);
  };

  Surv.checkDeath = function (s) {
    if (!s.alive) return;
    var cause = null;
    if (s.hunger >= 100) cause = 'faim';
    else if (s.wound >= 100) cause = 'blessures';
    else if (s.sick >= 100) cause = 'maladie';
    if (cause) Surv.kill(s, cause);
  };

  // opts.quiet : pas de fenêtre (l'événement est raconté dans le rapport du matin)
  Surv.kill = function (s, cause, opts) {
    opts = opts || {};
    if (!s.alive) return;
    C.Actions.cancel(s);
    s.alive = false;
    s.cause = cause;
    s.deathDay = G().st.day;
    s.hunger = Math.min(s.hunger, 100);
    var txt = {
      faim: s.name + ' est mort(e) de faim.',
      blessures: s.name + ' a succombé à ses blessures.',
      maladie: s.name + ' a été emporté(e) par la maladie.',
      pillage: s.name + ' n\'est jamais revenu(e) du pillage.',
      raid: s.name + ' a été tué(e) pendant l\'attaque du refuge.',
      parti: s.name + ' a quitté le refuge et n\'est jamais revenu(e).',
      suicide: s.name + ' a mis fin à ses jours.'
    }[cause] || s.name + ' est mort(e).';
    if (!opts.quiet) G().log(txt, 'death');
    var n = s.name.split(' ')[0];
    if (cause === 'parti') {
      G().moralAll(-8, { key: 'left', vars: { n: n } });
    } else {
      G().moralAll(cause === 'suicide' ? -25 : -22, { bad: true, key: cause === 'suicide' ? 'suicide' : 'death', vars: { n: n } });
      G().alive().forEach(function (o) { o.grief = 3; o.griefFor = n; });
    }
    if (C.Audio.ready) C.Audio.sfx.death();
    if (C.UI) {
      C.UI.buildCards();
      if (!opts.quiet) C.UI.deathNotice(s, txt);
    }
  };

  // --- Libellés d'état (comme les icônes de statut)
  Surv.states = function (s) {
    var out = [];
    if (s.hunger >= 70) out.push({ k: 'hunger', t: 'Affamé(e)', lv: 3 });
    else if (s.hunger >= 45) out.push({ k: 'hunger', t: 'Très faim', lv: 2 });
    else if (s.hunger >= 20) out.push({ k: 'hunger', t: 'A faim', lv: 1 });

    if (s.fatigue >= 80) out.push({ k: 'fatigue', t: 'Épuisé(e)', lv: 3 });
    else if (s.fatigue >= 55) out.push({ k: 'fatigue', t: 'Très fatigué(e)', lv: 2 });
    else if (s.fatigue >= 30) out.push({ k: 'fatigue', t: 'Fatigué(e)', lv: 1 });

    if (s.wound >= 60) out.push({ k: 'wound', t: 'Gravement blessé(e)', lv: 3 });
    else if (s.wound >= 30) out.push({ k: 'wound', t: 'Blessé(e)', lv: 2 });
    else if (s.wound > 0.5) out.push({ k: 'wound', t: 'Légèrement blessé(e)', lv: 1 });

    if (s.sick >= 60) out.push({ k: 'sick', t: 'Très malade', lv: 3 });
    else if (s.sick >= 30) out.push({ k: 'sick', t: 'Malade', lv: 2 });
    else if (s.sick > 0.5) out.push({ k: 'sick', t: 'Légèrement malade', lv: 1 });

    if (s.moral < 15) out.push({ k: 'moral', t: 'Brisé(e)', lv: 3 });
    else if (s.moral < 35) out.push({ k: 'moral', t: 'Déprimé(e)', lv: 2 });
    else if (s.moral < 55) out.push({ k: 'moral', t: 'Triste', lv: 1 });

    if (s.grief > 0) out.push({ k: 'grief', t: 'En deuil', lv: 1 });
    if (s.bandaged > 0 && s.wound > 0) out.push({ k: 'care', t: 'Pansé(e)', lv: 0 });
    return out;
  };

  Surv.moralLabel = function (s) {
    if (s.moral < 15) return 'Brisé(e)';
    if (s.moral < 35) return 'Déprimé(e)';
    if (s.moral < 55) return 'Triste';
    if (s.moral < 75) return 'Stable';
    return 'Serein(e)';
  };

  // --- Passage à un nouveau jour (appelé à l'aube)
  Surv.daily = function (s, st, report) {
    if (!s.alive) return;
    s.readToday = 0;
    s.restToday = 0;
    var n = s.name.split(' ')[0];
    if (G().hasTrait(s, 'fumeur') && st.day - s.lastSmoke >= 2) {
      s.moral = Math.max(0, s.moral - 7);
      report.push({ t: n + ' est à cran : plus une cigarette depuis des jours.', k: 'bad' });
    }
    if (G().hasTrait(s, 'cafeinomane') && st.day - s.lastCoffee >= 2) {
      s.moral = Math.max(0, s.moral - 6);
      report.push({ t: n + ' traîne des pieds sans son café.', k: 'bad' });
    }
    if (s.moral < 15) s.brokenDays++; else s.brokenDays = 0;
  };
})(window.CQR);
