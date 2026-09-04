# MB-VIS-CANVAS-049 — Coordinate & Interaction Foundation

## A. IDENTITÉ

| Champ | Valeur |
|---|---|
| Ticket-ID | `MB-VIS-CANVAS-049` |
| Titre | Coordinate & Interaction Foundation |
| Pilier | Experience |
| Programme | Experience |
| Épic | EXP3 — Parité visuelle composants & expérience — seuil Tinkercad |
| Type | BUGFIX + REFACTOR |
| Importance | HIGH |
| Urgence | IMMEDIATE |
| Jalon | Niveau 1 — Fondation Canvas |

## B. MISSION

### Problème à résoudre
Les interactions du Canvas ne restent pas géométriquement cohérentes lorsque l'utilisateur travaille à un niveau de zoom différent de 100 %. Le déplacement, le marquee et les manipulations liées aux fils doivent suivre exactement le curseur à toutes les échelles.

### Contexte stratégique
Cette fondation est le préalable à une expérience Canvas de niveau Tinkercad, puis aux capacités propres à MYBlab de focus et de zoom visuel local.

### Bénéfice attendu
Le même geste utilisateur produit le même déplacement logique quelle que soit l'échelle d'affichage, sans modifier la géométrie électrique du circuit.

## C. CONTRAT D'EXÉCUTION

### Périmètre inclus
- établir une conversion cohérente entre coordonnées écran et coordonnées du document ;
- rendre cohérents déplacement, sélection par rectangle, manipulation de waypoints et dépôt de composants ;
- préserver la sélection simple/multiple, le snapping, le drag preview et l'historique existants ;
- couvrir explicitement les interactions à plusieurs niveaux de zoom ;
- conserver une base exploitable pour le futur pan, focus et zoom visuel local ;
- ajouter ou adapter les tests nécessaires pour verrouiller le comportement.

### Périmètre exclu
- pan ;
- focus composant ;
- zoom local par composant ;
- rotation ou miroir ;
- refonte graphique de la bibliothèque ;
- Inspector / Toolbar 2.0 ;
- modification du solveur, des nets ou de la sémantique électrique ;
- agrandissement ou régénération des 16 assets réalistes ;
- nouvelle technologie de rendu.

### Niveau de liberté
`CONCEPTION`, sous respect des invariants architecturaux et des décisions CSA ci-dessous.

### Performances attendues
Aucune dégradation observable du drag ou de la sélection par rapport à l'état de référence ; les interactions doivent rester cohérentes aux niveaux de zoom supportés actuellement.

### Livrables attendus
`CODE`, `TESTS`, `DOCUMENTATION`.

## D. CONTRAT DE VALIDATION

### Critères d'acceptation
1. À zoom supérieur à 1, un drag suit le curseur sans sur-déplacement.
2. À zoom inférieur à 1, un drag suit le curseur sans sous-déplacement.
3. Le marquee correspond visuellement à la zone réellement tracée par le curseur à plusieurs zooms.
4. Le drag de waypoint d'un fil reste cohérent à plusieurs zooms.
5. Le déplacement via Sidebar reste cohérent et ne diverge pas du modèle de coordonnées utilisé par les autres interactions.
6. Le drag du Breadboard reste cohérent à plusieurs zooms.
7. Le snapping conserve son comportement document attendu après conversion des coordonnées.
8. Une interaction terminée produit la même mutation métier et la même sémantique d'historique qu'avant.
9. La géométrie canonique des composants et des pins n'est pas modifiée par le zoom.
10. Aucun nouveau chemin de conversion de coordonnées concurrent n'est introduit lorsque la centralisation est possible.
11. Les tests nouveaux ou adaptés détectent un écart à zoom != 1.
12. Les tests de non-régression existants restent conformes à leur contrat.
13. Le build/typecheck reste valide.
14. `git diff --check` est propre.
15. Une preuve navigateur reproductible couvre au minimum un scénario à zoom inférieur et un scénario à zoom supérieur à 1.

### Conditions de refus
- correction limitée à un seul chemin alors qu'une interaction partage le même défaut ;
- contournement par modification des coordonnées électriques canoniques ;
- test uniquement à zoom 1 ;
- régression du drag, marquee, snapping, wires, breadboard ou History ;
- ajout d'une branche centrale par type de composant pour résoudre le problème.

### Preuves attendues
Logs de tests, résultat build/typecheck, `git diff --check`, démonstration navigateur avec zooms non unitaires, et résumé des fichiers touchés.

## E. CONTEXTE STRATÉGIQUE

### Justification de priorité
C'est la fondation bloquante du nouveau pipeline Canvas : avant tout pan, focus ou zoom visuel local, le repère écran→document doit être fiable.

### Tickets bloquants
`MB-VIS-COMP-036`, `MB-VIS-COMP-037`.

### Tickets bloqués
`MB-VIS-CANVAS-050`, `MB-VIS-CANVAS-052` et, par dépendance, la suite Canvas/UX prévue dans `EXP3-TINKERCAD-MASTER-SEQUENCE.md`.

## F. GESTION PMO

- Date de création : `2026-09-05`
- Cycle PMO : `VALIDÉ → EN COURS` uniquement après activation explicite du CSA GO.
- Statut actuel : `PRÊT POUR IMPLÉMENTATION`

## G. DÉCISION CSA

La décision d'architecture est portée par le Blueprint associé. Le présent Ticket n'impose pas un mécanisme concret ; il impose le résultat fonctionnel et les invariants.

## H. TRACE

Blueprint : `docs/pmo/blueprints/MB-VIS-CANVAS-049-blueprint.md`
Autorité : `docs/pmo/delivery-reports/MB-VIS-CANVAS-049-authority.md`
Séquence maître : `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
