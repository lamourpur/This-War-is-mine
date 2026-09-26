/* =========================================================
   Menu principal, nouvelle partie, introduction, crédits
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function $(id) { return document.getElementById(id); }
  function I(n, c) { return C.Icon(n, c); }

  var Menus = C.Menus = {};

  Menus.openMain = function () {
    C.UI.stopPlacing();
    C.UI.closeContext();
    C.UI.show(false);
    C.Main.mode = 'menu';
    // Décor animé : un refuge de démonstration, à la tombée de la nuit, sous la neige
    C.Game.newGame(['vera', 'tomas', 'mira'], 424242);
    C.Game.st.minute = 19 * 60 + 40;
    C.Game.st.weather.type = 'neige';
    C.Game.st.survivors.forEach(function (s, i) { s.x = [620, 980, 1300][i]; s.facing = i === 1 ? -1 : 1; });
    C.Main.setSpeed(0);

    var box = $('menu-screen');
    box.classList.remove('hidden');
    var latest = C.Save.latest();
    var items = [
      ['continue', 'Continuer', !latest],
      ['new', 'Nouvelle partie'],
      ['load', 'Charger'],
      ['options', 'Options'],
      ['help', 'Comment jouer'],
      ['credits', 'Crédits'],
      ['quit', 'Quitter']
    ];
    box.innerHTML =
      '<div class="menu-inner">' +
        '<div class="menu-kicker">Un siège · une maison · quelques survivants</div>' +
        '<h1 class="menu-title">Ceux qui<em>restent</em></h1>' +
        '<div class="menu-tag">La guerre ne se gagne pas. Elle se traverse.</div>' +
        '<div class="menu-btns">' +
          items.map(function (it, i) {
            return '<button class="mbtn" data-a="' + it[0] + '"' + (it[2] ? ' disabled' : '') + '><span class="num">0' + (i + 1) + '</span>' + it[1] + '</button>';
          }).join('') +
        '</div>' +
        '<div class="menu-foot">Version 1.2 · Les sauvegardes restent sur cet ordinateur</div>' +
      '</div>' +
      '<div class="menu-side">' +
        (latest ?
          '<div class="menu-save paper-surface" data-a="continue">' +
            '<span class="stamp">En cours</span>' +
            '<div class="k">Dernière partie</div>' +
            '<h3>Jour ' + latest.data.meta.day + '</h3>' +
            '<p>' + U.esc(latest.data.meta.names.join(', ') || '—') + (latest.data.meta.winter ? ' · hiver' : '') + '</p>' +
          '</div>' : '') +
      '</div>';
    box.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('mouseenter', function () { if (C.Audio.ready && !b.disabled) C.Audio.sfx.hover(); });
      b.addEventListener('click', function () {
        if (b.disabled) return;
        C.Audio.init(); C.Main.applySettings();
        if (C.Audio.ready) C.Audio.sfx.click();
        var a = b.dataset.a;
        if (a === 'continue' && latest) { Menus.close(); C.Main.loadState(latest.data.state); }
        if (a === 'new') Menus.openNewGame();
        if (a === 'load') C.UI.openSaves('load', true);
        if (a === 'options') C.UI.openOptions();
        if (a === 'help') C.UI.openHelp();
        if (a === 'credits') Menus.credits();
        if (a === 'quit') {
          C.UI.dialog('Quitter', '<p class="dialog-text">Vous pouvez fermer cet onglet ou cette fenêtre.<br><i>Votre progression est enregistrée à chaque aube.</i></p>', [{ label: 'Compris' }], { dark: true });
          try { window.close(); } catch (e) { /* ignoré */ }
        }
      });
    });
    C.Audio.setMusic(true);
  };

  Menus.close = function () { $('menu-screen').classList.add('hidden'); };

  Menus.openNewGame = function () {
    var R = new C.RNG(Date.now());
    var group = R.shuffle(C.SURVIVOR_POOL).slice(0, 3);
    var p = C.UI.panel('Nouvelle partie', 'Trois inconnus dans une maison à moitié détruite. Ils vont devoir tenir ensemble.', { foot: true, wide: true });
    var g = U.el('div', 'group');
    p.body.appendChild(g);
    function render() {
      g.innerHTML = '';
      group.forEach(function (d) {
        var el = U.el('div', 'dossier');
        var ph = U.el('div', 'photo');
        var cv = document.createElement('canvas');
        C.Render.portrait(cv, d, 106, 130);
        ph.appendChild(cv);
        el.appendChild(ph);
        el.appendChild(U.el('div', 'k', 'Dossier'));
        el.appendChild(U.el('h4', '', U.esc(d.name)));
        el.appendChild(U.el('div', 'job', d.age + ' ans · ' + U.esc(d.job)));
        el.appendChild(U.el('p', '', U.esc(d.bio)));
        el.appendChild(U.el('div', 'traits', d.traits.map(C.UI.traitBadge).join('')));
        g.appendChild(el);
      });
    }
    render();
    p.body.appendChild(U.el('p', 'save-note', 'La date du cessez-le-feu, l\'arrivée de l\'hiver et les vagues de pillages sont tirées au hasard à chaque partie.'));
    var reroll = U.el('button', 'btn ghost', I('user') + 'Autre groupe');
    reroll.addEventListener('click', function () { group = R.shuffle(C.SURVIVOR_POOL).slice(0, 3); render(); if (C.Audio.ready) C.Audio.sfx.page(); });
    var go = U.el('button', 'btn', 'Commencer');
    go.addEventListener('click', function () {
      C.UI.closeAllModals();
      Menus.close();
      C.Main.startNew(group.map(function (d) { return d.id; }));
    });
    p.foot.appendChild(reroll); p.foot.appendChild(go);
    C.UI.modal(p);
  };

  Menus.intro = function () {
    var names = C.Game.alive().map(function (s) { return s.name.split(' ')[0]; });
    C.UI.dialog('Jour 1',
      '<p class="dialog-text quote">La ville est assiégée depuis des semaines. ' + names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1] + ' ont trouvé refuge dans cette maison éventrée. Il n\'y a presque rien à manger, pas de chauffage, et des pièces entières sont encore bloquées par les décombres.</p>' +
      '<p class="dialog-text"><i>Personne ne sait combien de temps la guerre va durer.</i></p>' +
      '<div class="dialog-text" style="font-size:16px;border-top:1px dashed #6e6352;padding-top:12px;margin-top:6px">' +
      '<b>Pour commencer :</b> cliquez sur un survivant (ou son dossier à gauche), puis sur un <b>tas de gravats</b> ou un <b>meuble</b> pour le fouiller ou le déblayer. ' +
      'L\'<b>établi</b> fabrique un lit, un poêle, des outils… À <b>20 h</b>, il faudra décider qui dort, qui monte la garde et qui sort piller.</div>',
      [{ label: 'Survivre', run: function () { C.Main.setSpeed(1); } }], { stamp: 'Confidentiel' });
  };

  Menus.credits = function () {
    C.UI.dialog('Crédits',
      '<p class="dialog-text"><b>Ceux Qui Restent</b> — un jeu de survie et de gestion en temps réel, inspiré des jeux de survie civile en temps de guerre.</p>' +
      '<p class="dialog-text">Graphismes dessinés procéduralement en Canvas · Musique et sons synthétisés en temps réel (Web Audio) · Polices : Bebas Neue, Barlow Semi Condensed, Special Elite.</p>' +
      '<p class="dialog-text quote">À toutes celles et ceux qui ont attendu la fin d\'un siège dans une cave.</p>',
      [{ label: 'Fermer' }], { dark: true });
  };
})(window.CQR);
