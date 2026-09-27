/* =========================================================
   Le marché noir et Franko, le marchand
   Comme dans This War of Mine :
   - Franko passe au refuge régulièrement (tous les 3 à 5 jours), avec un
     stock qui s'étoffe au fil de la guerre (armes, gilet… plus tard).
   - Par périodes, certaines choses deviennent introuvables : pénurie de
     médicaments, de vivres, de munitions, de tabac… Elles valent alors bien
     plus cher, chez Franko comme chez tous ceux avec qui l'on troque, et on
     en trouve moins à vendre. Le rapport du matin et la radio préviennent.
   État : st.market = { id, until, next, last, franko }.
   ========================================================= */
(function (C) {
  'use strict';

  var M = C.Market = {};

  // items : multiplicateur de valeur pendant la pénurie
  C.SHORTAGES = [
    { id: 'medic', minDay: 5, items: { medicaments: 2.5, bandage: 2, remede: 2, herbes: 1.6 },
      start: 'Pénurie de médicaments : l\'hôpital n\'a plus rien. Médicaments et bandages s\'arrachent à prix d\'or.',
      end: 'Un convoi de la Croix-Rouge est passé : les médicaments se trouvent de nouveau, les prix retombent.',
      radio: 'Les hôpitaux de la ville manquent de tout. Les autorités demandent à chacun de rapporter les médicaments inutilisés.' },
    { id: 'vivres', minDay: 6, items: { conserve: 2, legumes: 2, viande: 1.8, repas: 2, sucre: 1.6 },
      start: 'Plus aucun convoi de vivres n\'entre en ville. La nourriture vaut de l\'or au marché noir.',
      end: 'Les distributions de vivres ont repris. La nourriture retrouve un prix à peu près normal.',
      radio: 'Le blocus se resserre : aucun convoi alimentaire n\'a pu entrer en ville cette semaine.' },
    { id: 'munitions', minDay: 9, items: { munitions: 2.3, pistolet: 1.8, fusil: 1.8, fusil_pompe: 1.8, fusil_assaut: 1.8, gilet: 1.6, casque: 1.5 },
      start: 'Les combats se rapprochent du quartier. Tout le monde cherche des armes et des munitions.',
      end: 'Le front s\'est éloigné. Les munitions ne s\'arrachent plus.',
      radio: 'De violents combats sont signalés aux abords de la vieille ville. La population est invitée à rester à l\'abri.' },
    { id: 'tabac', minDay: 4, items: { cigarettes: 2.2, tabac: 2, cafe: 2, alcool: 1.8 },
      start: 'Plus un paquet de cigarettes ni un grain de café en ville. Ceux qui en ont peuvent tout obtenir.',
      end: 'Du tabac et du café circulent de nouveau. Les prix redescendent.',
      radio: 'Les stocks de tabac et de café sont épuisés, selon les commerçants du marché central.' },
    { id: 'eau', minDay: 5, noWinter: true, items: { eau: 2.2, filtre: 2 },
      start: 'Le réseau d\'eau a été coupé. L\'eau potable et les filtres se paient très cher.',
      end: 'L\'eau coule de nouveau aux bornes-fontaines. Les prix de l\'eau retombent.',
      radio: 'Suite à des tirs d\'artillerie, la station de pompage est hors service. Économisez l\'eau.' },
    { id: 'pieces', minDay: 10, items: { pieces_meca: 2, pieces_elec: 2.2, composants: 1.5 },
      start: 'Tout ce qui est mécanique ou électrique est devenu introuvable. Pièces et composants valent une fortune.',
      end: 'Les pièces détachées circulent de nouveau. Les prix redeviennent raisonnables.',
      radio: 'Pour réparer les générateurs de l\'hôpital, les autorités rachètent toutes les pièces détachées.' },
    { id: 'froid', minDay: 1, winter: true, items: { bois: 2.2, carburant: 2, composants: 1.3 },
      start: 'Le grand froid s\'installe. Le bois et le carburant s\'arrachent : on brûle déjà les meubles.',
      end: 'Le froid relâche un peu son étreinte. Le bois se trouve de nouveau.',
      radio: 'Températures record : plusieurs personnes âgées retrouvées mortes de froid dans leur logement.' }
  ];

  function def(id) { for (var i = 0; i < C.SHORTAGES.length; i++) if (C.SHORTAGES[i].id === id) return C.SHORTAGES[i]; return null; }
  M.def = def;
  function state(st) {
    if (!st.market) st.market = { id: null, until: 0, next: C.R.int(4, 6), last: null, franko: C.R.int(2, 3), frankoVisits: 0 };
    return st.market;
  }
  M.state = state;

  // Pénurie en cours (ou null)
  M.current = function (st) {
    st = st || C.Game.st;
    var m = st && st.market;
    return m && m.id ? def(m.id) : null;
  };
  // Multiplicateur de valeur d'un objet en ce moment
  M.mult = function (id, st) {
    var sh = M.current(st);
    return sh && sh.items[id] ? sh.items[id] : 1;
  };
  // Objets recherchés en ce moment
  M.wanted = function (st) {
    var sh = M.current(st);
    return sh ? Object.keys(sh.items).filter(function (k) { return C.ITEMS[k]; }) : [];
  };
  M.wantedText = function (st) {
    return M.wanted(st).map(function (k) { return C.ITEMS[k].name.toLowerCase(); }).join(', ');
  };

  // Au matin : fin ou début d'une pénurie. add(section, texte, genre)
  M.dawn = function (st, add) {
    var m = state(st), R = C.R;
    if (m.id && st.day >= m.until) {
      var old = def(m.id);
      add('market', old.end, 'good');
      m.last = m.id; m.id = null;
      m.next = st.day + R.int(2, 4);
    }
    if (!m.id && st.day >= m.next) {
      var winter = C.World.isWinter(st);
      var pool = C.SHORTAGES.filter(function (s) {
        return st.day >= s.minDay && s.id !== m.last && (!s.winter || winter) && !(s.noWinter && winter);
      });
      // En hiver, le froid passe avant le reste
      var pick = winter && m.last !== 'froid' && pool.some(function (s) { return s.id === 'froid'; }) && R.chance(0.6) ? def('froid') : R.pick(pool);
      if (pick) {
        m.id = pick.id;
        m.until = st.day + R.int(3, 5);
        add('market', pick.start + ' Recherché : ' + M.wantedText(st) + '.', 'bad');
      }
    } else if (m.id) {
      add('market', 'Toujours très recherché : ' + M.wantedText(st) + (m.until - st.day <= 1 ? ' (la pénurie touche à sa fin, dit-on).' : '.'), 'info');
    }
    // Franko : on sait qu'il repasse bientôt
    if (st.day === m.franko && m.frankoVisits > 0) add('market', 'Franko a fait dire qu\'il repasserait aujourd\'hui avec de la marchandise.', 'info');
  };

  // Franko passe-t-il aujourd'hui ? (appelé par World.planVisitor)
  M.frankoDue = function (st) {
    var m = state(st);
    return st.day >= m.franko;
  };
  M.frankoPlanned = function (st) {
    var m = state(st);
    m.franko = st.day + C.R.int(3, 5);
    m.frankoVisits++;
  };

  // Stock de Franko : il s'étoffe au fil de la guerre ; ce qui manque en
  // ville (pénurie), il en a peu, et il le vend cher.
  var TIERS = [
    { day: 0, items: ['conserve', 'eau', 'legumes', 'bois', 'composants', 'bandage', 'cafe', 'cigarettes', 'sucre', 'tabac', 'livres', 'herbes', 'engrais', 'pied_de_biche', 'passe_partout', 'couteau', 'pelle'] },
    { day: 6, items: ['pieces_meca', 'pieces_elec', 'medicaments', 'munitions', 'carburant', 'filtre', 'alcool', 'hachette', 'scie'] },
    { day: 10, items: ['pistolet', 'munitions', 'medicaments', 'filtre'] },
    { day: 12, items: ['fusil_pompe', 'casque'] },
    { day: 15, items: ['fusil', 'gilet', 'munitions', 'repas'] },
    { day: 22, items: ['fusil_assaut'] }
  ];
  M.traderStock = function (st, R) {
    var pool = [], rare = [];
    TIERS.forEach(function (t, i) {
      if (st.day < t.day) return;
      t.items.forEach(function (id) { if (C.ITEMS[id] && pool.indexOf(id) < 0) pool.push(id); });
      if (i >= 2) t.items.forEach(function (id) { if (C.ITEMS[id]) rare.push(id); });
    });
    var stock = {};
    var n = R.int(7, 10) + Math.min(3, Math.floor(st.day / 10));
    R.shuffle(pool).slice(0, n).forEach(function (id) {
      var it = C.ITEMS[id];
      var q = it.tool || it.weapon || it.armor ? 1 : R.int(1, it.v > 10 ? 3 : 6);
      if (id === 'munitions') q = R.int(4, 12);
      if (M.mult(id, st) > 1) q = R.chance(0.5) ? 0 : 1;   // pénurie : il n'en a presque pas
      if (q > 0) stock[id] = q;
    });
    // Une « pièce rare » garantie à partir du milieu de la guerre
    if (rare.length && R.chance(0.7)) {
      var r = R.pick(rare);
      if (M.mult(r, st) <= 1) stock[r] = (stock[r] || 0) + (r === 'munitions' ? R.int(6, 10) : 1);
    }
    if (C.World.isWinter(st)) stock.bois = (stock.bois || 0) + R.int(3, 6);
    return stock;
  };
})(window.CQR);
