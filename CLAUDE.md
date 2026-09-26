# Ceux Qui Restent — notes pour Claude

Clone français de *This War of Mine*, en HTML + Canvas, JS vanilla. Pas de build, pas de dépendances : `index.html` charge des scripts classiques dans l'ordre. Le jeu doit aussi marcher en `file://`. Répondre à l'utilisateur **en français**.

## Conventions
- Chaque fichier est une IIFE ES5 `(function (C) { 'use strict'; … })(window.CQR);`. Tout vit sous `C.*` (`C.Game`, `C.Render`, `C.UI`, `C.Explore`…). Pas de modules, pas de classes, pas de syntaxe ES6+ lourde.
- Nouveau fichier JS → l'ajouter dans `index.html` au bon endroit (data avant game, game avant ui, `maps.js` après `dayevents.js`, `explore.js` après `night.js`).
- Textes du jeu en français ; noms des personnages américains (ids internes : vera, tomas, ilija, nada, goran, lena, emir, mira).
- Retours d'action **dans la scène** (`C.Render.pop(s, gains|tag, …, 'warn')`, bulles), jamais de message en bas de l'écran.
- UI « dossier de survie » : polices Bebas Neue / Barlow Semi Condensed / Special Elite, papier vieilli, icônes SVG (`js/ui/icons.js`), barres de défilement thémées.

## Architecture
- `js/core/` utilitaires, audio (fichiers CC0 + synthèse de secours), sauvegardes (localStorage + export .sav).
- `js/data/` objets (`C.ITEMS` : w = poids, v = valeur de troc), constructions, survivants, lieux de pillage, événements, plan du refuge (`shelter.js`), plans explorables et PNJ (`maps.js` : `C.MAPS`, `C.NPCS`).
- `js/game/` état (`C.Game.st`), déplacements (`nav.js`), actions et menus contextuels (`actions.js`), besoins/moral, monde, nuit (`night.js`, `Night.resolve`), exploration jouable (`explore.js`).
- `js/render/` monde 1600×900, 4 étages (sol y 800/630/460/290). Couche statique reconstruite quand `C.Render.dirty` (`G().markDirty()`), couche dynamique chaque frame. `sketch.js` = trait crayonné, `objects.js` = meubles, `figure.js` = personnages articulés, `portrait.js` = portraits (photos `assets/portraits/<id>.jpg` + surcouches d'état), `itemart.js` = icônes d'objets, `textures.js` / `props.js` = ressources CC0 peintes dans les contours.
- `js/ui/` HUD, fenêtres (`panels.js`), fouille par glisser-déposer (`loot.js`), troc (`trade.js`), écran de nuit (`nightui.js`).

## Exploration de nuit
`C.Explore.start(plan, onDone)` remplace temporairement les globales du plan (`C.STAIRS/WALLS/WINDOWS/SLOTS/DECOR/THEME`) et `C.Game.st` par un état d'exploration (phase `'explore'`, inventaire = sac, un seul survivant) ; tous les systèmes (nav, actions, fouille, rendu) sont réutilisés. `finish()` sauvegarde l'état du lieu dans `st.locations[id]`, restaure tout, puis `Night.resolve` lit `plan.scav.explored`. Seules les zones sans danger sont jouables ; les autres lieux passent par le pillage abstrait de `night.js`.

## Pièges connus
- `file://` : canvas « tainted » → `ItemArt.buildingUrl` désactive textures/props ; audio en HTMLAudio au lieu de Web Audio.
- Toute modif de décor statique doit appeler `markDirty()` sinon rien ne se redessine.
- Silhouettes de surbrillance : mettre `SK.noStain = true` pour ne pas y inclure taches et ombres.

## Tester
- Serveur local : `node .claude/serve.js` (port 8137, config « jeu » de `.claude/launch.json`). `POST /__shot?name=x` enregistre une capture dans `%TEMP%/cqr-shots/`.
- `.claude/frame.html` : harnais (`view()`, `G()`). `.claude/bot.js` : `runBot()` joue une partie complète et renvoie `{errs, day, outcome}` — le lancer après tout changement de logique ; il doit finir sans erreur.
- Nettoyer les sauvegardes de test (localStorage) après les essais.
