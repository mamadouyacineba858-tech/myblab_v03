import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Alimentation DC de laboratoire — rendu Canvas qualifié candidat.
 *
 * MB-L1-POWER-001 :
 * - le Core POWER reste 70×90 ;
 * - pins/PhysicalContacts/modèle électrique inchangés ;
 * - la borne verte EARTH reste purement visuelle ;
 * - le rendu visible utilise désormais directement l'asset haute résolution
 *   approuvé par le Project Lead, dérivé de la référence Canvas validée ;
 * - aucun texte DOM superposé : toutes les inscriptions utiles sont intégrées
 *   dans l'asset lui-même pour éviter les décalages constatés sur le Canvas ;
 * - aucune pastille ou étiquette artificielle autour des bornes.
 */
const ASSET = '/assets/components/power/power.reference.hires.webp'
const APPROVED_CANDIDATE_SCALE = 2.5

export function PowerPart() {
  const def = getComponentDef('POWER')
  const width = def?.width ?? 70
  const height = def?.height ?? 90

  return (
    <div
      className="part-power"
      aria-label="Alimentation"
      data-canvas-scale={APPROVED_CANDIDATE_SCALE}
      data-visual-authority="approved-reference"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANDIDATE_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <img
        className="part-power__img part-power__img--approved-reference"
        src={ASSET}
        width={width}
        height={height}
        draggable={false}
        alt=""
        aria-hidden="true"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
          imageRendering: 'auto',
        }}
      />
    </div>
  )
}
