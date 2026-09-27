/* =========================================================
   Visiteurs qui frappent à la porte pendant la journée
   Chaque visiteur : poids, jour minimum, texte, choix.
   Un choix : label, req (objets exigés), run(ctx) -> texte de résultat
   ctx = { st, v (visiteur), s (survivant qui a ouvert) }
   ========================================================= */
(function (C) {
  'use strict';

  function G() { return C.Game; }

  C.VISITORS = {
    // Franko : il repasse tous les 3 à 5 jours (C.Market), jamais tiré au hasard
    marchand: {
      weight: 0, minDay: 2, scheduled: true,
      title: 'Franko, le marchand',
      text: function (ctx) {
        var st = ctx.st, m = st.market || {}, sh = C.Market && C.Market.current(st);
        var t = (m.frankoVisits || 0) <= 1
          ? 'Un homme sec, un gros sac sur le dos, jette un œil par-dessus votre épaule.<br>« Franko. Je passe de temps en temps dans le quartier. J\'ai de quoi faire affaire, si vous avez de quoi payer. »'
          : 'Franko est de retour, son gros sac sur le dos.<br>« Alors, toujours vivants ? Bien. J\'ai de la marchandise. »';
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
            return 'Les enfants repartent en serrant les bouteilles contre eux. Un sourire, enfin.';
          } },
        { label: 'Donner 1 conserve', req: { conserve: 1 }, run: function (ctx) {
            G().removeItems({ conserve: 1 }); G().moralAll(9, { good: true, key: 'helped' }); ctx.st.stats.helped++;
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
            if (gift) { G().addItems({ cigarettes: 2 }); return 'Il vous remercie et vous laisse, gêné, deux cigarettes. « C\'est tout ce que j\'ai. »'; }
            return 'Il vous remercie mille fois et repart en boitant.';
          } },
        { label: 'Donner des médicaments', req: { medicaments: 1 }, run: function (ctx) {
            G().removeItems({ medicaments: 1 }); G().moralAll(12, { good: true, key: 'helped' }); ctx.st.stats.helped++;
            return '« Que Dieu vous garde. » Il repart un peu plus droit.';
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
            G().addSurvivor(d.id);
            G().moralAll(5, { good: true, key: 'accepted' });
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
