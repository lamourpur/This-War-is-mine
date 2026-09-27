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

  var STAIRS = [
    { a: { f: 1, x: 420 }, b: { f: 2, x: 260 } },
    { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
    { a: { f: 2, x: 1200 }, b: { f: 3, x: 1360 } }
  ];
  var WIN = [{ f: 1, x: 560, broken: true }, { f: 1, x: 1000, broken: true }, { f: 2, x: 460, broken: true }, { f: 2, x: 1020 }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }];
  function M(o) { if (!o.stairs) o.stairs = STAIRS; if (!o.windows) o.windows = WIN; if (!o.zones) o.zones = []; return o; }

  // ------------------------------------------------------------ Chantier de construction
  C.MAPS.chantier = M({
    theme: { walls: ['plaster', 'plaster2', 'plaster', 'brickPlaster'], dirt: 0.4 },
    walls: [{ f: 0, x: 760 }, { f: 1, x: 820 }, { f: 2, x: 700 }, { f: 3, x: 640 }],
    zones: [{ id: 'coin_rick', f: 2, x0: 720, x1: 1460, group: 'rick', label: 'Le coin de Rick', sign: 'CHASSE GARDÉE', signHostile: 'IL VOUS EN VEUT' }],
    decor: [
      { f: 1, x: 300, p: 'cement_bag', h: 22 }, { f: 1, x: 640, p: 'wooden_ladder', h: 90 }, { f: 1, x: 1400, p: 'metal_trash_can', h: 34 },
      { f: 0, x: 300, p: 'old_tyre', h: 26 }, { f: 2, x: 480, p: 'cement_bag', h: 22 }, { f: 3, x: 1400, p: 'propane_tank', h: 40 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'planches', kind: 'rubble', f: 1, x: 520, w: 96, h: 42, work: 60, loot: { bois: 4, composants: 2 } },
      { key: 'outils', kind: 'cache', variant: 'caisse', label: 'Caisse à outils', f: 1, x: 900, w: 78, h: 48, loot: { pieces_meca: 2, composants: 3 } },
      { key: 'recoin_rdc', kind: 'hide', f: 1, x: 1060, w: 46, h: 108 },
      { key: 'cabane', kind: 'cache', variant: 'armoire', label: 'Cabane de chantier', f: 1, x: 1320, w: 58, h: 112, loot: { conserve: 1, engrais: 2, carburant: 1 } },
      { key: 'gravats_cave', kind: 'rubble', f: 0, x: 520, w: 90, h: 40, work: 60, loot: { composants: 3, bois: 2 } },
      { key: 'grille', kind: 'grate', f: 0, x: 900, w: 26, h: 132, tools: ['scie'] },
      { key: 'depot', kind: 'cache', variant: 'coffre', label: 'Dépôt du chef de chantier', f: 0, x: 1050, w: 60, h: 48, loot: { pieces_meca: 4, pieces_elec: 2, carburant: 2 } },
      { key: 'ferraille', kind: 'rubble', f: 2, x: 420, w: 90, h: 40, work: 60, loot: { composants: 4, pieces_meca: 1 } },
      { key: 'recoin_etage', kind: 'hide', f: 2, x: 640, w: 46, h: 108 },
      { key: 'rick', kind: 'guard', type: 'pilleur', name: 'Rick', f: 2, x: 1000, facing: -1, attitude: 'neutral', group: 'rick', patrol: [800, 1150] },
      { key: 'sac_rick', kind: 'cache', variant: 'valise', label: 'Sac de Rick', f: 2, x: 1300, w: 62, h: 36, owner: 'pilleur', loot: { conserve: 1, bois: 2, composants: 2 } },
      { key: 'eboulis', kind: 'rubble', f: 3, x: 820, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'palette_toit', kind: 'cache', variant: 'caisse', f: 3, x: 400, w: 78, h: 48, loot: { bois: 4, composants: 3 } },
      { key: 'bidons', kind: 'cache', variant: 'caisse', label: 'Bidons', f: 3, x: 1150, w: 78, h: 48, loot: { carburant: 1, engrais: 1, conserve: 1 } }
    ]
  });

  // ------------------------------------------------------------ Supermarché pillé (bandits)
  C.MAPS.supermarche = M({
    theme: { walls: ['plaster', 'peeling', 'plaster2', 'plaster'], dirt: 0.42 },
    walls: [{ f: 0, x: 780 }, { f: 1, x: 900 }, { f: 2, x: 680 }, { f: 3, x: 640 }],
    windows: [{ f: 1, x: 560, tall: false, broken: true }, { f: 1, x: 1040, broken: true }, { f: 2, x: 460, broken: true }, { f: 2, x: 1020 }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    decor: [
      { f: 1, x: 290, p: 'plastic_crate_01', h: 26 }, { f: 1, x: 1400, p: 'trashbag', h: 32 }, { f: 1, x: 760, p: 'cardboard_box_01', h: 28, shade: 0.3 },
      { f: 0, x: 1180, p: 'russian_food_cans_01', h: 16 }, { f: 0, x: 900, p: 'wine_bottles_01', h: 20 },
      { f: 2, x: 1400, p: 'metal_trash_can', h: 34 }, { f: 3, x: 480, p: 'cardboard_box_01', h: 30, shade: 0.3 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'rayon1', kind: 'cache', variant: 'etagere', label: 'Rayon vidé', f: 1, x: 520, w: 70, h: 104, loot: { conserve: 2, sucre: 1 } },
      { key: 'recoin_rayons', kind: 'hide', f: 1, x: 660, w: 46, h: 108 },
      { key: 'rayon2', kind: 'cache', variant: 'etagere', label: 'Rayon renversé', f: 1, x: 800, w: 70, h: 104, loot: { legumes: 2, eau: 2, composants: 2 } },
      { key: 'caisse_enreg', kind: 'cache', variant: 'coffre', label: 'Caisse enregistreuse', f: 1, x: 1000, w: 60, h: 48, loot: { cigarettes: 3 } },
      { key: 'guetteur', kind: 'guard', type: 'bandit', f: 1, x: 1250, facing: -1, attitude: 'hostile', group: 'bande', patrol: [960, 1400] },
      { key: 'reserve', kind: 'cache', variant: 'caisse', label: 'Réserve', f: 0, x: 1000, w: 78, h: 48, owner: 'bande', loot: { conserve: 4, cafe: 2, sucre: 2 } },
      { key: 'matelas_bandit', kind: 'bed', f: 0, x: 560, deco: true },
      { key: 'dormeur', kind: 'guard', type: 'bandit', f: 0, x: 560, facing: 1, attitude: 'hostile', group: 'bande', sleep: true },
      { key: 'porte_froide', kind: 'door', f: 0, x: 780, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'chambre_froide', kind: 'cache', variant: 'armoire', label: 'Chambre froide', f: 0, x: 300, w: 58, h: 112, loot: { conserve: 4, cafe: 2, tabac: 3 } },
      { key: 'recoin_cave', kind: 'hide', f: 0, x: 1130, w: 46, h: 108 },
      { key: 'chef', kind: 'guard', type: 'bandit_arme', f: 2, x: 900, facing: 1, attitude: 'hostile', group: 'bande', patrol: [760, 1150] },
      { key: 'butin_bande', kind: 'cache', variant: 'coffre', label: 'Butin de la bande', f: 2, x: 1320, w: 60, h: 48, owner: 'bande', loot: { alcool: 1, cigarettes: 3, conserve: 2, cafe: 1 } },
      { key: 'bureau', kind: 'cache', variant: 'armoire', label: 'Bureau du gérant', f: 2, x: 450, w: 58, h: 112, loot: { livres: 2, composants: 2 } },
      { key: 'recoin_bureau', kind: 'hide', f: 2, x: 620, w: 46, h: 108 },
      { key: 'eboulis', kind: 'rubble', f: 3, x: 820, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'cartons', kind: 'cache', variant: 'caisse', label: 'Cartons', f: 3, x: 1100, w: 78, h: 48, loot: { legumes: 2, eau: 2 } }
    ]
  });

  // ------------------------------------------------------------ Immeuble éventré
  C.MAPS.immeuble = M({
    theme: { walls: ['wallpaper', 'peeling', 'wallpaper', 'plaster2'], dirt: 0.36 },
    walls: [{ f: 0, x: 800 }, { f: 1, x: 760 }, { f: 2, x: 820 }, { f: 3, x: 700 }],
    zones: [{ id: 'appart_kurt', f: 3, x0: 720, x1: 1460, group: 'kurt', label: 'L\'appartement de Kurt', sign: 'CHASSE GARDÉE', signHostile: 'IL VOUS EN VEUT' }],
    decor: [
      { f: 1, x: 300, p: 'trashbag', h: 32 }, { f: 1, x: 1400, p: 'Television_01', h: 28 },
      { f: 2, x: 700, p: 'wooden_stool_01', h: 28 }, { f: 2, x: 1400, p: 'vintage_oil_lamp', h: 30 },
      { f: 0, x: 600, p: 'wooden_barrels_01', h: 30 }, { f: 3, x: 480, p: 'old_tyre', h: 26 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'cuisine1', kind: 'cache', variant: 'armoire', label: 'Cuisine du rez-de-chaussée', f: 1, x: 560, w: 58, h: 112, loot: { conserve: 2, eau: 2, legumes: 1 } },
      { key: 'fauteuil', kind: 'armchair', f: 1, x: 900, deco: true },
      { key: 'commode', kind: 'furniture', variant: 'commode', f: 1, x: 1100, w: 64, h: 60, work: 60, loot: { bois: 3, livres: 1 } },
      { key: 'gravats1', kind: 'rubble', f: 1, x: 1320, w: 96, h: 42, work: 90, loot: { bois: 2, composants: 3 } },
      { key: 'cave_casiers', kind: 'cache', variant: 'etagere', label: 'Casiers de la cave', f: 0, x: 420, w: 70, h: 104, loot: { eau: 2, legumes: 2, filtre: 1 } },
      { key: 'coffre_cave', kind: 'cache', variant: 'coffre', label: 'Coffre-fort d\'un voisin', f: 0, x: 1050, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { conserve: 2, medicaments: 1, bijoux: 1 } },
      { key: 'chambre2', kind: 'cache', variant: 'armoire', label: 'Penderie', f: 2, x: 480, w: 58, h: 112, loot: { bandage: 1, livres: 2, cafe: 1 } },
      { key: 'lit2', kind: 'bed', f: 2, x: 700, deco: true },
      { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1000, w: 70, h: 124, work: 90, loot: { bois: 3, livres: 2 } },
      { key: 'recoin2', kind: 'hide', f: 2, x: 1140, w: 46, h: 108 },
      { key: 'kurt', kind: 'guard', type: 'pilleur', name: 'Kurt', f: 3, x: 1000, facing: -1, attitude: 'neutral', group: 'kurt', patrol: [780, 1250] },
      { key: 'recoin3', kind: 'hide', f: 3, x: 620, w: 46, h: 108 },
      { key: 'placard3', kind: 'cache', variant: 'etagere', f: 3, x: 400, w: 70, h: 104, loot: { conserve: 1, bois: 3 } },
      { key: 'butin_kurt', kind: 'cache', variant: 'valise', label: 'Sac de Kurt', f: 3, x: 1300, w: 62, h: 36, owner: 'pilleur', loot: { conserve: 1, composants: 2, eau: 1 } }
    ]
  });

  // ------------------------------------------------------------ Boulangerie détruite (calme, gravats)
  C.MAPS.boulangerie = M({
    theme: { walls: ['peeling', 'plaster2', 'wallpaper', 'plaster2'], dirt: 0.38 },
    walls: [{ f: 0, x: 800 }, { f: 1, x: 780 }, { f: 2, x: 760 }, { f: 3, x: 620 }],
    decor: [
      { f: 1, x: 300, p: 'wooden_crate_02', h: 24 }, { f: 1, x: 1180, p: 'wooden_bucket_01', h: 24 },
      { f: 0, x: 560, p: 'compost_bags', h: 26 }, { f: 2, x: 1400, p: 'wooden_stool_01', h: 28 }, { f: 3, x: 1400, p: 'wooden_ladder', h: 90 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'comptoir', kind: 'cache', variant: 'caisse', label: 'Comptoir', f: 1, x: 420, w: 78, h: 48, loot: { sucre: 1, composants: 1 } },
      { key: 'four', kind: 'stove', f: 1, x: 620, deco: true },
      { key: 'effondrement', kind: 'rubble', f: 1, x: 900, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'fournil', kind: 'cache', variant: 'etagere', label: 'Étagères du fournil', f: 1, x: 1060, w: 70, h: 104, loot: { sucre: 2, legumes: 2, eau: 2 } },
      { key: 'gravats_fournil', kind: 'rubble', f: 1, x: 1330, w: 96, h: 42, work: 90, loot: { bois: 3, carburant: 1 } },
      { key: 'porte_reserve', kind: 'door', f: 0, x: 800, w: 30, h: 112, tools: ['pied_de_biche'] },
      { key: 'reserve', kind: 'cache', variant: 'caisse', label: 'Réserve de farine et de sucre', f: 0, x: 1000, w: 78, h: 48, loot: { sucre: 3, conserve: 3, cafe: 1 } },
      { key: 'sacs_cave', kind: 'cache', variant: 'etagere', label: 'Conserves du boulanger', f: 0, x: 1260, w: 70, h: 104, loot: { conserve: 2, eau: 1 } },
      { key: 'gravats_cave', kind: 'rubble', f: 0, x: 420, w: 90, h: 40, work: 60, loot: { bois: 2, composants: 1 } },
      { key: 'logement', kind: 'cache', variant: 'armoire', label: 'Armoire du boulanger', f: 2, x: 480, w: 58, h: 112, loot: { legumes: 1, bois: 1, bandage: 1 } },
      { key: 'lit', kind: 'bed', f: 2, x: 1000, deco: true },
      { key: 'eboulis2', kind: 'rubble', f: 2, x: 1300, w: 96, h: 42, work: 90, loot: { bois: 2, composants: 2 } },
      { key: 'grenier', kind: 'cache', variant: 'valise', label: 'Malle du grenier', f: 3, x: 1080, w: 62, h: 36, loot: { sucre: 1, conserve: 1 } }
    ]
  });

  // ------------------------------------------------------------ Garage automobile
  C.MAPS.garage = M({
    theme: { walls: ['plaster2', 'brickPlaster', 'plaster2', 'plaster'], dirt: 0.45 },
    walls: [{ f: 0, x: 800 }, { f: 1, x: 1000 }, { f: 2, x: 700 }, { f: 3, x: 640 }],
    zones: [{ id: 'atelier_ray', f: 1, x0: 1235, x1: 1460, group: 'ray', label: 'L\'atelier de Ray', sign: 'CHASSE GARDÉE', signHostile: 'IL VOUS EN VEUT' }],
    decor: [
      { f: 1, x: 300, p: 'rusted_wheel_rim_01', h: 26 }, { f: 1, x: 900, p: 'metal_jerrycan', h: 28 }, { f: 1, x: 1400, p: 'old_tyre', h: 26 },
      { f: 0, x: 560, p: 'wooden_barrels_01', h: 30 }, { f: 2, x: 480, p: 'metal_tool_chest', h: 26 }, { f: 3, x: 1400, p: 'old_tyre', h: 26 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'epave1', kind: 'cache', variant: 'epave', label: 'Voiture éventrée', f: 1, x: 520, w: 150, h: 60, loot: { pieces_meca: 2, composants: 3, carburant: 1 } },
      { key: 'recoin_atelier', kind: 'hide', f: 1, x: 760, w: 46, h: 108 },
      { key: 'etabli', kind: 'cache', variant: 'caisse', label: 'Établi du mécanicien', f: 1, x: 900, w: 78, h: 48, loot: { composants: 3, pieces_meca: 1 } },
      { key: 'ray', kind: 'guard', type: 'pilleur', name: 'Ray', f: 1, x: 1320, facing: -1, attitude: 'neutral', group: 'ray', patrol: [1250, 1420] },
      { key: 'epave2', kind: 'cache', variant: 'epave', label: 'Camionnette démontée', f: 1, x: 1330, w: 150, h: 60, owner: 'pilleur', loot: { pieces_meca: 3, carburant: 2, pieces_elec: 1 } },
      { key: 'fosse', kind: 'cache', variant: 'caisse', label: 'Fosse de vidange', f: 0, x: 1050, w: 78, h: 48, loot: { carburant: 1, composants: 2 } },
      { key: 'armoire_meca', kind: 'cache', variant: 'coffre', label: 'Armoire à outils fermée', f: 0, x: 420, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 3, munitions: 6, pied_de_biche: 1 } },
      { key: 'bureau', kind: 'cache', variant: 'armoire', label: 'Bureau du garage', f: 2, x: 480, w: 58, h: 112, loot: { conserve: 1, bois: 2, pieces_elec: 1 } },
      { key: 'recoin2', kind: 'hide', f: 2, x: 620, w: 46, h: 108 },
      { key: 'pneus', kind: 'rubble', f: 2, x: 1000, w: 96, h: 42, work: 60, loot: { composants: 2, bois: 1 } },
      { key: 'eboulis', kind: 'rubble', f: 3, x: 820, w: 104, h: 150, block: true, work: 150, loot: { bois: 2, composants: 2 } },
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse', f: 3, x: 1150, w: 78, h: 48, loot: { pieces_meca: 1, composants: 2 } }
    ]
  });

  // ------------------------------------------------------------ Villa en ruine (bandits)
  C.MAPS.villa = M({
    theme: { walls: ['wallpaper', 'wallpaper', 'peeling', 'plaster2'], dirt: 0.2 },
    walls: [{ f: 0, x: 800 }, { f: 1, x: 760 }, { f: 2, x: 820 }, { f: 3, x: 640 }],
    windows: [{ f: 1, x: 560, tall: true }, { f: 1, x: 1000, tall: true }, { f: 2, x: 460 }, { f: 2, x: 1020, broken: true }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010 }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    decor: [
      { f: 1, x: 1400, p: 'vintage_oil_lamp', h: 30 }, { f: 1, x: 640, p: 'wine_bottles_01', h: 20 },
      { f: 0, x: 1180, p: 'wine_bottles_01', h: 20 }, { f: 2, x: 1400, p: 'vintage_suitcase', h: 26 }, { f: 3, x: 480, p: 'Television_01', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'recoin_hall', kind: 'hide', f: 1, x: 300, w: 46, h: 108 },
      { key: 'fauteuil', kind: 'armchair', f: 1, x: 520, deco: true },
      { key: 'buffet', kind: 'cache', variant: 'armoire', label: 'Buffet du salon', f: 1, x: 680, w: 58, h: 112, loot: { alcool: 1, conserve: 2 } },
      { key: 'garde_salon', kind: 'guard', type: 'bandit_arme', f: 1, x: 1000, facing: -1, attitude: 'hostile', group: 'pillards', lookBack: 8 },
      { key: 'cuisine', kind: 'cache', variant: 'etagere', label: 'Cuisine', f: 1, x: 1320, w: 70, h: 104, loot: { conserve: 2, viande: 2, cafe: 1 } },
      { key: 'cave_vins', kind: 'cache', variant: 'etagere', label: 'Cave à vins', f: 0, x: 420, w: 70, h: 104, loot: { alcool: 1, cafe: 1 } },
      { key: 'porte_coffre', kind: 'door', f: 0, x: 800, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'coffre_fort', kind: 'cache', variant: 'coffre', label: 'Coffre-fort de l\'industriel', f: 0, x: 1050, w: 60, h: 48, locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 4, pistolet: 1, munitions: 6 } },
      { key: 'recoin_cave', kind: 'hide', f: 0, x: 1250, w: 46, h: 108 },
      { key: 'bibliotheque', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 420, w: 70, h: 124, work: 90, loot: { bois: 3, livres: 5 } },
      { key: 'recoin_etage', kind: 'hide', f: 2, x: 700, w: 46, h: 108 },
      { key: 'rodeur', kind: 'guard', type: 'bandit', f: 2, x: 1100, facing: -1, attitude: 'hostile', group: 'pillards', patrol: [880, 1350] },
      { key: 'chambre', kind: 'cache', variant: 'coffre', label: 'Coffret à bijoux', f: 2, x: 1330, w: 60, h: 48, loot: { bijoux: 2, cafe: 1 } },
      { key: 'lit_maitre', kind: 'bed', f: 2, x: 1000, deco: true },
      { key: 'grenier', kind: 'cache', variant: 'valise', label: 'Malles du grenier', f: 3, x: 400, w: 62, h: 36, loot: { livres: 2, pieces_elec: 2 } },
      { key: 'dormeur', kind: 'guard', type: 'bandit', f: 3, x: 1000, facing: 1, attitude: 'hostile', group: 'pillards', sleep: true },
      { key: 'butin_pillards', kind: 'cache', variant: 'caisse', label: 'Butin des pillards', f: 3, x: 1200, w: 78, h: 48, loot: { bois: 4, conserve: 2, alcool: 1 } }
    ]
  });

  // ------------------------------------------------------------ Carrefour sous le feu (tireur embusqué)
  // Le rez-de-chaussée est la rue : les portions à découvert (exposed) sont
  // sous l'œil du tireur. On passe d'épave en épave, en courant, ou par le métro.
  C.MAPS.carrefour = M({
    theme: { walls: ['brickPlaster', 'plaster2', 'plaster2', 'brickPlaster'], dirt: 0.45 },
    stairs: [
      { a: { f: 1, x: 420 }, b: { f: 0, x: 260 } },
      { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
      { a: { f: 1, x: 600 }, b: { f: 2, x: 440 } }
    ],
    walls: [{ f: 0, x: 800 }, { f: 2, x: 700 }],
    windows: [{ f: 2, x: 460, broken: true }, { f: 2, x: 1020, broken: true }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    exposed: [{ f: 1, x0: 640, x1: 1460, label: 'À découvert' }],
    decor: [
      { f: 1, x: 300, p: 'metal_trash_can', h: 34 }, { f: 1, x: 760, p: 'old_tyre', h: 26 }, { f: 1, x: 1250, p: 'rusted_wheel_rim_01', h: 26 },
      { f: 0, x: 600, p: 'trashbag', h: 32 }, { f: 0, x: 1000, p: 'cardboard_box_01', h: 30, shade: 0.3 }, { f: 2, x: 600, p: 'cardboard_box_01', h: 30, shade: 0.3 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'kiosque', kind: 'cache', variant: 'caisse', label: 'Kiosque à journaux', f: 1, x: 520, w: 78, h: 48, loot: { cafe: 1, livres: 2 } },
      { key: 'epave_bus', kind: 'cache', variant: 'epave', label: 'Autobus criblé de balles', f: 1, x: 760, w: 160, h: 64, loot: { conserve: 3, medicaments: 1 } },
      { key: 'abri1', kind: 'hide', f: 1, x: 860, w: 46, h: 108 },
      { key: 'epave_ambulance', kind: 'cache', variant: 'epave', label: 'Ambulance abandonnée', f: 1, x: 1000, w: 150, h: 60, loot: { medicaments: 2, bandage: 2, pieces_elec: 1 } },
      { key: 'abri2', kind: 'hide', f: 1, x: 1110, w: 46, h: 108 },
      { key: 'epave_militaire', kind: 'cache', variant: 'epave', label: 'Jeep militaire', f: 1, x: 1330, w: 150, h: 60, loot: { munitions: 8, carburant: 2, pieces_meca: 2 } },
      { key: 'metro', kind: 'cache', variant: 'etagere', label: 'Guichet du métro', f: 0, x: 600, w: 70, h: 104, loot: { eau: 2, conserve: 1 } },
      { key: 'gravats_metro', kind: 'rubble', f: 0, x: 1000, w: 96, h: 42, work: 90, loot: { pieces_meca: 3, pieces_elec: 2, composants: 2 } },
      { key: 'epave_cave', kind: 'cache', variant: 'caisse', label: 'Caisses d\'un marchand', f: 0, x: 1200, w: 78, h: 48, loot: { conserve: 2, cafe: 1, carburant: 1 } },
      { key: 'balcon', kind: 'cache', variant: 'armoire', label: 'Appartement du coin', f: 2, x: 900, w: 58, h: 112, loot: { conserve: 1, pieces_meca: 2 } },
      { key: 'eboulis_haut', kind: 'rubble', f: 2, x: 1150, w: 104, h: 150, block: true, work: 150, loot: { bois: 2, composants: 2 } },
      { key: 'tireur', kind: 'guard', type: 'tireur', f: 3, x: 1400, facing: -1, attitude: 'hostile', group: 'tireur' }
    ]
  });

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
