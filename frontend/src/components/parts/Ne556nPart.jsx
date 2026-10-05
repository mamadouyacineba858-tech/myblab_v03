import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/ne556n/'

/** CSA candidate TI NE556N PDIP-14 raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function Ne556nPart() {
  const { width, height } = getComponentDef('NE556N')
  return (
    <div className="part-ne556n" aria-label="NE556 Dual Precision Timer" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}ne556n.default.1x.webp 1x, ${ASSET_DIR}ne556n.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}ne556n.default.1x.png`}
          srcSet={`${ASSET_DIR}ne556n.default.1x.png 1x, ${ASSET_DIR}ne556n.default.3x.png 3x`}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden={true}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
    </div>
  )
}
