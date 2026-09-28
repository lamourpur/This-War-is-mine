/* =========================================================
   Mercenaires : un pilleur de métier, engagé pour une nuit
   À partir du jour 10, Milo (l'ancien patron du bar du coin) met en
   relation avec des « gens du métier » : des pilleurs aguerris qui sortent
   la nuit pour qui les paie. Chaque matin, un mercenaire est disponible.
   - Il se paie d'avance, et cher : toujours une ressource en pénurie
     (ce qui s'arrache au marché en ce moment), plus des vivres ou du bois.
   - Il vient avec son équipement (qui reste à lui) et ses talents.
   - Pendant ce temps, tout le groupe dort ou monte la garde.
   - S'il meurt, le groupe n'en porte pas le deuil ; ce qu'on lui avait
     confié est perdu, et Milo propose quelqu'un d'autre le lendemain.
   - Ses vols et ses meurtres pèsent moitié moins sur le groupe : c'est
     lui qui les commet… mais c'est nous qui l'avons envoyé.
   État : st.merc = { offer, hired: jour, fame }, st.flags.merc = 'known'.
   ========================================================= */
(function (C) {
  'use strict';

  var K = C.Merc = {};
  var U = C.util;
  function G() { return C.Game; }

  K.DAY = 10;

  // Profils : talents (traits du jeu), équipement personnel, caractère
  var ARCH = {
    ombre: { label: 'L\'Ombre', traits: ['discret', 'rapide'], gear: { couteau: 1, passe_partout: 1 }, cost: 1,
      desc: 'Ne se fait jamais voir. Évite les combats, ouvre les serrures sans bruit.' },
    colosse: { label: 'Le Colosse', traits: ['costaud', 'combattant'], gear: { hachette: 1 }, cost: 1.05,
      desc: 'Porte lourd et frappe fort. Pas très discret.' },
    veteran: { label: 'Le Vétéran', traits: ['combattant', 'endurant'], gear: { pistolet: 1, munitions: 8, couteau: 1 }, cost: 1.2,
      desc: 'Ancien soldat. Sait se servir d\'une arme et garde son sang-froid.' },
    fouineur: { label: 'Le Fouineur', traits: ['grand_sac', 'discret'], gear: { pied_de_biche: 1, couteau: 1 }, cost: 1.1,
      desc: 'Connaît toutes les caches de la ville. Rapporte des sacs pleins.' }
  };
  K.ARCH = ARCH;

  var NAMES = [
    ['Duke Harlan', 0], ['Rhett Coleman', 0], ['Nash Tully', 0], ['Wade Brennan', 0], ['Boone Kessler', 0],
    ['Mack Doyle', 0], ['Rook Vance', 0], ['Tess Garrity', 1], ['Jolene Price', 1], ['Kit Sorensen', 1], ['Hazel Quinn', 1]
  ];
  var FACES = { m: ['milice', 'pere_medic', 'colporteur', 'voisin_outil', 'blesse'], f: ['mere_bebe'] };
  var COATS = ['#2f2e2b', '#3a3833', '#3d4035', '#34302c', '#403a33', '#2c3033'];
  var SKINS = ['#a8927d', '#b09a86', '#9e8670', '#b8a18c', '#8f7a66'];
  var HAIRS = ['#221d19', '#3b2e24', '#5a4332', '#1c1815', '#6b645b'];

  // Paiement « normal » : ce que tout le monde peut réunir, mais qui manque
  var NORMAL = [['conserve', 2], ['bois', 4], ['cigarettes', 3], ['composants', 4], ['cafe', 1], ['alcool', 1], ['legumes', 3], ['sucre', 2]];
  // Sans pénurie en cours : un objet précieux
  var PRECIOUS = [['bijoux', 1], ['alcool', 2], ['medicaments', 1], ['munitions', 8]];

  function val(id) { return (C.ITEMS[id] && C.ITEMS[id].v) || 3; }
  function first(n) { return n.split(' ')[0]; }

  K.unlocked = function (st) { st = st || G().st; return st.day >= K.DAY && st.flags && st.flags.merc; };
  // L'offre du jour (créée à la demande : partie déjà au-delà du jour 10,
  // page rechargée en cours de journée…)
  K.offer = function (st) {
    st = st || G().st;
    if (!st || st.day < K.DAY || st.phase === 'explore') return null;
    if (!st.flags.merc) st.flags.merc = 'known';
    st.merc = st.merc || { dead: [] };
    if (!st.merc.offer || st.merc.offer.day !== st.day) {
      var prev = st.merc.offer;
      st.merc.offer = makeOffer(st, prev && prev.day === st.day - 1 ? prev : null);
      st.merc.hired = null;
    }
    return st.merc.offer;
  };
  K.hiredTonight = function (st) { st = st || G().st; return !!(st.merc && st.merc.hired === st.day); };

  // Ce qu'il demande : une ressource en pénurie (toujours), puis de quoi vivre
  function priceFor(st, arch, returning, R) {
    var price = {}, target = (30 + st.day * 1.3) * arch.cost * (returning ? 0.75 : 1), v = 0;
    var M = C.Market, sh = M && M.current(st);
    var rare;
    if (sh) {
      var wanted = M.wanted(st).filter(function (k) { return k !== 'fusil' && k !== 'fusil_pompe' && k !== 'fusil_assaut' && k !== 'pistolet' && k !== 'repas'; });
      var id = R.pick(wanted);
      var qty = id === 'munitions' ? 6 : id === 'bois' || id === 'composants' ? 5 : val(id) >= 8 ? 1 : 2;
      rare = [id, qty, true];
      v += qty * val(id) * (sh.items[id] || 1);
    } else {
      rare = R.pick(PRECIOUS);
      v += rare[1] * val(rare[0]) * 1.5;
    }
    price[rare[0]] = rare[1];
    var shortage = !!rare[2];
    var pool = NORMAL.filter(function (p) { return p[0] !== rare[0]; });
    while (v < target && pool.length) {
      var i = R.int(0, pool.length - 1), p = pool.splice(i, 1)[0];
      price[p[0]] = (price[p[0]] || 0) + p[1];
      v += p[1] * val(p[0]);
    }
    return { items: price, rare: rare[0], shortage: shortage };
  }

  function makeOffer(st, prev) {
    var R = C.R;
    var returning = prev && prev.survived && R.chance(0.5);
    var o;
    if (returning) {
      o = U.copy(prev);
      o.returning = true;
    } else {
      var used = (st.merc && st.merc.dead) || [];
      var names = NAMES.filter(function (n) { return used.indexOf(n[0]) < 0; });
      if (!names.length) names = NAMES;
      var nm = R.pick(names), female = !!nm[1];
      var archId = R.pick(Object.keys(ARCH));
      o = {
        id: 'merc' + st.day, name: nm[0], female: female, arch: archId,
        face: R.pick(female ? FACES.f : FACES.m),
        look: {
          hair: female ? R.pick(['bun', 'shoulder', 'scarf']) : R.pick(['short', 'messy']), build: female ? 0.9 : R.range(1.0, 1.15), h: female ? 0.96 : R.range(1.0, 1.05),
          coat: R.pick(COATS), pants: '#26241f', coatLen: R.range(0.1, 0.35), skin: R.pick(SKINS), hairColor: R.pick(HAIRS),
          beard: female ? null : R.pick(['stubble', 'full', null]), brow: 'heavy', female: female, lips: female,
          top: R.pick(['hoodie', 'overcoat', 'work']), shirt: '#4a463f', hat: R.chance(0.5) ? 'beanie' : null, hatColor: '#262420',
          scarf: R.chance(0.4) ? '#4e3a2c' : null, bag: true
        },
        jobs: 0
      };
    }
    o.day = st.day;
    var pr = priceFor(st, ARCH[o.arch], returning, R);
    o.price = pr.items; o.rare = pr.rare; o.shortage = pr.shortage;
    return o;
  }

  // À l'aube : Milo se fait connaître au jour 10, puis une offre chaque matin
  K.dawn = function (st, add) {
    if (st.day < K.DAY) return;
    if (!st.flags.merc) {
      st.flags.merc = 'known';
      add('people', 'Milo, l\'ancien patron du bar du coin, fait passer le mot : il connaît des « gens du métier », des pilleurs aguerris qui sortent la nuit pour ceux qui paient. Un mercenaire peut partir à la place de l\'un d\'entre vous (au moment de préparer la nuit).', 'good');
    }
    st.merc = st.merc || { dead: [] };
    var prev = st.merc.offer;
    st.merc.offer = makeOffer(st, prev && prev.day === st.day - 1 ? prev : null);
    st.merc.hired = null;
    if (st.merc.offer.returning) add('people', first(st.merc.offer.name) + ' repasse voir Milo : ' + (st.merc.offer.female ? 'elle' : 'il') + ' travaillerait de nouveau pour vous, un peu moins cher.', 'info');
  };

  // Engager / congédier (le paiement part tout de suite, rendu si on change d'avis)
  K.canPay = function (st, o) { return G().has(o.price); };
  K.hire = function (st) {
    var o = K.offer(st); if (!o || K.hiredTonight(st) || !K.canPay(st, o)) return false;
    G().removeItems(o.price);
    st.merc.hired = st.day;
    return true;
  };
  K.dismiss = function (st) {
    var o = K.offer(st); if (!o || !K.hiredTonight(st)) return;
    G().addItems(o.price);
    st.merc.hired = null;
  };

  // Le mercenaire, sous forme de « survivant » temporaire pour l'exploration
  K.body = function (o) {
    var a = ARCH[o.arch];
    return {
      id: 'merc', defId: 'v_' + o.face, merc: true, name: o.name, traits: a.traits.slice(), look: U.copy(o.look),
      hunger: 10, fatigue: 5, wound: 0, sick: 0, moral: 70, alive: true, cause: null,
      f: 0, x: 0, y: 0, facing: 1, path: [], act: null, anim: 0, away: null, bandaged: 0,
      gearSlots: C.Explore ? C.Explore.slots(ARCH[o.arch].gear) : 2,
      thoughts: [], grief: 0, story: [], lastSmoke: 0, lastCoffee: 0, lastBook: -1, brokenDays: 0, readToday: 0, restToday: 0
    };
  };
  K.gear = function (o) { return U.copy(ARCH[o.arch].gear); };

  // Ce qu'il rapporte, moins son équipement personnel (qui reste à lui)
  K.strip = function (o, items) {
    var out = U.copy(items || {});
    if (!o) return out;
    var g = K.gear(o);
    Object.keys(g).forEach(function (k) { if (out[k]) { out[k] = Math.max(0, out[k] - g[k]); if (!out[k]) delete out[k]; } });
    return out;
  };
  // Au retour : le butin va à la réserve ; il pourra revenir proposer ses services
  K.back = function (st, items) {
    var o = st.merc && st.merc.offer;
    if (o) { o.survived = true; o.jobs = (o.jobs || 0) + 1; }
    return K.strip(o, items);
  };
  K.lost = function (st) {
    var o = st.merc && st.merc.offer;
    if (!o) return;
    st.merc.dead = (st.merc.dead || []).concat([o.name]);
    o.survived = false;
  };

  // Fiche minimale (bandeau, info-bulle) : il n'a pas de dossier chez nous
  K.def = function (s) { return { age: 35, job: 'Mercenaire', traits: s.traits || [] }; };
  K.archLabel = function (o) { return ARCH[o.arch].label; };
  K.describe = function (o) { return ARCH[o.arch].desc; };
})(window.CQR);
