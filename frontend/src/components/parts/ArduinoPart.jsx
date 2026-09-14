// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { CircuitContext } from '../../context/CircuitContext.js'

/**
 * Arduino UNO — backend raster.
 *
 * MB-L1-ARDUINO-001 — cible Canvas révisée par le Project Lead :
 * - aucune bulle/pastille/étiquette artificielle autour des pins ;
 * - la sérigraphie réelle du PCB doit être lisible à la taille approuvée ;
 * - même géométrie de carte en ARRÊT et en MARCHE ;
 * - ARRÊT : câble USB visuellement débranché, LED ON éteinte ;
 * - MARCHE : câble USB visuellement inséré, LED ON verte ;
 * - aucun changement du Document, du Core Arduino ou des PhysicalContacts.
 *
 * Le raster historique reste la base physique. Comme il devient flou à 2.20×,
 * les inscriptions fonctionnelles sont redessinées dans un SVG vectoriel
 * pointer-events:none, exactement comme une sérigraphie de PCB : elles restent
 * nettes quel que soit le zoom sans créer de nouveau pin ni de nouvelle hitbox.
 */
const ASSET_DIR = '/assets/components/arduino'
const WEBP_SRCSET = `${ASSET_DIR}/arduino.default.1x.webp 1x, ${ASSET_DIR}/arduino.default.3x.webp 3x`
const PNG_SRCSET = `${ASSET_DIR}/arduino.default.1x.png 1x, ${ASSET_DIR}/arduino.default.3x.png 3x`
const PNG_FALLBACK = `${ASSET_DIR}/arduino.default.3x.png`
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

function ArduinoSilkscreen() {
  const common = {
    fill: '#f8fafc',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontWeight: 700,
    paintOrder: 'stroke',
    stroke: 'rgba(20,74,110,.48)',
    strokeWidth: 0.35,
    vectorEffect: 'non-scaling-stroke',
  }

  return (
    <svg
      className="part-arduino__silkscreen"
      data-vector-silkscreen="true"
      viewBox="0 0 120 140"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 4, overflow: 'visible' }}
    >
      <g style={common} textAnchor="middle">
        <text x="60" y="13" fontSize="3.15">13  12  11~  10~  9~  8     7  6~  5~  4  3~  2  1  0</text>
        <text x="75" y="20" fontSize="3.1">DIGITAL (PWM ~)</text>
        <text x="92" y="28" fontSize="3.6">UNO</text>
        <text x="72" y="33" fontSize="3.5">ARDUINO</text>
        <text x="66" y="111" fontSize="3.2">POWER</text>
        <text x="96" y="111" fontSize="3.2">ANALOG IN</text>
        <text x="101" y="132" fontSize="3.1">A0  A1  A2  A3  A4  A5</text>
      </g>

      <g style={common} fontSize="2.7" textAnchor="middle">
        <text x="27" y="13">AREF</text>
        <text x="35" y="13">GND</text>
        <text x="109" y="13">TX</text>
        <text x="116" y="13">RX</text>
        <text x="48" y="132">IOREF</text>
        <text x="55" y="132">RESET</text>
        <text x="63" y="132">3.3V</text>
        <text x="71" y="132">5V</text>
        <text x="79" y="132">GND</text>
        <text x="87" y="132">GND</text>
        <text x="94" y="132">VIN</text>
      </g>

      <g style={common} fontSize="2.8">
        <text x="45" y="38">TX</text>
        <text x="45" y="43">RX</text>
        <text x="103" y="39">ON</text>
        <text x="106" y="74">ICSP</text>
      </g>
    </svg>
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
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'visible', transform: `scale(${APPROVED_CANVAS_SCALE})`, transformOrigin: 'center center' }}
    >
      <UsbCable connected={simulationActive} />

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
          style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', position: 'relative', zIndex: 2 }}
        />
      </picture>

      <ArduinoSilkscreen />

      <span
        className="part-arduino__on-led"
        data-led-state={simulationActive ? 'on' : 'off'}
        aria-hidden="true"
        style={{
          position: 'absolute', left: 104, top: 49, width: 5, height: 4,
          borderRadius: 1, pointerEvents: 'none', zIndex: 5,
          background: simulationActive ? '#86ff2f' : 'rgba(86,94,88,.42)',
          boxShadow: simulationActive ? '0 0 4px #7cff32, 0 0 8px rgba(124,255,50,.72)' : 'none',
        }}
      />
    </div>
  )
}
