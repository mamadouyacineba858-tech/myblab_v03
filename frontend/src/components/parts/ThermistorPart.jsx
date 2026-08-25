import React from 'react'

/**
 * Rendu visuel Thermistance / THERMISTOR (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Perle thermosensible (bead NTC) + fils métalliques, contenu strictement
 * dans la boîte 84×36 définie par componentDefinitions.js (non modifiée,
 * pins A dx=0/B dx=84 à dy=18).
 */
export function ThermistorPart() {
  return (
    <div className="part-thermistor" aria-label="Thermistance">
      <svg viewBox="0 0 84 36" width="84" height="36" role="img" aria-hidden="true">
        <line x1="0" y1="18" x2="26" y2="18" className="part-thermistor__lead" />
        <line x1="58" y1="18" x2="84" y2="18" className="part-thermistor__lead" />
        <circle cx="42" cy="18" r="16" className="part-thermistor__bead" />
        <circle cx="37" cy="13" r="3" className="part-thermistor__bead-highlight" />
      </svg>
    </div>
  )
}
