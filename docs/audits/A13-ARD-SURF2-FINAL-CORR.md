# A13-ARD-SURF2-FINAL-CORR

Qualification du 11 octobre 2026, Europe/Paris. PR : https://github.com/mamadouyacineba858-tech/myblab_v03/pull/20

## Préflight et observation

Branche vérifiée : `feat/A13-ARD-SURF1-digital-pin-surface`. HEAD initial et source distante : `ac316728745516a3bd0e857f7860e10ad4664bfa`. PR OPEN, Ready for Review, base `main`, MERGEABLE. Aucun changement suivi initial ; tous les fichiers locaux historiques non suivis conservés.

Observation Codex P2 lue intégralement : https://github.com/mamadouyacineba858-tech/myblab_v03/pull/20#discussion_r4239484238. Discussion `PRRT_kwDOTiUgd86rIcJz`, initialement non résolue. Le registre expose D0–D13, mais `resolveSignals()` limitait le repli FLOATING à D2/D3, laissant les autres GPIO UNKNOWN sans firmware.

## Correction limitée

- `frontend/src/simulator/resolution.js` : parcourir les pins canoniques Arduino de rôle `gpio`, après propagation des autorités explicites. Seules les pins encore UNKNOWN deviennent FLOATING. Le garde de conflit électrique et la restriction Arduino restent inchangés. Aucun nouvel import, aucune modification des identifiants, du firmware, des circuits sauvegardés, des images ou des autres composants.
- `frontend/src/simulator/__tests__/arduinoGpioFallback.test.js` : 57 tests, portant sur les 14 GPIO D0–D13 (donc D0, D1, D2, D3, D4 et D13). Vérifient absence de pilotage, HIGH et LOW firmware, propagation vers la charge et le fil, couleur/classe flottante, neutralité OFF, conflit de sources restant UNKNOWN, autres GPIO indépendants, alimentation Arduino non inventée et composant LED indépendant inchangé.

Le repli garde la sémantique D2/D3 existante : FLOATING est attribué à la pin Arduino, sans devenir une autorité HIGH/LOW sur la charge. Le fil sortant Arduino lit FLOATING ; les tests existants de WiresLayer vérifient son tracé pointillé. Aucun changement du choix historique de l'extrémité de lecture d'un fil.

## Contrôles locaux et reproduction

Avant correction, les nouveaux tests échouent : 40 FAIL / 17 PASS, preuve du défaut et de la couverture. Après correction : **238/238 PASS**, 15 fichiers couvrant résolution externe, architecture, propagation passive, DC/analogique, paramètres, les trois fichiers Arduino, visualContract et les trois fichiers de fils. Les 32 tests graphiques Arduino restent PASS, ainsi que le test d'import des circuits sauvegardés.

Gate `renderQualityGate.test.jsx -t ARDUINO` : **5/5 PASS**, 363 tests des autres composants non sélectionnés. Build **PASS** (avertissement existant de chunk >500 kB). ESLint des deux fichiers JavaScript livrés : **PASS**, exit 0. Aucun test assoupli, aucune désactivation de règle ni modification de workflow.

Commandes :

```powershell
npm test --prefix frontend -- --run src/simulator/__tests__/arduinoGpioFallback.test.js
npm test --prefix frontend -- --run src/simulator/__tests__/arduinoGpioFallback.test.js src/simulator/__tests__/resolutionExternalSignals.test.js src/simulator/__tests__/resolutionArchitecture.test.js src/simulator/__tests__/resolutionPassivePropagation.test.js src/simulator/__tests__/resolutionDc.test.js src/simulator/__tests__/resolutionDcAnalog.test.js src/simulator/__tests__/resolutionDcExtended.test.js src/simulator/__tests__/resolutionEffectiveParameters.test.js src/components/parts/__tests__/ArduinoGeometryContract.test.js src/components/parts/__tests__/ArduinoPart.raster.test.jsx src/components/parts/__tests__/ArduinoPinVisibility.test.jsx src/wires/__tests__/wireState.test.js src/wires/__tests__/wirePath.test.js src/wires/__tests__/WiresLayer.test.jsx src/visualization/__tests__/visualContract.test.js
npm test --prefix frontend -- --run src/__tests__/renderQualityGate.test.jsx -t ARDUINO
npm run build --prefix frontend
npx --prefix frontend eslint frontend/src/simulator/resolution.js frontend/src/simulator/__tests__/arduinoGpioFallback.test.js
git diff --check
```

## Baseline et publication

Baseline CI exacte, workflow **38092395662** sur `ac316728745516a3bd0e857f7860e10ad4664bfa` : **6 907 PASS / 38 FAIL**, 6 945 tests ; lint **147 erreurs / 2 avertissements**. Artefact original conservé dans `A13_SURF2_CORR003_REPORT/integration-20261011/final-copilot/copilot-report.json`, SHA-256 `c1fcf5ca0ce1a45614977480ccefc0995e67533382e004778dff064368a5a959`.

Baseline Windows historique : 6 904 PASS / 40 FAIL et lint 150 erreurs / 3 avertissements, documentés dans les rapports de qualification. Ne pas confondre ces comptes avec l'environnement Linux CI. Le workflow global SUCCESS ne suffit pas : lint, tests et couverture sont advisory (`continue-on-error`). Les identités des échecs du nouvel artefact doivent être comparées à l'artefact baseline avant résolution de la discussion.

Correctif publié sans force : `62b66a598cf938e6751f0d0e50fc87ce1cafad24`. Le SHA distant et celui de la PR ont été vérifiés identiques. Workflow **38095010676** : https://github.com/mamadouyacineba858-tech/myblab_v03/actions/runs/38095010676, terminé SUCCESS. Build CI PASS. Les étapes lint, tests et couverture ont réellement terminé avec exit 1 (advisory), sans modification du workflow.

Artefact lu intégralement et comparé par fichier + nom complet de test à la baseline exacte : **7 002 tests, 6 964 PASS / 38 FAIL**, **zéro nouvel échec et zéro échec disparu**. Les 57 nouveaux tests passent. Les trois fichiers graphiques Arduino (32 tests), les 11 tests de signaux externes et les 22 tests WiresLayer passent. Lint strictement identique à la baseline : **147 erreurs / 2 avertissements**. La passe de couverture confirme 6 964 PASS / 38 FAIL ; elle ne fournit pas un pourcentage de couverture exploitable. Ces échecs sont conservés et ne sont pas masqués par le statut global SUCCESS.

SHA-256 du nouvel artefact `copilot-report.json` : `745ed11298c5dbb5a846d9cd1a696178759d4c9855765a254a2752b8b250567c`. Comparaison nominative, artefact original et logs conservés localement dans le dossier de preuves. La liste complète des 38 échecs figure dans `ci-comparison.json` et dans l'artefact GitHub, sans nouvelle régression constatée.

Main recontrôlée : `bd685f041c4a09ab71dca6249bf97c5945973206`, non protégée, règles de branche vides. PR OPEN, Ready for Review, MERGEABLE. Une seule discussion de revue existe, celle corrigée ; aucune autre observation bloquante lors du contrôle. Réponse publiée avec les preuves : https://github.com/mamadouyacineba858-tech/myblab_v03/pull/20#discussion_r4239591373. Mutation GitHub confirmée : `PRRT_kwDOTiUgd86rIcJz`, `isResolved: true`, après vérification CI. Aucun merge effectué. La décision de fusion reste au CSA.

Preuves locales : `A13_SURF2_CORR003_REPORT/final-corr-20261011/` (red-test.txt, targeted.txt, arduino-gate.txt, build.txt, lint-targeted.txt). Ces résultats bruts restent locaux, ce rapport est destiné au commit publié.

Commandes de publication et contrôle exécutées : `git diff --cached --check`, `git diff --cached --name-status`, commit limité aux trois fichiers décrits, `git push origin HEAD:refs/heads/feat/A13-ARD-SURF1-digital-pin-surface`, `git ls-remote --heads origin feat/A13-ARD-SURF1-digital-pin-surface`, `gh pr view 20`, `gh run view 38095010676`, `gh run download 38095010676 --name copilot-report`, `gh run view 38095010676 --log`, puis comparaison `python A13_SURF2_CORR003_REPORT/final-corr-20261011/compare-ci.py` (exit 0). Aucun reset, rebase, clean ou suppression de fichiers historiques.

Cette mise à jour documentaire publie les résultats du commit fonctionnel ci-dessus. Elle ne change aucun fichier fonctionnel. Contrôles après une éventuelle fusion autorisée séparément : vérifier SHA de main et CI, rendu OFF/RUN déjà validé, D13 LED intégrée, fils GPIO flottants/HIGH/LOW et import de circuits sauvegardés.

SHA-256 des fichiers fonctionnels (octets locaux qualifiés) :

| Fichier | SHA-256 |
| --- | --- |
| frontend/src/simulator/resolution.js | 4dfeb7f4566ca7a592df7d0f294aab6aeb764db692d48d25483ce65a23b003b5 |
| frontend/src/simulator/__tests__/arduinoGpioFallback.test.js | 3fd57781b7da41ffb2e1633def14d58f26407ade7ea5671ddcaee3a894beab1f |
