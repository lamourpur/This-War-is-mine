/* =========================================================
   Histoires sur plusieurs jours (comme les récits de This War of Mine)
   Une histoire commence par un visiteur (une seule fois par partie),
   puis vos choix programment la suite quelques jours plus tard :
   un nouveau visiteur (C.Story.next) ou une nouvelle apprise au matin
   (C.Story.news, via st.flags.later).
   Les étapes sont des visiteurs comme les autres (C.VISITORS) marqués
   story: true : ils ne sortent jamais au hasard, seulement quand l'histoire
   les programme. onMissed : si personne n'ouvre la porte.
   ========================================================= */
(function (C) {
  'use strict';

  function G() { return C.Game; }
  function R() { return C.R; }
  function first(s) { return s.name.split(' ')[0]; }

  var Story = C.Story = {};
  function init(st) { st.story = st.story || {}; st.storyQueue = st.storyQueue || []; }
  Story.state = function (st, id) { init(st); return (st.story[id] = st.story[id] || {}); };
  // Programme l'étape « step » dans « days » jours
  Story.next = function (st, step, days, data) {
    init(st);
    st.storyQueue.push({ step: step, day: st.day + days, data: data || {} });
  };
  // Nouvelle apprise au matin, dans « days » jours
  Story.news = function (st, days, text, moral, key) {
    (st.flags.later = st.flags.later || []).push({ day: st.day + days, text: text, moral: moral || 0, key: key || 'refused' });
  };
  // Quelqu'un qu'on a aidé revient remercier dans « days » jours, avec un
  // cadeau (ajouté à la réserve ; le rapport du matin le dit, section « back »)
  Story.thanks = function (st, days, text, items, moral) {
    (st.flags.later = st.flags.later || []).push({ day: st.day + days, text: text, moral: moral == null ? 3 : moral, key: 'helped', items: items, back: true });
  };
  // Une étape d'histoire est-elle due aujourd'hui ?
  Story.due = function (st) {
    init(st);
    for (var i = 0; i < st.storyQueue.length; i++) {
      if (st.storyQueue[i].day <= st.day) return st.storyQueue.splice(i, 1)[0];
    }
    return null;
  };
  Story.started = function (st, id) { init(st); return !!st.story[id]; };

  var V = C.VISITORS;

  // =========================================================== Emma et son père
  V.emma_1 = {
    weight: 3, minDay: 3, once: 'emma',
    canAppear: function (st) { return !Story.started(st, 'emma'); },
    title: 'Une fillette à la porte',
    text: function () {
      return 'Une fillette d\'une dizaine d\'années, les joues creuses, serre un bonnet dans ses mains.<br>« Je m\'appelle Emma. Mon papa tousse du sang depuis une semaine. Le docteur de l\'hôpital a dit qu\'il faudrait des médicaments, mais ils n\'en ont plus. Vous en auriez ? Juste un peu… »';
    },
    choices: [
      { label: 'Lui donner des médicaments', req: { medicaments: 1 }, run: function (ctx) {
          G().removeItems({ medicaments: 1 });
          Story.state(ctx.st, 'emma').choice = 'med';
          G().moralAll(8, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          Story.next(ctx.st, 'emma_2', 3);
          return 'Emma serre la boîte contre elle. « Je vous promets que je reviendrai. Papa vous remerciera lui-même. » Elle part en courant.';
        } },
      { label: 'Lui donner un remède aux plantes', req: { remede: 1 }, run: function (ctx) {
          G().removeItems({ remede: 1 });
          var ok = R().chance(0.55);
          Story.state(ctx.st, 'emma').choice = ok ? 'herb_ok' : 'herb_ko';
          G().moralAll(5, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          if (ok) Story.next(ctx.st, 'emma_2', 4);
          else Story.news(ctx.st, 4, 'On a revu Emma près de l\'église, en noir. Le remède n\'a pas suffi : son père est mort.', -6, 'death_neighbor');
          return 'Emma regarde le petit flacon avec un doute, puis vous remercie. « C\'est mieux que rien, hein ? »';
        } },
      { label: 'Refuser', run: function (ctx) {
          Story.state(ctx.st, 'emma').choice = 'refus';
          G().moralAll(-6, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
          Story.news(ctx.st, 4, 'Au petit matin, un cortège minuscule est passé dans la rue : Emma, derrière le corps de son père enveloppé dans un drap.', -8, 'death_neighbor');
          return 'Emma hoche la tête, sans pleurer. C\'est pire. Elle repart vers l\'hôpital.';
        } }
    ],
    onMissed: function (st) {
      Story.state(st, 'emma').choice = 'absent';
      Story.news(st, 4, 'On raconte qu\'une fillette a frappé à toutes les portes de la rue pour trouver des médicaments. Son père n\'a pas passé la semaine.', -4, 'death_neighbor');
    }
  };
  V.emma_2 = {
    story: true, title: 'Emma revient',
    text: function (ctx) {
      return 'Emma est là, avec un homme maigre qui s\'appuie sur une canne : son père, Victor.<br>« Vous nous avez sauvés. Je suis serrurier… enfin, j\'étais. Prenez ça, j\'en ai fabriqué plusieurs cet hiver. Et si un jour vous avez besoin de quelque chose, demandez. »';
    },
    choices: [
      { label: 'Accepter avec gratitude', run: function (ctx) {
          G().addItems({ passe_partout: 2, legumes: 3 });
          G().moralAll(10, { good: true, key: 'helped' });
          Story.state(ctx.st, 'emma').choice = 'sauve';
          return 'Victor vous tend deux passe-partout et un sac de légumes de son potager. Emma vous fait un signe de la main jusqu\'au coin de la rue. (+2 passe-partout, +3 légumes)';
        } },
      { label: 'Refuser le cadeau', run: function (ctx) {
          G().moralAll(12, { good: true, key: 'helped' });
          return '« Gardez ça pour Emma. » Victor insiste, puis sourit. « Alors revenez nous voir. On aura toujours une soupe pour vous. »';
        } }
    ]
  };

  // =========================================================== Le déserteur
  V.deserteur_1 = {
    weight: 2, minDay: 6, once: 'deserteur',
    canAppear: function (st) { return !Story.started(st, 'deserteur'); },
    title: 'Un soldat en fuite',
    text: function () {
      return 'Un jeune homme en uniforme déchiré, sans insigne, jette des regards affolés derrière lui.<br>« Je m\'appelle Danny. J\'ai déserté. Ils fusillent les déserteurs, vous comprenez ? Cachez-moi une nuit. Une seule. Demain, je passe le fleuve. »';
    },
    choices: [
      { label: 'Le cacher à la cave', run: function (ctx) {
          Story.state(ctx.st, 'deserteur').hidden = true;
          Story.next(ctx.st, 'deserteur_2', 1);
          ctx.st.stats.helped++;
          return 'Danny se glisse dans un recoin de la cave, derrière les caisses. Il tremble. Personne ne dort vraiment tranquille ce soir.';
        } },
      { label: 'Lui donner à manger, mais pas d\'abri', req: { conserve: 1 }, run: function (ctx) {
          G().removeItems({ conserve: 1 });
          G().moralAll(2, { good: true });
          Story.state(ctx.st, 'deserteur').hidden = false;
          Story.news(ctx.st, 2, 'Des gens racontent qu\'un jeune soldat a réussi à passer le fleuve à la nage, de nuit. Peut-être Danny.', 3, 'helped');
          G().addItems({ couteau: 1, munitions: 3 });
          return 'Danny avale la conserve à même la boîte. Avant de disparaître dans les ruines, il pose sur la table son couteau et trois cartouches : « Là où je vais, je n\'en veux plus. » (+1 couteau, +3 munitions)';
        } },
      { label: 'Refuser', run: function (ctx) {
          G().moralAll(-4, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
          Story.news(ctx.st, 2, 'Une salve a claqué près du canal, à l\'aube. On dit qu\'ils ont rattrapé un déserteur.', -6, 'refused');
          return 'Danny recule, les yeux pleins de reproche, et s\'enfuit en boitant.';
        } }
    ]
  };
  V.deserteur_2 = {
    story: true, title: 'Une patrouille',
    text: function () {
      return 'Trois soldats. Le sergent vous fixe sans ciller.<br>« On cherche un déserteur. Un gamin, vingt ans, blond. On l\'a vu dans cette rue. Vous l\'avez vu ? Réfléchissez bien avant de répondre. »';
    },
    choices: [
      { label: 'Mentir : « Personne n\'est venu »', run: function (ctx) {
          if (R().chance(0.65)) {
            Story.next(ctx.st, 'deserteur_3', 1);
            return 'Le sergent vous dévisage longuement, puis crache par terre. « On repassera. » Ils s\'éloignent. En bas, Danny pleure en silence.';
          }
          // Découvert : fouille, punition
          var loss = {}; ['conserve', 'eau', 'cigarettes'].forEach(function (k) { var n = Math.min(G().count(k), R().int(1, 3)); if (n) loss[k] = n; });
          G().removeItems(loss);
          var v = G().present()[0]; if (v) v.wound = Math.min(90, v.wound + 20);
          G().moralAll(-10, { bad: true, key: 'raided' });
          Story.news(ctx.st, 1, 'On a entendu une salve près du canal, à l\'aube. Danny.', -8, 'refused');
          return 'Un soldat descend à la cave. Un cri, des coups. Ils emmènent Danny, confisquent des vivres (' + C.itemsText(loss) + ') et frappent ' + (v ? first(v) : 'l\'un de vous') + ' « pour l\'exemple ».';
        } },
      { label: 'Les soudoyer (gnôle)', req: { alcool: 1 }, run: function (ctx) {
          G().removeItems({ alcool: 1 });
          Story.next(ctx.st, 'deserteur_3', 1);
          return 'Le sergent soupèse la bouteille, la glisse dans sa veste. « On n\'a rien vu ici. » Ils partent.';
        } },
      { label: 'Le livrer', run: function (ctx) {
          G().addItems({ conserve: 3 });
          G().moralAll(-14, { bad: true, key: 'refused' });
          Story.news(ctx.st, 1, 'Une salve a claqué près du canal, à l\'aube. Personne ne dit le nom de Danny, mais tout le monde y pense.', -6, 'refused');
          return 'Ils sortent Danny de la cave. Il ne se débat pas. En partant, le sergent vous laisse trois conserves. « Pour votre coopération. » Personne n\'y touchera de la journée.';
        } }
    ],
    // Personne n'a ouvert : ils enfoncent la porte et fouillent
    onMissed: function (st) {
      Story.news(st, 0, 'Pendant la journée, une patrouille a enfoncé la porte et fouillé la cave. Ils ont emmené Danny.', -8, 'refused');
    }
  };
  V.deserteur_3 = {
    story: true, title: 'Danny s\'en va',
    text: function () {
      return 'À l\'aube, Danny remonte de la cave, rasé, en vêtements civils trop grands.<br>« Je passe le fleuve cette nuit. Je ne sais pas comment vous remercier… Si. Tenez. Là où je vais, je ne veux plus jamais toucher une arme. »';
    },
    choices: [
      { label: 'Prendre le pistolet', run: function (ctx) {
          G().addItems({ pistolet: 1, munitions: 6 });
          G().moralAll(8, { good: true, key: 'helped' });
          return 'Il vous laisse son pistolet et six cartouches, vous serre la main à tous, et part vers le fleuve. (+1 pistolet, +6 munitions)';
        } },
      { label: '« Garde-le, tu en auras besoin »', run: function (ctx) {
          G().moralAll(10, { good: true, key: 'helped' });
          return 'Danny hésite, puis range l\'arme. « Merci. Pour tout. » Vous ne le reverrez jamais, mais vous y penserez souvent.';
        } }
    ]
  };

  // =========================================================== Sara, la femme enceinte
  // Elle attend un enfant, son mari a disparu au dépôt des tramways. D'abord
  // à manger ; puis, quelques jours plus tard, l'accouchement.
  V.sara_1 = {
    weight: 2, minDay: 5, once: 'sara',
    canAppear: function (st) { return !Story.started(st, 'sara'); },
    title: 'Une femme enceinte',
    text: function () {
      return 'Une jeune femme, le ventre rond sous un manteau d\'homme, se tient au mur pour ne pas tomber.<br>« Je m\'appelle Sara. Je suis enceinte de huit mois. Mon mari, Caleb, est parti au dépôt des tramways il y a une semaine chercher des pièces à vendre. Il n\'est pas revenu. Je n\'ai rien mangé depuis avant-hier… »';
    },
    choices: [
      { label: 'Lui donner 2 conserves', req: { conserve: 2 }, run: function (ctx) {
          G().removeItems({ conserve: 2 });
          Story.state(ctx.st, 'sara').choice = 'nourrie';
          G().moralAll(8, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          Story.next(ctx.st, 'sara_2', 3);
          return 'Sara serre les boîtes contre son ventre. « Pour lui. Ou pour elle. Merci. » Elle promet de revenir vous dire.';
        } },
      { label: 'Lui donner de l\'eau et des légumes', req: { eau: 2, legumes: 2 }, run: function (ctx) {
          G().removeItems({ eau: 2, legumes: 2 });
          Story.state(ctx.st, 'sara').choice = 'nourrie';
          G().moralAll(6, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          Story.next(ctx.st, 'sara_2', 3);
          return 'Elle boit à longues gorgées, assise sur votre marche. « Vous êtes les premiers à m\'ouvrir. »';
        } },
      { label: 'Refuser', run: function (ctx) {
          Story.state(ctx.st, 'sara').choice = 'refus';
          G().moralAll(-7, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
          Story.news(ctx.st, 4, 'Des voisins disent qu\'une jeune femme enceinte a accouché seule dans une cage d\'escalier. On ne sait pas si l\'enfant a vécu.', -5, 'refused');
          return 'Sara hoche la tête, lentement, et repart en se tenant le ventre.';
        } }
    ],
    onMissed: function (st) { Story.state(st, 'sara').choice = 'absent'; }
  };
  V.sara_2 = {
    story: true, title: 'Sara va accoucher',
    text: function (ctx) {
      return 'Sara est revenue, livide, pliée en deux.<br>« Ça a commencé cette nuit. La sage-femme de l\'hôpital a été tuée la semaine dernière. Je n\'ai personne… Quelqu\'un sait faire, chez vous ? »<br><br><i>' + (C.Game.present().some(function (s) { return C.Game.hasTrait(s, 'soigneur'); }) ? 'Quelqu\'un parmi vous a des gestes de soignant.' : 'Personne ici n\'a jamais fait ça.') + '</i>';
    },
    choices: [
      { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' l\'aider (1 bandage, 2 eau)'; }, req: { bandage: 1, eau: 2 },
        run: function (ctx) {
          G().removeItems({ bandage: 1, eau: 2 });
          var skilled = G().hasTrait(ctx.s, 'soigneur'), ok = skilled || R().chance(0.7);
          Story.state(ctx.st, 'sara').choice = ok ? 'ne' : 'perdu';
          Story.state(ctx.st, 'sara').midwife = ctx.s.name.split(' ')[0];
          var girl = !!(ctx.s.look && ctx.s.look.female);
          Story.state(ctx.st, 'sara').girl = girl;
          G().sendAway(ctx.s, 'accouchement', {}, 0);
          G().moralAll(6, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          if (ok) {
            Story.next(ctx.st, 'sara_3', 4);
            Story.news(ctx.st, 1, first(ctx.s) + ' a aidé Sara à mettre au monde ' + (girl ? 'une petite fille' : 'un petit garçon') + '. La mère et l\'enfant vont bien.', 8, 'helped');
            C.Surv.bio(ctx.s, 'J\'ai aidé Sara à accoucher, dans une cave, à la lueur d\'une bougie. ' + (girl ? 'Une petite fille. J\'ai pleuré plus fort qu\'elle.' : 'Un petit garçon. J\'ai pleuré plus fort que lui.'));
          } else {
            Story.news(ctx.st, 1, 'Le bébé de Sara n\'a pas respiré. ' + first(ctx.s) + ' a tout essayé. Sara, elle, s\'en sortira.', -8, 'death_neighbor');
            C.Surv.bio(ctx.s, 'Le bébé de Sara n\'a pas respiré. J\'ai tout essayé. Je sens encore son poids dans mes mains.');
          }
          return first(ctx.s) + ' attrape un bandage, une bouteille d\'eau, et soutient Sara jusque chez elle. ' + (skilled ? 'Ses gestes sont sûrs.' : 'Il faudra faire au mieux.');
        } },
      { label: 'Lui donner de quoi faire (2 bandages, 3 eau)', req: { bandage: 2, eau: 3 }, run: function (ctx) {
          G().removeItems({ bandage: 2, eau: 3 });
          var ok = R().chance(0.45);
          Story.state(ctx.st, 'sara').choice = ok ? 'ne' : 'perdu';
          G().moralAll(3, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          if (ok) { Story.next(ctx.st, 'sara_3', 5); Story.news(ctx.st, 2, 'On dit que Sara a accouché seule, avec une voisine. Un garçon. Vos bandages ont servi.', 5, 'helped'); }
          else Story.news(ctx.st, 2, 'Le bébé de Sara n\'a pas survécu. Elle était seule, avec vos bandages et une voisine qui ne savait pas.', -7, 'death_neighbor');
          return 'Elle prend les bandages et repart, pliée de douleur. Personne ne sait quoi dire.';
        } },
      { label: 'Lui dire d\'aller à l\'hôpital', run: function (ctx) {
          Story.state(ctx.st, 'sara').choice = 'hopital';
          G().moralAll(-4, { bad: true, key: 'refused' });
          if (R().chance(0.5)) Story.news(ctx.st, 2, 'Sara a accouché dans un couloir de l\'hôpital de campagne. L\'enfant est vivant, de justesse.', 2, 'helped');
          else Story.news(ctx.st, 2, 'Sara n\'est jamais arrivée à l\'hôpital. On l\'a retrouvée dans une entrée d\'immeuble, avec son bébé mort-né.', -9, 'death_neighbor');
          return '« L\'hôpital… d\'accord. » Elle part vers le pont. C\'est loin, le pont.';
        } }
    ],
    onMissed: function (st) {
      Story.state(st, 'sara').choice = 'absent';
      Story.news(st, 1, 'Quelqu\'un a frappé longtemps à votre porte hier. On dit que c\'était Sara, la femme enceinte. Personne ne sait ce qu\'elle est devenue.', -5, 'refused');
    }
  };
  V.sara_3 = {
    story: true, title: 'Sara, Caleb et le bébé',
    text: function (ctx) {
      var ss = Story.state(ctx.st, 'sara'), mw = ss.midwife, girl = !!ss.girl;
      return 'Sara est là, un nourrisson emmailloté contre elle. À côté, un homme maigre, le bras en écharpe : Caleb. Il était blessé, caché dans le dépôt.<br>« ' + (girl ? 'Elle' : 'Il') + ' s\'appelle ' + (mw || 'Adam') + '. ' + (mw ? 'Comme ' + (girl ? 'celle' : 'celui') + ' qui ' + (girl ? 'l\'a mise' : 'l\'a mis') + ' au monde.' : 'On voulait un nom qui vous ressemble.') + ' Je suis mécanicien. Voilà ce que j\'ai sauvé du dépôt. C\'est pour vous. »';
    },
    choices: [
      { label: 'Accepter', run: function (ctx) {
          G().addItems({ pieces_meca: 3, composants: 4, conserve: 2 });
          G().moralAll(12, { good: true, key: 'helped' });
          G().alive().forEach(function (s) { C.Surv.bio(s, 'Sara est revenue avec son bébé et Caleb. Un enfant est né, au milieu de tout ça. Ça compte.'); });
          return 'Caleb vous laisse un sac de pièces et de conserves. Le bébé dort. Pendant quelques minutes, personne ne pense à la guerre. (+3 pièces mécaniques, +4 composants, +2 conserves)';
        } },
      { label: '« Gardez tout, pour le petit »', run: function (ctx) {
          G().moralAll(15, { good: true, key: 'helped' });
          Story.thanks(ctx.st, 6, 'Caleb est repassé : il a remis en route un vieux groupe électrogène et vous a laissé ce qu\'il a pu récupérer', { pieces_elec: 2, composants: 3 }, 3);
          return 'Sara pleure. Caleb vous serre la main longtemps. « On ne l\'oubliera pas. » Il reviendra, dit-il.';
        } }
    ]
  };

  // =========================================================== Le sergent Hollis
  // Un soldat blessé frappe à la porte. Le soigner, c'est prendre un risque ;
  // l'abandonner, ou le dépouiller, c'est autre chose.
  V.soldat_1 = {
    weight: 2, minDay: 8, once: 'soldat',
    canAppear: function (st) { return !Story.started(st, 'soldat'); },
    title: 'Un soldat blessé',
    text: function () {
      return 'Un soldat s\'est effondré contre votre porte, la jambe serrée dans un garrot de fortune. Son fusil traîne à côté de lui.<br>« Sergent Hollis. Ma patrouille est tombée dans une embuscade près du carrefour. Je ne tiendrai pas jusqu\'à la caserne. Un bandage… et un coin pour la nuit. Je vous en supplie. »';
    },
    choices: [
      { label: 'Le soigner et le cacher (2 bandages)', req: { bandage: 2 }, run: function (ctx) {
          G().removeItems({ bandage: 2 });
          Story.state(ctx.st, 'soldat').choice = 'soigne';
          G().moralAll(5, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          Story.next(ctx.st, 'soldat_2', 1);
          return 'Vous l\'allongez dans un coin, près du poêle. Il serre les dents pendant que ' + first(ctx.s) + ' refait le pansement. « Merci. Je n\'oublierai pas. »';
        } },
      { label: 'Un bandage, puis qu\'il s\'en aille', req: { bandage: 1 }, run: function (ctx) {
          G().removeItems({ bandage: 1 });
          Story.state(ctx.st, 'soldat').choice = 'renvoye';
          G().moralAll(2, { good: true, key: 'helped' }); ctx.st.stats.helped++;
          Story.thanks(ctx.st, 3, 'Une patrouille est passée dans la rue. Un soldat a déposé une caisse devant la porte : « De la part du sergent Hollis. Il s\'en est sorti »', { munitions: 6, conserve: 1 }, 3);
          return 'Il se relève en grimaçant, ramasse son fusil et s\'éloigne en boitant vers la caserne.';
        } },
      { label: 'Prendre son fusil et fermer la porte', run: function (ctx) {
          Story.state(ctx.st, 'soldat').choice = 'depouille';
          G().addItems({ fusil: 1, munitions: 5 });
          var lines = C.Mood.judge([{ act: 'rob', base: -10, victim: 'Hollis' }], {});
          lines.forEach(function (l) { G().log(l.t, l.k); });
          Story.news(ctx.st, 1, 'On a retrouvé le sergent Hollis mort dans la rue, sans arme. Une patrouille fouille le quartier.', -4, 'refused');
          ctx.st.raidBonus = (ctx.st.raidBonus || 0) + 0.1;
          return 'Il ne résiste pas : il n\'en a plus la force. Il vous regarde seulement, pendant que vous refermez. (+1 fusil de chasse, +5 munitions)';
        } },
      { label: 'Refuser', run: function (ctx) {
          Story.state(ctx.st, 'soldat').choice = 'refus';
          G().moralAll(-5, { bad: true, key: 'refused' }); ctx.st.stats.refused++;
          if (R().chance(0.5)) Story.news(ctx.st, 1, 'Le soldat blessé est mort devant la porte d\'à côté. Personne ne lui a ouvert.', -5, 'refused');
          return 'Vous refermez. Longtemps, on l\'entend ramper dans la rue.';
        } }
    ]
  };
  V.soldat_2 = {
    story: true, title: 'La fièvre',
    text: function () {
      return 'Au matin, Hollis brûle de fièvre. La plaie a noirci sur les bords et il délire, il appelle des noms.<br><br><i>Sans médicament, l\'infection l\'emportera.</i>';
    },
    choices: [
      { label: 'Lui donner des médicaments', req: { medicaments: 1 }, run: function (ctx) {
          G().removeItems({ medicaments: 1 });
          Story.state(ctx.st, 'soldat').choice = 'sauve';
          G().moralAll(6, { good: true, key: 'helped' });
          Story.next(ctx.st, 'soldat_3', 3);
          return 'La fièvre tombe dans l\'après-midi. Le soir, Hollis mange un peu, et repart à la nuit tombée, appuyé sur une canne. « Je reviendrai. »';
        } },
      { label: 'Essayer un remède aux plantes', req: { remede: 1 }, run: function (ctx) {
          G().removeItems({ remede: 1 });
          if (R().chance(0.5)) {
            Story.state(ctx.st, 'soldat').choice = 'sauve';
            Story.next(ctx.st, 'soldat_3', 4);
            G().moralAll(5, { good: true, key: 'helped' });
            return 'Contre toute attente, la fièvre baisse. Hollis repart deux jours plus tard, pâle mais debout.';
          }
          return V.soldat_2.dies(ctx);
        } },
      { label: 'Il n\'y a plus rien à faire', run: function (ctx) { return V.soldat_2.dies(ctx); } }
    ],
    // Il meurt au refuge : son corps est là, il faudra l'enterrer
    dies: function (ctx) {
      Story.state(ctx.st, 'soldat').choice = 'mort';
      G().moralAll(-6, { bad: true, key: 'death_neighbor' });
      var p = G().present()[0] || ctx.s;
      if (p) G().spawnObject({ kind: 'corpse', sid: 'hollis', name: 'Hollis', since: ctx.st.day, f: p.f, x: C.Nav.clampX(p.f, p.x + 60), w: 96, h: 22 });
      return 'Hollis meurt au milieu de l\'après-midi, sans avoir repris connaissance. Son corps est là, sous une couverture. Il faudra l\'enterrer.';
    },
    onMissed: function (st) { Story.state(st, 'soldat').choice = 'parti'; }
  };
  V.soldat_3 = {
    story: true, title: 'Le sergent revient',
    text: function () {
      return 'Hollis est à la porte, rasé, en uniforme propre. Deux soldats attendent au bout de la rue.<br>« Je vous dois la vie. J\'ai pris ce que j\'ai pu à l\'intendance, personne ne comptera. Et j\'ai fait passer le mot : vos voisins d\'en face, les pillards, ne s\'approcheront plus de chez vous pendant un moment. »';
    },
    choices: [
      { label: 'Merci, sergent', run: function (ctx) {
          G().addItems({ casque: 1, munitions: 10, conserve: 3, pieces_armes: 2 });
          ctx.st.flags.guardedUntil = ctx.st.day + 6;
          G().moralAll(10, { good: true, key: 'helped' });
          return 'Il vous laisse une caisse de l\'armée et salue avant de partir. Pendant quelques nuits, les patrouilles passeront plus souvent dans votre rue. (+1 casque, +10 munitions, +3 conserves, +2 pièces d\'armes)';
        } }
    ]
  };

  // =========================================================== Warren et la milice
  // Comme dans le jeu d'origine : un voisin propose de récupérer un colis largué
  // que les rebelles ont raté. Quelques jours plus tard, la milice (Carl et son
  // lieutenant) frappe à la porte et demande qui a fait le coup, en échange de
  // vivres. Il faut refuser deux fois pour qu'ils repartent.
  var TIP = { conserve: 3, cafe: 2, cigarettes: 3 };
  function betray(ctx, who, newsText) {
    G().addItems(TIP);
    ctx.st.stats.betrayed = (ctx.st.stats.betrayed || 0) + 1;
    G().moralAll(-9, { bad: true, key: 'informed' });
    Story.news(ctx.st, 1, newsText, -3, 'informed');
    ctx.st.flags.guardedUntil = Math.max(ctx.st.flags.guardedUntil || 0, ctx.st.day + 3);
    return 'Carl note le nom sans lever les yeux et vous tend un sac : ' + C.itemsText(TIP) + '. « Le quartier vous remercie. » Personne ne mange avec plaisir, ce soir-là.';
  }
  V.valter_1 = {
    weight: 2, minDay: 5, once: 'valter',
    canAppear: function (st) { return !Story.started(st, 'valter') && G().present().length >= 2; },
    title: 'Un voisin a du nouveau',
    text: function () {
      return 'Un homme à lunettes, Warren, habite un peu plus bas dans la rue.<br>« J\'ai vu que vous logiez dans cette maison. Cette nuit, un avion a largué de l\'aide humanitaire. Les rebelles ont confisqué presque tout, mais il y a un conteneur qu\'ils ont raté, tombé en zone de tir. Sous le couvert de la nuit, on peut l\'atteindre. Je vous montre où il est si vous m\'aidez à porter. Marché conclu ? »<br><br><i>C\'est du vol, aux yeux de la milice. Le survivant envoyé sera absent jusqu\'au soir.</i>';
    },
    choices: [
      { label: function (ctx) { return 'Envoyer ' + first(ctx.s) + ' avec lui'; }, run: function (ctx) {
          Story.state(ctx.st, 'valter').choice = 'accepte';
          G().sendAway(ctx.s, 'aide_larguee', R().chance(0.85) ? { legumes: R().int(2, 4), cafe: 1, eau: R().int(1, 3), conserve: 1 } : { legumes: 2, eau: 1 }, 0.3);
          ctx.st.stats.helped++;
          Story.next(ctx.st, 'milice_1', R().int(2, 4));
          return first(ctx.s) + ' suit Warren dans la nuit qui tombe, un sac vide sur l\'épaule.';
        } },
      { label: 'Refuser : ça sent le piège', run: function (ctx) {
          Story.state(ctx.st, 'valter').choice = 'refus';
          ctx.st.stats.refused++; G().moralAll(-2, {});
          return 'Warren hausse les épaules. « Comme vous voudrez. Je trouverai quelqu\'un d\'autre. »';
        } }
    ]
  };
  V.milice_1 = {
    story: true, title: 'La milice enquête',
    text: function () {
      return 'Deux hommes en brassard, le fusil en bandoulière. Le plus âgé, Carl, ne sourit pas.<br>« Un conteneur destiné à la milice a disparu cette nuit. Un voisin l\'a vu porter par deux personnes : un homme à lunettes, Warren, de la rue d\'à côté, et quelqu\'un de cette maison. Confirmez-nous que c\'était lui, et on oublie le reste. Il y a de quoi manger pour vous. »';
    },
    choices: [
      { label: 'Confirmer : c\'était Warren', run: function (ctx) {
          Story.state(ctx.st, 'valter').choice = 'denonce';
          return betray(ctx, 'Warren', 'On a emmené Warren dans un camion de la milice, ce matin, les mains attachées. Sa femme criait dans la rue. On dit qu\'un voisin l\'a dénoncé.');
        } },
      { label: 'Dire qu\'on ne sait rien', run: function (ctx) {
          Story.state(ctx.st, 'valter').choice = 'refus1';
          G().moralAll(5, { good: true, key: 'helped' });
          Story.next(ctx.st, 'milice_2', 1);
          return 'Carl vous regarde longtemps. « On repassera. Réfléchissez bien : la faim, ça fait changer d\'avis. »';
        } }
    ],
    onMissed: function (st) { Story.state(st, 'valter').choice = 'sourd'; }
  };
  V.milice_2 = {
    story: true, title: 'La milice revient',
    text: function () {
      return 'Carl est de retour, avec un lieutenant cette fois. Il laisse ostensiblement une main sur la crosse.<br>« Je vous repose la question. Warren. C\'est lui, oui ou non ? Nous avons des façons de savoir, mais autant que ça vienne de vous. »';
    },
    choices: [
      { label: 'Confirmer : c\'était Warren', run: function (ctx) {
          Story.state(ctx.st, 'valter').choice = 'denonce';
          return betray(ctx, 'Warren', 'On a emmené Warren dans un camion de la milice, ce matin, les mains attachées. On dit qu\'un voisin l\'a dénoncé après avoir résisté deux fois.');
        } },
      { label: 'Refuser encore', run: function (ctx) {
          Story.state(ctx.st, 'valter').choice = 'refus2';
          G().moralAll(7, { good: true, key: 'helped' });
          ctx.st.raidBonus = (ctx.st.raidBonus || 0) + 0.1;
          Story.thanks(ctx.st, 3, 'Warren est venu jusqu\'à votre porte, la tête basse. « La milice est passée chez moi aussi. Ils n\'ont rien pu prouver. Vous m\'avez couvert, et je ne l\'oublierai pas »', { alcool: 1, conserve: 2, legumes: 2 }, 6);
          return 'Carl crache par terre. « Vous le regretterez. » Ils repartent, mais ils n\'ont rien prouvé. (Ils vous garderont peut-être à l\'œil cette nuit.)';
        } }
    ],
    onMissed: function (st) { Story.state(st, 'valter').choice = 'sourd'; }
  };

  // Enquêtes de la milice au hasard : un motif, une récompense pour qui dénonce.
  var ENQ = [
    { who: 'un déserteur', text: 'On cherche un déserteur qui se cacherait dans le quartier : un jeune homme, les cheveux coupés court, qui a jeté son uniforme. On a vu quelqu\'un lui passer de la nourriture par une fenêtre de la rue voisine.', name: 'le jeune homme aux cheveux courts',
      news: 'Un jeune homme a été fusillé contre un mur à l\'aube, près de la place. Il n\'avait plus son uniforme. Les gens disent qu\'on l\'a vendu.', reward: { munitions: 4, conserve: 2 } },
    { who: 'un accapareur', text: 'On soupçonne un voisin d\'accaparer des vivres pendant que d\'autres crèvent de faim. Walt, l\'homme d\'en face. Vous l\'avez vu rentrer avec des sacs, non ?', name: 'Walt',
      news: 'La milice a vidé la cave de Walt, l\'homme d\'en face, et l\'a jeté dehors. Sa famille dort dans l\'escalier.', reward: { conserve: 3, sucre: 2 } },
    { who: 'une radio clandestine', text: 'Quelqu\'un émet sur une radio clandestine, et les coordonnées de nos patrouilles finissent chez l\'ennemi. Un émetteur, dans une cave du quartier. Vous avez entendu quelque chose, la nuit ?', name: 'l\'homme à la radio',
      news: 'Des coups de feu ont claqué avant l\'aube dans une cave voisine. On a vu la milice en sortir un émetteur et un corps.', reward: { cigarettes: 4, munitions: 3 } }
  ];
  V.milice_enquete = {
    weight: function (st) { return st.day >= 9 && (st.day - ((st.flags && st.flags.enqDay) || -9)) >= 7 ? 2 : 0; },
    minDay: 9,
    title: 'Un contrôle de la milice',
    init: function (st, Rn) { return { r: Rn.int(0, ENQ.length - 1) }; },
    text: function (ctx) {
      var e = ENQ[(ctx.d && ctx.d.r) || 0];
      return 'Deux miliciens, brassard au bras, frappent avec la crosse.<br>« Enquête de voisinage. ' + e.text + ' Un mot de votre part, et il y a de quoi manger pour vous. »<br><br><i>Dénoncer, c\'est être payé. Se taire, c\'est risquer de se faire remarquer.</i>';
    },
    choices: [
      { label: 'Donner un nom', run: function (ctx) {
          var e = ENQ[(ctx.d && ctx.d.r) || 0];
          ctx.st.flags.enqDay = ctx.st.day;
          ctx.st.stats.betrayed = (ctx.st.stats.betrayed || 0) + 1;
          G().addItems(e.reward);
          G().moralAll(-8, { bad: true, key: 'informed' });
          Story.news(ctx.st, 1, e.news, -3, 'informed');
          ctx.st.flags.guardedUntil = Math.max(ctx.st.flags.guardedUntil || 0, ctx.st.day + 2);
          return 'Le plus jeune note. On vous tend un sac (' + C.itemsText(e.reward) + '). « Bon travail, citoyens. » La porte se referme sur un silence pesant.';
        } },
      { label: 'Dire qu\'on n\'a rien vu', run: function (ctx) {
          ctx.st.flags.enqDay = ctx.st.day;
          G().moralAll(4, { good: true, key: 'helped' });
          if (R().chance(0.3)) { ctx.st.raidBonus = (ctx.st.raidBonus || 0) + 0.1; return 'Ils échangent un regard. « Ça arrive. On repassera, peut-être. » Vous les entendez frapper chez les voisins, longtemps.'; }
          return 'Ils grommellent, notent quelque chose et passent à la maison suivante. Vous les entendez frapper chez les voisins.';
        } },
      { label: 'Leur donner un faux nom', run: function (ctx) {
          ctx.st.flags.enqDay = ctx.st.day;
          if (R().chance(0.5)) { G().moralAll(1, {}); return 'Ils s\'éloignent vers l\'adresse indiquée, qui est celle d\'une ruine. Vous ne saurez jamais ce qu\'ils y ont trouvé.'; }
          G().moralAll(-3, {}); ctx.st.raidBonus = (ctx.st.raidBonus || 0) + 0.15;
          return 'Le lieutenant revient dix minutes plus tard, furieux. « Vous nous avez menti. Ça se paie. » Il vous regarde, puis les fenêtres, puis la porte.';
        } }
    ]
  };
})(window.CQR);
