/* =========================================================
   Événements uniques : à chaque partie, une dizaine de rencontres et de
   crises tirées d'un catalogue plus grand, chacune une seule fois, à des
   jours différents. Deux parties ne se ressemblent donc pas.
   st.flags.uniq = { plan: [{id, day, tries}], done: {id: true} }
   Une entrée du catalogue est un événement de C.DAY_EVENTS (weight 0,
   unique: true) : mêmes champs (cond, text, choices).
   ========================================================= */
(function (C) {
  'use strict';
  var U = C.util;
  var Q = C.Uniques = {};
  function G() { return C.Game; }
  function R() { return C.R; }
  function first(s) { return s.name.split(' ')[0]; }
  function anyone() { var l = G().present(); return l.length ? R().pick(l) : null; }
  function weapon() { return ['pistolet', 'pistolet_silencieux', 'fusil', 'fusil_pompe', 'fusil_assaut', 'fusil_lunette', 'hachette'].filter(function (w) { return G().count(w) > 0; }); }

  function one(k) { var o = {}; o[k] = 1; return o; }
  var D = C.DAY_EVENTS;
  function def(id, o) { o.weight = 0; o.unique = true; D[id] = o; }

  def('chien', {
    minDay: 3, icon: 'moral', title: 'Un chien errant',
    cond: function () { return G().present().length >= 1 && !G().st.flags.dog; },
    text: function () { return 'Un chien maigre, une oreille déchirée, s\'est couché devant la porte. Il vous regarde sans aboyer, la truffe contre le seuil.<br><br><i>Une bouche de plus à nourrir. Mais il grognera si quelqu\'un rôde la nuit.</i>'; },
    choices: [
      { label: 'Lui donner une conserve et le laisser entrer', req: { conserve: 1 }, run: function (ctx) {
          G().removeItems({ conserve: 1 }); ctx.st.flags.dog = true; G().moralAll(6, { good: true, key: 'helped' });
          return 'Il mange sans lever les yeux, puis se couche près du poêle. Quelqu\'un lui a déjà trouvé un nom. Les nuits seront un peu moins silencieuses… et les pillards, un peu moins discrets.';
        } },
      { label: 'Le chasser', run: function () { G().moralAll(-2, {}); return 'Il s\'éloigne en boitant, sans se retourner.'; } },
      { label: 'Le tuer pour le manger', run: function (ctx) {
          G().addItems({ viande: 2 }); G().moralAll(-10, { bad: true, key: 'dogkill' });
          return 'Ce n\'est pas beau. Il y a de la viande pour deux jours. Personne ne mange avec appétit.';
        } }
    ]
  });

  def('lettre', {
    minDay: 4, icon: 'speech', title: 'Une lettre sous la porte',
    cond: function () { return G().present().length >= 2; },
    text: function () { return 'Une enveloppe froissée a été glissée sous la porte pendant la nuit. Aucun nom, juste : « Pour ceux de la maison au toit percé. »'; },
    choices: [
      { label: 'La lire à voix haute', run: function () {
          if (R().chance(0.6)) { G().moralAll(8, { good: true, key: 'helped' }); return 'C\'est une voisine : elle est partie avec sa fille à la campagne et laisse la clé de sa cave. « Prenez ce qui reste. » Quelqu\'un sourit pour la première fois depuis longtemps.'; }
          G().moralAll(-6, {}); return 'C\'est un adieu. Un homme explique qu\'il ne tiendra pas jusqu\'à la fin de la semaine et demande simplement qu\'on se souvienne de lui. Le silence dure longtemps.';
        } },
      { label: 'La garder pour plus tard', run: function () { return 'Vous la rangez dans un livre. Elle attendra un meilleur jour.'; } }
    ]
  });

  def('cave_eau', {
    minDay: 3, icon: 'wrench', title: 'Un bruit dans le mur',
    cond: function () { return G().present().length >= 1; },
    text: function () { return 'Quelque chose goutte derrière le placo de la cuisine. Un tuyau ancien, oublié, qui fuit doucement dans un vide du mur.<br><br><i>Il y a peut-être de l\'eau à récupérer.</i>'; },
    choices: [
      { label: 'Défoncer la cloison avec un outil', reqFn: function () { return G().count('pied_de_biche') > 0 || G().count('hachette') > 0; }, reqText: 'un pied-de-biche ou une hachette', run: function () {
          G().addItems({ eau: 4, composants: 1 }); G().moralAll(4, {});
          return 'Le mur cède. Un vieux ballon d\'eau chaude, encore à moitié plein. Quatre bouteilles remplies avant midi, et une poignée de vis derrière.';
        } },
      { label: 'Gratter à mains nues', run: function (ctx) {
          var s = ctx.s; if (s) s.fatigue = Math.min(100, s.fatigue + 20);
          G().addItems({ eau: 2 }); return (s ? first(s) : 'Quelqu\'un') + ' s\'écorche les mains mais ramène deux bouteilles d\'eau.';
        } },
      { label: 'Laisser', run: function () { return 'La fuite continue, goutte à goutte. On finit par ne plus l\'entendre.'; } }
    ]
  });

  def('incendie', {
    minDay: 4, icon: 'alert', title: 'Incendie chez le voisin',
    cond: function () { return C.DayEvents.fittest() && G().present().length >= 2; },
    text: function () { return 'De la fumée noire s\'échappe de l\'immeuble voisin. Des cris. Une femme agite les bras depuis une fenêtre du deuxième.<br><br><i>Il n\'y a pas de pompiers. Aider, c\'est risquer de se brûler.</i>'; },
    choices: [
      { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' avec des seaux d\'eau'; }, run: function (ctx) {
          G().sendAway(ctx.s, 'incendie', R().chance(0.3) ? { conserve: 2, bandage: 1, bijoux: 1 } : { conserve: 2, bandage: 1 }, 0.3);
          C.Story.thanks(ctx.st, 2, 'La femme sauvée de l\'incendie est venue remercier ' + first(ctx.s) + ', les cheveux roussis. Elle a laissé ce qu\'elle avait pu sortir des flammes', { conserve: 1, sucre: 2 }, 5);
          G().moralAll(6, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          return first(ctx.s) + ' saisit deux seaux et fonce dans l\'escalier.';
        } },
      { label: 'Regarder brûler', run: function (ctx) { G().moralAll(-6, { bad: true, key: 'refused' }); ctx.st.stats.refused++; return 'L\'immeuble brûle jusqu\'au soir. Personne ne dit rien, mais personne ne quitte la fenêtre.'; } }
    ]
  });

  def('cambrioleur', {
    minDay: 5, icon: 'shield', title: 'Un voleur dans la réserve',
    cond: function () { return G().present().length >= 2 && Object.keys(G().st.inventory).length > 3; },
    text: function () { return 'Un cri. Un homme squelettique est sorti en rampant de derrière les étagères, un sac déjà à moitié rempli. Il n\'a pas l\'air dangereux, juste affamé.'; },
    choices: [
      { label: 'Le chasser à coups de bâton', run: function (ctx) {
          if (R().chance(0.65)) { G().moralAll(2, {}); return 'Il lâche le sac et détale. Rien n\'a disparu.'; }
          var lost = {}; var keys = Object.keys(ctx.st.inventory); var k = R().pick(keys); lost[k] = Math.min(ctx.st.inventory[k], 2); G().removeItems(lost);
          return 'Il glisse entre les jambes de quelqu\'un et s\'enfuit avec ' + C.itemsText(lost) + '.';
        } },
      { label: 'L\'attacher et l\'interroger', run: function (ctx) {
          var t = C.Threat && C.Threat.get(ctx.st);
          if (t) { t.warn = t.level >= 1 ? 1 : 0; t.heat = Math.max(0, t.heat - 5); }
          G().addItems({ couteau: 1 });
          return 'Il parle vite : il travaille pour une bande du port, on lui a demandé de repérer les maisons qui ont encore des réserves. ' + (t && t.level >= 1 ? 'Il dit qu\'ils reviendront bientôt. ' : 'Il jure qu\'il n\'y a personne derrière lui. ') + 'Vous le relâchez. Il laisse un couteau derrière lui.';
        } },
      { label: 'Lui donner une conserve et le laisser partir', req: { conserve: 1 }, run: function (ctx) {
          G().removeItems({ conserve: 1 }); G().moralAll(3, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          C.Story.thanks(ctx.st, 3, 'L\'homme de la réserve est revenu, honteux, avec un sac de ce qu\'il avait volé ailleurs. « Je ne vole pas ceux qui me nourrissent. »', { composants: 2, cigarettes: 2 }, 3);
          return 'Il pleure presque. Il file sans se retourner.';
        } }
    ]
  });

  def('radio_appel', {
    minDay: 4, icon: 'radio', title: 'Une voix sur la radio',
    cond: function () { return G().countBuilt('radio') > 0; },
    text: function () { return 'Entre deux grésillements, une voix d\'homme, très basse : « Quelqu\'un m\'entend ? Je suis coincé dans une cave, rue des Tanneurs… j\'ai de quoi payer. »'; },
    choices: [
      { label: 'Répondre et lui dire de tenir', run: function (ctx) {
          G().moralAll(3, { good: true, key: 'helped' });
          C.Story.thanks(ctx.st, 3, 'L\'homme de la radio s\'est sorti de sa cave par ses propres moyens. Il a fait le tour du quartier pour trouver votre porte et vous remercier d\'avoir répondu', { conserve: 2, medicaments: 1 }, 6);
          return 'Vous restez avec lui pendant une heure. Puis le signal s\'éteint.';
        } },
      { label: 'Couper la radio', run: function () { G().moralAll(-3, {}); return 'Le silence est plus lourd qu\'avant.'; } }
    ]
  });

  def('camion', {
    minDay: 6, icon: 'pack', title: 'Le camion des secours',
    cond: function () { return C.DayEvents.fittest() && G().present().length >= 2; },
    text: function () { return 'Un camion bâché s\'arrête au carrefour. Des hommes en gilet jaune distribuent des cartons en hurlant : « Trois minutes ! » La foule s\'y précipite.'; },
    choices: [
      { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' en courant'; }, run: function (ctx) {
          G().sendAway(ctx.s, 'camion', R().chance(0.8) ? { conserve: 3, medicaments: 1, bandage: 2, sucre: 2 } : { conserve: 1 }, 0.35);
          return first(ctx.s) + ' fend la foule à coups d\'épaule.';
        } },
      { label: 'Laisser passer', run: function () { return 'Le camion repart, la foule se disperse. Il ne reste que des cartons déchirés.'; } }
    ]
  });

  def('chant', {
    minDay: 3, icon: 'moral', title: 'Un chant à la fenêtre',
    cond: function () { return G().present().length >= 2; },
    text: function () { return 'Le soir approche. Quelqu\'un, quelque part dans la rue, a commencé à chanter. Puis une deuxième voix, à un autre étage. Une vieille chanson d\'avant, tout le monde la connaît.'; },
    choices: [
      { label: 'Jouer de la guitare avec eux', reqFn: function () { return G().countBuilt('guitar') > 0; }, reqText: 'une guitare', run: function () { G().moralAll(9, { good: true, key: 'song' }); return 'Les accords montent dans la rue. Des fenêtres s\'éclairent une à une. Cette nuit-là, personne ne parle de la guerre.'; } },
      { label: 'Ouvrir la fenêtre et écouter', run: function () { G().moralAll(4, {}); return 'On reste assis dans le noir, les yeux fermés. Un vieil homme fredonne le refrain.'; } },
      { label: 'Fermer les volets', run: function () { return 'La chanson passe à travers le bois, plus lointaine.'; } }
    ]
  });

  def('fievre', {
    minDay: 5, icon: 'moral', title: 'Un enfant a de la fièvre',
    cond: function () { return G().present().length >= 2; },
    text: function () { return 'Une jeune mère tient un garçon brûlant dans ses bras. « Il tousse depuis trois jours. Vous n\'avez rien ? Un cachet, n\'importe quoi… »'; },
    choices: [
      { label: 'Lui donner des médicaments', req: { medicaments: 1 }, run: function (ctx) {
          G().removeItems({ medicaments: 1 }); G().moralAll(7, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          C.Story.thanks(ctx.st, 3, 'Le petit est sur pied. Sa mère a fouillé tout l\'immeuble pour vous rapporter quelque chose', { conserve: 2, sucre: 2, cafe: 1 }, 5);
          return 'Elle pleure de soulagement. « Merci. On n\'oubliera pas. »';
        } },
      { label: 'La laisser se réchauffer près du poêle', run: function (ctx) {
          var s = anyone(); if (s && R().chance(0.5)) { s.sick = Math.min(100, s.sick + 25); }
          G().moralAll(5, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          return 'Elle reste une heure, sans rien dire. Le garçon s\'apaise un peu. Le soir, quelqu\'un tousse à son tour.';
        } },
      { label: 'Refuser : la maladie, ça se propage', run: function (ctx) { G().moralAll(-6, { bad: true, key: 'refused' }); ctx.st.stats.refused++; return 'Elle serre son fils contre elle et redescend l\'escalier. Personne ne dort bien, cette nuit-là.'; } }
    ]
  });

  def('embuscade', {
    minDay: 6, icon: 'alert', title: 'Un appel à l\'aide',
    cond: function () { return C.DayEvents.fittest() && G().present().length >= 2; },
    text: function () { return 'De la ruelle voisine, une voix de femme : « Aidez-moi, je suis blessée, je n\'arrive pas à me lever ! » Elle répète, toujours pareil, toujours au même endroit.<br><br><i>Quelque chose sonne faux.</i>'; },
    choices: [
      { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' voir'; }, run: function (ctx) {
          var s = ctx.s, t = C.Threat && C.Threat.get(ctx.st);
          if (R().chance(0.5)) {
            G().moralAll(5, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 2, 'La femme de la ruelle boitait à peine : elle est venue remercier ' + first(s) + ' avec ce qu\'elle avait', { conserve: 2, bandage: 1 }, 4);
            return first(s) + ' revient avec elle : une cheville foulée, rien de plus.';
          }
          s.wound = Math.min(95, s.wound + R().int(12, 28));
          var lost = {}, k = R().pick(Object.keys(ctx.st.inventory)); if (k) { lost[k] = Math.min(ctx.st.inventory[k], 3); G().removeItems(lost); }
          G().moralAll(-5, {}); if (t) t.heat = Math.min(100, t.heat + 6);
          return 'C\'était un piège. Deux hommes surgissent, ' + first(s) + ' est frappé' + (s.female ? 'e' : '') + ' et dépouillé' + (s.female ? 'e' : '') + (Object.keys(lost).length ? ' de ' + C.itemsText(lost) : '') + '. Ils savent maintenant qui habite ici.';
        } },
      { label: 'Ne pas bouger', run: function () { return 'La voix crie pendant une heure. Puis plus rien. Vous ne saurez jamais.'; } }
    ]
  });

  def('anniversaire', {
    minDay: 4, icon: 'star', title: 'Un anniversaire',
    cond: function () { return G().present().length >= 2; },
    text: function (ctx) { ctx.d.who = ctx.d.who || anyone(); return 'Ce soir, ' + (ctx.d.who ? first(ctx.d.who) : 'quelqu\'un') + ' aurait fêté son anniversaire, avant. Personne n\'en parle. Mais tout le monde y pense.'; },
    choices: [
      { label: 'Offrir quelque chose de petit (sucre ou cigarettes)', reqFn: function () { return G().count('sucre') > 0 || G().count('cigarettes') > 0; }, reqText: '1 sucre ou 1 cigarette', run: function (ctx) {
          G().removeItems(G().count('sucre') > 0 ? { sucre: 1 } : { cigarettes: 1 });
          var w = ctx.d.who; if (w && w.alive) { w.moral = Math.min(100, w.moral + 18); C.Mood.say(w, 'Vous vous en êtes souvenus… merci.'); }
          G().moralAll(3, {}); return 'Une bougie plantée dans une conserve, quelques voix à peine audibles. ' + (w ? first(w) : 'Quelqu\'un') + ' détourne le visage pour cacher ses yeux.';
        } },
      { label: 'Ne rien dire', run: function () { return 'La soirée se passe comme les autres.'; } }
    ]
  });

  def('inspection', {
    minDay: 8, icon: 'shield', title: 'Inspection de la milice',
    cond: function () { return weapon().length > 0; },
    text: function () { return 'Deux miliciens frappent à la porte. « Contrôle des armes. On a eu des plaintes sur des coups de feu dans le quartier. Ouvrez. »'; },
    choices: [
      { label: 'Les laisser entrer', run: function (ctx) {
          var w = weapon(); var k = R().pick(w); G().removeItems(one(k)); G().moralAll(-4, {});
          return 'Ils fouillent, prennent ' + C.ITEMS[k].name.toLowerCase() + ' « pour la sécurité de tous », et repartent.';
        } },
      { label: 'Les soudoyer (3 cigarettes)', req: { cigarettes: 3 }, run: function () {
          G().removeItems({ cigarettes: 3 });
          return 'Ils comptent les cigarettes, échangent un regard et « ne trouvent rien à signaler ».';
        } },
      { label: 'Faire semblant de ne pas être là', run: function (ctx) {
          if (R().chance(0.5)) return 'Ils frappent longtemps, puis repartent en jurant. Le cœur cogne jusqu\'au soir.';
          G().moralAll(-3, {}); var w = weapon(); var k = R().pick(w); G().removeItems(one(k));
          return 'Ils forcent la porte, retournent la maison, saisissent ' + C.ITEMS[k].name.toLowerCase() + ' et partent sans un mot.';
        } }
    ]
  });

  // ---------------------------------------------------------------- planification
  var IDS = Object.keys(D).filter(function (id) { return D[id].unique; });
  Q.ids = IDS;

  // Tirage au début (ou à la première journée d'une vieille sauvegarde)
  function draw(st) {
    var pool = IDS.slice(), plan = [], n = Math.min(9, pool.length), r = R();
    var last = Math.max(12, (st.ceasefireDay || 40) - 4), day = r.int(3, 5);
    for (var i = 0; i < n; i++) {
      var pick = pool.splice(r.int(0, pool.length - 1), 1)[0];
      plan.push({ id: pick, day: Math.min(last, day), tries: 0 });
      day += r.int(3, 5);
    }
    return { plan: plan, done: {} };
  }

  // Appelé par World.planDayEvents : ajoute l'événement du jour, s'il y en a un
  Q.plan = function (st) {
    if (st.day < 2) return;
    st.flags.uniq = st.flags.uniq || draw(st);
    var u = st.flags.uniq;
    if (st.dayEvents.length >= 2) return;
    for (var i = 0; i < u.plan.length; i++) {
      var p = u.plan[i], d = D[p.id];
      if (u.done[p.id] || p.day > st.day) continue;
      if (!d || (d.cond && !d.cond(st))) {
        if (++p.tries > 4) u.done[p.id] = true;       // trop de refus : on l'abandonne
        continue;
      }
      u.done[p.id] = true;
      st.dayEvents.push({ id: p.id, at: R().int(8 * 60, 17 * 60) });
      st.dayEvents.sort(function (a, b) { return a.at - b.at; });
      return;
    }
  };
})(window.CQR);
