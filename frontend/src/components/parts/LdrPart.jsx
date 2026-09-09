import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * LDR — réconciliation FT-C V2.
 *
 * Le raster historique est conservé uniquement pour la tête photosensible.
 * Les anciennes pattes latérales sont masquées ; les deux pattes verticales
 * sont fournies par AssemblyLeadsLayer. Aucun changement de simulation.
 */
const ASSET_DIR = '/assets/components/ldr'
const WEBP_SRCSET = `${ASSET_DIR}/ldr.default.1x.webp 1x, ${ASSET_DIR}/ldr.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/ldr.default.1x.png 1x, ${ASSET_DIR}/ldr.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/ldr.default.3x.png`
const NATIVE_ASSET_WIDTH = 84
const NATIVE_ASSET_HEIGHT = 36
const SIDE_LEAD_CROP = 24

export function LdrPart() {
  const def = getComponentDef('LDR')
  const width = def?.width ?? 84
  const height = def?.height ?? 36

  return (
    <div className="part-ldr" aria-label="Photorésistance" style={{ position: 'relative', width, height, overflow: 'visible' }}>
      <picture style={{ position: 'absolute', left: 0, top: 0, width: NATIVE_ASSET_WIDTH, height: NATIVE_ASSET_HEIGHT, display: 'block' }}>
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
