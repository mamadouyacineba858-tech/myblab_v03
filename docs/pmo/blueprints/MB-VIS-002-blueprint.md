# Execution Blueprint — MB-VIS-002

## Statut

**Blueprint de régularisation rétroactive — aucune implémentation à exécuter.**

## 1. Ticket source

`MB-VIS-002`

## 2. Objet

Documenter le terrain technique observable du premier lot de renderers réalistes déjà intégré sur `main`, afin de compléter la chaîne PMO sans prétendre reconstituer une spécification originale absente.

## 3. État de référence

Commit de référence identifié par l'audit : `a9064d8`.

Le lot attesté concerne les renderers de RESISTOR, LED, CAPACITOR et DIODE et inclut une suite de tests dédiée.

## 4. Périmètre technique attesté

- représentation visuelle des quatre types précités ;
- conservation des contrats existants de props et de pins ;
- conservation du registre canonique ;
- tests spécifiques du lot.

## 5. Hors périmètre

- fils réactifs et visualisation du courant ;
- modification du Document Model ;
- modification du moteur de Simulation ;
- valeur par instance des composants ;
- architecture 3D ;
- nouveau pipeline d'assets ;
- extension à d'autres types non attestée par la preuve de livraison.

## 6. Conformité architecturale

La régularisation confirme que le lot doit être interprété comme une évolution de Presentation. Il ne doit pas déplacer les responsabilités de calcul ou de vérité métier vers le rendu.

La séparation existante entre pins canoniques et informations de présentation constitue une frontière à préserver.

## 7. Preuves

- Commit `a9064d8`.
- Rapport d'audit MB-VIS-003 — Qwen.
- Rapport d'audit MB-VIS-003 — Claude.
- Delivery Report `docs/pmo/delivery-reports/MB-VIS-002-delivery-report.md`.

## 8. Décisions non prises

Ce Blueprint ne décide pas :

1. la technologie d'un futur rendu 3D ;
2. la structure d'un futur pipeline d'assets 3D ;
3. la généralisation de la dérivation d'état visuel ;
4. le traitement d'EXP2 ;
5. le statut d'ADR-011.

## 9. Conclusion

Le Blueprint sert uniquement à compléter la traçabilité du travail déjà livré. Aucun agent d'implémentation ne doit utiliser ce document comme ordre de modifier le code.
