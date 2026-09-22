import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/or-gate/'

/** Frozen Founder OR raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function OrGatePart() {
  const { width, height } = getComponentDef('OR_GATE')
  return (
    <div className="part-or-gate" aria-label="OR Gate" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}or-gate.default.1x.webp 1x, ${ASSET_DIR}or-gate.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}or-gate.default.1x.png`}
          srcSet={`${ASSET_DIR}or-gate.default.1x.png 1x, ${ASSET_DIR}or-gate.default.3x.png 3x`}
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
