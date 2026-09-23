import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/jk-flip-flop/'

/** Frozen 74HC73 DIP-14 raster, uniformly scaled; leads/contacts come from the assembly profile. No J-K logic here. */
export function JkFlipFlop74HC73Part() {
  const { width, height } = getComponentDef('JK_FLIP_FLOP_74HC73')
  return (
    <div className="part-jk-flip-flop" aria-label="74HC73 Dual J-K Flip-Flop" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}jk-flip-flop.default.1x.webp 1x, ${ASSET_DIR}jk-flip-flop.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}jk-flip-flop.default.1x.png`}
          srcSet={`${ASSET_DIR}jk-flip-flop.default.1x.png 1x, ${ASSET_DIR}jk-flip-flop.default.3x.png 3x`}
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
