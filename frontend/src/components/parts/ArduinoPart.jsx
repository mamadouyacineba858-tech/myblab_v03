import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Arduino UNO — backend RASTER (MB-VIS-COMP-037).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<line>`×4 pattes + `<rect>` PCB/USB/puce + `<text>` « UNO » + `<rect>`×3
 * marqueurs de pin) par l'asset raster photoréaliste validé CSA (Arduino UNO
 * R3 vue de dessus ; 1x 120×140 / 3x 360×420, PNG + WebP, RGBA/palette+tRNS,
 * fond transparent). Intégré via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` → `visual: { backend:
 * 'raster' }` → `getComponentPresentation('ARDUINO')` → wrapper
 * `data-bare-body` + pins `markerless`, sans aucun `type === "ARDUINO"` dans
 * la couche de rendu centrale ni règle CSS spécifique). ARDUINO devient le
 * 16ᵉ et dernier composant du catalogue à passer en raster.
 *
 * Patron identique à `PowerPart.jsx` / `ServoPart.jsx` /
 * `NpnTransistorPart.jsx` : `frontend/public/` est servi à la racine web →
 * `/assets/components/arduino/…`, priorité WebP via `<picture>`, fallback
 * PNG, 1x/3x natif via `srcSet`, aucune logique JS de sélection
 * d'écran/densité.
 *
 * Composant STATIQUE — aucune prop dynamique, état unique `default`. Le
 * renderer ne fait qu'afficher l'asset : aucun SVG, aucun canvas, aucun
 * dessin CSS, aucun pseudo-élément, aucun crop runtime, aucun masque CSS,
 * aucun texte ajouté, aucun corps artificiel.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("ARDUINO")` (120×140) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - coordonnées électriques canoniques INCHANGÉES : D2 dx=0/dy=50,
 *    D3 dx=0/dy=75, GND dx=0/dy=110, 5V dx=120/dy=50 —
 *    `componentDefinitions.js` / `canonicalRegistry.js` / modèle de
 *    simulation non touchés ;
 *  - la PROJECTION visuelle des pins sur les bords réels de la carte
 *    photographiée (D2=(3,50) / D3=(15,75) / GND=(15,108) / 5V=(115,50)) est
 *    déclarée dans `utils/pinPresentationGeometry.js` (couche de
 *    présentation existante, même patron que LED / NPN_TRANSISTOR / POWER)
 *    — déterminée par pixel-probe du silhouette réel de l'asset (la carte,
 *    pivotée/recadrée avec marge dans le canevas 120×140, ne touche pas les
 *    4 bords canoniques) ; elle ne remplace jamais la position électrique ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - rendu déterministe, aucun id.
 */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_SRCSET = `${ASSET_DIR}/arduino.default.1x.webp 1x, ${ASSET_DIR}/arduino.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/arduino.default.1x.png 1x, ${ASSET_DIR}/arduino.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/arduino.default.3x.png`

export function ArduinoPart() {
  const def = getComponentDef('ARDUINO')
  const width = def?.width ?? 120
  const height = def?.height ?? 140

  return (
    <div className="part-arduino" aria-label="Arduino UNO">
      <picture className="part-arduino__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-arduino__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
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
