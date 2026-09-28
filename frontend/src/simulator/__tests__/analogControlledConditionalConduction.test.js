import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'

// A11-ANALOG-PREQ2 — test-only open-collector comparator. Not a production type.
const FIXTURE = 'OC_COMPARE_FIXTURE'
// Plain recorder: the official vitest config resets vi.fn implementations.
const calls = []
function contribute(args) {
  const { plus, minus } = args.inputVoltages
  const value = plus > minus ? [['output', 'reference']] : []
  calls.push({ args, value })
  return value
}

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getCanonicalEntry: (type) => type === FIXTURE ? {
    pins: ['plus', 'minus', 'reference', 'output'].map(id => ({ id })), modelAvailable: true, defaultParameters: {},
  } : actual.getCanonicalEntry(type) }
})
vi.mock('../analogConditionalConductionRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getAnalogConditionalConduction: (type) => type === FIXTURE
    ? { inputPins: ['plus', 'minus'], referencePin: 'reference', contribute }
    : actual.getAnalogConditionalConduction(type) }
})

beforeEach(() => { calls.length = 0 })

const here = dirname(fileURLToPath(import.meta.url))
const src = (name) => readFileSync(resolvePath(here, '..', name), 'utf8')
const executable = (text) => text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const power = (uid, voltage) => ({ uid, type: 'POWER', parameters: { voltage } })

/** vp/vm drive plus/minus, vcc feeds the external pull-up; grounds are common. */
function circuit({ plus = 3, minus = 2, pullUp = true, sharedGround = true } = {}) {
  const components = [power('vp', plus), power('vm', minus), power('vcc', 5), { uid: 'cmp', type: FIXTURE }]
  const wires = [wire('vp', '5V', 'cmp', 'plus'), wire('vm', '5V', 'cmp', 'minus'),
    wire('vp', 'GND', 'cmp', 'reference'), wire('vcc', 'GND', 'vp', 'GND')]
  if (sharedGround) wires.push(wire('vm', 'GND', 'vp', 'GND'))
  if (pullUp) {
    components.push({ uid: 'pu', type: 'RESISTOR' })
    wires.push(wire('vcc', '5V', 'pu', 'A'), wire('pu', 'B', 'cmp', 'output'))
  }
  return { components, wires }
}
/** Two open-collector stages: cmp's pulled-up output drives cmp2.plus. */
function chain(plus, minus) {
  const c = circuit({ plus, minus })
  c.components.push({ uid: 'cmp2', type: FIXTURE }, { uid: 'pu2', type: 'RESISTOR' })
  c.wires.push(wire('cmp', 'output', 'cmp2', 'plus'), wire('vm', '5V', 'cmp2', 'minus'),
    wire('vp', 'GND', 'cmp2', 'reference'), wire('vcc', '5V', 'pu2', 'A'), wire('pu2', 'B', 'cmp2', 'output'))
  return c
}
const run = (c, external = null) => resolveSignals(c.components, prepareCircuit(c.components, c.wires), external)
const fact = (result, key) => result.dcVoltageDomains.get(key)
const ground = (result) => fact(result, 'vp:GND')
const normalized = (result) => Object.fromEntries(Object.entries(result)
  .map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))
const pairsReturned = () => calls.flatMap(({ value }) => value)

describe('A11-ANALOG-PREQ2 analog-controlled conditional conduction', () => {
  it('T1 selects output/reference for 3 V > 2 V although both inputs are digital HIGH', () => {
    const result = run(circuit({ plus: 3, minus: 2 }))
    expect(result.pinSignals.get('cmp:plus')).toBe(Signal.HIGH)
    expect(result.pinSignals.get('cmp:minus')).toBe(Signal.HIGH)
    expect(calls.map(({ args }) => args.inputVoltages)).toContainEqual({ plus: 3, minus: 2 })
    expect(pairsReturned()).toContainEqual(['output', 'reference'])
    expect(fact(result, 'cmp:output')).toEqual(ground(result))
  })
  it('T2 selects no pair for 2 V < 3 V', () => {
    run(circuit({ plus: 2, minus: 3 }))
    expect(calls.length).toBeGreaterThan(0)
    expect(pairsReturned()).toEqual([])
  })
  it('T3 equality follows the strict fixture policy: no conduction', () => {
    const result = run(circuit({ plus: 2, minus: 2 }))
    expect(pairsReturned()).toEqual([])
    expect(fact(result, 'cmp:output').voltage).toBe(5)
  })
  it('T4 inactive output is high-Z: the external pull-up sets the net', () => {
    const result = run(circuit({ plus: 2, minus: 3 }))
    expect(fact(result, 'cmp:output')).toEqual({ voltage: 5, reference: ground(result).reference })
  })
  it('T5 active output conducts to the reference, without a fixture-owned source', () => {
    const result = run(circuit({ plus: 3, minus: 2 }))
    expect(fact(result, 'cmp:output')).toEqual({ voltage: 0, reference: ground(result).reference })
    expect(result.dcAnalysis.get('pu')).toEqual({ voltage: 5, current: 5 / 220 })
    for (const value of pairsReturned().flat()) expect(typeof value).toBe('string')
    // Without a resolved reference no pair is selected: the pull-up keeps the net.
    const floating = circuit({ plus: 3, minus: 2 })
    floating.wires = floating.wires.filter(w => w.toPin !== 'reference')
    expect(fact(run(floating), 'cmp:output').voltage).toBe(5)
  })
  it('T6 inactive output without pull-up stays unresolved, never HIGH', () => {
    const result = run(circuit({ plus: 2, minus: 3, pullUp: false }))
    expect(fact(result, 'cmp:output')).toBeUndefined()
    expect(result.pinSignals.get('cmp:output')).not.toBe(Signal.HIGH)
  })
  it('T7 never compares inputs of incompatible references', () => {
    const result = run(circuit({ plus: 3, minus: 2, sharedGround: false }))
    expect(fact(result, 'cmp:minus').reference).not.toBe(fact(result, 'cmp:plus').reference)
    expect(calls).toEqual([])
    expect(fact(result, 'cmp:output').voltage).toBe(5)
  })
  it('T8 missing reference: no conduction', () => {
    const c = circuit()
    c.wires = c.wires.filter(w => !(w.toUid === 'cmp' && w.toPin === 'reference'))
    const result = run(c)
    expect(calls).toEqual([])
    expect(fact(result, 'cmp:output').voltage).toBe(5)
  })
  it('T9 missing analog input: no conduction', () => {
    const c = circuit()
    c.wires = c.wires.filter(w => !(w.toUid === 'cmp' && w.toPin === 'minus'))
    const result = run(c)
    expect(calls).toEqual([])
    expect(fact(result, 'cmp:output').voltage).toBe(5)
  })
  it('T10 conflicting analog input: no conduction', () => {
    const c = circuit()
    c.components.push(power('vx', 4))
    c.wires.push(wire('vx', '5V', 'cmp', 'minus'), wire('vx', 'GND', 'vp', 'GND'))
    const result = run(c)
    expect(fact(result, 'cmp:minus')).toBeNull()
    expect(calls).toEqual([])
    expect(fact(result, 'cmp:output').voltage).toBe(5)
  })
  it('T11 digital HIGH/LOW cannot substitute volts', () => {
    const c = { components: [{ uid: 'cmp', type: FIXTURE }], wires: [] }
    const result = run(c, new Map([['cmp:plus', Signal.HIGH], ['cmp:minus', Signal.LOW], ['cmp:reference', Signal.LOW]]))
    expect(calls).toEqual([])
    expect([...result.dcVoltageDomains.values()].some(Boolean)).toBe(false)
  })
  it('T12/T13 is independent of component and wire ordering', () => {
    for (const [plus, minus] of [[3, 2], [2, 3]]) {
      const c = chain(plus, minus)
      const expected = normalized(run(c))
      for (let i = 0; i < c.components.length; i++) {
        const components = [...c.components.slice(i), ...c.components.slice(0, i)]
        const wires = [...c.wires.slice(i), ...c.wires.slice(0, i)]
        expect(normalized(run({ components, wires }))).toEqual(expected)
        expect(normalized(run({ components: [...components].reverse(), wires: [...wires].reverse() }))).toEqual(expected)
      }
    }
  })
  it('T14 composes with existing passive conduction in a pull-up chain', () => {
    const build = (plus, minus) => {
      const c = circuit({ plus, minus, pullUp: false })
      c.components.push({ uid: 'r1', type: 'RESISTOR' }, { uid: 'r2', type: 'RESISTOR' })
      c.wires.push(wire('vcc', '5V', 'r1', 'A'), wire('r1', 'B', 'r2', 'A'), wire('r2', 'B', 'cmp', 'output'))
      return c
    }
    const idle = run(build(2, 3))
    expect(fact(idle, 'cmp:output').voltage).toBe(5)
    expect(fact(idle, 'r1:B').voltage).toBe(5)
    const sinking = run(build(3, 2))
    expect(fact(sinking, 'cmp:output').voltage).toBe(0)
    // No divider is solved: the intermediate net between two authorities stays conservative.
    expect(fact(sinking, 'r1:B')).toBeNull()
  })
  it('T15 retracts a pair when the analog authorities change', () => {
    expect(fact(run(circuit({ plus: 3, minus: 2 })), 'cmp:output').voltage).toBe(0)
    expect(fact(run(circuit({ plus: 2, minus: 3 })), 'cmp:output').voltage).toBe(5)
  })
  it('T15b retracts a transiently selected pair within the fixed-point', () => {
    const c = chain(3, 2)
    // cmp.plus is reached only through passive conduction: cmp selects one round late.
    c.wires = c.wires.map(w => w.toUid === 'cmp' && w.toPin === 'plus' ? wire('vp', '5V', 'rin', 'A') : w)
    c.components.push({ uid: 'rin', type: 'RESISTOR' })
    c.wires.push(wire('rin', 'B', 'cmp', 'plus'))
    const result = run(c)
    // cmp2 first observed the pulled-up 5 V and selected its pair ...
    expect(calls.some(({ args, value }) => args.inputVoltages.plus === 5 && value.length === 1)).toBe(true)
    // ... then cmp sank that net to 0 V and the obsolete pair did not survive.
    expect(fact(result, 'cmp:output').voltage).toBe(0)
    expect(fact(result, 'cmp2:output').voltage).toBe(5)
  })
  it('T16 incompatible authorities met by active conduction are conservative', () => {
    const c = circuit({ plus: 3, minus: 2, pullUp: false })
    c.wires.push(wire('vcc', '5V', 'cmp', 'output'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = run({ components, wires: [...c.wires].reverse() })
      expect(fact(result, 'cmp:output')).toBeNull()
      expect(result.dcAnalysis.size).toBe(0)
    }
  })
  it('T17 agreeing authorities through conduction remain usable (wired-AND)', () => {
    for (const [p2, m2] of [[3, 2], [2, 3]]) {
      const c = circuit({ plus: 3, minus: 2 })
      c.components.push(power('vp2', p2), power('vm2', m2), { uid: 'twin', type: FIXTURE })
      c.wires.push(wire('vp2', '5V', 'twin', 'plus'), wire('vm2', '5V', 'twin', 'minus'),
        wire('vp2', 'GND', 'vp', 'GND'), wire('vm2', 'GND', 'vp', 'GND'),
        wire('vp', 'GND', 'twin', 'reference'), wire('twin', 'output', 'cmp', 'output'))
      const result = run(c)
      expect(fact(result, 'cmp:output')).toEqual({ voltage: 0, reference: ground(result).reference })
      expect(result.dcAnalysis.get('pu')).toEqual({ voltage: 5, current: 5 / 220 })
    }
  })
  it('T18 converges across a chain of two analog-controlled stages', () => {
    const idle = run(chain(2, 3))
    expect(fact(idle, 'cmp:output').voltage).toBe(5)
    expect(fact(idle, 'cmp2:output').voltage).toBe(0)
    const sinking = run(chain(3, 2))
    expect(fact(sinking, 'cmp:output').voltage).toBe(0)
    expect(fact(sinking, 'cmp2:output').voltage).toBe(5)
  })
  it('T19 an oscillating selection terminates conservatively', () => {
    // Positive feedback through the pull-up: 5 V > 2 V sinks the output, 0 V < 2 V releases it.
    const c = circuit({ plus: 3, minus: 2 })
    c.wires = c.wires.map(w => w.toUid === 'cmp' && w.toPin === 'plus' ? wire('cmp', 'output', 'cmp', 'plus') : w)
    const result = run(c)
    expect(fact(result, 'cmp:output')).toBeNull()
    expect(calls.length).toBeLessThan(50)
    expect(normalized(run(c))).toEqual(normalized(result))
  })
  it('T20/T21 keeps numbers in dcVoltageDomains only, pinSignals stay Signal.*', () => {
    for (const c of [circuit({ plus: 3, minus: 2 }), circuit({ plus: 2, minus: 3 }), chain(3, 2)]) {
      const result = run(c)
      expect([...result.pinSignals.values()].every(v => Object.values(Signal).includes(v))).toBe(true)
      expect([...result.dcVoltageDomains.values()].some(v => typeof v?.voltage === 'number')).toBe(true)
    }
  })
  it('T22 keeps legacy digital conduction types out of the analog registry', async () => {
    const analog = await vi.importActual('../analogConditionalConductionRegistry.js')
    const { getConditionalConduction } = await vi.importActual('../conditionalConductionRegistry.js')
    for (const type of ['RELAY', 'NPN_TRANSISTOR', 'PNP_TRANSISTOR', 'NMOS', 'PMOS', 'H_BRIDGE']) {
      expect(analog.hasAnalogConditionalConduction(type)).toBe(false)
      expect(getConditionalConduction(type)).toBeTypeOf('function')
    }
  })
  it('T24 generic engine stays Open/Closed', () => {
    const code = executable(src('resolution.js'))
    expect(code).toContain('getAnalogConditionalConduction(comp.type)')
    expect(code.match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g)).toEqual(['comp.type !== "ARDUINO"'])
    expect(code).not.toMatch(/switch\s*\([^)]*\.type/)
    expect(code.match(/resolveSignals\(/g)).toHaveLength(1)
    for (const name of ['resolution.js', 'analogConditionalConductionRegistry.js']) {
      expect(src(name)).not.toMatch(/555|556|LM339|LM393|LM358|OP_?AMP|4N35|OPTOCOUPLER|COMPARATOR|FIXTURE/i)
    }
  })
  it('T25 fixture types are absent from production registries', async () => {
    const analog = await vi.importActual('../analogConditionalConductionRegistry.js')
    const canonical = await vi.importActual('../canonicalRegistry.js')
    expect(analog.hasAnalogConditionalConduction(FIXTURE)).toBe(false)
    expect(analog.getAnalogConditionalConduction(FIXTURE)).toBeNull()
    expect(canonical.getCanonicalEntry(FIXTURE)).toBeFalsy()
  })
  it('T26 leaves the prepared topology, components and wires untouched', () => {
    const c = chain(3, 2)
    const prepared = prepareCircuit(c.components, c.wires)
    const { nets, uf } = prepared
    const snapshot = structuredClone({ nets, parent: uf.parent, allKeys: prepared.allKeys, ...c })
    resolveSignals(c.components, prepared)
    expect(prepared.nets).toBe(nets)
    expect(prepared.uf).toBe(uf)
    expect({ nets, parent: uf.parent, allKeys: prepared.allKeys, ...c }).toEqual(snapshot)
  })
  it('T27 repeated execution is strictly identical', () => {
    const c = chain(3, 2)
    const first = normalized(run(c))
    for (let i = 0; i < 3; i++) expect(normalized(run(c))).toEqual(first)
  })
  it('T28 has no React/DOM/Canvas dependency and no system clock', () => {
    for (const name of ['resolution.js', 'analogConditionalConductionRegistry.js']) {
      const text = src(name)
      for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) expect(match[1]).toMatch(/^\.\/[^/]+\.js$/)
      const code = executable(text)
      expect(code).not.toMatch(/\b(?:React|document|window|canvas|getContext)\b/)
      expect(code).not.toMatch(/Date\.now|new Date|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    }
  })
})
