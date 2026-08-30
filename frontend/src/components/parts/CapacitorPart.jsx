import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel du condensateur disque traversant.
 * Les deux pattes sont verticales et sortent sous le corps.
 */
export function CapacitorPart() {
  const def = getComponentDef("CAPACITOR")
  const width = def?.width ?? 70
  const height = def?.height ?? 40
  return (
    <div className="part-capacitor" aria-label="Condensateur">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        {/* Pattes métalliques verticales, même diamètre et même longueur. */}
        <line x1="24" y1="27" x2="24" y2="40" className="part-capacitor__lead" />
        <line x1="46" y1="27" x2="46" y2="40" className="part-capacitor__lead" />

        {/* Corps disque jaune/orange inspiré du modèle réel fourni. */}
        <defs>
          <radialGradient id="capacitor-disk" cx="30%" cy="22%" r="82%">
            <stop offset="0%" stopColor="#ffd76a" />
            <stop offset="35%" stopColor="#f4b52f" />
            <stop offset="72%" stopColor="#dc8b0c" />
            <stop offset="100%" stopColor="#a95c05" />
          </radialGradient>
        </defs>
        <ellipse cx="35" cy="15" rx="18" ry="12.5" fill="url(#capacitor-disk)" />
        <ellipse cx="35" cy="15" rx="18" ry="12.5" className="part-capacitor__disc-outline" />

        {/* Reflet du vernis. */}
        <path
          d="M22 18 C19 12 21 7 26 4 C24 9 24 14 25 18"
          fill="none"
          stroke="#fff5d5"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.58"
        />
      </svg>
    </div>
  )
}