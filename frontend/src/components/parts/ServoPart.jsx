import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Micro Servo — backend RASTER (MB-VIS-COMP-035).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<rect>` boîtier + `<circle>` hub + `<line>`×2 palonnier + `<line>`×3
 * pattes) par l'asset raster réaliste validé CSA (Tower Pro SG90 : boîtier
 * bleu translucide, oreilles de fixation latérales, palonnier blanc, vis
 * métallique centrale, câble 3 conducteurs signal/VCC/GND, connecteur
 * femelle noir 3 broches ; 1x 90×70 / 3x 270×210, PNG + WebP, RGBA, fond
 * transparent). Intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('SERVO')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "SERVO"` dans la couche de rendu
 * centrale ni règle CSS spécifique).
 *
 * Patron identique à `NpnTransistorPart.jsx` / `BuzzerPart.jsx` :
 * `frontend/public/` est servi à la racine web →
 * `/assets/components/servo/…`, priorité WebP via `<picture>`, fallback
 * PNG, 1x/3x natif via `srcSet`, aucune logique JS de sélection
 * d'écran/densité.
 *
 * Composant STATIQUE — aucune prop dynamique, état unique `default`. Le
 * renderer ne fait qu'afficher l'asset : aucun SVG, aucun canvas, aucun
 * dessin CSS, aucun pseudo-élément, aucun crop runtime, aucun masque CSS,
 * aucun texte ajouté, aucun corps artificiel.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("SERVO")` (90×70) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - coordonnées électriques canoniques INCHANGÉES : signal (90,20),
 *    vcc (90,35), gnd (90,50) — `componentDefinitions.js` /
 *    `canonicalRegistry.js` / modèle de simulation non touchés ;
 *  - AUCUNE projection de présentation dédiée (contrairement à LED /
 *    NPN_TRANSISTOR) : `pinPresentationGeometry.js` reste NON modifié pour
 *    ce ticket (décision CSA explicite) — les 3 pins restent dessinés à
 *    leurs coordonnées électriques canoniques, via le fallback générique
 *    `getPinPosition()` ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - rendu déterministe, aucun id.
 */
const ASSET_DIR = '/assets/components/servo'
const WEBP_SRCSET = `${ASSET_DIR}/servo.default.1x.webp 1x, ${ASSET_DIR}/servo.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/servo.default.1x.png 1x, ${ASSET_DIR}/servo.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/servo.default.3x.png`

export function ServoPart() {
  const def = getComponentDef('SERVO')
  const width = def?.width ?? 90
  const height = def?.height ?? 70

  return (
    <div className="part-servo" aria-label="Micro Servo">
      <picture className="part-servo__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-servo__img"
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
