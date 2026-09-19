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

function controlledConflict() {
  const c = combine(independent(), domain('c', 'BATTERY_AA', 'plus', 'minus'))
  c.components.push({ uid: 'switch', type: 'NMOS' }, { uid: 'cpu', type: 'ARDUINO' })
  c.wires.push(wire('as', '5V', 'bs', 'minus'), wire('cs', 'plus', 'switch', 'drain'),
    wire('cs', 'minus', 'switch', 'source'), wire('cpu', 'D2', 'switch', 'gate'))
  return c
}

function resolveExternal(c, external) {
  return resolveSignals(c.components, prepareCircuit(c.components, c.wires), external)
}

describe('A8 multi-primary DC foundation', () => {
  it.each([
    ['NPN_TRANSISTOR', 'collector', 'emitter', 'base'],
    ['NMOS', 'drain', 'source', 'gate'],
  ])('CR1 preserves independent externally controlled %s during a primary conflict', (type, positive, negative, control) => {
    const valid = domain('c', 'BATTERY_AA', 'plus', 'minus')
    valid.components.push({ uid: 'switch', type }, { uid: 'idle', type }, { uid: 'cpu', type: 'ARDUINO' })
    valid.wires.push(wire('cs', 'plus', 'switch', positive), wire('cs', 'minus', 'switch', negative),
      wire('cs', 'plus', 'idle', positive), wire('cs', 'minus', 'idle', negative),
      wire('cpu', 'D2', 'switch', control))
    const external = new Map([['cpu:D2', 'HIGH']])
    const before = resolveSignals(valid.components, prepareCircuit(valid.components, valid.wires), external)
    expect(before.dcAnalysis.get('switch')).toEqual({ voltage: 1.5, current: 1.5 })
    expect(before.dcAnalysis.get('idle')).toEqual({ voltage: 1.5, current: 0 })
    const c = combine(independent(), valid)
    c.wires.push(wire('as', '5V', 'bs', 'minus'))
    const results = []
    for (const reversed of [false, true]) {
      const components = reversed ? [...c.components].reverse() : c.components
      const wires = reversed ? [...c.wires].reverse() : c.wires
      const prepared = prepareCircuit(components, wires)
      const snapshot = structuredClone({ nets: prepared.nets, parent: prepared.uf.parent })
      const result = resolveSignals(components, prepared, external)
      expect([...result.pinSignals.values()].every(signal => signal === 'UNKNOWN')).toBe(true)
      expect(result.dcVoltageDomains.get('as:5V')).toBeNull()
      expect(result.dcAnalysis.has('ar')).toBe(false)
      expect(result.dcAnalysis.has('br')).toBe(false)
      expect(result.dcAnalysis.get('switch')).toEqual(before.dcAnalysis.get('switch'))
      expect(result.dcAnalysis.get('idle')).toEqual(before.dcAnalysis.get('idle'))
      expect({ nets: prepared.nets, parent: prepared.uf.parent }).toEqual(snapshot)
      results.push(normalize(result))
    }
    expect(results[0]).toEqual(results[1])
  })
  it.each(['HIGH', 'LOW', 'UNKNOWN', 'FLOATING'])('CR1 local control preserves %s without inventing a level', signal => {
    const result = resolveExternal(controlledConflict(), new Map([['cpu:D2', signal]]))
    expect(result.dcAnalysis.get('switch')).toEqual({ voltage: 1.5, current: signal === 'HIGH' ? 1.5 : 0 })
    expect([...result.pinSignals.values()].every(value => value === 'UNKNOWN')).toBe(true)
  })
  it('CR1 preserves externally controlled multi-primary analysis without a primary conflict', () => {
    const c = controlledConflict()
    c.wires = c.wires.filter(w => w.fromUid !== 'as' || w.toUid !== 'bs')
    const result = resolveExternal(c, new Map([['cpu:D2', 'HIGH']]))
    expect(result.dcAnalysis.get('switch')).toEqual({ voltage: 1.5, current: 1.5 })
    expect(result.pinSignals.get('switch:gate')).toBe('HIGH')
    expect(result.pinSignals.get('cpu:D3')).toBe('FLOATING')
  })
  it('CR1 contradictory controls on the same physical net remain blocked in either order', () => {
    const c = controlledConflict()
    for (const entries of [[['cpu:D2', 'HIGH'], ['switch:gate', 'LOW']], [['switch:gate', 'LOW'], ['cpu:D2', 'HIGH']]]) {
      expect(resolveExternal(c, new Map(entries)).dcAnalysis.get('switch')).toEqual({ voltage: 1.5, current: 0 })
    }
  })
  it.each([['as', '5V'], ['bs', 'plus']])('CR1 external control cannot override conflicting or foreign numeric evidence on %s:%s', (uid, pin) => {
    const c = controlledConflict()
    c.wires.push(wire(uid, pin, 'switch', 'gate'))
    const result = resolveExternal(c, new Map([['cpu:D2', 'HIGH']]))
    expect(result.dcAnalysis.has('switch')).toBe(false)
    expect(result.dcAnalysis.get('cr')).toEqual(analysis(1.5))
  })
  it('CR1 numeric authority takes precedence over opposing external control', () => {
    const c = controlledConflict()
    c.wires.push(wire('cs', 'minus', 'switch', 'gate'))
    expect(resolveExternal(c, new Map([['cpu:D2', 'HIGH']])).dcAnalysis.get('switch'))
      .toEqual({ voltage: 1.5, current: 0 })
  })
  it('CR1 digital evidence can never replace a missing power terminal', () => {
    const c = controlledConflict()
    c.wires = c.wires.filter(w => w.toPin !== 'drain')
    expect(resolveExternal(c, new Map([['cpu:D2', 'HIGH'], ['switch:drain', 'HIGH']])).dcAnalysis.has('switch')).toBe(false)
  })
  it('CR1 local control also selects existing conditional conduction for numeric domain propagation', () => {
    const c = controlledConflict()
    c.components.push({ uid: 'load', type: 'LDR' })
    c.wires = c.wires.filter(w => w.toPin !== 'drain')
    c.wires.push(wire('cs', 'plus', 'load', 'A'), wire('load', 'B', 'switch', 'drain'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = resolveExternal({ components, wires: c.wires }, new Map([['cpu:D2', 'HIGH']]))
      expect(result.dcAnalysis.get('load')).toEqual({ voltage: 1.5, current: 1.5 / 10000 })
    }
    expect(resolveExternal(c, new Map([['cpu:D2', 'LOW']])).dcAnalysis.has('load')).toBe(false)
  })
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
