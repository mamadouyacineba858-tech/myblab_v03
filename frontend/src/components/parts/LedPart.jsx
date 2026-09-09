import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel LED — backend RASTER (MB-VIS-PROTOTYPE-003).
 *
 * Les assets off/on restent les sources visuelles de référence. Le léger
 * agrandissement ci-dessous est exclusivement PRESENTATIONNEL : il augmente
 * le volume apparent du dôme sans modifier la boîte canonique, les
 * PhysicalContacts, l'écart anode/cathode, le hit-test ou l'insertion
 * breadboard.
 */
const ASSET_DIR = '/assets/components/led'
const LED_BODY_SCALE = 1.12
const LED_COLLAR_Y = 33

const ASSET_SOURCES = {
  off: {
    webp: `${ASSET_DIR}/led.off.1x.webp 1x, ${ASSET_DIR}/led.off.3x.webp 3x`,
    png: `${ASSET_DIR}/led.off.1x.png 1x, ${ASSET_DIR}/led.off.3x.png 3x`,
    fallback: `${ASSET_DIR}/led.off.3x.png`,
  },
  on: {
    webp: `${ASSET_DIR}/led.on.1x.webp 1x, ${ASSET_DIR}/led.on.3x.webp 3x`,
    png: `${ASSET_DIR}/led.on.1x.png 1x, ${ASSET_DIR}/led.on.3x.png 3x`,
    fallback: `${ASSET_DIR}/led.on.3x.png`,
  },
}

export function LedPart({ isOn } = {}) {
  const def = getComponentDef("LED")
  const width = def?.width ?? 80
  const height = def?.height ?? 64
  const source = isOn ? ASSET_SOURCES.on : ASSET_SOURCES.off

  return (
    <div
      className={`part-led ${isOn ? 'part-led--on' : ''}`}
      aria-label={isOn ? 'LED allumée' : 'LED éteinte'}
    >
      <picture className="part-led__picture">
        <source type="image/webp" srcSet={source.webp} />
        <img
          className="part-led__img"
          src={source.fallback}
          srcSet={source.png}
          width={width}
          height={height}
          draggable={false}
          alt=""
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none',
            transform: `scale(${LED_BODY_SCALE})`,
            transformOrigin: `50% ${LED_COLLAR_Y}px`,
          }}
        />
      </picture>
    </div>
  )
}
