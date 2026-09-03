import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Potentiomètre — backend RASTER (MB-VIS-COMP-032).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<line>`×3 pattes + `<rect>` boîtier + `<circle>` cadran + `<line>` fente)
 * par l'asset raster réaliste validé CSA pour MB-VIS-COMP-032 (probe pixel
 * PASS : 4 fichiers, 1x 90×50 / 3x 270×150, RGBA, fond transparent, coins
 * transparents, 3 contacts physiques LEFT / WIPER / RIGHT ancrés en bas,
 * 3x = 3×1x), intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('POTENTIOMETER')` → wrapper `data-bare-body` +
 * pins `markerless`, sans aucun `type === "POTENTIOMETER"` ni règle CSS
 * spécifique dans le renderer central).
 *
 * Patron identique à `BuzzerPart.jsx` / `DcMotorPart.jsx` / `LdrPart.jsx` :
 * `frontend/public/` est servi à la racine web →
 * `/assets/components/potentiometer/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Composant STATIQUE — comportement électrique inchangé (MB-VIS-COMP-032
 * §3/§14) : aucune prop reçue ni consommée, état unique `default`. Le modèle
 * électrique (`canonicalRegistry` : left/passive, wiper/output, right/passive ;
 * `PotentiometerModel`, résistance, position) n'est pas touché.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("POTENTIOMETER")` (90×50) — aucune
 *    valeur recopiée, aucune géométrie recalculée selon le zoom ;
 *  - pins left(10,50) / wiper(45,50) / right(80,50) : produits par
 *    CircuitComponent/Pin d'après `PIN_PRESENTATION_BY_TYPE` (présentation
 *    visuelle des 3 contacts alignée sur l'asset par MB-VIS-COMP-032 §8),
 *    jamais dessinés ici — les pattes visibles dans l'asset ne sont pas des
 *    pins logiques ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - rendu déterministe, aucun id DOM (plus aucun id SVG) → aucune collision
 *    entre deux potentiomètres simultanés.
 */
const ASSET_DIR = '/assets/components/potentiometer'
const WEBP_SRCSET = `${ASSET_DIR}/potentiometer.default.1x.webp 1x, ${ASSET_DIR}/potentiometer.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/potentiometer.default.1x.png 1x, ${ASSET_DIR}/potentiometer.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/potentiometer.default.3x.png`

export function PotentiometerPart() {
  const def = getComponentDef("POTENTIOMETER")
  const width = def?.width ?? 90
  const height = def?.height ?? 50

  return (
    <div className="part-potentiometer" aria-label="Potentiomètre">
      <picture className="part-potentiometer__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-potentiometer__img"
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
