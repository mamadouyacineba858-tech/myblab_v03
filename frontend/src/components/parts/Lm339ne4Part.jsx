import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/lm339ne4/'

/** Frozen TI LM339NE4 PDIP-14 raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function Lm339ne4Part() {
  const { width, height } = getComponentDef('LM339NE4')
  return (
    <div className="part-lm339ne4" aria-label="LM339 Quad Comparator" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}lm339ne4.default.1x.webp 1x, ${ASSET_DIR}lm339ne4.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}lm339ne4.default.1x.png`}
          srcSet={`${ASSET_DIR}lm339ne4.default.1x.png 1x, ${ASSET_DIR}lm339ne4.default.3x.png 3x`}
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
