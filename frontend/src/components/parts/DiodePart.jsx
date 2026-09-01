import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Diode — backend RASTER (MB-VIS-PROTOTYPE-002).
 *
 * Remplace l'ancien rendu SVG volumétrique expérimental (MB-VIS-LED-012 :
 * `<defs>` + 4 gradients namespacés par `uid`) par l'asset raster produit et
 * vérifié pour MB-VIS-PROTOTYPE-002, intégré via le mécanisme déclaratif de
 * MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` → `visual: { backend: 'raster' }`
 * → `getComponentPresentation('DIODE')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "DIODE"` ni règle CSS spécifique).
 *
 * Patron identique à `ResistorPart.jsx` : `frontend/public/` est servi à la
 * racine web → `/assets/components/diode/…`, priorité WebP via `<picture>`,
 * fallback PNG, aucune logique JS de sélection d'asset.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("DIODE")` (84×30) — aucune valeur
 *    recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins anode(0,15) / cathode(84,15) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est plus consommé
 *    (plus de `<defs>` à namespacer) → rendu déterministe pour toute instance.
 */
const ASSET_DIR = '/assets/components/diode'
const WEBP_SRCSET = `${ASSET_DIR}/diode.default.1x.webp 1x, ${ASSET_DIR}/diode.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/diode.default.1x.png 1x, ${ASSET_DIR}/diode.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/diode.default.3x.png`

export function DiodePart({ uid } = {}) {
  const def = getComponentDef("DIODE")
  const width = def?.width ?? 84
  const height = def?.height ?? 30

  return (
    <div className="part-diode" aria-label="Diode">
      <picture className="part-diode__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-diode__img"
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
