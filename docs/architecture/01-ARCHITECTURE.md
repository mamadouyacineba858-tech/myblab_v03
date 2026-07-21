==================================================
MYBlab
Architecture Document
Version : 0.3.0
Statut : VALIDÉ (Partiel)
Dernière revue : MB-000.1
Date : 2026-07-19
==================================================

# Architecture de MYBlab

## Glossaire

| Terme | Définition |
|-------|------------|
| Document Model | État métier pur du circuit |
| Document API | Interface publique d'accès au modèle |
| Command | Opération métier réversible |
| History | Gestion des commandes exécutées |
| Selection | Ensemble des objets sélectionnés |
| Pointer | Interactions physiques de la souris |

---

# 1. Vue d'ensemble

MYBlab est un éditeur graphique construit sur une architecture en couches où chaque couche possède une responsabilité unique et clairement définie.

## Principe fondamental

> Chaque couche ne dépend que des couches inférieures.
>
> Aucune couche ne dépend des couches supérieures.

## Les couches architecturales

| Couche | Responsabilité | Collaborations principales |
|--------|----------------|---------------------------|
| **Document Model** | État pur du circuit | Aucune |
| **Document API** | API publique d'accès au modèle | Document Model |
| **Command System** | Encapsulation d'opérations réversibles | Document API |
| **History System** | Gestion de l'historique des commandes | Command System, Document API |
| **Selection System** | Gestion de la sélection | Document API |
| **Pointer System** | Interactions souris | Selection System, History System |
| **Keyboard System** | Raccourcis clavier | Selection System, History System |
| **React UI** | Présentation | Toutes les couches via `useCircuit()` |

## Représentation générale

```
┌─────────────────────────────────────────────────┐
│              React UI (useCircuit)              │
├─────────────────────────────────────────────────┤
│              Keyboard System                    │
├─────────────────────────────────────────────────┤
│              Pointer System                     │
├─────────────────────────────────────────────────┤
│             Selection System                    │
├─────────────────────────────────────────────────┤
│              History System                     │
├─────────────────────────────────────────────────┤
│              Command System                     │
├─────────────────────────────────────────────────┤
│              Document API                       │
├─────────────────────────────────────────────────┤
│              Document Model                     │
└─────────────────────────────────────────────────┘
```

---

# 2. Principes fondamentaux

## P0 — Le code est la source de vérité

La documentation décrit le code. Elle ne le remplace jamais.

## P1 — Single Source of Truth

L'état du document est stocké à un seul endroit : le Document Model.

## P2 — API unique

Toute mutation du document passe par la Document API.

## P3 — Séparation des responsabilités

Les interactions utilisateur sont séparées des mutations du document.

## P4 — Indépendance du History System

Le History System ne dépend jamais de React.

## P5 — Indépendance du Keyboard System

Le Keyboard System ne connaît jamais directement le `HistoryManager`.

---

# 3. Document Model & Document API

## 3.1 Document Model

### Responsabilités

- Stocker l'état du circuit.
- Constituer la source de vérité du document.

### Ne fait pas

- Le rendu React.
- La gestion des interactions.
- Les raccourcis clavier.

### Caractéristiques

- Encapsulé.
- Accessible uniquement via la Document API.
- Contient les composants, fils, propriétés et données métier.

### Invariants

- **I-D1** : Le document reste cohérent en permanence.
- **I-D2** : Toute modification passe par la Document API.

---

## 3.2 Document API

### Responsabilités

- Exposer l'API publique du document.
- Encapsuler le Document Model.
- Constituer l'unique point d'entrée des autres couches.

### Ne fait pas

- Le rendu React.
- Les interactions utilisateur.
- Les raccourcis clavier.

> **Remarque**
>
> L'interface ci-dessous est conceptuelle. Elle illustre les responsabilités de la Document API mais ne constitue pas une copie exacte de l'API JavaScript actuelle.

```typescript
interface DocumentAPI {

    // Lecture

    getElements()
    getElement(id)

    // Mutations

    moveElements(...)
    deleteElements(...)

    // Historique

    undo()
    redo()

    // Sélection

    selectElements(...)
    clearSelection()

}
```

### Implémentation actuelle

- `useCircuitState()` contient la logique métier.
- `CircuitContext` expose cette logique.
- `useCircuit()` constitue le point d'accès utilisé par les composants React.

### Règle fondamentale

Aucune couche n'accède directement au Document Model.

Toutes les opérations transitent par la Document API.

### Invariants

- **I-API1** : La Document API est la seule interface de modification.
- **I-API2** : La Document API ne dépend d'aucune couche supérieure.

---

# 4. Command System

## Responsabilités

- Encapsuler des opérations métier réversibles.
- Appliquer le Command Pattern.
- Permettre leur historisation.

## Interface conceptuelle

```typescript
interface HistoryCommand {

    do()

    undo()

    redo()

    canMerge(other)

    merge(other)

}
```

## Flux général

```
Pointer System / Keyboard System
              │
              ▼
       HistoryCommand
              │
              ▼
HistoryManager.execute(command)
              │
              ▼
        command.do()
              │
              ▼
        Document API
              │
              ▼
       Document Model
              │
              ▼
       React Rendering
```

## Commandes actuellement implémentées

| Commande | Statut |
|----------|--------|
| MoveCommand | ✅ Validée |

## Invariants

- **I-C1** : Une commande modifie le document uniquement via la Document API.
- **I-C2** : Une commande est réversible.
- **I-C3** : Les commandes fusionnables sont regroupées lorsque cela est possible.

---

# À rédiger

## 5. History System

En attente (MB-000.2)

## 6. Selection System

En attente

## 7. Pointer System

En attente

## 8. Keyboard System

En attente

---

## Statut du document

| Section | Statut |
|---------|--------|
| 1. Vue d'ensemble | ✅ Validée |
| 2. Principes fondamentaux | ✅ Validée |
| 3. Document Model & Document API | ✅ Validée |
| 4. Command System | ✅ Validée |
| 5. History System | ⏳ En attente |
| 6. Selection System | ⏳ En attente |
| 7. Pointer System | ⏳ En attente |
| 8. Keyboard System | ⏳ En attente |

**Statut global :** MB-000.1 terminé — Architecture partiellement documentée (sections 1 à 4 validées).