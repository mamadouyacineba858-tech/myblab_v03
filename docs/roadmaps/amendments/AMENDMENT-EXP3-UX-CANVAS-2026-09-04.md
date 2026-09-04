# ROADMAP AMENDMENT — EXP3 / UX CANVAS & LABORATORY EXPERIENCE

Date: 2026-09-04
Programme: Experience
Epic: EXP3 — Parité visuelle composants & expérience — seuil Tinkercad
Status: **CONSOLIDATED**

> La séquence opérationnelle issue de cet amendement a été consolidée le 2026-09-05 dans :
> `docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`
>
> Ce fichier reste conservé comme trace de décision et de découverte. La séquence maître opérationnelle post-037 est désormais celle du document consolidé.

## 1. Motif

La clôture de MB-VIS-COMP-037 — ARDUINO confirme que les 16 composants du catalogue visuel sont désormais rasterisés et que le principal déficit restant n'est plus la production individuelle d'assets mais l'expérience de visualisation, de navigation et de manipulation du canvas.

Les composants réalistes peuvent être correctement produits tout en restant trop petits ou difficiles à lire à l'écran. Le zoom global actuel agrandit l'ensemble de la scène ; il n'existe pas encore de véritable mécanisme de focus/zoom local par composant. La palette de composants et la barre d'outils restent également à un niveau de fonctionnalité inférieur au benchmark Tinkercad.

Cette découverte est conservée dans la roadmap afin d'éviter de traiter le problème composant par composant.

## 2. Décisions de trajectoire

1. Les assets réalistes existants sont conservés. On ne doit pas agrandir artificiellement les images raster pour compenser une faiblesse du canvas.
2. Le problème de lisibilité des composants est traité comme une capacité transversale de Presentation/Canvas.
3. Le zoom global et le zoom local d'un composant sont deux capacités distinctes.
4. L'échelle visuelle ne doit jamais modifier les coordonnées électriques canoniques, l'identité des pins, le modèle de connexion, la simulation ou les invariants du Core.
5. Le même mécanisme doit fonctionner pour tous les composants, pas uniquement ARDUINO.
6. La Component Library, la Toolbar et l'Inspector doivent évoluer vers une expérience de laboratoire cohérente.
7. Tinkercad reste un benchmark de perception et d'expérience, pas une spécification de code ou d'architecture.
8. Toute modification architecturale importante reste soumise au Tome II / ADR et au cycle Blueprint → Ticket PMO → CSA GO.

## 3. Familles de problèmes à traiter

### A. Canvas / lisibilité

- composants réalistes trop petits à l'écran pour une observation confortable ;
- zoom actuel uniquement global ;
- absence de focus explicite sur un composant ;
- absence de zoom local indépendant ;
- absence de fit-to-content / fit-to-selection ;
- navigation et zoom à stabiliser autour du curseur ;
- interaction sélection/drag/hit-test/wires à préserver à toutes les échelles.

### B. Component Library

- palette actuelle basée principalement sur PALETTE_ITEMS avec icône + label ;
- recherche absente ;
- catégories limitées ;
- aperçu de composants non homogène avec le rendu réaliste du canvas ;
- bibliothèque non conçue comme catalogue visuel extensible.

### C. Toolbar / Menu

- commandes actuellement limitées aux actions de base ;
- manque de regroupement logique Fichier / Édition / Affichage / Composants / Câblage / Simulation / Outils ;
- absence de commandes d'affichage structurées ;
- absence d'actions contextuelles adaptées au composant sélectionné.

### D. Inspector

- absence d'un panneau de propriétés visuelles et contextuelles ;
- absence de vue claire de la position, rotation, échelle visuelle et identité des pins ;
- l'Inspector ne devra jamais devenir une seconde source de vérité du Document.

### E. Transformations et feedback

- rotation et transformations visuelles à formaliser ;
- profondeur, ombres, hover, sélection et focus à homogénéiser ;
- comportement pendant drag et câblage à préserver.

### F. Fils / Breadboard / États

- les fils doivent atteindre un niveau cohérent avec les nouveaux assets ;
- le breadboard doit bénéficier de la même qualité d'expérience ;
- les états visuels doivent rester lisibles à différents zooms ;
- l'ensemble doit converger vers une expérience de laboratoire unique.

## 4. Nouvelle séquence consolidée

La séquence opérationnelle proposée ici a été réordonnée après l'audit architectural `EXP3-RECALAGE-002` afin de traiter d'abord les fondations de coordonnées, de navigation et de performance, puis le focus/local zoom, les contacts, fils, breadboard, bibliothèque, interface, transformations, états et QA.

La séquence maître, avec les niveaux 1 → 3 et les dépendances, est désormais maintenue dans :

`docs/roadmaps/EXP3-TINKERCAD-MASTER-SEQUENCE.md`

Le premier ticket opérationnel post-COMP-037 est :

**MB-VIS-CANVAS-049 — Coordinate & Interaction Foundation**

Il précède toute implémentation de focus ou de zoom local.

## 5. Invariant central conservé

```text
ÉCHELLE VISUELLE
      ≠
GÉOMÉTRIE ÉLECTRIQUE CANONIQUE
```

La couche de présentation peut évoluer sans modifier le Document électrique.

## 6. Statut de gouvernance

L'amendement n'est plus un plan proposé indépendant : ses décisions sont maintenant consolidées dans la séquence maître EXP3.

Aucun ticket de cette séquence n'est un CSA GO d'implémentation. Chaque ticket devra suivre le cycle normal : audit/Blueprint → ticket PMO → CSA GO → implémentation → validation → CSA Technical/Visual GO → commit/push.
