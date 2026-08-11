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
# 3. Core Layer

## 3.1 Document

### Pourquoi il existe

Le Document existe afin de fournir une représentation canonique unique de tout projet MYBlab. Cette représentation garantit que l'ensemble des couches et sous-systèmes manipulent la même réalité métier, indépendamment de leur responsabilité propre.

### Ce qu'il porte

Le Document porte la représentation canonique d'un projet MYBlab : les composants qui le constituent, les connexions qui les relient, les propriétés et paramètres qui les définissent. C'est la seule source à laquelle une autre partie de l'architecture peut se référer pour savoir ce qu'un projet contient réellement, à un instant donné.

Le Document décrit l'état d'un projet, jamais son comportement.

### Ce qu'il ne porte pas

Le Document ne porte aucun calcul, aucune décision de rendu, aucune interprétation pédagogique de son propre contenu. Il ne décide jamais lui-même d'être modifié — toute modification lui est appliquée par Mutation, jamais initiée depuis l'intérieur. Le Document ne porte pas la responsabilité de la gestion de ses états successifs. Cette responsabilité appartient au sous-système Mutation.

### Interfaces

Le Document expose son état courant à la consultation, par toute couche ou tout sous-système du Core Layer autorisé à le faire. Toute évolution de cet état relève exclusivement du sous-système Mutation.

### Interactions

Mutation est le seul sous-système habilité à modifier le Document. Validation le consulte pour vérifier la cohérence d'une modification candidate avant qu'elle ne lui soit appliquée. Registry lui est consulté en parallèle, pour vérifier qu'un composant décrit dans le Document correspond à un type effectivement déclaré. Au-delà du Core Layer, l'Execution Layer et l'Application Layer ne font que le consulter, jamais le modifier directement — toute intention de modification qui en émane doit transiter par Mutation.

### Rattachement au Tome I

Le Document met en œuvre le Principe 1 (« les données métier sont la seule source de vérité ») dans son expression la plus directe : c'est précisément le sous-système dont l'existence rend ce principe applicable, plutôt qu'une simple déclaration d'intention. Il met également en œuvre le Principe 5 (« une représentation unique doit porter tout le parcours de l'utilisateur »), puisque c'est le même Document, sans changement de forme, qui accompagne un projet du premier geste de conception jusqu'à un usage avancé.

Il se rattache à la valeur Architecture durable — une source de vérité qui ne varie pas dans sa nature au fil du temps est la condition la plus élémentaire d'une architecture qui dure. Il se rattache également, plus indirectement, à la Continuité de l'expérience utilisateur (Chapitre III du Tome I) : c'est la stabilité du Document qui rend possible la promesse qu'un changement d'ambition ne signifie jamais un changement d'outil.
## 3.2 Mutation

### Pourquoi il existe

Mutation existe parce que le Document ne peut jamais se modifier lui-même. Une architecture où toute couche pourrait écrire directement dans le Document rendrait impossible la garantie que chaque changement reste contrôlé, cohérent et traçable. Mutation est le passage obligé entre l'expression d'une intention et son effet réel sur le Document.

### Ce qu'il porte

Mutation porte la traduction d'une intention en une modification contrôlée du Document. Une modification n'est appliquée que si elle a été validée au préalable ; elle reste réversible une fois appliquée.

Mutation porte la responsabilité de la gestion des états successifs d'un projet : elle seule permet de revenir à un état antérieur ou de rétablir un état annulé. Cette responsabilité lui a été explicitement déléguée par le Document (3.1) ; elle ne réapparaît nulle part ailleurs dans le Core Layer.

### Ce qu'il ne porte pas

Mutation ne décide jamais elle-même de ce qui doit être modifié — cette décision provient toujours d'une intention émise par un acteur autorisé de l'architecture. Mutation ne juge pas si une modification est cohérente ou acceptable : cette évaluation appartient exclusivement à Validation, consultée avant toute application. Mutation ne connaît pas la signification des types de composants qu'elle manipule — cette connaissance appartient à Registry. Mutation ne calcule et n'exécute aucun comportement.

### Interfaces

Mutation reçoit une intention de modification émise par un acteur autorisé de l'architecture. Elle produit, une fois cette intention appliquée, un nouvel état du Document. Elle expose la capacité de revenir à un état antérieur ou de rétablir un état annulé, sans exposer la manière dont cette capacité est assurée en interne.

### Interactions

Mutation est le seul sous-système autorisé à modifier le Document. Elle consulte systématiquement Validation avant d'appliquer une modification candidate. Elle reçoit ses intentions d'un acteur autorisé de l'architecture ; c'est l'unique point d'entrée permettant de faire évoluer indirectement l'état d'un projet.

### Rattachement au Tome I

Mutation met en œuvre le Principe 4 (« aucune action ne doit être irréversible sans filet de sécurité explicite ») dans son expression la plus directe : c'est le sous-système dont l'existence rend ce principe applicable à toute modification d'un projet, sans exception.

Elle se rattache à la valeur Curiosité et expérimentation : c'est Mutation qui rend l'essai sans risque possible, en garantissant qu'aucune tentative ne peut se solder par une perte irréversible. Elle se rattache également à la Continuité de l'expérience utilisateur, dans la mesure où la possibilité de revenir en arrière fait partie intégrante de ce qui permet à un utilisateur de progresser sans crainte.

---

## 3.3 Validation

### Pourquoi il existe

Validation existe parce qu'aucune modification ne doit atteindre le Document sans que sa cohérence n'ait été évaluée au préalable. Sans ce sous-système, Mutation devrait elle-même juger de la validité de ce qu'elle applique, ce qui mélangerait deux responsabilités distinctes : appliquer un changement, et évaluer s'il est cohérent.

### Ce qu'il porte

Validation porte l'évaluation de la cohérence d'une modification candidate, avant son application au Document. Elle produit un résultat de validation que Mutation peut exploiter pour décider d'appliquer ou de rejeter la modification.

### Ce qu'il ne porte pas

Validation ne modifie jamais le Document, ni directement ni indirectement. Elle ne décide pas de l'application ou du rejet d'une modification — cette décision appartient exclusivement à Mutation, sur la base du résultat qu'elle produit. Elle ne produit pas l'explication pédagogique destinée à l'utilisateur : cette responsabilité appartient à Knowledge, que Validation ne consulte ni ne connaît. Validation ne définit pas elle-même les types de composants qu'elle évalue — cette connaissance lui est fournie par Registry.

### Interfaces

Validation reçoit une modification candidate et l'état courant du Document. Elle expose un résultat de validation, qui qualifie la nature d'une éventuelle incohérence sans l'exprimer dans un langage destiné à l'utilisateur.

### Interactions

Validation est consultée par Mutation avant toute application d'une modification candidate. Elle consulte Document pour évaluer l'état sur lequel porte cette modification. Elle consulte Registry pour vérifier qu'un composant concerné correspond à un type effectivement déclaré. Elle ne consulte jamais Knowledge, ni aucun sous-système de l'Application Layer — cette absence de dépendance montante est requise par l'Invariant I1.

### Rattachement au Tome I

Validation met en œuvre le Principe 3 (« les limites du modèle doivent être exposées, jamais dissimulées ») : c'est le sous-système dont l'existence permet de détecter une incohérence avant qu'elle ne s'installe silencieusement dans le Document. Elle met également en œuvre le Principe 1, en garantissant que ce qui devient une donnée métier reste une vérité cohérente.

Elle se rattache à la valeur Fidélité scientifique — un modèle qui n'écarte pas ses propres incohérences ne peut prétendre représenter fidèlement le système qu'il décrit. Elle se rattache également, plus indirectement, à Compréhension avant reproduction : c'est parce qu'une incohérence est détectée et qualifiée par Validation qu'elle peut ensuite être expliquée par Knowledge, plutôt que découverte tardivement, sans explication, au moment de la simulation.