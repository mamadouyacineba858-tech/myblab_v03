import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Photorésistance / LDR (MB-COMPONENT-LIBRARY-002).
 *
 * Composant statique (aucune prop dynamique reçue, comportement inchangé).
 * Disque photosensible (piste en zigzag) + fils métalliques, contenu
 * strictement dans la boîte 84×36 définie par componentDefinitions.js (non
 * modifiée, pins A dx=0/B dx=84 à dy=18).
 */
export function LdrPart() {
  const def = getComponentDef("LDR")
  const width = def?.width ?? 84
  const height = def?.height ?? 36
  return (
    <div className="part-ldr" aria-label="Photorésistance">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-hidden="true">
        <line x1="0" y1="18" x2="18" y2="18" className="part-ldr__lead" />
        <line x1="66" y1="18" x2="84" y2="18" className="part-ldr__lead" />
        <ellipse cx="42" cy="18" rx="24" ry="15" className="part-ldr__disc" />
        <path
          d="M22 18 L28 10 L34 26 L40 10 L46 26 L52 10 L58 26 L62 18"
          className="part-ldr__track"
        />
      </svg>
    </div>
  )
}
