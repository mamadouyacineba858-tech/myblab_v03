# ROADMAP AMENDMENT — EXP3 / UX CANVAS & LABORATORY EXPERIENCE

Date: 2026-09-04
Programme: Experience
Epic: EXP3 — Parité visuelle composants & expérience — seuil Tinkercad
Status: PROPOSED AMENDMENT — à intégrer dans la prochaine consolidation de ROADMAP_PLATFORM.md

## 1. Motif

La clôture de MB-VIS-COMP-037 — ARDUINO confirme que les 16 composants du catalogue visuel sont désormais rasterisés et que le principal déficit restant n'est plus la production individuelle d'assets mais l'expérience de visualisation, de navigation et de manipulation du canvas.

Les composants réalistes peuvent être correctement produits tout en restant trop petits ou difficiles à lire à l'écran. Le zoom global actuel agrandit l'ensemble de la scène ; il n'existe pas encore de véritable mécanisme de focus/zoom local par composant. La palette de composants et la barre d'outils restent également à un niveau de fonctionnalité inférieur au benchmark Tinkercad.

Cette découverte doit être conservée dans la roadmap pour éviter de traiter le problème composant par composant.

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

- commandes actuellement limitées à Nouveau, Ouvrir, Sauvegarder, Simuler, Arrêter, Zoom +/-, Paramètres ;
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

## 4. Proposition de nouvelle séquence opérationnelle post-découverte

Cette séquence est proposée pour la prochaine consolidation du §7.2.2 de ROADMAP_PLATFORM.md. Elle ne doit pas être exécutée telle quelle tant que l'audit architectural du canvas n'a pas été terminé et que les Blueprints respectifs n'ont pas reçu de CSA GO.

| Ordre | Ticket proposé | Objet | Statut | Dépendance |
| ---: | --- | --- | --- | --- |
| 0 | AUDIT-EXP3-002 | Audit architectural ciblé Canvas / UX et recalage de la séquence | À faire | COMP-037 validé |
| 1 | MB-VIS-CANVAS-049 | Canvas — navigation globale, pan, zoom, reset, fit-to-content, fit-to-selection | Proposé | AUDIT-EXP3-002 |
| 2 | MB-VIS-CANVAS-050 | Component Focus & Local Zoom — zoom local générique par composant | Proposé | CANVAS-049 |
| 3 | MB-VIS-CONTACT-051 | Contacts / pins — lisibilité, hit-test et ancrage à toutes les échelles | Proposé | CANVAS-050 |
| 4 | MB-VIS-WIRE-052 | Wire Visual System — géométrie, épaisseur, routage, jonctions | Proposé | CONTACT-051 |
| 5 | MB-VIS-WIRE-053 | Dynamic Wire States — restitution des états électriques | Proposé | WIRE-052 |
| 6 | MB-VIS-BREAD-054 | Breadboard Visual & Assembly — cohérence avec composants réalistes | Proposé | CONTACT-051 + WIRE-052 |
| 7 | MB-VIS-LIB-055 | Component Library 2.0 — catégories, recherche, aperçus réalistes, drag & drop | Proposé | CANVAS-049 |
| 8 | MB-VIS-UI-056 | Laboratory Toolbar 2.0 — menus, affichage, actions contextuelles | Proposé | CANVAS-049 + LIB-055 |
| 9 | MB-VIS-UI-057 | Component Inspector — propriétés, transformations visuelles, informations de pins | Proposé | CANVAS-050 + LIB-055 |
| 10 | MB-VIS-COMP-058 | Component Transform — rotation / miroir / échelle visuelle contrôlée | Proposé | CANVAS-050 + CONTACT-051 |
| 11 | MB-VIS-CANVAS-059 | Visual Depth & Interaction Feedback — ombres, hover, sélection, focus | Proposé | CANVAS-050 + COMP-058 |
| 12 | MB-VIS-STATE-060 | Component Visual States — cohérence des états de simulation | Proposé | WIRE-053 + COMP-058 |
| 13 | MB-VIS-LAB-061 | Laboratory Workspace — cohérence globale palette + toolbar + canvas + inspector | Proposé | 049–060 |
| 14 | MB-VIS-QA-062 | Visual Regression & Benchmark Gate — validation systématique | Proposé | LAB-061 |
| 15 | MB-VIS-TINKERCAD-063 | Audit comparatif MYBlab ↔ Tinkercad et Gate Niveau 1 | Jalon proposé | QA-062 |

## 5. Définition de MB-VIS-CANVAS-050 — Component Focus & Local Zoom

Objectif : permettre d'observer un composant réaliste à une taille confortable sans modifier l'échelle électrique du Document ni déformer le circuit.

Le ticket devra traiter au minimum :

- zoom local par composant sélectionné ;
- niveaux d'échelle explicites et bornés ;
- focus/centrage du composant ;
- sortie du focus ;
- conservation des positions électriques canoniques ;
- recalcul de la présentation des pins ;
- hit-test et sélection cohérents ;
- drag cohérent ;
- wires visuellement raccordés ;
- compatibilité avec zoom global 0.5× / 1× / 2× ;
- aucun branchement spécifique par type de composant ;
- réutilisation du même mécanisme pour ARDUINO, LED, RESISTOR, POWER, SERVO, etc.

Invariant fondamental :

```text
ÉCHELLE VISUELLE
      ≠
GÉOMÉTRIE ÉLECTRIQUE CANONIQUE
```

## 6. Component Library 2.0

La palette doit évoluer d'une simple liste de boutons vers une véritable bibliothèque de composants :

- recherche textuelle ;
- catégories ;
- sections repliables ;
- aperçu visuel réel ;
- drag & drop ;
- ajout par clic ;
- composants récents ;
- extension future vers favoris et catalogue plus large ;
- même identité visuelle et mêmes assets que le canvas.

## 7. Laboratory Toolbar 2.0

Le menu doit progressivement regrouper les fonctions par domaine :

```text
Fichier
Édition
Affichage
Composants
Câblage
Simulation
Outils
```

La section Affichage doit notamment porter les commandes de zoom global, reset, fit-to-content, fit-to-selection, grille et options de navigation.

Les actions contextuelles doivent être présentées lorsque cela apporte une valeur claire au composant sélectionné : déplacement, rotation, duplication, suppression, focus, zoom et propriétés.

## 8. Component Inspector

Le futur Inspector doit présenter les propriétés du composant sans introduire de seconde source de vérité : type/identité, position, rotation, échelle visuelle, pins, informations de présentation et propriétés réellement supportées par le modèle.

## 9. Règles de conception transversales

1. Aucun agrandissement spécifique d'asset par composant pour corriger la lisibilité du canvas.
2. Aucun changement du modèle électrique pour améliorer le rendu.
3. Aucun `if (type === ...)` dans une couche centrale lorsque la capacité peut être déclarative/générique.
4. Aucun couplage entre zoom visuel et mutation du Document.
5. Les assets réalistes validés restent réutilisables.
6. La lisibilité des pins doit être vérifiée à différentes échelles.
7. Les preuves navigateur et tests doivent couvrir les interactions combinées pertinentes.
8. Les travaux restent découpés en tickets indépendants et validés séquentiellement selon le protocole CSA.

## 10. Relation avec la roadmap existante

Cette proposition ne supprime pas l'historique V1→V22. Elle constitue une évolution de la séquence opérationnelle rendue nécessaire par les découvertes postérieures à la vague composants.

Les anciens tickets de la séquence 038→048 doivent être réconciliés avec cette nouvelle proposition lors de la prochaine mise à jour officielle de `ROADMAP_PLATFORM.md` : conserver ce qui est déjà réalisé, fusionner les objectifs qui se recouvrent, éviter tout doublon, préserver la traçabilité historique, et placer Canvas / Library / Toolbar / Inspector avant le gate final Tinkercad lorsque ces capacités sont des prérequis à une comparaison significative.

## 11. État après COMP-037

```text
COMP-031 → COMP-035 : réalisés
COMP-036 POWER      : réalisé / CSA Visual GO
COMP-037 ARDUINO    : réalisé / CSA Visual GO

16 / 16 composants : backend raster

Prochaine étape :
AUDIT-EXP3-002
        ↓
CANVAS / UX transversal
        ↓
CONTACTS / WIRES / BREADBOARD
        ↓
LIBRARY / TOOLBAR / INSPECTOR
        ↓
STATES / WORKSPACE / QA
        ↓
TINKERCAD GATE
```

## 12. Statut de gouvernance

Cet amendement fait partie des artefacts de roadmap et doit être pris en compte lors de la prochaine consolidation de `ROADMAP_PLATFORM.md`.

Aucun ticket proposé ici n'est un CSA GO d'implémentation. Chaque ticket devra suivre le cycle normal : audit/Blueprint → ticket PMO → CSA GO → implémentation → validation → CSA Visual/Technical GO.
