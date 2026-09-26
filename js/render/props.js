/* =========================================================
   Objets détourés (rendus Poly Haven, CC0)
   Chaque image est préparée une fois : version désaturée dans les
   tons du jeu + silhouette noire qui sert de contour « crayon ».
   Si une image manque, C.Props.draw renvoie false et l'appelant
   garde son dessin procédural.
   ========================================================= */
(function (C) {
  'use strict';

  var NAMES = ['can_rusted', 'russian_food_cans_01', 'wooden_crate_02', 'old_military_crate', 'metal_jerrycan',
    'cardboard_box_01', 'cement_bag', 'trashbag', 'old_tyre', 'metal_trash_can', 'barrel_stove', 'vintage_suitcase',
    'plastic_crate_01', 'wine_bottles_01', 'medical_box', 'ammo_box', 'wooden_bucket_01', 'plastic_bottle_gallon',
    'steel_frame_shelves_01', 'worn_metal_rack', 'old_gas_mask', 'wooden_broom',
    'propane_tank', 'compost_bags', 'wooden_barrels_01',
    'vintage_radio_transceiver', 'ArmChair_01', 'metal_tool_chest', 'Television_01', 'wooden_stool_01',
    'wooden_ladder', 'rusted_wheel_rim_01', 'vintage_oil_lamp'];
  var TONE = 'grayscale(0.72) sepia(0.2) contrast(1.05) brightness(0.74)';

  var P = C.Props = { ready: false, enabled: true, img: {} };

  P.load = function (done) {
    var left = NAMES.length;
    NAMES.forEach(function (n) {
      var im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight;
        var tone = document.createElement('canvas'); tone.width = w; tone.height = h;
        var tx = tone.getContext('2d'); tx.filter = TONE; tx.drawImage(im, 0, 0);
        // Voile couleur papier : ramène noirs et blancs vers les tons moyens du décor
        tx.filter = 'none';
        tx.globalCompositeOperation = 'source-atop';
        tx.globalAlpha = 0.2; tx.fillStyle = '#7d766a'; tx.fillRect(0, 0, w, h);
        tx.globalAlpha = 1; tx.globalCompositeOperation = 'source-over';
        var sil = document.createElement('canvas'); sil.width = w; sil.height = h;
        var sx = sil.getContext('2d'); sx.filter = 'brightness(0)'; sx.drawImage(im, 0, 0);
        P.img[n] = { tone: tone, sil: sil, w: w, h: h };
        if (--left === 0) finish();
      };
      im.onerror = function () { if (--left === 0) finish(); };
      im.src = 'assets/props/' + n + '.png';
    });
    function finish() { P.ready = true; if (done) done(); }
  };

  P.has = function (n) { return P.enabled && !!P.img[n]; };
  P.aspect = function (n) { var a = P.img[n]; return a ? a.w / a.h : 1; };

  // Dessine l'objet n posé au sol : centre x, base y, hauteur h (unités du monde)
  //   o.maxW : largeur maximale (l'objet est réduit pour tenir)
  //   o.flip : miroir horizontal · o.shade : assombrissement 0..1 · o.alpha
  // Renvoie la largeur dessinée, ou 0 si l'image n'est pas disponible.
  P.draw = function (ctx, n, x, y, h, o) {
    var a = P.img[n];
    if (!P.enabled || !a) return 0;
    o = o || {};
    var w = h * a.w / a.h;
    if (o.maxW && w > o.maxW) { h *= o.maxW / w; w = o.maxW; }
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    if (o.rot) ctx.rotate(o.rot);
    // Ombre de contact au sol
    if (!o.noShadow && !(C.Sketch && C.Sketch.noStain)) {
      ctx.save(); ctx.scale(1, 0.2);
      var g = ctx.createRadialGradient(0, 0, 1, 0, 0, w * 0.62);
      g.addColorStop(0, 'rgba(10,9,8,0.45)'); g.addColorStop(1, 'rgba(10,9,8,0)');
      ctx.fillStyle = g; ctx.fillRect(-w * 0.7, -w * 0.7, w * 1.4, w * 1.4);
      ctx.restore();
    }
    ctx.globalAlpha = o.alpha != null ? o.alpha : 1;
    // Contour : silhouette noire décalée dans 8 directions
    var d = o.line != null ? o.line : 0.9;
    for (var i = 0; i < 8; i++) {
      var an = i / 8 * Math.PI * 2;
      ctx.drawImage(a.sil, -w / 2 + Math.cos(an) * d, -h + Math.sin(an) * d, w, h);
    }
    ctx.drawImage(a.tone, -w / 2, -h, w, h);
    if (o.shade) { ctx.globalAlpha = o.shade; ctx.drawImage(a.sil, -w / 2, -h, w, h); }
    ctx.restore();
    return w;
  };
})(window.CQR);
