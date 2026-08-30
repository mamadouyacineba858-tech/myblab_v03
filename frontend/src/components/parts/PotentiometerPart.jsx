import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Potentiomètre (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Trimmer réglable (boîtier + fente de réglage), contenu strictement dans
 * la boîte 90×50 définie par componentDefinitions.js (non modifiée, pins
 * left dx=10/dy=50, wiper dx=45/dy=0, right dx=80/dy=50).
 */
export function PotentiometerPart() {
  const def = getComponentDef("POTENTIOMETER")
  const width = def?.width ?? 90
  const height = def?.height ?? 50
  return (
    <div className="part-potentiometer" aria-label="Potentiomètre">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <line x1="25" y1="40" x2="10" y2="50" className="part-potentiometer__lead" />
        <line x1="65" y1="40" x2="80" y2="50" className="part-potentiometer__lead" />
        <line x1="45" y1="10" x2="45" y2="0" className="part-potentiometer__lead part-potentiometer__lead--wiper" />
        <rect x="15" y="10" width="60" height="30" rx="4" className="part-potentiometer__body" />
        <circle cx="45" cy="25" r="11" className="part-potentiometer__dial" />
        <line x1="45" y1="25" x2="52" y2="18" className="part-potentiometer__slot" />
      </svg>
    </div>
  )
}
