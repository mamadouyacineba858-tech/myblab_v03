// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { CircuitContext } from '../../context/CircuitContext.js'

/**
 * Arduino UNO — backend raster.
 *
 * MB-L1-ARDUINO-001 — mécanisme Canvas verrouillé :
 * - câble ARRÊT/MARCHE inchangé ;
 * - LED ON ARRÊT/MARCHE inchangée ;
 * - repères numériques locaux, sans modifier les contacts ni leur interaction.
 *
 * Correctif après régression de l'asset haute définition :
 * - retour au renderer 3x explicitement validé comme visible au Canvas ;
 * - scale 2.45× conservé ;
 * - variantes 1x exclues du rendu visible ;
 * - micro-renforcement de contraste/saturation conservé ;
 * - aucun changement du Document, du Core Arduino ou des PhysicalContacts.
 */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_3X = `${ASSET_DIR}/arduino.default.3x.webp`
const PNG_3X = `${ASSET_DIR}/arduino.default.3x.png`
const LEGACY_ASSETS = `${ASSET_DIR}/arduino.default.1x.webp ${ASSET_DIR}/arduino.default.1x.png`
const APPROVED_CANVAS_SCALE = 2.45
// CORR-004 : éventail extérieur ordonné. Les deux extrémités suivent le
// même ordre : les leaders ne se croisent pas. Les boîtes fixes de 12×10
// sont espacées de 14 unités, indépendamment de la métrique du texte.
// Les ancrages sont lus dans les PhysicalContacts existants, jamais déplacés.
const DIGITAL_LABEL_WIDTH = 12
const DIGITAL_LABEL_HEIGHT = 10
const DIGITAL_LABEL_PITCH = 14
const DIGITAL_LABEL_TOP = -20

function DigitalPinLabels({ pins }) {
  const digitalPins = pins.filter((pin) => /^D(?:[0-9]|1[0-3])$/.test(pin.id))
    .toSorted((a, b) => a.contacts[0].dx - b.contacts[0].dx)
  return (
    <div
      className="part-arduino__digital-pin-labels"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}
    >
      {digitalPins.map((pin, index) => {
        const contact = pin.contacts[0]
        const left = index * DIGITAL_LABEL_PITCH
        const startX = left + DIGITAL_LABEL_WIDTH / 2
        const startY = DIGITAL_LABEL_TOP + DIGITAL_LABEL_HEIGHT
        const dx = contact.dx - startX
        const dy = contact.dy - startY
        return (
          <React.Fragment key={pin.id}>
            <span
              data-arduino-pin-leader={pin.id}
              data-contact-x={contact.dx}
              data-contact-y={contact.dy}
              style={{
                position: 'absolute', left: startX, top: startY,
                width: Math.hypot(dx, dy), height: 0.55,
                transform: `rotate(${Math.atan2(dy, dx)}rad)`,
                transformOrigin: '0 0', background: '#e2e8f0',
                boxShadow: '0 0 0 0.25px #0f172a',
              }}
            />
            <span
              data-arduino-pin-label={pin.id}
              style={{
                position: 'absolute', left, top: DIGITAL_LABEL_TOP,
                width: DIGITAL_LABEL_WIDTH, height: DIGITAL_LABEL_HEIGHT,
                boxSizing: 'border-box', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#ffffff', background: '#0f172a', borderRadius: 1,
                fontFamily: 'monospace', fontSize: 6, fontWeight: 700,
                lineHeight: 1, whiteSpace: 'nowrap',
              }}
            >
              {pin.id}
            </span>
          </React.Fragment>
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
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: connected ? -34 : -47,
        top: 45,
        width: 38,
        height: 22,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 2,
          width: 25,
          height: 18,
          borderRadius: '4px 2px 2px 4px',
          background: 'linear-gradient(180deg,#26282c 0%,#0f1114 55%,#24262a 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,.5)',
        }}
      />
      <span
        style={{
          position: 'absolute',
          right: 0,
          top: 5,
          width: 14,
          height: 12,
          borderRadius: 1,
          background: 'linear-gradient(180deg,#d7d9db,#8b8f94 50%,#c6c8ca)',
          border: '1px solid rgba(45,48,52,.75)',
          boxSizing: 'border-box',
        }}
      />
      <span
        style={{
          position: 'absolute',
          left: -18,
          top: 7,
          width: 20,
          height: 8,
          borderRadius: '5px 0 0 5px',
          background: '#181a1d',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,.08)',
        }}
      />
    </span>
  )
}

export function ArduinoPart() {
  const def = getComponentDef('ARDUINO')
  const width = def?.width ?? 120
  const height = def?.height ?? 140
  const circuit = useContext(CircuitContext)
  const simulationActive = circuit?.simulationActive === true

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

      <span
        className="part-arduino__on-led"
        data-led-state={simulationActive ? 'on' : 'off'}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 104,
          top: 49,
          width: 5,
          height: 4,
          borderRadius: 1,
          pointerEvents: 'none',
          zIndex: 3,
          background: simulationActive ? '#86ff2f' : 'rgba(86,94,88,.42)',
          boxShadow: simulationActive ? '0 0 4px #7cff32, 0 0 8px rgba(124,255,50,.72)' : 'none',
        }}
      />
    </div>
  )
}
