/* =========================================================
   Soldats et lieux gardés
   Des gens armés occupent certains lieux explorables. Ils patrouillent,
   voient devant eux, entendent le bruit, et réagissent :
   - neutral : tolèrent les civils, mais avertissent quiconque entre dans
     leur zone (zones), puis ouvrent le feu ; voler sous leurs yeux ou
     attaquer l'un d'eux rend tout le groupe hostile ;
   - hostile : tirent à vue.
   group : les membres d'un même groupe se soutiennent (un soldat isolé
   qui abuse de son uniforme n'engage pas la garnison).
   ========================================================= */
(function (C) {
  'use strict';

  var LOOK_SOLDAT = { hair: 'buzz', build: 1.05, h: 1.02, coat: '#4d5140', pants: '#3c3f31', coatLen: 0.12, skin: '#a8917a', hairColor: '#2e2822', beard: 'stubble', brow: 'heavy', top: 'work', shirt: '#5b5e4a', hat: 'helmet', hatColor: '#4a4e3c', bag: true };
  function look(over) { var o = {}; for (var k in LOOK_SOLDAT) o[k] = LOOK_SOLDAT[k]; for (k in over) o[k] = over[k]; return o; }

  // hp : points de vie · dmg : blessure infligée par tir ou coup · acc : précision de base
  // sight : portée de vue · walk / run : vitesse (px par minute de jeu)
  C.GUARD_TYPES = {
    soldat: {
      name: 'Soldat', look: LOOK_SOLDAT, hp: 100, weapon: 'fusil', tool: 'rifle', ammo: 14,
      dmg: [22, 38], acc: 0.62, range: 520, sight: 330, walk: 46, run: 100,
      loot: { munitions: 4, conserve: 1, cigarettes: 1, pieces_armes: 1 },
      // Conversation : réplique du survivant, puis réponse du soldat
      talk: [
        ['Bonsoir. Je ne cherche pas d\'ennuis.', 'Alors restez de votre côté de la ligne rouge, et on s\'entendra.'],
        ['Vous gardez quoi, là-dedans ?', 'Des rations, des munitions. De quoi tenir le secteur. Pas pour vous.'],
        ['On dit que le cessez-le-feu approche.', 'On dit beaucoup de choses. Moi, je compte les nuits.'],
        ['Ça fait longtemps que vous êtes ici ?', 'Trois mois. Avant, je réparais des vélos. Drôle de monde.'],
        ['Vous avez des enfants ?', 'Une fille. Elle a six ans. Elle est chez sa grand-mère, de l\'autre côté du fleuve.']
      ],
      say: {
        idle: ['…', 'Encore une nuit à garder des caisses.', 'Il fait un froid de chien.'],
        suspect: ['Qui va là ?', 'Il y a quelqu\'un ?', 'J\'ai entendu quelque chose…'],
        greet: ['Circulez. Rien à voir ici.', 'Pas de pillage dans le secteur. Compris ?'],
        warn: ['Halte ! Zone militaire ! Demi-tour, tout de suite !', 'Hé ! Vous n\'avez rien à faire ici. Dehors !'],
        warn2: ['Dernier avertissement !', 'Je ne le répéterai pas !'],
        attack: ['Contact !', 'Plus un geste !', 'Je t\'avais prévenu !'],
        lost: ['Il s\'est volatilisé…', 'Reste sur tes gardes.'],
        hurt: ['Je suis touché !', 'Aaah !'],
        surrender: ['Pitié ! Ne tirez pas ! J\'ai une femme, deux gosses…', 'Je me rends ! Je me rends !'],
        spared: ['Merci… Je m\'en vais. Vous ne me reverrez pas.']
      }
    },
    intendant: {
      name: 'Sergent Maddox', look: look({ build: 1.14, h: 1.0, beard: 'full', hairColor: '#4a3f36', hat: 'cap', hatColor: '#3f4334', bag: false, coat: '#545844' }),
      hp: 110, weapon: 'pistolet', tool: 'pistol', ammo: 10, dmg: [22, 36], acc: 0.62, range: 420, sight: 300, walk: 40, run: 90,
      loot: { munitions: 3, cafe: 1, cigarettes: 2 },
      talk: [
        ['Vous vendez quoi, sergent ?', 'Ce que l\'armée ne comptera pas. Parlez-moi de gnôle, de café ou de bijoux.'],
        ['Et le soldat du premier étage ?', 'Holt ? Il boit. Ce qu\'il fait là-haut, je ne veux pas le savoir. Ce n\'est pas mon problème.'],
        ['Qu\'est-ce qu\'il y a, à la cave ?', 'L\'armurerie. Un de mes gars y dort pendant sa garde. Ne le réveillez pas.'],
        ['Le reste de l\'entrepôt, on peut fouiller ?', 'Les hangars à gauche de la ligne, oui. Le dépôt, non. Je ne le dirai pas deux fois.'],
        ['Ça tient, le front ?', 'Le front ? Il est partout et nulle part. On garde des caisses, c\'est tout ce qu\'on sait faire.']
      ],
      trade: {
        stock: { munitions: 8, conserve: 4, bandage: 2, medicaments: 1, cigarettes: 3, carburant: 2, filtre: 1 },
        likes: { alcool: 1.5, bijoux: 1.3, montre: 1.35, cafe: 1.3, tabac: 1.25, diamants: 1.4 },
        restock: 3,
        say: 'Je vends ce que l\'armée ne comptera pas. La gnôle et les bijoux, ça, ça m\'intéresse.'
      },
      say: {
        greet: ['Le dépôt est à l\'armée. Le reste de l\'entrepôt, servez-vous, je ne vous ai pas vu.', 'Vous voulez faire affaire ? Approchez. Pas plus loin que la ligne.'],
        warn: ['Oh ! La ligne, là. Vous la voyez ? Reculez.'],
        warn2: ['Je vous ai dit de reculer !'],
        attack: ['Voleur ! Abattez-le !', 'Alerte ! Alerte !'],
        suspect: ['Qui est là ?'], idle: ['…'], lost: ['Ouvrez l\'œil.'],
        hurt: ['Salopard !'], surrender: ['Arrêtez ! Prenez ce que vous voulez !'], spared: ['Allez-vous-en…']
      }
    },
    brute: {
      name: 'Soldat ivre', look: look({ build: 1.12, beard: 'full', hairColor: '#3a2e24', hat: null, coat: '#555845', bag: false }),
      villain: true, hp: 90, weapon: 'pistolet', tool: 'pistol', ammo: 6, dmg: [20, 34], acc: 0.5, range: 380, sight: 260, walk: 40, run: 90,
      loot: { munitions: 2, alcool: 1, bijoux: 1 },
      talk: [
        ['Laissez-la partir.', 'Tu te prends pour qui ? Dégage avant que je m\'énerve.'],
        ['Elle ne veut pas. Ça se voit.', 'Personne ne t\'a demandé ton avis. Je la nourris, elle me doit bien ça.'],
        ['Votre sergent sait ce que vous faites ?', 'Maddox ? Il s\'en fiche. Tout le monde s\'en fiche. Fous le camp.']
      ],
      say: {
        greet: ['Qu\'est-ce que tu regardes, toi ? Dégage. Ça ne te regarde pas.', 'Va-t\'en. C\'est entre elle et moi.'],
        warn: ['Tu sors de cette pièce. Maintenant.', 'Recule, j\'ai dit !'],
        warn2: ['Tu l\'auras voulu…'],
        attack: ['Tu veux jouer au héros ?', 'Je vais te crever !'],
        suspect: ['Hein ? Qui est là ?'], idle: ['Allez, sois gentille…'], lost: ['Reviens, lâche !'],
        hurt: ['Espèce de…'], surrender: ['Attends ! Attends… J\'avais bu, c\'est tout. Laisse-moi partir.'], spared: ['Je… je m\'en vais.']
      }
    }
  };

  // Jeune femme retenue par le soldat ivre (entrepôt)
  C.NPCS.mila = {
    name: 'Molly', title: 'Jeune femme',
    look: { hair: 'long', build: 0.84, h: 0.92, coat: '#5e554c', pants: '#302d29', coatLen: 0.2, skin: '#b19a86', hairColor: '#3b2a20', lips: true, female: true, top: 'cardigan', shirt: '#7c7166' },
    pose: 'sit',
    greet: ['Aidez-moi… je vous en prie.', 'Il dit qu\'il va me donner à manger si… Je ne veux pas.'],
    // Délivrée : d'abord les remerciements, puis elle donne ce qu'elle a
    thanks: 'Il ne reviendra pas ? Vraiment ? … Merci. Merci, merci…',
    giveLine: 'Tenez. C\'est tout ce que j\'ai. Prenez-le, je vous en prie.',
    rescued: ['Je vais rejoindre ma tante, à l\'église St. Mark.', 'Je n\'oublierai jamais ce que vous avez fait cette nuit.'],
    reward: { bijoux: 1, medicaments: 1 }
  };

  // Matériel militaire : pas une question de conscience, une question de discrétion
  C.OWNERS.armee = {
    text: ' a pris du matériel à l\'armée.', moral: 0, key: null, military: true,
    desc: 'Du matériel de l\'armée. Personne n\'en mourra de faim, mais si un soldat vous voit vous servir, toute la garnison ouvrira le feu.',
    warn: 'Un soldat vous regarde. Vous servir maintenant, c\'est déclencher la fusillade : toute la garnison deviendra hostile.'
  };

  // ------------------------------------------------------------ Entrepôt du port (soldats neutres)
  // Plan libre (js/render/layout.js), comme dans le jeu d'origine : une cour
  // grillagée, un grand hangar à sheds avec mezzanine et pont roulant, une
  // annexe en briques sur trois niveaux et son toit, un sous-sol. Deux façons
  // d'atteindre l'armurerie : l'escalier du poste de garde (un soldat y dort),
  // ou le trou dans la dalle du hangar, puis la chaufferie encombrée de ferraille.
  C.MAPS.entrepot = {
    id: 'entrepot', layout: true,
    theme: { dirt: 0.34, military: true },
    world: { W: 3000, H: 1010, left: 40, right: 2960, ground: 820, walkMin: 60, walkMax: 2940, view: 1500 },
    start: { f: 0, x: 140 },
    floors: [
      { name: 'Cour et hangar', y: 820, ceil: 200, x0: 50, x1: 2200, ground: true, thick: 28,
        segs: [{ x0: 50, x1: 780, out: true }, { x0: 780, x1: 2200, tex: 'hangarFloor' }] },
      { name: 'Sous-sol', y: 985, ceil: 848, x0: 1880, x1: 2880, thick: 25, tex: 'concrete' },
      { name: 'Mezzanine', y: 640, ceil: 200, x0: 1480, x1: 2200, catwalk: true, support: 820 },
      { name: 'Poste de garde', y: 820, ceil: 656, x0: 2200, x1: 2880, ground: true, thick: 28, tex: 'concrete' },
      { name: 'Dortoir', y: 640, ceil: 476, x0: 2200, x1: 2880 },
      { name: 'Bureaux', y: 460, ceil: 298, x0: 2200, x1: 2880 },
      { name: 'Toit de l\'annexe', y: 282, ceil: 40, x0: 2195, x1: 2885, out: true, noSlab: true },
      { name: 'Pont roulant', y: 400, ceil: 200, x0: 830, x1: 1440, catwalk: true, hang: 250 }
    ],
    rooms: [
      { x0: 780, x1: 2200, top: 200, bottom: 820, wall: 'corrugated', tone: '#6f6a60', tile: 200, columns: 240, bracing: true, truss: 50, rail: 392,
        lamps: [960, 1320, 1680, 2040], racks: [{ x0: 930, x1: 1260, h: 330, levels: 3 }, { x0: 1560, x1: 1890, h: 160, levels: 2 }],
        sign: { t: 'DÉPÔT 7 — ACCÈS RÉSERVÉ À L\'ARMÉE', x: 1600, y: 480, size: 24 } },
      { x0: 2200, x1: 2880, top: 656, bottom: 820, wall: 'precast', tone: '#7a756a' },
      { x0: 2200, x1: 2880, top: 476, bottom: 640, wall: 'paintedConcrete', tone: '#817b6e' },
      { x0: 2200, x1: 2880, top: 298, bottom: 460, wall: 'factory', tone: '#7d776b' },
      { x0: 1880, x1: 2880, top: 848, bottom: 985, wall: 'concrete', tone: '#66625a', border: true }
    ],
    shells: [
      { x0: 780, x1: 2200, top: 200, bottom: 820, wall: 'corrugated', roof: 'saw', roofH: 80, broken: [2],
        gaps: { left: [{ y0: 590, y1: 820, shutter: 36 }], right: [{ y0: 700, y1: 820 }, { y0: 520, y1: 640 }] } },
      { x0: 2200, x1: 2880, top: 296, bottom: 985, wall: 'factoryBrick', roof: 'flat', left: false }
    ],
    fences: [{ f: 0, x0: 60, x1: 770, h: 120 }],
    things: [
      { kind: 'truck', f: 0, x: 250 },
      { kind: 'forklift', f: 0, x: 1110, flip: true }
    ],
    lights: [
      { kind: 'brasero', x: 690, y: 778, r: 190 },
      { kind: 'lamp', x: 960, y: 330, r: 230, a: 0.7 }, { kind: 'lamp', x: 1680, y: 330, r: 230, a: 0.8 }, { kind: 'lamp', x: 2040, y: 330, r: 230, a: 0.8 },
      { kind: 'lamp', x: 2400, y: 680, r: 150 }, { kind: 'lamp', x: 2650, y: 322, r: 150 },
      { kind: 'searchlight', x: 800, y: 186, a0: 2.3, spread: 0.32, speed: 0.3, len: 900 }
    ],
    backdrop: { far: 'city', mid: ['cranes', 'containers', 'chimneys'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 1300 }, b: { f: 2, x: 1520 }, type: 'metal' },
      { a: { f: 0, x: 2192 }, b: { f: 3, x: 2212 }, type: 'link' },
      { a: { f: 2, x: 2192 }, b: { f: 4, x: 2212 }, type: 'link' },
      { a: { f: 3, x: 2300 }, b: { f: 4, x: 2460 } },
      { a: { f: 4, x: 2280 }, b: { f: 5, x: 2440 } },
      { a: { f: 3, x: 2800 }, b: { f: 1, x: 2650 } },
      { a: { f: 5, x: 2850 }, b: { f: 6, x: 2850 }, type: 'ladder' },
      { a: { f: 0, x: 860 }, b: { f: 7, x: 860 }, type: 'ladder' },
      { a: { f: 0, x: 1920 }, b: { f: 1, x: 1920 }, type: 'hole', w: 70 }
    ],
    walls: [{ f: 3, x: 2560, tex: 'precast' }, { f: 4, x: 2560 }, { f: 5, x: 2540 }],
    windows: [
      { f: 0, x: 900, y: 214, w: 150, h: 60, kind: 'strip', broken: true }, { f: 0, x: 1150, y: 214, w: 150, h: 60, kind: 'strip' },
      { f: 0, x: 1400, y: 214, w: 150, h: 60, kind: 'strip', broken: true }, { f: 0, x: 1650, y: 214, w: 150, h: 60, kind: 'strip' },
      { f: 0, x: 1900, y: 214, w: 150, h: 60, kind: 'strip', broken: true },
      { f: 3, x: 2700, broken: true }, { f: 4, x: 2400, boarded: true }, { f: 4, x: 2760 }, { f: 5, x: 2380, broken: true }, { f: 5, x: 2700 },
      { f: 1, x: 2350, vent: true }, { f: 1, x: 2750, vent: true }
    ],
    // Zones gardées : y entrer sous les yeux d'un soldat du groupe = avertissement
    zones: [
      { id: 'depot', f: 0, x0: 1460, x1: 2200, group: 'garnison', label: 'Dépôt de l\'armée' },
      { id: 'depot_haut', f: 2, x0: 1560, x1: 2200, group: 'garnison', label: 'Mezzanine du dépôt' },
      { id: 'armurerie', f: 1, x0: 2200, x1: 2880, group: 'garnison', label: 'Armurerie' },
      { id: 'chambre', f: 4, x0: 2560, x1: 2880, group: 'brute', label: 'Chambre du soldat' }
    ],
    decor: [
      { f: 0, x: 420, p: 'street_lamp_01', h: 210 }, { f: 0, x: 690, p: 'barrel_stove', h: 44 }, { f: 0, x: 470, p: 'metal_jerrycan_green', h: 26 },
      { f: 0, x: 745, p: 'barrel_03', h: 46 }, { f: 0, x: 808, p: 'portable_searchlight', h: 34, dy: 630 },
      { f: 0, x: 1240, p: 'hand_truck', h: 62 }, { f: 0, x: 1380, p: 'portable_generator', h: 44 }, { f: 0, x: 1530, p: 'plastic_crate_02', h: 22 },
      { f: 0, x: 1690, p: 'wooden_crate_01', h: 40 }, { f: 0, x: 1850, p: 'industrial_storage_cart', h: 60 },
      { f: 2, x: 1560, p: 'wooden_military_crate', h: 28 }, { f: 2, x: 2150, p: 'small_lpg_tank', h: 34 },
      { f: 7, x: 1000, p: 'old_tyre', h: 24 },
      { f: 3, x: 2650, p: 'utility_box_01', h: 72 }, { f: 3, x: 2470, p: 'metal_toolbox', h: 20 },
      { f: 4, x: 2340, p: 'vintage_suitcase', h: 22 },
      { f: 5, x: 2330, p: 'metal_office_desk', h: 44 }, { f: 5, x: 2310, p: 'vintage_radio_transceiver', h: 22, dy: 44 },
      { f: 6, x: 2296, p: 'portable_searchlight', h: 40 }, { f: 6, x: 2700, p: 'old_tyre', h: 24 },
      { f: 1, x: 2010, p: 'propane_tank', h: 40 }, { f: 1, x: 2760, p: 'wooden_military_crate', h: 30 }, { f: 1, x: 2250, p: 'ammo_box', h: 16 }
    ],
    objects: [
      // Cour
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'caisse_quai', kind: 'cache', variant: 'caisse', f: 0, x: 360, w: 78, h: 48, loot: { bois: 4, composants: 3, sucre: 1 } },
      { key: 'epave_cour', kind: 'cache', variant: 'epave', label: 'Voiture calcinée', f: 0, x: 555, w: 170, h: 70, loot: { pieces_meca: 1, carburant: 1 } },
      { key: 'recoin_quai', kind: 'hide', variant: 'sacs', label: 'Sacs de sable', f: 0, x: 640, w: 90, h: 60 },
      { key: 'maddox', kind: 'guard', type: 'intendant', f: 0, x: 730, facing: -1, attitude: 'neutral', group: 'garnison' },
      // Hangar
      { key: 'palettes_hangar', kind: 'cache', variant: 'palettes', label: 'Palettes', f: 0, x: 1000, w: 90, h: 92, loot: { bois: 3, sucre: 1 } },
      { key: 'recoin_depot', kind: 'hide', variant: 'palettes', label: 'Derrière les palettes', f: 0, x: 1420, w: 80, h: 92 },
      { key: 'caisses_armee', kind: 'cache', variant: 'caisse_mil', label: 'Caisse de l\'armée', f: 0, x: 1600, w: 90, h: 50, owner: 'armee', loot: { conserve: 3, eau: 2, cafe: 1 } },
      { key: 'soldat_depot', kind: 'guard', type: 'soldat', f: 0, x: 1780, facing: -1, attitude: 'neutral', group: 'garnison', patrol: [1480, 2150] },
      { key: 'rations', kind: 'cache', variant: 'rayonnage', label: 'Rations de l\'armée', f: 0, x: 1760, w: 100, h: 110, owner: 'armee', loot: { conserve: 2, medicaments: 1, bandage: 2 } },
      { key: 'conteneur_depot', kind: 'cache', variant: 'conteneur', label: 'Conteneur', color: '#5f6452', f: 0, x: 2080, w: 200, h: 110, owner: 'armee', loot: { conserve: 2, eau: 2, bois: 2 } },
      // Mezzanine
      { key: 'recoin_bureau', kind: 'hide', variant: 'palettes', label: 'Derrière les palettes', f: 2, x: 1640, w: 70, h: 92 },
      { key: 'sentinelle', kind: 'guard', type: 'soldat', f: 2, x: 1900, facing: 1, attitude: 'neutral', group: 'garnison', patrol: [1600, 2150] },
      { key: 'bureau_mezz', kind: 'cache', variant: 'bureau_metal', label: 'Bureau du magasinier', f: 2, x: 1880, w: 120, h: 50, loot: { cafe: 1, tabac: 1, livres: 1 } },
      { key: 'casiers_mezz', kind: 'cache', variant: 'casiers', label: 'Casiers', f: 2, x: 2060, w: 88, h: 110, loot: { composants: 2, pieces_elec: 1 } },
      // Pont roulant (par l'échelle)
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse', label: 'Caisse sur le pont roulant', f: 7, x: 1150, w: 78, h: 48, loot: { carburant: 2, pieces_meca: 2 } },
      { key: 'etagere_toit', kind: 'cache', variant: 'bac', label: 'Bac oublié', f: 7, x: 1340, w: 76, h: 40, loot: { livres: 2, filtre: 1 } },
      // Annexe : poste de garde
      { key: 'casiers_poste', kind: 'cache', variant: 'casiers', label: 'Casiers des soldats', f: 3, x: 2440, w: 110, h: 110, loot: { cigarettes: 2, bandage: 1 } },
      { key: 'recoin_poste', kind: 'hide', f: 3, x: 2620, w: 46, h: 108 },
      // Sous-sol : chaufferie (par le trou) puis armurerie
      { key: 'chaufferie', kind: 'cache', variant: 'boite_outils', label: 'Caisse à outils', f: 1, x: 2070, w: 70, h: 36, loot: { composants: 2, pieces_meca: 1 } },
      { key: 'ferraille', kind: 'rubble', label: 'Ferraille effondrée', f: 1, x: 2150, w: 90, h: 44, work: 60, block: true, loot: { composants: 3, pieces_meca: 1 } },
      { key: 'caisse_munitions', kind: 'cache', variant: 'caisse_mil', label: 'Caisse de munitions', f: 1, x: 2300, w: 90, h: 50, owner: 'armee', loot: { munitions: 6, pieces_elec: 2, pieces_armes: 2 } },
      { key: 'armurerie', kind: 'cache', variant: 'coffre', label: 'Coffre de l\'armurerie', f: 1, x: 2420, w: 60, h: 48, owner: 'armee', locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { fusil: 1, munitions: 8, gilet: 1, casque: 1 } },
      { key: 'lit_camp', kind: 'bed', f: 1, x: 2530, metal: true, deco: true },
      { key: 'soldat_cave', kind: 'guard', type: 'soldat', f: 1, x: 2530, facing: 1, attitude: 'neutral', group: 'garnison', sleep: true },
      { key: 'recoin_cave', kind: 'hide', f: 1, x: 2800, w: 46, h: 108 },
      // Dortoir et chambre de Holt
      { key: 'lits_dortoir', kind: 'bed', f: 4, x: 2380, metal: true, deco: true },
      { key: 'porte_chambre', kind: 'door', label: 'Porte de la chambre', f: 4, x: 2560, w: 30, h: 112 },
      { key: 'brute', kind: 'guard', type: 'brute', f: 4, x: 2660, facing: 1, attitude: 'neutral', group: 'brute' },
      { key: 'mila', kind: 'npc', npc: 'mila', f: 4, x: 2760, w: 50, h: 70, facing: -1 },
      { key: 'paquetage', kind: 'cache', variant: 'valise', label: 'Paquetage de Holt', f: 4, x: 2845, w: 62, h: 36, owner: 'armee', loot: { alcool: 1, cigarettes: 3 } },
      // Bureaux, radio
      { key: 'bureau', kind: 'cache', variant: 'armoire', f: 5, x: 2620, w: 58, h: 112, loot: { cafe: 1, tabac: 2, livres: 2 } },
      { key: 'classeur', kind: 'cache', variant: 'etagere', f: 5, x: 2740, w: 70, h: 104, loot: { composants: 2, pieces_elec: 1 } },
      // Toit
      { key: 'valise_toit', kind: 'cache', variant: 'valise', f: 6, x: 2520, w: 62, h: 36, loot: { tabac: 2, cigarettes: 2 } }
    ]
  };

  // Avant-poste : voir lieux.js
})(window.CQR);
