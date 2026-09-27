/* =========================================================
   Écran de la nuit : qui dort, qui garde, qui sort piller
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util, UI = C.UI;
  function G() { return C.Game; }

  var EQUIP = ['pied_de_biche', 'passe_partout', 'scie', 'couteau', 'hachette', 'pistolet', 'fusil', 'gilet'];

  // Mise en garde selon qui occupe les lieux
  function dangerNote(st, loc) {
    var hostile = Object.keys(st.locations[loc.id].hostile || {}).length;
    var tail = ' Restez hors de leur regard, cachez-vous dans les recoins sombres, évitez le bruit (double-clic = courir). En mode combat (touche C), un clic sur un ennemi l\'attaque.';
    if (loc.id === 'carrefour') return 'Un tireur embusqué surveille la rue. Ne restez jamais à découvert : courez d\'abri en abri (double-clic), cachez-vous derrière les épaves, ou passez par le métro.';
    if (loc.residents === 'militaires') return (loc.danger >= 3 || hostile ? 'Les soldats tirent à vue.' : 'Des soldats gardent les lieux : n\'entrez pas dans leur zone et ne volez pas sous leurs yeux.') + tail + ' Une arme et un gilet pare-balles peuvent vous sauver la vie.';
    if (loc.residents === 'bandits') return 'Une bande armée occupe les lieux. Ils vous tomberont dessus s\'ils vous voient.' + tail + ' Emportez une arme.';
    var map = C.MAPS[loc.id];
    if (map && map.objects.some(function (o) { return o.kind === 'guard'; })) return (hostile ? 'Le pilleur qui traîne ici vous en veut : il se battra.' : 'Un autre pilleur fouille parfois ici. Il n\'est pas méchant, mais il défend son coin.') + ' Si ça tourne mal, cachez-vous ou fuyez.';
    return null;
  }

  // Ce qui reste dans un lieu jouable : meubles du plan, selon leur état mémorisé
  function mapLootLevel(st, l) {
    var ls = st.locations[l.id], map = C.MAPS[l.id], cur = 0, init = 0;
    map.objects.forEach(function (o) {
      var n = 0; for (var k in (o.loot || {})) n += o.loot[k];
      if (!n) return;
      init += n;
      var sv = (ls.map || {})[o.key];
      if (sv === 'gone') return;
      if (sv && sv.loot) { for (var k2 in sv.loot) cur += sv.loot[k2]; }
      else if (!(sv && sv.searched)) cur += n;
    });
    (ls.extra || []).forEach(function (o) { for (var k in (o.loot || {})) cur += o.loot[k]; });
    var r = init ? cur / init : 0;
    if (ls.visits === 0) return 'Inexploré';
    if (r > 0.6) return 'Encore beaucoup';
    if (r > 0.3) return 'Quelques restes';
    if (r > 0.05) return 'Presque vide';
    return 'Vidé';
  }

  function lootLevel(st, l) {
    if (C.MAPS[l.id]) return mapLootLevel(st, l);
    var cur = 0, init = 0, k;
    var ls = st.locations[l.id];
    for (k in ls.loot) cur += ls.loot[k];
    for (k in l.loot) init += l.loot[k];
    if (ls.residentsLoot && !ls.residentsGone) for (k in ls.residentsLoot) cur += ls.residentsLoot[k];
    if (l.residentsLoot) for (k in l.residentsLoot) init += l.residentsLoot[k];
    var r = init ? cur / init : 0;
    if (ls.visits === 0) return 'Inexploré';
    if (r > 0.6) return 'Encore beaucoup';
    if (r > 0.3) return 'Quelques restes';
    if (r > 0.05) return 'Presque vide';
    return 'Vidé';
  }

  UI.openNight = function () {
    var st = G().st;
    C.Main.setSpeed(0);
    var present = G().present();
    var plan = { roles: {}, scav: { loc: null, stance: 'normal', prio: 'equilibre', equip: [], ammo: 0 } };
    present.forEach(function (s) { plan.roles[s.id] = 'sleep'; });

    var p = UI.panel('La nuit tombe', 'Jour ' + st.day + ' · 20:00 — qui dort, qui veille, qui sort ?', { dark: true, foot: true, noClose: true, wide: true });
    var grid = U.el('div', 'night-grid');
    var scavBox = U.el('div', 'scav-box');
    var info = U.el('div', 'night-info');
    p.body.appendChild(grid);
    p.body.appendChild(scavBox);
    p.body.appendChild(info);

    function scavenger() {
      for (var id in plan.roles) if (plan.roles[id] === 'scav') return G().surv(id);
      return null;
    }

    function renderCards() {
      grid.innerHTML = '';
      var anyScav = scavenger();
      present.forEach(function (s) {
        var c = U.el('div', 'night-card');
        var states = C.Surv.states(s).map(function (x) { return x.t; }).join(', ') || 'En forme';
        var traits = s.traits.map(function (t) { return C.TRAITS[t].name; }).join(', ');
        c.appendChild(UI.portrait(s, 56, 68));
        c.appendChild(U.el('h4', '', U.esc(s.name.split(' ')[0])));
        c.appendChild(U.el('div', 'ns', U.esc(states) + '<br><i>' + U.esc(traits) + '</i>'));
        if (s.moral < 15) c.appendChild(U.el('div', 'nwarn', 'Brisé(e) : sans réconfort, risque de départ… ou pire.'));
        else if (s.moral < 35) c.appendChild(U.el('div', 'nwarn', 'Déprimé(e) : il faudrait lui parler.'));
        var roles = U.el('div', 'roles');
        [['sleep', 'Dormir', 'bed'], ['guard', 'Garder', 'shield'], ['scav', 'Piller', 'pack']].forEach(function (r) {
          var b = U.el('button', 'role r-' + r[0] + (plan.roles[s.id] === r[0] ? ' on' : ''), C.Icon(r[2]) + r[1]);
          if (r[0] === 'scav' && anyScav && anyScav.id !== s.id) b.disabled = true;
          if (r[0] === 'scav') b.title = 'Un seul survivant peut sortir par nuit';
          b.addEventListener('click', function () {
            plan.roles[s.id] = r[0];
            if (C.Audio.ready) C.Audio.sfx.click();
            renderAll();
          });
          roles.appendChild(b);
        });
        c.appendChild(roles);
        grid.appendChild(c);
      });
    }

    function seg(label, options, cur, onSet) {
      var g = U.el('div', 'opt-group', '<span>' + label + '</span>');
      var sg = U.el('div', 'seg');
      options.forEach(function (o) {
        var b = U.el('button', o[0] === cur ? 'on' : '', o[1]);
        if (o[2]) b.title = o[2];
        b.addEventListener('click', function () { onSet(o[0]); renderAll(); });
        sg.appendChild(b);
      });
      g.appendChild(sg);
      return g;
    }

    function renderScav() {
      var s = scavenger();
      scavBox.classList.toggle('hidden', !s);
      if (!s) return;
      scavBox.innerHTML = '<h3>' + C.Icon('pack') + 'Expédition de ' + U.esc(s.name.split(' ')[0]) + '</h3>';
      var ll = U.el('div', 'loc-list');
      C.LOCATIONS.forEach(function (l) {
        if (l.unlock > st.day) return;
        var ls = st.locations[l.id];
        var b = U.el('button', 'loc has-photo' + (plan.scav.loc === l.id ? ' on' : ''));
        var stashNote = l.stash && !ls.stashTaken && ls.visits > 0 ? ' · réserve verrouillée' : '';
        var pips = '<span class="pips">' + [0, 1, 2].map(function (i) { return '<i class="' + (i < l.danger ? 'on' : '') + '"></i>'; }).join('') + '</span>';
        b.innerHTML = '<span class="loc-thumb" style="background-image:url(assets/locations/' + l.id + '.jpg)"></span><b>' + l.name + '</b>' + (C.isPlayableLocation(l.id) ? '<span class="loc-play">À explorer</span>' : '') + '<small><span class="danger' + l.danger + '">' + pips + C.DANGER_LABELS[l.danger] + '</span> · ' + C.RESIDENT_LABELS[l.residents] + (ls.residentsGone ? ' (partis)' : '') + '</small><small>' + lootLevel(st, l) + ' · ' + ls.visits + ' visite' + (ls.visits > 1 ? 's' : '') + stashNote + '</small>';
        b.title = l.desc;
        b.addEventListener('click', function () { plan.scav.loc = l.id; renderAll(); });
        ll.appendChild(b);
      });
      scavBox.appendChild(ll);
      var loc = plan.scav.loc ? C.locationDef(plan.scav.loc) : null;
      if (loc) {
        // Grande photo du lieu choisi, description tapée à la machine par-dessus
        var ph = U.el('div', 'loc-photo', '<div class="loc-photo-cap"><b>' + U.esc(loc.name) + '</b><p>' + U.esc(loc.desc) + '</p></div>');
        ph.style.backgroundImage = 'url(assets/locations/' + loc.id + '.jpg)';
        scavBox.appendChild(ph);
      }

      var row = U.el('div', 'opt-row');
      if (loc && C.isPlayableLocation(loc.id)) {
        // Lieu jouable : c'est vous qui menez l'exploration
        scavBox.appendChild(U.el('p', 'loc-note', C.Icon('clock') + '<span>Vous dirigerez ' + U.esc(s.name.split(' ')[0]) + ' sur place jusqu\'à 5 h du matin. Sac : ' + C.Explore.capacity(s) + ' de charge. Emportez de quoi aider ou échanger.</span>'));
        var danger = dangerNote(st, loc);
        if (danger) scavBox.appendChild(U.el('p', 'loc-note warn', C.Icon('shield') + '<span>' + danger + '</span>'));
      } else {
        row.appendChild(seg('Attitude', [
          ['discret', 'Discrète', 'Moins de rencontres, moins de butin'],
          ['normal', 'Normale', ''],
          ['agressif', 'Agressive', 'Plus de butin, prend aussi aux habitants (civils) — mauvais pour le moral']
        ], plan.scav.stance, function (v) { plan.scav.stance = v; }));
        row.appendChild(seg('Priorité', C.LOOT_PRIORITIES.map(function (x) { return [x[0], x[1]]; }), plan.scav.prio, function (v) { plan.scav.prio = v; }));
        scavBox.appendChild(row);
      }

      var eqG = U.el('div', 'opt-group', '<span>Équipement emporté (3 max)</span>');
      var eq = U.el('div', 'equip');
      var have = EQUIP.filter(function (id) { return G().count(id) > 0; });
      if (!have.length) eq.innerHTML = '<small style="color:#8a8170">Aucun outil ni arme dans la réserve.</small>';
      have.forEach(function (id) {
        var on = plan.scav.equip.indexOf(id) >= 0;
        var b = U.el('button', on ? 'on' : '', C.ItemArt.img(id, 30) + '<span>' + C.ITEMS[id].name + '</span>');
        b.title = C.ITEMS[id].desc;
        b.addEventListener('click', function () {
          if (on) plan.scav.equip.splice(plan.scav.equip.indexOf(id), 1);
          else if (plan.scav.equip.length < 3) plan.scav.equip.push(id);
          var gun = plan.scav.equip.some(function (x) { return C.ITEMS[x].ammo; });
          plan.scav.ammo = gun ? Math.min(G().count('munitions'), 6) : 0;
          renderAll();
        });
        eq.appendChild(b);
      });
      eqG.appendChild(eq);
      if (plan.scav.ammo) eqG.appendChild(U.el('small', '', '<span style="color:#b9ae95">+ ' + plan.scav.ammo + ' munitions</span>'));
      var row2 = U.el('div', 'opt-row'); row2.appendChild(eqG);
      scavBox.appendChild(row2);
    }

    function renderInfo() {
      var sleepers = present.filter(function (s) { return plan.roles[s.id] === 'sleep'; }).length;
      var guards = present.filter(function (s) { return plan.roles[s.id] === 'guard'; });
      var beds = G().countBuilt('bed');
      var reserved = {};
      if (scavenger()) plan.scav.equip.forEach(function (id) { reserved[id] = (reserved[id] || 0) + 1; });
      if (plan.scav.ammo) reserved.munitions = plan.scav.ammo;
      var def = C.Night.defense(st, guards, reserved).value;
      var risk = C.Night.raidChance(st);
      var riskTxt = risk < 0.15 ? 'faible' : risk < 0.3 ? 'réel' : risk < 0.5 ? 'élevé' : 'très élevé';
      var holes = st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
      var heaterFuel = 0; st.objects.forEach(function (o) { if (o.kind === 'heater') heaterFuel = Math.max(heaterFuel, o.fuel || 0); });
      var estTemp = Math.round(st.weather.out - 3 + 6 - holes * 1.8 + (heaterFuel > 0 ? C.World.heaterOutput(st) * Math.min(1, heaterFuel / 600) : 0));
      var hungry = present.filter(function (s) { return s.hunger >= 45; }).map(function (s) { return s.name.split(' ')[0]; });
      function tile(cls, icon, big, small) { return '<div class="ni ' + cls + '">' + C.Icon(icon) + '<div><b>' + big + '</b>' + small + '</div></div>'; }
      info.innerHTML =
        tile(sleepers > beds ? 'warn' : '', 'bed', beds + ' lit' + (beds > 1 ? 's' : '') + ' / ' + sleepers, sleepers > beds ? (sleepers - beds) + (sleepers - beds > 1 ? ' dormiront' : ' dormira') + ' par terre' : 'Tout le monde a un lit') +
        tile(risk >= 0.3 && def < 2 ? 'bad' : '', 'shield', 'Défense ' + def.toFixed(1), 'Risque d\'attaque : ' + riskTxt + (st.raidBonus ? ' (menace de la milice)' : '')) +
        tile(estTemp < 0 ? 'bad' : estTemp < 8 ? 'warn' : '', 'thermo', estTemp + ' °C', estTemp < 8 ? 'Nuit froide : risque de maladie' : 'Température prévue cette nuit');
      if (hungry.length) info.innerHTML += tile('warn', 'hunger', 'Faim', hungry.join(', ') + ' — nourrissez-les d\'abord');
      var s = scavenger();
      go.disabled = !!(s && !plan.scav.loc);
      go.textContent = s && !plan.scav.loc ? 'Choisissez un lieu' : 'Passer la nuit';
    }

    function renderAll() { renderCards(); renderScav(); renderInfo(); }

    var feed = U.el('button', 'btn ghost', 'Nourrir / soigner d\'abord');
    feed.title = 'Revenir un instant au refuge (le temps reste figé à 20 h)';
    feed.addEventListener('click', function () {
      UI.closeModal();
      st.phase = 'dusk';
      UI.toast('Le temps est figé à 20 h. Nourrissez, soignez, parlez aux autres (clic sur un survivant), puis « Passer à la nuit ».', 'info');
      C.Main.showDuskButton(true);
    });
    var go = U.el('button', 'btn', 'Passer la nuit');
    go.addEventListener('click', function () {
      UI.closeModal();
      var s = scavenger();
      if (!s) plan.scav = null;
      C.Main.nightFade(true, s ? s.name.split(' ')[0] + ' s\'enfonce dans l\'obscurité vers : ' + C.locationDef(plan.scav.loc).name + '.' : 'Le refuge retient son souffle.');
      // Lieu jouable : on y entre et on le parcourt soi-même jusqu'à l'aube
      if (s && C.isPlayableLocation(plan.scav.loc)) {
        setTimeout(function () {
          C.Explore.start(plan, function (pl) {
            C.Main.nightFade(true, s.name.split(' ')[0] + ' rentre au refuge.');
            setTimeout(function () { C.Night.resolve(pl); }, 2200);
          });
          C.Main.nightFade(false);
        }, 2600);
        return;
      }
      setTimeout(function () { C.Night.resolve(plan); }, 2600);
    });
    p.foot.appendChild(feed);
    p.foot.appendChild(go);
    renderAll();
    UI.modal(p);
  };
})(window.CQR);
