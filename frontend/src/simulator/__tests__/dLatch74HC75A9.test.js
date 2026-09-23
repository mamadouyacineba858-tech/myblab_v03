import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  runSimulationWithRuntime,
  computeTimedDigitalSignals,
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  circuitRequiresContinuousStepping,
  SIMULATION_STEP_MS,
} from '../simulationRuntimeIntegration.js'
import {
  getAllTimedDigitalContributionTypes,
  getTimedDigitalContribution,
  hasTimedDigitalContribution,
  createTimedDigitalContributionRegistry,
} from '../timedDigitalContributionRegistry.js'
import { hasDigitalContribution } from '../digitalContributionRegistry.js'
import { hasDcContribution } from '../dcContributionRegistry.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulationRegistry.js'
import { DLatch74HC75Model } from '../models/DLatch74HC75Model.js'
import { toEngineInput } from '../engineAdapter.js'
import { Signal } from '../signals.js'

/**
 * A9-LATCH1 — 74HC75 quad D latch (level-sensitive) : contrat séquentiel (LAT-xx).
 *
 * Toute la logique passe par le Registry timed de production
 * (timedDigitalContributionRegistry.js) et le pipeline A9-SEQ-PREQ/PREQ2
 * réel (`runSimulationWithRuntime` + `createSimulationRuntimeSession`) ;
 * aucune fixture ne remplace le producteur 74HC75. FLOATING (non productible
 * par câblage) passe par `computeTimedDigitalSignals` avec la contribution
 * de production.
 */

const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const TYPE = 'D_LATCH_74HC75'
const isLogic = s => s === HIGH || s === LOW
const not = s => (s === HIGH ? LOW : HIGH)
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const components = [{ uid: 'p', type: 'POWER' }, { uid: 'l', type: TYPE }]
const OUTPUT_PINS = ['1Q', '1NQ', '2Q', '2NQ', '3Q', '3NQ', '4Q', '4NQ']

/**
 * Câblage : chaque pin décisive est reliée au rail POWER correspondant ; une
 * pin UNKNOWN reste non connectée. Par défaut : alimenté, LE12/LE34 LOW
 * (mémoire), D LOW sur les quatre canaux.
 */
const BASE = { VCC: HIGH, GND: LOW, LE12: LOW, LE34: LOW, '1D': LOW, '2D': LOW, '3D': LOW, '4D': LOW }
function wiresFor(levels) {
  return Object.entries({ ...BASE, ...levels })
    .filter(([, level]) => isLogic(level))
    .map(([pin, level]) => wire('p', level === HIGH ? '5V' : 'GND', 'l', pin))
}

function bench() {
  const runtimeSession = createSimulationRuntimeSession()
  const step = (levels = {}, dt = SIMULATION_STEP_MS) => {
    const signals = runSimulationWithRuntime(components, wiresFor(levels), { runtimeSession, dt })
    return Object.fromEntries(OUTPUT_PINS.map(pin => [pin, signals.get(`l:${pin}`)]))
  }
  const memory = () => runtimeSession.timedDigitalStates.get('l')
  return { runtimeSession, step, memory }
}

/** [Q, NQ] d'un canal. */
const pair = (r, ch) => [r[`${ch}Q`], r[`${ch}NQ`]]
/** Q déterministe attendu avec NQ = complément. */
const latched = level => [level, not(level)]

/** Appel de la contribution de production via la composition timed, pour FLOATING. */
function direct() {
  const states = new Map()
  const registry = createTimedDigitalContributionRegistry({ contributions: new Map([[TYPE, getTimedDigitalContribution(TYPE)]]) })
  const call = levels => {
    const signals = new Map(Object.entries({ ...BASE, ...levels }).map(([pin, s]) => [`l:${pin}`, s]))
    return computeTimedDigitalSignals([{ uid: 'l', type: TYPE }], registry, signals, 0, states)
  }
  return { states, call }
}

describe('A9-LATCH1 — T1 registration', () => {
  it('the production timed registry contains D_LATCH_74HC75 (one declarative entry, no combinational/DC path)', () => {
    expect(hasTimedDigitalContribution(TYPE)).toBe(true)
    expect(getTimedDigitalContribution(TYPE)).toBeTypeOf('function')
    expect(getAllTimedDigitalContributionTypes().filter(t => t === TYPE)).toHaveLength(1)
    expect(hasDigitalContribution(TYPE)).toBe(false)
    expect(hasDcContribution(TYPE)).toBe(false)
    expect(circuitRequiresContinuousStepping(components)).toBe(true)
  })

  it('canonical entry: 16 electrical pins in physical order with locked roles, digital, no parameters, model available', () => {
    expect(getAllCanonicalTypes().filter(t => t === TYPE)).toHaveLength(1)
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['digital'], defaultParameters: {}, parameterSchema: [] })
    expect(entry.pins.map(p => [p.id, p.role])).toEqual([
      ['1NQ', 'output'], ['1D', 'input'], ['2D', 'input'], ['LE34', 'input'], ['VCC', 'power'], ['3D', 'input'], ['4D', 'input'], ['4NQ', 'output'],
      ['4Q', 'output'], ['3Q', 'output'], ['3NQ', 'output'], ['GND', 'ground'], ['LE12', 'input'], ['2NQ', 'output'], ['2Q', 'output'], ['1Q', 'output'],
    ])
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationDefaultParameters(TYPE)).toEqual({})
    expect(DLatch74HC75Model).toMatchObject({ type: TYPE })
    expect(DLatch74HC75Model.validate({})).toBe(true)
    expect(DLatch74HC75Model.validate(null)).toBe(false)
    expect(DLatch74HC75Model.validate([])).toBe(false)
  })
})

describe('A9-LATCH1 — initial state and power (T4 / T16)', () => {
  it('powered with both latches closed from the start: all outputs undetermined (never an invented LOW)', () => {
    const b = bench()
    const r = b.step()
    for (const pin of OUTPUT_PINS) expect(r[pin], pin).toBe(UNKNOWN)
    expect(b.memory()).toEqual({ channel1: { q: UNKNOWN }, channel2: { q: UNKNOWN }, channel3: { q: UNKNOWN }, channel4: { q: UNKNOWN } })
  })

  it.each([
    ['no supply at all', { VCC: UNKNOWN, GND: UNKNOWN }],
    ['VCC missing', { VCC: UNKNOWN }],
    ['GND missing', { GND: UNKNOWN }],
    ['VCC LOW', { VCC: LOW }],
    ['GND HIGH', { GND: HIGH }],
    ['VCC/GND reversed', { VCC: LOW, GND: HIGH }],
  ])('T4: without a valid supply (%s) no output is driven even with both latches transparent', (_label, supply) => {
    const contribute = getTimedDigitalContribution(TYPE)
    const pinSignals = { ...BASE, ...supply, LE12: HIGH, LE34: HIGH, '1D': HIGH, '3D': HIGH }
    const previousState = { channel1: { q: HIGH }, channel2: { q: LOW }, channel3: { q: HIGH }, channel4: { q: LOW } }
    const { outputs, state } = contribute({ component: { uid: 'l', type: TYPE }, pins: [], params: {}, pinSignals, currentTimeMs: 0, previousState })
    expect(outputs).toBeNull()
    expect(state).toEqual({ channel1: { q: UNKNOWN }, channel2: { q: UNKNOWN }, channel3: { q: UNKNOWN }, channel4: { q: UNKNOWN } })
    const r = bench().step({ ...supply, LE12: HIGH, LE34: HIGH, '1D': HIGH, '3D': HIGH })
    for (const pin of OUTPUT_PINS) expect(r[pin], pin).toBe(UNKNOWN)
  })

  it('T16: power loss clears the runtime memory; repower with latches closed restores nothing (A9-JK1/DFF1 precedent)', () => {
    const b = bench()
    b.step({ LE12: HIGH, LE34: HIGH, '1D': HIGH, '3D': HIGH })
    const held = b.step({ '1D': HIGH, '3D': HIGH })
    expect(pair(held, 1)).toEqual(latched(HIGH))
    expect(pair(held, 3)).toEqual(latched(HIGH))
    const off = b.step({ VCC: UNKNOWN })
    for (const pin of OUTPUT_PINS) expect(off[pin], pin).toBe(UNKNOWN)
    expect(b.memory()).toEqual({ channel1: { q: UNKNOWN }, channel2: { q: UNKNOWN }, channel3: { q: UNKNOWN }, channel4: { q: UNKNOWN } })
    const on = b.step({ '1D': HIGH, '3D': HIGH })
    for (const pin of OUTPUT_PINS) expect(on[pin], pin).toBe(UNKNOWN)
    // Opening the latch after repower restores a deterministic state immediately.
    expect(pair(b.step({ LE12: HIGH, '1D': LOW }), 1)).toEqual(latched(LOW))
  })
})

describe('A9-LATCH1 — transparent mode (T5 / T6 / T8 / T9 / T14)', () => {
  it.each([
    [1, 'LE12'], [2, 'LE12'], [3, 'LE34'], [4, 'LE34'],
  ])('channel %i: %s HIGH -> Q follows D, NQ = NOT D, on every step of a D sequence', (ch, le) => {
    const b = bench()
    for (const d of [HIGH, LOW, LOW, HIGH, LOW, HIGH, HIGH]) {
      const r = b.step({ [le]: HIGH, [`${ch}D`]: d })
      expect(pair(r, ch)).toEqual(latched(d))
      expect(b.memory()[`channel${ch}`]).toEqual({ q: d })
    }
  })

  it('T14 no edge semantics: with LE held HIGH, a D change moves Q in the same step without any LE transition', () => {
    const b = bench()
    // LE12 is HIGH from the very first step: there is never a LE edge in this sequence.
    expect(b.step({ LE12: HIGH, '1D': LOW, '2D': HIGH })['1Q']).toBe(LOW)
    const r = b.step({ LE12: HIGH, '1D': HIGH, '2D': LOW })
    expect(pair(r, 1)).toEqual(latched(HIGH))
    expect(pair(r, 2)).toEqual(latched(LOW))
    const back = b.step({ LE12: HIGH, '1D': LOW, '2D': HIGH })
    expect(pair(back, 1)).toEqual(latched(LOW))
    expect(pair(back, 2)).toEqual(latched(HIGH))
  })

  it('T14 no edge semantics: a LE LOW->HIGH transition is not required, and a HIGH->LOW transition does not capture a later D', () => {
    const b = bench()
    b.step({ LE34: HIGH, '3D': HIGH })
    // Falling LE34 with D unchanged: memory = last D.
    expect(pair(b.step({ '3D': HIGH }), 3)).toEqual(latched(HIGH))
    // D changes after the latch is closed: no capture.
    expect(pair(b.step({ '3D': LOW }), 3)).toEqual(latched(HIGH))
  })

  it('semantic contrast with A9-DFF1 (74HC74): the same "control held HIGH, D changes" sequence moves the latch but not the flip-flop', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'l', type: TYPE }, { uid: 'ff', type: 'D_FLIP_FLOP_74HC74' }]
    const w = (control, d) => [
      ...wiresFor({ LE12: control, '1D': d }),
      ...Object.entries({ VCC: HIGH, GND: LOW, '1PRE': HIGH, '1CLR': HIGH, '1CLK': control, '1D': d })
        .map(([pin, level]) => wire('p', level === HIGH ? '5V' : 'GND', 'ff', pin)),
    ]
    const step = (control, d) => {
      const s = runSimulationWithRuntime(comps, w(control, d), { runtimeSession, dt: SIMULATION_STEP_MS })
      return { latch: s.get('l:1Q'), flipFlop: s.get('ff:1Q') }
    }
    step(LOW, LOW)
    expect(step(HIGH, LOW)).toEqual({ latch: LOW, flipFlop: LOW }) // rising edge: both take D=LOW
    expect(step(HIGH, HIGH)).toEqual({ latch: HIGH, flipFlop: LOW }) // no edge: only the latch follows D
    expect(step(HIGH, LOW)).toEqual({ latch: LOW, flipFlop: LOW })
    expect(step(HIGH, HIGH)).toEqual({ latch: HIGH, flipFlop: LOW })
    expect(step(LOW, HIGH)).toEqual({ latch: HIGH, flipFlop: LOW }) // closing: latch holds, flip-flop never captured
  })
})

describe('A9-LATCH1 — hold mode and memory (T7 / T10 / T15)', () => {
  it('T7: LE12 LOW -> Q1/Q2 keep their memory whatever D1/D2 do', () => {
    const b = bench()
    b.step({ LE12: HIGH, '1D': HIGH, '2D': LOW })
    for (const [d1, d2] of [[HIGH, LOW], [LOW, HIGH], [LOW, LOW], [HIGH, HIGH], [LOW, HIGH]]) {
      const r = b.step({ '1D': d1, '2D': d2 })
      expect(pair(r, 1)).toEqual(latched(HIGH))
      expect(pair(r, 2)).toEqual(latched(LOW))
    }
    expect(b.memory().channel1).toEqual({ q: HIGH })
    expect(b.memory().channel2).toEqual({ q: LOW })
  })

  it('T10: LE34 LOW -> Q3/Q4 keep their memory whatever D3/D4 do', () => {
    const b = bench()
    b.step({ LE34: HIGH, '3D': LOW, '4D': HIGH })
    for (const [d3, d4] of [[LOW, HIGH], [HIGH, LOW], [HIGH, HIGH], [LOW, LOW], [HIGH, LOW]]) {
      const r = b.step({ '3D': d3, '4D': d4 })
      expect(pair(r, 3)).toEqual(latched(LOW))
      expect(pair(r, 4)).toEqual(latched(HIGH))
    }
  })

  it('T15: the memory is the LAST deterministic D seen while transparent (not the first), for both levels', () => {
    for (const last of [HIGH, LOW]) {
      const b = bench()
      b.step({ LE12: HIGH, '1D': not(last) })
      b.step({ LE12: HIGH, '1D': not(last) })
      b.step({ LE12: HIGH, '1D': last })
      for (let i = 0; i < 4; i++) expect(pair(b.step({ '1D': not(last) }), 1)).toEqual(latched(last))
      expect(b.memory().channel1).toEqual({ q: last })
    }
  })

  it('re-opening the latch after a hold resumes transparency on the current D', () => {
    const b = bench()
    b.step({ LE12: HIGH, '2D': HIGH })
    expect(pair(b.step({ '2D': LOW }), 2)).toEqual(latched(HIGH))
    expect(pair(b.step({ LE12: HIGH, '2D': LOW }), 2)).toEqual(latched(LOW))
  })
})

describe('A9-LATCH1 — LE12 / LE34 independence (T11)', () => {
  it('opening LE12 while LE34 is closed never touches channels 3/4', () => {
    const b = bench()
    b.step({ LE34: HIGH, '3D': HIGH, '4D': LOW })
    b.step()
    for (const d of [HIGH, LOW, HIGH]) {
      const r = b.step({ LE12: HIGH, '1D': d, '2D': d, '3D': not(HIGH), '4D': not(LOW) })
      expect(pair(r, 1)).toEqual(latched(d))
      expect(pair(r, 2)).toEqual(latched(d))
      expect(pair(r, 3)).toEqual(latched(HIGH))
      expect(pair(r, 4)).toEqual(latched(LOW))
    }
  })

  it('opening LE34 while LE12 is closed never touches channels 1/2', () => {
    const b = bench()
    b.step({ LE12: HIGH, '1D': LOW, '2D': HIGH })
    b.step()
    for (const d of [HIGH, LOW, HIGH]) {
      const r = b.step({ LE34: HIGH, '3D': d, '4D': not(d), '1D': HIGH, '2D': LOW })
      expect(pair(r, 3)).toEqual(latched(d))
      expect(pair(r, 4)).toEqual(latched(not(d)))
      expect(pair(r, 1)).toEqual(latched(LOW))
      expect(pair(r, 2)).toEqual(latched(HIGH))
    }
  })

  it('never-opened group stays UNKNOWN while the other group is used', () => {
    const b = bench()
    const r = b.step({ LE12: HIGH, '1D': HIGH, '2D': LOW, '3D': HIGH, '4D': HIGH })
    expect(pair(r, 1)).toEqual(latched(HIGH))
    for (const pin of ['3Q', '3NQ', '4Q', '4NQ']) expect(r[pin], pin).toBe(UNKNOWN)
  })

  it('the four channels are distinct: each Q follows its own D (no D/Q channel swap)', () => {
    const b = bench()
    const r = b.step({ LE12: HIGH, LE34: HIGH, '1D': HIGH, '2D': LOW, '3D': LOW, '4D': HIGH })
    expect([pair(r, 1), pair(r, 2), pair(r, 3), pair(r, 4)]).toEqual([latched(HIGH), latched(LOW), latched(LOW), latched(HIGH)])
    const r2 = b.step({ LE12: HIGH, LE34: HIGH, '1D': LOW, '2D': HIGH, '3D': HIGH, '4D': LOW })
    expect([pair(r2, 1), pair(r2, 2), pair(r2, 3), pair(r2, 4)]).toEqual([latched(LOW), latched(HIGH), latched(HIGH), latched(LOW)])
  })

  it('both groups operate in the same simulation step (one transparent, one holding, then swapped)', () => {
    const b = bench()
    b.step({ LE12: HIGH, LE34: HIGH, '1D': HIGH, '2D': HIGH, '3D': HIGH, '4D': HIGH })
    const r = b.step({ LE12: HIGH, '1D': LOW, '2D': LOW, '3D': LOW, '4D': LOW })
    expect([r['1Q'], r['2Q'], r['3Q'], r['4Q']]).toEqual([LOW, LOW, HIGH, HIGH])
    const r2 = b.step({ LE34: HIGH, '1D': HIGH, '2D': HIGH, '3D': LOW, '4D': LOW })
    expect([r2['1Q'], r2['2Q'], r2['3Q'], r2['4Q']]).toEqual([LOW, LOW, LOW, LOW])
  })
})

describe('A9-LATCH1 — complementary outputs (T12)', () => {
  it('every deterministic Q has NQ = NOT Q, across a mixed transparent/hold sequence on all channels', () => {
    const b = bench()
    const sequence = [
      { LE12: HIGH, LE34: HIGH, '1D': HIGH, '2D': LOW, '3D': HIGH, '4D': LOW },
      { LE12: HIGH, '1D': LOW, '2D': HIGH, '3D': LOW, '4D': HIGH },
      { LE34: HIGH, '3D': LOW, '4D': HIGH },
      {},
      { LE12: HIGH, LE34: HIGH, '1D': HIGH, '2D': HIGH, '3D': HIGH, '4D': HIGH },
    ]
    for (const levels of sequence) {
      const r = b.step(levels)
      for (const ch of [1, 2, 3, 4]) {
        const [q, nq] = pair(r, ch)
        expect(isLogic(q)).toBe(true)
        expect(nq).toBe(not(q))
      }
    }
  })
})

describe('A9-LATCH1 — UNKNOWN / FLOATING are never coerced (T13)', () => {
  it('D UNKNOWN (unconnected) while transparent -> Q/NQ UNKNOWN and memory UNKNOWN (no invented complement)', () => {
    const b = bench()
    b.step({ LE12: HIGH, '1D': HIGH })
    const r = b.step({ LE12: HIGH, '1D': UNKNOWN })
    expect(pair(r, 1)).toEqual([UNKNOWN, UNKNOWN])
    expect(b.memory().channel1).toEqual({ q: UNKNOWN })
    // Closing afterwards keeps the UNKNOWN (never restores the stale HIGH).
    expect(pair(b.step({ '1D': HIGH }), 1)).toEqual([UNKNOWN, UNKNOWN])
  })

  it('D FLOATING while transparent -> Q/NQ not driven', () => {
    const d = direct()
    d.call({ LE34: HIGH, '4D': LOW })
    const out = d.call({ LE34: HIGH, '4D': FLOATING })
    expect(out.has('l:4Q')).toBe(false)
    expect(out.has('l:4NQ')).toBe(false)
    expect(d.states.get('l').channel4).toEqual({ q: UNKNOWN })
  })

  it('D undetermined while holding is irrelevant (memory stays deterministic)', () => {
    const b = bench()
    b.step({ LE12: HIGH, '2D': HIGH })
    expect(pair(b.step({ '2D': UNKNOWN }), 2)).toEqual(latched(HIGH))
  })

  it.each([[UNKNOWN], [FLOATING]])('LE %s: output driven only when hold and transparent interpretations agree', level => {
    const d = direct()
    d.call({ LE12: HIGH, '1D': HIGH, '2D': LOW })
    // Memory 1 = HIGH, D1 = HIGH : hold or follow both give HIGH.
    let out = d.call({ LE12: level, '1D': HIGH, '2D': HIGH })
    expect([out.get('l:1Q'), out.get('l:1NQ')]).toEqual([HIGH, LOW])
    // Memory 2 = LOW, D2 = HIGH : hold gives LOW, follow gives HIGH -> undetermined.
    expect(out.has('l:2Q')).toBe(false)
    expect(out.has('l:2NQ')).toBe(false)
    expect(d.states.get('l').channel2).toEqual({ q: UNKNOWN })
    expect(d.states.get('l').channel1).toEqual({ q: HIGH })
    // LE undetermined and D undetermined : never determined.
    out = d.call({ LE12: level, '1D': level })
    expect(out.has('l:1Q')).toBe(false)
    // LE34 is a different group: its channels are unaffected by LE12 being undetermined.
    expect(out.has('l:3Q')).toBe(false)
    expect(d.states.get('l').channel3).toEqual({ q: UNKNOWN })
  })

  it('LE UNKNOWN (unconnected) through the real pipeline with D differing from memory -> UNKNOWN', () => {
    const b = bench()
    b.step({ LE34: HIGH, '3D': LOW, '4D': HIGH })
    const r = b.step({ LE34: UNKNOWN, '3D': LOW, '4D': LOW })
    expect(pair(r, 3)).toEqual(latched(LOW))
    expect(pair(r, 4)).toEqual([UNKNOWN, UNKNOWN])
  })
})

describe('A9-LATCH1 — runtime state lifecycle (T16, A9-SEQ-PREQ2)', () => {
  it('memory persists across real runSimulationWithRuntime steps, only in the runtime session; dt=0 keeps it', () => {
    const b = bench()
    b.step({ LE12: HIGH, '1D': HIGH })
    for (let i = 0; i < 5; i++) expect(b.step({ '1D': LOW })['1Q']).toBe(HIGH)
    expect(b.memory().channel1).toEqual({ q: HIGH })
    expect(b.runtimeSession.scheduler.getCurrentTime()).toBe(SIMULATION_STEP_MS * 6)
    expect(b.step({ '1D': LOW }, 0)['1Q']).toBe(HIGH)
  })

  it('no Document persistence — the Document is never mutated; purge/reset clears the latch memory', () => {
    const doc = levels => ({
      components: [{ id: 'p', type: 'POWER', position: { x: 0, y: 0 } }, { id: 'l', type: TYPE, position: { x: 200, y: 0 } }],
      wires: Object.entries({ VCC: true, GND: false, LE12: false, '1D': true, ...levels })
        .map(([pin, high], i) => ({ id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'l', pinId: pin } })),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      const signals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      for (const c of d.components) expect(c).not.toHaveProperty('state')
      return [signals.get('l:1Q'), signals.get('l:1NQ')]
    }
    expect(step({})).toEqual([UNKNOWN, UNKNOWN])
    expect(step({ LE12: true })).toEqual([HIGH, LOW])
    expect(step({ '1D': false })).toEqual([HIGH, LOW])

    retainSimulationRuntimeSessionUids(runtimeSession, new Set(['p']))
    expect(runtimeSession.timedDigitalStates.has('l')).toBe(false)
    expect(step({ '1D': false })).toEqual([UNKNOWN, UNKNOWN])
    resetSimulationRuntimeSession(runtimeSession)
    expect(runtimeSession.timedDigitalStates.size).toBe(0)
    expect(runtimeSession.scheduler).toBeNull()
  })

  it('deterministic: two independent sessions fed the same sequence give identical outputs and states', () => {
    const sequence = [{ LE12: HIGH, '1D': HIGH }, { LE34: HIGH, '3D': HIGH, '4D': LOW }, { '1D': LOW }, { LE12: HIGH, '2D': HIGH }, {}]
    const run = () => {
      const b = bench()
      const out = sequence.map(levels => b.step(levels))
      return { out, state: b.memory() }
    }
    const first = run()
    expect(run()).toEqual(first)
    expect(first.state).toEqual({ channel1: { q: LOW }, channel2: { q: HIGH }, channel3: { q: HIGH }, channel4: { q: LOW } })
  })

  it('two 74HC75 instances keep separate runtime states', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'a', type: TYPE }, { uid: 'b', type: TYPE }]
    const supply = uid => [wire('p', '5V', uid, 'VCC'), wire('p', 'GND', uid, 'GND'), wire('p', '5V', uid, '1D')]
    const s = runSimulationWithRuntime(comps, [...supply('a'), ...supply('b'), wire('p', '5V', 'a', 'LE12'), wire('p', 'GND', 'b', 'LE12')],
      { runtimeSession, dt: SIMULATION_STEP_MS })
    expect(s.get('a:1Q')).toBe(HIGH)
    expect(s.get('b:1Q')).toBe(UNKNOWN)
    expect(runtimeSession.timedDigitalStates.get('a')).not.toBe(runtimeSession.timedDigitalStates.get('b'))
  })
})

describe('A9-LATCH1 — T22 mutation resistance (direct contract table)', () => {
  // Chaque ligne fixe une mémoire, applique un seul step et vérifie les 8 sorties :
  // inverser LE HIGH/LOW, permuter LE12/LE34, D/Q, Q/NQ ou hold/transparent casse au moins une ligne.
  const MEM = { channel1: { q: HIGH }, channel2: { q: LOW }, channel3: { q: LOW }, channel4: { q: HIGH } }
  const D = { '1D': LOW, '2D': HIGH, '3D': HIGH, '4D': LOW } // every D differs from its memory
  const out = (q1, q2, q3, q4) => Object.fromEntries([[1, q1], [2, q2], [3, q3], [4, q4]].flatMap(([ch, q]) => [[`${ch}Q`, q], [`${ch}NQ`, not(q)]]))
  it.each([
    ['both closed: all hold', { LE12: LOW, LE34: LOW }, out(HIGH, LOW, LOW, HIGH)],
    ['LE12 open only: 1/2 follow D, 3/4 hold', { LE12: HIGH, LE34: LOW }, out(LOW, HIGH, LOW, HIGH)],
    ['LE34 open only: 3/4 follow D, 1/2 hold', { LE12: LOW, LE34: HIGH }, out(HIGH, LOW, HIGH, LOW)],
    ['both open: all follow D', { LE12: HIGH, LE34: HIGH }, out(LOW, HIGH, HIGH, LOW)],
  ])('%s', (_label, enables, expected) => {
    const { outputs, state } = getTimedDigitalContribution(TYPE)({
      component: { uid: 'l', type: TYPE }, pins: [], params: {}, currentTimeMs: 0, previousState: MEM,
      pinSignals: { VCC: HIGH, GND: LOW, ...D, ...enables },
    })
    expect(Object.fromEntries(outputs)).toEqual(expected)
    expect(state).toEqual(Object.fromEntries([1, 2, 3, 4].map(ch => [`channel${ch}`, { q: expected[`${ch}Q`] }])))
  })
})

describe('A9-LATCH1 — architecture', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

  it('generic engine / canvas / hook files carry no D_LATCH_74HC75 branch', () => {
    for (const file of ['../simulationRuntimeIntegration.js', '../resolution.js', '../scheduler.js', '../clock.js', '../engine.js', '../preparation.js',
      '../digitalContributionRegistry.js', '../../hooks/useCircuitState.js', '../../canvas/CircuitComponent.jsx', '../../canvas/Pin.jsx',
      '../../canvas/Breadboard.jsx', '../../components/parts/PartRenderer.jsx', '../../components/assembly/AssemblyLeadsLayer.jsx',
      '../../utils/assemblyGeometry.js', '../../utils/contactModel.js']) {
      expect(read(file), file).not.toMatch(/D_LATCH|74HC75|DLatch/)
    }
  })

  it('the 74HC75 producer keeps no enable history (level-sensitive, not an edge detector)', () => {
    const source = read('../timedDigitalContributionRegistry.js')
    const start = source.indexOf('const LATCH_74HC75_CHANNELS')
    const end = source.indexOf('export function createTimedDigitalContributionRegistry')
    const code = source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/previous(Clock|Enable|LE)|edge/i)
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
    expect(imports).toEqual(['./signals.js'])
  })
})
