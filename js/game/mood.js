/* =========================================================
   Moral : pensées, répliques, deuil, confort du refuge,
   et conséquences d'un moral brisé (départ, suicide)
   ========================================================= */
(function (C) {
  'use strict';

  function G() { return C.Game; }
  function first(s) { return s.name.split(' ')[0]; }

  var M = C.Mood = { chatter: 20 };

  // Choisit une ligne (variante cynique si le survivant l'est)
  M.line = function (s, key, vars) {
    var pool = C.THOUGHTS[key];
    if (s && G().hasTrait(s, 'cynique') && C.THOUGHTS[key + '_cyn'] && Math.random() < 0.75) pool = C.THOUGHTS[key + '_cyn'];
    if (!pool || !pool.length) return null;
    var txt = pool[Math.floor(Math.random() * pool.length)];
    vars = vars || {};
    return txt.replace(/\{n\}/g, vars.n || '').replace(/\{s\}/g, vars.s || (s ? first(s) : ''));
  };

  // Ajoute une pensée à la fiche du survivant
  M.think = function (s, key, vars, opts) {
    if (!s || !s.alive) return null;
    var txt = M.line(s, key, vars);
    if (!txt) return null;
    s.thoughts = s.thoughts || [];
    s.thoughts.push({ d: G().st.day, t: txt });
    if (s.thoughts.length > 40) s.thoughts.splice(0, s.thoughts.length - 40);
    if (opts && opts.say) M.say(s, txt);
    return txt;
  };

  // Bulle de dialogue au-dessus du personnage (non sauvegardée)
  M.say = function (s, text, secs) {
    if (!C.Render || !text) return;
    C.Render.bubbles[s.id] = { text: text, until: performance.now() + (secs || 4.5) * 1000 };
  };
  M.sayKey = function (s, key, vars, secs) { M.say(s, M.line(s, key, vars), secs); };

  // Réplique spontanée selon l'état du survivant
  M.stateKey = function (s, env) {
    var st = G().st;
    if (s.moral < 15) return 'say_broken';
    if (s.grief > 0 && Math.random() < 0.5) return 'say_grief';
    if (s.hunger >= 45) return 'say_hungry';
    if (env.temp < 5) return 'say_cold';
    if (s.sick >= 30) return 'say_sick';
    if (s.wound >= 30) return 'say_wounded';
    if (s.fatigue >= 70) return 'say_tired';
    if (G().hasTrait(s, 'fumeur') && st.day - s.lastSmoke >= 1 && Math.random() < 0.5) return 'say_smoke';
    if (G().hasTrait(s, 'cafeinomane') && st.day - s.lastCoffee >= 1 && Math.random() < 0.5) return 'say_coffee';
    if (s.moral < 35) return 'say_depressed';
    if (s.moral < 55) return 'say_sad';
    return 'say_ok';
  };

  // Appelé à chaque image pendant la journée (temps réel)
  M.ambient = function (dt, env) {
    M.chatter -= dt * Math.max(1, C.Main.speed);
    if (M.chatter > 0) return;
    var list = G().present().filter(function (s) {
      var sleeping = s.act && s.act.phase === 'work' && (s.act.kind === 'sleep' || s.act.kind === 'sleepfloor' || s.act.kind === 'talk' || s.act.kind === 'listen');
      var b = C.Render.bubbles[s.id];
      return !sleeping && !(b && b.until > performance.now());
    });
    M.chatter = 30 + Math.random() * 40;
    if (!list.length) return;
    var s = list[Math.floor(Math.random() * list.length)];
    M.sayKey(s, M.stateKey(s, env), { n: s.griefFor });
  };

  // Confort du refuge : de −3 à +3 de moral par jour
  M.comfort = function (st) {
    var score = 0, winter = C.World.isWinter(st);
    var present = G().present().length;
    if (G().countBuilt('bed') >= present && present > 0) score++;
    if (G().countBuilt('armchair')) score++;
    if (G().countBuilt('radio')) score++;
    if (G().countBuilt('stove')) score++;
    if (!st.objects.some(function (o) { return o.kind === 'hole' && !o.boarded; })) score++;
    if (winter) score += st.objects.some(function (o) { return o.kind === 'heater' && o.fuel > 0; }) ? 1 : -1;
    return score;
  };

  // Mise à jour de l'aube : deuil, confort, survivants brisés
  M.dawn = function (st, report) {
    var comfort = M.comfort(st);
    var delta = Math.max(-3, Math.min(3, comfort - 2));
    if (comfort <= 1) report.push({ t: 'Le refuge est inhospitalier : froid, nu, ouvert aux quatre vents. Le moral s\'en ressent.', k: 'bad' });
    else if (comfort >= 4) report.push({ t: 'Le refuge commence à ressembler à un foyer. Ça aide à tenir.', k: 'good' });

    G().alive().forEach(function (s) {
      if (s.away) return;
      s.moral = Math.max(0, Math.min(100, s.moral + delta));
      if (comfort <= 1 && Math.random() < 0.3) M.think(s, 'bare');
      if (comfort >= 5 && Math.random() < 0.3) M.think(s, 'cozy');
      s.comfortedToday = false;
      s.talkedToday = {};
      if (s.grief > 0) {
        s.grief--;
        s.moral = Math.max(0, s.moral - 3);
        if (Math.random() < 0.5) M.think(s, 'say_grief', { n: s.griefFor });
      }
      if (s.moral >= 35 && s.wasBroken) { s.wasBroken = false; M.think(s, 'recovered'); }
    });

    // Conséquences d'un moral brisé
    G().alive().slice().forEach(function (s) {
      if (s.away || !s.alive || s.moral >= 15) return;
      s.wasBroken = true;
      var n = first(s);
      if (s.brokenDays <= 1) {
        M.think(s, 'broken');
        report.push({ t: n + ' est brisé(e). Sans soutien — une conversation, du réconfort —, ' + n + ' pourrait ne pas tenir.', k: 'bad' });
        return;
      }
      var p = Math.min(0.75, 0.3 + 0.2 * (s.brokenDays - 2));
      if (!C.R.chance(p)) {
        report.push({ t: n + ' ne parle plus, ne mange presque plus. Il faut faire quelque chose, vite.', k: 'bad' });
        return;
      }
      if (C.R.chance(0.65)) {
        // Départ : emporte un peu de nourriture
        var took = {};
        ['conserve', 'legumes', 'repas', 'cigarettes'].forEach(function (k) { if (G().count(k) && C.R.chance(0.5)) took[k] = 1; });
        G().removeItems(took);
        report.push({ t: n + ' est parti(e) dans la nuit. Un mot griffonné sur la table : « Pardonnez-moi. Je ne pouvais plus rester. »' + (Object.keys(took).length ? ' Il manque : ' + C.itemsText(took) + '.' : ''), k: 'death' });
        C.Surv.kill(s, 'parti', { quiet: true });
      } else {
        report.push({ t: n + ' n\'a pas supporté. On l\'a retrouvé(e) au petit matin. Le refuge est plongé dans le silence.', k: 'death' });
        C.Surv.kill(s, 'suicide', { quiet: true });
      }
    });
  };
})(window.CQR);
