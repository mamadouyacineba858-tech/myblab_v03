import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/relay/'

/** Founder PASS/FROZEN front raster; functional footprint is supplied by assembly geometry. */
export function RelayPart() {
  const { width, height } = getComponentDef('RELAY')
  return (
    <div className="part-relay" aria-label="Relais SPDT" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}relay.default.1x.webp 1x, ${ASSET_DIR}relay.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}relay.default.1x.png`}
          srcSet={`${ASSET_DIR}relay.default.1x.png 1x, ${ASSET_DIR}relay.default.3x.png 3x`}
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
