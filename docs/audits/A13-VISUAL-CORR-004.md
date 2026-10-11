# A13-VISUAL-CORR-004 — connecteurs Arduino UNO R3

Audit et correction du 11 octobre 2026, Europe/Paris. Statut : **VISUAL_CORR_004 — PENDING_FOUNDER_CANVAS_PASS**.

## Préflight

Départ : `main`, HEAD local et distant vérifié `6a7830632d5cece187e95a1d5c40c4df8719881f`, merge de la PR #20. Aucun changement suivi initial. Branche corrective créée : `codex/A13-VISUAL-CORR-004`. Tous les fichiers historiques non suivis sont conservés. Aucun merge, reset, clean ou rebase.

La capture utilisateur citée dans l'ordre n'est pas jointe à cette exécution. Le défaut a été reproduit indépendamment dans le Canvas réel : cercles gris clair sur DIGITAL et sur les contacts 5V/GND de POWER, absents des ouvertures ANALOG IN.

## Cause démontrée

Les quatre variantes horizontales PNG/WebP ont été inspectées à leur résolution native : 180 × 120 et 540 × 360. Les empreintes correspondent exactement au manifest existant. Les centres des 16 contacts, des huit ouvertures POWER et des six ouvertures ANALOG IN ont été sondés : RGB maximal <128 et alpha ≥250 dans chaque variante. PNG : alpha 255 ; WebP : alpha 253 aux points contrôlés. Cette très faible différence d'alpha ne produit pas les cercles blanchâtres observés. Les ouvertures natives sont sombres ; la réduction/interpolation conserve un intérieur sombre.

Arduino déclare `markerless: false` et rend 16 boutons Pin par-dessus le raster. Le CSS générique ajoute un centre bleu gris `rgb(30,41,59)` et un contour clair `rgb(148,163,184)` circulaire. Les styles calculés dans le navigateur et la capture avant correction confirment cette superposition, cause des trous blanchâtres. ANALOG IN n'a pas de marqueurs électriques DOM et conserve ses six ouvertures raster.

## Correction et invariants

Seul fichier produit modifié : `frontend/src/components/parts/ArduinoPart.css`.

- Les marqueurs Arduino au repos ont maintenant un centre `#0b0c0d`, un contour `#343536` et un rayon de 0,5 px, correspondant aux ouvertures carrées en retrait du raster.
- DIGITAL et les contacts POWER perdent leurs cercles clairs ; ANALOG IN et les autres ouvertures POWER restent sombres, comme dans les images natives.
- Les styles de survol, de câblage en attente et de connexion sont explicitement conservés (orange/ambre/vert). Ces couleurs indiquent une interaction, pas un défaut d'ouverture au repos.
- Taille 4 × 4 px, marges −2 px, bordure 0,6 px, coordonnées des 16 contacts et transformation au survol inchangées. Le navigateur confirme les positions et dimensions identiques.

Aucune modification de PNG/WebP, manifest, renderer JSX, registre, fonctions électriques, géométrie, fils, firmware, sauvegarde ou autres composants. La correction raster envisagée au préflight a été écartée après identification de la cause CSS ; aucune génération d'image n'a été effectuée.

## Vérification dans le Canvas et tests

Canvas réel Vite, navigateur Chromium intégré, viewport de contrôle 1440 × 900, vue ajustée au contenu : inspection DIGITAL, POWER, ANALOG IN en OFF et RUN. Plus de trous anormalement blancs au repos. RUN conserve le câble USB et la LED ON ; les tests existants vérifient aussi la LED intégrée pilotée par D13.

Câblage réel vérifié : clic D13 → état pending orange/ambre, puis D0 → un fil créé ; D13 devient connected vert et conserve exactement sa position. Le Canvas final de présentation est une instance séparée avec Arduino seul et aucun fil de test. Serveur de cette mission : http://127.0.0.1:5175/ (5174 occupé par un serveur local existant).

Résultats :

| Contrôle | Résultat |
| --- | --- |
| Trois fichiers graphiques Arduino | 32/32 PASS |
| visualContract, GPIO flottants et signaux externes inclus | 133/133 PASS au total, six fichiers |
| Gate de qualité sélectionnée Arduino | 5/5 PASS, 363 contrôles des autres composants non sélectionnés |
| Build frontend | PASS ; avertissement de chunk >500 kB déjà documenté |
| `git diff --check` | PASS |
| Circuits sauvegardés, OFF/RUN, D13 et contacts | Tests existants PASS, aucun contrat assoupli |

Commandes exécutées :

```powershell
npm test --prefix frontend -- --run src/components/parts/__tests__/ArduinoGeometryContract.test.js src/components/parts/__tests__/ArduinoPart.raster.test.jsx src/components/parts/__tests__/ArduinoPinVisibility.test.jsx src/visualization/__tests__/visualContract.test.js src/simulator/__tests__/arduinoGpioFallback.test.js src/simulator/__tests__/resolutionExternalSignals.test.js
npm test --prefix frontend -- --run src/__tests__/renderQualityGate.test.jsx -t ARDUINO
npm run build --prefix frontend
git diff --check
```

Baseline complète exacte de main : workflow [38100486667](https://github.com/mamadouyacineba858-tech/myblab_v03/actions/runs/38100486667), artefact `copilot-report` téléchargé et conservé. **7 002 tests, 6 964 PASS / 38 FAIL** ; lint **147 erreurs / 2 avertissements**. Ces erreurs advisory ne sont pas masquées ni assimilées à un PASS. Les contrôles ciblés de cette correction ne révèlent aucune nouvelle régression ; la comparaison nominative de la CI de la nouvelle PR doit utiliser cet artefact exact. Le workflow reste inchangé.

Preuves locales conservées dans `A13_VISUAL_CORR_004_QA/` : asset-audit.json, pin-styles-after.json, captures avant/après OFF/RUN et câblage, targeted.txt, gate.txt, build.txt et baseline-copilot/copilot-report.json. Les captures et logs bruts restent locaux ; ce rapport est inclus dans le commit publié. La validation visuelle du fondateur reste à obtenir, sans fusion automatique.

## Empreintes des images auditées et conservées à l'identique

| Image | SHA-256 |
| --- | --- |
| arduino.horizontal-candidate.1x.png | a9d36f90cb847363cef48489bad29ccfcbe12b895aae8fb6f93d67c49d0ebd54 |
| arduino.horizontal-candidate.1x.webp | f2f05ec47dea119186e72e9f40c29de5bf70592299c4aeb73216ee7448098c5b |
| arduino.horizontal-candidate.3x.png | d50bdfd4aed9df7a73cc0ab9624623b5d365405bf4e282fe2bc6328e2393347c |
| arduino.horizontal-candidate.3x.webp | a48fb58d19bc061b7f3acbf9a6805467ffc34d570919b4c4018b19cbcdd5c62b |
