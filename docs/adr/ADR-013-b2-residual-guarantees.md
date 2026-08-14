# ADR-013 : Analyse des garanties résiduelles de B2 (MB-CF2-007)

## Statut
Accepté

## Contexte
L'audit architectural MB-CF2-006 a établi que `B2` (`frontend/src/simulator/core/ComponentRegistry.ts`) n'a aucun consommateur de production et doit être supprimé.
Cependant, B2 implémente une copie défensive profonde (`deepCopy`) des modèles lors de l'enregistrement (`register`) et de la récupération (`get`, `listAll`).
La mission MB-CF2-007 vise à déterminer si cette garantie de copie défensive est nécessaire pour le chemin de production actuel avant de procéder à la suppression de B2 dans MB-CF2-008.

## Décision
**CAS B CONFIRMÉ : La garantie de copie défensive profonde présente dans B2 n'est pas une garantie fonctionnelle nécessaire au chemin de production actuel et ne doit donc pas être migrée artificiellement vers `registry.js`, `simulationRegistry.js` ou `canonicalRegistry.js`.**

Cette décision repose sur les faits architecturaux suivants :

1. **Absence de consommateurs de B2** : Aucun consommateur de production de B2 n'a été identifié dans le graphe applicatif.
2. **Utilisation en lecture seule** : Les consommateurs actuels des registres de production utilisent les modèles retournés strictement en lecture.
3. **Absence de mutations requises** : Aucune mutation de `defaultParameters`, `parameterSchema`, `capabilities` ou de l'objet modèle retourné n'est nécessaire au runtime actuel.
4. **Immutabilité du registre canonique** : `canonicalRegistry.js` possède déjà ses propres garanties d'immutabilité pour sa surface déclarative (via clonage léger et `Object.freeze()`).
5. **Contraintes d'identité du registre de simulation** : Les tests d'identité de `simulationRegistry.js` rendent inappropriée une copie des modèles runtime, car les consommateurs s'attendent à récupérer les références des singletons enregistrés.
6. **Non-reproduction de la copie défensive** : La copie défensive de B2 ne doit donc pas être reproduite dans le chemin canonique.
7. **Non-migration des fonctionnalités** : Aucune fonctionnalité de B2 ne doit être migrée par défaut.
8. **Traitement ultérieur** : B2 sera traité par un ticket ultérieur dédié à sa suppression complète : MB-CF2-008.

## Conséquences
- **Aucune modification de code** n'est apportée aux registres de production (`registry.js`, `simulationRegistry.js`, `canonicalRegistry.js`).
- Le ticket **MB-CF2-008** procèdera directement à la suppression complète de B2 (`frontend/src/simulator/core/ComponentRegistry.ts`) et de ses tests auto-référencés, sans aucune migration opportuniste.

## Risques
Aucun risque fonctionnel résiduel n'a été identifié sur le chemin de production actuel. Un risque théorique de mutation future des singletons demeure, mais il ne justifie pas la migration de la garantie de copie défensive de B2.