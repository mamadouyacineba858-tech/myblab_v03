import React from 'react' // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/ws2812b-v6/'

/**
 * A12-NEOPIXEL-CANVAS-VISUAL-GATE-001 — raster CSA FROZEN WORLDSEMI WS2812B-V6 (5050 SMD), 72x72.
 * VISUAL-ONLY : aucune couleur, aucun glow, aucun etat NeoPixel ; les contacts viennent du catalogue.
 */
export function Ws2812bV6Part() {
  const { width, height } = getComponentDef('WS2812B_V6')
  return (
    <div className="part-ws2812b-v6" aria-label="NeoPixel — WS2812B-V6 (WORLDSEMI)" style={{ width, height }}>
      <picture>
        <source type="image/webp" srcSet={`${ASSET_DIR}ws2812b-v6.default.1x.webp 1x, ${ASSET_DIR}ws2812b-v6.default.3x.webp 3x`} />
        <img
          src={`${ASSET_DIR}ws2812b-v6.default.1x.png`}
          srcSet={`${ASSET_DIR}ws2812b-v6.default.1x.png 1x, ${ASSET_DIR}ws2812b-v6.default.3x.png 3x`}
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
