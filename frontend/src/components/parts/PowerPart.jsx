import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Alimentation DC de laboratoire — backend raster.
 *
 * MB-L1-POWER-001 — Canvas readability :
 * - Core POWER, modèle DC et PhysicalContacts inchangés ;
 * - seul le corps visuel est agrandi localement ;
 * - variante raster 3x forcée ;
 * - suppression des surimpressions DOM qui se chevauchaient ;
 * - toutes les inscriptions visibles proviennent désormais du raster lui-même ;
 * - la borne verte EARTH reste décorative et ne devient jamais un pin logique.
 */
const ASSET_DIR = '/assets/components/power'
const WEBP_3X = `${ASSET_DIR}/power.default.3x.webp`
const PNG_3X = `${ASSET_DIR}/power.default.3x.png`
const APPROVED_CANDIDATE_SCALE = 3.3

export function PowerPart() {
  const def = getComponentDef('POWER')
  const width = def?.width ?? 70
  const height = def?.height ?? 90

  return (
    <div
      className="part-power"
      aria-label="Alimentation"
      data-canvas-scale={APPROVED_CANDIDATE_SCALE}
      data-visual-source="stable-raster-3x"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANDIDATE_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <picture className="part-power__picture" data-hires-source="3x-only">
        <source type="image/webp" srcSet={`${WEBP_3X} 1x, ${WEBP_3X} 3x`} />
        <img
          className="part-power__img"
          src={PNG_3X}
          srcSet={`${PNG_3X} 1x, ${PNG_3X} 3x`}
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
            filter: 'contrast(1.08) saturate(1.04)',
          }}
        />
      </picture>
    </div>
  )
}
