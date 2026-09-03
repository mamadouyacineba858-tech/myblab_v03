import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

const ASSET_DIR = '/assets/components/rgb-led'
const STATES = ['off', 'red', 'green', 'blue', 'yellow', 'magenta', 'cyan', 'white']
const ASSET_SOURCES = Object.fromEntries(
  STATES.map((s) => [s, {
    webp: `${ASSET_DIR}/rgb-led.${s}.1x.webp 1x, ${ASSET_DIR}/rgb-led.${s}.3x.webp 3x`,
    png: `${ASSET_DIR}/rgb-led.${s}.1x.png 1x, ${ASSET_DIR}/rgb-led.${s}.3x.png 3x`,
    fallback: `${ASSET_DIR}/rgb-led.${s}.3x.png`,
  }]),
)

function stateFor(r, g, b) {
  const R = r === true
  const G = g === true
  const B = b === true
  if (R && G && B) return 'white'
  if (R && G) return 'yellow'
  if (R && B) return 'magenta'
  if (G && B) return 'cyan'
  if (R) return 'red'
  if (G) return 'green'
  if (B) return 'blue'
  return 'off'
}

export function RgbLedPart({ r, g, b } = {}) {
  const def = getComponentDef('RGB_LED')
  const width = def?.width ?? 90
  const height = def?.height ?? 56
  const state = stateFor(r, g, b)
  const source = ASSET_SOURCES[state]

  return (
    <div className="part-rgb-led" aria-label="LED RGB" data-state={state} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <picture>
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-rgb-led__img"
          src={source.fallback}
          srcSet={source.png}
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
