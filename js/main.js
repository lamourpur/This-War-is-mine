/* =========================================================
   Démarrage, boucle de jeu, entrées souris / clavier
   ========================================================= */
(function (C) {
  'use strict';

  var U = C.util;
  function $(id) { return document.getElementById(id); }
  function G() { return C.Game; }

  var Main = C.Main = { mode: 'menu', speed: 0, lastSpeed: 1, settings: null };
  var lastT = 0, workTimer = 0, workToggle = false, visitorSeen = false;

  Main.init = function () {
    Main.settings = C.Save.loadSettings();
    Main.applyDisplay();
    C.Render.init($('game'));
    // Textures photo : le décor se redessine dès qu'elles sont prêtes
    C.Tex.load(function () { C.Render.dirty = true; if (C.ItemArt) C.ItemArt.cache = {}; });
    C.Props.load(function () { C.Render.dirty = true; if (C.ItemArt) C.ItemArt.cache = {}; });
    C.UI.init();
    bindInput();
    C.Menus.openMain();
    requestAnimationFrame(loop);
  };

  // Affichage : grain et luminosité de l'image (réglables dans Options)
  Main.applyDisplay = function () {
    var S = Main.settings;
    C.Render.grainOn = S.grain;
    var cv = document.getElementById('game');
    // Au-delà de 100 %, on remonte aussi un peu les ombres (contraste adouci)
    var b = S.brightness || 1;
    if (cv) cv.style.filter = b === 1 ? '' : 'brightness(' + b + ')' + (b > 1 ? ' contrast(' + (1 - (b - 1) * 0.2).toFixed(3) + ')' : '');
  };

  Main.applySettings = function () {
    var S = Main.settings;
    C.Audio.vol.master = S.master; C.Audio.vol.music = S.music; C.Audio.vol.sfx = S.sfx; C.Audio.vol.ambience = S.ambience;
    C.Audio.applyVolumes();
    Main.applyDisplay();
    if (C.Audio.ready && G().st) C.Audio.setWeather(G().st.weather.type);
  };

  Main.setSpeed = function (n) {
    if (Main.skipping && n !== SKIP_SPEED) Main.stopSkip();
    if (n > 0 && n !== SKIP_SPEED) Main.lastSpeed = n;
    Main.speed = n;
  };

  // ------------------------------------------------------------ passer la journée
  // Comme dans This War of Mine : le reste de la journée défile d'un coup
  // (≈ 4 h de jeu par seconde). Tout continue de se passer normalement
  // (faim, travaux en cours, visiteurs, événements) et le défilement s'arrête
  // de lui-même dès que quelque chose demande votre attention.
  var SKIP_SPEED = 240;
  Main.skipping = false;
  Main.skipDay = function () {
    var st = G().st;
    if (!st || st.phase !== 'day' || C.UI.modalOpen || Main.skipping) return;
    Main.skipping = true;
    Main.skipVisitor = !!st.visitor;
    Main.speed = SKIP_SPEED;
    if (C.Audio.ready) C.Audio.sfx.click();
    C.UI.showSkip(true);
  };
  Main.stopSkip = function () {
    if (!Main.skipping) return;
    Main.skipping = false;
    Main.speed = 0;
    C.UI.showSkip(false);
  };
  // Pendant le défilement : faut-il s'arrêter ?
  function checkSkip(st) {
    if (!Main.skipping) return;
    if (st.phase !== 'day') { Main.skipping = false; C.UI.showSkip(false); return; }
    if (C.UI.modalOpen) { Main.stopSkip(); return; }
    // (l'alerte « On frappe à la porte » du jeu suffit)
    if (st.visitor && !Main.skipVisitor) { Main.stopSkip(); return; }
    Main.skipVisitor = !!st.visitor;
  }

  Main.startNew = function (ids) {
    C.Menus.close();
    G().newGame(ids);
    G().st.survivors.forEach(function (s) { C.Surv.bio(s, 'La guerre m\'a pris ma maison. Nous nous sommes réfugiés dans cette bâtisse éventrée. Je ne connais pas vraiment les autres. Il faudra apprendre à se faire confiance.'); });
    enterGame();
    Main.setSpeed(0);
    C.Menus.intro();
  };

  Main.loadState = function (state) {
    C.Menus.close();
    G().load(state);
    C.Actions.rebuildUsers();
    enterGame();
    var st = G().st;
    if (st.phase === 'over') { C.UI.showEnding(); return; }
    if (st.phase === 'night' || st.phase === 'dusk') { st.phase = 'night'; C.UI.openNight(); return; }
    Main.setSpeed(0);
    C.UI.toast('Partie chargée — jour ' + st.day + '. Appuyez sur Espace pour reprendre.', 'done');
  };

  function enterGame() {
    Main.mode = 'game';
    C.UI.show(true);
    C.UI.selected = null;
    C.UI.buildCards();
    C.UI.refreshPending();
    C.UI.refreshDoor();
    C.UI.stopPlacing();
    Main.showDuskButton(false);
    C.Render.particles = [];
    C.Render.dirty = true;
    visitorSeen = !!G().st.visitor;
    if (C.Audio.ready) C.Audio.setWeather(G().st.weather.type);
  }

  // Fondu au noir de la nuit
  function titleOut(t) { if (!t) return; t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.remove(); }, 900); }
  function showTitle(icon, title, text) {
    var old = document.querySelector('.night-title');
    if (old) old.remove();
    var t = U.el('div', 'night-title', C.Icon(icon) + '<h1>' + U.esc(title) + '</h1><p>' + U.esc(text || '') + '</p>');
    document.getElementById('app').appendChild(t);
    return t;
  }
  Main.nightFade = function (on, text) {
    var f = $('fader');
    if (on) {
      f.classList.add('on');
      showTitle('moon', 'Nuit ' + G().st.day, text);
    } else {
      f.classList.remove('on');
      titleOut(document.querySelector('.night-title'));
    }
  };
  // Fondu au noir, titre sur fond noir, puis retour (comme dans le jeu d'origine)
  // o : { icon, title, text, hold } · mid() est appelé pendant le noir
  Main.fadeThrough = function (o, mid) {
    if (Main.noFade) { if (mid) mid(); return; }
    var f = $('fader');
    f.classList.add('on');
    setTimeout(function () {
      var t = showTitle(o.icon || 'moon', o.title, o.text);
      if (mid) mid();
      setTimeout(function () { f.classList.remove('on'); titleOut(t); }, o.hold || 1600);
    }, 850);
  };
  // L'aube : écran noir (déjà là après la nuit, sinon on y fond), « Jour N »,
  // puis le rapport du matin apparaît en fondu
  Main.dawnFade = function (st, cb) {
    if (Main.noFade) { cb(); return; }
    var f = $('fader'), was = f.classList.contains('on');
    function go() {
      var W = C.World;
      showTitle('sun', 'Jour ' + st.day, (W.weatherLabel ? W.weatherLabel(st.weather.type) + ' · ' : '') + st.weather.out + ' °C' + (W.isWinter(st) ? ' · hiver' : ''));
      setTimeout(cb, 1900);
    }
    if (was) setTimeout(go, 400);
    else { f.classList.add('on'); setTimeout(go, 850); }
  };

  // Crépuscule : temps figé à 20 h pour nourrir / soigner avant la nuit
  Main.showDuskButton = function (on) {
    var b = $('dusk-btn');
    if (!b) {
      b = U.el('button', 'btn', 'Passer à la nuit →');
      b.id = 'dusk-btn';
      b.style.cssText = 'position:absolute;right:12px;bottom:22px;z-index:11;';
      b.addEventListener('click', function () {
        var st = G().st;
        st.survivors.forEach(function (s) { if (s.alive) { C.Actions.cancel(s); s.path = []; } });
        st.phase = 'night';
        Main.showDuskButton(false);
        Main.fadeThrough({ icon: 'moon', title: 'Nuit ' + st.day, text: 'La nuit tombe sur la ville.' }, function () { C.UI.openNight(); });
      });
      $('hud').appendChild(b);
    }
    b.classList.toggle('hidden', !on);
  };

  // ------------------------------------------------------------ boucle
  function loop(ts) {
    var t = ts / 1000;
    var dt = Math.min(0.1, lastT ? t - lastT : 0.016);
    lastT = t;
    var st = G().st;

    if (Main.mode === 'game' && st) {
      var env = { temp: C.World.shelterTemp(st), empath: G().present().some(function (s) { return G().hasTrait(s, 'empathique') && s.moral >= 55; }) };
      checkSkip(st);
      if (st.phase === 'day' && !C.UI.modalOpen && Main.speed > 0) {
        var gm = dt * Main.speed;
        var steps = Math.ceil(gm / 0.5);
        for (var i = 0; i < steps && st.phase === 'day'; i++) {
          var sgm = gm / steps;
          C.World.update(st, sgm);
          if (st.phase !== 'day') break;
          // Défilement : on s'arrête à l'instant où quelque chose arrive
          if (Main.skipping && (C.UI.modalOpen || (st.visitor && !Main.skipVisitor))) break;
          st.survivors.forEach(function (s) { C.Surv.update(s, sgm, env); });
        }
        workSounds(dt);
        C.Mood.ambient(dt, env);
      } else if (st.phase === 'explore') {
        if (!C.UI.modalOpen) { C.Explore.update(dt); workSounds(dt); }
      } else if (st.phase === 'dusk' && !C.UI.modalOpen) {
        st.survivors.forEach(function (s) { C.Surv.update(s, dt * 2, env); });
      }
      // Pause automatique quand on frappe
      if (st.visitor && !visitorSeen) {
        visitorSeen = true;
        if (Main.settings.autoPauseVisitor && st.phase === 'day') Main.setSpeed(0);
      }
      if (!st.visitor) visitorSeen = false;
      C.UI.tick(dt);
      if (C.UI.hintTick) C.UI.hintTick(dt);
    } else if (Main.mode === 'menu' && st) {
      st.survivors.forEach(function (s) { s.anim += dt; });
    }

    var inGame = Main.mode === 'game' && st;
    // Guitare : on la prend (ou la repose) → le décor change
    var guitarOn = !!(inGame && st.phase !== 'explore' && st.survivors.some(function (s) { return s.alive && s.act && s.act.kind === 'guitar' && s.act.phase === 'work'; }));
    if (guitarOn !== !!Main.guitarOn) { Main.guitarOn = guitarOn; if (inGame) C.Game.markDirty(); }
    musicMood(inGame ? st : null, guitarOn);
    C.Audio.update(dt, {
      guitar: guitarOn,
      fire: inGame && st.objects.some(function (o) { return o.kind === 'heater' && o.fuel > 0; }),
      radio: inGame && st.survivors.some(function (s) { return s.alive && s.act && (s.act.kind === 'news' || s.act.kind === 'music') && s.act.phase === 'work'; }),
      war: true, onShell: function () { if (C.Render.shellGlow) C.Render.shellGlow(); if (Math.random() < 0.6) C.Render.shake(2 + Math.random() * 4); } });
    C.Render.frame(dt, t);
    requestAnimationFrame(loop);
  }

  // Musique selon le moment : menu, jour (cordes en hiver), soir, exploration.
  // La guitare jouée au refuge couvre la musique ; la radio la baisse.
  function musicMood(st, guitarOn) {
    var A = C.Audio, mood = 'menu';
    if (!A.setMood) return;
    if (st) {
      if (st.phase === 'over') mood = 'sad';
      else if (st.phase === 'explore') mood = 'explore';
      else if (st.phase === 'night' || st.phase === 'dusk' || st.minute >= 18 * 60) mood = 'evening';
      else mood = C.World.isWinter(st) ? 'winter' : 'day';
    } else if (Main.mode === 'game') mood = null;
    A.setMood(mood);
    var radio = st && st.phase !== 'explore' && st.survivors.some(function (s) { return s.alive && s.act && s.act.kind === 'music' && s.act.phase === 'work'; });
    A.duckMusic(guitarOn ? 1 : radio ? 0.6 : 0);
  }

  var WORK_SOUND = { clear: 'dig', dismantle: 'saw', cut: 'saw', board: 'hammer', doorup: 'hammer', search: 'search', unlock: 'search', cook: 'cook', read: 'page' };
  function workSounds(dt) {
    if (!C.Audio.ready) return;
    workTimer -= dt;
    if (workTimer > 0) return;
    workTimer = 0.6;
    workToggle = !workToggle;
    var played = 0;
    G().present().forEach(function (s) {
      if (played >= 2 || !s.act || s.act.phase !== 'work') return;
      var k = s.act.kind, snd = WORK_SOUND[k];
      if (k === 'craft' || k === 'upgrade') snd = workToggle ? 'hammer' : 'saw';
      if (snd && C.Audio.sfx[snd] && Math.random() < 0.75) { C.Audio.sfx[snd](k === 'cut'); played++; }
    });
  }

  // ------------------------------------------------------------ entrées
  function bindInput() {
    var cv = $('game');

    function firstGesture() { C.Audio.init(); Main.applySettings(); }
    window.addEventListener('mousedown', firstGesture, { once: true });
    window.addEventListener('keydown', firstGesture, { once: true });

    cv.addEventListener('mousemove', function (e) {
      if (Main.mode !== 'game') return;
      var w = C.Render.toWorld(e.clientX, e.clientY);
      if (C.Render.placing) {
        var slot = slotAt(w);
        C.Render.hoverSlot = slot ? slot.id : null;
        return;
      }
      var hit = C.Render.pick(w.x, w.y);
      C.Render.mouse = w;
      // Mode combat : le soldat le plus proche du pointeur est la cible
      if (C.Explore && C.Explore.active && C.Explore.mode === 'combat' && !(hit && (hit.surv || (hit.obj && hit.obj.kind === 'guard')))) {
        var tg = C.Combat.guardAt(w.x, w.y);
        if (tg) hit = { obj: tg };
      }
      C.Render.hoverObj = hit && hit.obj ? hit.obj : null;
      C.Render.hoverSurv = hit && hit.surv ? hit.surv : null;
      cv.classList.toggle('pointer', !!hit);
      cv.classList.toggle('aim', !!(hit && hit.obj && hit.obj.kind === 'guard' && C.Explore && C.Explore.active && C.Explore.mode === 'combat'));
    });
    cv.addEventListener('mouseleave', function () { C.Render.hoverObj = null; C.Render.hoverSurv = null; });

    // Caméra : molette = zoom vers le curseur ; clic molette (ou clic droit) glissé = déplacer la vue
    cv.addEventListener('wheel', function (e) {
      if (Main.mode !== 'game' || C.UI.modalOpen) return;
      e.preventDefault();
      var z = C.Render.cam.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15);
      C.Render.zoomAt(e.clientX, e.clientY, z < 1.04 ? 1 : z);
      var sel = C.UI.selectedSurv && C.UI.selectedSurv();
      if (C.Explore && C.Explore.active && sel) C.Render.cam.follow = sel.id;
    }, { passive: false });
    var drag = null;
    cv.addEventListener('mousedown', function (e) {
      if (Main.mode !== 'game' || (e.button !== 1 && e.button !== 2) || C.Render.cam.z <= 1.001) return;
      e.preventDefault();
      drag = { x: e.clientX, y: e.clientY, moved: false };
    });
    window.addEventListener('mousemove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      drag.x = e.clientX; drag.y = e.clientY;
      if (drag.moved) C.Render.panBy(dx, dy);
    });
    window.addEventListener('mouseup', function () { if (drag && drag.moved) Main.dragJustEnded = true; drag = null; setTimeout(function () { Main.dragJustEnded = false; }, 0); });

    cv.addEventListener('mousedown', function (e) {
      if (Main.mode !== 'game' || e.button !== 0) return;
      var st = G().st;
      if (st.phase !== 'day' && st.phase !== 'dusk' && st.phase !== 'explore') return;
      var w = C.Render.toWorld(e.clientX, e.clientY);
      if (C.Render.placing) {
        var slot = slotAt(w);
        if (slot) C.UI.placeAt(slot);
        return;
      }
      var wasOpen = C.UI.contextOpen();
      C.UI.closeContext();
      var hit = C.Render.pick(w.x, w.y);
      if (hit && hit.surv) {
        var cur = C.UI.selectedSurv();
        if (cur && cur.id !== hit.surv.id) { C.UI.openSurvMenu(cur, hit.surv, e.clientX, e.clientY); return; }
        C.UI.select(hit.surv.id);
        if (C.Audio.ready) C.Audio.sfx.click();
        return;
      }
      // Mode combat : un clic sur (ou tout près d') un soldat l'attaque directement
      if (st.phase === 'explore' && C.Explore.mode === 'combat') {
        var tg = hit && hit.obj && hit.obj.kind === 'guard' ? hit.obj : C.Combat.guardAt(w.x, w.y);
        var fighter = C.UI.selectedSurv();
        if (tg && fighter) { C.Combat.quickAttack(fighter, tg, e.clientX, e.clientY); return; }
      }
      if (hit && hit.obj) {
        if (st.phase === 'dusk' && hit.obj.kind !== 'stock') {
          var who = C.UI.selectedSurv();
          if (who) C.Render.pop(who, [], 'Trop tard, il fait nuit.', 'warn');
          else C.UI.toast('Il fait nuit : seules les actions personnelles sont possibles.', 'info');
          return;
        }
        C.UI.openContext(hit.obj, e.clientX, e.clientY);
        return;
      }
      if (wasOpen) return;
      var s = C.UI.selectedSurv();
      var f = C.Render.floorAt(w.x, w.y);
      if (s && f != null && (st.phase === 'day' || st.phase === 'explore')) {
        C.Actions.moveTo(s, f, U.clamp(w.x, C.WORLD.walkMin, C.WORLD.walkMax));
        // Exploration : double-clic = courir (plus vite, mais bruyant)
        if (st.phase === 'explore') s.run = e.detail >= 2;
      }
    });

    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (Main.dragJustEnded) return;
      if (C.Render.placing) { C.UI.stopPlacing(); return; }
      C.UI.closeContext();
    });

    window.addEventListener('keydown', function (e) {
      if (Main.mode !== 'game') {
        if (e.key === 'Escape' && C.UI.topModal()) closeTopIfAllowed();
        return;
      }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      var st = G().st;
      switch (e.key) {
        case 'Escape':
          if (C.Render.placing) { C.UI.stopPlacing(); break; }
          if (C.UI.contextOpen()) { C.UI.closeContext(); break; }
          if (C.UI.topModal()) { closeTopIfAllowed(); break; }
          C.UI.openPause();
          break;
        case ' ':
          e.preventDefault();
          if (C.UI.modalOpen || (st.phase !== 'day' && st.phase !== 'explore')) break;
          Main.setSpeed(Main.speed > 0 ? 0 : Main.lastSpeed);
          break;
        case '1': if (!C.UI.modalOpen) Main.setSpeed(1); break;
        case '2': if (!C.UI.modalOpen) Main.setSpeed(2); break;
        case '3': if (!C.UI.modalOpen) Main.setSpeed(4); break;
        case 'Tab': e.preventDefault(); if (!C.UI.modalOpen) C.UI.cycle(e.shiftKey ? -1 : 1); break;
        case 'i': case 'I': if (!C.UI.modalOpen) C.UI.openStock(); break;
        case 'j': case 'J': if (!C.UI.modalOpen) C.UI.openLog(); break;
        case 'n': case 'N': if (!C.UI.modalOpen && st.phase === 'day') { if (Main.skipping) Main.stopSkip(); else Main.skipDay(); } break;
        case 'c': case 'C': if (!C.UI.modalOpen && st.phase === 'explore') C.Combat.toggleMode(); break;
        // Z : rapprocher la caméra du survivant choisi / revenir à la vue d'ensemble
        case 'z': case 'Z':
          if (C.UI.modalOpen) break;
          var zs = C.UI.selectedSurv && C.UI.selectedSurv();
          if (C.Render.cam.z > 1.05) C.Render.camReset();
          else if (zs) C.Render.camFollow(zs, 1.8);
          break;
        case 'a': case 'A': if (!C.UI.modalOpen && st.phase === 'explore') C.Combat.cycleWeapon(); break;
      }
    });
  }

  function closeTopIfAllowed() {
    var top = C.UI.topModal();
    if (top && top.el.querySelector('.panel-head .x-btn')) C.UI.closeModal();
  }

  function slotAt(w) {
    var type = C.Render.placing;
    var b = C.BUILDINGS[type];
    var list = C.UI.freeSlots(type);
    for (var i = 0; i < list.length; i++) {
      var sl = list[i], fy = C.FLOORS[sl.f].y;
      if (Math.abs(w.x - sl.x) <= sl.w / 2 && w.y >= fy - b.h - 14 && w.y <= fy + 4) return sl;
    }
    return null;
  }

  window.addEventListener('load', Main.init);
})(window.CQR);
