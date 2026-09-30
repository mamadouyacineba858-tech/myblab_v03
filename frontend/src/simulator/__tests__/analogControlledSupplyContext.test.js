import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'

// A11-COMP3-PREQ3 — test-only fixtures. No production type consumes supplyVoltages yet.
// Supply law: out = clamp(gain * (plus - minus), 0, supply - headroom), supply read from
// supplyVoltages only; bounds use the same supply context.
const calls = []
const bounded = []
const record = (fixture, group, context) => {
  calls.push({ fixture, group, context, inputKeys: Object.keys(context.inputVoltages).sort(),
    supplyVoltages: context.supplyVoltages === undefined ? undefined : { ...context.supplyVoltages } })
}
const supplyLaw = (plus, minus, supplyVoltages, params) =>
  Math.min(Math.max(params.gain * (plus - minus), 0), Math.max(0, supplyVoltages.supply - params.headroom))
const supplyGroup = (fixture, g, { mutate = false } = {}) => ({
  inputPins: [`${g}Plus`, `${g}Minus`], outputPins: [`${g}Out`],
  contribute: (context) => {
    record(fixture, g, context)
    const { inputVoltages, supplyVoltages, params } = context
    const out = supplyLaw(inputVoltages[`${g}Plus`], inputVoltages[`${g}Minus`], supplyVoltages, params)
    if (mutate) {
      supplyVoltages.supply = 999
      supplyVoltages.intruder = 1
    }
    return { [`${g}Out`]: out }
  },
  feedback: {
    mode: 'scalar-bounded', characteristic: 'single-root', variableOutputPin: `${g}Out`,
    bounds: ({ supplyVoltages, params }) => {
      bounded.push({ fixture, group: g, supplyVoltages: { ...supplyVoltages } })
      return { min: 0, max: Math.max(0, (supplyVoltages.supply ?? 0) - params.headroom) }
    },
  },
})
const GROUPED_PINS = ['aPlus', 'aMinus', 'aOut', 'bPlus', 'bMinus', 'bOut', 'reference', 'supply']
const FIXTURES = {
  SUPPLY_AMP_FIXTURE: { pins: GROUPED_PINS, contract: { referencePin: 'reference', requiredPositivePins: ['supply'],
    groups: ['a', 'b'].map((g) => supplyGroup('SUPPLY_AMP_FIXTURE', g)) } },
  // Group a mutates the context it receives, after computing its output.
  MUTATING_SUPPLY_FIXTURE: { pins: GROUPED_PINS, contract: { referencePin: 'reference', requiredPositivePins: ['supply'],
    groups: [supplyGroup('MUTATING_SUPPLY_FIXTURE', 'a', { mutate: true }), supplyGroup('MUTATING_SUPPLY_FIXTURE', 'b')] } },
  // Historical-style law: ignores supplyVoltages, fixed high from params.
  IGNORING_SUPPLY_FIXTURE: { pins: GROUPED_PINS, contract: { referencePin: 'reference', requiredPositivePins: ['supply'],
    groups: ['a', 'b'].map((g) => ({
      inputPins: [`${g}Plus`, `${g}Minus`], outputPins: [`${g}Out`],
      contribute: ({ inputVoltages, params }) => ({
        [`${g}Out`]: Math.min(Math.max(params.gain * (inputVoltages[`${g}Plus`] - inputVoltages[`${g}Minus`]), 0), params.high),
      }),
    })) } },
  // No requiredPositivePins: the supply context is {}.
  NO_SUPPLY_FIXTURE: { pins: GROUPED_PINS, contract: { referencePin: 'reference', groups: ['a'].map((g) => ({
    inputPins: [`${g}Plus`, `${g}Minus`], outputPins: [`${g}Out`],
    contribute: (context) => {
      record('NO_SUPPLY_FIXTURE', g, context)
      return { [`${g}Out`]: Math.min(Math.max(10 * (context.inputVoltages[`${g}Plus`] - context.inputVoltages[`${g}Minus`]), 0), 3) }
    },
    feedback: {
      mode: 'scalar-bounded', characteristic: 'single-root', variableOutputPin: `${g}Out`,
      bounds: ({ supplyVoltages }) => {
        bounded.push({ fixture: 'NO_SUPPLY_FIXTURE', group: g, supplyVoltages: { ...supplyVoltages } })
        return { min: 0, max: 3 }
      },
    },
  })) } },
}

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getCanonicalEntry: (type) => FIXTURES[type] ? {
    pins: FIXTURES[type].pins.map(id => ({ id })), modelAvailable: true,
    defaultParameters: { gain: 10, headroom: 1.5, high: 3.5 },
    parameterSchema: ['gain', 'headroom', 'high'].map(key => ({ key, minimum: 0 })),
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
  bounded.length = 0
  return resolveSignals(c.components, prepareCircuit(c.components, c.wires))
}
const fact = (result, key) => result.dcVoltageDomains.get(key)
const volts = (result, key) => fact(result, key)?.voltage
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))

/**
 * One grouped amplifier `amp` on a common ground (`vs` GND = reference). `supply` volts come
 * from their own primary on the supply pin (null = unconnected, 'ground' = wired to GND,
 * 'isolated' = a 9 V primary without common ground). `inputs` maps pin -> volts, one
 * primary each. `followers` lists groups whose output is wired directly to their minus.
 */
function amplifier({ type = 'SUPPLY_AMP_FIXTURE', supply = 9, inputs = {}, followers = [] } = {}) {
  const components = [power('vs', 5), { uid: 'amp', type }]
  const wires = [wire('vs', 'GND', 'amp', 'reference')]
  const source = (uid, voltage, pin, grounded = true) => {
    components.push(power(uid, voltage))
    wires.push(wire(uid, '5V', 'amp', pin))
    if (grounded) wires.push(wire(uid, 'GND', 'vs', 'GND'))
  }
  if (supply === 'ground') wires.push(wire('vs', 'GND', 'amp', 'supply'))
  else if (supply === 'isolated') source('sup', 9, 'supply', false)
  else if (supply !== null) source('sup', supply, 'supply')
  for (const [pin, voltage] of Object.entries(inputs)) source(`in_${pin}`, voltage, pin)
  for (const g of followers) wires.push(wire('amp', `${g}Out`, 'amp', `${g}Minus`))
  return { components, wires }
}
const FF_INPUTS = { aPlus: 2, aMinus: 1.9, bPlus: 3, bMinus: 1 }

describe('A11-COMP3-PREQ3 controlled analog supply context', () => {
  it('T1 feed-forward contribute() receives the resolved supplyVoltages, and the law uses them', () => {
    const result = run(amplifier({ inputs: FF_INPUTS }))
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) expect(call.supplyVoltages).toEqual({ supply: 9 })
    expect(volts(result, 'amp:aOut')).toBeCloseTo(1, 12)
    // Saturation follows the supply: 9 V - 1.5 = 7.5 V, 5 V - 1.5 = 3.5 V.
    expect(volts(result, 'amp:bOut')).toBe(7.5)
    expect(volts(run(amplifier({ supply: 5, inputs: FF_INPUTS })), 'amp:bOut')).toBe(3.5)
    for (const call of calls) expect(call.supplyVoltages).toEqual({ supply: 5 })
    expect(bounded).toEqual([])
  })
  it('T2 feedback transfer calls receive the same supplyVoltages as feed-forward', () => {
    // Follower on a: A/(1+A) * 8.5 = 7.73 V exceeds 9 - 1.5 = 7.5 V -> saturated root at the bound.
    const result = run(amplifier({ inputs: { aPlus: 8.5, bPlus: 3, bMinus: 1 }, followers: ['a'] }))
    const feedbackCalls = calls.filter((call) => call.group === 'a')
    expect(feedbackCalls.length).toBeGreaterThan(1)
    for (const call of feedbackCalls) expect(call.supplyVoltages).toEqual({ supply: 9 })
    expect(volts(result, 'amp:aOut')).toBe(7.5)
    expect(volts(result, 'amp:aMinus')).toBe(7.5)
    // Unsaturated follower: x = 10/11 * vin within the engine tolerance.
    expect(Math.abs(volts(run(amplifier({ inputs: { aPlus: 2 }, followers: ['a'] })), 'amp:aOut') - 20 / 11))
      .toBeLessThanOrEqual(1e-6)
  })
  it('T3 bounds() receives the same supplyVoltages', () => {
    run(amplifier({ supply: 6, inputs: { aPlus: 2, bPlus: 1 }, followers: ['a', 'b'] }))
    expect(bounded.length).toBeGreaterThan(0)
    for (const call of bounded) expect(call.supplyVoltages).toEqual({ supply: 6 })
    for (const call of calls) expect(call.supplyVoltages).toEqual({ supply: 6 })
  })
  it('T4 both groups of one component receive the same supply context, each in its own object', () => {
    run(amplifier({ inputs: FF_INPUTS }))
    const byGroup = (g) => calls.filter((call) => call.group === g)
    expect(byGroup('a').length).toBeGreaterThan(0)
    expect(byGroup('b').length).toBeGreaterThan(0)
    expect(byGroup('a').map((c) => c.supplyVoltages)).toEqual(byGroup('b').map((c) => c.supplyVoltages))
    const objects = calls.map((call) => call.context.supplyVoltages)
    expect(new Set(objects).size).toBe(objects.length)
  })
  it('T5 inputVoltages holds only the group inputPins, never the requiredPositivePins', () => {
    run(amplifier({ inputs: FF_INPUTS }))
    for (const call of calls) {
      expect(call.inputKeys).toEqual([`${call.group}Minus`, `${call.group}Plus`])
      expect(call.context.inputVoltages).not.toHaveProperty('supply')
    }
    run(amplifier({ inputs: { aPlus: 2 }, followers: ['a'] }))
    for (const call of calls) expect(call.inputKeys).toEqual(['aMinus', 'aPlus'])
  })
  it('T6 an unresolved or invalid supply keeps the component-wide PREQ1 deactivation', () => {
    for (const supply of [null, 'ground', 'isolated']) {
      const result = run(amplifier({ supply, inputs: FF_INPUTS }))
      expect(calls).toEqual([])
      expect(fact(result, 'amp:aOut')).toBeNull()
      expect(fact(result, 'amp:bOut')).toBeNull()
      expect(volts(result, 'amp:aPlus')).toBe(2)
    }
    const follower = run(amplifier({ supply: null, inputs: { aPlus: 2 }, followers: ['a'] }))
    expect(fact(follower, 'amp:aOut')).toBeNull()
    expect(bounded).toEqual([])
  })
  it('T7 a law that ignores supplyVoltages keeps its historical results', () => {
    const result = run(amplifier({ type: 'IGNORING_SUPPLY_FIXTURE', inputs: FF_INPUTS }))
    expect(volts(result, 'amp:aOut')).toBeCloseTo(1, 12)
    expect(volts(result, 'amp:bOut')).toBe(3.5)
    // Historical single-input production contract (VOLTAGE_REGULATOR) is unchanged.
    const components = [power('s', 9), { uid: 'reg', type: 'VOLTAGE_REGULATOR' }, { uid: 'load', type: 'RESISTOR' }]
    const wires = [wire('s', '5V', 'reg', 'IN'), wire('s', 'GND', 'reg', 'GND'), wire('reg', 'OUT', 'load', 'A'), wire('load', 'B', 's', 'GND')]
    const regulated = run({ components, wires })
    expect(volts(regulated, 'reg:OUT')).toBe(5)
    expect(regulated.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 220 })
  })
  it('T8 a contract without requiredPositivePins receives {} in contribute() and bounds()', () => {
    run(amplifier({ type: 'NO_SUPPLY_FIXTURE', supply: null, inputs: { aPlus: 2, aMinus: 1.9 } }))
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) expect(call.supplyVoltages).toEqual({})
    const result = run(amplifier({ type: 'NO_SUPPLY_FIXTURE', supply: null, inputs: { aPlus: 1 }, followers: ['a'] }))
    expect(Math.abs(volts(result, 'amp:aOut') - 10 / 11)).toBeLessThanOrEqual(1e-6)
    expect(bounded.length).toBeGreaterThan(0)
    for (const call of bounded) expect(call.supplyVoltages).toEqual({})
    for (const call of calls) expect(call.supplyVoltages).toEqual({})
  })
  it('T9 a group mutating its supplyVoltages contaminates no other call, group or bound', () => {
    const result = run(amplifier({ type: 'MUTATING_SUPPLY_FIXTURE', inputs: FF_INPUTS }))
    expect(calls.filter((call) => call.group === 'a').length).toBeGreaterThan(1)
    for (const call of calls) expect(call.supplyVoltages).toEqual({ supply: 9 })
    expect(normalized(result)).toEqual(normalized(run(amplifier({ inputs: FF_INPUTS }))))
    // Feedback: the mutating group is solved (many transfer calls) next to a clean follower.
    const solved = run(amplifier({ type: 'MUTATING_SUPPLY_FIXTURE', inputs: { aPlus: 8.5, bPlus: 8.5 }, followers: ['a', 'b'] }))
    for (const call of calls) expect(call.supplyVoltages).toEqual({ supply: 9 })
    for (const call of bounded) expect(call.supplyVoltages).toEqual({ supply: 9 })
    expect(volts(solved, 'amp:aOut')).toBe(7.5)
    expect(volts(solved, 'amp:bOut')).toBe(7.5)
  })
  it('T10 results are independent of component and wire ordering', () => {
    for (const c of [amplifier({ inputs: FF_INPUTS }), amplifier({ inputs: { aPlus: 2, bPlus: 8.5 }, followers: ['a', 'b'] }),
      amplifier({ supply: null, inputs: FF_INPUTS })]) {
      const expected = normalized(run(c))
      for (let i = 0; i < c.components.length; i++) {
        const components = [...c.components.slice(i), ...c.components.slice(0, i)]
        const wires = [...c.wires.slice(i), ...c.wires.slice(0, i)]
        expect(normalized(run({ components, wires }))).toEqual(expected)
        expect(normalized(run({ components: [...components].reverse(), wires: [...wires].reverse() }))).toEqual(expected)
      }
    }
    const renamed = (c) => JSON.parse(JSON.stringify(c).replace(/"amp"/g, '"zz"'))
    const base = amplifier({ inputs: { aPlus: 2, bPlus: 8.5 }, followers: ['a', 'b'] })
    const original = run(base)
    const moved = run(renamed(base))
    expect(volts(moved, 'zz:aOut')).toBe(volts(original, 'amp:aOut'))
    expect(volts(moved, 'zz:bOut')).toBe(volts(original, 'amp:bOut'))
  })
  it('T11 is deterministic', () => {
    for (const c of [amplifier({ inputs: FF_INPUTS }), amplifier({ inputs: { aPlus: 2 }, followers: ['a'] })]) {
      const first = normalized(run(c))
      const firstCalls = calls.map(({ group, inputKeys, supplyVoltages }) => ({ group, inputKeys, supplyVoltages }))
      for (let i = 0; i < 3; i++) {
        expect(normalized(run(c))).toEqual(first)
        expect(calls.map(({ group, inputKeys, supplyVoltages }) => ({ group, inputKeys, supplyVoltages }))).toEqual(firstCalls)
      }
    }
  })
  it('T12 Open/Closed: generic transmission only, no type branch, fixtures absent from production', async () => {
    const code = executable(src('resolution.js'))
    expect(code.match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g)).toEqual(['comp.type !== "ARDUINO"'])
    expect(code).not.toMatch(/switch\s*\([^)]*\.type/)
    for (const name of ['resolution.js', 'controlledAnalogFeedbackSolver.js', 'dcVoltageDomainRegistry.js']) {
      expect(src(name)).not.toMatch(/LM358|OP_?AMP|555|556|4N35|FIXTURE|COMPARATOR/i)
    }
    // Both law call sites and bounds pass the one supply context helper.
    expect(code.match(/supplyVoltages: supplyContext\(/g)).toHaveLength(3)
    const registry = await vi.importActual('../dcVoltageDomainRegistry.js')
    const canonical = await vi.importActual('../canonicalRegistry.js')
    for (const type of Object.keys(FIXTURES)) {
      expect(registry.hasDcVoltageDomainContribution(type)).toBe(false)
      expect(canonical.getCanonicalEntry(type)).toBeFalsy()
    }
  })
})
