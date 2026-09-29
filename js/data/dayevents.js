/* =========================================================
   Événements aléatoires de la journée
   Deux sortes :
   - auto   : arrivent et se règlent seuls (run → { text, major })
              major = fenêtre qui met en pause, sinon notification
   - choix  : fenêtre avec des options (comme les visiteurs)
   ctx = { st, s (survivant le plus en forme), d (données tirées) }
   ========================================================= */
(function (C) {
  'use strict';

  function G() { return C.Game; }
  function R() { return C.R; }
  function first(s) { return s.name.split(' ')[0]; }
  function its(o) { return C.itemsText(o); }

  // Survivant présent, pris au hasard (hors endormis)
  function anyone() {
    var l = G().present();
    return l.length ? R().pick(l) : null;
  }
  // Survivant le plus en forme (pour les sorties)
  function fittest() {
    var l = G().present().filter(function (s) { return s.moral >= 15; });
    l.sort(function (a, b) { return (b.moral - b.fatigue - b.wound - b.sick) - (a.moral - a.fatigue - a.wound - a.sick); });
    return l[0] || null;
  }
  function stations(kinds) {
    return G().st.objects.filter(function (o) { return kinds.indexOf(o.kind) >= 0 && !o.broken; });
  }

  var BREAK_TEXT = {
    heater: 'Le tuyau du chauffage s\'est déboîté : il fume dans toute la pièce. Impossible de l\'utiliser avant réparation.',
    stove: 'Un pied du poêle a lâché et la plaque est fendue. Il faudra le réparer pour cuisiner.',
    collector: 'Le collecteur d\'eau fuit : un obus a fendu le tonneau. Il ne récupère plus rien.',
    still: 'La distillerie a sauté : le serpentin est percé. Il faudra le ressouder.',
    radio: 'La radio grésille, puis plus rien. Une lampe a dû griller.'
  };

  C.DAY_EVENTS = {
    // ---------------------------------------------------------------- automatiques
    bombardement: {
      weight: 5, minDay: 2, icon: 'alert', title: 'Bombardement',
      run: function (ctx) {
        if (C.Render) C.Render.shake(9);
        if (C.Audio.ready) { C.Audio.sfx.shell(1); setTimeout(function () { C.Audio.sfx.shell(0.8); }, 700); }
        var st = ctx.st, txt = 'Les obus tombent tout près. La maison tremble jusque dans ses fondations.';
        var roll = R().next();
        var boarded = st.objects.filter(function (o) { return o.kind === 'hole' && o.boarded; });
        if (roll < 0.35 && boarded.length) {
          var hb = R().pick(boarded);
          hb.boarded = false;
          G().markDirty();                                   // les planches disparaissent du décor
          // Planches arrachées : éclats de bois et poussière qui volent du trou
          if (C.Render && C.ObjDraw) {
            var hy = C.FLOORS[hb.f].y - C.ObjDraw.HOLE_CY;
            for (var k = 0; k < 26; k++) {
              var dir = Math.random() < 0.5 ? -1 : 1;
              C.Render.spawn({ x: hb.x + (Math.random() - 0.5) * 50, y: hy + (Math.random() - 0.5) * 40, vx: dir * (40 + Math.random() * 120), vy: -60 - Math.random() * 90, life: 1 + Math.random() * 0.6, t: 0, kind: k % 3 ? 'chip' : 'dust', size: 2 + Math.random() * 2.5, rot: Math.random() * 6 });
            }
          }
          txt += ' Le souffle a arraché les planches d\'un trou : le froid et les rôdeurs peuvent de nouveau entrer.';
        } else if (roll < 0.75) {
          var slots = C.UI.freeSlots('bed');
          if (slots.length) {
            var sl = R().pick(slots);
            G().spawnObject({ kind: 'rubble', f: sl.f, x: sl.x, w: 92, h: 40, work: 60, loot: { bois: R().int(1, 3), composants: R().int(1, 2) } });
            txt += ' Un pan de plafond s\'est effondré (' + C.FLOORS[sl.f].name.toLowerCase() + ') : il faudra déblayer.';
          }
        } else txt += ' Par miracle, rien n\'a cédé.';
        var upstairs = G().present().filter(function (s) { return s.f === 2 || s.f === 3; });
        if (upstairs.length && R().chance(0.35)) {
          var v = R().pick(upstairs);
          v.wound = Math.min(95, v.wound + R().int(8, 18));
          txt += ' ' + first(v) + ' a été touché(e) par des éclats de plâtre.';
          C.Mood.say(v, 'Aïe ! Ma tête…');
        }
        G().moralAll(-3, { key: 'shelling' });
        return { text: txt, major: true };
      }
    },

    rats: {
      weight: 3, minDay: 3, icon: 'hunger', title: 'Des rats dans la réserve',
      cond: function (st) { return !(st.flags.catUntil > st.day) && (G().count('legumes') + G().count('viande') + G().count('repas') > 1 || G().countBuilt('rattrap')); },
      run: function () {
        var trap = G().objectsOf('rattrap')[0];
        if (trap) {
          trap.catch = (trap.catch || 0) + 1; G().markDirty();
          return { text: 'Des rats ont rôdé autour des vivres… et l\'un d\'eux s\'est fait prendre dans le piège.' };
        }
        var lost = {};
        ['legumes', 'viande', 'repas'].forEach(function (k) { if (G().count(k) && R().chance(0.7)) lost[k] = Math.min(G().count(k), R().int(1, 2)); });
        if (!Object.keys(lost).length) return { text: 'Des rats grattent dans les murs. Il faudrait un piège.' };
        G().removeItems(lost);
        return { text: 'Des rats se sont servis dans la réserve. Perdu : ' + its(lost) + '. Un piège aurait été utile.' };
      }
    },

    fuite: {
      weight: 3, minDay: 2, icon: 'rain', title: 'Infiltration',
      cond: function (st) { return st.weather.type === 'pluie' || st.weather.type === 'neige'; },
      run: function (ctx) {
        var lost = {};
        if (G().count('livres') >= 2 && R().chance(0.5)) lost.livres = 2;
        else if (G().count('bois') >= 2) lost.bois = R().int(1, 2);
        var col = G().objectsOf('collector').filter(function (o) { return !o.broken; })[0];
        if (col) { col.water = Math.min(col.level >= 2 ? 8 : 4, (col.water || 0) + 1); G().markDirty(); }
        G().removeItems(lost);
        return { text: 'L\'eau s\'infiltre par le toit éventré et goutte sur les réserves.' + (Object.keys(lost).length ? ' Pourri : ' + its(lost) + '.' : '') + (col ? ' Le collecteur, lui, s\'est un peu rempli.' : '') };
      }
    },

    panne: {
      weight: 3, minDay: 4, icon: 'wrench', title: 'Panne',
      cond: function () { return stations(['heater', 'stove', 'collector', 'still', 'radio']).length > 0; },
      run: function () {
        var o = R().pick(stations(['heater', 'stove', 'collector', 'still', 'radio']));
        o.broken = true;
        if (o.kind === 'heater') o.fuel = 0;
        if (o.kind === 'still') o.brewUntil = 0;
        G().markDirty();
        return { text: BREAK_TEXT[o.kind] + ' (Cliquez dessus pour la réparer.)', major: true };
      }
    },

    trouvaille: {
      weight: 3, minDay: 1, icon: 'star', title: 'Une trouvaille',
      run: function () {
        var s = anyone(); if (!s) return null;
        var finds = [
          [{ composants: R().int(1, 2) }, 'une poignée de vis dans une fissure du mur'],
          [{ conserve: 1 }, 'une conserve oubliée sous une latte du plancher'],
          [{ cigarettes: 1 }, 'une cigarette dans la poche d\'un vieux manteau'],
          [{ livres: 1 }, 'un livre coincé derrière un radiateur'],
          [{ cafe: 1 }, 'un sachet de café au fond d\'un tiroir'],
          [null, 'une vieille photo de famille, prise avant la guerre']
        ];
        var f = R().pick(finds);
        if (f[0]) G().addItems(f[0]);
        else s.moral = Math.min(100, s.moral + 6);
        C.Mood.say(s, f[0] ? 'Tiens… regardez ce que j\'ai trouvé !' : 'Ils avaient l\'air heureux…');
        return { text: first(s) + ' a trouvé ' + f[1] + '.' };
      }
    },

    histoire: {
      weight: 2, minDay: 2, icon: 'speech', title: 'Un moment de répit',
      cond: function () { return G().present().some(function (s) { return s.moral >= 60; }) && G().present().length >= 2; },
      run: function () {
        var s = R().pick(G().present().filter(function (x) { return x.moral >= 60; }));
        var lines = ['raconte comment il a un jour raté son train pour un chien errant', 'imite le présentateur de la radio d\'avant-guerre', 'raconte le jour où la cantine a brûlé les pancakes', 'chante à voix basse une vieille chanson'];
        C.Mood.say(s, 'Attendez, écoutez ça…');
        G().moralAll(4, { key: 'story', vars: { n: first(s) } });
        return { text: first(s) + ' ' + R().pick(lines) + '. Pour la première fois depuis des jours, quelqu\'un rit.' };
      }
    },

    crise: {
      weight: 3, minDay: 3, icon: 'moral', title: 'Crise de larmes',
      cond: function () { return G().present().some(function (s) { return s.moral < 35; }); },
      run: function () {
        var s = R().pick(G().present().filter(function (x) { return x.moral < 35; }));
        s.moral = Math.max(0, s.moral - 3);
        C.Mood.say(s, 'Je n\'en peux plus… je n\'en peux plus…', 7);
        G().alive().forEach(function (o) { if (o !== s && !o.away) o.moral = Math.max(0, o.moral - 2); });
        return { text: first(s) + ' s\'effondre en larmes au milieu de la pièce. Quelqu\'un devrait aller lui parler (clic sur ' + first(s) + ' avec un autre survivant sélectionné).', major: true };
      }
    },

    balle: {
      weight: 2, minDay: 3, icon: 'alert', title: 'Tirs dans la rue',
      run: function () {
        if (C.Audio.ready) { C.Audio.sfx.gun(); setTimeout(C.Audio.sfx.gun, 400); }
        var exposed = G().present().filter(function (s) { return s.f >= 1 && s.f <= 3; });
        if (exposed.length && R().chance(0.25)) {
          var v = R().pick(exposed);
          v.wound = Math.min(95, v.wound + R().int(8, 15));
          C.Mood.say(v, 'Aaah ! Mon bras !');
          G().moralAll(-3);
          return { text: 'Une rafale éclate dans la rue. Une balle perdue traverse une fenêtre et érafle ' + first(v) + '.', major: true };
        }
        G().moralAll(-1);
        return { text: 'Une rafale éclate dans la rue, tout près. Tout le monde se jette à terre. Puis le silence.' };
      }
    },

    voisin_mort: {
      weight: 2, minDay: 5, icon: 'grief', title: 'Mort de froid',
      cond: function (st) { return C.World.isWinter(st) && !st.flags.carl; },
      run: function (ctx) {
        ctx.st.flags.carl = true;
        G().moralAll(-4, { bad: true, key: 'neighbor_dead' });
        return { text: 'On a retrouvé le vieux Carl, de l\'immeuble d\'en face, mort de froid dans son fauteuil. Il saluait tout le monde chaque matin.', major: true };
      }
    },

    // ---------------------------------------------------------------- à choix
    colis: {
      weight: 2, minDay: 4, icon: 'pack', title: 'Colis humanitaire',
      cond: function () { return fittest() && G().present().length >= 2; },
      text: function (ctx) {
        return 'Un avion passe très bas au-dessus du quartier. Des caisses tombent sous des parachutes blancs, à quelques rues d\'ici.<br><br><i>Tout le quartier va se ruer dessus. Y aller, c\'est une journée dehors, sans protection.</i>';
      },
      choices: [
        { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' tenter sa chance'; }, run: function (ctx) {
            var got = R().chance(0.75) ? { conserve: R().int(2, 3), eau: R().int(1, 2), medicaments: R().chance(0.4) ? 1 : 0 } : {};
            G().sendAway(ctx.s, 'colis', got, 0.3);
            return first(ctx.s) + ' part en courant vers les parachutes. Il/elle reviendra ce soir.';
          } },
        { label: 'C\'est trop risqué', run: function () { return 'Vous regardez les parachutes disparaître derrière les toits.'; } }
      ]
    },

    decombres: {
      weight: 2, minDay: 3, icon: 'speech', title: 'Des cris dans les décombres',
      cond: function () { return fittest() && G().present().length >= 2; },
      text: function () {
        return 'Des hurlements montent de l\'immeuble voisin, effondré cette nuit. Quelqu\'un est coincé sous les gravats.<br><br><i>Aider, c\'est y passer la journée.</i>';
      },
      choices: [
        { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' aider'; }, run: function (ctx) {
            G().sendAway(ctx.s, 'decombres', R().chance(0.5) ? { bandage: 1, conserve: 1 } : { composants: 2, cigarettes: 2 }, 0.15);
            C.Story.thanks(ctx.st, 3, 'La femme tirée des décombres par ' + first(ctx.s) + ' est venue remercier, le bras en écharpe. Sa famille a laissé ce qu\'elle a pu sauver', { conserve: 1, eau: 2 }, 3);
            G().moralAll(6, { good: true, key: 'helped' });
            ctx.st.stats.helped++;
            return first(ctx.s) + ' attrape une barre de fer et sort en courant.';
          } },
        { label: 'Fermer les volets', run: function (ctx) {
            G().moralAll(-5, { bad: true, key: 'refused' });
            ctx.st.stats.refused++;
            return 'Les cris durent jusqu\'au soir. Puis ils s\'arrêtent.';
          } }
      ]
    },

    rodeurs: {
      weight: 3, minDay: 5, icon: 'shield', title: 'Des rôdeurs',
      text: function () {
        return 'Trois silhouettes tournent autour de la maison et testent les fenêtres, cherchant un moyen d\'entrer.';
      },
      choices: [
        { label: 'Faire du bruit, montrer qu\'on est nombreux', run: function (ctx) {
            var n = G().present().length, door = G().objectsOf('frontdoor')[0];
            var p = 0.35 + n * 0.12 + (door ? door.level * 0.12 : 0);
            if (R().chance(p)) return 'Des voix, des coups contre les planches : les rôdeurs préfèrent aller voir ailleurs.';
            return loot(ctx, 'Ils ne se laissent pas impressionner. L\'un d\'eux passe par une fenêtre et repart avec : ');
          } },
        { label: 'Tirer un coup en l\'air', req: { munitions: 1 },
          reqFn: function () { return G().count('munitions') > 0 && ['pistolet', 'pistolet_silencieux', 'fusil', 'fusil_pompe', 'fusil_assaut'].some(function (x) { return G().count(x) > 0; }); }, reqText: 'une arme à feu et 1 munition',
          run: function () {
            G().removeItems({ munitions: 1 });
            if (C.Audio.ready) C.Audio.sfx.gun();
            return 'La détonation résonne dans toute la rue. Les silhouettes détalent sans demander leur reste.';
          } },
        { label: 'Se cacher et attendre', run: function (ctx) {
            var holes = ctx.st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
            if (R().chance(0.3 + holes * 0.15)) return loot(ctx, 'Ils trouvent un passage par un trou du mur et repartent avec : ');
            return 'Après de longues minutes, les pas s\'éloignent. Personne n\'a respiré.';
          } }
      ]
    },

    enfant: {
      weight: 2, minDay: 3, icon: 'moral', title: 'Une enfant perdue',
      cond: function () { return G().present().length >= 1; },
      text: function () {
        return 'Une fillette de six ou sept ans pleure devant la maison. Elle cherche ses parents, séparés d\'elle pendant les bombardements de la nuit.';
      },
      choices: [
        { label: function (ctx) { return first(ctx.s) + ' la raccompagne au centre de réfugiés'; }, reqFn: function (ctx) { return !!ctx.s && G().present().length >= 2; }, reqText: 'au moins deux survivants au refuge',
          run: function (ctx) {
            G().sendAway(ctx.s, 'enfant', {}, 0.1);
            C.Story.thanks(ctx.st, 3, 'Les parents de la fillette perdue ont retrouvé le refuge. Ils sont venus remercier ' + first(ctx.s) + ' et ont laissé ce qu\'ils pouvaient', { conserve: 1, sucre: 2 }, 4);
            G().moralAll(10, { good: true, key: 'helped' });
            ctx.st.stats.helped++;
            return first(ctx.s) + ' prend la petite main dans la sienne. Ils partent vers le centre-ville.';
          } },
        { label: 'Lui donner à manger et lui indiquer le chemin', req: { conserve: 1 }, run: function (ctx) {
            G().removeItems({ conserve: 1 });
            G().moralAll(4, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 4, 'La fillette perdue a retrouvé ses parents. Sa mère a déposé un petit sac devant la porte, avec un dessin', { sucre: 1, herbes: 1 }, 3);
            return 'Elle serre la boîte contre elle et s\'éloigne, toute petite dans la rue en ruine.';
          } },
        { label: 'Fermer la porte', run: function (ctx) {
            G().moralAll(-8, { bad: true, key: 'refused' });
            ctx.st.stats.refused++;
            return 'Ses pleurs s\'éloignent lentement. Personne ne parle pendant des heures.';
          } }
      ]
    },

    pain: {
      weight: 2, minDay: 3, icon: 'radio', title: 'Distribution de pain',
      cond: function () { return G().countBuilt('radio') > 0 && fittest() && G().present().length >= 2; },
      text: function () {
        return 'La radio annonce une distribution de pain et de légumes sur la place du marché, aujourd\'hui seulement.<br><br><i>La place est à découvert. Les tireurs le savent aussi.</i>';
      },
      choices: [
        { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' faire la queue'; }, run: function (ctx) {
            G().sendAway(ctx.s, 'pain', { legumes: R().int(2, 3), conserve: 1 }, 0.2);
            return first(ctx.s) + ' enfile son manteau et se glisse dehors.';
          } },
        { label: 'Rester à l\'abri', run: function () { return 'Vous éteignez la radio.'; } }
      ]
    },

    // ---------------------------------------------------------------- nouveaux événements
    chat: {
      weight: 2, minDay: 4, icon: 'moral', title: 'Un chat errant',
      cond: function (st) { return !(st.flags.catUntil > st.day); },
      run: function (ctx) {
        ctx.st.flags.catUntil = ctx.st.day + 6;
        G().moralAll(3, { good: true });
        var s = anyone(); if (s) C.Mood.say(s, 'Regardez qui est là… Viens, minou.');
        return { text: 'Un chat maigre s\'est glissé par un trou du mur. Il a décidé de rester. Les rats n\'ont qu\'à bien se tenir, et chacun trouve une excuse pour le caresser.' };
      }
    },
    dispute: {
      weight: 2, minDay: 4, icon: 'moral', title: 'Une dispute',
      cond: function () { var l = G().present(); return l.length >= 2 && l.some(function (s) { return s.moral < 50; }); },
      run: function () {
        var l = R().shuffle(G().present().slice()), a = l[0], b = l[1];
        var calm = G().present().filter(function (s) { return G().hasTrait(s, 'empathique') && s !== a && s !== b; })[0];
        var k = calm ? 1 : 4;
        a.moral = Math.max(0, a.moral - k); b.moral = Math.max(0, b.moral - k);
        C.Mood.say(a, R().pick(['C\'est toujours moi qui fais tout, ici !', 'Tu crois que je ne t\'ai pas vu manger en douce ?', 'Arrête de me donner des ordres !']));
        setTimeout(function () { C.Mood.say(b, R().pick(['Parce que toi, tu fais quelque chose ?', 'Tu n\'es pas mon chef.', 'Laisse-moi tranquille.'])); }, 1600);
        return { text: first(a) + ' et ' + first(b) + ' se sont disputés pour une histoire de ration. Les voix ont porté dans toute la maison.' + (calm ? ' ' + first(calm) + ' a fini par les calmer.' : ' Personne n\'a osé s\'en mêler.') };
      }
    },
    gel: {
      weight: 3, minDay: 2, icon: 'cold', title: 'Le collecteur a gelé',
      cond: function (st) { return C.World.isWinter(st) && G().countBuilt('collector') > 0; },
      run: function () {
        G().objectsOf('collector').forEach(function (o) { o.water = 0; });
        G().markDirty();
        return { text: 'Cette nuit, l\'eau du collecteur a gelé d\'un bloc et fendu le tonneau de glace. Ce qu\'il contenait est perdu.' };
      }
    },
    passant: {
      weight: 2, minDay: 5, icon: 'alert', title: 'Un passant touché',
      text: function () { return 'Un coup de feu claque dans la rue. Un homme s\'effondre juste devant la maison, touché à la jambe. Il rampe vers votre porte en appelant à l\'aide.<br><br><i>Le tireur est peut-être encore là.</i>'; },
      choices: [
        { label: function (ctx) { return ctx.s ? 'Envoyer ' + first(ctx.s) + ' le tirer à l\'intérieur' : 'Le tirer à l\'intérieur'; }, run: function (ctx) {
            var s = ctx.s, txt = '';
            if (s && R().chance(0.3)) { s.wound = Math.min(95, s.wound + R().int(18, 32)); txt = 'Une balle siffle : ' + first(s) + ' est touché(e) en le traînant. '; }
            G().moralAll(6, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            if (G().count('bandage') > 0 && R().chance(0.8)) {
              G().removeItems({ bandage: 1 }); G().addItems({ conserve: 1, cigarettes: 2 });
              return txt + 'On lui fait un pansement serré. Au crépuscule, il repart en boitant et laisse ce qu\'il avait : 1 conserve, 2 cigarettes.';
            }
            return txt + 'Sans bandage, on ne peut que le serrer contre soi pendant qu\'il perd son sang. Il meurt avant midi.';
          } },
        { label: 'Rester à l\'abri', run: function (ctx) {
            G().moralAll(-6, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            return 'Ses appels faiblissent, puis s\'arrêtent. Personne ne parle pendant un long moment.';
          } }
      ]
    },
    obus: {
      weight: 2, minDay: 6, icon: 'alert', title: 'Un obus non explosé',
      text: function () { return 'Un obus a traversé le toit sans exploser. Il est planté dans le plancher, à moitié enfoncé, et ne bouge plus.<br><br><i>Désamorcé, il donnerait de la poudre et du métal. Mal désamorcé…</i>'; },
      choices: [
        { label: function (ctx) { return ctx.s ? first(ctx.s) + ' tente de le désamorcer' : 'Tenter de le désamorcer'; }, run: function (ctx) {
            var tinker = G().present().some(function (s) { return G().hasTrait(s, 'bricoleur') || G().hasTrait(s, 'econome'); });
            if (R().chance(tinker ? 0.85 : 0.6)) {
              G().addItems({ composants: 3, pieces_meca: 1, munitions: 4 });
              G().moralAll(2, { good: true });
              return 'Des mains qui tremblent, une heure sans respirer… Le détonateur vient. De quoi récupérer : 3 composants, 1 pièce mécanique, 4 munitions.';
            }
            var s = ctx.s || anyone();
            if (C.Render) C.Render.shake(12);
            if (C.Audio.ready) C.Audio.sfx.shell(1);
            if (s) s.wound = Math.min(95, s.wound + R().int(30, 45));
            G().moralAll(-4, { key: 'shelling' });
            return 'Un déclic de trop. L\'explosion souffle la pièce. ' + (s ? first(s) + ' est grièvement blessé(e).' : '');
          } },
        { label: 'Le laisser et condamner la pièce', run: function () {
            G().moralAll(-2, {});
            return 'On pose des planches autour. Tout le monde fait un détour pour ne pas passer à côté.';
          } }
      ]
    },
    eau_voisins: {
      weight: 2, minDay: 3, icon: 'hunger', title: 'Les voisins ont soif',
      cond: function () { return G().countBuilt('collector') > 0 && G().count('eau') >= 2; },
      text: function () { return 'Une famille de l\'immeuble voisin a vu votre collecteur. Le père tend deux bouteilles vides.<br>« Il n\'y a plus d\'eau aux bornes. Juste de quoi tenir aujourd\'hui… »'; },
      choices: [
        { label: 'Leur donner 2 eau', req: { eau: 2 }, run: function (ctx) { G().removeItems({ eau: 2 }); G().moralAll(5, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          C.Story.thanks(ctx.st, 3, 'La famille d\'à côté n\'a pas oublié l\'eau : le père est venu avec ce qu\'il avait récupéré sur les chantiers', { composants: 3, bois: 2 });
          return 'Ils repartent en serrant les bouteilles pleines. « On n\'oubliera pas. »'; } },
        { label: 'Refuser', run: function (ctx) { G().moralAll(-3, { bad: true, key: 'refused' }); ctx.st.stats.refused++; return 'Le père hoche la tête et s\'en va. Il y a des jours où il faut penser aux siens.'; } }
      ]
    }
  };

  // Pillage de jour : une partie de la réserve disparaît
  function loot(ctx, prefix) {
    var stolen = {};
    Object.keys(ctx.st.inventory).forEach(function (k) {
      if (R().chance(0.35)) { var n = Math.ceil(ctx.st.inventory[k] * R().range(0.15, 0.35)); if (n > 0) stolen[k] = Math.min(n, ctx.st.inventory[k]); }
    });
    G().removeItems(stolen);
    G().moralAll(-4, { key: 'raided' });
    return prefix + (Object.keys(stolen).length ? its(stolen) : 'presque rien') + '.';
  }

  C.DayEvents = { fittest: fittest };
})(window.CQR);
