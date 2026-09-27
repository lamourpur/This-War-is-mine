/* =========================================================
   Icônes SVG au trait (style croquis) — C.Icon('nom')
   Toutes en 24×24, couleur = currentColor
   ========================================================= */
(function (C) {
  'use strict';

  var P = {
    hunger:   '<path d="M3.5 11.5h17c-.4 4.6-3.8 7.8-8.5 7.8S3.9 16.1 3.5 11.5z"/><path d="M8 19.5l-.6 1.8M16 19.5l.6 1.8"/><path d="M14.5 3.2c-1 1.4 1 2.4 0 4.2M10.5 4.2c-.8 1.2.8 2 0 3.4"/>',
    fatigue:  '<path d="M19.6 14.8A8.2 8.2 0 0 1 9.2 4.4a8.3 8.3 0 1 0 10.4 10.4z"/><path d="M15 4.5h3.2l-3.2 3.3h3.3"/>',
    health:   '<path d="M9.2 3.6h5.6v5.6h5.6v5.6h-5.6v5.6H9.2v-5.6H3.6V9.2h5.6z"/>',
    moral:    '<path d="M12 20.3S3.6 15.2 3.6 9.3A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8.4 2.1c0 5.9-8.4 11-8.4 11z"/>',
    wound:    '<path d="M4.6 15.8L15.8 4.6a2.8 2.8 0 0 1 4 4L8.6 19.8a2.8 2.8 0 0 1-4-4z"/><path d="M10.4 10.6l.1.1M12.9 13l.1.1M13 10.5l.1.1M10.5 13l.1.1"/>',
    sick:     '<path d="M12 3.4v11"/><circle cx="12" cy="17.3" r="3.1"/><path d="M9.4 14.8V5.4a2.6 2.6 0 0 1 5.2 0v9.4"/><path d="M16.8 6.5h2M16.8 9.5h2"/>',
    grief:    '<path d="M10 21h4M9.2 21V11h5.6v10"/><path d="M12 11V8.5"/><path d="M12 3.2c1.4 1.6 1.8 2.8 0 4.6-1.8-1.8-1.4-3 0-4.6z"/>',
    cold:     '<path d="M12 2.8v18.4M4 7.4l16 9.2M20 7.4L4 16.6"/><path d="M9.6 4.6L12 6.6l2.4-2M9.6 19.4l2.4-2 2.4 2"/>',
    sun:      '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
    cloud:    '<path d="M6.8 18.6h10.6a4 4 0 0 0 .4-8 5.8 5.8 0 0 0-11-1A4.5 4.5 0 0 0 6.8 18.6z"/>',
    rain:     '<path d="M6.8 14.6h10.6a3.7 3.7 0 0 0 .4-7.4 5.4 5.4 0 0 0-10.3-1A4.1 4.1 0 0 0 6.8 14.6z"/><path d="M8.2 17.4l-1 2.8M12.2 17.4l-1 2.8M16.2 17.4l-1 2.8"/>',
    snow:     '<path d="M6.8 13.6h10.6a3.7 3.7 0 0 0 .4-7.4 5.4 5.4 0 0 0-10.3-1A4.1 4.1 0 0 0 6.8 13.6z"/><path d="M8 17.4l.1.1M12 19.4l.1.1M16 17.4l.1.1M10 21.2l.1.1M14 21.2l.1.1"/>',
    thermo:   '<path d="M10 14.2V4.8a2 2 0 0 1 4 0v9.4a3.8 3.8 0 1 1-4 0z"/><path d="M12 9v7.2"/>',
    home:     '<path d="M3.4 11.4L12 4l8.6 7.4"/><path d="M5.8 9.6v10.2h12.4V9.6"/><path d="M10 19.8v-5.4h4v5.4"/>',
    pause:    '<path d="M8 5v14M16 5v14"/>',
    play:     '<path d="M7 4.6v14.8L19 12z"/>',
    ff:       '<path d="M3.6 5.6v12.8L11.6 12zM12.4 5.6v12.8L20.4 12z"/>',
    fff:      '<path d="M2 6v12l5.6-6zM8.2 6v12l5.6-6zM14.4 6v12l5.6-6z"/>',
    stock:    '<path d="M3.6 8.2L12 4l8.4 4.2v9.6L12 22l-8.4-4.2z"/><path d="M3.6 8.2L12 12.4l8.4-4.2M12 12.4V22"/><path d="M7.8 6.1l8.4 4.2"/>',
    journal:  '<path d="M5.4 3.6h11.8a1.4 1.4 0 0 1 1.4 1.4v15.4H6.8a1.4 1.4 0 0 1-1.4-1.4z"/><path d="M5.4 18.9a1.5 1.5 0 0 1 1.4-1.5h11.8"/><path d="M9 8h6M9 11h4.4"/>',
    menu:     '<path d="M4 6.4h16M4 12h16M4 17.6h16"/>',
    place:    '<path d="M3.4 12.4L12 5l8.6 7.4"/><path d="M5.8 10.6v9.2h12.4v-9.2"/><path d="M12 11.6v6M9 14.6h6"/>',
    door:     '<path d="M6 21V4.2L16.8 2.6v19.8"/><path d="M3.6 21h16.8"/><path d="M13.4 12.4v.8"/>',
    bed:      '<path d="M3 18.6V6.4M3 14.4h18v4.2"/><path d="M3 11.2h6.4v3.2M9.4 11.2h8.8a2.8 2.8 0 0 1 2.8 2.8"/>',
    shield:   '<path d="M12 21.2s7.6-3.4 7.6-9.6V5.4L12 2.8 4.4 5.4v6.2c0 6.2 7.6 9.6 7.6 9.6z"/><path d="M12 7v9.4"/>',
    pack:     '<path d="M6.2 8.4a5.8 5.8 0 0 1 11.6 0v11.4a1.4 1.4 0 0 1-1.4 1.4H7.6a1.4 1.4 0 0 1-1.4-1.4z"/><path d="M9.6 4.6V3.2h4.8v1.4"/><path d="M9 13.4h6v4.4H9z"/>',
    skull:    '<path d="M12 3.2a7.6 7.6 0 0 0-5 13.4V20h10v-3.4a7.6 7.6 0 0 0-5-13.4z"/><circle cx="9.3" cy="11.6" r="1.6"/><circle cx="14.7" cy="11.6" r="1.6"/><path d="M10.4 20v-2M13.6 20v-2"/>',
    speech:   '<path d="M4 5.4h16v10.2h-9.2L6 19.6v-4H4z"/><path d="M8 9.4h8M8 12h5"/>',
    hammer:   '<path d="M13.6 9.6L4.4 18.8a1.6 1.6 0 0 0 2.3 2.3l9.2-9.2"/><path d="M11.4 7.4l3.2-3.2 5.2 5.2-3.2 3.2z"/>',
    wrench:   '<path d="M14.6 6.2a4.2 4.2 0 0 0 5.2 5.4l-9.4 9.4a2.3 2.3 0 0 1-3.3-3.3l9.4-9.4a4.2 4.2 0 0 0-5.4-5.2l2.8 2.8-.4 2.3-2.3.4z"/>',
    trade:    '<path d="M4 8.4h14l-3.4-3.4M20 15.6H6l3.4 3.4"/>',
    clock:    '<circle cx="12" cy="12" r="8.6"/><path d="M12 6.8V12l3.6 2.2"/>',
    close:    '<path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>',
    save:     '<path d="M4.4 4.4h12.4l2.8 2.8v12.4H4.4z"/><path d="M8 4.4v4.8h7.2V4.4M7.4 19.6v-6h9.2v6"/>',
    load:     '<path d="M3.4 6.4h6.4l1.8 2.2h9v10.2H3.4z"/><path d="M12 11.4v5.2M9.6 14.2l2.4 2.4 2.4-2.4"/>',
    sliders:  '<path d="M5 4v16M12 4v16M19 4v16"/><path d="M3 15h4M10 8h4M17 13h4"/>',
    help:     '<circle cx="12" cy="12" r="8.6"/><path d="M9.4 9.4a2.7 2.7 0 1 1 3.6 2.6c-.7.3-1 .9-1 1.6v.8"/><path d="M12 17.2v.1"/>',
    exit:     '<path d="M14 4.4H5.4v15.2H14"/><path d="M10.4 12h10M17 8.4l3.6 3.6-3.6 3.6"/>',
    alert:    '<path d="M12 3.4L2.8 19.6h18.4z"/><path d="M12 9.4v4.6M12 16.6v.1"/>',
    star:     '<path d="M12 3.6l2.6 5.4 5.8.8-4.2 4.1 1 5.8L12 17l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    user:     '<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20.4a7.4 7.4 0 0 1 14.8 0"/>',
    moon:     '<path d="M18.4 15.2A7.6 7.6 0 0 1 8.8 5.6a7.6 7.6 0 1 0 9.6 9.6z"/>',
    radio:    '<path d="M3.6 8.6h16.8v11H3.6z"/><path d="M6.4 8.6L17 3.4"/><circle cx="9" cy="14.1" r="2.6"/><path d="M14.6 12h3M14.6 15.6h3"/>',
    // Catégories d'objets
    c_vivres:    '<path d="M6.4 6.4h11.2v13.2H6.4z"/><path d="M6.4 10h11.2M6.4 16h11.2"/><path d="M8.2 4.4h7.6v2H8.2z"/>',
    c_materiaux: '<path d="M3.4 9.4h17.2v3.4H3.4zM3.4 15.2h17.2v3.4H3.4z"/><path d="M7 9.4V6.4M17 9.4V6.4M7 12.8v2.4M17 12.8v2.4"/>',
    c_soins:     '<path d="M4.4 7.4h15.2v11.8H4.4z"/><path d="M9 7.4V4.8h6v2.6M12 10.4v6M9 13.4h6"/>',
    c_confort:   '<path d="M5.4 9.4h11v5.4a5.5 5.5 0 0 1-11 0z"/><path d="M16.4 10.6h1.4a2.2 2.2 0 0 1 0 4.4h-1.6"/><path d="M8.6 3.6c-.8 1.2.8 2 0 3.2M12.4 3.6c-.8 1.2.8 2 0 3.2"/>',
    c_outils:    '<path d="M14.6 6.2a4.2 4.2 0 0 0 5.2 5.4l-9.4 9.4a2.3 2.3 0 0 1-3.3-3.3l9.4-9.4a4.2 4.2 0 0 0-5.4-5.2l2.8 2.8-.4 2.3-2.3.4z"/>',
    c_armes:     '<path d="M19.6 4.4l-9.8 9.8-2.6.6.6-2.6 9.8-9.8z"/><path d="M8.8 12.4l2.8 2.8M6.6 14.6l2.8 2.8-3 3-2.8-2.8z"/>',
    c_valeur:    '<path d="M6.6 4.4h10.8l3.4 5L12 20.2 3.2 9.4z"/><path d="M3.2 9.4h17.6M9.6 4.4L8.4 9.4 12 20.2l3.6-10.8-1.2-5"/>'
  };

  C.Icon = function (name, cls) {
    var d = P[name] || P.star;
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  };
  C.IconNames = Object.keys(P);
  // Pour le canvas : chemins Path2D d'une icône (mis en cache)
  var P2 = {};
  C.IconPaths = function (name) {
    if (P2[name]) return P2[name];
    var d = P[name] || P.star, out = [], re = /d="([^"]+)"/g, m;
    while ((m = re.exec(d))) out.push(new Path2D(m[1]));
    return (P2[name] = out);
  };
})(window.CQR);
