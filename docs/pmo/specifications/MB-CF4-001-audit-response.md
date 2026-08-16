# MB-CF4-001 — Réponse CSA à l'audit R&Q

## Statut

**Audit reçu :** MB-CF4-001, lecture seule.

**Verdict R&Q :** 🟡 Prêt pour arbitrage CSA sous réserves.

**Baseline :** `a4b2aec2638c705490a5ecf62299bbd94bd24965`

**Branche de travail :** `docs/cf4-arbitration`

## Décisions de méthode

L'audit R&Q est recevable comme audit de cohérence, mais ses limites d'accès sont conservées explicitement. Les points qu'il qualifie de « questions probables » ne sont pas traités comme des faits sur le contenu exact du dossier CF4.

## Corrections factuelles retenues

### ADR-010

La formulation normative doit être :

- ADR-010 existe dans `docs/governance/ADR/ADR-010-validation-engine-architecture.md` ;
- son absence éventuelle de `docs/adr/` est un **écart de localisation**, pas une absence de l'ADR ;
- aucun déplacement de fichier n'est autorisé par CF4 sans décision PMO/architecture distincte.

## Garde-fous CF1 / CF2 / CF3 à intégrer au contrat CF4

Les points suivants deviennent des contraintes explicites de conception, sans constituer encore une décision d'implémentation :

1. ValidationEngine ne devient ni source de vérité ni store persistant.
2. ValidationEngine ne calcule pas la simulation et ne prend pas la responsabilité de Simulation.
3. ValidationEngine valide les documents/commandes persistantes pertinentes, pas les états UI/transitoires.
4. ValidationEngine ne déplace aucune responsabilité du Registry, de Simulation ou de Presentation.
5. CF4 s'insère dans le canal de mutation établi par CF3 et ne crée pas de second canal.
6. Les résultats de validation ne sont pas historisés par défaut : toute historisation constituerait une décision supplémentaire à arbitrer explicitement.

## Frontière CF3 / CF4

La frontière cible à arbitrer est :

```text
UI
 ↓
Command
 ↓
CommandBus
 ↓
ValidationEngine
 ↓
Handler
 ↓
Document Core
 ↓
HistoryService
```

Cette représentation est une **cible soumise à arbitrage**, pas encore une autorisation d'implémentation généralisée.

CF3 reste propriétaire du canal de mutation et de l'historisation. CF4 est propriétaire du contrat de validation et de son insertion dans ce canal. CF4 ne doit pas modifier la responsabilité de HistoryService.

## Politique de validation — point à arbitrer

Le modèle `ERROR / WARNING / INFO` existe dans l'infrastructure de validation observée. Le comportement exact d'un `CommandBus` face à chaque niveau reste une décision CSA :

- `ERROR` : candidat au blocage ;
- `WARNING` : candidat au non-blocage ;
- `INFO` : informatif.

Aucune de ces règles n'est considérée comme définitivement adoptée avant arbitrage.

## Historisation des résultats

Décision provisoire de gouvernance : **ne pas historiser les rapports de validation dans CF4**. Le rapport accompagne l'exécution et ne devient pas une nouvelle source d'état persistant. Si un besoin ultérieur exige de restaurer ou rejouer des résultats de validation, un ticket/ADR dédié devra l'autoriser.

## Arbitrages CSA restant nécessaires

1. Où brancher exactement ValidationEngine dans CommandBus ?
2. Une validation est-elle obligatoire pour toute commande persistante ou seulement pour certaines commandes/handlers ?
3. Quels niveaux (`ERROR`, `WARNING`, `INFO`) ont quel effet sur l'exécution ?
4. Qui fournit les règles/validators au canal : CommandBus, ValidationEngine ou composition root ?
5. La validation porte-t-elle sur l'état avant mutation, sur la commande candidate, ou sur les deux ?
6. Les validations structurelles, électriques et pédagogiques relèvent-elles toutes du même gate CF4 ou de gates distincts ?
7. Confirmation de la frontière CF3/CF4 et de l'absence d'impact sur HistoryService.
8. Confirmation de l'absence d'historisation des rapports de validation.
9. Politique documentaire pour ADR-010 : conserver son emplacement actuel ou lancer une action documentaire séparée.

## STOP conditions

Aucun développement CF4 ne doit commencer si l'un des points suivants reste non arbitré lorsqu'il est nécessaire à l'implémentation :

- responsabilité exacte de ValidationEngine dans le canal ;
- effet des niveaux de validation sur l'exécution ;
- périmètre des commandes obligatoirement validées ;
- contrat Document utilisé pour la validation ;
- responsabilité de fourniture des règles ;
- frontière CF3/CF4 ;
- impact éventuel sur HistoryService.

## Prochaine étape

Le dossier peut maintenant passer à **l'arbitrage CSA**. Après arbitrage, le CSA pourra rédiger `MB-CF4-001` comme ticket d'implémentation normatif. Aucun fichier de production n'est modifié par cette étape.
