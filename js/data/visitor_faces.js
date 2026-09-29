/* =========================================================
   Visages et silhouettes des visiteurs du refuge
   Pour chaque visiteur (C.VISITORS) :
   - name : nom affiché sous le portrait
   - face : fiche de portrait (même format que les survivants,
            voir js/render/portrait.js) ; une photo
            assets/portraits/pnj/<id>.jpg la remplace si elle existe
   - state : état dessiné sur le portrait (blessure, maladie…)
   - figs : silhouettes dessinées devant la porte d'entrée
            (même format de « look » que les survivants)
   Le réfugié qui demande à rejoindre le groupe utilise le portrait
   et la silhouette du survivant qu'il deviendra.
   ========================================================= */
(function (C) {
  'use strict';

  var SOLDIER = { hair: 'buzz', build: 1.05, h: 1.02, coat: '#4d5140', pants: '#3c3f31', coatLen: 0.12, skin: '#a8917a', hairColor: '#2e2822', beard: 'stubble', brow: 'heavy', top: 'work', shirt: '#5b5e4a', hat: 'helmet', hatColor: '#4a4e3c', bag: true };
  function soldier(over) { var o = {}; for (var k in SOLDIER) o[k] = SOLDIER[k]; for (k in over || {}) o[k] = over[k]; return o; }

  // Visiteurs qui ont une photo dans assets/portraits/pnj/<id>.jpg
  // (ajouter l'identifiant ici après avoir déposé le fichier)
  C.VISITOR_PHOTOS = ['marchand', 'voisin_aide', 'enfants', 'blesse', 'milice', 'vieille_dame', 'troc_voisin', 'emma_1', 'emma_2', 'deserteur_1', 'deserteur_2', 'deserteur_3'];

  // Personnages rencontrés la nuit : photo assets/portraits/pnj/<id>.jpg
  C.NPC_PHOTOS = ['hank', 'arthur', 'edith', 'sal', 'daniel', 'rosa', 'lili', 'ruth', 'benny', 'dale', 'carol', 'hal', 'tim', 'mila', 'maddox', 'holt', 'soldat', 'rick', 'kurt', 'ray'];
  // Soldats et pilleurs : clé de l'objet (ou type) → portrait
  var GUARD_FACE = { maddox: 'maddox', brute: 'holt', rick: 'rick', kurt: 'kurt', ray: 'ray' };
  // Portrait d'un personnage de la scène (PNJ ou soldat), ou null
  C.npcPortrait = function (o) {
    if (!o) return null;
    var id = null, st = {}, name = '';
    if (o.kind === 'npc' && C.NPCS[o.npc]) { id = o.npc; st = C.NPCS[o.npc].cond || {}; name = C.NPCS[o.npc].name; }
    else if (o.kind === 'guard') {
      id = GUARD_FACE[o.key] || (o.type === 'soldat' ? 'soldat' : null);
      name = o.name || (C.GUARD_TYPES[o.type] || {}).name;
      if (o.hp != null && o.maxHp && o.hp < o.maxHp * 0.6) st = { wound: 45 };
    }
    if (!id || C.NPC_PHOTOS.indexOf(id) < 0) return null;
    return { s: { id: 'p_' + id, defId: 'p_' + id, moral: o.state === 'surrender' ? 20 : 60, fatigue: 30, wound: st.wound || 0, sick: st.sick || 0 }, name: name };
  };

  C.VISITOR_PEOPLE = {
    marchand: {
      name: 'Franko, le marchand',
      face: { skin: '#c4a283', hair: '#2e2823', hairStyle: 'short', hat: 'cap', hatColor: '#34322e', fw: 33, fh: 51, jaw: 0.8, eye: 0.82, iris: '#3b3226', brow: 2.6, nose: 'long', lips: 0.8, age: 0.5, beard: 'stubble', clothes: 'overcoat', cloth: '#4a4238', squint: true, turn: 0.18 },
      figs: [{ hair: 'short', build: 0.92, h: 1.0, coat: '#4a4238', pants: '#2c2a26', coatLen: 0.3, skin: '#c4a283', hairColor: '#2e2823', beard: 'stubble', top: 'overcoat', shirt: '#5c5448', hat: 'cap', hatColor: '#34322e', bag: true }]
    },
    voisin_aide: {
      name: 'Walt, le voisin d\'en face',
      face: { skin: '#cfae92', hair: '#9d958a', hairStyle: 'short', fw: 37, fh: 48, jaw: 0.95, eye: 0.88, iris: '#4f5d6a', brow: 2.6, nose: 'wide', lips: 0.9, age: 0.62, beard: 'stubble', beardColor: '#8f877c', clothes: 'work', cloth: '#5a5549', turn: 0.12 },
      state: { fatigue: 60 },
      figs: [{ hair: 'short', build: 1.05, h: 1.0, coat: '#5a5549', pants: '#33312d', coatLen: 0.05, skin: '#cfae92', hairColor: '#9d958a', beard: 'stubble', top: 'work', shirt: '#6a6458' }]
    },
    enfants: {
      name: 'Deux enfants',
      face: { skin: '#dcbfa4', hair: '#4a3222', hairStyle: 'long', fw: 30, fh: 41, jaw: 0.7, eye: 1.15, iris: '#4b3a2a', brow: 1.6, nose: 'small', lips: 0.95, age: 0, freckles: true, clothes: 'jacket', cloth: '#6a6b60', scarf: '#8a5040', turn: 0.1 },
      state: { moral: 35, fatigue: 60 },
      figs: [
        { hair: 'long', build: 0.62, h: 0.66, coat: '#6a6b60', pants: '#3a3632', coatLen: 0.12, skin: '#dcbfa4', hairColor: '#4a3222', female: true, top: 'cardigan', shirt: '#8c8478', scarf: '#8a5040' },
        { hair: 'short', build: 0.58, h: 0.56, coat: '#5d6a6e', pants: '#3a3632', coatLen: 0.06, skin: '#d8bca2', hairColor: '#4a3222', top: 'hoodie', shirt: '#7c7468' }
      ]
    },
    blesse: {
      name: 'Un homme blessé',
      face: { skin: '#c9a88c', hair: '#3a3028', hairStyle: 'buzz', fw: 36, fh: 49, jaw: 0.92, eye: 0.9, iris: '#3b4a52', brow: 2.8, nose: 'straight', lips: 0.9, age: 0.35, beard: 'light', clothes: 'jacket', cloth: '#4c4a44', turn: 0.14 },
      state: { wound: 70, fatigue: 70, moral: 30 },
      hurt: true,
      figs: [{ hair: 'buzz', build: 1.0, h: 1.0, coat: '#4c4a44', pants: '#2c2a26', coatLen: 0.1, skin: '#c9a88c', hairColor: '#3a3028', beard: 'stubble', top: 'work', shirt: '#6a3a30' }]
    },
    milice: {
      name: 'Des miliciens',
      face: { skin: '#b8967a', hair: '#1e1a16', hairStyle: 'buzz', hat: 'beanie', hatColor: '#2b2a27', fw: 40, fh: 49, jaw: 1.05, eye: 0.8, iris: '#2f2a22', brow: 3.4, nose: 'broken', lips: 0.8, age: 0.4, beard: 'full', beardColor: '#2a241e', clothes: 'leather', cloth: '#3d3b35', scar: true, squint: true, build: 1.25, neck: 1.3, turn: 0.1 },
      figs: [
        soldier({ hat: 'beanie', hatColor: '#2b2a27', beard: 'full', coat: '#4a4a3e', bag: false }),
        soldier({ hat: null, coat: '#3d3b35', h: 1.06, build: 1.12 }),
        soldier({ hat: 'cap', hatColor: '#333', coat: '#55533f', h: 0.97 })
      ],
      armed: true
    },
    vieille_dame: {
      name: 'Une vieille dame',
      face: { skin: '#dcc4ae', hair: '#d3ccc0', hairStyle: 'bun', fw: 33, fh: 46, jaw: 0.74, eye: 0.92, iris: '#5b6b79', brow: 1.6, nose: 'straight', lips: 0.8, age: 0.95, clothes: 'overcoat', cloth: '#4e4640', earrings: true, turn: 0.12 },
      state: { moral: 40 },
      figs: [{ hair: 'shoulder', build: 0.86, h: 0.9, coat: '#4e4640', pants: '#33302c', coatLen: 0.4, skin: '#dcc4ae', hairColor: '#d3ccc0', female: true, lips: true, top: 'overcoat', shirt: '#7a716a' }]
    },
    troc_voisin: {
      name: 'Dana, du troisième',
      face: { skin: '#b98f70', hair: '#241a14', hairStyle: 'long', fw: 32, fh: 46, jaw: 0.74, eye: 1.02, iris: '#3b2c22', brow: 2.0, nose: 'small', lips: 1.1, age: 0.3, clothes: 'cardigan', cloth: '#6a5f55', scarf: '#5a4e5c', turn: 0.14 },
      figs: [{ hair: 'long', build: 0.88, h: 0.95, coat: '#6a5f55', pants: '#302d29', coatLen: 0.2, skin: '#b98f70', hairColor: '#241a14', female: true, lips: true, top: 'cardigan', shirt: '#7c7166', bag: true }]
    },
    emma_1: {
      name: 'Emma',
      face: { skin: '#e0c4aa', hair: '#6b4a30', hairStyle: 'long', fw: 29, fh: 40, jaw: 0.68, eye: 1.18, iris: '#4b6a5a', brow: 1.5, nose: 'small', lips: 0.95, age: 0, freckles: true, clothes: 'jacket', cloth: '#5e6a70', scarf: '#8a6040', turn: 0.08 },
      state: { moral: 40 },
      figs: [{ hair: 'long', build: 0.6, h: 0.64, coat: '#5e6a70', pants: '#3a3632', coatLen: 0.14, skin: '#e0c4aa', hairColor: '#6b4a30', female: true, top: 'cardigan', shirt: '#8c8478', scarf: '#8a6040' }]
    },
    emma_2: {
      name: 'Emma et Victor, son père',
      face: { skin: '#d2b196', hair: '#5e5146', hairStyle: 'short', fw: 34, fh: 50, jaw: 0.82, eye: 0.9, iris: '#4f5d6a', brow: 2.2, nose: 'long', lips: 0.85, age: 0.55, beard: 'light', beardColor: '#6a5c50', clothes: 'coat', cloth: '#56524a', glasses: true, turn: 0.14 },
      state: { sick: 35 },
      figs: [
        { hair: 'short', build: 0.9, h: 1.0, coat: '#56524a', pants: '#302d29', coatLen: 0.3, skin: '#d2b196', hairColor: '#5e5146', beard: 'stubble', top: 'overcoat', shirt: '#6e685e', glasses: true },
        { hair: 'long', build: 0.6, h: 0.64, coat: '#5e6a70', pants: '#3a3632', coatLen: 0.14, skin: '#e0c4aa', hairColor: '#6b4a30', female: true, top: 'cardigan', shirt: '#8c8478', scarf: '#8a6040' }
      ]
    },
    deserteur_1: {
      name: 'Danny, le déserteur',
      face: { skin: '#dcbc9f', hair: '#b89a62', hairStyle: 'messy', fw: 32, fh: 46, jaw: 0.8, eye: 1.05, iris: '#4f6a7a', brow: 2.0, nose: 'straight', lips: 0.95, age: 0.08, beard: 'light', beardColor: '#a88a58', clothes: 'jacket', cloth: '#4d5140', turn: 0.16 },
      state: { fatigue: 70, moral: 25, wound: 20 },
      figs: [soldier({ hat: null, hair: 'messy', hairColor: '#b89a62', skin: '#dcbc9f', beard: null, bag: false, coat: '#4d5140', h: 0.99, build: 0.95 })]
    },
    deserteur_2: {
      name: 'Une patrouille',
      face: { skin: '#c4a283', hair: '#2a241f', hairStyle: 'buzz', hat: 'cap', hatColor: '#3f4334', fw: 38, fh: 49, jaw: 1.0, eye: 0.8, iris: '#3b3226', brow: 3.2, nose: 'straight', lips: 0.8, age: 0.5, beard: 'stubble', clothes: 'coat', cloth: '#4d5140', squint: true, build: 1.2, turn: 0.12 },
      figs: [soldier({ hat: 'cap', hatColor: '#3f4334', bag: false, beard: 'full' }), soldier(), soldier({ h: 0.98 })],
      armed: true
    },
    deserteur_3: {
      name: 'Danny',
      face: { skin: '#dcbc9f', hair: '#b89a62', hairStyle: 'buzz', fw: 32, fh: 46, jaw: 0.8, eye: 1.05, iris: '#4f6a7a', brow: 2.0, nose: 'straight', lips: 1.0, age: 0.08, clothes: 'overcoat', cloth: '#5c5448', turn: 0.16 },
      state: { fatigue: 50 },
      figs: [{ hair: 'buzz', build: 0.95, h: 0.99, coat: '#5c5448', pants: '#2c2a26', coatLen: 0.3, skin: '#dcbc9f', hairColor: '#b89a62', top: 'overcoat', shirt: '#6e685e' }]
    }
    ,
    sara_1: {
      name: 'Sara',
      face: { skin: '#d8b89c', hair: '#3a2a20', hairStyle: 'long', fw: 31, fh: 45, jaw: 0.74, eye: 1.08, iris: '#5a4a3a', brow: 1.6, nose: 'small', lips: 1.0, age: 0.12, female: true, clothes: 'coat', cloth: '#4a4640', scarf: '#6a4a3e', turn: 0.1 },
      state: { fatigue: 65, moral: 30 },
      figs: [{ hair: 'long', build: 1.05, h: 0.94, coat: '#4a4640', pants: '#2e2c28', coatLen: 0.4, skin: '#d8b89c', hairColor: '#3a2a20', female: true, lips: true, top: 'overcoat', shirt: '#6a5e52', scarf: '#6a4a3e' }]
    },
    sara_2: {
      name: 'Sara',
      face: { skin: '#d4b499', hair: '#3a2a20', hairStyle: 'long', fw: 31, fh: 45, jaw: 0.74, eye: 1.08, iris: '#5a4a3a', brow: 1.6, nose: 'small', lips: 0.9, age: 0.12, female: true, clothes: 'coat', cloth: '#4a4640', scarf: '#6a4a3e', turn: 0.1 },
      state: { fatigue: 85, moral: 20, sick: 20 },
      figs: [{ hair: 'long', build: 1.05, h: 0.92, coat: '#4a4640', pants: '#2e2c28', coatLen: 0.4, skin: '#d4b499', hairColor: '#3a2a20', female: true, lips: true, top: 'overcoat', shirt: '#6a5e52', scarf: '#6a4a3e' }],
      hurt: true
    },
    sara_3: {
      name: 'Sara et Caleb',
      face: { skin: '#caa98c', hair: '#6a5240', hairStyle: 'short', fw: 34, fh: 48, jaw: 0.86, eye: 0.95, iris: '#4a5a6a', brow: 2.2, nose: 'straight', lips: 0.9, age: 0.25, beard: 'stubble', beardColor: '#5a4636', clothes: 'work', cloth: '#5c5a52', turn: 0.14 },
      state: { wound: 25 },
      figs: [
        { hair: 'short', build: 0.92, h: 1.0, coat: '#5c5a52', pants: '#302d29', coatLen: 0.08, skin: '#caa98c', hairColor: '#6a5240', beard: 'stubble', top: 'work', shirt: '#7a7266' },
        { hair: 'long', build: 0.86, h: 0.94, coat: '#4a4640', pants: '#2e2c28', coatLen: 0.35, skin: '#d8b89c', hairColor: '#3a2a20', female: true, lips: true, top: 'overcoat', shirt: '#6a5e52', scarf: '#8a7a64' }
      ]
    },
    soldat_1: {
      name: 'Sergent Hollis',
      face: { skin: '#c49f82', hair: '#3a3028', hairStyle: 'buzz', fw: 37, fh: 50, jaw: 1.0, eye: 0.85, iris: '#4a4a3a', brow: 2.8, nose: 'straight', lips: 0.8, age: 0.4, beard: 'stubble', clothes: 'coat', cloth: '#4d5140', turn: 0.12 },
      state: { wound: 60, fatigue: 80, moral: 30 },
      figs: [soldier({ hat: null, hair: 'buzz', hairColor: '#3a3028', skin: '#c49f82', bag: false })],
      hurt: true, armed: true
    },
    soldat_2: {
      name: 'Sergent Hollis',
      face: { skin: '#d0b09a', hair: '#3a3028', hairStyle: 'buzz', fw: 37, fh: 50, jaw: 1.0, eye: 0.85, iris: '#4a4a3a', brow: 2.8, nose: 'straight', lips: 0.7, age: 0.4, beard: 'stubble', clothes: 'coat', cloth: '#4d5140', turn: 0.12 },
      state: { wound: 70, sick: 70, fatigue: 90, moral: 15 },
      figs: [soldier({ hat: null, hair: 'buzz', hairColor: '#3a3028', skin: '#d0b09a', bag: false })],
      hurt: true
    },
    soldat_3: {
      name: 'Sergent Hollis',
      face: { skin: '#c49f82', hair: '#3a3028', hairStyle: 'buzz', hat: 'cap', hatColor: '#3f4334', fw: 37, fh: 50, jaw: 1.0, eye: 0.85, iris: '#4a4a3a', brow: 2.8, nose: 'straight', lips: 0.85, age: 0.4, clothes: 'coat', cloth: '#4d5140', turn: 0.12 },
      figs: [soldier({ hat: 'cap', hatColor: '#3f4334', hair: 'buzz', hairColor: '#3a3028', skin: '#c49f82', beard: null }), soldier({ h: 0.98 })],
      armed: true
    },
    voisin_outil: {
      name: 'Nate, le voisin du coin',
      face: { skin: '#c8a489', hair: '#5a4636', hairStyle: 'short', fw: 35, fh: 49, jaw: 0.9, eye: 0.9, iris: '#4a5a4a', brow: 2.4, nose: 'straight', lips: 0.9, age: 0.4, beard: 'stubble', clothes: 'work', cloth: '#6b6358', turn: 0.14 },
      state: { fatigue: 70, moral: 30 },
      figs: [{ hair: 'short', build: 1.0, h: 1.0, coat: '#6b6358', pants: '#34312c', coatLen: 0.05, skin: '#c8a489', hairColor: '#5a4636', beard: 'stubble', top: 'work', shirt: '#8a8276' }]
    },
    voisin_outil_retour: {
      name: 'Nate et sa femme',
      face: { skin: '#c8a489', hair: '#5a4636', hairStyle: 'short', fw: 35, fh: 49, jaw: 0.9, eye: 0.9, iris: '#4a5a4a', brow: 2.2, nose: 'straight', lips: 0.9, age: 0.4, beard: 'stubble', clothes: 'work', cloth: '#6b6358', turn: 0.14 },
      state: { moral: 70 },
      figs: [
        { hair: 'short', build: 1.0, h: 1.0, coat: '#6b6358', pants: '#34312c', coatLen: 0.05, skin: '#c8a489', hairColor: '#5a4636', beard: 'stubble', top: 'work', shirt: '#8a8276' },
        { hair: 'bun', build: 0.86, h: 0.94, coat: '#5e5448', pants: '#33302c', coatLen: 0.35, skin: '#d2b096', hairColor: '#6a4a36', female: true, lips: true, top: 'overcoat', shirt: '#7a716a' }
      ]
    },
    mere_bebe: {
      name: 'Une jeune mère',
      face: { skin: '#d6b89e', hair: '#3a2a20', hairStyle: 'long', fw: 32, fh: 46, jaw: 0.72, eye: 1.0, iris: '#4a3a2e', brow: 1.8, nose: 'small', lips: 1.0, age: 0.22, clothes: 'overcoat', cloth: '#5a5250', scarf: '#6a4e46', turn: 0.12 },
      state: { fatigue: 75, moral: 25 },
      figs: [{ hair: 'long', build: 0.84, h: 0.94, coat: '#5a5250', pants: '#302d29', coatLen: 0.4, skin: '#d6b89e', hairColor: '#3a2a20', female: true, lips: true, top: 'overcoat', shirt: '#7a716a', scarf: '#6a4e46' }]
    },
    pere_medic: {
      name: 'Un père désespéré',
      face: { skin: '#c4a086', hair: '#2e2620', hairStyle: 'short', fw: 34, fh: 50, jaw: 0.88, eye: 0.86, iris: '#3b3226', brow: 2.6, nose: 'long', lips: 0.8, age: 0.45, beard: 'light', clothes: 'jacket', cloth: '#45423c', turn: 0.16 },
      state: { fatigue: 85, moral: 20 },
      figs: [{ hair: 'short', build: 0.98, h: 1.0, coat: '#45423c', pants: '#2c2a26', coatLen: 0.15, skin: '#c4a086', hairColor: '#2e2620', beard: 'stubble', top: 'overcoat', shirt: '#5c5448' }]
    },
    colporteur: {
      name: 'Un colporteur',
      face: { skin: '#bf9c80', hair: '#1f1a16', hairStyle: 'short', hat: 'cap', hatColor: '#2e2c29', fw: 31, fh: 48, jaw: 0.78, eye: 0.84, iris: '#3b2c22', brow: 2.2, nose: 'long', lips: 0.8, age: 0.5, beard: 'stubble', clothes: 'overcoat', cloth: '#3e3c38', squint: true, turn: 0.2 },
      figs: [{ hair: 'short', build: 0.85, h: 0.95, coat: '#3e3c38', pants: '#2a2825', coatLen: 0.45, skin: '#bf9c80', hairColor: '#1f1a16', beard: 'stubble', top: 'overcoat', shirt: '#55504a', hat: 'cap', hatColor: '#2e2c29', bag: true }]
    },
    gamin_troc: {
      name: 'Un gamin débrouillard',
      face: { skin: '#dcbfa4', hair: '#6a4a30', hairStyle: 'short', fw: 30, fh: 42, jaw: 0.7, eye: 1.12, iris: '#4b5a6a', brow: 1.7, nose: 'small', lips: 0.95, age: 0, freckles: true, clothes: 'jacket', cloth: '#5d6a6e', turn: 0.1 },
      state: { moral: 70 },
      figs: [{ hair: 'short', build: 0.62, h: 0.64, coat: '#5d6a6e', pants: '#3a3632', coatLen: 0.06, skin: '#dcbfa4', hairColor: '#6a4a30', top: 'hoodie', shirt: '#7c7468', bag: true }]
    },
    vieux_froid: {
      name: 'Un vieil homme transi',
      face: { skin: '#d8c4b4', hair: '#dcd6cc', hairStyle: 'short', fw: 34, fh: 48, jaw: 0.84, eye: 0.84, iris: '#5b6b79', brow: 2.0, nose: 'wide', lips: 0.75, age: 1, beard: 'full', beardColor: '#d6d0c6', clothes: 'overcoat', cloth: '#4e4a44', scarf: '#5e4a3e', turn: 0.12 },
      state: { sick: 40, moral: 25 },
      figs: [{ hair: 'short', build: 0.88, h: 0.93, coat: '#4e4a44', pants: '#33302c', coatLen: 0.45, skin: '#d8c4b4', hairColor: '#dcd6cc', beard: 'full', top: 'overcoat', shirt: '#6e685e', scarf: '#5e4a3e', hat: 'beanie', hatColor: '#3a352e' }]
    }
  };
})(window.CQR);
