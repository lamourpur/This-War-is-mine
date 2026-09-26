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
    munitions:  { name: 'Munitions',      cat: 'armes', w: 1, v: 3,  ico: '⁞', desc: 'Cartouches et balles.' },
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
    herbes: 'herbe', livres: 'livre', medicaments: 'médicament', cigarettes: 'cigarette', munitions: 'munition',
    bijoux: 'bijou', repas: 'repas chaud', filtre: 'filtre', diamants: 'diamant'
  };
  // Pluriels des noms donnés au singulier
  var PLURAL = {
    conserve: 'conserves', bandage: 'bandages', filtre: 'filtres', montre: 'montres en or', couteau: 'couteaux',
    pistolet: 'pistolets', fusil: 'fusils de chasse', pelle: 'pelles', hachette: 'hachettes', scie: 'scies à métaux',
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
