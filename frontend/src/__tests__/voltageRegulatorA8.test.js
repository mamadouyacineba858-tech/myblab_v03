import { describe, it, expect } from 'vitest'
import { getCanonicalEntry, getAllCanonicalTypes } from '../simulator/canonicalRegistry.js'
import { VoltageRegulatorModel } from '../simulator/models/VoltageRegulatorModel.js'
import { isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulator/simulationRegistry.js'
import { getDcVoltageDomainContribution, hasDcVoltageDomainContribution } from '../simulator/dcVoltageDomainRegistry.js'
import { hasDcContribution } from '../simulator/dcContributionRegistry.js'
import { getDcSource } from '../simulator/dcSourceRegistry.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { resolveSignals } from '../simulator/resolution.js'
import { createComponent, getComponentDef, PALETTE_ITEMS } from '../config/componentDefinitions.js'
import { resolveContacts } from '../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'
import { computeBreadboardPlacement } from '../utils/breadboardPlacementAdapter.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'

const type = 'VOLTAGE_REGULATOR'
const entry = getDcVoltageDomainContribution(type)
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
function circuit(voltage = 9, outputVoltage = 5) {
  const battery = voltage === 9
  return {
    components: [
      { uid: 'source', type: battery ? 'BATTERY_9V' : 'POWER', parameters: { voltage } },
      { uid: 'regulator', type, parameters: { outputVoltage } },
      { uid: 'upstream', type: 'RESISTOR' },
      { uid: 'load', type: 'RESISTOR' },
    ],
    wires: [
      wire('source', battery ? 'plus' : '5V', 'regulator', 'IN'),
      wire('source', battery ? 'minus' : 'GND', 'regulator', 'GND'),
      wire('source', battery ? 'plus' : '5V', 'upstream', 'A'),
      wire('source', battery ? 'minus' : 'GND', 'upstream', 'B'),
      wire('regulator', 'OUT', 'load', 'A'),
      wire('regulator', 'GND', 'load', 'B'),
    ],
  }
}
const resolve = c => resolveSignals(c.components, prepareCircuit(c.components, c.wires))
const normalized = result => Object.fromEntries(Object.entries(result).map(([key, map]) =>
  [key, [...map].sort(([a], [b]) => a.localeCompare(b))]))

describe('A8 voltage regulator canonical contract and model', () => {
  it('declares one DC type with exact pins, defaults and generic creation', () => {
    expect(getAllCanonicalTypes().filter(t => t === type)).toHaveLength(1)
    expect(getCanonicalEntry(type)).toMatchObject({
      pins: [{ id: 'IN', role: 'input' }, { id: 'GND', role: 'ground' }, { id: 'OUT', role: 'output' }],
      capabilities: ['dc'], modelAvailable: true, defaultParameters: { outputVoltage: 5 },
    })
    expect(getCanonicalEntry(type).parameterSchema.map(p => p.key)).toEqual(['outputVoltage'])
    expect(isSimulationModelAvailable(type)).toBe(true)
    expect(getSimulationDefaultParameters(type)).toEqual({ outputVoltage: 5 })
    expect(Object.keys(VoltageRegulatorModel).sort()).toEqual(['type', 'validate'])
    expect(VoltageRegulatorModel.type).toBe(type)
    expect(VoltageRegulatorModel.validate({ outputVoltage: 5 })).toBe(true)
    expect(createComponent(type, 10, 20)).toMatchObject({ type, x: 10, y: 20, pins: getComponentDef(type).pins })
    expect(PALETTE_ITEMS.filter(p => p.id === type)).toHaveLength(1)
  })
  it.each([0, -1, NaN, Infinity, -Infinity, undefined, null, '5', false])('rejects outputVoltage=%s', outputVoltage => {
    expect(VoltageRegulatorModel.validate({ outputVoltage })).toBe(false)
    expect(entry.contribute({ inputVoltage: 9, params: { outputVoltage } })).toBeNull()
  })
  it.each([undefined, null, false, 'params', {}])('rejects missing/invalid params %s', params => {
    expect(VoltageRegulatorModel.validate(params)).toBe(false)
    expect(entry.contribute({ inputVoltage: 9, params })).toBeNull()
  })
})

describe('production derived DC domain', () => {
  it('registers a derived producer without a fake load or primary source', () => {
    expect(entry).toMatchObject({ inputPin: 'IN', referencePin: 'GND', outputPin: 'OUT' })
    expect(hasDcVoltageDomainContribution(type)).toBe(true)
    expect(hasDcContribution(type)).toBe(false)
    expect(getDcSource({ type })).toBeFalsy()
    expect(hasDcVoltageDomainContribution('UNKNOWN')).toBe(false)
    expect(getDcVoltageDomainContribution('UNKNOWN')).toBeNull()
  })
  it.each([9, 12, 5])('regulates %s V to 5 V', inputVoltage => {
    expect(entry.contribute({ inputVoltage, params: { outputVoltage: 5 } })).toBe(5)
    const result = resolve(circuit(inputVoltage))
    expect(result.dcAnalysis.get('load')).toEqual({ voltage: 5, current: 5 / 220 })
    expect(result.dcAnalysis.get('upstream')).toEqual({ voltage: inputVoltage, current: inputVoltage / 220 })
    expect(result.dcVoltageDomains.get('regulator:IN').voltage).toBe(inputVoltage)
    expect(result.dcVoltageDomains.get('regulator:OUT').voltage).toBe(5)
    expect(result.pinSignals.get('regulator:OUT')).not.toBe(5)
  })
  it.each([4, 0, -1, NaN, Infinity, -Infinity, undefined, null, '9'])('does not regulate invalid/insufficient input %s', inputVoltage => {
    expect(entry.contribute({ inputVoltage, params: { outputVoltage: 5 } })).toBeNull()
  })
  it('uses a custom output voltage through the real resolver', () => {
    expect(entry.contribute({ inputVoltage: 9, params: { outputVoltage: 3.3 } })).toBe(3.3)
    expect(resolve(circuit(9, 3.3)).dcAnalysis.get('load').voltage).toBe(3.3)
  })
  it('has no derived domain when unpowered or below target', () => {
    const unpowered = circuit()
    unpowered.components = unpowered.components.filter(c => c.uid !== 'source')
    unpowered.wires = unpowered.wires.filter(w => w.fromUid !== 'source')
    // POWER accepts positive volts only; zero falls back to its nominal 5 V.
    // Zero input is covered by the pure contribution test above.
    for (const c of [unpowered, circuit(4)]) {
      const result = resolve(c)
      expect(result.dcVoltageDomains.get('regulator:OUT')).toBeNull()
      expect(result.dcAnalysis.has('load')).toBe(false)
    }
  })
  it('preserves document/topology and determinism across component and wire order', () => {
    const c = circuit()
    const prepared = prepareCircuit(c.components, c.wires)
    const nets = prepared.nets
    const uf = prepared.uf
    const snapshot = structuredClone({ ...c, nets, parent: uf.parent, allKeys: prepared.allKeys })
    const expected = normalized(resolveSignals(c.components, prepared))
    expect(prepared.nets).toBe(nets)
    expect(prepared.uf).toBe(uf)
    expect({ ...c, nets, parent: uf.parent, allKeys: prepared.allKeys }).toEqual(snapshot)
    expect(normalized(resolve(c))).toEqual(expected)
    for (let i = 0; i < c.components.length; i++) {
      const components = [...c.components.slice(i), ...c.components.slice(0, i)].reverse()
      expect(normalized(resolve({ components, wires: [...c.wires].reverse() }))).toEqual(expected)
    }
  })
})

describe('regulator physical geometry', () => {
  it('projects frozen raster roots onto adjacent contacts at pitch 12', () => {
    const def = getComponentDef(type)
    expect([def.width, def.height]).toEqual([144, 288])
    const contacts = def.pins.flatMap(resolveContacts)
    expect(contacts).toEqual(['IN', 'GND', 'OUT'].map((id, i) => ({
      id, dx: 60 + 12 * i, dy: 204, wireConnectable: true, breadboardInsertable: true,
    })))
    expect(BREADBOARD_PITCH).toBe(12)
    expect(contacts[1].dx - contacts[0].dx).toBe(BREADBOARD_PITCH)
    expect(contacts[2].dx - contacts[1].dx).toBe(BREADBOARD_PITCH)
    const component = createComponent(type, -24, -144)
    const bb = { id: 'bb', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    expect(computeBreadboardPlacement(bb, type, { x: -23, y: -143 }, [])).toMatchObject({ compatible: true, valid: true, breadboardActive: true })
    const geometry = resolveAssemblyGeometry(component, bb)
    expect(geometry.inserted).toBe(true)
    expect(geometry.contacts).toHaveLength(3)
    geometry.contacts.forEach((contact, i) => {
      expect(contact.pinId).toBe(contacts[i].id)
      expect(contact.root).toEqual({ x: component.x + [42, 72, 103][i], y: component.y + 170 })
      expect(contact.target).toEqual({ x: component.x + contacts[i].dx, y: component.y + 204 })
      expect(contact.holePosition).toEqual(contact.target)
      expect(contact.style).toBe('metallic-wire')
    })
    const profile = getAssemblyProfile(type)
    expect(Object.keys(profile.leads)).toEqual(['IN', 'GND', 'OUT'])
    expect(profile.bodyClip).toEqual({ bottom: 118 })
    expect(def.height - profile.bodyClip.bottom).toBe(170)
  })
})
