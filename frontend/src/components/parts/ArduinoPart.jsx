// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Arduino UNO — backend raster.
 *
 * MB-L1-ARDUINO-001 correction Canvas : la carte doit rester lisible comme
 * une vraie UNO/Tinkercad. Aucun badge, numéro ou pastille artificielle n'est
 * superposé au PCB : les sérigraphies et les trous des headers appartiennent
 * au corps réaliste lui-même. Les vrais <Pin> HTML restent gérés génériquement
 * par CircuitComponent/PhysicalContact et restent markerless.
 */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_SRCSET = `${ASSET_DIR}/arduino.default.1x.webp 1x, ${ASSET_DIR}/arduino.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/arduino.default.1x.png 1x, ${ASSET_DIR}/arduino.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/arduino.default.3x.png`

export function ArduinoPart() {
  const def = getComponentDef('ARDUINO')
  const width = def?.width ?? 156
  const height = def?.height ?? 182

  return (
    <div
      className="part-arduino"
      aria-label="Arduino UNO"
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible' }}
    >
      <picture className="part-arduino__picture">
        <source type="image/webp" srcSet={WEBP_SRCSET} />
        <img
          className="part-arduino__img"
          src={PNG_FALLBACK}
          srcSet={PNG_SRCSET}
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
