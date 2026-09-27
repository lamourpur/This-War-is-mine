/* =========================================================
   Survivants (personnages originaux) et traits
   ========================================================= */
(function (C) {
  'use strict';

  C.TRAITS = {
    cuisinier:   { name: 'Bon cuisinier',    desc: 'Chaque cuisson produit un repas supplémentaire.' },
    negociateur: { name: 'Négociateur',      desc: 'Obtient de bien meilleurs prix auprès des marchands.' },
    rapide:      { name: 'Rapide',           desc: 'Se déplace plus vite et explore plus de terrain la nuit.' },
    grand_sac:   { name: 'Grand sac',        desc: 'Rapporte beaucoup plus de butin du pillage.' },
    bricoleur:   { name: 'Bricoleur',        desc: 'Fabrique et construit plus vite.' },
    combattant:  { name: 'Combattant',       desc: 'Meilleur garde, se défend mieux en cas de rencontre hostile.' },
    soigneur:    { name: 'Soignant',         desc: 'Les soins qu\'il ou elle prodigue sont bien plus efficaces.' },
    empathique:  { name: 'Empathique',       desc: 'Remonte le moral du groupe, mais souffre davantage des mauvaises actions.' },
    fumeur:      { name: 'Fumeur',           desc: 'Perd du moral s\'il ne fume pas au moins tous les deux jours.' },
    cafeinomane: { name: 'Accro au café',    desc: 'Perd du moral sans café pendant deux jours.' },
    lecteur:     { name: 'Grand lecteur',    desc: 'La lecture lui remonte énormément le moral.' },
    endurant:    { name: 'Endurant',         desc: 'Se fatigue moins vite et résiste mieux au froid.' },
    cynique:     { name: 'Cynique',          desc: 'Les actes discutables le touchent peu… les bonnes actions aussi.' },
    discret:     { name: 'Discrète',         desc: 'Fait deux fois moins de bruit en exploration ; on la repère moins vite.' },
    costaud:     { name: 'Costaud',          desc: 'Porte davantage (+3 cases de sac) et frappe plus fort.' },
    lent:        { name: 'Lent',             desc: 'Se déplace nettement moins vite.' },
    fragile:     { name: 'Santé fragile',    desc: 'Se fatigue plus vite et tombe plus facilement malade avec le froid.' },
    econome:     { name: 'Économe',          desc: 'Fabrique en utilisant moins de matériaux.' }
  };

  // look : paramètres du dessin (silhouette)
  C.SURVIVOR_POOL = [
    { id: 'vera', name: 'Rachel Donovan', age: 34, job: 'Infirmière',
      bio: 'Elle travaillait aux urgences de l\'hôpital central jusqu\'à ce que l\'aile est s\'effondre. Elle compte encore les blessés qu\'elle n\'a pas pu sauver.',
      traits: ['soigneur', 'cafeinomane'],
      look: { hair: 'long', hat: null, build: 0.9, h: 0.95, coat: '#4f4c46', pants: '#2e2c2a', coatLen: 0.17, skin: '#b3a89b', hairColor: '#2b211b', nose: 'small', brow: 'thin', lips: true, female: true, shirt: '#8a8478' } },
    { id: 'tomas', name: 'Frank Doyle', age: 41, job: 'Ancien boxeur',
      bio: 'Champion régional il y a vingt ans, videur ensuite. Il dit qu\'il n\'a peur de rien. Il ment.',
      traits: ['combattant'],
      look: { hair: 'short', hat: null, build: 1.22, h: 1.05, coat: '#3b3733', pants: '#2b2a28', coatLen: 0, skin: '#a8998a', hairColor: '#352b24', nose: 'broken', brow: 'heavy', top: 'work', shirt: '#5e5a52' } },
    { id: 'ilija', name: 'Tyler Brooks', age: 27, job: 'Coursier',
      bio: 'Il livrait des colis à vélo dans toute la ville. Il en connaît chaque ruelle, chaque cour, chaque passage.',
      traits: ['rapide'],
      look: { hair: 'short', hat: null, build: 0.86, h: 1.0, coat: '#3d3c38', pants: '#343a40', coatLen: 0.05, skin: '#a08f7e', hairColor: '#1c1916', top: 'hoodie', shirt: '#6f6a60' } },
    { id: 'nada', name: 'Martha Jenkins', age: 52, job: 'Cuisinière de cantine',
      bio: 'Trente ans à nourrir les écoliers du quartier. Elle sait faire un repas avec presque rien — et elle le prouve.',
      traits: ['cuisinier', 'endurant'],
      look: { hair: 'curly', hat: null, build: 1.1, h: 0.91, coat: '#4c4640', pants: '#2f2c29', coatLen: 0.2, scarf: '#7a5a48', skin: '#8f7d6c', hairColor: '#171412', smile: true, lips: true, female: true, top: 'cardigan', shirt: '#7c7468' } },
    { id: 'goran', name: 'Vince Carver', age: 45, job: 'Contrebandier',
      bio: 'Avant la guerre, il « importait » des cigarettes. Aujourd\'hui, il sait mieux que personne ce qu\'une chose vaut.',
      traits: ['negociateur', 'fumeur', 'cynique'],
      look: { hair: 'short', hat: null, build: 1.02, h: 1.0, coat: '#3a3834', pants: '#2a2926', coatLen: 0.03, beard: 'full', hairColor: '#1e1a17', skin: '#9c8b79', brow: 'heavy', top: 'overcoat', shirt: '#5a5650' } },
    { id: 'lena', name: 'Emily Parker', age: 23, job: 'Étudiante en ingénierie',
      bio: 'Il lui restait un semestre avant son diplôme. Elle répare désormais tout ce qui lui tombe sous la main.',
      traits: ['bricoleur'],
      look: { hair: 'bob', hat: null, build: 0.84, h: 0.93, coat: '#555a52', pants: '#2f3236', coatLen: 0, scarf: '#3e3d3a', hairColor: '#121110', skin: '#b2a697', nose: 'small', brow: 'thin', lips: true, female: true, shirt: '#77766c' } },
    { id: 'emir', name: 'Marcus Reed', age: 38, job: 'Docker',
      bio: 'Il déchargeait des cargos au port. Des épaules larges, un dos solide, et un besoin de café qui frise la dévotion.',
      traits: ['grand_sac', 'cafeinomane'],
      look: { hair: 'buzz', hat: null, build: 1.26, h: 1.08, coat: '#3e4240', pants: '#2b2c2d', coatLen: 0.06, hairColor: '#121110', skin: '#6f5e50', brow: 'heavy', top: 'work', shirt: '#4e4a44' } },
    { id: 'mira', name: 'Eleanor Hayes', age: 61, job: 'Institutrice à la retraite',
      bio: 'Elle a appris à lire à la moitié du quartier. Elle garde un livre dans chaque poche et un mot gentil pour chacun.',
      traits: ['empathique', 'lecteur'],
      look: { hair: 'shoulder', hat: null, build: 0.94, h: 0.89, coat: '#5b554c', pants: '#34312d', coatLen: 0.22, scarf: '#6e5a5a', hairColor: '#5c4333', skin: '#b4a89b', smile: true, brow: 'thin', lips: true, female: true, top: 'cardigan', shirt: '#8c8478' } },
    { id: 'jade', name: 'Jade Morgan', age: 29, job: 'Cambrioleuse repentie',
      bio: 'Elle ouvrait les appartements des beaux quartiers sans laisser de trace. Deux ans de prison, puis la guerre. Elle marche sans faire de bruit, par habitude.',
      traits: ['discret', 'fumeur'],
      look: { hair: 'long', hat: null, build: 0.82, h: 0.95, coat: '#3a3a3c', pants: '#27282a', coatLen: 0.05, hairColor: '#2a1f18', skin: '#b8a490', nose: 'small', brow: 'thin', lips: true, female: true, top: 'hoodie', shirt: '#55534e' } },
    { id: 'ben', name: 'Ben Mercer', age: 47, job: 'Déménageur',
      bio: 'Vingt ans à monter des pianos dans les escaliers. Il porte ce que deux hommes ne soulèvent pas, mais il n\'a jamais su se presser.',
      traits: ['costaud', 'lent'],
      look: { hair: 'short', hat: null, build: 1.32, h: 1.07, coat: '#4a4640', pants: '#2c2b28', coatLen: 0.04, beard: 'stubble', hairColor: '#1d1915', skin: '#a08b77', brow: 'heavy', nose: 'broken', top: 'work', shirt: '#5e584e' } },
    { id: 'leonard', name: 'Leonard Price', age: 66, job: 'Professeur de mathématiques',
      bio: 'Quarante ans de tableau noir au lycée du quartier. Il a le cœur fragile et les mains qui tremblent, mais personne ne raconte mieux une histoire le soir.',
      traits: ['fragile', 'lecteur'],
      look: { hair: 'buzz', hat: null, build: 0.9, h: 0.96, coat: '#57524a', pants: '#33302c', coatLen: 0.25, hairColor: '#9a948a', skin: '#c2ae9c', brow: 'thin', glasses: true, top: 'cardigan', shirt: '#8a8276' } },
    { id: 'owen', name: 'Owen Fletcher', age: 44, job: 'Mécanicien',
      bio: 'Il tenait un petit garage au bord du fleuve. Il ne jette jamais rien : une vis, un bout de fil, tout finit par servir.',
      traits: ['econome', 'cafeinomane'],
      look: { hair: 'short', hat: null, build: 1.05, h: 1.0, coat: '#4a4d4a', pants: '#2a2c2e', coatLen: 0.02, hairColor: '#2a2420', skin: '#a8927c', brow: 'heavy', top: 'work', shirt: '#5a5c56' } }
  ];

  // Coût d'une recette pour ce survivant (économe : un quart de matériaux en moins)
  C.craftCost = function (r, s) {
    if (!s || !C.Game.hasTrait(s, 'econome')) return r.cost;
    var c = {};
    for (var k in r.cost) c[k] = r.cost[k] > 1 ? Math.max(1, Math.floor(r.cost[k] * 0.75)) : r.cost[k];
    return c;
  };

  C.survivorDef = function (id) {
    for (var i = 0; i < C.SURVIVOR_POOL.length; i++) if (C.SURVIVOR_POOL[i].id === id) return C.SURVIVOR_POOL[i];
    return null;
  };
})(window.CQR);
