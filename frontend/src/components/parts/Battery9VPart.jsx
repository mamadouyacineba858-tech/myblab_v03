import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/battery-9v'

export function Battery9VPart() {
  const { width, height, label } = getComponentDef('BATTERY_9V')
  return (
    <div aria-label={label} style={{ width: '100%', height: '100%' }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}/battery-9v.default.1x.webp 1x, ${ASSET_DIR}/battery-9v.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}/battery-9v.default.3x.png`}
          srcSet={`${ASSET_DIR}/battery-9v.default.1x.png 1x, ${ASSET_DIR}/battery-9v.default.3x.png 3x`}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
        />
      </picture>
    </div>
  )
}
