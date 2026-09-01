# MB-VIS-INDUSTRIAL-001 — Delivery Report

**Verdict : PASS.**
**Ticket :** `docs/pmo/tickets/MB-VIS-INDUSTRIAL-001-declarative-visual-backend.md`.
**Base :** `d3a3d1f0d2977973555e355b5d59ca87b4c13b7d`. **Branche :** `feat/MB-VIS-LED-V16-leads-thicker-realistic`.

## Objet livré

Backend de rendu **déclaratif et générique** : un composant déclare `visual` dans son entrée de registre (`defaultRegistrations.js`) ; `resolvePresentation()` en dérive `{ backend, bareBody, markerless }` ; `CircuitComponent.jsx` applique `data-backend` / `data-bare-body` / `hideVisualMarker` sans aucun `type === "…"`. Les hacks spécifiques RESISTOR (`:has(.part-resistor)` ×2) et LED (`type === "LED"` ×2) sont supprimés. Correctif de build `Breadboard.css` inclus.

## Architecture

| Élément | Livré |
|---|---|
| `resolveBackend()` | branché : `RendererRegistry._visual` (via `registerAll`), `VisualizationManager.getBackend()` |
| `visual.backend` | consommé : `defaultRegistrations.getComponentPresentation()` + `VisualizationManager.getPresentation()` (même source, testé égal) |
| mécanisme déclaratif DOM | `data-backend` sur `.circuit-component`, `data-bare-body` (booléen) sur `.circuit-component__body` |
| chrome wrapper | règle CSS unique `.circuit-component__body[data-bare-body]` (générique) |
| markerless | `hideVisualMarker` dérivé de `presentation.markerless` → `opacity:0` inline `Pin.jsx` (aucune règle CSS, aucun `!important`) |
| guards raster | dérivés du registre (`getComponentPresentation(type).backend === 'raster'`) dans `partDimensionsGuard`, `partDimensionsCanonical`, `RealisticRenderers`, `renderQualityGate` |
| `RENDER_BUDGET.raster` | appliqué par `renderQualityGate` T10 (manifeste, octets réels, poids ≤ 30 Ko, dim ≤ 1024) |

## RESISTOR (non-régression)

rendu raster inchangé · `data-bare-body` présent → chrome neutralisé · marqueurs `opacity:0` · pins A(0,14)/B(84,14) · drag / sélection / câblage inchangés · `componentDefinitions.js` / `simulator/*` / `ResistorModel.js` non touchés · assets **SHA-256 identiques** (`b5eae0cc…` / `e6b85503…` / `115b56ab…` / `c6ff40ce…`).

## Tests

- Suite complète : **1615 pass / 16 fail (1631)** — base `d3a3d1f` : 1609 / 16 (1625). **+6 tests, 0 nouveau FAIL.**
- 16 FAIL = pré-existants documentés (breadboard / MB-VIS-LED-V5), **10 fichiers identiques** à `KNOWN-BROKEN-STATE.md` §3.
- `npx tsc -b` : **exit 0**.
- `lightningcss.transform()` sur `CircuitComponent.css` / `Breadboard.css` / `Pin.css` : **OK**.
- `npm run build` : **exit 0** — le blocage `Breadboard.css` (pré-existant) est **corrigé** (correctif de syntaxe pur).
- Recherche de hacks : `type === "LED"` / `type === "RESISTOR"` → **0** ; `:has(.part-resistor)` / `:has(> .part-resistor)` → uniquement dans des **commentaires** (CSS + test) documentant la suppression.

## Fichiers

**Code (7) :** `visualization/visualContract.js`, `visualization/registry.js`, `visualization/VisualizationManager.js`, `visualization/defaultRegistrations.js`, `canvas/CircuitComponent.jsx`, `canvas/CircuitComponent.css`, `canvas/Breadboard.css`.
**Tests (6) :** `__tests__/renderQualityGate.test.jsx`, `canvas/__tests__/circuitComponentRasterChrome.test.js → .test.jsx` (rename), `components/parts/__tests__/{partDimensionsGuard.test.js, partDimensionsCanonical.test.jsx, RealisticRenderers.test.jsx}`, `visualization/__tests__/visualContract.test.js`.
**Docs (3) :** ce rapport, le ticket, mise à jour `KNOWN-BROKEN-STATE.md` §2.

## Limites

- `markerless` supprime le retour visuel hover/pending/connecté des pins concernés (identique à l'existant LED) — câblage fonctionnel. Séparation fine → futur `MB-VIS-PIN-001`.
- Re-calage des boîtes canoniques (`SCALE_AUDIT`) → futur ticket fonctionnel.
- `data-backend="r3f"` réservé EXP5, non exercé.

## Suite

**DIODE** (`MB-VIS-PROTOTYPE-002`) : entrée `visual: { backend: 'raster' }` + asset + validation (`VISUAL-COMPONENT-PROTOCOL.md`) + `manifest.json`. Aucune modification du renderer central attendue.
