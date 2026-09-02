import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Thermistance / THERMISTOR NTC — backend RASTER (MB-VIS-PROTOTYPE-006).
 *
 * Remplace l'ancien rendu SVG volumétrique (MB-VIS-LED-014 : `<defs>` + 3
 * gradients namespacés par `uid` — metal / bead / edge —, perle époxy en
 * `<circle>`) par l'asset raster produit et vérifié pour MB-VIS-PROTOTYPE-006,
 * intégré via le mécanisme déclaratif de MB-VIS-INDUSTRIAL-001
 * (`defaultRegistrations` → `visual: { backend: 'raster' }` →
 * `getComponentPresentation('THERMISTOR')` → wrapper `data-bare-body` + pins
 * `markerless`, sans aucun `type === "THERMISTOR"` ni règle CSS spécifique).
 *
 * Patron identique à `ResistorPart.jsx` / `DiodePart.jsx` / `LedPart.jsx` /
 * `CapacitorPart.jsx` / `LdrPart.jsx` : `frontend/public/` est servi à la
 * racine web → `/assets/components/thermistor/…`, priorité WebP via
 * `<picture>`, fallback PNG, aucune logique JS de sélection d'asset. Composant
 * STATIQUE (état unique `default`) — aucun état ON/OFF, aucune animation,
 * aucun effet CSS.
 *
 * Contrat inchangé :
 *  - dimensions dérivées de `getComponentDef("THERMISTOR")` (84×36) — aucune
 *    valeur recopiée, `componentDefinitions.js` NON modifié ;
 *  - pins A(0,18) / B(84,18) : produits par CircuitComponent/Pin, jamais
 *    dessinés dans l'asset ni ici ;
 *  - l'`<img>` ne porte AUCUN gestionnaire, `draggable={false}`,
 *    `pointer-events: none` → drag / sélection / câblage / hit-test / zoom
 *    restent la responsabilité du wrapper `.circuit-component` ;
 *  - `uid` reste accepté (contrat de props inchangé) mais n'est plus consommé
 *    (plus de `<defs>` à namespacer) → rendu déterministe pour toute instance,
 *    aucune collision d'id entre deux thermistances simultanées.
 */
const ASSET_DIR = '/assets/components/thermistor'
const WEBP_SRCSET = `${ASSET_DIR}/thermistor.default.1x.webp 1x, ${ASSET_DIR}/thermistor.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/thermistor.default.1x.png 1x, ${ASSET_DIR}/thermistor.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/thermistor.default.3x.png`

export function ThermistorPart({ uid } = {}) {
  const def = getComponentDef("THERMISTOR")
  const width = def?.width ?? 84
  const height = def?.height ?? 36

  return (
    <div className="part-thermistor" aria-label="Thermistance">
      <picture className="part-thermistor__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-thermistor__img"
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
