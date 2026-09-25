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
import { BinaryCounter74HC161Model } from '../models/BinaryCounter74HC161Model.js'
import { toEngineInput } from '../engineAdapter.js'
import { Signal } from '../signals.js'

/**
 * A9-COUNTER1 — 74HC161 synchronous 4-bit binary counter : contrat séquentiel (CTR-xx).
 *
 * Toute la logique passe par le Registry timed de production
 * (timedDigitalContributionRegistry.js) et le pipeline A9-SEQ-PREQ/PREQ2
 * réel (`runSimulationWithRuntime` + `createSimulationRuntimeSession`) ;
 * aucune fixture ne remplace le producteur 74HC161. FLOATING (non productible
 * par câblage) passe par `computeTimedDigitalSignals` avec la contribution
 * de production.
 */

const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const TYPE = 'BINARY_COUNTER_74HC161'
const isLogic = s => s === HIGH || s === LOW
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const components = [{ uid: 'p', type: 'POWER' }, { uid: 'c', type: TYPE }]
const Q_PINS = ['Q0', 'Q1', 'Q2', 'Q3']
const OUTPUT_PINS = [...Q_PINS, 'TC']
const U4 = [UNKNOWN, UNKNOWN, UNKNOWN, UNKNOWN]

/** Bits LSB d'abord (Q0..Q3) d'un mot 0..15. */
const bits = n => [0, 1, 2, 3].map(i => ((n >> i) & 1 ? HIGH : LOW))
/** Niveaux D0..D3 d'un mot 0..15. */
const dWord = n => Object.fromEntries(bits(n).map((level, i) => [`D${i}`, level]))

/**
 * Câblage : chaque pin décisive est reliée au rail POWER correspondant ; une
 * pin UNKNOWN reste non connectée. Par défaut : alimenté, MR HIGH (pas de
 * reset), PE HIGH (pas de chargement), CEP/CET HIGH (comptage validé), CP LOW,
 * D = 0000.
 */
const BASE = { VCC: HIGH, GND: LOW, MR: HIGH, PE: HIGH, CEP: HIGH, CET: HIGH, CP: LOW, ...dWord(0) }
function wiresFor(levels, uid = 'c') {
  return Object.entries({ ...BASE, ...levels })
    .filter(([, level]) => isLogic(level))
    .map(([pin, level]) => wire('p', level === HIGH ? '5V' : 'GND', uid, pin))
}

function bench() {
  const runtimeSession = createSimulationRuntimeSession()
  const step = (levels = {}, dt = SIMULATION_STEP_MS) => {
    const signals = runSimulationWithRuntime(components, wiresFor(levels), { runtimeSession, dt })
    return Object.fromEntries(OUTPUT_PINS.map(pin => [pin, signals.get(`c:${pin}`)]))
  }
  const memory = () => runtimeSession.timedDigitalStates.get('c')
  /** Front montant complet : CP LOW puis CP HIGH avec les mêmes autres niveaux. */
  const clock = (levels = {}) => {
    step({ ...levels, CP: LOW })
    return step({ ...levels, CP: HIGH })
  }
  /** Force un mot connu : MR LOW (asynchrone), puis chargement synchrone de n. */
  const preset = n => {
    step({ MR: LOW })
    step({ PE: LOW, ...dWord(n) })
    return clock({ PE: LOW, ...dWord(n) })
  }
  return { runtimeSession, step, clock, preset, memory }
}

const q = r => Q_PINS.map(pin => r[pin])

/** Appel de la contribution de production via la composition timed, pour FLOATING. */
function direct() {
  const states = new Map()
  const registry = createTimedDigitalContributionRegistry({ contributions: new Map([[TYPE, getTimedDigitalContribution(TYPE)]]) })
  const call = levels => {
    const signals = new Map(Object.entries({ ...BASE, ...levels }).map(([pin, s]) => [`c:${pin}`, s]))
    return computeTimedDigitalSignals([{ uid: 'c', type: TYPE }], registry, signals, 0, states)
  }
  const outQ = out => Q_PINS.map(pin => out.get(`c:${pin}`))
  return { states, call, outQ }
}

/** Contribution de production appelée directement (table de contrat). */
const contribute = (pinSignals, previousState) =>
  getTimedDigitalContribution(TYPE)({ component: { uid: 'c', type: TYPE }, pins: [], params: {}, currentTimeMs: 0, previousState, pinSignals: { ...BASE, ...pinSignals } })

describe('A9-COUNTER1 — CTR-01 / CTR-02 registration and pinout', () => {
  it('CTR-01: one declarative entry in the production timed registry, unique canonical type, no combinational/DC path', () => {
    expect(hasTimedDigitalContribution(TYPE)).toBe(true)
    expect(getTimedDigitalContribution(TYPE)).toBeTypeOf('function')
    expect(getAllTimedDigitalContributionTypes().filter(t => t === TYPE)).toHaveLength(1)
    expect(getAllCanonicalTypes().filter(t => t === TYPE)).toHaveLength(1)
    expect(getAllCanonicalTypes().filter(t => /74HC161|COUNTER/.test(t))).toEqual([TYPE])
    expect(hasDigitalContribution(TYPE)).toBe(false)
    expect(hasDcContribution(TYPE)).toBe(false)
    expect(circuitRequiresContinuousStepping(components)).toBe(true)
  })

  it('CTR-02: canonical entry = 16 electrical pins in physical order 1..16 with locked roles, digital, no parameters, model available', () => {
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['digital'], defaultParameters: {}, parameterSchema: [] })
    expect(entry.pins.map(p => [p.id, p.role])).toEqual([
      ['MR', 'input'], ['CP', 'input'], ['D0', 'input'], ['D1', 'input'], ['D2', 'input'], ['D3', 'input'], ['CEP', 'input'], ['GND', 'ground'],
      ['PE', 'input'], ['CET', 'input'], ['Q3', 'output'], ['Q2', 'output'], ['Q1', 'output'], ['Q0', 'output'], ['TC', 'output'], ['VCC', 'power'],
    ])
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationDefaultParameters(TYPE)).toEqual({})
    expect(BinaryCounter74HC161Model).toMatchObject({ type: TYPE })
    expect(BinaryCounter74HC161Model.validate({})).toBe(true)
    expect(BinaryCounter74HC161Model.validate(null)).toBe(false)
    expect(BinaryCounter74HC161Model.validate([])).toBe(false)
  })
})

describe('A9-COUNTER1 — CTR-04 / CTR-29 / CTR-30 power and initial state', () => {
  it('CTR-29: powered from the start without reset/load: Q0..Q3 undetermined (never an invented 0000), TC undetermined', () => {
    const b = bench()
    const r = b.step()
    for (const pin of OUTPUT_PINS) expect(r[pin], pin).toBe(UNKNOWN)
    expect(b.memory()).toEqual({ q: U4, previousClock: LOW })
    // A rising edge while counting does not make an undetermined word determined.
    expect(q(b.step({ CP: HIGH }))).toEqual(U4)
  })

  it('CTR-29: with CET LOW, TC is LOW even while the word is still undetermined (one decisive LOW factor)', () => {
    const r = bench().step({ CET: LOW })
    expect(q(r)).toEqual(U4)
    expect(r.TC).toBe(LOW)
  })

  it.each([
    ['no supply at all', { VCC: UNKNOWN, GND: UNKNOWN }],
    ['VCC missing', { VCC: UNKNOWN }],
    ['GND missing', { GND: UNKNOWN }],
    ['VCC LOW', { VCC: LOW }],
    ['GND HIGH', { GND: HIGH }],
    ['VCC/GND reversed', { VCC: LOW, GND: HIGH }],
  ])('CTR-04: without a valid supply (%s) no output is driven, even under MR LOW or a load edge', (_label, supply) => {
    const previousState = { q: bits(15), previousClock: LOW }
    for (const levels of [{ MR: LOW }, { PE: LOW, CP: HIGH, ...dWord(9) }, { CP: HIGH }]) {
      const { outputs, state } = contribute({ ...supply, ...levels }, previousState)
      expect(outputs).toBeNull()
      expect(state).toEqual({ q: U4, previousClock: UNKNOWN })
    }
    const r = bench().step({ ...supply, MR: LOW })
    for (const pin of OUTPUT_PINS) expect(r[pin], pin).toBe(UNKNOWN)
  })

  it('CTR-30: power loss clears the runtime memory; repower restores nothing (A9-JK1/DFF1/LATCH1 precedent)', () => {
    const b = bench()
    expect(q(b.preset(11))).toEqual(bits(11))
    const off = b.step({ VCC: UNKNOWN })
    for (const pin of OUTPUT_PINS) expect(off[pin], pin).toBe(UNKNOWN)
    expect(b.memory()).toEqual({ q: U4, previousClock: UNKNOWN })
    const on = b.step()
    for (const pin of OUTPUT_PINS) expect(on[pin], pin).toBe(UNKNOWN)
    // Repower with CP already HIGH: the first sample is not an edge (previousClock UNKNOWN).
    const b2 = bench()
    b2.preset(3)
    b2.step({ VCC: UNKNOWN, CP: HIGH })
    expect(q(b2.step({ CP: HIGH, PE: LOW, ...dWord(5) }))).toEqual(U4)
    // A reset after repower restores a deterministic state immediately.
    expect(q(b.step({ MR: LOW }))).toEqual(bits(0))
  })
})

describe('A9-COUNTER1 — CTR-05 / CTR-06 / CTR-19 asynchronous master reset', () => {
  it('CTR-05 / CTR-06: MR LOW clears Q0..Q3 in the same step, without any clock edge (CP held LOW, then held HIGH)', () => {
    for (const cp of [LOW, HIGH]) {
      const b = bench()
      b.preset(13)
      b.step({ CP: cp })
      expect(q(b.step({ CP: cp }))).toEqual(bits(13))
      const r = b.step({ CP: cp, MR: LOW })
      expect(q(r)).toEqual(bits(0))
      expect(b.memory().q).toEqual(bits(0))
    }
  })

  it('CTR-05: MR LOW clears an undetermined power-up word immediately', () => {
    const b = bench()
    expect(q(b.step())).toEqual(U4)
    expect(q(b.step({ MR: LOW }))).toEqual(bits(0))
  })

  it('CTR-19: MR LOW dominates a load edge and a count edge; the counter stays 0 while MR is held LOW', () => {
    const b = bench()
    b.preset(6)
    b.step({ MR: LOW, PE: LOW, ...dWord(9) })
    expect(q(b.step({ MR: LOW, PE: LOW, CP: HIGH, ...dWord(9) }))).toEqual(bits(0))
    for (let i = 0; i < 3; i++) expect(q(b.clock({ MR: LOW }))).toEqual(bits(0))
    // Release: counting resumes from 0 on the next rising edge only.
    expect(q(b.step())).toEqual(bits(0))
    expect(q(b.clock())).toEqual(bits(1))
  })
})

describe('A9-COUNTER1 — CTR-07 / CTR-08 / CTR-09 rising edge only', () => {
  it('CTR-07: exactly one increment per LOW -> HIGH edge', () => {
    const b = bench()
    b.preset(2)
    b.step()
    expect(q(b.step({ CP: HIGH }))).toEqual(bits(3))
  })

  it('CTR-08: HIGH -> LOW never counts', () => {
    const b = bench()
    b.preset(2)
    expect(q(b.step({ CP: HIGH }))).toEqual(bits(2))
    expect(q(b.step({ CP: LOW }))).toEqual(bits(2))
  })

  it('CTR-09: CP held HIGH or held LOW for many steps never counts again', () => {
    const b = bench()
    b.preset(4)
    for (let i = 0; i < 5; i++) expect(q(b.step({ CP: HIGH }))).toEqual(bits(4))
    for (let i = 0; i < 5; i++) expect(q(b.step({ CP: LOW }))).toEqual(bits(4))
    expect(q(b.step({ CP: HIGH }))).toEqual(bits(5))
  })

  it('CTR-09: dt = 0 steps and scheduler time never create an edge', () => {
    const b = bench()
    b.preset(7)
    for (let i = 0; i < 3; i++) expect(q(b.step({ CP: HIGH }, 0))).toEqual(bits(7))
  })
})

describe('A9-COUNTER1 — CTR-10 / CTR-11 / CTR-12 count enables', () => {
  it.each([
    [HIGH, HIGH, 6],
    [LOW, HIGH, 5],
    [HIGH, LOW, 5],
    [LOW, LOW, 5],
  ])('CTR-10: CEP=%s CET=%s at the edge -> %i (counting requires CEP AND CET)', (cep, cet, expected) => {
    const b = bench()
    b.preset(5)
    expect(q(b.clock({ CEP: cep, CET: cet }))).toEqual(bits(expected))
  })

  it('CTR-11: CEP LOW holds the word across many edges', () => {
    const b = bench()
    b.preset(9)
    for (let i = 0; i < 4; i++) expect(q(b.clock({ CEP: LOW }))).toEqual(bits(9))
  })

  it('CTR-12: CET LOW holds the word across many edges', () => {
    const b = bench()
    b.preset(9)
    for (let i = 0; i < 4; i++) expect(q(b.clock({ CET: LOW }))).toEqual(bits(9))
  })
})

describe('A9-COUNTER1 — CTR-13 / CTR-14 / CTR-15 / CTR-20 binary counting', () => {
  it('CTR-13 / CTR-14 / CTR-20: full sequence 0 -> 15, Q0 = LSB (weight 1) ... Q3 = MSB (weight 8)', () => {
    const b = bench()
    expect(q(b.step({ MR: LOW }))).toEqual(bits(0))
    for (let n = 1; n <= 15; n++) {
      const r = b.clock()
      expect(q(r), `count ${n}`).toEqual(bits(n))
      expect(b.memory().q).toEqual(bits(n))
    }
    // Explicit weights on a few values (no bit order reversal).
    expect(bits(1)).toEqual([HIGH, LOW, LOW, LOW])
    expect(bits(8)).toEqual([LOW, LOW, LOW, HIGH])
  })

  it('CTR-15: rollover 15 -> 0 then counting continues (modulo 16, no fifth bit)', () => {
    const b = bench()
    b.preset(14)
    expect(q(b.clock())).toEqual(bits(15))
    expect(q(b.clock())).toEqual(bits(0))
    expect(q(b.clock())).toEqual(bits(1))
    expect(b.memory().q).toHaveLength(4)
  })

  it('CTR-14: 32 edges from 0 return to 0 twice (two full periods)', () => {
    const b = bench()
    b.step({ MR: LOW })
    const seen = []
    for (let i = 0; i < 32; i++) seen.push(q(b.clock()).reduce((n, level, bit) => n + (level === HIGH ? 1 << bit : 0), 0))
    expect(seen).toEqual([...Array(32)].map((_, i) => (i + 1) % 16))
  })
})

describe('A9-COUNTER1 — CTR-16 / CTR-17 / CTR-18 synchronous parallel load', () => {
  it.each([0, 5, 10, 15, 6, 9])('CTR-16: PE LOW + rising edge loads D = %i on Q0..Q3', n => {
    const b = bench()
    b.step({ MR: LOW })
    b.step({ PE: LOW, ...dWord(n) })
    expect(q(b.step({ PE: LOW, CP: HIGH, ...dWord(n) }))).toEqual(bits(n))
  })

  it('CTR-17: PE LOW without an edge changes nothing; D changes are not followed while waiting', () => {
    const b = bench()
    b.preset(3)
    for (const n of [12, 0, 15]) expect(q(b.step({ CP: HIGH, PE: LOW, ...dWord(n) }))).toEqual(bits(3))
    for (const n of [12, 0, 15]) expect(q(b.step({ CP: LOW, PE: LOW, ...dWord(n) }))).toEqual(bits(3))
    // Loaded only on the edge, with the D value present at that edge.
    expect(q(b.step({ CP: HIGH, PE: LOW, ...dWord(10) }))).toEqual(bits(10))
    // After the load, D changes are ignored until the next edge.
    expect(q(b.step({ CP: HIGH, PE: LOW, ...dWord(1) }))).toEqual(bits(10))
  })

  it('CTR-18: load ignores CEP and CET (all four enable combinations load D)', () => {
    for (const [cep, cet] of [[LOW, LOW], [LOW, HIGH], [HIGH, LOW], [HIGH, HIGH]]) {
      const b = bench()
      b.preset(1)
      expect(q(b.clock({ PE: LOW, CEP: cep, CET: cet, ...dWord(12) })), `${cep}/${cet}`).toEqual(bits(12))
    }
  })

  it('CTR-16: load takes priority over counting (loads D, not word + 1), then counting resumes from the loaded value', () => {
    const b = bench()
    b.preset(4)
    expect(q(b.clock({ PE: LOW, ...dWord(4) }))).toEqual(bits(4))
    expect(q(b.clock())).toEqual(bits(5))
  })
})

describe('A9-COUNTER1 — CTR-21 .. CTR-25 terminal count TC', () => {
  it('CTR-21: TC LOW for every value 0..14 with CET HIGH', () => {
    const b = bench()
    let r = b.step({ MR: LOW })
    for (let n = 0; n <= 14; n++) {
      expect(r.TC, `count ${n}`).toBe(LOW)
      r = b.clock()
    }
    expect(q(r)).toEqual(bits(15))
  })

  it('CTR-22: TC HIGH at 1111 with CET HIGH, back to LOW after rollover', () => {
    const b = bench()
    const r = b.preset(15)
    expect(r.TC).toBe(HIGH)
    expect(b.clock().TC).toBe(LOW)
  })

  it('CTR-23: CET LOW forces TC LOW at 1111 immediately (combinational, same step, no edge)', () => {
    const b = bench()
    b.preset(15)
    const r = b.step({ CP: HIGH, CET: LOW })
    expect(q(r)).toEqual(bits(15))
    expect(r.TC).toBe(LOW)
    expect(b.step({ CP: HIGH, CET: HIGH }).TC).toBe(HIGH)
  })

  it('CTR-24: CEP LOW does not suppress TC (counter holds at 1111 with TC HIGH)', () => {
    const b = bench()
    b.preset(15)
    for (let i = 0; i < 3; i++) {
      const r = b.clock({ CEP: LOW })
      expect(q(r)).toEqual(bits(15))
      expect(r.TC).toBe(HIGH)
    }
  })

  it('CTR-25: TC is not stored: the runtime state carries only q[4] and previousClock', () => {
    const b = bench()
    b.preset(15)
    expect(Object.keys(b.memory()).sort()).toEqual(['previousClock', 'q'])
    expect(b.memory().q).toEqual(bits(15))
    // TC follows CET immediately in both directions without any clock activity.
    for (const cet of [LOW, HIGH, LOW, HIGH]) expect(b.step({ CP: HIGH, CET: cet }).TC).toBe(cet)
    // TC resolves UNKNOWN when CET is undetermined at 1111 (never remembered).
    expect(b.step({ CP: HIGH, CET: UNKNOWN }).TC).toBe(UNKNOWN)
  })
})

describe('A9-COUNTER1 — CTR-26 / CTR-27 / CTR-28 UNKNOWN / FLOATING are never coerced', () => {
  it('CTR-26: CEP UNKNOWN (unconnected) at a count edge -> bits that differ between hold and count become UNKNOWN', () => {
    const b = bench()
    b.preset(4) // 0100 -> hold 0100 / count 0101 : only Q0 differs
    const r = b.clock({ CEP: UNKNOWN })
    expect(q(r)).toEqual([UNKNOWN, LOW, HIGH, LOW])
    expect(r.TC).toBe(LOW) // a determined LOW bit keeps TC LOW
  })

  it('CTR-26: CET UNKNOWN at 1111 -> TC UNKNOWN; Q0..Q3 UNKNOWN (hold 1111 / rollover 0000)', () => {
    const b = bench()
    b.preset(15)
    const r = b.clock({ CET: UNKNOWN })
    expect(q(r)).toEqual(U4)
    expect(r.TC).toBe(UNKNOWN)
  })

  it('CTR-26: PE UNKNOWN at an edge -> bits agree only where D equals word + 1', () => {
    const b = bench()
    b.preset(2) // count -> 0011 ; load D = 0111 -> Q0/Q1 agree HIGH, Q2 differs, Q3 LOW
    expect(q(b.clock({ PE: UNKNOWN, ...dWord(7) }))).toEqual([HIGH, HIGH, UNKNOWN, LOW])
  })

  it('CTR-26: D UNKNOWN during a load -> only that bit UNKNOWN; D undetermined without load is irrelevant', () => {
    const b = bench()
    b.preset(0)
    expect(q(b.clock({ PE: LOW, ...dWord(5), D1: UNKNOWN }))).toEqual([HIGH, UNKNOWN, HIGH, LOW])
    const c = bench()
    c.preset(8)
    expect(q(c.clock({ D0: UNKNOWN, D1: UNKNOWN, D2: UNKNOWN, D3: UNKNOWN }))).toEqual(bits(9))
  })

  it('CTR-26: MR UNKNOWN -> a bit stays determined only if it is LOW both with and without the reset', () => {
    const b = bench()
    b.preset(5) // 0101
    const r = b.step({ MR: UNKNOWN })
    expect(q(r)).toEqual([UNKNOWN, LOW, UNKNOWN, LOW])
    expect(b.memory().q).toEqual([UNKNOWN, LOW, UNKNOWN, LOW])
  })

  it('CTR-26: an undetermined bit makes the next increment conservative (never a guessed carry)', () => {
    const b = bench()
    b.preset(4)
    b.clock({ CEP: UNKNOWN }) // [U, L, H, L] = {4, 5}
    expect(q(b.clock())).toEqual([UNKNOWN, UNKNOWN, HIGH, LOW]) // {5, 6} = 0101 / 0110
  })

  it.each(['MR', 'PE', 'CEP', 'CET'])('CTR-27: %s FLOATING behaves exactly like UNKNOWN (never LOW, never HIGH)', pin => {
    const run = level => {
      const d = direct()
      d.call({ MR: LOW })
      d.call({ ...dWord(0) })
      // Preset 0101 via load : then MR LOW -> 0, PE LOW -> D = 10, CEP/CET LOW -> hold 5, else count 6,
      // so every pin changes at least one bit between its LOW and HIGH interpretations.
      d.call({ PE: LOW, CP: HIGH, ...dWord(5) })
      d.call({ CP: LOW })
      const out = d.call({ CP: HIGH, [pin]: level, ...dWord(10) })
      return { q: d.outQ(out), tc: out.get('c:TC'), state: d.states.get('c') }
    }
    const floating = run(FLOATING)
    expect(floating).toEqual(run(UNKNOWN))
    expect(floating).not.toEqual(run(LOW))
    expect(floating).not.toEqual(run(HIGH))
  })

  it('CTR-27: D FLOATING during a load is not coerced', () => {
    const d = direct()
    d.call({ MR: LOW })
    d.call({})
    const out = d.call({ PE: LOW, CP: HIGH, ...dWord(15), D3: FLOATING })
    expect(d.outQ(out)).toEqual([HIGH, HIGH, HIGH, undefined])
    expect(out.has('c:TC')).toBe(false) // CET HIGH, three bits HIGH, Q3 undetermined -> TC undetermined
    expect(d.states.get('c').q).toEqual([HIGH, HIGH, HIGH, UNKNOWN])
  })

  it.each([[UNKNOWN], [FLOATING]])('CTR-28: CP %s never creates an edge, before or after, in either direction', level => {
    const d = direct()
    d.call({ MR: LOW })
    d.call({ CP: LOW })
    expect(d.outQ(d.call({ CP: level }))).toEqual(bits(0)) // LOW -> undetermined : no edge
    expect(d.outQ(d.call({ CP: HIGH }))).toEqual(bits(0)) // undetermined -> HIGH : no edge
    expect(d.outQ(d.call({ CP: LOW }))).toEqual(bits(0))
    expect(d.outQ(d.call({ CP: HIGH }))).toEqual(bits(1)) // a real edge still counts
  })

  it('CTR-28: CP UNKNOWN through the real pipeline (unconnected clock) never counts', () => {
    const b = bench()
    b.preset(2)
    b.step({ CP: LOW })
    expect(q(b.step({ CP: UNKNOWN }))).toEqual(bits(2))
    expect(q(b.step({ CP: HIGH }))).toEqual(bits(2))
  })
})

describe('A9-COUNTER1 — CTR-31 / CTR-32 / CTR-33 runtime lifecycle', () => {
  it('CTR-31: two counter instances keep independent runtime states', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'a', type: TYPE }, { uid: 'b', type: TYPE }]
    const step = (a, b) => runSimulationWithRuntime(comps, [...wiresFor(a, 'a'), ...wiresFor(b, 'b')], { runtimeSession, dt: SIMULATION_STEP_MS })
    const read = (s, uid) => Q_PINS.map(pin => s.get(`${uid}:${pin}`))
    step({ MR: LOW }, { MR: LOW })
    step({}, {})
    let s = step({ CP: HIGH }, { CP: LOW })
    expect([read(s, 'a'), read(s, 'b')]).toEqual([bits(1), bits(0)])
    step({}, { CP: HIGH })
    s = step({ CP: HIGH }, { CP: LOW, CEP: LOW })
    expect([read(s, 'a'), read(s, 'b')]).toEqual([bits(2), bits(1)])
    expect(runtimeSession.timedDigitalStates.get('a')).not.toBe(runtimeSession.timedDigitalStates.get('b'))
  })

  it('CTR-32: memory persists across steps only in the runtime session; retain/purge and reset clear it', () => {
    const b = bench()
    b.preset(12)
    for (let i = 0; i < 4; i++) expect(q(b.step({ CP: HIGH }))).toEqual(bits(12))
    expect(b.runtimeSession.timedDigitalStates.has('c')).toBe(true)
    retainSimulationRuntimeSessionUids(b.runtimeSession, new Set(['p']))
    expect(b.runtimeSession.timedDigitalStates.has('c')).toBe(false)
    expect(q(b.step({ CP: HIGH }))).toEqual(U4)
    resetSimulationRuntimeSession(b.runtimeSession)
    expect(b.runtimeSession.timedDigitalStates.size).toBe(0)
    expect(b.runtimeSession.scheduler).toBeNull()
  })

  it('CTR-32: deterministic — two independent sessions fed the same sequence give identical outputs and states', () => {
    const sequence = [{ MR: LOW }, {}, { CP: HIGH }, {}, { CP: HIGH, CEP: LOW }, { PE: LOW, ...dWord(14) }, { CP: HIGH, PE: LOW, ...dWord(14) }, {}, { CP: HIGH }]
    const run = () => {
      const b = bench()
      return { out: sequence.map(levels => b.step(levels)), state: b.memory() }
    }
    const first = run()
    expect(run()).toEqual(first)
    expect(first.state).toEqual({ q: bits(15), previousClock: HIGH })
  })

  it('CTR-33: the Document is never mutated and carries no runtime count', () => {
    const doc = levels => ({
      components: [{ id: 'p', type: 'POWER', position: { x: 0, y: 0 } }, { id: 'c', type: TYPE, position: { x: 200, y: 0 } }],
      wires: Object.entries({ VCC: true, GND: false, MR: true, PE: true, CEP: true, CET: true, CP: false, ...levels })
        .map(([pin, high], i) => ({ id: `w${i}`, pinA: { componentId: 'p', pinId: high ? '5V' : 'GND' }, pinB: { componentId: 'c', pinId: pin } })),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      const signals = runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      for (const c of d.components) {
        expect(c).not.toHaveProperty('state')
        expect(c).not.toHaveProperty('count')
      }
      expect(before).not.toMatch(/previousClock|"q"|count/)
      return Q_PINS.map(pin => signals.get(`c:${pin}`))
    }
    expect(step({})).toEqual(U4)
    expect(step({ MR: false })).toEqual(bits(0))
    expect(step({})).toEqual(bits(0))
    expect(step({ CP: true })).toEqual(bits(1))
    expect(runtimeSession.timedDigitalStates.get('c')).toEqual({ q: bits(1), previousClock: HIGH })
  })
})

describe('A9-COUNTER1 — CTR-41 synchronous cascade TC -> next stage CET/CEP (existing primitives only)', () => {
  it('two 74HC161 on a shared clock count 0 -> 255 as one 8-bit counter (low TC drives high CEP and CET)', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'lo', type: TYPE }, { uid: 'hi', type: TYPE }]
    const cascade = [wire('lo', 'TC', 'hi', 'CEP'), wire('lo', 'TC', 'hi', 'CET')]
    const step = levels => {
      const hiLevels = { ...levels, CEP: UNKNOWN, CET: UNKNOWN } // driven only by lo:TC
      const s = runSimulationWithRuntime(comps, [...wiresFor(levels, 'lo'), ...wiresFor(hiLevels, 'hi'), ...cascade], { runtimeSession, dt: SIMULATION_STEP_MS })
      const word = uid => Q_PINS.reduce((n, pin, bit) => {
        const level = s.get(`${uid}:${pin}`)
        return isLogic(level) && n !== null ? n + (level === HIGH ? 1 << bit : 0) : null
      }, 0)
      return { lo: word('lo'), hi: word('hi'), tc: s.get('lo:TC'), hiTc: s.get('hi:TC'), hiCet: s.get('hi:CET') }
    }
    step({ MR: LOW })
    step({ MR: LOW }) // lo:TC (LOW) is now held and seen by hi
    let r = step({})
    expect([r.lo, r.hi]).toEqual([0, 0])
    const values = []
    for (let i = 0; i < 260; i++) {
      step({ CP: LOW })
      r = step({ CP: HIGH })
      values.push(r.hi * 16 + r.lo)
      if (r.lo === 15) {
        expect(r.tc).toBe(HIGH)
      }
    }
    expect(values).toEqual([...Array(260)].map((_, i) => (i + 1) % 256))
    // The high stage only counted on edges where the low stage was at 1111 before the edge.
    expect(values.filter((v, i) => i > 0 && (v >> 4) !== (values[i - 1] >> 4) && (values[i - 1] & 15) !== 15)).toEqual([])
  })

  it('the cascade TC signal reaches the next stage CET through the resolved net (no special path)', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'lo', type: TYPE }, { uid: 'hi', type: TYPE }]
    const w = levels => [...wiresFor(levels, 'lo'), ...wiresFor({ CEP: UNKNOWN, CET: UNKNOWN }, 'hi'), wire('lo', 'TC', 'hi', 'CET'), wire('lo', 'TC', 'hi', 'CEP')]
    runSimulationWithRuntime(comps, w({ MR: LOW }), { runtimeSession, dt: SIMULATION_STEP_MS })
    const s = runSimulationWithRuntime(comps, w({}), { runtimeSession, dt: SIMULATION_STEP_MS })
    expect(s.get('lo:TC')).toBe(LOW)
    expect(s.get('hi:CET')).toBe(LOW)
  })
})

describe('A9-COUNTER1 — CTR-40 mutation resistance (direct contract table)', () => {
  // Chaque ligne fixe un état, applique un seul step et vérifie Q0..Q3 + TC + l'état.
  // Inverser MR/PE, front montant/descendant, ET/OU des enables, l'ordre des bits,
  // la priorité MR > LOAD > COUNT, le modulo, ou faire dépendre TC de CEP casse au
  // moins une ligne.
  const S = (n, previousClock = LOW) => ({ q: bits(n), previousClock })
  const row = (label, previous, levels, expectedWord, expectedTc) => [label, previous, levels, expectedWord, expectedTc]
  it.each([
    row('rising edge counts', S(5), { CP: HIGH }, 6, LOW),
    row('falling edge holds', S(5, HIGH), { CP: LOW }, 5, LOW),
    row('high level holds', S(5, HIGH), { CP: HIGH }, 5, LOW),
    row('low level holds', S(5), { CP: LOW }, 5, LOW),
    row('CEP LOW holds', S(5), { CP: HIGH, CEP: LOW }, 5, LOW),
    row('CET LOW holds', S(5), { CP: HIGH, CET: LOW }, 5, LOW),
    row('both enables LOW hold', S(5), { CP: HIGH, CEP: LOW, CET: LOW }, 5, LOW),
    row('carry chain 0111 -> 1000', S(7), { CP: HIGH }, 8, LOW),
    row('reaching 1111 raises TC', S(14), { CP: HIGH }, 15, HIGH),
    row('rollover 1111 -> 0000', S(15), { CP: HIGH }, 0, LOW),
    row('load at edge', S(5), { CP: HIGH, PE: LOW, ...dWord(10) }, 10, LOW),
    row('load 1111 raises TC', S(0), { CP: HIGH, PE: LOW, ...dWord(15) }, 15, HIGH),
    row('load ignores CEP/CET LOW', S(5), { CP: HIGH, PE: LOW, CEP: LOW, CET: LOW, ...dWord(3) }, 3, LOW),
    row('load waits for the edge', S(5, HIGH), { CP: HIGH, PE: LOW, ...dWord(10) }, 5, LOW),
    row('MR clears without edge', S(9, HIGH), { CP: HIGH, MR: LOW }, 0, LOW),
    row('MR beats load edge', S(9), { CP: HIGH, MR: LOW, PE: LOW, ...dWord(15) }, 0, LOW),
    row('MR beats count edge', S(15), { CP: HIGH, MR: LOW }, 0, LOW),
    row('hold 1111 with CEP LOW keeps TC HIGH', S(15), { CP: HIGH, CEP: LOW }, 15, HIGH),
    row('hold 1111 with CET LOW forces TC LOW', S(15), { CP: HIGH, CET: LOW }, 15, LOW),
    row('bit order: 0001 -> 0010', S(1), { CP: HIGH }, 2, LOW),
    row('bit order: load 0001', S(0), { CP: HIGH, PE: LOW, ...dWord(1) }, 1, LOW),
    row('bit order: load 1000', S(0), { CP: HIGH, PE: LOW, ...dWord(8) }, 8, LOW),
  ])('%s', (_label, previous, levels, expectedWord, expectedTc) => {
    const { outputs, state } = contribute(levels, previous)
    const expected = Object.fromEntries([...Q_PINS.map((pin, i) => [pin, bits(expectedWord)[i]]), ['TC', expectedTc]])
    expect(Object.fromEntries(outputs)).toEqual(expected)
    expect(state).toEqual({ q: bits(expectedWord), previousClock: levels.CP })
  })
})

describe('A9-COUNTER1 — CTR-39 architecture', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8')

  it('generic engine / canvas / hook files carry no BINARY_COUNTER_74HC161 branch', () => {
    for (const file of ['../simulationRuntimeIntegration.js', '../resolution.js', '../scheduler.js', '../clock.js', '../engine.js', '../preparation.js',
      '../digitalContributionRegistry.js', '../../hooks/useCircuitState.js', '../../canvas/CircuitComponent.jsx', '../../canvas/Pin.jsx',
      '../../canvas/Breadboard.jsx', '../../components/parts/PartRenderer.jsx', '../../components/assembly/AssemblyLeadsLayer.jsx',
      '../../utils/assemblyGeometry.js', '../../utils/contactModel.js']) {
      expect(read(file), file).not.toMatch(/BINARY_COUNTER|74HC161|BinaryCounter|counter-74hc161/)
    }
  })

  it('the 74HC161 producer uses no wall clock, no timer and no Document/React access', () => {
    const source = read('../timedDigitalContributionRegistry.js')
    const start = source.indexOf('const COUNTER_74HC161_Q')
    const end = source.indexOf('\n}\n', source.indexOf('function binaryCounter74HC161TimedDigital'))
    expect(start).toBeGreaterThan(0)
    const code = source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame|currentTimeMs/)
    expect(code).not.toMatch(/document|parameters|window|React/)
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
    expect(imports).toEqual(['./signals.js'])
  })
})
