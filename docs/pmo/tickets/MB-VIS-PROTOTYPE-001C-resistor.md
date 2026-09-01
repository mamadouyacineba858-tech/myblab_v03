# MB-VIS-PROTOTYPE-001C — RESISTOR — Intégration du raster validé

**Statut :** Historique — verdict d'exécution « PASS — RESISTOR RASTER INTEGRATED », puis repris par l'audit `001C.1`.
**Nature :** document de reconstitution (transcrit a posteriori par `MB-VIS-RESISTOR-CONSOLIDATION-001`).
**Base Git :** `6759e183a1caae86abb04c4735f3909572ebb9ad`.
**Antécédent :** `MB-VIS-PROTOTYPE-001B` (CSA VISUAL GO — RESISTOR).

---

## 1. Objectif

Faire **réellement utiliser** par l'application MYBlab l'asset raster RESISTOR validé en 001B, à la place de l'ancien rendu SVG volumétrique (`MB-VIS-LED-010` / `b964a86`).

Directive de périmètre : privilégier la modification de `ResistorPart.jsx`. Ne pas modifier `CircuitComponent.jsx` / `Pin.jsx` / `SimulationCanvas.jsx` / `componentDefinitions.js` / `Breadboard.*` / `simulator/*` sauf preuve d'une nécessité architecturale. Aucun asset produit ou modifié. Aucun commit.

## 2. Modification appliquée — `frontend/src/components/parts/ResistorPart.jsx`

**Avant** (SVG) : `<svg viewBox width height>` + `<defs>` + 2 `<linearGradient>` + 6 `<line>` (leads) + 6 `<rect>` (corps + bagues).

**Après** (raster) :

```jsx
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR   = '/assets/components/resistor'
const WEBP_SRCSET = `${ASSET_DIR}/resistor.default.1x.webp 1x, ${ASSET_DIR}/resistor.default.3x.webp 3x`
const PNG_SRCSET  = `${ASSET_DIR}/resistor.default.1x.png 1x, ${ASSET_DIR}/resistor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/resistor.default.3x.png`

export function ResistorPart({ uid } = {}) {
  const def = getComponentDef("RESISTOR")
  const width  = def?.width  ?? 84
  const height = def?.height ?? 28
  return (
    <div className="part-resistor" aria-label="Résistance">
      <picture className="part-resistor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img className="part-resistor__img" src={PNG_FALLBACK} srcSet={PNG_SRCSET}
          width={width} height={height} draggable={false} alt="" aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }} />
      </picture>
    </div>
  )
}
```

Contrat préservé :
- dimensions dérivées de `getComponentDef("RESISTOR")` (84 × 28) — aucune valeur recopiée ; `componentDefinitions.js` **non modifié** ;
- `frontend/public/` est servi à la racine web → chemin `/assets/components/resistor/…` (conforme `visualContract.ASSET_CONTRACT`) ;
- l'`<img>` ne porte **aucun** gestionnaire, `draggable={false}`, `pointer-events: none` → drag / sélection / câblage / hit-test / zoom restent au wrapper `.circuit-component` et à `<Pin>` (inchangés) ;
- `uid` reste accepté (contrat de props) mais **non consommé** (plus de `<defs>` à namespacer) → rendu déterministe pour toute instance ;
- aucun `<svg>` / `<line>` / `<rect>` / gradient résiduel.

## 3. Tests adaptés (nécessité : les gardes présumaient « tout renderer = `<svg>` racine »)

| Fichier | Adaptation | Justification |
|---|---|---|
| `partDimensionsGuard.test.js` | ajout `RASTER_PART_FILES = new Set(["ResistorPart.jsx"])` ; pour ces fichiers : assertions « aucun `<svg>` racine, présence `<img`, référence `["'\`]/assets/`, import `getComponentDef` » ; les 15 autres parts gardés à l'identique | un renderer raster n'a pas de tag `<svg>` à contrôler ; la garde « dims non recopiées dans le tag `<svg>` » est remplacée par une garde d'existence d'`<img>` + import canonique |
| `partDimensionsCanonical.test.jsx` | RESISTOR retiré du `describe.each` « dimensions du `<svg>` » ; `describe` dédié « backend raster » : au repos (dims `<img>` === `def`, aucun `<svg>`), **mutation** (`withSwappedDimensions("RESISTOR", {321,654})` → l'`<img>` suit), restauration | la garde **dynamique** de mutation (preuve que la dimension vient de `getComponentDef` au rendu) est **conservée**, ré-exprimée sur l'`<img>` — plus forte que la regex statique |
| `RealisticRenderers.test.jsx` | `it.each(LOT.filter(e => e.type !== 'RESISTOR'))` pour la vérif `<svg>` ; **nouveau** `it('RESISTOR : backend raster — <img> aux dimensions de componentDefinitions.js, aucun <svg>')` (dims, `src` `^/assets/components/resistor/resistor\.default\.`, `svg === null`) ; LOT conserve RESISTOR pour les vérifs structurelles de registre | couverture équivalente + assertions supplémentaires (src, absence svg) ; LED / CAPACITOR / DIODE inchangés |
| `renderQualityGate.test.jsx` (T9) | `const svg = container.querySelector("svg")` ; `if (!svg) { expect(container.querySelector("img")).not.toBeNull(); return }` avant le comptage de primitives | garde **générique raster** (aucun littéral `RESISTOR`) : un backend raster a 0 primitive SVG par construction ; un renderer produisant ni `<svg>` ni `<img>` (cassé) échoue toujours ; un `<svg>` à 100 primitives échoue toujours |

## 4. Test ajouté — `frontend/src/components/parts/__tests__/ResistorPart.raster.test.jsx` (7 tests, jsdom)

Prouve : rendu d'un `<img>` 84 × 28 ; `src`/`srcset` (img + `<source>`) → `/assets/components/resistor/…` (les 4 variantes référencées) ; `draggable=false` ; `pointer-events:none` ; aucun handler ; aucun vestige `<svg>`/`<line>`/`<rect>`/`<defs>`/`<linearGradient>` ; déterminisme (2 rendus identiques) ; via `CircuitProvider`/`CircuitComponent` : 2 `.myblab-pin` à `[[0,14],[84,14]]`, `.circuit-component img` présent, `.circuit-component svg` null, `pointerdown` sur l'`<img>` remonte au wrapper `.circuit-component`.

## 5. Résultat d'exécution

`npm --prefix frontend run test:ci` (config canonique `src/simulator/vitest.config.ts`) : cibles RESISTOR + gardes adaptées **vertes** ; les 16 échecs historiques de la branche **inchangés** (aucun nouveau). Verdict d'exécution : **PASS — RESISTOR RASTER INTEGRATED**.

## 6. Suite

Un audit indépendant (`MB-VIS-PROTOTYPE-001C.1`) a été demandé avant acceptation. Il a détecté un défaut d'habillage du wrapper (voir `001C.1`).
