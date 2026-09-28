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
}

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
    for (const name of ['resolution.js', 'dcVoltageDomainRegistry.js']) {
      expect(src(name)).not.toMatch(/555|LM358|LM393|OPTO|COMPARATOR|OP_AMP|FIXTURE/i)
    }
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
