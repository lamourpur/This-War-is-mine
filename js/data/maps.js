/* =========================================================
   Plans des lieux explorables la nuit
   Même principe que le refuge : 4 niveaux en coupe (0 = cave),
   entrée à gauche du rez-de-chaussée, escaliers, cloisons, meubles.
   Chaque objet a une clé (key) : son état est conservé d'une visite
   à l'autre (fouillé, vidé, déblayé, forcé…).
   owner : les affaires appartiennent aux habitants → les prendre est un vol
   deco  : purement décoratif (aucune action possible)
   ========================================================= */
(function (C) {
  'use strict';

  // Escaliers communs aux maisons (même gabarit que le refuge)
  var STAIRS_HOUSE = [
    { a: { f: 1, x: 420 }, b: { f: 2, x: 260 } },
    { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
    { a: { f: 2, x: 1200 }, b: { f: 3, x: 1360 } }
  ];

  // ------------------------------------------------------------ personnages
  // look : même format que les survivants (dessin en jeu)
  // need : ce dont il a besoin · trade : stock et préférences (likes : multiplicateur de valeur)
  C.NPCS = {
    hank: {
      name: 'Hank', title: 'Vagabond blessé',
      look: { hair: 'short', build: 0.95, h: 1.0, coat: '#4a4238', pants: '#2c2a26', coatLen: 0.18, skin: '#a69580', hairColor: '#5d564c', beard: 'full', brow: 'heavy', top: 'overcoat', shirt: '#5c5448' },
      pose: 'lie',
      greet: ['Qui est là ?… Pitié, ne me faites pas de mal.', 'Ma jambe… un éclat d\'obus. Ça ne veut pas se refermer.'],
      need: {
        items: { bandage: 1 }, label: 'Lui donner un bandage',
        ask: 'Vous auriez un bandage ? Juste un. Je vous en supplie.',
        thanks: 'Merci… Tenez, prenez ça. Je n\'en aurai plus besoin là où je vais. Au grenier, derrière les gravats, il y a encore une valise.',
        reward: { passe_partout: 1 }, moral: 6
      },
      after: ['Ça tient. Grâce à vous.', 'Je partirai demain, vers le sud. Faites attention à vous.']
    },
    arthur: {
      name: 'Arthur Whitaker', title: 'Vieil homme',
      look: { hair: 'short', build: 0.9, h: 0.95, coat: '#58524a', pants: '#34312d', coatLen: 0.05, skin: '#b3a595', hairColor: '#a8a298', brow: 'thin', top: 'cardigan', shirt: '#8a8276', glasses: true },
      pose: 'stand',
      greet: ['Vous êtes du quartier ? On ne voit plus grand monde.', 'Edith est malade. La fièvre ne tombe pas depuis trois jours.', 'Nous n\'avons pas grand-chose… mais on peut échanger.'],
      trade: {
        stock: { conserve: 2, legumes: 2, cafe: 1, livres: 3, tabac: 2, bijoux: 1 },
        likes: { medicaments: 1.8, bandage: 1.5, remede: 1.6, bois: 1.3, conserve: 1.2 },
        say: 'Des médicaments… c\'est tout ce qui compte pour nous.'
      },
      afterSteal: ['Pourquoi ? Nous ne vous avions rien fait…', 'Partez. S\'il vous plaît, partez.']
    },
    edith: {
      name: 'Edith Whitaker', title: 'Vieille femme malade',
      look: { hair: 'shoulder', build: 0.85, h: 0.9, coat: '#6a6158', pants: '#3a3632', coatLen: 0.2, skin: '#b8ab9c', hairColor: '#c9c3b8', smile: false, lips: true, female: true, top: 'cardigan', shirt: '#8c8478' },
      pose: 'lie',
      greet: ['Arthur ? C\'est toi ?…', 'J\'ai si froid…'],
      need: {
        items: { medicaments: 1 }, label: 'Lui donner des médicaments',
        ask: 'Arthur dit que vous êtes gentils… Il nous faudrait des médicaments.',
        thanks: 'Que Dieu vous garde. Arthur, donne-leur la montre de ton père. Il le faut.',
        reward: { montre: 1 }, moral: 9
      },
      after: ['Je me sens un peu mieux. Merci, mon petit.']
    },
    sal: {
      name: 'Sal', title: 'Marchand',
      look: { hair: 'short', build: 1.12, h: 1.0, coat: '#3e3a33', pants: '#2a2825', coatLen: 0.12, skin: '#a08a74', hairColor: '#2a2420', beard: 'stubble', brow: 'heavy', top: 'overcoat', shirt: '#5a5348' },
      pose: 'sit',
      greet: ['Tout s\'échange, l\'ami. Tout.', 'Le père Daniel me laisse installer mon étal ici. En échange, je ne fais pas de prix aux réfugiés.'],
      trade: {
        stock: { conserve: 3, eau: 4, bandage: 2, medicaments: 1, cigarettes: 4, alcool: 1, munitions: 6, pieces_meca: 2, pieces_elec: 1, filtre: 1, couteau: 1, pied_de_biche: 1, cafe: 2, sucre: 2 },
        likes: { bijoux: 1.25, montre: 1.3, diamants: 1.35, alcool: 1.3, cigarettes: 1.2, cafe: 1.2 },
        restock: 3,
        say: 'Les bijoux, la gnôle, le café : voilà ce qui a de la valeur, maintenant.'
      }
    },
    daniel: {
      name: 'Père Daniel', title: 'Prêtre',
      look: { hair: 'short', build: 0.95, h: 1.02, coat: '#1f1e1c', pants: '#1a1918', coatLen: 0.38, skin: '#b0a291', hairColor: '#6d675f', brow: 'thin', top: 'overcoat', shirt: '#d8d2c4' },
      pose: 'stand',
      greet: ['Soyez en paix. Ici, personne ne vous demandera d\'où vous venez.', 'Nous hébergeons onze personnes. Les vivres s\'épuisent.'],
      donate: {
        items: { conserve: 1 }, alt: { legumes: 2 }, label: 'Faire un don de nourriture',
        thanks: 'Ce repas nourrira deux enfants ce soir. Merci.', moral: 5
      }
    },
    rosa: {
      name: 'Rosa', title: 'Réfugiée',
      look: { hair: 'long', build: 0.86, h: 0.93, coat: '#5a5048', pants: '#302d29', coatLen: 0.22, skin: '#9c8570', hairColor: '#1a1612', lips: true, female: true, top: 'cardigan', shirt: '#7a6e62', scarf: '#6a4e40' },
      pose: 'sit',
      greet: ['Lili a de la fièvre depuis hier soir…', 'Le médecin de l\'hôpital n\'a plus rien. Plus rien du tout.'],
      need: {
        items: { medicaments: 1 }, label: 'Lui donner des médicaments',
        ask: 'Vous avez des médicaments ? N\'importe quoi contre la fièvre…',
        thanks: 'Merci… merci. Prenez ma bague. Non, prenez-la. C\'est tout ce que j\'ai.',
        reward: { bijoux: 1 }, moral: 10
      },
      after: ['Elle dort enfin. Je n\'oublierai pas votre visage.']
    },
    lili: {
      name: 'Lili', title: 'Enfant malade',
      look: { hair: 'long', build: 0.6, h: 0.6, coat: '#6f665b', pants: '#3a3632', coatLen: 0.1, skin: '#b4a592', hairColor: '#2a2420', female: true, top: 'cardigan', shirt: '#8c8478' },
      pose: 'lie',
      greet: ['…'], silent: true
    }
  };

  // ------------------------------------------------------------ plans
  C.MAPS = {
    maison_abandonnee: {
      theme: { walls: ['peeling', 'wallpaper', 'plaster2', 'peeling'], dirt: 0.3 },
      stairs: STAIRS_HOUSE,
      walls: [{ f: 0, x: 800 }, { f: 1, x: 700 }, { f: 2, x: 760 }, { f: 3, x: 620 }],
      windows: [{ f: 1, x: 560, broken: true }, { f: 1, x: 1000 }, { f: 2, x: 480 }, { f: 2, x: 1020, broken: true }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010, broken: true }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
      decor: [
        { f: 1, x: 460, p: 'cardboard_box_01', h: 30, shade: 0.3 }, { f: 1, x: 780, p: 'trashbag', h: 32 },
        { f: 0, x: 1150, p: 'wooden_barrels_01', h: 30 }, { f: 0, x: 560, p: 'propane_tank', h: 40 },
        { f: 2, x: 640, p: 'old_tyre', h: 26 }, { f: 3, x: 520, p: 'wooden_ladder', h: 90 }, { f: 3, x: 1400, p: 'Television_01', h: 28 }
      ],
      objects: [
        { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
        { key: 'commode', kind: 'furniture', variant: 'commode', f: 1, x: 300, w: 64, h: 60, work: 60, loot: { bois: 3, composants: 1 } },
        { key: 'cuisine', kind: 'cache', variant: 'armoire', f: 1, x: 620, w: 58, h: 112, loot: { conserve: 2, eau: 2, sucre: 1 } },
        { key: 'poele', kind: 'stove', f: 1, x: 900, deco: true },
        { key: 'placard', kind: 'cache', variant: 'etagere', f: 1, x: 1060, w: 70, h: 104, loot: { legumes: 3, eau: 1, herbes: 2 } },
        { key: 'gravats1', kind: 'rubble', f: 1, x: 1330, w: 96, h: 42, work: 90, loot: { bois: 3, composants: 3 } },
        { key: 'porte_cave', kind: 'door', f: 0, x: 800, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
        { key: 'coffre', kind: 'cache', variant: 'coffre', f: 0, x: 420, w: 60, h: 48, locked: true, tools: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 2, conserve: 2, cafe: 1 } },
        { key: 'gravats_cave', kind: 'rubble', f: 0, x: 620, w: 84, h: 38, work: 60, loot: { composants: 2, pieces_meca: 1 } },
        { key: 'caisse_cave', kind: 'cache', variant: 'caisse', f: 0, x: 1000, w: 78, h: 48, loot: { bois: 4, composants: 4, pieces_meca: 1 } },
        { key: 'chambre', kind: 'cache', variant: 'armoire', f: 2, x: 480, w: 66, h: 112, loot: { livres: 3, bandage: 1, cigarettes: 2 } },
        { key: 'hank', kind: 'npc', npc: 'hank', f: 2, x: 640, w: 90, h: 30, facing: 1 },
        { key: 'lit', kind: 'bed', f: 2, x: 960, deco: true },
        { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1320, w: 70, h: 124, work: 90, loot: { bois: 4, livres: 4 } },
        { key: 'eboulis', kind: 'rubble', f: 3, x: 820, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 2 } },
        { key: 'grenier_g', kind: 'cache', variant: 'etagere', f: 3, x: 400, w: 70, h: 104, loot: { livres: 2, filtre: 1 } },
        { key: 'valise', kind: 'cache', variant: 'valise', f: 3, x: 1080, w: 62, h: 36, loot: { montre: 1, bijoux: 1, cigarettes: 1 } },
        { key: 'caisse_grenier', kind: 'cache', variant: 'caisse', f: 3, x: 1260, w: 78, h: 48, loot: { composants: 3, pieces_elec: 1 } }
      ]
    },

    vieux_couple: {
      theme: { walls: ['wallpaper', 'wallpaper', 'peeling', 'plaster2'], dirt: 0.12 },
      stairs: STAIRS_HOUSE,
      walls: [{ f: 0, x: 820 }, { f: 1, x: 760 }, { f: 2, x: 700 }, { f: 3, x: 640 }],
      windows: [{ f: 1, x: 560 }, { f: 1, x: 1000 }, { f: 2, x: 460 }, { f: 2, x: 1000 }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010 }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
      decor: [
        { f: 1, x: 640, p: 'wooden_stool_01', h: 28 }, { f: 1, x: 1400, p: 'wooden_bucket_01', h: 26 },
        { f: 0, x: 620, p: 'wooden_barrels_01', h: 30 }, { f: 2, x: 1380, p: 'vintage_oil_lamp', h: 30 },
        { f: 3, x: 1400, p: 'vintage_suitcase', h: 26 }, { f: 3, x: 480, p: 'cardboard_box_01', h: 30, shade: 0.3 }
      ],
      objects: [
        { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
        { key: 'fauteuil', kind: 'armchair', f: 1, x: 330, deco: true },
        { key: 'arthur', kind: 'npc', npc: 'arthur', f: 1, x: 520, w: 40, h: 90, facing: -1 },
        { key: 'radio', kind: 'radio', f: 1, x: 880, deco: true },
        { key: 'poele', kind: 'stove', f: 1, x: 1060, deco: true },
        { key: 'cuisine', kind: 'cache', variant: 'armoire', f: 1, x: 1280, w: 58, h: 112, owner: 'whitaker', loot: { conserve: 3, legumes: 3, cafe: 2 } },
        { key: 'debarras', kind: 'cache', variant: 'caisse', f: 0, x: 420, w: 78, h: 48, loot: { bois: 4, composants: 3 } },
        { key: 'conserves', kind: 'cache', variant: 'etagere', f: 0, x: 1020, w: 70, h: 104, owner: 'whitaker', loot: { eau: 4, sucre: 2, conserve: 1 } },
        { key: 'coffret', kind: 'cache', variant: 'coffre', f: 2, x: 450, w: 60, h: 48, owner: 'whitaker', loot: { bijoux: 3, medicaments: 1 } },
        { key: 'lit', kind: 'bed', f: 2, x: 980, deco: true },
        { key: 'edith', kind: 'npc', npc: 'edith', f: 2, x: 980, w: 90, h: 44, facing: 1, onBed: true },
        { key: 'biblio', kind: 'furniture', variant: 'bibliotheque', f: 2, x: 1320, w: 70, h: 124, work: 90, owner: 'whitaker', loot: { bois: 4, livres: 5 } },
        { key: 'gravats', kind: 'rubble', f: 3, x: 880, w: 96, h: 42, work: 90, loot: { bois: 2, composants: 2 } },
        { key: 'malle', kind: 'cache', variant: 'valise', f: 3, x: 1200, w: 62, h: 36, loot: { livres: 2, tabac: 1 } }
      ]
    },

    eglise: {
      theme: { walls: ['plaster', 'plaster2', 'plaster2', 'plaster'], dirt: 0.2, church: true },
      stairs: [
        { a: { f: 1, x: 1180 }, b: { f: 0, x: 1340 } },
        { a: { f: 1, x: 1250 }, b: { f: 2, x: 1090 } },
        { a: { f: 2, x: 260 }, b: { f: 3, x: 420 } }
      ],
      walls: [{ f: 0, x: 800 }, { f: 1, x: 1150 }, { f: 2, x: 700 }, { f: 3, x: 620 }],
      windows: [{ f: 1, x: 560, tall: true }, { f: 1, x: 820, tall: true }, { f: 2, x: 460, tall: true }, { f: 2, x: 1000 }, { f: 3, x: 330, broken: true }, { f: 3, x: 1010 }, { f: 0, x: 420, vent: true }, { f: 0, x: 1020, vent: true }],
      decor: [
        { f: 1, x: 250, p: 'wooden_crate_02', h: 24 }, { f: 1, x: 1400, p: 'wooden_bucket_01', h: 24 },
        { f: 2, x: 640, p: 'plastic_bottle_gallon', h: 20 }, { f: 2, x: 380, p: 'cardboard_box_01', h: 28, shade: 0.3 },
        { f: 0, x: 560, p: 'wooden_barrels_01', h: 30 }, { f: 3, x: 1400, p: 'wooden_ladder', h: 90 }
      ],
      objects: [
        { key: 'exit', kind: 'exit', f: 1, x: 175, w: 44, h: 104 },
        { key: 'sal', kind: 'npc', npc: 'sal', f: 1, x: 330, w: 50, h: 70, facing: 1 },
        { key: 'banc1', kind: 'pew', f: 1, x: 520, w: 110, h: 40, deco: true },
        { key: 'banc2', kind: 'pew', f: 1, x: 680, w: 110, h: 40, deco: true },
        { key: 'banc3', kind: 'pew', f: 1, x: 840, w: 110, h: 40, deco: true },
        { key: 'autel', kind: 'altar', f: 1, x: 1000, w: 100, h: 60, deco: true },
        { key: 'daniel', kind: 'npc', npc: 'daniel', f: 1, x: 1080, w: 40, h: 90, facing: -1 },
        { key: 'sacristie', kind: 'cache', variant: 'armoire', f: 1, x: 1330, w: 58, h: 112, owner: 'eglise', loot: { conserve: 3, eau: 4, alcool: 1 } },
        { key: 'porte_crypte', kind: 'door', f: 0, x: 800, w: 30, h: 112, tools: ['pied_de_biche', 'passe_partout'] },
        { key: 'tronc', kind: 'cache', variant: 'coffre', f: 0, x: 420, w: 60, h: 48, owner: 'eglise', loot: { bijoux: 2, conserve: 2 } },
        { key: 'crypte', kind: 'cache', variant: 'caisse', f: 0, x: 1060, w: 78, h: 48, loot: { bois: 3, engrais: 2, composants: 2 } },
        { key: 'rosa', kind: 'npc', npc: 'rosa', f: 2, x: 520, w: 50, h: 70, facing: 1 },
        { key: 'lili', kind: 'npc', npc: 'lili', f: 2, x: 600, w: 60, h: 24, facing: -1 },
        { key: 'bibliotheque', kind: 'cache', variant: 'etagere', f: 2, x: 920, w: 70, h: 104, loot: { livres: 4, herbes: 2 } },
        { key: 'gravats_clocher', kind: 'rubble', f: 3, x: 820, w: 104, h: 150, block: true, work: 150, loot: { bois: 3, composants: 3 } },
        { key: 'caisse_clocher', kind: 'cache', variant: 'caisse', f: 3, x: 330, w: 78, h: 48, loot: { bois: 3, composants: 2 } },
        { key: 'cachette', kind: 'cache', variant: 'valise', f: 3, x: 1180, w: 62, h: 36, loot: { diamants: 1, cigarettes: 2 } }
      ]
    }
  };

  // Lieux jouables : ceux qui ont un plan
  C.isPlayableLocation = function (id) { return !!C.MAPS[id]; };
})(window.CQR);
