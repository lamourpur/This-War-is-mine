/* =========================================================
   Moral : pensées, répliques, deuil, confort du refuge,
   et conséquences d'un moral brisé (départ, suicide)
   ========================================================= */
(function (C) {
  'use strict';

  function G() { return C.Game; }
  var U = C.util;
  function first(s) { return s.name.split(' ')[0]; }

  var M = C.Mood = { chatter: 20 };

  // Choisit une ligne (variante cynique si le survivant l'est)
  M.line = function (s, key, vars) {
    var pool = C.THOUGHTS[key];
    if (s && G().hasTrait(s, 'cynique') && C.THOUGHTS[key + '_cyn'] && Math.random() < 0.75) pool = C.THOUGHTS[key + '_cyn'];
    if (!pool || !pool.length) return null;
    var txt = pool[Math.floor(Math.random() * pool.length)];
    vars = vars || {};
    return txt.replace(/\{n\}/g, vars.n || '').replace(/\{s\}/g, vars.s || (s ? first(s) : '')).replace(/\(e\)/g, s && s.look && s.look.female ? 'e' : '');
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
    if (C.Surv.thriving(s) && Math.random() < 0.6) return 'say_thriving';
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

  // Le poids d'avoir tué. Coup immédiat (self), puis « remords » : quelques
  // jours pendant lesquels le moral baisse encore chaque matin, aidé ou non
  // par le réconfort des autres. Cynique : tout est atténué. Plusieurs morts :
  // ça s'accumule, et le remords se prolonge.
  M.remorse = function (s, self, days, kind, nth) {
    var cyn = G().hasTrait(s, 'cynique'), emp = G().hasTrait(s, 'empathique'), fight = G().hasTrait(s, 'combattant');
    var k = (cyn ? 0.35 : emp ? 1.25 : fight ? 0.8 : 1) * (1 + 0.3 * Math.min(3, nth || 0));
    var hit = Math.round(self * k);
    s.moral = Math.max(0, s.moral - hit);
    s.remorse = Math.max(s.remorse || 0, Math.round(days * (cyn ? 0.5 : 1)) + (s.remorse ? 2 : 0));
    s.remorseKind = kind;
    s.kills = (s.kills || 0) + 1;
    if (kind === 'surrender') s.execs = (s.execs || 0) + 1;
    M.think(s, kind === 'surrender' ? 'killed_self_surr' : 'killed_self');
    return hit;
  };
  // Chaque matin : le remords ronge (plus fort les premiers jours)
  M.remorseDawn = function (s, report) {
    if (!(s.remorse > 0)) return;
    var n = first(s), left = s.remorse;
    var d = (left >= 5 ? 6 : left >= 3 ? 4 : 3) * (G().hasTrait(s, 'cynique') ? 0.4 : 1);
    s.moral = Math.max(0, s.moral - d);
    s.remorse--;
    M.think(s, 'remorse', { n: n });
    if (s.remorse === 0) { M.think(s, 'remorse_end'); report.push({ t: n + ' commence à respirer de nouveau. Ce qui s\'est passé ne partira pas, mais ça pèse un peu moins.', k: 'info' }); }
    else if (left >= 3 && Math.random() < 0.6) report.push({ t: n + ' se réveille en sursaut, en sueur. ' + (s.remorseKind === 'surrender' ? 'Il ou elle revoit l\'homme qui suppliait.' : 'Le visage de celui qu\'' + (s.look && s.look.female ? 'elle' : 'il') + ' a tué revient chaque nuit.'), k: 'bad' });
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
  // ============================================================ jugements
  // Ce que le groupe pense des actes de la nuit (vol, braquage, meurtre),
  // comme dans le jeu d'origine : chacun réagit selon son caractère et la
  // situation. Certains approuvent (« il faut bien survivre »), d'autres
  // sont mal à l'aise, d'autres choqués. Si c'est le mercenaire qui a agi,
  // on s'en lave un peu les mains… mais c'est nous qui l'avons payé.
  // sins : [{ act: 'steal'|'rob'|'kill'|'kill_surrender', base: moral (<0), victim }]
  var JUDGE = {
    ok: {
      steal: ['Il fallait bien manger. Ils s\'en remettront.', 'On n\'a pas le luxe d\'avoir des scrupules.', 'Chacun pour soi. C\'est la guerre qui veut ça.'],
      rob: ['Ils avaient de quoi. Nous, on n\'a rien. C\'est comme ça.', 'Mieux vaut qu\'ils aient peur de nous que l\'inverse.'],
      kill: ['C\'était eux ou nous.', 'Un de moins pour nous tomber dessus.']
    },
    okMerc: ['C\'est {lui} qui l\'a fait, pas nous. Et on mange ce soir.', 'On l\'a payé{e} pour ramener de quoi vivre. {Il} l\'a fait.', 'Au moins, aucun de nous n\'a eu à se salir les mains.'],
    meh: {
      steal: ['Je sais qu\'on n\'avait pas le choix. Ça ne m\'aide pas à dormir.', 'On fait ce qu\'il faut… mais je n\'en suis pas fier(e).'],
      rob: ['Braquer des gens… On en est là, alors.', 'Je comprends. Mais je préfère ne pas y penser.'],
      kill: ['Il y a eu des morts. Je ne veux pas savoir comment.']
    },
    mehMerc: ['On a payé quelqu\'un pour faire le sale travail. Ça revient au même, non ?', 'Je préfère ne pas savoir ce qu\'{il} a fait là-bas.'],
    ko: {
      steal: ['On vole des gens qui n\'ont déjà presque rien. On est devenus quoi ?', 'Je ne peux plus regarder ce qu\'on mange sans penser à eux.'],
      rob: ['Une arme sur la tempe de gens sans défense. On est devenus des bandits.', 'Ils tremblaient. Et on leur a tout pris. Je ne l\'oublierai pas.'],
      kill: ['On a tué. Il n\'y a pas de retour possible.', 'Ce n\'est pas ça, survivre. Pas comme ça.']
    },
    koMerc: ['On a payé quelqu\'un pour faire ça à notre place. C\'est pire, d\'une certaine façon.', 'Nos vivres, nos affaires… pour ça. Je n\'en veux plus, de {ce} mercenaire.', 'Ce qu\'{il} a fait, {il} l\'a fait en notre nom.']
  };
  var ACT_WEIGHT = { steal: 0, rob: -1, kill: -1, kill_surrender: -3 };
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973; return h; }
  M.stance = function (s, worst, st, merc) {
    var H = G().hasTrait, score = 0;
    if (H(s, 'cynique')) score += 2;
    if (H(s, 'combattant')) score += 1;
    if (H(s, 'empathique')) score -= 2;
    if (H(s, 'soigneur')) score -= 1;
    // Le ventre vide rend moins regardant
    var present = G().present().length || 1;
    if (G().foodCount() < present * 2) score += 1;
    if (s.hunger >= 50) score += 1;
    if (s.grief > 0) score -= 1;
    score += ACT_WEIGHT[worst] || 0;
    // Ce n'est pas l'un des nôtres qui l'a fait : plus facile à accepter
    if (merc) score += 1;
    // Un peu d'humeur du jour (stable pour une même nuit)
    var r = hash(s.id + ':' + st.day + ':' + worst) % 10;
    score += r < 3 ? -1 : r > 7 ? 1 : 0;
    return score >= 2 ? 'ok' : score <= -1 ? 'ko' : 'meh';
  };
  M.judge = function (sins, opts) {
    opts = opts || {};
    if (!sins || !sins.length) return [];
    var st = G().st, total = 0, worst = 'steal', order = ['steal', 'rob', 'kill', 'kill_surrender'];
    sins.forEach(function (x) { if (order.indexOf(x.act) > order.indexOf(worst)) worst = x.act; });
    // Plusieurs fautes la même nuit : la pire compte en entier, les autres
    // alourdissent (sans cumul sans fin)
    var bases = sins.map(function (x) { return x.base; }).sort(function (a, b) { return a - b; });
    var killed = sins.some(function (x) { return /kill/.test(x.act); });
    total = bases[0] + bases.slice(1).reduce(function (a, b) { return a + b; }, 0) * (killed ? 0.6 : 0.35);
    total = Math.max(total, killed ? -38 : -18);
    var killed2 = sins.some(function (x) { return /kill/.test(x.act); });
    var merc = !!opts.merc, lines = [], fe = function (s) { return s.look && s.look.female ? 'e' : ''; };
    var cat = worst === 'kill_surrender' ? 'kill' : worst;
    st.flags.reactions = [];
    var used = {};
    G().alive().forEach(function (s) {
      if (s.away || s.id === opts.except) return;
      var stance = M.stance(s, worst, st, merc), d;
      if (stance === 'ok') d = killed2 ? Math.round(total * 0.12) : merc ? 2 : 1;   // soulagé… mais un mort reste un mort
      else if (stance === 'meh') d = total * (merc ? 0.45 : 0.8);
      else d = total * (merc ? 1.1 : 1.6);                                     // choqué (et par le mercenaire aussi)
      d = Math.round(d);
      s.moral = U.clamp(s.moral + d, 0, 100);
      var pool = merc ? JUDGE[stance + 'Merc'] : JUDGE[stance][cat];
      var mf = !!opts.mercFemale;
      var pi = hash(s.id + st.day + cat) % pool.length;
      for (var tries = 0; tries < pool.length && used[pool[pi]]; tries++) pi = (pi + 1) % pool.length;
      used[pool[pi]] = true;
      var txt = pool[pi].replace(/\(e\)/g, fe(s))
        .replace(/\{lui\}/g, mf ? 'elle' : 'lui').replace(/\{Il\}/g, mf ? 'Elle' : 'Il').replace(/\{il\}/g, mf ? 'elle' : 'il')
        .replace(/\{e\}/g, mf ? 'e' : '').replace(/\{ce\}/g, mf ? 'cette' : 'ce');
      s.thoughts = s.thoughts || [];
      s.thoughts.push({ d: st.day, t: txt });
      var verb = stance === 'ok' ? ' approuve' : stance === 'meh' ? ' est mal à l\'aise' : ' est choqué' + fe(s);
      lines.push({ t: first(s) + verb + ' : « ' + txt + ' »' + (d ? ' (moral ' + (d > 0 ? '+' : '') + d + ')' : ''), k: stance === 'ok' ? 'info' : 'bad', sid: s.id, stance: stance });
      st.flags.reactions.push({ sid: s.id, t: txt });
    });
    // Ceux qui approuvent et ceux qui sont choqués ne se regardent plus pareil
    var oks = lines.filter(function (l) { return l.stance === 'ok'; }), kos = lines.filter(function (l) { return l.stance === 'ko'; });
    if (oks.length && kos.length) {
      var a = G().surv(oks[0].sid), b = G().surv(kos[0].sid);
      lines.push({ t: 'Le ton monte entre ' + first(a) + ' et ' + first(b) + '. Le groupe est divisé sur ce qui s\'est passé cette nuit.', k: 'bad' });
      b.moral = Math.max(0, b.moral - 2);
    }
    if (C.UI && C.UI.floatMoral) C.UI.floatMoral(Math.round(total));
    return lines;
  };
  // Au début de la journée, chacun dit ce qu'il en pense
  M.replayReactions = function () {
    var st = G().st, list = st.flags.reactions || [];
    st.flags.reactions = [];
    list.forEach(function (r, i) {
      setTimeout(function () { var s = G().surv(r.sid); if (s && s.alive && !s.away) M.say(s, r.t, 6); }, 900 + i * 2600);
    });
  };

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
      M.remorseDawn(s, report);
      if (s.grief > 0) {
        s.grief--;
        s.moral = Math.max(0, s.moral - 3);
        if (Math.random() < 0.5) M.think(s, 'say_grief', { n: s.griefFor });
      }
      if (s.moral >= 35 && s.wasBroken) { s.wasBroken = false; M.think(s, 'recovered'); C.Surv.bio(s, 'Le pire est passé. Je recommence à dormir la nuit.'); }
    });

    // Conséquences d'un moral brisé
    G().alive().slice().forEach(function (s) {
      if (s.away || !s.alive || s.moral >= 15) return;
      s.wasBroken = true;
      var n = first(s);
      if (s.brokenDays <= 1) {
        M.think(s, 'broken');
        C.Surv.bio(s, 'Je n\'en peux plus. Je ne sais plus pourquoi je me lève le matin.');
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
