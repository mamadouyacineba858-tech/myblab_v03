import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/lm358p/'

/** Frozen TI LM358P PDIP-8 raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function Lm358pPart() {
  const { width, height } = getComponentDef('LM358P')
  return (
    <div className="part-lm358p" aria-label="LM358 Dual Operational Amplifier" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}lm358p.default.1x.webp 1x, ${ASSET_DIR}lm358p.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}lm358p.default.1x.png`}
          srcSet={`${ASSET_DIR}lm358p.default.1x.png 1x, ${ASSET_DIR}lm358p.default.3x.png 3x`}
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
