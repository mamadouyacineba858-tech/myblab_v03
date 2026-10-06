import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/4n35/'

/** CSA frozen 4N35 DIP-6 V3 raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function FourN35Part() {
  const { width, height } = getComponentDef('4N35')
  return (
    <div className="part-4n35" aria-label="4N35 Optocoupler" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}4n35.default.1x.webp 1x, ${ASSET_DIR}4n35.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}4n35.default.1x.png`}
          srcSet={`${ASSET_DIR}4n35.default.1x.png 1x, ${ASSET_DIR}4n35.default.3x.png 3x`}
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
