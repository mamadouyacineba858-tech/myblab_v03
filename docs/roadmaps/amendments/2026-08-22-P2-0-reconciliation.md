# MYBlab v0.3 — P2-0 — Réconciliation de pilotage

**Date :** 2026-08-22
**Nature :** décision de pilotage Phase 2 — documentaire/gouvernance
**Statut :** APPLIQUÉ
**Implémentation fonctionnelle autorisée par ce document :** NON

## 1. But

P2-0 ferme le décalage entre l'état réel de `main`, les feuilles de route et la mémoire PMO avant d'ouvrir une nouvelle génération de tickets fonctionnels.

Principe :

> **Où sommes-nous ? → preuves → réconciliation → où allons-nous ?**

## 2. Réconciliation effectuée

### 2.1 Programme Simulation

`docs/tickets/MB-SIM-ROADMAP.md` a été réconcilié jusqu'à `MB-SIM-015`.

Les intégrations suivantes sont maintenant explicitement suivies :

- `MB-SIM-013` — `2b18227` — architecture PWM ;
- `MB-SIM-014A` — `ecb4263` — configuration fréquence PWM ;
- `MB-SIM-014` — `ac437ec` — implémentation runtime PWM ;
- `MB-SIM-015` — `8f09042` — réseau DC passif.

Les anciens MB-SIM-002/003 restent identifiés comme travaux historiques de pré-gouvernance ; ils ne sont pas recréés artificiellement comme Tickets PMO.

### 2.2 MB-CF3-003

L'intégration de `MB-CF3-003` est déjà matérialisée par `918b392`, qui est la base intégrée de `main` à l'ouverture de P2-0.

La chaîne Ticket → ruling → implémentation → tests → commit → intégration est conservée comme preuve primaire.

Le manque de Delivery Report formel reste un **gap documentaire** à traiter dans la régularisation PMO ; il ne justifie pas de refaire l'implémentation.

### 2.3 MB-VIS-005

L'intégration technique est conservée comme fait historique ; l'absence d'un Delivery Report versionné formel reste un gap documentaire.

Aucun travail de code ne doit être recréé uniquement pour combler ce manque documentaire.

### 2.4 Roadmap stratégique

`ROADMAP_PLATFORM.md` demeure la référence stratégique de trajectoire :

**Atteindre Tinkercad → Dépasser Tinkercad → Laboratoire virtuel avancé / 3D lorsque justifié.**

Le prérequis historique de fusion de `docs/vision-2030` ne doit plus être interprété comme un travail futur de fusion : l'audit Phase 1 a établi que `origin/docs/vision-2030` est déjà entièrement rattrapée par `main` et n'apporte aucun commit supplémentaire à fusionner.

Toute reformulation de cette règle dans `ROADMAP_PLATFORM.md` devra être faite par un amendement documentaire dédié, sans réécriture opportuniste de l'historique.

## 3. Ce qui reste ouvert après P2-0

P2-0 ne prétend pas résoudre toutes les incohérences historiques. Il les transforme en éléments explicitement suivis :

| Sujet | État après P2-0 | Action future |
|---|---|---|
| Delivery Report CF3-003 | manquant | régularisation PMO |
| Delivery Report VIS-005 | manquant | régularisation PMO |
| Constitution EN/FR | ambiguïté documentaire | décision de gouvernance |
| ADR-010 | PROPOSED alors que Validation est en production | arbitrage ADR |
| `MB-CF2-008` / registre B2 | exécution non démontrée par le dépôt | audit ciblé avant suppression |
| HistoryManager / HistoryService | coexistence | ticket Core séparé si nécessaire |
| `EXP-VIS` | rattachement stratégique non définitivement validé | décision PMO/CSA |
| Tickets historiques SIM | traçabilité par commits/roadmap, pas par Tickets PMO individuels | ne pas recréer sans besoin ; conserver la trace historique |

## 4. Décision de séquencement Phase 2

P2-0 étant appliqué, le prochain travail ne doit pas être choisi par numéro de ticket historique.

La trajectoire candidate devient :

```text
P2-0 — réconciliation
        ↓
MB-OBS-001 — contrat canonique d'observation
        ↓
MB-MEASURE-001 — instrument de référence
        ↓
MB-OBS-002 — observation temporelle / waveform
        ↓
Breadboard / assemblage physique
        ↓
Embedded E2E
        ↓
Certification Level 1
```

`MB-OBS-001` reste **candidat de planification** tant que son Ticket PMO, son Blueprint et son ruling CSA ne sont pas produits.

## 5. NOW / NEXT / NEXT+1

**NOW :** P2-0 — réconciliation de pilotage et fermeture documentaire immédiate.

**NEXT :** préparer le contrat et le Ticket PMO `MB-OBS-001`.

**NEXT+1 :** `MB-MEASURE-001`, sous réserve que `MB-OBS-001` stabilise le contrat d'observation.

**BLOCKED :** aucun travail fonctionnel ne doit contourner un contrat d'observation encore non validé.

## 6. Garde-fous

- aucune 3D en Phase 2 ;
- aucun oscilloscope avant contrat d'observation ;
- aucune breadboard purement décorative ;
- aucune nouvelle mutation UI parallèle au canal CF3 sans ruling ;
- aucune recréation artificielle de tickets historiques uniquement pour remplir des tableaux ;
- aucune clôture de ticket sans mise à jour de la mémoire de roadmap.

## 7. Preuve attendue du passage à P2-1

Avant d'autoriser l'implémentation de `MB-OBS-001`, le dépôt devra contenir :

1. contrat d'observation explicite ;
2. définition de la donnée observable ;
3. granularité et unités ;
4. sémantique instantanée/temporelle ;
5. source du temps simulé ;
6. frontière Simulation/Presentation ;
7. comportement déterministe ;
8. stratégie de validation et de tests ;
9. scénario utilisateur de référence ;
10. Ticket PMO + Blueprint + ruling CSA.

**Conclusion : P2-0 est réconcilié. La prochaine décision est P2-1, pas une nouvelle révision générale de la roadmap.**
