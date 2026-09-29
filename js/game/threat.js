/* =========================================================
   La menace qui évolue : une bande rôde autour du refuge.
   st.threat = { heat (0-100), level (0-3), band, unguarded, guarded,
                 warn, siege, siegeFrom, siegeHits, tribute, paid, weakUntil }
   - la notoriété (heat) monte avec le temps, le chauffage qui fume,
     les pillages réussis ; elle baisse quand on repousse la bande ou
     qu'on paie
   - la bande apprend les habitudes : pas de garde plusieurs nuits de suite
     → elle attaque plus souvent ; toujours la même garde → elle frappe plus fort
   - rumeurs et avertissements au réveil, émissaire qui réclame un tribut,
     siège de deux nuits quand elle est au plus haut
   ========================================================= */
(function (C) {
  'use strict';
  var T = C.Threat = {};
  var U = C.util;
  function G() { return C.Game; }
  function R() { return C.R; }

  var BANDS = ['Les Corbeaux', 'Les Loups du port', 'Les gars de Dutch', 'Les Rats de cave', 'Les frères Kowal'];

  T.get = function (st) {
    if (!st.threat) st.threat = { heat: 0, level: 0, band: null, unguarded: 0, guarded: 0, warn: 0, siege: 0, siegeFrom: 0, siegeHits: 0, tribute: 0, paid: 0, weakUntil: 0, nextEmissary: 7 };
    return st.threat;
  };
  function levelOf(h) { return h < 25 ? 0 : h < 50 ? 1 : h < 75 ? 2 : 3; }
  T.band = function (st) {
    var t = T.get(st);
    if (!t.band) t.band = R().pick(BANDS);
    return t.band;
  };
  function lc(x) { return x.charAt(0).toLowerCase() + x.slice(1); }
  T.who = function (st) { return T.get(st).level >= 2 ? T.band(st) : 'Des pillards'; };
  T.sieged = function (st) { var t = T.get(st); return t.siege > 0 && st.day > t.siegeFrom && st.day <= t.siege; };

  // Étiquette pour l'écran de nuit
  T.label = function (st) {
    var t = T.get(st);
    if (T.sieged(st)) return 'siège : ' + lc(T.band(st)) + ' tiennent la rue';
    if (t.tribute >= st.day) return 'tribut payé, ils se tiennent tranquilles';
    if (t.warn) return 'une attaque se prépare';
    if (t.level >= 3) return lc(T.band(st)) + ' se préparent à frapper';
    if (t.level === 2) return lc(T.band(st)) + ' vous ont repérés';
    if (t.level === 1) return 'des rôdeurs vous observent';
    return '';
  };

  // Ajuste la probabilité d'attaque de la nuit (appelé par Night.raidChance)
  T.adjust = function (st, c) {
    var t = T.get(st);
    if (t.tribute >= st.day) return 0;
    if (t.level >= 1) c += t.heat / 100 * 0.2 + Math.min(0.16, t.unguarded * 0.04);
    if (t.warn) c += 0.2;
    if (st.flags && st.flags.dog) c *= 0.85;
    if (t.weakUntil >= st.day) c *= 0.5;
    if (T.sieged(st)) c = Math.max(c, 0.9);
    return c;
  };
  // Force supplémentaire des assaillants
  T.strength = function (st, guards) {
    var t = T.get(st), b = t.level * 0.4;
    if (t.guarded >= 3) b += 0.6;
    if (T.sieged(st)) b += 1;
    if (t.warn && guards.length) b -= 0.5;
    if (t.weakUntil >= st.day) b -= 0.4;
    return b;
  };

  // Après la nuit : ce que la bande a retenu
  T.after = function (st, info, add) {
    var t = T.get(st);
    if (info.guards > 0) { t.guarded++; t.unguarded = 0; } else { t.unguarded++; t.guarded = 0; }
    if (st.day >= 4) t.heat += 1.2;
    if (info.burned) t.heat += 2;
    if (info.raid && info.repelled) { t.heat -= 8; t.weakUntil = st.day + 2; }
    if (info.raid && !info.repelled) t.heat += 10;
    if (T.sieged(st) && info.raid) {
      if (info.repelled) t.siegeHits++;
      if (t.siegeHits >= 2) { t.siege = 0; t.heat = 30; add('home', T.band(st) + ' se sont retirés du quartier : deux assauts repoussés, cela leur coûte trop cher.', 'good'); }
    } else if (info.raid && info.repelled && t.level >= 3 && !t.siege && R().chance(0.4)) {
      t.siegeFrom = st.day; t.siege = st.day + 2; t.siegeHits = 0;
    }
    t.warn = 0;
    t.heat = U.clamp(t.heat, 0, 100);
  };

  // À l'aube : rumeurs, avertissements, passage de niveau
  T.dawn = function (st, add) {
    var t = T.get(st), r = R();
    if (t.tribute && t.tribute < st.day) t.tribute = 0;
    if (t.siege && st.day > t.siege) {
      t.siege = 0; t.heat = 35;
      add('home', 'Le calme revient dans la rue : ' + lc(T.band(st)) + ' ont levé le siège. Pour l\'instant.', 'good');
    }
    var lv = levelOf(t.heat);
    if (lv > t.level) {
      if (lv === 1) add('home', 'Un homme a été vu plusieurs fois devant la maison. Il ne demandait rien : il regardait les fenêtres, la cheminée, les allées et venues.', 'bad');
      if (lv === 2) add('home', T.band(st) + ' ont jeté leur dévolu sur le quartier. On dit au marché qu\'ils savent où vous trouver.', 'bad');
      if (lv === 3) add('home', T.band(st) + ' se sont regroupés au bout de la rue, plus nombreux et mieux armés. Quelque chose se prépare.', 'bad');
    }
    t.level = lv;
    if (T.sieged(st)) {
      add('home', 'Des coups de feu claquent contre la façade depuis l\'immeuble d\'en face. Ils sont là, et ils comptent rester.', 'bad');
      return;
    }
    if (lv >= 1 && t.unguarded >= 2 && r.chance(0.6)) {
      t.warn = 1;
      add('home', 'On a vu quelqu\'un compter les fenêtres sombres. Personne ne veille la nuit chez vous, et ils l\'ont remarqué : ils reviendront.', 'bad');
    } else if (lv >= 2 && t.guarded >= 3 && r.chance(0.45)) {
      t.warn = 1;
      add('home', 'Ils ont noté que la garde se relève toujours aux mêmes heures. Un guetteur a disparu au coin de la rue quand on l\'a repéré : ils préparent quelque chose.', 'bad');
    } else if (lv >= 2 && r.chance(0.25)) {
      t.heat = Math.min(100, t.heat + 2);
      add('home', 'On murmure que l\'abri du quartier est « bien approvisionné ». Qui a répandu ce bruit ?', 'bad');
    }
    // Un émissaire se présentera à la porte (planifié par World.planDayEvents)
    if (lv >= 2 && st.day >= t.nextEmissary && !t.tribute) { t.nextEmissary = st.day + 6 + t.paid; t.emissary = 1; }
  };
  T.plan = function (st) {
    var t = T.get(st);
    if (!t.emissary) return;
    t.emissary = 0;
    st.dayEvents.push({ id: 'emissaire', at: R().int(9 * 60, 15 * 60) });
    st.dayEvents.sort(function (a, b) { return a.at - b.at; });
  };

  // ---------------------------------------------------------------- l'émissaire
  function price(st) { var t = T.get(st); return { conserve: 2 + t.paid, cigarettes: 2 }; }
  function armed() {
    return G().count('munitions') > 0 && ['pistolet', 'pistolet_silencieux', 'fusil', 'fusil_pompe', 'fusil_assaut', 'fusil_lunette'].some(function (x) { return G().count(x) > 0; });
  }
  C.DAY_EVENTS.emissaire = {
    weight: 0, minDay: 5, icon: 'shield', title: 'Un émissaire',
    text: function (ctx) {
      ctx.d.price = ctx.d.price || price(ctx.st);
      return 'Un homme frappe à la porte, les mains bien visibles. Il ne cherche pas à entrer.<br><br>« Je viens de la part de ' + T.band(ctx.st).replace(/^Les /, 'des ') + '. Ils veulent vous éviter des ennuis. Un peu de nourriture, quelques cigarettes, et on oublie que cette maison existe. »<br><br><i>Derrière lui, au bout de la rue, des silhouettes attendent.</i>';
    },
    choices: [
      { label: 'Payer le tribut', reqFn: function (ctx) { return G().has(ctx.d.price || price(ctx.st)); }, reqText: function (ctx) { return U.costText(ctx.d.price || price(ctx.st)); },
        run: function (ctx) {
          var t = T.get(ctx.st), p = ctx.d.price || price(ctx.st);
          G().removeItems(p);
          t.tribute = ctx.st.day + 4 + Math.min(2, t.paid); t.paid++; t.heat = Math.max(0, t.heat - 15);
          return 'L\'homme compte, hoche la tête et s\'éloigne. « On se comprend. » Pendant quelques jours, la rue devrait rester tranquille. Mais la prochaine fois, le prix sera plus haut.';
        } },
      { label: 'Refuser', run: function (ctx) {
          var t = T.get(ctx.st); t.heat = Math.min(100, t.heat + 8); t.warn = 1;
          G().moralAll(-2, {});
          return '« Comme vous voulez. Vous avez été prévenus. » Il tourne les talons. Ce soir, tout le monde dormira mal.';
        } },
      { label: 'Le menacer d\'une arme', reqFn: armed, reqText: 'une arme à feu et 1 munition',
        run: function (ctx) {
          var t = T.get(ctx.st);
          if (C.Audio.ready) C.Audio.sfx.gun();
          G().removeItems({ munitions: 1 });
          if (R().chance(0.6)) {
            t.heat = Math.max(0, t.heat - 25); t.weakUntil = ctx.st.day + 5;
            return 'Le coup de feu claque au-dessus de sa tête. L\'homme détale, et derrière lui les silhouettes se dispersent. Ils y réfléchiront à deux fois avant de revenir.';
          }
          t.heat = Math.min(100, t.heat + 15); t.warn = 1;
          return 'Il ne bouge pas. « Mauvaise idée. » Au bout de la rue, quelqu\'un arme un fusil. Ils reviendront, et ils seront en colère.';
        } }
    ]
  };
})(window.CQR);
