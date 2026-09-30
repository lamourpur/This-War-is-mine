/* =========================================================
   Lieux d'exploration à géométrie libre (js/render/layout.js)
   Chaque lieu a sa propre silhouette, comme dans This War of Mine :
   maison avec jardin et combles, église à nef haute et clocher, hôpital
   en ailes, supermarché tout en largeur, immeuble éventré… Les clés des
   objets (key) sont celles des anciens plans : l'état mémorisé des lieux
   déjà visités (st.locations[id].map) reste valable.
   Chargé après maps.js, maps_ville.js, maps_extra.js et military.js :
   remplace leurs plans, garde leurs personnages (C.NPCS, C.OWNERS).
   ========================================================= */
(function (C) {
  'use strict';

  function ext(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  // Pièce (mur du fond) : raccourci
  function R(x0, x1, top, bottom, wall, more) { return ext({ x0: x0, x1: x1, top: top, bottom: bottom, wall: wall }, more || {}); }
  // Ambiance de chaque lieu : voile de nuit (dark), teinte en lumière douce
  // (tint), clair de lune par les fenêtres (moon)
  var MOODS = {
    maison_abandonnee: { dark: 0.2, tint: 'rgba(80,105,150,0.35)', moon: 0.11 },
    vieux_couple: { dark: 0.15, tint: 'rgba(190,130,60,0.38)', moon: 0.06 },
    maison_mitoyenne: { dark: 0.18, tint: 'rgba(150,120,90,0.3)', moon: 0.1 },
    villa: { dark: 0.18, tint: 'rgba(190,110,60,0.36)', moon: 0.09 },
    eglise: { dark: 0.17, tint: 'rgba(170,135,80,0.32)', moon: 0.16 },
    hopital: { dark: 0.17, tint: 'rgba(90,150,135,0.34)', moon: 0.08 },
    ecole: { dark: 0.18, tint: 'rgba(110,125,150,0.3)', moon: 0.1 },
    hotel: { dark: 0.16, tint: 'rgba(190,140,80,0.34)', moon: 0.08 },
    supermarche: { dark: 0.17, tint: 'rgba(110,150,90,0.36)', moon: 0.08 },
    boulangerie: { dark: 0.17, tint: 'rgba(185,130,70,0.34)', moon: 0.1 },
    garage: { dark: 0.19, tint: 'rgba(160,110,60,0.3)', moon: 0.07 },
    immeuble: { dark: 0.19, tint: 'rgba(90,110,160,0.34)', moon: 0.12 },
    squat: { dark: 0.2, tint: 'rgba(200,110,50,0.34)', moon: 0.07 },
    chantier: { dark: 0.2, tint: 'rgba(95,115,150,0.32)', moon: 0.1 },
    carrefour: { dark: 0.2, tint: 'rgba(85,105,145,0.34)', moon: 0.1 },
    avant_poste: { dark: 0.19, tint: 'rgba(110,130,90,0.32)', moon: 0.08 }
  };
  function keepNpcs(id, map) { map.id = id; map.layout = true; map.zones = map.zones || []; map.mood = map.mood || MOODS[id]; return map; }

  // Hauteurs usuelles d'une maison (sol à 820)
  var G = 820, RDC = { y: 820, ceil: 656 }, ET1 = { y: 640, ceil: 476 }, ET2 = { y: 460, ceil: 296 }, CAVE = { y: 985, ceil: 848 };

  // ============================================================ Maison abandonnée
  // Un pavillon au bout d'un jardin en friche : un salon, une cuisine, une
  // chambre, les combles sous un toit crevé, une cave. Au fond du jardin,
  // la cabane à outils. Un homme blessé (Hank) s'est réfugié à l'étage.
  C.MAPS.maison_abandonnee = keepNpcs('maison_abandonnee', {
    theme: { dirt: 0.3 },
    world: { W: 2360, H: 1010, left: 40, right: 2320, ground: G, walkMin: 60, walkMax: 2300, view: 1400 },
    start: { f: 0, x: 110 },
    floors: [
      { name: 'Jardin et rez-de-chaussée', y: G, ceil: 656, x0: 60, x1: 2300, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 600, out: true, tex: 'rubble' }, { x0: 600, x1: 1700, tex: 'floor' }, { x0: 1700, x1: 2300, out: true, tex: 'rubble' }] },
      { name: 'Cave', y: 985, ceil: 848, x0: 612, x1: 1688, thick: 25, tex: 'concrete' },
      { name: 'Étage', y: 640, ceil: 476, x0: 612, x1: 1688, tex: 'floor' },
      { name: 'Combles', y: 460, ceil: 340, x0: 640, x1: 1660, tex: 'planks' }
    ],
    rooms: [
      R(600, 880, 656, G, 'wallpaper', { tone: '#857f72', paper: 12, skirt: true, frames: 1, bulbs: [740] }),
      R(880, 1260, 656, G, 'wallpaper', { tone: '#8a8274', paper: 10, skirt: true, frames: 2, bulbs: [1070] }),
      R(1260, 1700, 656, G, 'peeling', { tone: '#807a6c', wainscot: { h: 50, tone: '#8a877e' }, bulbs: [1480] }),
      R(600, 1040, 476, 640, 'wallpaper', { tone: '#88806f', paper: 14, skirt: true, frames: 2 }),
      R(1040, 1700, 476, 640, 'peeling', { tone: '#7f7a6d', frames: 1, bulbs: [1300], breach: [{ x: 1560, y: 540, r: 38 }] }),
      R(600, 1700, 340, 460, 'planks', { tone: '#5f574b', attic: 'both' }),
      R(600, 1700, 848, 985, 'brickPlaster', { tone: '#6a665d', border: true }),
      R(2000, 2260, 704, G, 'planks2', { tone: '#6b6153' })
    ],
    shells: [
      { x0: 600, x1: 1700, top: 340, bottom: 985, wall: 'brickPlaster', roof: 'tiles', roofH: 130, hole: [1240, 1480], chimneys: [880],
        gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 702, y1: G }] } },
      { x0: 2000, x1: 2260, top: 704, bottom: G, wall: 'planks2', roof: 'gable', roofH: 46, thick: 10, gaps: { left: [{ y0: 712, y1: G }] } }
    ],
    things: [
      { kind: 'tree', f: 0, x: 300, h: 300, back: true },
      { kind: 'wall', f: 0, x: 150, w: 400, h: 42, rails: true, back: true },
      { kind: 'car', f: 0, x: 440, burnt: true },
      { kind: 'tree', f: 0, x: 1790, h: 240, back: true, trunk: 11 },
      { kind: 'crater', f: 0, x: 1900, w: 120 }
    ],
    lights: [{ kind: 'candle', x: 1130, y: 604, r: 110 }],
    backdrop: { far: 'city', mid: ['houses', 'trees'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 860 }, b: { f: 2, x: 690 } },
      { a: { f: 0, x: 1640 }, b: { f: 1, x: 1500 } },
      { a: { f: 2, x: 1180 }, b: { f: 0, x: 1180 }, type: 'hole', w: 70 },
      { a: { f: 2, x: 1610 }, b: { f: 3, x: 1610 }, type: 'ladder' }
    ],
    walls: [{ f: 0, x: 880 }, { f: 0, x: 1260 }, { f: 2, x: 1040 }, { f: 1, x: 1150 }],
    windows: [
      { f: 0, x: 1000 }, { f: 0, x: 1540, broken: true }, { f: 2, x: 880 }, { f: 2, x: 1250, boarded: true }, { f: 2, x: 1420, broken: true },
      { f: 1, x: 900, vent: true }, { f: 1, x: 1350, vent: true }
    ],
    decor: [
      { f: 0, x: 520, p: 'trashbag', h: 30 }, { f: 0, x: 1590, p: 'wooden_bucket_01', h: 24 }, { f: 0, x: 1060, p: 'cardboard_box_01', h: 28, shade: 0.3 },
      { f: 1, x: 1250, p: 'wooden_barrels_01', h: 30 }, { f: 1, x: 700, p: 'propane_tank', h: 40 },
      { f: 2, x: 1500, p: 'old_tyre', h: 24 }, { f: 3, x: 900, p: 'Television_01', h: 28 }, { f: 3, x: 700, p: 'cardboard_box_01', h: 26, shade: 0.3 },
      { f: 0, x: 2210, p: 'wooden_ladder', h: 90 }, { f: 0, x: 1720, p: 'old_tyre', h: 24 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 110, w: 44, h: 104 },
      // Rez-de-chaussée : entrée, salon, cuisine
      { key: 'gravats1', kind: 'rubble', f: 0, x: 730, w: 96, h: 42, work: 90, loot: { bois: 3, composants: 3 } },
      { key: 'commode', kind: 'furniture', variant: 'commode', f: 0, x: 950, w: 64, h: 60, work: 60, loot: { bois: 3, composants: 1 } },
      { key: 'fauteuil', kind: 'armchair', f: 0, x: 1070, deco: true },
      { key: 'poele', kind: 'stove', f: 0, x: 1320, deco: true },
      { key: 'cuisine', kind: 'cache', variant: 'armoire', f: 0, x: 1405, w: 58, h: 112, loot: { conserve: 2, eau: 2, sucre: 1 } },
      { key: 'placard', kind: 'cache', variant: 'etagere', f: 0, x: 1490, w: 70, h: 104, loot: { legumes: 3, eau: 1, herbes: 2 } },
      // Cave
      { key: 'caisse_cave', kind: 'cache', variant: 'caisse', f: 1, x: 1340, w: 78, h: 48, loot: { bois: 4, composants: 4, pieces_meca: 1 } },
      { key: 'porte_cave', kind: 'door', f: 1, x: 1150, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'gravats_cave', kind: 'rubble', f: 1, x: 1000, w: 84, h: 38, work: 60, loot: { composants: 2, pieces_meca: 1 } },
      { key: 'coffre', kind: 'cache', variant: 'coffre', f: 1, x: 800, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 2, conserve: 2, cafe: 1 } },
      // Étage : chambre, bureau (Hank)
      { key: 'chambre', kind: 'cache', variant: 'armoire', f: 2, x: 800, w: 66, h: 112, loot: { livres: 3, bandage: 1, cigarettes: 2 } },
      { key: 'lit', kind: 'bed', f: 2, x: 940, deco: true },
      { key: 'hank', kind: 'npc', npc: 'hank', f: 2, x: 1090, w: 90, h: 30, facing: 1 },
      { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1350, w: 70, h: 124, work: 90, loot: { bois: 4, livres: 4 } },
      // Combles (par l'échelle), coupés en deux par l'éboulement du toit
      { key: 'valise', kind: 'cache', variant: 'valise', f: 3, x: 1300, w: 62, h: 36, loot: { montre: 1, bijoux: 1, cigarettes: 1 } },
      { key: 'caisse_grenier', kind: 'cache', variant: 'caisse', f: 3, x: 1460, w: 78, h: 48, loot: { composants: 3, pieces_elec: 1 } },
      { key: 'eboulis', kind: 'rubble', f: 3, x: 1150, w: 104, h: 118, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'grenier_g', kind: 'cache', variant: 'etagere', f: 3, x: 800, w: 70, h: 104, loot: { livres: 2, filtre: 1 } },
      // Fond du jardin : bois mort, cabane à outils
      { key: 'bois_jardin', kind: 'rubble', label: 'Tas de bois mort', f: 0, x: 1790, w: 96, h: 40, work: 45, loot: { bois: 4 } },
      { key: 'cabanon', kind: 'cache', variant: 'caisse', label: 'Caisse de la cabane', f: 0, x: 2130, w: 78, h: 48, loot: { composants: 2, engrais: 1, pieces_meca: 1 } }
    ]
  });

  // ============================================================ Maison des Whitaker (vieux couple)
  // Une maison de ville étroite, encore tenue : rideaux, cadres, bougies.
  // Côté rue un banc et un réverbère, derrière une courette close de murs.
  C.MAPS.vieux_couple = keepNpcs('vieux_couple', {
    theme: { dirt: 0.12 },
    world: { W: 2120, H: 1010, left: 40, right: 2080, ground: G, walkMin: 60, walkMax: 2060, view: 1350 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Rue, maison et courette', y: G, ceil: 656, x0: 60, x1: 2060, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 420, out: true }, { x0: 420, x1: 1360, tex: 'floor' }, { x0: 1360, x1: 1840, out: true, tex: 'concrete' }, { x0: 1840, x1: 2060, tex: 'planks' }] },
      { name: 'Cave', y: 985, ceil: 848, x0: 432, x1: 1348, thick: 25, tex: 'concrete' },
      { name: 'Étage', y: 640, ceil: 476, x0: 432, x1: 1348, tex: 'floor', carpet: [560, 880] },
      { name: 'Grenier', y: 460, ceil: 340, x0: 470, x1: 1310, tex: 'planks' }
    ],
    rooms: [
      R(420, 900, 656, G, 'wallpaper', { tone: '#8d8577', paper: 10, skirt: true, frames: 3, clock: { x: 680, y: 700 } }),
      R(900, 1360, 656, G, 'plaster', { tone: '#8a8577', wainscot: { h: 56, tone: '#8f8c83' }, bulbs: [1120] }),
      R(420, 940, 476, 640, 'wallpaper', { tone: '#8b8273', paper: 14, skirt: true, frames: 2, crucifix: { x: 880, y: 500, s: 0.5 } }),
      R(940, 1360, 476, 640, 'wallpaper', { tone: '#858075', paper: 8, skirt: true, frames: 1 }),
      R(420, 1360, 340, 460, 'planks', { tone: '#5f574b', attic: 'both' }),
      R(420, 1360, 848, 985, 'brickPlaster', { tone: '#6c675d', border: true }),
      R(1840, 2060, 712, G, 'planks2', { tone: '#6b6153', posters: [{ x: 1990, y: 760, t: 'OUTILS\nA. W.' }] })
    ],
    shells: [
      { x0: 420, x1: 1360, top: 340, bottom: 985, wall: 'brickPlaster', roof: 'tiles', roofH: 120, chimneys: [1200],
        gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 702, y1: G }] } },
      { x0: 1840, x1: 2060, top: 712, bottom: G, wall: 'planks2', roof: 'gable', roofH: 46, thick: 10, gaps: { left: [{ y0: 720, y1: G }] } }
    ],
    things: [
      { kind: 'bench', f: 0, x: 250 },
      { kind: 'wall', f: 0, x: 1360, w: 480, h: 150, tex: 'brick', back: true },
      { kind: 'tree', f: 0, x: 1700, h: 200, back: true, trunk: 9 }
    ],
    lights: [{ kind: 'candle', x: 760, y: 772, r: 120 }, { kind: 'candle', x: 820, y: 596, r: 90 }],
    backdrop: { far: 'city', mid: ['houses'], near: ['trees'] },
    stairs: [
      { a: { f: 0, x: 1300 }, b: { f: 2, x: 1140 } },
      { a: { f: 0, x: 1040 }, b: { f: 1, x: 1210 } },
      { a: { f: 2, x: 520 }, b: { f: 3, x: 660 } }
    ],
    walls: [{ f: 0, x: 900 }, { f: 2, x: 940 }, { f: 3, x: 760 }, { f: 0, x: 1840 }],
    windows: [
      { f: 0, x: 560 }, { f: 0, x: 1150 }, { f: 2, x: 620 }, { f: 2, x: 1060 },
      { f: 3, x: 900, y: 372, w: 44, h: 40 }, { f: 1, x: 700, vent: true }
    ],
    decor: [
      { f: 0, x: 160, p: 'street_lamp_01', h: 200 }, { f: 0, x: 360, p: 'metal_trash_can', h: 34 },
      { f: 0, x: 1400, p: 'compost_bags', h: 24 }, { f: 0, x: 1640, p: 'wooden_bucket_01', h: 24 }, { f: 0, x: 1800, p: 'wooden_barrels_01', h: 30 }, { f: 0, x: 1990, p: 'wooden_ladder', h: 86 },
      { f: 0, x: 850, p: 'wooden_stool_01', h: 28 }, { f: 1, x: 800, p: 'wooden_barrels_01', h: 30 },
      { f: 2, x: 1010, p: 'vintage_oil_lamp', h: 28 }, { f: 3, x: 1250, p: 'vintage_suitcase', h: 24 }, { f: 3, x: 1050, p: 'cardboard_box_01', h: 28, shade: 0.3 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'fauteuil', kind: 'armchair', f: 0, x: 510, deco: true },
      { key: 'arthur', kind: 'npc', npc: 'arthur', f: 0, x: 620, w: 40, h: 90, facing: -1 },
      { key: 'radio', kind: 'radio', f: 0, x: 770, deco: true },
      { key: 'poele', kind: 'stove', f: 0, x: 970, deco: true },
      { key: 'cuisine', kind: 'cache', variant: 'armoire', f: 0, x: 1180, w: 58, h: 112, owner: 'whitaker', loot: { conserve: 3, legumes: 3, cafe: 2 } },
      { key: 'debarras', kind: 'cache', variant: 'caisse', f: 1, x: 600, w: 78, h: 48, loot: { bois: 4, composants: 3 } },
      { key: 'conserves', kind: 'cache', variant: 'etagere', f: 1, x: 1000, w: 70, h: 104, owner: 'whitaker', loot: { eau: 4, sucre: 2, conserve: 1 } },
      { key: 'lit', kind: 'bed', f: 2, x: 700, deco: true },
      { key: 'edith', kind: 'npc', npc: 'edith', f: 2, x: 700, w: 90, h: 44, facing: 1, onBed: true },
      { key: 'coffret', kind: 'cache', variant: 'coffre', f: 2, x: 850, w: 60, h: 48, owner: 'whitaker', loot: { bijoux: 3, medicaments: 1 } },
      { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1280, w: 70, h: 124, work: 90, owner: 'whitaker', loot: { bois: 4, livres: 5 } },
      { key: 'gravats', kind: 'rubble', f: 3, x: 900, w: 96, h: 42, work: 90, loot: { bois: 2, composants: 2 } },
      { key: 'malle', kind: 'cache', variant: 'valise', f: 3, x: 1150, w: 62, h: 36, loot: { livres: 2, tabac: 1 } },
      { key: 'porte_grenier', kind: 'door', label: 'Porte du grenier', f: 3, x: 760, w: 30, h: 100, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'souvenirs', kind: 'cache', variant: 'coffre', label: 'Malle de famille', f: 3, x: 1270, w: 60, h: 48, owner: 'whitaker', loot: { bijoux: 1, alcool: 1, livres: 2 } },
      // Courette : potager, bois de chauffage, remise
      { key: 'potager', kind: 'garden', f: 0, x: 1500, w: 110, h: 30, growth: 4, deco: true },
      { key: 'recolte', kind: 'cache', variant: 'bac', label: 'Récolte du potager', f: 0, x: 1610, w: 60, h: 34, owner: 'whitaker', loot: { legumes: 3, herbes: 2 } },
      { key: 'bois_cour', kind: 'rubble', label: 'Bois de chauffage', f: 0, x: 1730, w: 90, h: 40, work: 45, loot: { bois: 4 } },
      { key: 'porte_remise', kind: 'door', label: 'Remise cadenassée', f: 0, x: 1840, w: 30, h: 104, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'remise', kind: 'cache', variant: 'boite_outils', label: 'Outils d\'Arthur', f: 0, x: 1950, w: 70, h: 36, owner: 'whitaker', loot: { composants: 2, pieces_meca: 1, hachette: 1 } }
    ]
  });

  // ============================================================ Maison mitoyenne
  // Deux maisons collées. À l'ouest, les Morrow, toit intact. À l'est, la
  // moitié des Hendricks, soufflée par un obus : plus de toit, un plancher
  // effondré qu'on escalade par les gravats, un mur de cave à percer.
  C.MAPS.maison_mitoyenne = keepNpcs('maison_mitoyenne', {
    theme: { dirt: 0.3 },
    world: { W: 2120, H: 1010, left: 40, right: 2080, ground: G, walkMin: 60, walkMax: 2060, view: 1400 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Rue et rez-de-chaussée', y: G, ceil: 656, x0: 60, x1: 2060, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 380, out: true }, { x0: 380, x1: 1800, tex: 'floor' }, { x0: 1800, x1: 2060, out: true, tex: 'rubble' }] },
      { name: 'Caves', y: 985, ceil: 848, x0: 392, x1: 1788, thick: 25, tex: 'concrete' },
      { name: 'Étage', y: 640, ceil: 476, x0: 392, x1: 1500, tex: 'floor', broken: ['right'] },
      { name: 'Grenier des Morrow', y: 460, ceil: 340, x0: 420, x1: 1050, tex: 'planks' }
    ],
    rooms: [
      R(380, 1080, 656, G, 'wallpaper', { tone: '#8a8274', paper: 11, skirt: true, frames: 2, bulbs: [700] }),
      R(1080, 1800, 656, G, 'wallpaper', { tone: '#7b7568', paper: 14, frames: 1, breach: [{ x: 1640, y: 710, r: 50 }] }),
      R(380, 1080, 476, 640, 'wallpaper', { tone: '#8b8271', paper: 9, skirt: true, frames: 2, posters: [{ x: 600, y: 540, t: 'Nina\n7 ans', rot: -0.06 }] }),
      R(1080, 1500, 476, 640, 'peeling', { tone: '#77726a', breach: [{ x: 1300, y: 520, r: 44 }] }),
      R(380, 1080, 340, 460, 'planks', { tone: '#5f574b', attic: 'both' }),
      R(380, 1800, 848, 985, 'brickPlaster', { tone: '#6a665d', border: true })
    ],
    shells: [
      { x0: 380, x1: 1080, top: 340, bottom: 985, wall: 'brickPlaster', roof: 'tiles', roofH: 110, chimneys: [1000], right: false,
        gaps: { left: [{ y0: 702, y1: G }] } },
      { x0: 1080, x1: 1800, top: 476, bottom: 985, wall: 'brickPlaster', roof: 'ruin', left: false,
        gaps: { right: [{ y0: 470, y1: G }] } }
    ],
    things: [
      { kind: 'car', f: 0, x: 240, color: '#59574f' },
      { kind: 'barricade', f: 0, x: 1900, w: 110 },
      { kind: 'crater', f: 0, x: 2010, w: 90 }
    ],
    lights: [{ kind: 'candle', x: 560, y: 598, r: 100 }],
    backdrop: { far: 'city', mid: ['houses', 'trees'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 1000 }, b: { f: 2, x: 840 } },
      { a: { f: 0, x: 860 }, b: { f: 1, x: 720 } },
      { a: { f: 0, x: 1720 }, b: { f: 2, x: 1470 }, type: 'debris' },
      { a: { f: 2, x: 470 }, b: { f: 3, x: 470 }, type: 'ladder' }
    ],
    walls: [{ f: 0, x: 1080 }, { f: 2, x: 1080 }],
    windows: [
      { f: 0, x: 560 }, { f: 0, x: 1240, broken: true }, { f: 2, x: 700 }, { f: 2, x: 1180, broken: true },
      { f: 3, x: 760, y: 372, w: 44, h: 40 }, { f: 1, x: 560, vent: true }, { f: 1, x: 1400, vent: true }
    ],
    decor: [
      { f: 0, x: 700, p: 'wooden_stool_01', h: 28 }, { f: 0, x: 1760, p: 'cardboard_box_01', h: 30 }, { f: 0, x: 330, p: 'metal_trash_can', h: 34 },
      { f: 1, x: 500, p: 'wooden_barrels_01', h: 30 }, { f: 2, x: 790, p: 'vintage_oil_lamp', h: 28 }, { f: 3, x: 900, p: 'vintage_suitcase', h: 24 },
      { f: 0, x: 1400, p: 'Television_01', h: 26 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'cuisine_morrow', kind: 'cache', variant: 'armoire', label: 'Cuisine des Morrow', f: 0, x: 450, w: 58, h: 112, owner: 'morrow', loot: { conserve: 2, legumes: 2, eau: 2 } },
      { key: 'ed', kind: 'npc', npc: 'ed', f: 0, x: 580, w: 40, h: 90, facing: 1 },
      { key: 'poele', kind: 'stove', f: 0, x: 760, deco: true },
      { key: 'gravats_salon', kind: 'rubble', f: 0, x: 1190, w: 96, h: 42, work: 90, loot: { bois: 3, composants: 2 } },
      { key: 'salon_kowalski', kind: 'cache', variant: 'commode', label: 'Commode des Hendricks', f: 0, x: 1500, w: 64, h: 60, loot: { livres: 2, bijoux: 1, cigarettes: 1 } },
      { key: 'cave_morrow', kind: 'cache', variant: 'etagere', label: 'Conserves des Morrow', f: 1, x: 560, w: 70, h: 104, owner: 'morrow', loot: { conserve: 2, sucre: 1, engrais: 1 } },
      { key: 'mur_cave', kind: 'rubble', label: 'Mur mitoyen fissuré', f: 1, x: 1080, w: 104, h: 128, block: true, work: 120, loot: { bois: 2, composants: 3 } },
      { key: 'cave_kowalski', kind: 'cache', variant: 'coffre', label: 'Malle des Hendricks', f: 1, x: 1400, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_elec: 2, medicaments: 1, munitions: 4, alcool: 1 } },
      { key: 'lit_nina', kind: 'bed', f: 2, x: 560, deco: true },
      { key: 'nina', kind: 'npc', npc: 'nina', f: 2, x: 560, w: 90, h: 44, facing: 1, onBed: true },
      { key: 'armoire_nina', kind: 'furniture', variant: 'armoire', f: 2, x: 700, w: 58, h: 112, work: 60, owner: 'morrow', loot: { bois: 3 } },
      { key: 'chambre_kowalski', kind: 'cache', variant: 'armoire', label: 'Chambre éventrée', f: 2, x: 1200, w: 58, h: 112, loot: { bandage: 1, livres: 2, tabac: 1 } },
      { key: 'grenier', kind: 'cache', variant: 'valise', label: 'Grenier', f: 3, x: 760, w: 62, h: 36, loot: { composants: 2, pieces_meca: 1, bois: 2 } }
    ]
  });

  // ============================================================ Villa en ruine (bandits)
  // La villa d'un industriel : parc clos d'une grille, hall sur deux niveaux
  // et escalier d'honneur, salon où les pillards ont allumé un feu, cave à
  // vin voûtée et coffre-fort, piscine vide sur la terrasse.
  C.MAPS.villa = keepNpcs('villa', {
    theme: { dirt: 0.2 },
    world: { W: 2600, H: 1010, left: 40, right: 2560, ground: G, walkMin: 60, walkMax: 2540, view: 1450 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Parc et rez-de-chaussée', y: G, ceil: 656, x0: 60, x1: 2540, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 560, out: true, tex: 'rubble' }, { x0: 560, x1: 2000, tex: 'floor' }, { x0: 2000, x1: 2540, out: true, tex: 'concrete' }] },
      { name: 'Cave à vin', y: 985, ceil: 848, x0: 572, x1: 1988, thick: 25, tex: 'concrete' },
      { name: 'Étage', y: 640, ceil: 476, x0: 900, x1: 1988, tex: 'floor', carpet: [1450, 1900, '#5a3a33'] },
      { name: 'Combles', y: 460, ceil: 340, x0: 610, x1: 1950, tex: 'planks' }
    ],
    rooms: [
      R(560, 900, 476, G, 'plaster', { tone: '#8e887b', frames: 2, clock: { x: 730, y: 510 }, skirt: true }),
      R(900, 1400, 656, G, 'wallpaper', { tone: '#8a8172', paper: 9, skirt: true, frames: 3 }),
      R(1400, 2000, 656, G, 'plaster', { tone: '#858176', wainscot: { h: 60, tone: '#8e8b82' }, bulbs: [1700] }),
      R(900, 1400, 476, 640, 'wallpaper', { tone: '#857c6c', paper: 12, skirt: true, frames: 2 }),
      R(1400, 2000, 476, 640, 'wallpaper', { tone: '#8a8171', paper: 16, skirt: true, frames: 2 }),
      R(560, 2000, 340, 460, 'planks', { tone: '#5f574b', attic: 'both' }),
      R(560, 2000, 848, 985, 'brick', { tone: '#665f55', vault: 210, spring: 26, border: true })
    ],
    shells: [
      { x0: 560, x1: 2000, top: 340, bottom: 985, wall: 'plaster', roof: 'tiles', roofH: 150, hole: [1480, 1720], chimneys: [700, 1860], tone: '#43342d',
        gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 702, y1: G }] } }
    ],
    things: [
      { kind: 'wall', f: 0, x: 170, w: 380, h: 56, tex: 'brickPlaster', rails: true, back: true },
      { kind: 'tree', f: 0, x: 330, h: 320, back: true },
      { kind: 'tree', f: 0, x: 2420, h: 260, back: true, trunk: 12 },
      { kind: 'crater', f: 0, x: 2230, w: 260 },
      { kind: 'bench', f: 0, x: 2440 }
    ],
    lights: [{ kind: 'brasero', x: 1250, y: 790, r: 200 }, { kind: 'candle', x: 1620, y: 596, r: 90 }],
    backdrop: { far: 'city', mid: ['houses', 'trees'], near: ['trees'] },
    stairs: [
      { a: { f: 0, x: 640 }, b: { f: 2, x: 912 } },
      { a: { f: 0, x: 1940 }, b: { f: 1, x: 1800 } },
      { a: { f: 2, x: 1950 }, b: { f: 3, x: 1800 } }
    ],
    walls: [{ f: 0, x: 900 }, { f: 0, x: 1400 }, { f: 2, x: 1400 }, { f: 1, x: 1100 }],
    windows: [
      { f: 0, x: 780, kind: 'arch', y: 520, w: 56, h: 170 }, { f: 0, x: 1150, kind: 'arch', y: 676, w: 50, h: 110, shutters: true },
      { f: 0, x: 1700, broken: true }, { f: 2, x: 1150, kind: 'arch', y: 496, w: 50, h: 110, shutters: true }, { f: 2, x: 1700, kind: 'arch', y: 496, w: 50, h: 110, broken: true },
      { f: 3, x: 1100, kind: 'round', y: 356, w: 56 }, { f: 1, x: 1500, vent: true }
    ],
    decor: [
      { f: 0, x: 440, p: 'covered_car', h: 62 }, { f: 0, x: 1080, p: 'wine_bottles_01', h: 18 }, { f: 0, x: 1350, p: 'vintage_oil_lamp', h: 30 },
      { f: 0, x: 2120, p: 'metal_trash_can', h: 34 }, { f: 1, x: 1250, p: 'wine_bottles_01', h: 20 }, { f: 1, x: 950, p: 'wooden_barrels_01', h: 32 },
      { f: 2, x: 1860, p: 'vintage_suitcase', h: 26 }, { f: 3, x: 700, p: 'Television_01', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      // Hall et salon
      { key: 'recoin_hall', kind: 'hide', f: 0, x: 830, w: 46, h: 108 },
      { key: 'fauteuil', kind: 'armchair', f: 0, x: 990, deco: true },
      { key: 'garde_salon', kind: 'guard', type: 'bandit_arme', f: 0, x: 1150, facing: -1, attitude: 'hostile', group: 'pillards', lookBack: 8 },
      { key: 'buffet', kind: 'cache', variant: 'armoire', label: 'Buffet du salon', f: 0, x: 1330, w: 58, h: 112, loot: { alcool: 1, conserve: 2 } },
      { key: 'cuisine', kind: 'cache', variant: 'etagere', label: 'Cuisine', f: 0, x: 1600, w: 70, h: 104, loot: { conserve: 2, viande: 2, cafe: 1 } },
      // Cave à vin
      { key: 'recoin_cave', kind: 'hide', f: 1, x: 1650, w: 46, h: 108 },
      { key: 'cave_vins', kind: 'cache', variant: 'etagere', label: 'Cave à vins', f: 1, x: 1400, w: 70, h: 104, loot: { alcool: 1, cafe: 1 } },
      { key: 'porte_coffre', kind: 'door', f: 1, x: 1100, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'coffre_fort', kind: 'cache', variant: 'coffre', label: 'Coffre-fort de l\'industriel', f: 1, x: 800, w: 60, h: 48, locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 4, fusil_pompe: 1, munitions: 6 } },
      // Étage : bibliothèque, chambre du maître
      { key: 'bibliotheque', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1050, w: 70, h: 124, work: 90, loot: { bois: 3, livres: 5 } },
      { key: 'recoin_etage', kind: 'hide', f: 2, x: 1350, w: 46, h: 108 },
      { key: 'rodeur', kind: 'guard', type: 'bandit', f: 2, x: 1500, facing: -1, attitude: 'hostile', group: 'pillards', patrol: [1000, 1900] },
      { key: 'lit_maitre', kind: 'bed', f: 2, x: 1620, deco: true },
      { key: 'chambre', kind: 'cache', variant: 'coffre', label: 'Coffret à bijoux', f: 2, x: 1790, w: 60, h: 48, loot: { bijoux: 2, cafe: 1 } },
      // Combles : le butin et un pillard qui dort
      { key: 'grenier', kind: 'cache', variant: 'valise', label: 'Malles du grenier', f: 3, x: 800, w: 62, h: 36, loot: { livres: 2, pieces_elec: 2 } },
      { key: 'dormeur', kind: 'guard', type: 'bandit', f: 3, x: 1200, facing: 1, attitude: 'hostile', group: 'pillards', sleep: true },
      { key: 'butin_pillards', kind: 'cache', variant: 'caisse', label: 'Butin des pillards', f: 3, x: 1460, w: 78, h: 48, loot: { bois: 4, conserve: 2, alcool: 1 } }
    ]
  });

  // ============================================================ Église St. Mark
  // Parvis, clocher-porche (tribune puis échelle jusqu'aux cloches), nef
  // haute et voûtée aux vitraux soufflés, crypte sous le chœur, sacristie
  // et salle paroissiale où dorment les réfugiés du père Daniel.
  C.MAPS.eglise = keepNpcs('eglise', {
    theme: { dirt: 0.2, church: true },
    world: { W: 2200, H: 1010, left: 40, right: 2160, ground: G, walkMin: 60, walkMax: 2140, view: 1450 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Parvis et nef', y: G, ceil: 656, x0: 60, x1: 2088, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 360, out: true }, { x0: 360, x1: 2100, tex: 'tiles' }] },
      { name: 'Crypte', y: 985, ceil: 848, x0: 712, x1: 1688, thick: 25, tex: 'concrete' },
      { name: 'Tribune', y: 560, ceil: 400, x0: 372, x1: 900, tex: 'planks' },
      { name: 'Chambre des cloches', y: 330, ceil: 190, x0: 374, x1: 686, tex: 'planks' },
      { name: 'Salle paroissiale', y: 640, ceil: 476, x0: 1712, x1: 2088, tex: 'floor' }
    ],
    rooms: [
      R(360, 700, 400, G, 'brickPlaster', { tone: '#7d776b', skirt: true }),
      R(360, 700, 190, 400, 'brickPlaster', { tone: '#6f695e', bell: { x: 450, y: 204, s: 0.8 } }),
      R(700, 1700, 260, G, 'plaster', { tone: '#8f897b', vault: 250, spring: 130, crucifix: { x: 1450, y: 480, s: 1.3 },
        signs: [{ t: 'PAIX AUX HOMMES', x: 1060, y: 300, size: 22, color: 'rgba(222,212,190,0.3)' }] }),
      R(1700, 2100, 656, G, 'plaster2', { tone: '#827c70', frames: 1, skirt: true }),
      R(1700, 2100, 476, 640, 'wallpaper', { tone: '#857e70', paper: 12, skirt: true, posters: [{ x: 1960, y: 540, t: 'CHORALE\nJEUDI', rot: 0.05 }] }),
      R(700, 1700, 848, 985, 'brick', { tone: '#625c52', vault: 200, spring: 24, border: true })
    ],
    shells: [
      { x0: 360, x1: 700, top: 190, bottom: G, wall: 'brickPlaster', roof: 'gable', roofH: 140, cross: true,
        gaps: { left: [{ y0: 690, y1: G }], right: [{ y0: 690, y1: G }, { y0: 400, y1: 560 }] } },
      { x0: 700, x1: 1700, top: 260, bottom: 985, wall: 'brickPlaster', roof: 'gable', roofH: 150, left: false,
        gaps: { right: [{ y0: 690, y1: G }] } },
      { x0: 1700, x1: 2100, top: 476, bottom: G, wall: 'plaster2', roof: 'tiles', roofH: 80, left: false, hole: [1960, 2080] }
    ],
    things: [
      { kind: 'tree', f: 0, x: 200, h: 260, back: true },
      { kind: 'bench', f: 0, x: 260 }
    ],
    lights: [{ kind: 'brasero', x: 540, y: 790, r: 190 }, { kind: 'candle', x: 1420, y: 736, r: 120 }, { kind: 'candle', x: 1900, y: 598, r: 100 }],
    backdrop: { far: 'city', mid: ['steeples', 'houses'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 860 }, b: { f: 2, x: 690 } },
      { a: { f: 2, x: 420 }, b: { f: 3, x: 420 }, type: 'ladder' },
      { a: { f: 0, x: 1640 }, b: { f: 1, x: 1500 } },
      { a: { f: 0, x: 2040 }, b: { f: 4, x: 1860 } }
    ],
    walls: [{ f: 1, x: 1000 }],
    windows: [
      { f: 0, x: 820, kind: 'stained', y: 330, w: 56, h: 190 }, { f: 0, x: 1080, kind: 'stained', y: 330, w: 56, h: 190, broken: true },
      { f: 0, x: 1320, kind: 'stained', y: 330, w: 56, h: 190 }, { f: 0, x: 1580, kind: 'stained', y: 330, w: 56, h: 190, broken: true },
      { f: 3, x: 470, kind: 'arch', y: 210, w: 40, h: 80 }, { f: 2, x: 530, kind: 'round', y: 410, w: 64 },
      { f: 0, x: 1900 }, { f: 4, x: 1780, broken: true }, { f: 1, x: 1300, vent: true }
    ],
    decor: [
      { f: 0, x: 420, p: 'wooden_crate_02', h: 24 }, { f: 0, x: 2070, p: 'wooden_bucket_01', h: 24 }, { f: 0, x: 1780, p: 'plastic_bottle_gallon', h: 20 },
      { f: 4, x: 2050, p: 'cardboard_box_01', h: 28, shade: 0.3 }, { f: 1, x: 1180, p: 'wooden_barrels_01', h: 30 }, { f: 2, x: 820, p: 'wooden_ladder', h: 90 },
      { f: 3, x: 640, p: 'old_tyre', h: 20 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 0, x: 100, w: 44, h: 104 },
      { key: 'sal', kind: 'npc', npc: 'sal', f: 0, x: 600, w: 50, h: 70, facing: 1 },
      // Nef
      { key: 'banc1', kind: 'pew', f: 0, x: 960, w: 110, h: 40, deco: true },
      { key: 'banc2', kind: 'pew', f: 0, x: 1110, w: 110, h: 40, deco: true },
      { key: 'banc3', kind: 'pew', f: 0, x: 1260, w: 110, h: 40, deco: true },
      { key: 'autel', kind: 'altar', f: 0, x: 1440, w: 100, h: 60, deco: true },
      { key: 'daniel', kind: 'npc', npc: 'daniel', f: 0, x: 1550, w: 40, h: 90, facing: -1 },
      // Sacristie et salle paroissiale
      { key: 'sacristie', kind: 'cache', variant: 'armoire', f: 0, x: 1820, w: 58, h: 112, owner: 'eglise', loot: { conserve: 3, eau: 4, alcool: 1 } },
      { key: 'rosa', kind: 'npc', npc: 'rosa', f: 4, x: 1780, w: 50, h: 70, facing: 1 },
      { key: 'lili', kind: 'npc', npc: 'lili', f: 4, x: 1860, w: 60, h: 24, facing: -1 },
      { key: 'bibliotheque', kind: 'cache', variant: 'etagere', f: 4, x: 2000, w: 70, h: 104, loot: { livres: 4, herbes: 2 } },
      // Crypte
      { key: 'crypte', kind: 'cache', variant: 'caisse', f: 1, x: 1250, w: 78, h: 48, loot: { bois: 3, engrais: 2, composants: 2 } },
      { key: 'porte_crypte', kind: 'door', f: 1, x: 1000, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'tronc', kind: 'cache', variant: 'coffre', f: 1, x: 820, w: 60, h: 48, owner: 'eglise', loot: { bijoux: 2, conserve: 2 } },
      // Clocher
      { key: 'caisse_clocher', kind: 'cache', variant: 'caisse', f: 2, x: 780, w: 78, h: 48, loot: { bois: 3, composants: 2 } },
      { key: 'gravats_clocher', kind: 'rubble', label: 'Poutres effondrées', f: 3, x: 520, w: 90, h: 118, block: true, work: 150, loot: { bois: 3, composants: 3 } },
      { key: 'cachette', kind: 'cache', variant: 'valise', f: 3, x: 640, w: 62, h: 36, loot: { diamants: 1, cigarettes: 2 } }
    ]
  });

  // ============================================================ Hôpital de campagne
  // Un bâtiment de béton sur trois niveaux, cage d'escalier à droite : la
  // salle commune (blessés), la pharmacie, le bloc à l'étage, un service
  // abandonné au 2e, le toit où flotte le drap à croix rouge. Dans la cour,
  // l'ambulance et la tente de tri.
  var HOP = { wall: 'plaster', wain: { h: 70, tone: '#8d8c86', grid: 16 } };
  C.MAPS.hopital = keepNpcs('hopital', {
    theme: { dirt: 0.14, hospital: true },
    world: { W: 2460, H: 1010, left: 40, right: 2420, ground: G, walkMin: 60, walkMax: 2400, view: 1450 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Cour et rez-de-chaussée', y: G, ceil: 656, x0: 60, x1: 2388, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 520, out: true }, { x0: 520, x1: 2400, tex: 'tiles' }] },
      { name: 'Sous-sol', y: 985, ceil: 848, x0: 532, x1: 2388, thick: 25, tex: 'concrete' },
      { name: '1er étage : bloc', y: 640, ceil: 476, x0: 532, x1: 2388, tex: 'tiles' },
      { name: '2e étage : service fermé', y: 460, ceil: 296, x0: 532, x1: 2388, tex: 'debris' },
      { name: 'Toit', y: 282, ceil: 40, x0: 527, x1: 2393, out: true, noSlab: true }
    ],
    rooms: [
      R(520, 900, 656, G, HOP.wall, { tone: '#8a887f', wainscot: HOP.wain, tubes: [710], posters: [{ x: 600, y: 700, t: 'SE LAVER\nLES MAINS' }] }),
      R(900, 1500, 656, G, HOP.wall, { tone: '#88867d', wainscot: HOP.wain, tubes: [1050, 1350] }),
      R(1500, 1800, 656, G, HOP.wall, { tone: '#827f76', wainscot: HOP.wain, tubes: [1650] }),
      R(1800, 2400, 296, G, 'precast', { tone: '#77746c' }),
      R(520, 1300, 476, 640, HOP.wall, { tone: '#8c8a82', wainscot: { h: 164, tone: '#94938c', grid: 18 }, tubes: [800, 1100], clock: { x: 700, y: 510 } }),
      R(1300, 1800, 476, 640, HOP.wall, { tone: '#827f76', frames: 1, tubes: [1550] }),
      R(520, 1800, 296, 460, HOP.wall, { tone: '#76736b', wainscot: HOP.wain, breach: [{ x: 1000, y: 360, r: 46 }], tubes: [1400] }),
      R(520, 2400, 848, 985, 'concrete', { tone: '#64615a', border: true, tubes: [900, 1700] })
    ],
    shells: [
      { x0: 520, x1: 2400, top: 296, bottom: 985, wall: 'precast', roof: 'flat', flag: { x: 700, kind: 'cross', h: 120 },
        sign: { t: 'HÔPITAL', x: 1500, y: 196, missing: [1] }, gaps: { left: [{ y0: 690, y1: G, shutter: 30 }] } }
    ],
    things: [
      { kind: 'car', f: 0, x: 330, color: '#8a877c', door: true },
      { kind: 'tent', f: 0, x: 170, w: 150, h: 96, color: '#6f6c5c', back: true }
    ],
    lights: [{ kind: 'lamp', x: 1200, y: 690, r: 170, a: 0.6 }, { kind: 'candle', x: 1140, y: 600, r: 110 }],
    backdrop: { far: 'city', mid: ['towers'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 2340 }, b: { f: 2, x: 2020 } },
      { a: { f: 2, x: 2340 }, b: { f: 3, x: 2020 } },
      { a: { f: 3, x: 1880 }, b: { f: 4, x: 1880 }, type: 'ladder' },
      { a: { f: 0, x: 580 }, b: { f: 1, x: 760 } }
    ],
    walls: [{ f: 0, x: 900 }, { f: 0, x: 1500 }, { f: 0, x: 1800 }, { f: 2, x: 1300 }, { f: 2, x: 1800 }, { f: 3, x: 1800 }, { f: 1, x: 1200 }],
    windows: [
      { f: 0, x: 1180 }, { f: 0, x: 1650, boarded: true }, { f: 2, x: 950 }, { f: 2, x: 1550, broken: true },
      { f: 3, x: 1450, broken: true }, { f: 3, x: 700, broken: true }, { f: 1, x: 1500, vent: true }, { f: 1, x: 2000, vent: true }
    ],
    decor: [
      { f: 0, x: 440, p: 'plastic_crate_01', h: 26 }, { f: 0, x: 860, p: 'metal_trash_can', h: 34 }, { f: 0, x: 1760, p: 'medical_box', h: 18 },
      { f: 0, x: 2100, p: 'wooden_broom', h: 70 }, { f: 1, x: 1900, p: 'portable_generator', h: 44 }, { f: 1, x: 2250, p: 'metal_jerrycan', h: 30 },
      { f: 2, x: 1220, p: 'medical_box', h: 18 }, { f: 2, x: 1750, p: 'plastic_bottle_gallon', h: 20 }, { f: 2, x: 2200, p: 'old_gas_mask', h: 16 },
      { f: 3, x: 620, p: 'old_military_crate', h: 30 }, { f: 3, x: 1650, p: 'old_tyre', h: 24 }, { f: 4, x: 1400, p: 'portable_searchlight', h: 36 },
      { f: 4, x: 2300, p: 'metal_jerrycan', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      // Accueil et salle commune
      { key: 'benny', kind: 'npc', npc: 'benny', f: 0, x: 740, w: 40, h: 90, facing: 1 },
      { key: 'lit1', kind: 'bed', f: 0, x: 1000, metal: true, deco: true },
      { key: 'dale', kind: 'npc', npc: 'dale', f: 0, x: 1000, w: 90, h: 44, facing: 1, onBed: true },
      { key: 'lit2', kind: 'bed', f: 0, x: 1200, metal: true, deco: true },
      { key: 'poele', kind: 'stove', f: 0, x: 1400, deco: true },
      { key: 'pharmacie', kind: 'cache', variant: 'pharmacie', f: 0, x: 1650, w: 60, h: 112, owner: 'hopital', locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { medicaments: 2, bandage: 3, remede: 1 } },
      // Sous-sol : lingerie, puis le groupe électrogène derrière la porte
      { key: 'linge', kind: 'cache', variant: 'etagere', f: 1, x: 950, w: 70, h: 104, loot: { bandage: 1, herbes: 2, eau: 1 } },
      { key: 'porte_cave', kind: 'door', f: 1, x: 1200, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'gravats_cave', kind: 'rubble', f: 1, x: 1450, w: 84, h: 38, work: 60, loot: { composants: 2, bois: 1 } },
      { key: 'groupe', kind: 'cache', variant: 'caisse', label: 'Réserve du groupe électrogène', f: 1, x: 1750, w: 78, h: 48, loot: { carburant: 2, pieces_elec: 1, pieces_meca: 1 } },
      // Bloc opératoire (Ruth)
      { key: 'armoire_bloc', kind: 'cache', variant: 'armoire', f: 2, x: 620, w: 58, h: 112, owner: 'hopital', loot: { bandage: 2, eau: 2, alcool: 1 } },
      { key: 'table_op', kind: 'bed', f: 2, x: 950, metal: true, deco: true },
      { key: 'ruth', kind: 'npc', npc: 'ruth', f: 2, x: 1100, w: 40, h: 90, facing: -1 },
      { key: 'bureau', kind: 'furniture', variant: 'commode', f: 2, x: 1500, w: 64, h: 60, work: 60, owner: 'hopital', loot: { bois: 3, livres: 2 } },
      // 2e étage : le plafond s'est effondré au milieu du couloir
      // Après le bombardement : le fond du sous-sol s'est effondré sur les fournitures
      { key: 'effondrement_a', kind: 'rubble', label: 'Gravats du sous-sol', only: 'shelled', f: 1, x: 1960, w: 104, h: 120, block: true, work: 110, loot: { composants: 2 } },
      { key: 'effondrement_b', kind: 'rubble', label: 'Gravats du sous-sol', only: 'shelled', f: 1, x: 2090, w: 100, h: 110, block: true, work: 110, loot: { bois: 2 } },
      { key: 'effondrement_c', kind: 'rubble', label: 'Gravats du sous-sol', only: 'shelled', f: 1, x: 2210, w: 96, h: 100, block: true, work: 100, loot: { composants: 1 } },
      { key: 'fournitures', kind: 'cache', variant: 'caisse', label: 'Fournitures médicales ensevelies', only: 'shelled', f: 1, x: 2330, w: 86, h: 52, loot: { medicaments: 3, bandage: 4, remede: 1, eau: 1 } },
      { key: 'paquetage', kind: 'cache', variant: 'valise', f: 3, x: 1600, w: 62, h: 36, loot: { munitions: 4, cigarettes: 2, couteau: 1, pieces_armes: 1 } },
      { key: 'eboulis', kind: 'rubble', f: 3, x: 1250, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 3 } },
      { key: 'archives', kind: 'cache', variant: 'etagere', f: 3, x: 800, w: 70, h: 104, loot: { livres: 3, filtre: 1 } },
      // Toit
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse', f: 4, x: 1100, w: 78, h: 48, loot: { composants: 3, pieces_meca: 1 } }
    ]
  });

  // ============================================================ École bombardée
  // La cour (cage de foot, balançoire), le gymnase haut de plafond où des
  // familles ont posé leurs matelas, puis le bâtiment des classes : la
  // chaufferie en bas, une classe à l'étage, le 2e éventré sous le clocheton.
  C.MAPS.ecole = keepNpcs('ecole', {
    theme: { dirt: 0.32, school: true },
    world: { W: 2600, H: 1010, left: 40, right: 2560, ground: G, walkMin: 60, walkMax: 2540, view: 1500 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Cour, gymnase et couloir', y: G, ceil: 656, x0: 60, x1: 2388, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 800, out: true }, { x0: 800, x1: 1500, tex: 'floor' }, { x0: 1500, x1: 2400, tex: 'tiles' }] },
      { name: 'Chaufferie', y: 985, ceil: 848, x0: 1512, x1: 2388, thick: 25, tex: 'concrete' },
      { name: 'Salle de classe', y: 640, ceil: 476, x0: 1512, x1: 2388, tex: 'floor' },
      { name: '2e étage', y: 460, ceil: 296, x0: 1512, x1: 2300, tex: 'debris', broken: ['right'] }
    ],
    rooms: [
      R(800, 1500, 400, G, 'paintedConcrete', { tone: '#7f7b70', tubes: [950, 1150, 1350], wainscot: { h: 110, tex: 'planks2', tone: '#6f6557', grid: false },
        signs: [{ t: 'GYMNASE', x: 1080, y: 470, size: 30 }] }),
      R(1500, 2400, 656, G, 'plaster2', { tone: '#857f72', wainscot: { h: 70, tone: '#7e7a70' }, bulbs: [1700, 2100],
        posters: [{ x: 1640, y: 720, t: 'DESSINS\nDES CM1' }, { x: 1700, y: 716, t: 'MA MAISON', rot: 0.08 }] }),
      R(1500, 2100, 476, 640, 'plaster2', { tone: '#88826f', boards: [{ x: 1760, w: 170, text: ['Lundi 12', 'Dictée'] }], clock: { x: 1990, y: 506 }, bulbs: [1650, 1900] }),
      R(2100, 2400, 476, 640, 'plaster', { tone: '#7d786d', skirt: true }),
      R(1500, 2400, 296, 460, 'peeling', { tone: '#7a7468', breach: [{ x: 2200, y: 360, r: 60 }], frames: 1 }),
      R(1500, 2400, 848, 985, 'brickPlaster', { tone: '#655f55', border: true })
    ],
    shells: [
      { x0: 800, x1: 1500, top: 400, bottom: G, wall: 'brick', roof: 'gable', roofH: 70, right: false,
        gaps: { left: [{ y0: 690, y1: G }] } },
      { x0: 1500, x1: 2400, top: 296, bottom: 985, wall: 'brickPlaster', roof: 'tiles', roofH: 110, hole: [2150, 2380],
        tower: { x: 1850, w: 90, top: 120, bottom: 240, clock: true, spire: 70 }, gaps: { left: [{ y0: 690, y1: G }] } }
    ],
    things: [
      { kind: 'goal', f: 0, x: 280 },
      { kind: 'swing', f: 0, x: 620 },
      { kind: 'tree', f: 0, x: 450, h: 240, back: true },
      { kind: 'crater', f: 0, x: 520, w: 110 },
      { kind: 'wall', f: 0, x: 60, w: 740, h: 36, rails: true, back: true }
    ],
    lights: [{ kind: 'brasero', x: 1250, y: 790, r: 200 }, { kind: 'candle', x: 930, y: 790, r: 90 }],
    backdrop: { far: 'city', mid: ['towers', 'houses'], near: ['trees'] },
    stairs: [
      { a: { f: 0, x: 2340 }, b: { f: 2, x: 2160 } },
      { a: { f: 2, x: 2250 }, b: { f: 3, x: 2080 } },
      { a: { f: 0, x: 1560 }, b: { f: 1, x: 1720 } }
    ],
    walls: [{ f: 0, x: 1500 }, { f: 1, x: 1950 }, { f: 2, x: 2100 }],
    windows: [
      { f: 0, x: 900, kind: 'strip', y: 430, w: 150, h: 50, broken: true }, { f: 0, x: 1150, kind: 'strip', y: 430, w: 150, h: 50 },
      { f: 0, x: 1380, kind: 'strip', y: 430, w: 150, h: 50, broken: true },
      { f: 0, x: 1950, boarded: true }, { f: 2, x: 2050 }, { f: 2, x: 2300, broken: true }, { f: 3, x: 1900, broken: true },
      { f: 1, x: 1700, vent: true }, { f: 1, x: 2200, vent: true }
    ],
    decor: [
      { f: 0, x: 740, p: 'cardboard_box_01', h: 28, shade: 0.3 }, { f: 0, x: 1460, p: 'wooden_bucket_01', h: 24 }, { f: 0, x: 2250, p: 'wooden_broom', h: 70 },
      { f: 1, x: 1800, p: 'wooden_barrels_01', h: 30 }, { f: 1, x: 2300, p: 'cement_bag', h: 22 },
      { f: 2, x: 2350, p: 'Television_01', h: 26 }, { f: 3, x: 1600, p: 'old_tyre', h: 24 }, { f: 3, x: 2050, p: 'wooden_ladder', h: 90 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      // Gymnase : les familles
      { key: 'hal', kind: 'npc', npc: 'hal', f: 0, x: 900, w: 50, h: 70, facing: 1 },
      { key: 'matelas', kind: 'cache', variant: 'valise', f: 0, x: 1000, w: 62, h: 36, owner: 'ecole', loot: { conserve: 2, cigarettes: 2, medicaments: 1 } },
      { key: 'tim', kind: 'npc', npc: 'tim', f: 0, x: 1110, w: 40, h: 56, facing: 1 },
      { key: 'carol', kind: 'npc', npc: 'carol', f: 0, x: 1190, w: 40, h: 90, facing: -1 },
      { key: 'sacs', kind: 'cache', variant: 'caisse', f: 0, x: 1380, w: 78, h: 48, owner: 'ecole', loot: { eau: 3, conserve: 1, legumes: 2 } },
      // Couloir
      { key: 'vestiaire', kind: 'cache', variant: 'armoire', f: 0, x: 1900, w: 58, h: 112, loot: { bois: 2, livres: 2, composants: 1 } },
      // Chaufferie
      { key: 'charbon', kind: 'cache', variant: 'caisse', label: 'Réserve de charbon', f: 1, x: 1850, w: 78, h: 48, loot: { bois: 5, composants: 2 } },
      { key: 'porte_chaufferie', kind: 'door', f: 1, x: 1950, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'gravats_cave', kind: 'rubble', f: 1, x: 2100, w: 84, h: 38, work: 60, loot: { composants: 2, pieces_meca: 1 } },
      { key: 'cantine', kind: 'cache', variant: 'coffre', label: 'Réserve de la cantine', f: 1, x: 2280, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { conserve: 2, sucre: 2, pieces_elec: 1 } },
      // Salle de classe
      { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1580, w: 70, h: 124, work: 90, loot: { bois: 4, livres: 4 } },
      { key: 'pupitre1', kind: 'desk', f: 2, x: 1700, w: 56, h: 40, deco: true },
      { key: 'pupitre2', kind: 'desk', f: 2, x: 1810, w: 56, h: 40, deco: true },
      { key: 'infirmerie', kind: 'cache', variant: 'pharmacie', label: 'Armoire de l\'infirmière', f: 2, x: 1920, w: 50, h: 96, loot: { bandage: 1, herbes: 2, eau: 1 } },
      { key: 'etagere_classe', kind: 'cache', variant: 'etagere', f: 2, x: 2030, w: 70, h: 104, loot: { livres: 4, composants: 1 } },
      // 2e étage éventré
      { key: 'caisse_grenier', kind: 'cache', variant: 'caisse', f: 3, x: 2200, w: 78, h: 48, loot: { bois: 3, composants: 2 } },
      { key: 'eboulis', kind: 'rubble', f: 3, x: 1900, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 3 } },
      { key: 'objets_trouves', kind: 'cache', variant: 'valise', label: 'Objets trouvés', f: 3, x: 1650, w: 62, h: 36, loot: { bijoux: 1, cafe: 1, tabac: 1 } }
    ]
  });

  // ============================================================ Hôtel Lincoln
  // En bas, le hall : des civils y campent au milieu des gravats, autour d'un
  // bidon où brûle du bois. En haut, l'armée : étages propres, lampes du
  // groupe électrogène, sacs de sable aux fenêtres. Des chambres fermées
  // s'enchaînent ; la cage de l'ascenseur, éventrée, permet de monter sans
  // passer par l'escalier de service gardé.
  var ARCH = function (f, x, y, o) { return ext({ f: f, x: x, kind: 'arch', y: y, w: 48, h: 104 }, o || {}); };
  var SHAFT = 1540;
  C.MAPS.hotel = keepNpcs('hotel', {
    theme: { dirt: 0.25 },
    world: { W: 2120, H: 1010, left: 40, right: 2080, ground: G, walkMin: 60, walkMax: 2060, view: 1400 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Rue et hall', y: G, ceil: 620, x0: 60, x1: 2060, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 420, out: true }, { x0: 420, x1: 1900, tex: 'tiles' }, { x0: 1900, x1: 2060, out: true }] },
      { name: 'Cuisines', y: 985, ceil: 848, x0: 432, x1: 1888, thick: 25, tex: 'tiles' },
      { name: 'Étage des officiers', y: 604, ceil: 440, x0: 432, x1: 1888, tex: 'floor', carpet: [440, 1190, '#57362f'] },
      { name: 'Suites', y: 424, ceil: 260, x0: 432, x1: 1888, tex: 'floor', carpet: [440, 1490, '#5b3a36'] },
      { name: 'Toit-terrasse', y: 246, ceil: 20, x0: 427, x1: 1893, out: true, noSlab: true }
    ],
    rooms: [
      // Hall : grand, abîmé, les civils
      R(420, 1500, 620, G, 'peeling', { tone: '#7c7266', frames: 2, clock: { x: 1300, y: 660 }, breach: [{ x: 520, y: 690, r: 34 }],
        signs: [{ t: 'ICI PAS DE SOLDATS', x: 900, y: 700, font: '"Special Elite", monospace', size: 16, color: 'rgba(220,214,196,0.4)' }] }),
      R(1580, 1900, 620, G, 'plaster2', { tone: '#6f6a60', bulbs: [1740] }),
      // Cage d'ascenseur sur toute la hauteur
      R(1500, 1580, 260, 985, 'concrete', { shaft: true }),
      // Étage militaire : salle de garde, chambre 12, palier de service
      R(420, 1200, 440, 604, 'wallpaper', { tone: '#8a816f', paper: 16, skirt: true, posters: [{ x: 640, y: 500, t: 'CARTE DU\nSECTEUR' }, { x: 1050, y: 496, t: 'COUVRE-FEU\n21 H' }] }),
      R(1200, 1500, 440, 604, 'wallpaper', { tone: '#8f8471', paper: 16, skirt: true, frames: 2 }),
      R(1580, 1900, 440, 604, 'plaster2', { tone: '#77726a', skirt: true }),
      // Suites
      R(420, 1000, 260, 424, 'wallpaper', { tone: '#908571', paper: 8, skirt: true, frames: 3 }),
      R(1000, 1500, 260, 424, 'wallpaper', { tone: '#8c8170', paper: 8, skirt: true, frames: 2, clock: { x: 1150, y: 296 } }),
      R(1580, 1900, 260, 424, 'plaster2', { tone: '#77726a' }),
      R(420, 1500, 848, 985, 'tiles', { tone: '#77746b', wainscot: { h: 137, tone: '#86847b', grid: 16 }, tubes: [800, 1250] }),
      R(1580, 1900, 848, 985, 'concrete', { tone: '#66625a', tubes: [1740] })
    ],
    shells: [
      { x0: 420, x1: 1900, top: 260, bottom: 985, wall: 'brickPlaster', roof: 'flat', sign: { t: 'HÔTEL LINCOLN', x: 1160, y: 180, missing: [3] },
        gaps: { left: [{ y0: 680, y1: G }], right: [{ y0: 690, y1: G }] } }
    ],
    things: [
      { kind: 'car', f: 0, x: 260, burnt: true },
      { kind: 'hedgehog', f: 0, x: 1980, n: 1 },
      { kind: 'sandwall', f: 2, x: 640, w: 90, rows: 2 },
      { kind: 'sandwall', f: 3, x: 1270, w: 80, rows: 2 },
      { kind: 'cabin', f: 1, x: SHAFT, w: 64, h: 110, cable: 700, crashed: true }
    ],
    lights: [
      { kind: 'brasero', x: 1000, y: 790, r: 210 },
      { kind: 'lamp', x: 800, y: 470, r: 190, a: 0.8 }, { kind: 'lamp', x: 1350, y: 470, r: 150, a: 0.7 },
      { kind: 'lamp', x: 700, y: 290, r: 170, a: 0.7 }, { kind: 'lamp', x: 1250, y: 290, r: 160, a: 0.7 },
      { kind: 'candle', x: 1760, y: 780, r: 80 }
    ],
    mood: { dark: 0.17, tint: 'rgba(190,140,80,0.34)', moon: 0.08 },
    backdrop: { far: 'city', mid: ['towers', 'steeples'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 1100 }, b: { f: 2, x: 900 } },
      { a: { f: 0, x: 1850 }, b: { f: 1, x: 1700 } },
      { a: { f: 2, x: 1850 }, b: { f: 3, x: 1680 } },
      { a: { f: 3, x: 1860 }, b: { f: 4, x: 1860 }, type: 'ladder' },
      // Cage d'ascenseur : échelle de service, d'un palier à l'autre
      { a: { f: 1, x: SHAFT }, b: { f: 0, x: SHAFT }, type: 'ladder' },
      { a: { f: 0, x: SHAFT }, b: { f: 2, x: SHAFT }, type: 'ladder' },
      { a: { f: 2, x: SHAFT }, b: { f: 3, x: SHAFT }, type: 'ladder' }
    ],
    walls: [
      { f: 0, x: 1500 }, { f: 0, x: 1580 },
      { f: 2, x: 1200 }, { f: 2, x: 1500 }, { f: 2, x: 1580 },
      { f: 3, x: 1000 }, { f: 3, x: 1500 }, { f: 3, x: 1580 },
      { f: 1, x: 1000 }, { f: 1, x: 1500 }, { f: 1, x: 1580 }
    ],
    windows: [
      ARCH(0, 1300, 650, { h: 130, w: 54, broken: true }), ARCH(0, 700, 650, { h: 130, w: 54, boarded: true }),
      ARCH(2, 640, 470, { shutters: true }), ARCH(2, 1000, 470), ARCH(2, 1350, 470, { broken: true }), ARCH(2, 1750, 470),
      ARCH(3, 640, 290), ARCH(3, 1250, 290, { shutters: true }), ARCH(3, 1750, 290, { broken: true }),
      { f: 1, x: 900, vent: true }, { f: 1, x: 1700, vent: true }
    ],
    decor: [
      { f: 0, x: 180, p: 'street_lamp_01', h: 200 }, { f: 0, x: 1000, p: 'barrel_stove', h: 44 }, { f: 0, x: 1430, p: 'trashbag', h: 30 },
      { f: 0, x: 600, p: 'cardboard_box_01', h: 28, shade: 0.3 }, { f: 0, x: 1650, p: 'vintage_suitcase', h: 24 },
      { f: 1, x: 560, p: 'wine_bottles_01', h: 20 }, { f: 1, x: 1180, p: 'russian_food_cans_01', h: 16 }, { f: 1, x: 1800, p: 'portable_generator', h: 44 },
      { f: 2, x: 480, p: 'vintage_radio_transceiver', h: 22 }, { f: 2, x: 1100, p: 'old_military_crate', h: 30 }, { f: 2, x: 1650, p: 'ammo_box', h: 16 },
      { f: 3, x: 1400, p: 'wine_bottles_01', h: 18 }, { f: 3, x: 1700, p: 'old_military_crate', h: 28 },
      { f: 4, x: 700, p: 'small_lpg_tank', h: 34 }, { f: 4, x: 1100, p: 'portable_searchlight', h: 36 }
    ],
    zones: [
      { id: 'etage_officiers', f: 2, x0: 432, x1: 1888, group: 'hotel', label: 'Étage des officiers' },
      { id: 'suites', f: 3, x0: 432, x1: 1000, group: 'hotel', label: 'Suites occupées' },
      { id: 'suite_voyous', f: 3, x0: 1000, x1: 1350, group: 'voyous', label: 'La suite des ravisseurs', sign: 'ILS SONT ARMÉS', signHostile: 'ILS VOUS ONT VU' }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      // Hall : les civils autour du feu
      { key: 'viktor', kind: 'npc', npc: 'viktor', f: 0, x: 520, w: 50, h: 70, facing: 1 },
      { key: 'irene', kind: 'npc', npc: 'irene', f: 0, x: 640, w: 40, h: 90, facing: 1 },
      { key: 'reception', kind: 'cache', variant: 'commode', label: 'Comptoir de la réception', f: 0, x: 780, w: 64, h: 60, owner: 'hotel_refugies', loot: { cigarettes: 2, sucre: 1, livres: 2 } },
      { key: 'matelas_hall', kind: 'bed', f: 0, x: 900, deco: true },
      { key: 'fauteuil', kind: 'armchair', f: 0, x: 1220, deco: true },
      { key: 'recoin_hall', kind: 'hide', f: 0, x: 1450, w: 46, h: 108 },
      { key: 'bagagerie', kind: 'cache', variant: 'valise', label: 'Bagages abandonnés', f: 0, x: 1700, w: 62, h: 36, loot: { livres: 1, bijoux: 1, cafe: 1 } },
      // Cuisines
      { key: 'cave_bar', kind: 'cache', variant: 'etagere', label: 'Réserve du bar', f: 1, x: 700, w: 70, h: 104, loot: { alcool: 2, sucre: 1, conserve: 1 } },
      { key: 'porte_cuisines', kind: 'door', f: 1, x: 1000, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'chambre_froide', kind: 'cache', variant: 'armoire', label: 'Chambre froide', f: 1, x: 1250, w: 58, h: 112, owner: 'armee', loot: { conserve: 4, viande: 2, eau: 3 } },
      { key: 'soldat_cuisine', kind: 'guard', type: 'soldat', f: 1, x: 1750, facing: -1, attitude: 'neutral', group: 'hotel', sleep: true },
      // Étage des officiers
      { key: 'sentinelle_hotel', kind: 'guard', type: 'soldat', f: 2, x: 700, facing: 1, attitude: 'neutral', group: 'hotel', patrol: [480, 1150] },
      { key: 'recoin_couloir', kind: 'hide', f: 2, x: 1150, w: 46, h: 108 },
      { key: 'porte_12', kind: 'door', label: 'Porte de la chambre 12', f: 2, x: 1200, w: 30, h: 112, tools: ['passe_partout', 'pied_de_biche'] },
      { key: 'lit_12', kind: 'bed', f: 2, x: 1290, metal: true, deco: true },
      { key: 'chambre_12', kind: 'cache', variant: 'armoire', label: 'Chambre 12', f: 2, x: 1440, w: 58, h: 112, owner: 'armee', loot: { munitions: 8, medicaments: 1, cigarettes: 2, pieces_armes: 1 } },
      { key: 'soldat_etage', kind: 'guard', type: 'soldat', f: 2, x: 1700, facing: -1, attitude: 'neutral', group: 'hotel', patrol: [1620, 1840] },
      // Suites
      { key: 'suite_coffre', kind: 'cache', variant: 'coffre', label: 'Coffre de la suite', f: 3, x: 520, w: 60, h: 48, owner: 'armee', locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 3, montre: 1, medicaments: 2 } },
      { key: 'lit_officier', kind: 'bed', f: 3, x: 740, deco: true },
      { key: 'officier', kind: 'guard', type: 'intendant', name: 'Lieutenant Kerr', f: 3, x: 800, facing: 1, attitude: 'neutral', group: 'hotel', sleep: true },
      // La suite du fond, entre deux portes : des voyous y séquestrent le directeur de l'hôtel
      { key: 'porte_ravisseurs', kind: 'door', label: 'Porte de la suite du fond (scellée)', f: 3, x: 1350, w: 30, h: 112, tools: ['passe_partout', 'pied_de_biche'] },
      { key: 'porte_suite', kind: 'door', label: 'Porte de la suite', f: 3, x: 1000, w: 30, h: 112, tools: ['passe_partout', 'pied_de_biche'] },
      { key: 'suite_bar', kind: 'cache', variant: 'etagere', label: 'Minibar', f: 3, x: 1150, w: 70, h: 104, owner: 'bande', loot: { alcool: 2, cafe: 2, cigarettes: 3 } },
      { key: 'voyou_a', kind: 'guard', type: 'bandit_arme', f: 3, x: 1070, facing: 1, attitude: 'hostile', group: 'voyous', patrol: [1035, 1110] },
      { key: 'voyou_b', kind: 'guard', type: 'bandit', f: 3, x: 1250, facing: -1, attitude: 'hostile', group: 'voyous', patrol: [1210, 1320] },
      { key: 'voyou_c', kind: 'guard', type: 'bandit_arme', f: 3, x: 1140, facing: -1, attitude: 'hostile', group: 'voyous', patrol: [1115, 1195] },
      { key: 'voyou_d', kind: 'guard', type: 'bandit', f: 3, x: 1190, facing: 1, attitude: 'hostile', group: 'voyous', sleep: true },
      { key: 'gabriel', kind: 'npc', npc: 'gabriel', f: 3, x: 1300, w: 50, h: 70, facing: -1 },
      { key: 'recoin_suite', kind: 'hide', f: 3, x: 1450, w: 46, h: 108 },
      // Toit-terrasse : l'antenne de l'armée
      { key: 'caisse_antenne', kind: 'cache', variant: 'caisse_mil', label: 'Caisse du poste radio', f: 4, x: 1560, w: 90, h: 50, loot: { pieces_elec: 2, composants: 1 } }
    ]
  });

  // ============================================================ Supermarché pillé (bandits)
  // Tout en largeur : le parking, la grande surface aux gondoles à moitié
  // vidées, la réserve où la bande garde un garçon ligoté, le bureau du chef
  // au-dessus, la chambre froide en bas. Par l'échelle de secours on gagne le
  // toit : la verrière crevée redescend dans les rayons, et au bout, une
  // échelle mène au quai de livraison et à la porte de la réserve.
  C.MAPS.supermarche = keepNpcs('supermarche', {
    theme: { dirt: 0.42 },
    world: { W: 2860, H: 1010, left: 40, right: 2820, ground: G, walkMin: 60, walkMax: 2800, view: 1500 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Parking, magasin et quai', y: G, ceil: 470, x0: 60, x1: 2800, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 600, out: true }, { x0: 600, x1: 2000, tex: 'tiles' }, { x0: 2000, x1: 2600, tex: 'concrete' }, { x0: 2600, x1: 2800, out: true, tex: 'concrete' }] },
      { name: 'Chambre froide', y: 985, ceil: 848, x0: 2012, x1: 2588, thick: 25, tex: 'tiles' },
      { name: 'Bureau du gérant', y: 640, ceil: 484, x0: 2012, x1: 2588, tex: 'planks' },
      { name: 'Toit', y: 456, ceil: 200, x0: 575, x1: 2625, out: true, noSlab: true }
    ],
    rooms: [
      R(600, 2000, 470, G, 'paintedConcrete', { tone: '#8e8b83', wainscot: { h: 40, tone: '#7a776f', grid: 20 }, tubes: [760, 1010, 1260, 1510, 1760],
        shelves: [{ x0: 1180, x1: 1330, h: 150, label: 'BOISSONS' }, { x0: 1720, x1: 1900, h: 120, label: 'SURGELÉS' }],
        signs: [{ t: 'PROMOTIONS', x: 660, y: 560, size: 26 }, { t: 'ILS REVIENDRONT', x: 1500, y: 540, font: '"Special Elite", monospace', size: 18, color: 'rgba(196,70,58,0.5)' }],
        posters: [{ x: 1950, y: 640, t: '-30 %\nSUR TOUT', rot: -0.05 }] }),
      R(2000, 2600, 656, G, 'concrete', { tone: '#6d6a63', tubes: [2300], racks: [{ x0: 2120, x1: 2560, h: 150, levels: 2 }] }),
      R(2000, 2600, 484, 640, 'paintedConcrete', { tone: '#7f7b72', frames: 1, bulbs: [2300], posters: [{ x: 2150, y: 540, t: 'PLANNING\nÉQUIPES' }] }),
      R(2000, 2600, 848, 985, 'tiles', { tone: '#77766f', wainscot: { h: 137, tone: '#85847c', grid: 16 }, border: true })
    ],
    shells: [
      { x0: 600, x1: 2600, top: 470, bottom: 985, wall: 'factoryBrick', roof: 'flat', sign: { t: 'SUPERMARCHÉ', x: 1300, y: 376, missing: [8] },
        gaps: { left: [{ y0: 700, y1: G, shutter: 40 }], right: [{ y0: 700, y1: G, shutter: 36 }] } }
    ],
    things: [
      { kind: 'car', f: 0, x: 240, burnt: true },
      { kind: 'car', f: 0, x: 440, color: '#5f5a50', door: true },
      { kind: 'truck', f: 0, x: 2760, flip: true, back: true, s: 0.8 }
    ],
    lights: [{ kind: 'brasero', x: 2250, y: 790, r: 220 }, { kind: 'candle', x: 2400, y: 600, r: 90 }, { kind: 'brasero', x: 2250, y: 438, r: 140 }],
    backdrop: { far: 'city', mid: ['towers'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 2060 }, b: { f: 2, x: 2230 }, type: 'metal' },
      { a: { f: 0, x: 2550 }, b: { f: 1, x: 2400 } },
      { a: { f: 2, x: 2040 }, b: { f: 3, x: 2040 }, type: 'ladder' },
      // Échelles de secours (dehors) et verrière crevée
      { a: { f: 0, x: 585 }, b: { f: 3, x: 585 }, type: 'ladder' },
      { a: { f: 0, x: 2615 }, b: { f: 3, x: 2615 }, type: 'ladder' },
      { a: { f: 3, x: 1250 }, b: { f: 0, x: 1250 }, type: 'hole', w: 64 }
    ],
    walls: [{ f: 0, x: 2000 }, { f: 1, x: 2200 }, { f: 0, x: 2600 }],
    windows: [
      { f: 0, x: 760, kind: 'shop', w: 180, h: 110, text: 'SOLDES', broken: true }, { f: 0, x: 1500, kind: 'strip', y: 486, w: 320, h: 36, broken: true },
      { f: 2, x: 2460 }, { f: 1, x: 2300, vent: true }
    ],
    decor: [
      { f: 0, x: 360, p: 'metal_trash_can', h: 34 }, { f: 0, x: 520, p: 'industrial_storage_cart', h: 56 }, { f: 0, x: 1080, p: 'trashbag', h: 30 },
      { f: 0, x: 1340, p: 'cardboard_box_01', h: 28, shade: 0.3 }, { f: 0, x: 1780, p: 'plastic_crate_01', h: 24 }, { f: 0, x: 2470, p: 'hand_truck', h: 60 },
      { f: 0, x: 2700, p: 'plastic_crate_02', h: 22 }, { f: 0, x: 2210, p: 'barrel_stove', h: 44 },
      { f: 1, x: 2150, p: 'russian_food_cans_01', h: 16 }, { f: 1, x: 2330, p: 'wine_bottles_01', h: 20 },
      { f: 3, x: 800, p: 'utility_box_01', h: 60 }, { f: 3, x: 1550, p: 'power_box_01', h: 50 }, { f: 3, x: 2250, p: 'barrel_stove', h: 40 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      // Surface de vente
      { key: 'caisse_enreg', kind: 'cache', variant: 'caisse_mag', label: 'Caisse enregistreuse', f: 0, x: 700, w: 90, h: 48, loot: { cigarettes: 3 } },
      { key: 'rayon1', kind: 'cache', variant: 'gondole', label: 'Rayon des conserves', label2: 'CONSERVES', f: 0, x: 900, w: 110, h: 130, loot: { conserve: 2, sucre: 1 } },
      { key: 'recoin_rayons', kind: 'hide', variant: 'palettes', label: 'Derrière la gondole', f: 0, x: 1030, w: 70, h: 92 },
      { key: 'rayon2', kind: 'cache', variant: 'gondole', label: 'Rayon renversé', label2: 'FRUITS ET LÉGUMES', f: 0, x: 1400, w: 110, h: 110, loot: { legumes: 2, eau: 2, composants: 2 } },
      { key: 'rayon3', kind: 'cache', variant: 'gondole', label: 'Rayon hygiène', label2: 'HYGIÈNE', f: 0, x: 1580, w: 100, h: 130, loot: { bandage: 1, filtre: 1, herbes: 1 } },
      { key: 'guetteur', kind: 'guard', type: 'bandit', f: 0, x: 1700, facing: -1, attitude: 'hostile', group: 'bande', patrol: [1300, 1950] },
      { key: 'rayon4', kind: 'cache', variant: 'gondole', label: 'Rayon confiserie', label2: 'CONFISERIE', f: 0, x: 1840, w: 100, h: 110, loot: { sucre: 2, cafe: 1 } },
      // Réserve : le garçon ligoté et son geôlier
      { key: 'geolier', kind: 'guard', type: 'geolier', f: 0, x: 2300, facing: 1, attitude: 'hostile', group: 'geolier', patrol: [2120, 2480] },
      { key: 'lukas', kind: 'npc', npc: 'lukas', f: 0, x: 2420, w: 50, h: 70, facing: -1 },
      { key: 'porte_quai', kind: 'door', label: 'Porte du quai', f: 0, x: 2600, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      // Chambre froide
      { key: 'chambre_froide', kind: 'cache', variant: 'armoire', label: 'Chambre froide', f: 1, x: 2100, w: 58, h: 112, loot: { conserve: 4, cafe: 2, tabac: 3 } },
      { key: 'porte_froide', kind: 'door', f: 1, x: 2200, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'matelas_bandit', kind: 'bed', f: 1, x: 2300, deco: true },
      { key: 'dormeur', kind: 'guard', type: 'bandit', f: 1, x: 2300, facing: 1, attitude: 'hostile', group: 'bande', sleep: true },
      { key: 'reserve', kind: 'cache', variant: 'caisse', label: 'Réserve', f: 1, x: 2480, w: 78, h: 48, owner: 'bande', loot: { conserve: 4, cafe: 2, sucre: 2 } },
      { key: 'recoin_cave', kind: 'hide', f: 1, x: 2565, w: 40, h: 108 },
      // Bureau du gérant : le chef
      { key: 'bureau', kind: 'cache', variant: 'bureau_metal', label: 'Bureau du gérant', f: 2, x: 2330, w: 110, h: 50, loot: { livres: 2, composants: 2 } },
      { key: 'recoin_bureau', kind: 'hide', f: 2, x: 2440, w: 46, h: 108 },
      { key: 'chef', kind: 'guard', type: 'bandit_arme', f: 2, x: 2300, facing: 1, attitude: 'hostile', group: 'bande', patrol: [2250, 2520] },
      { key: 'butin_bande', kind: 'cache', variant: 'coffre', label: 'Butin de la bande', f: 2, x: 2535, w: 60, h: 48, owner: 'bande', loot: { alcool: 1, cigarettes: 3, conserve: 2, cafe: 1, pieces_armes: 1 } },
      // Toit : cartons, verrière, guetteur au feu
      { key: 'cartons', kind: 'cache', variant: 'caisse', label: 'Cartons', f: 3, x: 900, w: 78, h: 48, loot: { legumes: 2, eau: 2 } },
      { key: 'eboulis', kind: 'rubble', label: 'Tôles effondrées', f: 3, x: 1800, w: 104, h: 60, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'recoin_toit', kind: 'hide', variant: 'bidons', label: 'Derrière les bidons', f: 3, x: 1980, w: 60, h: 70 },
      { key: 'guetteur_toit', kind: 'guard', type: 'bandit_arme', f: 3, x: 2350, facing: -1, attitude: 'hostile', group: 'bande', patrol: [2100, 2560] }
    ]
  });

  // ============================================================ Boulangerie détruite
  // Une boutique de quartier : la vitrine, le comptoir, le fournil et son
  // grand four, séparés par un plafond effondré. Par la ruelle, une porte de
  // service et une pente de gravats jusqu'au logement du boulanger.
  C.MAPS.boulangerie = keepNpcs('boulangerie', {
    theme: { dirt: 0.38 },
    world: { W: 1900, H: 1010, left: 40, right: 1860, ground: G, walkMin: 60, walkMax: 1840, view: 1300 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Rue, boutique et fournil', y: G, ceil: 656, x0: 60, x1: 1840, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 420, out: true }, { x0: 420, x1: 1500, tex: 'tiles' }, { x0: 1500, x1: 1840, out: true, tex: 'rubble' }] },
      { name: 'Réserve', y: 985, ceil: 848, x0: 432, x1: 1488, thick: 25, tex: 'concrete' },
      { name: 'Logement', y: 640, ceil: 476, x0: 432, x1: 1488, tex: 'floor' },
      { name: 'Grenier', y: 460, ceil: 340, x0: 460, x1: 1460, tex: 'planks' }
    ],
    rooms: [
      R(420, 1000, 656, G, 'plaster', { tone: '#8b8374', wainscot: { h: 60, tone: '#8a8378' }, shelves: [{ x0: 640, x1: 900, h: 110, levels: 3, label: 'PAIN' }],
        signs: [{ t: 'BOULANGERIE — PÂTISSERIE', x: 460, y: 690, size: 20 }], clock: { x: 950, y: 690 } }),
      R(1000, 1500, 656, G, 'brick', { tone: '#6f6456', bulbs: [1300] }),
      R(420, 1500, 476, 640, 'wallpaper', { tone: '#877f70', paper: 12, frames: 2, skirt: true }),
      R(420, 1500, 340, 460, 'planks', { tone: '#5f574b', attic: 'both' }),
      R(420, 1500, 848, 985, 'brickPlaster', { tone: '#665f55', vault: 180, spring: 20, border: true })
    ],
    shells: [
      { x0: 420, x1: 1500, top: 340, bottom: 985, wall: 'brickPlaster', roof: 'tiles', roofH: 110, hole: [1150, 1400], chimneys: [1180],
        gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 702, y1: G }, { y0: 520, y1: 640 }] } }
    ],
    things: [
      { kind: 'oven', f: 0, x: 1150, w: 190, h: 140 },
      { kind: 'bench', f: 0, x: 280 },
      { kind: 'barricade', f: 0, x: 1790, w: 90 }
    ],
    lights: [{ kind: 'candle', x: 900, y: 598, r: 100 }],
    backdrop: { far: 'city', mid: ['houses'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 480 }, b: { f: 2, x: 660 } },
      { a: { f: 0, x: 1450 }, b: { f: 1, x: 1320 } },
      { a: { f: 2, x: 1180 }, b: { f: 3, x: 1180 }, type: 'ladder' },
      { a: { f: 0, x: 1720 }, b: { f: 2, x: 1470 }, type: 'debris' }
    ],
    walls: [{ f: 0, x: 1000 }, { f: 0, x: 1500 }, { f: 1, x: 900 }],
    windows: [
      { f: 0, x: 540, kind: 'shop', w: 130, h: 100, text: 'PAIN', broken: true }, { f: 2, x: 620 }, { f: 2, x: 1000, broken: true },
      { f: 3, x: 800, y: 372, w: 44, h: 40 }, { f: 1, x: 700, vent: true }
    ],
    decor: [
      { f: 0, x: 200, p: 'street_lamp_01', h: 200 }, { f: 0, x: 370, p: 'trashbag', h: 30 }, { f: 0, x: 1300, p: 'wooden_crate_02', h: 24 },
      { f: 0, x: 1640, p: 'metal_trash_can', h: 34 }, { f: 1, x: 1000, p: 'compost_bags', h: 26 }, { f: 1, x: 1250, p: 'wooden_barrels_01', h: 30 },
      { f: 2, x: 1400, p: 'wooden_stool_01', h: 28 }, { f: 3, x: 1300, p: 'wooden_ladder', h: 90 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'comptoir', kind: 'cache', variant: 'caisse', label: 'Comptoir', f: 0, x: 800, w: 78, h: 48, loot: { sucre: 1, composants: 1 } },
      { key: 'effondrement', kind: 'rubble', label: 'Plafond effondré', f: 0, x: 1000, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'fournil', kind: 'cache', variant: 'etagere', label: 'Étagères du fournil', f: 0, x: 1330, w: 70, h: 104, loot: { sucre: 2, legumes: 2, eau: 2 } },
      { key: 'porte_arriere', kind: 'door', label: 'Porte de service', f: 0, x: 1500, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'gravats_fournil', kind: 'rubble', label: 'Gravats de la ruelle', f: 0, x: 1610, w: 96, h: 42, work: 90, loot: { bois: 3, carburant: 1 } },
      // Réserve (sous le fournil)
      { key: 'sacs_cave', kind: 'cache', variant: 'etagere', label: 'Conserves du boulanger', f: 1, x: 1150, w: 70, h: 104, loot: { conserve: 2, eau: 1 } },
      { key: 'porte_reserve', kind: 'door', f: 1, x: 900, w: 30, h: 112, tools: ['pied_de_biche'] },
      { key: 'reserve', kind: 'cache', variant: 'caisse', label: 'Réserve de farine et de sucre', f: 1, x: 700, w: 78, h: 48, loot: { sucre: 3, conserve: 3, cafe: 1 } },
      { key: 'gravats_cave', kind: 'rubble', f: 1, x: 530, w: 90, h: 40, work: 60, loot: { bois: 2, composants: 1 } },
      // Logement
      { key: 'logement', kind: 'cache', variant: 'armoire', label: 'Armoire du boulanger', f: 2, x: 820, w: 58, h: 112, loot: { legumes: 1, bois: 1, bandage: 1 } },
      { key: 'lit', kind: 'bed', f: 2, x: 1010, deco: true },
      { key: 'eboulis2', kind: 'rubble', f: 2, x: 1320, w: 96, h: 42, work: 90, loot: { bois: 2, composants: 2 } },
      { key: 'grenier', kind: 'cache', variant: 'valise', label: 'Malle du grenier', f: 3, x: 900, w: 62, h: 36, loot: { sucre: 1, conserve: 1 } }
    ]
  });

  // ============================================================ Garage du Centre
  // Les pompes du parvis, l'atelier haut de plafond (pont élévateur, fosse
  // de vidange), le bureau en mezzanine, le toit, et derrière, la casse où
  // Ray démonte une camionnette.
  C.MAPS.garage = keepNpcs('garage', {
    theme: { dirt: 0.45 },
    world: { W: 2600, H: 1010, left: 40, right: 2560, ground: G, walkMin: 60, walkMax: 2540, view: 1500 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Parvis, atelier et casse', y: G, ceil: 500, x0: 60, x1: 2540, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 700, out: true }, { x0: 700, x1: 1800, tex: 'concrete' }, { x0: 1800, x1: 2540, out: true, tex: 'rubble' }] },
      { name: 'Fosse et sous-sol', y: 985, ceil: 848, x0: 1012, x1: 1588, thick: 25, tex: 'concrete' },
      { name: 'Bureau', y: 640, ceil: 510, x0: 712, x1: 1150, tex: 'planks', support: G, supportGap: 210 },
      { name: 'Toit', y: 486, ceil: 200, x0: 705, x1: 1795, out: true, noSlab: true }
    ],
    rooms: [
      R(700, 1800, 500, G, 'brickPlaster', { tone: '#6f6a60', tubes: [900, 1250, 1600], signs: [{ t: 'VIDANGE — PNEUS — FREINS', x: 1200, y: 590, size: 22 }],
        posters: [{ x: 1700, y: 660, t: 'CALENDRIER\n1991' }] }),
      R(700, 1150, 510, 640, 'paintedConcrete', { tone: '#7d786e', frames: 1, bulbs: [930] }),
      R(1000, 1600, 848, 985, 'concrete', { tone: '#605d57', border: true })
    ],
    shells: [
      { x0: 700, x1: 1800, top: 500, bottom: 985, wall: 'brick', roof: 'flat', sign: { t: 'MAIN STREET GARAGE', x: 1250, y: 410, missing: [11] },
        gaps: { left: [{ y0: 640, y1: G, shutter: 50 }], right: [{ y0: 700, y1: G }] } }
    ],
    fences: [{ f: 0, x0: 1820, x1: 2530, h: 100 }],
    things: [
      { kind: 'pumps', f: 0, x: 400 },
      { kind: 'car', f: 0, x: 600, burnt: true, s: 0.9 },
      { kind: 'lift', f: 0, x: 1450 },
      { kind: 'car', f: 0, x: 2000, color: '#5a574e' },
      { kind: 'car', f: 0, x: 2280, burnt: true },
      { kind: 'car', f: 0, x: 2290, burnt: true, dy: 46, s: 0.9, flip: true }
    ],
    lights: [{ kind: 'brasero', x: 1900, y: 790, r: 190 }],
    backdrop: { far: 'city', mid: ['chimneys', 'towers'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 1250 }, b: { f: 2, x: 1130 }, type: 'metal' },
      { a: { f: 0, x: 1320 }, b: { f: 1, x: 1320 }, type: 'ladder' },
      { a: { f: 2, x: 740 }, b: { f: 3, x: 740 }, type: 'ladder' }
    ],
    walls: [],
    windows: [
      { f: 0, x: 1000, kind: 'strip', y: 520, w: 180, h: 40, broken: true }, { f: 0, x: 1500, kind: 'strip', y: 520, w: 180, h: 40 },
      { f: 2, x: 1000 }, { f: 1, x: 1450, vent: true }
    ],
    zones: [{ id: 'atelier_ray', f: 0, x0: 1560, x1: 1800, group: 'ray', label: 'L\'atelier de Ray', sign: 'CHASSE GARDÉE', signHostile: 'IL VOUS EN VEUT' }],
    decor: [
      { f: 0, x: 250, p: 'metal_jerrycan', h: 28 }, { f: 0, x: 780, p: 'old_tyre', h: 26 }, { f: 0, x: 1100, p: 'metal_tool_chest', h: 30 },
      { f: 0, x: 1560, p: 'portable_welding_cart', h: 56 }, { f: 0, x: 2150, p: 'old_tyre', h: 24 }, { f: 0, x: 2420, p: 'rusted_wheel_rim_01', h: 26 },
      { f: 1, x: 1200, p: 'metal_jerrycan_green', h: 26 }, { f: 2, x: 1060, p: 'metal_office_desk', h: 40 },
      { f: 3, x: 1000, p: 'old_tyre', h: 22 }, { f: 3, x: 1700, p: 'utility_box_01', h: 56 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'epave1', kind: 'cache', variant: 'epave', label: 'Voiture éventrée', f: 0, x: 900, w: 150, h: 60, loot: { pieces_meca: 2, composants: 3, carburant: 1 } },
      { key: 'recoin_atelier', kind: 'hide', variant: 'bidons', label: 'Derrière les bidons', f: 0, x: 1050, w: 60, h: 70 },
      { key: 'etabli', kind: 'cache', variant: 'etabli', label: 'Établi du mécanicien', f: 0, x: 1170, w: 78, h: 60, loot: { composants: 3, pieces_meca: 1 } },
      { key: 'ray', kind: 'guard', type: 'pilleur', name: 'Ray', f: 0, x: 1700, facing: -1, attitude: 'neutral', group: 'ray', patrol: [1600, 1780] },
      { key: 'epave2', kind: 'cache', variant: 'epave', label: 'Camionnette démontée', f: 0, x: 1690, w: 150, h: 60, owner: 'pilleur', loot: { pieces_meca: 3, carburant: 2, pieces_elec: 1 } },
      // Fosse (par l'échelle)
      { key: 'fosse', kind: 'cache', variant: 'caisse', label: 'Fosse de vidange', f: 1, x: 1460, w: 78, h: 48, loot: { carburant: 1, composants: 2 } },
      { key: 'armoire_meca', kind: 'cache', variant: 'coffre', label: 'Armoire à outils fermée', f: 1, x: 1100, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 3, munitions: 6, pied_de_biche: 1, pieces_armes: 1 } },
      // Bureau
      { key: 'bureau', kind: 'cache', variant: 'armoire', label: 'Bureau du garage', f: 2, x: 830, w: 58, h: 112, loot: { conserve: 1, bois: 2, pieces_elec: 1 } },
      { key: 'recoin2', kind: 'hide', f: 2, x: 910, w: 46, h: 108 },
      { key: 'pneus', kind: 'rubble', label: 'Pile de pneus', f: 2, x: 1000, w: 80, h: 42, work: 60, loot: { composants: 2, bois: 1 } },
      // Toit
      { key: 'eboulis', kind: 'rubble', label: 'Verrière effondrée', f: 3, x: 1250, w: 104, h: 90, block: true, work: 150, loot: { bois: 2, composants: 2 } },
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse', f: 3, x: 1550, w: 78, h: 48, loot: { pieces_meca: 1, composants: 2 } }
    ]
  });

  // ============================================================ Immeuble éventré
  // Quatre étages d'appartements autour d'une cage d'escalier ; une volée
  // s'est effondrée (on grimpe sur les gravats), le dernier étage est ouvert
  // au ciel. Kurt, un pilleur, s'est approprié le 2e.
  C.MAPS.immeuble = keepNpcs('immeuble', {
    theme: { dirt: 0.36 },
    world: { W: 2000, H: 1010, left: 40, right: 1960, ground: G, walkMin: 60, walkMax: 1940, view: 1300 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Rue et rez-de-chaussée', y: G, ceil: 656, x0: 60, x1: 1940, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 400, out: true }, { x0: 400, x1: 1500, tex: 'floor' }, { x0: 1500, x1: 1940, out: true, tex: 'rubble' }] },
      { name: 'Caves', y: 985, ceil: 848, x0: 412, x1: 1488, thick: 25, tex: 'concrete' },
      { name: '1er étage', y: 640, ceil: 476, x0: 412, x1: 1488, tex: 'floor' },
      { name: '2e étage', y: 460, ceil: 296, x0: 412, x1: 1488, tex: 'floor' },
      { name: '3e étage', y: 280, ceil: 116, x0: 412, x1: 1400, tex: 'debris', broken: ['right'] }
    ],
    rooms: [
      R(1300, 1500, 116, G, 'plaster2', { tone: '#6f6a60' }),
      R(400, 1300, 656, G, 'peeling', { tone: '#7e786c', frames: 1, bulbs: [800], posters: [{ x: 1200, y: 720, t: 'AVIS À LA\nPOPULATION' }] }),
      R(400, 800, 476, 640, 'wallpaper', { tone: '#88806f', paper: 12, frames: 2, skirt: true }),
      R(800, 1300, 476, 640, 'wallpaper', { tone: '#7d7a70', paper: 9, frames: 1, skirt: true }),
      R(400, 1300, 296, 460, 'wallpaper', { tone: '#857c6b', paper: 14, skirt: true, breach: [{ x: 620, y: 360, r: 46 }] }),
      R(400, 1300, 116, 280, 'peeling', { tone: '#77726a', breach: [{ x: 1100, y: 180, r: 56 }] }),
      R(400, 1500, 848, 985, 'brickPlaster', { tone: '#665f55', border: true })
    ],
    shells: [
      { x0: 400, x1: 1500, top: 116, bottom: 985, wall: 'brickPlaster', roof: 'ruin',
        gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 116, y1: 290 }] } }
    ],
    things: [
      { kind: 'car', f: 0, x: 220, burnt: true },
      { kind: 'barricade', f: 0, x: 1620, w: 130 },
      { kind: 'crater', f: 0, x: 1800, w: 140 },
      { kind: 'tree', f: 0, x: 1880, h: 220, back: true }
    ],
    lights: [{ kind: 'candle', x: 1000, y: 416, r: 110 }],
    backdrop: { far: 'city', mid: ['towers'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 1460 }, b: { f: 2, x: 1320 } },
      { a: { f: 2, x: 1460 }, b: { f: 3, x: 1320 }, type: 'debris' },
      { a: { f: 3, x: 1460 }, b: { f: 4, x: 1320 } },
      { a: { f: 0, x: 1340 }, b: { f: 1, x: 1200 } }
    ],
    walls: [{ f: 0, x: 1300 }, { f: 2, x: 800 }, { f: 2, x: 1300 }, { f: 3, x: 1300 }],
    windows: [
      { f: 0, x: 560 }, { f: 0, x: 1000, boarded: true }, { f: 2, x: 600 }, { f: 2, x: 1050, broken: true },
      { f: 3, x: 900, broken: true }, { f: 3, x: 1200 }, { f: 4, x: 600, broken: true }, { f: 1, x: 900, vent: true }
    ],
    zones: [{ id: 'appart_kurt', f: 3, x0: 412, x1: 1300, group: 'kurt', label: 'L\'appartement de Kurt', sign: 'CHASSE GARDÉE', signHostile: 'IL VOUS EN VEUT' }],
    decor: [
      { f: 0, x: 330, p: 'trashbag', h: 32 }, { f: 0, x: 1250, p: 'Television_01', h: 28 }, { f: 0, x: 1700, p: 'old_tyre', h: 24 },
      { f: 1, x: 560, p: 'wooden_barrels_01', h: 30 }, { f: 2, x: 1150, p: 'wooden_stool_01', h: 28 }, { f: 2, x: 540, p: 'vintage_oil_lamp', h: 28 },
      { f: 3, x: 1050, p: 'vintage_suitcase', h: 24 }, { f: 4, x: 500, p: 'old_tyre', h: 24 }, { f: 4, x: 1200, p: 'cardboard_box_01', h: 26, shade: 0.3 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'cuisine1', kind: 'cache', variant: 'armoire', label: 'Loge de la concierge', f: 0, x: 520, w: 58, h: 112, loot: { conserve: 2, eau: 2, legumes: 1 } },
      { key: 'fauteuil', kind: 'armchair', f: 0, x: 700, deco: true },
      { key: 'commode', kind: 'furniture', variant: 'commode', f: 0, x: 900, w: 64, h: 60, work: 60, loot: { bois: 3, livres: 1 } },
      { key: 'gravats1', kind: 'rubble', f: 0, x: 1150, w: 96, h: 42, work: 90, loot: { bois: 2, composants: 3 } },
      // Caves
      { key: 'cave_casiers', kind: 'cache', variant: 'etagere', label: 'Casiers de la cave', f: 1, x: 700, w: 70, h: 104, loot: { eau: 2, legumes: 2, filtre: 1 } },
      { key: 'coffre_cave', kind: 'cache', variant: 'coffre', label: 'Coffre-fort d\'un voisin', f: 1, x: 1000, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { conserve: 2, medicaments: 1, bijoux: 1 } },
      // 1er : deux appartements
      { key: 'chambre2', kind: 'cache', variant: 'armoire', label: 'Penderie', f: 2, x: 480, w: 58, h: 112, loot: { bandage: 1, livres: 2, cafe: 1 } },
      { key: 'lit2', kind: 'bed', f: 2, x: 650, deco: true },
      { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1000, w: 70, h: 124, work: 90, loot: { bois: 3, livres: 2 } },
      { key: 'recoin2', kind: 'hide', f: 2, x: 1200, w: 46, h: 108 },
      // 2e : chez Kurt
      { key: 'placard3', kind: 'cache', variant: 'etagere', f: 3, x: 500, w: 70, h: 104, loot: { conserve: 1, bois: 3 } },
      { key: 'butin_kurt', kind: 'cache', variant: 'valise', label: 'Sac de Kurt', f: 3, x: 700, w: 62, h: 36, owner: 'pilleur', loot: { conserve: 1, composants: 2, eau: 1 } },
      { key: 'kurt', kind: 'guard', type: 'pilleur', name: 'Kurt', f: 3, x: 900, facing: -1, attitude: 'neutral', group: 'kurt', patrol: [500, 1250] },
      { key: 'recoin3', kind: 'hide', f: 3, x: 1180, w: 46, h: 108 },
      // 3e, ouvert au ciel
      { key: 'eboulis_haut', kind: 'rubble', label: 'Plafond effondré', f: 4, x: 950, w: 104, h: 118, block: true, work: 120, loot: { bois: 3, composants: 2 } },
      { key: 'appart_haut', kind: 'cache', variant: 'armoire', label: 'Appartement du dernier étage', f: 4, x: 650, w: 58, h: 112, loot: { conserve: 1, livres: 2, bandage: 1 } }
    ]
  });

  // ============================================================ Squat délabré
  // Un vieil immeuble de briques pris par des sans-abri : l'escalier a brûlé
  // (on monte à l'échelle), un trou dans le plancher, un autre vers la cave,
  // le feu de Gus au milieu du rez-de-chaussée, un pigeonnier sur le toit.
  var TAG = function (t, x, y, o) { return ext({ t: t, x: x, y: y, font: '"Special Elite", monospace', size: 22, color: 'rgba(196,70,58,0.55)' }, o || {}); };
  C.MAPS.squat = keepNpcs('squat', {
    theme: { dirt: 0.55 },
    world: { W: 2100, H: 1010, left: 40, right: 2060, ground: G, walkMin: 60, walkMax: 2040, view: 1400 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Terrain vague et rez-de-chaussée', y: G, ceil: 656, x0: 60, x1: 2040, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 500, out: true, tex: 'rubble' }, { x0: 500, x1: 1700, tex: 'debris' }, { x0: 1700, x1: 2040, out: true, tex: 'rubble' }] },
      { name: 'Cave', y: 985, ceil: 848, x0: 512, x1: 1688, thick: 25, tex: 'concrete' },
      { name: '1er étage : dortoir', y: 640, ceil: 476, x0: 512, x1: 1688, tex: 'planks' },
      { name: 'Toit', y: 462, ceil: 200, x0: 505, x1: 1695, out: true, noSlab: true }
    ],
    rooms: [
      R(500, 1700, 656, G, 'brick', { tone: '#5e5850', signs: [TAG('ICI ON PARTAGE', 1180, 700), TAG('PAS DE FLICS', 620, 740, { color: 'rgba(220,214,196,0.45)', size: 18 })] }),
      R(500, 1700, 476, 640, 'peeling', { tone: '#6f695e', breach: [{ x: 820, y: 540, r: 40 }], signs: [TAG('ON TIENDRA', 1300, 520, { size: 20 })] }),
      R(500, 1700, 848, 985, 'brickPlaster', { tone: '#5f5a52', border: true })
    ],
    shells: [
      { x0: 500, x1: 1700, top: 476, bottom: 985, wall: 'factoryBrick', roof: 'flat', gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 702, y1: G }] } }
    ],
    things: [
      { kind: 'tent', f: 0, x: 300, w: 160, h: 90, color: '#5d5a4f' },
      { kind: 'car', f: 0, x: 1880, burnt: true },
      { kind: 'wall', f: 3, x: 560, w: 150, h: 60, tex: 'planks', rails: true }
    ],
    lights: [{ kind: 'brasero', x: 1150, y: 790, r: 220 }, { kind: 'candle', x: 700, y: 600, r: 80 }],
    backdrop: { far: 'city', mid: ['towers', 'chimneys'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 560 }, b: { f: 2, x: 560 }, type: 'ladder' },
      { a: { f: 2, x: 1300 }, b: { f: 0, x: 1300 }, type: 'hole', w: 70 },
      { a: { f: 2, x: 1650 }, b: { f: 3, x: 1650 }, type: 'ladder' },
      { a: { f: 0, x: 900 }, b: { f: 1, x: 900 }, type: 'hole', w: 60 }
    ],
    walls: [],
    windows: [{ f: 0, x: 1450, boarded: true }, { f: 2, x: 1100, broken: true }, { f: 2, x: 1500, boarded: true }, { f: 1, x: 1300, vent: true }],
    zones: [
      { id: 'chez_eux', f: 0, x0: 1000, x1: 1700, group: 'squat', label: 'Le coin du squat', sign: 'CHEZ NOUS', signHostile: 'ILS VOUS EN VEULENT' },
      { id: 'dortoir', f: 2, x0: 1000, x1: 1688, group: 'squat', label: 'Le dortoir', sign: 'CHEZ NOUS', signHostile: 'ILS VOUS EN VEULENT' }
    ],
    decor: [
      { f: 0, x: 440, p: 'metal_trash_can', h: 34 }, { f: 0, x: 1150, p: 'barrel_stove', h: 44 }, { f: 0, x: 1500, p: 'cardboard_box_01', h: 30 },
      { f: 0, x: 1780, p: 'trashbag', h: 30 }, { f: 1, x: 1250, p: 'old_tyre', h: 26 }, { f: 2, x: 880, p: 'cardboard_box_01', h: 30 },
      { f: 3, x: 1000, p: 'metal_jerrycan', h: 28 }, { f: 3, x: 1400, p: 'old_tyre', h: 22 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'detritus', kind: 'rubble', f: 0, x: 700, w: 96, h: 42, work: 60, loot: { bois: 3, composants: 2 } },
      { key: 'recoin_entree', kind: 'hide', f: 0, x: 800, w: 46, h: 108 },
      { key: 'squatteur_feu', kind: 'guard', type: 'squatteur', name: 'Gus', f: 0, x: 1250, facing: -1, attitude: 'neutral', group: 'squat', patrol: [1050, 1500] },
      { key: 'reserve_commune', kind: 'cache', variant: 'caisse', label: 'Réserve commune', f: 0, x: 1600, w: 78, h: 48, owner: 'squat', loot: { conserve: 2, bois: 3, cigarettes: 1 } },
      // Cave (par le trou)
      { key: 'cave_bric', kind: 'cache', variant: 'caisse', label: 'Bric-à-brac', f: 1, x: 680, w: 78, h: 48, loot: { composants: 3, pieces_meca: 1 } },
      { key: 'planches_cave', kind: 'rubble', f: 1, x: 1100, w: 90, h: 40, work: 60, loot: { bois: 2 } },
      { key: 'caisse_cachee', kind: 'cache', variant: 'caisse', label: 'Caisse cachée des squatteurs', f: 1, x: 1450, w: 78, h: 48, owner: 'squat', loot: { conserve: 2, medicaments: 1, munitions: 4 } },
      // Dortoir
      { key: 'grisha', kind: 'npc', npc: 'grisha', f: 2, x: 700, w: 50, h: 70, facing: 1 },
      { key: 'corps_grisha', kind: 'cache', variant: 'linceul', label: 'Corps de Otis', only: 'grisha_dead', f: 2, x: 640, w: 90, h: 24, loot: { tabac: 1, cigarettes: 1 } },
      { key: 'cachette_grisha', kind: 'cache', variant: 'caisse', label: 'Cachette sous le plancher', f: 2, x: 560, w: 70, h: 30, locked: true, tools: [], lockedNote: 'Des planches clouées. Otis sait comment les soulever.', loot: { bijoux: 2, alcool: 2 } },
      { key: 'squatteur_dortoir', kind: 'guard', type: 'squatteur', name: 'Marv', f: 2, x: 1150, facing: 1, attitude: 'neutral', group: 'squat', sleep: true },
      { key: 'matelas', kind: 'cache', variant: 'valise', label: 'Affaires sous un matelas', f: 2, x: 1480, w: 62, h: 36, owner: 'squat', loot: { bandage: 1, tabac: 2, bijoux: 1 } },
      // Toit
      { key: 'pigeonnier', kind: 'cache', variant: 'caisse', label: 'Pigeonnier', f: 3, x: 640, w: 78, h: 48, loot: { viande: 2, bois: 2 } },
      { key: 'eboulis_toit', kind: 'rubble', label: 'Tôles effondrées', f: 3, x: 1000, w: 104, h: 90, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'squatteur_toit', kind: 'guard', type: 'squatteur', name: 'Lou', f: 3, x: 1450, facing: -1, attitude: 'neutral', group: 'squat_toit', patrol: [1250, 1600] }
    ]
  });

  // ============================================================ Chantier
  // Un immeuble resté à l'état de squelette de béton : dalles nues, poteaux,
  // fers en attente, l'échafaudage sur le flanc, la grue figée au-dessus.
  // En bas le parking des fondations (grille soudée), à côté la cabane.
  C.MAPS.chantier = keepNpcs('chantier', {
    theme: { dirt: 0.4 },
    world: { W: 2600, H: 1010, left: 40, right: 2560, ground: G, walkMin: 60, walkMax: 2540, view: 1500 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Chantier', y: G, ceil: 560, x0: 60, x1: 2540, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 900, out: true, tex: 'rubble' }, { x0: 900, x1: 1900, tex: 'concrete' }, { x0: 1900, x1: 2540, out: true, tex: 'rubble' }] },
      { name: 'Fondations', y: 985, ceil: 848, x0: 1012, x1: 1788, thick: 25, tex: 'concrete' },
      { name: '1er niveau', y: 640, ceil: 476, x0: 900, x1: 1900, tex: 'concrete' },
      { name: '2e niveau', y: 460, ceil: 296, x0: 900, x1: 1900, tex: 'concrete' },
      { name: 'Dalle du haut', y: 280, ceil: 100, x0: 900, x1: 1700, tex: 'concrete', out: true, broken: ['right'] },
      { name: 'Échafaudage', y: 460, ceil: 300, x0: 1915, x1: 2160, scaffold: true, support: G }
    ],
    rooms: [
      R(900, 1900, 100, G, 'concrete', { frame: 250, rebar: true }),
      R(1000, 1800, 848, 985, 'concrete', { tone: '#5f5c56', border: true, signs: [{ t: 'PARKING — NIVEAU -1', x: 1200, y: 900, size: 20 }] }),
      R(280, 560, 700, G, 'corrugated2', { tone: '#5d5a52', posters: [{ x: 360, y: 750, t: 'CASQUE\nOBLIGATOIRE' }] })
    ],
    shells: [
      { x0: 280, x1: 560, top: 700, bottom: G, wall: 'corrugated', roof: 'flat', thick: 10, gaps: { right: [{ y0: 712, y1: G }] } }
    ],
    fences: [{ f: 0, x0: 600, x1: 880, h: 110 }],
    things: [
      { kind: 'crane', f: 0, x: 2380, h: 720, arm: 560, back: true, flip: true, load: true, drop: 260 },
      { kind: 'container', f: 0, x: 760, w: 200, h: 100, text: 'BÂTIR 91', color: '#6b5f45' },
      { kind: 'crater', f: 0, x: 2350, w: 150 }
    ],
    lights: [{ kind: 'brasero', x: 640, y: 790, r: 190 }, { kind: 'candle', x: 1750, y: 420, r: 100 }],
    backdrop: { far: 'city', mid: ['towers', 'cranes'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 960 }, b: { f: 2, x: 960 }, type: 'ladder' },
      { a: { f: 2, x: 1850 }, b: { f: 3, x: 1680 }, type: 'metal' },
      { a: { f: 3, x: 1000 }, b: { f: 4, x: 1000 }, type: 'ladder' },
      { a: { f: 0, x: 1850 }, b: { f: 1, x: 1700 } },
      { a: { f: 0, x: 2120 }, b: { f: 5, x: 2120 }, type: 'ladder' },
      { a: { f: 5, x: 1925 }, b: { f: 3, x: 1890 }, type: 'link' }
    ],
    walls: [],
    windows: [],
    zones: [
      { id: 'coin_rick', f: 3, x0: 1300, x1: 1900, group: 'rick', label: 'Le coin de Rick', sign: 'CHASSE GARDÉE', signHostile: 'IL VOUS EN VEUT' },
      { id: 'nid_tireurs', f: 4, x0: 1400, x1: 1700, group: 'tireurs', label: 'Le nid des tireurs', sign: 'ZONE MILITAIRE', signHostile: 'ILS VOUS ONT VU', only: 'team' }
    ],
    decor: [
      { f: 0, x: 200, p: 'street_lamp_01', h: 200 }, { f: 0, x: 1080, p: 'cement_bag', h: 22 }, { f: 0, x: 1650, p: 'wooden_ladder', h: 90 },
      { f: 0, x: 2250, p: 'portable_generator', h: 44 }, { f: 0, x: 2480, p: 'old_tyre', h: 26 }, { f: 1, x: 1400, p: 'old_tyre', h: 26 },
      { f: 2, x: 1300, p: 'cement_bag', h: 22 }, { f: 2, x: 1650, p: 'wooden_barrels_01', h: 30 }, { f: 4, x: 1450, p: 'propane_tank', h: 40 },
      { f: 5, x: 2050, p: 'cement_bag', h: 20 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'cabane', kind: 'cache', variant: 'armoire', label: 'Cabane de chantier', f: 0, x: 470, w: 58, h: 112, loot: { conserve: 1, engrais: 2, carburant: 1 } },
      { key: 'planches', kind: 'rubble', label: 'Tas de planches', f: 0, x: 1150, w: 96, h: 42, work: 60, loot: { bois: 4, composants: 2 } },
      { key: 'outils', kind: 'cache', variant: 'caisse', label: 'Caisse à outils', f: 0, x: 1350, w: 78, h: 48, loot: { pieces_meca: 2, composants: 3 } },
      { key: 'recoin_rdc', kind: 'hide', variant: 'palettes', label: 'Derrière les palettes', f: 0, x: 1550, w: 80, h: 92 },
      // Fondations
      { key: 'gravats_cave', kind: 'rubble', f: 1, x: 1520, w: 90, h: 40, work: 60, loot: { composants: 3, bois: 2 } },
      { key: 'grille', kind: 'grate', f: 1, x: 1300, w: 26, h: 132, tools: ['scie'] },
      { key: 'depot', kind: 'cache', variant: 'coffre', label: 'Dépôt du chef de chantier', f: 1, x: 1120, w: 60, h: 48, loot: { pieces_meca: 4, pieces_elec: 2, carburant: 2 } },
      // 1er niveau
      { key: 'ferraille', kind: 'rubble', label: 'Ferraille', f: 2, x: 1150, w: 90, h: 40, work: 60, loot: { composants: 4, pieces_meca: 1 } },
      { key: 'recoin_etage', kind: 'hide', variant: 'palettes', label: 'Derrière les palettes', f: 2, x: 1450, w: 80, h: 92 },
      // 2e niveau : Rick
      { key: 'rick', kind: 'guard', type: 'pilleur', name: 'Rick', f: 3, x: 1600, facing: -1, attitude: 'neutral', group: 'rick', patrol: [1350, 1850] },
      { key: 'sac_rick', kind: 'cache', variant: 'valise', label: 'Sac de Rick', f: 3, x: 1790, w: 62, h: 36, owner: 'pilleur', loot: { conserve: 1, bois: 2, composants: 2 } },
      // Dalle du haut
      { key: 'palette_toit', kind: 'cache', variant: 'palettes', label: 'Palettes', f: 4, x: 1150, w: 90, h: 92, loot: { bois: 4, composants: 3 } },
      { key: 'eboulis', kind: 'rubble', label: 'Coffrage effondré', f: 4, x: 1350, w: 104, h: 118, block: true, work: 150, loot: { bois: 3, composants: 2 } },
      { key: 'bidons', kind: 'cache', variant: 'bac', label: 'Bidons', f: 4, x: 1560, w: 76, h: 40, loot: { carburant: 1, engrais: 1, conserve: 1 } },
      // Un nid de tireurs, derrière le coffrage effondré : ils surveillent la rue, dos tourné
      { key: 'guetteur_nid', kind: 'guard', type: 'soldat', only: 'team', name: 'Le guetteur', f: 4, x: 1450, facing: 1, attitude: 'neutral', group: 'tireurs', patrol: [1420, 1500] },
      { key: 'tireur_nid', kind: 'guard', type: 'tireur_elite', only: 'team', f: 4, x: 1640, facing: 1, attitude: 'neutral', group: 'tireurs', patrol: [1600, 1670] },
      { key: 'repaire_tireurs', kind: 'cache', variant: 'caisse_mil', label: 'Matériel des tireurs', only: 'team', f: 4, x: 1520, w: 90, h: 50, loot: { munitions: 6, conserve: 2, cigarettes: 2, pieces_armes: 1 } }
    ]
  });

  // ============================================================ Carrefour sous le feu (tireur embusqué)
  // Une large rue entre deux immeubles. Le tireur est posté au 2e de
  // l'immeuble d'en face : le reflet de sa lunette trahit sa fenêtre. Trois
  // façons de traverser : la rue (d'épave en épave), la passerelle piétonne
  // (exposée elle aussi, un panneau publicitaire pour s'abriter), ou le
  // métro, où vivent des réfugiés autour d'une rame abandonnée (un tunnel à
  // dégager). Son nid s'atteint par la passerelle (porte à forcer, on arrive
  // face à lui) ou par l'escalier de derrière (éboulis à dégager, dans son dos).
  C.MAPS.carrefour = keepNpcs('carrefour', {
    theme: { dirt: 0.45 },
    world: { W: 3000, H: 1010, left: 40, right: 2960, ground: G, walkMin: 60, walkMax: 2940, view: 1500 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Carrefour', y: G, ceil: 560, x0: 60, x1: 2928, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 200, out: true }, { x0: 200, x1: 900, tex: 'tiles' }, { x0: 900, x1: 2000, out: true }, { x0: 2000, x1: 2940, tex: 'floor' }] },
      { name: 'Station de métro', y: 985, ceil: 848, x0: 512, x1: 2588, thick: 25, tex: 'tiles' },
      { name: 'Immeuble d\'en face, 1er', y: 640, ceil: 476, x0: 2012, x1: 2928, tex: 'floor' },
      { name: 'Immeuble d\'en face, 2e', y: 460, ceil: 296, x0: 2012, x1: 2928, tex: 'floor' },
      { name: 'Immeuble ouest, 1er', y: 640, ceil: 476, x0: 212, x1: 888, tex: 'floor' },
      { name: 'Immeuble ouest, 2e', y: 460, ceil: 296, x0: 212, x1: 888, tex: 'debris' },
      { name: 'Passerelle', y: 460, ceil: 300, x0: 900, x1: 2000, catwalk: true, support: G, supportGap: 540 }
    ],
    rooms: [
      // Immeuble ouest
      R(200, 900, 656, G, 'peeling', { tone: '#7a746a', bulbs: [500], posters: [{ x: 300, y: 720, t: 'AVIS À LA\nPOPULATION' }] }),
      R(200, 900, 476, 640, 'wallpaper', { tone: '#827a6b', paper: 12, frames: 2, skirt: true, breach: [{ x: 420, y: 540, r: 40 }] }),
      R(200, 900, 296, 460, 'peeling', { tone: '#6f695e', frames: 1 }),
      // Immeuble d'en face
      R(2000, 2940, 656, G, 'plaster2', { tone: '#77726a', bulbs: [2400] }),
      R(2000, 2940, 476, 640, 'wallpaper', { tone: '#827a6b', paper: 12, frames: 2, skirt: true }),
      R(2000, 2300, 296, 460, 'peeling', { tone: '#6f695e' }),
      R(2300, 2940, 296, 460, 'wallpaper', { tone: '#5f5a50', paper: 12, posters: [{ x: 2860, y: 360, t: 'TOUS LES\nTRAÎTRES', rot: 0.06 }] }),
      // Métro
      R(500, 2600, 848, 985, 'tiles', { tone: '#7a7870', wainscot: { h: 137, tone: '#86847c', grid: 14 }, tubes: [800, 1250, 1700, 2150], border: true,
        signs: [{ t: 'MÉTRO — LIGNE 2 — LIBERTY SQUARE', x: 640, y: 880, size: 22 }], posters: [{ x: 2350, y: 900, t: 'PLAN DU\nRÉSEAU' }] })
    ],
    shells: [
      { x0: 200, x1: 900, top: 296, bottom: G, wall: 'brickPlaster', roof: 'ruin', gaps: { left: [{ y0: 690, y1: G }], right: [{ y0: 690, y1: G }, { y0: 300, y1: 460 }] } },
      { x0: 2000, x1: 2940, top: 296, bottom: G, wall: 'brickPlaster', roof: 'ruin', gaps: { left: [{ y0: 702, y1: G }, { y0: 300, y1: 460 }] } }
    ],
    things: [
      { kind: 'kiosk', f: 0, x: 1000, back: true },
      { kind: 'bus', f: 0, x: 1180, back: true },
      { kind: 'crater', f: 0, x: 1320, w: 150 },
      { kind: 'tank', f: 0, x: 1760, back: true, flip: true, s: 0.85 },
      { kind: 'hedgehog', f: 0, x: 1960, n: 1 },
      { kind: 'train', f: 1, x: 1500, w: 520, text: 'LIGNE 2 — TERMINUS' },
      { kind: 'billboard', f: 6, x: 1450, text: 'BUVEZ FRAIS' }
    ],
    lights: [{ kind: 'brasero', x: 1870, y: 790, r: 170 }, { kind: 'brasero', x: 1180, y: 950, r: 200 }, { kind: 'candle', x: 1700, y: 940, r: 110 }],
    backdrop: { far: 'city', mid: ['towers', 'steeples'], near: ['ruins'] },
    exposed: [{ f: 0, x0: 920, x1: 1980, label: 'À découvert', ceil: 560 }, { f: 6, x0: 910, x1: 1990, label: 'À découvert', ceil: 320 }],
    stairs: [
      // Métro : descente dans chaque immeuble
      { a: { f: 0, x: 800 }, b: { f: 1, x: 640 } },
      { a: { f: 0, x: 2700 }, b: { f: 1, x: 2540 } },
      // Immeuble ouest, jusqu'à la passerelle
      { a: { f: 0, x: 320 }, b: { f: 4, x: 480 } },
      { a: { f: 4, x: 820 }, b: { f: 5, x: 660 }, type: 'debris' },
      { a: { f: 5, x: 885 }, b: { f: 6, x: 905 }, type: 'link' },
      { a: { f: 6, x: 1995 }, b: { f: 3, x: 2015 }, type: 'link' },
      // Immeuble d'en face : l'escalier de devant, puis celui de derrière (vers le nid)
      { a: { f: 0, x: 2100 }, b: { f: 2, x: 2260 } },
      { a: { f: 2, x: 2700 }, b: { f: 3, x: 2880 } }
    ],
    walls: [{ f: 3, x: 2300 }],
    windows: [
      { f: 4, x: 600 }, { f: 5, x: 400, broken: true }, { f: 0, x: 600, boarded: true },
      { f: 2, x: 2400, broken: true }, { f: 2, x: 2800 }, { f: 3, x: 2600, broken: true }, { f: 3, x: 2150, boarded: true }, { f: 0, x: 2400, boarded: true }
    ],
    decor: [
      { f: 0, x: 170, p: 'street_lamp_01', h: 210 }, { f: 0, x: 1150, p: 'old_tyre', h: 26 }, { f: 0, x: 1640, p: 'street_lamp_01', h: 200 },
      { f: 0, x: 1870, p: 'barrel_stove', h: 40 }, { f: 0, x: 2500, p: 'trashbag', h: 30 }, { f: 1, x: 1180, p: 'barrel_stove', h: 40 },
      { f: 1, x: 1000, p: 'cardboard_box_01', h: 30, shade: 0.3 }, { f: 1, x: 2200, p: 'trashbag', h: 32 },
      { f: 3, x: 2780, p: 'old_military_crate', h: 28 }, { f: 3, x: 2200, p: 'cardboard_box_01', h: 28, shade: 0.3 }, { f: 4, x: 700, p: 'wooden_stool_01', h: 26 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      // Immeuble ouest
      { key: 'kiosque', kind: 'cache', variant: 'caisse', label: 'Kiosque à journaux', f: 0, x: 560, w: 78, h: 48, loot: { cafe: 1, livres: 2 } },
      { key: 'appart_ouest', kind: 'cache', variant: 'armoire', label: 'Appartement déserté', f: 4, x: 300, w: 58, h: 112, loot: { conserve: 1, bandage: 1, livres: 1 } },
      { key: 'caisse_ouest', kind: 'cache', variant: 'caisse', label: 'Caisse sur le palier', f: 5, x: 400, w: 78, h: 48, loot: { bois: 3, composants: 2 } },
      // La rue
      { key: 'epave_bus', kind: 'cache', variant: 'valise', label: 'Bagages dans l\'autobus', f: 0, x: 1080, w: 62, h: 36, loot: { conserve: 3, medicaments: 1 } },
      { key: 'abri1', kind: 'hide', variant: 'sacs', label: 'Derrière les sacs de sable', f: 0, x: 1420, w: 90, h: 60 },
      { key: 'epave_ambulance', kind: 'cache', variant: 'epave', label: 'Ambulance abandonnée', f: 0, x: 1570, w: 150, h: 60, loot: { medicaments: 2, bandage: 2, pieces_elec: 1 } },
      { key: 'abri2', kind: 'hide', variant: 'voiture', label: 'Derrière le char', f: 0, x: 1740, w: 90, h: 70 },
      { key: 'epave_militaire', kind: 'cache', variant: 'epave', label: 'Jeep militaire', f: 0, x: 1880, w: 150, h: 60, loot: { munitions: 8, carburant: 2, pieces_meca: 2, pieces_armes: 1 } },
      // Passerelle
      { key: 'abri_panneau', kind: 'hide', variant: 'palettes', label: 'Derrière le panneau publicitaire', f: 6, x: 1450, w: 90, h: 92 },
      // Métro : les réfugiés, la rame, le tunnel
      { key: 'metro', kind: 'cache', variant: 'etagere', label: 'Guichet du métro', f: 1, x: 860, w: 70, h: 104, loot: { eau: 2, conserve: 1 } },
      { key: 'zora', kind: 'npc', npc: 'zora', f: 1, x: 1120, w: 50, h: 70, facing: 1 },
      { key: 'reserve_metro', kind: 'cache', variant: 'caisse', label: 'Réserve des réfugiés', f: 1, x: 1300, w: 78, h: 48, owner: 'metro', loot: { eau: 3, conserve: 1, herbes: 1 } },
      { key: 'couchage_rame', kind: 'bed', f: 1, x: 1620, deco: true },
      { key: 'gravats_metro', kind: 'rubble', label: 'Tunnel effondré', f: 1, x: 1950, w: 104, h: 128, block: true, work: 90, loot: { pieces_meca: 3, pieces_elec: 2, composants: 2 } },
      { key: 'epave_cave', kind: 'cache', variant: 'caisse', label: 'Caisses d\'un marchand', f: 1, x: 2250, w: 78, h: 48, loot: { conserve: 2, cafe: 1, carburant: 1 } },
      // Immeuble d'en face
      { key: 'loge_est', kind: 'cache', variant: 'etagere', label: 'Loge du gardien', f: 0, x: 2500, w: 70, h: 104, loot: { eau: 1, conserve: 1 } },
      { key: 'eboulis_haut', kind: 'rubble', f: 2, x: 2450, w: 104, h: 150, block: true, work: 150, loot: { bois: 2, composants: 2 } },
      { key: 'balcon', kind: 'cache', variant: 'armoire', label: 'Appartement du coin', f: 2, x: 2580, w: 58, h: 112, loot: { conserve: 1, pieces_meca: 2 } },
      // Le nid du tireur
      { key: 'porte_nid', kind: 'door', label: 'Porte barricadée', f: 3, x: 2300, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
      { key: 'nid', kind: 'cache', variant: 'caisse_mil', label: 'Affaires du tireur', f: 3, x: 2430, w: 90, h: 50, loot: { conserve: 2, cigarettes: 3, munitions: 6, pieces_armes: 2 } },
      { key: 'tireur', kind: 'guard', type: 'tireur', f: 3, x: 2700, facing: -1, attitude: 'hostile', group: 'tireur' }
    ]
  });

  // ============================================================ Avant-poste militaire (hostile)
  // Une cour barricadée (grillage, hérissons, sacs de sable, tente) devant
  // un bâtiment de béton : poste de garde et infirmerie, chambrée et bureau
  // de l'officier à l'étage, armurerie à la cave, guetteur sur le toit.
  C.MAPS.avant_poste = keepNpcs('avant_poste', {
    theme: { dirt: 0.3, military: true },
    world: { W: 2560, H: 1010, left: 40, right: 2520, ground: G, walkMin: 60, walkMax: 2500, view: 1500 },
    start: { f: 0, x: 100 },
    floors: [
      { name: 'Cour et poste de garde', y: G, ceil: 656, x0: 60, x1: 2500, ground: true, thick: 28,
        segs: [{ x0: 60, x1: 1000, out: true }, { x0: 1000, x1: 2400, tex: 'concrete' }, { x0: 2400, x1: 2500, out: true }] },
      { name: 'Cave', y: 985, ceil: 848, x0: 1012, x1: 2388, thick: 25, tex: 'concrete' },
      { name: 'Étage', y: 640, ceil: 476, x0: 1012, x1: 2388, tex: 'concrete' },
      { name: 'Toit', y: 462, ceil: 200, x0: 1005, x1: 2395, out: true, noSlab: true }
    ],
    rooms: [
      R(1000, 1700, 656, G, 'paintedConcrete', { tone: '#77746b', tubes: [1200, 1500], posters: [{ x: 1120, y: 720, t: 'CONSIGNES\nDE GARDE' }], signs: [{ t: 'POSTE 12', x: 1300, y: 700, size: 26 }] }),
      R(1700, 2400, 656, G, 'paintedConcrete', { tone: '#7c7a72', wainscot: { h: 70, tone: '#8a8981', grid: 16 }, tubes: [2050] }),
      R(1000, 2400, 476, 640, 'precast', { tone: '#6f6c64', bulbs: [1300, 1800, 2200], posters: [{ x: 1600, y: 540, t: 'CARTE DU\nSECTEUR' }] }),
      R(1000, 2400, 848, 985, 'concrete', { tone: '#5e5b55', border: true, tubes: [1400, 2000] })
    ],
    shells: [
      { x0: 1000, x1: 2400, top: 476, bottom: 985, wall: 'precast', roof: 'flat', flag: { x: 2250, kind: 'army', h: 100, torn: true },
        gaps: { left: [{ y0: 702, y1: G }], right: [{ y0: 702, y1: G }] } }
    ],
    fences: [{ f: 0, x0: 160, x1: 960, h: 120 }],
    things: [
      { kind: 'hedgehog', f: 0, x: 230, n: 1 },
      { kind: 'sandwall', f: 3, x: 1160, w: 110, rows: 2 },
      { kind: 'tent', f: 0, x: 820, w: 180, h: 110 },
      { kind: 'truck', f: 0, x: 2440, flip: true, back: true, s: 0.8 }
    ],
    lights: [
      { kind: 'brasero', x: 950, y: 790, r: 190 }, { kind: 'lamp', x: 1350, y: 690, r: 170, a: 0.7 }, { kind: 'lamp', x: 1700, y: 510, r: 170, a: 0.6 },
      { kind: 'searchlight', x: 1100, y: 430, a0: 2.7, spread: 0.3, speed: 0.35, len: 900 }
    ],
    backdrop: { far: 'city', mid: ['chimneys', 'towers'], near: ['ruins'] },
    stairs: [
      { a: { f: 0, x: 1100 }, b: { f: 2, x: 1260 } },
      { a: { f: 0, x: 2340 }, b: { f: 1, x: 2200 } },
      { a: { f: 2, x: 2350 }, b: { f: 3, x: 2350 }, type: 'ladder' }
    ],
    walls: [{ f: 0, x: 1700 }, { f: 1, x: 1500 }],
    windows: [
      { f: 0, x: 1450, boarded: true }, { f: 0, x: 2000 }, { f: 2, x: 1500, broken: true }, { f: 2, x: 2000 },
      { f: 1, x: 1300, vent: true }, { f: 1, x: 1900, vent: true }
    ],
    zones: [],
    decor: [
      { f: 0, x: 440, p: 'ammo_box', h: 16 }, { f: 0, x: 700, p: 'metal_jerrycan_green', h: 26 }, { f: 0, x: 1580, p: 'old_military_crate', h: 30 },
      { f: 1, x: 1350, p: 'ammo_box', h: 16 }, { f: 1, x: 2320, p: 'wooden_barrels_01', h: 30 },
      { f: 2, x: 1800, p: 'vintage_radio_transceiver', h: 22 }, { f: 2, x: 1380, p: 'old_gas_mask', h: 16 },
      { f: 3, x: 1250, p: 'portable_searchlight', h: 36 }, { f: 3, x: 1850, p: 'metal_jerrycan', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', variant: 'portail', f: 0, x: 100, w: 44, h: 104 },
      { key: 'recoin_entree', kind: 'hide', variant: 'bidons', label: 'Derrière les bidons', f: 0, x: 360, w: 60, h: 70 },
      { key: 'sacs', kind: 'sandbags', f: 0, x: 530, w: 90, h: 40, deco: true },
      { key: 'sentinelle', kind: 'guard', type: 'soldat', f: 0, x: 650, facing: 1, attitude: 'hostile', group: 'poste', lookBack: 9 },
      { key: 'caisse_rations', kind: 'cache', variant: 'caisse_mil', label: 'Caisse de rations', f: 0, x: 820, w: 90, h: 50, loot: { conserve: 3, eau: 2 } },
      { key: 'recoin_couloir', kind: 'hide', f: 0, x: 1640, w: 46, h: 108 },
      { key: 'ronde', kind: 'guard', type: 'soldat', f: 0, x: 1850, facing: -1, attitude: 'hostile', group: 'poste', patrol: [1250, 2300] },
      { key: 'infirmerie', kind: 'cache', variant: 'pharmacie', f: 0, x: 2150, w: 60, h: 112, loot: { medicaments: 2, bandage: 3 } },
      // Cave : armurerie
      { key: 'vivres', kind: 'cache', variant: 'etagere', f: 1, x: 2060, w: 70, h: 104, loot: { conserve: 3, sucre: 2, cafe: 1 } },
      { key: 'lit_camp', kind: 'bed', f: 1, x: 1820, metal: true, deco: true },
      { key: 'dormeur', kind: 'guard', type: 'soldat', f: 1, x: 1820, facing: 1, attitude: 'hostile', group: 'poste', sleep: true },
      { key: 'recoin_cave', kind: 'hide', f: 1, x: 1580, w: 46, h: 108 },
      { key: 'armurerie', kind: 'cache', variant: 'coffre', label: 'Coffre de l\'armurerie', f: 1, x: 1200, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { fusil_assaut: 1, munitions: 12, gilet: 1, casque: 1 } },
      // Étage
      { key: 'caisse_etage', kind: 'cache', variant: 'caisse_mil', label: 'Caisse de munitions', f: 2, x: 1450, w: 90, h: 50, loot: { munitions: 6, conserve: 2, pieces_armes: 2 } },
      { key: 'etage', kind: 'guard', type: 'soldat', f: 2, x: 1600, facing: 1, attitude: 'hostile', group: 'poste', patrol: [1350, 1900] },
      { key: 'recoin_etage', kind: 'hide', f: 2, x: 1960, w: 46, h: 108 },
      { key: 'lit_officier', kind: 'bed', f: 2, x: 2100, metal: true, deco: true },
      { key: 'bureau_officier', kind: 'cache', variant: 'coffre', label: 'Coffre de l\'officier', f: 2, x: 2250, w: 60, h: 48, locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 2, cafe: 2, cigarettes: 3, pistolet: 1 } },
      // Toit
      { key: 'recoin_toit', kind: 'hide', variant: 'sacs', label: 'Derrière les sacs de sable', f: 3, x: 1160, w: 90, h: 60 },
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse_mil', f: 3, x: 1400, w: 90, h: 50, loot: { carburant: 2, munitions: 4, pieces_armes: 1 } },
      { key: 'guetteur', kind: 'guard', type: 'soldat', f: 3, x: 1700, facing: -1, attitude: 'hostile', group: 'poste' },
      { key: 'caisse_radio', kind: 'cache', variant: 'caisse_mil', label: 'Caisse du poste radio', f: 3, x: 2050, w: 90, h: 50, loot: { pieces_elec: 3, composants: 3 } }
    ]
  });

  // ============================================================ Gens et histoires
  // D'autres habitants à croiser, et ce que les absents ont laissé : lettres,
  // journaux, carnets (kind 'note' : on les lit ; opens = ce qu'on y apprend),
  // corps sous un drap (cache 'linceul' : on fouille les poches).
  C.NPCS.vesna = {
    name: 'Mme Hart', title: 'Voisine du 1er, seule avec son chat',
    look: { hair: 'bun', build: 0.8, h: 0.88, coat: '#5b5047', pants: '#34302b', coatLen: 0.45, skin: '#b9a693', hairColor: '#d0cac0', female: true, lips: true, top: 'cardigan', shirt: '#7d6f63', glasses: true },
    pose: 'sit',
    greet: ['Vous êtes du 3e ? Non… Entrez, entrez, il fait froid dans l\'escalier.', 'Mon chat, Biscuit, c\'est tout ce qui me reste. Il chasse les rats, lui, au moins.', 'Je ne peux plus descendre. Mes jambes.'],
    need: {
      items: { eau: 2 }, label: 'Lui monter de l\'eau',
      ask: 'De l\'eau… Si vous pouviez me laisser un peu d\'eau. Je n\'ai plus rien depuis mardi.',
      thanks: 'Que Dieu vous garde. Tenez, la broche de mon mari. Elle ne me sert plus, et vous, vous pourrez l\'échanger.',
      reward: { bijoux: 1 }, moral: 7
    },
    after: ['Revenez me voir. On ne parle plus à personne, ici.', 'Biscuit vous aime bien. Il n\'aime personne, d\'habitude.'],
    afterSteal: ['Même vous… Allez-vous-en.']
  };
  C.OWNERS.vesna = {
    text: ' a volé une vieille dame seule dans son appartement.', moral: -10, key: 'stole_old',
    desc: 'Les affaires de Mme Hart.', warn: 'Mme Hart vit seule et ne peut plus descendre. C\'est tout ce qu\'elle a.',
    furn: 'Un meuble de Mme Hart. Le démonter, c\'est la voler.'
  };
  C.NPCS.petra = {
    name: 'Penny', title: 'Fille du boulanger',
    look: { hair: 'shoulder', build: 0.92, h: 0.96, coat: '#6b5f52', pants: '#33302b', coatLen: 0.2, skin: '#b59d86', hairColor: '#5a4332', female: true, lips: true, top: 'cardigan', shirt: '#8b7d6c', scarf: '#8a7a5e' },
    pose: 'stand',
    greet: ['Mon père est mort quand le plafond s\'est effondré. Je n\'ai pas pu le sortir de là.', 'Le four marche encore. Il me manque du bois.'],
    need: {
      items: { bois: 3 }, label: 'Lui donner du bois pour le four',
      ask: 'Donnez-moi du bois, et je rallume le four. Il reste un fond de farine : je vous ferai du pain.',
      thanks: 'Il chauffe… Tenez, pour vous, et gardez la recette de papa. Revenez quand vous voulez.',
      reward: { conserve: 2, sucre: 1 }, moral: 6
    },
    after: ['Ça sent le pain, vous sentez ? Comme avant.', 'Les gens du quartier reviennent un peu. Pour l\'odeur.'],
    afterSteal: ['Vous aussi ? Prenez tout, alors. Tout.']
  };
  C.OWNERS.petra = {
    text: ' a volé la fille du boulanger.', moral: -8, key: 'stole',
    desc: 'Les affaires de Penny.', warn: 'Penny a perdu son père dans l\'effondrement. C\'est tout ce qui lui reste.'
  };
  C.NPCS.nico = {
    name: 'Nico', title: 'Gamin caché dans la fosse',
    look: { hair: 'messy', build: 0.72, h: 0.74, coat: '#5a534a', pants: '#2f2c28', coatLen: 0.05, skin: '#b9a08a', hairColor: '#3b2e24', top: 'hoodie', shirt: '#645b50' },
    pose: 'sit',
    greet: ['Me faites pas de mal ! Je me cache ici depuis que papa est parti chercher de l\'eau.', 'Ray, là-haut, il me donne parfois un peu de pain. Il est pas méchant.'],
    need: {
      items: { conserve: 1 }, label: 'Lui donner à manger',
      ask: 'J\'ai faim… J\'ai trouvé des trucs dans la fosse, des pièces. Je vous les donne, contre à manger.',
      thanks: 'Merci ! Tenez, c\'est tout ce que j\'ai trouvé. Si vous voyez mon papa… il a une veste rouge.',
      reward: { pieces_meca: 2, composants: 1 }, moral: 6
    },
    when: [{ 'if': 'freed:ray', lines: ['Ray est plus là-haut. Il me donnait du pain, des fois… Vous savez où il est ?', 'Il fait plus calme, mais j\'ai peur quand même. Papa n\'est toujours pas revenu.'] }],
    after: ['Papa va revenir. Il l\'a promis.', 'Faites attention en haut. Des fois, y a des hommes avec des fusils qui passent.']
  };

  var NOTE = function (o) { return ext({ kind: 'note', w: 30, h: 20 }, o); };
  var BODY = function (o) { return ext({ kind: 'cache', variant: 'linceul', label: 'Corps sous un drap', w: 90, h: 24 }, o); };
  var EXTRA = {
    maison_abandonnee: [
      NOTE({ key: 'lettre_famille', label: 'Lettre sur la table de nuit', f: 2, x: 1010, title: 'Lettre inachevée',
        text: 'Chère maman,\nNous partons demain à l\'aube, par la route du sud, avec les Turner. Papa ne voulait pas laisser la maison, mais les obus tombent maintenant jusqu\'au marché.\nJ\'ai rangé la valise de grand-mère au grenier, derrière les planches. Si tu reviens avant nous, prends-la.\nNous t\'embrassons fort. Amy.',
        journal: 'Une lettre d\'une famille partie vers le sud. Ils comptaient revenir.' })
    ],
    villa: [
      NOTE({ key: 'journal_industriel', label: 'Journal relié de cuir', book: true, f: 2, x: 1180, title: 'Journal de M. Whitmore',
        text: '12 octobre. J\'ai mis l\'argenterie et le fusil de chasse dans le coffre de la cave. Combinaison : la date de naissance d\'Ellen. 0 – 7 – 1 – 4.\n3 novembre. Les voisins sont partis. Les coups de feu se rapprochent chaque nuit.\n9 novembre. Si quelqu\'un lit ceci, c\'est que je ne suis pas revenu. Prenez soin de la maison.',
        opens: ['coffre_fort'], say: '0-7-1-4… La combinaison du coffre de la cave !', journal: 'Dans le journal de l\'industriel, la combinaison de son coffre-fort.' })
    ],
    hopital: [
      NOTE({ key: 'registre', label: 'Registre des admissions', book: true, f: 3, x: 1000, title: 'Registre des admissions',
        text: 'Mark P., 34 ans. Éclats, jambe gauche. Amputé. Sorti.\nJana S., 7 ans. Brûlures. Décédée.\nInconnu, env. 50 ans. Balle, thorax. Décédé.\nLuka M., 16 ans. Éclats. Sorti.\nInconnue, env. 30 ans. Enceinte. Tireur, carrefour. Décédée.\n… La page continue. L\'écriture devient de plus en plus lâche.',
        journal: 'Le registre de l\'hôpital. Trop de lignes qui finissent par « décédé ».' }),
      BODY({ key: 'corps_morgue1', f: 1, x: 1350, loot: { cigarettes: 1 } }),
      BODY({ key: 'corps_morgue2', f: 1, x: 1560, color: '#a8a08c', loot: { montre: 1 } })
    ],
    ecole: [
      NOTE({ key: 'dessin', label: 'Dessin d\'enfant', wall: true, dy: 100, f: 2, x: 1880, title: 'Dessin d\'enfant',
        text: 'Aux crayons de couleur : une maison, un soleil, quatre personnages qui se tiennent la main. Au-dessus, une écriture appliquée : « Quand la guerre sera finie ».\nLe quatrième personnage a été barré.',
        journal: 'Un dessin d\'enfant. Quatre personnes, dont une barrée.' })
    ],
    supermarche: [
      NOTE({ key: 'liste_bande', label: 'Liste épinglée au mur', wall: true, dy: 100, f: 2, x: 2230, title: 'Liste de la bande',
        text: 'HÔPITAL — pharmacie. Jeudi.\nÉGLISE — trop de monde. Attendre.\nLES WHITAKER — deux vieux, facile.\nLE GAMIN — son père paiera. Sinon…',
        journal: 'La bande prépare d\'autres coups : l\'hôpital, les Whitaker…' })
    ],
    carrefour: [
      BODY({ key: 'corps_rue', label: 'Corps d\'un passant', f: 0, x: 1250, loot: { cigarettes: 1, conserve: 1 } }),
      NOTE({ key: 'carnet_tireur', label: 'Carnet', book: true, f: 3, x: 2560, title: 'Carnet du tireur',
        text: 'Jour 41. Trois aujourd\'hui. Une femme avec un seau d\'eau. Je ne les compte plus comme des gens.\nJour 44. Le lieutenant dit qu\'on tient le carrefour. Le lieutenant ne sort jamais.\nJour 46. Il y avait un enfant. Je n\'ai pas tiré. Personne ne le saura.',
        journal: 'Le carnet du tireur. Je n\'arrive pas à le haïr autant que je voudrais.' })
    ],
    squat: [
      NOTE({ key: 'poeme', label: 'Écrit au charbon sur le mur', wall: true, dy: 110, f: 0, x: 900, title: 'Sur le mur',
        text: 'Au charbon, en grandes lettres : « Ils nous ont pris la ville. Pas les nuits autour du feu. »\nDessous, une dizaine de prénoms. Certains sont entourés.' })
    ],
    eglise: [
      NOTE({ key: 'registre_refugies', label: 'Cahier du père Daniel', book: true, f: 4, x: 1915, title: 'Cahier du père Daniel',
        text: 'Onze noms, avec pour chacun ce qu\'il lui faut : lait pour le bébé de Rosa, sirop pour Lili, une couverture pour le vieux Tommy.\nTrois noms sont barrés d\'une petite croix.' })
    ],
    chantier: [
      NOTE({ key: 'plan_chantier', label: 'Panneau du chantier', wall: true, dy: 110, f: 0, x: 300, title: 'Panneau du chantier',
        text: 'RÉSIDENCE LES TILLEULS — 48 logements. Livraison prévue : printemps 1992.\nPar-dessus, au feutre : « JAMAIS ».' })
    ],
    immeuble: [
      NOTE({ key: 'mot_voisin', label: 'Mot glissé sous la porte', f: 4, x: 1150, title: 'Un mot',
        text: 'À qui trouvera ce mot : Mme Hart, au 1er, ne peut plus descendre. Montez-lui de l\'eau si vous pouvez. Elle a un chat. — Le voisin du 3e.',
        journal: 'Un voisin demande qu\'on monte de l\'eau à Mme Hart, au 1er.' }),
      { key: 'vesna', kind: 'npc', npc: 'vesna', f: 2, x: 555, w: 50, h: 70, facing: 1 }
    ],
    hotel: [
      NOTE({ key: 'livre_or', label: 'Livre d\'or', book: true, f: 0, x: 860, title: 'Livre d\'or de l\'Hôtel Lincoln',
        text: 'Dernière page : « Merci pour ce séjour merveilleux. La chambre donnait sur le fleuve. Nous reviendrons au printemps. — Famille Sanders, 2 mars. »' })
    ],
    maison_mitoyenne: [
      NOTE({ key: 'photo_kowalski', label: 'Photo dans un cadre brisé', wall: true, dy: 96, f: 0, x: 1320, title: 'Une photo',
        text: 'Les Hendricks, devant cette maison, en été. Le père tient une pastèque, les enfants rient. Au dos : « Août. Le plus beau. »' })
    ],
    boulangerie: [
      NOTE({ key: 'recette', label: 'Recette épinglée près du four', wall: true, dy: 110, f: 0, x: 1230, title: 'Recette',
        text: 'Pain de seigle de papa Parker : un kilo de farine, vingt grammes de sel, le levain de la veille. Et de la patience, beaucoup de patience.' }),
      { key: 'petra', kind: 'npc', npc: 'petra', f: 2, x: 900, w: 40, h: 90, facing: 1 }
    ],
    garage: [
      { key: 'nico', kind: 'npc', npc: 'nico', f: 1, x: 1220, w: 40, h: 56, facing: 1 }
    ],
    avant_poste: [
      NOTE({ key: 'ordres', label: 'Ordres affichés', wall: true, dy: 100, f: 2, x: 1480, title: 'Ordre n° 17',
        text: 'Tenir le secteur. Aucun civil ne franchit le point de contrôle. Tirer à vue après le couvre-feu.\nEn marge, au crayon : « Ma fille a sept ans aujourd\'hui. »' })
    ]
  };
  Object.keys(EXTRA).forEach(function (id) { if (C.MAPS[id]) C.MAPS[id].objects = C.MAPS[id].objects.concat(EXTRA[id]); });
  // Les affaires de ceux qu'on croise désormais leur appartiennent
  function own(id, key, owner) { (C.MAPS[id].objects.filter(function (o) { return o.key === key; })[0] || {}).owner = owner; }
  own('immeuble', 'chambre2', 'vesna');
  own('boulangerie', 'logement', 'petra');
})(window.CQR);
