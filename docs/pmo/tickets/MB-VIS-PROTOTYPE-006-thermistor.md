# MB-VIS-PROTOTYPE-006 — THERMISTOR — Intégration raster

**Statut : PASS — THERMISTOR (thermistance NTC) intégrée au backend raster déclaratif, sixième composant raster du catalogue.**
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-010`, `MB-VIS-INDUSTRIAL-001` (`db24f72`), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, chaîne RESISTOR / DIODE / LED (`64f35d6`) / CAPACITOR (`919473e`) / LDR (`MB-VIS-PROTOTYPE-005`, `63d3c24`).
**Base Git :** `63d3c245e802c97c74d96ce4cc917e98ba6cde1b` — branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`.
**Séquence :** `VISUAL-COMPONENT-PROTOCOL.md` « Ordre recommandé » : … CAPACITOR → LDR + **THERMISTOR** → DC_MOTOR → … Ce ticket traite **THERMISTOR uniquement**.

## 0. CSA — décision

ASSETS = PASS · PROBE PIXEL = PASS · BLUEPRINT = APPROUVÉ · IMPLÉMENTATION = AUTORISÉE.
COMMIT autorisé après PASS final ; PUSH autorisé après commit propre + PASS final ; branche de travail uniquement (pas de merge/PR/`main`, pas de composant suivant).

Ticket d'**intégration uniquement** : production des assets terminée, assets validés utilisés tels quels, aucune régénération / modification de fichier / SHA.

## 1. Cible visuelle canonique

Composant : thermistance NTC à perle époxy traversante — perle arrondie volumétrique, aspect époxy vernissé, **marquage « NTC 10K »**, pattes métalliques axiales, reflets métalliques naturels. Backend cible : **raster**. État unique : `default`. Rendu statique — aucun ON/OFF, glow, animation, pulse, effet/filtre CSS, halo.

Géométrie fonctionnelle **INVARIANTE** (`componentDefinitions.js`, non touché) :

| Grandeur | Valeur canonique |
|---|---|
| `width` | 84 |
| `height` | 36 |
| pin `A` | `dx=0, dy=18` |
| pin `B` | `dx=84, dy=18` |
| origine | top-left |
| tolérance d'ancrage lead↔pin | ≤ 0.75 px |

Interdits respectés : pas de `<svg>`/`<defs>`/`<linearGradient>`/`<radialGradient>`/id SVG/`url(#…)`, pas de `box-shadow`/`filter` CSS, pas de glow/halo, pas de pseudo-élément, pas de bordure artificielle, pas de boîte, fond transparent.

## 2. Assets — paquet validé, copié sans modification

`frontend/public/assets/components/thermistor/` — 6 fichiers.

| Fichier | Octets | Dimensions | Format | SHA-256 (== `ASSET-INTEGRITY.json`) |
|---|---|---|---|---|
| `thermistor.default.1x.png` | 2149 | 84×36 | PNG RGBA8 (alpha) | `7d944b1d457943a43930e3e490cb85a01f573b365c93ffb704e0200ab2b947f8` |
| `thermistor.default.1x.webp` | 1738 | 84×36 | WebP VP8L (alpha) | `d7a753e40cc48b6fa9d969678caa80d041bd78cfb67592439203c1feb61edbd5` |
| `thermistor.default.3x.png` | 9328 | 252×108 | PNG RGBA8 (alpha) | `86feb49d7b973b68259d72b01407a794c465e5a02d80a42e0b65587b5e72e2b2` |
| `thermistor.default.3x.webp` | 6382 | 252×108 | WebP VP8L (alpha) | `41bdda4bad1b4c34734b004d3e13e889facfbc6f9c595dcbeb5615f3dfaec3c6` |
| `manifest.json` | 1070 | — | — | schéma `type`/`canonical`/`state`/`complexity:"simple"`/`variants[]` (`width`/`height` par variante) + `budget` |
| `ASSET-INTEGRITY.json` | 951 | — | — | `{ version, type, files: [ {file, bytes, sha256, width, height, alpha} ] }` — **forme tableau** (T10-compatible) |

Contrôles (probe **Node**) : alpha présent 4/4 · `@3x = 3×@1x` exact (252=3×84, 108=3×36) · dim max 252 ≤ 1024 · `1x=84×36` / `3x=252×108` == `manifest.canonical` == `componentDefinitions.js` (84×36) · fond transparent réel · **SHA-256 réels == `ASSET-INTEGRITY.json` (4/4) == octets réels** · dimensions réelles == `manifest.variants` (4/4) · poids : **2.1 / 1.7 / 9.1 / 6.2 Ko — tous ≤ 30 Ko** (budget `simple`). Naming canonique `thermistor.default.{res}.{ext}`. **Non régénérés, non retouchés, non recolorés, non recadrés, non redimensionnés, non recompressés, non renommés, non remplacés, non optimisés.**

## 3. Registration

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'THERMISTOR', component: ThermistorPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('THERMISTOR')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
→ `VisualizationManager.getBackend('THERMISTOR')` = `'raster'`.
Types raster déclarés : **RESISTOR, DIODE, LED, CAPACITOR, LDR, THERMISTOR**. Les 10 autres restent `svg` (testé). Import `ThermistorPart` conservé, fichier non réorganisé, aucune nouvelle abstraction.

## 4. Renderer

`frontend/src/components/parts/ThermistorPart.jsx` : SVG volumétrique `MB-VIS-LED-014` (`<defs>` + 3 gradients namespacés `uid` — metal / bead / edge —, perle en `<circle>`) →
```jsx
<div className="part-thermistor" aria-label="Thermistance">
  <picture className="part-thermistor__picture">
    <source type="image/webp" srcSet={WEBP_SRCSET} />
    <img className="part-thermistor__img" src={PNG_FALLBACK} srcSet={PNG_SRCSET}
         width={def.width} height={def.height} draggable={false} alt="" aria-hidden="true"
         style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }} />
  </picture>
</div>
```
- patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` / `CapacitorPart.jsx` / `LdrPart.jsx` ; dimensions via `getComponentDef("THERMISTOR")` (84×36), aucune valeur recopiée ;
- `aria-label="Thermistance"` conservé ; `alt=""` + `aria-hidden` sur l'`<img>` décoratif ;
- `uid` reste accepté (contrat de props) mais **n'est plus consommé** → rendu déterministe, **aucune collision d'id entre deux thermistances simultanées** ;
- le rendu ne contient plus `<svg>`/`<defs>`/`<linearGradient>`/`<radialGradient>`/id SVG/`url(#…)`.

**Renderer central (`CircuitComponent.jsx`, `Pin.jsx`/`.css`, `PartRenderer.jsx`, `SimulationCanvas`) : NON modifié.** `data-bare-body` et `hideVisualMarker` dérivés du backend (mécanisme générique).

**`CircuitComponent.css`** : `.part-thermistor` conservée et réduite au centrage (modèle `.part-diode` / `.part-led` / `.part-capacitor` / `.part-ldr` — aucun `background`/`box-shadow`/`filter`). Règles `.part-thermistor__lead` / `__bead` / `__bead-highlight` **supprimées** — primitives SVG disparues. Autorisé par le protocole Phase 6 ; `CircuitComponent.jsx` non touché. Aucun `!important`, aucun `:has(.part-thermistor)`, aucun z-index, aucun pseudo-élément.

## 5. Tests

Commande canonique : `npx vitest run --config src/simulator/vitest.config.ts` (depuis `frontend/`).

### `ThermistorPart.uid.test.jsx` → `ThermistorPart.raster.test.jsx` (git rename, PAS de suppression — §9 du ticket)
Assertions de namespace SVG (`MB-VIS-LED-014`) **adaptées** (préfixe d'id, `url(#…)`, `const id = String(uid ?? 'thermistor').replace(…)`) ; **vérifications pertinentes conservées** : rendu valide, aria-label, déterminisme, comportement avec `uid`, absence d'effet indésirable entre plusieurs instances → en raster : `querySelectorAll('[id]').length === 0` + `innerHTML` des deux instances identique + `withUid === withoutUid`. Garde source : le CODE (hors commentaires) ne contient plus `<svg>`/`<defs>`/gradient/`id=` et importe toujours `getComponentDef`. S'y ajoute la couverture d'intégration raster commune (racine `.part-thermistor`, dims 84×36, `<picture>/<source webp>` + 4 variantes, `<img>` sans gestionnaire, pipeline `CircuitComponent` : pins A(0,18)/B(84,18) `opacity:0` + `data-backend="raster"` + `data-bare-body`, **deux THERMISTOR canvas : 4 pins distincts / 2 `<img>` / 0 `<svg>`**, aucune logique THERMISTOR centrale, bubbling wrapper). **16 tests.**

### T10 (`renderQualityGate.test.jsx`) — NON modifié
THERMISTOR entre automatiquement dans `RASTER_TYPES`. Le paquet conforme au schéma déjà accepté (`ASSET-INTEGRITY.files` en tableau, `bytes`+`sha256`) → T10 **valide les 4 assets et leur intégrité** (octets réels == `ASSET-INTEGRITY` + sha256, budget `simple` 30 Ko, dim ≤ 1024, `@3x≈3×@1x`) sans aucune adaptation. `manifest.states` absent (`state` singulier) → `stateCount = 1` → 4 variantes attendues, 4 présentes. `manifest.complexity === "simple"`.

### Gardes génériques (dérivées du registre — aucune liste éditée)
`partDimensionsGuard` / `partDimensionsCanonical` : THERMISTOR bascule automatiquement SVG→RASTER. `RealisticRenderers` : le filtre `isRaster` déplace THERMISTOR hors du bloc `<svg>` ; l'`it` « THERMISTOR : aria-label correct » reste vert. `renderQualityGate` T2/T3/T8/T9 : verts. `PartRenderer.visualState` : aucune référence THERMISTOR.

### Mises à jour d'assertions figeant « THERMISTOR = svg »
`visualContract.test.js` : `getBackend('THERMISTOR') → 'raster'`, `getPresentation('THERMISTOR') → { backend:'raster', bareBody:true, markerless:true }`, liste raster → `['CAPACITOR','DIODE','LDR','LED','RESISTOR','THERMISTOR']`. **`BUZZER`** introduit comme nouvel exemple « backend svg par défaut » (THERMISTOR l'était depuis MB-VIS-PROTOTYPE-004). `circuitComponentRasterChrome.test.jsx` : le bloc « composant sans déclaration `visual`, marqueurs visibles » utilise désormais **BUZZER** (mêmes assertions : `data-backend=svg`, pas de `data-bare-body`, `opacity:1`). Aucune assertion affaiblie.

### Résultats

| Mesure | Valeur |
|---|---|
| Ciblé (14 fichiers) | **386 / 386 PASS** |
| Suite complète — avant (`63d3c24`) | 1656 pass / 16 fail (1672) |
| Suite complète — après | **1666 pass / 16 fail (1682)** — +10 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 (géométrie breadboard / MB-VIS-LED-V5) — aucun lié au rendu THERMISTOR |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |
| `git diff --check` | **exit 0** |

## 6. Validation navigateur (obligatoire)

MYBlab (`vite`, `localhost:5173`).

| Zone | Contrôle | Résultat |
|---|---|---|
| A — Palette | « Thermistance » visible ; le canvas ne rend **aucun `<svg>`** pour THERMISTOR ; aucun chrome parasite | ✅ (icône palette = glyphe 🌡 inchangé ; rendu canvas 100 % raster) |
| B — Canvas | perle NTC époxy crédible, volumétrique, marquage « NTC 10K » **lisible**, pattes métalliques axiales, boîte **84×36**, fond transparent, aucune boîte blanche/noire, aucune déformation, aucune ombre excessive, aucun halo | ✅ `.part-thermistor` : `background rgba(0,0,0,0)` / `box-shadow none` / `filter none` ; `.circuit-component__body[data-bare-body]` neutralisé ; `data-backend="raster"` |
| C — Fils | connexion gauche (pinA) et droite (pinB) à la pointe des pattes, aucun décalage, aucun fil entrant dans le corps | ✅ `Fils : 1` entre pinB(T1) et pinA(T2), jonctions propres ; pins `A (0,18)` / `B (84,18)` |
| D — Zoom | 0.5× / 1× / 2× | ✅ `scale(0.5)` net · `scale(1)` net · `scale(2)` net, « NTC 10K » lisible, asset @3x WebP tient la charge, alignement correct |
| E — Multi-instance | ≥ 2 THERMISTOR : aucun conflit, aucun artefact, **aucun ID SVG**, rendu identique, aucun comportement dépendant du uid | ✅ 3 THERMISTOR : `querySelectorAll('.part-thermistor [id]').length === 0` chacun ; `innerHTML` des trois identiques ; drag → positions distinctes ; 6 pins distincts |
| F — Breadboard | placement, affichage, connexions, aucun chevauchement anormal, aucune régression | ✅ THERMISTOR posé sur breadboard : `document.elementFromPoint(centre)` → `PICTURE.part-thermistor__picture` (asset topmost) ; `circle.breadboard__hole` = **420, inchangé** (avant/après) ; aucun fichier `Breadboard.*` modifié ; breadboard affiché normalement |
| — | réseau | `GET /assets/components/thermistor/thermistor.default.3x.webp → 200 OK`, aucun 404 |
| — | console | **0 erreur** |
| — | `currentSrc` | `thermistor.default.3x.webp` (WebP @3x servi, DPR 1.5), `complete: true` |

## 7. Contrôle anti-hack

| Recherche | Résultat |
|---|---|
| `type === "THERMISTOR"` dans la couche de rendu centrale | **0** — aucun switch central, aucune comparaison |
| `:has(.part-thermistor)` / `.circuit-component … .part-thermistor` | **0** |
| règle CSS spécifique THERMISTOR (hors centrage) | **0** |
| `box-shadow` / `filter` / glow / halo sur `.part-thermistor*` | **0** |
| modification de T10 / du système générique pour ce composant | **0** — T10 non touché |
| `!important` nouveau · z-index nouveau · pseudo-élément · reconstruction CSS | **0** |
| test supprimé pour faire PASS | **0** — `ThermistorPart.uid.test.jsx` **renommé** et adapté (assertions obsolètes converties, pertinentes conservées, niveau de garantie préservé) |
| assertion de test affaiblie | **0** |
| dépendance ajoutée · refactor hors scope | **0** — seules les règles CSS `.part-thermistor__*` mortes supprimées |
| fichiers interdits modifiés | **0** (`componentDefinitions.js`, `canonicalRegistry.js`, `Pin.jsx`, `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, `SimulationCanvas`, `Breadboard.*`, `holeAt`, `CircuitComponent.jsx`, `PartRenderer.jsx`, `renderQualityGate.test.jsx`, `visualContract.js`, assets RESISTOR/DIODE/LED/CAPACITOR/LDR) |

## 8. Conformité `VISUAL-COMPONENT-PROTOCOL.md`

| Phase | Statut |
|---|---|
| 0 — Audit renderer existant | ✅ |
| 1 — Référence visuelle | ✅ cible actée par le CSA (ce ticket) |
| 2 — Production / choix asset | ✅ paquet validé fourni en externe (probe pixel PASS) |
| 3 — Validation pixel | ✅ octets / sha256 / dimensions / alpha vérifiés (probe Node + T10) |
| 4 — Validation géométrique | ✅ 84×36 / 252×108 (`@3x=3×@1x` exact), ≤ 1024 px ; pins A(0,18)/B(84,18) inchangés ; ancrage lead↔pin contrôlé navigateur (0.5×/1×/2×) |
| 5 — Intégration | ✅ `ThermistorPart.jsx` raster + `visual: { backend: 'raster' }` + `ThermistorPart.raster.test.jsx` (rename+adapt) + gardes réalignées |
| 6 — Artefacts wrapper | ✅ `data-bare-body` dérivé ; `.part-thermistor` réduit au centrage ; règles SVG mortes retirées |
| 7 — Pin / câblage | ✅ `hideVisualMarker` dérivé (`opacity:0`), `<button>` conservé, câblage réel `Fils +1`, drag OK |
| 8 — Breadboard | ✅ posé sur breadboard, 420 trous inchangés, asset topmost, aucun fichier `Breadboard.*` touché |
| 9 — Zoom | ✅ contrôle navigateur 0.5× / 1× / 2× — net, ancrage stable, « NTC 10K » lisible |
| 10 — Tests / tsc / build | ✅ 386 ciblés PASS, 1666/1682 suite, `tsc` 0, `build` 0, 0 nouveau FAIL |
| 11 — CSA VISUAL GO | ⏳ validation visuelle CSA finale attendue avant l'ouverture du composant suivant |
| 12 — Versionnage | ✅ commit unique `feat(vis): rasterize THERMISTOR` + push branche courante |

## 9. Verdict

**PASS — THERMISTOR intégrée au backend raster déclaratif (`MB-VIS-PROTOTYPE-006`).**
Paquet validé utilisé sans modification (SHA-256 4/4), renderer converti en `<picture>/<img>`, registre déclaratif, aucune modification du renderer central / de la géométrie / de `canonicalRegistry` / de la simulation / de la breadboard / de T10, géométrie fonctionnelle intacte (84×36 ; A(0,18)/B(84,18)), aucune collision d'id entre instances, 0 hack, 0 nouvelle régression (1666/1682, 16 FAIL historiques inchangés), `tsc` / `build` / `git diff --check` verts, preuve navigateur complète (palette / canvas / fils / zooms 0.5×-1×-2× / multi-instance ×3 / breadboard).

**Composant suivant : NE PAS commencer.** `MB-VIS-PROTOTYPE-006` est finalisé ; validation visuelle CSA finale de THERMISTOR requise. Le prochain ticket (DC_MOTOR) sera séparé et suivra la même procédure (AUDIT → 4 ASSETS → PROBE PIXEL → BLUEPRINT → TICKET → INTÉGRATION → VALIDATION → CSA GO).
