/**
 * breadboardSimulationIntegration.test.js — MB-BREADBOARD-002, TB-11/TB-12,
 * preuve end-to-end minimale (Blueprint MB-BREADBOARD-001 §7/§10).
 *
 * Démontre, via le pipeline de production réel (toEngineInput ->
 * runSimulation, engine.js/engineAdapter.js non modifiés dans leur
 * logique), qu'un circuit LED/résistance assemblé via un breadboard produit
 * exactement le même résultat de simulation qu'un circuit topologiquement
 * équivalent câblé explicitement (AC-13).
 *
 * Topologie : POWER.5V --wire--> RESISTOR.A ; RESISTOR.B <--> LED.anode
 * (breadboard OU wire explicite, seule variable du test) ; LED.cathode
 * --wire--> POWER.GND.
 */
import { describe, it, expect } from 'vitest'
import { toEngineInput } from '../engineAdapter.js'
import { runSimulation, getLedState } from '../engine.js'

const POWER = { id: 'power1', type: 'POWER', position: { x: -300, y: -100 }, parameters: { voltage: 5 } }
// RESISTOR.B (dx:90,dy:14) et LED.anode (dx:0,dy:20) placés pour coïncider
// exactement sur le même trou de breadboard (col 5, rangée 3 - strip haut).
const RESISTOR = { id: 'r1', type: 'RESISTOR', position: { x: -30, y: 22 }, parameters: { resistance: 220 } }
const LED = { id: 'led1', type: 'LED', position: { x: 60, y: 16 } }

const powerWires = [
  { id: 'w-power', pinA: { componentId: 'power1', pinId: '5V' }, pinB: { componentId: 'r1', pinId: 'A' } },
  { id: 'w-ground', pinA: { componentId: 'power1', pinId: 'GND' }, pinB: { componentId: 'led1', pinId: 'cathode' } },
]

function simulate(coreDocument) {
  const engineInput = toEngineInput(coreDocument)
  return runSimulation(engineInput.components, engineInput.wires)
}

function toSortedEntries(pinSignals) {
  return [...pinSignals.entries()].sort(([a], [b]) => a.localeCompare(b))
}

describe('MB-BREADBOARD-002 — preuve end-to-end (LED/résistance)', () => {
  const wiredDocument = {
    breadboard: null,
    components: [POWER, RESISTOR, LED],
    wires: [
      ...powerWires,
      { id: 'w-bridge', pinA: { componentId: 'r1', pinId: 'B' }, pinB: { componentId: 'led1', pinId: 'anode' } },
    ],
  }

  const breadboardDocument = {
    breadboard: { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' },
    components: [POWER, RESISTOR, LED],
    wires: [...powerWires], // pas de wire explicite r1.B <-> led1.anode : la connexion passe par le breadboard
  }

  it('circuit câblé explicitement : la LED est allumée (référence)', () => {
    const pinSignals = simulate(wiredDocument)
    const { on } = getLedState('led1', pinSignals)
    expect(on).toBe(true)
  })

  it('circuit assemblé sur breadboard : la LED est allumée (TB-11, AC-13)', () => {
    const pinSignals = simulate(breadboardDocument)
    const { on } = getLedState('led1', pinSignals)
    expect(on).toBe(true)
  })

  it('les deux topologies produisent des pinSignals strictement identiques (TB-12)', () => {
    const wiredSignals = toSortedEntries(simulate(wiredDocument))
    const breadboardSignals = toSortedEntries(simulate(breadboardDocument))
    expect(breadboardSignals).toEqual(wiredSignals)
  })

  it('retrait : sans la connexion (ni wire, ni breadboard), la LED reste éteinte (TB-07 en simulation)', () => {
    const disconnectedDocument = {
      breadboard: null,
      components: [POWER, RESISTOR, LED],
      wires: [...powerWires], // r1.B et led1.anode ne sont reliés par rien
    }
    const pinSignals = simulate(disconnectedDocument)
    const { on } = getLedState('led1', pinSignals)
    expect(on).toBe(false)
  })
})
