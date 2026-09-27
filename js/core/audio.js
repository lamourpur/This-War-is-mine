/* =========================================================
   Audio entièrement synthétisé (Web Audio) — aucun fichier
   Ambiance : vent, pluie, tirs et obus lointains
   Musique  : piano mélancolique génératif
   Effets   : clics, coups à la porte, outils, cuisine…
   ========================================================= */
(function (C) {
  'use strict';

  var A = {
    ctx: null, ready: false,
    vol: { master: 0.8, music: 0.5, sfx: 0.7, ambience: 0.6 },
    nodes: {}, rain: 0, musicOn: false, nextNote: 0, nextShell: 0, nextGun: 0, workTimer: 0
  };

  function noiseBuffer(ctx, seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;          // bruit brun (grave)
      d[i] = last * 3.5 * 0.6 + w * 0.4 * 0.25;
    }
    return buf;
  }
  function whiteBuffer(ctx, seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function impulse(ctx, seconds, decay) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx = A.ctx = new AC();
    var n = A.nodes;
    n.master = ctx.createGain();
    n.master.connect(ctx.destination);
    n.music = ctx.createGain(); n.sfx = ctx.createGain(); n.amb = ctx.createGain();
    n.music.connect(n.master); n.sfx.connect(n.master); n.amb.connect(n.master);

    // Réverbération partagée
    n.verb = ctx.createConvolver();
    n.verb.buffer = impulse(ctx, 3.2, 2.6);
    n.verbGain = ctx.createGain(); n.verbGain.gain.value = 0.35;
    n.verb.connect(n.verbGain); n.verbGain.connect(n.master);

    A.brown = noiseBuffer(ctx, 4);
    A.white = whiteBuffer(ctx, 2);

    // Vent : bruit brun filtré, fréquence modulée par un LFO lent
    var wind = ctx.createBufferSource(); wind.buffer = A.brown; wind.loop = true;
    var wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 380; wf.Q.value = 0.8;
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    var lfoG = ctx.createGain(); lfoG.gain.value = 220;
    lfo.connect(lfoG); lfoG.connect(wf.frequency);
    var wg = ctx.createGain(); wg.gain.value = 0.22;
    var lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.043;
    var lfo2G = ctx.createGain(); lfo2G.gain.value = 0.1;
    lfo2.connect(lfo2G); lfo2G.connect(wg.gain);
    wind.connect(wf); wf.connect(wg); wg.connect(n.amb);
    wind.start(); lfo.start(); lfo2.start();
    n.windGain = wg; n.windLfo = lfo2G;

    // Pluie : bruit blanc passe-haut
    var rain = ctx.createBufferSource(); rain.buffer = A.white; rain.loop = true;
    var rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2200;
    var rf2 = ctx.createBiquadFilter(); rf2.type = 'lowpass'; rf2.frequency.value = 7000;
    var rg = ctx.createGain(); rg.gain.value = 0;
    rain.connect(rf); rf.connect(rf2); rf2.connect(rg); rg.connect(n.amb);
    rain.start();
    n.rainGain = rg;

    A.ready = true;
    A.applyVolumes();
    A.loadFiles();
  };

  // ============================================================ sons enregistrés
  // Fichiers CC0 (Freesound) dans assets/sounds. Deux modes :
  //  - Web Audio (décodage) quand la page est servie en http(s) ;
  //  - éléments <audio> en secours (ouverture du jeu en file://, où le
  //    décodage est bloqué par le navigateur).
  // Tant qu'un fichier n'est pas prêt, le son synthétique d'origine est joué.
  var FILES = ['wind', 'wind_cold', 'rain_inside', 'fire', 'static', 'boom1', 'boom2', 'boom3', 'firefight', 'burst', 'shot', 'smg',
    'knock', 'hammer', 'saw_metal', 'saw_wood', 'rubble', 'rummage', 'sizzle', 'page'];
  A.files = {};
  A.loops = {};

  A.loadFiles = function () {
    FILES.forEach(function (n) {
      var url = 'assets/sounds/' + n + '.mp3';
      var fallback = function () {
        var el = new Audio(url);
        el.preload = 'auto';
        el.addEventListener('canplaythrough', function () { if (!A.files[n]) { A.files[n] = { el: el, dur: el.duration }; A.refreshLoops(); } }, { once: true });
      };
      if (location.protocol === 'file:' || !window.fetch) { fallback(); return; }
      fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (ab) { return new Promise(function (res, rej) { A.ctx.decodeAudioData(ab, res, rej); }); })
        .then(function (buf) { A.files[n] = { buf: buf, dur: buf.duration }; A.refreshLoops(); })
        .catch(fallback);
    });
  };
  A.has = function (n) { return !!A.files[n]; };

  function busLevel(bus) {
    var v = A.vol.master * ({ sfx: A.vol.sfx, amb: A.vol.ambience, music: A.vol.music * 0.55 }[bus] || 1);
    return v;
  }

  // Joue un fichier (ou un extrait) : o.gain, o.bus ('sfx' | 'amb'), o.offset, o.dur, o.rate, o.verb, o.lowpass
  A.play = function (n, o) {
    var f = A.files[n];
    if (!f || !A.ready) return false;
    o = o || {};
    var dur = o.dur || f.dur, off = o.offset != null ? o.offset : 0;
    if (off + dur > f.dur) off = Math.max(0, f.dur - dur);
    var gain = o.gain != null ? o.gain : 0.5, bus = o.bus || 'sfx';
    if (f.buf) {
      var ctx = A.ctx, t = ctx.currentTime;
      var src = ctx.createBufferSource(); src.buffer = f.buf; src.playbackRate.value = o.rate || 1;
      var g = ctx.createGain();
      var fade = Math.min(0.08, dur / 4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(gain, t + fade);
      g.gain.setValueAtTime(gain, t + dur - fade);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      var last = g;
      if (o.lowpass) { var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lowpass; g.connect(lp); last = lp; }
      src.connect(g);
      last.connect(bus === 'amb' ? A.nodes.amb : A.nodes.sfx);
      if (o.verb) last.connect(A.nodes.verb);
      src.start(t, off, dur + 0.05);
      return true;
    }
    // Secours <audio>
    var el = f.el.cloneNode();
    el.volume = Math.max(0, Math.min(1, gain * busLevel(bus)));
    el.playbackRate = o.rate || 1;
    try { el.currentTime = off; } catch (e) { /* métadonnées pas prêtes */ }
    var pr = el.play(); if (pr && pr.catch) pr.catch(function () {});
    if (o.dur) setTimeout(function () { el.pause(); }, dur * 1000 / (o.rate || 1));
    return true;
  };
  // Extrait aléatoire d'un fichier long (bruits de travail)
  A.slice = function (n, dur, gain, o) {
    var f = A.files[n];
    if (!f) return false;
    o = o || {};
    o.offset = Math.random() * Math.max(0, f.dur - dur);
    o.dur = dur; o.gain = gain;
    return A.play(n, o);
  };

  // Boucles d'ambiance (volume cible, fondu)
  A.loop = function (n, target, bus) {
    var f = A.files[n];
    var L = A.loops[n];
    if (!L) {
      if (!f || !A.ready) return false;
      L = A.loops[n] = { bus: bus || 'amb', target: 0 };
      if (f.buf) {
        var src = A.ctx.createBufferSource(); src.buffer = f.buf; src.loop = true;
        L.g = A.ctx.createGain(); L.g.gain.value = 0;
        src.connect(L.g); L.g.connect(L.bus === 'amb' ? A.nodes.amb : A.nodes.sfx);
        src.start(0, Math.random() * f.dur);
      } else {
        L.el = f.el.cloneNode(); L.el.loop = true; L.el.volume = 0;
        var pr = L.el.play(); if (pr && pr.catch) pr.catch(function () {});
      }
    }
    L.target = target;
    if (L.g) L.g.gain.setTargetAtTime(target, A.ctx.currentTime, 1.2);
    return true;
  };
  // Fondu des boucles jouées par <audio> (appelé à chaque image)
  function stepLoops(dt) {
    for (var n in A.loops) {
      var L = A.loops[n];
      if (!L.el) continue;
      var want = Math.max(0, Math.min(1, L.target * busLevel(L.bus)));
      L.el.volume += (want - L.el.volume) * Math.min(1, dt * 1.5);
    }
  }
  A.refreshLoops = function () { if (A.weather) A.setWeather(A.weather); };

  A.applyVolumes = function () {
    if (!A.ready) return;
    var n = A.nodes, t = A.ctx.currentTime;
    n.master.gain.setTargetAtTime(A.vol.master, t, 0.05);
    n.music.gain.setTargetAtTime(A.vol.music * 0.55, t, 0.05);
    n.sfx.gain.setTargetAtTime(A.vol.sfx, t, 0.05);
    n.amb.gain.setTargetAtTime(A.vol.ambience, t, 0.05);
  };

  A.setWeather = function (type, indoors) {
    A.weather = type;
    if (!A.ready) return;
    var t = A.ctx.currentTime;
    // Enregistrements si disponibles, sinon synthèse
    var recWind = A.has('wind') && A.has('wind_cold'), recRain = A.has('rain_inside');
    if (recWind) {
      A.loop('wind', type === 'neige' ? 0.12 : 0.34);
      A.loop('wind_cold', type === 'neige' ? 0.42 : 0.0);
    }
    if (recRain) A.loop('rain_inside', type === 'pluie' ? 0.55 : 0);
    A.nodes.rainGain.gain.setTargetAtTime(recRain ? 0 : (type === 'pluie' ? 0.09 : 0), t, 1.5);
    A.nodes.windGain.gain.setTargetAtTime(recWind ? 0.03 : (type === 'neige' ? 0.34 : 0.2), t, 2);
    A.nodes.windLfo.gain.setTargetAtTime(recWind ? 0.01 : 0.1, t, 2);
  };

  // --- Petits générateurs de sons
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function burst(opts) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime + (opts.delay || 0);
    var src = ctx.createBufferSource(); src.buffer = opts.brown ? A.brown : A.white;
    src.playbackRate.value = opts.rate || 1;
    var f = ctx.createBiquadFilter(); f.type = opts.type || 'lowpass'; f.frequency.value = opts.freq || 800; f.Q.value = opts.q || 0.7;
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + opts.dur);
    var g = ctx.createGain();
    env(g, t, opts.attack || 0.005, opts.gain || 0.3, opts.dur || 0.2);
    src.connect(f); f.connect(g); g.connect(opts.bus || A.nodes.sfx);
    if (opts.verb) g.connect(A.nodes.verb);
    src.start(t, Math.random() * 1.5); src.stop(t + (opts.attack || 0.005) + (opts.dur || 0.2) + 0.05);
  }
  function tone(opts) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime + (opts.delay || 0);
    var o = ctx.createOscillator(); o.type = opts.wave || 'sine'; o.frequency.setValueAtTime(opts.freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + opts.dur);
    var g = ctx.createGain();
    env(g, t, opts.attack || 0.005, opts.gain || 0.2, opts.dur || 0.2);
    o.connect(g); g.connect(opts.bus || A.nodes.sfx);
    if (opts.verb) g.connect(A.nodes.verb);
    o.start(t); o.stop(t + (opts.attack || 0.005) + opts.dur + 0.05);
  }

  A.sfx = {
    click: function () { tone({ freq: 520, slide: 380, dur: 0.05, gain: 0.05, wave: 'triangle' }); },
    hover: function () { tone({ freq: 900, dur: 0.02, gain: 0.015, wave: 'sine' }); },
    open: function () { burst({ freq: 1400, type: 'bandpass', dur: 0.12, gain: 0.08, sweep: 600 }); },
    pickup: function () { tone({ freq: 440, slide: 660, dur: 0.09, gain: 0.07, wave: 'triangle' }); },
    deny: function () { tone({ freq: 180, dur: 0.14, gain: 0.08, wave: 'square' }); },
    knock: function () {
      if (A.play('knock', { gain: 0.9, verb: true })) return;
      for (var i = 0; i < 3; i++) {
        burst({ brown: true, freq: 260, dur: 0.12, gain: 0.7, delay: i * 0.28, verb: true });
        tone({ freq: 95, slide: 70, dur: 0.1, gain: 0.25, delay: i * 0.28 });
      }
    },
    hammer: function () {
      if (A.slice('hammer', 0.45, 0.35)) return;
      burst({ freq: 2600, type: 'bandpass', q: 3, dur: 0.06, gain: 0.12 });
      tone({ freq: 160, slide: 90, dur: 0.07, gain: 0.12 });
    },
    saw: function (metal) { if (A.slice(metal ? 'saw_metal' : 'saw_wood', 0.6, 0.28)) return; burst({ freq: 1800, type: 'bandpass', q: 4, dur: 0.22, gain: 0.05, sweep: 2600, attack: 0.04 }); },
    dig: function () { if (A.slice('rubble', 0.7, 0.4)) return; burst({ brown: true, freq: 700, dur: 0.18, gain: 0.3, attack: 0.02 }); },
    cook: function () { if (A.slice('sizzle', 0.7, 0.18)) return; burst({ freq: 5000, type: 'highpass', dur: 0.35, gain: 0.03, attack: 0.08 }); },
    search: function () { if (A.slice('rummage', 0.7, 0.4)) return; burst({ freq: 1200, type: 'bandpass', dur: 0.14, gain: 0.05, attack: 0.02 }); },
    step: function () { burst({ brown: true, freq: 300, dur: 0.05, gain: 0.08 }); },
    page: function () { if (A.play('page', { gain: 0.3, dur: Math.min(1.2, A.files.page ? A.files.page.dur : 1) })) return; burst({ freq: 3000, type: 'bandpass', dur: 0.15, gain: 0.03, attack: 0.04, sweep: 1500 }); },
    alert: function () {
      tone({ freq: 330, dur: 0.5, gain: 0.08, wave: 'triangle', verb: true });
      tone({ freq: 311, dur: 0.6, gain: 0.06, wave: 'triangle', delay: 0.18, verb: true });
    },
    death: function () {
      [220, 207, 185, 147].forEach(function (f, i) { tone({ freq: f, dur: 1.6, gain: 0.06, wave: 'sine', delay: i * 0.5, bus: A.nodes.music, verb: true }); });
    },
    shell: function (dist) {
      var g = 0.5 * (dist || 1);
      var bn = ['boom1', 'boom2', 'boom3'][Math.floor(Math.random() * 3)];
      if (A.play(bn, { bus: 'amb', gain: 0.35 + 0.65 * (dist || 1), rate: 0.9 + Math.random() * 0.2, lowpass: 900 + 2200 * (dist || 1), verb: true })) {
        // grondement grave en renfort, perçu à travers les murs
        tone({ freq: 50, slide: 30, dur: 1.2, gain: g * 0.35, bus: A.nodes.amb });
        return;
      }
      burst({ brown: true, freq: 140, dur: 2.2, gain: g, attack: 0.01, verb: true, bus: A.nodes.amb });
      tone({ freq: 55, slide: 30, dur: 1.2, gain: g * 0.5, bus: A.nodes.amb });
    },
    gun: function () {
      var gn = ['burst', 'shot', 'smg', 'firefight'][Math.floor(Math.random() * 4)];
      var gf = A.files[gn];
      if (gf && A.play(gn, { bus: 'amb', gain: 0.25 + Math.random() * 0.2, lowpass: 1600, verb: true,
        offset: gf.dur > 6 ? Math.random() * (gf.dur - 5) : 0, dur: gf.dur > 6 ? 3 + Math.random() * 2 : undefined })) return;
      var n =1 + Math.floor(Math.random() * 6), gap = 0.08 + Math.random() * 0.12;
      for (var i = 0; i < n; i++) burst({ freq: 900, type: 'lowpass', dur: 0.09, gain: 0.08 + Math.random() * 0.06, delay: i * gap + Math.random() * 0.03, verb: true, bus: A.nodes.amb });
    },
    // Coup de feu tout proche (combat en exploration)
    shot: function () {
      if (A.play('shot', { gain: 0.6, dur: 0.9, rate: 0.95 + Math.random() * 0.1 })) return;
      burst({ freq: 1400, type: 'lowpass', dur: 0.16, gain: 0.35, attack: 0.002, verb: true });
      tone({ freq: 90, slide: 40, dur: 0.25, gain: 0.2 });
    },
    hit: function () { burst({ brown: true, freq: 380, dur: 0.12, gain: 0.35, attack: 0.005 }); },
    victory: function () {
      [0, 4, 7, 12].forEach(function (s, i) { A.note(62 + s, 3, i * 0.35, 0.12); });
    }
  };

  // Note de piano synthétique (numéro MIDI)
  A.note = function (midi, dur, delay, gain) {
    if (!A.ready) return;
    var ctx = A.ctx, t = ctx.currentTime + (delay || 0);
    var f = 440 * Math.pow(2, (midi - 69) / 12);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
    [1, 2, 3].forEach(function (h, i) {
      var o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = f * h * (1 + (Math.random() - 0.5) * 0.002);
      var hg = ctx.createGain(); hg.gain.value = [1, 0.35, 0.12][i];
      o.connect(hg); hg.connect(lp);
      o.start(t); o.stop(t + dur + 0.1);
    });
    lp.connect(g); g.connect(A.nodes.music); g.connect(A.nodes.verb);
  };

  // Ré mineur, mélodie éparse et lente
  var SCALE = [50, 53, 55, 57, 58, 60, 62, 65, 67, 69, 70, 72];
  var CHORDS = [[38, 50, 57], [34, 46, 53], [36, 48, 55], [33, 45, 52]];
  var chordIdx = 0, melodyPos = 6;

  A.update = function (dt, opts) {
    if (!A.ready) return;
    var now = A.ctx.currentTime;
    // Crépitement du chauffage, grésillement de la radio écoutée
    if (opts) {
      if (A.has('fire')) A.loop('fire', opts.fire ? 0.22 : 0, 'amb');
      if (A.has('static')) A.loop('static', opts.radio ? 0.12 : 0, 'amb');
    }
    stepLoops(dt);
    // Musique
    if (A.musicOn) {
      if (now >= A.nextNote) {
        if (Math.random() < 0.28) {
          chordIdx = (chordIdx + (Math.random() < 0.6 ? 1 : 0)) % CHORDS.length;
          CHORDS[chordIdx].forEach(function (m, i) { A.note(m, 5, i * 0.06, 0.05); });
        }
        melodyPos = C.util.clamp(melodyPos + Math.floor(Math.random() * 5) - 2, 0, SCALE.length - 1);
        A.note(SCALE[melodyPos], 3.5, 0, 0.07 + Math.random() * 0.04);
        if (Math.random() < 0.25) A.note(SCALE[C.util.clamp(melodyPos - 2, 0, SCALE.length - 1)], 3, 0.4, 0.04);
        A.nextNote = now + 1.4 + Math.random() * 2.6 + (Math.random() < 0.15 ? 4 : 0);
      }
    }
    // Guerre lointaine
    if (opts && opts.war) {
      if (now >= A.nextShell) {
        if (A.nextShell) { A.sfx.shell(0.3 + Math.random() * 0.7); if (opts.onShell) opts.onShell(); }
        A.nextShell = now + 18 + Math.random() * 40;
      }
      if (now >= A.nextGun) {
        if (A.nextGun) A.sfx.gun();
        A.nextGun = now + 6 + Math.random() * 22;
      }
    }
  };

  A.setMusic = function (on) {
    A.musicOn = on;
    if (on && A.ready) A.nextNote = A.ctx.currentTime + 0.5;
  };

  C.Audio = A;
})(window.CQR);
