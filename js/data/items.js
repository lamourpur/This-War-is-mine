/* =========================================================
   Objets du jeu
   w  : encombrement (unités de sac lors du pillage)
   v  : valeur de troc de base
   cat: catégorie d'affichage
   ========================================================= */
(function (C) {
  'use strict';

  C.ITEM_CATS = [
    ['vivres', 'Vivres'],
    ['materiaux', 'Matériaux'],
    ['soins', 'Soins'],
    ['confort', 'Confort'],
    ['outils', 'Outils'],
    ['armes', 'Armes'],
    ['valeur', 'Objets de valeur']
  ];

  // Taille de pile dans une case du sac (comme dans This War of Mine).
  // Outils, armes et gilet : une case chacun.
  C.STACK = {
    eau: 5, legumes: 5, viande: 3, conserve: 3, repas: 3, sucre: 5,
    bois: 5, composants: 10, pieces_meca: 5, pieces_elec: 5, carburant: 3, filtre: 3, engrais: 5, herbes: 10, tabac: 5, livres: 5,
    bandage: 5, medicaments: 5, remede: 5,
    cafe: 5, cigarettes: 10, alcool: 3,
    munitions: 20, bijoux: 10, montre: 5, diamants: 5, pieces_armes: 5
  };
  // Usure : nombre d'utilisations avant qu'un outil casse (Game.wear)
  C.WEAR_MAX = { pied_de_biche: 12, passe_partout: 6, scie: 7, pelle: 16, hachette: 26, couteau: 26 };
  C.stackOf = function (id) {
    if (C.STACK[id]) return C.STACK[id];
    var it = C.ITEMS[id];
    return it && (it.tool || it.weapon || it.armor || it.cat === 'outils') ? 1 : 5;
  };

  C.ITEMS = {
    // --- Vivres
    eau:        { name: 'Eau',            cat: 'vivres', w: 1, v: 4,  ico: '≈', desc: 'Eau potable. Indispensable pour cuisiner, distiller et fabriquer des remèdes.' },
    legumes:    { name: 'Légumes',        cat: 'vivres', w: 1, v: 6,  ico: '♣', desc: 'Légumes frais ou flétris. Se mangent crus, mais nourrissent mieux cuisinés.' },
    viande:     { name: 'Viande crue',    cat: 'vivres', w: 1, v: 7,  ico: '◖', desc: 'Viande crue. La manger telle quelle rend souvent malade.' },
    conserve:   { name: 'Conserve',       cat: 'vivres', w: 1, v: 12, ico: '▣', desc: 'Nourriture en boîte. Se conserve et nourrit correctement.' },
    repas:      { name: 'Repas chaud',    cat: 'vivres', w: 1, v: 9,  ico: '◉', desc: 'Un repas cuisiné. Nourrissant et réconfortant.' },
    sucre:      { name: 'Sucre',          cat: 'vivres', w: 1, v: 5,  ico: '⁂', desc: 'Sert surtout à distiller de l\'alcool.' },

    // --- Matériaux
    bois:       { name: 'Bois',           cat: 'materiaux', w: 1, v: 2,  ico: '╪', desc: 'Planches et morceaux de meubles. Construction et combustible.' },
    composants: { name: 'Composants',     cat: 'materiaux', w: 1, v: 3,  ico: '✣', desc: 'Vis, clous, tuyaux, bouts de métal. Base de presque toutes les fabrications.' },
    pieces_meca:{ name: 'Pièces mécaniques', cat: 'materiaux', w: 1, v: 9, ico: '⚙', desc: 'Engrenages, ressorts, roulements. Rares et précieux.' },
    pieces_elec:{ name: 'Pièces électroniques', cat: 'materiaux', w: 1, v: 11, ico: '⌁', desc: 'Circuits, fils, transistors. Nécessaires pour les appareils.' },
    pieces_armes: { name: 'Pièces d\'armes', cat: 'materiaux', w: 1, v: 10, ico: '⚙', desc: 'Culasses, ressorts, canons, percuteurs… De quoi réparer ou assembler une arme à l\'atelier d\'armurier.' },
    carburant:  { name: 'Carburant',      cat: 'materiaux', w: 1, v: 8,  ico: '▮', desc: 'Brûle longtemps dans le chauffage.' },
    filtre:     { name: 'Filtre',         cat: 'materiaux', w: 1, v: 6,  ico: '◎', desc: 'Filtre à eau. Améliore le collecteur de pluie.' },
    engrais:    { name: 'Engrais',        cat: 'materiaux', w: 1, v: 5,  ico: '⋰', desc: 'Nécessaire pour installer un potager ou un jardin d\'herbes.' },
    herbes:     { name: 'Herbes',         cat: 'materiaux', w: 1, v: 3,  ico: '❦', desc: 'Plantes médicinales et tabac sauvage.' },
    tabac:      { name: 'Tabac',          cat: 'materiaux', w: 1, v: 6,  ico: '≋', desc: 'Feuilles de tabac séchées. À rouler en cigarettes.' },
    livres:     { name: 'Livres',         cat: 'confort',   w: 1, v: 2,  ico: '▥', desc: 'Pour lire au fauteuil… ou pour brûler quand le froid mord.' },

    // --- Soins
    bandage:    { name: 'Bandage',        cat: 'soins', w: 1, v: 10, ico: '✚', desc: 'Soigne les blessures.' },
    medicaments:{ name: 'Médicaments',    cat: 'soins', w: 1, v: 18, ico: '⊕', desc: 'Soigne efficacement la maladie.' },
    remede:     { name: 'Remède aux plantes', cat: 'soins', w: 1, v: 9, ico: '⊗', desc: 'Remède artisanal. Moins efficace que les vrais médicaments.' },

    // --- Confort
    cafe:       { name: 'Café',           cat: 'confort', w: 1, v: 8,  ico: '∪', desc: 'Réduit la fatigue et remonte un peu le moral.' },
    cigarettes: { name: 'Cigarettes',     cat: 'confort', w: 1, v: 7,  ico: '⌇', desc: 'Calme les nerfs. Monnaie d\'échange appréciée.' },
    alcool:     { name: 'Gnôle',          cat: 'confort', w: 1, v: 14, ico: '⚱', desc: 'Alcool maison. Réconforte, fatigue un peu. Très recherchée au troc.' },

    // --- Outils
    pelle:         { name: 'Pelle',          cat: 'outils', w: 2, v: 12, ico: '⚒', tool: true, desc: 'Déblayer les gravats deux fois plus vite.' },
    pied_de_biche: { name: 'Pied-de-biche',  cat: 'outils', w: 2, v: 12, ico: '⟋', tool: true, desc: 'Force les portes et les meubles verrouillés.' },
    passe_partout: { name: 'Passe-partout',  cat: 'outils', w: 1, v: 6,  ico: '⚷', tool: true, desc: 'Crochète les serrures, en silence. Peut se casser.' },
    scie:          { name: 'Scie à métaux',  cat: 'outils', w: 2, v: 14, ico: '⋈', tool: true, desc: 'Découpe les grilles et les barreaux.' },

    // --- Armes
    couteau:    { name: 'Couteau',        cat: 'armes', w: 1, v: 10, ico: '†', weapon: 1, desc: 'Arme de mêlée légère.' },
    hachette:   { name: 'Hachette',       cat: 'armes', w: 2, v: 14, ico: '⚔', weapon: 1.5, tool: true, desc: 'Arme de mêlée. Démonte aussi les meubles plus vite.' },
    pistolet:   { name: 'Pistolet',       cat: 'armes', w: 2, v: 35, ico: '⌐', weapon: 3, ammo: true, desc: 'Arme à feu. Nécessite des munitions.' },
    fusil:      { name: 'Fusil de chasse',cat: 'armes', w: 3, v: 55, ico: '═', weapon: 4, ammo: true, desc: 'Arme à feu puissante. Nécessite des munitions.' },
    fusil_pompe: { name: 'Fusil à pompe',  cat: 'armes', w: 3, v: 60, ico: '╤', weapon: 4.5, ammo: true, desc: 'Dévastateur de près, inutile de loin. Très bruyant. Nécessite des munitions.' },
    fusil_assaut: { name: 'Fusil d\'assaut', cat: 'armes', w: 3, v: 90, ico: '╦', weapon: 5, ammo: true, desc: 'Arme militaire : tire vite et loin. Rare. Nécessite des munitions.' },
    pistolet_silencieux: { name: 'Pistolet silencieux', cat: 'armes', w: 2, v: 48, ico: '⌐', weapon: 3, ammo: true, desc: 'Un pistolet muni d\'un silencieux artisanal : on l\'entend à peine, mais il est un peu moins précis. Nécessite des munitions.' },
    fusil_lunette: { name: 'Fusil d\'assaut à lunette', cat: 'armes', w: 3, v: 150, ico: '╬', weapon: 6, ammo: true, desc: 'Le fusil des tireurs d\'élite : lunette, précision et portée hors du commun. L\'arme la plus rare de la ville. Nécessite des munitions.' },
    munitions:  { name: 'Munitions',      cat: 'armes', w: 1, v: 3,  ico: '⁞', desc: 'Cartouches et balles.' },
    casque:     { name: 'Casque militaire', cat: 'armes', w: 2, v: 25, ico: '◓', armor: true, desc: 'Protège la tête : un peu moins de blessures au combat. Se porte avec le gilet.' },
    gilet:      { name: 'Gilet pare-balles', cat: 'armes', w: 3, v: 40, ico: '⛨', armor: true, desc: 'Réduit fortement les blessures lors du pillage.' },

    // --- Valeurs
    bijoux:     { name: 'Bijoux',         cat: 'valeur', w: 1, v: 16, ico: '◇', desc: 'Sans usage réel. Les marchands les adorent.' },
    montre:     { name: 'Montre en or',   cat: 'valeur', w: 1, v: 30, ico: '◔', desc: 'Une montre à gousset en or massif. Vaut une petite fortune au troc.' },
    diamants:   { name: 'Diamants',       cat: 'valeur', w: 1, v: 60, ico: '◆', desc: 'Quelques pierres taillées. Inutiles pour survivre — mais un marchand donnerait presque tout pour elles.' }
  };

  // Force l'affichage texte (monochrome) des symboles, jamais en emoji couleur
  Object.keys(C.ITEMS).forEach(function (k) { C.ITEMS[k].ico += '\uFE0E'; });

  // Formes au singulier pour les quantités de 1
  var SINGULAR = {
    legumes: 'légume', composants: 'composant', pieces_meca: 'pièce mécanique', pieces_elec: 'pièce électronique',
    herbes: 'herbe', livres: 'livre', pieces_armes: 'pièce d\'arme', medicaments: 'médicament', cigarettes: 'cigarette', munitions: 'munition',
    bijoux: 'bijou', repas: 'repas chaud', filtre: 'filtre', diamants: 'diamant'
  };
  // Pluriels des noms donnés au singulier
  var PLURAL = {
    conserve: 'conserves', bandage: 'bandages', filtre: 'filtres', montre: 'montres en or', couteau: 'couteaux',
    pistolet: 'pistolets', pistolet_silencieux: 'pistolets silencieux', fusil: 'fusils de chasse', fusil_pompe: 'fusils à pompe', fusil_assaut: 'fusils d\'assaut', fusil_lunette: 'fusils d\'assaut à lunette', casque: 'casques militaires', pelle: 'pelles', hachette: 'hachettes', scie: 'scies à métaux',
    pied_de_biche: 'pieds-de-biche', gilet: 'gilets pare-balles', remede: 'remèdes aux plantes', repas: 'repas chauds'
  };
  // « 3 bois », « 1 livre », « 2 livres », « 2 conserves »
  C.itemQty = function (id, n) {
    var it = C.ITEMS[id];
    var name = n === 1 && SINGULAR[id] ? SINGULAR[id] : n > 1 && PLURAL[id] ? PLURAL[id] : it.name.toLowerCase();
    return n + ' ' + name;
  };
  C.itemsText = function (items) {
    var p = [];
    for (var k in items) if (items[k] > 0) p.push(C.itemQty(k, items[k]));
    return p.length ? p.join(', ') : 'rien';
  };

  // Ce que les survivants peuvent manger : nutrition (baisse de la faim), moral, risque de maladie
  C.FOODS = {
    repas:    { hunger: 42, moral: 3, sick: 0 },
    conserve: { hunger: 35, moral: 1, sick: 0 },
    legumes:  { hunger: 20, moral: 0, sick: 0 },
    viande:   { hunger: 22, moral: -1, sick: 0.45 }
  };
})(window.CQR);
