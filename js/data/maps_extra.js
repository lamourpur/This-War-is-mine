/* =========================================================
   Trois lieux de plus, comme dans This War of Mine
   - Hôtel : des soldats occupent les étages, des civils s'abritent en bas ;
   - Squat délabré : des sans-abri qui défendent leur coin, couteau à la main ;
   - Maison mitoyenne : une famille dans une moitié de maison, l'autre moitié
     éventrée par un obus.
   ========================================================= */
(function (C) {
  'use strict';

  var STAIRS = [
    { a: { f: 1, x: 420 }, b: { f: 2, x: 260 } },
    { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
    { a: { f: 2, x: 1200 }, b: { f: 3, x: 1360 } }
  ];

  // ------------------------------------------------------------ squatteurs
  C.GUARD_TYPES.squatteur = {
    name: 'Squatteur', hp: 75, weapon: null, tool: 'knife', mdmg: [10, 20], ammo: 0,
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

  // ------------------------------------------------------------ Hôtel
  C.MAPS.hotel = {
    theme: { walls: ['wallpaper', 'wallpaper', 'wallpaper', 'peeling'], dirt: 0.25 },
    stairs: STAIRS,
    walls: [{ f: 0, x: 800 }, { f: 1, x: 760 }, { f: 2, x: 780 }, { f: 3, x: 760 }],
    windows: [{ f: 1, x: 560 }, { f: 1, x: 1000, broken: true }, { f: 2, x: 460 }, { f: 2, x: 1020 }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    zones: [
      { id: 'etage_officiers', f: 2, x0: 140, x1: 1460, group: 'hotel', label: 'Étage des officiers' },
      { id: 'suites', f: 3, x0: 140, x1: 1460, group: 'hotel', label: 'Suites occupées' }
    ],
    decor: [
      { f: 1, x: 640, p: 'vintage_oil_lamp', h: 30 }, { f: 1, x: 1400, p: 'vintage_suitcase', h: 26 },
      { f: 0, x: 560, p: 'wine_bottles_01', h: 20 }, { f: 2, x: 640, p: 'old_military_crate', h: 30 },
      { f: 3, x: 480, p: 'Television_01', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'fauteuil', kind: 'armchair', f: 1, x: 330, deco: true },
      { key: 'irene', kind: 'npc', npc: 'irene', f: 1, x: 560, w: 40, h: 90, facing: 1 },
      { key: 'reception', kind: 'cache', variant: 'commode', label: 'Comptoir de la réception', f: 1, x: 900, w: 64, h: 60, owner: 'hotel_refugies', loot: { cigarettes: 2, sucre: 1, livres: 2 } },
      { key: 'recoin_hall', kind: 'hide', f: 1, x: 1040, w: 46, h: 108 },
      { key: 'bagagerie', kind: 'cache', variant: 'valise', label: 'Bagages abandonnés', f: 1, x: 1320, w: 62, h: 36, loot: { livres: 1, bijoux: 1, cafe: 1 } },
      { key: 'cave_bar', kind: 'cache', variant: 'etagere', label: 'Réserve du bar', f: 0, x: 420, w: 70, h: 104, loot: { alcool: 2, sucre: 1, conserve: 1 } },
      { key: 'porte_cuisines', kind: 'door', f: 0, x: 800, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'chambre_froide', kind: 'cache', variant: 'armoire', label: 'Chambre froide', f: 0, x: 1050, w: 58, h: 112, owner: 'armee', loot: { conserve: 4, viande: 2, eau: 3 } },
      { key: 'soldat_cuisine', kind: 'guard', type: 'soldat', f: 0, x: 1180, facing: -1, attitude: 'neutral', group: 'hotel', sleep: true },
      { key: 'sentinelle_hotel', kind: 'guard', type: 'soldat', f: 2, x: 500, facing: 1, attitude: 'neutral', group: 'hotel', patrol: [360, 740] },
      { key: 'recoin_couloir', kind: 'hide', f: 2, x: 820, w: 46, h: 108 },
      { key: 'chambre_12', kind: 'cache', variant: 'armoire', label: 'Chambre 12', f: 2, x: 1000, w: 58, h: 112, owner: 'armee', loot: { munitions: 8, medicaments: 1, cigarettes: 2 } },
      { key: 'soldat_etage', kind: 'guard', type: 'soldat', f: 2, x: 1300, facing: -1, attitude: 'neutral', group: 'hotel', patrol: [1000, 1420] },
      { key: 'lit_officier', kind: 'bed', f: 3, x: 560, deco: true },
      { key: 'officier', kind: 'guard', type: 'intendant', name: 'Lieutenant Kerr', f: 3, x: 620, facing: 1, attitude: 'neutral', group: 'hotel', sleep: true },
      { key: 'suite_coffre', kind: 'cache', variant: 'coffre', label: 'Coffre de la suite', f: 3, x: 1000, w: 60, h: 48, owner: 'armee', locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 3, montre: 1, medicaments: 2 } },
      { key: 'suite_bar', kind: 'cache', variant: 'etagere', label: 'Minibar', f: 3, x: 1200, w: 70, h: 104, owner: 'armee', loot: { alcool: 2, cafe: 2, cigarettes: 3 } }
    ]
  };

  // ------------------------------------------------------------ Squat délabré
  C.MAPS.squat = {
    theme: { walls: ['brickPlaster', 'plaster2', 'peeling', 'brickPlaster'], dirt: 0.55 },
    stairs: STAIRS,
    walls: [{ f: 0, x: 760 }, { f: 1, x: 820 }, { f: 2, x: 700 }, { f: 3, x: 640 }],
    windows: [{ f: 1, x: 560, broken: true }, { f: 1, x: 1000, broken: true }, { f: 2, x: 460, broken: true }, { f: 2, x: 1020, broken: true }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    zones: [
      { id: 'chez_eux', f: 1, x0: 830, x1: 1460, group: 'squat', label: 'Le coin du squat', sign: 'CHEZ NOUS', signHostile: 'ILS VOUS EN VEULENT' },
      { id: 'dortoir', f: 2, x0: 710, x1: 1460, group: 'squat', label: 'Le dortoir', sign: 'CHEZ NOUS', signHostile: 'ILS VOUS EN VEULENT' }
    ],
    decor: [
      { f: 1, x: 300, p: 'metal_trash_can', h: 34 }, { f: 1, x: 1400, p: 'cardboard_box_01', h: 30 },
      { f: 0, x: 560, p: 'old_tyre', h: 26 }, { f: 2, x: 480, p: 'cardboard_box_01', h: 30 }, { f: 3, x: 1400, p: 'metal_jerrycan', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'detritus', kind: 'rubble', f: 1, x: 560, w: 96, h: 42, work: 60, loot: { bois: 3, composants: 2 } },
      { key: 'recoin_entree', kind: 'hide', f: 1, x: 760, w: 46, h: 108 },
      { key: 'squatteur_feu', kind: 'guard', type: 'squatteur', name: 'Gus', f: 1, x: 1050, facing: -1, attitude: 'neutral', group: 'squat', patrol: [900, 1250] },
      { key: 'reserve_commune', kind: 'cache', variant: 'caisse', label: 'Réserve commune', f: 1, x: 1320, w: 78, h: 48, owner: 'squat', loot: { conserve: 2, bois: 3, cigarettes: 1 } },
      { key: 'joe', kind: 'npc', npc: 'joe', f: 2, x: 520, w: 90, h: 30, facing: 1 },
      { key: 'squatteur_dortoir', kind: 'guard', type: 'squatteur', name: 'Marv', f: 2, x: 1000, facing: 1, attitude: 'neutral', group: 'squat', sleep: true },
      { key: 'matelas', kind: 'cache', variant: 'valise', label: 'Affaires sous un matelas', f: 2, x: 1300, w: 62, h: 36, owner: 'squat', loot: { bandage: 1, tabac: 2, bijoux: 1 } },
      { key: 'cave_bric', kind: 'cache', variant: 'caisse', label: 'Bric-à-brac', f: 0, x: 420, w: 78, h: 48, loot: { composants: 3, pieces_meca: 1 } },
      { key: 'planches_cave', kind: 'rubble', f: 0, x: 900, w: 90, h: 40, work: 60, loot: { bois: 2 } },
      { key: 'caisse_cachee', kind: 'cache', variant: 'caisse', label: 'Caisse cachée des squatteurs', f: 0, x: 1150, w: 78, h: 48, owner: 'squat', loot: { conserve: 2, medicaments: 1, munitions: 4 } },
      { key: 'eboulis_toit', kind: 'rubble', f: 3, x: 900, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'squatteur_toit', kind: 'guard', type: 'squatteur', name: 'Lou', f: 3, x: 1200, facing: -1, attitude: 'neutral', group: 'squat_toit', patrol: [1000, 1400] },
      { key: 'pigeonnier', kind: 'cache', variant: 'caisse', label: 'Pigeonnier', f: 3, x: 420, w: 78, h: 48, loot: { viande: 2, bois: 2 } }
    ]
  };

  // ------------------------------------------------------------ Maison mitoyenne
  // Côté ouest : les Morrow. Côté est : la moitié éventrée (les Kowalski, morts
  // dans le bombardement) — on s'y sert sans voler personne.
  C.MAPS.maison_mitoyenne = {
    theme: { walls: ['wallpaper', 'wallpaper', 'peeling', 'plaster2'], dirt: 0.3 },
    stairs: STAIRS,
    walls: [{ f: 0, x: 800 }, { f: 1, x: 800 }, { f: 2, x: 800 }, { f: 3, x: 800 }],
    windows: [{ f: 1, x: 560 }, { f: 1, x: 1000, broken: true }, { f: 2, x: 460 }, { f: 2, x: 1020, broken: true }, { f: 3, x: 330 }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    decor: [
      { f: 1, x: 640, p: 'wooden_stool_01', h: 28 }, { f: 1, x: 1400, p: 'cardboard_box_01', h: 30 },
      { f: 0, x: 600, p: 'wooden_barrels_01', h: 30 }, { f: 2, x: 700, p: 'vintage_oil_lamp', h: 30 }, { f: 3, x: 1400, p: 'vintage_suitcase', h: 26 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'ed', kind: 'npc', npc: 'ed', f: 1, x: 560, w: 40, h: 90, facing: 1 },
      { key: 'poele', kind: 'stove', f: 1, x: 680, deco: true },
      { key: 'cuisine_morrow', kind: 'cache', variant: 'armoire', label: 'Cuisine des Morrow', f: 1, x: 330, w: 58, h: 112, owner: 'morrow', loot: { conserve: 2, legumes: 2, eau: 2 } },
      { key: 'gravats_salon', kind: 'rubble', f: 1, x: 1000, w: 96, h: 42, work: 90, loot: { bois: 3, composants: 2 } },
      { key: 'salon_kowalski', kind: 'cache', variant: 'commode', label: 'Commode des Kowalski', f: 1, x: 1320, w: 64, h: 60, loot: { livres: 2, bijoux: 1, cigarettes: 1 } },
      { key: 'cave_morrow', kind: 'cache', variant: 'etagere', label: 'Conserves des Morrow', f: 0, x: 420, w: 70, h: 104, owner: 'morrow', loot: { conserve: 2, sucre: 1, engrais: 1 } },
      { key: 'mur_cave', kind: 'rubble', f: 0, x: 800, w: 104, h: 150, block: true, work: 120, loot: { bois: 2, composants: 3 } },
      { key: 'cave_kowalski', kind: 'cache', variant: 'coffre', label: 'Malle des Kowalski', f: 0, x: 1100, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_elec: 2, medicaments: 1, munitions: 4, alcool: 1 } },
      { key: 'lit_nina', kind: 'bed', f: 2, x: 500, deco: true },
      { key: 'nina', kind: 'npc', npc: 'nina', f: 2, x: 500, w: 90, h: 44, facing: 1, onBed: true },
      { key: 'armoire_nina', kind: 'furniture', variant: 'armoire', f: 2, x: 700, w: 58, h: 112, work: 60, owner: 'morrow', loot: { bois: 3 } },
      { key: 'chambre_kowalski', kind: 'cache', variant: 'armoire', label: 'Chambre éventrée', f: 2, x: 1300, w: 58, h: 112, loot: { bandage: 1, livres: 2, tabac: 1 } },
      { key: 'grenier', kind: 'cache', variant: 'valise', label: 'Grenier', f: 3, x: 1150, w: 62, h: 36, loot: { composants: 2, pieces_meca: 1, bois: 2 } }
    ]
  };
})(window.CQR);
