import React from 'react'

/**
 * Rendu visuel Micro Servo (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Boîtier + palonnier (horn) + 3 fils, contenu strictement dans la boîte
 * 90×70 définie par componentDefinitions.js (non modifiée, pins signal
 * dx=90/dy=20, vcc dx=90/dy=35, gnd dx=90/dy=50, tous sur le bord droit).
 */
export function ServoPart() {
  return (
    <div className="part-servo" aria-label="Micro Servo">
      <svg viewBox="0 0 90 70" width="90" height="70" role="img" aria-hidden="true">
        <line x1="63" y1="20" x2="90" y2="20" className="part-servo__lead part-servo__lead--signal" />
        <line x1="63" y1="35" x2="90" y2="35" className="part-servo__lead part-servo__lead--vcc" />
        <line x1="63" y1="50" x2="90" y2="50" className="part-servo__lead part-servo__lead--gnd" />
        <rect x="8" y="15" width="55" height="45" rx="4" className="part-servo__case" />
        <circle cx="35" cy="20" r="6" className="part-servo__hub" />
        <line x1="14" y1="20" x2="56" y2="20" className="part-servo__horn" />
        <line x1="35" y1="4" x2="35" y2="20" className="part-servo__horn part-servo__horn--vertical" />
      </svg>
    </div>
  )
}
