import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { getCanonicalEntry } from '../canonicalRegistry.js'
import { getDcVoltageDomainContribution } from '../dcVoltageDomainRegistry.js'

vi.mock('../canonicalRegistry.js', async (original) => {
  const actual = await original()
  return { ...actual, getCanonicalEntry: (type) => type.startsWith('TEST_DOMAIN_') ? {
    pins: ['input', 'output', 'reference'].map(id => ({ id })),
    modelAvailable: true, defaultParameters: {},
  } : actual.getCanonicalEntry(type) }
})
vi.mock('../dcVoltageDomainRegistry.js', async (original) => {
  const actual = await original()
  return { getDcVoltageDomainContribution: (type) => type.startsWith('TEST_DOMAIN_') ? {
    inputPin: 'input', referencePin: 'reference', outputPin: 'output',
    contribute: ({ inputVoltage }) => {
      const requested = Number(type.slice('TEST_DOMAIN_'.length))
      return inputVoltage >= requested ? requested : null
    },
  } : actual.getDcVoltageDomainContribution(type) }
})

const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
function circuit(voltages = [5], sourceType = 'BATTERY_9V', voltage = 9) {
  const source = { uid: 'source', type: sourceType, parameters: { voltage } }
  const plus = sourceType === 'POWER' ? '5V' : 'plus'
  const minus = sourceType === 'POWER' ? 'GND' : 'minus'
  const components = [source, { uid: 'upstream', type: 'RESISTOR' }, { uid: 'load', type: 'RESISTOR' }]
  const wires = [wire('source', plus, 'upstream', 'A'), wire('source', minus, 'upstream', 'B'),
    wire('source', minus, 'load', 'B')]
  let previous = ['source', plus]
  voltages.forEach((output, i) => {
    const uid = `stage${i}`
    components.push({ uid, type: `TEST_DOMAIN_${output}` })
    wires.push(wire(...previous, uid, 'input'), wire('source', minus, uid, 'reference'))
    previous = [uid, 'output']
  })
  wires.push(wire(...previous, 'load', 'A'))
  return { components, wires }
}
function resolve(c) { return resolveSignals(c.components, prepareCircuit(c.components, c.wires)) }
const normalized = (result) => Object.fromEntries(Object.entries(result).map(([key, map]) => [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))

describe('A8 derived DC voltage domains', () => {
  it.each([['POWER', 5], ['BATTERY_9V', 9]])('T-DV1/2 preserves %s', (type, voltage) => {
    const result = resolve(circuit([], type, voltage))
    expect(result.dcAnalysis.get('load')).toEqual({ voltage, current: voltage / 220 })
  })
  it('preserves historical series-load DC analysis without a domain producer', () => {
    const components = [{ uid: 's', type: 'POWER' }, { uid: 'r1', type: 'RESISTOR' }, { uid: 'r2', type: 'RESISTOR' }]
    const wires = [wire('s', '5V', 'r1', 'A'), wire('r1', 'B', 'r2', 'A'), wire('r2', 'B', 's', 'GND')]
    expect(resolve({ components, wires }).dcAnalysis.get('r2')).toEqual({ voltage: 5, current: 5 / 220 })
  })
  it('T-DV3/4 analyzes downstream at 5 V and upstream at 9 V', () => {
    const result = resolve(circuit())
    expect(result.dcVoltageDomains.get('stage0:input').voltage).toBe(9)
    expect(result.dcVoltageDomains.get('stage0:output').voltage).toBe(5)
    expect(result.dcAnalysis.get('upstream')).toEqual({ voltage: 9, current: 9 / 220 })
    expect(result.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 220 })
    expect(result.pinSignals.get('source:plus')).toBe('HIGH')
    expect(result.pinSignals.get('stage0:output')).not.toBe(5)
  })
  it('T-DV5 cannot invent output without a primary source, even with digital HIGH', () => {
    const c = circuit()
    c.components = c.components.filter(comp => comp.uid !== 'source')
    c.wires = c.wires.filter(w => w.fromUid !== 'source')
    const result = resolveSignals(c.components, prepareCircuit(c.components, c.wires),
      new Map([['stage0:input', 'HIGH'], ['stage0:reference', 'LOW']]))
    expect(result.dcVoltageDomains.get('stage0:output')).toBeNull()
    expect(result.dcAnalysis.size).toBe(0)
  })
  it('T-DV6 conflicting authorities are unresolved, including dependent descendants', () => {
    const c = circuit([5, 3])
    c.components.push({ uid: 'conflict', type: 'TEST_DOMAIN_6' })
    c.wires.push(wire('source', 'plus', 'conflict', 'input'), wire('source', 'minus', 'conflict', 'reference'),
      wire('conflict', 'output', 'stage0', 'output'))
    for (const components of [c.components, [...c.components].reverse()]) {
      const result = resolve({ ...c, components })
      expect(result.dcVoltageDomains.get('stage0:output')).toBeNull()
      expect(result.dcVoltageDomains.get('stage1:output')).toBeNull()
      expect(result.dcAnalysis.has('load')).toBe(false)
      expect(result.dcAnalysis.get('upstream').voltage).toBe(9)
    }
  })
  it('T-DV7 is independent of component and wire ordering', () => {
    const c = circuit([9, 5], 'POWER', 12)
    const expected = normalized(resolve(c))
    for (let i = 0; i < c.components.length; i++) {
      const components = [...c.components.slice(i), ...c.components.slice(0, i)].reverse()
      expect(normalized(resolve({ components, wires: [...c.wires].reverse() }))).toEqual(expected)
    }
  })
  it('T-DV8 converges across multiple derived stages', () => {
    const result = resolve(circuit([9, 5], 'POWER', 12))
    expect(result.dcVoltageDomains.get('stage0:input').voltage).toBe(12)
    expect(result.dcVoltageDomains.get('stage1:input').voltage).toBe(9)
    expect(result.dcAnalysis.get('load').voltage).toBe(5)
  })
  it('T-DV9 leaves the prepared topology, components and wires untouched', () => {
    const c = circuit()
    const prepared = prepareCircuit(c.components, c.wires)
    const nets = prepared.nets
    const uf = prepared.uf
    const snapshot = structuredClone({ nets, parent: uf.parent, allKeys: prepared.allKeys, ...c })
    resolveSignals(c.components, prepared)
    expect(prepared.nets).toBe(nets)
    expect(prepared.uf).toBe(uf)
    expect({ nets, parent: uf.parent, allKeys: prepared.allKeys, ...c }).toEqual(snapshot)
  })
  it('T-DV10 has no production regulator or domain contributor', () => {
    expect(getCanonicalEntry('VOLTAGE_REGULATOR')).toBeFalsy()
    expect(getDcVoltageDomainContribution('VOLTAGE_REGULATOR')).toBeNull()
  })
  it('does not invent a common reference between isolated circuits', () => {
    const c = circuit()
    c.wires = c.wires.filter(w => w.toPin !== 'reference')
    expect(resolve(c).dcAnalysis.has('load')).toBe(false)
  })
  it('rejects invalid or unavailable output voltages', () => {
    for (const voltage of [0, -1, NaN, Infinity, 15]) {
      const result = resolve(circuit([voltage]))
      expect(result.dcVoltageDomains.get('stage0:output')).toBeNull()
      expect(result.dcAnalysis.has('load')).toBe(false)
    }
  })
  it('does not self-start an unpowered feedback cycle', () => {
    const c = circuit([5, 3])
    c.wires = c.wires.filter(w => !(w.toUid === 'stage0' && w.toPin === 'input'))
    c.wires.push(wire('stage1', 'output', 'stage0', 'input'))
    const result = resolve(c)
    expect(result.dcVoltageDomains.get('stage0:output')).toBeNull()
    expect(result.dcVoltageDomains.get('stage1:output')).toBeNull()
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('extends downstream domains through existing passive conduction', () => {
    const c = circuit()
    c.components.push({ uid: 'series', type: 'RESISTOR' })
    c.wires = c.wires.filter(w => !(w.toUid === 'load' && w.toPin === 'A'))
    c.wires.push(wire('stage0', 'output', 'series', 'A'), wire('series', 'B', 'load', 'A'))
    // Use a non-conducting DC load so this is a domain extension, not a divider.
    c.components.find(comp => comp.uid === 'load').type = 'LDR'
    expect(resolve(c).dcAnalysis.get('load').voltage).toBe(5)
  })
  it('accepts agreeing output authorities', () => {
    const c = circuit()
    c.components.push({ uid: 'parallel', type: 'TEST_DOMAIN_5' })
    c.wires.push(wire('source', 'plus', 'parallel', 'input'), wire('source', 'minus', 'parallel', 'reference'),
      wire('parallel', 'output', 'stage0', 'output'))
    expect(resolve(c).dcAnalysis.get('load').voltage).toBe(5)
  })
  it('retracts an already propagated output when a delayed authority conflicts', () => {
    const c = circuit([5, 3])
    c.components.push({ uid: 'late', type: 'TEST_DOMAIN_4' }, { uid: 'feed', type: 'TEST_DOMAIN_6' })
    c.wires.push(wire('source', 'plus', 'feed', 'input'), wire('source', 'minus', 'feed', 'reference'),
      wire('feed', 'output', 'late', 'input'), wire('source', 'minus', 'late', 'reference'),
      wire('late', 'output', 'stage0', 'output'))
    const result = resolve(c)
    expect(result.dcVoltageDomains.get('stage0:output')).toBeNull()
    expect(result.dcVoltageDomains.get('stage1:output')).toBeNull()
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('rejects a derived output wired to its incompatible primary authority', () => {
    const c = circuit()
    c.wires.push(wire('stage0', 'output', 'source', 'plus'))
    const result = resolve(c)
    expect(result.dcVoltageDomains.get('source:plus')).toBeNull()
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('cannot fall back to primary volts for an unpowered derived output', () => {
    const c = circuit([15])
    const result = resolveSignals(c.components, prepareCircuit(c.components, c.wires),
      new Map([['stage0:output', 'HIGH']]))
    expect(result.dcVoltageDomains.get('source:plus').voltage).toBe(9)
    expect(result.dcVoltageDomains.get('stage0:output')).toBeNull()
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('does not substitute digital LOW for an unresolved electrical return', () => {
    const c = circuit()
    c.components.find(comp => comp.uid === 'load').type = 'LDR'
    c.wires = c.wires.filter(w => !(w.toUid === 'load' && w.toPin === 'B'))
    const result = resolveSignals(c.components, prepareCircuit(c.components, c.wires),
      new Map([['load:B', 'LOW']]))
    expect(result.dcVoltageDomains.get('load:A').voltage).toBe(5)
    expect(result.dcAnalysis.has('load')).toBe(false)
  })
  it('guards generic registry use and simulation-only dependencies', () => {
    const source = readFileSync(new URL('../resolution.js', import.meta.url), 'utf8')
    expect(source).not.toContain('VOLTAGE_REGULATOR')
    expect(source).toContain('getDcVoltageDomainContribution(comp.type)')
    const executable = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
    const comparisons = executable.match(/(?:comp|component)\.type\s*(?:===|!==)\s*['"][^'"]+['"]/g) ?? []
    expect(comparisons).toEqual(['comp.type !== "ARDUINO"'])
    expect(executable).not.toMatch(/switch\s*\([^)]*\.type/)
    for (const name of ['resolution.js', 'dcVoltageDomainRegistry.js']) {
      const text = readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
      for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) expect(match[1]).toMatch(/^\.\/[^/]+\.js$/)
    }
  })
})
