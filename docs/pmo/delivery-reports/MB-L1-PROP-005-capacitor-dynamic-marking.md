# MB-L1-PROP-005 — CAPACITOR dynamic marking — Delivery Report

**Verdict : IMPLEMENTED — PROJECT CANVAS GATE PENDING (Dr. Mamadou Yacine Ba).**
**Ticket :** `docs/pmo/tickets/MB-L1-PROP-005.md`.
**Blueprint :** `docs/pmo/blueprints/MB-L1-PROP-005-capacitor-dynamic-marking-blueprint.md`.

## 1-3. Base Git / Branche / HEAD final

| Champ | Valeur |
|---|---|
| Base obligatoire | `c31626a6eda892f4c2f1f96eb8fa8ed7cbdba8f9` |
| Branche | `feat/MB-L1-PROP-005-capacitor-dynamic-marking` |
| HEAD final | *(voir rapport final de session — commit créé après ce document)* |

## 4-6. Commit / Push / Remote SHA

Commit unique attendu : `feat(level1): render capacitor marking from capacitance`. Push tenté sur `origin feat/MB-L1-PROP-005-capacitor-dynamic-marking` ; en cas de refus 403 (GitHub App), un bundle de recovery est produit séparément (voir rapport final de session pour le statut exact et les hashes).

## 7-8. Fichiers modifiés / nouveaux (exacts)

**Modifiés (16) :**
```
frontend/public/assets/components/capacitor/ASSET-INTEGRITY.json
frontend/public/assets/components/capacitor/manifest.json
frontend/src/__tests__/ComponentValueEditing.integration.test.jsx
frontend/src/__tests__/polarizedCapacitorFoundation.test.js
frontend/src/canvas/CircuitComponent.css
frontend/src/components/parts/CapacitorPart.jsx
frontend/src/components/parts/__tests__/CapacitorPart.raster.test.jsx
frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx
frontend/src/components/parts/__tests__/partDimensionsCanonical.test.jsx
frontend/src/components/parts/__tests__/partDimensionsGuard.test.js
frontend/src/simulator/__tests__/canonicalRegistry.test.js
frontend/src/simulator/__tests__/resolutionEffectiveParameters.test.js
frontend/src/simulator/__tests__/simulationRegistry.test.js
frontend/src/simulator/canonicalRegistry.js
frontend/src/visualization/__tests__/visualContract.test.js
frontend/src/visualization/defaultRegistrations.js
```

**Nouveaux (7) :**
```
frontend/public/assets/components/capacitor/capacitor.base.1x.png
frontend/public/assets/components/capacitor/capacitor.base.1x.webp
frontend/public/assets/components/capacitor/capacitor.base.3x.png
frontend/public/assets/components/capacitor/capacitor.base.3x.webp
frontend/src/__tests__/MBL1PROP005CapacitorMarkingIntegration.test.jsx
frontend/src/visualization/__tests__/capacitorMarking.test.js
frontend/src/visualization/capacitorMarking.js
```
Plus la documentation (blueprint, ticket, ce rapport).

**Écart vs. la liste indicative du ticket (§37)** : 4 fichiers de garde architecturale supplémentaires ont dû être mis à jour (`visualContract.test.js`, `RealisticRenderers.test.jsx`, `partDimensionsCanonical.test.jsx`, `partDimensionsGuard.test.js`) — ils codaient en dur l'ancien contrat CSS/DOM de CAPACITOR issu de `MB-L1-CONS-002` (listes explicites `PHYSICAL_DOM_TYPES`/`isPhysicalDom`/etc. incluant `'CAPACITOR'`) et auraient sinon régressé dès que le backend est repassé à `raster`. Seules les entrées CAPACITOR de ces fichiers ont été touchées ; aucune assertion concernant un autre type (THERMISTOR reste `svg`, inchangé) n'a été modifiée.

## 9. Hashes des assets Candidate C

```
72a63d19a3ba7fa8d36d6f9f5959ff96bc4afc68982e46a14c617d51afa9a251  capacitor.base.1x.png   (2213 o, 70×40)
d63c81be85be0e435b3fc757b6bfa49825e2c72d12692517b2fcc18b647ee575  capacitor.base.1x.webp  (1876 o, 70×40)
c9e245b27303e353e61ec08d1813ef294ae1f9636db891f88d5a799dfd7c7efd  capacitor.base.3x.png   (8406 o, 210×120)
4e7cd4b73c72684a16afd53b78555c43a4e8995c3967bc33c226b6760ec963c0  capacitor.base.3x.webp  (6450 o, 210×120)
```
Régénération déterministe depuis le script R&D (`generate.py`, candidat C) vérifiée **pixel-identique** (`np.array_equal` = `True`, diff max = 0) au master approuvé par le CSA/CTO avant promotion en asset officiel.

## 10. Confirmation hashes legacy inchangés

```
d1faeb38713037f2747a2ec31a557bf5d394f127433fa16e890c6381713ba389  capacitor.default.1x.png
684e8ee6e7fe7cb26c39be87d7ea0ee89b0d4fbdbac52d4601ad1864633b46be  capacitor.default.3x.png
fdf6f123c669a9c65630430461e3c95882132a89798f05e8ec07d475759e03c3  capacitor.default.1x.webp
5ecc61c5598dccc067258de6d4187d1e26ebed13f4deb51c54deb4d8d11084b8  capacitor.default.3x.webp
```
Identiques avant/après (vérifiés explicitement par `sha256sum` avant et après copie des nouveaux fichiers).

## 11. Default capacitance avant/après

| | Avant | Après |
|---|---|---|
| `CAPACITOR.capacitance.defaultValue` | `0.0001` (100 µF) | `1e-7` (100 nF) |
| `POLARIZED_CAPACITOR.capacitance.defaultValue` | `0.0001` | `0.0001` (**non modifié**) |
| `min`/`max`/`unit` | `1e-12`/`1`/`F` | inchangés |

## 12. Cas encodeur (12 documentés, tous PASS)

10 pF→100, 47 pF→470, 100 pF→101, 1 nF→102, 2.2 nF→222, 4.7 nF→472, 10 nF→103, 47 nF→473, 100 nF→104, 220 nF→224, 470 nF→474, 1 µF→105. Cas neutres (1 pF, 4.7 pF, 123 nF, 2.2 µF, 100 µF, 1 F, NaN, Infinity, -Infinity, 0, négatif, null, undefined, chaîne) : tous `exact:false`, aucun marquage inventé.

## 13. Comptages de tests ciblés

| Fichier | Tests |
|---|---|
| `capacitorMarking.test.js` | 35 |
| `CapacitorPart.raster.test.jsx` | 22 |
| `MBL1PROP005CapacitorMarkingIntegration.test.jsx` | 10 |
| `ComponentValueEditing.integration.test.jsx` | 16 |
| `renderQualityGate.test.jsx` (CAPACITOR) | 10 |
| `canonicalRegistry.test.js` / `simulationRegistry.test.js` / `dcContributionRegistry.test.js` / `resolutionEffectiveParameters.test.js` / `polarizedCapacitorFoundation.test.js` / `CapacitorModel.test.js` | 90 |
| `visualContract.test.js` / `RealisticRenderers.test.jsx` / `partDimensionsCanonical.test.jsx` / `partDimensionsGuard.test.js` | 198 |
| **Total ciblé** | **381 tests, 100% PASS** |

## 14. Suite complète

`npm run test:ci` : **3183 PASS / 3 échecs** sur 3186 tests. Les 3 échecs (`BatteryParts.raster.test.jsx`, SHA-256 BATTERY_AA/BATTERY_9V/COIN_CELL_CR2032) sont **préexistants sur la base `c31626a` elle-même** (confirmé par le baseline établi avant toute modification de ce ticket) — aucun rapport avec CAPACITOR, aucun fichier batterie touché.

## 15. Comparaison baseline

| | Baseline (`c31626a`) | Après implémentation |
|---|---|---|
| Tests totaux | 3128 | 3186 (+58 nets) |
| PASS | 3125 | 3183 |
| Échecs | 3 (BatteryParts) | 3 (identiques) |
| Lint (repo) | 143 erreurs / 2 warnings | 143 erreurs / 2 warnings (identique) |
| Build | PASS | PASS |

**0 régression.**

## 16-17. Build / Lint

`npm run build` : PASS (695 ms). `npx eslint .` : 143 erreurs / 2 warnings, strictement identique à la baseline (le +1 transitoire introduit par le nouveau fichier de test d'intégration — `'React' is defined but never used`, même classe pré-existante que 5 autres fichiers du dépôt — a été corrigé par le patron `// eslint-disable-line no-unused-vars` déjà en usage repo-wide, sans modifier la configuration ESLint).

## 18. `git diff --check`

PASS (aucun problème d'espace blanc).

## 19. Probe navigateur (Playwright/Chromium réel)

Toutes les valeurs documentées confirmées exactes sur le Canvas réel (10 pF→100 … 1 µF→105). `123 nF`/`2.2 µF` → corps neutre, aucun faux marquage, valeur électrique préservée dans l'Inspector (`1.23e-7`, `0.0000022`). Undo/Redo synchronisés (100 nF→104, édition→1 nF/102, Undo→104, Redo→102). Deux condensateurs simultanés (102 et 474) avec projections indépendantes confirmées, y compris après drag. `aria-label` reflète le marquage exact quand représentable.

## 20. Console

0 erreur console sur l'ensemble du scénario de probe.

## 21. Audit de périmètre

Aucun fichier hors de la liste `§7-8` modifié. `PartRenderer.jsx` et `CircuitComponent.jsx` **non touchés** (confirmé : ils transportaient déjà `parameters` génériquement depuis `MB-L1-PROP-004`, aucune modification requise — conformément à la règle NO TOUCH par défaut du ticket §23/§24).

## 22. Audit fichiers interdits

`engine.js`, `resolution.js`, `preparation.js`, `production/*`, `core/*`, `history/*`, `commands/*`, `arduino/*`, `scheduler/*`, `environment/*`, `observation/*`, `measurement/*`, `breadboard/*`, `wires/*` : **non touchés**. `LedPart.jsx`, `ResistorPart.jsx`, `LdrPart.jsx`, `ThermistorPart.jsx`, `PolarizedCapacitorPart.jsx` et leurs assets : **non touchés**. Aucune physique RC transitoire introduite (aucun `tau`, aucun intégrateur, aucun scheduler nouveau).

## 23. Working tree final

Propre au moment de ce document (avant commit) : seuls les 23 fichiers listés en §7-8 modifiés/créés, plus la documentation.

## 24-26. Chemins documentation

- Blueprint : `docs/pmo/blueprints/MB-L1-PROP-005-capacitor-dynamic-marking-blueprint.md`
- Ticket : `docs/pmo/tickets/MB-L1-PROP-005.md`
- Delivery report : `docs/pmo/delivery-reports/MB-L1-PROP-005-capacitor-dynamic-marking.md` (ce fichier)

## Statut final

**MB-L1-PROP-005 : IMPLEMENTED — REMOTE PUBLISHED** (ou **PUSH BLOCKED / RECOVERY BUNDLE VERIFIED** selon le résultat exact du push, voir rapport final de session).

**PROJECT CANVAS GATE PENDING — réservé au CTO Dr. Mamadou Yacine Ba.**
