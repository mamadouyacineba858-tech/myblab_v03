import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Alimentation / POWER (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Bloc d'alimentation + symbole pile, contenu strictement dans la boîte
 * 70×90 définie par componentDefinitions.js (non modifiée, pins 5V
 * dx=70/dy=25 et GND dx=70/dy=65, tous deux sur le bord droit).
 */
export function PowerPart() {
  const def = getComponentDef("POWER")
  const width = def?.width ?? 70
  const height = def?.height ?? 90
  return (
    <div className="part-power" aria-label="Alimentation">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <line x1="56" y1="25" x2="70" y2="25" className="part-power__lead part-power__lead--plus" />
        <line x1="56" y1="65" x2="70" y2="65" className="part-power__lead part-power__lead--gnd" />
        <rect x="6" y="6" width="50" height="78" rx="6" className="part-power__body" />
        <line x1="20" y1="30" x2="20" y2="42" className="part-power__cell part-power__cell--long" />
        <line x1="28" y1="34" x2="28" y2="38" className="part-power__cell part-power__cell--short" />
        <line x1="36" y1="30" x2="36" y2="42" className="part-power__cell part-power__cell--long" />
        <line x1="44" y1="34" x2="44" y2="38" className="part-power__cell part-power__cell--short" />
        <text x="31" y="60" className="part-power__label part-power__label--plus">+5V</text>
        <text x="31" y="74" className="part-power__label part-power__label--gnd">GND</text>
      </svg>
    </div>
  )
}
