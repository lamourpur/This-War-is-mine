/* =========================================================
   Visiteurs qui frappent à la porte pendant la journée
   Chaque visiteur : poids, jour minimum, texte, choix.
   Un choix : label, req (objets exigés), run(ctx) -> texte de résultat
   ctx = { st, v (visiteur), s (survivant qui a ouvert) }
   ========================================================= */
(function (C) {
  'use strict';

  function G() { return C.Game; }
  function U() { return C.util; }

  C.VISITORS = {
    // Sonny : il repasse tous les 3 à 5 jours (C.Market), jamais tiré au hasard
    marchand: {
      weight: 0, minDay: 2, scheduled: true, bye: 'Bonne chance dehors. Je repasse dans trois jours.',
      title: 'Sonny, le marchand',
      text: function (ctx) {
        var st = ctx.st, m = st.market || {}, sh = C.Market && C.Market.current(st);
        var t = (m.frankoVisits || 0) <= 1
          ? 'Un homme sec, un gros sac sur le dos, jette un œil par-dessus votre épaule.<br>« Sonny. Je passe de temps en temps dans le quartier. J\'ai de quoi faire affaire, si vous avez de quoi payer. »'
          : 'Sonny est de retour, son gros sac sur le dos.<br>« Alors, toujours vivants ? Bien. J\'ai de la marchandise. »';
        if (sh) t += '<br><br>« ' + ({
          medic: 'Des médicaments ? Introuvables en ce moment. Si vous en avez, je vous les paie au prix fort.',
          vivres: 'La bouffe, c\'est de l\'or en ce moment. Je n\'en ai presque plus. Mais j\'achète.',
          munitions: 'Avec ce qui se passe en ville, tout le monde veut des balles. Ça se paie.',
          tabac: 'Des cigarettes, du café ? Plus rien nulle part. Pour un paquet, on vous donne n\'importe quoi.',
          eau: 'L\'eau est coupée. Une bouteille propre vaut une fortune.',
          pieces: 'Tout ce qui est mécanique ou électrique, je prends. Et je paie bien.',
          froid: 'Avec ce froid, le bois part plus vite que le pain. J\'en ai un peu, mais c\'est cher.'
        }[sh.id] || 'Il y a pénurie de tout.') + ' »';
        return t;
      },
      init: function (st, R) { return { stock: C.Trade.genTraderStock(st, R) }; },
      choices: [
        { label: 'Faire du troc', trade: true },
        { label: 'Refermer la porte', run: function () { return 'Le marchand hausse les épaules et s\'éloigne dans les décombres.'; } }
      ]
    },

    voisin_aide: {
      weight: 3, minDay: 3,
      title: 'Un voisin demande de l\'aide',
      text: function (ctx) {
        return 'Walt, le voisin d\'en face, a le visage couvert de poussière.<br>« Un obus a éventré mon mur. Si je ne le rebouche pas avant ce soir, on ne passera pas la nuit. Quelqu\'un peut m\'aider ? »<br><br><i>Le survivant envoyé sera absent jusqu\'à la tombée de la nuit.</i>';
      },
      choices: [
        { label: function (ctx) { return 'Envoyer ' + ctx.s.name.split(' ')[0] + ' l\'aider'; },
          run: function (ctx) {
            G().sendAway(ctx.s, 'voisin');
            G().moralAll(8, { good: true, key: 'helped' });
            ctx.st.stats.helped++;
            return ctx.s.name.split(' ')[0] + ' part avec Walt. Le groupe se sent un peu plus humain.';
          } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-4, { bad: true, key: 'refused' });
            ctx.st.stats.refused++;
            return 'Walt hoche la tête sans un mot et repart. Personne n\'ose se regarder.';
          } }
      ]
    },

    enfants: {
      weight: 3, minDay: 2,
      title: 'Des enfants à la porte',
      text: function () {
        return 'Deux enfants maigres, frère et sœur peut-être. La plus grande parle pour les deux :<br>« Notre maman est malade. Vous auriez un peu d\'eau ? Ou quelque chose à manger ? »';
      },
      choices: [
        { label: 'Donner 2 eau', req: { eau: 2 }, run: function (ctx) {
            G().removeItems({ eau: 2 }); G().moralAll(9, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 3, 'Les deux enfants de l\'autre jour sont revenus, avec leur mère, debout cette fois. Ils ont laissé devant la porte ce qu\'ils avaient trouvé dans les ruines', { composants: 2, bois: 2 });
            return 'Les enfants repartent en serrant les bouteilles contre eux. Un sourire, enfin.';
          } },
        { label: 'Donner 1 conserve', req: { conserve: 1 }, run: function (ctx) {
            G().removeItems({ conserve: 1 }); G().moralAll(9, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 3, 'Les deux enfants de l\'autre jour sont revenus, avec leur mère, debout cette fois. Ils ont laissé devant la porte ce qu\'ils avaient trouvé dans les ruines', { composants: 2, bois: 2 });
            return '« Merci… merci ! » Ils disparaissent en courant.';
          } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-7, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            return 'Vous fermez la porte. Leurs pas s\'éloignent lentement. Ce bruit restera longtemps.';
          } }
      ]
    },

    blesse: {
      weight: 2, minDay: 4,
      title: 'Un homme blessé',
      text: function () {
        return 'Un homme s\'appuie contre le chambranle, la main pressée sur son flanc ensanglanté.<br>« Un bandage… n\'importe quoi… je vous en prie. »';
      },
      choices: [
        { label: 'Donner un bandage', req: { bandage: 1 }, run: function (ctx) {
            G().removeItems({ bandage: 1 }); G().moralAll(10, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            var gift = C.R.chance(0.5);
            if (gift) { G().addItems({ cigarettes: 2 }); return 'Il vous remercie et vous laisse, gêné, deux cigarettes. « C\'est tout ce que j\'ai. » (+2 cigarettes)'; }
            C.Story.thanks(ctx.st, 2, 'L\'homme blessé à qui vous aviez donné un bandage est repassé, debout. Il a laissé quelque chose sur le pas de la porte, avec un mot : « Merci »', { munitions: 3, cigarettes: 1 });
            return 'Il vous remercie mille fois et repart en boitant. « Je reviendrai. »';
          } },
        { label: 'Donner des médicaments', req: { medicaments: 1 }, run: function (ctx) {
            G().removeItems({ medicaments: 1 }); G().moralAll(12, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 3, 'L\'homme blessé est revenu, guéri. Il fait partie de la milice du quartier, et il n\'a pas oublié', { munitions: 5, cigarettes: 2 });
            return '« Que Dieu vous garde. Je ne l\'oublierai pas. » Il repart un peu plus droit.';
          } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-6, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            return 'Vous refermez. Plus tard, on entend quelqu\'un tousser longtemps dans la rue. Puis plus rien.';
          } }
      ]
    },

    refugie: {
      weight: 2, minDay: 5,
      canAppear: function (st) { return G().alive().length < 5 && G().availableRecruits().length > 0; },
      init: function (st, R) { return { recruit: R.pick(G().availableRecruits()).id }; },
      title: 'Quelqu\'un cherche un abri',
      text: function (ctx) {
        var d = C.survivorDef(ctx.v.data.recruit);
        var traits = d.traits.map(function (t) { return C.TRAITS[t].name; }).join(', ');
        return '<b>' + d.name + '</b>, ' + d.age + ' ans, ' + d.job.toLowerCase() + '.<br>« Ma maison a brûlé. Je n\'ai plus nulle part où aller. Je peux être utile, je vous le jure. »<br><br><i>' + d.bio + '</i><br><br>Traits : ' + traits + '<br><i>Une bouche de plus à nourrir.</i>';
      },
      choices: [
        { label: 'L\'accueillir', run: function (ctx) {
            var d = C.survivorDef(ctx.v.data.recruit);
            var ns = G().addSurvivor(d.id);
            G().moralAll(5, { good: true, key: 'accepted' });
            var nw = ns || G().st.survivors.filter(function (x) { return (x.defId || x.id) === d.id; })[0];
            if (nw) C.Surv.bio(nw, 'J\'ai frappé à leur porte, sans rien. Ils m\'ont ouvert. Je ne l\'oublierai pas.');
            return d.name + ' pose son maigre baluchon dans un coin. Le refuge compte une personne de plus.';
          } },
        { label: 'Refuser', run: function () {
            G().moralAll(-3, { bad: true, key: 'refused' });
            return 'Vous secouez la tête. La silhouette s\'éloigne sous la pluie de cendres.';
          } }
      ]
    },

    milice: {
      weight: 2, minDay: 6,
      title: 'Des hommes armés',
      text: function () {
        return 'Trois hommes en treillis dépareillés, fusils en bandoulière.<br>« Contribution pour la protection du quartier. Trois rations. Sinon, on ne répond plus de rien, cette nuit. »';
      },
      choices: [
        { label: 'Payer (3 vivres)', reqFn: function () { return G().foodCount() >= 3; }, reqText: '3 vivres',
          run: function () {
            G().payFood(3);
            return 'Ils prennent les rations sans un merci et s\'en vont frapper à la porte suivante.';
          } },
        { label: 'Refuser', run: function (ctx) {
            ctx.st.raidBonus = (ctx.st.raidBonus || 0) + 0.35;
            return '« Comme vous voudrez. » Le plus grand crache par terre. Il faudra monter la garde, cette nuit.';
          } }
      ]
    },

    vieille_dame: {
      weight: 2, minDay: 4,
      title: 'Une vieille dame',
      text: function () {
        return 'Une femme âgée, très digne dans un manteau trop grand.<br>« Mon mari a de la fièvre depuis quatre jours. J\'ai ceci… » Elle ouvre la main : des bagues, une broche. « Pour des médicaments. »';
      },
      choices: [
        { label: 'Échanger 1 médicaments contre ses bijoux', req: { medicaments: 1 }, run: function (ctx) {
            G().removeItems({ medicaments: 1 }); G().addItems({ bijoux: 3 }); G().moralAll(4, { good: true, key: 'helped' });
            return 'Elle vous presse les mains. Les bijoux pèsent étrangement lourd dans votre poche.';
          } },
        { label: 'Lui donner 1 médicaments', req: { medicaments: 1 }, run: function (ctx) {
            G().removeItems({ medicaments: 1 }); G().moralAll(12, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 3, 'La vieille dame est revenue : son mari est guéri. Elle a glissé sa broche sous la porte, avec un mot : « Vous l\'avez méritée »', { bijoux: 1, cafe: 1 });
            return '« Gardez vos bijoux », dites-vous. Elle pleure. Vous aussi, un peu.';
          } },
        { label: 'Donner 1 remède aux plantes', req: { remede: 1 }, run: function (ctx) {
            G().removeItems({ remede: 1 }); G().addItems({ bijoux: 1 }); G().moralAll(5, { good: true, key: 'helped' });
            return '« C\'est mieux que rien. Merci. » Elle vous laisse une bague.';
          } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-3, { bad: true, key: 'refused' });
            return 'Elle referme la main et s\'en va, très droite.';
          } }
      ]
    },

    troc_voisin: {
      weight: 3, minDay: 2,
      init: function (st, R) {
        var offers = [
          { give: { bois: 4 }, want: { conserve: 1 } },
          { give: { composants: 4 }, want: { eau: 2 } },
          { give: { herbes: 3 }, want: { bois: 3 } },
          { give: { cafe: 1 }, want: { composants: 3 } },
          { give: { pieces_meca: 1 }, want: { cigarettes: 2 } },
          { give: { bandage: 1 }, want: { legumes: 2 } },
          { give: { sucre: 2 }, want: { livres: 3 } },
          { give: { engrais: 2 }, want: { bois: 3 } }
        ];
        return { offer: R.pick(offers) };
      },
      title: 'Une voisine propose un échange',
      text: function (ctx) {
        var o = ctx.v.data.offer;
        return 'Dana, du troisième, tient un sac contre elle.<br>« J\'ai <b>' + C.util.costText(o.give) + '</b>. Je les échangerais bien contre <b>' + C.util.costText(o.want) + '</b>. »';
      },
      choices: [
        { label: 'Accepter l\'échange', reqFn: function (ctx) { return G().has(ctx.v.data.offer.want); },
          reqText: function (ctx) { return C.util.costText(ctx.v.data.offer.want); },
          run: function (ctx) {
            G().removeItems(ctx.v.data.offer.want); G().addItems(ctx.v.data.offer.give);
            return 'Marché conclu. Dana repart satisfaite.';
          } },
        { label: 'Décliner', run: function () { return '« Tant pis. Une autre fois, peut-être. »'; } }
      ]
    },

    // ---------------------------------------------------------------- visiteurs du jeu d'origine
    // Un voisin emprunte un outil pour dégager des décombres ; il le rapporte
    // (le plus souvent) avec un petit cadeau.
    voisin_outil: {
      weight: 3, minDay: 3,
      init: function (st, R) {
        var have = ['pelle', 'pied_de_biche'].filter(function (t) { return G().count(t) > 0; });
        return { tool: have.length ? R.pick(have) : R.pick(['pelle', 'pied_de_biche']), back: R.chance(0.8) };
      },
      title: 'Un voisin a besoin d\'un outil',
      text: function (ctx) {
        var t = C.ITEMS[ctx.v.data.tool].name.toLowerCase();
        return 'Nate, de la maison au coin, est couvert de plâtre.<br>« Le plafond de la cave s\'est effondré. Ma femme est coincée dessous, je l\'entends appeler. Vous auriez <b>' + (ctx.v.data.tool === 'pelle' ? 'une pelle' : 'un pied-de-biche') + '</b> ? Je vous la rapporte, je vous le jure. »'.replace('vous la rapporte', ctx.v.data.tool === 'pelle' ? 'vous la rapporte' : 'vous le rapporte');
      },
      choices: [
        { label: function (ctx) { return 'Prêter : ' + C.ITEMS[ctx.v.data.tool].name.toLowerCase(); },
          reqFn: function (ctx) { return G().count(ctx.v.data.tool) > 0; },
          reqText: function (ctx) { return '1 ' + C.ITEMS[ctx.v.data.tool].name.toLowerCase(); },
          run: function (ctx) {
            var d = ctx.v.data, o = {}; o[d.tool] = 1;
            G().removeItems(o);
            G().moralAll(6, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            if (d.back) C.Story.next(ctx.st, 'voisin_outil_retour', 2, { tool: d.tool });
            else C.Story.news(ctx.st, 3, 'Nate n\'a jamais rapporté l\'outil. On dit qu\'il est parti vers le sud avec sa femme, sur une charrette.', -2, 'refused');
            return 'Nate repart en courant, l\'outil serré contre lui. « Merci ! Merci… »';
          } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-5, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            if (C.R.chance(0.5)) C.Story.news(ctx.st, 1, 'Nate a creusé à mains nues toute la nuit. Sa femme n\'a pas survécu.', -6, 'death_neighbor');
            return 'Nate vous regarde un long moment, puis s\'en va sans un mot.';
          } }
      ]
    },
    voisin_outil_retour: {
      story: true, title: 'Nate rapporte l\'outil',
      text: function (ctx) {
        return 'Nate est là, avec une femme au bras en écharpe.<br>« Voilà votre ' + C.ITEMS[ctx.v.data.tool].name.toLowerCase() + '. Et ça, c\'est pour vous. Sans vous… »';
      },
      choices: [
        { label: 'Merci, Nate', run: function (ctx) {
            var o = {}; o[ctx.v.data.tool] = 1; o.conserve = 2; o.cigarettes = 2;
            G().addItems(o); G().moralAll(8, { good: true, key: 'helped' });
            return 'Nate rend l\'outil et laisse deux conserves et deux cigarettes sur le pas de la porte. (+ outil, +2 conserves, +2 cigarettes)';
          } }
      ],
      onMissed: function (st, data) {
        var o = {}; o[(data && data.tool) || 'pelle'] = 1;
        G().addItems(o);
        C.Story.news(st, 0, 'Nate est passé en journée. Personne n\'a ouvert : il a laissé votre outil devant la porte.', 2, 'helped');
      }
    },

    // Une mère et son bébé
    mere_bebe: {
      weight: 3, minDay: 2,
      title: 'Une mère et son bébé',
      text: function () {
        return 'Une jeune femme serre un nourrisson emmailloté contre sa poitrine. Il ne pleure même plus.<br>« Je n\'ai plus de lait. Plus rien. Juste un peu de sucre, ou de l\'eau… n\'importe quoi. »';
      },
      choices: [
        { label: 'Donner 2 sucre', req: { sucre: 2 }, run: function (ctx) { G().removeItems({ sucre: 2 }); G().moralAll(9, { good: true, key: 'helped' }); ctx.st.stats.helped++; C.Story.thanks(ctx.st, 4, 'La jeune mère est repassée avec son bébé, qui a repris des joues. Elle a laissé ce qu\'elle a pu', { herbes: 2, bandage: 1 }); return 'Elle fond en larmes. « Il va pouvoir tenir. Merci. Merci. »'; } },
        { label: 'Donner 1 conserve', req: { conserve: 1 }, run: function (ctx) { G().removeItems({ conserve: 1 }); G().moralAll(8, { good: true, key: 'helped' }); ctx.st.stats.helped++; C.Story.thanks(ctx.st, 4, 'La jeune mère est repassée avec son bébé, qui a repris des joues. Elle a laissé ce qu\'elle a pu', { herbes: 2, bandage: 1 }); return 'Elle cache la conserve sous son manteau, comme un trésor, et disparaît dans la rue.'; } },
        { label: 'Donner 2 eau', req: { eau: 2 }, run: function (ctx) { G().removeItems({ eau: 2 }); G().moralAll(6, { good: true, key: 'helped' }); ctx.st.stats.helped++; C.Story.thanks(ctx.st, 4, 'La jeune mère est repassée avec son bébé, qui a repris des joues. Elle a laissé ce qu\'elle a pu', { herbes: 2, bandage: 1 }); return '« C\'est déjà ça. Que Dieu vous garde. »'; } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-7, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            return 'Elle ne dit rien. Elle berce l\'enfant et s\'en va. Personne n\'ose parler pendant un long moment.';
          } }
      ]
    },

    // Un père dont le fils a de la fièvre
    pere_medic: {
      weight: 2, minDay: 5,
      title: 'Un père désespéré',
      text: function () {
        return 'Un homme aux yeux rouges, qui n\'a pas dormi depuis des jours.<br>« Mon fils a de la fièvre. Quarante, depuis trois jours. L\'hôpital n\'a plus rien. Des médicaments… je vous en supplie. »';
      },
      choices: [
        { label: 'Donner des médicaments', req: { medicaments: 1 }, run: function (ctx) {
            G().removeItems({ medicaments: 1 }); G().moralAll(9, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 3, 'Le père au garçon fiévreux est repassé : son fils est sauvé. Il a laissé devant la porte des légumes de son jardin', { legumes: 3 }, 4);
            return 'Il vous embrasse les mains. « Je n\'oublierai jamais. Jamais. »';
          } },
        { label: 'Donner un remède aux plantes', req: { remede: 1 }, run: function (ctx) {
            G().removeItems({ remede: 1 }); G().moralAll(5, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            if (C.R.chance(0.4)) C.Story.news(ctx.st, 3, 'On a vu passer un petit cercueil dans la rue. Le remède n\'a pas suffi.', -6, 'death_neighbor');
            else C.Story.thanks(ctx.st, 3, 'Le père au garçon fiévreux est repassé : le remède a suffi, de justesse. Il a laissé des légumes devant la porte', { legumes: 2 }, 3);
            return '« C\'est tout ce que vous avez ? … Merci quand même. »';
          } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-7, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            if (C.R.chance(0.6)) C.Story.news(ctx.st, 3, 'On a vu passer un petit cercueil dans la rue. Le père marchait derrière, seul.', -8, 'death_neighbor');
            return 'L\'homme s\'effondre sur le seuil, puis se relève et s\'en va frapper à la porte d\'à côté.';
          } }
      ]
    },

    // Un colporteur de passage (autre que Sonny)
    colporteur: {
      weight: 2, minDay: 4,
      init: function (st, R) {
        var full = C.Trade.genTraderStock(st, R), keys = R.shuffle(Object.keys(full)).slice(0, 5), stock = {};
        keys.forEach(function (k) { stock[k] = full[k]; });
        return { stock: stock };
      },
      title: 'Un colporteur',
      text: function () { return 'Un petit homme nerveux ouvre un imperméable doublé de poches.<br>« Pas le temps de discuter, les patrouilles passent dans dix minutes. Vous achetez ou pas ? »'; },
      choices: [
        { label: 'Faire du troc', trade: true },
        { label: 'Refermer la porte', run: function () { return 'Il file déjà vers la maison suivante.'; } }
      ]
    },

    // Un gamin qui propose ses trouvailles contre à manger
    gamin_troc: {
      weight: 2, minDay: 3,
      init: function (st, R) {
        return { offer: R.pick([
          { give: { bijoux: 1 }, want: { conserve: 1 } },
          { give: { cigarettes: 3 }, want: { legumes: 2 } },
          { give: { livres: 3 }, want: { sucre: 1 } },
          { give: { munitions: 3 }, want: { conserve: 1 } },
          { give: { cafe: 1 }, want: { eau: 2 } }
        ]) };
      },
      title: 'Un gamin propose ses trouvailles',
      text: function (ctx) {
        var o = ctx.v.data.offer;
        return 'Un garçon d\'une douzaine d\'années, les poches pleines, sourit de toutes ses dents manquantes.<br>« Regardez ce que j\'ai trouvé ! <b>' + C.util.costText(o.give) + '</b>. Je vous l\'échange contre <b>' + C.util.costText(o.want) + '</b>. C\'est pour ma petite sœur. »';
      },
      choices: [
        { label: 'Échanger', reqFn: function (ctx) { return G().has(ctx.v.data.offer.want); }, reqText: function (ctx) { return C.util.costText(ctx.v.data.offer.want); },
          run: function (ctx) { G().removeItems(ctx.v.data.offer.want); G().addItems(ctx.v.data.offer.give); G().moralAll(2, { good: true }); return 'Le gamin repart en sautillant.'; } },
        { label: 'Lui donner sans rien prendre', reqFn: function (ctx) { return G().has(ctx.v.data.offer.want); }, reqText: function (ctx) { return C.util.costText(ctx.v.data.offer.want); },
          run: function (ctx) {
            G().removeItems(ctx.v.data.offer.want); G().moralAll(7, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 2, 'Le gamin aux trouvailles est repassé en courant. Il a posé un paquet sur le pas de la porte, « pour vous, de la part de ma sœur »', U().copy(ctx.v.data.offer.give), 2);
            return '« Pour de vrai ? » Il garde sa trouvaille et s\'enfuit en riant.';
          } },
        { label: 'Le renvoyer', run: function () { return 'Il hausse les épaules. « Tant pis pour vous ! »'; } }
      ]
    },

    // L'hiver : un vieil homme qui n'a plus de quoi se chauffer
    vieux_froid: {
      weight: function (st) { return C.World.isWinter(st) ? 5 : 0; }, minDay: 5,
      canAppear: function (st) { return C.World.isWinter(st); },
      title: 'Un vieil homme transi',
      text: function () {
        return 'Un vieil homme, les lèvres bleues, grelotte sous trois manteaux.<br>« Je brûle mes livres depuis une semaine. Il ne m\'en reste plus. Un peu de bois… juste de quoi passer la nuit. »';
      },
      choices: [
        { label: 'Donner 3 bois', req: { bois: 3 }, run: function (ctx) { G().removeItems({ bois: 3 }); G().moralAll(8, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            C.Story.thanks(ctx.st, 3, 'Le vieil homme transi a passé l\'hiver, grâce à votre bois. Il est venu frapper à la porte avec la dernière bouteille de sa cave et un livre qu\'il n\'a pas voulu brûler', { alcool: 1, livres: 1 });
            return 'Il serre les bûches contre lui comme on serre un enfant. « Vous êtes bons. »'; } },
        { label: 'Refuser', run: function (ctx) {
            G().moralAll(-6, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
            if (C.R.chance(0.5)) C.Story.news(ctx.st, 1, 'Le vieil homme qui demandait du bois a été retrouvé mort de froid dans son appartement.', -7, 'neighbor_dead');
            return 'Il hoche la tête et repart à petits pas dans la neige.';
          } }
      ]
    }
  };

  // Nouvelles de la radio
  C.NEWS_FILLER = [
    'Les combats continuent dans le quartier nord. Les civils sont priés de rester à l\'abri.',
    'Un convoi humanitaire aurait été bloqué à l\'entrée de la ville.',
    'Les autorités appellent au calme. Personne n\'y croit.',
    'Les coupures d\'eau se prolongent dans tous les secteurs.',
    'Le pont de la rivière a été détruit cette nuit.',
    'Un bombardement a touché le marché central. Le bilan est lourd.'
  ];
})(window.CQR);
