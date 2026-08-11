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

---

## 3.4 Registry

### Pourquoi il existe

Registry existe parce qu'aucun autre sous-système du Core Layer ne doit avoir à connaître, par lui-même, l'ensemble des types de composants que MYBlab peut représenter. Sans lui, chaque sous-système qui a besoin de savoir ce qu'est un type de composant devrait le savoir par construction, ce qui rendrait impossible l'ajout d'un nouveau type sans modifier ce qui existe déjà.

### Ce qu'il porte

Registry porte la connaissance déclarative de ce qui est disponible dans MYBlab, sous deux dimensions distinctes mais portées par une seule responsabilité :

- la structure d'un type de composant : son identifiant, ses paramètres, ses bornes de connexion ;
- la disponibilité d'un modèle de simulation associé à ce type, pour les sous-systèmes qui en ont besoin.

Ces deux dimensions ne font qu'exposer ce qui est déclaré comme existant — Registry ne produit ni n'exécute lui-même aucun de ces modèles.

### Ce qu'il ne porte pas

Registry ne valide jamais une modification candidate — cette responsabilité appartient exclusivement à Validation, qui le consulte. Registry ne calcule et n'exécute aucun modèle de simulation — il se contente d'en exposer la disponibilité pour un type donné. Registry ne charge, n'active et ne gère le cycle de vie d'aucune extension — cette responsabilité appartient à Plugin Loader, qui consulte Registry comme source de connaissance sur les extensions déclarées. Registry ne décide jamais de l'acceptation d'une modification.

### Interfaces

Registry expose la consultation de l'existence et de la structure d'un type de composant déclaré, ainsi que la disponibilité d'un modèle de simulation associé à ce type.

### Interactions

Registry fournit la connaissance des types déclarés permettant de vérifier qu'un composant porté par le Document correspond à un type existant. Validation consulte Registry pour évaluer la validité structurelle d'une modification candidate. Plugin Loader consulte Registry pour connaître les extensions déclarées. Registry ne consulte aucun autre sous-système du Core Layer ; il reste une source de connaissance déclarative, jamais un demandeur.

### Rattachement au Tome I

Registry met en œuvre le Principe 7 (« la plateforme s'étend sans reconstruire ce qui existe déjà ») dans son expression la plus directe : c'est le sous-système dont l'existence rend possible l'ajout d'un type de composant sans modifier Document, Mutation ou Validation. Il met également en œuvre le Principe 10, en séparant nettement la connaissance déclarative de ce qui existe de l'exécution de ce que cela produit.

Il se rattache au pilier Écosystème ouvert, qu'il rend concrètement possible au niveau du Core Layer. Il se rattache également à la valeur Architecture durable, puisque c'est la stabilité de cette connaissance déclarative qui permet à la plateforme d'accueillir de nouveaux types de composants sans jamais remettre en cause ceux qui existent déjà.

---

## 3.5 Project Synchronization

### Pourquoi il existe

Project Synchronization existe parce qu'un même projet peut exister sous plusieurs états simultanément, répartis entre plusieurs instances, sans qu'aucune de ces instances ne détienne à elle seule la totalité de la vérité. Sans ce sous-système, réconcilier ces états divergents deviendrait la responsabilité de chaque acteur qui en aurait besoin, au lieu d'être une responsabilité architecturale unique et cohérente.

### Ce qu'il porte

Project Synchronization porte le versionnement métier d'un projet : la réplication de son état entre plusieurs instances, la détection et la résolution de conflits entre versions divergentes, et la fusion de ces versions en un état cohérent.

### Ce qu'il ne porte pas

Project Synchronization ne possède pas elle-même l'état canonique d'un projet — le Document reste, en toute circonstance, l'unique source de vérité. Elle ne modifie jamais directement le Document : tout état fusionné qu'elle produit et qui doit devenir effectif transite par Mutation, puis suit le chemin de validation déjà établi pour toute modification. Elle ne porte pas la persistance technique des états qu'elle réplique ou fusionne — cette responsabilité appartient exclusivement à Storage, qu'elle ne consulte pas directement. Elle ne porte aucune fonctionnalité tournée vers l'utilisateur — présence, commentaires, permissions, notifications — ces responsabilités appartiennent à Collaboration.

### Interfaces

Project Synchronization expose la réplication de l'état d'un projet entre plusieurs instances, ainsi que la production d'un état fusionné lorsque des versions divergentes doivent être réconciliées. Cet état fusionné est exposé comme un résultat à transmettre, jamais comme une modification déjà appliquée.

### Interactions

Project Synchronization consulte Document pour connaître l'état à répliquer. Elle transmet à Mutation le résultat d'une fusion, sous la même forme que toute autre intention de modification — elle ne dispose d'aucun accès privilégié au Document. Elle est consultée par Collaboration, qui s'appuie sur elle sans dupliquer sa responsabilité ; Project Synchronization, à l'inverse, ne dépend jamais de Collaboration ni d'aucun sous-système de l'Application Layer. Elle ne consulte pas Storage directement — la persistance technique des états qu'elle manipule reste hors de son périmètre.

### Rattachement au Tome I

Project Synchronization met en œuvre le Principe 10 (séparation des responsabilités), en distinguant nettement le versionnement métier d'un projet de sa persistance technique (Storage) et de son usage collaboratif (Collaboration). Elle s'inscrit également dans le respect du Principe 1, puisque toute réconciliation qu'elle produit ne devient une donnée métier qu'après être passée par Mutation, sans jamais contourner le Document comme source unique de vérité.

Elle se rattache au pilier Collaboration et partage, dans sa dimension structurelle plutôt que dans son usage — c'est elle qui rend possible, au niveau du Core Layer, ce que Collaboration donnera ensuite à vivre à l'utilisateur. Elle se rattache également à la valeur Architecture durable, puisque c'est la clarté de cette séparation qui permettra à la plateforme d'accueillir un usage collaboratif sans jamais remettre en cause l'intégrité du Document.

---

# 4. Execution Layer

## 4.1 Simulation

### Pourquoi il existe

Simulation existe parce que concevoir un circuit ne suffit pas à en comprendre le comportement. Le Document décrit ce qu'un projet contient ; Simulation calcule ce que ce contenu produirait s'il était réellement mis en œuvre. Sans ce sous-système, cette compréhension resterait à la charge de l'utilisateur seul, sans que la plateforme ne puisse jamais la vérifier ni la lui montrer.

### Ce qu'il porte

Simulation porte le calcul du comportement d'un système décrit par le Document, pour une analyse donnée, à un instant donné, sans conserver aucun état entre deux calculs successifs. Elle produit un résultat structuré et scientifiquement qualifié.

### Ce qu'il ne porte pas

Simulation ne modifie jamais le Document, ni directement ni indirectement — elle le reçoit exclusivement en lecture. Elle ne décide pas de la manière dont son résultat est affiché ; cette responsabilité appartient à Presentation. Elle ne formule pas d'explication pédagogique, de diagnostic ou d'annotation destinés à l'utilisateur ; cette responsabilité appartient exclusivement à Knowledge. Simulation ne connaît ni le langage pédagogique ni l'interface utilisateur. Elle ne définit pas elle-même les types de composants ou les modèles qu'elle emploie ; cette connaissance lui est fournie par Registry.

### Interfaces

Simulation reçoit le Document en lecture seule, pour une analyse donnée. Elle expose un résultat structuré et qualifié scientifiquement, consommable par les sous-systèmes qui en ont besoin.

### Interactions

Simulation consulte Document pour connaître l'état du système à calculer. Elle consulte Registry pour obtenir les modèles de simulation associés aux types de composants concernés. Elle peut utiliser Embedded Runtime comme source de signaux, selon les interfaces que celui-ci expose. Elle ne consulte jamais Knowledge ni aucun sous-système de l'Application Layer. Son résultat est consulté par Presentation et par Knowledge, chacun selon sa propre responsabilité — restitution pour l'un, explication pour l'autre.

### Rattachement au Tome I

Simulation met en œuvre le Principe 2 (« chaque comportement affiché doit pouvoir être expliqué ») en produisant un résultat qui rend cette explication possible, sans la formuler elle-même. Elle met également en œuvre le Principe 3 (« les limites du modèle doivent être exposées, jamais dissimulées »), en qualifiant scientifiquement ce qu'elle calcule plutôt qu'en donnant l'apparence d'une exactitude qu'elle ne peut garantir.

Elle se rattache au pilier Simulation scientifique, dont elle constitue le cœur, et à la valeur Fidélité scientifique dans son expression la plus directe : c'est Simulation qui porte, dans l'architecture, l'engagement du Tome I selon lequel la simulation cherche toujours à représenter fidèlement le comportement attendu du système étudié, dans les limites clairement assumées du modèle utilisé.

---

## 4.2 Embedded Runtime

### Pourquoi il existe

Embedded Runtime existe parce que la Mission de MYBlab promet un chemin continu de la conception d'un circuit jusqu'à l'exécution réelle d'un comportement programmé. Sans ce sous-système, un microcontrôleur resterait un composant purement passif dans le Document, incapable de produire lui-même le comportement qu'un utilisateur lui aurait destiné.

### Ce qu'il porte

Embedded Runtime porte l'exécution fidèle d'un comportement programmé, associé à un composant du Document. Il produit des signaux qu'il fournit à Simulation, qui les consomme selon les besoins de son analyse.

### Ce qu'il ne porte pas

Embedded Runtime ne calcule pas le comportement électrique du reste du circuit — cette responsabilité appartient exclusivement à Simulation, qu'il alimente sans jamais s'y substituer. Il ne décide pas de la manière dont son exécution est affichée ; cette responsabilité appartient à Presentation. Il ne formule aucune explication pédagogique, aucun diagnostic, aucune annotation destinés à l'utilisateur ; cette responsabilité appartient exclusivement à Knowledge. Il ne dépend jamais de Simulation — c'est Simulation qui, le cas échéant, dépend de lui.

### Interfaces

Embedded Runtime reçoit la description d'un comportement programmé, associée à un composant du Document. Il expose les signaux qu'il produit, consommables par Simulation selon les interfaces que celle-ci définit.

### Interactions

Embedded Runtime fournit des signaux à Simulation ; Simulation les consomme lorsqu'ils sont nécessaires à son analyse. Cette relation ne se lit jamais dans l'autre sens : Embedded Runtime ne consulte jamais Simulation ni n'en dépend. Il ne consulte aucun sous-système de l'Application Layer.

### Rattachement au Tome I

Embedded Runtime met en œuvre le Principe 3 (« les limites du modèle doivent être exposées, jamais dissimulées »), en assumant que la fidélité de son exécution a ses propres limites, aussi réelles que celles de Simulation. Il met également en œuvre le Principe 7 (« la plateforme s'étend sans reconstruire ce qui existe déjà »), puisque son existence permet d'introduire un comportement programmé sans jamais devoir modifier Simulation elle-même.

Il se rattache au pilier Programmation et systèmes embarqués, dont il constitue le cœur, et à la valeur Fidélité scientifique, dans l'exigence la plus stricte que porte le Tome I : un comportement programmé doit se comporter, dans MYBlab, comme il se comporterait réellement.

## 4.3 Communication entre moteurs

Les sous-systèmes de l'Execution Layer ne se limitent pas nécessairement à Simulation et Embedded Runtime. Cette section ne redéfinit pas la relation qui les unit aujourd'hui — elle est déjà entièrement décrite en 4.1 et 4.2 — mais pose la règle générale que tout sous-système futur de cette couche devra respecter pour communiquer latéralement avec un autre.

Un échange entre deux sous-systèmes de l'Execution Layer est toujours une consultation, au sens défini en 2.3 : l'un expose un résultat ou un signal, l'autre le consomme, sans que cela n'en modifie le contenu. Les échanges latéraux au sein de cette couche ne constituent pas des intentions de modification du Document : toute évolution du Document reste soumise au passage par Mutation.

Cette règle ne crée aucun mécanisme nouveau : elle applique, au niveau de l'Execution Layer, la règle déjà posée en 2.2 pour les échanges latéraux intra-couche, et les deux formes d'interaction déjà définies en 2.3. Elle ne prescrit aucune technologie d'implémentation pour réaliser cette consultation.

---

# 5. Application Layer

## 5.1 Presentation

### Pourquoi il existe

Presentation existe parce que ce que les autres sous-systèmes produisent — un état, un résultat de calcul, une explication, une décision d'adaptation — doit être rendu visible pour avoir une utilité. Sans lui, chaque sous-système devrait porter, en plus de sa propre responsabilité, la charge de sa propre restitution.

### Ce qu'il porte

Presentation porte la restitution graphique des informations produites par les autres sous-systèmes : le Document, les résultats de Simulation, les explications de Knowledge, les décisions d'adaptation de Learning.

### Ce qu'il ne porte pas

Presentation ne décide jamais de ce qui doit être montré, simplifié ou mis en avant selon la progression de l'utilisateur ; cette décision appartient à Learning. Elle ne produit aucune explication, aucun diagnostic, aucune annotation ; cette responsabilité appartient à Knowledge. Elle ne modifie jamais le Document directement ; toute intention qui en émane doit transiter par Mutation. Elle ne calcule aucun comportement.

### Interfaces

Presentation consomme le Document, les résultats produits par Simulation, les explications produites par Knowledge, et les décisions d'adaptation produites par Learning. Elle expose l'émission d'intentions, transmises à Mutation.

### Interactions

Presentation consulte Document et Simulation, respectivement dans le Core Layer et l'Execution Layer — une même couche pouvant dépendre de plusieurs couches inférieures à la fois. Au sein de l'Application Layer, elle consulte Knowledge et Learning, chacun selon sa propre responsabilité. Elle émet des intentions vers Mutation, jamais de modification directe. Elle ne consulte aucun sous-système en dehors de ceux dont elle a besoin pour restituer ce qu'ils produisent.

### Rattachement au Tome I

Presentation met en œuvre le Principe 9 (« le retour du système doit être clair, compréhensible et proportionné ») dans son expression la plus directe : c'est le sous-système dont la responsabilité exclusive est de rendre ce retour effectivement perceptible. Elle met également en œuvre le Principe 6 (« la complexité se révèle progressivement, elle ne se duplique jamais »), en exécutant les décisions d'adaptation de Learning sans jamais les dupliquer par une logique qui lui serait propre.

Elle se rattache à la valeur Simplicité sans simplification excessive, dans la tension qu'elle doit constamment arbitrer entre clarté et fidélité. Elle se rattache également à La technologie s'efface derrière les idées : c'est au niveau de Presentation que se joue, très concrètement, la promesse que l'utilisateur cesse de percevoir l'outil pour ne plus penser qu'à son projet.

---
## 5.2 Knowledge

### Pourquoi il existe

Knowledge existe parce qu'un résultat correct ne suffit pas à faire comprendre. Simulation et Validation produisent des résultats qualifiés, mais aucun des deux ne les formule pour un utilisateur. Sans Knowledge, cette transformation resterait à la charge de l'utilisateur seul, ou serait dispersée, sans cohérence, entre plusieurs sous-systèmes qui n'ont pourtant pas cette responsabilité.

### Ce qu'il porte

Knowledge porte la production d'explications, de diagnostics et d'annotations, à partir des résultats qualifiés que produisent Simulation et Validation. Il transforme un résultat scientifiquement qualifié ou une incohérence détectée en contenu compréhensible par l'utilisateur.

### Ce qu'il ne porte pas

Knowledge ne calcule aucun comportement — il interprète un résultat déjà produit, il ne le produit pas lui-même. Il ne décide pas quand ni comment son explication doit être montrée à l'utilisateur ; cette décision appartient à Learning. Il ne restitue rien lui-même à l'écran ; cette responsabilité appartient à Presentation. Il ne modifie jamais le Document.

### Interfaces

Knowledge consomme les résultats produits par Simulation et les résultats de validation produits par Validation. Il expose des explications structurées, consommables par les sous-systèmes qui décident de leur usage.

### Interactions

Knowledge consulte Simulation pour les résultats qu'il doit expliquer, et Validation pour les incohérences qu'elle a détectées et qualifiées. Il consulte Document lorsque le contexte du projet est nécessaire à son explication. Il est consulté par Learning, qui décide de l'usage et de l'adaptation de ce qu'il produit ; Presentation restitue ce contenu selon cette décision. Knowledge ne consulte jamais Presentation directement. Aucun sous-système du Core Layer ou de l'Execution Layer ne consulte Knowledge — cette absence de dépendance montante est requise par l'Invariant I1.

### Rattachement au Tome I

Knowledge met en œuvre le Principe 2 (« chaque comportement affiché doit pouvoir être expliqué ») dans son expression la plus directe : c'est le sous-système dont l'existence rend cette exigence réalisable, plutôt que déclarative. Son indépendance vis-à-vis de toute technologie particulière traduit directement l'esprit du pilier Intelligence et connaissance : ce que Knowledge sera dans dix ans changera sans doute, ce qu'il doit accomplir ne changera pas.

Il se rattache à la valeur Compréhension avant reproduction, la première valeur du Tome I, ici élevée au rang de sous-système à part entière. Il se rattache également à La technologie s'efface derrière les idées : c'est Knowledge qui rend possible qu'un résultat scientifique devienne une compréhension, sans jamais imposer à l'utilisateur la charge de faire seul cette traduction.

---

## 5.3 Learning

### Pourquoi il existe

Learning existe parce qu'un même contenu ne convient pas à tous les moments d'un parcours. Sans un sous-système dédié à cette décision, chaque autre sous-système serait tenté d'y répondre à sa manière, au risque de disperser une responsabilité qui doit rester unique : décider ce qui doit être montré, simplifié ou approfondi, selon la progression de l'utilisateur.

### Ce qu'il porte

Learning porte la décision de l'usage et de l'adaptation du contenu produit par Knowledge, selon la progression de l'utilisateur telle qu'elle peut être appréciée à partir de l'état du Document.

### Ce qu'il ne porte pas

Learning ne produit aucune explication, aucun diagnostic, aucune annotation — cette responsabilité appartient exclusivement à Knowledge. Learning ne restitue rien lui-même à l'écran — cette responsabilité appartient exclusivement à Presentation. Learning ne modifie jamais le Document. Learning ne suppose l'existence d'aucun profil utilisateur, d'aucun historique d'apprentissage persistant, ni d'aucun sous-système dédié à leur conservation ; la progression qu'il apprécie se limite à ce que l'état du Document rend observable.

### Interfaces

Learning consulte le contenu que Knowledge met à disposition et l'état du Document. Il expose une décision d'usage et d'adaptation, consommable par Presentation.

### Interactions

Learning consulte Knowledge pour connaître le contenu disponible, et Document pour apprécier la progression du projet en cours. Il est consulté par Presentation, qui restitue selon la décision qu'il produit. Learning ne consulte jamais Presentation, et ne dépend d'aucun sous-système du Core Layer ou de l'Execution Layer au-delà du Document.

### Rattachement au Tome I

Learning met en œuvre le Principe 6 (« la complexité se révèle progressivement, elle ne se duplique jamais ») dans son expression la plus directe : c'est le sous-système dont l'existence rend cette progressivité possible, sans qu'aucun autre n'ait à la reproduire. Il met également en œuvre le Principe 4 (« aucune action ne doit être irréversible sans filet de sécurité explicite »), en veillant à ce que ce qui est montré reste toujours à la mesure de ce que l'utilisateur peut absorber sans se sentir dépassé.

Il se rattache à la valeur Progression continue, dont il est l'expression la plus directe parmi les treize sous-systèmes du Tome II. Il se rattache également à Curiosité et expérimentation : c'est en partie grâce à Learning que l'exploration reste toujours proportionnée à ce que l'utilisateur est prêt à recevoir, sans jamais le décourager par excès ni le priver par excès de prudence.

---

## 5.4 Collaboration

### Pourquoi il existe

Collaboration existe pour porter l'usage collectif d'un projet — présence, commentaires, permissions, notifications — que le pilier Collaboration et partage assume comme un choix stratégique du Tome I, distinct de sa dimension purement structurelle déjà portée par Project Synchronization.

### Ce qu'il porte

Collaboration porte la présence, les commentaires, les permissions, les notifications et le travail collectif autour d'un projet. Elle s'appuie sur Project Synchronization pour tout ce qui touche à la réplication et à la réconciliation de l'état d'un projet, sans dupliquer cette responsabilité.

### Ce qu'il ne porte pas

Collaboration ne réplique et ne fusionne aucune donnée elle-même — cette responsabilité appartient exclusivement à Project Synchronization. Elle ne consulte jamais le Document directement ; tout ce qui concerne l'état d'un projet transite par Project Synchronization. Elle ne modifie jamais le Document et n'émet aucune intention vers Mutation. Elle ne restitue rien elle-même à l'écran ; cette responsabilité appartient exclusivement à Presentation.

### Interfaces

Collaboration expose les informations collaboratives — présence, commentaires, permissions, notifications — consommables par Presentation. Elle consulte Project Synchronization pour la réplication et la réconciliation de l'état d'un projet.

### Interactions

Collaboration s'appuie sur Project Synchronization, qui ne dépend jamais d'elle en retour — cette relation est déjà fixée par 3.5. Elle est consultée par Presentation, qui restitue ce qu'elle produit, exactement selon le même modèle que Knowledge : le producteur ne devient jamais le restituteur. Collaboration ne consulte jamais Document ni Mutation directement, et ne dépend d'aucun autre sous-système du Core Layer ou de l'Execution Layer au-delà de Project Synchronization.

### Rattachement au Tome I

Collaboration met en œuvre le Principe 10 (séparation des responsabilités), en distinguant nettement son usage collectif de la réplication métier déjà portée par Project Synchronization. Elle s'inscrit également dans le respect du Principe 1, puisqu'elle ne détient elle-même aucun état canonique — tout ce qu'elle porte reste subordonné à ce que Project Synchronization et, en dernier ressort, le Document établissent comme vérité.

Elle se rattache au pilier Collaboration et partage, dans sa dimension d'usage — le pendant direct de ce que Project Synchronization en porte au niveau structurel. Elle se rattache également à la Continuité de l'expérience utilisateur, étendue ici à un usage à plusieurs : travailler à plusieurs sur un même projet doit rester aussi cohérent que d'y travailler seul.

# 6. Platform Services

## 6.1 Storage

### Pourquoi il existe

Storage existe parce qu'une source de vérité métier qui ne peut être restaurée après la fermeture de l'application ne peut soutenir aucun des principes que ce document a déjà établis. Sans lui, la continuité d'un projet — d'une session à l'autre, d'un usage à l'autre — resterait purement théorique.

### Ce qu'il porte

Storage porte la persistance technique d'un état sérialisé : lire, écrire, conserver, restaurer — sans jamais connaître la signification métier de ce qu'il persiste. Document est responsable de l'état métier et constitue son point d'accès architectural à Storage.

### Ce qu'il ne porte pas

Storage ne connaît aucune signification métier — ni composant, ni circuit, ni projet. Il ne décide jamais ce qui doit être persisté ni quand ; cette décision appartient à Document. Il n'est jamais consulté directement par un autre sous-système que Document : ni Mutation, ni Validation, ni Registry, ni Project Synchronization, ni aucun sous-système de l'Execution Layer ou de l'Application Layer ne s'adresse à lui directement — chacun, s'il a besoin de persistance, passe par Document.

### Interfaces

Storage reçoit une représentation sérialisée fournie par Document, et restaure un état à partir d'une représentation déjà persistée.

### Interactions

Storage est consulté exclusivement par Document. Project Synchronization ne le consulte jamais directement — la persistance technique des états qu'elle manipule reste hors de son périmètre, conformément à ce que 3.5 établit déjà. Storage, comme tout Platform Service, reste strictement passif : il répond à des appels, il n'en émet jamais vers une couche.

### Rattachement au Tome I

Storage met en œuvre le Principe 1 (« les données métier sont la seule source de vérité ») en le prolongeant au-delà d'une seule session : une source de vérité métier qui ne peut être restaurée après la fermeture de l'application ne peut soutenir ce principe dans la durée. Il s'inscrit également dans le Principe 10 (séparation des responsabilités), en maintenant une frontière stricte entre la persistance technique et la connaissance métier, que seul Document possède.

Il se rattache à la valeur Architecture durable — la persistance ne doit jamais imposer sa forme au modèle métier, et c'est cette discipline qui permet à Storage de rester remplaçable sans jamais affecter Document ni aucun autre sous-système.

---
## 6.2 Plugin Loader

### Pourquoi il existe

Plugin Loader existe parce que déclarer l'existence d'une extension ne suffit pas à la rendre utilisable. Registry catalogue ; Plugin Loader charge et active. Sans ce sous-système, chaque couche ayant besoin d'une extension devrait porter elle-même la responsabilité de son chargement, dispersant une logique qui doit rester unique et cohérente.

### Ce qu'il porte

Plugin Loader porte le chargement, l'activation et la gestion du cycle de vie d'une extension déjà cataloguée par Registry. Ses consultations de Registry sont strictement en lecture, et effectuées uniquement dans le traitement d'une requête qu'il a lui-même reçue.

### Ce qu'il ne porte pas

Plugin Loader ne possède aucun catalogue — il ne déclare, ne décrit et ne valide aucun type ; cette connaissance reste exclusivement celle de Registry. Il ne modifie jamais Registry, quelle qu'en soit la raison : Registry reste seul propriétaire de son propre catalogue. Il ne modifie jamais directement le Document. Il n'émet aucune action spontanée vers une couche : il ne répond qu'aux requêtes qu'il reçoit, il n'en déclenche jamais de sa propre initiative. Il ne devient ni un second mécanisme de validation, ni une seconde source de connaissance déclarative — ces responsabilités restent respectivement celles de Validation et de Registry.

### Interfaces

Plugin Loader reçoit une requête de chargement, en provenance d'une couche qui a besoin d'une extension. Il expose le résultat chargé, consommable par la couche appelante, quelle qu'elle soit.

### Interactions

Plugin Loader est consulté par toute couche ayant besoin d'une extension — Execution comme Application, selon la nature de ce qui est chargé. Dans le traitement de cette requête, il consulte Registry en lecture seule, pour connaître les extensions déclarées ; cette consultation reste un échange en lecture au sens de 2.3 et intervient uniquement dans le traitement d'une requête reçue ; elle ne constitue aucune action spontanée initiée par Plugin Loader vers une couche. Plugin Loader ne consulte jamais Document ni Mutation, et n'initie jamais lui-même une action vers une couche.

### Rattachement au Tome I

Plugin Loader met en œuvre le Principe 7 (« la plateforme s'étend sans reconstruire ce qui existe déjà »), en rendant utilisable ce que Registry se contente de déclarer, sans jamais toucher aux sous-systèmes déjà en place. Il met également en œuvre le Principe 10 (séparation des responsabilités), en maintenant une frontière stricte entre cataloguer (Registry) et charger (Plugin Loader).

Il se rattache au pilier Écosystème ouvert, dont il constitue, avec Registry, le mécanisme concret au niveau de la plateforme. Il se rattache également à la valeur Architecture durable : c'est parce que Plugin Loader reste strictement passif et cantonné à la lecture que l'extensibilité de MYBlab ne devient jamais une source de dépendance incontrôlée.

---
# 7. Correspondance avec le Tome I

Les chapitres 3 à 6 décrivent les responsabilités locales de chaque sous-système, et rattachent chacun aux valeurs, principes et piliers du Tome I qui le justifient. Le présent chapitre établit la traçabilité globale : il consolide ce qui est déjà affirmé dans les fiches, et complète, lorsque nécessaire, les correspondances que les fiches n'ont pas nommées explicitement — sans jamais modifier le texte déjà gelé des chapitres 3 à 6.

Chaque tableau qui suit distingue deux natures de correspondance : celles **déjà affirmées localement**, directement lisibles dans la section « Rattachement au Tome I » du sous-système concerné, et celles **consolidées ici pour la première fois**, marquées explicitement comme telles.

## 7.1 Valeurs → Architecture

Les huit valeurs du Chapitre III sont toutes affirmées localement, par au moins un sous-système.

| Valeur | Sous-systèmes qui la citent |
|---|---|
| Compréhension avant reproduction | Validation (3.3), Knowledge (5.2) |
| Simplicité sans simplification excessive | Presentation (5.1) |
| Fidélité scientifique | Validation (3.3), Simulation (4.1), Embedded Runtime (4.2) |
| Curiosité et expérimentation | Mutation (3.2), Learning (5.3) |
| La technologie s'efface derrière les idées | Presentation (5.1), Knowledge (5.2) |
| Progression continue | Learning (5.3) |
| Continuité de l'expérience utilisateur | Document (3.1), Mutation (3.2), Collaboration (5.4) |
| Architecture durable | Document (3.1), Registry (3.4), Project Synchronization (3.5), Storage (6.1), Plugin Loader (6.2) |

Aucune consolidation n'est nécessaire pour les valeurs : les huit sont déjà couvertes par le texte gelé des chapitres 3 à 6.

## 7.2 Principes → Sous-systèmes

Neuf des dix principes du Chapitre IV sont déjà affirmés localement.

| Principe | Sous-systèmes qui le citent | Statut |
|---|---|---|
| P1 — Données métier, seule source de vérité | Document (3.1), Validation (3.3), Project Synchronization (3.5), Collaboration (5.4), Storage (6.1) | Affirmé localement |
| P2 — Comportement explicable | Simulation (4.1), Knowledge (5.2) | Affirmé localement |
| P3 — Limites du modèle exposées | Validation (3.3), Simulation (4.1), Embedded Runtime (4.2) | Affirmé localement |
| P4 — Aucune action irréversible sans filet de sécurité | Mutation (3.2), Learning (5.3) | Affirmé localement |
| P5 — Représentation unique pour tout le parcours | Document (3.1) | Affirmé localement |
| P6 — Complexité révélée progressivement | Presentation (5.1), Learning (5.3) | Affirmé localement |
| P7 — Extension sans reconstruction | Registry (3.4), Embedded Runtime (4.2), Plugin Loader (6.2) | Affirmé localement |
| **P8 — Un comportement validé ne change plus silencieusement** | **Mutation (3.2), Validation (3.3)** | **Consolidé ici** |
| P9 — Retour clair et proportionné | Presentation (5.1) | Affirmé localement |
| P10 — Séparation des responsabilités | Registry (3.4), Project Synchronization (3.5), Collaboration (5.4), Storage (6.1), Plugin Loader (6.2) | Affirmé localement |

**P8 n'est cité littéralement dans le texte d'aucune fiche.** Sa correspondance est établie ici, pour la première fois, comme une garantie distribuée entre deux sous-systèmes plutôt qu'une responsabilité unique : Validation empêche qu'un comportement incohérent soit accepté comme valide ; Mutation garantit que toute évolution du Document passe par le canal de modification contrôlé et traçable. Ensemble, ces deux responsabilités empêchent qu'un comportement validé puisse varier silencieusement. Cette correspondance ne prétend pas que P8 est explicitement cité dans les fiches 3.2 ou 3.3.

## 7.3 Piliers → Sous-systèmes

Cinq des sept piliers du Chapitre V sont déjà cités localement. Deux sont consolidés ici.

| Pilier | Sous-système(s) | Statut |
|---|---|---|
| **Conception électronique** | — | **Consolidé ici : rattaché à Document (3.1)** |
| Simulation scientifique | Simulation (4.1) | Affirmé localement |
| Programmation et systèmes embarqués | Embedded Runtime (4.2) | Affirmé localement |
| **Apprentissage et accompagnement** | — | **Consolidé ici : rattaché à Learning (5.3)** |
| Intelligence et connaissance | Knowledge (5.2) | Affirmé localement |
| Écosystème ouvert | Registry (3.4), Plugin Loader (6.2) | Affirmé localement |
| Collaboration et partage | Project Synchronization (3.5), Collaboration (5.4) | Affirmé localement |

**Conception électronique** n'est cité dans le texte d'aucune fiche, alors que Document (3.1) en est l'incarnation naturelle : c'est le sous-système qui porte la représentation d'un circuit et de son état métier, le geste le plus élémentaire de conception. Cette correspondance est établie ici pour la première fois.

**Apprentissage et accompagnement** n'est cité nulle part non plus, alors que Learning (5.3) en est directement issu — la lacune est documentaire, pas architecturale : Learning a toujours été le sous-système dérivé de ce pilier, seul le mot n'a jamais été écrit dans sa fiche. La correspondance est établie ici, sans modifier 5.3.

## 7.4 Synthèse de traçabilité

Une fois les consolidations de ce chapitre prises en compte, la traçabilité entre le Tome I et le Tome II est complète : les huit valeurs, les dix principes et les sept piliers du Tome I sont tous rattachés à au moins un des treize sous-systèmes du Tome II — neuf principes et cinq piliers directement dans le texte des chapitres 3 à 6 ; un principe, distribué entre deux sous-systèmes, et deux piliers, consolidés dans le présent chapitre.

Cette distinction entre affirmation locale et consolidation globale n'est pas qu'une formalité : elle établit une règle de gouvernance pour la suite du Tome II — les chapitres 3 à 6 décrivent des responsabilités locales, rédigées et gelées une à une ; le chapitre 7 établit la traçabilité globale, et peut la compléter sans jamais rouvrir une fiche déjà gelée. Toute omission constatée dans une fiche existante reste une lacune documentaire à consolider ici, jamais une ambiguïté architecturale à résoudre en modifiant ce qui est déjà stabilisé.