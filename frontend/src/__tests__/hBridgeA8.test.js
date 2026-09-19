import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCanonicalEntry, getAllCanonicalTypes } from '../simulator/canonicalRegistry.js'
import { HBridgeModel } from '../simulator/models/HBridgeModel.js'
import { isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulator/simulationRegistry.js'
import { getConditionalConduction } from '../simulator/conditionalConductionRegistry.js'
import { prepareCircuit } from '../simulator/preparation.js'
import { resolveSignals } from '../simulator/resolution.js'
import { Signal } from '../simulator/signals.js'
import { createComponent, getComponentDef, PALETTE_ITEMS } from '../config/componentDefinitions.js'
import { resolveContacts, resolveWireConnectableContacts, resolveBreadboardInsertableContacts } from '../utils/contactModel.js'
import { resolveAssemblyGeometry } from '../utils/assemblyGeometry.js'
import { BREADBOARD_PITCH } from '../utils/breadboardGeometry.js'
import { getAssemblyProfile } from '../visualization/assemblyProfiles.js'
import { DEFAULT_REGISTRATIONS } from '../visualization/defaultRegistrations.js'

const type = 'H_BRIDGE'
const here = dirname(fileURLToPath(import.meta.url))
const src = (...p) => readFileSync(resolve(here, '..', ...p), 'utf8')

const ELECTRICAL_PINS = ['EN12', '1A', '1Y', 'GND', '2Y', '2A', 'VCC2', 'EN34', '3A', '3Y', '4Y', '4A', 'VCC1']
// Physical DIP-16 pin number -> { pin (electrical), contact id, x, y } (CSA-locked mechanical contract).
const DIP = [
  [1, 'EN12', 'EN12', 30, 102], [2, '1A', '1A', 30, 114], [3, '1Y', '1Y', 30, 126], [4, 'GND', 'GND4', 30, 138],
  [5, 'GND', 'GND5', 30, 150], [6, '2Y', '2Y', 30, 162], [7, '2A', '2A', 30, 174], [8, 'VCC2', 'VCC2', 30, 186],
  [9, 'EN34', 'EN34', 114, 186], [10, '3A', '3A', 114, 174], [11, '3Y', '3Y', 114, 162], [12, 'GND', 'GND12', 114, 150],
  [13, 'GND', 'GND13', 114, 138], [14, '4Y', '4Y', 114, 126], [15, '4A', '4A', 114, 114], [16, 'VCC1', 'VCC1', 114, 102],
]

describe('C — canonical contract', () => {
  const def = getComponentDef(type)
  it('C1/C2 exists once in the canonical registry with a 144x288 box', () => {
    expect(getAllCanonicalTypes().filter(t => t === type)).toHaveLength(1)
    expect(getCanonicalEntry(type)).toMatchObject({ type, modelAvailable: true, capabilities: ['digital'], defaultParameters: {} })
    expect([def.width, def.height]).toEqual([144, 288])
    expect(PALETTE_ITEMS.filter(p => p.id === type)).toHaveLength(1)
    expect(createComponent(type, 10, 20)).toMatchObject({ type, x: 10, y: 20, pins: def.pins })
  })
  it('C3/C4 exposes exactly the 13 electrical pins', () => {
    expect(getCanonicalEntry(type).pins.map(p => p.id)).toEqual(ELECTRICAL_PINS)
    expect(def.pins.map(p => p.id)).toEqual(ELECTRICAL_PINS)
    expect(def.pins).toHaveLength(13)
  })
  it('C5 exposes 16 PhysicalContacts', () => {
    expect(def.pins.flatMap(resolveContacts)).toHaveLength(16)
  })
  it('C6 GND owns four PhysicalContacts', () => {
    expect(resolveContacts(def.pins.find(p => p.id === 'GND')).map(c => c.id)).toEqual(['GND4', 'GND5', 'GND12', 'GND13'])
  })
  it('C7 has no artificial electrical GND1..GND4', () => {
    for (const id of ['GND1', 'GND2', 'GND3', 'GND4', 'GND5', 'GND12', 'GND13']) {
      expect(def.pins.map(p => p.id)).not.toContain(id)
    }
    expect(def.pins.filter(p => p.id.startsWith('GND'))).toHaveLength(1)
  })
  it('validates a parameter-less model through the generic registry', () => {
    expect(isSimulationModelAvailable(type)).toBe(true)
    expect(getSimulationDefaultParameters(type)).toEqual({})
    expect(HBridgeModel.type).toBe(type)
    expect(HBridgeModel.validate({})).toBe(true)
    for (const bad of [undefined, null, 'x', 3, []]) expect(HBridgeModel.validate(bad)).toBe(false)
  })
})

describe('P — DIP-16 physical fit', () => {
  const def = getComponentDef(type)
  const contactsByPin = Object.fromEntries(def.pins.map(p => [p.id, resolveContacts(p)]))
  const all = def.pins.flatMap(p => resolveContacts(p).map(c => ({ pinId: p.id, ...c })))
  it('matches the locked physical DIP-16 map, pin by pin', () => {
    for (const [, pinId, contactId, dx, dy] of DIP) {
      const c = contactsByPin[pinId].find(k => k.id === contactId)
      expect(c, `${pinId}/${contactId}`).toMatchObject({ dx, dy })
    }
  })
  it('P1 has two rows of 8 contacts', () => {
    expect(all.filter(c => c.dx === 30)).toHaveLength(8)
    expect(all.filter(c => c.dx === 114)).toHaveLength(8)
  })
  it('P2 has an exact longitudinal pitch of 12 px', () => {
    for (const x of [30, 114]) {
      const ys = all.filter(c => c.dx === x).map(c => c.dy).sort((a, b) => a - b)
      expect(ys).toEqual([102, 114, 126, 138, 150, 162, 174, 186])
      ys.slice(1).forEach((y, i) => expect(y - ys[i]).toBe(BREADBOARD_PITCH))
    }
  })
  it('P3 separates the rows by 84 px = 7 x pitch', () => {
    expect(114 - 30).toBe(7 * BREADBOARD_PITCH)
    expect(BREADBOARD_PITCH).toBe(12)
  })
  it('P4 puts every contact on one breadboard grid (same phase modulo the pitch)', () => {
    const phase = c => [c.dx % BREADBOARD_PITCH, c.dy % BREADBOARD_PITCH].join(':')
    expect(new Set(all.map(phase)).size).toBe(1)
    for (const a of all) for (const b of all) {
      expect(Math.abs((a.dx - b.dx) % BREADBOARD_PITCH)).toBe(0)
      expect(Math.abs((a.dy - b.dy) % BREADBOARD_PITCH)).toBe(0)
    }
  })
  it('P5/P6 every contact is wire-connectable and breadboard-insertable', () => {
    for (const p of def.pins) {
      expect(resolveWireConnectableContacts(p)).toHaveLength(resolveContacts(p).length)
      expect(resolveBreadboardInsertableContacts(p)).toHaveLength(resolveContacts(p).length)
    }
    expect(all.every(c => c.wireConnectable === true && c.breadboardInsertable === true)).toBe(true)
  })
  it('P7 keeps the 16 contacts physically distinct', () => {
    expect(new Set(all.map(c => `${c.dx},${c.dy}`)).size).toBe(16)
    expect(new Set(all.map(c => c.id)).size).toBe(16)
  })
  it('P8 resolves the four GND contacts to the electrical pin GND', () => {
    const gnd = all.filter(c => ['GND4', 'GND5', 'GND12', 'GND13'].includes(c.id))
    expect(gnd).toHaveLength(4)
    expect(gnd.every(c => c.pinId === 'GND')).toBe(true)
    expect(all.filter(c => c.pinId === 'GND')).toHaveLength(4)
  })
})

describe('GND-ASSEMBLY — generic per-contact leads consumed as is', () => {
  const component = createComponent(type, 0, 0)
  const geometry = resolveAssemblyGeometry(component, null)
  const gndContacts = geometry.contacts.filter(c => c.pinId === 'GND')
  it('GND-ASSEMBLY-1 yields four distinct AssemblyContacts for the GND contacts', () => {
    expect(geometry.contacts).toHaveLength(16)
    expect(gndContacts).toHaveLength(4)
  })
  it('GND-ASSEMBLY-2 keeps pinId === GND for all of them', () => {
    expect(gndContacts.every(c => c.pinId === 'GND')).toBe(true)
  })
  it('GND-ASSEMBLY-3 keeps distinct physical contactIds', () => {
    expect(gndContacts.map(c => c.contactId)).toEqual(['GND4', 'GND5', 'GND12', 'GND13'])
  })
  it('GND-ASSEMBLY-4 gives four distinct roots, one per physical lead', () => {
    expect(new Set(gndContacts.map(c => `${c.root.x},${c.root.y}`)).size).toBe(4)
    expect(gndContacts.map(c => [c.root.x, c.root.y])).toEqual([[32, 138], [32, 150], [133, 150], [133, 138]])
    expect(gndContacts.map(c => [c.target.x, c.target.y])).toEqual([[30, 138], [30, 150], [114, 150], [114, 138]])
  })
  it('GND-ASSEMBLY-5 never replaces the electrical identity by the contactId', () => {
    for (const c of geometry.contacts) expect(ELECTRICAL_PINS).toContain(c.pinId)
    expect(geometry.contacts.map(c => c.pinId)).not.toContain('GND4')
  })
  it('gives every other pin a single root on its own row and the metallic style', () => {
    for (const [, pinId, contactId, , dy] of DIP) {
      const c = geometry.contacts.find(k => k.contactId === contactId)
      expect(c.pinId).toBe(pinId)
      expect(c.root.y).toBe(dy)
      expect(c.style).toBe('metallic-wire')
    }
    expect(getAssemblyProfile(type).bodyClip).toBeUndefined()
  })
})

// ---- Logic / DC ------------------------------------------------------------
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const CTRL = ['EN12', '1A', '2A', 'EN34', '3A', '4A']
/**
 * Logic supply `logic` (5 V) feeds VCC1 and the controls; motor supply `mot`
 * (VCC2) is an independent primary. All grounds are common.
 * controls: 'H' -> logic +, 'L' -> logic GND, absent -> unwired.
 */
function build({ controls = {}, vcc1 = true, vcc2 = 9, extra = [] } = {}) {
  const components = [{ uid: 'logic', type: 'POWER', parameters: { voltage: 5 } }, { uid: 'hb', type }]
  const wires = [wire('logic', 'GND', 'hb', 'GND')]
  if (vcc1) wires.push(wire('logic', '5V', 'hb', 'VCC1'))
  if (vcc2 !== null) {
    const battery = vcc2 === 9
    components.push(battery ? { uid: 'mot', type: 'BATTERY_9V' } : { uid: 'mot', type: 'POWER', parameters: { voltage: vcc2 } })
    wires.push(wire('mot', battery ? 'plus' : '5V', 'hb', 'VCC2'), wire('mot', battery ? 'minus' : 'GND', 'logic', 'GND'))
  }
  for (const pin of CTRL) {
    if (controls[pin] === 'H') wires.push(wire('logic', '5V', 'hb', pin))
    if (controls[pin] === 'L') wires.push(wire('logic', 'GND', 'hb', pin))
  }
  return { components: [...components, ...(extra.components ?? [])], wires: [...wires, ...(extra.wires ?? [])] }
}
const solve = (c, external = null) => resolveSignals(c.components, prepareCircuit(c.components, c.wires), external)
/** Output level: volts of its DC domain, 'Z' when no domain reaches it, 'CONFLICT' when contested. */
function level(result, pin, uid = 'hb') {
  const d = result.dcVoltageDomains.get(`${uid}:${pin}`)
  return d === undefined ? 'Z' : d === null ? 'CONFLICT' : d.voltage
}
const levels = result => ['1Y', '2Y', '3Y', '4Y'].map(pin => level(result, pin))
const ALL_EN = { EN12: 'H', EN34: 'H' }
const CHANNELS = [['EN12', '1A', '1Y'], ['EN12', '2A', '2Y'], ['EN34', '3A', '3Y'], ['EN34', '4A', '4Y']]

describe('L — Level-1 truth table per channel', () => {
  it.each(CHANNELS)('L1 %s + %s HIGH -> %s joins the VCC2 domain', (en, input, out) => {
    const r = solve(build({ controls: { [en]: 'H', [input]: 'H' } }))
    expect(level(r, out)).toBe(9)
    expect(r.pinSignals.get(`hb:${out}`)).toBe(Signal.HIGH)
  })
  it.each(CHANNELS)('L2 %s + %s LOW -> %s joins GND', (en, input, out) => {
    const r = solve(build({ controls: { [en]: 'H', [input]: 'L' } }))
    expect(level(r, out)).toBe(0)
    expect(r.pinSignals.get(`hb:${out}`)).toBe(Signal.LOW)
  })
  it.each(CHANNELS)('L3 %s LOW -> %s is high-Z for either input level', (en, input, out) => {
    for (const level_ of ['H', 'L']) {
      const r = solve(build({ controls: { [en]: 'L', [input]: level_ } }))
      expect(level(r, out)).toBe('Z')
      expect(r.pinSignals.get(`hb:${out}`)).toBe(Signal.UNKNOWN)
    }
  })
  it.each(CHANNELS)('L3b unwired %s or unwired %s -> %s is high-Z', (en, input, out) => {
    expect(level(solve(build({ controls: { [input]: 'H' } })), out)).toBe('Z')
    expect(level(solve(build({ controls: { [en]: 'H' } })), out)).toBe('Z')
  })
  it.each(CHANNELS)('L4 VCC1 absent -> %s is high-Z', (en, input, out) => {
    for (const level_ of ['H', 'L']) {
      expect(level(solve(build({ vcc1: false, controls: { ...ALL_EN, [input]: level_ } })), out)).toBe('Z')
    }
  })
  it('L4b VCC1 tied low is not an active logic supply', () => {
    const c = build({ vcc1: false, controls: { ...ALL_EN, '1A': 'H' } })
    c.wires.push(wire('logic', 'GND', 'hb', 'VCC1'))
    expect(level(solve(c), '1Y')).toBe('Z')
  })
  it('L5 EN12 does not control 3Y/4Y', () => {
    expect(levels(solve(build({ controls: { EN12: 'H', '1A': 'H', '2A': 'L', '3A': 'H', '4A': 'L' } })))).toEqual([9, 0, 'Z', 'Z'])
  })
  it('L6 EN34 does not control 1Y/2Y', () => {
    expect(levels(solve(build({ controls: { EN34: 'H', '1A': 'H', '2A': 'L', '3A': 'H', '4A': 'L' } })))).toEqual(['Z', 'Z', 9, 0])
  })
  it.each([['1A', 0], ['2A', 1], ['3A', 2], ['4A', 3]])('L7-L10 %s controls only its own output', (input, index) => {
    const base = { ...ALL_EN, '1A': 'L', '2A': 'L', '3A': 'L', '4A': 'L' }
    expect(levels(solve(build({ controls: base })))).toEqual([0, 0, 0, 0])
    const expected = [0, 0, 0, 0]
    expected[index] = 9
    expect(levels(solve(build({ controls: { ...base, [input]: 'H' } })))).toEqual(expected)
  })
  it('never drives an output from an externally sourced (non-wired) high level', () => {
    // A digital control never replaces an absent power domain: see D7 below.
    expect(getConditionalConduction(type)({ VCC1: Signal.HIGH, EN12: Signal.HIGH, '1A': Signal.UNKNOWN })).toEqual([])
    expect(getConditionalConduction(type)({ VCC1: Signal.HIGH, EN12: Signal.HIGH, '1A': Signal.FLOATING })).toEqual([])
  })
  it('selects the exact pairs from the generic conditional registry', () => {
    const all = { VCC1: Signal.HIGH, EN12: Signal.HIGH, EN34: Signal.HIGH, '1A': Signal.HIGH, '2A': Signal.LOW, '3A': Signal.LOW, '4A': Signal.HIGH }
    expect(getConditionalConduction(type)(all)).toEqual([['1Y', 'VCC2'], ['2Y', 'GND'], ['3Y', 'GND'], ['4Y', 'VCC2']])
    expect(getConditionalConduction(type)({ ...all, EN12: Signal.LOW, EN34: Signal.UNKNOWN })).toEqual([])
    expect(getConditionalConduction(type)({ ...all, VCC1: Signal.UNKNOWN })).toEqual([])
  })
})

describe('D — independent VCC1/VCC2 DC domains', () => {
  const on = { ...ALL_EN, '1A': 'H', '2A': 'L', '3A': 'H', '4A': 'L' }
  it('D1 VCC1 and VCC2 belong to different domains', () => {
    const r = solve(build({ controls: on }))
    expect(r.dcVoltageDomains.get('hb:VCC1').voltage).toBe(5)
    expect(r.dcVoltageDomains.get('hb:VCC2').voltage).toBe(9)
    expect(r.dcVoltageDomains.get('hb:VCC1').voltage).not.toBe(r.dcVoltageDomains.get('hb:VCC2').voltage)
  })
  it.each([9, 6, 12])('D2/D3 a HIGH output takes the VCC2 voltage (%s V), never a fixed 5 V', vcc2 => {
    const r = solve(build({ vcc2, controls: on }))
    expect(levels(r)).toEqual([vcc2, 0, vcc2, 0])
    expect(r.dcVoltageDomains.get('hb:1Y').reference).toBe(r.dcVoltageDomains.get('hb:GND').reference)
  })
  it('D4 a LOW output belongs to the GND domain', () => {
    const r = solve(build({ controls: on }))
    expect(r.dcVoltageDomains.get('hb:2Y')).toEqual(r.dcVoltageDomains.get('hb:GND'))
  })
  it('D5 a conflict on an unrelated independent domain does not destroy the bridge control', () => {
    const extra = {
      components: [{ uid: 'fa', type: 'POWER', parameters: { voltage: 5 } }, { uid: 'fb', type: 'BATTERY_9V' }, { uid: 'fr', type: 'RESISTOR' }],
      wires: [wire('fa', '5V', 'fr', 'A'), wire('fa', 'GND', 'fr', 'B'), wire('fb', 'plus', 'fr', 'A'), wire('fb', 'minus', 'fa', '5V')],
    }
    const clean = levels(solve(build({ controls: on })))
    const r = solve(build({ controls: on, extra }))
    expect(r.dcVoltageDomains.get('fa:5V')).toBeNull()
    expect(levels(r)).toEqual(clean)
  })
  it('D6 a real conflict on VCC2 stays a conflict and never fabricates a voltage', () => {
    const extra = { components: [{ uid: 'rival', type: 'POWER', parameters: { voltage: 6 } }], wires: [wire('rival', '5V', 'hb', 'VCC2'), wire('rival', 'GND', 'logic', 'GND')] }
    const r = solve(build({ controls: on, extra }))
    expect(r.dcVoltageDomains.get('hb:VCC2')).toBeNull()
    for (const pin of ['1Y', '3Y']) expect([9, 6, 5]).not.toContain(level(r, pin))
    expect(['1Y', '3Y'].every(pin => level(r, pin) !== 9)).toBe(true)
  })
  it('D7 a digital control never replaces an absent VCC2', () => {
    const r = solve(build({ vcc2: null, controls: on }))
    expect(level(r, '1Y')).not.toBe(5)
    expect(level(r, '1Y')).not.toBe(9)
    expect(level(r, '3Y')).not.toBe(5)
    expect(r.dcVoltageDomains.get('hb:VCC2')).toBeUndefined()
    // an externally driven (Arduino-style) HIGH on a control changes nothing either
    const external = solve(build({ vcc2: null, controls: { EN12: 'H', EN34: 'H' } }), new Map([['hb:1A', Signal.HIGH]]))
    expect(['1Y', '2Y', '3Y', '4Y'].map(pin => level(external, pin)).filter(v => typeof v === 'number' && v > 0)).toEqual([])
  })
  it('D8 component and wire order never change the result', () => {
    const c = build({ controls: on })
    const norm = r => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, m]) => [k, [...m].sort(([a], [b]) => a.localeCompare(b))])))
    const expected = norm(solve(c))
    for (let i = 0; i < c.components.length; i++) {
      const components = [...c.components.slice(i), ...c.components.slice(0, i)].reverse()
      expect(norm(solve({ components, wires: [...c.wires].reverse() }))).toBe(expected)
    }
  })
  it('AR5 keeps electrical nodes on the 13 canonical pins, never on physical contacts', () => {
    const c = build({ controls: on })
    const prepared = prepareCircuit(c.components, c.wires)
    const keys = prepared.allKeys.filter(k => k.startsWith('hb:'))
    expect(keys.map(k => k.slice(3)).sort()).toEqual([...ELECTRICAL_PINS].sort())
    expect(keys.some(k => /GND\d/.test(k))).toBe(false)
  })
})

describe('M — motor polarity, coast and brake (output tensions)', () => {
  const motor = { components: [{ uid: 'motor', type: 'DC_MOTOR' }], wires: [wire('hb', '1Y', 'motor', 'plus'), wire('hb', '2Y', 'motor', 'minus')] }
  const motorLevels = controls => { const r = solve(build({ controls, extra: motor })); return [level(r, '1Y'), level(r, '2Y')] }
  it('M1 1A LOW / 2A HIGH -> one polarity', () => expect(motorLevels({ EN12: 'H', '1A': 'L', '2A': 'H' })).toEqual([0, 9]))
  it('M2 1A HIGH / 2A LOW -> the opposite polarity', () => expect(motorLevels({ EN12: 'H', '1A': 'H', '2A': 'L' })).toEqual([9, 0]))
  it('M3 EN12 LOW -> both outputs high-Z (coast)', () => expect(motorLevels({ EN12: 'L', '1A': 'H', '2A': 'L' })).toEqual(['Z', 'Z']))
  it('M4 both inputs LOW -> both outputs GND (brake)', () => expect(motorLevels({ EN12: 'H', '1A': 'L', '2A': 'L' })).toEqual([0, 0]))
  it('M5 both inputs HIGH -> both outputs VCC2 (brake)', () => expect(motorLevels({ EN12: 'H', '1A': 'H', '2A': 'H' })).toEqual([9, 9]))
})

describe('AR — generic architecture only', () => {
  const generic = [
    ['simulator', 'resolution.js'], ['utils', 'assemblyGeometry.js'], ['utils', 'contactModel.js'],
    ['utils', 'breadboardGeometry.js'], ['utils', 'breadboardPlacementAdapter.js'], ['utils', 'breadboardConnectivity.js'],
    ['utils', 'breadboardWireEndpoint.js'], ['canvas', 'CircuitComponent.jsx'], ['canvas', 'SimulationCanvas.jsx'],
    ['canvas', 'Breadboard.jsx'], ['canvas', 'BreadboardWireEndpoints.jsx'], ['components', 'assembly', 'AssemblyLeadsLayer.jsx'],
    ['simulator', 'dcContributionRegistry.js'], ['simulator', 'dcVoltageDomainRegistry.js'], ['simulator', 'digitalContributionRegistry.js'],
  ]
  it.each(generic)('AR1-AR4 %s has no H_BRIDGE branch', (...path) => {
    expect(src(...path)).not.toMatch(/H_BRIDGE|HBridge/)
  })
  it('AR6 plugs into the existing extension points', () => {
    expect(getConditionalConduction(type)).toBeTypeOf('function')
    expect(getAssemblyProfile(type)).toMatchObject({ kind: 'through-hole' })
    expect(DEFAULT_REGISTRATIONS.filter(r => r.type === type)).toHaveLength(1)
    expect(DEFAULT_REGISTRATIONS.find(r => r.type === type).visual).toEqual({ backend: 'raster' })
    expect(src('simulator', 'simulationRegistry.js')).toMatch(/HBridgeModel/)
    expect(src('simulator', 'dcContributionRegistry.js')).not.toMatch(/H_BRIDGE/)
  })
})
