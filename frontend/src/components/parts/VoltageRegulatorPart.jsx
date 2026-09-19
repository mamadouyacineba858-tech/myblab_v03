import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/voltage-regulator/'

/** Frozen L7805CV raster, uniformly scaled; baked leads are clipped by the assembly profile. */
export function VoltageRegulatorPart() {
  const { width, height } = getComponentDef('VOLTAGE_REGULATOR')
  return (
    <div className="part-voltage-regulator" aria-label="Régulateur 5 V" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}voltage-regulator.default.1x.webp 1x, ${ASSET_DIR}voltage-regulator.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}voltage-regulator.default.1x.png`}
          srcSet={`${ASSET_DIR}voltage-regulator.default.1x.png 1x, ${ASSET_DIR}voltage-regulator.default.3x.png 3x`}
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
