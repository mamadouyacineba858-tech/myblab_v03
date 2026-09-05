# MB-VIS-CANVAS-050 — Canvas Navigation

## A. IDENTITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-050` |
| Titre | Canvas Navigation |
| Pilier | Experience |
| Programme | Experience |
| Épic | EXP3 — Parité visuelle composants & expérience — seuil Tinkercad |
| Type | FEATURE + REFACTOR |
| Importance | HIGH |
| Urgence | HIGH |
| Jalon | Niveau 1 — Fondation Canvas |

## B. MISSION

### Problème à résoudre
Le Canvas permet actuellement un zoom global borné, mais ne fournit pas une navigation de viewport complète. L'utilisateur ne peut pas pan correctement la scène, recentrer la vue, revenir à une vue déterministe, ajuster automatiquement la scène au contenu ou à la sélection, ni zoomer autour d'un point d'intérêt sans dérive du repère visuel.

### Contexte stratégique
Après MB-VIS-CANVAS-049, la conversion écran→Document est fiable à zoom non unitaire. Cette fondation permet maintenant de construire une navigation de Canvas cohérente avant le focus composant et le zoom visuel local de MB-VIS-CANVAS-052.

### Bénéfice attendu
L'utilisateur peut explorer et retrouver son circuit à différentes échelles et positions sans perdre la cohérence entre écran, viewport, Document, sélection, câblage et interactions existantes.

## C. CONTRAT D'EXÉCUTION

### Périmètre inclus
- pan du Canvas ;
- zoom global fiable ;
- zoom/navigation orientés curseur ;
- reset viewport ;
- fit-to-content ;
- fit-to-selection ;
- primitive générique de centrage/focus de viewport réutilisable par les tickets suivants ;
- maintien d'un modèle cohérent screen↔Document intégrant position du viewport et zoom ;
- adaptation des interactions existantes au viewport déplacé et zoomé ;
- couverture de tests et preuve navigateur pour les combinaisons pertinentes.

### Périmètre exclu
- focus UX/local zoom d'un composant ;
- rotation, miroir ou transformation de composant ;
- Inspector ;
- Component Library 2.0 ;
- Toolbar/Menu 2.0 complet ;
- isolation/performance globale du contexte React, réservée à MB-VIS-CANVAS-051 ;
- modification de la géométrie électrique canonique ;
- modification de la connectivité, des nets ou du solveur ;
- nouveau backend de rendu ;
- régénération/agrandissement des assets raster ;
- refonte générale du breadboard ou des fils sans nécessité directe de navigation ;
- historique métier des opérations de viewport.

### Niveau de liberté
`CONCEPTION`, sous respect du Blueprint `MB-VIS-CANVAS-050-blueprint` et des invariants CSA.

### Performances attendues
Aucune dégradation observable des interactions existantes. La navigation doit rester fluide dans le périmètre actuel ; l'optimisation structurelle du fan-out de rendu est explicitement traitée par MB-VIS-CANVAS-051.

### Livrables attendus
`CODE`, `TESTS`, `DOCUMENTATION`.

## D. CONTRAT DE VALIDATION

### Critères d'acceptation
1. Le Canvas supporte un pan horizontal et vertical déterministe.
2. Le pan ne modifie aucun objet du Document et n'ajoute aucune entrée Undo/Redo.
3. Le zoom global reste borné, déterministe et fonctionnel aux niveaux supportés.
4. Le zoom orienté curseur conserve le point Document ciblé sous le même point écran, dans la tolérance définie par les tests.
5. Reset ramène la navigation à une vue de référence déterministe.
6. Fit-to-content affiche l'ensemble de la scène pertinente avec une marge définie sans mutation du Document.
7. Fit-to-selection ajuste la vue aux éléments sélectionnés et devient un no-op sûr lorsqu'aucune sélection exploitable n'existe.
8. Une primitive générique de centrage/focus viewport existe et est utilisable sans introduire le focus/local zoom de composant.
9. Drag, marquee, waypoint, Breadboard et Sidebar restent corrects lorsque pan et zoom sont combinés.
10. La conversion screen↔Document reste unique et cohérente ; aucune seconde formule concurrente n'est introduite.
11. La géométrie canonique des composants et pins reste inchangée.
12. Les fils et la scène commune suivent la transformation du viewport sans décalage indépendant par sous-système.
13. Pan, zoom, reset et fit ne produisent aucune mutation métier ni entrée History.
14. Les tests de 049 restent verts et de nouveaux tests détectent les régressions propres à pan + zoom.
15. `tsc --noEmit`, build et `git diff --check` restent propres.
16. Une preuve navigateur reproductible couvre navigation, reset, fit et une interaction objet après pan + zoom.

### Conditions de refus
- modification de `component.x/y`, des pins, des wires ou de la simulation pour compenser la navigation ;
- plusieurs modèles screen↔Document selon les interactions ;
- pan qui concurrence un drag/marquee/waypoint/Breadboard/wiring actif ;
- viewport historisé comme mutation Document ;
- fit calculé à partir d'une géométrie écran déjà transformée ;
- introduction d'un rendu par type de composant ;
- implémentation du focus/local zoom ou des tickets 051+ dans ce même changement.

### Preuves attendues
Rapport de tests ciblés et régression, typecheck, build, `git diff --check`, preuve navigateur multi-zoom avec pan et commandes fit/reset, et résumé des fichiers effectivement touchés.

## E. CONTEXTE STRATÉGIQUE

### Justification de priorité
MB-VIS-CANVAS-050 est la deuxième fondation de la nouvelle chaîne Canvas : sans viewport navigable et stable, le futur focus composant, zoom local, contacts, wires, breadboard et bibliothèque ne peuvent pas converger vers une expérience cohérente.

### Ticket bloquant
`MB-VIS-CANVAS-049` — DONE / CLOS.

### Tickets bloqués
`MB-VIS-CANVAS-052` et les capacités dépendantes du viewport de la séquence EXP3.

## F. GESTION PMO

- Date de création : `2026-09-05`
- Cycle PMO : `VALIDÉ → EN COURS` uniquement après CSA GO.
- Statut actuel : `PRÊT POUR IMPLÉMENTATION`.

## G. DÉCISION CSA

Le mécanisme concret reste porté par le Blueprint. Le présent Ticket impose le résultat fonctionnel, les invariants et les preuves de sortie sans imposer un découpage de fichiers ou de hooks.

## H. TRACE

Blueprint : `docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md`
Autorité : `docs/pmo/delivery-reports/MB-VIS-CANVAS-050-authority.md`
Séquence maître : `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`

## I. SOURCES DE CADRAGE

- `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
- `docs/roadmaps/amendments/AMENDMENT-EXP3-UX-CANVAS-2026-09-04.md`
- `docs/pmo/tickets/MB-VIS-CANVAS-049.md`
- `docs/pmo/blueprints/MB-VIS-CANVAS-050-blueprint.md`
