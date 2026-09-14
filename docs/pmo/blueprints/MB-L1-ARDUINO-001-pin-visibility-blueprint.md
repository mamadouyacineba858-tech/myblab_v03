# Blueprint — MB-L1-ARDUINO-001 — Pin Visibility & Physical Connectivity

## Constat réel
- `ArduinoPart.jsx` affiche un raster UNO réaliste mais ne rend aucun repère de pin fonctionnelle lisible à l'échelle Canvas normale.
- `componentDefinitions.js` possède déjà quatre PhysicalContacts pour `D2`, `D3`, `GND`, `5V`.
- `CircuitComponent.jsx` rend bien quatre `<Pin>` câblables, mais la présentation raster les masque (`markerless=true` dérivé du backend raster).
- Le câblage et les endpoints utilisent déjà les coordonnées PhysicalContact correctes.

## Cause racine
Le problème est une dette de PRÉSENTATION, pas de connectivité : les hit targets existent et sont corrects, mais leur marqueur visuel est volontairement invisible sur un backend raster. L'asset lui-même contient des sérigraphies trop petites pour identifier sans ambiguïté les quatre pins actuellement fonctionnelles.

## Décision CSA
Ajouter dans `ArduinoPart.jsx` une couche purement visuelle, non interactive, alignée exactement sur les quatre PhysicalContacts. Ne pas toucher au Core, au modèle de simulation, aux coordonnées électriques, au nombre de pins ou au câblage.

## Invariants
- Core Arduino inchangé : `D2`, `D3`, `GND`, `5V`.
- Coordonnées électriques canoniques inchangées.
- PhysicalContacts inchangés.
- `CircuitComponent`, `Pin`, `pinPresentationGeometry` inchangés.
- Aucun nouveau pin logique.
- Aucun faux endpoint.
- Overlay `pointer-events:none`.
- La couche visible doit converger pixel pour pixel avec les hit targets existants.

## Cible Canvas
À l'œil nu, l'utilisateur doit pouvoir repérer immédiatement `D2`, `D3`, `GND`, `5V` sur l'Arduino et démarrer/terminer un fil au même endroit que le repère visible.

## Hors périmètre
- extension à toutes les broches Arduino UNO ;
- firmware/runtime Arduino ;
- Scheduler ;
- simulation Blink ;
- nouveaux GPIO ;
- modification des états OFF/RUN.
