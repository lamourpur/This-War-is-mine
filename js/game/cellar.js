/* =========================================================
   L'abri souterrain : agrandissement du refuge
   Vers le 10e jour, on remarque dans la cave une trappe fermée par un
   cadenas rouillé. En dessous : un abri anti-aérien de la dernière
   guerre, muré depuis des décennies. Trois salles voûtées, un vieux lit
   de camp, des caisses oubliées… et surtout de la place pour s'installer
   (5 emplacements de construction). La cave à vin du fond est encore
   bouchée par un éboulement à déblayer.
   État : st.flags.cave = undefined | 'found' (trappe visible) | 'open'.
   ========================================================= */
(function (C) {
  'use strict';

  var K = C.Cellar = {};
  var CAVE_F = 4;
  // Plan du refuge sans l'abri (captés au chargement)
  var BASE = { stairs: C.STAIRS.slice(), slots: C.SLOTS.slice(), walls: C.WALLS.slice(), decor: C.DECOR.slice() };

  K.DAY = 10;
  K.H = 1060;                       // hauteur du monde une fois l'abri ouvert
  K.TRAP = { kind: 'trapdoor', f: 0, x: 1410, w: 44, h: 26, locked: true };
  K.STAIR = { a: { f: 0, x: 1410 }, b: { f: CAVE_F, x: 1270 }, cellar: true };
  // Trois salles : l'entrée (lit de camp), la salle commune, et au fond la
  // grande salle et la cave à vin, derrière l'éboulement
  K.SLOTS = [
    { id: 's4b', f: CAVE_F, x: 858, w: 124 },
    { id: 's4c', f: CAVE_F, x: 996, w: 124 },
    { id: 's4a', f: CAVE_F, x: 300, w: 130 },
    { id: 's4d', f: CAVE_F, x: 470, w: 124 },
    { id: 's4e', f: CAVE_F, x: 600, w: 84, small: true }
  ];
  K.WALLS = [{ f: CAVE_F, x: 740 }, { f: CAVE_F, x: 1080 }];
  K.DECOR = [
    { f: CAVE_F, x: 1250, p: 'old_gas_mask', h: 34, dy: 70, wall: true },
    { f: CAVE_F, x: 1240, p: 'vintage_oil_lamp', h: 26 },
    { f: CAVE_F, x: 380, p: 'wine_bottles_01', h: 18 },
    { f: CAVE_F, x: 655, p: 'wooden_barrels_01', h: 32 },
    { f: CAVE_F, x: 250, p: 'old_military_crate', h: 20 }
  ];
  // Ce que l'on trouve en bas
  K.OBJECTS = [
    { key: 'lit_abri', kind: 'bed', f: CAVE_F, x: 1160, level: 1 },
    { key: 'caisse_abri', kind: 'cache', variant: 'caisse', label: 'Caisse de l\'abri', f: CAVE_F, x: 1382, w: 78, h: 48, loot: { conserve: 2, bandage: 2, medicaments: 1, bois: 2 } },
    { key: 'eboulis_abri', kind: 'rubble', f: CAVE_F, x: 740, w: 104, h: 128, block: true, work: 150, loot: { bois: 2, composants: 3 } },
    { key: 'casier_vin', kind: 'cache', variant: 'etagere', label: 'Casier à bouteilles', f: CAVE_F, x: 200, w: 60, h: 104, loot: { alcool: 2, sucre: 1, conserve: 1 } }
  ];

  K.isOpen = function (st) { return !!(st && st.flags && st.flags.cave === 'open'); };

  // Applique le plan du refuge selon l'état de l'abri (nouvelle partie,
  // chargement, ouverture). À n'appeler que lorsque le refuge est affiché.
  K.apply = function (st) {
    var open = K.isOpen(st);
    var fl = C.FLOORS[CAVE_F];
    if (!fl || !fl.cellar) return;              // pas le plan du refuge (exploration)
    fl.hidden = !open;
    C.STAIRS = open ? BASE.stairs.concat([K.STAIR]) : BASE.stairs.slice();
    C.SLOTS = open ? BASE.slots.concat(K.SLOTS) : BASE.slots.slice();
    C.WALLS = open ? BASE.walls.concat(K.WALLS) : BASE.walls.slice();
    C.DECOR = open ? BASE.decor.concat(K.DECOR) : BASE.decor.slice();
    var H = open ? K.H : 900;
    if (C.WORLD.H !== H) {
      C.WORLD.H = H;
      if (C.Render && C.Render.canvas && C.Render.worldChanged) C.Render.worldChanged();
    }
    if (C.Nav && C.Game.st) C.Nav.computeRegions();
    C.Game.markDirty();
  };

  // À l'aube : la trappe se remarque
  K.dawn = function (st, report) {
    if (st.day < K.DAY || st.flags.cave) return;
    st.flags.cave = 'found';
    C.Game.spawnObject(C.util.copy(K.TRAP));
    report.push({ t: 'Cette nuit, les bombardements ont fait trembler la cave. Au matin, un courant d\'air froid monte du sol : sous la poussière, une trappe, fermée par un cadenas rouillé. Il y a quelque chose sous la maison.', k: 'good' });
  };

  // La trappe est forcée : l'abri s'ouvre
  K.open = function (st, s, trap) {
    if (K.isOpen(st)) return '';
    st.flags.cave = 'open';
    if (trap) { trap.open = true; trap.locked = false; }
    K.OBJECTS.forEach(function (d) { C.Game.spawnObject(C.util.copy(d)); });
    K.apply(st);
    C.Game.moralAll(4);
    C.Game.log('Sous la cave, un abri de la dernière guerre : de la place pour s\'installer.', 'story');
    if (C.Surv.bio) C.Surv.bio(s, 'J\'ai forcé la trappe de la cave. En dessous, un abri de l\'autre guerre, muré depuis cinquante ans. Des lits de camp, des inscriptions au mur. D\'autres se sont cachés ici avant nous. Ils ont tenu, eux.');
    if (C.Mood && C.Mood.say) C.Mood.say(s, 'Un abri… de l\'autre guerre. Il y a de la place, en bas.');
    return s.name.split(' ')[0] + ' a forcé la trappe. En dessous, un abri anti-aérien de la dernière guerre, muré depuis des décennies : trois salles voûtées, un vieux lit de camp, des caisses oubliées. Enfin de la place pour s\'installer. La cave du fond est encore bouchée par un éboulement.';
  };
})(window.CQR);
