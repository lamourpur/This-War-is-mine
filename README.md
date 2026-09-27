# Ceux Qui Restent

Jeu de survie et de gestion en temps réel. Un groupe de civils tente de tenir dans une maison en ruine pendant le siège d'une ville, jusqu'au cessez-le-feu.

## Lancer le jeu

- Double-cliquez sur **`Lancer le jeu.bat`**, ou ouvrez **`index.html`** dans Chrome, Edge ou Firefox.
- Aucune installation n'est nécessaire. Les polices viennent de Google Fonts : sans Internet, une police de secours est utilisée.

## Contrôles

| Action | Commande |
|---|---|
| Sélectionner un survivant | Clic sur le personnage ou sur sa fiche |
| Parler, réconforter, soigner quelqu'un | Clic sur un **autre** survivant quand un survivant est déjà sélectionné |
| Biographie et pensées | Bouton **Fiche** d'une carte |
| Agir sur un objet | Clic sur l'objet, puis choix dans le menu |
| Se déplacer | Clic sur le sol (exploration : double-clic = courir, plus bruyant) |
| Manger, se soigner, consommer | Bouton **Besoins ▾** de la fiche |
| Pause / vitesses | `Espace` · `1` `2` `3` |
| Survivant suivant | `Tab` |
| Réserve / Journal / Menu | `I` · `J` · `Échap` |

## Mécaniques

- **Journée de 6 h à 20 h** en temps réel (1 s = 1 min de jeu en x1). Le jeu se met en pause dès qu'une fenêtre est ouverte.
- **Besoins** : faim, fatigue, blessures, maladie, moral. Un survivant peut mourir de faim, de ses blessures ou de maladie.
- **Moral** : chaque survivant a ses **pensées** (fiche), qui réagissent à ce que fait le groupe (aider, refuser, voler, tuer, perdre quelqu'un). Les survivants **parlent** entre eux (bulles), peuvent **se réconforter** et **se soigner** mutuellement, avec un bonus pour les soignants et les empathiques. Chaque jour, le confort du refuge (lits, fauteuil, radio, poêle, trous bouchés, chauffage en hiver) fait monter ou baisser le moral. Après un décès, le groupe est **en deuil** pendant plusieurs jours. Un survivant **déprimé** travaille mal et refuse parfois les ordres. **Brisé**, il refuse tout et, sans réconfort, peut **quitter le refuge** ou **mettre fin à ses jours**. Les survivants **cyniques** sont moins touchés par les actes discutables.
- **Personnages** : silhouettes articulées dessinées au crayon (marche, posture selon le moral et la fatigue, toux quand ils sont malades), vêtements et accessoires propres à chacun, et outils en main selon l'action.
- **Refuge** : gravats à déblayer, meubles à fouiller ou à démonter, portes à forcer, grille à scier, trous à barricader. Les zones inaccessibles restent dans l'ombre.
- **Établi (3 niveaux)** : outils (pelle, pied-de-biche, passe-partout, scie, hachette, couteau), munitions, filtres. Stations : lit, poêle, chauffage, collecteur d'eau de pluie, piège à rats, fauteuil, potager, jardin d'herbes, distillerie, atelier d'herbes, radio.
- **Améliorations** : poêle, chauffage (3 niveaux), collecteur, porte d'entrée (barricadée puis blindée).
- **Hiver** : il arrive à une date aléatoire. Il faut chauffer, stocker du bois et boucher les trous, sinon le froid rend malade.
- **Événements de la journée** : 0 à 2 par jour, à des heures aléatoires. Certains arrivent seuls : bombardement (trou arraché, plafond effondré, blessé possible), rats dans la réserve, infiltration de pluie, panne d'une station (à réparer), trouvaille, moment de réconfort ou crise de larmes, balle perdue, voisin mort de froid en hiver. D'autres demandent un choix : colis humanitaire largué, cris sous les décombres, rôdeurs en plein jour, fillette perdue, distribution de pain annoncée à la radio. Envoyer quelqu'un dehors l'occupe toute la journée, avec un risque d'être blessé.
- **Visiteurs** : marchands (troc, le trait négociateur aide), voisins, enfants, blessés, réfugiés qui veulent rejoindre le groupe, milice qui rackette. Chaque choix pèse sur le moral.
- **Nuit** : chaque survivant dort (dans un lit ou par terre), monte la garde ou part piller. On peut piller 14 lieux, chacun avec son niveau de danger, ses habitants et ses réserves verrouillées. On choisit l'attitude, la priorité de butin et l'équipement. Des raids peuvent frapper le refuge.
- **Exploration jouable** (lieux sans danger : Maison abandonnée dès le jour 1, École bombardée au jour 2, Maison des Whitaker au jour 4, Hôpital de campagne au jour 6, Église Sainte-Anne au jour 7) : on dirige soi-même le pilleur dans le bâtiment de 20 h à 5 h (cloche à 4 h, retour forcé à l'aube). Le sac est limité en poids (12, 18 avec « grand sac ») : fouille par glisser-déposer entre le meuble et le sac. On y rencontre des gens : un vagabond blessé, un vieux couple, un prêtre, une mère et son enfant malade, un marchand, une chirurgienne à court d'alcool pour désinfecter, un infirmier qui troque, un soldat blessé, une institutrice qui prépare l'anniversaire d'un enfant, un père de famille méfiant. On peut les aider (moral du groupe, récompense), échanger avec eux (chacun paie plus cher ce qu'il recherche), faire des dons… ou voler leurs affaires, avec les conséquences qui vont avec : chaque vol pèse différemment sur le moral selon la victime, et certains se paient plus tard (on apprend quelques jours après ce que le vol de la pharmacie de l'hôpital a coûté). L'état de chaque lieu est conservé d'une visite à l'autre.
- **Lieux gardés par des soldats** (jouables) : l'**Entrepôt du port** (jour 8) et l'**Avant-poste militaire** (jour 15).
  - Les soldats **patrouillent**, regardent devant eux (faisceau de leur lampe) et **entendent le bruit** : fouiller, forcer une serrure au pied-de-biche, déblayer, courir (double-clic) ou tirer produit des cercles de bruit qui les attirent. Un « ? » se remplit quand ils ont un doute, un « ! » quand ils vous ont repéré.
  - À l'entrepôt, ils sont **neutres** : le sergent Maddox fait même du troc. Mais entrer dans leur **zone interdite** (marquée en rouge) déclenche un avertissement, puis ils ouvrent le feu si on ne recule pas ; **voler sous leurs yeux** ou **attaquer l'un d'eux** rend toute la garnison hostile, et elle s'en souviendra aux visites suivantes. Voler leur matériel sans être vu ne pèse pas sur le moral.
  - À l'avant-poste, ils **tirent à vue**. Il faut progresser dans l'ombre.
  - **Combat** : se cacher dans les **recoins sombres** (invisible tant qu'on ne bouge pas, et plus dur à toucher), **attaque furtive** par-derrière ou sur un soldat endormi (mortelle avec un couteau ou une hachette), corps à corps, **tir** au pistolet ou au fusil (munitions, portée, ligne de mire, très bruyant). Le gilet pare-balles réduit les blessures. Un survivant trop blessé meurt sur place, et son sac est perdu.
  - Un soldat grièvement blessé peut **fuir puis se rendre** : l'épargner ou l'achever. Le moral encaisse différemment un combat pour sa vie, un meurtre dans le sommeil, ou l'exécution d'un homme qui supplie. Les corps peuvent être fouillés (armes, munitions).
  - À l'étage de l'entrepôt, un soldat ivre retient une jeune femme. On peut passer son chemin… ou intervenir.
- **Objets de valeur** : bijoux, montre en or, diamants (très rares), la meilleure monnaie de troc.
- **Fin** : un cessez-le-feu tombe à une date aléatoire entre le jour 30 et le jour 45. Un épilogue est écrit pour chaque survivant.

## Sauvegardes

- Une **sauvegarde automatique** est faite chaque matin, et il y a **3 emplacements manuels** (Échap → Sauvegarder).
- Ces sauvegardes sont stockées dans le navigateur. Pour garder une copie dans le dossier `saves/` ou changer d'ordinateur, utilisez **Exporter en fichier .sav**, puis **Importer**.

## Structure du dossier

```
index.html            page du jeu
Lancer le jeu.bat     lanceur Windows
css/style.css         interface
js/core/              utilitaires, audio synthétisé, sauvegardes
js/data/              objets, constructions, survivants, lieux, visiteurs, plan du refuge
js/game/              état, déplacements, actions, besoins, monde, nuit
js/render/            dessin crayonné (décor, objets, personnages)
js/ui/                HUD, fenêtres, troc, nuit, menus
assets/               icône
assets/textures/      textures photo libres de droits (CC0, Poly Haven)
assets/props/         objets détourés libres de droits (CC0, Poly Haven)
assets/locations/     photos des lieux de pillage (CC0, Poly Haven)
assets/portraits/     portraits réalistes des survivants (visages générés, retravaillés au fusain)
assets/sounds/        ambiances et bruitages enregistrés (CC0, Freesound)
saves/                rangement des fichiers .sav exportés
```

Les graphismes sont dessinés en Canvas. Les surfaces (murs, briques, bois, tôle, gravats) reçoivent en plus des textures photo désaturées, peintes à l'intérieur des contours crayonnés — voir `assets/textures/LICENCE.txt`. Sans ces fichiers, le jeu fonctionne toujours, en dessin plat. Les ambiances (vent, pluie, feu, radio, guerre au loin) et les bruitages utilisent des enregistrements CC0 ; la musique au piano reste générée, et chaque son synthétisé sert de secours si un fichier manque. Chaque dossier d'`assets/` contient un `LICENCE.txt` avec l'origine des fichiers.
