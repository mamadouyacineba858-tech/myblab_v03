# MB-VIS-PROTOTYPE-003 — LED — Delivery Report

**Verdict : PASS.**
**Ticket :** `docs/pmo/tickets/MB-VIS-PROTOTYPE-003-led.md`.
**Base :** `c265873c94a275a6d681312eb444a2a23b72fb2c`. **Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.

## Objet livré

Intégration du paquet d'assets raster LED (états `off` / `on`, produit et fourni en externe) via le mécanisme déclaratif de `MB-VIS-INDUSTRIAL-001` — **troisième composant raster** du catalogue après RESISTOR et DIODE, et **premier à états visuels discrets**. Aucune adaptation du renderer central. L'état ON/OFF reste piloté par le système existant (Visual State Registry → `isOn`).

## Assets LED utilisés (non modifiés)

`frontend/public/assets/components/led/` :

| Fichier | Octets | Dimensions | Format | SHA-256 (== `ASSET-INTEGRITY.json`) |
|---|---|---|---|---|
| `led.off.1x.png` | 3665 | 80×64 | PNG RGBA8 (alpha) | `bd85945daa126badb01d8d8ce48d8f53a9388172b158b2550d6f05c17fcb4692` |
| `led.off.1x.webp` | 3314 | 80×64 | WebP VP8L (alpha) | `4afb536ae34dc89342968f466bd3994c69e8f98021001f1544a070f050de24ac` |
| `led.off.3x.png` | 25681 | 240×192 | PNG RGBA8 (alpha) | `c60bf6929d16f64ecfbdbd086c2090aa68a4ec4e87429aa8726ffba3b6f4156a` |
| `led.off.3x.webp` | 18772 | 240×192 | WebP VP8L (alpha) | `b9860edb04fcc2e6d5be5aea36505732124a27365ad695d5c89e0b5e4a54d409` |
| `led.on.1x.png` | 4462 | 80×64 | PNG RGBA8 (alpha) | `981a6391e384aa085fe328856fd4492c532e826961e6309dcb181ea2baa5514a` |
| `led.on.1x.webp` | 4474 | 80×64 | WebP VP8L (alpha) | `e236d17c8d620a5e81433640538e2ef11ef74d54796d52a49b957f304e9218f1` |
| `led.on.3x.png` | 34272 | 240×192 | PNG RGBA8 (alpha) | `ce71318ff8ee8f0c1a20645739f21b22e6e34403de6427118354b7377b50b32b` |
| `led.on.3x.webp` | 24022 | 240×192 | WebP VP8L (alpha) | `c0a83891e74b717c3a93ea6038e255f9735a0fb9d6c23cb4c36e5caaa6631925` |
| `manifest.json` | 1861 | — | — | `7bdccb43d95ef1ddc4357fa48444bfde7126a7c1a0ad2e3d37a0e3628cd8644a` |
| `ASSET-INTEGRITY.json` | — | — | — | source de vérité des hachages |

Contrôles (probe Node) : alpha présent 8/8 · `@3x = 3×@1x` exact (240=3×80 ; 192=3×64) · dim max 240 ≤ 1024 · `1x=80×64` / `3x=240×192` == `manifest.canonical` == `componentDefinitions.js` (80×64) · fond transparent réel · **SHA-256 réels == `ASSET-INTEGRITY.json` (8/8) == octets réels**. Budget : WebP servi ≤ 30 Ko (max 23.5) ; PNG fallback ≤ plafond complexe 120 Ko (max 33.5) — LED = paquet multi-états émissif. **Non régénérés, non recompressés, non renommés.**

## Intégration registre

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'LED', component: LedPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('LED')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
→ `VisualizationManager.getBackend('LED')` = `'raster'`.
Types raster déclarés : **RESISTOR, DIODE, LED**. Les 13 autres restent `svg` (testé).

## Renderer

`frontend/src/components/parts/LedPart.jsx` : série SVG volumétrique V8→V17 (`<defs>` + 6 gradients namespacés `uid`, glow dessiné) → `<div class="part-led [part-led--on]" aria-label="LED allumée|éteinte"><picture><source type="image/webp" srcSet 1x/3x><img src=…3x.png srcSet …pointer-events:none></picture></div>`. `source` = `on` si `isOn` sinon `off` (ternaire sur la prop, **aucun `type === "…"`**). Dimensions via `getComponentDef("LED")` (80×64). `uid` accepté, non consommé. Aucun `<svg>`/`<defs>`/gradient/`<line>`/`<rect>`/`<text>`.

**Renderer central (`CircuitComponent.jsx`, `Pin.jsx`/`.css`, `PartRenderer.jsx`) : NON modifié.** `data-bare-body` et `hideVisualMarker` dérivés du backend.

**`CircuitComponent.css`** : `.part-led` réduit au centrage (modèle `.part-diode`) ; `.part-led--on` (fond + `box-shadow` verts) **supprimé** (glow interdit hors asset + halo vert derrière LED rouge = régression) ; `.part-led__dome/flange/leg` et `.part-led--on .part-led__dome` (`filter: drop-shadow`) **supprimés** (primitives SVG disparues). Autorisé par le protocole Phase 6 ; `CircuitComponent.jsx` non touché.

## Géométrie fonctionnelle préservée

`componentDefinitions.js` **non touché** : boîte **80 × 64**, pins **anode (28,62)** / **cathode (52,62)**. `canonicalRegistry.js`, `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, `visualStateRegistry.js`, `defaultVisualStateRegistrations.js` : non touchés.

## Tests

- **`LedPart.raster.test.jsx` (nouveau, 14)** : rend correct, aucun `<svg>` (OFF+ON), asset raster attendu, 4 variantes/état, bascule OFF↔ON sans translation ni `<svg>`, `<img>` sans handler, déterminisme OFF+ON, backend `raster`, géométrie 80×64 / pins inchangés, pipeline `CircuitComponent` (2 pins `opacity:0`, `data-backend="raster"`, `data-bare-body`), aucune logique LED centrale, bubbling wrapper.
- **T10 (`renderQualityGate.test.jsx`) généralisé** : nombre de variantes = `states × resolutions × 2` (`stateCount` lu du manifeste ; RESISTOR/DIODE → 4 inchangé, LED → 8) ; `ASSET-INTEGRITY.json` tolère tableau racine **et** objet `{ files: [...] }` ; budget `complexe` si `complexity` déclarée **ou** `stateCount > 1` ; `@3x≈3×@1x` apparié par (état, format). Aucun nombre codé en dur ; RESISTOR/DIODE strictement inchangés.
- Gardes génériques (`partDimensionsGuard`, `partDimensionsCanonical`, `RealisticRenderers`, `PartRenderer.visualState`, `renderQualityGate` T8/T9) : LED **bascule automatiquement** SVG→RASTER (dérivé du registre), le contrat stateful `.part-led--on` / `aria-label` reste vert.
- `visualContract.test.js` : présentation LED → raster, liste raster → `['DIODE','LED','RESISTOR']`. `circuitComponentRasterChrome.test.jsx` : bloc LED → backend raster, asset `<img>`, aucun `<svg>`, garde `data-bare-body` + `opacity:0` conservée.

| Mesure | Valeur |
|---|---|
| Ciblé (10 fichiers) | **328 / 328 PASS** |
| Suite complète — avant (`c265873`) | ~1620 pass / 16 fail |
| Suite complète — après | **1639 pass / 16 fail (1655)** — +19 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |

## Preuve navigateur

MYBlab (`vite`, `localhost:5173`), circuit LED + Alimentation, 2 fils.

- **OFF** : `.part-led` sans `--on`, `aria-label="LED éteinte"`, `currentSrc = led.off.3x.webp`, rouge mat, aucun halo ; `.part-led` `box-shadow none` / `filter none` / `background transparent`.
- **ON** (Simuler) : `.part-led.part-led--on`, `aria-label="LED allumée"`, `currentSrc = led.on.3x.webp`, émission + halo rouges **cuits dans l'asset**, `box-shadow none` / `filter none`.
- **OFF↔ON** : wrapper `left/top` identiques (200/180) — **aucune translation** ; boîte 80×64 constante.
- Wrapper : `data-backend="raster"`, `.circuit-component__body[data-bare-body]` `background transparent` / `border 0` / `border-radius 0` / `box-shadow none`.
- Pins : anode `(28,62)` / cathode `(52,62)` relatifs, `opacity:0`, cliquables → `Fils : 2`.
- Zooms 0.5× / ~1× / ~1.9× : nets, aucun clipping, ancrage lead↔pin stable.
- Sélection : `outline rgb(34,197,94) solid 2px`. Drag : `left 200→120` / `top 180→100`, pins suivent, fils re-routés, 80×64 constant.
- Réseau : `GET /assets/components/led/led.{off,on}.*` → 200 / 304, aucun 404. Console : 0 erreur.
- Aperçu Sidebar : rend `led.off.*` sans erreur.

## Audit anti-hack

`type === "LED"` dans la couche de rendu : **0** · `:has(.part-led)` : **0** · glow CSS sur `.part-led*` : **0** (supprimé) · règle CSS spécifique LED hors centrage : **0** · `!important` nouveau : **0** · z-index nouveau : **0** · assertion affaiblie/supprimée : **0** · dépendance : **0** · fichiers interdits modifiés : **0**.

## Fichiers modifiés / créés

**Modifiés (6) :**
`frontend/src/components/parts/LedPart.jsx` · `frontend/src/visualization/defaultRegistrations.js` · `frontend/src/canvas/CircuitComponent.css` · `frontend/src/__tests__/renderQualityGate.test.jsx` · `frontend/src/visualization/__tests__/visualContract.test.js` · `frontend/src/canvas/__tests__/circuitComponentRasterChrome.test.jsx`

**Créés :**
`frontend/src/components/parts/__tests__/LedPart.raster.test.jsx` · `frontend/public/assets/components/led/{led.off.1x.png,led.off.1x.webp,led.off.3x.png,led.off.3x.webp,led.on.1x.png,led.on.1x.webp,led.on.3x.png,led.on.3x.webp,manifest.json,ASSET-INTEGRITY.json}` · `docs/pmo/tickets/MB-VIS-PROTOTYPE-003-led.md` · ce rapport.

## Limites

- `RENDER_BUDGET.raster` (30 / 120 Ko) reste `provisional` (`confirmBy: MB-VIS-PROTOTYPE-001..003`) — LED confirme qu'un paquet multi-états émissif @3x PNG dépasse le plafond `simple` ; T10 le classe `complexe` via `stateCount > 1`. Une révision explicite des seuils par le CSA reste possible.
- Schémas de manifeste RESISTOR / DIODE / LED divergents (`type`/`canonicalBox`/`assets` vs `component`/`canonical`/`variants` vs `component`/`canonical`/`variants`+`states`) — T10 tolère les trois ; harmonisation = dette documentaire mineure, hors périmètre.

## Suite

**MB-VIS-PROTOTYPE-003 finalisé.** Validation visuelle CSA finale de LED requise avant l'ouverture du composant suivant (CAPACITOR). **Ne pas enchaîner automatiquement.**
