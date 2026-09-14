import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Alimentation DC de laboratoire — backend raster stable + sérigraphie vectorielle.
 *
 * MB-L1-POWER-001 :
 * - taille Canvas validée et verrouillée à 3.3× ;
 * - Core POWER, modèle DC et PhysicalContacts inchangés ;
 * - corps réel toujours rendu par le raster 3x stable ;
 * - aucune substitution du corps par un asset expérimental ;
 * - seules les petites inscriptions de façade sont renforcées par un SVG
 *   transparent vérifié dans le dépôt, afin de rester nettes à 3.3× ;
 * - l'overlay est purement visuel et ne reçoit aucun événement pointeur.
 */
const ASSET_DIR = '/assets/components/power'
const WEBP_3X = `${ASSET_DIR}/power.default.3x.webp`
const PNG_3X = `${ASSET_DIR}/power.default.3x.png`
const FACADE_LABELS = `${ASSET_DIR}/power.facade-labels.svg`
const APPROVED_CANVAS_SCALE = 3.3

export function PowerPart() {
  const def = getComponentDef('POWER')
  const width = def?.width ?? 70
  const height = def?.height ?? 90

  return (
    <div
      className="part-power"
      aria-label="Alimentation"
      data-canvas-scale={APPROVED_CANVAS_SCALE}
      data-visual-source="stable-raster-3x-plus-vector-labels"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANVAS_SCALE})`,
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

      <img
        className="part-power__facade-vector"
        src={FACADE_LABELS}
        width={width}
        height={height}
        draggable={false}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
        }}
      />
    </div>
  )
}
