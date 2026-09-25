import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/counter-74hc161/'

/** Frozen 74HC161 DIP-16 raster, uniformly scaled; leads/contacts come from the assembly profile. No counter logic here. */
export function BinaryCounter74HC161Part() {
  const { width, height } = getComponentDef('BINARY_COUNTER_74HC161')
  return (
    <div className="part-binary-counter-74hc161" aria-label="74HC161 4-bit Binary Counter" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}counter-74hc161.default.1x.webp 1x, ${ASSET_DIR}counter-74hc161.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}counter-74hc161.default.1x.png`}
          srcSet={`${ASSET_DIR}counter-74hc161.default.1x.png 1x, ${ASSET_DIR}counter-74hc161.default.3x.png 3x`}
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
