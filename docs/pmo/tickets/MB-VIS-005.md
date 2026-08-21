# MB-VIS-005 — Routage utilisateur des fils

**Programme :** Experience  
**Épic :** EXP2 — Visualisation des fils  
**Type :** Ticket PMO — Architecture / Presentation / Core integration  
**Statut :** READY FOR FINAL AUDIT  
**Priorité :** P1 — Seuil Tinkercad  
**Date de rédaction :** 2026-08-21  

## 1. Objet

MB-VIS-005 établit le routage utilisateur des fils par points intermédiaires (**waypoints**) persistants.

Le ticket transforme le contrat architectural verrouillé par **ADR-008 — ACCEPTED / AMENDED** en périmètre d'exécution contrôlé.

MB-VIS-005 intervient après MB-VIS-004. MB-VIS-004 reste limité à la visualisation réactive des fils et ne constitue pas une implémentation partielle de MB-VIS-005.

## 2. Décisions architecturales de référence

Ce ticket applique les décisions suivantes, déjà verrouillées :

- **ADR-008 amendé** : les waypoints sont une propriété persistante du Wire dans le Core (Document). Cette décision n'est pas remise en débat dans MB-VIS-005.
- **ADR-003 régularisé** : il ne constitue pas une source d'autorité pour le contrat des waypoints ; le canal de mutation persistant applicable est celui établi par CF3.
- **ADR-014** : le contrat des pins (identité, sémantique, Registry canonique) n'est pas modifié par ce ticket.
- **Amendement EXP2** : séparation stricte entre MB-VIS-004 (visualisation réactive) et MB-VIS-005 (routage utilisateur). MB-VIS-005 ne modifie pas le contrat de MB-VIS-004.

`ADR-003-visualization-manager-registry.md` ne doit plus être cité comme justification du contrat des waypoints.

## 3. Contrat des waypoints

### 3.1 Modèle de données

Le Wire est étendu avec une collection optionnelle de waypoints :

```javascript
interface Wire {
  id: string;
  pinA: PinReference;
  pinB: PinReference;
  waypoints: Array<Waypoint>;
}

interface Waypoint {
  x: number;
  y: number;
}
```

Les waypoints sont une propriété du Wire, persistante dans le Document, indépendante de l'identité et de la sémantique des pins et consommée par Presentation pour produire la géométrie.

### 3.2 Rétrocompatibilité

- Un document historique sans champ `waypoints` reste chargeable.
- L'absence de `waypoints` est interprétée comme `waypoints: []`.
- La sérialisation/désérialisation doit préserver les waypoints lorsqu'ils sont présents.
- Un Wire sans waypoint conserve le tracé par défaut équivalent à celui d'avant MB-VIS-005.

## 4. Objectif

Permettre à l'utilisateur de manipuler le tracé d'un Wire par ajout, déplacement et suppression de points intermédiaires, tout en conservant ces points dans le Document et en garantissant la cohérence Core / Mutation / Validation / History / Presentation.

## 5. Scope IN

### 5.1 Document / Wire

- étendre le contrat du Wire avec `waypoints` ;
- préserver la rétrocompatibilité ;
- conserver `pinA` et `pinB` comme références topologiques des extrémités ;
- ne pas introduire de propriété de rendu arbitraire dans le Wire.

### 5.2 Mutation / CF3

Introduire une seule mutation persistante pour MB-VIS-005 :

```text
updateWireWaypoints(wireId, waypoints)
```

Le chemin obligatoire est :

```text
UI → CommandBus → UpdateWireWaypointsHandler → HistoryService → Document
```

Le nom définitif de la commande et du Handler peut suivre les conventions CF3, mais aucun second canal de mutation n'est autorisé.

### 5.3 Granularité

- La mutation porte atomiquement sur l'état complet du tableau `waypoints`.
- MB-VIS-005 v1 n'introduit pas `addWireWaypoint`, `removeWireWaypoint` ou `moveWireWaypoint` comme mutations séparées.
- Une éventuelle évolution de granularité ou de performance relève d'un nouveau ticket et d'un nouvel arbitrage.

### 5.4 Validation

La validation minimale doit garantir :

1. `waypoints` est un tableau ;
2. chaque waypoint possède `x` et `y` numériques et finis ;
3. aucune valeur `NaN`, `Infinity`, non numérique ou structure malformée n'est acceptée ;
4. l'ordre du tableau constitue l'ordre de routage de `pinA` vers `pinB` ;
5. l'intégrité topologique du Wire et de ses références `pinA` / `pinB` est conservée ;
6. les waypoints ne sont jamais ajoutés au Registry des pins.

**Hors scope de la validation :** détection de croisement, évitement d'obstacles, distance minimale, pathfinding ou toute validation géométrique avancée.

### 5.5 History / Undo / Redo

Une modification persistante des waypoints doit utiliser le mécanisme d'historisation existant. L'état complet du tableau est restaurable avant/après chaque mutation atomique.

- Undo restaure l'état précédent.
- Redo restaure l'état suivant.
- Une nouvelle action après Undo invalide le Redo conformément au contrat History existant.
- Aucun système d'historisation parallèle n'est autorisé.

### 5.6 Presentation / géométrie

- consommer les waypoints persistants du Wire ;
- intégrer les waypoints au calcul de géométrie du fil dans leur ordre persistant ;
- permettre leur manipulation utilisateur ;
- recalculer et redessiner immédiatement le fil après modification ;
- conserver les états visuels issus de MB-VIS-004 sans leur faire porter la responsabilité du routage persistant.

Le rendu exact (ligne, segments, courbe ou interpolation) doit rester cohérent avec le contrat de géométrie existant. Aucune nouvelle décision architecturale sur le modèle Wire ne doit être introduite implicitement.

## 6. Interaction utilisateur — contrat fonctionnel

Le ticket impose le comportement suivant sans imposer un mécanisme UX particulier :

1. L'utilisateur peut sélectionner un Wire et entrer dans l'édition de son routage.
2. L'utilisateur peut créer un waypoint sur le tracé.
3. L'utilisateur peut déplacer un waypoint existant.
4. L'utilisateur peut supprimer un waypoint.
5. Chaque modification persistante aboutit à `updateWireWaypoints`.
6. Undo / Redo restaurent l'état complet du tableau avant / après la modification.
7. Le nouveau tracé est visible immédiatement après chaque modification.
8. La manipulation ne crée aucun état métier concurrent dans Presentation.

### Choix UX non verrouillés

Le ticket ne prescrit pas :

- clic simple ou mode dédié ;
- raccourcis clavier ;
- clic droit ;
- icônes ou boutons précis ;
- feedback visuel particulier pendant le drag.

Ces choix relèvent de l'implémentation UX et doivent rester cohérents avec l'application sans modifier le contrat fonctionnel ci-dessus.

## 7. Scope OUT

Le ticket n'autorise pas :

- pathfinding automatique ;
- évitement automatique d'obstacles ;
- routage 3D ;
- simulation ou physique des fils ;
- calcul de courant ou tension ;
- animations avancées de flux ;
- modification du contrat d'identité des pins ;
- modification de `canonicalRegistry.js` pour les waypoints ;
- création d'un Registry de présentation ;
- introduction d'un `VisualizationManager` comme source d'autorité ;
- stockage parallèle persistant des waypoints dans Presentation ;
- nouvelle capacité de collaboration temps réel ;
- refonte générale de la géométrie hors besoin direct du ticket ;
- migration opportuniste de mutations legacy CF3 non nécessaires à MB-VIS-005.

## 8. Dépendances

### Obligatoires

- **ADR-008 amendé** — contrat persistant des waypoints ;
- **Tome II — PLATFORM_ARCHITECTURE.md** — frontières Document / Mutation / Validation / Presentation ;
- **CF3** — canal de mutation unique ;
- **MB-VIS-004** — visualisation réactive des fils ;
- **ADR-014** — contrat des pins, inchangé par ce ticket.

### Dépendances de gouvernance

- régularisation d'ADR-003 effectuée avant ce ticket ;
- amendement d'ADR-008 effectué avant ce ticket ;
- la question Core vs Presentation-only est considérée comme tranchée et ne doit pas être rouverte sauf découverte factuelle contradictoire.

## 9. Contrat fonctionnel attendu

À la fin du ticket :

1. un Wire sans waypoint reste valide et se comporte comme aujourd'hui ;
2. un Wire peut contenir zéro, un ou plusieurs waypoints persistants ;
3. les waypoints sont sauvegardés avec le Document ;
4. toute modification persistante passe par Mutation ;
5. toute modification est validée avant application ;
6. toute modification est historisée ;
7. Undo restaure l'état précédent ;
8. Redo restaure l'état suivant ;
9. Presentation utilise les waypoints du Document pour produire le tracé ;
10. la manipulation utilisateur ne crée pas d'état métier concurrent dans Presentation ;
11. la suppression d'un Wire ne laisse aucune donnée de waypoint orpheline ;
12. les références de pins restent conformes à ADR-014.

## 10. Critères d'acceptation

### AC-01 — Contrat Wire

Le modèle Wire accepte `waypoints` sans casser les Wire existants dépourvus de cette propriété.

### AC-02 — Persistance

Après modification puis sérialisation/rechargement du Document, les waypoints sont conservés à l'identique.

### AC-03 — Mutation unique

Toute modification persistante des waypoints passe par CF3. Aucun accès direct au Document depuis Presentation n'est accepté.

### AC-04 — Validation

Une modification contenant une structure de waypoint invalide est refusée avant application au Document selon les règles minimales de la section 5.4.

### AC-05 — Historisation

Une modification de waypoints peut être annulée puis rétablie avec Undo/Redo sans divergence du Document.

### AC-06 — Géométrie

La géométrie rendue d'un Wire tient compte des waypoints dans leur ordre persistant.

### AC-07 — Interaction utilisateur

L'utilisateur peut créer, déplacer et supprimer des waypoints conformément au contrat fonctionnel, avec mise à jour immédiate du tracé.

### AC-08 — Rétrocompatibilité

Un document historique sans `waypoints` reste chargeable et produit le tracé par défaut équivalent à celui d'avant MB-VIS-005.

### AC-09 — Suppression du Wire

La suppression d'un Wire ne laisse aucune donnée de routage persistante détachée du Wire supprimé.

### AC-10 — Pins / Registry

Aucune modification du contrat `pin.id` ou du Registry canonique n'est introduite pour réaliser le routage.

### AC-11 — Séparation architecturale

Aucune dépendance Core → Presentation, aucune mutation directe du Document depuis Presentation et aucun état métier parallèle persistant des waypoints dans Presentation ne sont introduits.

### AC-12 — Non-régression MB-VIS-004

Les états visuels déjà livrés par MB-VIS-004 restent fonctionnels lorsque le Wire possède ou non des waypoints.

## 11. Tests attendus

### 11.1 Tests Document / modèle

- Wire sans waypoints ;
- `waypoints: []` ;
- plusieurs waypoints ;
- sérialisation/désérialisation ;
- rétrocompatibilité avec document historique sans champ `waypoints`.

### 11.2 Tests Mutation / CF3

- création d'une modification de waypoints ;
- modification d'un ensemble existant ;
- suppression de tous les waypoints ;
- rejet d'un Wire inexistant ;
- vérification du passage CommandBus / Handler / HistoryService ;
- absence de mutation directe depuis Presentation.

### 11.3 Tests Validation

- waypoint valide ;
- coordonnées non numériques ;
- `NaN` / `Infinity` ;
- structure malformée ;
- Wire topologiquement invalide ;
- conservation de l'intégrité `pinA` / `pinB`.

### 11.4 Tests History

- Undo après modification ;
- Redo après Undo ;
- nouvelle action après Undo invalide correctement le Redo selon le contrat History existant ;
- plusieurs modifications successives.

### 11.5 Tests Presentation / géométrie

- Wire sans waypoint ;
- Wire avec un waypoint ;
- Wire avec plusieurs waypoints ;
- ordre respecté ;
- déplacement d'un waypoint met à jour le tracé ;
- suppression d'un waypoint met à jour le tracé ;
- non-régression des états visuels MB-VIS-004.

### 11.6 Tests d'architecture / gouvernance

Vérifier au minimum :

- aucune importation Core → Presentation ;
- aucune mutation directe du Document depuis Presentation ;
- aucun stockage parallèle persistant des waypoints dans Presentation ;
- aucune modification du Registry canonique pour les waypoints ;
- aucune référence active à ADR-003 comme source du contrat des waypoints.

## 12. Invariants à préserver

1. **Document = source de vérité métier.**
2. **Mutation = seul mécanisme d'évolution du Document.**
3. **Validation = contrôle préalable de cohérence.**
4. **Presentation = restitution, jamais propriétaire de l'état métier.**
5. **Wire = connexion topologique + données de routage persistantes prévues par ADR-008 ; pas de données de rendu arbitraires.**
6. **Pin identity = ADR-014 ; aucun waypoint dans le Registry canonique.**
7. **Aucun nouveau canal de mutation.**
8. **Aucune décision architecturale implicite dans l'implémentation.**

## 13. Règles de gouvernance

### G-01 — Aucun élargissement silencieux

Tout besoin hors scope doit être signalé et faire l'objet d'un arbitrage avant implémentation.

### G-02 — ADR-008 est l'autorité

Toute interprétation du modèle persistant des waypoints doit être conforme à ADR-008 amendé.

### G-03 — ADR-003 n'est pas une référence active pour les waypoints

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

Le ticket est précédé de la confrontation indépendante Qwen / Claude et de la régularisation documentaire ADR-003 / ADR-008. Aucun nouvel audit d'architecture n'est requis pour rouvrir la question Core vs Presentation-only, sauf découverte factuelle contradictoire.

## 14. Livrables attendus

- évolution du contrat Wire ;
- mutation CF3 dédiée aux waypoints ;
- validation minimale ;
- intégration History ;
- calcul de géométrie compatible avec les waypoints ;
- interaction utilisateur ;
- tests unitaires, intégration et architecture ;
- rapport final du ticket avec preuves de conformité aux AC-01 à AC-12.

## 15. État de départ / état de fin

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

## 16. Condition de clôture PMO

MB-VIS-005 ne peut être déclaré techniquement terminé que lorsque :

- tous les critères AC-01 à AC-12 sont démontrés ;
- les tests attendus sont exécutés avec succès ou toute exception est explicitement arbitrée ;
- aucune modification hors scope n'est intégrée sans justification ;
- le rapport final fournit les preuves de conformité ;
- l'état Git et la portée des changements sont vérifiés ;
- aucune régression de MB-VIS-004 n'est constatée.

**Aucune implémentation n'est autorisée par ce document seul : le ticket constitue le contrat PMO d'exécution et doit être traité selon le protocole d'agents et de validation du projet.**
