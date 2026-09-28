/* =========================================================
   Textures photographiques (Poly Haven, CC0)
   Chargées au démarrage, désaturées dans les tons du jeu, puis
   « peintes » à l'intérieur des contours dessinés au crayon.
   Si une image manque, le dessin reste simplement à plat.
   ========================================================= */
(function (C) {
  'use strict';

  var LIST = {
    wallpaper: 'decrepit_wallpaper', peeling: 'peeling_painted_wall', plaster: 'worn_cracked_plaster',
    plaster2: 'damaged_plaster', brick: 'broken_brick_wall', brickPlaster: 'red_brick_plaster_patch_02',
    rubble: 'rubble', debris: 'concrete_debris', floor: 'old_wooden_floor_02', planks: 'weathered_planks',
    planks2: 'worn_planks', rust: 'rusty_metal_sheet', cabinet: 'wood_cabinet_worn_long',
    // Lieux industriels et extérieurs
    corrugated: 'rusty_corrugated_iron', corrugated2: 'corrugated_iron_02', factory: 'factory_wall',
    hangarFloor: 'hangar_concrete_floor', concrete: 'dirty_concrete', grate: 'metal_grate_rusty',
    shutter: 'rusty_metal_shutter', asphalt: 'road_damaged', factoryBrick: 'factory_brick',
    precast: 'precast_concrete_wall', paintedConcrete: 'painted_concrete', tiles: 'dirty_tiles', plate: 'metal_plate',
    // Tissus (baluchon, sacs)
    cloth: 'gingham_check', hessian: 'hessian_230'
  };
  // Réglages de couleur : tout reste dans la palette « crayon » grise et terreuse
  var FILTER = {
    brick: 'grayscale(0.55) sepia(0.2) contrast(1.15) brightness(0.95)',
    brickPlaster: 'grayscale(0.55) sepia(0.2) contrast(1.1)',
    rust: 'grayscale(0.55) sepia(0.25) contrast(1.15)',
    planks2: 'grayscale(0.6) sepia(0.25) contrast(1.1)',
    corrugated: 'grayscale(0.6) sepia(0.25) contrast(1.15)', shutter: 'grayscale(0.6) sepia(0.25) contrast(1.15)',
    factoryBrick: 'grayscale(0.6) sepia(0.2) contrast(1.1)',
    paintedConcrete: 'grayscale(1) sepia(0.15) contrast(1.05) brightness(1.05)', grate: 'grayscale(0.6) sepia(0.25) contrast(1.2)',
    cloth: 'grayscale(0.55) sepia(0.35) contrast(1.1) brightness(0.95)', hessian: 'grayscale(0.5) sepia(0.3) contrast(1.1)',
    _: 'grayscale(0.8) sepia(0.12) contrast(1.15)'
  };
  var SIZE = 512;

  var T = C.Tex = { ready: false, enabled: true, src: {}, pat: {} };

  T.load = function (done) {
    var names = Object.keys(LIST), left = names.length;
    names.forEach(function (k) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = c.height = SIZE;
        var x = c.getContext('2d');
        x.filter = FILTER[k] || FILTER._;
        x.drawImage(img, 0, 0, SIZE, SIZE);
        T.src[k] = c;
        if (--left === 0) finish();
      };
      img.onerror = function () { if (--left === 0) finish(); };
      img.src = 'assets/textures/' + LIST[k] + '.jpg';
    });
    function finish() { T.ready = true; if (done) done(); }
  };

  function pattern(ctx, k) {
    if (!T.pat[k] && T.src[k]) T.pat[k] = ctx.createPattern(T.src[k], 'repeat');
    return T.pat[k];
  }

  // Peint la texture k dans une forme :
  //   shape : [[x,y],…] (polygone) ou {x,y,w,h}
  //   o.tile : taille d'un motif en unités du monde (défaut 160)
  //   o.alpha, o.blend ('overlay' | 'multiply' | 'soft-light'…), o.rot (radians), o.ox/o.oy (décalage)
  T.paint = function (ctx, shape, k, o) {
    if (!T.enabled || !T.ready) return;
    var p = pattern(ctx, k);
    if (!p) return;
    o = o || {};
    var tile = o.tile || 160, s = tile / SIZE;
    var m = new DOMMatrix();
    m = m.translate(o.ox || 0, o.oy || 0).rotate((o.rot || 0) * 180 / Math.PI).scale(s, s);
    p.setTransform(m);
    ctx.save();
    ctx.beginPath();
    var minx, miny, maxx, maxy;
    if (Array.isArray(shape)) {
      minx = miny = Infinity; maxx = maxy = -Infinity;
      shape.forEach(function (pt, i) {
        if (i === 0) ctx.moveTo(pt[0], pt[1]); else ctx.lineTo(pt[0], pt[1]);
        minx = Math.min(minx, pt[0]); miny = Math.min(miny, pt[1]); maxx = Math.max(maxx, pt[0]); maxy = Math.max(maxy, pt[1]);
      });
      ctx.closePath();
    } else {
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
      minx = shape.x; miny = shape.y; maxx = shape.x + shape.w; maxy = shape.y + shape.h;
    }
    ctx.clip();
    ctx.globalCompositeOperation = o.blend || 'overlay';
    ctx.globalAlpha = o.alpha != null ? o.alpha : 0.7;
    ctx.fillStyle = p;
    ctx.fillRect(minx - 2, miny - 2, maxx - minx + 4, maxy - miny + 4);
    ctx.restore();
  };

  // Raccourci : la photo recouvre l'aplat (mode normal)
  T.solid = function (ctx, shape, k, o) {
    o = o || {};
    T.paint(ctx, shape, k, { tile: o.tile, rot: o.rot, ox: o.ox, oy: o.oy, blend: 'source-over', alpha: o.alpha != null ? o.alpha : 0.85 });
  };
})(window.CQR);
