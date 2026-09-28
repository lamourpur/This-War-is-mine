/* =========================================================
   Plans des lieux explorables la nuit
   Même principe que le refuge : 4 niveaux en coupe (0 = cave),
   entrée à gauche du rez-de-chaussée, escaliers, cloisons, meubles.
   Chaque objet a une clé (key) : son état est conservé d'une visite
   à l'autre (fouillé, vidé, déblayé, forcé…).
   owner : les affaires appartiennent aux habitants → les prendre est un vol
   deco  : purement décoratif (aucune action possible)
   ========================================================= */
(function (C) {
  'use strict';

  // ------------------------------------------------------------ personnages
  // look : même format que les survivants (dessin en jeu)
  // need : ce dont il a besoin · trade : stock et préférences (likes : multiplicateur de valeur)
  C.NPCS = {
    hank: {
      name: 'Hank', title: 'Vagabond blessé',
      look: { hair: 'short', build: 0.95, h: 1.0, coat: '#4a4238', pants: '#2c2a26', coatLen: 0.18, skin: '#a69580', hairColor: '#5d564c', beard: 'full', brow: 'heavy', top: 'overcoat', shirt: '#5c5448' },
      pose: 'lie', cond: { wound: 50 }, blanket: '#5b5448', blood: true,
      greet: ['Qui est là ?… Pitié, ne me faites pas de mal.', 'Ma jambe… un éclat d\'obus. Ça ne veut pas se refermer.'],
      need: {
        items: { bandage: 1 }, label: 'Lui donner un bandage',
        ask: 'Vous auriez un bandage ? Juste un. Je vous en supplie.',
        thanks: 'Merci… Tenez, prenez ça. Je n\'en aurai plus besoin là où je vais. Au grenier, derrière les gravats, il y a encore une valise.',
        reward: { passe_partout: 1 }, moral: 6
      },
      after: ['Ça tient. Grâce à vous.', 'Je partirai demain, vers le sud. Faites attention à vous.']
    },
    arthur: {
      name: 'Arthur Whitaker', title: 'Vieil homme',
      look: { hair: 'short', build: 0.9, h: 0.95, coat: '#58524a', pants: '#34312d', coatLen: 0.05, skin: '#b3a595', hairColor: '#a8a298', brow: 'thin', top: 'cardigan', shirt: '#8a8276', glasses: true },
      pose: 'stand',
      greet: ['Vous êtes du quartier ? On ne voit plus grand monde.', 'Edith est malade. La fièvre ne tombe pas depuis trois jours.', 'Nous n\'avons pas grand-chose… mais on peut échanger.', 'La remise est fermée au cadenas. Mes outils, c\'est tout ce qui me reste de l\'atelier.'],
      trade: {
        stock: { conserve: 2, legumes: 2, cafe: 1, livres: 3, tabac: 2, bijoux: 1 },
        likes: { medicaments: 1.8, bandage: 1.5, remede: 1.6, bois: 1.3, conserve: 1.2 },
        say: 'Des médicaments… c\'est tout ce qui compte pour nous.'
      },
      afterSteal: ['Pourquoi ? Nous ne vous avions rien fait…', 'Partez. S\'il vous plaît, partez.']
    },
    edith: {
      name: 'Edith Whitaker', title: 'Vieille femme malade',
      look: { hair: 'shoulder', build: 0.85, h: 0.9, coat: '#6a6158', pants: '#3a3632', coatLen: 0.2, skin: '#b8ab9c', hairColor: '#c9c3b8', smile: false, lips: true, female: true, top: 'cardigan', shirt: '#8c8478' },
      pose: 'lie', cond: { sick: 60 },
      greet: ['Arthur ? C\'est toi ?…', 'J\'ai si froid…'],
      need: {
        items: { medicaments: 1 }, label: 'Lui donner des médicaments',
        ask: 'Arthur dit que vous êtes gentils… Il nous faudrait des médicaments.',
        thanks: 'Que Dieu vous garde. Arthur, donne-leur la montre de ton père. Il le faut.',
        reward: { montre: 1 }, moral: 9
      },
      after: ['Je me sens un peu mieux. Merci, mon petit.']
    },
    sal: {
      name: 'Sal', title: 'Marchand',
      look: { hair: 'short', build: 1.12, h: 1.0, coat: '#3e3a33', pants: '#2a2825', coatLen: 0.12, skin: '#a08a74', hairColor: '#2a2420', beard: 'stubble', brow: 'heavy', top: 'overcoat', shirt: '#5a5348' },
      pose: 'sit',
      greet: ['Tout s\'échange, l\'ami. Tout.', 'Le père Daniel me laisse installer mon étal ici. En échange, je ne fais pas de prix aux réfugiés.'],
      trade: {
        stock: { conserve: 3, eau: 4, bandage: 2, medicaments: 1, cigarettes: 4, alcool: 1, munitions: 6, pieces_meca: 2, pieces_elec: 1, filtre: 1, couteau: 1, pied_de_biche: 1, cafe: 2, sucre: 2 },
        likes: { bijoux: 1.25, montre: 1.3, diamants: 1.35, alcool: 1.3, cigarettes: 1.2, cafe: 1.2 },
        restock: 3,
        say: 'Les bijoux, la gnôle, le café : voilà ce qui a de la valeur, maintenant.'
      }
    },
    daniel: {
      name: 'Père Daniel', title: 'Prêtre',
      look: { hair: 'short', build: 0.95, h: 1.02, coat: '#1f1e1c', pants: '#1a1918', coatLen: 0.38, skin: '#b0a291', hairColor: '#6d675f', brow: 'thin', top: 'overcoat', shirt: '#d8d2c4' },
      pose: 'stand',
      greet: ['Soyez en paix. Ici, personne ne vous demandera d\'où vous venez.', 'Nous hébergeons onze personnes. Les vivres s\'épuisent.'],
      donate: {
        items: { conserve: 1 }, alt: { legumes: 2 }, label: 'Faire un don de nourriture',
        thanks: 'Ce repas nourrira deux enfants ce soir. Merci.', moral: 5
      }
    },
    rosa: {
      name: 'Rosa', title: 'Réfugiée',
      look: { hair: 'long', build: 0.86, h: 0.93, coat: '#5a5048', pants: '#302d29', coatLen: 0.22, skin: '#9c8570', hairColor: '#1a1612', lips: true, female: true, top: 'cardigan', shirt: '#7a6e62', scarf: '#6a4e40' },
      pose: 'sit',
      greet: ['Lili a de la fièvre depuis hier soir…', 'Le médecin de l\'hôpital n\'a plus rien. Plus rien du tout.'],
      need: {
        items: { medicaments: 1 }, label: 'Lui donner des médicaments',
        ask: 'Vous avez des médicaments ? N\'importe quoi contre la fièvre…',
        thanks: 'Merci… merci. Prenez ma bague. Non, prenez-la. C\'est tout ce que j\'ai.',
        reward: { bijoux: 1 }, moral: 10
      },
      after: ['Elle dort enfin. Je n\'oublierai pas votre visage.']
    },
    lili: {
      name: 'Lili', title: 'Enfant malade',
      look: { hair: 'long', build: 0.6, h: 0.6, coat: '#6f665b', pants: '#3a3632', coatLen: 0.1, skin: '#b4a592', hairColor: '#2a2420', female: true, top: 'cardigan', shirt: '#8c8478' },
      pose: 'lie', cond: { sick: 60 },
      greet: ['…'], silent: true
    },

    // ---- Hôpital de campagne
    ruth: {
      name: 'Dr Ruth Keller', title: 'Chirurgienne',
      look: { hair: 'bun', build: 0.88, h: 0.97, coat: '#b9b4a8', pants: '#3a3632', coatLen: 0.34, skin: '#b3a08c', hairColor: '#4a4038', lips: true, female: true, brow: 'thin', top: 'overcoat', shirt: '#6a7068', glasses: true },
      pose: 'stand',
      greet: ['Si vous venez pour être soigné, il faudra attendre. Il y a trois blessés avant vous.', 'Je n\'ai pas dormi depuis deux jours. Parlez vite.', 'On opère à la lampe à pétrole. On recoud avec du fil de pêche.'],
      need: {
        items: { alcool: 1 }, label: 'Lui donner de la gnôle (pour désinfecter)',
        ask: 'De l\'alcool. Fort, si possible. Je n\'ai plus rien pour désinfecter les plaies.',
        thanks: 'Ça va sauver une jambe, peut-être deux. Prenez ça — on s\'arrangera. Et si l\'un des vôtres est malade, revenez me voir.',
        reward: { medicaments: 1, bandage: 2 }, moral: 7
      },
      donate: {
        items: { bandage: 1 }, alt: { eau: 2 }, label: 'Faire un don à l\'hôpital',
        thanks: 'Merci. Chaque bandage compte, ici.', moral: 4
      },
      after: ['Le soldat du rez-de-chaussée va s\'en sortir. Grâce à vous, en partie.', 'Reposez-vous quand vous pouvez. Personne ne le fait jamais.'],
      afterSteal: ['Vous avez pris les médicaments ? Des gens vont mourir cette nuit. Vous comprenez ça ?', 'Sortez. Je ne veux plus vous voir ici.']
    },
    benny: {
      name: 'Benny', title: 'Infirmier',
      look: { hair: 'short', build: 1.02, h: 1.0, coat: '#a8a498', pants: '#34312d', coatLen: 0.2, skin: '#8f7864', hairColor: '#1e1a16', beard: 'stubble', top: 'overcoat', shirt: '#5e6660' },
      pose: 'stand',
      greet: ['Vous cherchez quelqu\'un ? Les listes des blessés sont affichées près de la porte.', 'Le docteur ne dort plus. Moi non plus, d\'ailleurs.', 'On troque ce qu\'on peut pour faire tourner la maison. Les dons ne suffisent plus.'],
      trade: {
        stock: { bandage: 3, remede: 2, herbes: 3, eau: 2, cigarettes: 3, medicaments: 1 },
        likes: { alcool: 1.5, carburant: 1.4, bois: 1.3, eau: 1.25, conserve: 1.2, filtre: 1.3 },
        restock: 3,
        say: 'Du carburant pour le groupe électrogène, de l\'alcool, du bois pour stériliser : c\'est ce qui nous manque.'
      },
      afterSteal: ['Hé ! C\'est la pharmacie de l\'hôpital !', 'On n\'a plus rien à se dire.']
    },
    dale: {
      name: 'Dale', title: 'Soldat blessé',
      look: { hair: 'buzz', build: 1.05, h: 1.02, coat: '#4c4f3e', pants: '#3a3c30', coatLen: 0.1, skin: '#a58d76', hairColor: '#3a3028', beard: 'stubble', brow: 'heavy', top: 'work', shirt: '#5b5e4a' },
      pose: 'lie', cond: { wound: 65 }, blanket: '#6c6a5c', blood: true,
      greet: ['T\'as pas une cigarette, camarade ? Une seule.', 'Un obus, à la gare. Mes deux copains y sont restés.', 'Quand je pourrai remarcher, je rentre chez ma mère. C\'est tout ce que je veux.'],
      need: {
        items: { cigarettes: 2 }, label: 'Lui donner des cigarettes',
        ask: 'Deux cigarettes. Pour tenir la nuit. Je te revaudrai ça.',
        thanks: 'T\'es un frère. Tiens, prends mes cartouches : là où je suis, je ne tirerai plus sur personne.',
        reward: { munitions: 5 }, moral: 4
      },
      after: ['Ça va mieux. Le docteur dit que je garderai la jambe.', 'Fais attention dehors, camarade.']
    },

    // ---- École bombardée
    carol: {
      name: 'Carol', title: 'Institutrice',
      look: { hair: 'shoulder', build: 0.9, h: 0.96, coat: '#5e5a66', pants: '#33312f', coatLen: 0.26, skin: '#b6a38f', hairColor: '#6e5440', lips: true, female: true, top: 'cardigan', shirt: '#8a8290', scarf: '#5a4e5c' },
      pose: 'stand',
      greet: ['Chut… Les petits dorment enfin.', 'Je continue la classe le matin. Ça les occupe. Et ça m\'empêche de penser.', 'Quarante-deux personnes dans ce gymnase. Neuf familles.'],
      need: {
        items: { sucre: 1 }, label: 'Lui donner du sucre (anniversaire de Tim)',
        ask: 'Demain, Tim aura huit ans. S\'il y avait un peu de sucre… De quoi faire un semblant de gâteau.',
        thanks: 'Vous ne savez pas ce que ça va représenter pour lui. Tenez — c\'est l\'infirmerie de l\'école, il n\'y en a plus besoin pour les genoux écorchés.',
        reward: { bandage: 1, herbes: 2 }, moral: 6
      },
      after: ['Tim a soufflé une bougie plantée dans du pain sucré. Il n\'a pas arrêté de rire.', 'Revenez quand vous voulez. Les enfants vous appellent « le fantôme gentil ».'],
      afterSteal: ['Des enfants dorment ici. Des enfants !', 'Allez-vous-en.']
    },
    hal: {
      name: 'Hal', title: 'Père de famille',
      look: { hair: 'short', build: 1.08, h: 1.01, coat: '#4a453c', pants: '#2c2a26', coatLen: 0.14, skin: '#a28b75', hairColor: '#3b332c', beard: 'stubble', brow: 'heavy', top: 'work', shirt: '#625a4e' },
      pose: 'sit',
      greet: ['Pas plus près. J\'ai trois gosses qui dorment derrière moi.', 'Bon. Vous n\'avez pas l\'air d\'un pillard. Pas trop.', 'Je cultivais des tomates, avant. J\'en ai encore quelques-unes.'],
      trade: {
        stock: { legumes: 3, eau: 2, bois: 3, tabac: 2, cigarettes: 1, livres: 2 },
        likes: { conserve: 1.4, medicaments: 1.7, bandage: 1.4, sucre: 1.3, bois: 1.1 },
        restock: 4,
        say: 'Des conserves, des médicaments pour les gosses. Le reste, je m\'en fiche.'
      },
      afterSteal: ['Je savais qu\'il ne fallait pas vous faire confiance.', 'Si je vous revois ici, je ne réponds plus de rien.']
    },
    tim: {
      name: 'Tim', title: 'Enfant',
      look: { hair: 'short', build: 0.62, h: 0.62, coat: '#5d6a6e', pants: '#3a3632', coatLen: 0.08, skin: '#b8a693', hairColor: '#7a5e42', top: 'work', shirt: '#8c8478' },
      pose: 'sit',
      greet: ['T\'es qui, toi ? T\'as un fusil ?', 'Madame Carol dit que la guerre finira avant l\'été.', 'Mon papa, il est parti se battre. Il revient bientôt.']
    }
  };

  // Propriétaires : ce que coûte au groupe le vol de leurs affaires
  // later : conséquence apprise quelques jours plus tard
  C.OWNERS = {
    // desc : texte du menu · warn : fenêtre de confirmation · furn : meuble à démonter
    whitaker: {
      text: ' a volé les Whitaker. Le vieil homme a supplié ; sa femme pleurait.', moral: -16, key: 'stole_old', horvat: true,
      desc: 'Les affaires des Whitaker. Ce vieux couple n\'a presque plus rien.',
      warn: 'Tout ce qui est là appartient à Arthur et Edith Whitaker. Sans ça, ils ne passeront peut-être pas l\'hiver.',
      furn: 'Un meuble des Whitaker. Le démonter, c\'est les voler.'
    },
    eglise: {
      text: ' a volé ceux qui s\'abritaient dans l\'église.', moral: -9, key: 'stole',
      desc: 'Les réserves du père Daniel, pour les réfugiés qu\'il héberge.',
      warn: 'Ce sont les vivres des réfugiés de l\'église. Onze personnes en dépendent, dont des enfants.'
    },
    hopital: {
      text: ' a volé les réserves de l\'hôpital. Les blessés n\'auront rien cette nuit.', moral: -15, key: 'stole_hospital',
      desc: 'Les réserves de l\'hôpital. Des blessés en dépendent.',
      warn: 'Ces médicaments et ces bandages sont ceux des blessés de l\'hôpital. Le docteur n\'a rien d\'autre.',
      furn: 'Un meuble de l\'hôpital. Le démonter, c\'est voler les soignants.',
      later: { days: 2, text: 'On raconte qu\'une fillette est morte à l\'hôpital de campagne, faute de médicaments.', moral: -7, key: 'hospital_death' }
    },
    ecole: {
      text: ' a volé les familles réfugiées de l\'école. Des enfants ont tout vu.', moral: -13, key: 'stole_kids',
      desc: 'Les affaires des familles réfugiées dans le gymnase.',
      warn: 'Ces affaires appartiennent aux familles de l\'école. Des enfants dorment juste à côté.'
    }
  };

  // Les plans des lieux (géométrie libre) sont dans lieux.js
  C.MAPS = {};

  // Lieux jouables : ceux qui ont un plan
  C.isPlayableLocation = function (id) { return !!C.MAPS[id]; };
})(window.CQR);
