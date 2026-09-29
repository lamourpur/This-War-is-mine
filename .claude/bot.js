// Simulation d'une partie avec une stratégie raisonnable (outil de test, hors jeu)
window.runBot = function (group, opts) {
  opts = opts || {};
  const errors = [];
  const C = CQR, G = C.Game;
  C.Main.noFade = true;   // pas de fondus au noir pendant la simulation
  const saveToast = C.UI.toast, saveDialog = C.UI.dialog;
  C.UI.toast = () => {}; C.UI.dialog = () => {}; C.UI.autoLoot = true;
  C.Main.startNew(group || ['nada', 'tomas', 'ilija']); C.UI.closeAllModals(); C.Main.setSpeed(0);
  const st = G.st;
  const env = () => ({ temp: C.World.shelterTemp(st), empath: false });
  const buildPlan = ['b_bed', 'b_stove', 'pelle', 'pied_de_biche', 'b_bed', 'b_heater', 'b_collector', 'b_rattrap', 'wb2', 'b_armchair', 'scie', 'b_bed', 'b_garden', 'b_radio'];
  function idleTask(s) {
    const wb = st.objects.find(o => o.kind === 'workbench');
    if (s.hunger >= 30) for (const f of ['repas', 'conserve', 'legumes', 'viande']) if (G.count(f)) { C.Actions.start(s, null, 'eat', { food: f }); return; }
    if (s.wound >= 25 && G.count('bandage')) { C.Actions.start(s, null, 'heal'); return; }
    if (s.sick >= 25) {
      if (G.count('medicaments')) { C.Actions.start(s, null, 'medicate', { item: 'medicaments' }); return; }
      if (G.count('remede')) { C.Actions.start(s, null, 'medicate', { item: 'remede' }); return; }
    }
    const corpse = st.objects.find(o => o.kind === 'corpse' && C.Nav.objectReachable(o) && !st.survivors.some(x => x.act && x.act.uid === o.uid));
    if (corpse && s.fatigue < 70) { C.Actions.start(s, corpse, 'bury'); return; }
    const heater = st.objects.find(o => o.kind === 'heater');
    if (heater && st.weather.out < 12 && (heater.fuel || 0) < 300 && !heater.user) {
      if (G.count('bois') >= 3) { C.Actions.start(s, heater, 'fuel', { item: 'bois', n: 3 }); return; }
      if (G.count('livres') >= 2) { C.Actions.start(s, heater, 'fuel', { item: 'livres', n: 2 }); return; }
      if (G.count('carburant') >= 1) { C.Actions.start(s, heater, 'fuel', { item: 'carburant', n: 1 }); return; }
    }
    const stove = st.objects.find(o => o.kind === 'stove');
    if (stove && !stove.user) for (const r of C.STATION_RECIPES.stove) if (G.has(r.cost) && G.count('bois') > 5) { C.Actions.start(s, stove, 'cook', { rid: r.id }); return; }
    for (const o of st.objects) { if (C.Nav.objectReachable(o) && C.Actions.collectable(o)) { C.Actions.start(s, o, 'collect'); return; } }
    const garden = st.objects.find(o => (o.kind === 'garden' || o.kind === 'herbgarden') && !(o.watered > 0) && (o.growth || 0) < C.Actions.growNeed(o));
    if (garden && G.count('eau') > 4) { C.Actions.start(s, garden, 'water'); return; }
    if (!wb.user) for (const id of buildPlan) {
      const r = C.Actions.findCraft(id);
      const built = r.build ? G.countBuilt(r.build) + st.pending.filter(x => x === r.build).length : (r.give ? G.count(Object.keys(r.give)[0]) : 0);
      const want = buildPlan.filter(x => x === id).length;
      if (r.upgradeWB) { if (wb.level >= r.upgradeWB) continue; } else if (built >= want) continue;
      if (r.lvl <= wb.level && G.has(r.cost)) { C.Actions.start(s, wb, 'craft', { rid: id }); return; }
    }
    const h2 = st.objects.find(o => o.kind === 'heater');
    if (h2 && h2.level < 2 && G.has(C.BUILDINGS.heater.upgrades[2].cost) && !h2.user) { C.Actions.start(s, h2, 'upgrade', { level: 2 }); return; }
    for (const o of st.objects) {
      if (!C.Nav.objectReachable(o)) continue;
      if (o.kind === 'rubble' && C.Actions.start(s, o, 'clear')) return;
      if (o.kind === 'cache' && !o.searched) {
        if (o.locked) { const t = (o.tools || []).find(t => G.count(t)); if (t && C.Actions.start(s, o, 'unlock', { tool: t })) return; }
        else if (C.Actions.start(s, o, 'search')) return;
      }
      if (o.kind === 'door' && !o.open) { const t = o.tools.find(t => G.count(t)); if (t && C.Actions.start(s, o, 'unlock', { tool: t })) return; }
      if (o.kind === 'grate' && G.count('scie') && C.Actions.start(s, o, 'cut')) return;
      if (o.kind === 'hole' && !o.boarded && G.has(C.BOARD_COST) && C.Actions.start(s, o, 'board')) return;
    }
    if (!opts.antisocial && s.moral >= 40) {
      const sad = G.present().find(b => b !== s && b.moral < 50 && !b.comfortedToday && !(b.act && b.act.phase === 'work' && /sleep|talk|listen|care/.test(b.act.kind)));
      if (sad && C.Actions.start(s, null, 'talk', { sid: sad.id, mode: 'comfort' })) return;
      const pal = G.present().find(b => b !== s && !(s.talkedToday || {})[b.id] && !b.act);
      if (pal && Math.random() < 0.02 && C.Actions.start(s, null, 'talk', { sid: pal.id, mode: 'talk' })) return;
    }
    if (s.fatigue > 50) { const bed = st.objects.find(o => o.kind === 'bed' && !o.user); if (bed) { C.Actions.start(s, bed, 'sleep'); return; } }
    const ch = st.objects.find(o => o.kind === 'armchair' && !o.user);
    if (ch && s.moral < 60) { C.Actions.start(s, ch, G.count('livres') ? 'read' : 'rest'); return; }
  }
  function runDay() {
    let guard = 0;
    while (st.phase === 'day' && guard++ < 3000) {
      try {
        G.present().forEach(s => { if (!s.act) idleTask(s); });
        if (st.pending.length) { const t = st.pending[0]; const sl = C.UI.freeSlots(t)[0]; if (sl) { C.Render.placing = t; C.UI.placeAt(sl); } else st.pending.shift(); }
        if (st.visitor) {
          const s = G.present()[0];
          if (s) { C.UI.openVisitor(s); const btns = [...document.querySelectorAll('.choice:not(:disabled)')]; if (btns.length) btns[0].click(); C.UI.closeAllModals(); st.visitor = null; }
        }
        C.World.update(st, 1);
        if (st.phase !== 'day') break;
        const e = env();
        st.survivors.forEach(s => C.Surv.update(s, 1, e));
      } catch (err) { errors.push('jour: ' + err.message + ' ' + err.stack.split('\n')[1]); break; }
    }
  }
  const summary = []; let li = 0;
  for (let d = 0; d < 50 && st.phase !== 'over'; d++) {
    runDay(); C.UI.closeAllModals(); if (st.phase === 'over') break;
    const pres = G.present(); const plan = { roles: {}, scav: null };
    pres.forEach(s => plan.roles[s.id] = 'sleep');
    const cands = pres.filter(s => s.wound < 40 && s.sick < 40).sort((a, b) => a.fatigue - b.fatigue);
    if (cands.length) {
      const sc = cands[0]; plan.roles[sc.id] = 'scav';
      const locs = C.LOCATIONS.filter(l => l.unlock <= st.day && !C.World.closed(st, l.id) && l.danger <= (opts.maxDanger || 2) && (opts.civils || l.residents !== 'civils'));
      const loc = locs[(li++) % locs.length];
      plan.scav = { loc: loc.id, stance: opts.stance || 'normal', prio: st.day % 2 ? 'vivres' : 'materiaux', equip: ['pied_de_biche', 'couteau', 'scie'].filter(i => G.count(i) > 0).slice(0, 2), ammo: 0 };
    }
    const others = pres.filter(s => plan.roles[s.id] === 'sleep');
    if (others.length >= 2) plan.roles[others.sort((a, b) => a.fatigue - b.fatigue)[0].id] = 'guard';
    try { C.Night.resolve(plan); } catch (err) { errors.push('nuit: ' + err.message + ' ' + err.stack.split('\n')[1]); break; }
    C.UI.closeAllModals();
    summary.push(st.day + ':' + G.alive().map(s => 'h' + Math.round(s.hunger) + 's' + Math.round(s.sick) + 'm' + Math.round(s.moral)).join('/') + ' ' + st.weather.out + '°' + (C.World.isWinter(st) ? 'H' : '') + ' in' + C.World.shelterTemp(st) + ' food' + G.foodCount());
  }
  C.UI.toast = saveToast; C.UI.dialog = saveDialog; C.UI.autoLoot = false;
  return {
    errors: errors.slice(0, 10), day: st.day, cease: st.ceasefireDay, winter: st.winterStart + '+' + st.winterLen, outcome: st.outcome,
    alive: G.alive().length, stats: st.stats, built: st.objects.filter(o => C.BUILDINGS[o.kind]).map(o => o.kind + o.level).join(','),
    summary: summary.filter((x, i) => i % 3 === 0 || i > summary.length - 4),
    deaths: st.log.filter(l => l.kind === 'death').map(l => l.d + ': ' + l.text), inv: st.inventory
  };
};
