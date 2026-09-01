# MB-VIS-PROTOTYPE-002 — DIODE — Delivery Report

**Verdict : PASS.**
**Ticket :** `docs/pmo/tickets/MB-VIS-PROTOTYPE-002-diode.md`.
**Base :** `6277d993aaf4466e77c50eac6d2800752a30d27b`. **Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.

## Objet livré

Intégration de l'asset raster DIODE (produit et vérifié en externe) via le mécanisme déclaratif de `MB-VIS-INDUSTRIAL-001` — **deuxième composant raster** du catalogue après RESISTOR, sans aucune adaptation du renderer central.

## Assets DIODE utilisés (non modifiés)

`frontend/public/assets/components/diode/` :

| Fichier | Octets | Dimensions | Format | SHA-256 (== `ASSET-INTEGRITY.json`) |
|---|---|---|---|---|
| `diode.default.1x.png` | 3584 | 170×61 | PNG RGBA8 (alpha) | `ee84b5d66b4e2511d27b7271759d90099bcf1ed02495cbc243e62b346610b537` |
| `diode.default.1x.webp` | 2928 | 170×61 | WebP VP8L (alpha) | `b59d2273ea21e62bdf61bcfe08305cda08efe4ffde65fd1910793a27ec92524f` |
| `diode.default.3x.png` | 23230 | 510×182 | PNG RGBA8 (alpha) | `f46abba5ec642491f633bd290ef40784b9dcccf4207db8a2b0e4ceecf7a61934` |
| `diode.default.3x.webp` | 17032 | 510×182 | WebP VP8L (alpha) | `3c523f07d7c9000c8e5e87274aefc5c8115d6d4cab471159cf67c8c08e8285f9` |
| `manifest.json` | 758 | — | — | `ee9ed422d296e99b0931a1362a3918a9cdb9581f160f81292efad738f0b7c90c` |
| `ASSET-INTEGRITY.json` | 724 | — | — | (source de vérité des hachages) |

Contrôles : alpha présent (4/4) · poids ≤ 30 Ko (`RENDER_BUDGET.raster.maxWeightKbPerVariantSimple`, max = 22.7 Ko) · `@3x = 3×@1x ± 1 px` (510=3×170 ; 182 vs 183, écart 1) · dim max 510 ≤ 1024 · **non régénérés, non recompressés, non renommés**.

## Intégration registre

`frontend/src/visualization/defaultRegistrations.js` :
```js
{ type: 'DIODE', component: DiodePart, visual: { backend: 'raster' } },
```
→ `getComponentPresentation('DIODE')` = `{ backend: 'raster', bareBody: true, markerless: true }` (dérivé, `resolvePresentation`).
→ `VisualizationManager.getBackend('DIODE')` = `'raster'`.
Types raster déclarés : **RESISTOR, DIODE**. Les 14 autres restent `svg` par défaut (testé).

## Renderer

`frontend/src/components/parts/DiodePart.jsx` : SVG volumétrique V0 (`<defs>` + 4 gradients namespacés `uid`) → `<div class="part-diode"><picture><source type="image/webp" srcSet="…1x.webp 1x, …3x.webp 3x"><img src="…3x.png" srcSet="…1x.png 1x, …3x.png 3x" width={def.width} height={def.height} draggable={false} alt="" aria-hidden="true" style="…pointer-events:none"></picture></div>`. Patron identique à `ResistorPart.jsx`. Dimensions via `getComponentDef("DIODE")` (84×30). `uid` accepté, non consommé. Aucun `<svg>`/`<line>`/`<rect>`/`<defs>`/gradient/`<text>`.

**Renderer central (`CircuitComponent.jsx` / `.css`, `Pin.jsx` / `.css`) : NON modifié.** Chrome (`data-bare-body`) et masquage du marqueur (`hideVisualMarker` → `opacity:0` inline) dérivés automatiquement du backend — aucun `type === "DIODE"`, aucune règle `:has(.part-diode)`, aucun `!important`, aucun z-index ajouté.

## Géométrie fonctionnelle préservée

`componentDefinitions.js` **non touché** : boîte **84 × 30**, pins **anode (0,15)** / **cathode (84,15)**. `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, `models/DiodeModel.js` : non touchés.

## Tests

- **T10 (`renderQualityGate.test.jsx`) généralisé** : lecture des **fichiers réels** (octets `statSync`, dimensions par parse d'en-tête PNG/WebP, `sha256`) ; **tolérant au schéma** — `manifest.type`\|`component`, `manifest.assets[]`\|`variants[]`, `canonical`\|`canonicalBox`, `ASSET-INTEGRITY.json` optionnel. Couvre RESISTOR **et** DIODE sans les nommer. Aucun système de validation dupliqué.
- **`DiodePart.uid.test.jsx` (7, contrat SVG V0) → `DiodePart.raster.test.jsx` (11)** : rend correct, aucun `<svg>`, asset raster attendu, variantes 1x/3x, pins anode(0,15)/cathode(84,15) via `CircuitComponent`/`Pin`, backend résolu = raster, géométrie 84×30, aucune logique DIODE dans le renderer central, bubbling wrapper.
- Gardes génériques (`partDimensionsGuard`, `partDimensionsCanonical`, `RealisticRenderers`) : DIODE **bascule automatiquement** du groupe SVG au groupe RASTER (dérivé du registre — aucune liste à éditer).
- `visualContract.test.js` : liste des types raster mise à jour (`['DIODE','RESISTOR']`).

| Mesure | Valeur |
|---|---|
| Ciblé (9 fichiers) | **321 / 321 PASS** |
| Suite complète — avant (`6277d99`) | 1615 pass / 16 fail (1631) |
| Suite complète — après | **1620 pass / 16 fail (1636)** — +5 tests, **0 nouveau FAIL** |
| Fichiers en échec | **10, identiques** à `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` §3 |
| `npx tsc -b` | **exit 0** |
| `npm run build` | **exit 0** |

## Audit anti-hack

`type === "DIODE"` / `type === "RESISTOR"` dans la couche de rendu : **0** · `:has(.part-diode)` / `:has(> .part-diode)` : **0** · règle CSS spécifique diode : **0** · `!important` nouveau : **0** · z-index nouveau : **0** · nombre magique de rendu : **0**. Occurrences résiduelles de `type === "RESISTOR"` = code de test pré-existant (`.find(c => c.type === …)`) et un commentaire de `dcContributionRegistry.js` — sans rapport, non modifiés.

## Fichiers modifiés

`frontend/src/components/parts/DiodePart.jsx` · `frontend/src/visualization/defaultRegistrations.js` · `frontend/src/__tests__/renderQualityGate.test.jsx` · `frontend/src/visualization/__tests__/visualContract.test.js` · `frontend/src/components/parts/__tests__/DiodePart.uid.test.jsx` → `DiodePart.raster.test.jsx` (rename) · **nouveaux** : `frontend/public/assets/components/diode/{diode.default.1x.png,1x.webp,3x.png,3x.webp,manifest.json,ASSET-INTEGRITY.json}` · docs : ce rapport + mise à jour `docs/pmo/tickets/MB-VIS-PROTOTYPE-002-diode.md`.

## Limites

- Contrôle navigateur des zooms (Phase 9) non ré-exécuté — DIODE hérite du mécanisme générique déjà validé au navigateur pour RESISTOR. À confirmer par le CSA si exigé avant GO.
- Schémas de manifeste RESISTOR vs DIODE divergents — T10 rendu tolérant aux deux ; harmonisation = dette documentaire mineure, hors périmètre.

## Suite

**MB-VIS-PROTOTYPE-002 finalisé.** Prochain composant (LED, `MB-VIS-PROTOTYPE-003` selon le re-séquencement) **non commencé** — hors périmètre de cette mission.
