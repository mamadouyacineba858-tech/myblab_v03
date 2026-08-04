# ADR-001 — Document State comme Source Unique de Vérité

**Statut :** ACCEPTED
**Date :** 2026-08-04
**Projet :** MYBlab
**Décideur :** Project Lead / Architecture MYBlab

---

# 1. Contexte

MYBlab est une plateforme de laboratoire électronique virtuel permettant de créer, modifier et simuler des circuits.

L'application manipule plusieurs domaines :

* édition graphique du circuit ;
* sélection et interaction utilisateur ;
* simulation électrique ;
* sauvegarde et chargement de projets ;
* historique Undo/Redo ;
* extensions futures (Arduino, collaboration, IA).

Au cours de l'évolution du projet, un risque architectural majeur a été identifié :

> plusieurs systèmes pourraient posséder leur propre représentation du circuit.

Exemples de duplication potentielle :

* état local des composants React ;
* état interne du moteur de simulation ;
* état du système Undo/Redo ;
* état du rendu graphique.

Cette duplication créerait des divergences entre la représentation affichée, la représentation simulée et la représentation sauvegardée.

---

# 2. Problème

Comment garantir une cohérence permanente entre :

* l'interface utilisateur ;
* le moteur de simulation ;
* le système d'historique ;
* la sauvegarde du projet ?

Une architecture avec plusieurs sources d'état introduirait :

* des synchronisations complexes ;
* des bugs difficiles à reproduire ;
* des comportements différents selon le chemin d'exécution.

---

# 3. Décision

Le modèle document circuit devient la **Source Unique de Vérité (Single Source of Truth)** de MYBlab.

Le document circuit contient l'ensemble des données métier nécessaires :

* composants ;
* connexions ;
* propriétés ;
* paramètres ;
* états persistants.

Les autres systèmes consomment ce document mais ne possèdent pas leur propre copie métier.

Architecture retenue :

```
                 Circuit Document
                 (Source of Truth)
                         |
        +----------------+----------------+
        |                |                |
        v                v                v

       UI          Simulation Engine   Undo/Redo

    Rendering       Analysis          Commands
```

---

# 4. Principes imposés

## 4.1 Le moteur de simulation est sans état métier permanent

Le moteur reçoit un document circuit :

```
CircuitDocument
        |
        v
Simulation
        |
        v
SimulationResult
```

Il ne modifie jamais directement le document source.

---

## 4.2 L'interface utilisateur ne possède pas de modèle métier parallèle

Les composants React peuvent posséder :

* état visuel temporaire ;
* état d'interaction ;
* état d'affichage.

Ils ne doivent pas posséder :

* copie des composants circuit ;
* copie des connexions ;
* logique métier indépendante.

---

## 4.3 Toute modification métier passe par le document

Exemples :

Ajouter un composant :

```
Action utilisateur
        |
        v
Document update
        |
        +----> UI refresh
        |
        +----> Simulation possible
        |
        +----> History command
```

---

# 5. Alternatives étudiées

## Alternative A — Plusieurs états indépendants

Rejetée.

Motif :

* duplication des données ;
* risque de désynchronisation ;
* maintenance difficile.

---

## Alternative B — Le moteur de simulation possède son propre circuit interne

Rejetée.

Motif :

* empêche la détermination ;
* complique sauvegarde et collaboration ;
* mélange modèle et exécution.

---

## Alternative C — Document central unique

Acceptée.

Motif :

* architecture prévisible ;
* extensibilité ;
* séparation claire des responsabilités.

---

# 6. Conséquences

## Positives

* cohérence globale garantie ;
* Undo/Redo simplifié ;
* sauvegarde fiable ;
* simulation reproductible ;
* architecture compatible collaboration future ;
* séparation claire entre données et affichage.

---

## Négatives

* nécessite une discipline stricte sur les mutations ;
* demande des actions contrôlées ;
* nécessite une gestion correcte de l'immuabilité.

---

# 7. Impact sur les futurs développements

Cette décision impose que :

* MB-SIM consomme le document circuit ;
* MB-VIS rende le document circuit ;
* Undo/Redo enregistre les changements du document ;
* les futurs modules Arduino utilisent ce même modèle.

---

# 8. Références internes

Décisions liées :

* ADR-002 — Séparation UI / Modèle / Simulation
* ADR-007 — Undo/Redo basé commandes
* ADR-004 — Architecture Simulation Engine hybride

---

# 9. Statut final

**ACCEPTED**

Cette décision devient une règle architecturale permanente de MYBlab.
