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
      loot: { munitions: 4, conserve: 1, cigarettes: 1 },
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
    name: 'Mila', title: 'Jeune femme',
    look: { hair: 'long', build: 0.84, h: 0.92, coat: '#5e554c', pants: '#302d29', coatLen: 0.2, skin: '#b19a86', hairColor: '#3b2a20', lips: true, female: true, top: 'cardigan', shirt: '#7c7166' },
    pose: 'sit',
    greet: ['Aidez-moi… je vous en prie.', 'Il dit qu\'il va me donner à manger si… Je ne veux pas.'],
    rescued: ['Il est parti ? Vraiment parti ?', 'Merci. Je vais rejoindre ma tante, à l\'église Sainte-Anne.'],
    reward: { bijoux: 1, medicaments: 1 }
  };

  C.OWNERS.armee = { text: ' a pris du matériel à l\'armée.', moral: 0, key: null };

  var STAIRS = [
    { a: { f: 1, x: 420 }, b: { f: 2, x: 260 } },
    { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
    { a: { f: 2, x: 1200 }, b: { f: 3, x: 1360 } }
  ];

  // ------------------------------------------------------------ Entrepôt du port (soldats neutres)
  C.MAPS.entrepot = {
    theme: { walls: ['plaster2', 'plaster', 'brickPlaster', 'plaster2'], dirt: 0.34, military: true },
    stairs: STAIRS,
    walls: [{ f: 0, x: 800 }, { f: 1, x: 780 }, { f: 2, x: 900 }, { f: 3, x: 620 }],
    windows: [{ f: 1, x: 560, broken: true }, { f: 1, x: 1000 }, { f: 2, x: 460, broken: true }, { f: 2, x: 1060 }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    // Zones gardées : y entrer sous les yeux d'un soldat du groupe = avertissement
    zones: [
      { id: 'depot', f: 1, x0: 790, x1: 1460, group: 'garnison', label: 'Dépôt de l\'armée' },
      { id: 'armurerie', f: 0, x0: 140, x1: 1460, group: 'garnison', label: 'Armurerie' },
      { id: 'chambre', f: 2, x0: 910, x1: 1460, group: 'brute', label: 'Chambre du soldat' }
    ],
    decor: [
      { f: 1, x: 250, p: 'wooden_barrels_01', h: 30 }, { f: 1, x: 1240, p: 'old_military_crate', h: 30 }, { f: 1, x: 900, p: 'metal_jerrycan', h: 28 },
      { f: 0, x: 900, p: 'ammo_box', h: 16 }, { f: 0, x: 240, p: 'metal_tool_chest', h: 26 },
      { f: 2, x: 400, p: 'cardboard_box_01', h: 28, shade: 0.3 }, { f: 2, x: 1400, p: 'wine_bottles_01', h: 20 },
      { f: 3, x: 480, p: 'old_tyre', h: 26 }, { f: 3, x: 1420, p: 'propane_tank', h: 40 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'caisse_quai', kind: 'cache', variant: 'caisse', f: 1, x: 330, w: 78, h: 48, loot: { bois: 4, composants: 3, sucre: 1 } },
      { key: 'ferraille', kind: 'rubble', f: 1, x: 540, w: 90, h: 40, work: 60, loot: { composants: 3, pieces_meca: 1 } },
      { key: 'recoin_quai', kind: 'hide', f: 1, x: 640, w: 46, h: 108 },
      { key: 'maddox', kind: 'guard', type: 'intendant', f: 1, x: 730, facing: -1, attitude: 'neutral', group: 'garnison' },
      { key: 'caisses_armee', kind: 'cache', variant: 'caisse', f: 1, x: 980, w: 78, h: 48, owner: 'armee', loot: { conserve: 3, eau: 2, cafe: 1 } },
      { key: 'recoin_depot', kind: 'hide', f: 1, x: 1090, w: 46, h: 108 },
      { key: 'soldat_depot', kind: 'guard', type: 'soldat', f: 1, x: 1250, facing: -1, attitude: 'neutral', group: 'garnison', patrol: [860, 1400] },
      { key: 'rations', kind: 'cache', variant: 'etagere', f: 1, x: 1330, w: 70, h: 104, owner: 'armee', loot: { conserve: 2, medicaments: 1, bandage: 2 } },
      { key: 'armurerie', kind: 'cache', variant: 'coffre', f: 0, x: 420, w: 60, h: 48, owner: 'armee', locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { fusil: 1, munitions: 8, gilet: 1 } },
      { key: 'lit_camp', kind: 'bed', f: 0, x: 690, metal: true, deco: true },
      { key: 'soldat_cave', kind: 'guard', type: 'soldat', f: 0, x: 690, facing: 1, attitude: 'neutral', group: 'garnison', sleep: true },
      { key: 'caisse_munitions', kind: 'cache', variant: 'caisse', f: 0, x: 1000, w: 78, h: 48, owner: 'armee', loot: { munitions: 6, pieces_elec: 2 } },
      { key: 'recoin_cave', kind: 'hide', f: 0, x: 1130, w: 46, h: 108 },
      { key: 'bureau', kind: 'cache', variant: 'armoire', f: 2, x: 560, w: 58, h: 112, loot: { cafe: 1, tabac: 2, livres: 2 } },
      { key: 'classeur', kind: 'cache', variant: 'etagere', f: 2, x: 760, w: 70, h: 104, loot: { composants: 2, pieces_elec: 1 } },
      { key: 'recoin_bureau', kind: 'hide', f: 2, x: 850, w: 46, h: 108 },
      { key: 'brute', kind: 'guard', type: 'brute', f: 2, x: 1060, facing: 1, attitude: 'neutral', group: 'brute' },
      { key: 'mila', kind: 'npc', npc: 'mila', f: 2, x: 1130, w: 50, h: 70, facing: -1 },
      { key: 'paquetage', kind: 'cache', variant: 'valise', f: 2, x: 1330, w: 62, h: 36, owner: 'armee', loot: { alcool: 1, cigarettes: 3 } },
      { key: 'etagere_toit', kind: 'cache', variant: 'etagere', f: 3, x: 380, w: 70, h: 104, loot: { livres: 2, filtre: 1 } },
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse', f: 3, x: 760, w: 78, h: 48, loot: { carburant: 2, pieces_meca: 2 } },
      { key: 'valise_toit', kind: 'cache', variant: 'valise', f: 3, x: 1100, w: 62, h: 36, loot: { tabac: 2, cigarettes: 2 } }
    ]
  };

  // ------------------------------------------------------------ Avant-poste militaire (soldats hostiles)
  C.MAPS.avant_poste = {
    theme: { walls: ['brickPlaster', 'plaster2', 'plaster', 'brickPlaster'], dirt: 0.3, military: true },
    stairs: STAIRS,
    walls: [{ f: 0, x: 780 }, { f: 1, x: 900 }, { f: 2, x: 680 }, { f: 3, x: 640 }],
    windows: [{ f: 1, x: 560, broken: true }, { f: 1, x: 1040 }, { f: 2, x: 460 }, { f: 2, x: 1040, broken: true }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010 }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
    zones: [],
    decor: [
      { f: 1, x: 470, p: 'old_military_crate', h: 30 }, { f: 1, x: 1400, p: 'metal_jerrycan', h: 28 },
      { f: 0, x: 300, p: 'ammo_box', h: 16 }, { f: 0, x: 1180, p: 'wooden_barrels_01', h: 30 },
      { f: 2, x: 1400, p: 'vintage_radio_transceiver', h: 22 }, { f: 2, x: 900, p: 'old_gas_mask', h: 16 },
      { f: 3, x: 1400, p: 'old_military_crate', h: 30 }, { f: 3, x: 300, p: 'metal_jerrycan', h: 28 }
    ],
    objects: [
      { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
      { key: 'recoin_entree', kind: 'hide', f: 1, x: 300, w: 46, h: 108 },
      { key: 'sacs', kind: 'sandbags', f: 1, x: 530, w: 90, h: 40, deco: true },
      { key: 'sentinelle', kind: 'guard', type: 'soldat', f: 1, x: 690, facing: 1, attitude: 'hostile', group: 'poste', lookBack: 9 },
      { key: 'caisse_rations', kind: 'cache', variant: 'caisse', f: 1, x: 820, w: 78, h: 48, loot: { conserve: 3, eau: 2 } },
      { key: 'recoin_couloir', kind: 'hide', f: 1, x: 1060, w: 46, h: 108 },
      { key: 'ronde', kind: 'guard', type: 'soldat', f: 1, x: 1300, facing: -1, attitude: 'hostile', group: 'poste', patrol: [960, 1400] },
      { key: 'infirmerie', kind: 'cache', variant: 'pharmacie', f: 1, x: 1330, w: 60, h: 112, loot: { medicaments: 2, bandage: 3 } },
      { key: 'armurerie', kind: 'cache', variant: 'coffre', f: 0, x: 560, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { fusil: 1, munitions: 10, gilet: 1 } },
      { key: 'recoin_cave', kind: 'hide', f: 0, x: 840, w: 46, h: 108 },
      { key: 'lit_camp', kind: 'bed', f: 0, x: 1010, metal: true, deco: true },
      { key: 'dormeur', kind: 'guard', type: 'soldat', f: 0, x: 1010, facing: 1, attitude: 'hostile', group: 'poste', sleep: true },
      { key: 'vivres', kind: 'cache', variant: 'etagere', f: 0, x: 1240, w: 70, h: 104, loot: { conserve: 3, sucre: 2, cafe: 1 } },
      { key: 'etage', kind: 'guard', type: 'soldat', f: 2, x: 400, facing: 1, attitude: 'hostile', group: 'poste', patrol: [300, 640] },
      { key: 'recoin_etage', kind: 'hide', f: 2, x: 740, w: 46, h: 108 },
      { key: 'lit_officier', kind: 'bed', f: 2, x: 860, metal: true, deco: true },
      { key: 'bureau_officier', kind: 'cache', variant: 'coffre', f: 2, x: 1030, w: 60, h: 48, locked: true, tools: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 2, cafe: 2, cigarettes: 3, pistolet: 1 } },
      { key: 'caisse_etage', kind: 'cache', variant: 'caisse', f: 2, x: 1310, w: 78, h: 48, loot: { munitions: 6, conserve: 2 } },
      { key: 'caisse_toit', kind: 'cache', variant: 'caisse', f: 3, x: 400, w: 78, h: 48, loot: { carburant: 2, munitions: 4 } },
      { key: 'guetteur', kind: 'guard', type: 'soldat', f: 3, x: 820, facing: -1, attitude: 'hostile', group: 'poste' },
      { key: 'caisse_radio', kind: 'cache', variant: 'caisse', f: 3, x: 1080, w: 78, h: 48, loot: { pieces_elec: 3, composants: 3 } },
      { key: 'recoin_toit', kind: 'hide', f: 3, x: 1230, w: 46, h: 108 }
    ]
  };
})(window.CQR);
