// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { CircuitContext } from '../../context/CircuitContext.js'

/**
 * Arduino UNO — présentation approuvée MB-L1-ARDUINO-001.
 *
 * Correction après rejet Canvas : l'ancien raster historique n'est plus
 * utilisé comme corps visuel. Le PCB provient désormais de l'asset vectoriel
 * approuvé `arduino.approved.body.svg`, ce qui garde toutes les inscriptions
 * nettes à l'échelle Canvas 2.20×.
 *
 * Le mécanisme ARRÊT/MARCHE validé est conservé :
 * - ARRÊT : câble visuellement débranché + LED ON éteinte ;
 * - MARCHE : câble visuellement inséré + LED ON verte ;
 * - taille et géométrie du PCB identiques dans les deux modes.
 *
 * Tout est présentation-only : aucun changement Document/Core/PhysicalContact.
 */
const BODY_ASSET = '/assets/components/arduino/arduino.approved.body.svg'
const APPROVED_CANVAS_SCALE = 2.20

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
      <span style={{ position: 'absolute', left: 0, top: 2, width: 25, height: 18, borderRadius: '4px 2px 2px 4px', background: 'linear-gradient(180deg,#26282c 0%,#0f1114 55%,#24262a 100%)', boxShadow: '0 1px 2px rgba(0,0,0,.5)' }} />
      <span style={{ position: 'absolute', right: 0, top: 5, width: 14, height: 12, borderRadius: 1, background: 'linear-gradient(180deg,#d7d9db,#8b8f94 50%,#c6c8ca)', border: '1px solid rgba(45,48,52,.75)', boxSizing: 'border-box' }} />
      <span style={{ position: 'absolute', left: -18, top: 7, width: 20, height: 8, borderRadius: '5px 0 0 5px', background: '#181a1d', boxShadow: 'inset 0 1px 1px rgba(255,255,255,.08)' }} />
    </span>
  )
}

export function ArduinoPart() {
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

      <img
        className="part-arduino__img"
        src={BODY_ASSET}
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
        }}
      />

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
          zIndex: 5,
          background: simulationActive ? '#86ff2f' : 'rgba(86,94,88,.42)',
          boxShadow: simulationActive ? '0 0 4px #7cff32, 0 0 8px rgba(124,255,50,.72)' : 'none',
        }}
      />
    </div>
  )
}
