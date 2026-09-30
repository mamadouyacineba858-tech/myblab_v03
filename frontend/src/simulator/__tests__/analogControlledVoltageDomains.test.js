import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'

// A11-ANALOG-PREQ1 — test-only analog fixtures. No production A11 type exists.
const FIXTURES = {
  ANALOG_COMPARE_FIXTURE: {
    pins: ['plus', 'minus', 'reference', 'output'],
    contract: {
      inputPins: ['plus', 'minus'], referencePin: 'reference', outputPins: ['output'],
      contribute: ({ inputVoltages: { plus, minus }, params }) =>
        ({ output: plus > minus ? params.high : plus < minus ? 0 : null }),
    },
  },
  ANALOG_PAIR_FIXTURE: {
    pins: ['plus', 'minus', 'reference', 'q', 'qn'],
    contract: {
      inputPins: ['plus', 'minus'], referencePin: 'reference', outputPins: ['q', 'qn'],
      contribute: ({ inputVoltages: { plus, minus }, params }) => plus === minus ? {}
        : { q: plus > minus ? params.high : 0, qn: plus > minus ? 0 : params.high },
    },
  },
  ANALOG_FOLLOW_FIXTURE: {
    pins: ['in', 'reference', 'out'],
    contract: {
      inputPins: ['in'], referencePin: 'reference', outputPins: ['out'],
      contribute: ({ inputVoltages }) => ({ out: inputVoltages.in }),
    },
  },
  // A11-COMP3-PREQ1 — two independent groups under one component-wide supply.
  // A: aPlus - aMinus (0 below; equal inputs omit aOut). B: mean (equal inputs return NaN).
  GROUPED_ANALOG_FIXTURE: {
    pins: ['aPlus', 'aMinus', 'aOut', 'bPlus', 'bMinus', 'bOut', 'reference', 'supply'],
    contract: {
      referencePin: 'reference', requiredPositivePins: ['supply'],
      groups: [
        { inputPins: ['aPlus', 'aMinus'], outputPins: ['aOut'],
          contribute: ({ inputVoltages: { aPlus, aMinus } }) => {
            groupCalls.A++
            return aPlus === aMinus ? {} : { aOut: Math.max(aPlus - aMinus, 0) }
          } },
        { inputPins: ['bPlus', 'bMinus'], outputPins: ['bOut'],
          contribute: ({ inputVoltages: { bPlus, bMinus } }) => {
            groupCalls.B++
            return { bOut: bPlus === bMinus ? NaN : (bPlus + bMinus) / 2 }
          } },
      ],
    },
  },
}
const groupCalls = { A: 0, B: 0 }

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getCanonicalEntry: (type) => FIXTURES[type] ? {
    pins: FIXTURES[type].pins.map(id => ({ id })), modelAvailable: true, defaultParameters: { high: 5 },
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

/** Two adjustable primaries sharing one ground drive plus/minus of a comparator. */
function compare(plus, minus, { sharedGround = true } = {}) {
  const components = [power('vp', plus), power('vm', minus),
    { uid: 'cmp', type: 'ANALOG_COMPARE_FIXTURE' }, { uid: 'load', type: 'RESISTOR' }]
  const wires = [wire('vp', '5V', 'cmp', 'plus'), wire('vm', '5V', 'cmp', 'minus'),
    wire('vp', 'GND', 'cmp', 'reference'), wire('cmp', 'output', 'load', 'A'), wire('vp', 'GND', 'load', 'B')]
  if (sharedGround) wires.push(wire('vm', 'GND', 'vp', 'GND'))
  return { components, wires }
}
const run = (c, external = null) => resolveSignals(c.components, prepareCircuit(c.components, c.wires), external)
const domain = (result, key) => result.dcVoltageDomains.get(key)
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const onlySignals = (result) => [...result.pinSignals.values()].every(v => Object.values(Signal).includes(v))

describe('A11-ANALOG-PREQ1 controlled analog voltage domains', () => {
  it('T1 observes two distinct numeric input voltages of one reference', () => {
    const result = run(compare(3, 2))
    expect(domain(result, 'cmp:plus')).toMatchObject({ voltage: 3 })
    expect(domain(result, 'cmp:minus')).toMatchObject({ voltage: 2 })
    expect(domain(result, 'cmp:plus').reference).toBe(domain(result, 'cmp:minus').reference)
  })
  it('T2/T3 distinguishes 3 V > 2 V from 2 V < 3 V although both inputs are digital HIGH', () => {
    const above = run(compare(3, 2))
    const below = run(compare(2, 3))
    for (const result of [above, below]) {
      expect(result.pinSignals.get('cmp:plus')).toBe(Signal.HIGH)
      expect(result.pinSignals.get('cmp:minus')).toBe(Signal.HIGH)
    }
    expect(domain(above, 'cmp:output')).toMatchObject({ voltage: 5 })
    expect(domain(below, 'cmp:output')).toMatchObject({ voltage: 0 })
    expect(domain(above, 'cmp:output').reference).toBe(domain(above, 'cmp:reference').reference)
  })
  it('equal inputs leave the output unresolved when the fixture declines', () => {
    expect(domain(run(compare(3, 3)), 'cmp:output')).toBeNull()
  })
  it('T4 refuses the contribution when an input is unresolved', () => {
    const c = compare(3, 2)
    c.wires = c.wires.filter(w => !(w.toUid === 'cmp' && w.toPin === 'minus'))
    const result = run(c)
    expect(domain(result, 'cmp:output')).toBeNull()
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('T4b refuses the contribution when the reference is unresolved', () => {
    const c = compare(3, 2)
    c.wires = c.wires.filter(w => !(w.toUid === 'cmp' && w.toPin === 'reference'))
    expect(domain(run(c), 'cmp:output')).toBeNull()
  })
  it('T5 never compares inputs of incompatible references', () => {
    const result = run(compare(3, 2, { sharedGround: false }))
    expect(domain(result, 'cmp:plus').voltage).toBe(3)
    expect(domain(result, 'cmp:minus').voltage).toBe(2)
    expect(domain(result, 'cmp:minus').reference).not.toBe(domain(result, 'cmp:plus').reference)
    expect(domain(result, 'cmp:output')).toBeNull()
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('T6 invents no voltage from digital HIGH/LOW', () => {
    const c = compare(3, 2)
    c.components = c.components.filter(comp => comp.type !== 'POWER')
    c.wires = c.wires.filter(w => w.fromUid !== 'vp' && w.fromUid !== 'vm')
    const result = run(c, new Map([['cmp:plus', Signal.HIGH], ['cmp:minus', Signal.LOW],
      ['cmp:reference', Signal.LOW]]))
    expect(domain(result, 'cmp:output')).toBeNull()
    expect([...result.dcVoltageDomains.values()].some(v => v)).toBe(false)
    expect(result.dcAnalysis.size).toBe(0)
  })
  it('T7 propagates the derived output to an existing load', () => {
    const result = run(compare(3, 2))
    expect(result.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 220 })
  })
  it('supports several outputs from one contributor', () => {
    const c = compare(3, 2)
    c.components.push({ uid: 'pair', type: 'ANALOG_PAIR_FIXTURE' })
    c.wires.push(wire('vp', '5V', 'pair', 'plus'), wire('vm', '5V', 'pair', 'minus'), wire('vp', 'GND', 'pair', 'reference'))
    const result = run(c)
    expect(domain(result, 'pair:q').voltage).toBe(5)
    expect(domain(result, 'pair:qn').voltage).toBe(0)
    c.wires = c.wires.map(w => w.toUid === 'pair' && w.toPin !== 'reference'
      ? { ...w, toPin: w.toPin === 'plus' ? 'minus' : 'plus' } : w)
    const swapped = run(c)
    expect(domain(swapped, 'pair:q').voltage).toBe(0)
    expect(domain(swapped, 'pair:qn').voltage).toBe(5)
  })
  it('T8 converges across a chain of two analog producers', () => {
    for (const [plus, minus, expected] of [[3, 2, 5], [2, 3, 0]]) {
      const c = compare(plus, minus)
      c.components.push({ uid: 'cmp2', type: 'ANALOG_COMPARE_FIXTURE' })
      // cmp2 compares cmp's output (5 V or 0 V) against the 3 V/2 V primary.
      c.wires.push(wire('cmp', 'output', 'cmp2', 'plus'), wire('vp', '5V', 'cmp2', 'minus'),
        wire('vp', 'GND', 'cmp2', 'reference'))
      expect(domain(run(c), 'cmp2:output').voltage).toBe(expected)
    }
  })
  it('T8b chains a historical single-input producer into an analog producer', () => {
    const components = [{ uid: 'bat', type: 'BATTERY_9V' }, power('vm', 3),
      { uid: 'reg', type: 'VOLTAGE_REGULATOR', parameters: { outputVoltage: 5 } },
      { uid: 'cmp', type: 'ANALOG_COMPARE_FIXTURE' }]
    const wires = [wire('bat', 'plus', 'reg', 'IN'), wire('bat', 'minus', 'reg', 'GND'), wire('vm', 'GND', 'bat', 'minus'),
      wire('reg', 'OUT', 'cmp', 'plus'), wire('vm', '5V', 'cmp', 'minus'), wire('bat', 'minus', 'cmp', 'reference')]
    const result = run({ components, wires })
    expect(domain(result, 'reg:OUT').voltage).toBe(5)
    expect(domain(result, 'cmp:output').voltage).toBe(5)
  })
  it('T9/T10 is independent of component and wire ordering', () => {
    const c = compare(3, 2)
    c.components.push({ uid: 'cmp2', type: 'ANALOG_COMPARE_FIXTURE' })
    c.wires.push(wire('cmp', 'output', 'cmp2', 'plus'), wire('vp', '5V', 'cmp2', 'minus'), wire('vp', 'GND', 'cmp2', 'reference'))
    const expected = normalized(run(c))
    for (let i = 0; i < c.components.length; i++) {
      const components = [...c.components.slice(i), ...c.components.slice(0, i)]
      expect(normalized(run({ components, wires: c.wires }))).toEqual(expected)
      expect(normalized(run({ components: [...components].reverse(), wires: [...c.wires].reverse() }))).toEqual(expected)
    }
  })
  it('T11 conflicts deterministically with an incompatible primary authority', () => {
    const c = compare(3, 2)
    c.wires.push(wire('cmp', 'output', 'vm', '5V'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = run({ ...c, components })
      expect(domain(result, 'vm:5V')).toBeNull()
      expect(domain(result, 'cmp:output')).toBeNull()
      expect(result.dcAnalysis.has('load')).toBe(false)
    }
  })
  it('T12 conflicts between two incompatible analog producers', () => {
    const c = compare(3, 2)
    c.components.push({ uid: 'inv', type: 'ANALOG_COMPARE_FIXTURE' })
    c.wires.push(wire('vm', '5V', 'inv', 'plus'), wire('vp', '5V', 'inv', 'minus'),
      wire('vp', 'GND', 'inv', 'reference'), wire('inv', 'output', 'cmp', 'output'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = run({ ...c, components })
      expect(domain(result, 'cmp:output')).toBeNull()
      expect(result.dcAnalysis.has('load')).toBe(false)
    }
  })
  it('T13 accepts two agreeing analog producers', () => {
    const c = compare(3, 2)
    c.components.push({ uid: 'twin', type: 'ANALOG_COMPARE_FIXTURE' })
    c.wires.push(wire('vp', '5V', 'twin', 'plus'), wire('vm', '5V', 'twin', 'minus'),
      wire('vp', 'GND', 'twin', 'reference'), wire('twin', 'output', 'cmp', 'output'))
    const result = run(c)
    expect(domain(result, 'cmp:output').voltage).toBe(5)
    expect(result.dcAnalysis.get('load').voltage).toBe(5)
  })
  it('T14 does not self-start an unpowered analog cycle', () => {
    const components = [power('vp', 3), { uid: 'a', type: 'ANALOG_FOLLOW_FIXTURE' },
      { uid: 'b', type: 'ANALOG_FOLLOW_FIXTURE' }]
    const wires = [wire('a', 'out', 'b', 'in'), wire('b', 'out', 'a', 'in'),
      wire('vp', 'GND', 'a', 'reference'), wire('vp', 'GND', 'b', 'reference')]
    for (const c of [{ components, wires }, { components: components.slice(1), wires: wires.slice(0, 2) }]) {
      const result = run(c)
      expect(domain(result, 'a:out')).toBeNull()
      expect(domain(result, 'b:out')).toBeNull()
    }
  })
  it('T15 keeps pinSignals exclusively Signal.*', () => {
    for (const c of [compare(3, 2), compare(2, 3), compare(3, 2, { sharedGround: false })]) {
      expect(onlySignals(run(c))).toBe(true)
    }
  })
  it('T16 keeps the historical VOLTAGE_REGULATOR behaviour', () => {
    const circuit = (voltage, outputVoltage) => ({
      components: [power('src', voltage), { uid: 'reg', type: 'VOLTAGE_REGULATOR', parameters: { outputVoltage } },
        { uid: 'load', type: 'RESISTOR' }],
      wires: [wire('src', '5V', 'reg', 'IN'), wire('src', 'GND', 'reg', 'GND'),
        wire('reg', 'OUT', 'load', 'A'), wire('reg', 'GND', 'load', 'B')],
    })
    const ok = run(circuit(12, 5))
    expect(domain(ok, 'reg:OUT').voltage).toBe(5)
    expect(ok.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 220 })
    expect(domain(run(circuit(3, 5)), 'reg:OUT')).toBeNull()
  })
  it('T17 keeps historical DC circuits unchanged', () => {
    const components = [{ uid: 's', type: 'POWER' }, { uid: 'r1', type: 'RESISTOR' }, { uid: 'r2', type: 'RESISTOR' }]
    const wires = [wire('s', '5V', 'r1', 'A'), wire('r1', 'B', 'r2', 'A'), wire('r2', 'B', 's', 'GND')]
    expect(run({ components, wires }).dcAnalysis.get('r2')).toEqual({ voltage: 5, current: 5 / 220 })
  })
  it('T18 generic engine stays Open/Closed with no production A11 type', async () => {
    const code = executable(src('resolution.js'))
    expect(code).toContain('getDcVoltageDomainContribution(comp.type)')
    expect(code.match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g)).toEqual(['comp.type !== "ARDUINO"'])
    expect(code).not.toMatch(/switch\s*\([^)]*\.type/)
    expect(code.match(/resolveSignals\(/g)).toHaveLength(1)
    expect(src('resolution.js')).not.toMatch(/555|LM358|LM393|OPTO|COMPARATOR|OP_AMP|FIXTURE/i)
    // A11-COMP3 (CSA R2): the registry is the Open/Closed point where production A11 types
    // (LM358P) are declared; it never holds test fixtures nor type branches.
    expect(src('dcVoltageDomainRegistry.js')).not.toMatch(/FIXTURE/i)
    expect(executable(src('dcVoltageDomainRegistry.js'))).not.toMatch(/\.type\s*(?:===|!==)|switch\s*\(/)
    const registry = await vi.importActual('../dcVoltageDomainRegistry.js')
    const canonical = await vi.importActual('../canonicalRegistry.js')
    for (const type of Object.keys(FIXTURES)) {
      expect(registry.hasDcVoltageDomainContribution(type)).toBe(false)
      expect(canonical.getCanonicalEntry(type)).toBeFalsy()
    }
  })
  it('T19/T20 has no React/DOM/Canvas dependency and no system clock', () => {
    for (const name of ['resolution.js', 'dcVoltageDomainRegistry.js']) {
      const text = src(name)
      for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) expect(match[1]).toMatch(/^\.\/[^/]+\.js$/)
      const code = executable(text)
      expect(code).not.toMatch(/\b(?:React|document|window|canvas|getContext)\b/)
      expect(code).not.toMatch(/Date\.now|new Date|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    }
  })
})

/**
 * Grouped fixture driven by one adjustable primary per input/supply pin. Every
 * primary ground joins `reference` unless isolated; a floating pin is unwired.
 */
function grouped({ levels = {}, floating = [], isolated = [], groundSupply = false, loads = false, chain = false } = {}) {
  const drive = { aPlus: 3, aMinus: 1, bPlus: 4, bMinus: 2, supply: 5, ...levels }
  const components = [{ uid: 'g', type: 'GROUPED_ANALOG_FIXTURE' }, power('gnd', 5)]
  const wires = [wire('gnd', 'GND', 'g', 'reference')]
  for (const [pin, voltage] of Object.entries(drive)) {
    if (floating.includes(pin) || (pin === 'supply' && groundSupply) || (pin === 'bPlus' && chain)) continue
    components.push(power(`v_${pin}`, voltage))
    wires.push(wire(`v_${pin}`, '5V', 'g', pin))
    if (!isolated.includes(pin)) wires.push(wire(`v_${pin}`, 'GND', 'g', 'reference'))
  }
  if (groundSupply) wires.push(wire('gnd', 'GND', 'g', 'supply'))
  if (loads) {
    components.push({ uid: 'loadA', type: 'RESISTOR' }, { uid: 'loadB', type: 'RESISTOR' })
    wires.push(wire('g', 'aOut', 'loadA', 'A'), wire('gnd', 'GND', 'loadA', 'B'),
      wire('g', 'bOut', 'loadB', 'A'), wire('gnd', 'GND', 'loadB', 'B'))
  }
  if (chain) {
    // aOut feeds group B of the same component and a downstream controlled follower.
    components.push({ uid: 'f', type: 'ANALOG_FOLLOW_FIXTURE' })
    wires.push(wire('g', 'aOut', 'g', 'bPlus'), wire('g', 'aOut', 'f', 'in'), wire('gnd', 'GND', 'f', 'reference'))
  }
  return { components, wires }
}
const runCounted = (c) => {
  groupCalls.A = 0
  groupCalls.B = 0
  return run(c)
}
const volts = (result, key) => domain(result, key)?.voltage
const sharesReference = (result, key) => domain(result, key).reference === domain(result, 'g:reference').reference

describe('A11-COMP3-PREQ1 independent controlled analog groups', () => {
  it('G1 produces both outputs when both groups are resolved', () => {
    const result = runCounted(grouped())
    expect(volts(result, 'g:aOut')).toBe(2)
    expect(volts(result, 'g:bOut')).toBe(3)
    expect(sharesReference(result, 'g:aOut') && sharesReference(result, 'g:bOut')).toBe(true)
    expect(groupCalls.A).toBeGreaterThan(0)
    expect(groupCalls.B).toBeGreaterThan(0)
  })
  it('G2 an unresolved input of group A reserves only aOut', () => {
    const result = runCounted(grouped({ floating: ['aMinus'] }))
    expect(domain(result, 'g:aOut')).toBeNull()
    expect(volts(result, 'g:bOut')).toBe(3)
    expect(groupCalls.A).toBe(0)
  })
  it('G3 an unresolved input of group B reserves only bOut', () => {
    const result = runCounted(grouped({ floating: ['bPlus'] }))
    expect(domain(result, 'g:bOut')).toBeNull()
    expect(volts(result, 'g:aOut')).toBe(2)
    expect(groupCalls.B).toBe(0)
  })
  it('G4 an input of another reference domain invalidates only its own group', () => {
    const a = run(grouped({ isolated: ['aMinus'] }))
    expect(domain(a, 'g:aMinus').reference).not.toBe(domain(a, 'g:reference').reference)
    expect(domain(a, 'g:aOut')).toBeNull()
    expect(volts(a, 'g:bOut')).toBe(3)
    const b = run(grouped({ isolated: ['bPlus'] }))
    expect(domain(b, 'g:bOut')).toBeNull()
    expect(volts(b, 'g:aOut')).toBe(2)
  })
  it('G5 a floating required positive pin disables every group without calling contribute', () => {
    const result = runCounted(grouped({ floating: ['supply'] }))
    expect(domain(result, 'g:aOut')).toBeNull()
    expect(domain(result, 'g:bOut')).toBeNull()
    expect(groupCalls).toEqual({ A: 0, B: 0 })
  })
  it('G6 a 0 V required positive pin disables every group', () => {
    const result = runCounted(grouped({ groundSupply: true }))
    expect(domain(result, 'g:supply')).toMatchObject({ voltage: 0 })
    expect(domain(result, 'g:aOut')).toBeNull()
    expect(domain(result, 'g:bOut')).toBeNull()
    expect(groupCalls).toEqual({ A: 0, B: 0 })
  })
  it('G7 a required positive pin of an isolated domain disables every group', () => {
    const result = runCounted(grouped({ isolated: ['supply'] }))
    expect(volts(result, 'g:supply')).toBe(5)
    expect(sharesReference(result, 'g:supply')).toBe(false)
    expect(domain(result, 'g:aOut')).toBeNull()
    expect(domain(result, 'g:bOut')).toBeNull()
    expect(groupCalls).toEqual({ A: 0, B: 0 })
  })
  it('G8 a missing or invalid output of one group reserves only that output', () => {
    const missing = run(grouped({ levels: { aPlus: 2, aMinus: 2 } }))
    expect(domain(missing, 'g:aOut')).toBeNull()
    expect(volts(missing, 'g:bOut')).toBe(3)
    const invalid = run(grouped({ levels: { bPlus: 2, bMinus: 2 } }))
    expect(domain(invalid, 'g:bOut')).toBeNull()
    expect(volts(invalid, 'g:aOut')).toBe(2)
  })
  it('G9 groups produce distinct numeric outputs simultaneously', () => {
    const result = run(grouped({ levels: { aPlus: 5, aMinus: 1, bPlus: 1, bMinus: 2 } }))
    expect(volts(result, 'g:aOut')).toBe(4)
    expect(volts(result, 'g:bOut')).toBe(1.5)
    const low = run(grouped({ levels: { aPlus: 1, aMinus: 3 } }))
    expect(volts(low, 'g:aOut')).toBe(0)
    expect(volts(low, 'g:bOut')).toBe(3)
  })
  it('G10 valid outputs feed downstream loads; a load never back-powers an inactive group', () => {
    const result = run(grouped({ loads: true }))
    expect(result.dcAnalysis.get('loadA')).toEqual({ voltage: 2, current: 2 / 220 })
    expect(result.dcAnalysis.get('loadB')).toEqual({ voltage: 3, current: 3 / 220 })
    const partial = run(grouped({ loads: true, floating: ['aMinus'] }))
    expect(domain(partial, 'g:aOut')).toBeNull()
    expect(partial.dcAnalysis.has('loadA')).toBe(false)
    expect(partial.dcAnalysis.get('loadB')).toEqual({ voltage: 3, current: 3 / 220 })
  })
  it('G11 a grouped output converges as the input of controlled contributors', () => {
    const result = run(grouped({ chain: true, levels: { bMinus: 4 } }))
    expect(volts(result, 'g:aOut')).toBe(2)
    expect(volts(result, 'g:bPlus')).toBe(2)
    expect(volts(result, 'g:bOut')).toBe(3)
    expect(volts(result, 'f:out')).toBe(2)
    const unresolved = run(grouped({ chain: true, levels: { bMinus: 4 }, floating: ['aMinus'] }))
    expect(domain(unresolved, 'g:bOut')).toBeNull()
    expect(domain(unresolved, 'f:out')).toBeNull()
  })
  it('G12 is independent of component ordering', () => {
    const c = grouped({ chain: true, loads: true, levels: { bMinus: 4 } })
    const expected = normalized(run(c))
    for (let i = 0; i < c.components.length; i++) {
      const components = [...c.components.slice(i), ...c.components.slice(0, i)]
      expect(normalized(run({ components, wires: c.wires }))).toEqual(expected)
      expect(normalized(run({ components: [...components].reverse(), wires: c.wires }))).toEqual(expected)
    }
  })
  it('G13 is independent of wire ordering', () => {
    const c = grouped({ chain: true, loads: true, levels: { bMinus: 4 } })
    const expected = normalized(run(c))
    for (let i = 0; i < c.wires.length; i++) {
      const wires = [...c.wires.slice(i), ...c.wires.slice(0, i)]
      expect(normalized(run({ components: c.components, wires }))).toEqual(expected)
      expect(normalized(run({ components: c.components, wires: [...wires].reverse() }))).toEqual(expected)
    }
  })
  it('G14 repeated executions give identical results', () => {
    const c = grouped({ chain: true, loads: true, levels: { bMinus: 4 } })
    const first = normalized(run(c))
    for (let i = 0; i < 3; i++) expect(normalized(run(c))).toEqual(first)
  })
  const scenarios = () => [grouped(), grouped({ floating: ['aMinus'] }), grouped({ floating: ['supply'] }),
    grouped({ isolated: ['bPlus'] }), grouped({ levels: { bPlus: 2, bMinus: 2 } }),
    grouped({ chain: true, loads: true, levels: { bMinus: 4 } })]
  it('G15 keeps pinSignals exclusively Signal.*', () => {
    for (const c of scenarios()) {
      const result = run(c)
      expect(onlySignals(result)).toBe(true)
      expect([...result.pinSignals.values()].some(v => typeof v === 'number')).toBe(false)
    }
  })
  it('G16 keeps numeric voltages only in dcVoltageDomains', () => {
    for (const c of scenarios()) {
      for (const fact of run(c).dcVoltageDomains.values()) {
        if (fact === null || fact === undefined) continue
        expect(Number.isFinite(fact.voltage) && fact.voltage >= 0).toBe(true)
        expect(typeof fact.reference).toBe('string')
      }
    }
  })
})
