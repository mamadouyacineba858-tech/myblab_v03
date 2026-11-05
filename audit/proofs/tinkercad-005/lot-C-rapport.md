# MYBLAB-TINKERCAD-005-C — Rapport de qualification

**Verdict `CLOSED_PASS` pour les critères C01 à C10.** La démonstration a été capturée dans Chromium. Le pilotage du navigateur intégré de VS Code a expiré.

- Worktree `myblab-005-c`, branche `copilot/myblab-tinkercad-005-c`. HEAD initial `cabdaee3000ea73b15418ab1cdca0d4c24c29e15`. Référence B `fa614d8f1d6c361e0b140a880afbbd543feee80e`.
- Reprise du travail Copilot à partir de deux fichiers suivis modifiés et dix fichiers non suivis. Les douze originaux ont été copiés et vérifiés par SHA-256 dans `%TEMP%/myblab-005-c-rescue-20261105-011428`, avec le patch Git binaire des fichiers suivis.
- Serveur Vite `http://127.0.0.1:4175/`. La source servie contenait le pont virtuel récupéré dans ce worktree. Le navigateur Chromium a affiché l'application et chargé les modules Vite.

## Critères

| Critère | Statut | Résultat |
| --- | --- | --- |
| C01 — Sondes interactives | PASS | Preuve navigateur récupérée, déplacement de V+ de l’alimentation à la broche A de la résistance avec lecture à 5,000 V. Le test `ProbeOverlay.test.jsx` confirme le déplacement entre broches. Voir [capture récupérée](screens/c-probe-dnd.png). |
| C02 — Voltmètre et multimètre | PASS | Multimètre revérifié à 5,000 V entre +5 V et GND sur le build. Après réouverture du circuit série, le même multimètre mesure 2,130 V aux bornes de la LED allumée. Voir [alimentation](screens/c02-multimeter-verified.png) et [LED en série](screens/c02-multimeter-led-series-verified.png). |
| C03 — Ampèremètre en série | PASS | Alimentation 5 V, résistance 220 Ω, LED et deux fils. L’ampèremètre ferme le retour entre la cathode et GND. Le solveur retourne 0,013043478258831731 A et la LED est visiblement allumée. Voir [LED et lecture](screens/c08-reopened-verified.png). |
| C04 — Oscilloscope | PASS | Oscilloscope du build revérifié sur le circuit RC. Acquisition CH1 de 0,00 à 2,00 V, fréquence estimée à 2,00 Hz, fenêtre 1 s. Les tests du solveur vérifient le gain analytique RC et les signaux PWM. Voir [courbe mesurée](screens/c04-rc-scope-verified.png). |
| C05 — Générateur | PASS | Circuit RC piloté par un signal carré de 2 Hz, amplitude crête 1 V, offset 1 V. Voir [générateur et circuit RC](screens/c05-rc-generator-verified.png). |
| C06 — Breadboard et câblage | PASS | Preuves navigateur récupérées, breadboard ajoutée et circuits DC et RC câblés. Les deux fils du nouveau circuit C03 ont été raccordés avec les broches du canvas dans Chromium. |
| C07 — Annuler et rétablir | PASS | Preuve navigateur récupérée, trois fils à l’état initial, deux après annulation et LED éteinte, trois après rétablissement et LED rallumée. |
| C08 — Sauvegarde et réouverture | PASS | Circuit créé depuis la palette et câblé par ses broches, fichier téléchargé par **Sauvegarder**, nouvelle page vierge, clic navigateur sur **Ouvrir**, sélection de ce fichier puis **Simuler**. Trois composants, deux fils, sondes A/COM affectées, LED allumée et même courant. Voir [fichier réellement téléchargé](circuits/c08-led-serie.json) et [capture après ouverture](screens/c08-reopened-verified.png). |
| C09 — Responsive | PASS | Preuves récupérées à 1 440 px et 390 × 844 px. En mobile, document et canvas à 390 px, panneau à 378 px. Voir [tablette](screens/lot-C-tablet-final.png) et [mobile](screens/lot-C-mobile-final.png). |
| C10 — Non-régression | PARTIEL | Build et tests ciblés réussis. Suite B complète et comparaison nominative des 14 fichiers historiques réussies. Zéro nouvel échec sur les 601 tests comparés. La première suite C complète a atteint son délai de 22 min. |

## Correctifs et vérifications

Le commit `80f68df` reprend le pont virtuel de Copilot dans le moteur de présentation. Le commit `d3a86d0` applique le même pont au voltmètre et au multimètre DC. Le moteur transitoire conserve sa branche ampèremètre de 0 V pour mesurer le courant. Le document exporté contient les deux fils physiques et l’affectation des sondes. Le pont virtuel reste dans le moteur. Le test C03 contrôle une LED éteinte sur le circuit ouvert, une LED allumée avec le pont et une mesure à 13,043 mA. Le test d’intégration C08 vérifie également les paramètres non par défaut (9 V, 330 Ω) et la conservation des réglages du générateur, de l’oscilloscope, du voltmètre et de l’ampèremètre.

- Build `npm run build` réussi, 282 modules. Le bundle principal final fait 664,09 kB et dépasse le seuil d’avertissement de 500 kB.
- `npm run test:ci -- --maxWorkers=4 src/instruments src/__tests__/CircuitFileRoundTripC08.integration.test.jsx src/simulator/__tests__/tinkercad005LotB.test.js` — 31 tests réussis dans 5 fichiers.
- Après les ajustements, les 5 tests C03 et C08 ont été relancés et passent.
- Les 16 tests complémentaires sur les interactions des composants, la palette et la coexistence de la simulation et du rendu passent dans 3 fichiers.
- Chromium a rapporté zéro exception JavaScript lors de la réouverture sur Vite (4175) et du scénario RC, générateur, oscilloscope et multimètre sur l’aperçu du build (4176).
- Le pilotage Windows de VS Code a expiré à la détection des fenêtres, après les tentatives de récupération. Les captures de la reprise proviennent du Chromium local, avec Vite exécuté depuis C.

## Non-régression et historique

Le [rapport du lot B](lot-B-rapport.md) consigne 7 108 réussites et 22 échecs sur 7 130 tests dans 14 fichiers. Il indique avoir reproduit les 22 échecs sur sa référence propre. Le rapport antérieur de C consigne 7 110 tests réussis et 22 échecs sur 7 132 tests dans 14 fichiers. Il cite l’intégrité et les budgets des assets figés, les pins Arduino, le zoom et le rendu de l’alimentation. Le lot de 62 échecs ciblés rapporté par Copilot correspond à un périmètre distinct. Les rapports JSON originaux `%TEMP%/base.json` et `%TEMP%/head.json` ont été retrouvés et associés à la commande enregistrée dans le journal de la session Copilot. La sélection utilisait la configuration Vitest par défaut. Sur chacun des deux worktrees, elle a exécuté 1 520 tests dans 62 fichiers, avec 1 458 réussites et 62 échecs dans 24 fichiers. La comparaison par chemin relatif et nom complet retrouve les 62 mêmes échecs, avec zéro échec propre à C et zéro échec propre à B. Voir la [comparaison du périmètre Copilot](c10-comparaison-copilot-62.json).

La relance complète de B a produit 7 109 réussites et 22 échecs sur 7 131 tests. Les 14 fichiers en échec ont ensuite été exécutés sur C. Sur 601 tests, 579 passent et les 22 mêmes tests échouent, identifiés par leur chemin et leur nom complet. Aucun échec supplémentaire dans ce périmètre. Les échecs communs concernent les SHA, tailles ou budgets d’assets, les contacts Arduino, le rendu POWER et les interactions de survol ou de glisser-déposer. Voir la [comparaison nominative B/C](c10-comparaison-b-c.json).

La première exécution intégrale de C a atteint le délai de 22 minutes sans produire de rapport. La couverture complète a ensuite été obtenue en deux sélections disjointes, les 14 fichiers ci-dessus, puis les 363 fichiers restants avec quatre workers en mode threads. Les 6 536 tests de cette seconde sélection passent. Le total de C atteint **7 115 réussites, 22 échecs historiques et zéro nouvel échec** sur 7 137 tests dans 377 fichiers. La comparaison normalise les chemins absolus et un horodatage dynamique présents dans neuf noms. Elle confirme six tests ajoutés et aucun test de B absent dans C.
