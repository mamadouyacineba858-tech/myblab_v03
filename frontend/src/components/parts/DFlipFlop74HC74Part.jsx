import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/d-flip-flop-74hc74/'

/** Frozen 74HC74 DIP-14 raster, uniformly scaled; leads/contacts come from the assembly profile. No D flip-flop logic here. */
export function DFlipFlop74HC74Part() {
  const { width, height } = getComponentDef('D_FLIP_FLOP_74HC74')
  return (
    <div className="part-d-flip-flop-74hc74" aria-label="74HC74 Dual D Flip-Flop" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}74hc74.default.1x.webp 1x, ${ASSET_DIR}74hc74.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}74hc74.default.1x.png`}
          srcSet={`${ASSET_DIR}74hc74.default.1x.png 1x, ${ASSET_DIR}74hc74.default.3x.png 3x`}
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
