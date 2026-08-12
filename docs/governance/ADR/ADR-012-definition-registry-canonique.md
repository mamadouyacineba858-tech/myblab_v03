# ADR-012 — Définition du Registry canonique de MYBlab

**Statut :** PROPOSED  
**Date :** 2026-08-12  
**Auteur :** Équipe Architecture MYBlab  
**Statut de validation :** Orientation et contenu validés par le Chief Software Architect (Option C approuvée). Le statut documentaire reste PROPOSED dans l'attente de l'ouverture du Ticket PMO CF2, qui ne fait pas partie du périmètre de cette intégration.  
**Ticket associé :** aucun à ce stade — la création du Ticket PMO CF2 est explicitement hors périmètre de cette étape.  
**Fondement :** Roadmap Platform (`docs/roadmaps/ROADMAP_PLATFORM.md`, Programme Core Foundation, Épic CF2) ; Audit J1 en lecture seule (réf. commit `fca4613`) ; `PLATFORM_ARCHITECTURE.md` §3.4 (Registry).

**Nature de cette ADR :** décision architecturale de cadrage, pas d'implémentation. Elle tranche la responsabilité et le périmètre du Registry canonique ; elle ne prescrit pas la forme d'implémentation exacte, renvoyée à un futur Ticket PMO (cf. §7 et §17).

---

## 1. Titre

Définition du Registry canonique de MYBlab.

## 2. Statut

**PROPOSED.** Ne devient ACCEPTED que par décision explicite de l'autorité compétente (Engagement E2 du Tome I). Cette version intègre une révision demandée par le Chief Software Architect sur un projet antérieur, sur sept points (numérotation de l'artefact canonique, frontière Registry/Simulation, distinction des deux formes de validation, stratégie de migration en quatre phases, sort de `componentDefinitions.js`, sort de `ComponentRegistry.ts`, format). L'orientation Option C et le contenu de cette version ont été validés par le Chief Software Architect ; le statut documentaire reste PROPOSED jusqu'à intégration documentaire formelle distincte de cette étape.

## 3. Contexte

L'audit J1 (lecture seule, réf. `fca4613`) a établi factuellement que trois artefacts distincts portent aujourd'hui une responsabilité de type « catalogue de composants », sans qu'aucun ne soit consulté par l'ensemble du chemin applicatif réel :

- `frontend/src/simulator/registry.js` — classe `ComponentRegistry`, annuaire simple (`Map<string, model>`), contrat documenté en tête de fichier (référence interne `MB-SIM-001 Contrat architectural V4 + Addenda A1-A4 + V5 + V5.1`, « ADR #4 : Le Registry est un annuaire pur, sans logique métier »). `simulator/models/PowerModel.js` et `simulator/models/ResistorModel.js` sont explicitement typés selon son contrat (`@type {import('../registry.js').ComponentModel}`) — mais **aucun des deux modèles n'est jamais enregistré via** **`.register()`** dans le code de production ; `simulator/resolution.js` les importe directement.
- `frontend/src/simulator/core/ComponentRegistry.ts` — classe issue du chantier **MB-SIM-001-B2**, contrat différent (`register(type, model)`, `get`, `has`, `list`, `listAll`, `validate`, `validateAll`, événements `onRegister`/`offRegister`). Testée exhaustivement (56 tests) mais **importée uniquement par ses propres tests et fixtures** — zéro usage en production.
- `frontend/src/config/componentDefinitions.js` — objet statique `COMPONENT_TYPES`, consommé à la fois par Presentation et par la préparation de simulation (`simulator/preparation.js`, via `getComponentDef`). C'est aujourd'hui le seul artefact réellement partagé entre deux couches architecturales distinctes.

Les formes de données de ces trois artefacts sont mutuellement incompatibles, pas seulement dupliquées :

| Artefact | Forme du « modèle » |
| --- | --- |
| `registry.js` / `PowerModel.js` / `ResistorModel.js` | `{ type, defaultParameters, parameterSchema: [{key, parameterType, unit, minimum, maximum, defaultValue, description}], capabilities, validate(params) }` |
| `core/ComponentRegistry.ts` (fixtures B2) | `{ type, label, category, pins: [{id, label, position:{x,y}}], params: [{id, label, type, min, max, default, required}], symbol, description, customValidator? }`, types codés en lettres uniques façon SPICE (`'R'`, `'C'`, `'L'`, `'V'`, `'I'`, `'D'`) |
| `componentDefinitions.js` | `{ id, label, icon, width, height, pins: [{id, label, dx, dy, role}] }`, types en identifiants applicatifs (`'RESISTOR'`, `'POWER'`, …) |

**Ce n'est donc pas un choix entre artefacts existants à fusionner, mais un arbitrage de contrat de données à définir en amont de tout choix de fichier.**

## 4. Problème architectural

Tome II §3.4 attribue à Registry une responsabilité précise : *« porter la connaissance déclarative de ce qui est disponible dans MYBlab, sous deux dimensions... la structure d'un type de composant : son identifiant, ses paramètres, ses bornes de connexion ; la disponibilité d'un modèle de simulation associé »*. Aucun des trois artefacts actuels ne remplit cette responsabilité pour l'ensemble de l'application, ce qui contredit le Principe 1 du Tome I et l'Invariant I6 du Tome II (une seule responsabilité par sous-système — ici fragmentée entre trois porteurs plutôt que concentrée).

**Frontière posée explicitement dès ce chapitre, et non négociable dans la suite de cette ADR :**

> **Registry = connaissance déclarative.** **Simulation = comportement et calcul.**

Registry déclare le contrat et la disponibilité d'un modèle de simulation ; il ne possède aucune logique de calcul, n'exécute jamais un modèle, et ne devient à aucun moment un moteur de simulation. Cette frontière découle directement de Tome II §3.4 (« Ce qu'il ne porte pas » : *« Registry ne calcule et n'exécute aucun modèle de simulation »*) et de §4.1 (Simulation : *« porte le calcul du comportement... »*). Elle s'applique de façon identique quel que soit l'artefact qui portera finalement le contrat canonique.

## 5. Contraintes

Cette décision doit respecter, sans exception ni contournement silencieux (Engagement E5 / Invariant I8) :

- **P1** — les données métier sont la seule source de vérité.
- **P5** — une représentation unique doit porter tout le parcours utilisateur.
- **P7** — la plateforme s'étend sans reconstruire ce qui existe déjà.
- **P10 / I6** — séparation stricte des responsabilités, une seule par sous-système.
- **I1** — aucune dépendance vers le haut : Registry (Core) ne dépend jamais de Presentation ni d'Execution.
- **I3** — toute interaction passe par l'interface exposée, jamais par accès à l'état interne.
- **Tome II §3.4 « Ce qu'il ne porte pas »** — Registry ne valide jamais une modification candidate (rôle de Validation), ne calcule et n'exécute aucun modèle de simulation, ne charge/n'active aucune extension.
- **R4 de la roadmap** — cette ADR reste au niveau architectural ; la forme d'implémentation exacte relève des Tickets PMO et Blueprints qui en découleront.

## 6. Options étudiées

### Option A — Conserver `ComponentRegistry.ts` (B2) comme base

**Avantages :** implémentation la plus riche fonctionnellement (recherche insensible à la casse, copie défensive en lecture, événements d'enregistrement, validation de paramètres intégrée, 56 tests déjà passants). Seule des trois conçue dès l'origine comme *le* Registry.

**Inconvénients :** son contrat de données (`pins: [{id,label,position}]`, `params: [{id,label,type,min,max,default,required}]`, types en lettres façon SPICE) est incompatible avec les modèles réellement utilisés en production. L'adopter en l'état exigerait de réécrire `PowerModel.js`, `ResistorModel.js`, `componentDefinitions.js` et leurs consommateurs — une reconstruction plutôt qu'une conservation.

**Impact Core :** fort mais localisé. **Impact Simulation :** élevé — `resolution.js` et les modèles devraient migrer vers un schéma différent. **Impact Presentation :** élevé — `pins[].position.{x,y}` remplacerait `pins[].{dx,dy}`, sans équivalent actuel pour `width`/`height`/`icon`. **Impact SIM1 :** neutre à positif une fois la migration faite. **Migration nécessaire :** élevée, transversale. **Risques :** migration simultanée des trois couches, le scénario le plus exposé à une régression visible.

### Option B — Transformer/absorber `componentDefinitions.js` dans Registry

**Avantages :** `componentDefinitions.js` est déjà consommé par deux couches (Presentation et Simulation via `preparation.js`) — l'absorber capitalise sur un existant partiellement partagé. Migration la plus mécanique des trois (`getComponentDef(type)` → `Registry.get(type)`).

**Inconvénients :** `componentDefinitions.js` ne porte aujourd'hui aucune donnée de simulation électrique — seulement des données géométriques et visuelles (`icon`, `width`, `height`, `pins[].{dx,dy}` en pixels). Une absorption telle quelle ferait entrer dans Registry (Core) une responsabilité de rendu que Tome II §3.4 ne lui attribue pas, et que l'Invariant I1 exclut indirectement (Core ne porte pas de responsabilité de rendu, propre à Presentation §5.1).

**Impact Core :** Registry hériterait d'une responsabilité visuelle indue, sauf si l'absorption est limitée aux données structurelles — auquel cas cette option converge de fait vers l'Option C. **Impact Simulation :** faible. **Impact Presentation :** moyen, dépend du périmètre effectivement absorbé. **Impact SIM1 :** positif si un schéma de paramètres électriques est ajouté (donc nécessite un enrichissement, pas une simple absorption). **Migration nécessaire :** moyenne. **Risques :** recréer, sous un autre nom, la confusion actuelle entre structure logique et présentation visuelle.

### Option C — Registry reste catalogue déclaratif Core ; les métadonnées strictement Presentation restent en Presentation

**Avantages :** lecture la plus littérale de Tome II §3.4, qui limite explicitement Registry à « son identifiant, ses paramètres, ses bornes de connexion » et à « la disponibilité d'un modèle de simulation » — sans jamais mentionner icônes, dimensions ou coordonnées d'affichage. Respecte I1 et I6 sans ambiguïté.

**Inconvénients :** exige de définir précisément la frontière entre « bornes de connexion logiques » (identifiant + rôle électrique — Registry) et « position d'affichage d'une pin » (coordonnées pixel — Presentation) ; cette frontière n'existe dans aucun artefact actuel sous cette forme exacte, elle est à construire. Nécessite que Presentation et Registry partagent le même identifiant de type comme clé de jointure, sous peine de désynchronisation silencieuse (tension avec P8, Tome II §7.2).

**Impact Core :** Registry acquiert un rôle actif et conforme, sans extension de périmètre indue. **Impact Simulation :** faible — `PowerModel`/`ResistorModel` sont déjà structurés dans cet esprit. **Impact Presentation :** moyen — `componentDefinitions.js` serait scindé conceptuellement plutôt que supprimé. **Impact SIM1 :** positif et direct — exactement la porte d'intégration déjà prévue par la roadmap (§12.1). **Migration nécessaire :** moyenne, progressive et découplable. **Risques :** discipline de gouvernance à maintenir dans la durée (risque non technique).

## 7. Décision recommandée

**Option C est retenue.**

Aucun des trois artefacts existants n'est déclaré canonique par défaut :

> Le contrat canonique du Registry est défini à partir de la responsabilité du Tome II §3.4. Aucun des trois artefacts existants n'est déclaré canonique tel quel. Les éléments utiles de chacun pourront être migrés vers ce contrat.

Les trois artefacts restent explicitement identifiés comme intrants de cette décision, chacun conservant les éléments qu'il apporte de valide :

- `simulator/registry.js` — apporte un contrat déjà aligné avec les modèles de simulation réellement utilisés (`PowerModel`, `ResistorModel`).
- `simulator/core/ComponentRegistry.ts` — apporte des propriétés d'implémentation éprouvées par ses tests (recherche insensible à la casse, copie défensive en lecture, événements d'enregistrement), indépendamment de son contrat de données actuel.
- `config/componentDefinitions.js` — apporte la seule preuve concrète, dans le dépôt, d'une consommation déjà partagée entre deux couches, utile pour cadrer la migration (§14).

**Le choix de la forme d'implémentation exacte (fichier porteur, structure de classe ou module, mécanisme d'enregistrement) est explicitement laissé au futur Ticket PMO qui découlera de cette ADR**, conformément à R4 de la roadmap.

## 8. Responsabilités du Registry

- Déclarer, pour chaque type de composant, son identifiant unique, ses bornes de connexion logiques (identifiant de pin, rôle électrique), son schéma de paramètres (`parameterSchema`) et ses valeurs par défaut (`defaultParameters`).
- Déclarer les `capabilities` d'un type (cf. `simulator/capabilities.js`, déjà conforme à cet usage : chaînes ouvertes, non interprétées par le framework).
- Exposer la disponibilité d'un modèle de simulation associé à un type (Tome II §3.4, deuxième dimension) — **exposer la disponibilité, jamais l'exécuter** (voir frontière posée en §4).
- Exposer ces informations en lecture à tout sous-système autorisé (Simulation, Presentation, futur Plugin Loader/Validation), sans jamais initier lui-même un appel vers une couche.
- Assurer la **cohérence structurelle interne** de ses propres déclarations — voir distinction A/B en §9.

## 9. Responsabilités hors Registry

Cette ADR distingue explicitement deux formes de validation :

- **(A) Validation de cohérence interne d'une définition Registry** — par exemple : un type ne peut pas être enregistré deux fois, un pin ne peut pas avoir un identifiant dupliqué au sein d'un même type, un `parameterSchema` doit être structurellement bien formé (bornes min/max cohérentes, valeur par défaut présente si le paramètre est requis). **Cette vérification appartient, au minimum, au mécanisme de cohérence propre du Registry** — elle porte sur la déclaration elle-même, avant même qu'un composant en soit instancié dans un projet, et non sur une modification candidate du Document. On la retrouve aujourd'hui, de façon dispersée et à des degrés divers, dans `validateModel()` de `core/ComponentRegistry.ts` et dans les vérifications de `register()` de `simulator/registry.js`.
- **(B) Validation d'une modification candidate du Document** — par exemple : un composant ajouté au Document a-t-il des paramètres dans les bornes déclarées, respecte-t-il les contraintes d'un projet donné. **Cette responsabilité appartient exclusivement à Validation (Tome II §3.3, Programme CF4).** Elle consulte Registry pour connaître le schéma déclaré, mais Registry ne décide jamais lui-même de l'acceptation d'une modification (Tome II §3.4 : « Registry ne valide jamais une modification candidate »).

**Ces deux responsabilités ne doivent pas être fusionnées.** La fonction `validate(params)` actuellement embarquée dans `PowerModel.js`/`ResistorModel.js`, ainsi que `validate()`/`validateAll()` de `core/ComponentRegistry.ts`, mélangent aujourd'hui potentiellement les deux formes (A et B) sous une même méthode — ce point devra être clarifié au moment de définir le contrat canonique (Ticket PMO à venir), sans que cette ADR ne tranche elle-même le détail d'implémentation.

Restent également, sans ambiguïté, hors Registry :

- **Rendu visuel** (icône, dimensions en pixels, position d'affichage des pins, libellés d'interface) — Presentation (Tome II §5.1).
- **Calcul du comportement électrique** — Simulation (Tome II §4.1), voir frontière §4.
- **Chargement et cycle de vie des extensions** — Plugin Loader (Tome II §6.2), qui consulte Registry en lecture seule.

## 10. Impact Core

Registry devient, pour la première fois, un sous-système Core réellement actif et consulté — condition posée par la roadmap pour ECO1 (§9.2) et pour la porte d'intégration CF2→SIM1 (§12.1). Aucun changement requis sur Document, Mutation ou Validation eux-mêmes par cette ADR seule.

## 11. Impact Simulation

Simulation continue de porter exclusivement le calcul (§4) : `simulator/resolution.js` migrerait d'un import direct de `PowerModel`/`ResistorModel` vers une consultation du Registry canonique pour obtenir la déclaration d'un type, sans que cela ne modifie la logique de calcul elle-même (`computeDcAnalysis` reste inchangée dans son périmètre). Registry n'exécute à aucun moment cette logique ; il ne fait qu'exposer ce que Simulation consomme. La contrainte actuellement documentée en commentaire de `resolution.js` (« aucun accès à ComponentRegistry, A4 ») devra être explicitement revue par le Ticket PMO d'implémentation — elle n'est pas automatiquement caduque du seul fait de cette ADR.

## 12. Impact Presentation

Cette ADR confirme explicitement que `componentDefinitions.js` **n'est pas absorbé tel quel** dans Registry. La répartition cible est :

- **Reste en Presentation :** icône, dimensions (`width`/`height`), coordonnées graphiques des pins (`dx`/`dy` en pixels), toute métadonnée de rendu.
- **Devient responsabilité de Registry :** identité/type du composant, pins logiques (identifiant + rôle électrique), paramètres, capabilities, contrat de modèle de simulation.

Presentation consulte Registry pour la structure logique (existence du type, identifiants de pins) et conserve, pour le même identifiant de type, ses propres métadonnées de rendu — une double lecture jointe par type, jamais une redéclaration indépendante.

## 13. Impact SIM1

Une fois le contrat canonique défini et au moins partiellement adopté, chaque composant analogique nouveau (capacitor, potentiomètre, diode, transistor, thermistance — déjà visuellement présents via `components/parts/*.jsx` mais sans modèle de simulation, cf. audit J1 §5) se déclare une seule fois dans Registry, avec sa structure logique et son `parameterSchema`, consommé identiquement par Simulation et par Presentation. Sans cette ADR, chaque nouveau composant analogique serait tenté de reproduire le seul précédent existant — l'import direct de modèle dans `resolution.js` — perpétuant la duplication que CF2 cherche à éliminer.

## 14. Stratégie de migration

*(Cadrage architectural uniquement — le détail opérationnel relève d'un ou plusieurs Tickets PMO distincts, conformément à R4 de la roadmap.)*

**Phase 1 — Définir le contrat canonique.** Formaliser, à partir de Tome II §3.4 et des contraintes de §4/§5/§9 de cette ADR, la forme exacte d'une entrée de Registry (champs, types, distinction A/B pour la cohérence interne). Cette phase ne modifie aucun fichier existant ; elle produit une spécification.

**Phase 2 — Établir le mapping des données existantes vers ce contrat.** Cartographier, champ par champ, où vit aujourd'hui chaque information et vers quelle responsabilité cible elle migre (voir matrice ci-dessous). Cette phase est également documentaire, sans code.

**Phase 3 — Implémenter progressivement les consommateurs.** Faire consulter le Registry canonique par Simulation puis par Presentation, chacune à son rythme, en coexistence temporaire avec les chemins actuels (imports directs, `componentDefinitions.js` non réduit) — aucune suppression prématurée, conformément au Principe 4 du Tome I (aucune action irréversible sans filet de sécurité).

**Phase 4 — Supprimer les anciennes sources seulement après validation.** Retirer les imports directs de `PowerModel`/`ResistorModel` dans `resolution.js`, réduire `componentDefinitions.js` à son périmètre Presentation, et statuer sur le sort de `core/ComponentRegistry.ts` (voir §16) — uniquement une fois les phases 1 à 3 validées par les tests existants et par une revue explicite, jamais en parallèle de l'implémentation.

### Matrice information → responsabilité cible

| Information | Source actuelle | Responsabilité cible |
| --- | --- | --- |
| Type / identité du composant | `componentDefinitions.js` (`COMPONENT_TYPES[x].id`) ; `registry.js`/`PowerModel`/`ResistorModel` (`model.type`) ; fixtures `ComponentRegistry.ts` (`type: 'R'`, etc.) | **Registry** |
| Pins logiques (identifiant + rôle électrique) | `componentDefinitions.js` (`pins[].{id,role}`, mêlé aux coordonnées) ; fixtures `ComponentRegistry.ts` (`pins[].id`, mêlé à `position`) | **Registry** (partie logique uniquement) |
| Paramètres électriques (schéma + valeurs par défaut) | `PowerModel.js` / `ResistorModel.js` (`parameterSchema`, `defaultParameters`) | **Registry** |
| Capabilities | `simulator/capabilities.js` (constantes de convention) ; déclarées par modèle (`PowerModel.capabilities`, `ResistorModel.capabilities`) | **Registry** |
| Contrat de modèle (forme attendue d'une entrée) | Dispersé — JSDoc `ComponentModel` de `registry.js` ; interface TS locale de `core/ComponentRegistry.ts` | **Registry** (contrat à unifier, un seul) |
| Calcul électrique / comportement | `simulator/resolution.js` (`computeDcAnalysis`), `simulator/production.js` | **Simulation** (jamais Registry — voir §4) |
| Icon | `componentDefinitions.js` (`COMPONENT_TYPES[x].icon`) | **Presentation** |
| Dimensions (`width`/`height`) | `componentDefinitions.js` | **Presentation** |
| Coordonnées graphiques des pins (`dx`/`dy` pixel, `position.{x,y}`) | `componentDefinitions.js` ; fixtures `ComponentRegistry.ts` | **Presentation** |

## 15. Risques

- **Risque de régression fonctionnelle si la migration n'est pas progressive** — atténué par la coexistence explicite prévue en Phase 3.
- **Risque de « faux consensus »** — ne pas statuer sur le sort de `core/ComponentRegistry.ts` reviendrait à laisser un quatrième artefact ambigu plutôt que de résoudre la trinité actuelle. Cette ADR ne tranche pas encore ce sort (voir §16) mais pose explicitement qu'il devra l'être.
- **Risque de glissement de périmètre** — sans discipline explicite (R5 de la roadmap), Presentation pourrait être tentée de redéclarer un pin par commodité locale plutôt que de consulter Registry ; à surveiller en revue de code.
- **Risque de confusion A/B (§9)** — si la distinction entre cohérence interne du Registry et validation d'une modification candidate n'est pas maintenue au moment de l'implémentation, Registry pourrait dériver silencieusement vers une responsabilité de Validation, contredisant Tome II §3.4.
- **Risque de blocage prolongé de SIM1/ECO1** — en sens inverse, différer indéfiniment la Phase 1 (définition du contrat) au nom de la prudence retarderait deux Épics déjà dépendants de CF2 selon la roadmap elle-même ; la prudence méthodologique de cette ADR ne doit pas devenir un prétexte à l'inaction.

## 16. Conséquences

Si cette ADR est acceptée : le contrat canonique de Registry devient le point de référence pour toute nouvelle déclaration de type de composant, condition déjà posée par la roadmap pour SIM1 et ECO1. Aucun artefact existant n'est immédiatement supprimé ; chacun est réévalué au regard du contrat canonique une fois celui-ci défini (Phase 1).

**Sort de `core/ComponentRegistry.ts` (B2) :** non tranché par cette ADR. *Son sort sera déterminé après comparaison formelle avec le contrat canonique retenu.* Il ne doit cependant pas rester durablement comme second Registry parallèle une fois cette comparaison faite — l'absence de décision ne peut pas devenir, par défaut, une décision de statu quo permanent (cohérent avec l'Engagement E7 du Tome I, déjà cité dans l'audit J1 à propos de la divergence MB-SIM-006/007).

**Sort de `config/componentDefinitions.js` :** réduit à son périmètre Presentation (§12), non supprimé.

Si cette ADR est rejetée ou reste PROPOSED sans suite : SIM1 et ECO1 restent explicitement bloqués selon les termes mêmes de la roadmap actuelle, et tout nouveau composant analogique développé entretemps risque de créer une quatrième source de vérité.

## 17. Questions restant ouvertes

- **MB-SIM-001-B2 avait-il un objectif ou un périmètre non capturé par l'audit J1** (par exemple une compatibilité voulue avec un format externe de type SPICE, expliquant les types à lettre unique) **qui justifierait de le traiter comme une piste distincte plutôt que comme un simple écart ?** Cette ADR ne peut pas trancher cette question sans consulter l'historique de décision de B2, non retrouvé dans le dépôt audité.
- **Comment répartir précisément, à l'implémentation, la vérification (A) de cohérence interne du Registry entre « validation de structure au moment de l'enregistrement » et « validation de structure au moment de la consultation » ?** Cette ADR fixe la frontière A/B (§9) mais pas ce détail, qui relève du Ticket PMO de Phase 1.
- **Le Registry canonique doit-il être une classe unique instanciée globalement, ou un module de fonctions pures ?** Cette ADR fixe la responsabilité et le périmètre, pas la forme d'implémentation exacte (R4).
- **Quel calendrier pour le retrait effectif des imports directs dans `resolution.js`** une fois le Registry consulté en parallèle (Phase 3 vs Phase 4) ?

---

## Décision architecturale proposée

**Option C retenue, formulation courte :** Registry (Core) devient l'unique porteur de la connaissance déclarative des composants — identité, pins logiques, paramètres, capabilities, contrat de modèle de simulation — conformément à Tome II §3.4. Presentation conserve exclusivement les métadonnées de rendu (icône, dimensions, coordonnées graphiques). Simulation exécute le comportement à partir de ce que Registry déclare, sans jamais en devenir propriétaire ni exécutant. Aucun des trois artefacts existants (`simulator/registry.js`, `simulator/core/ComponentRegistry.ts`, `config/componentDefinitions.js`) n'est déclaré canonique par défaut ; le contrat canonique sera défini à partir de Tome II §3.4 (Phase 1), chaque artefact y migrant ensuite selon la stratégie en quatre phases de la §14, par un ou plusieurs Tickets PMO dédiés.

---

## Références ADR liées

- **ADR-005** — Architecture du modèle de composants électroniques (dimension déclarative dont Registry hérite en partie).
- **ADR-006** — Registry des modèles de simulation (source directe de la dimension « modèles de simulation » de Registry, Tome II §3.4).
- **ADR-010** — Architecture du moteur de validation métier (référence pour la distinction entre cohérence interne et validation d'une modification candidate, §9 de la présente ADR).
- **ADR-011** — Audit documentaire des références architecturales (méthode d'audit et de recommandation dont s'inspire la présente ADR, également PROPOSED).

*Fin de l'ADR-012. Cette ADR reste PROPOSED. Aucune implémentation CF2 ne commence à ce stade ; le Ticket PMO correspondant n'a pas été créé.*
