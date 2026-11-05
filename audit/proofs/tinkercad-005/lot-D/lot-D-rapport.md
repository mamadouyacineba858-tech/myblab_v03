# MYBLAB-TINKERCAD-005-D — Rapport de qualification

**Verdict PARTIAL.** Les six démonstrations ont été exécutées sur MYBLAB dans Chromium. La rotation de composants n’est pas prise en charge par la géométrie actuelle. Le navigateur intégré de VS Code n’a pas pu être piloté dans cette session.

Base C vérifiée à `8ae40600225618c8319c6fd6e9835c35e67cbba2` sur `copilot/myblab-tinkercad-005-c`, worktree propre. Le worktree D utilise `codex/myblab-tinkercad-005-d`. Serveur Vite du lot D à `http://127.0.0.1:4177/`.

## Évolution livrée

Les instruments et les propriétés utilisent la même colonne de droite. Sur ordinateur, le basculement laisse la largeur du canvas stable et les contrôles ne se superposent plus aux composants. À 740 px et moins, le canvas, la bibliothèque et le panneau s’empilent dans la zone défilante. Les instruments restent accessibles par le bouton Instruments. Le générateur, les mesures et les courbes utilisent les solveurs existants.

## Démonstrations

| Critère | Résultat et méthode de reproduction |
| --- | --- |
| D01 — LED et résistance | **PASS.** Placer une source 5 V, une résistance de 220 Ω et une LED. Câbler +5 V → R → anode, puis placer l’ampèremètre entre cathode et GND. Simuler. LED allumée, 13,043 mA en série et 2,130 V aux bornes de la LED. [Courant](screens/d01-led-courant.png) · [Tension](screens/d01-led-tension.png) · [Circuit](circuits/led-serie.json). |
| D02 — RC | **PASS.** Régler R à 1 kΩ dans les propriétés. Raccordement de la sortie du générateur à R, puis C polarisé de 100 µF entre la sortie R et GND. Carré 2 Hz, amplitude crête 1 V et offset 1 V. Avec CH1 sur C et fenêtre de 1 s, la charge et la décharge s’étendent de 0,152 à 1,848 V à 2 Hz. [Générateur](screens/d02-generateur.png) · [Courbe](screens/d02-oscilloscope.png) · [Circuit](circuits/rc.json). |
| D03 — Arduino Blink | **PASS.** Arduino UNO D2 → 220 Ω → LED → GND. Sélectionner l’UNO, ouvrir Code et utiliser le programme du fichier. Compilation réussie et alternance des états LED en simulation, pilotée par les délais de 500 ms. [Programme](screens/d03-programme.png) · [Allumée](screens/d03-blink-on.png) · [Éteinte](screens/d03-blink-off.png) · [Circuit](circuits/arduino-blink-pwm.json). |
| D04 — PWM | **PASS.** Avec le même programme, afficher D9 par rapport à GND sur CH1, fenêtre 20 ms. Le firmware alterne les valeurs 64 et 192. Mesure 0–5 V, environ 490 Hz. Le comptage des colonnes d’échantillons stables sur deux fenêtres donne environ 25 % et 79 %, une estimation à la résolution de l’acquisition. [Faible](screens/d04-pwm-25.png) · [Élevé](screens/d04-pwm-75.png). |
| D05 — Sauvegarde | **PASS.** Sauvegarder le circuit LED, recharger dans une page vierge, ouvrir le JSON réellement téléchargé puis Simuler. Trois composants, deux fils et les sondes sont restaurés. La mesure revient à 13,043 mA. [Fichier](circuits/led-serie.json) · [Après réouverture](screens/d05-reouvert.png). |
| D06 — Ergonomie | **PASS sur le périmètre démontré.** Déplacement d’une résistance par glisser souris, annulation et rétablissement vérifiés sur sa position, breadboard ajoutée et panneau manipulé. Aucun recouvrement canvas/panneau ni débordement horizontal à 1 440, 800, 700 et 390 px. Le canvas mesure respectivement 860, 346, 685 et 375 px lorsque le panneau est ouvert. [Bureau](screens/d06-desktop.png) · [Tablette](screens/d06-tablet.png) · [Fenêtre intermédiaire](screens/d06-intermediaire.png) · [Mobile](screens/d06-mobile-instruments.png). |

## Qualification et limites

- Les manipulations navigateur utilisent les contrôles de MYBLAB. Les broches, la sélection Arduino et le glisser du canvas ont été exercés avec des événements souris Chromium. Le générateur, le scope et les relevés DC utilisent les résultats des solveurs. Les scénarios achevés n’ont remonté aucune exception JavaScript.
- La suite automatique couvre aussi les scénarios RL analytiques, diodes, transistors, LM358P, numérique, ADC Arduino, ancrage des rails, navigation, suppression et persistance. La démonstration Arduino dans le navigateur couvre Blink et PWM, tandis que l’ADC est exercé dans les tests.
- La rotation reste hors du comportement livré. Le document et les projections de broches, contacts breadboard et extrémités de fils supposent une translation. Une rotation purement graphique désalignerait ces éléments.
- La fenêtre du worktree D a été ouverte dans VS Code. La capture de fenêtre et la création d’un onglet intégré de secours ont expiré. Les preuves visuelles proviennent du Chromium local sur le serveur du lot D.

## Résultats et référence

Le rapport et la comparaison du lot C établissent 7 137 tests, 7 115 réussites et 22 échecs historiques. Le périmètre Copilot des 62 échecs appartient à une autre exécution et ne sert pas de dénominateur ici.

La qualification globale du lot D retrouve **7 137 tests, 7 115 réussites et 22 échecs historiques dans 14 fichiers**. La comparaison nominative avec C confirme zéro nouvel échec, zéro test de référence absent et zéro échec de suite sans assertion. Voir [comparaison C/D](comparaison-C-D.json) et [résultats par fichier](resultats-tests.json).

Les 43 tests ciblés finaux passent dans six fichiers, couvrant les scénarios scientifiques du lot B, les instruments, les sondes, le round-trip de sauvegarde et la cohésion du workspace. Le build final `tsc -b && vite build` passe avec 282 modules et un bundle principal de 664,23 kB. L’avertissement de taille au-dessus de 500 kB persiste.

Le commit local `47baacd` contient l’évolution de l’interface et réserve l’avertissement du modèle DC aux onglets qui mesurent en DC. La vérification navigateur finale confirme son absence sur l’oscilloscope RC et sa présence dans le multimètre DC pour le condensateur polarisé.

## Anomalies restantes et statut

Les 22 échecs historiques sont reproduits sur C et D. Ils portent sur les empreintes et budgets des assets, le nombre de contacts Arduino attendu dans des tests anciens, la présentation POWER et des attentes de survol/glisser-déposer. La liste nominative est disponible dans la comparaison.

La rotation générale est demandée dans le cahier des charges et reste non réalisée. Le fichier `frontend/src/utils/geometry.js` et le pipeline des contacts breadboard utilisent actuellement des offsets locaux sans orientation d’instance. Les tests et captures de D06 valident le déplacement, l’historique et les panneaux, et ne constituent pas une qualification de la rotation.

Le serveur du lot D reste sur le port 4177. Les captures et circuits de ce rapport permettent de rejouer D01 à D05 depuis Ouvrir puis Simuler. Dans le circuit Arduino, utiliser l’onglet Oscilloscope pour D9/GND et le bouton Code après sélection de l’UNO pour consulter le sketch. Le dossier contient le programme sauvegardé et les paramètres des instruments.

**PARTIAL** est conservé en raison de la rotation non réalisée et de la démonstration VS Code non obtenue. Les preuves D01 à D06 concernent le navigateur Chromium et les fonctions effectivement décrites dans le tableau.
