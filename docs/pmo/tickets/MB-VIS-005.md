# MB-VIS-005 — Routage utilisateur des fils

**Programme :** Experience  
**Épic :** EXP2 — Visualisation des fils  
**Type :** Ticket PMO — Architecture / Presentation / Core integration  
**Statut :** READY FOR IMPLEMENTATION  
**Priorité :** P1 — Seuil Tinkercad  
**Date de rédaction :** 2026-08-21  

## 1. Objet

MB-VIS-005 établit le routage utilisateur des fils par points intermédiaires (**waypoints**) persistants.

Le ticket transforme le contrat architectural désormais verrouillé par **ADR-008 — ACCEPTED / AMENDED** en périmètre d'exécution contrôlé.

Le ticket intervient après MB-VIS-004. MB-VIS-004 reste limité à la visualisation réactive des fils et ne constitue pas une implémentation partielle de MB-VIS-005.

## 2. Autorité architecturale

La source de vérité du contrat des waypoints est **ADR-008 — Architecture du modèle de connexion électrique**, dans sa version amendée.

Le contrat architectural est :

```text
Wire {
  id,
  pinA,
  pinB,
  waypoints: [{ x, y }, ...]
}
```

Les waypoints sont :

- une propriété du Wire ;
- persistants dans le Document ;
- indépendants de l'identité et de la sémantique des pins ;
- consommés par Presentation pour produire la géométrie du fil ;
- soumis au canal Mutation lorsqu'ils sont modifiés ;
- soumis à Validation avant application ;
- historisables et réversibles selon le mécanisme de Mutation.

`ADR-003-visualization-manager-registry.md` n'est pas une source d'autorité pour ce ticket. Le doublon documentaire historique a été régularisé et ne doit plus être cité comme justification du contrat des waypoints.

## 3. Objectif

Permettre à l'utilisateur de manipuler le tracé d'un Wire par ajout, déplacement et suppression de points intermédiaires, tout en conservant ces points dans le Document et en garantissant leur cohérence avec les responsabilités Core / Presentation.

## 4. Scope IN

### 4.1 Document / Wire

- étendre le contrat du Wire afin de supporter une collection optionnelle de waypoints ;
- préserver la rétrocompatibilité avec les documents existants ne contenant aucun waypoint ;
- conserver les références `pinA` et `pinB` comme seules références topologiques des extrémités du Wire ;
- ne pas introduire de propriété de rendu dans le Wire au-delà des données de routage nécessaires au contrat architectural.

### 4.2 Mutation / CF3

Introduire le chemin de mutation persistant nécessaire à la modification des waypoints.

Le premier contrat de mutation attendu est une opération globale de type :

```text
updateWireWaypoints(wireId, waypoints)
```

La mutation doit respecter le canal CF3 établi :

```text
CommandBus → Handler → HistoryService → Document
```

Le nom définitif de la commande et du Handler peut suivre les conventions déjà établies dans CF3, mais ne doit pas créer un second canal de mutation.

### 4.3 Validation

Étendre la validation du Wire au minimum nécessaire pour accepter ou refuser une modification de waypoints selon le contrat de données arrêté par ADR-008.

La validation minimale doit notamment garantir :

- coordonnées numériques et finies ;
- structure valide de chaque waypoint ;
- absence de valeur manifestement invalide (`NaN`, `Infinity`, structure malformée) ;
- conservation de l'intégrité du Wire et de ses références topologiques.

Les règles avancées de routage ne font pas partie de ce ticket.

### 4.4 History / Undo / Redo

Une modification persistante des waypoints doit être intégrée au mécanisme d'historisation existant.

Les opérations suivantes doivent être réversibles :

- ajout/modification d'un ensemble de waypoints ;
- suppression de waypoints ;
- déplacement d'un ou plusieurs waypoints via la mutation globale.

Un nouveau système d'historisation parallèle est interdit.

### 4.5 Presentation / géométrie

- consommer les waypoints persistants du Wire ;
- intégrer les waypoints au calcul de géométrie du fil ;
- permettre leur manipulation utilisateur dans Presentation ;
- maintenir la séparation entre donnée métier persistante et restitution graphique ;
- conserver les états visuels issus de MB-VIS-004 sans leur faire porter la responsabilité du routage persistant.

Le rendu exact (ligne, segments, courbe, interpolation) doit rester déterminé par le contrat de géométrie existant et les choix d'implémentation validés dans le périmètre du ticket ; aucune nouvelle décision architecturale sur le modèle Wire ne doit être introduite implicitement à ce niveau.

## 5. Scope OUT

Le ticket n'autorise pas :

- pathfinding automatique ;
- évitement automatique d'obstacles ;
- routage 3D ;
- simulation ou physique des fils ;
- calcul de courant ou de tension ;
- animations avancées de flux ;
- modification du contrat d'identité des pins ;
- modification de `canonicalRegistry.js` pour y placer les waypoints ;
- création d'un Registry de présentation ;
- introduction d'un `VisualizationManager` comme source d'autorité ;
- stockage parallèle des waypoints dans Presentation ;
- nouvelle capacité de collaboration temps réel ;
- refonte générale de la géométrie des composants ou des fils hors besoin direct du ticket.

## 6. Dépendances

### Obligatoires

- **ADR-008 — Architecture du modèle de connexion électrique :** contrat architectural amendé des waypoints.
- **Tome II — PLATFORM_ARCHITECTURE.md :** Document, Mutation, Validation et Presentation comme frontières de responsabilité.
- **CF3 — Canal Mutation unique :** le chemin de mutation persistante doit respecter le canal établi.
- **MB-VIS-004 :** visualisation réactive des fils terminée et disponible comme base de restitution.
- **ADR-014 :** contrat des pins ; aucune modification de ce contrat n'est autorisée dans MB-VIS-005.

### Dépendances de gouvernance

- régularisation d'ADR-003 : effectuée avant ce ticket ; ADR-003 ne constitue plus une autorité pour les waypoints ;
- amendement d'ADR-008 : effectué avant ce ticket ; la question Core vs Presentation-only est considérée comme tranchée.

## 7. Contrat fonctionnel attendu

À la fin du ticket :

1. un Wire sans waypoint reste valide et se comporte comme aujourd'hui ;
2. un Wire peut contenir zéro, un ou plusieurs waypoints persistants ;
3. les waypoints sont sauvegardés avec le Document ;
4. une modification de waypoints passe par Mutation ;
5. la modification est validée avant application ;
6. la modification est historisée ;
7. Undo restaure l'état précédent des waypoints ;
8. Redo restaure l'état suivant ;
9. Presentation utilise les waypoints du Document pour produire le tracé ;
10. la manipulation utilisateur ne crée pas un état métier concurrent dans Presentation ;
11. la suppression d'un Wire ne laisse pas d'état de waypoint orphelin ;
12. les références de pins restent conformes à ADR-014.

## 8. Critères d'acceptation

### AC-01 — Contrat Wire

Le modèle Wire accepte `waypoints` sans casser les Wire existants dépourvus de cette propriété.

### AC-02 — Persistance

Après modification puis sérialisation/rechargement du Document, les waypoints sont conservés à l'identique.

### AC-03 — Mutation unique

Toute modification persistante des waypoints passe par le canal CF3. Aucun accès direct au Document depuis Presentation n'est accepté.

### AC-04 — Validation

Une modification contenant une structure de waypoint invalide est refusée avant application au Document.

### AC-05 — Historisation

Une modification de waypoints peut être annulée puis rétablie avec Undo/Redo sans divergence du Document.

### AC-06 — Géométrie

La géométrie rendue d'un Wire tient compte de ses waypoints dans leur ordre persistant.

### AC-07 — Interaction utilisateur

L'utilisateur peut manipuler les waypoints prévus par le périmètre du ticket et observer immédiatement le nouveau tracé.

### AC-08 — Rétrocompatibilité

Un document historique sans `waypoints` reste chargeable et produit le tracé par défaut équivalent à celui d'avant MB-VIS-005.

### AC-09 — Suppression du Wire

La suppression d'un Wire ne laisse aucune donnée de routage persistante détachée du Wire supprimé.

### AC-10 — Pins / Registry

Aucune modification du contrat `pin.id` ou du Registry canonique n'est introduite pour réaliser le routage.

### AC-11 — Séparation architecturale

Aucune dépendance Core → Presentation, aucune mutation directe du Document depuis Presentation et aucun état métier parallèle des waypoints dans Presentation ne sont introduits.

### AC-12 — Non-régression MB-VIS-004

Les états visuels déjà livrés par MB-VIS-004 restent fonctionnels lorsque le Wire possède ou non des waypoints.

## 9. Tests attendus

### 9.1 Tests Document / modèle

- Wire sans waypoints ;
- Wire avec `waypoints: []` ;
- Wire avec plusieurs waypoints ;
- sérialisation/désérialisation ;
- rétrocompatibilité avec document historique sans champ `waypoints`.

### 9.2 Tests Mutation / CF3

- création d'une modification de waypoints ;
- modification d'un ensemble existant ;
- suppression de tous les waypoints ;
- rejet d'un Wire inexistant ;
- vérification du passage par CommandBus / Handler / HistoryService ;
- absence de mutation directe depuis Presentation.

### 9.3 Tests Validation

- waypoint valide ;
- coordonnées non numériques ;
- `NaN` / `Infinity` ;
- structure malformée ;
- Wire topologiquement invalide ;
- conservation de l'intégrité `pinA` / `pinB`.

### 9.4 Tests History

- Undo après modification ;
- Redo après Undo ;
- nouvelle action après Undo invalide correctement le Redo selon le contrat History existant ;
- plusieurs modifications successives de waypoints.

### 9.5 Tests Presentation / géométrie

- Wire sans waypoint ;
- Wire avec un waypoint ;
- Wire avec plusieurs waypoints ;
- ordre des waypoints respecté ;
- déplacement d'un waypoint met à jour le tracé ;
- suppression d'un waypoint met à jour le tracé ;
- non-régression des états visuels de MB-VIS-004.

### 9.6 Tests d'architecture / gouvernance

Vérifier au minimum :

- aucune importation Core → Presentation ;
- aucune mutation directe du Document depuis Presentation ;
- aucun stockage parallèle persistant des waypoints dans Presentation ;
- aucune modification du Registry canonique pour les waypoints ;
- aucune référence active à ADR-003 comme source du contrat des waypoints.

## 10. Invariants à préserver

1. **Document = source de vérité métier.**
2. **Mutation = seul mécanisme d'évolution du Document.**
3. **Validation = contrôle préalable de cohérence.**
4. **Presentation = restitution, jamais propriétaire de l'état métier.**
5. **Wire = connexion topologique + données de routage persistantes prévues par ADR-008 ; pas de données de rendu arbitraires.**
6. **Pin identity = ADR-014 ; aucun waypoint dans le Registry canonique.**
7. **Aucun nouveau canal de mutation.**
8. **Aucune décision architecturale implicite dans l'implémentation.**

## 11. Règles de gouvernance

### G-01 — Aucun élargissement silencieux

Tout besoin hors scope doit être signalé et faire l'objet d'un arbitrage avant implémentation.

### G-02 — ADR-008 est l'autorité

Toute interprétation du modèle persistant des waypoints doit être conforme à ADR-008 amendé.

### G-03 — ADR-003 n'est pas une référence active

Aucune implémentation ou documentation nouvelle ne doit présenter ADR-003 comme fondement du routage.

### G-04 — CF3 obligatoire

Une mutation persistante de waypoint ne peut contourner le canal Mutation unique.

### G-05 — Pas de refonte opportuniste

Le ticket ne doit pas servir à corriger d'autres mutations legacy, refondre la géométrie globale ou résoudre des problèmes étrangers au routage utilisateur.

### G-06 — Validation avant intégration

Aucune intégration dans `main` ne doit être considérée comme acquise avant vérification des critères d'acceptation et des tests attendus.

### G-07 — Rôles des agents

Le ticket est un contrat PMO. Les agents d'implémentation ne peuvent pas modifier son scope, ses invariants ou ses dépendances architecturales sans arbitrage CSA explicite.

### G-08 — Audit avant implémentation

Le présent ticket est précédé de la confrontation indépendante Qwen / Claude et de la régularisation documentaire ADR-003 / ADR-008. Aucun nouvel audit d'architecture n'est requis pour rouvrir la question Core vs Presentation-only, sauf découverte factuelle contradictoire.

## 12. Livrables attendus

- évolution du contrat Wire ;
- mutation CF3 dédiée aux waypoints ;
- validation minimale des waypoints ;
- intégration History ;
- calcul de géométrie compatible avec les waypoints ;
- interaction utilisateur ;
- tests unitaires, intégration et architecture ;
- rapport final du ticket avec preuves de conformité aux AC-01 à AC-12.

## 13. État de départ / état de fin

**État de départ :**

- Wire topologique sans waypoints ;
- MB-VIS-004 terminé ;
- CF3 établi mais non universellement migré ;
- aucune mutation de waypoints ;
- aucune validation de waypoints ;
- aucune géométrie exploitant des waypoints.

**État de fin attendu :**

- Wire persistant avec waypoints optionnels ;
- mutation des waypoints intégrée à CF3 ;
- validation minimale ;
- History/Undo/Redo fonctionnels ;
- rendu et manipulation utilisateur des waypoints ;
- rétrocompatibilité ;
- aucun contournement architectural.

## 14. Condition de clôture PMO

MB-VIS-005 ne peut être déclaré techniquement terminé que lorsque :

- tous les critères AC-01 à AC-12 sont démontrés ;
- les tests attendus sont exécutés avec succès ou toute exception est explicitement arbitrée ;
- aucune modification hors scope n'est intégrée sans justification ;
- le rapport final fournit les preuves de conformité ;
- l'état Git et la portée des changements sont vérifiés ;
- aucune régression de MB-VIS-004 n'est constatée.

**Aucune implémentation n'est autorisée par ce document seul : le ticket constitue le contrat PMO d'exécution et doit être traité selon le protocole d'agents et de validation du projet.**
