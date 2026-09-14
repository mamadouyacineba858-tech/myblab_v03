// Vitest secondaire compile le JSX avec le runtime React classique.
// eslint-disable-next-line no-unused-vars
import React, { useContext } from 'react'
import { CircuitContext } from '../../context/CircuitContext.js'

/**
 * MB-L1-ARDUINO-001 — rendu Arduino strictement calé sur la référence Canvas
 * approuvée par le Project Lead le 2026-09-14.
 *
 * Il n'y a plus de reconstruction approximative du PCB, du câble ou de la LED.
 * Les deux états visuels proviennent directement des deux assets de référence :
 * - ARRÊT : câble non inséré, LED ON éteinte ;
 * - MARCHE : câble inséré, LED ON verte.
 *
 * Les assets sont uniquement de présentation. Le Document, le Core Arduino,
 * les PhysicalContacts et la simulation restent inchangés.
 */
const OFF_ASSET = '/assets/components/arduino/arduino.reference.off.webp'
const RUN_ASSET = '/assets/components/arduino/arduino.reference.run.webp'
const APPROVED_CANVAS_SCALE = 2.20
const APPROVED_REFERENCE_WIDTH = '138%'

export function ArduinoPart() {
  const circuit = useContext(CircuitContext)
  const simulationActive = circuit?.simulationActive === true
  const asset = simulationActive ? RUN_ASSET : OFF_ASSET

  return (
    <div
      className="part-arduino"
      aria-label="Arduino UNO"
      data-canvas-scale={APPROVED_CANVAS_SCALE}
      data-arduino-mode={simulationActive ? 'run' : 'off'}
      data-reference-render="exact-approved-reference"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'visible',
        transform: `scale(${APPROVED_CANVAS_SCALE})`,
        transformOrigin: 'center center',
      }}
    >
      <img
        className="part-arduino__img part-arduino__reference-img"
        src={asset}
        draggable={false}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: APPROVED_REFERENCE_WIDTH,
          height: 'auto',
          transform: 'translate(-50%, -50%)',
          display: 'block',
          pointerEvents: 'none',
          maxWidth: 'none',
        }}
      />
    </div>
  )
}
