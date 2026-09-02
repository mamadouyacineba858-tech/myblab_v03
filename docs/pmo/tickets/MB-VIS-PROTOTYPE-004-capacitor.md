# MB-VIS-PROTOTYPE-004 — CAPACITOR — Intégration raster

**Statut : PASS — CAPACITOR intégré au backend raster déclaratif, quatrième composant raster du catalogue.**
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-010` (`visualContract.js`), `MB-VIS-INDUSTRIAL-001` (backend déclaratif, `db24f72`), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, chaîne RESISTOR (`MB-VIS-PROTOTYPE-001*`), DIODE (`MB-VIS-PROTOTYPE-002`, `9b167cf`), LED (`MB-VIS-PROTOTYPE-003`, `64f35d6`).
**Base Git :** `64f35d662d38d58763d7ba855c960fee2d0bf0cb` — branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`.
**Séquence :** `VISUAL-COMPONENT-PROTOCOL.md` « Ordre recommandé » : … DIODE → LED → **CAPACITOR** → LDR + THERMISTOR → …

## 0. Ruling CSA — blocages du pré-audit corrigés

Le pré-audit (session précédente) avait retourné **BLOCKED** sur deux points, actés par le CSA et **corrigés dans le paquet d'assets livré avec ce ticket** :

1. **Poids @3x hors budget** — l'ancien paquet (`capacitor.1x.png` etc.) avait `capacitor.3x.png` = 42.6 Ko et `capacitor.3x.webp` = 33.6 Ko, > `RENDER_BUDGET.raster.maxWeightKbPerVariantSimple` (30 Ko), CAPACITOR étant mono-état sans base contractuelle pour un budget « complexe ». **Corrigé** : le nouveau paquet fait 1.8 / 1.5 / **11.3** / **4.0** Ko — tous ≤ 30 Ko, aucune classification `complex`, aucun assouplissement du budget.
2. **Schéma `ASSET-INTEGRITY.json` divergent de T10** — l'ancien fichier utilisait `files` comme objet indexé + clé `size`, non lisible par la garde T10. **Corrigé** : `files` est désormais un **tableau** `[{file, bytes, sha256}]` (schéma déjà accepté par T10 depuis `MB-VIS-PROTOTYPE-003`). **Aucune modification de T10** pour accepter un 3ᵉ/4ᵉ schéma.

Points de gouvernance tranchés par le CSA : numéro **MB-VIS-PROTOTYPE-004** ; nommage canonique `{type}.{state}.{res}.{ext}` ; état unique `default` ; chemin réel de registration `frontend/src/visualization/defaultRegistrations.js` (le message initial citait `frontend/src/config/…` — inexistant) ; validation visuelle CSA de LED considérée acquise ; **le paquet corrigé est la source de vérité**.

## 1. Cible visuelle canonique

Composant : condensateur céramique disque axial, marquage « 104 ». Backend cible : **raster**. État unique : `default` (composant statique, aucune logique métier de rendu).

Géométrie fonctionnelle **INCHANGÉE** (`componentDefinitions.js`, non touché) :

| Grandeur | Valeur canonique |
|---|---|
| `width` | 70 |
| `height` | 40 |
| pin `pinA` | `dx=0, dy=20` |
| pin `pinB` | `dx=70, dy=20` |
| origine | top-left |
| tolérance d'ancrage lead↔pin | ≤ 0.75 u canvas @1× |

Interdits respectés : pas de `<svg>`, pas de gradient SVG, pas de `box-shadow`, pas de `filter` CSS, pas de glow, pas de pseudo-élément décoratif, aucune nouvelle logique métier.

## 2. Assets — paquet corrigé fourni, vérifié, non modifié

`frontend/public/assets/components/capacitor/` — 6 fichiers.

| Fichier | Octets | Dimensions | Format | SHA-256 (== `ASSET-INTEGRITY.json` == `manifest.variants`) |
|---|---|---|---|---|
| `capacitor.default.1x.png` | 1811 | 70×40 | PNG RGBA8 (alpha) | `d1faeb38713037f2747a2ec31a557bf5d394f127433fa16e890c6381713ba389` |
| `capacitor.default.1x.webp` | 1544 | 70×40 | WebP VP8L (alpha) | `fdf6f123c669a9c65630430461e3c95882132a89798f05e8ec07d475759e03c3` |
| `capacitor.default.3x.png` | 11573 | 210×120 | PNG RGBA8 (alpha) | `684e8ee6e7fe7cb26c39be87d7ea0ee89b0d4fbdbac52d4601ad1864633b46be` |
| `capacitor.default.3x.webp` | 4122 | 210×120 | WebP VP8L (alpha) | `5ecc61c5598dccc067258de6d4187d1e26ebed13f4deb51c54deb4d8d11084b8` |
| `manifest.json` | 1383 | — | — | schéma `component`/`canonical`/`states`/`variants[]` (avec `bytes`, `dimensions`, `alpha`) |
| `ASSET-INTEGRITY.json` | 734 | — | — | `{ component, version, algorithm, files: [ {file, bytes, sha256} ] }` — **forme tableau** |

Contrôles (probe **Node**) : alpha présent 4/4 · `@3x = 3×@1x` exact (210=3×70, 120=3×40) · dim max 210 ≤ 1024 · `1x=70×40` / `3x=210×120` == `manifest.canonical` == `componentDefinitions.js` (70×40) · fond transparent réel · **SHA-256 réels == `ASSET-INTEGRITY.json` (4/4) == `manifest.variants` (4/4) == octets réels** · **poids : 1.8 / 1.5 / 11.3 / 4.0 Ko — tous ≤ 30 Ko (budget `simple`)**. Naming canonique `capacitor.default.{res}.{ext}`. **Non régénérés, non recompressés, non redessinés, non renommés par l'agent.**

## 3. Registration

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'CAPACITOR', component: CapacitorPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('CAPACITOR')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
→ `VisualizationManager.getBackend('CAPACITOR')` = `'raster'`.
Types raster déclarés : **RESISTOR, DIODE, LED, CAPACITOR**. Les 12 autres restent `svg` (testé). Aucun nouveau système de backend, aucune architecture parallèle.

## 4. Renderer

`frontend/src/components/parts/CapacitorPart.jsx` : SVG volumétrique `MB-VIS-COMP-011` (`<defs>` + 3 gradients namespacés `uid`, `<text>` « 104 ») →
```jsx
<div className="part-capacitor" aria-label="Condensateur">
  <picture className="part-capacitor__picture">
    <source type="image/webp" srcSet={WEBP_SRCSET} />
    <img className="part-capacitor__img" src={PNG_FALLBACK} srcSet={PNG_SRCSET}
         width={def.width} height={def.height} draggable={false} alt="" aria-hidden="true"
         style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }} />
  </picture>
</div>
```
- patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` ; dimensions via `getComponentDef("CAPACITOR")` (70×40), aucune valeur recopiée ;
- `uid` reste accepté (contrat de props) mais **n'est plus consommé** → rendu déterministe, **aucune collision d'id entre deux condensateurs simultanés** (plus aucun `<defs>` à namespacer — c'était l'objet du contrat `CapacitorPart.uid.test.jsx`, désormais sans objet) ;
- aucun `<svg>`/`<defs>`/`<linearGradient>`/`<line>`/`<rect>`/`<text>`.
- accessibilité conservée : `aria-label="Condensateur"` sur la racine, `alt=""` + `aria-hidden` sur l'`<img>` décoratif.

**Renderer central (`CircuitComponent.jsx`, `Pin.jsx`/`.css`, `PartRenderer.jsx`) : NON modifié.** `data-bare-body` et `hideVisualMarker` dérivés du backend.

**`CircuitComponent.css`** : `.part-capacitor` conservée et réduite au centrage (modèle `.part-diode` / `.part-led` — aucun `background`, `box-shadow` ni `filter`, donc rien d'interdit à retirer contrairement à LED). Règles `.part-capacitor__lead` / `__disc` / `__disc-outline` **supprimées** — primitives SVG disparues. Autorisé par le protocole Phase 6 ; `CircuitComponent.jsx` non touché.

## 5. Tests

Commande canonique : `npx vitest run --config src/simulator/vitest.config.ts` (depuis `frontend/`).

### `CapacitorPart.raster.test.jsx` (nouveau, 12) — remplace `CapacitorPart.uid.test.jsx` (6, contrat SVG V0 obsolète)
Rend correct (racine `.part-capacitor`, aria-label) · aucun `<svg>`/gradient/`<line>`/`<rect>`/`<text>` · `<picture>/<source webp>` + `<img>` vers `/assets/components/capacitor/capacitor.default.*`, 4 variantes référencées · `<img>` sans gestionnaire, `draggable=false`, `pointer-events:none` · déterminisme · **deux CAPACITOR simultanés : `querySelectorAll('[id]').length === 0`, HTML des deux instances identique — aucune collision** · backend résolu `raster` (`bareBody`+`markerless`) · géométrie 70×40 / pinA(0,20) / pinB(70,20) inchangée · pipeline `CircuitComponent` : 2 pins aux positions canoniques `opacity:0`, `data-backend="raster"`, `data-bare-body`, asset `<img>` · **deux CAPACITOR sur le canvas : 4 pins distincts, chacun aux positions canoniques, 2 `<img>`, 0 `<svg>`** · aucune comparaison `type === "CAPACITOR"` ni `:has(.part-capacitor)` dans la couche centrale · bubbling wrapper.

### T10 (`renderQualityGate.test.jsx`) — NON modifié
CAPACITOR entre automatiquement dans `RASTER_TYPES` (dérivé de `getComponentPresentation().backend`). Le paquet corrigé conforme au schéma déjà accepté (`manifest.variants[]` avec `bytes` ; `ASSET-INTEGRITY.files` en tableau) → T10 **valide les 4 assets et leur intégrité** (octets réels == manifeste == `ASSET-INTEGRITY` + sha256, budget `simple` 30 Ko, dim ≤ 1024, `@3x≈3×@1x`) sans aucune adaptation. `stateCount = 1` (`states: ["default"]`) → 4 variantes image attendues, 4 présentes.

### Gardes génériques (dérivées du registre — aucune liste éditée)
`partDimensionsGuard` / `partDimensionsCanonical` : CAPACITOR bascule automatiquement SVG→RASTER. `RealisticRenderers` : le filtre `isRaster` déplace CAPACITOR vers le bloc `<img>` (dims + src `/assets/components/capacitor/`) ; l'`it` « CAPACITOR : aria-label correct » reste vert. `renderQualityGate` T2/T3/T8/T9 : verts. `PartRenderer.visualState` : aucune référence CAPACITOR.

### Mises à jour d'assertions figeant « CAPACITOR = svg »
`visualContract.test.js` : `getBackend('CAPACITOR') → 'raster'`, `getPresentation('CAPACITOR') → { backend:'raster', bareBody:true, markerless:true }`, liste raster → `['CAPACITOR','DIODE','LED','RESISTOR']`. `THERMISTOR` introduit comme nouvel exemple « backend svg par défaut ». `circuitComponentRasterChrome.test.jsx` : le bloc « composant sans déclaration `visual`, marqueurs visibles » utilise désormais **THERMISTOR** (mêmes assertions : `data-backend=svg`, pas de `data-bare-body`, `opacity:1`). Aucune assertion affaiblie.

### Résultats

| Mesure | Valeur |
|---|---|
| Ciblé (11 fichiers) | **344 / 344 PASS** |
| Suite complète — avant (`64f35d6`) | 1639 pass / 16 fail (1655) |
| Suite complète — après | **1646 pass / 16 fail (1662)** — +7 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 (géométrie breadboard / MB-VIS-LED-V5) — aucun lié au rendu CAPACITOR |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |
| `git diff --check` | **exit 0** |

## 6. Validation visuelle navigateur (obligatoire)

MYBlab (`vite`, `localhost:5173`), canvas, **deux CAPACITOR** placés.

| # | Contrôle | Résultat |
|---|---|---|
| 1-3 | app lancée / canvas ouvert / 2 CAPACITOR placés | ✅ `Composants : 2` |
| 4 | zoom normal (1×) | ✅ disque céramique ambre réaliste, marquage « 104 », 2 pattes axiales horizontales ; `.part-capacitor` : `background rgba(0,0,0,0)`, `box-shadow none`, `filter none` |
| 5 | zoom 0.5× | ✅ lisible, net, aucun clipping |
| 6 | zoom 1× | ✅ confirmé |
| 7 | zoom 2× (`scale(2)`) | ✅ net, « 104 » lisible, asset @3x WebP tient la charge |
| 8 | alignement pattes ↔ pins | ✅ le fil se termine exactement à la pointe de chaque patte ; pins relatifs `pinA (0,20)` / `pinB (70,20)` |
| 9 | absence de boîte/fond | ✅ `data-backend="raster"`, `.circuit-component__body[data-bare-body]` : `background transparent` / `border 0` / `border-radius 0` / `box-shadow none` ; seul rectangle = le liseré de sélection |
| 10 | câble rejoint les deux pins | ✅ `Fils : 1` entre pinB du 1ᵉʳ et pinA du 2ᵉ, jonction propre |
| 11 | deux CAPACITOR simultanés — collision d'id | ✅ `querySelectorAll('.part-capacitor [id]').length === 0` pour chaque instance ; `innerHTML` des deux `.part-capacitor` identiques ; drag → positions distinctes (`200/180` et `100/340`) ; 4 pins distincts |
| — | réseau | `GET /assets/components/capacitor/capacitor.default.3x.webp → 200 OK`, aucun 404 |
| — | console | **0 erreur** |
| — | `currentSrc` | `capacitor.default.3x.webp` (WebP @3x servi, DPR 1.5), `complete: true`, `naturalWidth 70` |

## 7. Contrôle anti-hack

| Recherche | Résultat |
|---|---|
| `type === "CAPACITOR"` dans la couche de rendu centrale | **0** |
| `:has(.part-capacitor)` / `.circuit-component … .part-capacitor` | **0** |
| règle CSS spécifique CAPACITOR (hors centrage) | **0** |
| `box-shadow` / `filter` / glow sur `.part-capacitor*` | **0** |
| modification de T10 pour un nouveau schéma | **0** — T10 non touché |
| classification `complex` artificielle · assouplissement du budget raster | **0** |
| `!important` nouveau · z-index nouveau · pseudo-élément décoratif · classe temporaire | **0** |
| assertion de test affaiblie / supprimée | **0** — `visualContract` / `circuitComponentRasterChrome` réalignés sur le registre (THERMISTOR comme exemple svg) |
| dépendance ajoutée | **0** |
| fichiers interdits modifiés | **0** (`componentDefinitions.js`, `simulator/*`, `CircuitComponent.jsx`, `Pin.jsx`, `PartRenderer.jsx`, `visualStateRegistry.js`, `visualContract.js`, `renderQualityGate.test.jsx`, `Breadboard.*`, assets RESISTOR/DIODE/LED) |

## 8. Conformité `VISUAL-COMPONENT-PROTOCOL.md`

| Phase | Statut |
|---|---|
| 0 — Audit renderer existant | ✅ (pré-audit, session précédente — BLOCKED puis corrigé) |
| 1 — Référence visuelle | ✅ cible actée par le CSA (ce ticket) |
| 2 — Production / choix asset | ✅ paquet corrigé fourni en externe (`ASSET-INTEGRITY.json` forme tableau) |
| 3 — Validation pixel | ✅ octets / sha256 (×2 sources) / dimensions / alpha vérifiés (probe Node + T10) |
| 4 — Validation géométrique | ✅ 70×40 / 210×120 (`@3x=3×@1x` exact), ≤ 1024 px ; pins pinA(0,20)/pinB(70,20) inchangés ; ancrage lead↔pin contrôlé navigateur (0.5×/1×/2×) |
| 5 — Intégration | ✅ `CapacitorPart.jsx` raster + `visual: { backend: 'raster' }` + `CapacitorPart.raster.test.jsx` + gardes réalignées |
| 6 — Artefacts wrapper | ✅ `data-bare-body` dérivé ; `.part-capacitor` réduit au centrage ; règles SVG mortes retirées |
| 7 — Pin / câblage | ✅ `hideVisualMarker` dérivé (`opacity:0`), `<button>` conservé, câblage réel `Fils +1`, drag OK |
| 8 — Breadboard | ✅ aucun fichier `Breadboard.*` touché |
| 9 — Zoom | ✅ contrôle navigateur 0.5× / 1× / 2× — net, ancrage stable, « 104 » lisible |
| 10 — Tests / tsc / build | ✅ 344 ciblés PASS, 1646/1662 suite, `tsc` 0, `build` 0, 0 nouveau FAIL |
| 11 — CSA VISUAL GO | ⏳ validation visuelle CSA finale attendue avant l'ouverture du composant suivant |
| 12 — Versionnage | ✅ commit unique + push branche courante |

## 9. Verdict

**PASS — CAPACITOR intégré au backend raster déclaratif (`MB-VIS-PROTOTYPE-004`).**
Paquet corrigé vérifié (SHA-256 4/4 sur deux sources), les deux blocages du pré-audit résolus **par le paquet, pas par la garde** (poids ≤ 30 Ko sans `complex` ; `ASSET-INTEGRITY` en tableau accepté tel quel par T10 non modifié). Renderer converti en `<picture>/<img>`, registre déclaratif, aucune modification du renderer central, géométrie fonctionnelle intacte (70×40 ; pinA(0,20)/pinB(70,20)), aucune collision d'id entre instances, 0 hack, 0 nouvelle régression (1646/1662, 16 FAIL historiques inchangés), `tsc` / `build` / `git diff --check` verts, preuve navigateur complète (11 points, dont zooms et double instance).

**Composant suivant : NE PAS enchaîner sur LDR / THERMISTOR.** `MB-VIS-PROTOTYPE-004` est finalisé ; validation visuelle CSA finale de CAPACITOR requise avant d'ouvrir le composant suivant.
