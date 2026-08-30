import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel LED RGB (MB-COMPONENT-LIBRARY-002).
 *
 * Contrat de props strictement inchangé (r, g, b : boolean | undefined,
 * fournies par PartRenderer via getRgbLedState — non touché par ce
 * ticket). Dôme + 4 pattes, contenu strictement dans la boîte 90×56
 * définie par componentDefinitions.js (non modifiée, pins R dx=12,
 * common dx=34, G dx=56, B dx=78, tous à dy=56, en bas). L'état visuel de
 * chaque canal reste piloté par une classe CSS dérivée de la prop
 * correspondante (part-rgb-led__chip--on), exactement le même mécanisme
 * booléen qu'avant ce ticket (auparavant des styles inline équivalents sur
 * 3 <span> — comportement observable identique, implémentation alignée sur
 * le style CSS-driven du reste du catalogue réaliste, LOCK-19/VIS-TEST-08).
 */
export function RgbLedPart({ r, g, b }) {
  const def = getComponentDef("RGB_LED")
  const width = def?.width ?? 90
  const height = def?.height ?? 56
  const isR = r === true
  const isG = g === true
  const isB = b === true

  return (
    <div className="part-rgb-led" aria-label="LED RGB">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <line x1="12" y1="48" x2="12" y2="56" className="part-rgb-led__leg" />
        <line x1="34" y1="48" x2="34" y2="56" className="part-rgb-led__leg" />
        <line x1="56" y1="48" x2="56" y2="56" className="part-rgb-led__leg" />
        <line x1="78" y1="48" x2="78" y2="56" className="part-rgb-led__leg" />
        <rect x="6" y="42" width="78" height="8" rx="2" className="part-rgb-led__flange" />
        <path
          d="M10 44 V26 A35 24 0 0 1 80 26 V44 Z"
          className="part-rgb-led__dome"
        />
        <circle cx="34" cy="30" r="6" className={`part-rgb-led__chip part-rgb-led__chip--r${isR ? " part-rgb-led__chip--on" : ""}`} />
        <circle cx="45" cy="30" r="6" className={`part-rgb-led__chip part-rgb-led__chip--g${isG ? " part-rgb-led__chip--on" : ""}`} />
        <circle cx="56" cy="30" r="6" className={`part-rgb-led__chip part-rgb-led__chip--b${isB ? " part-rgb-led__chip--on" : ""}`} />
      </svg>
    </div>
  )
}
