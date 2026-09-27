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

  C.VISITOR_PEOPLE = {
    marchand: {
      name: 'Le marchand',
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
  };
})(window.CQR);
