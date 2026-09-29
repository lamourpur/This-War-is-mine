/* =========================================================
   Les autres lieux de pillage, tous jouables
   Comme dans This War of Mine, chaque sortie de nuit se joue : on dirige
   soi-même le pilleur. Ce fichier ajoute les plans des lieux restants et
   les gens qu'on y croise :
   - bandits (supermarché, villa) : hostiles, pistolet ou couteau ;
   - pilleurs de passage (chantier, immeuble, garage) : neutres, mais ils
     défendent leur coin (zone) et se battent si on les attaque ;
   - tireur embusqué (carrefour) : invisible, il abat qui reste à découvert.
   ========================================================= */
(function (C) {
  'use strict';

  var S = C.GUARD_TYPES.soldat.say;

  // ------------------------------------------------------------ nouveaux personnages armés
  C.GUARD_TYPES.bandit = {
    name: 'Bandit', hp: 90, weapon: null, tool: 'knife', mdmg: [14, 26], ammo: 0,
    dmg: [0, 0], acc: 0, range: 0, sight: 300, walk: 50, run: 112,
    look: { hair: 'short', build: 1.05, h: 1.0, coat: '#3b3a37', pants: '#2a2926', coatLen: 0.05, skin: '#a38d78', hairColor: '#2a241f', beard: 'stubble', brow: 'heavy', top: 'hoodie', shirt: '#4a4640', hat: 'beanie', hatColor: '#2e2c29', scarf: '#5a2f28' },
    loot: { cigarettes: 2, conserve: 1, couteau: 1 },
    talk: [],
    say: {
      idle: ['…', 'Ils ont intérêt à revenir avec quelque chose, les autres.', 'Fait un froid de canard.'],
      suspect: ['Qui est là ?', 'Hé ! Y a quelqu\'un ?', 'Montre-toi !'],
      greet: ['T\'as rien à faire ici.'],
      warn: ['Dégage !'], warn2: ['Dernière chance !'],
      attack: ['Chope-le !', 'Un rat ! Là !', 'T\'es mort !'],
      lost: ['Il s\'est planqué quelque part…', 'Fouillez tout !'],
      hurt: ['Salaud !', 'Aaargh !'],
      surrender: ['Attends ! Attends… prends ce que tu veux. Me tue pas.'],
      spared: ['T\'es cinglé de me laisser partir… Merci.']
    }
  };
  C.GUARD_TYPES.bandit_arme = {
    name: 'Bandit armé', hp: 95, weapon: 'pistolet', tool: 'pistol', ammo: 8,
    dmg: [20, 34], acc: 0.55, range: 460, sight: 320, walk: 48, run: 105,
    look: { hair: 'short', build: 1.12, h: 1.03, coat: '#2f3032', pants: '#26272a', coatLen: 0.2, skin: '#9b846f', hairColor: '#1c1815', beard: 'full', brow: 'heavy', top: 'overcoat', shirt: '#3e3b37', hat: 'cap', hatColor: '#222' },
    loot: { munitions: 3, cigarettes: 2, alcool: 1 },
    talk: [],
    say: C.GUARD_TYPES.bandit ? null : null
  };
  C.GUARD_TYPES.bandit_arme.say = C.GUARD_TYPES.bandit.say;

  C.GUARD_TYPES.pilleur = {
    name: 'Pilleur', hp: 80, weapon: null, tool: 'crowbar', mdmg: [10, 20], ammo: 0, tolerant: true, noun: 'pilleur', cat: 'civ',
    dmg: [0, 0], acc: 0, range: 0, sight: 280, walk: 52, run: 115,
    look: { hair: 'messy', build: 0.96, h: 0.98, coat: '#4f4a40', pants: '#2e2c28', coatLen: 0.1, skin: '#a8927d', hairColor: '#3d3228', beard: 'stubble', top: 'work', shirt: '#5c564b', bag: true },
    loot: { conserve: 1, composants: 2, bandage: 1 },
    talk: [
      ['Salut. On cherche la même chose, je crois.', 'Ouais. Alors tu restes de ton côté et moi du mien.'],
      ['Tu viens souvent ici ?', 'Assez pour savoir qu\'il ne reste plus grand-chose. Faut monter, ou creuser.'],
      ['T\'as de la famille ?', 'Ma sœur et ses gosses. C\'est pour eux, tout ça.']
    ],
    say: {
      idle: ['…', 'Rien. Encore rien.'],
      suspect: ['Y a quelqu\'un ?', 'J\'ai entendu… qui est là ?'],
      greet: ['Doucement. Je cherche juste de quoi manger, comme toi.', 'On se gêne pas, d\'accord ?'],
      warn: ['Hé ! C\'est mon coin, ça. J\'étais là avant.', 'Pas touche. Va voir ailleurs.'],
      warn2: ['Je te préviens, recule !'],
      attack: ['Tu l\'auras voulu !', 'Lâche ça !'],
      lost: ['Où il est passé…'],
      hurt: ['Arrête ! Arrête !'],
      surrender: ['Pitié… j\'ai des gosses qui attendent. Prends tout, mais laisse-moi partir.'],
      spared: ['Merci… Je ne reviendrai pas ici.']
    }
  };

  // Tireur embusqué : invisible, statique, ne voit que la rue à découvert
  C.GUARD_TYPES.tireur = {
    name: 'Tireur embusqué', hp: 100, weapon: 'fusil', tool: 'rifle', ammo: 99,
    dmg: [38, 58], acc: 0.6, range: 5000, sight: 5000, walk: 0, run: 0,
    sniper: true, fixed: true, unseen: true,
    look: C.GUARD_TYPES.soldat.look, loot: { fusil: 1, munitions: 6 }, talk: [],
    say: { idle: [], suspect: [], greet: [], warn: [], warn2: [], attack: [], lost: [], hurt: [], surrender: [], spared: [] }
  };

  // Plans : voir lieux.js

  // Le groupe des tireurs (chantier) : un tireur d'élite au fusil à lunette et son guetteur
  C.GUARD_TYPES.tireur_elite = {
    name: 'Tireur d\'élite', noun: 'soldat', cat: 'mil', hp: 100, weapon: 'fusil_lunette', tool: 'rifle', ammo: 30,
    dmg: [40, 60], acc: 0.8, range: 820, sight: 430, walk: 38, run: 88,
    look: { hair: 'buzz', build: 0.98, h: 1.03, coat: '#4a4e3e', pants: '#383b2d', coatLen: 0.18, skin: '#a58f78', hairColor: '#2a241f', beard: 'stubble', brow: 'heavy', top: 'work', shirt: '#565a46', hat: 'cap', hatColor: '#3f4334', scarf: '#5a5c48', bag: true },
    loot: { fusil_lunette: 1, munitions: 8, cigarettes: 2 },
    talk: [],
    say: {
      idle: ['…', 'Rien ne bouge dans la rue.', 'Il fait trop froid pour rester couché.', 'Encore trois heures avant la relève.'],
      suspect: ['Tu as entendu ?', 'Là, en bas… tu as vu ?'], greet: ['Halte.'], warn: ['Plus un geste !'], warn2: ['Je te vois dans ma lunette !'],
      attack: ['Contact ! Tirez !', 'Tu es dans mon viseur !'], lost: ['Il a disparu…'], hurt: ['Aaah ! Il m\'a eu !'],
      surrender: ['Ne tire pas ! Je te donne mon fusil, tout ce que tu veux !'], spared: ['Tu ne me reverras pas… promis.']
    }
  };

  // Le geôlier de la bande (supermarché) : garde le garçon ligoté dans la réserve
  C.GUARD_TYPES.geolier = {
    name: 'Geôlier', noun: 'bandit', cat: 'bandit', hp: 110, weapon: null, tool: 'knife', mdmg: [16, 28], ammo: 0,
    dmg: [0, 0], acc: 0, range: 0, sight: 260, walk: 44, run: 100,
    look: { hair: 'short', build: 1.22, h: 1.04, coat: '#3a342e', pants: '#28251f', coatLen: 0.15, skin: '#9e8670', hairColor: '#221d19', beard: 'full', brow: 'heavy', top: 'overcoat', shirt: '#4d463c', hat: 'beanie', hatColor: '#262420' },
    loot: { alcool: 1, cigarettes: 2, couteau: 1 },
    talk: [],
    say: {
      idle: ['Arrête de pleurer, toi.', 'Ton père paiera. Ou pas.', '…', 'Il fait un froid de chien, dans cette réserve.'],
      suspect: ['Qui c\'est ? Tony, c\'est toi ?'], greet: ['T\'as rien à faire là.'], warn: ['Dégage !'], warn2: ['Je te préviens !'],
      attack: ['Tu veux le gamin ? Viens le chercher !'], lost: ['Où il est passé…'], hurt: ['Salopard !'],
      surrender: ['Ok, ok ! Prends-le, ton gamin ! Me tue pas !'], spared: ['Je… je m\'en vais. Je dirai rien.']
    }
  };
  // Bandits qui discutent autour du feu : leurs répliques
  C.GUARD_TYPES.bandit.say.idle = C.GUARD_TYPES.bandit.say.idle.concat([
    'Le chef veut qu\'on vide la pharmacie de l\'hôpital demain.', 'Le gamin, là… son père a de l\'or, paraît-il.',
    'Si les soldats reviennent, on file par le quai.', 'J\'ai plus de clopes. Qui a des clopes ?'
  ]);

  C.NPCS.lukas = {
    name: 'Lukas', title: 'Garçon de caisse, retenu par la bande',
    look: { hair: 'messy', build: 0.78, h: 0.86, coat: '#56504a', pants: '#2f2c28', coatLen: 0.05, skin: '#b8a18c', hairColor: '#5a4330', top: 'hoodie', shirt: '#6a6258' },
    pose: 'sit', cond: { wound: 25 }, captor: 'geolier',
    greet: ['Pitié… ils m\'ont attaché ici il y a quatre jours.', 'Le gros qui me garde… quand il boit, il s\'endort. Mais il ne boit plus.', 'Ils croient que mon père a de l\'or. Mon père est mort.'],
    thanks: 'Il est parti ? … Vous me détachez ? Merci… merci.',
    giveLine: 'J\'avais caché ça derrière les cartons, avant qu\'ils arrivent. Prenez-le.',
    rescued: ['Je connais un passage par le quai. Je vais chez ma tante, de l\'autre côté du fleuve.', 'Je ne vous oublierai pas.'],
    reward: { conserve: 2, medicaments: 1, cafe: 1 },
    freedNote: ' des bandits qui le retenaient dans la réserve.',
    abandonNote: ' a laissé le garçon ligoté dans la réserve. Personne n\'en parle.',
    rescueJournal: 'Lukas est libre. Il a sorti de derrière les cartons ce qu\'il avait caché :',
    abandonJournal: 'J\'ai laissé le garçon attaché dans la réserve. Je l\'entends encore.'
  };

  // Carrefour : la vieille Zora tient l'abri du métro
  C.NPCS.zora = {
    name: 'Zora', title: 'Réfugiée du métro',
    look: { hair: 'scarf', build: 0.86, h: 0.9, coat: '#4f463e', pants: '#2f2b27', coatLen: 0.45, skin: '#b09880', hairColor: '#8a8278', female: true, lips: true, top: 'overcoat', shirt: '#6a5c50', scarf: '#6b3e34' },
    pose: 'sit',
    greet: ['Doucement… les petits dorment dans la rame.', 'Il tire sur tout ce qui traverse la rue, depuis l\'immeuble d\'en face. On ne remonte plus.', 'On est onze ici. Il y a de l\'eau, il suinte des murs.'],
    trade: {
      stock: { eau: 5, filtre: 1, herbes: 2, livres: 2, tabac: 2, pieces_elec: 1 },
      likes: { conserve: 1.6, medicaments: 1.7, bandage: 1.5, bois: 1.4, sucre: 1.3 },
      restock: 3,
      say: 'L\'eau, on en a. C\'est la nourriture qui manque, pour les petits.'
    },
    donate: { items: { conserve: 1 }, alt: { legumes: 1 }, label: 'Donner à manger pour les enfants', thanks: 'Que Dieu vous le rende. Les petits mangeront ce soir.', moral: 5,
      reward: { filtre: 1, eau: 2 }, giveLine: 'Prenez de l\'eau, et ce filtre. On en a deux, il en faut bien un pour vous.' },
    when: [{ 'if': 'freed:tireur', lines: ['Plus de coups de feu depuis hier. Vous avez fait taire le tireur ? On peut de nouveau remonter chercher de l\'eau.', 'Les petits ont demandé s\'ils pouvaient jouer dehors. J\'ai dit pas encore.'] },
      { 'if': 'self:donated', lines: ['Les petits ont mangé, ce soir. Vous ne savez pas ce que ça change.', 'Les enfants vous appellent « le monsieur du haut ». Ils guettent l\'entrée.'] }],
    afterSteal: ['Vous volez des enfants ? Partez. Partez !']
  };
  C.OWNERS.metro = {
    text: ' a volé les réfugiés du métro.', moral: -10, key: 'stole_kids',
    desc: 'Les réserves des familles qui vivent dans le métro.',
    warn: 'Onze personnes vivent de ça sous la rue, dont des enfants.'
  };

  C.OWNERS.bande = {
    text: ' a volé le butin des bandits.', moral: 0, key: null, military: true,
    desc: 'Ce que la bande a entassé. Si l\'un d\'eux vous voit, ils vous tomberont dessus.',
    warn: 'Un bandit vous regarde. Vous servir maintenant, c\'est vous battre contre toute la bande.'
  };
  C.OWNERS.pilleur = {
    text: ' a pris les affaires d\'un pilleur.', moral: -3, key: 'stole',
    desc: 'Les trouvailles d\'un autre pilleur. Il a sûrement une famille à nourrir, lui aussi.',
    warn: 'Ce sac appartient à quelqu\'un qui fouille ici comme vous, pour les siens.'
  };
})(window.CQR);
