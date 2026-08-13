# MB-CF2-002 — Cartographie des sources de vérité du Registry

**Nature :** spécification/cartographie architecturale de Phase 2 du programme Core Foundation CF2.
**Statut :** intégrée sur `main` après revue architecturale.
**Code modifié :** NON.
**Périmètre :** documentation et décision préparatoire uniquement. Aucune migration n'est exécutée par ce document.

## 1. Objet

Cette cartographie établit, à partir de l'état réel du dépôt et des sources architecturales de CF2, où se trouve aujourd'hui chaque connaissance déclarative relative aux composants et quelles frontières doivent être respectées avant une unification future.

Elle ne désigne pas rétroactivement un artefact existant comme canonique. Elle distingue les faits architecturaux, les faits observés dans le dépôt, les propositions et les décisions restant ouvertes.

## 2. Sources de référence

Les sources de gouvernance utilisées sont :

- Vision 2030 de MYBlab ;
- Architecture de référence de la plateforme, notamment les responsabilités du Registry et les frontières Core / Simulation / Presentation / Validation ;
- ADR-012 — Définition du Registry canonique de MYBlab ;
- Ticket `MB-CF2-001` et sa révision intégrée ;
- spécification du contrat canonique `MB-CF2-001-registry-canonical-contract.md` ;
- état réellement intégré sur `main` après `MB-CF2-SIM-001 core`.

Les fichiers du dépôt sont utilisés comme preuves d'observation, non comme autorité architecturale lorsqu'ils contredisent ou dépassent les sources de gouvernance.

## 3. Principe directeur

La règle de référence est : **Registry = connaissance déclarative ; Simulation = comportement et calcul.**

Le Registry canonique doit porter la connaissance déclarative d'un type : identité, pins logiques, paramètres, capacités et disponibilité d'un modèle associé. Il ne doit ni calculer, ni exécuter une simulation, ni valider une modification candidate, ni porter des métadonnées purement graphiques.

Presentation peut représenter la connaissance du Registry, mais ne doit pas devenir une seconde source de vérité logique. Simulation consomme la connaissance déclarative et fournit le comportement. Validation contrôle les modifications candidates et ne devient pas un second Registry.

## 4. Cartographie actuelle

| Dimension | Source actuellement observée | Nature | Destination architecturale |
|---|---|---|---|
| Identité/type | `componentDefinitions.js`, `registry.js`, `core/ComponentRegistry.ts`, `canonicalRegistry.js` | duplication de représentation | Registry canonique |
| Pins `id` | `componentDefinitions.js` + `canonicalRegistry.js` | duplication réelle | Registry canonique |
| Rôle logique du pin | `componentDefinitions.js` + `canonicalRegistry.js` | duplication réelle | Registry canonique |
| Coordonnées `dx/dy` | `componentDefinitions.js` | présentation | Presentation |
| Label graphique | `componentDefinitions.js` | présentation | Presentation |
| Dimensions graphiques | `componentDefinitions.js` | présentation | Presentation |
| Paramètres déclaratifs | `canonicalRegistry.js`, modèles de simulation et définitions existantes | recouvrements à arbitrer | Registry canonique |
| Valeurs par défaut des modèles | modèles `PowerModel`, `ResistorModel`, `LdrModel`, `ThermistorModel` | comportement/modèle | Simulation |
| Capacités | modèles et `canonicalRegistry.js` | dérivation/consommation | Registry déclaratif + Simulation |
| Disponibilité modèle | `canonicalRegistry.js` / `simulationRegistry.js` | contrat de résolution | Registry + Simulation Registry |
| Préparation des nets | `preparation.js` | exécution Simulation | Simulation |
| Validation candidate | `core/validation/` | infrastructure | Validation |

Cette table est une cartographie de l'état actuel, pas un ordre de migration implicite.

## 5. Cas critique : les pins

Le point le plus concret révélé par CF2 est la duplication des pins.

`canonicalRegistry.js` contient actuellement `DECLARED_TYPES_PINS`, avec pour chaque type les identifiants et rôles logiques. Le même niveau de connaissance existe dans `componentDefinitions.js`, où les pins portent également `label`, `dx` et `dy`.

La coexistence est architecturale­ment problématique parce qu'une modification d'un pin logique peut nécessiter la synchronisation manuelle de deux représentations.

La séparation cible est toutefois claire :

- Registry : `type`, `pin.id`, `pin.role` et autres attributs logiques explicitement retenus par le contrat ;
- Presentation : `label`, `dx`, `dy`, dimensions et autres métadonnées de rendu ;
- aucune duplication indépendante de la connaissance logique ne doit être créée simplement pour alimenter Presentation.

**Décision différée :** la mécanique exacte permettant à Presentation de joindre sa représentation graphique au contrat canonique n'est pas imposée ici. Elle devra respecter le principe de jointure par type et par identifiant logique de pin sans faire remonter la responsabilité graphique dans le Registry.

## 6. Cas `preparation.js`

`preparation.js` importe directement `getComponentDef` depuis `componentDefinitions.js` pour découvrir les pins utilisés lors de la construction des nets.

Il s'agit d'un fait d'observation important : une partie de la Simulation dépend aujourd'hui directement d'une représentation de Presentation/configuration.

Cette dépendance ne doit pas être interprétée comme une justification de déplacer `componentDefinitions.js` dans Simulation. La cible architecturale est inverse : Simulation doit consommer la connaissance logique déclarative via l'interface canonique appropriée, tandis que les coordonnées et autres données graphiques restent hors de Simulation.

Le présent document ne réalise pas cette migration.

## 7. `canonicalRegistry.js`

L'état intégré de `canonicalRegistry.js` expose notamment :

- les types canoniques déclarés ;
- les pins logiques ;
- `parameterSchema` lorsqu'un modèle le fournit ;
- les capacités lorsqu'un modèle les fournit ;
- `modelAvailable` ;
- des fonctions de lecture telles que `getCanonicalEntry`, `getAllCanonicalTypes` et `getAllCanonicalEntries` ;
- une auto-validation de cohérence des entrées.

Cette implémentation matérialise une partie importante du contrat CF2-001, mais elle ne transforme pas automatiquement toutes ses décisions locales en règles architecturales supplémentaires.

## 8. `simulationRegistry.js`

Le Simulation Registry actuel consomme le Registry canonique pour vérifier l'existence du type et sa disponibilité, enregistre les modèles et expose la résolution du modèle de simulation.

Il matérialise la frontière Registry / Simulation introduite par CF2-SIM-001 : la connaissance déclarative indique qu'un modèle est disponible ; le Simulation Registry résout le modèle et le moteur l'exploite.

Le Simulation Registry ne doit pas devenir une seconde source de vérité des types ou des pins.

## 9. Paramètres et valeurs par défaut

Le dépôt présente plusieurs formes de connaissance liées aux paramètres : schémas déclaratifs dans le Registry et paramètres/valeurs dans les modèles.

Il faut distinguer :

1. la définition déclarative du paramètre exposé par un composant ;
2. la valeur par défaut nécessaire au modèle de simulation ;
3. la valeur effectivement présente dans une instance du Document.

La relation exacte entre `defaultParameters` et `defaultValue` reste une décision architecturale ouverte. CF2-002 ne doit pas la résoudre par simple copie d'un artefact existant.

## 10. Capacités

Les capacités exposées par `canonicalRegistry.js` sont aujourd'hui dérivées des modèles disponibles et copiées dans les entrées canoniques.

Cette situation est différente de la duplication des pins : les capacités observées sont actuellement dérivées des modèles plutôt que déclarées deux fois comme deux tables indépendantes de vérité.

La cartographie recommande donc de ne pas appliquer mécaniquement au champ `capabilities` la même conclusion que pour `DECLARED_TYPES_PINS`.

## 11. Identité et casse

Les sources actuelles ne fournissent pas une politique architecturale définitive sur la sensibilité à la casse des identifiants.

Le dépôt contient des comportements différents entre représentations. Cette divergence doit être arbitrée avant une migration généralisée, mais elle ne bloque pas la cartographie elle-même.

Aucune normalisation supplémentaire n'est introduite par CF2-002.

## 12. Double `ComponentRegistry`

Le dépôt contient `frontend/src/simulator/registry.js` et une autre implémentation dans `core/ComponentRegistry.ts`.

Cette coexistence est réelle, mais CF2-SIM-001 ne l'a pas résolue. CF2-002 la conserve comme sujet de migration/unification ultérieure.

Il serait incorrect de choisir l'une des deux implémentations comme cible uniquement parce qu'elle est actuellement consommée par davantage de code.

## 13. Validation

L'infrastructure de Validation existe, mais la cartographie ne constate pas de rôle actuel de Validation dans la connaissance canonique des types.

La distinction demeure :

- Registry vérifie la cohérence interne de sa définition déclarative ;
- Validation évalue une modification candidate ;
- Simulation exécute les modèles ;
- Presentation représente l'état et les métadonnées graphiques.

Une évolution de Validation ne doit pas être introduite dans CF2-002.

## 14. Matrice de frontières

| Interaction | Autorisée | Sens cible |
|---|---|---|
| Presentation → Registry | OUI | consultation de connaissance logique |
| Simulation → Registry | OUI | consommation de connaissance déclarative |
| Validation → Registry | OUI | consultation pour contrôler une candidate |
| Registry → Presentation | NON | aucune dépendance montante |
| Registry → Simulation | NON | aucune exécution depuis Registry |
| Registry → Validation | NON | aucune validation candidate dans Registry |
| Simulation → Presentation | NON comme dépendance métier | séparation des couches |
| Presentation → `componentDefinitions` graphique | OUI provisoirement | représentation graphique, sous réserve de migration |

Cette matrice décrit la cible architecturale et non la totalité des dépendances actuellement présentes.

## 15. Écarts prioritaires

### Écart P1 — duplication des pins
Deux représentations portent aujourd'hui la même connaissance logique. C'est le candidat le plus concret pour la prochaine décision de migration.

### Écart P2 — Simulation → `componentDefinitions.js`
`preparation.js` obtient encore ses pins via la configuration de Presentation. Cette dépendance doit disparaître lorsque la frontière Registry/Simulation sera migrée.

### Écart P3 — double `ComponentRegistry`
La coexistence de deux registres génériques doit être résolue dans le chantier d'unification approprié.

### Écart P4 — paramètres par défaut
La relation entre schéma déclaratif et paramètres du modèle doit être arbitrée avant une migration qui risquerait de figer deux sources concurrentes.

### Écart P5 — casse des identifiants
Une convention unique doit être décidée avant une migration généralisée.

## 16. Décisions explicitement non prises

CF2-002 ne décide pas :

- la classe ou le module concret du Registry canonique ;
- la suppression immédiate de `componentDefinitions.js` ;
- la suppression de `registry.js` ou `core/ComponentRegistry.ts` ;
- la migration de `preparation.js` ;
- une politique de casse non prescrite par les sources ;
- une nouvelle structure de données pour les paramètres ;
- une implémentation de Validation ;
- une évolution du moteur de simulation.

## 17. Prochain travail recommandé

La cartographie fait ressortir un prochain chantier précis : **définir la stratégie de séparation et de jointure entre la connaissance logique des pins et leur représentation graphique**, avec comme contrainte de supprimer à terme la double déclaration indépendante observée aujourd'hui.

Ce chantier devra produire avant toute modification de code :

1. la décision de source de vérité ;
2. la définition de l'interface consommée par Presentation et Simulation ;
3. les règles de migration ;
4. les invariants empêchant la réapparition d'une seconde déclaration ;
5. les tests d'architecture correspondants.

## 18. Critères d'acceptation de CF2-002

- La cartographie couvre les principales sources observées de connaissance composant.
- Les faits architecturaux sont distingués des faits d'observation.
- La duplication des pins est explicitement localisée.
- La dépendance `preparation.js` → `componentDefinitions.js` est explicitement localisée.
- Les responsabilités Core, Simulation, Presentation et Validation sont séparées.
- Les questions `ComponentRegistry`, paramètres par défaut et casse restent explicitement ouvertes.
- Aucune migration de code n'est introduite par ce livrable.
- Aucun artefact existant n'est déclaré canonique sans fondement architectural.
- Le prochain chantier est formulé sans transformer une proposition en décision d'implémentation.

## 19. Conclusion architecturale

CF2-001 a établi le contrat. CF2-SIM-001 a matérialisé une première frontière de résolution côté Simulation. CF2-002 établit maintenant la cartographie nécessaire pour éviter qu'une migration ultérieure ne reproduise les duplications existantes.

Le constat principal est net : **la connaissance logique des pins doit converger vers une seule source de vérité canonique, tandis que les coordonnées et métadonnées graphiques doivent rester dans Presentation.**

La migration concrète de cette frontière appartient au ticket suivant et ne fait pas partie de CF2-002.
