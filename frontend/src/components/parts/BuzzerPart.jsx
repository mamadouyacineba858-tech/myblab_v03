import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Buzzer (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Buzzer piézoélectrique vu de dessus (disque + membrane), contenu
 * strictement dans la boîte 70×50 définie par componentDefinitions.js (non
 * modifiée, pins plus dx=10/dy=50 et minus dx=60/dy=50, tous deux en bas).
 */
export function BuzzerPart() {
  const def = getComponentDef("BUZZER")
  const width = def?.width ?? 70
  const height = def?.height ?? 50
  return (
    <div className="part-buzzer" aria-label="Buzzer">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <line x1="22" y1="38" x2="10" y2="50" className="part-buzzer__lead" />
        <line x1="48" y1="38" x2="60" y2="50" className="part-buzzer__lead" />
        <circle cx="35" cy="22" r="20" className="part-buzzer__case" />
        <circle cx="35" cy="22" r="13" className="part-buzzer__membrane" />
        <circle cx="35" cy="22" r="4" className="part-buzzer__hole" />
        <text x="28" y="10" className="part-buzzer__mark">+</text>
      </svg>
    </div>
  )
}
