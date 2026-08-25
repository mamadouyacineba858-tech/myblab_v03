import React from 'react'

/**
 * Rendu visuel Arduino UNO (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Carte vue de dessus (PCB + connecteur USB + puce + headers) + fils,
 * contenu strictement dans la boîte 120×140 définie par
 * componentDefinitions.js (non modifiée, pins D2 dx=0/dy=50, D3 dx=0/dy=75,
 * GND dx=0/dy=110 sur le bord gauche, 5V dx=120/dy=50 sur le bord droit).
 */
export function ArduinoPart() {
  return (
    <div className="part-arduino" aria-label="Arduino UNO">
      <svg viewBox="0 0 120 140" width="120" height="140" role="img" aria-hidden="true">
        <line x1="0" y1="50" x2="10" y2="50" className="part-arduino__lead" />
        <line x1="0" y1="75" x2="10" y2="75" className="part-arduino__lead" />
        <line x1="0" y1="110" x2="10" y2="110" className="part-arduino__lead" />
        <line x1="110" y1="50" x2="120" y2="50" className="part-arduino__lead" />
        <rect x="10" y="6" width="100" height="128" rx="4" className="part-arduino__board" />
        <rect x="22" y="0" width="24" height="14" rx="2" className="part-arduino__usb" />
        <rect x="46" y="52" width="30" height="30" className="part-arduino__chip" />
        <text x="70" y="118" className="part-arduino__title">UNO</text>
        <rect x="16" y="16" width="6" height="6" className="part-arduino__pin-marker" />
        <rect x="16" y="26" width="6" height="6" className="part-arduino__pin-marker" />
        <rect x="16" y="36" width="6" height="6" className="part-arduino__pin-marker" />
      </svg>
    </div>
  )
}
