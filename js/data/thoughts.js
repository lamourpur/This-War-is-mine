/* =========================================================
   Pensées et répliques des survivants
   {n} = nom d'une autre personne · {s} = nom du survivant concerné
   Une variante « _cyn » est utilisée pour les survivants cyniques.
   ========================================================= */
(function (C) {
  'use strict';

  C.THOUGHTS = {
    // ---- réactions aux événements (fiche « Pensées »)
    helped: ['On a fait ce qu\'il fallait.', 'Aider les autres, c\'est encore être humain.', 'Au moins, on a fait quelque chose de bien aujourd\'hui.'],
    helped_cyn: ['On n\'a pas de quoi faire la charité.', 'Très généreux. On verra si ça nous nourrit.'],
    refused: ['On n\'avait pas le choix… si ?', 'Je revois encore son visage.', 'On a fermé la porte. Qu\'est-ce qu\'on est en train de devenir ?'],
    refused_cyn: ['Chacun pour soi. C\'est la guerre.', 'On ne peut pas sauver tout le monde.'],
    stole: ['On vole des gens comme nous, maintenant.', 'Je n\'arrive pas à oublier ce qu\'on a fait cette nuit.', 'Ils n\'avaient déjà presque rien.'],
    stole_cyn: ['Ils avaient plus que nous. C\'est comme ça.', 'Mieux vaut eux que nous.'],
    stole_old: ['Les Whitaker… on leur a tout pris. Tout.', 'Ces deux vieux ne méritaient pas ça. Personne ne mérite ça.'],
    stole_old_cyn: ['Ils étaient vieux. Nous, on doit tenir.'],
    horvat: ['Les Whitaker sont morts. C\'est à cause de nous.', 'On les a tués aussi sûrement qu\'avec une balle.'],
    horvat_cyn: ['Ils n\'auraient pas tenu l\'hiver de toute façon.'],
    killed_self: ['J\'ai tué quelqu\'un. Je revois ses yeux chaque fois que je ferme les miens.', 'Je n\'aurais jamais cru pouvoir faire ça.'],
    killed_self_cyn: ['C\'était lui ou moi.'],
    death: ['{n} n\'est plus là. Plus rien n\'a de sens.', 'On aurait dû faire plus pour {n}.', 'Je garde la place de {n} près du poêle.'],
    suicide: ['{n}… on n\'a rien vu venir. Ou on n\'a pas voulu voir.', 'J\'aurais dû parler à {n}. J\'aurais dû.'],
    left: ['{n} est parti(e). Je comprends, un peu.', 'Même {n} a abandonné…'],
    raided: ['Ils sont entrés chez nous. Plus aucun endroit n\'est sûr.', 'Tout ce qu\'on avait réuni, envolé en une nuit.'],
    repelled: ['On les a repoussés. On peut encore se défendre.', 'Ils ne passeront pas. Pas cette fois.'],
    scav_good: ['Bonne nuit dehors. On va tenir un peu plus longtemps.', 'Je suis rentré(e) entier et les bras pleins.'],
    scav_bad: ['J\'ai failli ne pas revenir.', 'Dehors, c\'est l\'enfer.'],
    comforted: ['{n} a pris le temps de m\'écouter. Ça m\'a fait du bien.', 'Merci, {n}. Vraiment.'],
    comforter: ['J\'ai essayé d\'aider {n}. J\'espère que ça suffira.', '{n} va un peu mieux. Moi aussi, du coup.'],
    talked: ['J\'ai parlé avec {n}. On a presque ri.', 'Une bonne discussion avec {n}, comme avant la guerre.'],
    cared: ['{n} m\'a soigné(e). Sans les autres, je serais déjà mort(e).'],
    accepted: ['Une personne de plus à l\'abri. C\'est bien.'],
    accepted_cyn: ['Une bouche de plus à nourrir…'],
    winter: ['L\'hiver est là. Je ne sais pas si on passera.'],
    shelling: ['Chaque obus, je me dis que c\'est le nôtre.', 'Les murs ont tremblé toute la journée. Je n\'arrive plus à m\'arrêter de trembler, moi non plus.'],
    shelling_cyn: ['Encore des obus. On s\'habitue à tout.'],
    story: ['{n} nous a fait rire aujourd\'hui. J\'avais oublié ce que ça faisait.', 'Un moment volé, grâce à {n}.'],
    neighbor_dead: ['Le vieux Carl est mort de froid. Il nous saluait chaque matin.', 'Si on ne chauffe pas, ce sera nous, les prochains.'],
    neighbor_dead_cyn: ['Un de moins pour se disputer les réserves du quartier.'],
    bare: ['Ce refuge est une ruine. On vit comme des bêtes.'],
    cozy: ['Le refuge ressemble presque à une maison, maintenant.'],
    broken: ['Je n\'en peux plus. Je ne sais pas combien de temps je vais tenir.'],
    recovered: ['Je crois que le pire est passé. Pour moi, en tout cas.'],

    // ---- répliques spontanées (bulles)
    say_hungry: ['J\'ai tellement faim…', 'Mon ventre me fait mal.', 'Il reste quelque chose à manger ?'],
    say_tired: ['Je tiens à peine debout.', 'Il faut que je dorme…'],
    say_cold: ['On gèle, ici.', 'Je ne sens plus mes doigts.', 'Il faudrait faire du feu.'],
    say_sick: ['*tousse*', 'J\'ai de la fièvre, je crois.'],
    say_wounded: ['Ma blessure me lance.', 'Aïe… doucement.'],
    say_sad: ['Quand est-ce que ça va finir ?', 'Je pense à ma famille.', 'Avant, cette rue était pleine de vie.'],
    say_depressed: ['À quoi bon…', 'Je n\'ai plus la force.', 'Laissez-moi tranquille.'],
    say_broken: ['…', 'Je ne peux plus.', 'Tout ça ne sert à rien.'],
    say_grief: ['{n} aurait su quoi faire.', 'Je n\'arrête pas de penser à {n}.'],
    say_smoke: ['Je donnerais n\'importe quoi pour une cigarette.'],
    say_coffee: ['Un café… juste un café.'],
    say_ok: ['On tient bon.', 'Encore une journée.', 'Il faudrait réparer ce mur.', 'Tu as entendu les tirs cette nuit ?', 'Un jour, on reparlera de tout ça.', 'Ce silence dehors… ça ne présage rien de bon.'],
    say_ok_cyn: ['Tout se vend. Même maintenant.', 'Les héros meurent les premiers.'],
    talk_open: ['Tu te souviens d\'avant ?', 'Comment tu tiens le coup ?', 'Raconte-moi quelque chose. N\'importe quoi.'],
    talk_reply: ['Tu te rappelles le café du coin ?', 'Ça fait du bien de parler.', 'Un jour, on rira de tout ça.'],
    comfort_open: ['Viens, assieds-toi. Parle-moi.', 'Ça va aller. On est ensemble.', 'Je suis là. Je ne pars pas.'],
    comfort_reply: ['Merci… ça fait du bien.', 'Je ne sais pas ce que je ferais sans vous.'],
    care_open: ['Montre-moi ça. Doucement.', 'Ne bouge pas, je m\'en occupe.']
  };
})(window.CQR);
