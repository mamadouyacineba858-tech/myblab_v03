# ADR-008 — Architecture du modèle de connexion électrique (Netlist / Nodes)

**Statut :** ACCEPTED — AMENDED  
**Date d'origine :** 2026-08-04  
**Date d'amendement :** 2026-08-21  
**Auteur :** Équipe Architecture MYBlab  
**Statut de validation :** Validé par le Chief Software Architect

---

## Amendement CSA — 2026-08-21

### Objet

Le présent amendement régularise le contrat des **waypoints de wire** afin qu'il constitue une décision architecturale actuelle, explicite et exploitable par les futurs travaux de routage utilisateur, notamment MB-VIS-005.

### Décision amendée

Les **points intermédiaires d'un wire sont des données persistantes du Wire Core**, stockées dans le Document Circuit comme propriété optionnelle du wire.

Le contrat conceptuel du wire est donc :

```text
Wire
├── id
├── pinA
├── pinB
└── waypoints[]   (optionnel, persistant)
```

Chaque waypoint représente une position de routage exprimée sous forme de coordonnées de données :

```text
Waypoint
├── x : number
└── y : number
```

Les waypoints :

- appartiennent au **Wire**, et non aux pins ;
- ne font pas partie du `canonicalRegistry` des pins ;
- ne modifient pas le contrat de source de vérité des pins défini par ADR-014 ;
- sont persistants avec le Document ;
- peuvent être absents sur les documents existants ;
- sont consommés par la Presentation pour calculer la géométrie du wire ;
- ne contiennent aucune information de rendu telle que couleur, épaisseur ou style.

### Rétrocompatibilité

Un wire dépourvu de `waypoints` reste valide. L'absence de cette propriété est équivalente à une liste vide pour les besoins du routage.

Cette décision n'impose **aucune migration immédiate des documents existants** et ne modifie pas leur structure tant qu'aucune implémentation de MB-VIS-005 n'est engagée.

### Frontière Core / Presentation

Le Core possède la donnée de routage persistante. La Presentation possède la responsabilité de transformer cette donnée en géométrie et de la rendre visuellement.

```text
Document / Core
Wire { id, pinA, pinB, waypoints[] }
              │
              ▼
Presentation / Geometry
              │
              ▼
        SVG / Canvas
```

La Presentation ne devient donc pas une seconde source de vérité pour les waypoints.

### Mutation et historique

Toute future modification persistante des waypoints devra respecter le canal de mutation établi par CF3 :

```text
CommandBus → Handler → HistoryService → documentApi
```

La présente décision ne crée pas la mutation correspondante et n'autorise aucune implémentation anticipée. Le choix d'une commande globale telle que `UPDATE_WIRE_WAYPOINTS` pourra être arrêté dans le contrat d'exécution de MB-VIS-005.

### Validation

Le présent amendement établit la propriété et la persistance des waypoints, mais **ne fixe pas encore les règles détaillées de validation géométrique**. Les règles minimales nécessaires à l'intégrité des coordonnées et du document devront être définies dans le contrat d'exécution de MB-VIS-005.

Les règles avancées de routage (croisements, collisions, optimisation automatique, etc.) ne sont pas introduites par cet amendement.

### Rendu

La géométrie du wire reste une responsabilité de la Presentation. Le présent amendement n'impose ni algorithme de routage, ni type de courbe, ni technologie de rendu.

### Référence ADR-003

La justification historique qui renvoyait les waypoints à `ADR-003` est retirée comme référence normative. Le fichier `ADR-003-visualization-manager-registry.md` a été régularisé comme doublon documentaire invalide et ne constitue plus une source d'autorité.

Le présent ADR-008 porte désormais directement le contrat architectural des waypoints.

### Limite de l'amendement

Cet amendement :

- ne modifie aucun code de production ;
- ne crée aucun Handler ;
- ne crée aucune mutation ;
- ne modifie aucune validation existante ;
- ne modifie pas `canonicalRegistry.js` ;
- ne clôture ni ne crée le ticket MB-VIS-005 ;
- ne constitue pas un GO d'implémentation.

Il transforme uniquement la décision architecturale historique sur les waypoints en contrat explicite et actuel.

---

## Contexte

Le projet MYBlab permet de concevoir des circuits électroniques en reliant des composants entre eux. Ces connexions sont essentielles car elles déterminent le comportement électrique du circuit. Actuellement, le Document Circuit (ADR-001) contient des composants (ADR-005), mais la manière de représenter leurs interconnexions n'est pas formellement définie.

Sans modèle de connexion clair, plusieurs risques apparaissent :

- Les connexions graphiques (fils dessinés à l'écran) sont confondues avec les connexions électriques (même potentiel).
- La simulation (ADR-004) ne peut pas construire la netlist nécessaire à la résolution.
- Les modifications de connexions sont difficiles à tracer et à annuler (ADR-007).
- L'ajout de nouvelles fonctionnalités (ex: analyse de mailles) devient complexe.

---

## Problème

Comment concevoir un modèle de connexion électrique qui :

1. Soit **stocké dans le Document Circuit** comme source unique de vérité (ADR-001) ;
2. **Sépare clairement** la représentation physique (fils) de la représentation électrique (nœuds) ;
3. Permette la **génération d'une netlist** exploitable par le moteur de simulation (ADR-004) ;
4. Soit **indépendant** de l'interface, du rendu et de la simulation ;
5. Supporte la **validation** des connexions (structurelle et électrique) ;
6. Respecte le principe Open/Closed (extensible à de nouveaux types de connexions) ?

---

## Décision

Nous adoptons une **architecture à trois niveaux** pour représenter les connexions :

```text
Document Circuit
       |
       ↓
┌─────────────────────────────────┐
│ 1. Pins (bornes des composants) │
│    - Définies dans ADR-005      │
│    - Points de connexion phys.  │
└─────────────────────────────────┘
       |
       ↓
┌─────────────────────────────────┐
│ 2. Wires (fils physiques)       │
│    - Connexions graphiques      │
│    - Relient des pins           │
│    - Points intermédiaires      │
└─────────────────────────────────┘
       |
       ↓
┌─────────────────────────────────┐
│ 3. Nodes (nœuds électriques)    │
│    - Calculés à partir des wires│
│    - Représentent un potentiel  │
│    - Utilisés par la simulation │
└─────────────────────────────────┘
```

### 1. Pins (Bornes des composants)

Les pins sont définis dans le modèle de composants (ADR-005). Chaque pin possède :

- **Identifiant unique** (local au composant) : ex: `'pin1'`, `'anode'`, `'collector'`.
- **Nom** : ex: `'Anode'`, `'Base'`, `'Pin 1'`.
- **Rôle électrique** (optionnel) : ex: `'input'`, `'output'`, `'power'`, `'ground'`, `'bidirectional'`.
- **Position physique** : coordonnées relatives au composant pour le rendu.

Les pins sont la seule interface entre un composant et le reste du circuit.

---

### 2. Wires (Fils physiques)

Les wires représentent les connexions graphiques dessinées par l'utilisateur. Ils sont stockés dans le Document Circuit comme une liste indépendante des composants.

Chaque wire possède :

- **Identifiant unique** : permet de référencer le wire dans l'historique (ADR-007) et pour la validation.
- **Extrémité A** : référence vers un pin (composant + pin).
- **Extrémité B** : référence vers un pin (composant + pin).
- **Points intermédiaires (optionnels)** : liste persistante de coordonnées pour le routage utilisateur.

Un wire représente une liaison **point-à-point** entre deux pins. Les connexions multipoints (ex: trois résistances en étoile) sont représentées par plusieurs wires qui seront regroupés en un même nœud électrique.

Le wire ne connaît pas :

- Le moteur de simulation.
- L'interface utilisateur.
- La notion de potentiel électrique.
- Les propriétés de rendu (couleur, épaisseur, style).

---

### 3. Nodes (Nœuds électriques)

Les nodes ne sont **pas stockés** dans le Document Circuit. Ils sont **construits** à partir des wires lors de la préparation de la simulation (ADR-004) ou de la validation.

Un nœud électrique représente un ensemble de pins connectés entre eux, ayant le même potentiel électrique.

**Construction des nodes :**

1. À partir de la liste des wires, on établit un graphe où les pins sont des nœuds et les wires des arêtes.
2. On identifie les composantes connexes de ce graphe.
3. Chaque composante connexe devient un nœud électrique.
4. Chaque nœud reçoit un identifiant unique (ex: `NODE_001`, `NODE_002`).

Un node possède :

- **Identifiant unique** (généré automatiquement).
- **Liste des pins connectés** (références vers composants + pins).
- **Liste des wires participants** (pour traçabilité).
- **Tension calculée** (par la simulation, non stockée).

Le node n'est pas stocké dans le Document. Il est recalculé à chaque simulation ou validation.

---

### Relations entre les niveaux

```text
Composant (ADR-005)
    └── Pin
           │
           ↓ (wire)
Pin ─── Wire ─── Pin
                      │
                      ↓ (construction)
                  Node électrique
                      │
                      ↓ (transmis à ADR-004)
              Netlist pour simulation
```

---

### Génération de la Netlist

La netlist est la représentation finale transmise au moteur de simulation (ADR-004). Elle est produite par un **Netlist Builder** à partir du Document Circuit.

Le Netlist Builder :

1. Extrait tous les composants et leurs paramètres.
2. Extrait tous les wires et construit les nœuds.
3. Produit une structure de données (netlist) contenant :
   - La liste des composants avec leurs paramètres.
   - La liste des nœuds et les pins qui y sont connectés.
   - Les métadonnées nécessaires à la simulation (type d'analyse, tolérances, etc.).

Le Netlist Builder :

- **Ne modifie pas** le Document Circuit.
- **Ne modifie pas** les composants.
- **Ne modifie pas** les wires.
- **Ne modifie pas** les nodes (il les crée et les transmet).

---

### Validation des connexions

Le système de validation vérifie deux niveaux :

**Validation structurelle (intégrité du Document) :**

- Un wire doit référencer des pins existants.
- Un wire ne peut pas avoir la même extrémité deux fois (boucle sur soi-même).
- Un pin peut être connecté à plusieurs wires. Les règles de compatibilité des connexions multiples sont définies par la validation électrique selon le type de composant.
- La suppression d'un composant doit supprimer ses wires associés (ou les invalider).
- Aucun wire ne doit être orphelin (sans composant à une extrémité).

**Validation électrique (cohérence du circuit) :**

- Absence de court-circuit direct entre alimentation et masse (vérification électrique).
- Absence de composants flottants (pin sans connexion).
- Présence d'au moins une source d'alimentation.
- Absence de nœuds avec des conflits de type (ex: deux sorties connectées ensemble).

Les validations sont effectuées :

- Après chaque modification du Document (création/suppression de wire).
- Avant chaque simulation (pour éviter des erreurs de résolution).
- À l'import d'un projet.

---

## Alternatives étudiées

| Alternative | Raison du rejet |
|-------------|-----------------|
| **Stocker uniquement les wires graphiques** | Insuffisant pour la simulation ; pas de notion de potentiel électrique ; les nodes doivent être recalculés. |
| **Chaque composant connaît ses voisins** | Fort couplage entre composants ; difficile à maintenir ; incompatible avec Document State (ADR-001). |
| **Calculer les connexions directement dans le solveur** | Mélange des responsabilités (simulation vs. modèle) ; impossible de valider indépendamment ; difficile à tester. |
| **Stocker les nodes dans le Document** | Redondance avec les wires ; risque de désynchronisation ; le node dépend des wires, il peut être recalculé. |
| **Un seul niveau (wires comme nœuds)** | Confusion entre représentation physique et électrique ; impossible de gérer les connexions à plus de deux pins. |

---

## Conséquences positives

✅ **Séparation claire** : wires (physique) vs. nodes (électrique) sont distincts.  
✅ **Indépendance** : le modèle de connexion ne connaît ni UI ni simulation.  
✅ **Validabilité** : vérification structurelle et électrique possible avant simulation.  
✅ **Compatibilité ADR-001** : les wires sont dans le Document, les nodes sont reconstruits.  
✅ **Extensibilité** : on peut ajouter de nouveaux types de connexions (ex: connecteurs, câbles) via le modèle de wire.  
✅ **Traçabilité** : chaque wire a un identifiant pour l'historique (ADR-007).  
✅ **Réutilisabilité** : la netlist peut être utilisée par plusieurs solveurs ou exportée.  

---

## Conséquences négatives

❌ **Complexité** : trois niveaux à comprendre et à maintenir (pins, wires, nodes).  
❌ **Coût de construction** : les nodes doivent être reconstruits à chaque simulation ou validation.  
❌ **Risque d'erreur** : l'utilisateur peut créer des wires incohérents (mais la validation les détecte).  
❌ **Surcharge de données** : les points intermédiaires des wires sont persistants même s'ils ne sont pas nécessaires à la simulation électrique.  
❌ **Routage limité** : le contrat stocke des coordonnées de routage ; l'algorithme de rendu reste une responsabilité de la Presentation.

---

## Impact sur les développements futurs

- **Simulation (ADR-004)** : recevra une netlist construite à partir des wires et des composants, sans avoir à connaître la structure du Document.
- **Visualisation** : affichera les wires avec leurs points intermédiaires, indépendamment des nodes électriques. Aucune référence normative à un ADR-003 de visualisation n'est requise.
- **Undo/Redo (ADR-007)** : toute création/suppression de wire et toute future modification persistante des waypoints devront être enregistrées dans l'historique.
- **Validation pédagogique** : pourra signaler les erreurs de connexion aux étudiants (ex: "composant flottant détecté").
- **Export/Import** : la netlist pourra être exportée dans des formats standards (ex: SPICE netlist), avec préservation des données de routage si le format d'échange le permet.
- **Nouveaux composants** : l'ajout d'un composant avec des pins spécifiques est supporté par le modèle de wire.

---

## Références ADR liées

- **ADR-001** : Document State comme Source Unique de Vérité
- **ADR-002** : Séparation UI / Modèle / Simulation
- **ADR-004** : Architecture du moteur de simulation hybride
- **ADR-005** : Architecture du modèle de composants électroniques
- **ADR-006** : Registry des modèles de simulation
- **ADR-007** : Architecture Undo/Redo (History Manager)
- **ADR-014** : Source de vérité des pins — contrat indépendant des waypoints de wire

---

## Statut d'implémentation

À la date du présent amendement, le contrat des waypoints est **décidé architecturalement mais non implémenté** dans le code de production. Le modèle Wire actuel peut donc ne pas encore contenir la propriété `waypoints`.

Cette divergence est intentionnelle à ce stade : l'ADR fixe la cible architecturale ; un futur ticket d'exécution devra définir et réaliser les changements nécessaires sans être implicite dans le présent amendement.
