# MB-VIS-INDUSTRIAL-001 — Industrialisation du renderer visuel : backend déclaratif

**Statut :** Livré. Verdict **PASS**.
**Programme / Épic :** Experience → EXP3 → `ROADMAP_PLATFORM.md` §7.4 (MYBlab Physical/Realistic Visual Engine).
**Base Git :** `d3a3d1f0d2977973555e355b5d59ca87b4c13b7d` (consolidation RESISTOR).
**Antécédents :** `MB-VIS-RENDER-010` (`visualContract.js` — `BACKENDS`, `resolveBackend`, `RENDER_BUDGET.raster`), `MB-VIS-PROTOTYPE-001A→001C.4` (RESISTOR raster), `docs/pmo/standards/VISUAL-COMPONENT-PROTOCOL.md`.

**Périmètre modifié (13 fichiers) :**
- `frontend/src/visualization/visualContract.js` — `resolvePresentation()`
- `frontend/src/visualization/registry.js` — `_visual` Map, `register(type, C, visual)`, `registerAll`, `getVisual()`
- `frontend/src/visualization/VisualizationManager.js` — `getPresentation()`, `getBackend()`
- `frontend/src/visualization/defaultRegistrations.js` — `visual` sur LED + RESISTOR ; `getComponentVisual()`, `getComponentPresentation()`
- `frontend/src/canvas/CircuitComponent.jsx` — présentation déclarative ; `data-backend` + `data-bare-body` ; suppression des 2 `type === "LED"`
- `frontend/src/canvas/CircuitComponent.css` — suppression des 2 règles `:has(.part-resistor)` ; règle générique `.circuit-component__body[data-bare-body]`
- `frontend/src/canvas/Breadboard.css` — correctif de syntaxe (blocage `lightningcss` pré-existant)
- Tests : `renderQualityGate.test.jsx` (T6 exceptions vidées + **T10** budget raster), `circuitComponentRasterChrome.test.js → .test.jsx` (généralisé), `partDimensionsGuard.test.js`, `partDimensionsCanonical.test.jsx`, `RealisticRenderers.test.jsx`, `visualContract.test.js` (dérivation par registre)

**NON modifié :** `componentDefinitions.js`, `geometry.js`, `pinPresentationGeometry.js`, `simulator/*`, `models/*`, `Breadboard.jsx`, `holeAt()`, la grille / les z-index breadboard, `Pin.jsx`, `Pin.css`, `PartRenderer.jsx`, les 4 assets RESISTOR (SHA-256 inchangés). Aucune dépendance. Aucun `!important`, aucun z-index magique, aucun nombre magique.

---

## 1. État initial (CURRENT)

| Élément | Constat |
|---|---|
| `visualContract.js` | `BACKENDS`, `resolveBackend(visual)` (tolérant → `'svg'`), `RENDER_BUDGET.raster` — **présents mais jamais appelés** |
| `defaultRegistrations.js` | `DEFAULT_REGISTRATIONS = [{ type, component }]` — aucun champ `visual` |
| `RendererRegistry` / `VisualizationManager` / `PartRenderer` | `type → composant` uniquement, aucune notion de backend |
| `CircuitComponent.jsx` | 2 branchements `type === "LED"` (habillage `__body` + `hideVisualMarker`) — exceptions `renderQualityGate` T6 |
| `CircuitComponent.css` | 2 règles spécifiques `:has(> .part-resistor)` (chrome) et `:has(.part-resistor) .myblab-pin` (marqueur) — hacks 001C.2 / 001C.4 |
| Gardes de test | `RASTER_PART_FILES = new Set(["ResistorPart.jsx"])`, `entry.type !== 'RESISTOR'`, `describe` RESISTOR dédié — couplage par nom / type |
| `Breadboard.css` (ligne 11) | séquences littérales `` `r`n `` → `lightningcss` : `Unexpected token Semicolon` → `npm run build` **ROUGE** |

## 2. Cible (TARGET)

Un composant déclare sa présentation **dans son entrée de registre** :
```js
{ type: 'RESISTOR', component: ResistorPart, visual: { backend: 'raster' } }
{ type: 'LED', component: LedPart, visual: { markerless: true, bareBody: true } }
```
`resolvePresentation(visual)` (visualContract.js) dérive `{ backend, bareBody, markerless }` :
- `backend` = `resolveBackend(visual)` (`'svg'` par défaut) ;
- `bareBody` = `visual.bareBody` explicite, sinon `true` si `backend === 'raster'` ;
- `markerless` = `visual.markerless` explicite, sinon `true` si `backend === 'raster'`.

Le renderer central consomme ces drapeaux, **jamais** un `type === "…"` :
- `CircuitComponent.jsx` : `data-backend={presentation.backend}` sur `.circuit-component`, `data-bare-body` (attribut booléen) sur `.circuit-component__body`, `hideVisualMarker={presentation.markerless}` sur chaque `<Pin>` ;
- `CircuitComponent.css` : `.circuit-component__body[data-bare-body] { background:transparent; border:0; border-radius:0; box-shadow:none }` — **une seule** règle générique ;
- le marqueur de pin : `hideVisualMarker` → `opacity: 0` **inline** dans `Pin.jsx` (mécanisme LED pré-existant, réutilisé) — aucune règle CSS, aucun `!important`.

## 3. Gaps comblés

| Gap | Résolution |
|---|---|
| `resolveBackend` non branché | `RendererRegistry._visual` + `registerAll` + `VisualizationManager.getPresentation()/getBackend()` ; accesseur statique `getComponentPresentation()` (même source) pour `CircuitComponent.jsx` et les gardes |
| chrome wrapper spécifique RESISTOR | attribut `data-bare-body` + règle CSS générique ; **DIODE / LED / futurs raster couverts sans nouvelle règle** |
| marqueur pin spécifique RESISTOR (`:has`) | `hideVisualMarker` dérivé de `markerless` déclaratif |
| `type === "LED"` (×2) | supprimés ; `renderQualityGate` T6 `KNOWN_EXCEPTIONS = {}` |
| gardes de test couplées par nom/type | dérivées du registre (`getComponentPresentation(type).backend === 'raster'`) dans les 4 fichiers de garde |
| budget raster non appliqué | **T10** dans `renderQualityGate.test.jsx` : pour chaque type raster, `manifest.json` cohérent (octets réels == déclarés) et sous `RENDER_BUDGET.raster.maxWeightKbPerVariantSimple` (30 Ko) + `maxDimensionPx` (1024) |
| build `Breadboard.css` rouge | ligne 11 : `` `r`n `` littéraux → vrais retours à la ligne. **Déclarations inchangées** (`overflow: visible`, `transform: none`), commentaire préservé, `z-index: 1` intact. Aucune modification de géométrie, de `holeAt()`, de comportement. `lightningcss.transform()` : OK. `npm run build` : **exit 0**. |

## 4. Stratégie déclarative — pourquoi `data-bare-body` et pas `[data-backend="raster"]` seul

LED est un renderer **SVG** qui doit néanmoins avoir un body nu et pas de marqueur (il dessine son propre fond et ses pattes). Un sélecteur `[data-backend="raster"]` ne pourrait pas l'exprimer. `bareBody` / `markerless` sont donc des drapeaux **distincts** du backend, avec une **valeur par défaut dérivée** du backend (`raster` ⇒ les deux `true`). `data-backend` est tout de même exposé (informationnel + point d'extension futur : r3f, LOD, debug).

## 5. Tests

Commande canonique : `npx vitest run --config src/simulator/vitest.config.ts` (depuis `frontend/`).

| Portée | Avant (base `d3a3d1f`) | Après |
|---|---|---|
| Suite complète | 1609 pass / **16 fail** (1625) | **1615 pass / 16 fail** (1631) — +6 tests, **0 nouveau FAIL** |
| Fichiers en échec | 10 (breadboard / MB-VIS-LED-V5) | **10, identiques** (cf. `KNOWN-BROKEN-STATE.md`) |
| `tsc -b` | exit 0 | **exit 0** |
| `npm run build` | **ROUGE** (`Breadboard.css` lightningcss) | **exit 0** (corrigé) |
| Recherche de hacks | `type === "LED"` ×2, `:has(> .part-resistor)`, `:has(.part-resistor)` | `type === "LED"` / `type === "RESISTOR"` : **0** ; `:has(.part-resistor)` : uniquement dans des **commentaires** (CSS + test) documentant la suppression |

Nouveaux tests notables : `visualContract.test.js` (5 tests : `resolvePresentation` + branchement registre/manager + accesseur statique == manager + « exactement RESISTOR est raster ») ; `renderQualityGate.test.jsx` T10 (budget raster) ; `circuitComponentRasterChrome.test.jsx` (8 : règle générique, base préservée, hacks disparus, 0 `type===`, Pin.css intact, + rendu réel RESISTOR/LED/CAPACITOR → `data-backend` / `data-bare-body` / `opacity` des marqueurs).

## 6. FAIL pré-existants

16, inchangés, tous en géométrie breadboard / projection de pins de présentation LED (MB-VIS-LED-V5). Aucun lié au backend visuel. Détail : `docs/pmo/repository-knowledge-base/KNOWN-BROKEN-STATE.md` §3. Le correctif `Breadboard.css` ne modifie que la syntaxe CSS (jsdom n'exécute pas `lightningcss`) → aucun de ces 16 tests n'est affecté.

## 7. Validation RESISTOR (non-régression)

| Contrôle | Résultat |
|---|---|
| rendu | asset raster (`<picture>`/`<img>`), aucun `<svg>` — inchangé |
| chrome wrapper | `.circuit-component__body` a `data-bare-body` → fond/bordure/rayon/ombre neutralisés (via règle générique) |
| marqueurs de pin | `hideVisualMarker` (markerless dérivé) → `opacity: 0` inline ; `<button>` présent, cliquable |
| pins fonctionnels | 2, positions A(0,14)/B(84,14) — inchangées |
| drag / sélection / câblage | inchangés (aucune modification du wrapper d'interaction, de `Pin.jsx`, du contexte) |
| dimensions canoniques / modèle électrique | inchangés (`componentDefinitions.js`, `simulator/*`, `ResistorModel.js` non touchés) |
| assets | 4 fichiers, **SHA-256 identiques** (`b5eae0cc…` / `e6b85503…` / `115b56ab…` / `c6ff40ce…`) |

## 8. Limites / dette résiduelle

- `markerless` supprime aussi le retour visuel hover / pending / connecté sur les pins des composants concernés (RESISTOR, LED) — comportement identique à l'existant LED ; le câblage reste fonctionnel. Une séparation « hitbox de câblage » / « repère visuel d'état » relève d'un futur `MB-VIS-PIN-001` (hors périmètre).
- Le re-calage des boîtes canoniques non mutuellement à l'échelle (`visualContract.SCALE_AUDIT` : ARDUINO/POWER sous-échelle, BUTTON sur-échelle) reste un futur ticket **fonctionnel** distinct.
- `data-backend="r3f"` : réservé EXP5, non exercé.

## 9. Verdict

**PASS — MB-VIS-INDUSTRIAL-001.**
`resolveBackend` / `visual.backend` branchés ; backend exposé déclarativement (`data-backend` + `data-bare-body`) ; chrome et markerless génériques ; aucune prolifération `:has(.part-X)` ; aucune logique type-specific ; gardes de test factorisées ; `RENDER_BUDGET.raster` appliqué (T10) ; RESISTOR non régressé, assets inchangés ; géométrie / simulation / drag / sélection / câblage préservés ; `Breadboard.css` réparé (build vert) sans changement de comportement ; `tsc` OK ; 0 nouvelle régression.

**Prochain ticket autorisé : DIODE** (`MB-VIS-PROTOTYPE-002` selon la séquence §7.4). DIODE ne devra nécessiter qu'une entrée de registre `visual: { backend: 'raster' }`, son asset + sa validation (`VISUAL-COMPONENT-PROTOCOL.md`), et son `manifest.json` — aucune nouvelle règle dans le renderer central.
