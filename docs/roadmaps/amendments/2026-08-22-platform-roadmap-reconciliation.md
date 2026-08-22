# Amendement — Réconciliation ROADMAP_PLATFORM

**Date :** 2026-08-22
**Statut :** APPLIQUÉ — amendement documentaire de référence
**Portée :** réconcilier la roadmap stratégique avec l'état déjà intégré de `main`.

## 1. Règle sur `docs/vision-2030`

La formulation historique de `ROADMAP_PLATFORM.md` §2.1 indiquant que la fusion de `docs/vision-2030` est un prérequis avant une nouvelle génération de Tickets PMO ne doit plus être interprétée comme une action future obligatoire.

L'audit Phase 1 a établi que la branche `origin/docs/vision-2030` n'apporte aucun commit absent de `main` et constitue un instantané documentaire dépassé.

**Décision :** le contenu effectivement intégré à `main` constitue la base opérationnelle ; aucune fusion supplémentaire de cette branche obsolète n'est requise.

## 2. État Experience / EXP2

Les intégrations suivantes sont déjà présentes sur `main` :

- `MB-VIS-004` — visualisation réactive des fils — intégré par `1575738` ;
- `MB-VIS-005` — routage utilisateur / waypoints persistants — intégré par `f8f5944`.

**Décision :** le statut stratégique d'EXP2 ne doit plus rester « Non commencé ». La roadmap doit considérer le travail EXP2 livré comme **réalisé techniquement**, tout en conservant séparément les éventuels gaps documentaires de Delivery Report et de clôture PMO.

## 3. Principe de mise à jour

Un état technique intégré ne doit plus rester invisible dans la roadmap jusqu'à plusieurs tickets plus tard.

Après chaque intégration significative :

```text
commit intégré
   ↓
audit delta
   ↓
roadmap
   ↓
capacité
   ↓
NEXT / NEXT+1
```

## 4. Ce qui n'est PAS décidé par cet amendement

Cet amendement ne :

- ne crée pas de nouveau Ticket PMO ;
- ne clôture pas artificiellement MB-VIS-004 ou MB-VIS-005 au niveau PMO si leurs preuves documentaires finales manquent ;
- ne valide pas EXP-VIS ;
- ne supprime aucune branche ni aucun artefact historique ;
- ne lance aucune implémentation.

## 5. Conséquence Phase 2

La roadmap stratégique est désormais compatible avec la trajectoire :

**Niveau 1 crédible → atteindre le benchmark Tinkercad → construire les avantages propres à MYBlab → laboratoire virtuel avancé / 3D au Level 3.**

Les prochaines décisions de travail sont donc pilotées par les gaps Level 1, et non par les anciens libellés « Non commencé » devenus obsolètes.
