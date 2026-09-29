import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'
import {
  FEEDBACK_MAX_EVALUATIONS, FEEDBACK_SCAN_INTERVALS, FEEDBACK_VOLTAGE_TOLERANCE, solveScalarFeedback,
  stronglyConnectedComponents, validFeedbackBounds,
} from '../controlledAnalogFeedbackSolver.js'

// A11-COMP3-PREQ2 — test-only feedback fixtures. No production feedback type exists.
// Gain law: out = clamp(gain * (plus - minus), 0, high). Bounds: [0, min(supply, high)].
const calls = []
const clamp = (v, high) => Math.min(Math.max(v, 0), high)
const gainLaw = (plus, minus, params) => params.poison === 1 ? NaN : params.poison === 2 ? Infinity
  : clamp(params.gain * (plus - minus), params.high)
const BOUNDS_CASES = [
  ({ supplyVoltages, params }) => ({ min: 0, max: Math.min(supplyVoltages.supply, params.high) }),
  () => ({ min: NaN, max: 3 }),
  () => ({ min: 0, max: Infinity }),
  () => ({ min: -1, max: 3 }),
  () => ({ min: 3, max: 2 }),
]
const feedbackOf = (variableOutputPin, overrides = {}) => ({
  mode: 'scalar-bounded', characteristic: 'single-root', variableOutputPin,
  bounds: (context) => BOUNDS_CASES[context.params.boundsCase](context), ...overrides,
})
const ampGroup = (feedback) => ({
  inputPins: ['plus', 'minus'], outputPins: ['out'],
  contribute: ({ inputVoltages: { plus, minus }, params }) => {
    calls.push('amp')
    return { out: gainLaw(plus, minus, params) }
  },
  ...(feedback ? { feedback } : {}),
})
const ampContract = (feedback) => ({ referencePin: 'reference', requiredPositivePins: ['supply'], groups: [ampGroup(feedback)] })
const AMP_PINS = ['plus', 'minus', 'reference', 'supply', 'out']
const FIXTURES = {
  FEEDBACK_AMP_FIXTURE: { pins: AMP_PINS, contract: ampContract(feedbackOf('out')) },
  NO_OPT_IN_AMP_FIXTURE: { pins: AMP_PINS, contract: ampContract(null) },
  UNDECLARED_CLASS_AMP_FIXTURE: { pins: AMP_PINS, contract: ampContract(feedbackOf('out', { characteristic: undefined })) },
  BISTABLE_AMP_FIXTURE: { pins: AMP_PINS, contract: ampContract(feedbackOf('out', { characteristic: 'bistable' })) },
  WRONG_MODE_AMP_FIXTURE: { pins: AMP_PINS, contract: ampContract(feedbackOf('out', { mode: 'iterative' })) },
  // Non-grouped historical form carrying the same opt-in.
  FLAT_FEEDBACK_AMP_FIXTURE: { pins: AMP_PINS, contract: { referencePin: 'reference', requiredPositivePins: ['supply'],
    inputPins: ['plus', 'minus'], outputPins: ['out'], contribute: ampGroup().contribute, feedback: feedbackOf('out') } },
  // Discontinuous law with huge finite bounds: bisection can only end on the evaluation budget.
  JUMP_FIXTURE: { pins: AMP_PINS, contract: { referencePin: 'reference', requiredPositivePins: ['supply'], groups: [{
    inputPins: ['plus', 'minus'], outputPins: ['out'],
    contribute: ({ inputVoltages: { plus, minus } }) => {
      calls.push('jump')
      return { out: minus < plus ? 2 * plus : 0 }
    },
    feedback: feedbackOf('out', { bounds: () => ({ min: 0, max: 1e300 }) }),
  }] } },
  GROUPED_FEEDBACK_FIXTURE: {
    pins: ['aPlus', 'aMinus', 'aOut', 'bPlus', 'bMinus', 'bOut', 'reference', 'supply'],
    contract: { referencePin: 'reference', requiredPositivePins: ['supply'], groups: ['a', 'b'].map((g) => ({
      inputPins: [`${g}Plus`, `${g}Minus`], outputPins: [`${g}Out`],
      contribute: ({ inputVoltages, params }) => {
        calls.push(g)
        return { [`${g}Out`]: gainLaw(inputVoltages[`${g}Plus`], inputVoltages[`${g}Minus`], params) }
      },
      feedback: feedbackOf(`${g}Out`),
    })) },
  },
}

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getCanonicalEntry: (type) => FIXTURES[type] ? {
    pins: FIXTURES[type].pins.map(id => ({ id })), modelAvailable: true,
    defaultParameters: { gain: 10, high: 3.5, boundsCase: 0, poison: 0 },
    parameterSchema: ['gain', 'high', 'boundsCase', 'poison'].map(key => ({ key, minimum: 0 })),
  } : actual.getCanonicalEntry(type) }
})
vi.mock('../dcVoltageDomainRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getDcVoltageDomainContribution: (type) =>
    FIXTURES[type]?.contract ?? actual.getDcVoltageDomainContribution(type) }
})

const here = dirname(fileURLToPath(import.meta.url))
const src = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const power = (uid, voltage) => ({ uid, type: 'POWER', parameters: { voltage } })
const run = (c) => {
  calls.length = 0
  return resolveSignals(c.components, prepareCircuit(c.components, c.wires))
}
const fact = (result, key) => result.dcVoltageDomains.get(key)
const volts = (result, key) => fact(result, key)?.voltage
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const onlySignals = (result) => [...result.pinSignals.values()].every(v => Object.values(Signal).includes(v))

/**
 * One amplifier `uid` powered by a 5 V `vs` primary (shared ground), a load on
 * its output, and one primary per listed input. Returns a mutable circuit.
 */
function amplifier({ type = 'FEEDBACK_AMP_FIXTURE', uid = 'amp', parameters = {}, inputs = {}, supply = 5,
  isolated = [], circuit = { components: [power('vs', 5)], wires: [] } } = {}) {
  const { components, wires } = circuit
  components.push({ uid, type, parameters }, { uid: `${uid}Load`, type: 'RESISTOR' })
  wires.push(wire('vs', 'GND', uid, 'reference'), wire(uid, 'out', `${uid}Load`, 'A'), wire('vs', 'GND', `${uid}Load`, 'B'))
  if (supply === 5) wires.push(wire('vs', '5V', uid, 'supply'))
  else if (supply !== null) inputs = { ...inputs, supply }
  for (const [pin, voltage] of Object.entries(inputs)) {
    components.push(power(`${uid}_${pin}`, voltage))
    wires.push(wire(`${uid}_${pin}`, '5V', uid, pin))
    if (!isolated.includes(pin)) wires.push(wire(`${uid}_${pin}`, 'GND', 'vs', 'GND'))
  }
  return circuit
}
/** Voltage follower: out wired directly (same net) to minus, Vin on plus. */
function follower(options = {}) {
  const c = amplifier({ ...options, inputs: { plus: options.vin ?? 1, ...options.inputs } })
  c.wires.push(wire(options.uid ?? 'amp', 'out', options.uid ?? 'amp', 'minus'))
  return c
}
const params = (overrides) => ({ gain: 10, high: 3.5, ...overrides })
const residual = (x, vin, p = params()) => Math.abs(gainLaw(vin, x, p) - x)

describe('A11-COMP3-PREQ2 generic controlled-analog feedback solver', () => {
  it('T1 keeps historical feed-forward outputs identical', () => {
    for (const type of ['FEEDBACK_AMP_FIXTURE', 'NO_OPT_IN_AMP_FIXTURE']) {
      const result = run(amplifier({ type, inputs: { plus: 2.25, minus: 2 } }))
      expect(volts(result, 'amp:out')).toBe(2.5)
      expect(result.dcAnalysis.get('ampLoad')).toEqual({ voltage: 2.5, current: 2.5 / 220 })
      expect(volts(run(amplifier({ type, inputs: { plus: 3, minus: 2 } })), 'amp:out')).toBe(3.5)
      expect(volts(run(amplifier({ type, inputs: { plus: 2, minus: 3 } })), 'amp:out')).toBe(0)
    }
  })
  it('T2 solves a scalar follower wired directly out -> minus', () => {
    for (const type of ['FEEDBACK_AMP_FIXTURE', 'FLAT_FEEDBACK_AMP_FIXTURE']) {
      const result = run(follower({ type, vin: 2, parameters: { gain: 100000 } }))
      expect(volts(result, 'amp:out')).toBeCloseTo(2, 4)
      expect(volts(result, 'amp:minus')).toBe(volts(result, 'amp:out'))
      expect(fact(result, 'amp:out').reference).toBe(fact(result, 'amp:reference').reference)
      expect(result.dcAnalysis.get('ampLoad').voltage).toBe(volts(result, 'amp:out'))
    }
  })
  it('T3 moderate finite gain reaches A/(1+A) * Vin within tolerance', () => {
    for (const vin of [0.5, 1, 2.2]) {
      const x = volts(run(follower({ vin })), 'amp:out')
      expect(Math.abs(x - 10 / 11 * vin)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    }
  })
  it('T4 high finite gain converges through PREQ2 instead of a null deadlock', () => {
    for (const vin of [0.25, 1, 3]) {
      const x = volts(run(follower({ vin, parameters: { gain: 100000 } })), 'amp:out')
      expect(Math.abs(x - 100000 / 100001 * vin)).toBeLessThanOrEqual(1e-9)
    }
  })
  it('T5 solutions respect the declared bounds; saturation is deterministic', () => {
    const saturated = run(follower({ vin: 4 }))
    expect(volts(saturated, 'amp:out')).toBe(3.5)
    const zero = run(follower({ vin: 0.1, inputs: { plus: 0.1 }, parameters: { gain: 10 } }))
    expect(volts(zero, 'amp:out')).toBeGreaterThanOrEqual(0)
    // Supply 3 V bounds the output to [0, 3] while the law demands 3.5 V: no admissible root.
    const bounded = run(follower({ vin: 4, supply: 3 }))
    expect(volts(bounded, 'amp:supply')).toBe(3)
    expect(fact(bounded, 'amp:out')).toBeNull()
    for (const vin of [0.3, 1.7, 3.2]) {
      const x = volts(run(follower({ vin })), 'amp:out')
      expect(x >= 0 && x <= 3.5).toBe(true)
    }
  })
  it('T6 invalid bounds (NaN, Infinity, min < 0, max < min) give a local null', () => {
    for (const boundsCase of [1, 2, 3, 4]) {
      const result = run(follower({ parameters: { boundsCase } }))
      expect(fact(result, 'amp:out')).toBeNull()
      expect(volts(result, 'amp:plus')).toBe(1)
    }
    expect([[NaN, 1], [0, Infinity], [-1, 1], [2, 1], [0, -0.5]].some(([min, max]) => validFeedbackBounds({ min, max })))
      .toBe(false)
    expect(validFeedbackBounds(null)).toBe(false)
  })
  it('T7 a non-finite contribution during solving gives a local null without throwing', () => {
    for (const poison of [1, 2]) {
      const result = run(follower({ parameters: { poison } }))
      expect(fact(result, 'amp:out')).toBeNull()
      expect(volts(result, 'amp:plus')).toBe(1)
    }
  })
  it('T8 a cyclic group without feedback opt-in is never solved', () => {
    const result = run(follower({ type: 'NO_OPT_IN_AMP_FIXTURE' }))
    expect(fact(result, 'amp:out')).toBeNull()
    expect(calls).toEqual([])
  })
  it('T9 a cyclic group without the single-root characteristic (or mode) stays null', () => {
    for (const type of ['UNDECLARED_CLASS_AMP_FIXTURE', 'WRONG_MODE_AMP_FIXTURE']) {
      expect(fact(run(follower({ type })), 'amp:out')).toBeNull()
      expect(calls).toEqual([])
    }
  })
  it('T10 positive / bistable feedback stays null and never picks a rail', () => {
    expect(fact(run(follower({ type: 'BISTABLE_AMP_FIXTURE' })), 'amp:out')).toBeNull()
    for (const high of [3.5, 5]) {
      const c = amplifier({ inputs: { minus: 1 }, parameters: { high } })
      c.wires.push(wire('amp', 'out', 'amp', 'plus'))
      const result = run(c)
      expect(fact(result, 'amp:out')).toBeNull()
      expect(volts(result, 'amp:minus')).toBe(1)
    }
  })
  it('T11 no self-start and no back-power', () => {
    const unpowered = follower({ supply: null })
    const noExcitation = amplifier()
    noExcitation.wires.push(wire('amp', 'out', 'amp', 'plus'), wire('amp', 'out', 'amp', 'minus'))
    const floatingVin = amplifier()
    floatingVin.wires.push(wire('amp', 'out', 'amp', 'minus'))
    const noPrimary = { components: [{ uid: 'amp', type: 'FEEDBACK_AMP_FIXTURE' }], wires: [wire('amp', 'out', 'amp', 'minus')] }
    for (const c of [unpowered, noExcitation, floatingVin, noPrimary]) {
      const result = run(c)
      expect(fact(result, 'amp:out') ?? null).toBeNull()
      expect(result.dcAnalysis.has('ampLoad')).toBe(false)
      expect(calls).toEqual([])
    }
  })
  it('T12 feedback inputs or supply of another reference domain give a local null', () => {
    for (const isolated of [['plus'], ['supply']]) {
      const result = run(follower({ supply: 4, isolated }))
      expect(fact(result, 'amp:out')).toBeNull()
    }
  })
  it('T13 a primary authority on the feedback output net conflicts, no averaging or override', () => {
    const c = follower()
    c.components.push(power('forced', 2))
    c.wires.push(wire('forced', '5V', 'amp', 'out'), wire('forced', 'GND', 'vs', 'GND'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = run({ ...c, components })
      expect(fact(result, 'amp:out')).toBeNull()
      expect(fact(result, 'forced:5V')).toBeNull()
      expect(calls).toEqual([])
    }
  })
  /** Grouped fixture: group A follower (aOut -> aMinus), group B feed-forward or follower. */
  function grouped({ bFollower = false, aExcited = true } = {}) {
    const components = [power('vs', 5), { uid: 'g', type: 'GROUPED_FEEDBACK_FIXTURE' }]
    const wires = [wire('vs', '5V', 'g', 'supply'), wire('vs', 'GND', 'g', 'reference'), wire('g', 'aOut', 'g', 'aMinus')]
    const inputs = { bPlus: 2.25, ...(bFollower ? {} : { bMinus: 2 }), ...(aExcited ? { aPlus: 1 } : {}) }
    if (!aExcited) wires.push(wire('g', 'aOut', 'g', 'aPlus'))
    if (bFollower) wires.push(wire('g', 'bOut', 'g', 'bMinus'))
    for (const [pin, voltage] of Object.entries(inputs)) {
      components.push(power(`v_${pin}`, voltage))
      wires.push(wire(`v_${pin}`, '5V', 'g', pin), wire(`v_${pin}`, 'GND', 'vs', 'GND'))
    }
    return { components, wires }
  }
  it('T14 a feedback group and a feed-forward group of one component resolve independently', () => {
    const result = run(grouped())
    expect(Math.abs(volts(result, 'g:aOut') - 10 / 11)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    expect(volts(result, 'g:bOut')).toBe(2.5)
  })
  it('T15 a failed feedback group does not affect the feed-forward group', () => {
    const result = run(grouped({ aExcited: false }))
    expect(fact(result, 'g:aOut')).toBeNull()
    expect(volts(result, 'g:bOut')).toBe(2.5)
  })
  it('T16 two independent scalar feedback loops each solve', () => {
    const result = run(grouped({ bFollower: true }))
    expect(Math.abs(volts(result, 'g:aOut') - 10 / 11)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    expect(Math.abs(volts(result, 'g:bOut') - 10 / 11 * 2.25)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    const c = follower({ uid: 'a1', vin: 1 })
    follower({ uid: 'a2', vin: 2, circuit: c })
    const two = run(c)
    expect(Math.abs(volts(two, 'a1:out') - 10 / 11)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    expect(Math.abs(volts(two, 'a2:out') - 20 / 11)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
  })
  it('T17 two mutually coupled unknowns (multivariable SCC) stay null', () => {
    const c = amplifier({ uid: 'a1', inputs: { plus: 1 } })
    amplifier({ uid: 'a2', inputs: { plus: 2 }, circuit: c })
    c.wires.push(wire('a1', 'out', 'a2', 'minus'), wire('a2', 'out', 'a1', 'minus'))
    const result = run(c)
    expect(fact(result, 'a1:out')).toBeNull()
    expect(fact(result, 'a2:out')).toBeNull()
    expect(calls).toEqual([])
  })
  const topologies = () => [follower(), follower({ parameters: { gain: 100000 }, vin: 3 }), grouped(), grouped({ bFollower: true }),
    grouped({ aExcited: false }), follower({ supply: 3, vin: 4 })]
  it('T18 results are independent of component and wire order', () => {
    for (const c of topologies()) {
      const expected = normalized(run(c))
      for (let i = 0; i < c.components.length; i++) {
        const components = [...c.components.slice(i), ...c.components.slice(0, i)]
        const wires = [...c.wires.slice(i % c.wires.length), ...c.wires.slice(0, i % c.wires.length)]
        expect(normalized(run({ components, wires }))).toEqual(expected)
        expect(normalized(run({ components: [...components].reverse(), wires: [...wires].reverse() }))).toEqual(expected)
      }
    }
  })
  it('T19 repeated executions are identical', () => {
    for (const c of topologies()) {
      const first = normalized(run(c))
      for (let i = 0; i < 4; i++) expect(normalized(run(c))).toEqual(first)
    }
  })
  it('T20 pinSignals stay exclusively Signal.*', () => {
    for (const c of topologies()) {
      const result = run(c)
      expect(onlySignals(result)).toBe(true)
      expect([...result.pinSignals.values()].some(v => typeof v === 'number')).toBe(false)
    }
  })
  it('T21 historical VOLTAGE_REGULATOR is unchanged and can power a feedback group', () => {
    const regulator = (voltage) => ({
      components: [power('src', voltage), { uid: 'reg', type: 'VOLTAGE_REGULATOR', parameters: { outputVoltage: 5 } },
        { uid: 'load', type: 'RESISTOR' }],
      wires: [wire('src', '5V', 'reg', 'IN'), wire('src', 'GND', 'reg', 'GND'), wire('reg', 'OUT', 'load', 'A'), wire('reg', 'GND', 'load', 'B')],
    })
    const ok = run(regulator(12))
    expect(volts(ok, 'reg:OUT')).toBe(5)
    expect(ok.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 220 })
    expect(fact(run(regulator(3)), 'reg:OUT')).toBeNull()
    const c = regulator(12)
    c.components.push({ uid: 'amp', type: 'FEEDBACK_AMP_FIXTURE' }, power('vin', 1))
    c.wires.push(wire('reg', 'OUT', 'amp', 'supply'), wire('src', 'GND', 'amp', 'reference'), wire('amp', 'out', 'amp', 'minus'),
      wire('vin', '5V', 'amp', 'plus'), wire('vin', 'GND', 'src', 'GND'))
    const chained = run(c)
    expect(volts(chained, 'reg:OUT')).toBe(5)
    expect(Math.abs(volts(chained, 'amp:out') - 10 / 11)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
  })
  it('T22 PREQ1 independent groups are unchanged: an unresolved input of B leaves the A loop solved', () => {
    const c = grouped()
    c.wires = c.wires.filter(w => !(w.toUid === 'g' && w.toPin === 'bMinus'))
    const result = run(c)
    expect(fact(result, 'g:bOut')).toBeNull()
    expect(Math.abs(volts(result, 'g:aOut') - 10 / 11)).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
  })
  /** LM393P channel 1 with a 5 V pull-up on 1OUT; `amp` feeds 1IN- and 1OUT feeds amp.minus. */
  function conductorLoop(type) {
    const c = amplifier({ type, inputs: { plus: 1 } })
    c.components.push({ uid: 'cmp', type: 'LM393P' }, { uid: 'pull', type: 'RESISTOR' }, power('ref', 2))
    c.wires.push(wire('vs', '5V', 'cmp', 'VCC'), wire('vs', 'GND', 'cmp', 'GND'), wire('vs', '5V', 'pull', 'A'),
      wire('pull', 'B', 'cmp', '1OUT'), wire('ref', '5V', 'cmp', '1IN+'), wire('ref', 'GND', 'vs', 'GND'),
      wire('amp', 'out', 'cmp', '1IN-'), wire('cmp', '1OUT', 'amp', 'minus'))
    return c
  }
  it('T23 analog conditional conduction fed by a solved loop keeps its semantics', () => {
    // Follower output 10/11 V on 1IN- vs 2 V on 1IN+: V+ > V- keeps the open collector high-Z.
    const c = follower()
    c.components.push({ uid: 'cmp', type: 'LM393P' }, { uid: 'pull', type: 'RESISTOR' }, power('ref', 2))
    c.wires.push(wire('vs', '5V', 'cmp', 'VCC'), wire('vs', 'GND', 'cmp', 'GND'), wire('vs', '5V', 'pull', 'A'),
      wire('pull', 'B', 'cmp', '1OUT'), wire('ref', '5V', 'cmp', '1IN+'), wire('ref', 'GND', 'vs', 'GND'),
      wire('amp', 'out', 'cmp', '1IN-'))
    const high = run(c)
    expect(volts(high, 'cmp:1OUT')).toBe(5)
    c.wires = c.wires.map(w => w.toPin === '1IN-' ? { ...w, toPin: '1IN+' } : w.fromUid === 'ref' && w.toPin === '1IN+' ? { ...w, toPin: '1IN-' } : w)
    const low = run(c)
    expect(volts(low, 'cmp:1OUT')).toBe(0)
  })
  it('T24 a resistor in the feedback path is never solved as a divider', () => {
    const series = amplifier({ inputs: { plus: 1 } })
    series.components.push({ uid: 'r1', type: 'RESISTOR' })
    series.wires.push(wire('amp', 'out', 'r1', 'A'), wire('r1', 'B', 'amp', 'minus'))
    const divider = amplifier({ inputs: { plus: 1 } })
    divider.components.push({ uid: 'r1', type: 'RESISTOR' }, { uid: 'r2', type: 'RESISTOR' })
    divider.wires.push(wire('amp', 'out', 'r1', 'A'), wire('r1', 'B', 'amp', 'minus'), wire('amp', 'minus', 'r2', 'A'),
      wire('r2', 'B', 'vs', 'GND'))
    for (const c of [series, divider]) {
      const result = run(c)
      expect(fact(result, 'amp:out')).toBeNull()
      expect(calls).toEqual([])
      // With R1 = R2 a nodal divider would give minus = out / 2 and out = 10/6 V: neither exists.
      expect(volts(result, 'amp:minus') ?? null).not.toBe(5 / 6)
      expect(volts(result, 'amp:out') ?? null).not.toBe(10 / 6)
    }
  })
  it('T25 a loop through analog conditional conduction is never a PREQ2 scalar loop', () => {
    expect(normalized(run(conductorLoop('FEEDBACK_AMP_FIXTURE'))).dcVoltageDomains)
      .toEqual(normalized(run(conductorLoop('NO_OPT_IN_AMP_FIXTURE'))).dcVoltageDomains)
    // A direct follower whose output net is also driven by an open collector is not solved either.
    const c = follower()
    c.components.push({ uid: 'cmp', type: 'LM393P' }, power('ref', 2))
    c.wires.push(wire('vs', '5V', 'cmp', 'VCC'), wire('vs', 'GND', 'cmp', 'GND'), wire('ref', '5V', 'cmp', '1IN+'),
      wire('ref', 'GND', 'vs', 'GND'), wire('vs', '5V', 'cmp', '1IN-'), wire('cmp', '1OUT', 'amp', 'out'))
    const result = run(c)
    expect(fact(result, 'amp:out')).toBeNull()
    expect(calls).toEqual([])
  })
  it('T26 a supported-shape law that cannot meet the residual ends on the budget with a local null', () => {
    const result = run(follower({ type: 'JUMP_FIXTURE' }))
    expect(fact(result, 'amp:out')).toBeNull()
    expect(volts(result, 'amp:plus')).toBe(1)
    let evaluations = 0
    const x = solveScalarFeedback((v) => {
      evaluations++
      return v < 1 ? 2 : 0
    }, { min: 0, max: 1e300 })
    expect(x).toBeNull()
    expect(evaluations).toBe(FEEDBACK_MAX_EVALUATIONS)
    // A jump at an ordinary scale ends earlier, on the exhausted floating-point interval.
    evaluations = 0
    expect(solveScalarFeedback((v) => { evaluations++; return v < 0.5 ? 1 : 0 }, { min: 0, max: 1 })).toBeNull()
    expect(evaluations).toBeLessThanOrEqual(FEEDBACK_MAX_EVALUATIONS)
  })
  it('T27 every published solution satisfies the explicit residual tolerance', () => {
    expect(FEEDBACK_VOLTAGE_TOLERANCE).toBe(1e-6)
    expect(FEEDBACK_MAX_EVALUATIONS).toBe(128)
    expect(FEEDBACK_SCAN_INTERVALS).toBe(16)
    for (const [gain, vin] of [[10, 1], [10, 2.2], [1000, 0.7], [100000, 1], [100000, 3.3]]) {
      const x = volts(run(follower({ vin, parameters: { gain } })), 'amp:out')
      expect(residual(x, vin, params({ gain }))).toBeLessThanOrEqual(FEEDBACK_VOLTAGE_TOLERANCE)
    }
    // Scalar-level classification: a rising residual (positive feedback) is rejected; a single restoring root is found.
    expect(solveScalarFeedback((x) => clamp(10 * (x - 1), 3.5), { min: 0, max: 3.5 })).toBeNull()
    expect(solveScalarFeedback((x) => x, { min: 0, max: 3 })).toBeNull()
    expect(solveScalarFeedback(() => 1, { min: 2, max: 2 })).toBeNull()
    expect(solveScalarFeedback(() => 2, { min: 2, max: 2 })).toBe(2)
    expect(stronglyConnectedComponents([[1], [0], [2], []])).toEqual({ component: [0, 0, 1, 2], cyclic: [true, true, false] })
  })
  it('T28 Open/Closed: no type-specific branch in the resolver, solver or registry', async () => {
    for (const name of ['resolution.js', 'controlledAnalogFeedbackSolver.js', 'dcVoltageDomainRegistry.js']) {
      expect(src(name)).not.toMatch(/LM358|OP_?AMP|555|556|4N35|FIXTURE|COMPARATOR/i)
      const code = executable(src(name))
      expect(code).not.toMatch(/switch\s*\([^)]*\.type/)
      expect(code).not.toMatch(/Date\.now|new Date|performance\.now|Math\.random|setTimeout|setInterval/)
    }
    expect(executable(src('resolution.js')).match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g))
      .toEqual(['comp.type !== "ARDUINO"'])
    expect(src('controlledAnalogFeedbackSolver.js')).not.toMatch(/\bimport\b/)
    const registry = await vi.importActual('../dcVoltageDomainRegistry.js')
    for (const type of Object.keys(FIXTURES)) expect(registry.hasDcVoltageDomainContribution(type)).toBe(false)
  })
})
