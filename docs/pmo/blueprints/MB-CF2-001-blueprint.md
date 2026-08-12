# Execution Blueprint — MB-CF2-001

Conforme à SPEC-PMO-003 v1.0.

## A. IDENTITÉ & TRAÇABILITÉ

| Champ | Valeur |
| --- | --- |
| `Blueprint-ID` | MB-CF2-001-blueprint |
| `Ticket-ID` | MB-CF2-001 |
| `Commit analysé` | `aa75a6d39d11255e7825bb3ee065af8bea7e66df` |
| `Date de production` | 2026-08-12 |
| `Auteur` | Claude — Repository Analyst |
| `Statut` | **DRAFT** — Q1 et Q2 nécessitent un arbitrage avant passage formel à `PRÊT_POUR_CONCEPTION` ; ce statut ne bloque pas le démarrage de la rédaction de la spécification, chacune disposant d'un traitement par défaut explicite. |

**Note de fraîcheur** **`[FAIT]`** : le commit analysé est strictement identique à la HEAD actuelle de `origin/main` au moment de la production du Blueprint.

## B. SYNTHÈSE POUR L'AGENT CONCEPTEUR

MYBlab porte aujourd'hui trois artefacts qui assument chacun partiellement une responsabilité de « catalogue de composants », sans qu'aucun ne soit consulté par l'ensemble du chemin applicatif réel. L'ADR-012 (Option C) tranche que Registry doit devenir l'unique porteur de la connaissance déclarative des composants (identité, pins logiques, paramètres, capacités, contrat de disponibilité d'un modèle de simulation), sans jamais porter de logique de calcul ni de métadonnée de rendu. MB-CF2-001 est la Phase 1 de cette décision : produire la **spécification** de ce contrat canonique — aucune implémentation, aucune migration.

**Point d'entrée recommandé.** ADR-012 §8 (« Responsabilités du Registry ») et §14 (matrice « information → responsabilité cible ») constituent le socle normatif. Le contrat doit être dérivé de Tome II §3.4 et des contraintes de l'ADR, pas recopié d'un artefact existant.

## C. CONTEXTE TECHNIQUE — `[FAIT]`

### Nature du Ticket

MB-CF2-001 est de type `DOCUMENTATION`, niveau de liberté `CONCEPTION` : le livrable attendu est un texte de spécification, pas du code.

### Les trois contrats de données actuellement incompatibles

**`frontend/src/simulator/registry.js`** — classe `ComponentRegistry`, annuaire simple (`Map<string, model>`). Contrat de modèle attendu :

```text
{ type, defaultParameters, parameterSchema: [{key, parameterType, unit, minimum, maximum, defaultValue, description}], capabilities, validate(params) }
```

`PowerModel.js` et `ResistorModel.js` sont typés selon ce contrat, mais ne sont pas enregistrés en production ; `resolution.js` les importe directement.

**`frontend/src/simulator/core/ComponentRegistry.ts`** — classe issue de MB-SIM-001-B2. API : `register`, `get`, `has`, `list`, `listAll`, `validate`, `validateAll`, événements d'enregistrement. Son contrat de données est différent et ses fixtures utilisent notamment des types à lettre unique façon SPICE (`R`, `C`, `L`, `V`, `I`, `D`). Elle est couverte par 56 tests mais n'est pas consommée en production.

**`frontend/src/config/componentDefinitions.js`** — objet statique `COMPONENT_TYPES`, contenant notamment identité, libellé, icône, dimensions et pins avec coordonnées graphiques. Il est consommé par Presentation et par la préparation de Simulation.

### Frontière normative

> Registry = connaissance déclarative. Simulation = comportement et calcul.

Registry déclare le contrat et la disponibilité d'un modèle de simulation ; il ne calcule et n'exécute jamais un modèle (ADR-012 §4, Tome II §3.4).

### Matrice information → responsabilité cible

| Information | Responsabilité cible |
| --- | --- |
| Type / identité du composant | **Registry** |
| Pins logiques (identifiant + rôle électrique) | **Registry** — partie logique uniquement |
| Paramètres électriques (schéma + valeurs par défaut) | **Registry** |
| Capabilities | **Registry** |
| Contrat de modèle | **Registry** — contrat unifié |
| Calcul électrique / comportement | **Simulation** — jamais Registry |
| Icône, dimensions, coordonnées graphiques des pins | **Presentation** |

### Distinction A/B

- **(A) Cohérence interne d'une définition Registry** — par exemple : pas de type dupliqué, pas de pin dupliqué, `parameterSchema` structurellement bien formé. Porte sur la déclaration elle-même.
- **(B) Validation d'une modification candidate du Document** — appartient exclusivement à Validation (Tome II §3.3, CF4). Registry ne décide jamais de l'acceptation d'une modification.

Les mécanismes `validate()` actuellement présents dans les artefacts existants mélangent potentiellement A et B ; la spécification doit lever cette ambiguïté sans trancher l'implémentation.

## D. DÉPENDANCES & IMPACT — `[FAIT]`

La spécification doit rester compatible avec les données réellement portées par les artefacts existants, sans les modifier.

### Fichiers dont la spécification doit tenir compte

| Fichier | Pertinence |
| --- | --- |
| `frontend/src/simulator/registry.js` | Contrat aligné avec les modèles de production |
| `frontend/src/simulator/core/ComponentRegistry.ts` | API riche et tests de cohérence interne |
| `frontend/src/simulator/models/PowerModel.js`, `ResistorModel.js` | Modèles de production réels |
| `frontend/src/config/componentDefinitions.js` | Référence pour la frontière Registry/Presentation |
| `frontend/src/simulator/capabilities.js` | Convention des capabilities |
| `frontend/src/simulator/resolution.js` | Illustre la frontière Registry/Simulation actuelle |

### Tests existants

- `ComponentRegistry.ts` : 56 tests, portant sur son contrat actuel ; ils ne constituent pas la cible normative de CF2.
- `registry.js` : test propre à l'annuaire simple.
- Aucun test ne couvre aujourd'hui un contrat unifié.

### Hors périmètre

Aucun des artefacts existants ne doit être modifié, migré ou supprimé dans le cadre de MB-CF2-001.

## E. SIGNAUX D'ATTENTION — `[ANALYSE]`

- **Risque de glissement vers une décision de forme d'implémentation.** La spécification doit s'auto-qualifier de « contrat de données », indépendant de tout mécanisme porteur (classe, module, singleton).
- **Risque de fusion silencieuse A/B.** La cohérence interne du Registry ne doit pas être confondue avec la validation d'une modification candidate du Document.
- **Statut non tranché de MB-SIM-001-B2 — non bloquant.** L'historique de décision de B2 n'a pas été retrouvé. Cette incertitude conditionne le traitement ultérieur de l'artefact B2, mais aucun champ du contrat canonique lui-même.
- **Dépendance aval.** SIM1 et ECO1 sont dépendants de CF2 ; ce fait ne justifie pas de précipiter les arbitrages hors périmètre.

## F. CONTRAINTES DE CONCEPTION

| Champ | Valeur |
| --- | --- |
| `Niveau de liberté` | CONCEPTION |
| `Nature du travail attendu à ce stade` | MB-CF2-001 produit une **spécification architecturale et documentaire** — identité, pins logiques, paramètres, capacités, disponibilité d'un modèle de simulation et cohérence structurelle interne. **Aucune implémentation, migration ou suppression.** Aucune décision de forme d'implémentation concrète n'est prise à ce stade. |
| `Périmètre inclus` | Contrat canonique complet, règles de cohérence interne, frontières Registry/Simulation/Presentation/Validation, mapping des responsabilités et questions ouvertes tracées. |
| `Périmètre exclu` | Toute implémentation, migration, suppression ou modification des représentations existantes ; développement de composant analogique ; évolution du moteur de simulation ; intégration Presentation ; implémentation Validation ; décision de forme d'implémentation concrète. |
| `Contraintes issues du contexte technique` | Compatibilité avec les modèles de production, respect de la frontière Registry/Simulation et de la distinction A/B, aucun artefact existant déclaré automatiquement canonique, vocabulaire neutre vis-à-vis de la forme porteuse. |

## G. GESTION PMO

| Champ | Valeur |
| --- | --- |
| `Statut Blueprint` | DRAFT — Q1/Q2 nécessitent arbitrage pour passage à `PRÊT_POUR_CONCEPTION` ; ne bloque pas le démarrage de la rédaction de la spécification |
| `Historique de régénération` | Version 3 — correction terminologique ciblée sur la distinction « questions ouvertes » / « décisions différées / hors périmètre », 2026-08-12 |

## H. QUESTIONS OUVERTES & DÉCISIONS DIFFÉRÉES

Cette section distingue les **questions ouvertes** qui nécessitent un arbitrage architectural pour que la spécification soit complète des **décisions différées / hors périmètre**, qui ne nécessitent aucun arbitrage pour MB-CF2-001 sans que leur réponse finale soit pour autant arrêtée.

### Questions ouvertes réellement pertinentes pour la spécification — `[QUESTION OUVERTE]`

#### Q1 — Statut de MB-SIM-001-B2

L'historique de décision de B2 n'a pas été retrouvé et l'origine des types SPICE à lettre unique reste inexpliquée.

**Traitement Phase 1 :** le contrat canonique peut et doit être spécifié sans reconstituer l'histoire de B2. B2 n'est ni présumé porteur d'une intention non capturée, ni transformé automatiquement en écart erroné. Le sort de cet artefact sera déterminé ultérieurement après comparaison formelle.

**Caractère non bloquant :** cette incertitude ne conditionne aucun champ du contrat canonique lui-même et n'empêche pas la rédaction de démarrer.

**Arbitrage demandé :** Chief Software Architect, à traiter lorsque des informations nouvelles seront disponibles ou lors de la comparaison formelle prévue par ADR-012 §16.

#### Q2 — Niveau architectural de la garantie de cohérence interne (A)

ADR-012 §9 établit que Registry doit assurer sa cohérence structurelle interne, sans préciser si la liste d'exemples est exhaustive ni comment cette garantie doit être exprimée dans un contrat.

**A. Ce que le contrat doit garantir :** « Une définition Registry doit être structurellement cohérente avant d'être considérée comme une définition valide du catalogue. » Cette obligation est une propriété du contrat, indépendante de tout mécanisme technique.

**B. La manière technique de garantir cette propriété :** explicitement hors périmètre de Phase 1 : classe ou module, singleton ou instance, fonctions pures, API concrète, emplacement de fichier, mécanisme d'enregistrement ou de revalidation.

**Caractère non bloquant :** la spécification peut énoncer l'obligation architecturale sans attendre d'arbitrage préalable. Reste ouvert si la liste d'exemples doit être complétée avant finalisation.

**Arbitrage demandé :** Chief Software Architect, confirmation que cette distinction capture correctement l'intention d'ADR-012 §9.

### Décisions différées / hors périmètre — aucun arbitrage requis pour MB-CF2-001 — `[FAIT]`

Le fait qu'une décision soit différée signifie qu'elle n'a pas à être arbitrée dans le cadre de MB-CF2-001 — pas que sa réponse finale est déjà arrêtée. ADR-012 et le Ticket établissent seulement que ces points ne relèvent pas de la Phase 1.

#### Q3 — Forme d'implémentation du Registry canonique

Décision différée, explicitement exclue du périmètre de MB-CF2-001 et identifiée comme non tranchée par ADR-012 §17 et R4 de la roadmap.

**Conséquence :** la spécification reste strictement agnostique vis-à-vis de la forme porteuse. Aucun vocabulaire imposant implicitement une forme ne doit y figurer. Ce point ne bloque pas le Blueprint.

#### Q4 — Calendrier de retrait des anciens chemins de consommation

Décision différée aux phases ultérieures de migration (Phase 3 / Phase 4), hors périmètre de MB-CF2-001.

**Conséquence :** aucun calendrier de retrait ne doit figurer dans le livrable de ce Ticket. Ce sujet sera repris par un Ticket dédié aux phases 3/4. Il ne nécessite aucun arbitrage pour ce Ticket.

### Conséquence sur le statut du Blueprint

Q1 et Q2 restent des `[QUESTION OUVERTE]` au sens strict de SPEC-PMO-003 et maintiennent donc le statut formel `DRAFT`. Cette contrainte porte sur le statut du Blueprint, pas sur la possibilité d'engager la rédaction de la spécification : chacune dispose d'un traitement par défaut explicite. Q3 et Q4 sont des décisions différées / hors périmètre pour MB-CF2-001 ; elles ne participent pas au blocage du statut.

## Historique

| Date | Auteur | Action |
| --- | --- | --- |
| 2026-08-12 | Claude (Repository Analyst) | Production initiale, statut DRAFT, section H traitant Q1/Q2/Q3/Q4 comme potentiellement bloquantes |
| 2026-08-12 | Claude (Repository Analyst) | Révision ciblée : Q1/Q2 = questions ouvertes non bloquantes pour la rédaction ; Q3/Q4 = décisions différées / hors périmètre ; reformulation de F |
| 2026-08-12 | Claude (Repository Analyst) | Correction terminologique ciblée : remplacement de « décisions déjà établies » par « décisions différées / hors périmètre — aucun arbitrage requis pour MB-CF2-001 » |

## PARTIE 3 — Points nécessitant un arbitrage du Chief Software Architect

Cette partie hiérarchise les points de la section H en distinguant explicitement ce qui nécessite un arbitrage de ce qui est établi comme hors périmètre et différé.

### 3.1 — Points nécessitant un arbitrage architectural (n'empêchent pas le démarrage)

1. **MB-SIM-001-B2 (Q1).** Aucune décision n'est requise pour engager la rédaction. L'arbitrage reste utile pour clore formellement le point lors de la comparaison ultérieure.
2. **Cohérence interne A (Q2).** Confirmation de la formulation comme propriété du contrat, sans prescrire le mécanisme technique. Cette confirmation reste nécessaire avant finalisation, mais pas avant le démarrage de la rédaction.

Ces deux points maintiennent le statut du Blueprint à `DRAFT` au sens strict de SPEC-PMO-003, sans constituer un blocage artificiel du travail de Phase 1.

### 3.2 — Décisions différées / hors périmètre — aucun arbitrage requis pour MB-CF2-001

3. **Forme d'implémentation du Registry canonique (Q3).** Différée par ADR-012 §17 et explicitement exclue du périmètre du Ticket. Sa réponse finale n'est pas arrêtée ; elle ne figure plus parmi les points bloquants.
4. **Calendrier de retrait des anciens chemins de consommation (Q4).** Renvoyé aux phases 3/4 de la stratégie de migration, hors périmètre du Ticket. Sa réponse finale n'est pas arrêtée ; aucun arbitrage n'est requis pour ce Ticket.

### 3.3 — Points de gouvernance annexes

5. **Référence à MB-SIM-001-B2 dans le Ticket.** Cette mention reste conforme au standard PMO comme référence à un chantier antérieur. Aucune action requise sauf décision ultérieure de clarification du Ticket.
6. **Mode d'exécution.** La section F décrit directement la nature documentaire du travail attendu et les interdictions applicables ; aucun choix binaire Blueprint/Implémentation n'est posé.

---

**Rappel de statut.** Ce document est une proposition de contenu produite pour revue. Aucun fichier existant n'est modifié par le Ticket MB-CF2-001 ; le Blueprint lui-même est l'artefact documentaire créé pour cadrer la Phase 1. Le statut formel reste `DRAFT` tant que Q1/Q2 ne sont pas arbitrées.