/* =========================================================
   Sauvegardes
   - Emplacement 0 : sauvegarde automatique (à chaque aube)
   - Emplacements 1 à 3 : sauvegardes manuelles
   - Export / import de fichiers .sav sur le disque
   ========================================================= */
(function (C) {
  'use strict';

  var PREFIX = 'cqr_save_';
  var SETTINGS_KEY = 'cqr_settings';
  var FORMAT = 'CQR-SAVE';
  var VERSION = 1;

  function storageGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function storageDel(k) { try { window.localStorage.removeItem(k); } catch (e) { /* rien */ } }

  function pack(state) {
    state.rngS = C.R.s;
    return {
      format: FORMAT, version: VERSION,
      savedAt: Date.now(),
      meta: {
        day: state.day,
        clock: C.util.fmtClock(state.minute),
        names: state.survivors.filter(function (s) { return s.alive; }).map(function (s) { return s.name.split(' ')[0]; }),
        winter: C.World ? C.World.isWinter(state) : false
      },
      state: state
    };
  }

  function valid(data) {
    return data && data.format === FORMAT && data.state && typeof data.state.day === 'number';
  }

  C.Save = {
    SLOTS: [1, 2, 3],

    write: function (slot, state) {
      var data = pack(state);
      var ok = storageSet(PREFIX + slot, JSON.stringify(data));
      return ok;
    },

    read: function (slot) {
      var raw = storageGet(PREFIX + slot);
      if (!raw) return null;
      try {
        var data = JSON.parse(raw);
        return valid(data) ? data : null;
      } catch (e) { return null; }
    },

    remove: function (slot) { storageDel(PREFIX + slot); },

    // Liste des sauvegardes existantes, la plus récente d'abord
    list: function () {
      var out = [];
      [0, 1, 2, 3].forEach(function (slot) {
        var d = C.Save.read(slot);
        if (d) out.push({ slot: slot, data: d });
      });
      return out;
    },

    latest: function () {
      var l = C.Save.list();
      l.sort(function (a, b) { return b.data.savedAt - a.data.savedAt; });
      return l[0] || null;
    },

    exportFile: function (state) {
      var data = pack(state);
      var blob = new Blob([JSON.stringify(data)], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'ceux-qui-restent_jour' + state.day + '_' + new Date().toISOString().slice(0, 10) + '.sav';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },

    importFile: function (file, cb) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!valid(data)) return cb('Ce fichier n\'est pas une sauvegarde valide de Ceux Qui Restent.');
          cb(null, data);
        } catch (e) { cb('Fichier illisible ou corrompu.'); }
      };
      reader.onerror = function () { cb('Impossible de lire le fichier.'); };
      reader.readAsText(file);
    },

    loadSettings: function () {
      var def = { master: 0.8, music: 0.5, sfx: 0.7, ambience: 0.6, grain: true, autoPauseVisitor: true };
      var raw = storageGet(SETTINGS_KEY);
      if (raw) { try { var s = JSON.parse(raw); for (var k in s) def[k] = s[k]; } catch (e) { /* défaut */ } }
      return def;
    },
    saveSettings: function (s) { storageSet(SETTINGS_KEY, JSON.stringify(s)); }
  };
})(window.CQR);
