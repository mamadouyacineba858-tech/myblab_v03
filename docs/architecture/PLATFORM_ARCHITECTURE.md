# PLATFORM_ARCHITECTURE.md

1. Introduction
1.1 Objectifs du document

PLATFORM_ARCHITECTURE.md décrit l'architecture technique permanente de MYBlab : les couches qui la composent, les sous-systèmes qui les peuplent, et les règles qui gouvernent leurs échanges. Ce document ne crée pas de nouveaux principes. Il traduit architecturalement ceux du Tome I (MYBLAB_VISION_2030.md).

1.2 Portée

Ce document couvre le Core Layer, l'Execution Layer, l'Application Layer et les Platform Services, ainsi que les treize sous-systèmes qui les composent. Il ne couvre pas le développement d'extensions, de SDK ou d'API publiques — ces sujets relèvent d'un futur Tome III (« Developer Platform »), non encore commissionné.

Des documents d'architecture historiques existent dans le dépôt. Leur statut et leur articulation avec le présent document sont décrits dans ADR-011.

1.3 Relation avec le Tome I, les ADR et le code

Chaque sous-système décrit dans ce document est relié explicitement aux piliers, principes et valeurs du Tome I dont il découle (section 7). Toute décision d'architecture doit citer les principes du Tome I qu'elle traduit et démontrer qu'elle n'en contredit aucun. Cette correspondance est consolidée au Chapitre 7 du présent document.

Les ADR traduisent les principes de ce document en décisions techniques concrètes ; elles ne peuvent jamais les contredire (Engagement E4 du Tome I). Une ADR peut aussi bien découler de ce document que le précéder et l'éclairer — ADR-011 en est le premier exemple : produite avant l'achèvement de ce document, elle a directement informé la rédaction de cette section.

Le présent document définit les responsabilités architecturales et les frontières entre les sous-systèmes. Il ne prescrit ni une organisation particulière du dépôt, ni une structure de fichiers, ni une technologie d'implémentation. Le passage de cette architecture au code relève des ADR et des décisions d'implémentation qui en découlent.



---

# 2. Architecture globale

## 2.1 Les couches

MYBlab s'organise en trois couches et une catégorie de services d'infrastructure, selon le modèle suivant :

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
```

**Core Layer** — porte l'état métier et les opérations structurelles. N'exécute et n'affiche jamais.

**Execution Layer** — produit un comportement à partir de l'état métier, sans jamais en devenir propriétaire.

**Application Layer** — rend ces capacités utilisables par un acteur, humain ou logiciel.

**Platform Services** — services d'infrastructure, hors couches, consommés par toutes les couches sans y appartenir. Ils ne portent aucune responsabilité métier propre.

Ces définitions sont volontairement générales : elles doivent pouvoir accueillir un acteur non encore identifié aujourd'hui (API, SDK, CLI, mode batch) sans être réécrites.

### Composition des couches

#### Core Layer
| Sous-système | Responsabilité en une phrase |
|---|---|
| Document | Représentation canonique unique d'un projet |
| Mutation | Traduction d'une intention en modification contrôlée, historisée, réversible |
| Validation | Vérification qu'une modification candidate reste cohérente avant application |
| Registry | Catalogue déclaratif des types de composants et modèles disponibles |
| Project Synchronization | Gestion des versions métier d'un projet : réplication, résolution de conflits, fusion |

#### Execution Layer
| Sous-système | Responsabilité en une phrase |
|---|---|
| Simulation | Calcul du comportement d'un système à partir du Document, sans état conservé entre deux appels |
| Embedded Runtime | Exécution fidèle d'un comportement programmé, intégré comme source de signaux à la Simulation |

#### Application Layer
| Sous-système | Responsabilité en une phrase |
|---|---|
| Presentation | Restitution graphique des informations produites par les autres sous-systèmes |
| Knowledge | Production d'explications, diagnostics et annotations à partir d'un état et d'un résultat |
| Learning | Décision de quelles informations pédagogiques produire et montrer, selon la progression de l'utilisateur |
| Collaboration | Présence, commentaires, permissions, notifications, travail collectif — appuyé sur Project Synchronization sans en dupliquer la responsabilité |

#### Platform Services
| Service | Responsabilité en une phrase |
|---|---|
| Storage | Persistance technique des états sérialisés, sans connaissance de leur signification métier |
| Plugin Loader | Chargement, activation et cycle de vie d'une extension déjà catalogué par le Registry |

Le détail complet de chaque sous-système (pourquoi il existe, ce qu'il porte, ce qu'il ne porte pas, ses interfaces et ses interactions) fait l'objet des chapitres 3 à 6, pas du présent chapitre.

---

## 2.2 Règles de dépendance

L'architecture de MYBlab repose sur une seule règle directionnelle, déclinée en plusieurs conséquences concrètes : **une dépendance ne descend jamais que vers une couche strictement inférieure ou égale à la sienne, jamais vers le haut, sans exception.** Core ne connaît ni Execution ni Application. Execution ne connaît jamais Application.

Cette règle n'interdit pas qu'une couche haute dépende de plusieurs couches basses à la fois : Application peut lire simultanément le Core (le Document) et l'Execution (un résultat de calcul), tant que chacune de ces dépendances descend et qu'aucune ne remonte.

Toute interaction entre deux sous-systèmes passe par l'interface que le sous-système cible expose explicitement — jamais par un accès à son état interne. C'est cette discipline qui permet à une couche de changer d'implémentation sans que les couches qui en dépendent aient à changer.

Le Core Layer reste strictement passif : il ne déclenche jamais d'appel vers une couche supérieure. L'initiative vient toujours d'en haut, par consultation ou par une intention transmise à Mutation.

Les Platform Services obéissent à la même discipline, sous une forme adaptée à leur nature : n'appartenant à aucune couche, ils peuvent être consultés par n'importe laquelle d'entre elles, mais ne peuvent jamais initier d'appel vers une couche. Un service qui répond à une couche ne viole pas la règle directionnelle ; un service qui appellerait une couche de sa propre initiative la violerait. C'est cette asymétrie — consultable par toutes, jamais à l'origine d'un appel — qui permet aux Platform Services de rester hors du schéma en couches sans devenir un canal détourné de dépendance montante.

Ces règles sont énoncées formellement en 2.4 (invariants I1 à I5).

---

## 2.3 Communication Model

Les règles de dépendance (2.2) définissent une direction. Elles ne définissent pas une nature d'échange. C'est l'objet de cette section, qui reste volontairement indépendante de toute technologie d'implémentation, conformément à la portée fixée au chapitre 1.

Deux formes d'interaction structurent les échanges entre sous-systèmes :

**La consultation** — un sous-système interroge l'état ou le résultat exposé par un autre, sans en changer le contenu. C'est un échange en lecture, dont la réponse est déterminée par l'état interrogé au moment de la consultation.

**L'intention** — un sous-système exprime le souhait qu'un état change, sans jamais l'imposer directement. C'est le seul mécanisme par lequel une modification peut être demandée ; elle transite toujours par le Système de Mutation avant de devenir effective, jamais par un accès direct à ce qui doit changer.

Le présent document définit uniquement les principes d'échange. Les mécanismes d'implémentation (appel direct, événements, synchronisme, asynchronisme, etc.) relèvent des ADR et des décisions d'implémentation.

---

## 2.4 Invariants architecturaux

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
