import React from 'react'

/**
 * Rendu visuel LED (MB-VIS-002).
 *
 * Contrat de props strictement inchangé (isOn : boolean, fournie par
 * PartRenderer via getLedState — non touché par ce ticket). Boîtier
 * "dôme" + patte de flasque, contenu dans la boîte 80×40 définie par
 * componentDefinitions.js (non modifiée). L'état visuel on/off reste
 * piloté uniquement par la classe part-led--on, comme avant ce ticket.
 */
export function LedPart({ isOn }) {
  return (
    <div
      className={`part-led ${isOn ? "part-led--on" : ""}`}
      aria-label={isOn ? "LED allumée" : "LED éteinte"}
    >
      <svg viewBox="0 0 80 40" width="80" height="40" role="img" aria-hidden="true">
        <line x1="30" y1="34" x2="30" y2="40" className="part-led__leg" />
        <line x1="50" y1="34" x2="50" y2="40" className="part-led__leg" />
        <rect x="18" y="29" width="44" height="7" rx="2" className="part-led__flange" />
        <path
          d="M20 30 V18 A20 18 0 0 1 60 18 V30 Z"
          className="part-led__dome"
        />
      </svg>
    </div>
  )
}
