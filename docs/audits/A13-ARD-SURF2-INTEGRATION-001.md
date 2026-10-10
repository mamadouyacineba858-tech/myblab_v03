# A13-ARD-SURF2-INTEGRATION-001

Audit final du 11 octobre 2026, Europe/Paris. PR : https://github.com/mamadouyacineba858-tech/myblab_v03/pull/20

## Décision et limites

Décision technique : **MERGE_READY — PENDING_FINAL_CSA_AUTHORIZATION**, sous réserve de la vérification du SHA publié et des contrôles GitHub après les corrections d'audit ci-dessous. Aucun merge autorisé par cette mission. La conversion Ready for Review ne constitue pas une autorisation de fusion.

HEAD initial et distant vérifiés : `be3cc51ee6c22843a1bb469c84f3098d8787dafe`. Base distante `main` : `bd685f041c4a09ab71dca6249bf97c5945973206`, également merge-base de la PR. État Git initial : aucun changement suivi ni fichier indexé ; fichiers non suivis préservés. Le nouveau SHA, la publication et le statut final de PR sont vérifiés après création du commit et conservés dans les preuves locales `A13_SURF2_CORR003_REPORT/integration-20261011/` et la livraison finale ; ce document ne prétend pas contenir le SHA du commit qui l'inclut.

Founder Canvas PASS reconnu explicitement par CSA, consigné dans `A13-ARD-SURF2-FINALIZE-001.md`. Les preuves graphiques 64/64 contacts, sources natives PNG/WebP et comportement OFF/RUN/D13 sont préservées. Aucune image, coordonnée ni comportement runtime retouché pendant cet audit.

## Workflow Copilot Review 38091554089

SHA exécuté : `be3cc51ee6c22843a1bb469c84f3098d8787dafe`. Workflow et job `review` terminés SUCCESS. Logs et artefact réel `copilot-report` téléchargés ; artefact ID 11684152285, digest d'archive annoncé GitHub `sha256:3645aa1f4bd71279a3971e3534a01c16b84d1610abdcb867b486c3cb16939441`.

La lecture de `.github/workflows/copilot-review.yml` et des logs distingue :

| Étape | Résultat réel | Portée |
|---|---|---|
| Installation | PASS | Dépendances installées |
| Lint advisory | Code 1, 147 erreurs / 2 avertissements Linux | `continue-on-error: true` |
| Tests (intitulé « with coverage », lancé avec `--coverage=false`) | Code 1, 6906 PASS / 38 FAIL sur 6944 | `continue-on-error: true`, même sans « advisory » dans le nom |
| Couverture advisory | Code 1 ; mêmes 6906/38, aucune sortie HTML uploadée | Pas de preuve de couverture validée ; `continue-on-error: true` |
| Build frontend | PASS | Étape bloquante réussie |
| Packaging et uploads | PASS ; absence de coverage HTML signalée | Upload réussi ne valide pas les tests |

Le SUCCESS global du workflow ne signifie donc pas une suite verte. Aucun échec supprimé ni workflow assoupli par cette mission.

Baseline Linux téléchargée du workflow 38010860031, SHA `49e7ce6842814c1d7cdad20f2faab7472f240705` : 6899 PASS / 40 FAIL sur 6939. Comparaison par fichier relatif et nom complet du test : **aucun nouvel échec**, deux échecs résolus (convergence Arduino et pin externe D99). Lint Linux strictement identique entre les deux artefacts.

Qualification Windows conservée : 6904 PASS / 40 FAIL sur 6944 ; lint 150 erreurs / 3 avertissements. Quatre échecs Linux absents des résultats Windows (intégrité BATTERY_AA/BATTERY_9V/COIN_CELL_CR2032 et octets DIP_SWITCH) existaient déjà dans l'artefact Linux précédent : ils ne sont pas déclarés préexistants sur la seule foi de leur absence du diff. Six échecs Windows ne figurent pas dans le résultat Linux. La comparaison nominative et les messages sont conservés dans `ci-comparison.json` ; les nombres des deux plateformes ne sont pas confondus.

## Revue de l'intégralité des 26 fichiers initiaux

| Fichier relatif au dépôt | Conclusion |
|---|---|
| docs/audits/A13-ARD-SURF2-FINALIZE-001.md | Preuves, Founder PASS, SHA et anomalies connus explicitement documentés |
| docs/audits/A13-ARD-SURF2-REALISM-004-GEOMETRY-GATE.md | Historique de refus initial, remplacé par l'attestation de finalisation ; conservé |
| frontend/public/assets/components/arduino/ASSET-INTEGRITY.json | Métadonnées obsolètes découvertes et corrigées ci-dessous |
| frontend/public/assets/components/arduino/arduino.horizontal-candidate.1x.png | SHA qualifié, 180 × 120, aucun déplacement de contacts |
| frontend/public/assets/components/arduino/arduino.horizontal-candidate.1x.webp | SHA qualifié, 180 × 120, alpha différencié par encodage |
| frontend/public/assets/components/arduino/arduino.horizontal-candidate.3x.png | SHA qualifié, 540 × 360, fallback réel du renderer |
| frontend/public/assets/components/arduino/arduino.horizontal-candidate.3x.webp | SHA qualifié, 540 × 360, source réelle du renderer |
| frontend/public/assets/components/arduino/manifest.json | Géométrie 180 × 120, contacts vs électrique distincts ; statuts de candidature historiques conservés, approbation dans FINALIZE |
| frontend/src/arduino/boards/__tests__/boardCapabilities.test.js | Assertions D0–D13 et rejet D14 adaptés au contrat étendu |
| frontend/src/arduino/boards/boardCapabilities.js | Extension DIGITAL_OUTPUT limitée à UNO R3, D0–D13 |
| frontend/src/arduino/firmware/__tests__/boardPinMap.test.js | Mapping 0..13 et rejet hors surface testés |
| frontend/src/arduino/firmware/__tests__/firmwareCompiler.test.js | D13 compilable, D14 rejeté ; D2/D3 conservés |
| frontend/src/arduino/firmware/firmwareCompiler.js | Diagnostics/documentation alignés, grammaire et IR inchangés |
| frontend/src/components/__tests__/ComponentPreview.test.jsx | Seule la miniature Arduino devient 180 × 120 |
| frontend/src/components/parts/ArduinoPart.css | Règle limitée aux boutons du composant contenant Arduino ; centres inchangés |
| frontend/src/components/parts/ArduinoPart.jsx | Silhouette bleue horizontale, sources 3x qualifiées, masques LED et labels, câble OFF/RUN ; aucun simulateur refait |
| frontend/src/components/parts/__tests__/ArduinoGeometryContract.test.js | Correspondance des contacts et géométrie électrique historique |
| frontend/src/components/parts/__tests__/ArduinoPart.raster.test.jsx | Pipeline réel et géométrie ; contrôle de persistance ajouté ci-dessous |
| frontend/src/components/parts/__tests__/ArduinoPinVisibility.test.jsx | OFF/RUN et LED L HIGH/LOW/FLOATING, absence de superposition |
| frontend/src/config/componentDefinitions.js | Seuls contacts et dimensions Arduino changent ; électrique historique conservé |
| frontend/src/simulator/__tests__/resolutionExternalSignals.test.js | Pin inexistante D99 remplace D4 désormais valide |
| frontend/src/simulator/canonicalRegistry.js | Seule la surface Arduino s'étend, rôles D2/D3/GND/5V conservés |
| frontend/src/utils/__tests__/physicalContactConvergence.test.js | 16 contacts Arduino couverts, aucune modification POWER/NPN |
| frontend/src/visualization/__tests__/visualContract.test.js | Assertion Arduino commentée par erreur rétablie ci-dessous |
| frontend/src/visualization/defaultRegistrations.js | Seule l'inscription Arduino opte pour `markerless: false` |
| frontend/src/visualization/visualContract.js | Seule la référence Arduino passe à 180 × 120 ; calibration physique non revendiquée |

Les étapes de changements génériques antérieures qui ont ensuite été revertées ne subsistent pas dans le diff cumulatif. La revue porte sur la différence nette `main...HEAD`, pas seulement le dernier commit.

## Compatibilité et absence de changement hors périmètre

`scope-check.mjs` charge les définitions de `main` et de la branche et compare réellement les objets : **59 types non Arduino identiques**, tant dans le catalogue que dans le registre canonique. D2, D3, GND et 5V conservent leurs identifiants, rôles et coordonnées électriques. La nouvelle surface D0–D13 est l'extension Arduino attendue ; aucune nouvelle capacité UART/PWM/analogique introduite.

Les fichiers de persistance `ReactDocumentMapper.js`, `useCircuitState.js`, `circuitModel.js`, la projection générique `pinPresentationGeometry.js`, `ArduinoSimulator.js` et le workflow sont inchangés par rapport à main. Le format des circuits ne change pas ; les coordonnées visuelles et la taille du corps changent intentionnellement, mais pas les endpoints électriques sauvegardés.

Test réel ajouté : import d'un ancien circuit version 1, deux composants, quatre fils D2/D3/GND/5V avec/sans contact explicite, firmware D2/D3 et waypoints ; export, clear, réimport et export préservent exactement fils et firmware. Les tests existants du document, du bridge et des ancres de contact sont également exécutés.

## Corrections circonscrites de l'audit et contrôles refaits

1. `visualContract.test.js` contenait des séquences littérales `\n` dans un commentaire, absorbant l'assertion Arduino. Conversion en vraies fins de ligne : assertion réactivée, pas de suppression d'un test.
2. `ASSET-INTEGRITY.json` référençait un ancien hash/octets de manifest et omettait les quatre nouveaux rasters. Les anciens assets sont conservés ; neuf enregistrements maintenant vérifiés. Le manifest texte est mesuré sur ses octets LF livrés dans Git ; images mesurées sur leurs octets binaires qualifiés.
3. Test d'import/export Arduino ajouté dans le fichier de tests raster déjà inclus dans la PR. Aucun nouveau comportement applicatif ni retouche graphique.

Résultats frais : **131/131 PASS dans 10 fichiers**, incluant les trois fichiers Arduino (désormais 32 tests avec le nouveau test de sauvegarde), capabilities, mapping, compiler, visualContract, bridge, document et persistance. Gate Arduino : **5/5 PASS**, 363 tests d'autres composants volontairement non sélectionnés dans ce contrôle ciblé. Build PASS. Lint des deux fichiers de tests modifiés : une erreur préexistante `React` importé mais inutilisé selon ESLint dans `ArduinoPart.raster.test.jsx`, présente dans la baseline ; aucune règle désactivée.

La suite complète n'est pas relancée localement : runtime inchangé, seules assertions et métadonnées corrigées ; les contrôles concernés sont refaits et le nouveau push déclenche la suite CI. Le résultat de ce nouveau workflow doit être lu, pas déduit du SUCCESS du workflow précédent.

## Main, protections et risques

`main` GitHub et `origin/main` : `bd685f041c4a09ab71dca6249bf97c5945973206`. La branche locale `main` est plus ancienne (`99ac91dee2cf92cb7d422d67e92acad8e6059c62`) ; elle n'est ni utilisée pour la décision ni modifiée. PR initiale OPEN/DRAFT, base main, `mergeable=MERGEABLE`, `mergeStateStatus=CLEAN`.

API GitHub : `protected=false`, `protection.enabled=false`, aucun required status check ; `/rules/branches/main` retourne `[]`. **Aucune protection serveur active** : la décision humaine CSA reste le verrou de fusion. Aucune protection ajoutée implicitement.

Risques restants : suite et lint global non verts mais échecs identifiés et comparés ; workflow advisory qui ne bloque pas ces échecs ; absence de couverture HTML validée ; calibration physique non qualifiée ; confort de câblage des petites cibles avec zoom ; activité TX/RX non simulée. Aucun de ces risques n'est présenté comme corrigé.

## Preuves et publication

Résultats conservés dans `A13_SURF2_CORR003_REPORT/integration-20261011/` : artefacts JSON originaux des workflows 38091554089 et 38010860031, logs, métadonnées d'artefacts, comparaison nominative, lint/couverture extraits, diff complet original, contrôle des objets, résultats ciblés, gate Arduino, build et lint modifié. Les fichiers bruts volumineux restent locaux ; empreintes SHA-256 consignées dans `evidence-sha256.json`.

Le présent rapport et les trois corrections circonscrites sont les seuls fichiers à intégrer dans le commit d'audit. Le push normal sera limité à la branche de la PR, sans force. La conversion Ready for Review intervient après contrôle du SHA et des nouveaux résultats ; elle ne publie aucun message ni demande de reviewers. Aucun merge, rebase, reset, clean ou suppression locale.

## Contrôles après fusion, uniquement après autorisation finale CSA

1. Vérifier le SHA effectivement fusionné sur main et les changements nets ; confirmer les SHA des quatre rasters.
2. Vérifier le workflow main, ses vrais codes de sortie, l'artefact test/lint et l'absence d'échec nouveau face à la baseline Linux.
3. Confirmer le build déployé et l'ouverture d'un ancien circuit D2/D3 avec firmware, fils, contacts et waypoints ; contrôler aussi D0/D13 et 5V/GND.
4. Contrôler Canvas horizontal bleu, USB gauche, alignement des trous, OFF/RUN et LED L D13 HIGH/LOW, sans superposition sur le logo.
5. Conserver un rapport du SHA main et des résultats, sans supprimer les dossiers locaux non suivis ; poursuivre séparément les anomalies globales connues et la politique de protections.
