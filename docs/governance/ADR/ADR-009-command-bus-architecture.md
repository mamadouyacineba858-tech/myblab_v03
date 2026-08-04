# ADR-009 — Architecture du système de commandes utilisateur (Command Bus)

**Statut :** ACCEPTED  
**Date :** 2026-08-04  
**Auteur :** Équipe Architecture MYBlab  
**Statut de validation :** Validé par le Chief Software Architect

---

## Contexte

MYBlab est un éditeur interactif de circuits électroniques où les utilisateurs effectuent de nombreuses actions : ajout de composants, déplacement, modification de paramètres, création de connexions, suppression d'éléments, etc. Selon ADR-001, le Document Circuit est l'unique source de vérité. Selon ADR-002, l'interface utilisateur ne doit jamais modifier directement le modèle métier. Selon ADR-007, toute modification doit être compatible avec Undo/Redo.

Actuellement, le mécanisme permettant de transformer une intention utilisateur en modification contrôlée du Document n'est pas formellement défini. Sans ce mécanisme, plusieurs risques apparaissent :

- L'interface pourrait modifier directement le Document, violant ADR-001 et ADR-002.
- Les modifications ne seraient pas traçables ni rejouables.
- L'intégration avec l'historique (ADR-007) serait impossible ou fragile.
- Les tests des modifications métier nécessiteraient l'interface complète.
- L'ajout de nouvelles fonctionnalités serait dispersé et non coordonné.

---

## Problème

Comment concevoir un système de commandes qui :

1. Empêche l'interface de modifier directement le Document ;
2. Centralise les modifications métier ;
3. Garantisse la compatibilité avec Undo/Redo (ADR-007) ;
4. Permette la validation avant modification ;
5. Soit indépendant de l'interface et des technologies UI ;
6. Facilite les tests unitaires ;
7. Permette l'ajout futur de nouvelles fonctionnalités ;
8. Respecte le principe Open/Closed ?

---

## Décision

Nous adoptons une architecture basée sur le **Command Pattern** associé à un **Command Bus**.

### Architecture cible

```
Utilisateur
    |
    ↓
Interface utilisateur (ADR-002)
    |
    ↓
Commande (intention)
    |
    ↓
Command Bus
    |
    ↓
Command Handler (validation + exécution)
    |
    ↓
Transformation du Document (fonction pure)
    |
    ↓
Nouveau Document (immuable)
    |
    ↓
History Manager (ADR-007)
    |
    ↓
Mise à jour de l'interface (lecture seule)
```

---

### 1. Définition d'une Commande

Une commande est une **intention utilisateur** formalisée. Elle représente une opération métier que l'utilisateur souhaite effectuer sur le Document Circuit.

**Propriétés d'une commande :**

- **Identifiant unique** : permet de référencer la commande dans l'historique et les logs.
- **Type** : identifie l'opération (ex: `ADD_COMPONENT`, `DELETE_COMPONENT`, `MOVE_COMPONENT`).
- **Payload** : paramètres spécifiques à l'opération (ex: type de composant, position, identifiant).
- **Métadonnées** : horodatage, identifiant utilisateur, source (facultatif).

**Principe :** Une commande est un objet pur qui ne contient aucune logique métier. Elle décrit **quoi** faire, pas **comment** le faire.

**Exemple conceptuel :**

```text
Commande ADD_COMPONENT
  ├─ type: "ADD_COMPONENT"
  ├─ payload:
  │   ├─ componentType: "resistor"
  │   ├─ position: { x: 100, y: 100 }
  │   └─ parameters: { resistance: 1000 }
  └─ metadata:
      └─ timestamp: 2026-08-04T14:30:00Z
```

---

### 2. Command Bus

Le Command Bus est le **répartiteur central** des commandes.

**Responsabilités :**

- Recevoir les commandes émises par l'interface.
- Trouver le Command Handler approprié pour chaque type de commande.
- Déléguer l'exécution au Handler.
- Gérer les erreurs (validation, exécution, conflits).
- Assurer la transactionnalité (tout ou rien).

**Ce que le Command Bus ne fait pas :**

- Il ne connaît pas l'interface utilisateur.
- Il ne connaît pas le rendu graphique.
- Il ne connaît pas la simulation.
- Il n'exécute pas directement la logique métier.

**Principe de fonctionnement :**

1. L'interface émet une commande vers le Bus.
2. Le Bus consulte un registre de Handlers pour trouver celui qui correspond au type de commande.
3. Le Bus transmet la commande au Handler.
4. Le Handler exécute la logique et retourne le résultat.
5. Le Bus transmet le résultat au History Manager (ADR-007).

---

### 3. Command Handlers

Un Command Handler est responsable de l'exécution d'un **type spécifique** de commande.

**Responsabilités :**

- **Valider** la commande (structure, paramètres, contexte métier).
- **Appliquer la transformation** au Document (via une fonction pure).
- **Retourner le nouveau Document** et les métadonnées associées.
- **Gérer les erreurs** et les cas particuliers.

**Principe Open/Closed :**

- Pour ajouter une nouvelle commande, on crée :
  - La définition de la commande (type + payload).
  - Un nouveau Handler dédié.
  - On enregistre le Handler dans le Bus.
- **Aucune modification** du Bus, des autres Handlers ou du noyau n'est nécessaire.

**Exemples de Handlers :**

- `AddComponentHandler`
- `DeleteComponentHandler`
- `MoveComponentHandler`
- `ConnectWireHandler`
- `DisconnectWireHandler`
- `UpdateParameterHandler`

---

### 4. Intégration avec ADR-007 (History Manager)

L'intégration avec le History Manager est un point fondamental.

**Flux complet :**

1. L'utilisateur déclenche une action dans l'interface.
2. L'interface crée une commande et l'envoie au Command Bus.
3. Le Bus achemine la commande vers son Handler.
4. Le Handler valide la commande et applique la transformation au Document.
5. Le Handler retourne le **nouveau Document** et la **transformation appliquée**.
6. Le Bus transmet la transformation au History Manager.
7. Le History Manager enregistre la transformation dans l'historique.
8. Le curseur de l'historique avance.
9. L'interface est mise à jour avec le nouveau Document.

**Undo/Redo :**

- **Undo** : Le History Manager recule le curseur et restaure l'état précédent du Document.
- **Redo** : Le History Manager avance le curseur et réapplique la transformation enregistrée.

**Remarque importante :** La commande elle-même n'est pas stockée dans l'historique. C'est la **transformation** (fonction pure) qui est enregistrée, car elle est plus générique et réutilisable.

---

### 5. Séparation avec l'interface

L'ADR impose une **stricte séparation** entre l'interface et le système de commandes.

**Règles :**

- L'interface **ne modifie jamais** le Document directement.
- L'interface **ne crée jamais** de transformations.
- L'interface **émet uniquement** des commandes.
- L'interface **ne contient aucune logique métier**.

**Flux interdit :**

```text
❌ UI → document.components.push(...)
```

**Flux autorisé :**

```text
✅ UI → Command → Command Bus → Handler → Transformation → Nouveau Document
```

---

### 6. Validation des commandes

Le système de validation est organisé en **trois niveaux** :

**Validation syntaxique (structure) :**
- La commande contient-elle tous les champs requis ?
- Les types des paramètres sont-ils corrects ?
- L'identifiant est-il présent ?

**Validation métier (sémantique) :**
- La valeur de la résistance est-elle positive ?
- Le type de composant existe-t-il dans le registre (ADR-005) ?
- La position est-elle dans les limites du circuit ?

**Validation contextuelle (intégrité) :**
- Le composant à supprimer existe-t-il ?
- La connexion à créer ne crée-t-elle pas un court-circuit ?
- Les pins référencées existent-elles (ADR-008) ?

**Chaîne de validation :**

```
Commande → Validation syntaxique → Validation métier → Validation contexte → Exécution
                    ↓                 ↓                    ↓
                Erreur 400        Erreur 422          Erreur 409
```

---

### 7. Commandes principales MYBlab

Le système définit au minimum les commandes suivantes :

| Commande | Payload principal | Transformation |
|----------|-------------------|----------------|
| **AddComponentCommand** | type, position, paramètres | Ajoute un composant au Document |
| **DeleteComponentCommand** | composantId | Supprime un composant et ses connexions associées |
| **MoveComponentCommand** | composantId, nouvellePosition | Met à jour la position du composant |
| **ConnectWireCommand** | pinA (composantId + pinId), pinB | Ajoute un wire au Document (ADR-008) |
| **DisconnectWireCommand** | wireId | Supprime un wire du Document |
| **UpdateParameterCommand** | composantId, paramètre, valeur | Modifie un paramètre spécifique |

Ces commandes couvrent les fonctionnalités de base de MYBlab et sont compatibles avec ADR-005 (composants) et ADR-008 (connexions).

---

## Alternatives étudiées

| Alternative | Raison du rejet |
|-------------|-----------------|
| **Modification directe du Document depuis l'UI** | Violation ADR-001 et ADR-002 ; impossible à tracer ; incompatible avec Undo/Redo. |
| **Gestion des actions directement dans React** | Couplage fort UI/métier ; tests difficiles ; logique métier dispersée. |
| **Event Bus pur (sans commandes)** | Adapté aux événements asynchrones, mais insuffisant pour les modifications transactionnelles et l'undo/redo. |
| **Snapshot complet après chaque action** | Consommation mémoire excessive ; inefficace pour de gros circuits. |
| **Middleware unique** | Monolithique ; difficile à tester ; violé Open/Closed. |

---

## Conséquences positives

✅ **Centralisation** : toutes les modifications passent par un point unique.  
✅ **Traçabilité** : chaque modification est enregistrée et identifiable.  
✅ **Compatibilité Undo/Redo** : intégration naturelle avec ADR-007.  
✅ **Testabilité** : les Handlers se testent sans interface.  
✅ **Extensibilité** : ajouter une nouvelle commande ne touche pas au noyau.  
✅ **Séparation des couches** : respect strict d'ADR-002.  
✅ **Préparation au collaboratif** : les commandes peuvent être sérialisées et échangées.  
✅ **Journalisation** : toutes les actions utilisateur peuvent être loggées.

---

## Conséquences négatives

❌ **Nombre de fichiers** : chaque commande nécessite sa définition et son Handler.  
❌ **Courbe d'apprentissage** : les développeurs doivent comprendre le pattern.  
❌ **Surcouche** : pour une petite modification, il faut créer une commande complète.  
❌ **Discipline** : les développeurs doivent respecter l'interdiction de modification directe.  
❌ **Performance** : le chemin d'exécution est plus long qu'une modification directe (mais acceptable pour une UI interactive).

---

## Impact sur les développements futurs

- **History Manager (ADR-007)** : reçoit les transformations produites par les Handlers.
- **Collaboration temps réel** : les commandes peuvent être sérialisées, transmises et rejouées.
- **Journalisation et audit** : toutes les actions sont enregistrées avec leurs métadonnées.
- **Macro-actions** : des séquences de commandes peuvent être regroupées en une seule action annulable.
- **Automatisation et IA** : des agents peuvent générer des commandes pour modifier le circuit.
- **Plugins** : des extensions peuvent enregistrer leurs propres commandes et Handlers.

---

## Références ADR liées

- **ADR-001** : Document State comme Source Unique de Vérité
- **ADR-002** : Séparation UI / Modèle / Simulation
- **ADR-005** : Architecture du modèle de composants électroniques
- **ADR-007** : Architecture Undo/Redo (History Manager)
- **ADR-008** : Architecture du modèle de connexion électrique (Netlist / Nodes)

