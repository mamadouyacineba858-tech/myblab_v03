import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSimulationRuntimeSession, runSimulationStep } from '../simulationRuntimeIntegration.js'
import { Signal } from '../signals.js'

/**
 * A11-COMP4 — TI NE555P REAL circuit gates (T45..T58 + RESET / CONT gates).
 * Only production types (NE555P, RESISTOR, CAPACITOR, BATTERY_9V, POWER, BUTTON), real wires
 * and the real runtime stepping : no mocked pin voltage, no fixture contributor. The only
 * instrumentation is a transparent probe on resolveSignals() (ONE resolution per step, and
 * the DISCH-GND conduction pair it receives as plain step data).
 *
 * Causal reading (PREQ3/PREQ4) : the SAMPLE of step k observes the capacitor state committed
 * by step k-1, so a threshold crossed by vc[k-1] switches the latch at step k.
 */
const { resolutions } = vi.hoisted(() => ({ resolutions: [] }))
vi.mock('../resolution.js', async (original) => {
  const actual = await original()
  return {
    ...actual,
    resolveSignals: (...args) => {
      resolutions.push(args)
      return actual.resolveSignals(...args)
    },
  }
})
beforeEach(() => { resolutions.length = 0 })

const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const battery = { uid: 'bat', type: 'BATTERY_9V', parameters: { voltage: 9 } }
const timer = { uid: 'u', type: 'NE555P', parameters: {} }
const resistor = (uid, resistance) => ({ uid, type: 'RESISTOR', parameters: { resistance } })
const capacitor = (capacitance) => ({ uid: 'c', type: 'CAPACITOR', parameters: { capacitance } })
const LN2 = Math.log(2)
const LN3 = Math.log(3)

/**
 * Classic astable : VCC - RA - DISCH - RB - (THRES, TRIG, C) - GND ; RESET on VCC (or on GND),
 * CONT un-driven (or on a 5 V POWER sharing GND).
 */
function astable({ ra = 1000, rb = 10000, c = 1e-4, reset = 'plus', cont = null, reversed = false } = {}) {
  const components = [battery, timer, resistor('ra', ra), resistor('rb', rb), capacitor(c)]
  const wires = [
    wire('bat', 'plus', 'u', 'VCC'), wire('bat', reset, 'u', 'RESET'), wire('bat', 'plus', 'ra', 'A'),
    wire('ra', 'B', 'u', 'DISCH'), wire('rb', 'A', 'u', 'DISCH'), wire('rb', 'B', 'u', 'THRES'),
    wire('u', 'THRES', 'u', 'TRIG'), wire('u', 'TRIG', 'c', 'pinA'), wire('c', 'pinB', 'bat', 'minus'), wire('u', 'GND', 'bat', 'minus'),
  ]
  if (cont !== null) {
    components.push({ uid: 'ctl', type: 'POWER', parameters: { voltage: cont } })
    wires.push(wire('ctl', 'GND', 'bat', 'minus'), wire('ctl', '5V', 'u', 'CONT'))
  }
  return reversed ? { components: [...components].reverse(), wires: [...wires].reverse() } : { components, wires }
}

/**
 * Classic monostable : VCC - R - (DISCH, THRES, C) - GND ; TRIG pulled up to VCC by RP and
 * pulled to GND by a BUTTON while pressed ; RESET on VCC ; CONT un-driven.
 */
function monostable({ r = 10000, c = 1e-5, pressed = false } = {}) {
  return {
    components: [battery, timer, resistor('r', r), resistor('rp', 10000), capacitor(c), { uid: 'sw', type: 'BUTTON', ...(pressed ? { state: 'pressed' } : {}) }],
    wires: [
      wire('bat', 'plus', 'u', 'VCC'), wire('bat', 'plus', 'u', 'RESET'), wire('bat', 'plus', 'r', 'A'),
      wire('r', 'B', 'u', 'DISCH'), wire('u', 'DISCH', 'u', 'THRES'), wire('u', 'THRES', 'c', 'pinA'),
      wire('c', 'pinB', 'bat', 'minus'), wire('u', 'GND', 'bat', 'minus'),
      wire('bat', 'plus', 'rp', 'A'), wire('rp', 'B', 'u', 'TRIG'), wire('u', 'TRIG', 'sw', 'pin1'), wire('sw', 'pin2', 'bat', 'minus'),
    ],
  }
}

const dischargeClosed = (args) => (args[3]?.conductionPairs ?? []).some(({ uid, pinA, pinB }) => uid === 'u' && pinA === 'DISCH' && pinB === 'GND')

/** Steps a circuit (or a step -> circuit function) from a fresh runtime session ; one row per step. */
function run(circuitAt, steps, dt, session = createSimulationRuntimeSession()) {
  const rows = []
  for (let k = 1; k <= steps; k++) {
    const { components, wires } = typeof circuitAt === 'function' ? circuitAt(k) : circuitAt
    const before = resolutions.length
    const { pinSignals } = runSimulationStep(components, wires, { dt, runtimeSession: session })
    expect(resolutions.length - before, `ONE resolution at step ${k}`).toBe(1)
    rows.push({
      k,
      latch: session.mixedSignalStates.get('u')?.latch,
      out: pinSignals.get('u:OUT'),
      disch: dischargeClosed(resolutions[resolutions.length - 1]),
      vc: session.electricalTransientStates.get('c')?.voltage,
    })
  }
  return { rows, session }
}

/** Steps at which the latch switches, with the new latch. */
const transitions = (rows) => rows.filter((row, i) => i > 0 && row.latch !== rows[i - 1].latch).map(({ k, latch }) => ({ k, latch }))
const at = (rows, k) => rows[k - 1]

function expectOutputsFollowLatch(rows) {
  for (const row of rows) {
    expect(row.out, `OUT at step ${row.k}`).toBe(row.latch === 'SET' ? Signal.HIGH : Signal.LOW)
    expect(row.disch, `DISCH at step ${row.k}`).toBe(row.latch === 'RESET')
  }
}

describe('A11-COMP4 NE555P — REAL monostable (T45..T49)', () => {
  const DT = 5
  /** Released, pressed at step TRIGGER_STEP only, then released. */
  const TRIGGER_STEP = 6
  const pulse = (r, c, steps = 120) => run((k) => monostable({ r, c, pressed: k === TRIGGER_STEP }), steps, DT)

  it('T45..T48 initial RESET -> trigger -> SET -> external charge -> THRES upper crossing -> RESET, DISCH closed again', () => {
    const { rows } = pulse(10000, 1e-5)
    // Initial RESET : OUT LOW, DISCH-GND closed ; the shorted capacitor carries no state.
    for (let k = 1; k < TRIGGER_STEP; k++) expect(at(rows, k)).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true, vc: undefined })
    // T45 : the button pulls TRIG to 0 V < VCC/3 -> SET at the same step : OUT HIGH, DISCH open.
    expect(at(rows, TRIGGER_STEP)).toMatchObject({ latch: 'SET', out: Signal.HIGH, disch: false })
    const [set, reset, ...rest] = transitions(rows)
    expect(set).toEqual({ k: TRIGGER_STEP, latch: 'SET' })
    expect(reset.latch).toBe('RESET')
    expect(rest).toEqual([])
    // T46 : the external capacitor charges through R (strictly increasing) while SET.
    const charge = rows.slice(TRIGGER_STEP - 1, reset.k - 1).map((row) => row.vc)
    charge.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(charge[i]))
    // First charge step = the PREQ5 law with the REAL R and C (tau = RC).
    expect(at(rows, TRIGGER_STEP).vc).toBeCloseTo(9 * (1 - Math.exp(-(DT / 1000) / (10000 * 1e-5))), 12)
    // T47 : upper crossing observed by the next SAMPLE (vc[k-1] > 2VCC/3 >= vc[k-2]).
    expect(at(rows, reset.k - 1).vc).toBeGreaterThan(6)
    expect(at(rows, reset.k - 2).vc).toBeLessThanOrEqual(6)
    // T48 : RESET -> OUT LOW, DISCH-GND closed again, and held while TRIG stays released.
    for (const row of rows.slice(reset.k - 1)) expect(row).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true })
    expectOutputsFollowLatch(rows)
    // Pulse width ~ ln(3) RC, quantized by the fixed step (+1 SAMPLE of observation latency).
    const width = reset.k - set.k
    expect(Math.abs(width - (LN3 * 10000 * 1e-5 * 1000) / DT)).toBeLessThanOrEqual(1.5)
  })

  it('T49 a larger R or a larger C gives a longer pulse (external R/C only, no internal timing)', () => {
    const width = (r, c) => {
      const [set, reset] = transitions(pulse(r, c, 200).rows)
      return reset.k - set.k
    }
    const base = width(10000, 1e-5)
    const largerR = width(20000, 1e-5)
    const largerC = width(10000, 2e-5)
    expect(largerR).toBeGreaterThan(base)
    expect(largerC).toBeGreaterThan(base)
    // Same RC product -> same pulse ; doubled RC -> about twice the pulse (fixed-step quantization).
    expect(largerR).toBe(largerC)
    expect(Math.abs(largerR - 2 * base)).toBeLessThanOrEqual(2)
    for (const [r, c, w] of [[10000, 1e-5, base], [20000, 1e-5, largerR]]) {
      expect(Math.abs(w - (LN3 * r * c * 1000) / DT), `${r} ${c}`).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('A11-COMP4 NE555P — REAL astable (T50..T57)', () => {
  const DT = 10
  const RA = 1000
  const RB = 10000
  const C = 1e-4

  it('T50..T57 SET/charge -> upper crossing -> RESET/DISCH/discharge -> lower crossing -> SET, repeated', () => {
    const { rows, session } = run(astable({ ra: RA, rb: RB, c: C }), 500, DT)
    expect(session.scheduler.getCurrentTime()).toBe(500 * DT)
    const changes = transitions(rows)
    // Step 1 : start-up RESET, TRIG not yet observable ; step 2 : TRIG = 0 V < 3 V -> SET.
    expect(at(rows, 1)).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true, vc: 0 })
    expect(changes[0]).toEqual({ k: 2, latch: 'SET' })
    // At least SET -> RESET -> SET -> RESET -> SET -> RESET (three charge / discharge cycles).
    expect(changes.map((t) => t.latch).slice(0, 6)).toEqual(['SET', 'RESET', 'SET', 'RESET', 'SET', 'RESET'])
    expectOutputsFollowLatch(rows)

    const phases = changes.map((t, i) => ({ ...t, end: (changes[i + 1]?.k ?? rows.length + 1) - 1 }))
    for (const phase of phases) {
      // Voltages committed during the phase (the first one follows the switching step's effects).
      const vs = rows.slice(phase.k - 1, phase.end).map((row) => row.vc)
      for (let i = 1; i < vs.length; i++) {
        if (phase.latch === 'SET') expect(vs[i], `charge at step ${phase.k + i}`).toBeGreaterThan(vs[i - 1])
        else expect(vs[i], `discharge at step ${phase.k + i}`).toBeLessThan(vs[i - 1])
      }
      if (phase.k === 2) continue
      // Crossing observed by the NEXT SAMPLE : vc[k-1] beyond the level, vc[k-2] not yet.
      if (phase.latch === 'RESET') {
        expect(at(rows, phase.k - 1).vc).toBeGreaterThan(6)
        expect(at(rows, phase.k - 2).vc).toBeLessThanOrEqual(6)
      } else {
        expect(at(rows, phase.k - 1).vc).toBeLessThan(3)
        expect(at(rows, phase.k - 2).vc).toBeGreaterThanOrEqual(3)
      }
    }
    // Charge through RA + RB, discharge through RB only (external network, PREQ5).
    const lengths = (latch) => phases.filter((p) => p.latch === latch && p.k !== 2 && p.end < rows.length).map((p) => p.end - p.k + 1)
    const charges = lengths('SET')
    const discharges = lengths('RESET').slice(1)
    expect(charges.length).toBeGreaterThanOrEqual(2)
    expect(discharges.length).toBeGreaterThanOrEqual(2)
    for (const n of charges) expect(Math.abs(n - (LN2 * (RA + RB) * C * 1000) / DT)).toBeLessThanOrEqual(2)
    for (const n of discharges) expect(Math.abs(n - (LN2 * RB * C * 1000) / DT)).toBeLessThanOrEqual(2)
    // T57 repeated operation : consecutive cycles have the same length within one step.
    expect(Math.abs(charges[1] - charges[0])).toBeLessThanOrEqual(1)
    expect(Math.abs(discharges[1] - discharges[0])).toBeLessThanOrEqual(1)
  })

  it('T58 deterministic replay : two fresh runtimes, and a reversed component/wire enumeration, give the same sequence', () => {
    const first = run(astable(), 400, DT).rows
    const second = run(astable(), 400, DT).rows
    expect(second).toEqual(first)
    const reversed = run(astable({ reversed: true }), 400, DT).rows
    expect(transitions(reversed)).toEqual(transitions(first))
    expect(reversed.map(({ latch, out, disch }) => [latch, out, disch])).toEqual(first.map(({ latch, out, disch }) => [latch, out, disch]))
    reversed.forEach((row, i) => expect(row.vc).toBeCloseTo(first[i].vc, 12))
  })
})

describe('A11-COMP4 NE555P — REAL RESET and CONT gates', () => {
  it('RESET asserted (wired to GND) wins over TRIG = 0 V ; released (wired to VCC) the comparators act again', () => {
    const session = createSimulationRuntimeSession()
    const held = run(astable({ reset: 'minus' }), 30, 10, session).rows
    for (const row of held) expect(row).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true, vc: 0 })
    // Same session, RESET moved to VCC : TRIG still observes 0 V < VCC/3 -> SET at once.
    const released = run(astable({ reset: 'plus' }), 3, 10, session).rows
    expect(released.map((row) => row.latch)).toEqual(['SET', 'SET', 'SET'])
    expect(released[0]).toMatchObject({ out: Signal.HIGH, disch: false })
  })

  it('CONT driven by a 5 V source : controlled levels (threshold 5 V, trigger 2.5 V) in the real astable', () => {
    const { rows } = run(astable({ cont: 5 }), 400, 10)
    const changes = transitions(rows)
    expect(changes.map((t) => t.latch).slice(0, 4)).toEqual(['SET', 'RESET', 'SET', 'RESET'])
    const [, reset, set] = changes
    expect(at(rows, reset.k - 1).vc).toBeGreaterThan(5)
    expect(at(rows, reset.k - 2).vc).toBeLessThanOrEqual(5)
    expect(at(rows, set.k - 1).vc).toBeLessThan(2.5)
    expect(at(rows, set.k - 2).vc).toBeGreaterThanOrEqual(2.5)
    // Never reaches the nominal 6 V threshold.
    expect(Math.max(...rows.map((row) => row.vc))).toBeLessThan(5.2)
    expectOutputsFollowLatch(rows)
  })
})
