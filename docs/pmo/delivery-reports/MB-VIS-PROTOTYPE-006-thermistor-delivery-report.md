# MB-VIS-PROTOTYPE-006 — THERMISTOR — Delivery Report

**Verdict : PASS.**
**Ticket :** `docs/pmo/tickets/MB-VIS-PROTOTYPE-006-thermistor.md`.
**Base :** `63d3c245e802c97c74d96ce4cc917e98ba6cde1b`. **Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.

## Objet livré

Intégration de l'asset raster THERMISTOR (thermistance NTC, état unique `default`, paquet validé) via le mécanisme déclaratif de `MB-VIS-INDUSTRIAL-001` — **sixième composant raster** du catalogue (après RESISTOR, DIODE, LED, CAPACITOR, LDR). Aucune adaptation du renderer central, aucune modification de T10 / de la géométrie / de la simulation / de la breadboard.

## Assets (paquet validé, non modifiés)

`frontend/public/assets/components/thermistor/` :

| Fichier | Octets | Dim. | Format | SHA-256 (== ASSET-INTEGRITY) | Budget |
|---|---|---|---|---|---|
| `thermistor.default.1x.png` | 2149 | 84×36 | PNG RGBA8 | `7d944b1d…47f8` | 2.1 Ko ✅ |
| `thermistor.default.1x.webp` | 1738 | 84×36 | WebP VP8L | `d7a753e4…dbd5` | 1.7 Ko ✅ |
| `thermistor.default.3x.png` | 9328 | 252×108 | PNG RGBA8 | `86feb49d…e2b2` | 9.1 Ko ✅ |
| `thermistor.default.3x.webp` | 6382 | 252×108 | WebP VP8L | `41bdda4b…3c6` | 6.2 Ko ✅ |
| `manifest.json` | 1070 | — | — | `type`/`canonical`/`state`/`complexity:"simple"`/`variants[]` + `budget` | — |
| `ASSET-INTEGRITY.json` | 951 | — | — | `{ version, type, files: [ … ] }` — **forme tableau** (T10-compatible) | — |

Contrôles (probe Node) : alpha 4/4 · `@3x = 3×@1x` exact (252=3×84, 108=3×36) · dim max 252 ≤ 1024 · 84×36 / 252×108 == `manifest.canonical` == `componentDefinitions.js` · SHA-256 concordants (ASSET-INTEGRITY) + octets réels · dimensions == `manifest.variants` (4/4) · poids ≤ 30 Ko (4/4, budget `simple`). Naming canonique. **Non régénérés / retouchés / recolorés / recadrés / redimensionnés / recompressés / renommés / remplacés / optimisés.**

## Intégration registre

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'THERMISTOR', component: ThermistorPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('THERMISTOR')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
Types raster : **RESISTOR, DIODE, LED, CAPACITOR, LDR, THERMISTOR**. Les 10 autres restent `svg` (testé). Import conservé, fichier non réorganisé.

## Renderer

`ThermistorPart.jsx` : SVG volumétrique `MB-VIS-LED-014` (`<defs>` + 3 gradients namespacés `uid`, perle en `<circle>`) → `<div class="part-thermistor" aria-label="Thermistance"><picture><source type="image/webp" srcSet 1x/3x><img src=…default.3x.png srcSet …pointer-events:none></picture></div>`. Dims via `getComponentDef("THERMISTOR")` (84×36). `uid` accepté, **non consommé** → aucune collision d'id. Aucun `<svg>`/`<defs>`/`<linearGradient>`/`<radialGradient>`/id/`url(#…)`. Accessibilité : `aria-label` racine + `alt=""`/`aria-hidden` sur l'`<img>`.

**Renderer central : NON modifié.** `CircuitComponent.css` : `.part-thermistor` réduit au centrage ; règles `.part-thermistor__lead/bead/bead-highlight` (SVG mortes) supprimées.

## Géométrie fonctionnelle préservée

`componentDefinitions.js` **non touché** : boîte **84 × 36**, pins **A (0,18)** / **B (84,18)**. `canonicalRegistry.js`, `Pin.jsx`, `geometry.js`, `pinPresentationGeometry.js`, `SimulationCanvas`, `simulator/*`, `ThermistorModel.js`, `Breadboard.*`, `holeAt` : non touchés.

## Tests

- **`ThermistorPart.uid.test.jsx` → `ThermistorPart.raster.test.jsx` (git rename, PAS supprimé — §9)** : assertions SVG-namespace **adaptées** (`[id].length === 0`, `withUid === withoutUid`, HTML des instances identique) ; rendu valide / aria-label / déterminisme / comportement uid / absence d'effet inter-instances **conservés** ; couverture d'intégration raster ajoutée. **16 tests.**
- **T10 non modifié** : THERMISTOR entre dans `RASTER_TYPES` automatiquement ; paquet conforme au schéma existant (ASSET-INTEGRITY tableau, `bytes`+`sha256`) → T10 valide les 4 assets + intégrité. `stateCount = 1`, `complexity: "simple"`.
- Gardes génériques (`partDimensionsGuard`, `partDimensionsCanonical`, `RealisticRenderers`) : THERMISTOR bascule SVG→RASTER automatiquement (dérivé du registre).
- `visualContract.test.js` : THERMISTOR → raster, liste raster `['CAPACITOR','DIODE','LDR','LED','RESISTOR','THERMISTOR']`, **BUZZER** devient l'exemple svg-défaut. `circuitComponentRasterChrome.test.jsx` : bloc « sans déclaration visual » → BUZZER (assertions identiques).

| Mesure | Valeur |
|---|---|
| Ciblé (14 fichiers) | **386 / 386 PASS** |
| Suite complète — avant (`63d3c24`) | 1656 pass / 16 fail (1672) |
| Suite complète — après | **1666 pass / 16 fail (1682)** — +10 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |
| `git diff --check` | **exit 0** |

## Preuve navigateur

MYBlab (`vite`, `localhost:5173`).

- **A — Palette** : « Thermistance » visible ; rendu canvas 100 % raster, aucun `<svg>`.
- **B — Canvas** : perle NTC époxy volumétrique, « NTC 10K » lisible, pattes axiales métalliques, boîte 84×36, transparence ; `.part-thermistor` `background rgba(0,0,0,0)` / `box-shadow none` / `filter none` ; `data-backend="raster"` + `data-bare-body` ; aucune boîte, aucun halo, aucune déformation, aucune ombre excessive.
- **C — Fils** : `Fils : 1` entre pinB(T1) et pinA(T2) ; jonctions à la pointe des pattes ; aucun décalage ; aucun fil dans le corps ; pins `A (0,18)` / `B (84,18)`.
- **D — Zoom** : `scale(0.5)` net · `scale(1)` net · `scale(2)` net, « NTC 10K » lisible, ancrage stable.
- **E — Multi-instance** : 3 THERMISTOR, `querySelectorAll('.part-thermistor [id]').length === 0` chacun, `innerHTML` identiques, drag → positions distinctes, 6 pins distincts, aucun conflit/artefact, aucun comportement dépendant du uid.
- **F — Breadboard** : THERMISTOR posé sur breadboard, `elementFromPoint(centre)` → `PICTURE.part-thermistor__picture` (asset topmost), `circle.breadboard__hole` = **420 inchangé** (avant/après), aucun fichier `Breadboard.*` modifié, aucun chevauchement anormal.
- Réseau : `GET …/thermistor.default.3x.webp → 200 OK`, aucun 404. Console : 0 erreur. `currentSrc = thermistor.default.3x.webp`, `complete: true`.

## Audit anti-hack

`type === "THERMISTOR"` central : **0** · switch central : **0** · `:has(.part-thermistor)` : **0** · CSS spécifique hors centrage : **0** · glow/`box-shadow`/`filter` sur `.part-thermistor*` : **0** · modification T10 / système générique : **0** · `!important` / z-index / pseudo-élément nouveaux : **0** · test supprimé pour PASS : **0** (renommé + adapté, garantie préservée) · assertion affaiblie : **0** · dépendance / refactor hors scope : **0** · fichiers interdits modifiés : **0**.

## Fichiers modifiés / créés

**Modifiés (4) :**
`frontend/src/components/parts/ThermistorPart.jsx` · `frontend/src/visualization/defaultRegistrations.js` · `frontend/src/canvas/CircuitComponent.css` · `frontend/src/visualization/__tests__/visualContract.test.js` · `frontend/src/canvas/__tests__/circuitComponentRasterChrome.test.jsx` *(5 au total avec circuitComponentRasterChrome)*

**Renommé (1) :** `frontend/src/components/parts/__tests__/ThermistorPart.uid.test.jsx` → `ThermistorPart.raster.test.jsx` (contenu adapté)

**Créés :**
`frontend/public/assets/components/thermistor/{thermistor.default.1x.png,1x.webp,3x.png,3x.webp,manifest.json,ASSET-INTEGRITY.json}` · `docs/pmo/tickets/MB-VIS-PROTOTYPE-006-thermistor.md` · ce rapport.

**NON modifiés :** `renderQualityGate.test.jsx` (T10), `componentDefinitions.js`, `canonicalRegistry.js`, `Pin.jsx`, `geometry.js`, `pinPresentationGeometry.js`, `CircuitComponent.jsx`, `PartRenderer.jsx`, `SimulationCanvas`, `visualStateRegistry.js`, `visualContract.js`, `Breadboard.*`, `simulator/*`, assets RESISTOR/DIODE/LED/CAPACITOR/LDR.

## Limites

- 6ᵉ variante de schéma de manifeste dans le catalogue (`type`/`canonical`/`state` singulier/`complexity`/`variants` avec `width`/`height` + `budget`). `ASSET-INTEGRITY.json` aligné sur la forme tableau acceptée par T10. Harmonisation complète des manifestes RESISTOR→THERMISTOR = dette documentaire mineure, hors périmètre.

## Suite

**MB-VIS-PROTOTYPE-006 finalisé.** Validation visuelle CSA finale de THERMISTOR requise avant l'ouverture du composant suivant (DC_MOTOR). **Ne pas enchaîner automatiquement** ; le prochain ticket suivra la procédure complète.
