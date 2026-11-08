# A15 — Qualification Arduino Blink par les contacts physiques de breadboard

**Statut : IMPLEMENTED / PENDING LOCAL QA**. Aucun résultat de test ou build n'est revendiqué sans exécution locale.

## Objet
Prouver la chaîne : sketch Arduino D2 -> moteur firmware -> résistance -> bande conductrice breadboard -> LED -> GND -> état visuel LED. Le test A14 canonique utilisait une liaison filaire directe entre résistance et LED; A15 ajoute la dérivation des connexions virtuelles via la breadboard.

## Fichiers
- `frontend/src/arduino/firmware/__tests__/firmwareBreadboardBlink.integration.test.js` : nouveau test de bande conductrice et simulation temporelle HIGH/LOW/HIGH.
- `frontend/src/arduino/ui/ArduinoCodeWorkspace.jsx` : exemple Blink D2, compilation puis application conditionnelle.
- `frontend/src/utils/breadboardConnectivity.js` : source de vérité réutilisée, non modifiée.
- `frontend/src/utils/breadboardGeometry.js` : pitch et groupe électrique existants, non modifiés.
- `frontend/src/utils/viewport.js` : zoom initial 200 % conservé.

## Scénario électrique
Résistance R1 : position (0,22), broche B en (84,36), rangée 3. LED : position (56,-14), anode en (84,48), rangée 4. Deux trous différents d'une même bande (colonne 7) : pas de superposition physique de ces contacts. D2 -> R1.A, LED.cathode -> POWER.GND. Le modèle de breadboard produit la liaison R1.B -> LED.anode; aucun fil direct entre ces deux broches.

## Gates
1. Tests Arduino UI, compilation, Blink canonique et Blink via breadboard.
2. Tests géométrie, collisions, connectivité, multi-breadboard, câblage et performance Canvas.
3. Build Vite.
4. Essai navigateur : placer Arduino, breadboard, LED, résistance; charger « Exemple : LED clignotante D2 »; compiler et appliquer; simuler; constater clignotement; arrêter/reprendre; enregistrer/ouvrir.
5. Profilage navigateur sous zoom initial 200 %; vérifier le ciblage des trous, la charge DOM/SVG et la fluidité.

## Risques ouverts
- Le test automatisé utilise les contacts électriques virtuels sans simuler la manipulation souris et ne prouve donc pas à lui seul le parcours graphique.
- Le rendu SVG de breadboard et la couche de hit-test peuvent encore coûter cher sur plusieurs cartes.
- Le compilateur Arduino reste un sous-ensemble de C++ Arduino, pas une émulation complète de l'IDE Arduino.

**Ne pas fusionner PR #21 avant résultats locaux et Founder Canvas PASS.**
