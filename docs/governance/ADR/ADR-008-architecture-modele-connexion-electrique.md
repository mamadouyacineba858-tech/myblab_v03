# ADR-008 — Architecture du modèle de connexion électrique (Netlist / Nodes) 

**Statut :** ACCEPTED  
**Date :** 2026-08-04  
**Auteur :** Équipe Architecture MYBlab  
**Statut de validation :** Validé par le Chief Software Architect

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
6. Respecte le **principe Open/Closed** (extensible à de nouveaux types de connexions) ?

---

## Décision

Nous adoptons une **architecture à trois niveaux** pour représenter les connexions :

```
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
- **Position physique** : coordonnées relatives au composant pour le rendu (utilisées par ADR-003).

Les pins sont la seule interface entre un composant et le reste du circuit.

---

### 2. Wires (Fils physiques)

Les wires représentent les connexions graphiques dessinées par l'utilisateur. Ils sont stockés dans le Document Circuit comme une liste indépendante des composants.

Chaque wire possède :

- **Identifiant unique** : permet de référencer le wire dans l'historique (ADR-007) et pour la validation.
- **Extrémité A** : référence vers un pin (composant + pin).
- **Extrémité B** : référence vers un pin (composant + pin).
- **Points intermédiaires** (optionnels) : liste de coordonnées pour le routage graphique (utilisées uniquement par ADR-003).

Un wire représente une liaison **point-à-point** entre deux pins. Les connexions multipoints (ex: trois résistances en étoile) sont représentées par plusieurs wires qui seront regroupés en un même nœud électrique.

Le wire ne connaît pas :

- Le moteur de simulation.
- L'interface utilisateur.
- La notion de potentiel électrique.

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

```
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
✅ **Indépendance** : le modèle de connexion ne connaît ni l'UI ni la simulation.  
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
❌ **Surcharge de données** : les points intermédiaires des wires sont stockés même s'ils ne servent qu'au rendu.  
❌ **Routage limité** : les wires ne supportent que des segments de droite (les points intermédiaires sont des coordonnées).  

---

## Impact sur les développements futurs

- **Simulation (ADR-004)** : recevra une netlist construite à partir des wires et des composants, sans avoir à connaître la structure du Document.
- **Visualisation (ADR-003)** : affichera les wires avec leurs points intermédiaires, indépendamment des nodes électriques.
- **Undo/Redo (ADR-007)** : toute création/suppression de wire sera une transformation enregistrée dans l'historique.
- **Validation pédagogique** : pourra signaler les erreurs de connexion aux étudiants (ex: "composant flottant détecté").
- **Export/Import** : la netlist pourra être exportée dans des formats standards (ex: SPICE netlist).
- **Nouveaux composants** : l'ajout d'un composant avec des pins spécifiques est supporté par le modèle de wire.

---

## Références ADR liées

- **ADR-001** : Document State comme Source Unique de Vérité
- **ADR-002** : Séparation UI / Modèle / Simulation
- **ADR-004** : Architecture du moteur de simulation hybride
- **ADR-005** : Architecture du modèle de composants électroniques
- **ADR-006** : Registry des modèles de simulation
- **ADR-007** : Architecture Undo/Redo (History Manager)



