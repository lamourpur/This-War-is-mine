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
          return 'Danny avale la conserve à même la boîte, vous remercie d\'un signe de tête et disparaît dans les ruines.';
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
})(window.CQR);
