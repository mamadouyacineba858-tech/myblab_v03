/**
 * breadboardMeasurementIntegration.test.js — MB-BREADBOARD-002, TB-13 (AC-14).
 *
 * Preuve que les nets issus d'un breadboard sont observables par le contrat
 * MB-OBS-001/MB-MEASURE-001 existant, SANS modifier observationContract.js
 * ni measurementContract.js (interdiction explicite du ticket, §3/§9) : la
 * seule condition est que l'appelant dérive ses `components`/`wires` via
 * `engineAdapter.js::toEngineInput()` — la même frontière Core → bridge
 * unique déjà utilisée par la simulation réelle (voir
 * breadboardSimulationIntegration.test.js) — plutôt que par un autre moyen.
 *
 * Circuit : deux RESISTOR en série entre POWER.5V et POWER.GND, la jonction
 * R1.B/R2.A passant UNIQUEMENT par le breadboard dans `breadboardDocument`
 * (aucun wire explicite entre elles). La preuve ne repose pas sur une
 * valeur de tension particulière recalculée ici (le modèle DC de ce
 * simulateur n'est pas un solveur de pont diviseur général — vérifié par
 * comparaison directe avec la variante entièrement câblée, identique
 * pin-à-pin) : elle repose sur l'ÉGALITÉ stricte, pin par pin, entre le
 * résultat obtenu via breadboard et le résultat obtenu via câblage
 * explicite pour la même topologie — exactement ce que AC-14/TB-13
 * exigent.
 */
import { describe, it, expect } from 'vitest'
import { toEngineInput } from '../../simulator/engineAdapter.js'
import { measure, MeasurementMode } from '../measurementContract.js'

const POWER = { id: 'power1', type: 'POWER', position: { x: -300, y: -100 }, parameters: { voltage: 5 } }
// RESISTOR.B (dx:90,dy:14) et RESISTOR.A (dx:0,dy:14) placés pour coïncider
// exactement sur le même trou de breadboard (col 5, rangée 3 - strip haut).
const R1 = { id: 'r1', type: 'RESISTOR', position: { x: -30, y: 22 }, parameters: { resistance: 220 } }
const R2 = { id: 'r2', type: 'RESISTOR', position: { x: 60, y: 22 }, parameters: { resistance: 220 } }

const powerWires = [
  { id: 'w-power', pinA: { componentId: 'power1', pinId: '5V' }, pinB: { componentId: 'r1', pinId: 'A' } },
  { id: 'w-ground', pinA: { componentId: 'power1', pinId: 'GND' }, pinB: { componentId: 'r2', pinId: 'B' } },
]

const breadboardDocument = {
  breadboard: { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' },
  components: [POWER, R1, R2],
  wires: [...powerWires], // r1.B <-> r2.A : uniquement via le breadboard
}

const wiredDocument = {
  breadboard: null,
  components: [POWER, R1, R2],
  wires: [
    ...powerWires,
    { id: 'w-bridge', pinA: { componentId: 'r1', pinId: 'B' }, pinB: { componentId: 'r2', pinId: 'A' } },
  ],
}

const PINS = [
  ['r1', 'A'],
  ['r1', 'B'],
  ['r2', 'A'],
  ['r2', 'B'],
]

function measureVoltage(coreDocument, componentUid, pinId) {
  const { components, wires } = toEngineInput(coreDocument)
  return measure(
    { instrument: 'multimeter-1', mode: MeasurementMode.VOLTAGE, target: { kind: 'PIN', componentUid, pinId }, time: 0 },
    components,
    wires
  )
}

describe('MB-BREADBOARD-002 — Observation/Measurement voit les nets breadboard (TB-13, AC-14)', () => {
  it.each(PINS)(
    "mesure identique sur %s.%s, que la jonction R1.B/R2.A passe par le breadboard ou par un wire explicite",
    (componentUid, pinId) => {
      const breadboardResult = measureVoltage(breadboardDocument, componentUid, pinId)
      const wiredResult = measureVoltage(wiredDocument, componentUid, pinId)
      expect(breadboardResult).toEqual(wiredResult)
    }
  )

  it("mesure VALID sur R2.A, relié UNIQUEMENT via le breadboard (aucun wire explicite vers ce pin)", () => {
    const result = measureVoltage(breadboardDocument, 'r2', 'A')
    expect(result.status).toBe('VALID')
    expect(typeof result.value).toBe('number')
  })

  it("sans breadboard NI wire explicite reliant R1 à R2, la mesure sur R2.A redevient UNAVAILABLE (régression / isolation)", () => {
    const disconnectedDocument = { breadboard: null, components: [POWER, R1, R2], wires: [...powerWires] }
    const connected = measureVoltage(breadboardDocument, 'r2', 'A')
    const disconnected = measureVoltage(disconnectedDocument, 'r2', 'A')
    expect(disconnected.status).not.toBe(connected.status)
    expect(disconnected.status).toBe('UNAVAILABLE')
  })
})
