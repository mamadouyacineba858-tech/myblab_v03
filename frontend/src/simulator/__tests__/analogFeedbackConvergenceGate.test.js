import { describe, it, expect, vi } from 'vitest'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'

/**
 * A11-COMP3-LM358P — FEEDBACK/CONVERGENCE GATE (architecture evidence, test-only).
 *
 * Question: can the CURRENT generic controlled-DC-domain resolver converge on
 * the feedback structures a Level-1 op-amp model would need? No production
 * code, registration or asset is involved: both fixtures below are injected
 * through vi.mock() exactly like A11-ANALOG-PREQ1.
 *
 * FEEDBACK_GAIN_FIXTURE — pure, stateless finite-gain law:
 *   Vd = V(plus) - V(minus); Vout = clamp(gain * Vd, V_LOW = 0 V, V_HIGH = 3.5 V)
 *   Equal inputs give Vd = 0, hence Vout = V_LOW (no "hold previous output" rule).
 * ANALOG_SCALE_FIXTURE — pure attenuator: Vout = k * Vin (0 < k < 1).
 *
 * Tests named "counter-proof" encode a demonstrated LIMITATION of the current
 * resolver, not desired op-amp behaviour.
 */
const V_HIGH = 3.5
const clamp = (v) => Math.min(Math.max(v, 0), V_HIGH)
const calls = []
const FIXTURES = {
  FEEDBACK_GAIN_FIXTURE: {
    pins: ['plus', 'minus', 'reference', 'supply', 'out'], parameter: 'gain', defaults: { gain: 10 },
    contract: {
      referencePin: 'reference', requiredPositivePins: ['supply'], inputPins: ['plus', 'minus'], outputPins: ['out'],
      contribute: ({ inputVoltages: { plus, minus }, params }) => {
        calls.push('gain')
        return { out: clamp(params.gain * (plus - minus)) }
      },
    },
  },
  ANALOG_SCALE_FIXTURE: {
    pins: ['in', 'reference', 'out'], parameter: 'k', defaults: { k: 0.5 },
    contract: {
      inputPins: ['in'], referencePin: 'reference', outputPins: ['out'],
      contribute: ({ inputVoltages, params }) => {
        calls.push('scale')
        return { out: params.k * inputVoltages.in }
      },
    },
  },
}

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getCanonicalEntry: (type) => FIXTURES[type] ? {
    pins: FIXTURES[type].pins.map(id => ({ id })), modelAvailable: true, defaultParameters: FIXTURES[type].defaults,
    parameterSchema: [{ key: FIXTURES[type].parameter, minimum: 0 }],
  } : actual.getCanonicalEntry(type) }
})
vi.mock('../dcVoltageDomainRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getDcVoltageDomainContribution: (type) =>
    FIXTURES[type]?.contract ?? actual.getDcVoltageDomainContribution(type) }
})

const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const power = (uid, voltage) => ({ uid, type: 'POWER', parameters: { voltage } })
const run = (c) => {
  calls.length = 0
  return resolveSignals(c.components, prepareCircuit(c.components, c.wires))
}
const volts = (result, key) => result.dcVoltageDomains.get(key)?.voltage
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))

/** Powered amplifier (5 V supply, shared ground) with a resistive load on `out`. */
function amplifier(gain, inputs = {}) {
  const components = [power('vs', 5), { uid: 'amp', type: 'FEEDBACK_GAIN_FIXTURE', parameters: { gain } },
    { uid: 'load', type: 'RESISTOR' }]
  const wires = [wire('vs', '5V', 'amp', 'supply'), wire('vs', 'GND', 'amp', 'reference'),
    wire('amp', 'out', 'load', 'A'), wire('vs', 'GND', 'load', 'B')]
  for (const [pin, voltage] of Object.entries(inputs)) {
    components.push(power(`v_${pin}`, voltage))
    wires.push(wire(`v_${pin}`, '5V', 'amp', pin), wire(`v_${pin}`, 'GND', 'vs', 'GND'))
  }
  return { components, wires }
}
const openLoop = (gain, plus, minus) => amplifier(gain, { plus, minus })
/** Unity negative feedback (voltage follower): out wired straight to minus. */
function follower(gain, vin = 1) {
  const c = amplifier(gain, { plus: vin })
  c.wires.push(wire('amp', 'out', 'amp', 'minus'))
  return c
}
/** Same follower with the feedback routed through an existing passive part. */
function passiveFollower(gain, vin = 1) {
  const c = amplifier(gain, { plus: vin })
  c.components.push({ uid: 'rf', type: 'RESISTOR' })
  c.wires.push(wire('amp', 'out', 'rf', 'A'), wire('rf', 'B', 'amp', 'minus'))
  return c
}
/** Attenuated negative feedback: out -> scale(k) -> minus, a purely controlled-domain loop. */
function attenuated(gain, k, vin = 1) {
  const c = amplifier(gain, { plus: vin })
  c.components.push({ uid: 'sc', type: 'ANALOG_SCALE_FIXTURE', parameters: { k } })
  c.wires.push(wire('amp', 'out', 'sc', 'in'), wire('sc', 'out', 'amp', 'minus'), wire('vs', 'GND', 'sc', 'reference'))
  return c
}
/** Positive feedback: out wired to plus, fixed minus. */
function positive(gain, vminus = 1) {
  const c = amplifier(gain, { minus: vminus })
  c.wires.push(wire('amp', 'out', 'amp', 'plus'))
  return c
}

/**
 * Test-side REPLICA (not the engine) of the resolver's outer-round rule for a
 * single feedback variable, used only to characterize what would happen if a
 * loop were seeded: candidate = f(previous); equal → converged; repeated
 * candidate → null; bound exhausted → null.
 */
function replicateRounds(f, seed, bound) {
  const seen = new Set()
  let previous = seed
  for (let round = 0; round <= bound; round++) {
    const candidate = f(previous)
    if (Object.is(candidate, previous)) return { outcome: 'converged', value: candidate }
    if (seen.has(candidate)) return { outcome: 'repeated', value: null }
    seen.add(candidate)
    previous = candidate
  }
  return { outcome: 'bound', value: null }
}
/** Same bound as resolveDcVoltageDomains: allKeys + controlled contributors (no analog conductors here). */
const roundBound = (c, contributors) => prepareCircuit(c.components, c.wires).allKeys.length + contributors

describe('A11-COMP3-LM358P feedback/convergence gate — supported feed-forward behaviour', () => {
  it('F1 open loop saturates high for V+ > V- and low for V+ < V- (gain 10 and 100000)', () => {
    for (const gain of [10, 100000]) {
      const high = run(openLoop(gain, 3, 2))
      expect(volts(high, 'amp:out')).toBe(V_HIGH)
      expect(high.dcAnalysis.get('load')).toEqual({ voltage: V_HIGH, current: V_HIGH / 220 })
      expect(volts(run(openLoop(gain, 2, 3)), 'amp:out')).toBe(0)
      // Documented equality rule of the pure law: Vd = 0 → V_LOW, no held state.
      expect(volts(run(openLoop(gain, 2, 2)), 'amp:out')).toBe(0)
    }
  })
  it('F2 feed-forward propagates an unsaturated finite-gain output', () => {
    const moderate = run(openLoop(10, 2.25, 2))
    expect(volts(moderate, 'amp:out')).toBe(2.5)
    expect(moderate.dcAnalysis.get('load')).toEqual({ voltage: 2.5, current: 2.5 / 220 })
    const high = run(openLoop(100000, 2 + 2 ** -17, 2))
    expect(volts(high, 'amp:out')).toBe(100000 * 2 ** -17)
    expect(volts(high, 'amp:out')).toBeGreaterThan(0)
    expect(volts(high, 'amp:out')).toBeLessThan(V_HIGH)
  })
})

describe('A11-COMP3-LM358P feedback/convergence gate — demonstrated limitations', () => {
  it('F3 counter-proof: unity negative feedback settles on a reserved null output, never evaluating the law', () => {
    for (const build of [follower, passiveFollower]) {
      for (const gain of [1, 10, 100000]) {
        const result = run(build(gain))
        expect(result.dcVoltageDomains.get('amp:out')).toBeNull()
        expect(result.dcVoltageDomains.get('amp:minus')).toBeNull()
        expect(calls).toEqual([])
        expect(result.dcAnalysis.has('load')).toBe(false)
        // Not the global seen-state/bound fallback: primary facts survive.
        expect(volts(result, 'amp:plus')).toBe(1)
        expect(volts(result, 'amp:supply')).toBe(5)
      }
    }
  })
  it('F4 counter-proof: moderate gain 10 follower does not reach its fixed point 10/11 * Vin', () => {
    const result = run(follower(10, 1))
    expect(result.dcVoltageDomains.get('amp:out')).toBeNull()
    expect(volts(result, 'amp:out')).not.toBe(10 / 11)
  })
  it('F5 counter-proof: naive high-gain (100000) negative feedback does not converge in the current domain-propagation resolver', () => {
    const result = run(follower(100000, 1))
    expect(result.dcVoltageDomains.get('amp:out')).toBeNull()
    expect(volts(result, 'amp:out')).not.toBe(100000 / 100001)
  })
  it('F6 counter-proof: attenuated controlled feedback (gain 10, k 0.5) does not reach 10/6 * Vin', () => {
    const result = run(attenuated(10, 0.5, 1))
    for (const key of ['amp:out', 'amp:minus', 'sc:in', 'sc:out']) expect(result.dcVoltageDomains.get(key)).toBeNull()
    expect(calls).toEqual([])
    expect(volts(result, 'amp:plus')).toBe(1)
  })
  it('F7 positive feedback yields a deterministic null safety result, never a false stable voltage', () => {
    const result = run(positive(10, 1))
    expect(result.dcVoltageDomains.get('amp:out')).toBeNull()
    expect(result.dcVoltageDomains.get('amp:plus')).toBeNull()
    expect(volts(result, 'amp:minus')).toBe(1)
    expect(calls).toEqual([])
  })
  it('F8 a feedback loop without a seeding primary never self-starts', () => {
    const unpowered = {
      components: [{ uid: 'amp', type: 'FEEDBACK_GAIN_FIXTURE' }, { uid: 'sc', type: 'ANALOG_SCALE_FIXTURE' }],
      wires: [wire('amp', 'out', 'sc', 'in'), wire('sc', 'out', 'amp', 'minus'), wire('amp', 'out', 'amp', 'plus'),
        wire('amp', 'reference', 'sc', 'reference')],
    }
    const selfLoop = amplifier(10)
    selfLoop.wires.push(wire('amp', 'out', 'amp', 'plus'), wire('amp', 'out', 'amp', 'minus'))
    for (const c of [unpowered, selfLoop]) {
      const result = run(c)
      expect(result.dcVoltageDomains.get('amp:out')).toBeNull()
      expect([...result.dcVoltageDomains].filter(([key, v]) => key.startsWith('amp:') && v && v.voltage > 0)
        .map(([key]) => key)).toEqual(c === selfLoop ? ['amp:supply'] : [])
      expect(calls).toEqual([])
    }
  })
})

describe('A11-COMP3-LM358P feedback/convergence gate — determinism', () => {
  const topologies = () => [openLoop(10, 2.25, 2), openLoop(100000, 2 + 2 ** -17, 2), follower(10), follower(100000),
    passiveFollower(100000), attenuated(10, 0.5), positive(10), positive(100000)]
  it('F9 results are independent of component and wire order', () => {
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
  it('F10 repeated executions give identical results', () => {
    for (const c of topologies()) {
      const first = normalized(run(c))
      for (let i = 0; i < 4; i++) expect(normalized(run(c))).toEqual(first)
    }
  })
  it('F3-F7 pinSignals stay exclusively Signal.* under feedback', () => {
    for (const c of topologies()) {
      expect([...run(c).pinSignals.values()].every(v => Object.values(Signal).includes(v))).toBe(true)
    }
  })
})

describe('A11-COMP3-LM358P feedback/convergence gate — seeded-iteration replica (diagnostic, not the engine)', () => {
  it('R1 even if seeded at 0 V, loop gain >= 1 negative feedback alternates between rails and hits repeated-state', () => {
    const bound = roundBound(follower(10), 1)
    for (const gain of [1, 10, 100000]) {
      expect(replicateRounds((x) => clamp(gain * (1 - x)), 0, bound)).toEqual({ outcome: 'repeated', value: null })
    }
    expect(replicateRounds((x) => clamp(10 * (1 - 0.5 * x)), 0, roundBound(attenuated(10, 0.5), 2)))
      .toEqual({ outcome: 'repeated', value: null })
  })
  it('R2 even if seeded, contractive loop gain < 1 approaches its fixed point only asymptotically and exhausts the bound', () => {
    const bound = roundBound(attenuated(1, 0.5), 2)
    expect(replicateRounds((x) => clamp(1 * (1 - 0.5 * x)), 0, bound)).toEqual({ outcome: 'bound', value: null })
    // Without any bound, floating-point iteration ends in a repeated state, not an exact fixed point.
    expect(replicateRounds((x) => clamp(1 * (1 - 0.5 * x)), 0, 100000)).toEqual({ outcome: 'repeated', value: null })
  })
  it('R3 even if seeded, positive feedback latches on a seed-dependent rail', () => {
    const f = (x) => clamp(10 * (x - 1))
    expect(replicateRounds(f, 0, 20)).toEqual({ outcome: 'converged', value: 0 })
    expect(replicateRounds(f, 2, 20)).toEqual({ outcome: 'converged', value: V_HIGH })
  })
})
