// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'

/**
 * Rendu visuel Arduino UNO — backend RASTER (MB-VIS-COMP-037)
 * + MB-L1-ARDUINO-001 — Pin Visibility & Physical Connectivity.
 *
 * Le raster UNO réaliste reste la source du corps de carte. Le Core, les
 * coordonnées électriques, les PhysicalContacts et le câblage restent
 * inchangés. MB-L1-ARDUINO-001 ajoute uniquement une couche de présentation
 * non interactive qui rend les 4 pins fonctionnelles actuelles immédiatement
 * identifiables à l'œil sur le Canvas : D2, D3, GND et 5V.
 *
 * Les centres ci-dessous sont strictement les mêmes que les PhysicalContacts
 * déclarés dans componentDefinitions.js : D2=(3,50), D3=(15,75),
 * GND=(15,108), 5V=(115,50). La couche visible n'est PAS une seconde hitbox :
 * pointer-events:none et les vrais <Pin> HTML de CircuitComponent restent les
 * seules cibles de câblage. Ainsi le point visible, le hit target et l'ancre
 * du fil convergent sur la même géométrie.
 */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_SRCSET = `${ASSET_DIR}/arduino.default.1x.webp 1x, ${ASSET_DIR}/arduino.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/arduino.default.1x.png 1x, ${ASSET_DIR}/arduino.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/arduino.default.3x.png`

const VISIBLE_PINS = Object.freeze([
  Object.freeze({ id: 'D2', label: 'D2', x: 3, y: 50, side: 'right' }),
  Object.freeze({ id: 'D3', label: 'D3', x: 15, y: 75, side: 'right' }),
  Object.freeze({ id: 'GND', label: 'GND', x: 15, y: 108, side: 'right' }),
  Object.freeze({ id: '5V', label: '5V', x: 115, y: 50, side: 'left' }),
])

function VisibleArduinoPin({ pin }) {
  const labelStyle = pin.side === 'left'
    ? { right: 8, transform: 'translateY(-50%)' }
    : { left: 8, transform: 'translateY(-50%)' }

  return (
    <span
      className="part-arduino__visible-pin"
      data-arduino-pin={pin.id}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: pin.x,
        top: pin.y,
        width: 10,
        height: 10,
        marginLeft: -5,
        marginTop: -5,
        borderRadius: '50%',
        boxSizing: 'border-box',
        border: '2px solid #f8fafc',
        background: '#111827',
        boxShadow: '0 0 0 1px rgba(15,23,42,0.9), 0 0 5px rgba(255,255,255,0.85)',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    >
      <span
        className="part-arduino__visible-pin-label"
        style={{
          position: 'absolute',
          top: '50%',
          minWidth: pin.label === 'GND' ? 24 : 18,
          padding: '2px 3px',
          borderRadius: 3,
          background: 'rgba(15,23,42,0.92)',
          color: '#ffffff',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: 7,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: 0.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 1px rgba(0,0,0,0.8)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.35)',
          pointerEvents: 'none',
          ...labelStyle,
        }}
      >
        {pin.label}
      </span>
    </span>
  )
}

export function ArduinoPart() {
  const def = getComponentDef('ARDUINO')
  const width = def?.width ?? 120
  const height = def?.height ?? 140

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

      <span
        className="part-arduino__pin-visibility-layer"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}
      >
        {VISIBLE_PINS.map((pin) => <VisibleArduinoPin key={pin.id} pin={pin} />)}
      </span>
    </div>
  )
}
