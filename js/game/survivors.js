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

  // Biographie : ce que le survivant a vécu, à la première personne, jour
  // après jour (comme les fiches du jeu d'origine qui se remplissent)
  Surv.bio = function (s, t) {
    if (!s || !t) return;
    var st = G().st;
    s.story = s.story || [];
    var fe = s.look && s.look.female ? 'e' : '';
    s.story.push({ d: st ? st.day : 1, t: t.replace(/\(e\)/g, fe) });
    if (s.story.length > 40) s.story.shift();
  };

  Surv.speed = function (s) {
    var v = 95;
    if (G().hasTrait(s, 'rapide')) v *= 1.35;
    if (s.fatigue >= 80) v *= 0.8;
    if (s.wound >= 60) v *= 0.7; else if (s.wound >= 30) v *= 0.88;
    if (s.hunger >= 70) v *= 0.85;
    if (Surv.thriving(s)) v *= 1.06;
    if (G().hasTrait(s, 'lent')) v *= 0.84;
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

    Surv.feedHunger(s, h * (sleeping ? 0.7 : 1.0) * (cold ? 1.2 : 1), h);

    var frate;
    if (working && def.fatigue != null) frate = def.fatigue;
    else if (s.path.length) frate = 1.6;
    else frate = 1.0;
    if (frate > 0) {
      if (G().hasTrait(s, 'endurant')) frate *= 0.75;
      if (G().hasTrait(s, 'fragile')) frate *= 1.2;
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
      if (G().hasTrait(s, 'fragile')) k *= 1.35;
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

    // Désœuvré depuis un moment (en journée) : il s'occupe tout seul
    if (G().st.phase === 'day' && !s.act && !s.path.length && s.alive && !s.away) {
      s.idleT = (s.idleT || 0) + gm;
      if (s.idleT >= 15) { s.idleT = 0; C.Actions.autoIdle(s); }
    } else s.idleT = 0;
  };

  // Faim, comme dans This War of Mine : on ne meurt pas d'un coup en passant
  // le seuil. Arrivé au bout (100), le survivant « meurt de faim » ; la mort
  // ne tombe qu'à l'aube, et seulement s'il a passé une journée entière dans
  // cet état sans rien manger (STARVE_H heures). Il y a donc toujours au
  // moins une journée pour le nourrir, même au retour d'une expédition.
  Surv.STARVE_H = 24;
  // amount : faim ajoutée · hours : durée écoulée (compte si déjà à bout)
  Surv.feedHunger = function (s, amount, hours) {
    var was = s.hunger;
    s.hunger += amount;
    if (s.hunger >= 100) {
      s.hunger = 100;
      if (was >= 100) s.starving = (s.starving || 0) + hours;
      else {
        s.starving = 0;
        // Alerte dans la scène au moment où il bascule
        if (G().st && G().st.phase === 'day' && C.Render && C.Render.pop) C.Render.pop(s, [], 'Meurt de faim !', 'warn');
      }
    } else s.starving = 0;
  };

  // atDawn : bilan du matin (seul moment où la faim peut tuer)
  Surv.checkDeath = function (s, atDawn) {
    if (!s.alive) return;
    var cause = null;
    if (atDawn && s.hunger >= 100 && (s.starving || 0) >= Surv.STARVE_H) cause = 'faim';
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
    G().alive().forEach(function (o) {
      if (o === s) return;
      Surv.bio(o, cause === 'parti' ? n + ' est parti(e) sans se retourner. Je n\'ai pas su le(la) retenir.'.replace('le(la)', s.look && s.look.female ? 'la' : 'le') : n + ' est mort(e). ' + (cause === 'faim' ? 'De faim. Nous n\'avons pas su le(la) nourrir.' : cause === 'pillage' ? 'Il(elle) n\'est jamais revenu(e) de la nuit.' : cause === 'suicide' ? 'Personne n\'a rien vu venir.' : 'Je n\'arrive pas à y croire.').replace(/le\(la\)/g, s.look && s.look.female ? 'la' : 'le').replace(/Il\(elle\)/g, s.look && s.look.female ? 'Elle' : 'Il').replace(/\(e\)/g, s.look && s.look.female ? 'e' : ''));
    });
    if (cause === 'parti') {
      G().moralAll(-8, { key: 'left', vars: { n: n } });
    } else {
      G().moralAll(cause === 'suicide' ? -25 : -22, { bad: true, key: cause === 'suicide' ? 'suicide' : 'death', vars: { n: n } });
      G().alive().forEach(function (o) { o.grief = 3; o.griefFor = n; });
    }
    // Mort au refuge : le corps reste là tant qu'on ne l'a pas enterré
    var here = G().st;
    if (here.phase !== 'explore' && cause !== 'parti' && cause !== 'pillage' && C.FLOORS[s.f] && !C.FLOORS[s.f].hidden) {
      G().spawnObject({ kind: 'corpse', sid: s.id, name: s.name, female: !!(s.look && s.look.female), since: here.day,
        f: s.f, x: C.Nav.clampX(s.f, s.x), w: 96, h: 22 });
    }
    if (C.Audio.ready) C.Audio.sfx.death();
    if (C.UI) {
      C.UI.buildCards();
      if (!opts.quiet) C.UI.deathNotice(s, txt);
    }
  };

  // --- Libellés d'état (comme les icônes de statut)
  // Tous les besoins comblés : bien nourri, reposé, en bonne santé, le moral
  // au beau fixe. Bonus : travaille plus vite, marche un peu plus vite, et sa
  // bonne humeur remonte le moral des autres chaque matin.
  Surv.thriving = function (s) {
    return !!s && s.alive && !s.away && s.hunger < 20 && s.fatigue < 30 && s.wound <= 0.5 && s.sick <= 0.5 && s.moral >= 65 && !(s.grief > 0);
  };
  Surv.THRIVE_TIP = 'Tous ses besoins sont comblés : travaille 15 % plus vite, marche un peu plus vite, et sa bonne humeur remonte le moral des autres chaque matin.';
  var THRIVE_TXT = ['En pleine forme', 'A la pêche', 'Le cœur léger', 'D\'humeur solide'];

  Surv.states = function (s) {
    var out = [];
    if (Surv.thriving(s)) {
      var day = (G().st && G().st.day) || 0, h = 0, id = String(s.id);
      for (var i = 0; i < id.length; i++) h += id.charCodeAt(i);
      out.push({ k: 'good', t: THRIVE_TXT[(h + day) % THRIVE_TXT.length], lv: 0, good: true, tip: Surv.THRIVE_TIP });
      return out;
    }
    if (s.hunger >= 100) out.push({ k: 'hunger', t: 'Meurt de faim', lv: 3 });
    else if (s.hunger >= 70) out.push({ k: 'hunger', t: 'Affamé(e)', lv: 3 });
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
    // Ce qui va bien (même quand le reste va mal)
    if (s.hunger < 10) out.push({ k: 'fed', t: 'A bien mangé', lv: 0, good: true });
    if (s.fatigue < 10) out.push({ k: 'rested', t: 'Bien reposé(e)', lv: 0, good: true });
    if (s.moral >= 80 && !(s.grief > 0)) out.push({ k: 'serene', t: 'Serein(e)', lv: 0, good: true });
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
    s.listenToday = 0;
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
    if (s.hunger < 60) s.bioStarve = false;
    // Bonne humeur contagieuse
    if (Surv.thriving(s)) {
      var others = G().present().filter(function (b) { return b !== s && b.alive; });
      if (others.length) {
        others.forEach(function (b) { b.moral = Math.min(100, b.moral + 3); });
        report.push({ t: n + ' est en pleine forme ce matin. Sa bonne humeur fait du bien à tout le monde.', k: 'good' });
        if (C.Mood) C.Mood.think(s, 'thriving');
      }
    }
    if (s.hunger >= 100) {
      if (!s.bioStarve) { s.bioStarve = true; Surv.bio(s, 'La faim me tord le ventre. Je n\'ai presque plus la force de marcher.'); }
      report.push({ t: n + ' meurt de faim. Sans nourriture aujourd\'hui, ' + (s.look && s.look.female ? 'elle' : 'il') + ' ne passera pas la nuit.', k: 'bad' });
    }
  };
})(window.CQR);
