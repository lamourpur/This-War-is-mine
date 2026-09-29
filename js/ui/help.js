/* =========================================================
   Aide : info-bulles, conseils de première fois, manuel
   - Info-bulles thémées : tout élément portant un attribut title (ou
     data-tip) affiche, après un court délai, une bulle « dossier » à la
     place de la bulle grise du navigateur.
   - Conseils : UI.hint(clé) affiche une fois (par joueur) une note
     épinglée qui explique ce qui se passe la première fois. Coupables
     dans les options.
   - Manuel : UI.openHelp, en onglets.
   ========================================================= */
(function (C) {
  'use strict';

  var UI = C.UI, U = C.util;
  var I = function (n) { return C.Icon(n); };
  function $(id) { return document.getElementById(id); }

  // ------------------------------------------------ info-bulles
  var tip = null, tipEl = null, tipTimer = null, mx = 0, my = 0;
  function tipBox() {
    if (!tip) { tip = U.el('div', 'hidden', ''); tip.id = 'tip'; document.body.appendChild(tip); }
    return tip;
  }
  // Prend le title (le navigateur ne l'affiche plus) et le garde en data-tip
  function grab(el) {
    if (el.title) { el.setAttribute('data-tip', el.title); el.removeAttribute('title'); }
    return el.getAttribute('data-tip');
  }
  function place() {
    var t = tipBox(), w = t.offsetWidth, h = t.offsetHeight;
    var x = mx + 16, y = my + 20;
    if (x + w > window.innerWidth - 8) x = mx - w - 12;
    if (y + h > window.innerHeight - 8) y = my - h - 12;
    t.style.left = Math.max(6, x) + 'px'; t.style.top = Math.max(6, y) + 'px';
  }
  function showTip() {
    if (!tipEl || !document.body.contains(tipEl)) { hideTip(); return; }
    var txt = grab(tipEl);
    if (!txt) { hideTip(); return; }
    var t = tipBox();
    // « Titre — détail » : le début en gras
    var i = txt.indexOf(' — ');
    t.innerHTML = i > 0 && i < 60 ? '<b>' + U.esc(txt.slice(0, i)) + '</b><span>' + U.esc(txt.slice(i + 3)) + '</span>' : '<span>' + U.esc(txt) + '</span>';
    t.classList.remove('hidden');
    // Une jauge du dossier : la grande bulle du survivant s'efface
    if (tipEl.closest('.card') && UI.hideTooltip) UI.hideTooltip();
    place();
  }
  function hideTip() {
    clearTimeout(tipTimer); tipTimer = null; tipEl = null;
    if (tip) tip.classList.add('hidden');
  }
  UI.hideTip = hideTip;
  document.addEventListener('mouseover', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[title],[data-tip]') : null;
    if (el && el.tagName === 'svg') el = el.parentNode.closest('[title],[data-tip]');
    if (el === tipEl) return;
    hideTip();
    if (!el || !grab(el)) return;
    tipEl = el;
    tipTimer = setTimeout(showTip, 380);
  });
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    if (tipEl && tip && !tip.classList.contains('hidden')) {
      // Le texte a pu changer (jauges mises à jour en continu)
      if (tipEl.title) showTip(); else place();
    }
  });
  document.addEventListener('mousedown', hideTip);
  window.addEventListener('blur', hideTip);

  // ------------------------------------------------ conseils de première fois
  var HINTS = {
    start: { icon: 'user', title: 'Premier jour', text: 'Cliquez sur un survivant (ou sur son dossier à gauche) pour le choisir, puis sur un meuble, un tas de gravats ou une porte pour voir ce qu\'il peut faire. Fouillez tout : chaque pièce cache de quoi tenir.' },
    craft: { icon: 'hammer', title: 'L\'établi', text: 'L\'établi fabrique lits, poêle, collecteur d\'eau, outils… Une fois terminé, un meuble attend d\'être installé : bouton « À installer » à droite.' },
    merc: { icon: 'pack', title: 'Un mercenaire', text: 'Il part à votre place : le groupe dort ou garde le refuge. Vous le dirigez comme un des vôtres. Vous composez son sac avec vos objets : tout revient au refuge s\'il rentre, tout est perdu s\'il meurt, mais personne ne le pleurera. Ses vols et ses meurtres, le groupe les juge quand même, chacun à sa façon.' },
    dusk: { icon: 'moon', title: 'La nuit tombe', text: 'Chacun dort (au lit, c\'est mieux), monte la garde ou part explorer. Choisissez un lieu sur la carte, puis préparez le sac de celui qui sort : on ne rapporte que ce qui tient dans ses cases.' },
    explore: { icon: 'search', title: 'Exploration', text: 'Clic : marcher (double-clic : courir, plus bruyant). Clic sur un meuble : fouiller. Molette, clic droit glissé ou flèches : voir tout le lieu ; F : revenir sur le pilleur. En mode exploration on parle ; touche C pour le mode combat, A pour changer d\'arme. Rentrez avant l\'aube : la cloche sonne à 4 h.' },
    guards: { icon: 'skull', title: 'Vous n\'êtes pas seul', text: 'Des gens armés sont ici. Les cercles de bruit montrent jusqu\'où on vous entend : marchez, restez dans l\'ombre, cachez-vous (clic sur une cachette). Regardez par la serrure avant d\'ouvrir une porte.' },
    visitor: { icon: 'door', title: 'On frappe', text: 'Quelqu\'un est à la porte. Envoyez un survivant ouvrir (clic sur la porte). Si personne ne va voir, la personne finit par repartir.' },
    trade: { icon: 'pack', title: 'Le troc', text: 'Chacun paie plus cher ce qui lui manque, et moins ce qu\'il a déjà. Pendant une pénurie, ce qui manque en ville vaut bien plus. Les deux plateaux doivent s\'équilibrer.' },
    sick: { icon: 'health', title: 'Malade ou blessé', text: 'Bandages pour les blessures, médicaments (ou remède aux herbes) pour la maladie : bouton « Besoins » du dossier. Un malade ou un blessé doit dormir dans un lit, sinon son état empire.' },
    sad: { icon: 'moral', title: 'Le moral flanche', text: 'Parlez-lui, réconfortez-le (clic sur lui avec un autre survivant), un café, une cigarette, de la musique… Un survivant brisé refuse tout, et peut partir.' },
    winter: { icon: 'snow', title: 'L\'hiver', text: 'Le froid rend malade. Construisez un poêle, gardez du bois en réserve, bouchez les trous du refuge. On peut brûler livres et meubles en dernier recours.' },
    market: { icon: 'trade', title: 'Pénurie', text: 'Ce qui manque en ville vaut beaucoup plus au troc, pour tout le monde. C\'est le moment de vendre ce que vous avez en trop… ou de garder ce qui vous est précieux.' }
  };
  function hintsOff() { var S = C.Main && C.Main.settings; return S && S.hints === false; }
  function seen() {
    try { return JSON.parse(localStorage.getItem('cqr-hints') || '{}'); } catch (e) { return {}; }
  }
  UI.hint = function (key) {
    if (hintsOff() || !HINTS[key] || (C.Main && C.Main.noFade)) return false;
    var s = seen();
    if (s[key]) return false;
    s[key] = 1;
    try { localStorage.setItem('cqr-hints', JSON.stringify(s)); } catch (e) { /* stockage bloqué : tant pis */ }
    var h = HINTS[key], box = $('hints');
    if (!box) { box = U.el('div', '', ''); box.id = 'hints'; document.body.appendChild(box); }
    var n = U.el('div', 'hint', '<div class="hint-ico">' + I(h.icon) + '</div><div class="hint-body"><b>' + U.esc(h.title) + '</b><p>' + U.esc(h.text) + '</p></div>');
    var x = U.el('button', 'hint-x', '×'); x.title = 'Compris';
    var close = function () { n.classList.add('out'); setTimeout(function () { n.remove(); }, 300); };
    x.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    n.appendChild(x);
    // Derrière les fenêtres, sauf celle qui vient de s'ouvrir (troc)
    // Une fenêtre s'ouvre ou se ferme : les anciennes notes s'en vont
    if (box.classList.contains('over') !== !!UI.modalOpen) box.innerHTML = '';
    box.classList.toggle('over', !!UI.modalOpen);
    var gs = C.Game && C.Game.st;
    box.classList.toggle('low', !!(gs && gs.phase === 'explore'));
    // Au plus deux notes à la fois
    while (box.children.length >= 2) box.firstChild.remove();
    box.appendChild(n);
    setTimeout(close, 26000);
    if (C.Audio && C.Audio.ready && C.Audio.sfx.page) C.Audio.sfx.page();
    return true;
  };
  UI.resetHints = function () { try { localStorage.removeItem('cqr-hints'); } catch (e) { /* rien */ } };

  // Déclencheurs, vérifiés deux fois par seconde
  var hintT = 0;
  UI.hintTick = function (dt) {
    hintT -= dt;
    if (hintT > 0) return;
    hintT = 0.5;
    var st = C.Game && C.Game.st;
    var box = $('hints');
    if (box && !UI.modalOpen && box.classList.contains('over')) { box.classList.remove('over'); box.innerHTML = ''; }
    if (!st || UI.modalOpen || hintsOff()) return;
    if (st.phase === 'explore') {
      UI.hint('explore');
      var guards = st.objects.some(function (o) { return o.kind === 'guard' && o.hp > 0 && !(C.Combat.hidden && C.Combat.hidden(o)); });
      if (guards) UI.hint('guards');
      return;
    }
    if (st.phase !== 'day') return;
    if (st.day === 1 && st.minute > 6 * 60 + 2) UI.hint('start');
    if (st.visitor && !st.visitor.talking) UI.hint('visitor');
    var alive = st.survivors.filter(function (s) { return s.alive && !s.away; });
    if (alive.some(function (s) { return s.sick > 25 || s.wound > 25; })) UI.hint('sick');
    if (alive.some(function (s) { return s.moral < 35; })) UI.hint('sad');
    if (C.World.isWinter(st)) UI.hint('winter');
    if (st.market && st.market.id) UI.hint('market');
    if (st.day >= 2 && st.minute > 8 * 60) UI.hint('craft');
  };

  // ------------------------------------------------ manuel
  function sec(icon, title, rows) {
    return '<h3>' + I(icon) + title + '</h3>' + rows.map(function (r) { return '<div>' + r + '</div>'; }).join('');
  }
  var PAGES = [
    ['Commandes', 'user', function () {
      return sec('user', 'Au refuge', [
        '<b>Clic</b> sur un survivant ou son dossier : le choisir. <kbd>Tab</kbd> : le suivant.',
        '<b>Clic</b> sur un objet, des gravats, une porte : ce que le survivant peut y faire.',
        '<b>Clic</b> sur le sol : y aller. <b>Clic sur un autre survivant</b> : parler, réconforter, soigner.',
        '<b>Clic droit</b> ou <kbd>Échap</kbd> : fermer, annuler.'
      ]) + sec('clock', 'Le temps', [
        '<kbd>Espace</kbd> pause · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> vitesses.',
        '<kbd>N</kbd> : passer la journée (s\'arrête de lui-même si quelque chose arrive).'
      ]) + sec('search', 'La caméra', [
        '<b>Molette</b> : zoomer sur le refuge. <b>Clic droit</b> ou <b>clic molette</b> maintenu : déplacer la vue.',
        '<kbd>Z</kbd> : revenir à la vue d\'ensemble. Zoomé, la vue suit le survivant choisi.'
      ]) + sec('journal', 'Fenêtres', [
        '<kbd>I</kbd> réserve · <kbd>J</kbd> journal · <kbd>Échap</kbd> menu.',
        'Survolez un élément pour une explication. Les dossiers : <b>Fiche</b> (histoire, traits, pensées), <b>Besoins</b> (manger, se soigner…).'
      ]);
    }],
    ['Le refuge', 'home', function () {
      return sec('sun', 'Le jour', [
        'De 6 h à 20 h, on ne sort pas : les tireurs embusqués tiennent les rues. On fouille, on déblaie, on fabrique, on cuisine, on dort un peu.',
        'Gravats et portes verrouillées cachent des pièces entières : ressources et place pour construire.',
        'L\'<b>établi</b> fabrique outils et meubles ; une construction terminée doit être <b>installée</b> (bouton à droite).',
        'Ceux qui n\'ont rien à faire s\'occupent seuls : ils s\'assoient, s\'allongent quand ils n\'en peuvent plus.'
      ]) + sec('health', 'Survivre', [
        '<b>Faim</b> : un repas chaque jour, les repas cuisinés nourrissent mieux. Personne ne meurt de faim d\'un coup : cela prend des jours.',
        '<b>Fatigue</b> : dormir, sinon tout ralentit. <b>Santé</b> : bandages (blessures), médicaments (maladie), lit pour guérir.',
        '<b>Eau</b> : collecteur de pluie (il gèle en hiver), filtre. <b>Hiver</b> : poêle, bois, trous bouchés.'
      ]) + sec('moral', 'Le moral', [
        'Chaque survivant a ses <b>pensées</b> : ce qu\'il vit, ce qu\'il pense de ce que fait le groupe.',
        'Confort (lits, fauteuil, radio, guitare, chauffage) et bonnes actions le relèvent ; vols, meurtres et refus d\'aider le minent — sauf chez les cyniques.',
        '<b>Abattu</b>, on travaille mal. <b>Brisé</b>, on refuse tout ; sans réconfort, on part… ou on ne tient pas.',
        'Cliquez sur un survivant abattu : le <b>réconforter</b>, ou lui <b>lire à voix haute</b> (il faut un livre, qui n\'est pas usé).',
        'Un mort qu\'on laisse au refuge pèse chaque jour davantage : il faut l\'<b>enterrer</b> (plus vite avec une pelle). Son <b>souvenir</b> reste, on peut s\'y recueillir.'
      ]) + sec('wrench', 'Outils et armes', [
        'Les outils <b>s\'usent</b> et finissent par casser (barre sous l\'icône dans la réserve).',
        'L\'<b>atelier d\'armurier</b> (établi niv. 2) les remet à neuf, recharge des munitions, assemble des armes avec des <b>pièces d\'armes</b> (chez les soldats et les bandits) et monte un <b>silencieux</b> sur un pistolet : on l\'entend à peine.'
      ]);
    }],
    ['La nuit', 'moon', function () {
      return sec('moon', 'Le plan de nuit', [
        'À 20 h, chacun <b>dort dans un lit</b>, <b>dort par terre</b> (moins reposant), <b>monte la garde</b> ou <b>part explorer</b> (un seul par nuit).',
        'Gardes, armes, trous barricadés et porte renforcée protègent des pillards.',
        'À partir du jour 10, Milo propose chaque jour un <b>mercenaire</b> : il sort à la place du groupe, contre un paiement d\'avance (toujours une ressource en pénurie). S\'il meurt, seul ce qu\'on lui a confié est perdu.',
        'Choisissez le lieu sur la carte : ce qu\'on en sait s\'affiche. Puis préparez le <b>sac</b> par glisser-déposer : chaque case contient une pile d\'un seul objet.'
      ]) + sec('search', 'Explorer', [
        '<b>Clic</b> : marcher. <b>Double-clic</b> : courir (plus vite, mais on vous entend de loin).',
        'La caméra suit le pilleur. <b>Souris au bord de l\'écran</b>, <b>flèches</b> ou <b>Q / D</b> maintenues, <b>clic droit glissé</b> : faire défiler la vue. <b>Molette</b> : zoomer ou reculer jusqu\'à voir tout le lieu. <b>F</b> ou la flèche au bord de l\'écran : revenir sur lui.',
        'Fouiller un meuble ouvre la fouille : glissez les objets vers le sac. Serrures : pied-de-biche, passe-partout ou scie.',
        '<b>Regarder par la serrure</b> avant d\'entrer : on voit qui est dans la pièce.',
        'La cloche sonne à 4 h ; à 5 h, on rentre de force. <b>Rentrer</b> (bouton du bandeau) : le pilleur court jusqu\'à la sortie.'
      ]) + sec('speech', 'Les gens', [
        'On croise des civils : les aider, échanger, faire un don… ou les voler, voire les braquer arme en main. Chaque vol a une victime, et le groupe le sait.'
      ]);
    }],
    ['Le combat', 'skull', function () {
      return sec('skull', 'Deux modes', [
        '<kbd>C</kbd> : <b>exploration</b> (clic sur quelqu\'un = lui parler) ou <b>combat</b> (clic sur un ennemi = l\'attaquer).',
        '<kbd>A</kbd> : changer d\'arme en main (fusil d\'assaut, fusil, fusil à pompe, pistolet, hachette, couteau, pied-de-biche, pelle, poings).'
      ]) + sec('ear', 'Le bruit', [
        'Les cercles montrent le bruit : courir, forcer une serrure, tirer (le fusil à pompe s\'entend de loin). Un ennemi alerté vient voir.',
        'Dans une <b>cachette</b>, on attend que la patrouille passe. Un ennemi qui ne vous a pas vu peut être attaqué <b>par surprise</b> à la lame.'
      ]) + sec('shield', 'Protection', [
        'Le <b>gilet pare-balles</b> et le <b>casque militaire</b> réduisent les blessures reçues.',
        'Certains ne défendent que leur coin : restez à distance et ils vous laisseront. Un ennemi grièvement blessé peut se rendre : l\'épargner ou l\'achever.'
      ]);
    }],
    ['Visiteurs et troc', 'door', function () {
      return sec('door', 'On frappe', [
        'Chaque jour ou presque, quelqu\'un frappe : voisins qui demandent de l\'aide, réfugiés, marchands, pillards qui menacent.',
        'Envoyer un survivant ouvrir. Personne n\'ouvre ? La personne repart, et on ne saura jamais ce qu\'elle voulait.'
      ]) + sec('pack', 'Le troc', [
        '<b>Franko</b> passe régulièrement avec de la marchandise ; son stock s\'étoffe au fil de la guerre.',
        'Chacun paie plus cher ce qu\'il recherche. Les <b>pénuries</b> (médicaments, vivres, munitions, tabac…) font flamber les prix : le rapport du matin et la radio préviennent.'
      ]) + sec('star', 'Le but', [
        'Tenir jusqu\'au <b>cessez-le-feu</b>. Personne ne sait quand il viendra.'
      ]);
    }]
  ];
  UI.openHelp = function (page) {
    var p = UI.panel('Comment survivre', 'Le manuel du refuge', { dark: true, wide: true, foot: true });
    var tabs = U.el('div', 'help-tabs'), body = U.el('div', 'help-grid');
    function show(i) {
      Array.prototype.forEach.call(tabs.children, function (b, j) { b.classList.toggle('on', i === j); });
      body.innerHTML = PAGES[i][2]();
      body.scrollTop = 0;
    }
    PAGES.forEach(function (pg, i) {
      var b = U.el('button', 'help-tab', I(pg[1]) + '<span>' + pg[0] + '</span>');
      b.addEventListener('click', function () { show(i); });
      tabs.appendChild(b);
    });
    p.body.appendChild(tabs); p.body.appendChild(body);
    show(page || 0);
    var reset = U.el('button', 'btn', I('help') + 'Revoir les conseils');
    reset.title = 'Les notes de première fois réapparaîtront au bon moment';
    reset.addEventListener('click', function () { UI.resetHints(); reset.disabled = true; reset.lastChild.textContent = 'Conseils réactivés'; });
    p.foot.appendChild(reset);
    UI.modal(p);
  };
})(window.CQR);
