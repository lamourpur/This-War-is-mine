/* =========================================================
   Écran de la nuit : qui dort, qui garde, qui sort piller
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util, UI = C.UI;
  function G() { return C.Game; }

  // Mise en garde selon qui occupe les lieux
  function dangerNote(st, loc) {
    var hostile = Object.keys(st.locations[loc.id].hostile || {}).length;
    var tail = ' Restez hors de leur regard, cachez-vous dans les recoins sombres, évitez le bruit (double-clic = courir). En mode combat (touche C), un clic sur un ennemi l\'attaque.';
    if (loc.id === 'carrefour') return 'Un tireur embusqué surveille la rue depuis l\'immeuble d\'en face : guettez le reflet de sa lunette. Ne restez jamais à découvert : courez d\'abri en abri (double-clic), traversez par la passerelle en vous cachant derrière le panneau, ou passez sous la rue par le métro. Son nid s\'atteint par l\'arrière.';
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
    if (UI.hint) setTimeout(function () { UI.hint('dusk'); }, 600);
    var present = G().present();
    var plan = { explicitBeds: true, roles: {}, scav: { loc: null, stance: 'normal', prio: 'equilibre', equip: [], ammo: 0, bag: {} } };
    // Les lits vont d'abord aux plus fatigués (on peut changer)
    var nBeds = G().countBuilt('bed');
    present.slice().sort(function (a, b) { return b.fatigue - a.fatigue; }).forEach(function (s, i) { plan.roles[s.id] = i < nBeds ? 'bed' : 'sleep'; });
    if (C.Merc && C.Merc.hiredTonight(st)) plan.merc = C.Merc.offer(st);
    function bedsTaken(except) { return present.filter(function (x) { return x !== except && plan.roles[x.id] === 'bed'; }).length; }

    var p = UI.panel('La nuit tombe', 'Jour ' + st.day + ' · 20:00 — qui dort, qui veille, qui sort ?', { dark: true, foot: true, noClose: true, wide: true });
    var grid = U.el('div', 'night-grid');
    var info = U.el('div', 'night-info');
    p.body.appendChild(grid);
    p.body.appendChild(info);

    function scavenger() {
      if (plan.merc) return plan.mercBody || (plan.mercBody = C.Merc.body(plan.merc));
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
        [['bed', 'Dormir dans un lit', 'bed'], ['sleep', 'Dormir par terre', 'moon'], ['guard', 'Monter la garde', 'shield'], ['scav', 'Partir explorer', 'pack']].forEach(function (r) {
          var b = U.el('button', 'role r-' + r[0] + (plan.roles[s.id] === r[0] ? ' on' : ''), C.Icon(r[2]) + '<span>' + r[1] + '</span>');
          if (r[0] === 'scav' && anyScav && anyScav.id !== s.id) { b.disabled = true; b.title = plan.merc ? 'Le mercenaire sort à votre place cette nuit' : 'Un seul survivant peut sortir par nuit'; }
          if (r[0] === 'bed') {
            if (!nBeds) { b.disabled = true; b.title = 'Aucun lit : construisez-en un à l\'établi'; }
            else if (plan.roles[s.id] !== 'bed' && bedsTaken(s) >= nBeds) { b.disabled = true; b.title = 'Tous les lits sont pris'; }
            else b.title = 'Récupère complètement, guérit mieux, protège un peu du froid (' + (nBeds - bedsTaken(s)) + ' lit' + (nBeds - bedsTaken(s) > 1 ? 's' : '') + ' libre' + (nBeds - bedsTaken(s) > 1 ? 's' : '') + ')';
          }
          if (r[0] === 'sleep') b.title = 'Repos partiel, un peu moins de moral';
          if (r[0] === 'guard') b.title = 'Défend le refuge en cas d\'attaque ; ne se repose pas';
          b.addEventListener('click', function () {
            var hadBed = plan.roles[s.id] === 'bed';
            plan.roles[s.id] = r[0];
            // Un lit se libère : il revient au plus fatigué de ceux qui dorment par terre
            if (hadBed && r[0] !== 'bed' && r[0] !== 'sleep') {
              var next = present.filter(function (x) { return plan.roles[x.id] === 'sleep'; }).sort(function (a, b) { return b.fatigue - a.fatigue; })[0];
              if (next) plan.roles[next.id] = 'bed';
            }
            if (C.Audio.ready) C.Audio.sfx.click();
            renderAll();
          });
          roles.appendChild(b);
        });
        c.appendChild(roles);
        grid.appendChild(c);
      });
      mercCard(anyScav);
    }

    // Le mercenaire du jour (à partir du jour 10) : il part à la place du groupe
    function mercCard(anyScav) {
      var o = C.Merc && C.Merc.offer(st);
      if (!o) return;
      var hired = !!plan.merc;
      var c = U.el('div', 'night-card merc' + (hired ? ' hired' : ''));
      var body = plan.mercBody || C.Merc.body(o);
      c.appendChild(UI.portrait(body, 56, 68));
      c.appendChild(U.el('h4', '', U.esc(o.name.split(' ')[0]) + ' <small>' + U.esc(C.Merc.archLabel(o)) + '</small>'));
      var talents = C.Merc.ARCH[o.arch].traits.map(function (t) { return C.TRAITS[t].name; }).join(', ');
      c.appendChild(U.el('div', 'ns', '<b>Mercenaire</b>' + (o.returning ? ' · déjà venu (' + o.jobs + ' sortie' + (o.jobs > 1 ? 's' : '') + ')' : '') + '<br><i>' + U.esc(talents) + '</i><br>' + U.esc(C.Merc.describe(o))));
      var price = U.el('div', 'merc-price');
      price.innerHTML = '<span>Son prix, payé d\'avance :</span>' + Object.keys(o.price).map(function (k) {
        var have = hired || G().count(k) >= o.price[k];
        return '<em class="' + (have ? '' : 'ko') + (k === o.rare ? ' rare' : '') + '" title="' + U.esc(C.ITEMS[k].name) + (k === o.rare ? (o.shortage ? ' — en pénurie en ce moment' : ' — objet précieux') : '') + (have ? '' : ' — il vous en manque') + '">' + C.ItemArt.img(k, 24) + '<i>' + o.price[k] + '</i></em>';
      }).join('');
      c.appendChild(price);
      var roles = U.el('div', 'roles');
      var btn = U.el('button', 'role r-merc' + (hired ? ' on' : ''), C.Icon('pack') + '<span>' + (hired ? 'Engagé pour la nuit' : 'L\'engager pour la nuit') + '</span>');
      if (!hired && anyScav) { btn.disabled = true; btn.title = 'Un survivant part déjà explorer cette nuit'; }
      else if (!hired && !C.Merc.canPay(st, o)) { btn.disabled = true; btn.title = 'Il vous manque de quoi le payer'; }
      else btn.title = hired ? 'Congédier (on vous rend le paiement)' : 'Il part à votre place : le groupe reste au refuge. S\'il meurt, ce que vous lui avez confié est perdu, mais personne ne le pleurera.';
      btn.addEventListener('click', function () {
        if (plan.merc) { C.Merc.dismiss(st); plan.merc = null; plan.mercBody = null; plan.scav.bag = {}; }
        else if (C.Merc.hire(st)) {
          plan.merc = o; plan.mercBody = null; plan.scav.bag = {};
          if (UI.hint) UI.hint('merc');
        }
        if (C.Audio.ready) C.Audio.sfx.click();
        renderAll();
      });
      roles.appendChild(btn);
      c.appendChild(roles);
      grid.appendChild(c);
    }

    // Second écran : où aller cette nuit ? (carte de la ville, photo du lieu)
    function openLocation() {
      var s = scavenger(); if (!s) return;
      var n = s.name.split(' ')[0];
      var lp = UI.panel('Où aller cette nuit ?', U.esc(n) + (plan.merc ? ', le mercenaire,' : '') + ' partira à la nuit tombée · choisissez un lieu sur la carte', { dark: true, foot: true, noClose: true, wide: true });
      lp.classList.add('loc-screen');
      var box = U.el('div', 'loc-wrap');
      lp.body.appendChild(box);
      var mapBox = U.el('div', 'cm-box');
      var side = U.el('div', 'loc-side');
      box.appendChild(mapBox); box.appendChild(side);
      var back = U.el('button', 'btn ghost', '← Retour');
      back.title = 'Revenir au choix de qui dort, veille ou sort';
      back.addEventListener('click', function () { UI.closeModal(); });
      var next = U.el('button', 'btn', 'Préparer le sac →');
      next.addEventListener('click', function () { if (plan.scav.loc) UI.openPack(plan, s, depart, renderLoc); });
      lp.foot.appendChild(back); lp.foot.appendChild(next);
      function renderLoc() {
        mapBox.innerHTML = '';
        C.CityMap.render(mapBox, st, plan.scav.loc, function (id) { plan.scav.loc = id; if (C.Audio.ready) C.Audio.sfx.click(); renderLoc(); }, function (l) {
          var ls = st.locations[l.id] || {};
          if (C.World.closed(st, l.id)) return '<b>' + U.esc(l.name) + '</b><span>Des combats font rage : la zone est bouclée jusqu\'au jour ' + C.World.closedUntil(st, l.id) + '.</span>';
          if (l.unlock > st.day) return '<b>' + U.esc(l.name) + '</b><span>On n\'en sait encore rien. (jour ' + l.unlock + ')</span>';
          return '<b>' + U.esc(l.name) + '</b><span class="danger' + l.danger + '">' + C.DANGER_LABELS[l.danger] + '</span> · ' + C.RESIDENT_LABELS[l.residents] + (Object.keys(ls.hostile || {}).length ? ' · <em>hostiles</em>' : '') +
            '<span>' + lootLevel(st, l) + ' · ' + (ls.visits || 0) + ' visite' + ((ls.visits || 0) > 1 ? 's' : '') + '</span>';
        });
        side.innerHTML = '';
        var loc = plan.scav.loc ? C.locationDef(plan.scav.loc) : null;
        if (!loc) {
          side.appendChild(U.el('div', 'loc-empty', C.Icon('search') + '<p>Cliquez sur un repère de la carte.<br>Ce qu\'on sait du lieu s\'affichera ici.</p>'));
        } else {
          var ls = st.locations[loc.id] || {};
          var ph = U.el('div', 'loc-photo', '<div class="loc-photo-cap"><b>' + U.esc(loc.name) + '</b><p>' + U.esc(loc.desc) + '</p></div>');
          ph.style.backgroundImage = 'url(assets/locations/' + loc.id + '.jpg)';
          side.appendChild(ph);
          side.appendChild(U.el('p', 'loc-facts', '<span class="danger' + loc.danger + '">' + C.DANGER_LABELS[loc.danger] + '</span> · ' + C.RESIDENT_LABELS[loc.residents] + ' · ' + lootLevel(st, loc) + ' · ' + (ls.visits ? ls.visits + ' visite' + (ls.visits > 1 ? 's' : '') : 'jamais visité')));
          side.appendChild(U.el('p', 'loc-note', C.Icon('clock') + '<span>Vous dirigerez ' + U.esc(n) + ' sur place jusqu\'à 5 h du matin.</span>'));
          var danger = dangerNote(st, loc);
          if (danger) side.appendChild(U.el('p', 'loc-note warn', C.Icon('shield') + '<span>' + danger + '</span>'));
        }
        next.disabled = !loc;
        next.title = loc ? '' : 'Choisissez d\'abord un lieu sur la carte';
      }
      renderLoc();
      UI.modal(lp);
    }

    function syncBag() { UI.syncBag(plan); }

    function renderInfo() {
      var sleepers = present.filter(function (s) { return plan.roles[s.id] === 'sleep' || plan.roles[s.id] === 'bed'; }).length;
      var inBeds = present.filter(function (s) { return plan.roles[s.id] === 'bed'; }).length;
      var guards = present.filter(function (s) { return plan.roles[s.id] === 'guard'; });
      var beds = G().countBuilt('bed');
      var reserved = {};
      if (scavenger()) reserved = U.copy(plan.scav.bag);
      var def = C.Night.defense(st, guards, reserved).value;
      var risk = C.Night.raidChance(st);
      var riskTxt = risk < 0.15 ? 'faible' : risk < 0.3 ? 'réel' : risk < 0.5 ? 'élevé' : 'très élevé';
      var holes = st.objects.filter(function (o) { return o.kind === 'hole' && !o.boarded; }).length;
      var heaterFuel = 0; st.objects.forEach(function (o) { if (o.kind === 'heater') heaterFuel = Math.max(heaterFuel, o.fuel || 0); });
      var estTemp = Math.round(st.weather.out - 3 + 6 - holes * 1.8 + (heaterFuel > 0 ? C.World.heaterOutput(st) * Math.min(1, heaterFuel / 600) : 0));
      var hungry = present.filter(function (s) { return s.hunger >= 45; }).map(function (s) { return s.name.split(' ')[0] + (s.hunger >= 100 ? ' (meurt de faim)' : ''); });
      function tile(cls, icon, big, small) { return '<div class="ni ' + cls + '">' + C.Icon(icon) + '<div><b>' + big + '</b>' + small + '</div></div>'; }
      info.innerHTML =
        tile(sleepers > inBeds ? 'warn' : '', 'bed', inBeds + ' / ' + beds + ' lit' + (beds > 1 ? 's' : ''), sleepers > inBeds ? (sleepers - inBeds) + (sleepers - inBeds > 1 ? ' dormiront' : ' dormira') + ' par terre' : sleepers ? 'Chacun dort dans un lit' : 'Personne ne dort') +
        tile(risk >= 0.3 && def < 2 ? 'bad' : '', 'shield', 'Défense ' + def.toFixed(1), 'Risque d\'attaque : ' + riskTxt + (st.raidBonus ? ' (menace de la milice)' : '')) +
        tile(estTemp < 0 ? 'bad' : estTemp < 8 ? 'warn' : '', 'thermo', estTemp + ' °C', estTemp < 8 ? 'Nuit froide : risque de maladie' : 'Température prévue cette nuit');
      if (hungry.length) info.innerHTML += tile('warn', 'hunger', 'Faim', hungry.join(', ') + ' — nourrissez-les d\'abord');
      var s = scavenger();
      go.disabled = false;
      go.textContent = !s ? 'Passer la nuit' : 'Choisir le lieu →';
    }

    function renderAll() { renderCards(); renderInfo(); }

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
      // Quelqu'un sort : second écran, le choix du lieu
      if (scavenger()) { openLocation(); return; }
      depart();
    });
    function depart() {
      UI.closeAllModals();
      var s = scavenger();
      if (!s) plan.scav = null;
      C.Main.nightFade(true, s ? s.name.split(' ')[0] + (plan.merc ? ', le mercenaire,' : '') + ' s\'enfonce dans l\'obscurité vers : ' + C.locationDef(plan.scav.loc).name + '.' : 'Le refuge retient son souffle.');
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
    }
    p.foot.appendChild(feed);
    p.foot.appendChild(go);
    renderAll();
    UI.modal(p);
  };
})(window.CQR);
