# ADR-003 — Référence invalidée / doublon documentaire

**Statut :** INVALID — DUPLICATE / NO DECISION
**Date de régularisation :** 2026-08-21
**Auteur :** Équipe Architecture MYBlab
**Arbitrage :** Chief Software Architect

## Objet

Ce fichier était historiquement nommé `ADR-003-visualization-manager-registry.md`, mais son contenu était un doublon exact de `ADR-002-separation-ui-modele-simulation.md`.

La vérification du dépôt a confirmé que les deux fichiers possédaient le même contenu et le même blob Git. Aucun contenu distinct établissant une décision « VisualizationManager + Registry Pattern » n'est présent dans ce fichier.

## Décision de régularisation

Ce fichier est conservé uniquement pour la traçabilité historique, mais **ne constitue plus une source d'autorité architecturale** et ne doit pas être cité comme ADR valide.

Aucune décision nouvelle sur un « VisualizationManager Registry » n'est créée par cette régularisation. L'architecture de visualisation doit être fondée uniquement sur les ADR explicitement acceptés et sur l'architecture de référence actuelle.

## Conséquence

Toute référence future à `ADR-003` comme justification architecturale est considérée comme invalide tant qu'un nouvel ADR distinct n'a pas été formellement créé et accepté sous ce numéro.

## Relation avec ADR-008

`ADR-008` est amendé séparément afin de rendre explicite le contrat des waypoints sans dépendre de ce fichier comme source de justification.

Cette régularisation documentaire **ne modifie aucune implémentation** et ne crée aucun contrat de rendu supplémentaire.
