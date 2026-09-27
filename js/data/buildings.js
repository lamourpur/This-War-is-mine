/* =========================================================
   Constructions (stations) et recettes de l'établi
   ========================================================= */
(function (C) {
  'use strict';

  // w/h : taille de l'objet dans le refuge (px monde)
  // small : peut aller sur un petit emplacement
  C.BUILDINGS = {
    workbench: { name: 'Établi', w: 120, h: 70, maxLevel: 3,
      desc: 'Permet de fabriquer outils, meubles et équipements. S\'améliore pour débloquer de nouvelles recettes.' },
    bed:       { name: 'Lit', w: 120, h: 42,
      desc: 'Dormir dans un lit repose bien mieux que dormir par terre.' },
    stove:     { name: 'Poêle de cuisine', w: 70, h: 84, maxLevel: 2,
      upgrades: { 2: { cost: { pieces_meca: 2, composants: 4 }, time: 60, label: 'Poêle amélioré : +1 repas par cuisson' } },
      desc: 'Cuisiner des repas chauds, bien plus nourrissants que la nourriture crue.' },
    heater:    { name: 'Chauffage', w: 70, h: 92, maxLevel: 3,
      upgrades: {
        2: { cost: { pieces_meca: 3, composants: 5 }, time: 90, label: 'Chauffage niv. 2 : plus chaud, brûle moins' },
        3: { cost: { pieces_meca: 3, pieces_elec: 1, composants: 6 }, time: 120, label: 'Chauffage niv. 3 : très efficace' }
      },
      desc: 'Réchauffe tout le refuge. Consomme du bois, des livres ou du carburant.' },
    collector: { name: 'Collecteur d\'eau de pluie', w: 76, h: 96, maxLevel: 2,
      upgrades: { 2: { cost: { filtre: 2, composants: 3 }, time: 60, label: 'Collecteur filtré : double rendement' } },
      desc: 'Récupère l\'eau de pluie et la neige fondue.' },
    rattrap:   { name: 'Piège à rats', w: 54, h: 26, small: true,
      desc: 'Attrape parfois un rat pendant la nuit. De la viande, faute de mieux.' },
    garden:    { name: 'Potager', w: 120, h: 48,
      desc: 'Fait pousser des légumes. Doit être arrosé régulièrement.' },
    herbgarden:{ name: 'Jardin d\'herbes', w: 80, h: 44, small: true,
      desc: 'Fait pousser des herbes médicinales et du tabac.' },
    still:     { name: 'Distillerie', w: 80, h: 92,
      desc: 'Transforme sucre et eau en gnôle, la meilleure monnaie d\'échange.' },
    herbshop:  { name: 'Atelier d\'herbes', w: 96, h: 72,
      desc: 'Prépare remèdes, bandages et cigarettes à partir de plantes.' },
    armchair:  { name: 'Fauteuil', w: 70, h: 72, small: true,
      desc: 'Se reposer, lire. Le seul coin de confort du refuge.' },
    radio:     { name: 'Radio', w: 56, h: 66, small: true,
      desc: 'Les nouvelles de la ville, la météo… et un peu de musique.' },
    guitar:    { name: 'Guitare', w: 40, h: 96, small: true,
      desc: 'Quelqu\'un joue, et pour un moment tout le refuge oublie la guerre. Remonte le moral de ceux qui écoutent.' }
  };

  C.CRAFT_TABS = [
    ['outils', 'Outils & armes'],
    ['mobilier', 'Mobilier & stations'],
    ['divers', 'Divers'],
    ['etabli', 'Établi']
  ];

  // lvl : niveau d'établi requis — time : minutes de jeu
  C.CRAFTS = [
    // ---- Outils & armes
    { id: 'pelle',         tab: 'outils', lvl: 1, cost: { bois: 2, composants: 3 }, time: 60, give: { pelle: 1 } },
    { id: 'pied_de_biche', tab: 'outils', lvl: 1, cost: { pieces_meca: 2 }, time: 60, give: { pied_de_biche: 1 } },
    { id: 'passe_partout', tab: 'outils', lvl: 1, cost: { pieces_meca: 1, composants: 1 }, time: 45, give: { passe_partout: 1 } },
    { id: 'couteau',       tab: 'outils', lvl: 1, cost: { pieces_meca: 1, composants: 2 }, time: 45, give: { couteau: 1 } },
    { id: 'hachette',      tab: 'outils', lvl: 1, cost: { bois: 2, pieces_meca: 2 }, time: 60, give: { hachette: 1 } },
    { id: 'scie',          tab: 'outils', lvl: 2, cost: { pieces_meca: 3, composants: 2 }, time: 90, give: { scie: 1 } },
    { id: 'munitions',     tab: 'outils', lvl: 3, cost: { pieces_meca: 1, composants: 3 }, time: 90, give: { munitions: 5 } },

    // ---- Mobilier & stations
    { id: 'b_bed',        tab: 'mobilier', lvl: 1, cost: { bois: 6, composants: 3 }, time: 90,  build: 'bed' },
    { id: 'b_stove',      tab: 'mobilier', lvl: 1, cost: { pieces_meca: 3, composants: 5 }, time: 120, build: 'stove' },
    { id: 'b_heater',     tab: 'mobilier', lvl: 1, cost: { pieces_meca: 4, composants: 6 }, time: 120, build: 'heater' },
    { id: 'b_collector',  tab: 'mobilier', lvl: 1, cost: { bois: 4, composants: 4 }, time: 90,  build: 'collector' },
    { id: 'b_rattrap',    tab: 'mobilier', lvl: 1, cost: { bois: 3, composants: 2 }, time: 60,  build: 'rattrap' },
    { id: 'b_armchair',   tab: 'mobilier', lvl: 1, cost: { bois: 5, composants: 3 }, time: 60,  build: 'armchair' },
    { id: 'b_garden',     tab: 'mobilier', lvl: 2, cost: { bois: 5, composants: 3, engrais: 2 }, time: 120, build: 'garden' },
    { id: 'b_herbgarden', tab: 'mobilier', lvl: 2, cost: { bois: 3, composants: 2, engrais: 1 }, time: 90, build: 'herbgarden' },
    { id: 'b_still',      tab: 'mobilier', lvl: 2, cost: { pieces_meca: 4, composants: 5, bois: 3 }, time: 150, build: 'still' },
    { id: 'b_herbshop',   tab: 'mobilier', lvl: 2, cost: { bois: 5, composants: 4 }, time: 120, build: 'herbshop' },
    { id: 'b_radio',      tab: 'mobilier', lvl: 2, cost: { pieces_elec: 3, composants: 3 }, time: 120, build: 'radio' },
    { id: 'b_guitar',     tab: 'mobilier', lvl: 2, cost: { bois: 4, composants: 5 }, time: 90, build: 'guitar' },

    // ---- Divers
    { id: 'filtre',  tab: 'divers', lvl: 1, cost: { composants: 3 }, time: 30, give: { filtre: 1 } },
    { id: 'planches',tab: 'divers', lvl: 1, cost: { livres: 3 }, time: 20, give: { bois: 1 }, name: 'Presser des livres en bûchettes' },

    // ---- Améliorations de l'établi
    { id: 'wb2', tab: 'etabli', lvl: 1, cost: { bois: 6, composants: 6, pieces_meca: 3 }, time: 120, upgradeWB: 2 },
    { id: 'wb3', tab: 'etabli', lvl: 2, cost: { composants: 8, pieces_meca: 4, pieces_elec: 2 }, time: 150, upgradeWB: 3 }
  ];

  C.craftName = function (r) {
    if (r.name) return r.name;
    if (r.build) return C.BUILDINGS[r.build].name;
    if (r.upgradeWB) return 'Améliorer l\'établi (niv. ' + r.upgradeWB + ')';
    var id = Object.keys(r.give)[0];
    var n = r.give[id];
    return C.ITEMS[id].name + (n > 1 ? ' ×' + n : '');
  };

  // Recettes des stations (cuisine, distillerie, atelier d'herbes)
  C.STATION_RECIPES = {
    stove: [
      { id: 'soupe',   name: 'Soupe de légumes', cost: { legumes: 2, eau: 1, bois: 1 }, give: { repas: 2 }, time: 45 },
      { id: 'ragout',  name: 'Ragoût',           cost: { viande: 1, legumes: 1, eau: 1, bois: 1 }, give: { repas: 2 }, time: 60 },
      { id: 'grillade',name: 'Viande grillée',   cost: { viande: 2, bois: 1 }, give: { repas: 2 }, time: 40 }
    ],
    herbshop: [
      { id: 'remede',   name: 'Remède aux plantes', cost: { herbes: 3, eau: 1 }, give: { remede: 1 }, time: 60 },
      { id: 'bandage_h',name: 'Bandage aux plantes', cost: { herbes: 2, composants: 1 }, give: { bandage: 1 }, time: 45 },
      { id: 'cigs',     name: 'Rouler des cigarettes', cost: { tabac: 2 }, give: { cigarettes: 3 }, time: 30 }
    ],
    still: [
      { id: 'gnole', name: 'Distiller de la gnôle (6 h)', cost: { sucre: 2, eau: 2 }, give: { alcool: 1 }, time: 20, brew: 360 }
    ]
  };

  // Renforcement de la porte d'entrée
  C.DOOR_UPGRADES = {
    1: { cost: { bois: 4, pieces_meca: 2 }, time: 90, label: 'Barricader la porte (+ défense)' },
    2: { cost: { pieces_meca: 4, composants: 4 }, time: 120, label: 'Blinder la porte (++ défense)' }
  };

  C.BOARD_COST = { bois: 2, composants: 1 };
})(window.CQR);
