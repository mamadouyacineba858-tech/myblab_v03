# Blueprint — MB-L1-ARDUINO-001 — Tinkercad-like Arduino Canvas Readability

## Autorité visuelle
Référence approuvée le 2026-09-14 par le Project Lead : Arduino UNO fortement agrandi, sérigraphies lisibles naturellement, aucun badge externe, deux états visuels de même taille : ARRÊT (USB débranché, ON éteint) et MARCHE (USB branché, ON vert).

## Constat réel
- `ArduinoPart.jsx` utilise un raster UNO réaliste.
- Le premier correctif à badges `D2/D3/GND/5V` a été rejeté.
- Le second correctif `1.30×` a également été rejeté : les écritures restaient trop petites.
- Le raster dispose de variantes `1x` et `3x`, mais d'un seul état `default`.
- `simulationActive` existe déjà dans le contexte stable et constitue l'oracle UI du mode ARRÊT/MARCHE.
- Les quatre PhysicalContacts historiques existent et restent hors modification.

## Décision CSA révisée
1. Ne jamais ajouter de badges/pastilles/labels flottants autour des pins.
2. Agrandir le renderer Arduino à `2.20×` afin que la sérigraphie cuite dans l'asset devienne lisible.
3. Conserver exactement la même échelle et la même géométrie en ARRÊT et MARCHE.
4. Dériver uniquement la présentation USB/LED de `simulationActive` :
   - false => câble débranché + LED ON éteinte ;
   - true => câble branché + LED ON verte.
5. Les overlays USB/LED sont purement visuels (`pointer-events:none`) et ne deviennent jamais des endpoints électriques.

## Invariants
- Core Arduino inchangé : `D2`, `D3`, `GND`, `5V`.
- Coordonnées électriques canoniques inchangées.
- PhysicalContacts inchangés.
- Aucun nouveau pin logique.
- Aucun changement du firmware/runtime/scheduler.
- `simulationActive` n'est jamais persisté dans le Document par ce renderer.
- Aucun texte externe `D2/D3/GND/5V` ajouté par MYBlab.

## Cible Canvas
Au niveau de zoom de travail normal, l'utilisateur doit lire les principales sérigraphies du PCB directement sur la carte : rangées DIGITAL, POWER, ANALOG IN, Arduino/UNO et repères de broches. La carte ne doit plus sembler miniature.

## Gate visuel
- taille équivalente à la référence approuvée ;
- écritures lisibles sans zoom extrême ;
- ARRÊT : USB clairement débranché, ON éteint ;
- MARCHE : USB clairement branché, ON vert ;
- aucune variation de taille entre les deux modes ;
- aucun badge artificiel ;
- drag/sélection/zoom acceptables.

## Hors périmètre
- extension à toutes les broches Arduino UNO ;
- nouveau modèle électrique ;
- firmware workspace ;
- Scheduler ;
- Blink ;
- nouveaux GPIO.
