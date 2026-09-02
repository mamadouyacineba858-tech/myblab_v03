# MB-VIS-PROTOTYPE-005 — LDR — Delivery Report

**Verdict : PASS.**
**Ticket :** `docs/pmo/tickets/MB-VIS-PROTOTYPE-005-ldr.md`.
**Base :** `919473e9f615353732b9dc3f10ec5d007a1e5a05`. **Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.

## Objet livré

Intégration de l'asset raster LDR (photorésistance, état unique `default`, paquet validé `MB-VIS-PROTOTYPE-005-LDR-assets-v1.0.0`) via le mécanisme déclaratif de `MB-VIS-INDUSTRIAL-001` — **cinquième composant raster** du catalogue (après RESISTOR, DIODE, LED, CAPACITOR). Aucune adaptation du renderer central, aucune modification de T10, aucune modification de la géométrie / simulation / breadboard.

## Assets (paquet validé, non modifiés)

`frontend/public/assets/components/ldr/` :

| Fichier | Octets | Dim. | Format | SHA-256 (== ASSET-INTEGRITY == manifest.variants) | Budget |
|---|---|---|---|---|---|
| `ldr.default.1x.png` | 5658 | 84×36 | PNG RGBA8 | `220eb9f8…05dc` | 5.5 Ko ✅ |
| `ldr.default.1x.webp` | 3022 | 84×36 | WebP VP8L | `4f2a9378…8303` | 3.0 Ko ✅ |
| `ldr.default.3x.png` | 27759 | 252×108 | PNG RGBA8 | `1d095f52…b5df` | 27.1 Ko ✅ |
| `ldr.default.3x.webp` | 19492 | 252×108 | WebP VP8L | `ae4738e6…7828` | 19.0 Ko ✅ |
| `manifest.json` | 1798 | — | — | `type`/`canonical`/`state`/`variants[]` (bytes+sha256+dimensions+alpha) | — |
| `ASSET-INTEGRITY.json` | 1555 | — | — | `{ version, type, files: [ … ] }` — **forme tableau** (T10-compatible) | — |

Contrôles (probe Node) : alpha 4/4 · `@3x = 3×@1x` exact (252=3×84, 108=3×36) · dim max 252 ≤ 1024 · 84×36 / 252×108 == `manifest.canonical` == `componentDefinitions.js` · SHA-256 concordants sur **deux sources** (ASSET-INTEGRITY + manifest.variants) + octets réels · poids ≤ 30 Ko (4/4, budget `simple`). Naming canonique `ldr.default.{res}.{ext}`. Non régénérés / recompressés / renommés.

## Intégration registre

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'LDR', component: LdrPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('LDR')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
Types raster : **RESISTOR, DIODE, LED, CAPACITOR, LDR**. Les 11 autres restent `svg` (testé).

## Renderer

`LdrPart.jsx` : SVG volumétrique `MB-VIS-LED-013` (`<defs>` + 3 gradients namespacés `uid`, piste en `<path>`) → `<div class="part-ldr" aria-label="Photorésistance"><picture><source type="image/webp" srcSet 1x/3x><img src=…default.3x.png srcSet …pointer-events:none></picture></div>`. Dims via `getComponentDef("LDR")` (84×36). `uid` accepté, **non consommé** → aucune collision d'id entre instances. Aucun `<svg>`/`<defs>`/gradient/id/filtre SVG. Accessibilité : `aria-label` racine + `alt=""`/`aria-hidden` sur l'`<img>`.

**Renderer central : NON modifié.** `CircuitComponent.css` : `.part-ldr` réduit au centrage ; règles `.part-ldr__lead/disc/track` (SVG mortes) supprimées.

## Géométrie fonctionnelle préservée

`componentDefinitions.js` **non touché** : boîte **84 × 36**, pins **A (0,18)** / **B (84,18)**. `Pin.jsx`, `geometry.js`, `pinPresentationGeometry.js`, `SimulationCanvas`, `simulator/*`, `LdrModel.js`, `Breadboard.*`, `holeAt` : non touchés.

## Tests

- **`LdrPart.uid.test.jsx` → `LdrPart.raster.test.jsx` (git rename, PAS supprimé — §8)** : assertions SVG obsolètes **adaptées** (id/`url(#…)`/`const id =` → `[id].length === 0`, HTML des deux instances identique) ; déterminisme et garde source **conservés** ; couverture d'intégration raster ajoutée. **16 tests.**
- **T10 non modifié** : LDR entre dans `RASTER_TYPES` automatiquement ; le paquet conforme au schéma existant (ASSET-INTEGRITY tableau, manifest.variants `bytes`) → T10 valide les 4 assets + intégrité. `stateCount = 1`.
- Gardes génériques (`partDimensionsGuard`, `partDimensionsCanonical`, `RealisticRenderers`) : LDR bascule SVG→RASTER automatiquement (dérivé du registre).
- `visualContract.test.js` : LDR → raster, liste raster `['CAPACITOR','DIODE','LDR','LED','RESISTOR']`.

| Mesure | Valeur |
|---|---|
| Ciblé (13 fichiers) | **370 / 370 PASS** |
| Suite complète — avant (`919473e`) | 1646 pass / 16 fail (1662) |
| Suite complète — après | **1656 pass / 16 fail (1672)** — +10 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |
| `git diff --check` | **exit 0** |

## Preuve navigateur

MYBlab (`vite`, `localhost:5173`).

- **A — Palette** : « Photoresistance (LDR) » visible ; rendu canvas 100 % raster, aucun `<svg>`.
- **B — Canvas** : disque + piste en créneau + anneau + pattes axiales, boîte 84×36, transparence ; `.part-ldr` `background rgba(0,0,0,0)` / `box-shadow none` / `filter none` ; `data-backend="raster"`, `data-bare-body` ; aucun rectangle, aucun halo, aucune déformation.
- **C — Fils** : `Fils : 1` entre pinB(LDR1) et pinA(LDR2) ; jonctions à la pointe des pattes ; aucun fil dans le corps ; pins `A (0,18)` / `B (84,18)`.
- **D — Zoom** : `scale(0.5)` net · `scale(1)` net · `scale(2)` net, piste lisible, ancrage stable.
- **E — Multi-instance** : 2 LDR, `querySelectorAll('.part-ldr [id]').length === 0` chacun, `innerHTML` identiques, drag → `200/180` et `100/360` (distincts), 4 pins distincts.
- **F — Breadboard** : LDR posé sur breadboard, `elementFromPoint(centre)` → `PICTURE.part-ldr__picture` (asset topmost), `circle.breadboard__hole` = **420 inchangé**, aucun fichier `Breadboard.*` modifié.
- Réseau : `GET …/ldr.default.3x.webp → 200 OK`, aucun 404. Console : 0 erreur. `currentSrc = ldr.default.3x.webp`, `complete: true`.

## Audit anti-hack

`type === "LDR"` central : **0** · `:has(.part-ldr)` : **0** · CSS spécifique LDR hors centrage : **0** · glow/`box-shadow`/`filter` sur `.part-ldr*` : **0** · modification T10 : **0** · `!important` / z-index / pseudo-élément nouveaux : **0** · test supprimé pour PASS : **0** (renommé + adapté) · assertion affaiblie : **0** · dépendance : **0** · fichiers interdits modifiés : **0**.

## Fichiers modifiés / créés

**Modifiés (4) :**
`frontend/src/components/parts/LdrPart.jsx` · `frontend/src/visualization/defaultRegistrations.js` · `frontend/src/canvas/CircuitComponent.css` · `frontend/src/visualization/__tests__/visualContract.test.js`

**Renommé (1) :** `frontend/src/components/parts/__tests__/LdrPart.uid.test.jsx` → `LdrPart.raster.test.jsx` (contenu adapté)

**Créés :**
`frontend/public/assets/components/ldr/{ldr.default.1x.png,1x.webp,3x.png,3x.webp,manifest.json,ASSET-INTEGRITY.json}` · `docs/pmo/tickets/MB-VIS-PROTOTYPE-005-ldr.md` · ce rapport.

**NON modifiés :** `renderQualityGate.test.jsx` (T10), `componentDefinitions.js`, `Pin.jsx`, `geometry.js`, `pinPresentationGeometry.js`, `CircuitComponent.jsx`, `PartRenderer.jsx`, `SimulationCanvas`, `visualStateRegistry.js`, `visualContract.js`, `Breadboard.*`, `simulator/*`, assets RESISTOR/DIODE/LED/CAPACITOR.

## Limites

- 5ᵉ variante de schéma de manifeste dans le catalogue (`type`/`canonical`/`state` singulier/`variants` avec `bytes`+`dimensions`+`alpha`-objet). `ASSET-INTEGRITY.json` aligné sur la forme tableau acceptée par T10. Harmonisation complète des manifestes = dette documentaire mineure, hors périmètre.

## Suite

**MB-VIS-PROTOTYPE-005 finalisé.** Validation visuelle CSA finale de LDR requise avant l'ouverture de `MB-VIS-PROTOTYPE-006 — THERMISTOR`. **Ne pas enchaîner automatiquement.**
