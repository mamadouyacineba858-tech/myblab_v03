# MB-VIS-PROTOTYPE-005 — LDR — Intégration raster

**Statut : PASS — LDR (photorésistance) intégrée au backend raster déclaratif, cinquième composant raster du catalogue.**
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Antécédents :** `MB-VIS-RENDER-010`, `MB-VIS-INDUSTRIAL-001` (`db24f72`), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, chaîne RESISTOR / DIODE (`MB-VIS-PROTOTYPE-002`) / LED (`MB-VIS-PROTOTYPE-003`, `64f35d6`) / CAPACITOR (`MB-VIS-PROTOTYPE-004`, `919473e`).
**Base Git :** `919473e9f615353732b9dc3f10ec5d007a1e5a05` — branche `feat/MB-VIS-LED-V16-leads-thicker-realistic`.
**Séquence :** `VISUAL-COMPONENT-PROTOCOL.md` « Ordre recommandé » : … LED → CAPACITOR → **LDR + THERMISTOR** → DC_MOTOR → … Ce ticket traite **LDR uniquement** ; THERMISTOR reste `MB-VIS-PROTOTYPE-006`, hors périmètre.

## 0. CSA — décision

ASSET GATE : PASS · PIXEL / INTEGRITY PROBE : PASS · BLUEPRINT : APPROUVÉ · CSA GO : OUI.
COMMIT autorisé après PASS complet ; PUSH autorisé après commit propre + PASS complet ; branche de travail uniquement (pas de merge, pas de PR, pas de `main`).

Le paquet d'assets validé (`MB-VIS-PROTOTYPE-005-LDR-assets-v1.0.0`, archive vérifiée saine) est la source de vérité. Aucune régénération / recompression / renommage / optimisation.

## 1. Cible visuelle canonique

Composant : vraie photorésistance — pastille céramique ronde, face photoconductrice, **piste en créneau (méandre) caractéristique**, pattes métalliques axiales gauche/droite. Backend cible : **raster**. État unique : `default`. Aucun état ON/OFF, aucune animation, aucun effet CSS.

Géométrie fonctionnelle **INCHANGÉE** (`componentDefinitions.js`, non touché) :

| Grandeur | Valeur canonique |
|---|---|
| `width` | 84 |
| `height` | 36 |
| pin `A` | `dx=0, dy=18` |
| pin `B` | `dx=84, dy=18` |
| origine | top-left |
| tolérance d'ancrage lead↔pin | ≤ 0.75 px |

Interdits respectés : pas de `<svg>`/`<defs>`/gradient/filtre SVG, pas de `box-shadow`, pas de `filter` CSS, pas de glow, pas de halo, pas de pseudo-élément, pas de bordure artificielle, fond transparent.

## 2. Assets — paquet validé, copié sans modification

`frontend/public/assets/components/ldr/` — 6 fichiers.

| Fichier | Octets | Dimensions | Format | SHA-256 (== `ASSET-INTEGRITY.json` == `manifest.variants`) |
|---|---|---|---|---|
| `ldr.default.1x.png` | 5658 | 84×36 | PNG RGBA8 (alpha) | `220eb9f8b401faaf1d20ae5495069e1db8a5a55056057ffdc6e0dd86292105dc` |
| `ldr.default.1x.webp` | 3022 | 84×36 | WebP VP8L (alpha) | `4f2a93780cfef0b497b74f9c5de9524bfe1d6fa5c069e367cb932c166b848303` |
| `ldr.default.3x.png` | 27759 | 252×108 | PNG RGBA8 (alpha) | `1d095f521c157ea859ffa544ec13184d918a36ff0dcc781fbd2ebda0937cb5df` |
| `ldr.default.3x.webp` | 19492 | 252×108 | WebP VP8L (alpha) | `ae4738e6b7162acb6cd95780ad0c948475dc080a201b96354f2c3259963d7828` |
| `manifest.json` | 1798 | — | — | schéma `type`/`canonical`/`state`/`variants[]` (`bytes`+`sha256`+`dimensions`+`alpha`) |
| `ASSET-INTEGRITY.json` | 1555 | — | — | `{ version, type, files: [ {file, bytes, sha256, dimensions, alpha} ] }` — **forme tableau** (acceptée par T10 tel quel) |

Contrôles (probe **Node**) : alpha présent 4/4 · `@3x = 3×@1x` exact (252=3×84, 108=3×36) · dim max 252 ≤ 1024 · `1x=84×36` / `3x=252×108` == `manifest.canonical` == `componentDefinitions.js` (84×36) · fond transparent réel · **SHA-256 réels == `ASSET-INTEGRITY.json` (4/4) == `manifest.variants` (4/4) == octets réels** · poids : **5.5 / 3.0 / 27.1 / 19.0 Ko — tous ≤ 30 Ko** (budget `simple`). Naming canonique `ldr.default.{res}.{ext}`. **Non régénérés, non recompressés, non redessinés, non renommés.**

## 3. Registration

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'LDR', component: LdrPart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('LDR')` = `{ backend: 'raster', bareBody: true, markerless: true }`.
→ `VisualizationManager.getBackend('LDR')` = `'raster'`.
Types raster déclarés : **RESISTOR, DIODE, LED, CAPACITOR, LDR**. Les 11 autres restent `svg` (testé). Aucun nouveau système de renderer, aucun nouveau système d'enregistrement.

## 4. Renderer

`frontend/src/components/parts/LdrPart.jsx` : SVG volumétrique `MB-VIS-LED-013` (`<defs>` + 3 gradients namespacés `uid` — metal / ceramic / face —, piste en `<path>`) →
```jsx
<div className="part-ldr" aria-label="Photorésistance">
  <picture className="part-ldr__picture">
    <source type="image/webp" srcSet={WEBP_SRCSET} />
    <img className="part-ldr__img" src={PNG_FALLBACK} srcSet={PNG_SRCSET}
         width={def.width} height={def.height} draggable={false} alt="" aria-hidden="true"
         style={{ width:'100%', height:'100%', display:'block', pointerEvents:'none' }} />
  </picture>
</div>
```
- patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` / `CapacitorPart.jsx` ; dimensions via `getComponentDef("LDR")` (84×36), aucune valeur recopiée ;
- `aria-label="Photorésistance"` conservé sur la racine ; `alt=""` + `aria-hidden` sur l'`<img>` décoratif ;
- `uid` reste accepté (contrat de props) mais **n'est plus consommé** → rendu déterministe, **aucune collision d'id entre deux photorésistances simultanées** ;
- le rendu ne dépend plus de `<svg>`/`<defs>`/gradient/id/filtre SVG.

**Renderer central (`CircuitComponent.jsx`, `Pin.jsx`/`.css`, `PartRenderer.jsx`, `SimulationCanvas`) : NON modifié.** `data-bare-body` et `hideVisualMarker` dérivés du backend (mécanisme générique `MB-VIS-INDUSTRIAL-001`).

**`CircuitComponent.css`** : `.part-ldr` conservée et réduite au centrage (modèle `.part-diode` / `.part-led` / `.part-capacitor` — aucun `background`/`box-shadow`/`filter`). Règles `.part-ldr__lead` / `__disc` / `__track` **supprimées** — primitives SVG disparues. Autorisé par le protocole Phase 6 ; `CircuitComponent.jsx` non touché. Aucun `!important`, aucun `:has(.part-ldr)`, aucun z-index, aucun pseudo-élément.

## 5. Tests

Commande canonique : `npx vitest run --config src/simulator/vitest.config.ts` (depuis `frontend/`).

### `LdrPart.uid.test.jsx` → `LdrPart.raster.test.jsx` (git rename, PAS de suppression — §8 du ticket)
Le contrat de namespace SVG (`MB-VIS-LED-013`) a disparu avec le raster. Les **assertions devenues obsolètes** (préfixe d'id, `url(#…)`, `const id = String(uid ?? 'ldr').replace(…)`) sont **adaptées** ; la **vérification réellement pertinente est conservée sous forme équivalente** :
- « deux LDR sur le même canvas → aucune collision » → en raster : `querySelectorAll('[id]').length === 0` + `innerHTML` des deux instances identique ;
- déterminisme (mêmes props → même HTML) : conservé tel quel ;
- garde source : le CODE (hors commentaires) ne contient plus `<svg>`/`<defs>`/gradient/`id=`, et importe toujours `getComponentDef` depuis la source canonique.
S'y ajoute la couverture d'intégration raster commune (racine `.part-ldr`, aria-label, dims 84×36, `<picture>/<source webp>` + 4 variantes, `<img>` sans gestionnaire, pipeline `CircuitComponent` : pins A(0,18)/B(84,18) `opacity:0` + `data-backend="raster"` + `data-bare-body`, **deux LDR canvas : 4 pins distincts / 2 `<img>` / 0 `<svg>`**, aucune logique LDR centrale, bubbling wrapper). **16 tests.**

### T10 (`renderQualityGate.test.jsx`) — NON modifié
LDR entre automatiquement dans `RASTER_TYPES` (dérivé de `getComponentPresentation().backend`). Le paquet conforme au schéma déjà accepté (`ASSET-INTEGRITY.files` en tableau, `manifest.variants[]` avec `bytes`) → T10 **valide les 4 assets et leur intégrité** (octets réels == manifeste == `ASSET-INTEGRITY` + sha256, budget `simple` 30 Ko, dim ≤ 1024, `@3x≈3×@1x`) sans aucune adaptation. `manifest.states` absent (`state` singulier) → `stateCount = 1` → 4 variantes image attendues, 4 présentes.

### Gardes génériques (dérivées du registre — aucune liste éditée)
`partDimensionsGuard` / `partDimensionsCanonical` : LDR bascule automatiquement SVG→RASTER. `RealisticRenderers` : le filtre `isRaster` déplace LDR hors du bloc `<svg>` ; l'`it` « LDR : aria-label correct » reste vert. `renderQualityGate` T2/T3/T8/T9 : verts. `PartRenderer.visualState` : aucune référence LDR.

### Mise à jour d'assertions figeant « LDR = svg »
`visualContract.test.js` : `getBackend('LDR') → 'raster'`, `getPresentation('LDR') → { backend:'raster', bareBody:true, markerless:true }`, liste raster → `['CAPACITOR','DIODE','LDR','LED','RESISTOR']`. Aucune assertion affaiblie ; `THERMISTOR` reste l'exemple « backend svg par défaut ».

### Résultats

| Mesure | Valeur |
|---|---|
| Ciblé (13 fichiers) | **370 / 370 PASS** |
| Suite complète — avant (`919473e`) | 1646 pass / 16 fail (1662) |
| Suite complète — après | **1656 pass / 16 fail (1672)** — +10 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `KNOWN-BROKEN-STATE.md` §3 (géométrie breadboard / MB-VIS-LED-V5) — aucun lié au rendu LDR |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |
| `git diff --check` | **exit 0** |

## 6. Validation navigateur (obligatoire)

MYBlab (`vite`, `localhost:5173`).

| Zone | Contrôle | Résultat |
|---|---|---|
| A — Palette | « Photoresistance (LDR) » visible ; le canvas ne rend **aucun `<svg>`** pour LDR | ✅ (icône palette = glyphe ☀️ inchangé ; rendu canvas 100 % raster) |
| B — Canvas | rendu réaliste (disque + piste en créneau + anneau + pattes axiales), boîte **84×36**, transparence, aucun rectangle blanc/noir, aucun halo, aucune déformation, aucun chrome parasite | ✅ `.part-ldr` : `background rgba(0,0,0,0)` / `box-shadow none` / `filter none` ; `.circuit-component__body[data-bare-body]` neutralisé ; `data-backend="raster"` |
| C — Fils | fil gauche (pinA) et fil droit (pinB) connectés à la pointe des pattes, aucun décalage, aucun fil entrant dans le corps | ✅ `Fils : 1` entre pinB(LDR1) et pinA(LDR2), jonctions propres ; pins `A (0,18)` / `B (84,18)` |
| D — Zoom | 0.5× / 1× / 2× | ✅ `scale(0.5)` net · `scale(1)` net · `scale(2)` net, piste en créneau lisible, asset @3x WebP tient la charge, ancrage lead↔pin stable |
| E — Multi-instance | ≥ 2 LDR : aucun conflit, aucun artefact, rendu identique, aucun problème d'instance | ✅ 2 LDR : `querySelectorAll('.part-ldr [id]').length === 0` chacun ; `innerHTML` des deux identiques ; drag → positions distinctes (`200/180`, `100/360`) ; 4 pins distincts |
| F — Breadboard | placement, affichage, connexions, aucune régression | ✅ LDR posé sur breadboard : `document.elementFromPoint(centre)` → `PICTURE.part-ldr__picture` (asset topmost) ; `circle.breadboard__hole` = **420, inchangé** ; aucun fichier `Breadboard.*` modifié ; breadboard affiché normalement |
| — | réseau | `GET /assets/components/ldr/ldr.default.3x.webp → 200 OK`, aucun 404 |
| — | console | **0 erreur** |
| — | `currentSrc` | `ldr.default.3x.webp` (WebP @3x servi, DPR 1.5), `complete: true` |

## 7. Contrôle anti-hack

| Recherche | Résultat |
|---|---|
| `type === "LDR"` dans la couche de rendu centrale | **0** |
| `:has(.part-ldr)` / `.circuit-component … .part-ldr` | **0** |
| règle CSS spécifique LDR (hors centrage) | **0** |
| `box-shadow` / `filter` / glow / halo sur `.part-ldr*` | **0** |
| modification de T10 pour un nouveau schéma | **0** — T10 non touché |
| `!important` nouveau · z-index nouveau · pseudo-élément décoratif · classe temporaire | **0** |
| test supprimé pour faire PASS | **0** — `LdrPart.uid.test.jsx` **renommé** et adapté (assertions obsolètes converties, pertinentes conservées) |
| assertion de test affaiblie | **0** |
| dépendance ajoutée | **0** |
| nettoyage hors scope | **0** — seules les règles CSS `.part-ldr__*` mortes (dépendantes du SVG retiré) supprimées |
| fichiers interdits modifiés | **0** (`componentDefinitions.js`, `Pin.jsx`, `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, `SimulationCanvas`, `Breadboard.*`, `holeAt`, `CircuitComponent.jsx`, `PartRenderer.jsx`, `renderQualityGate.test.jsx`, `visualContract.js`, assets RESISTOR/DIODE/LED/CAPACITOR) |

## 8. Conformité `VISUAL-COMPONENT-PROTOCOL.md`

| Phase | Statut |
|---|---|
| 0 — Audit renderer existant | ✅ |
| 1 — Référence visuelle | ✅ cible actée par le CSA (ce ticket) |
| 2 — Production / choix asset | ✅ paquet validé fourni en externe (archive vérifiée) |
| 3 — Validation pixel | ✅ octets / sha256 (×2 sources) / dimensions / alpha vérifiés (probe Node + T10) |
| 4 — Validation géométrique | ✅ 84×36 / 252×108 (`@3x=3×@1x` exact), ≤ 1024 px ; pins A(0,18)/B(84,18) inchangés ; ancrage lead↔pin contrôlé navigateur (0.5×/1×/2×) |
| 5 — Intégration | ✅ `LdrPart.jsx` raster + `visual: { backend: 'raster' }` + `LdrPart.raster.test.jsx` (rename+adapt) + gardes réalignées |
| 6 — Artefacts wrapper | ✅ `data-bare-body` dérivé ; `.part-ldr` réduit au centrage ; règles SVG mortes retirées |
| 7 — Pin / câblage | ✅ `hideVisualMarker` dérivé (`opacity:0`), `<button>` conservé, câblage réel `Fils +1`, drag OK |
| 8 — Breadboard | ✅ posé sur breadboard, 420 trous inchangés, asset topmost, aucun fichier `Breadboard.*` touché |
| 9 — Zoom | ✅ contrôle navigateur 0.5× / 1× / 2× — net, ancrage stable, piste lisible |
| 10 — Tests / tsc / build | ✅ 370 ciblés PASS, 1656/1672 suite, `tsc` 0, `build` 0, 0 nouveau FAIL |
| 11 — CSA VISUAL GO | ⏳ validation visuelle CSA finale attendue avant l'ouverture du composant suivant |
| 12 — Versionnage | ✅ commit unique `feat(vis): rasterize LDR` + push branche courante |

## 9. Verdict

**PASS — LDR intégrée au backend raster déclaratif (`MB-VIS-PROTOTYPE-005`).**
Paquet validé utilisé sans modification (SHA-256 4/4 sur deux sources), renderer converti en `<picture>/<img>`, registre déclaratif, aucune modification du renderer central / de la géométrie / de la simulation / de la breadboard, géométrie fonctionnelle intacte (84×36 ; A(0,18)/B(84,18)), aucune collision d'id entre instances, T10 non modifié, 0 hack, 0 nouvelle régression (1656/1672, 16 FAIL historiques inchangés), `tsc` / `build` / `git diff --check` verts, preuve navigateur complète (palette / canvas / fils / zooms 0.5×-1×-2× / multi-instance / breadboard).

**Composant suivant : NE PAS enchaîner sur THERMISTOR.** `MB-VIS-PROTOTYPE-005` est finalisé ; validation visuelle CSA finale de LDR requise avant d'ouvrir `MB-VIS-PROTOTYPE-006 — THERMISTOR`.
