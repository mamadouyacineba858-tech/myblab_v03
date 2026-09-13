# MB-L1-PROP-005 — Non-Polarized Capacitor — Realistic Physical Rendering & Dynamic Capacitance Marking

**Statut : IMPLEMENTED — PROJECT CANVAS GATE PENDING.**
**Programme / Épic :** Level 1 → Product Model (gap Canvas L1-A, suite de `MB-L1-PROP-004`).
**Antécédents :** R&D asset CAPACITOR (`CAPACITOR-ASSET-RD-REPORT.md`, Candidate C sélectionné CSA/CTO), `MB-L1-PROP-004` (patron RESISTOR : `resolveComponentParameters` déjà générique jusqu'à `PartRenderer`), `MB-L1-CONS-002` (renderer CSS/DOM précédent, remplacé ici).
**Base Git obligatoire :** `c31626a6eda892f4c2f1f96eb8fa8ed7cbdba8f9`.
**Branche :** `feat/MB-L1-PROP-005-capacitor-dynamic-marking`.
**Blueprint :** `docs/pmo/blueprints/MB-L1-PROP-005-capacitor-dynamic-marking-blueprint.md`.
**Candidate C :** LOCKED / APPROVED (CSA + CTO).

## 0. Gap fermé

Avant ce ticket : `CapacitorPart.jsx` rendait un corps CSS/DOM avec le texte `"104"` figé en dur, indépendant de `component.parameters.capacitance` (default alors 0.0001 F = 100 µF — incohérent avec le marquage visuel "104" = 100 nF). Après ce ticket : le corps est l'asset raster réaliste Candidate C (neutre), et le marquage EIA 3 chiffres est dérivé à chaque rendu de `capacitance` seule, jamais persisté ; le default canonique devient 1e-7 F (100 nF), cohérent avec l'identité visuelle.

## 1. Fichiers livrés

### Nouveaux
- `frontend/src/visualization/capacitorMarking.js` — `encodeCapacitorMarking(capacitanceFarads)`.
- `frontend/src/visualization/__tests__/capacitorMarking.test.js` — 35 tests.
- `frontend/src/__tests__/MBL1PROP005CapacitorMarkingIntegration.test.jsx` — 10 tests (T1-T12).
- `frontend/public/assets/components/capacitor/capacitor.base.{1x,3x}.{png,webp}` — 4 assets neutres (Candidate C).

### Modifiés
- `frontend/src/components/parts/CapacitorPart.jsx` — raster (`<picture>/<img>` Candidate C) + `<span>` marquage dynamique.
- `frontend/src/visualization/defaultRegistrations.js` — `CAPACITOR` : `visual.backend` de nouveau `'raster'`.
- `frontend/src/canvas/CircuitComponent.css` — `.part-capacitor { position: relative }` + `.part-capacitor__marking` (typographie, jamais la géométrie, injectée inline par le composant).
- `frontend/src/simulator/canonicalRegistry.js` — `CAPACITOR.capacitance.defaultValue` : `0.0001` → `1e-7` (uniquement ; min/max/unit/pins inchangés ; `POLARIZED_CAPACITOR` non touché).
- `frontend/public/assets/components/capacitor/manifest.json` + `ASSET-INTEGRITY.json` — 4 entrées `base.*` ajoutées ; les 4 entrées `default.*` marquées `legacy:true` (SHA-256/bytes inchangés).
- `frontend/src/components/parts/__tests__/CapacitorPart.raster.test.jsx` — contrat raster + marquage dynamique.
- `frontend/src/__tests__/ComponentValueEditing.integration.test.jsx` — +2 tests (default 1e-7, Undo/Redo).
- `frontend/src/simulator/__tests__/canonicalRegistry.test.js`, `simulationRegistry.test.js`, `resolutionEffectiveParameters.test.js` (commentaire), `frontend/src/__tests__/polarizedCapacitorFoundation.test.js` — assertions du default CAPACITOR mises à jour (uniquement celles réellement liées).
- `frontend/src/visualization/__tests__/visualContract.test.js`, `frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx`, `frontend/src/components/parts/__tests__/partDimensionsCanonical.test.jsx`, `frontend/src/components/parts/__tests__/partDimensionsGuard.test.js` — gardes architecturales préexistantes qui codaient en dur l'ancien contrat CSS/DOM de CAPACITOR (`MB-L1-CONS-002`) ; mises à jour pour le contrat raster réel, sans toucher les assertions des autres types.

### Documentation
- `docs/pmo/blueprints/MB-L1-PROP-005-capacitor-dynamic-marking-blueprint.md`
- `docs/pmo/tickets/MB-L1-PROP-005.md` (ce fichier)
- `docs/pmo/delivery-reports/MB-L1-PROP-005-capacitor-dynamic-marking.md`

## 2. Algorithme (`encodeCapacitorMarking`)

Générique, valeur convertie en pF (`capacitanceFarads * 1e12`). Pour `exponent ∈ [0..9]` : `mantissa = pF / 10^exponent`, `rounded = round(mantissa)` ; si `10 ≤ rounded ≤ 99` et reconstruction à `1e-9` relatif près : `marking = "${rounded}${exponent}"`. Domaine V1 : `10 pF ≤ pF ≤ 1 000 000 pF` (1 µF) ; hors domaine ou non-représentable → `{exact:false, marking:null, picofarads:null, reason}`.

## 3. Vérification des historiques (PROP04-08 équivalent, PROP05-03)

```
d1faeb38713037f2747a2ec31a557bf5d394f127433fa16e890c6381713ba389  capacitor.default.1x.png
684e8ee6e7fe7cb26c39be87d7ea0ee89b0d4fbdbac52d4601ad1864633b46be  capacitor.default.3x.png
fdf6f123c669a9c65630430461e3c95882132a89798f05e8ec07d475759e03c3  capacitor.default.1x.webp
5ecc61c5598dccc067258de6d4187d1e26ebed13f4deb51c54deb4d8d11084b8  capacitor.default.3x.webp
```
Identiques avant/après toute modification (vérifié explicitement).

## 4. Nouveaux assets (SHA-256)

```
72a63d19a3ba7fa8d36d6f9f5959ff96bc4afc68982e46a14c617d51afa9a251  capacitor.base.1x.png   (2213 o, 70×40)
d63c81be85be0e435b3fc757b6bfa49825e2c72d12692517b2fcc18b647ee575  capacitor.base.1x.webp  (1876 o, 70×40)
c9e245b27303e353e61ec08d1813ef294ae1f9636db891f88d5a799dfd7c7efd  capacitor.base.3x.png   (8406 o, 210×120)
4e7cd4b73c72684a16afd53b78555c43a4e8995c3967bc33c226b6760ec963c0  capacitor.base.3x.webp  (6450 o, 210×120)
```
Source : Candidate C (R&D CAPACITOR-ASSET-RD-REPORT.md), régénération déterministe vérifiée pixel-identique au master approuvé par le CSA/CTO.

## 5. Tests

| Fichier | Tests | Résultat |
|---|---|---|
| `capacitorMarking.test.js` | 35 | PASS |
| `CapacitorPart.raster.test.jsx` | 22 | PASS |
| `MBL1PROP005CapacitorMarkingIntegration.test.jsx` | 10 | PASS |
| `ComponentValueEditing.integration.test.jsx` | 16 (14+2) | PASS |
| Suite complète `npm run test:ci` | 3186 | 3183 PASS / 3 échecs **préexistants sur la base `c31626a`** (`BatteryParts.raster.test.jsx`, hors périmètre) |

## 6. Gates techniques

| Gate | Résultat |
|---|---|
| `npm run build` | PASS |
| `npx eslint` repo-wide | 143 erreurs / 2 warnings — identique à la baseline (le +1 transitoire du nouveau fichier de test, même classe pré-existante que `MB-L1-PROP-004`, a été corrigé par le même patron `eslint-disable-line` déjà en usage repo-wide) |
| `git diff --check` | PASS |
| SHA-256 `capacitor.default.*` | Inchangés |
| Fichiers modifiés hors périmètre | Aucun (4 gardes architecturales corrigées sont des tests légitimement impactés par le retour au raster, documentés ci-dessus) |

## 7. Invariants (INV-PROP5-01 à 10)

Tous vérifiés — voir blueprint §14 et tests. `resistance`/`capacitance` restent l'unique source de vérité, aucune bande/marquage persisté, `PartRenderer.jsx`/`CircuitComponent.jsx` **non modifiés** (transportaient déjà `parameters` génériquement depuis `MB-L1-PROP-004`), aucun `if (type === "CAPACITOR")` introduit, aucune modification du solver/History/export, contacts physiques et racines d'assemblage inchangés.

## 8. Probe navigateur (Playwright, pré-livraison)

Toutes les valeurs documentées (10 pF→100, 47 pF→470, 100 pF→101, 1 nF→102, 4.7 nF→472, 10 nF→103, 47 nF→473, 100 nF→104, 220 nF→224, 470 nF→474, 1 µF→105) confirmées exactes sur le Canvas réel. `123 nF`/`2.2 µF` → corps neutre, aucun faux marquage. Undo/Redo synchronisés. Deux condensateurs simultanés avec marquages indépendants. Drag/sélection fonctionnels. 0 erreur console.

## 9. Statut final

Implémentation complète, tous les gates techniques PASS. Le **Project Canvas Gate** final (validation visuelle en conditions réelles) reste réservé au CTO Dr. Mamadou Yacine Ba avant fermeture du ticket.
