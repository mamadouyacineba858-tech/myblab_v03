# MB-VIS-CANVAS-052 — Component Focus & Local Visual Zoom

## A. IDENTITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-052` |
| Titre | Component Focus & Local Visual Zoom |
| Pilier | Experience |
| Programme | Experience |
| Épic | EXP3 — Parité visuelle composants & expérience — seuil Tinkercad |
| Type | FEATURE + UX + PRESENTATION |
| Importance | HIGH |
| Urgence | HIGH |
| Jalon | Niveau 1 — Fondation Canvas |

## B. MISSION

### Problème à résoudre
Le Canvas dispose désormais des primitives de navigation globale et d'une frontière de performance adaptée aux interactions haute fréquence, mais il ne permet pas encore de mettre temporairement un composant en focus visuel ni d'augmenter localement sa lisibilité. Cette limitation est particulièrement pénalisante pour les composants raster réalistes dont la lisibilité des broches, pattes et détails doit rester exploitable sans modifier leur géométrie électrique canonique.

### Contexte stratégique
`MB-VIS-CANVAS-050` a établi le viewport global et ses primitives génériques de centrage/focus. `MB-VIS-CANVAS-051` a établi l'isolation des états d'interaction haute fréquence. `MB-VIS-CANVAS-052` doit exploiter ces fondations, sans créer une seconde caméra, un second modèle screen↔document ou une nouvelle vérité métier.

Le mécanisme doit être transversal aux composants et compatible avec les 16 assets raster validés. Le focus et le zoom visuel local sont des états de présentation/navigation ; ils ne doivent jamais devenir une transformation de la géométrie électrique.

### Bénéfice attendu
Un utilisateur peut identifier et inspecter visuellement un composant, le centrer dans le Canvas, augmenter sa lisibilité localement, puis quitter ce mode sans altérer sa position document, ses broches, ses connexions, sa sélection métier, sa simulation ou son historique.

## C. CONTRAT D'EXÉCUTION

### Périmètre inclus
- introduire un état de présentation indiquant au plus un composant actuellement focalisé ;
- permettre l'entrée en focus sur un composant de manière générique ;
- centrer le viewport sur le composant via les primitives existantes de `MB-VIS-CANVAS-050` ;
- permettre la sortie du focus sans créer de second système de viewport ;
- introduire une échelle visuelle locale bornée, finie et déterministe ;
- maintenir la distinction entre zoom global du viewport et échelle visuelle locale du composant ;
- appliquer le même mécanisme aux composants de types différents, sans branche de rendu spécifique par type ;
- conserver la cohérence entre corps raster, zone de hit, broches visibles, géométrie de présentation des broches et extrémités de fils ;
- conserver les interactions de déplacement, sélection, câblage et feedback existantes avec le composant focalisé ;
- préserver la frontière de performance établie par `MB-VIS-CANVAS-051` ;
- ajouter les tests unitaires/integration nécessaires aux invariants du focus et de l'échelle locale ;
- produire une preuve navigateur couvrant le focus, le zoom local et leur combinaison avec le zoom/pan global.

### Périmètre exclu
- modification de `component.x` / `component.y` pour simuler le focus ou le zoom local ;
- modification des coordonnées électriques canoniques des broches ;
- modification des identifiants de broches, références de fils ou données de simulation ;
- création d'un second viewport ou d'une seconde caméra ;
- rotation, miroir ou transformation géométrique générale ;
- refonte de la connectivité, des fils ou du breadboard ;
- refonte de la Component Library ;
- refonte Toolbar/Menu/Inspector ;
- régénération, remplacement ou agrandissement artificiel des assets raster ;
- nouveau backend de rendu ;
- modification du solveur ou de la sémantique électrique ;
- ajout d'une entrée dans l'historique pour l'entrée/sortie de focus ou le changement d'échelle locale ;
- modification des tickets futurs `053+` dans le même changement.

### Contrat UX minimal
Le comportement doit fournir une entrée en focus, une sortie de focus et une variation contrôlée de l'échelle locale. Le geste exact peut être choisi en conception s'il respecte les invariants du Blueprint ; il doit rester générique et ne pas dépendre du type de composant. La sortie doit être explicite et fiable, notamment au clavier, et ne doit pas corrompre l'état de navigation global.

Le zoom local ne remplace pas le zoom global : le premier agit sur la présentation du composant focalisé, le second sur le viewport. Leur combinaison doit rester déterministe et réversible.

### Niveau de liberté
`CONCEPTION`, sous respect strict du Blueprint `MB-VIS-CANVAS-052`, des invariants CSA et du présent contrat de validation.

### Contraintes architecturales obligatoires
1. Le Document reste l'unique source de vérité électrique et géométrique canonique.
2. Le focus est un état de présentation/navigation, pas un champ métier du Document.
3. L'échelle locale est un état de présentation borné et ne modifie jamais la géométrie électrique canonique.
4. Les bounds utilisés pour centrer le composant sont calculés dans l'espace Document, jamais à partir de pixels écran déjà transformés.
5. Le focus réutilise les primitives de viewport existantes au lieu de créer une seconde caméra.
6. Le mécanisme doit être commun aux 16 types de composants rasterisés.
7. Aucune logique `if type === ...` ou équivalent ne doit être introduite dans le renderer pour obtenir le focus/local zoom.
8. La zone de hit, le corps visuel, les broches et les endpoints de fils doivent rester cohérents sous l'échelle locale.
9. Une interaction pointer ne doit pas en déclencher simultanément une autre.
10. Le focus/local zoom ne doit pas produire de mutation du Document à chaque frame.
11. La frontière stable/high-frequency de `MB-VIS-CANVAS-051` doit être conservée.
12. Aucun état de présentation ne doit devenir un deuxième business model.

### Performances attendues
Le focus et l'échelle locale doivent rester fluides sur un circuit représentatif. Aucun seuil arbitraire de FPS ne doit être inventé ; la validation doit démontrer l'absence de fan-out inutile et préserver les garanties de `051`. Les états haute fréquence doivent continuer à être isolés des consommateurs stables qui n'en dépendent pas.

### Livrables attendus
`CODE`, `TESTS`, `DOCUMENTATION`, `BROWSER EVIDENCE`.

## D. CONTRAT DE VALIDATION

### Critères d'acceptation
1. Un composant peut entrer en focus via un mécanisme générique.
2. L'entrée en focus centre le viewport sur le composant sans modifier sa position Document.
3. Un seul composant est focalisé à la fois.
4. La sortie du focus est fiable et ne laisse pas d'état visuel orphelin.
5. Une échelle visuelle locale bornée peut être appliquée au composant focalisé.
6. L'échelle locale est déterministe, finie et ne modifie ni `x/y`, ni les coordonnées électriques, ni les identifiants de broches.
7. Le zoom global et l'échelle locale peuvent être combinés sans désynchronisation du modèle screen↔document.
8. Le corps raster, les broches visibles, la zone de hit et les endpoints de fils restent cohérents pendant le focus/local zoom.
9. Le composant focalisé reste sélectionnable et déplaçable selon les contrats existants.
10. Le composant focalisé reste connectable ; un câblage vers/depuis ses broches conserve les mêmes identités et références.
11. Les fils ne sont pas déplacés ou réécrits pour compenser la présentation locale.
12. L'entrée/sortie de focus et les changements de présentation locale ne créent aucune entrée d'historique métier.
13. Aucun changement de comportement électrique ou de simulation n'est introduit.
14. Le mécanisme fonctionne au moins sur deux composants de types visuellement différents, et l'architecture reste générique pour les 16 types.
15. Les interactions globales existantes de `050` (zoom, pan, reset/focus générique du viewport) restent fonctionnelles.
16. L'isolation de performance de `051` n'est pas régressée.
17. Les tests dédiés au focus, au centrage, aux bornes de l'échelle locale et aux invariants Document/pins/wires sont verts.
18. `tsc --noEmit`, build et `git diff --check` restent propres.
19. Une preuve navigateur démontre : composant non focalisé → entrée en focus → augmentation/réduction locale → drag → câblage → sortie de focus.
20. Une preuve navigateur démontre également la combinaison `zoom global + pan + focus + échelle locale`.
21. La console navigateur ne présente pas d'erreur liée au mécanisme.

### Invariants à vérifier explicitement
- même `component.uid` avant/après focus ;
- même `component.x/y` avant/après focus/local zoom ;
- mêmes pin IDs et références de connexion ;
- mêmes wire endpoints/références après sortie de focus ;
- même état électrique/simulation pour un scénario équivalent ;
- aucune entrée History créée par la présentation ;
- absence de second modèle de coordonnées ou de viewport.

### Conditions de refus
- focus simulé par mutation de la géométrie électrique ;
- local zoom implémenté comme simple CSS transform désynchronisant hit target, broches ou fils ;
- deuxième caméra/viewport ou deuxième vérité screen↔document ;
- comportement réservé à Arduino ou à un sous-ensemble de composants ;
- branche de rendu par type ajoutée pour contourner le mécanisme générique ;
- mutation haute fréquence du Document pour obtenir la fluidité ;
- entrée/sortie de focus inscrite dans l'historique métier ;
- régression du drag, de la sélection, du câblage, du pan ou du zoom global ;
- modification de la simulation/connectivité sans nécessité architecturale démontrée ;
- modification d'un ticket `053+` ou anticipation d'une fonctionnalité future ;
- validation reposant uniquement sur une inspection statique sans preuve navigateur des interactions ;
- erreur console non expliquée ou tests/build/typecheck en échec.

### Preuves attendues
Tests automatisés, typecheck, build, `git diff --check`, résumé des fichiers touchés, preuve navigateur et captures/observations des scénarios de focus/local zoom. Les preuves doivent distinguer clairement les faits observés des hypothèses.

## E. CONTEXTE STRATÉGIQUE

### Justification de priorité
`MB-VIS-CANVAS-052` constitue la capacité suivante de la Phase B : rendre un composant individuellement lisible sans compromettre le modèle électrique. Il prépare les interactions de présentation plus riches de la séquence EXP3 tout en conservant une architecture unique du Canvas.

### Ticket bloquant
`MB-VIS-CANVAS-050` — DONE / CLOS.
`MB-VIS-CANVAS-051` — DONE / CLOS.

### Tickets bloqués
Les capacités de présentation et de manipulation ultérieures de la séquence EXP3 qui dépendent du focus/local zoom et de la stabilité du Canvas.

## F. GESTION PMO

- Date de création : `2026-09-05`
- Cycle PMO : `VALIDÉ → EN COURS` uniquement après CSA GO.
- Statut actuel : `PRÊT POUR AUTHORITY / CSA GO`.

## G. DÉCISION CSA

Le ticket est suffisamment contraignant pour empêcher toute dérive vers une transformation électrique, une seconde caméra ou une implémentation spécifique à un composant. Le choix du détail d'interaction reste limité au contrat UX minimal et doit être arrêté dans l'Authority avant implémentation.

Aucune implémentation ne doit commencer avant émission explicite du `CSA GO`.

## H. TRACE

Blueprint : `docs/pmo/blueprints/MB-VIS-CANVAS-052-blueprint.md`
Authority : `docs/pmo/delivery-reports/MB-VIS-CANVAS-052-authority.md`
Séquence maître : `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
Amendement : `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
Dépendances : `docs/pmo/tickets/MB-VIS-CANVAS-050.md`, `docs/pmo/tickets/MB-VIS-CANVAS-051.md`

## I. SOURCES DE CADRAGE

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-050.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-051.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-051-blueprint.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-052-blueprint.md`
