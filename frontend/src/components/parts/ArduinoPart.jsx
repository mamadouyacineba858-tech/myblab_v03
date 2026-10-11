// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { CircuitContext } from '../../context/CircuitContext.js'
import './ArduinoPart.css'

/** Arduino horizontal: body and PhysicalContacts share the 180 x 120 local box. */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_3X = `${ASSET_DIR}/arduino.horizontal-candidate.3x.webp`
const PNG_3X = `${ASSET_DIR}/arduino.horizontal-candidate.3x.png`
const LEGACY_ASSETS = `${ASSET_DIR}/arduino.default.1x.webp ${ASSET_DIR}/arduino.default.1x.png`
const APPROVED_CANVAS_SCALE = 1
// The native raster owns the silkscreen. Keep legacy label metadata hidden
// so duplicate DOM typography cannot cover the Arduino logo or header.
function DigitalPinLabels({ pins }) {
  const digitalPins = pins.filter((pin) => /^D(?:[0-9]|1[0-3])$/.test(pin.id))
  return (
    <div
      className="part-arduino__digital-pin-labels"
      data-label-layout="on-board"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, display: 'none' }}
    >
      {digitalPins.map((pin) => {
        const contact = pin.contacts[0]
        return (
          <span
            key={pin.id}
            data-arduino-pin-label={pin.id}
            data-contact-x={contact.dx}
            data-contact-y={contact.dy}
            style={{
              position: 'absolute',
              left: contact.dx,
              top: contact.dy + 3.5,
              color: '#ffffff',
              fontFamily: 'Arial, sans-serif',
              fontSize: 4.2,
              fontWeight: 700,
              lineHeight: 1,
              whiteSpace: 'nowrap',
              textShadow: '0 0 0.45px #0f172a, 0 0 0.45px #0f172a',
              transform: 'translateX(-50%)',
              transformOrigin: '50% 0',
            }}
          >
            {pin.id.slice(1)}
          </span>
        )
      })}
    </div>
  )
}

function UsbCable({ connected }) {
  return (
    <span
      className={`part-arduino__usb-cable part-arduino__usb-cable--${connected ? 'connected' : 'disconnected'}`}
      data-usb-state={connected ? 'connected' : 'disconnected'}
      data-usb-type="B"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: -78,
        top: 27.5,
        width: 84,
        height: 18,
        pointerEvents: 'none',
        zIndex: 1,
        display: connected ? 'block' : 'none',
      }}
    >
      <span className="part-arduino__usb-cord" />
      <span className="part-arduino__usb-strain-relief" />
      <span className="part-arduino__usb-shell" />
      <span className="part-arduino__usb-grip"><span /></span>
    </span>
  )
}

export function ArduinoPart({ uid, pinSignals } = {}) {
  const def = getComponentDef('ARDUINO')
  const width = def?.width ?? 180
  const height = def?.height ?? 120
  const circuit = useContext(CircuitContext)
  const simulationActive = circuit?.simulationActive === true
  const builtinLedOn = simulationActive && pinSignals?.get(`${uid}:D13`) === 'HIGH'

  return (
    <div
      className="part-arduino"
      aria-label="Arduino UNO"
      data-canvas-scale={APPROVED_CANVAS_SCALE}
      data-arduino-mode={simulationActive ? 'run' : 'off'}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANVAS_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <UsbCable connected={simulationActive} />

      <picture
        className="part-arduino__picture"
        data-hires-source="3x-only"
        data-legacy-assets={LEGACY_ASSETS}
      >
        <source type="image/webp" srcSet={`${WEBP_3X} 1x, ${WEBP_3X} 3x`} />
        <img
          className="part-arduino__img"
          src={PNG_3X}
          srcSet={`${PNG_3X} 1x, ${PNG_3X} 3x`}
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
            position: 'relative',
            zIndex: 2,
            imageRendering: 'auto',
            filter: 'contrast(1.08) saturate(1.04)',
          }}
        />
      </picture>


      <DigitalPinLabels pins={def.pins} />
      {/* No UART activity contract exists: baked TX/RX lights stay unlit. */}
      {[38, 43].map((top) => (
        <span key={top} className="part-arduino__serial-led" data-led-state="off"
          aria-hidden="true" style={{ position: 'absolute', left: 79.5, top,
            width: 5, height: 3.5, pointerEvents: 'none', zIndex: 3,
            borderRadius: 1, background: '#686044' }} />
      ))}
      <span
        className="part-arduino__builtin-led"
        data-led-state={builtinLedOn ? 'on' : 'off'}
        aria-hidden="true"
        style={{ position: 'absolute', left: 79.5, top: 29, width: 5, height: 4,
          pointerEvents: 'none', zIndex: 3, borderRadius: 1,
          background: builtinLedOn ? '#ffdd33' : '#686044',
          boxShadow: builtinLedOn ? '0 0 3px #ffdd33' : 'none' }}
      />

      <span
        className="part-arduino__on-led"
        data-led-state={simulationActive ? 'on' : 'off'}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 154.5,
          top: 39,
          width: 5,
          height: 4,
          borderRadius: 1,
          pointerEvents: 'none',
          zIndex: 3,
          background: simulationActive ? '#86ff2f' : '#565e58',
          boxShadow: simulationActive ? '0 0 4px #7cff32, 0 0 8px rgba(124,255,50,.72)' : 'none',
        }}
      />
    </div>
  )
}
