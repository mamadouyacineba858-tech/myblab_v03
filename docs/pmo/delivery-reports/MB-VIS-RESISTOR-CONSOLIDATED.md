# MB-VIS — RESISTOR — Delivery Report consolidé (001A → 001C.4)

**Statut :** RESISTOR **validé visuellement par le CSA** et versionné par `MB-VIS-RESISTOR-CONSOLIDATION-001`.
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.
**Base Git (avant consolidation) :** `6759e183a1caae86abb04c4735f3909572ebb9ad`.

Ce document consolide un parcours dont les étapes intermédiaires (`001B`, `001C`, `001C.1`, `001C.2`, `001C.4`) n'ont pas eu de ticket dans le dépôt au moment de leur exécution. Les tickets historiques correspondants sont transcrits dans `docs/pmo/tickets/MB-VIS-PROTOTYPE-001{B,C,C.1,C.2,C.4}-resistor.md`.

---

## 1. Chronologie réelle

```
MB-VIS-RENDER-009  (41d816f)  — contrat de qualité de rendu Q1–Q14, baseline SVG
        │
MB-VIS-REVIEW-001  (roadmap 7726a09) — audit global + réf. d'ambition « objet physique »
        │
MB-VIS-REVIEW-002  (chat)     — Technology Review → H3 discipliné : raster EXP3/J7, r3f réservé EXP5, svg fallback
        │
MB-VIS-RENDER-010  (e990adf)  — visualContract.js : LIGHTING, MATERIALS×12, CONTACT_SHADOW,
        │                        FILL_FACTOR, LEAD_ANCHORING (tol 0.75), BACKENDS + resolveBackend()
        │                        (présent, NON branché), ASSET_CONTRACT, RENDER_BUDGET, QA×15 (≥4/5)
        │
MB-VIS-PROTOTYPE-001A (8ef285f) — feuille de production externe + harnais générique
        │                          componentAssetValidation.js (contrôles A–L)
        │
CSA-AMENDMENT-001  (6759e18)   — cible de production durcie : dog-bone, corps beige/crème,
        │                          bagues marron→noir→rouge→or, rayon extrémité lead = rayon lead,
        │                          alpha réel, aucun cadre, aucun point de pin dans l'asset
        │
[ production externe ]         — 4 fichiers resistor.default.{1x,3x}.{webp,png} déposés dans
        │                          frontend/public/assets/components/resistor/  (non versionnés jusqu'ici)
        │
MB-VIS-PROTOTYPE-001B (chat)   — validation raster : probe Node pur (IHDR / VP8X ALPH / décodage PNG
        │                          via zlib), contrôles A–L PASS, ancrage lead↔pin ≤ 0.75,
        │                          zooms 0.5/1/2, QA 4.63/5  →  CSA VISUAL GO — RESISTOR
        │
MB-VIS-PROTOTYPE-001C (chat)   — intégration : ResistorPart.jsx SVG → <picture>/<img> raster ;
        │                          dims via getComponentDef ; 4 gardes de test adaptées + 1 test ajouté
        │
MB-VIS-PROTOTYPE-001C.1 (chat) — audit lecture seule  →  BLOCKED — WRAPPER / INTEGRATION ISSUE
        │                          (.circuit-component__body : rectangle #1a1f2e + bordure + radius + ombre)
        │
MB-VIS-PROTOTYPE-001C.2 (chat) — règle CSS .circuit-component__body:has(> .part-resistor){…}
        │                          → PASS — RESISTOR CLEAN RENDER
        │                          (trous breadboard = légitimes, NON touchés)
        │
MB-VIS-PROTOTYPE-001C.4 (chat) — règle CSS .circuit-component:has(.part-resistor) .myblab-pin{…}
        │                          → PASS — RESISTOR INSERTION HOLES CLEAN
        │
MB-VIS-RESISTOR-CONSOLIDATION-001 — CE VERSIONNAGE (code + tests + assets + doc + roadmap minimale)
```

## 2. Ce qui a été validé (état final)

- Renderer RESISTOR : **raster** (`<picture>` + `<source webp srcSet 1x/3x>` + `<img>` PNG fallback), dimensions dérivées de `getComponentDef("RESISTOR")` (84 × 28), aucun `<svg>` résiduel.
- 4 assets @1x/@3x WebP + PNG, transparence réelle, ombre de contact cuite dans l'alpha.
- Pins `A = (0,14)`, `B = (84,14)` inchangés (`componentDefinitions.js` non modifié).
- Wrapper `.circuit-component__body` neutralisé pour le RESISTOR (fond / bordure / coins / ombre générique) par règle CSS `:has(> .part-resistor)`.
- Marqueurs `.myblab-pin` neutralisés visuellement pour le RESISTOR par règle CSS `:has(.part-resistor) .myblab-pin` — `<button>` conservé, câblage/drag/sélection intacts.
- Breadboard **non modifiée** (aucun fichier `Breadboard.*` touché).
- Vérifié navigateur : câblage (`Fils : 1` créé), drag (position change, pins suivent), sélection (outline), zoom 0.5× / 1× / 2×.
- `npx tsc -b` : **exit 0**.
- Tests ciblés RESISTOR + chrome : **15/15** (`ResistorPart.raster.test.jsx` 7 + `circuitComponentRasterChrome.test.js` 8).
- Suite complète : **1609 pass / 16 fail** — les 16 échecs sont **pré-existants** (breadboard / MB-VIS-LED-V5), aucun nouveau (voir `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md`).
- `npm run build` reste **rouge** à cause de `frontend/src/canvas/Breadboard.css` (`lightningcss : Unexpected token Semicolon`) — problème pré-existant, hors périmètre.

## 3. Fichiers du livrable

### Code / tests
| Fichier | Rôle |
|---|---|
| `frontend/src/components/parts/ResistorPart.jsx` | renderer raster (SVG → `<picture>`/`<img>`) |
| `frontend/src/canvas/CircuitComponent.css` | 2 règles `:has()` : neutralisation chrome `__body` (001C.2) + marqueur `.myblab-pin` (001C.4) |
| `frontend/src/__tests__/renderQualityGate.test.jsx` | T9 : `if (!svg) { expect(img)… }` — garde générique raster |
| `frontend/src/components/parts/__tests__/RealisticRenderers.test.jsx` | RESISTOR filtré du `it.each` `<svg>` + `it` raster dédié |
| `frontend/src/components/parts/__tests__/partDimensionsCanonical.test.jsx` | `describe` raster dédié avec **test de mutation** sur l'`<img>` |
| `frontend/src/components/parts/__tests__/partDimensionsGuard.test.js` | `RASTER_PART_FILES = Set(["ResistorPart.jsx"])` + chemin dédié |
| `frontend/src/canvas/__tests__/circuitComponentRasterChrome.test.js` | **nouveau** — garde statique des 2 règles CSS (8 tests) |
| `frontend/src/components/parts/__tests__/ResistorPart.raster.test.jsx` | **nouveau** — preuve d'intégration raster (7 tests) |

### Assets (SHA-256 — inchangés depuis 001B)
| Fichier | Octets | Dimensions | SHA-256 |
|---|---|---|---|
| `frontend/public/assets/components/resistor/resistor.default.1x.png` | 5631 | 170×57 | `b5eae0cc87abf5ea0efd92f2020c9a42eb83405a494dbefe112f94076be1b670` |
| `…/resistor.default.1x.webp` | 3030 | 170×57 | `e6b8550329eec9ed04686a6a4517a2d1d4a81989ae2209842050c0b2713dcdf7` |
| `…/resistor.default.3x.png` | 25861 | 510×171 | `115b56ab6e544288a5cbf042767a8f2d03c8a42a91746213471a84088ddcaa57` |
| `…/resistor.default.3x.webp` | 10272 | 510×171 | `c6ff40ceccba6a124c9cc60ca8380afe9f2b254db7d9bbd2c34d8e943ee87548` |

### Documentation (créée par la consolidation)
`docs/pmo/tickets/MB-VIS-PROTOTYPE-001B-resistor.md`, `…-001C-resistor.md`, `…-001C.1-resistor.md`, `…-001C.2-resistor.md`, `…-001C.4-resistor.md`, ce delivery report, `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`, `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md`, `frontend/public/assets/components/resistor/manifest.json`, mise à jour minimale `docs/roadmaps/ROADMAP_PLATFORM.md` §7.4.

## 4. Erreurs / faux positifs rencontrés (capitalisés)

| Étape | Erreur | Cause racine | Prévention |
|---|---|---|---|
| 001A | `document is not defined` sur 4 tests DOM | `npm exec vitest` sans `--config` → env node | commande de test **canonique** (voir KNOWN-BROKEN-STATE) |
| 001B | « 3x = 254×171 » | parsing bits VP8X en PowerShell | mesure binaire d'image **en Node uniquement** |
| 001B | « 5ᵉ bande dorée » | classifieur échantillonnant l'épaule dog-bone | échantillonner la **ligne médiane du corps** |
| 001B | « transparence NON » | échantillons aux sorties de lead (opaques) | échantillonner l'alpha **aux coins loin de la silhouette** |
| 001C.4 | « trous breadboard » | pas de contrôle `elementFromPoint` + z-index | identifier la **couche peinte** avant de nommer un défaut |
| 001C.1 | rectangle pris pour un fond d'asset | pas de `getComputedStyle(__body)` avant conclusion | comparer le calculé à l'attendu |
| 001C.4 | `opacity:0` CSS inefficace | `Pin.jsx` pose `opacity` en inline style | lire le composant ciblé (inline styles) avant d'écrire la règle |
| 001C.4 | `border-color` longhand vs shorthand | cascade CSS + transitions | tester chaque règle **en live** avant de l'écrire |

## 5. Verdict CSA

**RESISTOR — VALIDÉ VISUELLEMENT.** Livrable versionné par `MB-VIS-RESISTOR-CONSOLIDATION-001`.

## 6. Suite (hors ce livrable)

Aucun composant suivant ne démarre. La séquence recommandée est : **CAPITALISATION → `MB-VIS-INDUSTRIAL-001` (généralisation du backend déclaratif) → DIODE → LED → CAPACITOR → LDR/THERMISTOR → DC_MOTOR → suite** (`ROADMAP_PLATFORM.md` §7.4, `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`).

**`MB-VIS-INDUSTRIAL-001` n'est PAS implémenté ici.** Il devra généraliser : branchement `resolveBackend()` + `visual.backend` dans le registre ; remplacement des 2 règles `:has(.part-resistor)` par un attribut déclaratif `[data-backend="raster"]` / `markerless` (chrome wrapper + marqueur pin dérivés d'un flag, non plus de `type === "…"`) ; helper générique des gardes de test raster ; budget de test raster ; correctif `Breadboard.css`.
