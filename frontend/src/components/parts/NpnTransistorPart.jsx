import React from 'react'

/**
 * Rendu visuel Transistor NPN (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Boîtier TO-92 (dos plat) + 3 pattes, contenu strictement dans la boîte
 * 90×60 définie par componentDefinitions.js (non modifiée, pins collector
 * dx=45/dy=0 en haut, base dx=0/dy=45 à gauche, emitter dx=90/dy=45 à
 * droite). Le tracé des pattes suit exactement ces positions déclarées —
 * aucune géométrie fonctionnelle modifiée pour le rendu (Blueprint §5).
 */
export function NpnTransistorPart() {
  return (
    <div className="part-npn-transistor" aria-label="Transistor NPN">
      <svg viewBox="0 0 90 60" width="90" height="60" role="img" aria-hidden="true">
        <line x1="45" y1="14" x2="45" y2="0" className="part-npn-transistor__lead" />
        <line x1="20" y1="45" x2="0" y2="45" className="part-npn-transistor__lead" />
        <line x1="70" y1="45" x2="90" y2="45" className="part-npn-transistor__lead" />
        <path
          d="M20 45 V22 A25 20 0 0 1 70 22 V45 Z"
          className="part-npn-transistor__body"
        />
        <line x1="30" y1="20" x2="30" y2="12" className="part-npn-transistor__flat" />
        <text x="37" y="40" className="part-npn-transistor__mark">NPN</text>
      </svg>
    </div>
  )
}
