import React from 'react'

/**
 * Rendu visuel Diode (MB-VIS-002).
 *
 * Composant statique (STATIC, §8 du ticket) : aucune prop dynamique reçue,
 * comportement inchangé. Boîtier cylindrique noir + bague de polarité côté
 * cathode + fils métalliques, contenu strictement dans la boîte 90×30
 * définie par componentDefinitions.js (non modifiée). La bague de polarité
 * est placée du côté du pin "cathode" (dx=90, côté droit), conformément à
 * la position réelle du pin — aucune donnée inventée.
 */
export function DiodePart() {
  return (
    <div className="part-diode" aria-label="Diode">
      <svg viewBox="0 0 90 30" width="90" height="30" role="img" aria-hidden="true">
        <line x1="0" y1="15" x2="20" y2="15" className="part-diode__lead" />
        <line x1="70" y1="15" x2="90" y2="15" className="part-diode__lead" />
        <rect x="20" y="6" width="50" height="18" rx="4" className="part-diode__body" />
        <rect x="58" y="6" width="6" height="18" className="part-diode__cathode-band" />
      </svg>
    </div>
  )
}
