# A13-ARD-SURF2-FINALIZE-001

Finalisation locale du 11 octobre 2026 (Europe/Paris), ordre CSA `A13-ARD-SURF2-FINALIZE-RECOVERY-001`.

## Approbation et périmètre

**Founder Canvas : PASS, communiqué explicitement au CSA.** Le présent ordre humain atteste que le fondateur a explicitement répondu PASS dans la conversation ChatGPT après validation du Canvas Arduino, et reconnaît cette validation. Aucune nouvelle validation demandée. Cette attestation remplace l'état d'attente des rapports historiques CORR-003 et PUSH-REVIEW-001, conservés sans réécriture.

Branche : `feat/A13-ARD-SURF1-digital-pin-surface`.
HEAD initial vérifié : `49e7ce6842814c1d7cdad20f2faab7472f240705`.
Index initial vide. Les modifications suivies et les fichiers non suivis ont été inventoriés ; aucun fichier historique supprimé ou modifié par cette finalisation.

Commit autorisé : `fix(a13): finalize blue horizontal Arduino UNO R3 surface`.
Publication et merge interdits dans cette exécution. Statut de livraison après création et vérification du commit : `COMMITTED_LOCAL — PENDING_CSA_PUSH_REVIEW`.

## Modifications intégrées

- Quatre images corrigées aux dimensions natives 180 × 120 et 540 × 360, PNG et WebP ; carte bleue horizontale, USB à gauche, détourage extérieur sans déplacement des trous.
- Manifest Arduino : variantes horizontales, SHA-256 et correspondance des contacts.
- `ArduinoPart.jsx` et son CSS : câble masqué en OFF, sérigraphie raster sans superposition DOM, LED L pilotée par RUN et D13 HIGH, LED ON opaque en OFF ; cibles de contact centrées de 4 px.
- `componentDefinitions.js` : présentation des 16 contacts et boîte Arduino 180 × 120 ; identifiants et coordonnées électriques historiques préservés.
- `visualContract.js` : seule l'entrée de référence Arduino est adaptée à 180 × 120 ; calibration physique relative toujours non qualifiée.
- Trois tests Arduino, test de miniature Arduino, convergence des contacts Arduino et test de signal externe Arduino inexistant D99 : contrats réels vérifiés, aucune erreur masquée.

Aucun autre composant modifié. ZIP historiques, fichiers temporaires, dossiers de qualification et rapport PUSH-REVIEW historique exclus du commit et conservés localement. Les anciens assets restent présents. Les métadonnées historiques de candidature du manifest sont conservées à l'identique des fichiers qualifiés ; le présent document porte l'approbation Founder et CSA actualisée. Aucun comportement fonctionnel changé pendant cette finalisation.

## Qualification réutilisée et intégrité

| Contrôle | Résultat documenté |
|---|---|
| Founder Canvas | PASS, attestation humaine explicite reconnue par CSA |
| Contacts D0–D13, 5V, GND dans les quatre variantes | 64/64 PASS |
| Trois fichiers de tests Arduino | 31/31 PASS |
| Build | PASS ; avertissement chunk > 500 kB |
| Suite complète, 363 fichiers | 6 904 PASS, 40 FAIL préexistants sur 6 944 |
| Baseline complète | 6 898 PASS, 45 FAIL sur 6 943 |
| Nouveaux échecs face à la baseline | 0 |
| Lint | 150 erreurs, 3 avertissements préexistants ; sortie identique à la baseline |

Preuves lues : `A13_SURF2_CORR003_REPORT/REPORT.md`, `reverification-20261010/REPORT.md`, `targeted.txt/json`, `build.txt`, `lint.txt`, `comparison.json`, ainsi que `docs/audits/A13-ARD-SURF2-PUSH-REVIEW-001.md`.
Les 14 empreintes de `session-current/frozen-inputs.json` correspondent aux fichiers actuels. L'empreinte de `visualContract.js` correspond à `session-current/original-tracked/frontend/src/visualization/visualContract.js`. Les références PNG/WebP 3x du renderer correspondent exactement aux images corrigées qualifiées.

Les preuves nominatives de baseline montrent cinq échecs résolus et aucun nouveau. Les 40 échecs globaux restent explicites : inventaires de catalogue, renderer Zener sous JSX classique, intégrité/budgets d'assets d'autres composants et interactions BUTTON notamment. Aucune prétention de suite ou lint entièrement verts. Les rapports détaillés restent locaux, hors de ce commit ; leurs chemins et empreintes sont consignés ci-dessous.

Aucune suite relancée inutilement : les fichiers fonctionnels qualifiés n'ont pas changé. Les silhouettes PNG/WebP coïncident au seuil alpha 128 ; les alpha intermédiaires diffèrent selon l'encodage. TX/RX ne simulent pas d'activité UART.

## Contrôles Git de finalisation

Commandes : `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, `git diff --cached --name-status`, `git diff`, contrôle SHA-256, puis `git add -- <liste explicite>`, `git diff --cached --check`, `git diff --cached --name-status`, comparaison exacte de la liste indexée et de ses octets avec les fichiers de livraison, `git commit -m "fix(a13): finalize blue horizontal Arduino UNO R3 surface"`, `git show --name-status --format=fuller HEAD`, `git status --short`.

Le SHA complet du nouveau commit est fourni après sa création dans la livraison ; le document est lui-même inclus dans ce commit et ne peut contenir sa propre empreinte ou celle du commit qui le contient.

## Fichiers livrés et SHA-256

Les SHA-256 ci-dessous portent sur les octets indexés, tels qu'ils seront livrés dans le commit. Les fins de ligne normalisées par Git peuvent différer des octets Windows gelés ; l'équivalence est contrôlée sans modifier les sources.

| Fichier | SHA-256 livré |
|---|---|
| `frontend/public/assets/components/arduino/arduino.horizontal-candidate.1x.png` | `a9d36f90cb847363cef48489bad29ccfcbe12b895aae8fb6f93d67c49d0ebd54` |
| `frontend/public/assets/components/arduino/arduino.horizontal-candidate.1x.webp` | `f2f05ec47dea119186e72e9f40c29de5bf70592299c4aeb73216ee7448098c5b` |
| `frontend/public/assets/components/arduino/arduino.horizontal-candidate.3x.png` | `d50bdfd4aed9df7a73cc0ab9624623b5d365405bf4e282fe2bc6328e2393347c` |
| `frontend/public/assets/components/arduino/arduino.horizontal-candidate.3x.webp` | `a48fb58d19bc061b7f3acbf9a6805467ffc34d570919b4c4018b19cbcdd5c62b` |
| `frontend/public/assets/components/arduino/manifest.json` | `32c5be7ce7897d608a7eebc96da9e35bd1e6a77c55ee8a9db8ba5c646e55b122` |
| `frontend/src/components/__tests__/ComponentPreview.test.jsx` | `1c9bd5ab1bf0b3aa26107e49282612d5529c64a6fbabec8b56ee679122d0b37f` |
| `frontend/src/components/parts/ArduinoPart.css` | `9bd7784108e716888a8e74929c39afaa225632d946f9b3f382b81050e3c571c3` |
| `frontend/src/components/parts/ArduinoPart.jsx` | `4b840633b4bc21a9cf22f4dedbb337dc65cd7ce02a837b986f4d38e783bc3ddb` |
| `frontend/src/components/parts/__tests__/ArduinoGeometryContract.test.js` | `d48b49e242b6bad18d827d1eed65cb93e69b455c93f2280cb1235fcdd1f503ce` |
| `frontend/src/components/parts/__tests__/ArduinoPart.raster.test.jsx` | `4e80b7812ac42b16c6c529c59acba06fcc05bac24c5c8bf6e25408ecc7a13ee6` |
| `frontend/src/components/parts/__tests__/ArduinoPinVisibility.test.jsx` | `c68927e9b01e95940d7306819cba870e0013d8783377198fdcd87972178605c9` |
| `frontend/src/config/componentDefinitions.js` | `73180d103e3f2ca6947cb49faf0fd0604cbc72c6e0d5e695472be356eb039dc7` |
| `frontend/src/simulator/__tests__/resolutionExternalSignals.test.js` | `3caf0550b5f0a865b0b602f977434ef4f56f632868a5eda4d4c80318b1abce7e` |
| `frontend/src/utils/__tests__/physicalContactConvergence.test.js` | `e2ed9e3a5a627a2f03afa556c0e989966e8d89edc2b50c47f6d93223d71aa640` |
| `frontend/src/visualization/visualContract.js` | `2f490cadfe6f1fc55fe4cbf48681aa2def73ac0b69d2b71e46b2b19972eef18b` |

Le seizième fichier intégré est le présent document : `docs/audits/A13-ARD-SURF2-FINALIZE-001.md`.

## Empreintes des preuves conservées localement

| Preuve | SHA-256 |
|---|---|
| `A13_SURF2_CORR003_REPORT/reverification-20261010/targeted.json` | `e0400612f19aa9047d272ff3ad7c44fe2b603309f46cad4b28a4938ac3270382` |
| `A13_SURF2_CORR003_REPORT/reverification-20261010/full.json` | `af6076777e753281b9132b2354e52851cc7aa81493e27fd21c33aaff5a602df9` |
| `A13_SURF2_CORR003_REPORT/reverification-20261010/comparison.json` | `655f3e63142f4984f3d401c79cb6b721f7f65bcc19e3cdde6740cf18c52968db` |
| `A13_SURF2_CORR003_REPORT/reverification-20261010/assets.json` | `490b04668391a4436ff7f517103485c41302317b3f5aeceeccc139010a6b58b6` |
| `A13_SURF2_CORR003_REPORT/reverification-20261010/build.txt` | `cd8b1d550a6fcbfb06039a9314db4961a0edb8ab2d0a61a415006dddedbc4b4b` |
| `A13_SURF2_CORR003_REPORT/reverification-20261010/lint.txt` | `52795fc74d89fa1e8c93202614a6dd9424abfecc3eec863516c601e8e8300b61` |
| `A13_SURF2_CORR003_REPORT/session-current/baseline-ci-visible.json` | `2c12200612844434f96661ad95e6a3a023122d4c26c97e6d9f109c08030755a2` |
