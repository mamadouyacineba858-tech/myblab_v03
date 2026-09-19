import { describe, it, expect } from 'vitest'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'

const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
function domain(id, type = 'POWER', positive = '5V', negative = 'GND') {
  return {
    components: [{ uid: `${id}s`, type }, { uid: `${id}r`, type: 'RESISTOR' }],
    wires: [wire(`${id}s`, positive, `${id}r`, 'A'), wire(`${id}s`, negative, `${id}r`, 'B')],
  }
}
function combine(...circuits) {
  return { components: circuits.flatMap(c => c.components), wires: circuits.flatMap(c => c.wires) }
}
const independent = () => combine(domain('a'), domain('b', 'BATTERY_9V', 'plus', 'minus'))
const resolve = ({ components, wires }) => resolveSignals(components, prepareCircuit(components, wires))
const analysis = voltage => ({ voltage, current: voltage / 220 })
const normalize = result => Object.fromEntries(Object.entries(result).map(([name, map]) =>
  [name, [...map].sort(([a], [b]) => a.localeCompare(b))]))
function regulated() {
  const c = domain('b', 'BATTERY_9V', 'plus', 'minus')
  c.components.push({ uid: 'reg', type: 'VOLTAGE_REGULATOR' }, { uid: 'regulated', type: 'RESISTOR' })
  c.wires.push(wire('bs', 'plus', 'reg', 'IN'), wire('bs', 'minus', 'reg', 'GND'),
    wire('reg', 'OUT', 'regulated', 'A'), wire('bs', 'minus', 'regulated', 'B'))
  return c
}

describe('A8 multi-primary DC foundation', () => {
  it('T1 preserves exact single-source analysis', () => {
    expect([...resolve(domain('a')).dcAnalysis]).toEqual([['ar', analysis(5)]])
  })
  it('T2/T4 analyzes both independent loads at their own voltage', () => {
    const result = resolve(independent())
    expect([...result.dcAnalysis]).toEqual([['ar', analysis(5)], ['br', analysis(9)]])
  })
  it('T3 is invariant under every rotation of component order and reversed wires', () => {
    const c = independent()
    const expected = normalize(resolve(c))
    for (let i = 0; i < c.components.length; i++) {
      expect(normalize(resolve({ components: [...c.components.slice(i), ...c.components.slice(0, i)].reverse(),
        wires: [...c.wires].reverse() }))).toEqual(expected)
    }
  })
  it('T3 source ownership does not depend on UID lexical ordering', () => {
    for (const [a, b] of [['a', 'z'], ['z', 'a']]) {
      const result = resolve(combine(domain(a), domain(b, 'BATTERY_9V', 'plus', 'minus')))
      expect(result.dcAnalysis.get(`${a}r`)).toEqual(analysis(5))
      expect(result.dcAnalysis.get(`${b}r`)).toEqual(analysis(9))
    }
  })
  it.each(['parallel', 'opposing'])('T5/T6 isolates %s primary conflict', mode => {
    const c = combine(independent(), domain('c', 'BATTERY_AA', 'plus', 'minus'))
    c.wires.push(wire('as', '5V', 'bs', mode === 'parallel' ? 'plus' : 'minus'))
    if (mode === 'parallel') c.wires.push(wire('as', 'GND', 'bs', 'minus'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = resolve({ ...c, components })
      expect(result.dcAnalysis.has('ar')).toBe(false)
      expect(result.dcAnalysis.has('br')).toBe(false)
      expect(result.dcAnalysis.get('cr')).toEqual(analysis(1.5))
      expect(result.dcVoltageDomains.get('as:5V')).toBeNull()
    }
  })
  it('T4 cannot combine the positive supply of one source with another reference', () => {
    const c = independent()
    c.components.push({ uid: 'cross', type: 'LDR' })
    c.wires.push(wire('as', '5V', 'cross', 'A'), wire('bs', 'minus', 'cross', 'B'))
    const result = resolve(c)
    expect(result.dcAnalysis.has('cross')).toBe(false)
    expect(result.dcAnalysis.get('ar')).toEqual(analysis(5))
    expect(result.dcAnalysis.get('br')).toEqual(analysis(9))
  })
  it('allows separate supplies sharing only their physical reference', () => {
    const c = independent()
    c.wires.push(wire('as', 'GND', 'bs', 'minus'))
    expect([...resolve(c).dcAnalysis]).toEqual([['ar', analysis(5)], ['br', analysis(9)]])
  })
  it('T7 preserves the production regulator with a single primary', () => {
    const result = resolve(regulated())
    expect(result.dcAnalysis.get('br')).toEqual(analysis(9))
    expect(result.dcAnalysis.get('regulated')).toEqual(analysis(5))
  })
  it('T8 resolves primary, regulated and unrelated primary loads together', () => {
    const c = combine(regulated(), domain('c', 'BATTERY_AA', 'plus', 'minus'))
    const result = resolve(c)
    expect(result.dcAnalysis.get('br')).toEqual(analysis(9))
    expect(result.dcAnalysis.get('regulated')).toEqual(analysis(5))
    expect(result.dcAnalysis.get('cr')).toEqual(analysis(1.5))
    expect(result.dcVoltageDomains.get('reg:OUT').reference).toBe(result.dcVoltageDomains.get('reg:GND').reference)
    expect(normalize(resolve({ components: [...c.components].reverse(), wires: [...c.wires].reverse() })))
      .toEqual(normalize(result))
  })
  it('conflicted regulator input cannot manufacture an output or erase an unrelated domain', () => {
    const c = combine(regulated(), domain('a'), domain('c', 'BATTERY_AA', 'plus', 'minus'))
    c.wires.push(wire('as', '5V', 'bs', 'plus'), wire('as', 'GND', 'bs', 'minus'))
    const result = resolve(c)
    expect(result.dcVoltageDomains.get('reg:OUT')).toBeNull()
    expect([...result.dcAnalysis]).toEqual([['cr', analysis(1.5)]])
  })
  it('extends local authority through the existing passive conduction contract', () => {
    const c = independent()
    c.components.push({ uid: 'load', type: 'LDR' })
    c.wires = c.wires.filter(w => w.toUid !== 'ar' || w.toPin !== 'B')
    c.wires.push(wire('ar', 'B', 'load', 'A'), wire('as', 'GND', 'load', 'B'))
    const result = resolve(c)
    expect(result.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 10000 })
    expect(result.dcAnalysis.get('br')).toEqual(analysis(9))
  })
  it('competing passive paths never select a source by traversal order', () => {
    const c = independent()
    c.components.push({ uid: 'load', type: 'LDR' })
    c.wires = c.wires.filter(w => w.toPin !== 'B')
    c.wires.push(wire('ar', 'B', 'load', 'A'), wire('br', 'B', 'load', 'A'), wire('as', 'GND', 'load', 'B'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = resolve({ ...c, components })
      expect(result.dcVoltageDomains.get('load:A')).toBeNull()
      expect(result.dcAnalysis.has('load')).toBe(false)
    }
  })
  it.each([false, true])('T9 never mutates physical topology, with conflict=%s', conflict => {
    const c = combine(regulated(), domain('a'))
    if (conflict) c.wires.push(wire('as', '5V', 'bs', 'minus'))
    const prepared = prepareCircuit(c.components, c.wires)
    const { uf, nets, allKeys } = prepared
    const before = structuredClone({ parent: uf.parent, nets, allKeys, ...c })
    const first = normalize(resolveSignals(c.components, prepared))
    expect(normalize(resolveSignals([...c.components].reverse(), prepared))).toEqual(first)
    expect(prepared.uf).toBe(uf)
    expect(prepared.nets).toBe(nets)
    expect({ parent: uf.parent, nets, allKeys, ...c }).toEqual(before)
  })
  it('zero sources cannot use external digital levels as voltage authority', () => {
    const components = [{ uid: 'load', type: 'RESISTOR' }]
    const result = resolveSignals(components, prepareCircuit(components, []), new Map([['load:A', 'HIGH'], ['load:B', 'LOW']]))
    expect(result.dcAnalysis.size).toBe(0)
  })
})
