import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/d-latch-74hc75/'

/** Frozen 74HC75 DIP-16 raster, uniformly scaled; leads/contacts come from the assembly profile. No latch logic here. */
export function DLatch74HC75Part() {
  const { width, height } = getComponentDef('D_LATCH_74HC75')
  return (
    <div className="part-d-latch-74hc75" aria-label="74HC75 Quad D Latch" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}74hc75.default.1x.webp 1x, ${ASSET_DIR}74hc75.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}74hc75.default.1x.png`}
          srcSet={`${ASSET_DIR}74hc75.default.1x.png 1x, ${ASSET_DIR}74hc75.default.3x.png 3x`}
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
