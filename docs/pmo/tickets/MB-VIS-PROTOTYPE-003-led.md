# MB-VIS-PROTOTYPE-003 — LED — Intégration raster (états ON / OFF)

**Statut : PASS — LED intégrée au backend raster déclaratif, premier composant raster à ÉTATS visuels discrets.**
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-010` (`visualContract.js`), `MB-VIS-INDUSTRIAL-001` (backend déclaratif, `db24f72`), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, chaîne RESISTOR (`MB-VIS-PROTOTYPE-001A→001C.4`), DIODE (`MB-VIS-PROTOTYPE-002`, `9b167cf`).
**Base Git :** `c265873c94a275a6d681312eb444a2a23b72fb2c` — branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`.
**Séquence :** `VISUAL-COMPONENT-PROTOCOL.md` « Ordre recommandé » : CAPITALISATION → INDUSTRIAL-001 → DIODE → **LED (états)** → CAPACITOR → …

**Ce que ce ticket modifie :** `LedPart.jsx` (SVG volumétrique V8→V17 → raster `<picture>/<img>` stateful), `defaultRegistrations.js` (`visual: { backend: 'raster' }` sur LED), `CircuitComponent.css` (neutralisation du chrome `.part-led` + suppression du `box-shadow` vert de `.part-led--on` — glow interdit hors asset — + suppression des règles `.part-led__dome/flange/leg` qui ciblaient des primitives SVG disparues), `renderQualityGate.test.jsx` (T10 généralisé états × résolutions × formats + tolérance schéma `ASSET-INTEGRITY` objet), `visualContract.test.js` (liste des types raster + présentation LED), `circuitComponentRasterChrome.test.jsx` (LED backend raster), **nouveau** `LedPart.raster.test.jsx`, + le paquet d'assets `frontend/public/assets/components/led/`.

**NON modifiés :** `componentDefinitions.js`, `canonicalRegistry.js`, `CircuitComponent.jsx`, `Pin.jsx`, `Pin.css`, `PartRenderer.jsx`, `visualStateRegistry.js`, `defaultVisualStateRegistrations.js`, `visualContract.js`, `Breadboard.*`, `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, assets RESISTOR / DIODE, architecture Undo/Redo. Aucune dépendance ajoutée.

---

## 1. Cible visuelle canonique

Composant : LED through-hole 5 mm réaliste, rouge. Backend cible : **raster**.

Géométrie fonctionnelle **INCHANGÉE** (`componentDefinitions.js`, source de vérité, non touchée) :

| Grandeur | Valeur canonique |
|---|---|
| `width` | 80 |
| `height` | 64 |
| pin `anode` | `dx=28, dy=62` (role `input`) |
| pin `cathode` | `dx=52, dy=62` |
| origine | top-left, axe y vers le bas |
| tolérance d'ancrage lead↔pin | ≤ 0.75 u canvas @1× |
| zooms de contrôle | 0.5× / 1× / 2× |

États :

- **OFF** — LED éteinte, non émissive, aucune lueur / aucun halo.
- **ON** — LED allumée, émission lumineuse rouge **cuite dans l'asset `led.on.*`** (halo / luminescence intégrés à l'image).

Interdits respectés : aucun `box-shadow`, aucun `filter` CSS, aucun pseudo-élément, aucun glow SVG, aucun shader, aucun effet dynamique ajouté par le renderer. L'état ON/OFF provient **exclusivement** du système existant : `isOn` dérivé des signaux de pins par le Visual State Registry (`defaultVisualStateRegistrations.js` → `getLedState` → `on = anode HIGH && cathode LOW`) et transmis en prop par `PartRenderer.jsx`. Aucune logique de simulation déplacée dans le composant visuel.

Le wrapper conserve `class="part-led"` / `.part-led--on` et `aria-label` (« LED allumée » / « LED éteinte ») du contrat historique.

## 2. Assets — paquet fourni, vérifié, non modifié

`frontend/public/assets/components/led/` — **10 fichiers** (production externe, `provenance: "AI-generated visual asset package prepared for MB-VIS-PROTOTYPE-003; geometry contract remains repository-canonical."`).

| Fichier | Octets | Dimensions | Format | SHA-256 (== `ASSET-INTEGRITY.json`) |
|---|---|---|---|---|
| `led.off.1x.png` | 3665 | 80×64 | PNG RGBA8 (alpha, colorType 6) | `bd85945daa126badb01d8d8ce48d8f53a9388172b158b2550d6f05c17fcb4692` |
| `led.off.1x.webp` | 3314 | 80×64 | WebP VP8L (alpha) | `4afb536ae34dc89342968f466bd3994c69e8f98021001f1544a070f050de24ac` |
| `led.off.3x.png` | 25681 | 240×192 | PNG RGBA8 (alpha) | `c60bf6929d16f64ecfbdbd086c2090aa68a4ec4e87429aa8726ffba3b6f4156a` |
| `led.off.3x.webp` | 18772 | 240×192 | WebP VP8L (alpha) | `b9860edb04fcc2e6d5be5aea36505732124a27365ad695d5c89e0b5e4a54d409` |
| `led.on.1x.png` | 4462 | 80×64 | PNG RGBA8 (alpha) | `981a6391e384aa085fe328856fd4492c532e826961e6309dcb181ea2baa5514a` |
| `led.on.1x.webp` | 4474 | 80×64 | WebP VP8L (alpha) | `e236d17c8d620a5e81433640538e2ef11ef74d54796d52a49b957f304e9218f1` |
| `led.on.3x.png` | 34272 | 240×192 | PNG RGBA8 (alpha) | `ce71318ff8ee8f0c1a20645739f21b22e6e34403de6427118354b7377b50b32b` |
| `led.on.3x.webp` | 24022 | 240×192 | WebP VP8L (alpha) | `c0a83891e74b717c3a93ea6038e255f9735a0fb9d6c23cb4c36e5caaa6631925` |
| `manifest.json` | 1861 | — | — | `7bdccb43d95ef1ddc4357fa48444bfde7126a7c1a0ad2e3d37a0e3628cd8644a` |
| `ASSET-INTEGRITY.json` | — | — | — | (source de vérité des hachages) |

Contrôles (probe **Node**, jamais PowerShell) : alpha présent 8/8 · `@3x = 3×@1x` exact (240 = 3×80, 192 = 3×64) · dimension max 240 ≤ 1024 · `1x = 80×64`, `3x = 240×192` == `manifest.canonical` == `componentDefinitions.js` · fond transparent (canal alpha réel, VP8L / PNG colorType 6) · **SHA-256 réels == `ASSET-INTEGRITY.json` (8/8) == octets réels**. **Non régénérés, non recompressés, non redessinés, non renommés.**

Budget de poids : WebP (format servi) — max `led.on.3x.webp` = 23.5 Ko ≤ 30 Ko (`RENDER_BUDGET.raster.maxWeightKbPerVariantSimple`). PNG (fallback lossless) — max `led.on.3x.png` = 33.5 Ko ; classé sous le plafond `complexe` (120 Ko) car LED est un paquet **multi-états émissif** (`states.length > 1`) — voir §5, généralisation T10.

## 3. Registration

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'LED', component: LedPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('LED')` = `{ backend: 'raster', bareBody: true, markerless: true }` (dérivé par `resolvePresentation`, `bareBody`/`markerless` implicites pour tout backend `raster`).
→ `VisualizationManager.getBackend('LED')` = `'raster'`.
Types raster déclarés : **RESISTOR, DIODE, LED**. Les 13 autres restent `svg` par défaut (testé).
Aucun nouveau système de backend, aucune architecture parallèle.

## 4. Renderer

`frontend/src/components/parts/LedPart.jsx` : série SVG volumétrique V8→V17 (`<defs>` + 6 gradients namespacés `uid`, glow dessiné dans le SVG) → 
```jsx
<div className={`part-led ${isOn ? 'part-led--on' : ''}`} aria-label={isOn ? 'LED allumée' : 'LED éteinte'}>
  <picture className="part-led__picture">
    <source type="image/webp" srcSet={source.webp} />
    <img className="part-led__img" src={source.fallback} srcSet={source.png}
         width={def.width} height={def.height} draggable={false} alt="" aria-hidden="true"
         style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }} />
  </picture>
</div>
```
- `source` = `ASSET_SOURCES.on` si `isOn`, sinon `ASSET_SOURCES.off` — **ternaire sur la prop, aucune branche `type === "…"`** ;
- dimensions via `getComponentDef("LED")` (80×64), aucune valeur recopiée ;
- `uid` reste accepté (contrat de props) mais n'est plus consommé → rendu déterministe ;
- aucun `<svg>`/`<defs>`/`<linearGradient>`/`<radialGradient>`/`<line>`/`<rect>`/`<text>`.

**Renderer central (`CircuitComponent.jsx`/`.jsx`, `Pin.jsx`/`.css`, `PartRenderer.jsx`) : NON modifié.** Chrome (`data-bare-body`) et masquage du marqueur (`hideVisualMarker` → `opacity:0` inline) dérivés automatiquement du backend — aucun `type === "LED"`, aucune règle `:has(.part-led)`, aucun `!important`, aucun z-index ajouté.

**`CircuitComponent.css`** : `.part-led` réduit au centrage (modèle `.part-resistor` / `.part-diode`) ; `.part-led--on` (fond vert + `box-shadow: 0 0 20px` vert) **supprimé** — c'était un glow CSS interdit par ce ticket et un halo vert derrière une LED rouge (régression visuelle). Règles `.part-led__dome` / `.part-led--on .part-led__dome` (`filter: drop-shadow`) / `.part-led__flange` / `.part-led__leg` **supprimées** — elles ciblaient des primitives SVG qui n'existent plus. Autorisé par le protocole Phase 6 (`CircuitComponent.css` pour la suppression de chrome résiduel) ; `CircuitComponent.jsx` non touché.

## 5. Tests

Commande canonique : `npx vitest run --config src/simulator/vitest.config.ts` (depuis `frontend/`).

### `LedPart.raster.test.jsx` (nouveau, 14 tests) — remplace la couverture SVG V0
Rend correct (racine `.part-led`, aria-label selon `isOn`) · aucun `<svg>`/gradient/`<line>`/`<rect>`/`<text>` (OFF et ON) · `<picture>/<source webp>` + `<img>` vers `/assets/components/led/led.<state>.*` · 4 variantes de chaque état référencées · bascule OFF↔ON : seuls classe + aria-label + jeu d'assets changent, aucune translation, aucun `<svg>` · `<img>` sans gestionnaire, `draggable=false`, `pointer-events:none` · déterminisme OFF **et** ON · backend résolu `raster` (`bareBody`+`markerless`) · géométrie 80×64 / anode(28,62) / cathode(52,62) inchangée · pipeline réel `CircuitComponent` : 2 pins aux positions canoniques `opacity:0`, `data-backend="raster"`, `data-bare-body`, asset `<img>` dans le wrapper, aucun `<svg>` · aucune comparaison `type === "LED"` ni `:has(.part-led)` ni glow CSS résiduel dans la couche centrale · bubbling wrapper (l'`<img>` ne capte pas les événements).

### T10 (`renderQualityGate.test.jsx`) — généralisé « proprement selon le contrat »
- **Nombre de variantes** : `stateCount × RENDER_BUDGET.raster.resolutions × 2` où `stateCount = manifest.states?.length ?? 1`. RESISTOR / DIODE (pas de `states`) → `1 × 2 × 2 = 4` (inchangé) ; LED → `2 × 2 × 2 = 8`. Aucun nombre codé en dur.
- **Schéma `ASSET-INTEGRITY.json`** : tolère le tableau racine (`[ {file,…} ]`, schéma DIODE) **et** l'objet `{ component, version, files: [ … ] }` (schéma LED).
- **Budget de poids** : `complexe` (120 Ko) si `manifest.complexity === "complex"`, `manifest.budget?.complexity === "complex"`, **ou** `stateCount > 1` (paquet multi-états émissif — l'état `on` porte la luminescence cuite, plus lourde qu'un passif matte ; `RENDER_BUDGET.raster` est explicitement `provisional`, `confirmBy: MB-VIS-PROTOTYPE-001..003`). Sinon `simple` (30 Ko). RESISTOR / DIODE restent `simple`.
- **`@3x ≈ 3×@1x`** : appariement **par (état, format)** quand `states` est déclaré ; appariement global unique sinon (RESISTOR / DIODE strictement inchangés).

### Gardes génériques (dérivées du registre — aucune liste éditée)
`partDimensionsGuard` / `partDimensionsCanonical` : LED **bascule automatiquement** du groupe SVG au groupe RASTER (dérivé de `getComponentPresentation().backend`). `RealisticRenderers` : le filtre `isRaster` déplace LED vers le bloc `<img>` ; le bloc « LED état dynamique isOn » (classe + aria-label) reste vert (le wrapper les conserve). `PartRenderer.visualState` : TEST 3 (isOn dérivé de `pinSignals` réels) reste vert. `renderQualityGate` T8 (déterminisme), T9 (`if (!svg)`) : verts.

### Mises à jour d'assertions figeant « LED = svg » (Phase 5, autorisé)
`visualContract.test.js` : `getBackend('LED') → 'raster'`, `getPresentation('LED') → { backend:'raster', bareBody:true, markerless:true }`, liste raster → `['DIODE','LED','RESISTOR']`. `circuitComponentRasterChrome.test.jsx` : bloc LED → `data-backend="raster"`, asset `<img>`, aucun `<svg>`, garde `data-bare-body` + `opacity:0` conservée. Aucune assertion affaiblie ou supprimée — généralisation / réalignement sur le registre.

### Résultats

| Mesure | Valeur |
|---|---|
| Ciblé (10 fichiers) | **328 / 328 PASS** |
| Suite complète — avant (`c265873`) | ~1620 pass / 16 fail |
| Suite complète — après | **1639 pass / 16 fail (1655)** — +19 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` §3 (géométrie breadboard / MB-VIS-LED-V5) — aucun lié au rendu LED |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |

## 6. Preuve navigateur (Phase 8, obligatoire)

MYBlab lancé (`vite`, `http://localhost:5173`), circuit réel LED + Alimentation, 2 fils (anode → +5V, cathode → GND).

| Contrôle | Résultat |
|---|---|
| LED OFF (repos) | `.part-led` sans `--on`, `aria-label="LED éteinte"`, `<img>` `currentSrc = led.off.3x.webp` (WebP @3x servi, DPR 1.5), rouge mat, **aucun halo**, `getComputedStyle(.part-led)` : `background rgba(0,0,0,0)`, `box-shadow none`, `filter none` |
| LED ON (Simuler) | `.part-led.part-led--on`, `aria-label="LED allumée"`, `<img>` `currentSrc = led.on.3x.webp`, émission rouge + halo **cuits dans l'asset**, `box-shadow none` / `filter none` sur `.part-led` (aucun glow CSS) ; fils passent `--high` / `--low` |
| OFF ↔ ON | wrapper `left/top` identiques avant/après (200/180 px) — **aucune translation** ; boîte 80×64 constante |
| Wrapper | `data-backend="raster"`, `.circuit-component__body[data-bare-body]` : `background transparent`, `border 0`, `border-radius 0`, `box-shadow none` — aucun chrome de carte |
| Pins | anode `(28,62)`, cathode `(52,62)` relatifs, `opacity:0` (markerless), `<button>` cliquable — câblage réel `Fils : 2` |
| Raccordement | extrémités de pattes de l'asset alignées sur les points de fil |
| Zoom 0.5× / ~1× / ~1.9× | net, lisible, aucun clipping, aucun halo parasite, ancrage lead↔pin stable |
| Sélection | clic → `outline: rgb(34,197,94) solid 2px` sur `.circuit-component` |
| Drag | LED déplacée `left 200→120 / top 180→100`, pins suivent (relatifs inchangés), fils re-routés, dimensions 80×64 constantes |
| Réseau | `GET /assets/components/led/led.{off,on}.*` → **200 / 304**, aucun 404 |
| Console | **0 erreur** |
| Aperçu Sidebar (`<LedPart isOn={false}>`) | rend l'asset `led.off.*` sans erreur, `aria-label="LED éteinte"` |
| Composants existants | RESISTOR / DIODE / autres — aucune régression observée |

## 7. Conformité `VISUAL-COMPONENT-PROTOCOL.md`

| Phase | Statut |
|---|---|
| 0 — Audit renderer existant | ✅ (rapport d'audit LED, cette mission) |
| 1 — Référence visuelle | ✅ cible ON/OFF actée par le CSA (ticket d'implémentation) |
| 2 — Production / choix asset | ✅ paquet 10 fichiers produit et fourni en externe (`ASSET-INTEGRITY.json`) |
| 3 — Validation pixel | ✅ octets / sha256 / dimensions / alpha / déterminisme vérifiés (probe Node + T10) |
| 4 — Validation géométrique | ✅ 80×64 / 240×192 (`@3x = 3×@1x` exact), ≤ 1024 px ; pins anode(28,62)/cathode(52,62) inchangés ; ancrage lead↔pin contrôlé navigateur aux 3 zooms |
| 5 — Intégration | ✅ `LedPart.jsx` raster stateful + `visual: { backend: 'raster' }` + `LedPart.raster.test.jsx` + gardes adaptées |
| 6 — Artefacts wrapper | ✅ `data-bare-body` dérivé ; `.part-led` réduit au centrage ; `box-shadow` vert supprimé |
| 7 — Pin / câblage | ✅ `hideVisualMarker` dérivé (`opacity:0`), `<button>` conservé, câblage réel `Fils +2`, drag OK |
| 8 — Breadboard | ✅ aucun fichier `Breadboard.*` touché |
| 9 — Zoom | ✅ contrôle navigateur 0.5× / 1× / ~2× — net, ancrage stable |
| 10 — Tests / tsc / build | ✅ 328 ciblés PASS, 1639/1655 suite, `tsc` 0, `build` 0, 0 nouveau FAIL |
| 11 — CSA VISUAL GO | ⏳ validation visuelle CSA finale attendue avant l'ouverture du composant suivant |
| 12 — Versionnage | ✅ commit unique `feat(vis): rasterize LED with ON/OFF assets` + push branche courante |

## 8. Contrôle anti-hack

| Recherche | Résultat |
|---|---|
| `type === "LED"` dans la couche de rendu centrale (`CircuitComponent.jsx` / `Pin.jsx` / `PartRenderer.jsx`) | **0** |
| `:has(.part-led)` / `.circuit-component … .part-led` | **0** |
| glow CSS sur l'état ON (`box-shadow` / `filter` sur `.part-led*`) | **0** — supprimé |
| règle CSS spécifique LED (hors centrage) | **0** |
| `!important` nouveau · z-index nouveau · pseudo-élément « cap » · classe temporaire | **0** |
| assertion de test affaiblie / supprimée | **0** — T10 / `visualContract` / `circuitComponentRasterChrome` généralisés, couvrent toujours RESISTOR + DIODE + LED |
| dépendance ajoutée | **0** |
| fichiers interdits modifiés | **0** (`componentDefinitions.js`, `simulator/*`, `CircuitComponent.jsx`, `Pin.jsx`, `PartRenderer.jsx`, `visualStateRegistry.js`, `visualContract.js`, `Breadboard.*`, assets RESISTOR/DIODE, Undo/Redo) |

## 9. Verdict

**PASS — LED intégrée au backend raster déclaratif (`MB-VIS-PROTOTYPE-003`).**
Paquet d'assets vérifié (SHA-256 8/8), renderer converti en `<picture>/<img>` stateful, registre déclaratif, **aucune modification du renderer central**, géométrie fonctionnelle intacte (80×64 ; anode(28,62)/cathode(52,62)), `simulator/*` et Visual State Registry non touchés (l'état ON/OFF reste piloté par `isOn`), glow uniquement cuit dans l'asset ON, 0 hack, 0 nouvelle régression (1639/1655, 16 FAIL historiques inchangés), `tsc` et `build` verts, preuve navigateur complète (OFF/ON, zooms, sélection, drag, câblage).

**Composant suivant : NE PAS enchaîner sur CAPACITOR.** `MB-VIS-PROTOTYPE-003` est finalisé ; validation visuelle CSA finale de LED requise avant d'ouvrir le composant suivant.
