import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Moteur DC — backend RASTER (MB-VIS-PROTOTYPE-007).
 *
 * Remplace l'ancien rendu SVG schématique (MB-COMPONENT-LIBRARY-002 :
 * `<line>`/`<rect>`/`<circle>` + classes `.part-dc-motor__*`) par l'asset
 * raster produit et vérifié pour MB-VIS-PROTOTYPE-007 (v5), intégré via le
 * mécanisme déclaratif de MB-VIS-INDUSTRIAL-001 (`defaultRegistrations` →
 * `visual: { backend: 'raster' }` → `getComponentPresentation('DC_MOTOR')` →
 * wrapper `data-bare-body` + pins `markerless`, sans aucun
 * `type === "DC_MOTOR"` ni règle CSS spécifique).
 *
 * Patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` /
 * `CapacitorPart.jsx` / `LdrPart.jsx` / `ThermistorPart.jsx` : `frontend/public/`
 * est servi à la racine web → `/assets/components/dc-motor/…`, priorité WebP
 * via `<picture>`, fallback PNG, aucune logique JS de sélection d'asset.
 * Composant STATIQUE (état unique `default`) — aucune animation, aucun effet
 * dynamique, aucun glow, aucun effet/filtre CSS. L'asset porte le rendu
 * physique (carter métallique embouti, capot arrière, arbre, bague, cosses,
 * volume, évents).
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("DC_MOTOR")` (84×50) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins plus(0,25) / minus(84,25) : produits par CircuitComponent/Pin,
 *    jamais dessinés dans l'asset ni ici — les cosses de l'asset atteignent
 *    exactement ces deux points (probe pixel v5, écart 0.00 px) ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - le composant ne reçoit ni ne consomme aucune prop (comportement
 *    historique préservé) → rendu déterministe, aucune collision d'id entre
 *    deux moteurs simultanés (plus aucun id SVG).
 */
const ASSET_DIR = '/assets/components/dc-motor'
const WEBP_SRCSET = `${ASSET_DIR}/dc-motor.default.1x.webp 1x, ${ASSET_DIR}/dc-motor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/dc-motor.default.1x.png 1x, ${ASSET_DIR}/dc-motor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/dc-motor.default.3x.png`

export function DcMotorPart() {
  const def = getComponentDef("DC_MOTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 50

  return (
    <div className="part-dc-motor" aria-label="Moteur DC">
      <picture className="part-dc-motor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-dc-motor__img"
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
