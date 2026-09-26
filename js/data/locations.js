/* =========================================================
   Lieux de pillage (nuit)
   danger   : 0 à 3 — probabilité et violence des rencontres
   residents: aucun | civils | bandits | militaires
   unlock   : jour d'apparition
   loot     : butin disponible (s'épuise au fil des visites)
   stash    : réserve verrouillée, accessible avec l'outil indiqué
   ========================================================= */
(function (C) {
  'use strict';

  C.LOCATIONS = [
    { id: 'maison_abandonnee', name: 'Maison abandonnée', danger: 0, residents: 'aucun', unlock: 1, dist: 1,
      desc: 'Une maison vide deux rues plus loin. Les propriétaires sont partis dès les premiers bombardements.',
      loot: { bois: 8, composants: 8, conserve: 3, legumes: 4, eau: 3, livres: 4, sucre: 1, bandage: 1, pieces_meca: 1, herbes: 2 },
      stash: { tool: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 2, conserve: 2, cafe: 1 } } },

    { id: 'chantier', name: 'Chantier de construction', danger: 1, residents: 'aucun', unlock: 1, dist: 2,
      desc: 'Un immeuble en construction figé par la guerre. Des matériaux partout — et parfois d\'autres pilleurs.',
      loot: { bois: 14, composants: 16, pieces_meca: 4, carburant: 2, engrais: 2, conserve: 1 },
      stash: { tool: ['scie'], loot: { pieces_meca: 4, pieces_elec: 2, carburant: 2 } } },

    { id: 'ecole', name: 'École bombardée', danger: 1, residents: 'civils', unlock: 2, dist: 1,
      desc: 'Des familles se sont réfugiées dans le gymnase. Le reste du bâtiment est ouvert à qui ose y entrer.',
      loot: { livres: 8, bois: 8, composants: 5, eau: 3, legumes: 3, conserve: 1, bandage: 1 },
      residentsLoot: { conserve: 3, medicaments: 1, eau: 3, cigarettes: 2 },
      stash: { tool: ['pied_de_biche'], loot: { conserve: 2, sucre: 2, pieces_elec: 1 } } },

    { id: 'supermarche', name: 'Supermarché pillé', danger: 2, residents: 'bandits', unlock: 3, dist: 2,
      desc: 'Vidé en quelques jours. Il reste des choses dans les réserves, mais une bande armée s\'y est installée.',
      loot: { conserve: 10, legumes: 4, sucre: 4, cafe: 3, eau: 4, cigarettes: 3, alcool: 1, composants: 4 },
      stash: { tool: ['pied_de_biche', 'passe_partout'], loot: { conserve: 4, cafe: 2, tabac: 3 } } },

    { id: 'vieux_couple', name: 'Maison des Whitaker', danger: 0, residents: 'civils', unlock: 4, dist: 1,
      desc: 'Un vieux couple vit encore là, seul. On dit qu\'ils ont des réserves.',
      loot: { bois: 4, composants: 3 },
      residentsLoot: { conserve: 4, medicaments: 2, bijoux: 3, cafe: 2, legumes: 3 },
      moral: 'vieux_couple' },

    { id: 'immeuble', name: 'Immeuble éventré', danger: 1, residents: 'aucun', unlock: 3, dist: 1,
      desc: 'Six étages dont la façade s\'est effondrée. Des appartements ouverts à tous les vents, et quelques pilleurs de passage.',
      loot: { conserve: 4, legumes: 4, eau: 4, bois: 8, composants: 6, livres: 3, cafe: 1, bandage: 1, filtre: 1 },
      stash: { tool: ['pied_de_biche', 'passe_partout'], loot: { conserve: 2, medicaments: 1, bijoux: 1 } } },

    { id: 'boulangerie', name: 'Boulangerie détruite', danger: 1, residents: 'aucun', unlock: 5, dist: 1,
      desc: 'Le four a sauté avec le reste. La réserve à l\'arrière a peut-être résisté.',
      loot: { sucre: 5, conserve: 3, legumes: 3, bois: 6, eau: 3, carburant: 1, composants: 3 },
      stash: { tool: ['pied_de_biche'], loot: { sucre: 3, conserve: 3, cafe: 1 } } },

    { id: 'garage', name: 'Garage automobile', danger: 1, residents: 'aucun', unlock: 4, dist: 2,
      desc: 'Un atelier de mécanique à moitié brûlé. Des moteurs éventrés, des outils rouillés.',
      loot: { pieces_meca: 7, composants: 10, carburant: 4, pieces_elec: 2, bois: 3, conserve: 1 },
      stash: { tool: ['pied_de_biche', 'passe_partout'], loot: { pieces_meca: 3, munitions: 6, pied_de_biche: 1 } } },

    { id: 'hopital', name: 'Hôpital de campagne', danger: 1, residents: 'civils', unlock: 6, dist: 2,
      desc: 'Médecins et bénévoles y soignent qui ils peuvent. Leurs stocks pourraient sauver une vie… la leur ou la vôtre.',
      loot: { bandage: 3, composants: 4, eau: 3, herbes: 3, conserve: 2 },
      residentsLoot: { medicaments: 4, bandage: 4, remede: 2 },
      stash: { tool: ['pied_de_biche', 'passe_partout'], loot: { medicaments: 2, pieces_elec: 1 } } },

    { id: 'eglise', name: 'Église Sainte-Anne', danger: 0, residents: 'civils', unlock: 7, dist: 1,
      desc: 'Le prêtre y héberge des réfugiés. On peut y troquer, ou y voler.',
      loot: { bois: 6, livres: 4, eau: 2, herbes: 3, engrais: 2, legumes: 4 },
      residentsLoot: { conserve: 3, eau: 4, bijoux: 2, alcool: 1 } },

    { id: 'entrepot', name: 'Entrepôt du port', danger: 2, residents: 'bandits', unlock: 8, dist: 3,
      desc: 'Des conteneurs éventrés, des hangars pleins. Une milice de quartier contrôle les lieux.',
      loot: { composants: 12, pieces_meca: 6, pieces_elec: 4, bois: 8, carburant: 3, tabac: 3, sucre: 3, conserve: 4, legumes: 3 },
      stash: { tool: ['scie'], loot: { fusil: 1, munitions: 8, gilet: 1 } } },

    { id: 'villa', name: 'Villa en ruine', danger: 2, residents: 'bandits', unlock: 10, dist: 2,
      desc: 'La demeure d\'un industriel. Les pilleurs se battent entre eux pour ce qui reste.',
      loot: { bijoux: 4, alcool: 2, cafe: 2, livres: 5, conserve: 4, viande: 2, pieces_elec: 2, bois: 6 },
      stash: { tool: ['passe_partout', 'pied_de_biche'], loot: { bijoux: 4, pistolet: 1, munitions: 6 } } },

    { id: 'carrefour', name: 'Carrefour sous le feu', danger: 3, residents: 'aucun', unlock: 12, dist: 2,
      desc: 'Un tireur embusqué surveille le carrefour. Des carcasses de voitures pleines de choses que personne n\'ose aller chercher.',
      loot: { conserve: 6, medicaments: 3, pieces_meca: 5, pieces_elec: 3, munitions: 8, carburant: 3, cafe: 2 } },

    { id: 'avant_poste', name: 'Avant-poste militaire', danger: 3, residents: 'militaires', unlock: 15, dist: 3,
      desc: 'Des soldats tiennent un bâtiment fortifié. Ils ont de tout. Ils tirent à vue.',
      loot: { conserve: 8, medicaments: 3, munitions: 12, bandage: 4, cafe: 3, pieces_elec: 3 },
      stash: { tool: ['passe_partout', 'pied_de_biche'], loot: { fusil: 1, gilet: 1, munitions: 10 } } }
  ];

  C.RESIDENT_LABELS = {
    aucun: 'Inhabité',
    civils: 'Habité (civils)',
    bandits: 'Hostiles (bandits)',
    militaires: 'Hostiles (militaires)'
  };

  C.DANGER_LABELS = ['Calme', 'Risqué', 'Dangereux', 'Mortel'];

  C.LOOT_PRIORITIES = [
    ['equilibre', 'Équilibré', null],
    ['vivres', 'Nourriture & eau', ['eau', 'legumes', 'viande', 'conserve', 'sucre']],
    ['materiaux', 'Matériaux', ['bois', 'composants', 'pieces_meca', 'pieces_elec', 'carburant', 'filtre', 'engrais']],
    ['soins', 'Soins', ['bandage', 'medicaments', 'remede', 'herbes']],
    ['valeur', 'Troc & confort', ['bijoux', 'alcool', 'cafe', 'cigarettes', 'tabac', 'munitions']]
  ];

  C.locationDef = function (id) {
    for (var i = 0; i < C.LOCATIONS.length; i++) if (C.LOCATIONS[i].id === id) return C.LOCATIONS[i];
    return null;
  };
})(window.CQR);
