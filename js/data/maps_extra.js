/* =========================================================
   Trois lieux de plus, comme dans This War of Mine
   - Hôtel : des soldats occupent les étages, des civils s'abritent en bas ;
   - Squat délabré : des sans-abri qui défendent leur coin, couteau à la main ;
   - Maison mitoyenne : une famille dans une moitié de maison, l'autre moitié
     éventrée par un obus.
   ========================================================= */
(function (C) {
  'use strict';

  // ------------------------------------------------------------ squatteurs
  C.GUARD_TYPES.squatteur = {
    name: 'Squatteur', hp: 75, weapon: null, tool: 'knife', mdmg: [10, 20], ammo: 0, tolerant: true, noun: 'squatteur', cat: 'civ',
    dmg: [0, 0], acc: 0, range: 0, sight: 270, walk: 48, run: 108,
    look: { hair: 'messy', build: 0.9, h: 0.98, coat: '#4c463d', pants: '#2c2a26', coatLen: 0.3, skin: '#a08a74', hairColor: '#3a3128', beard: 'full', top: 'overcoat', shirt: '#5a5347', hat: 'beanie', hatColor: '#3a352e', scarf: '#4e3a2c' },
    loot: { cigarettes: 1, conserve: 1 },
    talk: [
      ['Vous vivez ici depuis longtemps ?', 'Depuis que la mairie a brûlé. Avant, on dormait sous le pont. Ici, au moins, il y a un toit.'],
      ['Vous avez besoin de quelque chose ?', 'De tout. Mais on ne demande rien à personne. On se débrouille.'],
      ['Qui commande, ici ?', 'Personne. On partage. Et on ne laisse pas entrer les voleurs.']
    ],
    say: {
      idle: ['…', 'Encore une nuit.', 'Il reste du feu ?'],
      suspect: ['Qui va là ?', 'Hé ! Y a quelqu\'un ?'],
      greet: ['Tu cherches quoi, toi ?', 'On n\'a rien. Rien du tout.'],
      warn: ['C\'est chez nous, ici ! Dehors !', 'Recule. Tout de suite.'],
      warn2: ['J\'ai dit dehors !'],
      attack: ['Voleur !', 'Tu l\'auras voulu !'],
      lost: ['Il est où, ce rat ?'],
      hurt: ['Aaah ! Arrête !'],
      surrender: ['Pitié… on n\'a rien, je te jure qu\'on n\'a rien…'],
      spared: ['Va-t\'en. Va-t\'en et ne reviens pas.']
    }
  };

  // ------------------------------------------------------------ personnages
  C.NPCS.irene = {
    name: 'Irène', title: 'Ancienne réceptionniste',
    look: { hair: 'bun', build: 0.88, h: 0.97, coat: '#5a5048', pants: '#33302c', coatLen: 0.3, skin: '#bca893', hairColor: '#4a3a2e', lips: true, female: true, top: 'cardigan', shirt: '#7e7468', scarf: '#6a4e46' },
    pose: 'stand',
    greet: ['Chut ! Les soldats sont au-dessus. Ils nous laissent le rez-de-chaussée tant qu\'on ne fait pas de bruit.', 'Je travaillais ici, avant. Vingt ans à la réception. Maintenant je garde les clés d\'un hôtel en ruine.', 'Ne montez pas. Ils tirent sur ce qui bouge, là-haut, quand ils ont bu.'],
    trade: {
      stock: { alcool: 2, cigarettes: 3, cafe: 2, sucre: 2, bandage: 1, livres: 2 },
      likes: { conserve: 1.5, legumes: 1.4, medicaments: 1.6, bois: 1.3 },
      restock: 4,
      say: 'Les soldats me paient en cigarettes et en gnôle. Moi, c\'est de la nourriture qu\'il me faut.'
    },
    afterSteal: ['Vous aussi ? Je croyais que vous étiez différents.', 'Partez avant que je n\'appelle les soldats.']
  };
  C.NPCS.joe = {
    name: 'Le vieux Joe', title: 'Sans-abri malade',
    look: { hair: 'messy', build: 0.82, h: 0.96, coat: '#51493f', pants: '#2e2b27', coatLen: 0.35, skin: '#a8927c', hairColor: '#8f877c', beard: 'full', top: 'overcoat', shirt: '#5c554a' },
    pose: 'lie', cond: { sick: 65 }, blanket: '#4f4a40',
    greet: ['*tousse* Les gars ne t\'ont pas vu ? Tant mieux pour toi…', 'Ça fait trois nuits que je crache mes poumons.'],
    need: {
      items: { medicaments: 1 }, label: 'Lui donner des médicaments',
      ask: 'Si t\'avais un cachet… n\'importe quoi… Je te dirai où les gars cachent leur réserve.',
      thanks: 'Merci… Écoute : sous l\'escalier de la cave, derrière les planches, il y a leur caisse. Prends-en un peu. Pas tout.',
      reward: { conserve: 2, bois: 3 }, moral: 7
    },
    after: ['Je respire mieux. Grâce à toi.', 'Les gars ne sauront pas que c\'est moi qui t\'ai parlé.']
  };
  C.NPCS.ed = {
    name: 'Ed Morrow', title: 'Père de famille',
    look: { hair: 'short', build: 1.02, h: 1.0, coat: '#4f4a42', pants: '#2c2a26', coatLen: 0.12, skin: '#b19a84', hairColor: '#5b4a3c', beard: 'stubble', brow: 'heavy', top: 'work', shirt: '#655d50', glasses: true },
    pose: 'stand',
    greet: ['Doucement. Ma fille dort à l\'étage.', 'L\'obus a pris l\'autre moitié de la maison. Les Kowalski étaient dedans.', 'On partirait bien, mais pour aller où ?'],
    trade: {
      stock: { legumes: 2, eau: 3, bois: 4, composants: 3, pieces_meca: 1, livres: 2 },
      likes: { medicaments: 1.8, conserve: 1.4, filtre: 1.5, bandage: 1.4 },
      restock: 4,
      say: 'Nina tousse depuis une semaine. Des médicaments, si vous en avez. Je paierai ce qu\'il faut.'
    },
    afterSteal: ['Vous avez volé une gamine malade. Vous êtes contents ?', 'Sortez de chez moi.']
  };
  C.NPCS.nina = {
    name: 'Nina Morrow', title: 'Adolescente malade', noRob: true,
    look: { hair: 'long', build: 0.72, h: 0.86, coat: '#6a6258', pants: '#3a3632', coatLen: 0.1, skin: '#bfae9a', hairColor: '#6e5440', female: true, top: 'hoodie', shirt: '#7e7468' },
    pose: 'lie', cond: { sick: 45 },
    greet: ['Papa ? Ah… Vous êtes qui ?', 'J\'avais un chat. Il est parti le jour de l\'obus.'],
    need: {
      items: { medicaments: 1 }, label: 'Lui donner des médicaments',
      ask: 'Papa dit que ça va passer… mais ça ne passe pas.',
      thanks: 'Merci. Papa ! Papa, regarde ! … Il va vouloir vous donner quelque chose, il est comme ça.',
      reward: { filtre: 1, legumes: 2 }, moral: 8
    },
    after: ['Je me sens mieux. Vous reviendrez ?']
  };

  C.OWNERS.hotel_refugies = {
    text: ' a volé les civils réfugiés au rez-de-chaussée de l\'hôtel.', moral: -8, key: 'stole',
    desc: 'Les affaires d\'Irène et des réfugiés de l\'hôtel.',
    warn: 'Ce sont les réserves des civils qui s\'abritent ici, sous le nez des soldats. Ils n\'ont presque rien.'
  };
  C.OWNERS.squat = {
    text: ' a volé les sans-abri du squat.', moral: -7, key: 'stole',
    desc: 'La réserve commune des gens du squat. Tout ce qu\'ils ont.',
    warn: 'C\'est tout ce que possèdent les sans-abri qui vivent ici. S\'ils vous voient, ils se défendront.'
  };
  C.OWNERS.morrow = {
    text: ' a volé les Morrow, un père et sa fille malade.', moral: -12, key: 'stole_kids',
    desc: 'Les affaires des Morrow.',
    warn: 'Ed Morrow et sa fille Nina vivent de ça. Nina est malade.',
    furn: 'Un meuble des Morrow. Le démonter, c\'est les voler.',
    later: { days: 4, text: 'On raconte que les Morrow ont quitté la ville à pied, sans rien. Nina toussait encore.', moral: -5, key: 'stole_kids' }
  };

  // Plans : voir lieux.js
})(window.CQR);
