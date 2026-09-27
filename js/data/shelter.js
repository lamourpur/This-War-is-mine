/* =========================================================
   Plan du refuge (vue en coupe)
   Étages : 0 = cave, 1 = rez-de-chaussée, 2 = 1er, 3 = 2e
   y = ligne de marche (sol) de l'étage, ceil = plafond
   ========================================================= */
(function (C) {
  'use strict';

  C.WORLD = { W: 1600, H: 900, left: 140, right: 1460, walkMin: 178, walkMax: 1428, ground: 630 };

  C.FLOORS = [
    { y: 800, ceil: 642, name: 'Cave' },
    { y: 630, ceil: 472, name: 'Rez-de-chaussée' },
    { y: 460, ceil: 302, name: '1er étage' },
    { y: 290, ceil: 132, name: '2e étage' }
  ];

  // Escaliers : a et b = extrémités (étage, x)
  C.STAIRS = [
    { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
    { a: { f: 1, x: 420 },  b: { f: 2, x: 260 } },
    { a: { f: 2, x: 1200 }, b: { f: 3, x: 1360 } }
  ];

  // Cloisons intérieures (décor) avec passage de porte
  C.WALLS = [
    { f: 0, x: 800 }, { f: 1, x: 700 }, { f: 2, x: 780 }, { f: 3, x: 620 }
  ];

  // Fenêtres du mur du fond (décor)
  C.WINDOWS = [
    { f: 1, x: 560, broken: true }, { f: 2, x: 460, broken: false }, { f: 2, x: 1000, broken: true },
    { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: false },
    { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }
  ];

  // Emplacements de construction
  C.SLOTS = [
    { id: 's1a', f: 1, x: 250, w: 96, small: true },
    { id: 's1b', f: 1, x: 1040, w: 130 },
    { id: 's1c', f: 1, x: 1270, w: 124 },
    { id: 's0a', f: 0, x: 260, w: 124 },
    { id: 's0b', f: 0, x: 560, w: 130 },
    { id: 's0c', f: 0, x: 1000, w: 130 },
    { id: 's0d', f: 0, x: 1270, w: 110, small: true },
    { id: 's2a', f: 2, x: 330, w: 110, small: true },
    { id: 's2b', f: 2, x: 660, w: 130 },
    { id: 's2c', f: 2, x: 1080, w: 124 },
    { id: 's2d', f: 2, x: 1320, w: 90, small: true },
    { id: 's3a', f: 3, x: 330, w: 130 },
    { id: 's3b', f: 3, x: 990, w: 110, small: true },
    { id: 's3c', f: 3, x: 1120, w: 124 }
  ];

  // Objets présents au début de la partie
  C.INITIAL_OBJECTS = [
    // --- Rez-de-chaussée
    { kind: 'frontdoor', f: 1, x: 172, w: 40, h: 104, level: 0 },
    { kind: 'workbench', f: 1, x: 560, level: 1 },
    { kind: 'rubble', f: 1, x: 800, w: 96, h: 42, work: 90, loot: { bois: 3, composants: 3 } },
    { kind: 'stock', f: 1, x: 900, w: 100, h: 98 },
    { kind: 'hole', f: 1, x: 1060, w: 76, h: 54 },
    { kind: 'furniture', variant: 'commode', f: 1, x: 1400, w: 64, h: 60, work: 60, loot: { bois: 4, composants: 1 } },

    // --- Cave
    { kind: 'door', f: 0, x: 800, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
    { kind: 'rubble', f: 0, x: 262, w: 110, h: 46, work: 120, loot: { composants: 3, bois: 2, pieces_meca: 1 } },
    { kind: 'cache', variant: 'caisse', f: 0, x: 400, w: 78, h: 48, loot: { conserve: 2, eau: 3, bois: 2, carburant: 1 } },
    { kind: 'furniture', variant: 'armoire', f: 0, x: 712, w: 58, h: 112, work: 90, loot: { bois: 5, composants: 1 } },
    { kind: 'rubble', f: 0, x: 880, w: 84, h: 38, work: 60, loot: { bois: 2, composants: 2 } },
    { kind: 'cache', variant: 'etagere', f: 0, x: 1150, w: 70, h: 104, loot: { eau: 2, legumes: 2, sucre: 1, engrais: 1 } },

    // --- 1er étage
    { kind: 'cache', variant: 'armoire', f: 2, x: 480, w: 66, h: 112, loot: { livres: 2, bandage: 1, cafe: 1 } },
    { kind: 'hole', f: 2, x: 620, w: 68, h: 50 },
    { kind: 'rubble', f: 2, x: 880, w: 104, h: 150, block: true, work: 180, loot: { bois: 4, composants: 3, pieces_meca: 1 } },
    { kind: 'furniture', variant: 'bibliotheque', f: 2, x: 950, w: 70, h: 124, work: 90, loot: { bois: 4, livres: 4 } },
    { kind: 'cache', variant: 'coffre', f: 2, x: 1400, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 2, munitions: 3, couteau: 1 } },

    // --- 2e étage
    { kind: 'grate', f: 3, x: 620, w: 26, h: 132, tools: ['scie'] },
    { kind: 'cache', variant: 'valise', f: 3, x: 214, w: 62, h: 36, loot: { bijoux: 2, cigarettes: 2, medicaments: 1 } },
    { kind: 'furniture', variant: 'armoire', f: 3, x: 470, w: 58, h: 112, work: 90, loot: { bois: 5, composants: 1 } },
    { kind: 'hole', f: 3, x: 760, w: 90, h: 60 },
    { kind: 'cache', variant: 'coffre', f: 3, x: 860, w: 70, h: 50, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_elec: 2, pieces_meca: 1, composants: 3 } },
    { kind: 'rubble', f: 3, x: 1120, w: 104, h: 48, work: 120, loot: { bois: 3, composants: 3, livres: 2 } }
  ];

  // Décor non interactif : objets détourés posés dans les recoins libres
  // (masqués automatiquement si une construction vient occuper la place)
  C.DECOR = [
    // Rez-de-chaussée
    { f: 1, x: 300, p: 'cardboard_box_01', h: 34, shade: 0.3 },
    { f: 1, x: 335, p: 'trashbag', h: 36 },
    { f: 1, x: 470, p: 'wooden_stool_01', h: 30 },
    { f: 1, x: 648, p: 'metal_tool_chest', h: 36 },
    { f: 1, x: 680, p: 'wooden_broom', h: 56, flip: true },
    { f: 1, x: 1130, p: 'metal_jerrycan', h: 34 },
    { f: 1, x: 1176, p: 'plastic_crate_01', h: 28 },
    // Cave
    { f: 0, x: 472, p: 'wooden_bucket_01', h: 28 },
    { f: 0, x: 652, p: 'propane_tank', h: 46 },
    { f: 0, x: 1096, p: 'can_rusted', h: 20 },
    { f: 0, x: 1400, p: 'wooden_barrels_01', h: 32 },
    // 1er étage
    { f: 2, x: 560, p: 'old_tyre', h: 30 },
    { f: 2, x: 748, p: 'cement_bag', h: 40 },
    { f: 2, x: 1168, p: 'metal_trash_can', h: 30 },
    { f: 2, x: 1300, p: 'Television_01', h: 30 },
    { f: 3, x: 1000, p: 'wooden_ladder', h: 92 },
    { f: 3, x: 255, p: 'vintage_oil_lamp', h: 30 },
    // 2e étage
    { f: 3, x: 418, p: 'compost_bags', h: 26 },
    { f: 3, x: 565, p: 'medical_box', h: 20 },
    { f: 3, x: 1240, p: 'ammo_box', h: 26 },
    { f: 3, x: 1305, p: 'old_military_crate', h: 18 },
    // Masque à gaz accroché au mur près de l'entrée (dy : hauteur au-dessus du sol)
    { f: 1, x: 222, p: 'old_gas_mask', h: 44, dy: 62, wall: true },
    { f: 3, x: 1400, p: 'steel_frame_shelves_01', h: 110 },
    // Rue
    { f: 1, x: 96, p: 'trashbag', h: 36, out: true },
    { f: 1, x: 30, p: 'old_tyre', h: 26, out: true },
    { f: 1, x: 118, p: 'rusted_wheel_rim_01', h: 18, out: true },
    { f: 1, x: 1520, p: 'metal_trash_can', h: 34, out: true },
    { f: 1, x: 1574, p: 'barrel_stove', h: 44, out: true }
  ];

  C.START_ITEMS ={ eau: 4, conserve: 3, legumes: 2, bois: 5, composants: 4, pieces_meca: 1, bandage: 1 };

  C.CACHE_NAMES = {
    caisse: 'Caisse', etagere: 'Étagère', armoire: 'Armoire', coffre: 'Coffre', valise: 'Valise', tas: 'Tas de débris', pharmacie: 'Armoire à pharmacie'
  };
  C.FURNITURE_NAMES = {
    commode: 'Vieille commode', armoire: 'Armoire vermoulue', bibliotheque: 'Bibliothèque'
  };
})(window.CQR);
