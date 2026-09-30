import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/ne555p/'

/** Frozen TI NE555P PDIP-8 raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function Ne555pPart() {
  const { width, height } = getComponentDef('NE555P')
  return (
    <div className="part-ne555p" aria-label="NE555 Precision Timer" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}ne555p.default.1x.webp 1x, ${ASSET_DIR}ne555p.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}ne555p.default.1x.png`}
          srcSet={`${ASSET_DIR}ne555p.default.1x.png 1x, ${ASSET_DIR}ne555p.default.3x.png 3x`}
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