# EXP2 — Arbitrage CSA et découpage d'implémentation

**Date :** 2026-08-20  
**Autorité :** Chief Software Architect, après validation du Project Lead  
**Épic :** EXP2 — Visualisation des fils

## Décision

EXP2 est maintenu comme Épic Experience visant le seuil Tinkercad de qualité de restitution des fils et connexions.

L'implémentation est explicitement scindée en deux Tickets PMO successifs de nature différente :

1. **MB-VIS-004 — Visualisation réactive des fils** : état visuel discret des fils à partir des états de simulation déjà disponibles, sans modification du contrat Core Wire.
2. **MB-VIS-005 — Routage utilisateur des fils** : capacité ultérieure portant sur les points intermédiaires et le routage manipulable, avec extension Core éventuelle soumise à une décision architecturale dédiée.

## Justification

Les audits Qwen et Claude convergent sur la stabilité du contrat topologique actuel et sur la faisabilité immédiate d'une évolution Presentation-only pour la réactivité visuelle. Ils divergent sur le traitement du routage utilisateur ; l'arbitrage CSA retient la séparation proposée par Claude car le routage persistant implique potentiellement Mutation, Validation et History, contrairement à la réactivité visuelle.

## Limites de la décision

Cette décision n'autorise pas :

- l'ajout de géométrie au Wire Core dans MB-VIS-004 ;
- l'affichage de tension ou de courant réel non fourni par le chemin de simulation actuellement consommé par Presentation ;
- la physique des fils ;
- le routage 3D ;
- le pathfinding ou l'évitement d'obstacles ;
- les animations avancées de flux ;
- une décision architecturale définitive sur les waypoints persistants.

## Gouvernance

Le problème documentaire identifié entre ADR-008 et la référence caduque à « ADR-003 » est reconnu. Il ne bloque pas MB-VIS-004, mais doit être résolu avant tout engagement sur MB-VIS-005 et le routage persistant.

Le présent amendment ne réutilise pas `MB-VIS-002`, déjà attribué au travail de régularisation du premier lot de renderers réalistes.
