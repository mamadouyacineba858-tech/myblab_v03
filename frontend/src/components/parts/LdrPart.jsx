import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Photorésistance / LDR — backend RASTER (MB-VIS-PROTOTYPE-005).
 *
 * FT-C : l'asset historique reste utilisé pour la tête photosensible, mais les
 * anciennes pattes latérales raster sont masquées. Les deux pattes physiques
 * sont désormais rendues verticalement par AssemblyLeadsLayer avec l'entraxe
 * validé de la LED (24 unités), sans déplacer l'identité électrique A/B.
 */
const ASSET_DIR = '/assets/components/ldr'
const WEBP_SRCSET = `${ASSET_DIR}/ldr.default.1x.webp 1x, ${ASSET_DIR}/ldr.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/ldr.default.1x.png 1x, ${ASSET_DIR}/ldr.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/ldr.default.3x.png`

const NATIVE_ASSET_WIDTH = 84
const NATIVE_ASSET_HEIGHT = 36
const SIDE_LEAD_CROP = 24

export function LdrPart({ uid } = {}) {
  const def = getComponentDef("LDR")
  const width = def?.width ?? 84
  const height = def?.height ?? 64

  return (
    <div
      className="part-ldr"
      aria-label="Photorésistance"
      style={{ position: 'relative', width, height }}
    >
      <picture
        className="part-ldr__picture"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: NATIVE_ASSET_WIDTH,
          height: NATIVE_ASSET_HEIGHT,
          display: 'block',
        }}
      >
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-ldr__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
          width={NATIVE_ASSET_WIDTH}
          height={NATIVE_ASSET_HEIGHT}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            width: NATIVE_ASSET_WIDTH,
            height: NATIVE_ASSET_HEIGHT,
            display: 'block',
            pointerEvents: 'none',
            clipPath: `inset(0 ${SIDE_LEAD_CROP}px 0 ${SIDE_LEAD_CROP}px)`,
          }}
        />
      </picture>
    </div>
  )
}
