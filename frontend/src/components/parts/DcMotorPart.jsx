import React from 'react'

/**
 * Rendu visuel Moteur DC (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Corps cylindrique vu de profil (carcasse + axe) + fils métalliques,
 * contenu strictement dans la boîte 84×50 définie par
 * componentDefinitions.js (non modifiée, pins plus dx=0/minus dx=84 à
 * dy=25).
 */
export function DcMotorPart() {
  return (
    <div className="part-dc-motor" aria-label="Moteur DC">
      <svg viewBox="0 0 84 50" width="84" height="50" role="img" aria-hidden="true">
        <line x1="0" y1="25" x2="14" y2="25" className="part-dc-motor__lead" />
        <line x1="70" y1="25" x2="84" y2="25" className="part-dc-motor__lead" />
        <rect x="14" y="8" width="56" height="34" rx="17" className="part-dc-motor__body" />
        <circle cx="70" cy="25" r="5" className="part-dc-motor__shaft" />
        <line x1="24" y1="8" x2="24" y2="42" className="part-dc-motor__band" />
      </svg>
    </div>
  )
}
