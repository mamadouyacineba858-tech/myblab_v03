# MB-VIS-PROTOTYPE-004 — CAPACITOR — Delivery Report

**Verdict : PASS.**
**Ticket :** `docs/pmo/tickets/MB-VIS-PROTOTYPE-004-capacitor.md`.
**Base :** `64f35d662d38d58763d7ba855c960fee2d0bf0cb`. **Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.

## Objet livré

Intégration de l'asset raster CAPACITOR (état unique `default`, paquet **corrigé** après le pré-audit BLOCKED) via le mécanisme déclaratif de `MB-VIS-INDUSTRIAL-001` — **quatrième composant raster** du catalogue (après RESISTOR, DIODE, LED). Aucune adaptation du renderer central, aucune modification de T10.

## Blocages du pré-audit — résolus PAR LE PAQUET

| Blocage | Ancien paquet | Paquet corrigé livré |
|---|---|---|
| Poids @3x | `capacitor.3x.png` 42.6 Ko / `.3x.webp` 33.6 Ko > 30 Ko (simple), mono-état | **11.3 Ko / 4.0 Ko** — ≤ 30 Ko, aucun `complex`, aucun assouplissement |
| Schéma `ASSET-INTEGRITY` | `files` objet indexé + clé `size` — illisible par T10 | `files` **tableau** `[{file, bytes, sha256}]` — schéma déjà accepté par T10 |
| Nommage | `capacitor.1x.png` (sans `.default.`) | `capacitor.default.{1x,3x}.{png,webp}` — canonique |

**T10 non modifié.** Aucune classification `complex` artificielle, aucun assouplissement du budget raster.

## Assets (non modifiés par l'agent)

`frontend/public/assets/components/capacitor/` :

| Fichier | Octets | Dim. | Format | SHA-256 (== ASSET-INTEGRITY == manifest.variants) |
|---|---|---|---|---|
| `capacitor.default.1x.png` | 1811 | 70×40 | PNG RGBA8 | `d1faeb38…ba389` |
| `capacitor.default.1x.webp` | 1544 | 70×40 | WebP VP8L | `fdf6f123…03c3` |
| `capacitor.default.3x.png` | 11573 | 210×120 | PNG RGBA8 | `684e8ee6…46be` |
| `capacitor.default.3x.webp` | 4122 | 210×120 | WebP VP8L | `5ecc61c5…84b8` |
| `manifest.json` | 1383 | — | — | `component`/`canonical`/`states:["default"]`/`variants[]` (bytes+dimensions+alpha) |
| `ASSET-INTEGRITY.json` | 734 | — | — | `{ …, files: [ {file,bytes,sha256} ] }` (tableau) |

Contrôles (probe Node) : alpha 4/4 · `@3x = 3×@1x` exact · dim max 210 ≤ 1024 · 70×40 / 210×120 == `manifest.canonical` == `componentDefinitions.js` · SHA-256 réels == ASSET-INTEGRITY (4/4) == manifest.variants (4/4) == octets · poids ≤ 30 Ko (4/4). Non régénérés / recompressés / renommés.

## Intégration registre

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'CAPACITOR', component: CapacitorPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('CAPACITOR')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
Types raster : **RESISTOR, DIODE, LED, CAPACITOR**. Les 12 autres restent `svg` (testé).

## Renderer

`CapacitorPart.jsx` : SVG volumétrique `MB-VIS-COMP-011` (`<defs>` + 3 gradients namespacés `uid`, `<text>` « 104 ») → `<div class="part-capacitor" aria-label="Condensateur"><picture><source type="image/webp" srcSet 1x/3x><img src=…default.3x.png srcSet …pointer-events:none></picture></div>`. Dims via `getComponentDef("CAPACITOR")` (70×40). `uid` accepté, **non consommé** → aucune collision d'id entre instances. Aucun `<svg>`/`<defs>`/gradient/`<text>`. Accessibilité : `aria-label` racine + `alt=""`/`aria-hidden` sur l'`<img>`.

**Renderer central : NON modifié.** `CircuitComponent.css` : `.part-capacitor` réduit au centrage (rien d'interdit à retirer, contrairement à LED) ; règles `.part-capacitor__lead/disc/disc-outline` (SVG mortes) supprimées.

## Géométrie fonctionnelle préservée

`componentDefinitions.js` **non touché** : boîte **70 × 40**, pins **pinA (0,20)** / **pinB (70,20)**. `simulator/*`, `CapacitorModel.js`, `geometry.js`, `pinPresentationGeometry.js` : non touchés.

## Tests

- **`CapacitorPart.raster.test.jsx` (nouveau, 12)** — remplace `CapacitorPart.uid.test.jsx` (6, contrat SVG V0 obsolète, supprimé). Rend correct, aucun `<svg>`/gradient/`<text>`, asset raster + 4 variantes, `<img>` sans handler, déterminisme, **2 CAPACITOR simultanés : 0 `[id]`, HTML identiques (aucune collision)**, backend `raster`, géométrie 70×40 / pins inchangés, pipeline `CircuitComponent` (2 pins `opacity:0`, `data-backend="raster"`, `data-bare-body`), **2 CAPACITOR canvas : 4 pins distincts / 2 `<img>` / 0 `<svg>`**, aucune logique CAPACITOR centrale, bubbling wrapper.
- **T10 non modifié** : CAPACITOR entre dans `RASTER_TYPES` automatiquement ; le paquet corrigé conforme au schéma existant → T10 valide les 4 assets + intégrité (octets == manifeste == ASSET-INTEGRITY + sha256, budget simple, dim, `@3x≈3×@1x`).
- Gardes génériques (`partDimensionsGuard`, `partDimensionsCanonical`, `RealisticRenderers`) : CAPACITOR bascule SVG→RASTER automatiquement (dérivé du registre).
- `visualContract.test.js` : CAPACITOR → raster, liste raster `['CAPACITOR','DIODE','LED','RESISTOR']`, THERMISTOR introduit comme exemple svg-défaut. `circuitComponentRasterChrome.test.jsx` : bloc « sans déclaration visual » → THERMISTOR (assertions identiques).

| Mesure | Valeur |
|---|---|
| Ciblé (11 fichiers) | **344 / 344 PASS** |
| Suite complète — avant (`64f35d6`) | 1639 pass / 16 fail (1655) |
| Suite complète — après | **1646 pass / 16 fail (1662)** — +7 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |
| `git diff --check` | **exit 0** |

## Preuve navigateur (11 points)

MYBlab (`vite`, `localhost:5173`), **deux CAPACITOR** placés.

1-3. app / canvas / 2 CAPACITOR → `Composants : 2`.
4. zoom 1× : disque céramique ambre, « 104 », 2 pattes axiales ; `.part-capacitor` `background rgba(0,0,0,0)` / `box-shadow none` / `filter none`.
5. zoom 0.5× : lisible, net, aucun clipping.
6. zoom 1× : confirmé.
7. zoom 2× (`scale(2)`) : net, « 104 » lisible, asset @3x WebP tient.
8. pattes ↔ pins : fil terminé pile à la pointe de chaque patte ; pins `pinA (0,20)` / `pinB (70,20)`.
9. absence de boîte/fond : `data-backend="raster"`, `.circuit-component__body[data-bare-body]` neutralisé ; seul rectangle = liseré de sélection.
10. câble : `Fils : 1` entre pinB(cap1) et pinA(cap2), jonction propre.
11. deux CAPACITOR : `querySelectorAll('.part-capacitor [id]').length === 0` chacun ; `innerHTML` des deux `.part-capacitor` identiques ; drag → `200/180` et `100/340` (distincts) ; 4 pins distincts.
Réseau : `GET …/capacitor.default.3x.webp → 200 OK`, aucun 404. Console : 0 erreur. `currentSrc = capacitor.default.3x.webp`, `complete: true`.

## Audit anti-hack

`type === "CAPACITOR"` central : **0** · `:has(.part-capacitor)` : **0** · CSS spécifique CAPACITOR hors centrage : **0** · glow/`box-shadow`/`filter` sur `.part-capacitor*` : **0** · modification T10 : **0** · `complex` artificiel / budget assoupli : **0** · `!important` / z-index / pseudo-élément nouveaux : **0** · assertion affaiblie/supprimée : **0** · dépendance : **0** · fichiers interdits modifiés : **0**.

## Fichiers modifiés / créés

**Modifiés (5) :**
`frontend/src/components/parts/CapacitorPart.jsx` · `frontend/src/visualization/defaultRegistrations.js` · `frontend/src/canvas/CircuitComponent.css` · `frontend/src/visualization/__tests__/visualContract.test.js` · `frontend/src/canvas/__tests__/circuitComponentRasterChrome.test.jsx`

**Supprimé (1) :** `frontend/src/components/parts/__tests__/CapacitorPart.uid.test.jsx`

**Créés :**
`frontend/src/components/parts/__tests__/CapacitorPart.raster.test.jsx` · `frontend/public/assets/components/capacitor/{capacitor.default.1x.png,1x.webp,3x.png,3x.webp,manifest.json,ASSET-INTEGRITY.json}` · `docs/pmo/tickets/MB-VIS-PROTOTYPE-004-capacitor.md` · ce rapport.

**NON modifiés :** `renderQualityGate.test.jsx` (T10), `componentDefinitions.js`, `CircuitComponent.jsx`, `Pin.jsx`, `Pin.css`, `PartRenderer.jsx`, `visualStateRegistry.js`, `visualContract.js`, `Breadboard.*`, `simulator/*`, assets RESISTOR/DIODE/LED.

## Limites

- 4ᵉ schéma de manifeste dans le catalogue (`component`/`canonical`/`states`/`variants` avec `bytes`+`dimensions`+`alpha`). `ASSET-INTEGRITY.json` aligné sur la forme tableau acceptée par T10. Harmonisation complète des manifestes RESISTOR/DIODE/LED/CAPACITOR = dette documentaire mineure, hors périmètre.

## Suite

**MB-VIS-PROTOTYPE-004 finalisé.** Validation visuelle CSA finale de CAPACITOR requise avant l'ouverture du composant suivant (LDR / THERMISTOR). **Ne pas enchaîner automatiquement.**
