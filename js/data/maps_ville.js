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
    look: C.GUARD_TYPES.soldat.look, loot: {}, talk: [],
    say: { idle: [], suspect: [], greet: [], warn: [], warn2: [], attack: [], lost: [], hurt: [], surrender: [], spared: [] }
  };

  // Plans : voir lieux.js

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
