import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/nand-gate/'

/** Frozen Founder NAND raster, uniformly scaled; leads/contacts come from the assembly profile. */
export function NandGatePart() {
  const { width, height } = getComponentDef('NAND_GATE')
  return (
    <div className="part-nand-gate" aria-label="NAND Gate" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}nand-gate.default.1x.webp 1x, ${ASSET_DIR}nand-gate.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}nand-gate.default.1x.png`}
          srcSet={`${ASSET_DIR}nand-gate.default.1x.png 1x, ${ASSET_DIR}nand-gate.default.3x.png 3x`}
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
