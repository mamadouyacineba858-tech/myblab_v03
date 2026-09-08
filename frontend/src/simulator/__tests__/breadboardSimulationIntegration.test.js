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
import { makeBreadboardHoleEndpoint } from '../../utils/breadboardWireEndpoint.js'

const POWER = { id: 'power1', type: 'POWER', position: { x: -300, y: -100 }, parameters: { voltage: 5 } }
// RESISTOR.B (dx:84,dy:14) -> col5/row3 (strip haut). [FT-C-001-A] LED.anode a
// migré vers son PhysicalContact physique (dx:28,dy:62, écart 24 = 2·pitch ;
// LED_VISUAL_PINS 0/80 supprimé en FT-B-001-S4) : la LED est repositionnée en
// (32,10) pour que l'anode retombe dans le MÊME groupe de strip que RESISTOR.B
// -> anode (60,72) = col5/row6, même groupKey `bb1:strip:col5:top` (le bus de
// strip connecte les deux SANS wire explicite, comme avant la migration).
const RESISTOR = { id: 'r1', type: 'RESISTOR', position: { x: -24, y: 22 }, parameters: { resistance: 220 } }
const LED = { id: 'led1', type: 'LED', position: { x: 32, y: 10 } }

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

/**
 * MB-BREADBOARD-007 — TEST A2 (Ticket §6) : preuve électrique réelle du cas
 * "rail multi-colonnes" (audit MB-BREADBOARD-AUDIT-CONNECTIVITE §7 — ce cas
 * n'avait jusqu'ici jamais été simulé, seul le groupKey/l'arête virtuelle
 * était couvert, cf. TEST A1 dans breadboardConnectivity.test.js).
 *
 * Topologie : POWER.5V -> col6/row16 (rail bas +) ; R_TAP (RESISTOR).A ->
 * col24/row16 — MÊME rangée de rail, colonne DIFFÉRENTE, AUCUN wire entre
 * les deux (la seule liaison POWER<->R_TAP transite par le rail). R_TAP.B
 * (hors grille, col31) -> LED.anode par wire explicite ; LED.cathode ->
 * POWER.GND par wire explicite. Ne se limite pas à vérifier le groupKey
 * (déjà fait, TEST A1) : ici, la LED doit RÉELLEMENT s'allumer, et le
 * résultat doit être identique à la même topologie entièrement câblée.
 */
describe('MB-BREADBOARD-007 — TEST A2 : preuve simulation rail multi-colonnes [FT-B-001-S5 : POWER câblé au rail PAR FIL]', () => {
  // [FT-B-001-S5] POWER n'est plus enfiché sur le rail : POWER.5V --wire-->
  // trou de rail (col6/row16). R_TAP (RESISTOR).A -> col24/row16, MÊME rangée
  // rail+, colonne DIFFÉRENTE, AUCUN wire direct POWER<->R_TAP. La continuité
  // POWER<->R_TAP transite donc par le rail (wire-to-hole + occupation).
  const POWER_RAIL = { id: 'power1', type: 'POWER', position: { x: -500, y: -500 }, parameters: { voltage: 5 } }
  const R_TAP = { id: 'rtap', type: 'RESISTOR', position: { x: 288, y: 178 }, parameters: { resistance: 220 } }
  const LED_TAP = { id: 'led1', type: 'LED', position: { x: -1000, y: -1000 } }

  const railHole = makeBreadboardHoleEndpoint('bb1', 6, 16)
  const tailWires = [
    { id: 'w-tap-led', pinA: { componentId: 'rtap', pinId: 'B' }, pinB: { componentId: 'led1', pinId: 'anode' } },
    { id: 'w-ground', pinA: { componentId: 'power1', pinId: 'GND' }, pinB: { componentId: 'led1', pinId: 'cathode' } },
  ]
  const powerToRail = {
    id: 'w-power-rail',
    pinA: { componentId: 'power1', pinId: '5V' },
    pinB: { componentId: railHole.uid, pinId: railHole.pinId },
  }

  const railDocument = {
    breadboard: { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' },
    components: [POWER_RAIL, R_TAP, LED_TAP],
    wires: [...tailWires, powerToRail], // POWER.5V <-> R_TAP.A : via le rail (col6 <-> col24, bb1:rail:bottom:+)
  }

  const wiredDocument = {
    breadboard: null,
    components: [POWER_RAIL, R_TAP, LED_TAP],
    wires: [
      ...tailWires,
      { id: 'w-power', pinA: { componentId: 'power1', pinId: '5V' }, pinB: { componentId: 'rtap', pinId: 'A' } },
    ],
  }

  it('le rail multi-colonnes referme réellement le circuit : la LED est allumée', () => {
    const pinSignals = simulate(railDocument)
    const { on } = getLedState('led1', pinSignals)
    expect(on).toBe(true)
  })

  it('résultat strictement identique à la variante entièrement câblée', () => {
    const railSignals = toSortedEntries(simulate(railDocument))
    const wiredSignals = toSortedEntries(simulate(wiredDocument))
    expect(railSignals).toEqual(wiredSignals)
  })

  it('retrait : sans le rail (breadboard null, sans wire POWER<->R_TAP), la LED reste éteinte', () => {
    const disconnectedDocument = { breadboard: null, components: [POWER_RAIL, R_TAP, LED_TAP], wires: [...tailWires] }
    const pinSignals = simulate(disconnectedDocument)
    const { on } = getLedState('led1', pinSignals)
    expect(on).toBe(false)
  })
})
