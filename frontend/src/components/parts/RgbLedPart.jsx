import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel LED RGB — backend RASTER (MB-VIS-COMP-033).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<line>`×4 pattes + `<rect>` flange + `<path>` dôme + `<circle>`×3 puces
 * pilotées par des classes `.part-rgb-led__chip--on` + `filter: drop-shadow`
 * CSS pour le glow) par le paquet d'assets raster réaliste validé pour
 * MB-VIS-COMP-033 (probe : 32 fichiers, 8 états × 1x 90×56 / 3x 270×168,
 * WebP + PNG, RGBA, fond transparent, coins transparents, 3x = 3×1x,
 * pattes ancrées à x=12/34/56/78 ±0.5 px). Intégré via le mécanisme
 * déclaratif de MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` →
 * `visual: { backend: 'raster' }` → `getComponentPresentation('RGB_LED')` →
 * wrapper `data-bare-body` + pins `markerless`, sans aucun
 * `type === "RGB_LED"` ni règle CSS spécifique dans le renderer central).
 *
 * Patron identique à `LedPart.jsx` (premier composant raster à états
 * discrets) : `frontend/public/` est servi à la racine web →
 * `/assets/components/rgb-led/…`, priorité WebP via `<picture>`, fallback
 * PNG, aucune logique JS de sélection d'écran/densité (1x/3x natif via
 * `srcSet`).
 *
 * États — le mélange et l'illumination sont CUITS dans les assets (aucun
 * `box-shadow` / `filter` / pseudo-élément / glow CSS ici) :
 *  - le contrat de props est STRICTEMENT inchangé : `r`, `g`, `b`
 *    (boolean | undefined), fournis par le Visual State Registry existant
 *    (`defaultVisualStateRegistrations.js` → `getRgbLedState`) via
 *    `PartRenderer.jsx` — aucune logique de simulation déplacée ici ;
 *  - le renderer se contente de mapper la combinaison `r/g/b` vers l'un des
 *    8 états d'asset, exactement les 8 combinaisons booléennes existantes,
 *    aucune combinaison inventée :
 *      000 → off   100 → red    010 → green  001 → blue
 *      110 → yellow 101 → magenta 011 → cyan  111 → white
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("RGB_LED")` (90×56) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins R(12,56) / common(34,56) / G(56,56) / B(78,56) : produits par
 *    CircuitComponent/Pin, jamais dessinés ici ni dans l'asset ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - mêmes props → même HTML (rendu déterministe, aucun id).
 */
const ASSET_DIR = '/assets/components/rgb-led'
const STATES = ['off', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white']
const ASSET_SOURCES = Object.fromEntries(
  STATES.map((s) => [s, {
    webp: `${ASSET_DIR}/rgb-led.${s}.1x.webp 1x, ${ASSET_DIR}/rgb-led.${s}.3x.webp 3x`,
    png: `${ASSET_DIR}/rgb-led.${s}.1x.png 1x, ${ASSET_DIR}/rgb-led.${s}.3x.png 3x`,
    fallback: `${ASSET_DIR}/rgb-led.${s}.3x.png`,
  }]),
)

/** Combinaison booléenne r/g/b → nom d'état d'asset (les 8 combinaisons existantes). */
function stateFor(r, g, b) {
  const R = r === true
  const G = g === true
  const B = b === true
  if (R && G && B) return 'white'
  if (R && G) return 'yellow'
  if (R && B) return 'magenta'
  if (G && B) return 'cyan'
  if (R) return 'red'
  if (G) return 'green'
  if (B) return 'blue'
  return 'off'
}

export function RgbLedPart({ r, g, b } = {}) {
  const def = getComponentDef('RGB_LED')
  const width = def?.width ?? 90
  const height = def?.height ?? 56
  const state = stateFor(r, g, b)
  const source = ASSET_SOURCES[state]

  return (
    <div className="part-rgb-led" aria-label="LED RGB" data-state={state}>
      <picture className="part-rgb-led__picture">
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-rgb-led__img"
          src={source.fallback}
          srcSet={source.png}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
    </div>
  )
}
