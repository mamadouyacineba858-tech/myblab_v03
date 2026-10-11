# MYB-GRAPHICS-001 — atelier de contrôle raster Arduino

Date : 2026-10-11
Statut : IMPLEMENTED / BROWSER-QA-PENDING / FOUNDER-CANVAS-PASS-PENDING
PR : #21 (ne pas fusionner sans validation visuelle)

## Modifications réellement publiées
- Atelier autonome : `frontend/public/tools/arduino-graphics.html`.
- Chargement PNG 3x du dépôt et import manuel PNG/WebP.
- Zoom 200–1600 %, inspection RGBA, pipette, grille, dessin pixel par pixel.
- Repères de contacts électriques : D0–D13, GND et 5V, depuis le contrat canonique 180 × 120.
- Audit des pixels clairs au centre des contacts sélectionnés (DIGITAL, POWER, tous).
- Réparation ciblée uniquement sur les pixels centraux suspects, avec confirmation explicite.
- Historique d'annulation, restauration et export PNG séparé.
- Aucun changement au moteur électrique, aux définitions de contacts ou aux images de production.

## Vérifications réalisées
- Fichier GitHub récupéré après écriture.
- Syntaxe JavaScript analysée : OK.
- Contrôles structurels : audit, réparation, confirmation, annulation, export présents.

## Limites importantes
- Aucun test automatisé exécuté sur Windows ou dans le navigateur durant cette intervention.
- Aucun asset PNG de production remplacé ; le défaut initial n'est pas encore déclaré corrigé.
- Le diagnostic automatique est limité aux 16 contacts électriques canoniques. Les trous décoratifs des headers ANALOG IN et POWER ne sont pas couverts.
- Le seuil de luminosité (110/255) est heuristique : inspection visuelle indispensable.
- La version courante lit les coordonnées de contacts en copie explicite : synchronisation à vérifier si le contrat évolue.

## Vérification fondatrice
1. `git fetch origin && git switch codex/A13-VISUAL-CORR-004 && git pull --ff-only origin codex/A13-VISUAL-CORR-004`
2. `cd frontend && npm run dev -- --open`
3. Ouvrir `http://localhost:<port>/tools/arduino-graphics.html`.
4. Cliquer sur « Auditer les trous », examiner les contacts, tester « Corriger les centres clairs », puis « Annuler ».
5. Comparer le PNG exporté et le Canvas du simulateur. Ne pas écraser l'image de production avant validation.
