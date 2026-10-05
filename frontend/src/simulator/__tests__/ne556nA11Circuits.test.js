import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSimulationRuntimeSession, runSimulationStep } from '../simulationRuntimeIntegration.js'
import { Signal } from '../signals.js'

/**
 * A11-COMP5 — TI NE556N REAL circuit gates (C01..C08).
 * Only production types (NE556N, NE555P, RESISTOR, CAPACITOR, BATTERY_9V, BUTTON), real wires
 * and the real runtime stepping : no mocked pin voltage, no fixture contributor. The only
 * instrumentation is a transparent probe on resolveSignals() (ONE resolution per step, and
 * the xDISCH-GND conduction pairs it receives as plain step data).
 *
 * Timing emerges ONLY from the external R / C of each channel (PREQ4 / PREQ5) : the SAMPLE of
 * step k observes the capacitor state committed by step k-1 (same causal reading as NE555P).
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
const resistor = (uid, resistance) => ({ uid, type: 'RESISTOR', parameters: { resistance } })
const capacitor = (uid, capacitance) => ({ uid, type: 'CAPACITOR', parameters: { capacitance } })
const LN2 = Math.log(2)
const LN3 = Math.log(3)

/** Per-channel external networks ; timing differs between channels so independence is visible. */
const ASTABLE = { 1: { ra: 1000, rb: 10000, c: 1e-4 }, 2: { ra: 1000, rb: 4700, c: 1e-4 } }
const MONOSTABLE = { 1: { r: 10000, c: 1e-5 }, 2: { r: 20000, c: 1e-5 } }

/**
 * Channel n of the NE556N `u` : 'astable' (VCC - RA - nDISCH - RB - (nTHRES, nTRIG, C) - GND),
 * 'monostable' (VCC - R - (nDISCH, nTHRES, C) - GND, nTRIG pulled up by RP and pulled to GND by
 * a BUTTON while pressed) or 'idle' (no wire at all). nRESET on `reset` ('plus' = released,
 * 'minus' = asserted) ; nCONT never driven.
 */
function channel(n, mode, { reset = 'plus', pressed = false } = {}) {
  const p = (pin) => `${n}${pin}`
  if (mode === 'idle') return { components: [], wires: [] }
  if (mode === 'astable') {
    const { ra, rb, c } = ASTABLE[n]
    return {
      components: [resistor(`ra${n}`, ra), resistor(`rb${n}`, rb), capacitor(`c${n}`, c)],
      wires: [
        wire('bat', reset, 'u', p('RESET')), wire('bat', 'plus', `ra${n}`, 'A'),
        wire(`ra${n}`, 'B', 'u', p('DISCH')), wire(`rb${n}`, 'A', 'u', p('DISCH')), wire(`rb${n}`, 'B', 'u', p('THRES')),
        wire('u', p('THRES'), 'u', p('TRIG')), wire('u', p('TRIG'), `c${n}`, 'pinA'), wire(`c${n}`, 'pinB', 'bat', 'minus'),
      ],
    }
  }
  const { r, c } = MONOSTABLE[n]
  return {
    components: [resistor(`r${n}`, r), resistor(`rp${n}`, 10000), capacitor(`c${n}`, c), { uid: `sw${n}`, type: 'BUTTON', ...(pressed ? { state: 'pressed' } : {}) }],
    wires: [
      wire('bat', reset, 'u', p('RESET')), wire('bat', 'plus', `r${n}`, 'A'),
      wire(`r${n}`, 'B', 'u', p('DISCH')), wire('u', p('DISCH'), 'u', p('THRES')), wire('u', p('THRES'), `c${n}`, 'pinA'),
      wire(`c${n}`, 'pinB', 'bat', 'minus'),
      wire('bat', 'plus', `rp${n}`, 'A'), wire(`rp${n}`, 'B', 'u', p('TRIG')), wire('u', p('TRIG'), `sw${n}`, 'pin1'), wire(`sw${n}`, 'pin2', 'bat', 'minus'),
    ],
  }
}

/** One NE556N package : common VCC / GND (VCC wire removable to cut the common supply). */
function ne556n({ ch1 = 'idle', ch2 = 'idle', opts1 = {}, opts2 = {}, vcc = true } = {}) {
  const one = channel(1, ch1, opts1)
  const two = channel(2, ch2, opts2)
  return {
    components: [battery, { uid: 'u', type: 'NE556N', parameters: {} }, ...one.components, ...two.components],
    wires: [...(vcc ? [wire('bat', 'plus', 'u', 'VCC')] : []), wire('u', 'GND', 'bat', 'minus'), ...one.wires, ...two.wires],
  }
}

const dischargeClosed = (args, pin) => (args[3]?.conductionPairs ?? []).some(({ uid, pinA, pinB }) => uid === 'u' && pinA === pin && pinB === 'GND')

/** Steps a circuit (or a step -> circuit function) from a fresh runtime session ; one row per step. */
function run(circuitAt, steps, dt, session = createSimulationRuntimeSession()) {
  const rows = []
  for (let k = 1; k <= steps; k++) {
    const { components, wires } = typeof circuitAt === 'function' ? circuitAt(k) : circuitAt
    const before = resolutions.length
    const { pinSignals } = runSimulationStep(components, wires, { dt, runtimeSession: session })
    expect(resolutions.length - before, `ONE resolution at step ${k}`).toBe(1)
    const args = resolutions[resolutions.length - 1]
    const state = session.mixedSignalStates.get('u')
    rows.push({
      k,
      ch: {
        1: { latch: state?.timer1?.latch, out: pinSignals.get('u:1OUT'), disch: dischargeClosed(args, '1DISCH'), vc: session.electricalTransientStates.get('c1')?.voltage },
        2: { latch: state?.timer2?.latch, out: pinSignals.get('u:2OUT'), disch: dischargeClosed(args, '2DISCH'), vc: session.electricalTransientStates.get('c2')?.voltage },
      },
    })
  }
  return { rows, session }
}

/** Rows of ONE channel, in the NE555P row shape. */
const of = (rows, n) => rows.map(({ k, ch }) => ({ k, ...ch[n] }))
const transitions = (rows) => rows.filter((row, i) => i > 0 && row.latch !== rows[i - 1].latch).map(({ k, latch }) => ({ k, latch }))
const at = (rows, k) => rows[k - 1]

function expectOutputsFollowLatch(rows, n) {
  for (const row of rows) {
    expect(row.out, `${n}OUT at step ${row.k}`).toBe(row.latch === 'SET' ? Signal.HIGH : Signal.LOW)
    expect(row.disch, `${n}DISCH at step ${row.k}`).toBe(row.latch === 'RESET')
  }
}

/** Monostable pulse of channel n : released, pressed at step TRIGGER only, then released. */
function expectMonostablePulse(rows, n, trigger, dt) {
  const { r, c } = MONOSTABLE[n]
  for (let k = 1; k < trigger; k++) expect(at(rows, k)).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true, vc: undefined })
  expect(at(rows, trigger)).toMatchObject({ latch: 'SET', out: Signal.HIGH, disch: false })
  const [set, reset, ...rest] = transitions(rows)
  expect(set).toEqual({ k: trigger, latch: 'SET' })
  expect(reset.latch).toBe('RESET')
  expect(rest).toEqual([])
  const charge = rows.slice(trigger - 1, reset.k - 1).map((row) => row.vc)
  charge.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(charge[i]))
  expect(at(rows, trigger).vc).toBeCloseTo(9 * (1 - Math.exp(-(dt / 1000) / (r * c))), 12)
  expect(at(rows, reset.k - 1).vc).toBeGreaterThan(6)
  expect(at(rows, reset.k - 2).vc).toBeLessThanOrEqual(6)
  for (const row of rows.slice(reset.k - 1)) expect(row).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true })
  expectOutputsFollowLatch(rows, n)
  expect(Math.abs(reset.k - set.k - (LN3 * r * c * 1000) / dt)).toBeLessThanOrEqual(1.5)
}

/** Astable channel n : SET / charge (RA + RB) -> RESET / discharge (RB) repeated, from external R / C. */
function expectAstable(rows, n, dt) {
  const { ra, rb, c } = ASTABLE[n]
  const changes = transitions(rows)
  expect(at(rows, 1)).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true, vc: 0 })
  expect(changes[0]).toEqual({ k: 2, latch: 'SET' })
  expect(changes.map((t) => t.latch).slice(0, 6)).toEqual(['SET', 'RESET', 'SET', 'RESET', 'SET', 'RESET'])
  expectOutputsFollowLatch(rows, n)
  const phases = changes.map((t, i) => ({ ...t, end: (changes[i + 1]?.k ?? rows.length + 1) - 1 }))
  for (const phase of phases) {
    const vs = rows.slice(phase.k - 1, phase.end).map((row) => row.vc)
    for (let i = 1; i < vs.length; i++) {
      if (phase.latch === 'SET') expect(vs[i], `${n} charge at step ${phase.k + i}`).toBeGreaterThan(vs[i - 1])
      else expect(vs[i], `${n} discharge at step ${phase.k + i}`).toBeLessThan(vs[i - 1])
    }
    if (phase.k === 2) continue
    if (phase.latch === 'RESET') {
      expect(at(rows, phase.k - 1).vc).toBeGreaterThan(6)
      expect(at(rows, phase.k - 2).vc).toBeLessThanOrEqual(6)
    } else {
      expect(at(rows, phase.k - 1).vc).toBeLessThan(3)
      expect(at(rows, phase.k - 2).vc).toBeGreaterThanOrEqual(3)
    }
  }
  const lengths = (latch) => phases.filter((p) => p.latch === latch && p.k !== 2 && p.end < rows.length).map((p) => p.end - p.k + 1)
  const charges = lengths('SET')
  const discharges = lengths('RESET').slice(1)
  expect(charges.length).toBeGreaterThanOrEqual(2)
  expect(discharges.length).toBeGreaterThanOrEqual(2)
  for (const len of charges) expect(Math.abs(len - (LN2 * (ra + rb) * c * 1000) / dt)).toBeLessThanOrEqual(2)
  for (const len of discharges) expect(Math.abs(len - (LN2 * rb * c * 1000) / dt)).toBeLessThanOrEqual(2)
  expect(Math.abs(charges[1] - charges[0])).toBeLessThanOrEqual(1)
  expect(Math.abs(discharges[1] - discharges[0])).toBeLessThanOrEqual(1)
}

const IDLE_RESET = { latch: 'RESET', out: Signal.LOW, disch: true, vc: undefined }

describe('A11-COMP5 NE556N — REAL monostables (C01, C02)', () => {
  const DT = 5
  const TRIGGER = 6

  it('C01 timer1 monostable : one pulse ~ ln(3) R1 C1 ; timer2 (unwired) stays RESET throughout', () => {
    const { rows } = run((k) => ne556n({ ch1: 'monostable', opts1: { pressed: k === TRIGGER } }), 120, DT)
    expectMonostablePulse(of(rows, 1), 1, TRIGGER, DT)
    for (const row of of(rows, 2)) expect(row).toMatchObject(IDLE_RESET)
  })

  it('C02 timer2 monostable : one pulse ~ ln(3) R2 C2 ; timer1 (unwired) stays RESET throughout', () => {
    const { rows } = run((k) => ne556n({ ch2: 'monostable', opts2: { pressed: k === TRIGGER } }), 160, DT)
    expectMonostablePulse(of(rows, 2), 2, TRIGGER, DT)
    for (const row of of(rows, 1)) expect(row).toMatchObject(IDLE_RESET)
  })
})

describe('A11-COMP5 NE556N — REAL astables (C03, C04)', () => {
  const DT = 10

  it('C03 timer1 astable from external RA1 / RB1 / C1 ; timer2 (unwired) stays RESET', () => {
    const { rows, session } = run(ne556n({ ch1: 'astable' }), 500, DT)
    expect(session.scheduler.getCurrentTime()).toBe(500 * DT)
    expectAstable(of(rows, 1), 1, DT)
    for (const row of of(rows, 2)) expect(row).toMatchObject(IDLE_RESET)
  })

  it('C03 common law : timer1 reproduces EXACTLY the NE555P astable built with the same external network', () => {
    const { ra, rb, c } = ASTABLE[1]
    const ne555p = {
      components: [battery, { uid: 'u', type: 'NE555P', parameters: {} }, resistor('ra1', ra), resistor('rb1', rb), capacitor('c1', c)],
      wires: [
        wire('bat', 'plus', 'u', 'VCC'), wire('bat', 'plus', 'u', 'RESET'), wire('bat', 'plus', 'ra1', 'A'),
        wire('ra1', 'B', 'u', 'DISCH'), wire('rb1', 'A', 'u', 'DISCH'), wire('rb1', 'B', 'u', 'THRES'),
        wire('u', 'THRES', 'u', 'TRIG'), wire('u', 'TRIG', 'c1', 'pinA'), wire('c1', 'pinB', 'bat', 'minus'), wire('u', 'GND', 'bat', 'minus'),
      ],
    }
    const session = createSimulationRuntimeSession()
    const reference = []
    for (let k = 1; k <= 400; k++) {
      runSimulationStep(ne555p.components, ne555p.wires, { dt: DT, runtimeSession: session })
      reference.push({ latch: session.mixedSignalStates.get('u').latch, vc: session.electricalTransientStates.get('c1')?.voltage })
    }
    const timer1 = of(run(ne556n({ ch1: 'astable' }), 400, DT).rows, 1)
    expect(timer1.map((row) => row.latch)).toEqual(reference.map((row) => row.latch))
    timer1.forEach((row, i) => expect(row.vc).toBeCloseTo(reference[i].vc, 12))
  })

  it('C04 timer2 astable from external RA2 / RB2 / C2 ; timer1 (unwired) stays RESET', () => {
    const { rows } = run(ne556n({ ch2: 'astable' }), 500, DT)
    expectAstable(of(rows, 2), 2, DT)
    for (const row of of(rows, 1)) expect(row).toMatchObject(IDLE_RESET)
  })
})

describe('A11-COMP5 NE556N — REAL independence and common supply (C05..C08)', () => {
  const DT = 10
  const STEPS = 500
  const alone = (n) => of(run(ne556n({ [`ch${n}`]: 'astable' }), STEPS, DT).rows, n)

  it('C05 timer1 astable while timer2 is held in RESET (2RESET on GND) : no interaction either way', () => {
    const { rows } = run(ne556n({ ch1: 'astable', ch2: 'astable', opts2: { reset: 'minus' } }), STEPS, DT)
    expectAstable(of(rows, 1), 1, DT)
    expect(of(rows, 1)).toEqual(alone(1))
    for (const row of of(rows, 2)) expect(row).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true, vc: 0 })
  })

  it('C05 both channels astable at once : each one equals its own isolated run (different periods)', () => {
    const { rows } = run(ne556n({ ch1: 'astable', ch2: 'astable' }), STEPS, DT)
    expect(of(rows, 1)).toEqual(alone(1))
    expect(of(rows, 2)).toEqual(alone(2))
    expect(transitions(of(rows, 1))).not.toEqual(transitions(of(rows, 2)))
  })

  it('C06 losing the common supply (VCC wire removed) disables BOTH channels : RESET, no OUT drive, no DISCH conduction', () => {
    const CUT = 150
    const { rows } = run((k) => ne556n({ ch1: 'astable', ch2: 'astable', vcc: k < CUT }), 250, DT)
    expect(transitions(of(rows, 1).slice(0, CUT - 1)).length).toBeGreaterThan(1)
    expect(transitions(of(rows, 2).slice(0, CUT - 1)).length).toBeGreaterThan(1)
    for (const row of rows.slice(CUT - 1)) {
      for (const n of [1, 2]) {
        expect(row.ch[n].latch, `${n} latch at step ${row.k}`).toBe('RESET')
        expect(row.ch[n].out, `${n}OUT at step ${row.k}`).not.toBe(Signal.HIGH)
        expect(row.ch[n].out, `${n}OUT at step ${row.k}`).not.toBe(Signal.LOW)
        expect(row.ch[n].disch, `${n}DISCH at step ${row.k}`).toBe(false)
      }
    }
  })

  it('C07 asserting 1RESET during timer2 activity does not disturb timer2', () => {
    const HOLD = 120
    const { rows } = run((k) => ne556n({ ch1: 'astable', ch2: 'astable', opts1: { reset: k < HOLD ? 'plus' : 'minus' } }), STEPS, DT)
    expect(of(rows, 2)).toEqual(alone(2))
    expect(of(rows, 1).slice(0, HOLD - 1)).toEqual(alone(1).slice(0, HOLD - 1))
    for (const row of of(rows, 1).slice(HOLD - 1)) expect(row).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true })
  })

  it('C08 asserting 2RESET during timer1 activity does not disturb timer1', () => {
    const HOLD = 120
    const { rows } = run((k) => ne556n({ ch1: 'astable', ch2: 'astable', opts2: { reset: k < HOLD ? 'plus' : 'minus' } }), STEPS, DT)
    expect(of(rows, 1)).toEqual(alone(1))
    expect(of(rows, 2).slice(0, HOLD - 1)).toEqual(alone(2).slice(0, HOLD - 1))
    for (const row of of(rows, 2).slice(HOLD - 1)) expect(row).toMatchObject({ latch: 'RESET', out: Signal.LOW, disch: true })
  })
})
