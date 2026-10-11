# A13-VISUAL-CORR-005 — connecteurs, identification et câble USB Type-B

Complément du 11 octobre 2026 à la PR [#21](https://github.com/mamadouyacineba858-tech/myblab_v03/pull/21). Statut : **A13-VISUAL-CORR-005 — PENDING_FOUNDER_CANVAS_PASS**.

## Préflight et périmètre

Branche locale et source PR : `codex/A13-VISUAL-CORR-004`, destination `main`. HEAD initial local/distant/PR vérifié : `d335de65014a872b00699b4dccccc70a4d7b30fb`. PR OPEN, non draft. Aucun changement suivi initial. Tous les fichiers historiques non suivis sont conservés. Aucun merge, rebase, reset ou clean.

La correction des trous DIGITAL, POWER et ANALOG IN est conservée, ainsi que les images et les preuves du rapport `A13-VISUAL-CORR-004.md`. Ce complément ne change que la décoration USB dans ArduinoPart.jsx/CSS et ajoute des contrôles graphiques Arduino. Aucun autre composant ni fichier central modifié.

## Trois éléments livrés ensemble

1. **Trous homogènes** : marqueurs Arduino sombres et carrés, sans contour circulaire blanchâtre. Les quatre PNG/WebP et les ouvertures natives POWER/ANALOG IN restent identiques à CORR-004.
2. **Identification électrique au survol** : les 16 boutons conservent une infobulle native `title` et un `aria-label` égaux à leur `data-wire-pin` : D0–D13, GND et 5V. Le test fait réellement entrer/sortir la souris sur chaque bouton et vérifie que son identité et sa position ne changent pas. Le Canvas confirme les 16 correspondances. Aucun faux contact ajouté aux ouvertures décoratives, notamment ANALOG IN.
3. **Câble USB Type-B** : remplace les trois rectangles simplifiés par une gaine cylindrique avec relief lumineux, un renfort anti-pliure strié, un corps moulé chanfreiné avec panneau de prise et une courte embase métallique biseautée par l'éclairage. Matériaux, ombres et proportions sont définis en CSS local Arduino, sans nouveau raster ni SVG.

## Alignement, continuité et états

Repère local inchangé : carte 180 × 120. Face gauche du port raster à x≈2 ; axe y≈36,5. Le câble est un enfant absolu de la carte, à `left:-78`, `top:27.5`, taille 84 × 18 ; z-index 1 sous l'image z-index 2. L'embase finit à x=6 et entre donc 4 px sous le port, sans intervalle visible.

Mesures dans le Canvas réel :

| Élément | Étendue x locale | Axe y |
| --- | --- | --- |
| Gaine | −78 à −37 | 36,5 |
| Renfort strié | −41 à −25 | 36,5 |
| Corps moulé | −30 à −3 | 36,5 |
| Embase métallique | −9 à 6 | 36,5 |

Chaque élément chevauche le suivant, donc aucune fiche flottante ou rupture de câble. Les mesures restent identiques après un déplacement réel en RUN et aux zooms 1×, 1,9× et 2× (tolérance de projection <0,001 px logique). Un test de glissement réel vérifie aussi l'aperçu de déplacement AVANT pointerup, puis après relâchement.

Contrat OFF/RUN préservé : câble masqué en OFF (`display:none`, état disconnected), câble inséré visible en RUN. La LED ON et la LED L pilotée par D13 gardent leurs contrats. Le câble est `aria-hidden`, `pointer-events:none`, sans bouton ni identifiant électrique, sans donnée Document sauvegardée. Il ne peut capter un geste de câblage ou déplacer un contact. Le raccord reste solidaire du transform de la carte ; aucune coordonnée viewport ou animation indépendante.

## Contrôles

- Tests graphiques Arduino : **35/35 PASS** (Geometry 3, raster 18, visibilité 14), incluant trois nouveaux contrôles : USB décoratif/occlusion, identification de chaque broche au survol, attache pendant le drag preview et après relâchement.
- Ensemble ciblé incluant visualContract, GPIO flottants et signaux externes : **136/136 PASS** dans six fichiers.
- Gate `renderQualityGate.test.jsx -t ARDUINO` : **5/5 PASS**, 363 tests des autres composants non sélectionnés.
- Build : **PASS**, avertissement de chunk >500 kB déjà documenté.
- Lint ciblé final : **PASS, exit 0** sur les trois fichiers JSX modifiés. Le nouveau test de drag utilise réellement `React.createRef`, supprimant naturellement l'ancienne erreur d'import React inutilisé du test raster. Aucune désactivation de règle ajoutée.
- `git diff --check` : PASS. Aucun test assoupli ni workflow modifié.
- Canvas réel sur Vite http://127.0.0.1:5175/, navigateur intégré : OFF/RUN, déplacement, zoom, mesures d'occlusion/continuité et identification des 16 contacts. `check-layout.py` : PASS.
- Test existant d'import/export des circuits anciens, firmware et waypoints : PASS. Registres, dimensions, coordonnées électriques/contacts, simulation, sauvegarde, et fichiers globaux Pin/CircuitComponent inchangés.

Commandes de qualification :

```powershell
npm test --prefix frontend -- --run src/components/parts/__tests__/ArduinoGeometryContract.test.js src/components/parts/__tests__/ArduinoPart.raster.test.jsx src/components/parts/__tests__/ArduinoPinVisibility.test.jsx src/visualization/__tests__/visualContract.test.js src/simulator/__tests__/arduinoGpioFallback.test.js src/simulator/__tests__/resolutionExternalSignals.test.js
npm test --prefix frontend -- --run src/__tests__/renderQualityGate.test.jsx -t ARDUINO
npm run build --prefix frontend
# Depuis frontend :
npx eslint src/components/parts/ArduinoPart.jsx src/components/parts/__tests__/ArduinoPart.raster.test.jsx src/components/parts/__tests__/ArduinoPinVisibility.test.jsx
# Depuis la racine :
python A13_VISUAL_CORR_005_QA/check-layout.py
git diff --check
```

Baseline exacte du parent d335de6 : workflow [38125493722](https://github.com/mamadouyacineba858-tech/myblab_v03/actions/runs/38125493722), artefact copilot-report SHA-256 `9519f40cac325a02d9ace1c9bb6aeaf74eb78951dde08227aead0ecd6136673a`. **7 002 tests, 6 964 PASS / 38 FAIL ; lint 147 erreurs / 2 avertissements**, advisory. Cette baseline a déjà été comparée nominativement à main sans écart. Le statut global SUCCESS ne suffit pas à établir la conformité des étapes advisory.

## Publication et comparaison CI

Correctif publié sans force sur la PR #21 : `8ad494298d1a6a664eb3d1717b2291d5f3afcf19`, source et destination conservées. Workflow [38127936026](https://github.com/mamadouyacineba858-tech/myblab_v03/actions/runs/38127936026), terminé SUCCESS ; build PASS.

Artefact lu et comparaison nominative au parent effectuée : **7 005 tests, 6 967 PASS / 38 FAIL**, zéro nouvel échec, zéro échec disparu et **aucun message d'échec modifié**. Les 35 tests graphiques Arduino passent ; les trois nouveaux tests passent. Lint : **146 erreurs / 2 avertissements**, aucun nouveau diagnostic et une seule erreur supprimée : import React inutilisé à la ligne 24 du test ArduinoPart.raster, maintenant réellement utilisé via `React.createRef`. Aucune erreur masquée, aucune règle désactivée.

Lint, tests et couverture gardent leur exit 1 advisory dans les logs ; le build est conforme. SHA-256 de l'artefact correctif : `b6d6b5dd07b9d79fbd7870908e36917d19f7a001b172c5081de7ba8c16cd0fc3`. Comparaison complète locale : `A13_VISUAL_CORR_005_QA/ci-comparison.json`. Commandes : `gh run download 38127936026 --name copilot-report`, `gh run view 38127936026 --log`, `python A13_VISUAL_CORR_005_QA/compare-ci.py` (exit 0).

La mise à jour documentaire publiant ces résultats ne change aucun fichier fonctionnel. Aucun merge effectué ; la décision esthétique finale appartient au fondateur, statut **A13-VISUAL-CORR-005 — PENDING_FOUNDER_CANVAS_PASS**.

Preuves brutes locales : `A13_VISUAL_CORR_005_QA/` (captures, before-drag.json, after-drag.json, after-zoom.json, zoom-1x.json, check-layout.py, targeted-final.txt, drag-test.txt, gate.txt, build.txt, lint-targeted-final.txt). Le rapport est publié dans la PR ; captures et logs bruts restent locaux. La validation esthétique finale est réservée au fondateur. Aucun merge automatique.

## Fichiers intégrés par ce complément

- frontend/src/components/parts/ArduinoPart.jsx
- frontend/src/components/parts/ArduinoPart.css
- frontend/src/components/parts/__tests__/ArduinoPart.raster.test.jsx
- frontend/src/components/parts/__tests__/ArduinoPinVisibility.test.jsx
- docs/audits/A13-VISUAL-CORR-005.md

La PR conserve également le rapport CORR-004 et la correction de ses trous. Aucun asset existant supprimé, réencodé ou remplacé.
