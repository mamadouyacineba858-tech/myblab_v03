
**Fondement : Tome I (`MYBLAB_VISION_2030.md`), chapitres I à VI**
**Rappel (E1, Tome I) : ce gel de structure n'a pas d'autorité formelle tant qu'il n'est pas effectivement intégré au dépôt et rattaché à la hiérarchie documentaire officielle.**

---

## 1. Modèle en couches

```text
┌──────────────────────────────────────────────┐
│               APPLICATION LAYER               │
│  Presentation · Knowledge · Learning ·         │
│  Collaboration                                 │
└──────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│                EXECUTION LAYER                 │
│  Simulation · Embedded Runtime                 │
└──────────────────────────────────────────────┘
                      │
                      ▼
┌──────────────────────────────────────────────┐
│                   CORE LAYER                   │
│  Document · Mutation · Validation ·            │
│  Registry · Project Synchronization            │
└──────────────────────────────────────────────┘

─────────────────────────────────────────────────
              PLATFORM SERVICES
─────────────────────────────────────────────────
  Storage · Plugin Loader
  (services d'infrastructure, hors couches,
   consommés par toutes les couches sans y
   appartenir)
```

### Définitions des couches

- **Core Layer** — porte l'état métier et les opérations structurelles. N'exécute et n'affiche jamais.
- **Execution Layer** — produit un comportement à partir de l'état métier, sans jamais en devenir propriétaire.
- **Application Layer** — rend ces capacités utilisables par un acteur, humain ou logiciel.

Ces trois définitions sont volontairement générales : elles doivent pouvoir accueillir un acteur non encore identifié aujourd'hui (API, SDK, CLI, mode batch) sans être réécrites.

---

## 2. Composition des couches

### Core Layer
| Sous-système | Responsabilité en une phrase |
|---|---|
| Document | Représentation canonique unique d'un projet |
| Mutation | Traduction d'une intention en modification contrôlée, historisée, réversible |
| Validation | Vérification qu'une modification candidate reste cohérente avant application |
| Registry | Catalogue déclaratif des types de composants et modèles disponibles |
| Project Synchronization | Réplication, résolution de conflits, versionnement et fusion de l'état d'un projet |

### Execution Layer
| Sous-système | Responsabilité en une phrase |
|---|---|
| Simulation | Calcul du comportement d'un système à partir du Document, sans état conservé entre deux appels |
| Embedded Runtime | Exécution fidèle d'un comportement programmé, intégré comme source de signaux à la Simulation |

### Application Layer
| Sous-système | Responsabilité en une phrase |
|---|---|
| Presentation | Affichage du Document et des résultats de calcul, adapté au contexte de l'utilisateur |
| Knowledge | Production d'explications, diagnostics et annotations à partir d'un état et d'un résultat |
| Learning | Pilotage de la progression de l'utilisateur et de ce qui lui est montré |
| Collaboration | Présence, commentaires, permissions, notifications, travail collectif — appuyé sur Project Synchronization sans en dupliquer la responsabilité |

### Platform Services
| Service | Responsabilité en une phrase |
|---|---|
| Storage | Lecture, écriture, versionnement d'un état sérialisé, sans connaissance de sa signification métier |
| Plugin Loader | Chargement, activation et cycle de vie d'une extension déjà catalogué par le Registry |

---

## 3. Invariants architecturaux

**I1 — Aucune dépendance vers le haut, jamais, sans exception.**
Une couche ne peut dépendre que d'une couche strictement inférieure ou égale à la sienne. Core ne connaît ni Execution ni Application. Execution ne connaît jamais Application.

**I2 — Une couche haute peut dépendre de plusieurs couches basses simultanément.**
Ce n'est pas une violation de I1 : Application peut lire à la fois Core (le Document) et Execution (un résultat de calcul), tant que chaque dépendance descend et ne remonte jamais.

**I3 — Toute interaction passe par l'interface exposée du sous-système cible, jamais par accès à son état interne.**

**I4 — Core reste strictement passif.** Il ne déclenche jamais d'appel vers une couche supérieure ; l'initiative vient toujours d'en haut, via consultation ou via Mutation.

**I5 — Les Platform Services sont exclusivement passifs.** Ils répondent à des appels, ils n'en émettent jamais vers une couche. Cette contrainte s'applique symétriquement à I1 : un service ne doit jamais devenir un canal détourné de dépendance montante.

**I6 — Chaque sous-système porte une seule responsabilité.** Toute violation détectée (comme celles corrigées pour Registry et Collaboration durant la phase de dérivation) doit être traitée comme une scission à opérer, jamais comme une exception tolérée.

**I7 — Toute décision d'architecture doit citer les principes du Tome I qu'elle traduit et démontrer qu'elle n'en contredit aucun** (application directe de l'Engagement E4 du Tome I).

**I8 — Toute tension non résolue entre deux règles de ce document doit produire une décision d'arbitrage explicite et documentée, jamais un contournement silencieux dans le code** (application directe de l'Engagement E5 du Tome I).

---

## 4. Table des matières définitive de `PLATFORM_ARCHITECTURE.md`

```text
PLATFORM_ARCHITECTURE.md

1. Introduction
   1.1 Objectifs du document
   1.2 Portée
   1.3 Relation avec le Tome I

2. Architecture globale
   2.1 Les couches
   2.2 Règles de dépendance
   2.3 Communication Model
   2.4 Invariants

3. Core Layer
   3.1 Document
   3.2 Mutation
   3.3 Validation
   3.4 Registry
   3.5 Project Synchronization

4. Execution Layer
   4.1 Simulation
   4.2 Embedded Runtime
   4.3 Communication entre moteurs

5. Application Layer
   5.1 Presentation
   5.2 Knowledge
   5.3 Learning
   5.4 Collaboration

6. Platform Services
   6.1 Storage
   6.2 Plugin Loader

7. Correspondance avec le Tome I
   7.1 Valeurs → Architecture
   7.2 Principes → Sous-systèmes
   7.3 Piliers → Domaines

8. ADR de référence
```

**Note de renvoi hors périmètre** : Component SDK, Plugin SDK, API publiques et documentation développeur ne figurent pas dans ce plan — ils relèvent d'un futur Tome III (« Developer Platform »), non encore commissionné.

---
