# Spécification du contrat canonique du Registry — MB-CF2-001

**Nature de ce document :** proposition de livrable documentaire de Phase 1, produite hors dépôt, pour revue par le Chief Software Architect avant toute intégration éventuelle. Ce n'est ni un plan d'implémentation, ni un nouvel Execution Blueprint, ni un Ticket, ni un plan de migration, ni une refonte de `ComponentRegistry`. C'est une **spécification normative du contrat de données** du Registry.
**Aucun fichier du dépôt n'a été créé, modifié, commité ou poussé pour produire ce document. Aucun commit, aucun push, aucune Pull Request.**
**Rôle exercé :** Claude — Repository Analyst / rédacteur technique (cycle PMO MYBlab).
**Sources exclusives :** Ticket `MB-CF2-001` (`docs/pmo/tickets/MB-CF2-001.md`), Blueprint `MB-CF2-001-blueprint` (version révisée validée), ADR-012 (`docs/governance/ADR/ADR-012-definition-registry-canonique.md`), `docs/architecture/PLATFORM_ARCHITECTURE.md` (Tome II, §3.3, §3.4, §4.1, §5.1), et l'état réel du dépôt au commit `aa75a6d39d11255e7825bb3ee065af8bea7e66df` (HEAD de `origin/main`), consulté en lecture seule pour vérifier les faits déjà cités par ces sources.

**Hiérarchie des sources et des statuts (méthodologie, corrigée sur demande du Chief Software Architect).** Ce document distingue désormais quatre statuts, appliqués strictement :
- **FAIT ARCHITECTURAL** — explicitement imposé par Tome II, ADR-012, le Ticket ou le Blueprint (corpus de gouvernance désigné par le Ticket comme sources de cette Phase 1).
- **FAIT D'OBSERVATION** — comportement réellement observé dans le dépôt (`registry.js`, `core/ComponentRegistry.ts`, `componentDefinitions.js`, `PowerModel.js`, `ResistorModel.js`, `capabilities.js`, `resolution.js`, etc.). Un fait d'observation est vérifiable directement dans le code, mais ne constitue pas, à lui seul, une exigence pour le futur contrat canonique.
- **PROPOSITION** — extrapolation d'un comportement existant (souvent un FAIT D'OBSERVATION) vers le futur contrat canonique, lorsque cette extrapolation n'est pas elle-même imposée par une source de gouvernance.
- **QUESTION OUVERTE** / **DÉCISION DIFFÉRÉE / HORS PÉRIMÈTRE** — respectivement un point non tranché nécessitant arbitrage, et un sujet explicitement repoussé aux phases ultérieures par les sources elles-mêmes.

Un précédent technique observé dans `registry.js` ou `capabilities.js` (y compris leurs ADR internes documentés en commentaire, qui ne font pas partie du corpus de gouvernance Tome II/ADR-012) ne devient jamais automatiquement une exigence normative du futur Registry : il reste un FAIT D'OBSERVATION, et son élévation en règle du contrat canonique est, au mieux, une PROPOSITION.

---

## 1. Objet et portée

Ce document est le livrable attendu de la Phase 1 de `MB-CF2-001` : la définition du **contrat canonique** du Registry des composants de MYBlab — c'est-à-dire la forme exacte d'une déclaration de type de composant (champs, sémantique, obligations de cohérence), indépendamment de tout mécanisme d'implémentation.

Conformément au périmètre exclu du Ticket (§C) et de l'ADR-012 (§14, Phase 1), ce document **ne modifie, ne migre et ne supprime aucun artefact existant**, **ne propose aucun code**, et **ne tranche aucune forme d'implémentation concrète** (classe, module, singleton, mécanisme d'enregistrement, de cache ou de revalidation). Ces sujets restent hors périmètre (§12).

---

## 2. Fondements architecturaux

**Tome II §3.4 (Registry), « Ce qu'il porte »** `[FAIT ARCHITECTURAL — PLATFORM_ARCHITECTURE.md §3.4]` :
> « Registry porte la connaissance déclarative de ce qui est disponible dans MYBlab, sous deux dimensions distinctes mais portées par une seule responsabilité : la structure d'un type de composant : son identifiant, ses paramètres, ses bornes de connexion ; la disponibilité d'un modèle de simulation associé à ce type. »

**Tome II §3.4, « Ce qu'il ne porte pas »** `[FAIT ARCHITECTURAL]` :
> « Registry ne valide jamais une modification candidate [...]. Registry ne calcule et n'exécute aucun modèle de simulation [...]. Registry ne charge, n'active et ne gère le cycle de vie d'aucune extension [...]. Registry ne décide jamais de l'acceptation d'une modification. »

**ADR-012 §4, frontière non négociable** `[FAIT ARCHITECTURAL]` :
> « Registry = connaissance déclarative. Simulation = comportement et calcul. »

**Principes du Tome I engagés** `[FAIT ARCHITECTURAL — cités par ADR-012 §5]` : P1 (les données métier sont la seule source de vérité), P5 (une représentation unique porte tout le parcours utilisateur), P7 (la plateforme s'étend sans reconstruire ce qui existe déjà), P10/I6 (séparation stricte des responsabilités, une seule par sous-système), I1 (aucune dépendance vers le haut : Registry, Core, ne dépend jamais de Presentation ni d'Execution), I3 (toute interaction passe par l'interface exposée, jamais par l'état interne).

**Décision-cadre** `[FAIT ARCHITECTURAL — ADR-012 §7]` : aucun des trois artefacts existants (`registry.js`, `core/ComponentRegistry.ts`, `componentDefinitions.js`) n'est déclaré canonique par défaut. Le contrat ci-dessous est dérivé de Tome II §3.4 et des contraintes de l'ADR-012, pas recopié d'un artefact existant — chacun reste cependant une source d'évidence factuelle traitée en §10.

---

## 3. Principes normatifs

Le contrat canonique défini en §4 doit respecter, sans exception :

1. **Unicité de responsabilité** — Registry ne porte que la connaissance déclarative ; il n'exécute, ne calcule et ne décide jamais. `[FAIT ARCHITECTURAL — Tome II §3.4, ADR-012 §4]`
2. **Aucune dépendance montante** — Registry (Core) ne consulte jamais Presentation, Simulation ou Validation ; ce sont ces sous-systèmes qui le consultent. `[FAIT ARCHITECTURAL — Tome II §3.4 « Interactions » : « Registry ne consulte aucun autre sous-système du Core Layer ; il reste une source de connaissance déclarative, jamais un demandeur. », Invariant I1]`
3. **Séparation A/B** — la cohérence structurelle interne d'une définition Registry (A, §5) ne doit jamais être confondue avec l'évaluation d'une modification candidate du Document (B, §8). `[FAIT ARCHITECTURAL — ADR-012 §9]`
4. **Neutralité vis-à-vis de la forme d'implémentation** — le contrat décrit des champs et des obligations, jamais une classe, un module, un singleton ou une API concrète. `[FAIT ARCHITECTURAL — ADR-012 §17, Ticket §C périmètre exclu]`
5. **Aucun artefact existant n'est présumé canonique** — les trois artefacts actuels sont des sources d'évidence, pas des cibles à reproduire telles quelles. `[FAIT ARCHITECTURAL — ADR-012 §7]`

---

## 4. Contrat canonique d'une définition de composant

### 4.1 Identité

**Définition normative.** Chaque type de composant déclaré dans le Registry possède un **identifiant** (`type`), unique parmi l'ensemble des types déclarés. `[FAIT ARCHITECTURAL — Tome II §3.4 « son identifiant » ; ADR-012 §14, ligne « Type / identité du composant » → Registry]`

**Forme de l'identifiant.** `[PROPOSITION, supportée par un précédent réel]` : que cet identifiant prenne la forme d'une chaîne de caractères n'est pas explicitement imposé par Tome II ni par ADR-012 — c'est une extrapolation directement supportée par la convergence des trois artefacts existants, qui utilisent tous une chaîne (`model.type` dans `registry.js` et `core/ComponentRegistry.ts`, `id` dans `componentDefinitions.js`). Aucune source architecturale n'exclut explicitement une autre forme ; ce document ne tranche donc ce point qu'à titre de proposition motivée par le précédent unanime, pas comme une exigence architecturale.

**Règle d'unicité.** Un identifiant ne peut être associé qu'à une seule définition à la fois dans le Registry (voir §5, cohérence interne A). `[FAIT ARCHITECTURAL — ADR-012 §9, exemple « un type ne peut pas être enregistré deux fois »]`

**Contrainte non tranchée par les sources — sensibilité à la casse.** Les trois artefacts existants divergent factuellement sur ce point : `simulator/registry.js` ne normalise pas la casse de `model.type` `[FAIT D'OBSERVATION — registry.js, méthode register(), aucune normalisation observée]` ; `core/ComponentRegistry.ts` normalise systématiquement en majuscules avant toute comparaison (`type.trim().toUpperCase()`) et effectue la comparaison de manière insensible à la casse `[FAIT D'OBSERVATION — ComponentRegistry.ts, méthodes register/get/has, lignes 19, 83, 94]` ; `componentDefinitions.js` utilise par convention des identifiants déjà en majuscules (`LED`, `RESISTOR`, `POWER`, etc.) sans mécanisme de normalisation explicite, cette convention n'étant appliquée nulle part par du code `[FAIT D'OBSERVATION — componentDefinitions.js]`. Aucune source architecturale (Tome II, ADR-012) ne tranche si l'identité doit être comparée de façon sensible ou insensible à la casse. **Ce point est traité comme une composante de la question ouverte Q2 (§11)**, la sensibilité à la casse étant un cas particulier de la règle d'unicité (A).

**Ce qui n'est PAS défini ici** `[QUESTION OUVERTE — voir §11, Q2]` : le format exact autorisé pour un identifiant (jeu de caractères, longueur, convention de casse imposée). Aucune source ne l'exige ; ce document ne l'invente pas.

### 4.2 Pins logiques

**Définition normative.** Une définition de composant déclare un ensemble de **pins logiques**, chacun identifié par un `id` unique au sein de la définition, et porteur d'un **rôle électrique** déclaratif. `[FAIT ARCHITECTURAL — Tome II §3.4 « ses bornes de connexion » ; ADR-012 §14, ligne « Pins logiques » ; ADR-012 §12 « identifiant + rôle électrique »]`

**Séparation stricte avec la représentation graphique.** Le pin logique ne porte ni position d'affichage, ni coordonnées pixel, ni tout autre attribut de rendu — ces informations restent exclusivement en Presentation. `[FAIT ARCHITECTURAL — ADR-012 §12 : « Reste en Presentation : [...] coordonnées graphiques des pins (dx/dy en pixels) [...] Devient responsabilité de Registry : [...] pins logiques (identifiant + rôle électrique) »]`

**Clé de jointure — niveau type.** L'identifiant de type sert de clé de jointure entre la structure logique portée par Registry et les métadonnées de rendu conservées par Presentation. `[FAIT ARCHITECTURAL — ADR-012 §12 : « Presentation consulte Registry pour la structure logique (existence du type, identifiants de pins) [...] et conserve, pour le même identifiant de type, ses propres métadonnées de rendu — une double lecture jointe par type, jamais une redéclaration indépendante. »]`

**Clé de jointure — niveau pin.** `[PROPOSITION, corollaire nécessaire non littéralement énoncé]` : ADR-012 §12 mentionne que Presentation consulte les « identifiants de pins » de Registry, mais ne dit pas explicitement, mot pour mot, que l'identifiant de pin (`id`) sert lui-même de clé de jointure entre le pin logique et ses coordonnées graphiques (`dx`/`dy`) propres à Presentation. Ce document le propose comme corollaire nécessaire — sans cette jointure au niveau du pin, associer une coordonnée graphique à la bonne borne logique serait impossible — mais le signale explicitement comme une extrapolation, pas comme une citation directe.

**Rôle électrique — nature déclarative.** `[PROPOSITION, par analogie avec une convention déjà établie ailleurs dans le contrat]` : le rôle d'un pin est proposé comme une chaîne sémantique ouverte, sur le modèle déjà retenu pour `parameterType` (ADR interne #1 de `registry.js` : « Le framework n'interprète jamais la sémantique d'un parameterType inconnu ») et pour `capabilities` (ADR interne #3 de `capabilities.js` : chaînes ouvertes). Aucune source de niveau Tome II ou ADR-012 ne tranche explicitement ce point pour les pins ; il s'agit d'une extension par analogie, pas d'un fait établi.

**Évidence factuelle disponible.** `componentDefinitions.js` porte déjà, pour chaque pin, un champ `role` (ex. `"input"`, `"passive"`, `"gpio"`, `"ground"`, `"power"`, `"switch"`, `"sensor"`, `"output"`) mêlé aux coordonnées `dx`/`dy` `[FAIT D'OBSERVATION — componentDefinitions.js, ex. LED : { id: "anode", label: "Anode", dx: 0, dy: 20, role: "input" }]`. Cette évidence appuie directement la scission prescrite par ADR-012 §12 : la donnée logique (`id`, `role`) et la donnée graphique (`dx`, `dy`) coexistent déjà dans le même objet, sans en être architecturalement séparées.

### 4.3 Paramètres

**Définition normative.** Une définition de composant déclare un **schéma de paramètres** — une liste de descripteurs, chacun définissant un paramètre électrique éditable. `[FAIT ARCHITECTURAL — ADR-012 §14, ligne « Paramètres électriques (schéma + valeurs par défaut) » → Registry]`

**Avertissement méthodologique.** Le contrat ci-dessous ne recopie pas automatiquement la forme exacte de `registry.js` comme contrat canonique complet. Chaque champ est classifié individuellement selon son degré de fondement dans les sources, conformément à la règle de traçabilité de ce document.

**Classification champ par champ :**

| Champ proposé | Statut | Fondement | Justification |
|---|---|---|---|
| Un identifiant de paramètre (`key`/`id`), unique au sein du type | PROPOSITION | Nécessité logique, non un précédent ni une source | Nécessaire pour désigner un paramètre individuellement (un schéma sans identifiant par entrée ne serait pas consultable), mais aucune source (Tome II, ADR-012) n'impose littéralement ce champ ni son nom. |
| Un type sémantique de paramètre (`parameterType`), chaîne ouverte non interprétée par le framework | PROPOSITION | FAIT D'OBSERVATION à l'origine (ADR interne à `registry.js`) | `[FAIT D'OBSERVATION — registry.js, « ADR #1 : Le framework n'interprète jamais la sémantique d'un parameterType inconnu »]` : ce principe est réellement documenté dans le dépôt, mais dans un ADR interne au fichier, hors corpus de gouvernance désigné par le Ticket (Tome II / ADR-012 ne le mentionnent pas). Son adoption pour le contrat canonique reste donc une PROPOSITION, pas un FAIT ARCHITECTURAL. |
| Des bornes numériques (`minimum` / `maximum`) | FAIT ARCHITECTURAL | ADR-012 §9 | ADR-012 §9 mentionne explicitement, comme exemple de cohérence structurelle, des « bornes min/max cohérentes » pour le `parameterSchema`. |
| Une valeur par défaut (`defaultValue`), présente si le paramètre est requis | FAIT ARCHITECTURAL | ADR-012 §9 | ADR-012 §9 mentionne explicitement « valeur par défaut présente si le paramètre est requis » comme propriété du `parameterSchema`. |
| Une unité déclarative (`unit`) | PROPOSITION | FAIT D'OBSERVATION à l'origine (précédent réel uniquement) | `[FAIT D'OBSERVATION — PowerModel.js (unit: 'V'), ResistorModel.js (unit: 'Ω')]`. Aucune mention dans Tome II ni ADR-012 ; l'élévation en champ du contrat canonique reste une PROPOSITION. |
| Une description textuelle (`description`) | PROPOSITION | FAIT D'OBSERVATION à l'origine (précédent réel uniquement) | `[FAIT D'OBSERVATION — PowerModel.js, ResistorModel.js]`. Non mentionnée par les sources architecturales ; son adoption reste une PROPOSITION. |

**Structure du schéma — mise en garde explicite.** `registry.js` sépare aujourd'hui `parameterSchema` (liste de descripteurs, chacun portant déjà son propre `defaultValue`) d'un second champ de haut niveau, `defaultParameters` (une carte `{clé: valeur}` qui **duplique** la même information sous une autre forme — ex. `PowerModel.defaultParameters = { voltage: 5 }` alors que `PowerModel.parameterSchema[0].defaultValue` vaut déjà `5`). `[FAIT D'OBSERVATION — PowerModel.js, ResistorModel.js, lignes 31-54]` **Cette spécification ne reprend pas cette duplication comme exigence du contrat canonique** : rien dans Tome II ou ADR-012 n'impose une structure `defaultParameters` distincte du `defaultValue` déjà porté par chaque descripteur de paramètre. La coexistence des deux dans `registry.js` est traitée ici comme un fait d'implémentation observé (§10.1), pas comme une propriété que le contrat canonique doit reproduire. `[QUESTION OUVERTE]` Si une structure de convenance équivalente à `defaultParameters` doit malgré tout faire partie du contrat canonique (par exemple pour un accès direct aux valeurs par défaut sans reparcourir le schéma), aucune source ne le tranche ; ce document ne l'invente pas et laisse ce point à un arbitrage ultérieur s'il s'avère nécessaire.

**Distinction schéma / valeur d'instance.** Le schéma déclaré par Registry définit la forme et les bornes valides d'un paramètre pour un **type** de composant ; il ne contient jamais la valeur effective portée par une **instance** de ce composant dans un Document donné. La valeur effective appartient au Document ; la question de savoir si cette valeur respecte les bornes déclarées relève de Validation (B), jamais de Registry. `[FAIT ARCHITECTURAL — ADR-012 §9 : « Registry ne valide jamais une modification candidate » ; Tome II §3.4]`

### 4.4 Capabilities

**Définition normative.** Une définition de composant déclare un ensemble de **capabilities** — des chaînes sémantiques ouvertes signalant les dimensions d'analyse qu'un type supporte potentiellement, non interprétées par le framework. `[FAIT ARCHITECTURAL — ADR-012 §8 : « Déclarer les capabilities d'un type (cf. simulator/capabilities.js, déjà conforme à cet usage : chaînes ouvertes, non interprétées par le framework). » ; ADR-012 §14]` C'est bien ADR-012 elle-même, et non `capabilities.js`, qui impose cette propriété d'ouverture — `capabilities.js` n'est cité par l'ADR que comme exemple de conformité déjà atteint dans le dépôt.

**Exemples (illustratifs, liste non fermée).** `[FAIT D'OBSERVATION — simulator/capabilities.js, STANDARD_CAPABILITIES]` : `digital`, `dc`, `ac`, `timing`, `thermal`, `mechanical`, `optical` sont les capacités actuellement documentées comme convention dans le dépôt. Il ne s'agit que d'exemples observés, pas d'une énumération que le contrat canonique devrait clore — `capabilities.js` lui-même précise qu'un composant peut déclarer une capacité non listée, sans modifier ce fichier.

**Nature déclarative et rôle dans le contrat.** Une capability est un marqueur consulté par les sous-systèmes qui en ont besoin (notamment Simulation) ; Registry ne l'interprète jamais lui-même — il se contente de l'exposer. `[FAIT ARCHITECTURAL — ADR-012 §8, même citation que ci-dessus : « non interprétées par le framework »]`, corroboré par `[FAIT D'OBSERVATION — capabilities.js, isValidCapability() valide uniquement le format d'une capability (chaîne non vide), jamais sa sémantique]`.

**Limites.** Une capability ne porte jamais de logique ou de comportement — elle ne doit jamais devenir un point d'extension caché permettant à Registry d'exécuter ou de conditionner un calcul. Toute tentation d'attacher un comportement conditionnel à une capability violerait le principe normatif 1 (§3). `[PROPOSITION — dérivée directement de Tome II §3.4 et ADR-012 §4]`

### 4.5 Disponibilité du modèle de simulation

**Définition normative.** Registry expose, pour un type donné, la **disponibilité déclarative** d'un modèle de simulation associé — c'est-à-dire le fait que la plateforme reconnaît, pour ce type, l'existence d'une capacité de calcul externe à Registry, sans jamais porter ce calcul lui-même. `[FAIT ARCHITECTURAL — Tome II §3.4 : « la disponibilité d'un modèle de simulation associé à ce type [...] Ces deux dimensions ne font qu'exposer ce qui est déclaré comme existant — Registry ne produit ni n'exécute lui-même aucun de ces modèles. »]`

**Ce que « disponible » signifie ici.** Un fait déclaratif consultable (existence ou non d'un modèle associé au type, et le cas échéant les `capabilities` couvertes par ce modèle, §4.4) — jamais une référence exécutable, un pointeur de fonction ou un mécanisme d'invocation. `[PROPOSITION — dérivée de Tome II §3.4 et de la frontière ADR-012 §4]`

**Ce que cette section ne définit pas.** La manière technique dont Simulation obtient et exécute le modèle réel associé à un type reste hors périmètre de cette spécification — c'est une décision de forme d'implémentation, explicitement différée (§11, Q3 ; §12). `[FAIT ARCHITECTURAL — ADR-012 §17, Ticket §C]`

**Évidence factuelle du découplage actuel.** `simulator/resolution.js` importe aujourd'hui directement `PowerModel` et `ResistorModel`, avec la contrainte documentée « aucun accès à ComponentRegistry, A4 » `[FAIT D'OBSERVATION — resolution.js, lignes 88-90]`. Cette spécification ne change pas cet état de fait ; elle définit seulement ce que Registry devrait exposer si et quand ce découplage est levé — question de calendrier hors périmètre (§11, Q4 ; §12).

---

## 5. Règles de cohérence interne — A

**Obligation architecturale (formulation retenue).** *« Une définition Registry doit être structurellement cohérente avant d'être considérée comme une définition valide du catalogue. »* Cette obligation est énoncée comme une **propriété du contrat**, indépendamment de tout mécanisme technique de vérification. `[PROPOSITION, fondée sur FAIT — ADR-012 §9]`

**Propriétés couvertes** `[FAIT ARCHITECTURAL — ADR-012 §9, exemples explicitement cités]`, chacune également observable dans le précédent concret de `core/ComponentRegistry.ts` `[FAIT D'OBSERVATION, corroboration — voir §5 ci-dessous]` :
- un type ne peut pas être déclaré deux fois dans le Registry (unicité de type, §4.1) ;
- un pin ne peut pas avoir un identifiant dupliqué au sein d'une même définition (unicité de pin, §4.2) ;
- un identifiant de pin ne peut pas être vide ;
- le schéma de paramètres doit être structurellement bien formé : bornes `minimum`/`maximum` cohérentes entre elles, valeur par défaut présente lorsque le paramètre est requis, valeur par défaut comprise dans les bornes déclarées lorsque celles-ci existent.

**Précédent factuel disponible (à titre d'évidence, non de mécanisme retenu).** `core/ComponentRegistry.ts` implémente aujourd'hui une méthode privée `validateModel()`, appelée uniquement à l'enregistrement, qui vérifie exactement ce sous-ensemble de propriétés : présence d'au moins un pin, absence d'identifiant de pin dupliqué, présence d'un identifiant de paramètre, présence d'une valeur par défaut pour tout paramètre requis, cohérence de la valeur par défaut avec les bornes déclarées. `[FAIT D'OBSERVATION — core/ComponentRegistry.ts, lignes 277-316]` Cette classe sépare d'ailleurs déjà, au niveau du code, cette vérification structurelle (`validateModel`, appelée au `register()`) d'une méthode distincte `validate(type, params)` qui évalue un jeu de paramètres candidat contre le schéma déclaré — plus proche, par sa nature, de la responsabilité B (§8) que de la cohérence interne A. `[FAIT D'OBSERVATION — core/ComponentRegistry.ts, lignes 129-192]` Cette observation est citée comme **évidence** que la distinction A/B est réalisable en pratique — elle ne constitue ni une validation de ce mécanisme précis, ni une décision de le retenir (§11, Q1).

**Ce qui reste hors périmètre de cette section** `[FAIT ARCHITECTURAL — ADR-012 §17, §9 ; Ticket §C]` : le moment exact où cette vérification doit avoir lieu (à l'enregistrement seul, à la consultation seule, ou aux deux), la forme technique du mécanisme de vérification, et l'exhaustivité définitive de la liste de propriétés ci-dessus — voir §11, Q2.

---

## 6. Frontière Registry / Simulation

**Principe.** `[FAIT ARCHITECTURAL — Tome II §4.1 « Ce qu'il ne porte pas » : « Elle ne définit pas elle-même les types de composants ou les modèles qu'elle emploie ; cette connaissance lui est fournie par Registry. »]` et `[FAIT ARCHITECTURAL — Tome II §4.1 « Interactions » : « Elle consulte Registry pour obtenir les modèles de simulation associés aux types de composants concernés. »]`

Simulation porte exclusivement le calcul et le comportement (Tome II §4.1 : « le calcul du comportement d'un système décrit par le Document »). Registry ne calcule, n'exécute et ne conditionne jamais ce calcul — il expose uniquement ce que Simulation consulte (§4.5). Registry ne consulte jamais Simulation en retour (principe normatif 2, §3).

**État actuel du dépôt (fait, non modifié par cette spécification).** `simulator/models/PowerModel.js` et `simulator/models/ResistorModel.js` sont typés selon le contrat de `registry.js` (`@type {import('../registry.js').ComponentModel}`) mais ne sont jamais enregistrés via `.register()` en production ; `simulator/resolution.js` les importe directement, avec la contrainte documentée interdisant tout accès à `ComponentRegistry` (« A4 »). `[FAIT D'OBSERVATION — resolution.js, lignes 1-3, 88-90]` Cette spécification ne prescrit aucun changement à ce chemin actuel — la bascule éventuelle vers une consultation du Registry canonique est une question de calendrier de migration, hors périmètre de MB-CF2-001 (§11, Q4 ; §12).

---

## 7. Frontière Registry / Presentation

**Principe.** `[FAIT ARCHITECTURAL — ADR-012 §12]` Presentation conserve exclusivement les métadonnées de rendu : icône, dimensions (`width`/`height`), coordonnées graphiques des pins (`dx`/`dy`), tout autre attribut de rendu. Registry porte l'identité, les pins logiques, les paramètres, les capabilities et la disponibilité du modèle de simulation.

**Jointure — niveau type.** `[FAIT ARCHITECTURAL — ADR-012 §12]` L'identifiant de type sert de clé de jointure entre les deux sous-systèmes, sans redéclaration croisée (voir citation exacte en §4.2).

**Jointure — niveau pin.** `[PROPOSITION — voir §4.2]` Presentation consulte Registry pour la structure logique du type, notamment ses identifiants de pins. La présente spécification propose que l'identifiant de pin serve également de clé de jointure avec les métadonnées graphiques correspondantes (`dx`/`dy`), mais cette jointure au niveau du pin reste une PROPOSITION et non une exigence architecturale explicitement imposée par ADR-012 §12, qui ne l'énonce pas littéralement.

**Observation documentaire (non bloquante).** `[FAIT ARCHITECTURAL — texte de PLATFORM_ARCHITECTURE.md]` Le texte actuel de Tome II §5.1 (« Interactions » de Presentation) énumère explicitement Document, Simulation, Knowledge et Learning comme sous-systèmes consultés par Presentation, mais ne mentionne pas Registry. `[ANALYSE]` Ceci constitue un écart rédactionnel entre Tome II §5.1 et ADR-012 §12, ce dernier étant la source explicitement désignée par le Ticket pour cette Phase 1 et faisant autorité sur la frontière Registry/Presentation. Cet écart ne bloque pas la présente spécification — il est signalé pour une éventuelle harmonisation ultérieure de Tome II, hors périmètre de MB-CF2-001.

**Aucune dépendance montante.** Registry (Core) ne dépend jamais de Presentation (Application Layer) ; c'est Presentation qui consulte Registry, jamais l'inverse. `[FAIT ARCHITECTURAL — Invariant I1]`

---

## 8. Frontière Registry / Validation

**Principe, avec une précision apportée par Tome II §3.3** `[FAIT ARCHITECTURAL]` : Validation « porte l'évaluation de la cohérence d'une modification candidate, avant son application au Document. Elle produit un résultat de validation que **Mutation** peut exploiter pour décider d'appliquer ou de rejeter la modification. » Validation elle-même « ne décide pas de l'application ou du rejet d'une modification — cette décision appartient exclusivement à Mutation ». `[FAIT ARCHITECTURAL — Tome II §3.3]`

Cette précision affine la distinction A/B posée par ADR-012 §9 : ce n'est pas seulement que Registry ne décide jamais de l'acceptation d'une modification candidate (B) — **Validation elle-même ne le décide pas non plus** ; elle évalue, et c'est Mutation qui décide. Registry se situe encore en amont de cette chaîne : il ne fait que fournir à Validation la connaissance déclarative nécessaire pour évaluer.

**Rôle de Registry vis-à-vis de Validation** `[FAIT ARCHITECTURAL — Tome II §3.3 « Interactions » : « Elle consulte Registry pour vérifier qu'un composant concerné correspond à un type effectivement déclaré. » et « Ce qu'il ne porte pas » : « Validation ne définit pas elle-même les types de composants qu'elle évalue — cette connaissance lui est fournie par Registry. »]` : Registry expose en lecture seule l'existence d'un type et son schéma déclaré (paramètres, bornes) ; Validation consulte cette connaissance pour évaluer une modification candidate. Registry ne participe à aucun moment à l'évaluation ni à la décision.

**Non-fusion A/B, réaffirmée.** La vérification de cohérence interne d'une définition Registry (A, §5) porte sur la déclaration elle-même, avant toute instanciation dans un Document. L'évaluation d'une modification candidate (B) porte sur une instance dans un Document donné et relève exclusivement de Validation. `[FAIT ARCHITECTURAL — ADR-012 §9]`

---

## 9. Matrice des responsabilités

| Information | Responsabilité | Justification architecturale | Consulté en lecture par |
|---|---|---|---|
| Identité / type du composant | **Registry** | Tome II §3.4 « son identifiant » | Simulation, Presentation, Validation, Plugin Loader |
| Pins logiques (id + rôle électrique) | **Registry** | Tome II §3.4 « ses bornes de connexion » ; ADR-012 §12 | Simulation, Presentation, Validation |
| Schéma de paramètres + valeurs par défaut | **Registry** | ADR-012 §14 ; précédent PowerModel/ResistorModel | Simulation, Validation |
| Capabilities | **Registry** | ADR-012 §8 (FAIT ARCHITECTURAL ; `capabilities.js` cité par l'ADR elle-même comme exemple de conformité) | Simulation, Plugin Loader |
| Disponibilité d'un modèle de simulation | **Registry** (déclare) | Tome II §3.4, 2ᵉ dimension | Simulation |
| Cohérence structurelle interne (A) | **Registry** | ADR-012 §9, §8 dernier point | — (propriété du Registry lui-même) |
| Calcul / comportement électrique | **Simulation** (jamais Registry) | Tome II §3.4 « ne calcule et n'exécute aucun modèle » ; §4.1 | Presentation, Knowledge |
| Évaluation d'une modification candidate (B) | **Validation** (jamais Registry) | Tome II §3.3, §3.4 « ne valide jamais une modification candidate » | Mutation |
| Décision d'accepter/rejeter une modification | **Mutation** (jamais Validation, jamais Registry) | Tome II §3.3 | — |
| Icône, dimensions, coordonnées graphiques des pins | **Presentation** | ADR-012 §12 | — |
| Chargement / cycle de vie des extensions | **Plugin Loader** (consulte Registry en lecture seule) | Tome II §3.4 | — |

---

## 10. Traitement des contrats existants

*Cette section reste descriptive. Elle ne déclenche, ne recommande ni ne présuppose aucune migration.*

### 10.1 `simulator/registry.js`

`[FAIT D'OBSERVATION — registry.js]` Classe `ComponentRegistry`, annuaire simple (`Map<string, model>`). API : `register(model)`, `getModel(type)`, `getAllModels()`. Contrat JSDoc du modèle attendu : `{ type, defaultParameters, parameterSchema, capabilities, validate }`. `register()` refuse un modèle sans `type` valide, sans `parameterSchema`/`capabilities` de type tableau, sans `validate` de type fonction, et refuse tout type déjà enregistré. Ce contrat est celui auquel `PowerModel.js` et `ResistorModel.js` sont explicitement typés — les modèles réellement utilisés par le calcul de production — mais ni l'un ni l'autre n'est effectivement enregistré via cette classe dans le code de production actuel.

Ce contrat n'est pas déclaré canonique par cette spécification ; il constitue l'évidence la plus directement alignée avec les données réelles de production pour §4.3.

### 10.2 `simulator/core/ComponentRegistry.ts` / MB-SIM-001-B2

`[FAIT D'OBSERVATION — core/ComponentRegistry.ts]` Classe distincte, API plus riche : `register(type, model)`, `registerAll`, `get`, `has`, `list`, `listAll`, `validate`, `validateAll`, `validateAllRegistered`, `onRegister`/`offRegister`, `clear`, `size`. Recherche insensible à la casse (normalisation `toUpperCase()`), copie défensive en lecture (`deepCopy`), 56 tests couvrant ces comportements. Le contrat de données attendu (déduit des fixtures) diffère structurellement de celui de `registry.js` : `pins: [{id, label, position:{x,y}}]`, `params: [{id, label, type, min, max, default, required}]`, types codés en lettres uniques façon SPICE (`'R'`, `'C'`, `'L'`, `'V'`, `'I'`, `'D'`). Cette classe n'est consommée en production par aucun autre module que ses propres tests et fixtures.

`validateModel()` (interne, appelée au `register()`) constitue une évidence concrète de vérification de type A (§5). `validate()`/`validateAll()` (appelées explicitement avec des paramètres candidats) sont structurellement plus proches d'une vérification de type B (§8).

`[QUESTION OUVERTE — voir §11, Q1]` L'intention d'origine de ce chantier (notamment le choix de types à lettre unique façon SPICE) n'est pas documentée dans l'historique retrouvé du dépôt. Cette spécification ne présume ni que cette intention justifierait un traitement distinct, ni que son écart au contrat canonique constitue une erreur.

### 10.3 `config/componentDefinitions.js`

`[FAIT D'OBSERVATION — componentDefinitions.js]` Objet statique `COMPONENT_TYPES`, 16 types de composants. Chaque entrée porte `{ id, label, icon, width, height, pins: [{id, label, dx, dy, role}] }`. C'est aujourd'hui le seul artefact consommé à la fois par Presentation et par la préparation de simulation (`simulator/preparation.js`, via `getComponentDef`). Le champ `role` déjà présent sur chaque pin, mêlé aux coordonnées `dx`/`dy`, constitue l'évidence factuelle directe de la scission logique/graphique prescrite par ADR-012 §12 (§4.2 ci-dessus).

`[FAIT ARCHITECTURAL — ADR-012 §16]` Le sort de ce fichier est déjà arrêté par l'ADR : réduit à son périmètre Presentation (icône, dimensions, coordonnées), non supprimé. Cette réduction relève d'une phase de migration ultérieure (Phase 3/4), non de cette spécification.

---

## 11. Questions ouvertes et décisions différées

### Q1 — MB-SIM-001-B2 `[QUESTION OUVERTE]`

**Constat.** L'origine des types SPICE à lettre unique de `core/ComponentRegistry.ts` (§10.2) reste inexpliquée ; aucun historique de décision n'a été retrouvé dans le dépôt.

**Traitement retenu par cette spécification.** Le contrat canonique défini en §4 est spécifié sans reconstituer cette histoire. B2 n'est ni présumé porteur d'une intention non capturée, ni transformé en écart erroné. `core/ComponentRegistry.ts` est cité en §10.2 comme évidence d'implémentation (recherche insensible à la casse, copie défensive, séparation A/B déjà amorcée au niveau du code), sans que son contrat de données soit adopté.

**Ne bloque pas cette spécification.** Cette incertitude ne modifie aucun champ du contrat défini en §4 ; elle conditionne uniquement le traitement ultérieur de l'artefact lui-même (ADR-012 §16).

**Arbitrage demandé** : Chief Software Architect, sans urgence de Phase 1.

### Q2 — Cohérence interne A `[QUESTION OUVERTE]`

**Constat.** ADR-012 §9 cite des exemples de cohérence structurelle interne (§5) sans affirmer que cette liste est exhaustive, et sans trancher le moment de vérification (enregistrement, consultation, ou les deux).

**Sous-point découvert pendant la rédaction (§4.1)** : la sensibilité à la casse de l'identifiant de type diverge factuellement entre les trois artefacts existants, sans qu'aucune source architecturale ne tranche laquelle des deux conventions (sensible ou insensible à la casse) doit s'appliquer au contrat canonique.

**Traitement retenu par cette spécification.** L'obligation architecturale (« une définition Registry doit être structurellement cohérente ») est énoncée en §5 comme propriété du contrat, sans décider du mécanisme technique de vérification.

**Ne bloque pas cette spécification.** Les propriétés listées en §5 suffisent à documenter la spécification de Phase 1 ; seule leur exhaustivité définitive, et le traitement de la casse, restent à confirmer.

**Arbitrage demandé** : Chief Software Architect — confirmation de la liste de propriétés (§5) et de la convention de casse à retenir pour l'identité (§4.1).

### Rappel — décisions différées (traitées en §12, non ré-ouvertes ici)

Q3 (forme d'implémentation du Registry canonique) et Q4 (calendrier de retrait des anciens chemins de consommation) sont des décisions différées / hors périmètre de MB-CF2-001, déjà établies comme telles par ADR-012 §17 et par le Ticket §C. Le fait qu'elles soient différées signifie qu'elles n'ont pas à être arbitrées pour MB-CF2-001 — pas que leur réponse finale est arrêtée. Elles ne sont pas traitées comme questions ouvertes de cette spécification.

---

## 12. Hors périmètre

Conformément au Ticket §C et à ADR-012 §14/§17, sont explicitement exclus de cette spécification :
- toute implémentation de code ;
- toute migration des artefacts existants ;
- toute suppression d'artefact existant ;
- le développement de tout composant analogique nouveau ;
- toute évolution du moteur de simulation ;
- l'intégration de Presentation au contrat canonique ;
- l'implémentation de Validation ;
- la décision de forme d'implémentation concrète du Registry (classe, module, singleton, fonctions pures, emplacement de fichier) ;
- le mécanisme concret d'enregistrement, de cache ou de revalidation ;
- le calendrier de retrait des chemins de consommation directs actuels (`resolution.js`, etc.) ;
- toute stratégie de migration détaillée (au-delà du principe déjà posé par ADR-012 §14).

---

## 13. Critères de conformité de la spécification

Cette spécification est considérée conforme si, et seulement si :
- aucune dimension déclarative essentielle (identité, pins, paramètres, capabilities, disponibilité de modèle) n'est laissée sans définition de responsabilité ; les propriétés encore non tranchées (ex. sensibilité à la casse de l'identité, exhaustivité des propriétés de cohérence interne A) sont explicitement identifiées comme questions ouvertes et ne sont jamais présentées comme des décisions acquises (§4, §11) ;
- Registry ne reçoit, en aucun point du texte, une responsabilité de calcul ou d'exécution (§6) ;
- Registry ne reçoit, en aucun point du texte, la décision d'accepter ou de refuser une modification candidate (§8) ;
- aucune métadonnée purement graphique n'est attribuée à Registry (§7) ;
- aucune forme d'implémentation n'est imposée, explicitement ou par le vocabulaire employé (§4.5, §5, §11 Q3) ;
- aucune migration n'est proposée (§10, §12) ;
- aucune suppression n'est proposée (§10.3, §12) ;
- aucune décision non prouvée par les sources n'est présentée comme acquise, et aucun FAIT D'OBSERVATION n'est présenté comme un FAIT ARCHITECTURAL (voir tableau de traçabilité, §14) ;
- Q1 et Q2 ne sont arbitrairement résolues nulle part dans le texte (§11) ;
- le document est compréhensible sans dépendre d'une conversation antérieure non retranscrite ici.

---

## 14. Traçabilité des décisions

Catégories utilisées exclusivement : **FAIT ARCHITECTURAL** · **FAIT D'OBSERVATION** · **PROPOSITION** · **QUESTION OUVERTE** · **DÉCISION DIFFÉRÉE / HORS PÉRIMÈTRE**.

| # | Décision / règle | Source | Statut | Section |
|---|---|---|---|---|
| 1 | Registry porte la connaissance déclarative (structure + disponibilité de modèle) | Tome II §3.4 | FAIT | §2 |
| 2 | Registry ne valide, ne calcule, n'exécute et ne charge jamais | Tome II §3.4 | FAIT | §2 |
| 3 | Frontière Registry = déclaratif / Simulation = comportement | ADR-012 §4 | FAIT | §2 |
| 4 | Principes engagés P1, P5, P7, P10/I6, I1, I3 | ADR-012 §5 | FAIT | §2 |
| 5 | Aucun artefact existant canonique par défaut | ADR-012 §7 | FAIT | §2, §10 |
| 6 | Séparation A/B non négociable | ADR-012 §9 | FAIT | §3 |
| 7 | Neutralité vis-à-vis de la forme d'implémentation | ADR-012 §17, Ticket §C | FAIT | §3 |
| 8 | Identité = identifiant unique par type | Tome II §3.4, ADR-012 §14 | FAIT | §4.1 |
| 9 | Forme de l'identifiant = chaîne de caractères | Précédent (3 artefacts convergents) | PROPOSITION | §4.1 |
| 10 | Sensibilité à la casse de l'identité | — (3 artefacts divergent factuellement) | QUESTION OUVERTE (Q2) | §4.1, §11 |
| 11 | Format exact autorisé pour un identifiant (charset, longueur) | — | QUESTION OUVERTE (Q2) | §4.1 |
| 12 | Pins logiques = identifiant + rôle électrique | ADR-012 §14, §12 | FAIT | §4.2 |
| 13 | Séparation stricte pin logique / position graphique | ADR-012 §12 | FAIT | §4.2 |
| 14 | Jointure Registry/Presentation par identifiant de type | ADR-012 §12 (citation directe) | FAIT | §4.2 |
| 15 | Jointure Registry/Presentation par identifiant de pin | Corollaire nécessaire, non cité littéralement | PROPOSITION | §4.2 |
| 16 | Rôle de pin = chaîne sémantique ouverte | Analogie avec ADR internes #1 (registry.js) / #3 (capabilities.js) | PROPOSITION | §4.2 |
| 17 | Schéma de paramètres = liste de descripteurs | ADR-012 §14 | FAIT | §4.3 |
| 18 | Champ identifiant de paramètre (`key`/`id`) | Nécessité logique de désignation | PROPOSITION | §4.3 |
| 19 | Champ `parameterType`, chaîne ouverte non interprétée | FAIT D'OBSERVATION à l'origine (ADR interne #1 de `registry.js`, hors corpus Tome II/ADR-012) ; adoption pour le contrat = extrapolation | PROPOSITION | §4.3 |
| 20 | Bornes `minimum`/`maximum` | ADR-012 §9 (« bornes min/max cohérentes ») | FAIT | §4.3 |
| 21 | `defaultValue` présent si le paramètre est requis | ADR-012 §9 | FAIT | §4.3 |
| 22 | Champ `unit` | FAIT D'OBSERVATION (`PowerModel.js`, `ResistorModel.js`) ; aucune source de gouvernance | PROPOSITION | §4.3 |
| 23 | Champ `description` | FAIT D'OBSERVATION (`PowerModel.js`, `ResistorModel.js`) ; aucune source de gouvernance | PROPOSITION | §4.3 |
| 24 | Structure `defaultParameters` séparée du `defaultValue` du schéma | Duplication observée dans `registry.js`/`PowerModel.js`, non prescrite par une source architecturale | QUESTION OUVERTE | §4.3 |
| 25 | Distinction schéma (niveau type) / valeur d'instance (niveau Document) | ADR-012 §9, Tome II §3.4 | FAIT | §4.3 |
| 26 | Capabilities = chaînes sémantiques ouvertes, non interprétées | ADR-012 §8 (FAIT ARCHITECTURAL, cite `capabilities.js` comme exemple) ; ADR-012 §14 | FAIT | §4.4 |
| 27 | Capabilities non interprétées par Registry (corroboration code) | ADR-012 §8 (même FAIT ARCHITECTURAL que ligne 26) ; corroboré par `capabilities.js`, `isValidCapability()` (FAIT D'OBSERVATION) | FAIT | §4.4 |
| 28 | Capabilities ne portent jamais de comportement | Dérivée de Tome II §3.4 / ADR-012 §4 | PROPOSITION | §4.4 |
| 29 | Disponibilité de modèle = fait déclaratif consultable | Tome II §3.4 | FAIT | §4.5 |
| 30 | « Disponible » = fait/booléen, jamais référence exécutable | Dérivée de Tome II §3.4, ADR-012 §4 | PROPOSITION | §4.5 |
| 31 | Mécanisme d'obtention/exécution du modèle par Simulation | ADR-012 §17, Ticket §C | DÉCISION DIFFÉRÉE / HORS PÉRIMÈTRE (Q3) | §4.5, §11, §12 |
| 32 | Obligation générale de cohérence structurelle interne, formulée comme propriété du contrat | ADR-012 §9 (FAIT ARCHITECTURAL sous-jacent) ; la formulation exacte retenue est une extrapolation rédactionnelle | PROPOSITION | §5 |
| 33 | Liste des propriétés A (unicité type/pin, schéma bien formé) | ADR-012 §9 (FAIT ARCHITECTURAL) ; corroborée par `core/ComponentRegistry.ts` (FAIT D'OBSERVATION) | FAIT | §5 |
| 34 | Exhaustivité définitive de cette liste | — | QUESTION OUVERTE (Q2) | §5, §11 |
| 35 | Moment de vérification (enregistrement / consultation / les deux) | ADR-012 §17 | QUESTION OUVERTE (Q2) | §5, §11 |
| 36 | Mécanisme technique de vérification A (classe, module, etc.) | ADR-012 §17, Ticket §C | DÉCISION DIFFÉRÉE / HORS PÉRIMÈTRE (Q3) | §5, §12 |
| 37 | Simulation seule calcule/exécute ; consulte Registry pour les modèles | Tome II §4.1 | FAIT | §6 |
| 38 | État actuel : `resolution.js` importe directement les modèles (A4) | Fait vérifié dans le dépôt | FAIT | §6 |
| 39 | Calendrier de bascule vers la consultation du Registry canonique | ADR-012 §14 | DÉCISION DIFFÉRÉE / HORS PÉRIMÈTRE (Q4) | §6, §11, §12 |
| 40 | Presentation = métadonnées de rendu exclusivement | ADR-012 §12 | FAIT | §7 |
| 41 | Écart entre Tome II §5.1 (Registry non listé) et ADR-012 §12 | Constat textuel direct | FAIT (observation documentaire, non bloquante) | §7 |
| 42 | Aucune dépendance montante Registry → Presentation | Invariant I1 | FAIT | §7 |
| 43 | Validation évalue une modification candidate (B), ne décide jamais | Tome II §3.3 | FAIT | §8 |
| 44 | Mutation décide seule d'accepter/rejeter une modification | Tome II §3.3 | FAIT | §8 |
| 45 | Registry fournit la connaissance à Validation, ne participe jamais à l'évaluation ni à la décision | Tome II §3.3 | FAIT | §8 |
| 46 | Matrice des responsabilités (synthèse) | Sections 4 à 8 | FAIT (synthèse, sans décision nouvelle) | §9 |
| 47 | `componentDefinitions.js` réduit à son périmètre Presentation, non supprimé | ADR-012 §16 | FAIT | §10.3 |
| 48 | Statut de `core/ComponentRegistry.ts` (MB-SIM-001-B2) | — (historique non retrouvé) | QUESTION OUVERTE (Q1) | §10.2, §11 |

Ce tableau couvre l'intégralité des décisions normatives des sections 2 à 11. Aucune ligne classée PROPOSITION, QUESTION OUVERTE ou DÉCISION DIFFÉRÉE n'est présentée ailleurs dans le corps du texte comme un FAIT.

---

## 15. Conclusion normative

Le contrat canonique du Registry est défini (§4) comme porteur exclusif de la connaissance déclarative des composants — identité, pins logiques, paramètres, capabilities, disponibilité d'un modèle de simulation — conformément à Tome II §3.4, avec une obligation de cohérence structurelle interne (§5) distincte de toute évaluation d'une modification candidate du Document (§8, responsabilité exclusive de Validation, la décision finale relevant elle-même de Mutation). Les frontières avec Simulation (§6), Presentation (§7) et Validation (§8) sont posées sans ambiguïté. Aucun des trois artefacts existants n'est déclaré canonique (§10) ; chacun reste une source d'évidence traçée. Deux questions (Q1, Q2) restent ouvertes pour arbitrage du Chief Software Architect, sans bloquer la validité de ce contrat pour la Phase 1. Deux décisions (Q3, Q4) restent différées, hors périmètre de MB-CF2-001. Aucune implémentation, migration ou suppression n'a été engagée par la production de ce document.