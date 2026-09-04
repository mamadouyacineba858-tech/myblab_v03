# 8. Knowledge & Learning

## 8.1 Objectif

Introduire progressivement la capacité de MYBlab à transformer des résultats techniques en compréhension, puis à adapter cette présentation à la progression de l'utilisateur.

## 8.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| KL1 | Premier mécanisme d'explication | Non commencé |
| KL2 | Premier mécanisme d'adaptation pédagogique | Non commencé |

### KL1 — Premier mécanisme d'explication

Établir Knowledge comme responsable de la production d'explications, diagnostics et annotations à partir de résultats qualifiés.

### KL2 — Premier mécanisme d'adaptation pédagogique

Établir Learning comme responsable de la décision de quelles informations pédagogiques produire et montrer selon la progression de l'utilisateur.

KL2 dépend de KL1.

## 9. Ecosystem

## 9.1 Objectif

Permettre l'extension contrôlée de MYBlab sans déplacer la responsabilité du catalogue des composants hors du Core.

## 9.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| ECO1 | Plugin Loader — première implémentation | Non commencé |
| ECO2 | Extension lifecycle | Non commencé |
| ECO3 | Contrat d'extension basé sur Registry | Non commencé |

### ECO1 — Plugin Loader

Établir le chargement et l'activation d'extensions déjà cataloguées par Registry.

Registry n'appartient pas à Ecosystem : il reste un sous-système du Core Layer et relève exclusivement de Core Foundation.

### ECO2 — Extension lifecycle

Structurer le cycle de vie des extensions après établissement du mécanisme de chargement.

### ECO3 — Contrat d'extension basé sur Registry

Établir la frontière contractuelle entre le catalogue déclaratif du Core et les extensions utilisables par la plateforme.

ECO1 dépend de CF2.

## 10. Collaboration

## 10.1 Objectif

Permettre le travail collectif autour d'un même projet sans dupliquer les responsabilités du Document ou de Project Synchronization.

## 10.2 Épics

| ID | Épic | État initial |
| --- | --- | --- |
| COL1 | Project Synchronization — première implémentation | Non commencé |
| COL2 | Collaboration | Non commencé |

### COL1 — Project Synchronization

Établir la capacité de gérer les versions métier d'un projet, notamment la réplication, la résolution de conflits et la fusion.

COL1 dépend de CF1 et CF3.

### COL2 — Collaboration

Introduire les capacités de présence, commentaires, permissions, notifications et travail collectif.

COL2 dépend de COL1.

## 11. Graphe global de dépendances

Le graphe de référence est le suivant :

```text
CF1 - Document
 ├── CF2 - Registry ───── ECO1 ─ ECO2 ─ ECO3
 │       │
 │       └──── [porte d'intégration] ──── SIM1
 │
 └── CF3 - Mutation ───── COL1 ─ COL2

CF4 - Validation ────────── KL1 ─ KL2

SIM1 ─ SIM2 ─ SIM3
                     │
                     └── intégration Simulation / Embedded Runtime

EMB1 - Runtime firmware réel
 └── exécution du comportement firmware

EXP1 ───────────────────── EXP2 ───── EXP3 ───── EXP4 ───── EXP5
                              │
                              └── séquence opérationnelle §7.2.2 → MB-VIS-TINKERCAD-047
```

Ce graphe ne signifie pas que chaque Épic doit attendre la clôture complète de toutes ses dépendances pour commencer.
