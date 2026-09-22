import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { getCanonicalEntry } from '../canonicalRegistry.js'
import { getDigitalContribution, hasDigitalContribution } from '../digitalContributionRegistry.js'
import * as digitalRegistry from '../digitalContributionRegistry.js'
import { hasTimedDigitalContribution } from '../timedDigitalContributionRegistry.js'
import { hasDcContribution } from '../dcContributionRegistry.js'
import { getSimulationModel } from '../simulationRegistry.js'
import { computeCombinationalDigitalSignals, runSimulationStep } from '../simulationRuntimeIntegration.js'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { createScheduler } from '../scheduler.js'
import { createRuntimeOrchestrator } from '../runtimeOrchestrator.js'
import { Signal } from '../signals.js'
import { createComponent, getComponentDef, PALETTE_ITEMS } from '../../config/componentDefinitions.js'

vi.mock('../scheduler.js', async original => {
  const actual = await original()
  return { ...actual, createScheduler: vi.fn(actual.createScheduler) }
})
vi.mock('../resolution.js', async original => {
  const actual = await original()
  return { ...actual, resolveSignals: vi.fn(actual.resolveSignals) }
})
afterEach(() => vi.clearAllMocks())
const comp = (uid, type = 'NAND_GATE') => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const nandGate = getDigitalContribution('NAND_GATE')
// Same shape as AND's chain() (andGateA9.test.js): B held at '5V' (HIGH),
// the value that is NOT decisive alone for NAND (only a decisive LOW is).
// With B=HIGH, NAND(A,HIGH) = NOT(A): each stage is a plain inverter, so
// three cascaded stages (odd count) invert the original A once overall.
// g1: A=HIGH,B=HIGH => Q=LOW (both decisive HIGH). g2: A=LOW,B=HIGH => LOW
// decisive => Q=HIGH. g3: A=HIGH,B=HIGH => Q=LOW.
function chain() {
  return {
    components: [comp('p', 'POWER'), comp('g1'), comp('g2'), comp('g3')],
    wires: [wire('p', '5V', 'g1', 'A'), wire('g1', 'Q', 'g2', 'A'), wire('g2', 'Q', 'g3', 'A'),
      ...['g1', 'g2', 'g3'].map(uid => wire('p', '5V', uid, 'B'))],
  }
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

describe('A9-NAND canonical and contribution contract', () => {
  it('exact A/B/Q pins, digital model, catalogue, no persistent parameters', () => {
    expect(getCanonicalEntry('NAND_GATE')).toMatchObject({ pins: [
      { id: 'A', role: 'input' }, { id: 'B', role: 'input' }, { id: 'Q', role: 'output' },
    ], capabilities: ['digital'], parameterSchema: [], defaultParameters: {}, modelAvailable: true })
    expect(getComponentDef('NAND_GATE').pins.map(p => p.id)).toEqual(['A', 'B', 'Q'])
    expect(PALETTE_ITEMS.filter(p => p.id === 'NAND_GATE')).toHaveLength(1)
    expect(createComponent('NAND_GATE', 0, 0)).not.toHaveProperty('state')
    expect(getSimulationModel('NAND_GATE').validate({})).toBe(true)
    expect(hasDigitalContribution('NAND_GATE')).toBe(true)
    expect(hasTimedDigitalContribution('NAND_GATE')).toBe(false)
    expect(hasDcContribution('NAND_GATE')).toBe(false)
  })
  // T1-T4: truth table Q = NOT(A AND B).
  it.each([[0, 0, 1], [0, 1, 1], [1, 0, 1], [1, 1, 0]])('T1-T4: A=%i B=%i => Q=%i through real step', (a, b, q) => {
    const components = [comp('p', 'POWER'), comp('g')]
    const wires = [wire('p', a ? '5V' : 'GND', 'g', 'A'), wire('p', b ? '5V' : 'GND', 'g', 'B')]
    expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(q ? Signal.HIGH : Signal.LOW)
  })
  // T5-T8 (plus every other four-valued combination): conservative contract.
  // A decisive LOW on either input always yields HIGH, even paired with
  // UNKNOWN/FLOATING (T7/T8). Both inputs decisively HIGH yields LOW. Any
  // other combination (e.g. HIGH+UNKNOWN, T5/T6) produces no drive: null,
  // preserving UNKNOWN through generic resolution rather than guessing.
  it.each(Object.values(Signal).flatMap(a => Object.values(Signal).map(b => [a, b])))('T5-T8: conservative four-valued inputs %s/%s', (A, B) => {
    const output = nandGate({ pinSignals: freeze({ A, B }) })
    const expected = A === Signal.LOW || B === Signal.LOW ? Signal.HIGH
      : A === Signal.HIGH && B === Signal.HIGH ? Signal.LOW : null
    if (expected === null) expect(output).toBeNull()
    else expect([...output]).toEqual([['Q', expected]])
    const c = [comp('g')]
    const produced = computeCombinationalDigitalSignals(c, prepareCircuit(c, []), digitalRegistry,
      new Map([['g:A', A], ['g:B', B]]))
    expect(produced.get('g:Q') ?? null).toBe(expected)
  })
  it('unwired Q stays UNKNOWN; removing a drive cannot retain the preceding LOW', () => {
    const { components, wires } = chain()
    expect(runSimulationStep(components, wires).pinSignals.get('g3:Q')).toBe(Signal.LOW)
    const disconnected = wires.filter(w => w.fromUid !== 'g1')
    expect(runSimulationStep(components, disconnected).pinSignals.get('g3:Q')).toBe(Signal.UNKNOWN)
  })
  // T9/T13: three gates cascade and settle in one step, no clocks/private state.
  it('T9/T13: three gates cascade and settle in one step without clocks or private state', () => {
    const { components, wires } = chain()
    const scheduler = { advance: vi.fn(() => { throw Error('unexpected clock') }) }
    const orchestrators = new Map(), timedDigitalStates = new Map(), electricalTransientStates = new Map()
    const result = runSimulationStep(components, wires, { scheduler, orchestrators, timedDigitalStates, electricalTransientStates })
    expect(result.pinSignals.get('g1:Q')).toBe(Signal.LOW)
    expect(result.pinSignals.get('g2:Q')).toBe(Signal.HIGH)
    expect(result.pinSignals.get('g3:Q')).toBe(Signal.LOW)
    expect(resolveSignals).toHaveBeenCalledTimes(1)
    expect(createScheduler).not.toHaveBeenCalled()
    expect(scheduler.advance).not.toHaveBeenCalled()
    for (const state of [orchestrators, timedDigitalStates, electricalTransientStates]) expect(state.size).toBe(0)
  })
  // T11: component/wire order independence.
  it('T11: component and wire permutations preserve every resolved signal', () => {
    const { components, wires } = chain()
    const expected = [...runSimulationStep(components, wires).pinSignals].sort()
    for (const order of [[...components].reverse(), [...components.slice(2), ...components.slice(0, 2)]]) {
      expect([...runSimulationStep(order, [...wires].reverse()).pinSignals].sort()).toEqual(expected)
    }
  })
  it('live Arduino Runtime drives all three gates in the same step', () => {
    const { components, wires } = chain()
    components.push(comp('arduino', 'ARDUINO'))
    wires[0] = wire('arduino', 'D2', 'g1', 'A')
    const orchestrator = createRuntimeOrchestrator()
    const runtime = orchestrator.getRuntime()
    runtime.start()
    const tick = vi.spyOn(runtime, 'tick')
    // Each stage is an inverter (B=HIGH fixed); three stages invert once: g3.Q = NOT(D2).
    for (const [signal, expected] of [[Signal.HIGH, Signal.LOW], [Signal.LOW, Signal.HIGH]]) {
      runtime.digitalWrite('D2', signal)
      expect(runSimulationStep(components, wires, { orchestrators: new Map([['arduino', orchestrator]]), dt: 16 }).pinSignals.get('g3:Q')).toBe(expected)
    }
    expect(tick).toHaveBeenCalledTimes(2)
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })
  // T12: no mutation of the frozen contribution context or circuit topology.
  it('T12: frozen contribution context and Document/topology remain unchanged', () => {
    const context = freeze({ component: comp('g'), pins: getComponentDef('NAND_GATE').pins, params: {}, pinSignals: { A: Signal.HIGH, B: Signal.HIGH } })
    const json = JSON.stringify(context)
    expect([...nandGate(context)]).toEqual([['Q', Signal.LOW]])
    expect([...nandGate(context)]).toEqual([['Q', Signal.LOW]])
    expect(JSON.stringify(context)).toBe(json)
    const { components, wires } = freeze(chain())
    const prepared = prepareCircuit(components, wires)
    const before = JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
    prepared.uf.find = prepared.uf.union = () => { throw Error('topology mutated') }
    expect(computeCombinationalDigitalSignals(components, prepared, digitalRegistry).get('g3:Q')).toBe(Signal.LOW)
    expect(JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(before)
  })
  it('all four historical digital contributors retain powered behavior, inverted', () => {
    // B=HIGH (non-decisive alone) makes NAND a plain inverter of A: Q = NOT(sensorOutput).
    for (const [type, pin, sensorLevel, expectedQ] of [
      ['SOIL_MOISTURE_SENSOR', 'DO', Signal.HIGH, Signal.LOW],
      ['PIR_MOTION_SENSOR', 'OUT', Signal.LOW, Signal.HIGH],
      ['TILT_SENSOR', 'DO', Signal.LOW, Signal.HIGH],
      ['IR_RECEIVER', 'SIGNAL', Signal.HIGH, Signal.LOW],
    ]) {
      const components = [comp('p', 'POWER'), comp('sensor', type), comp('g')]
      const wires = [wire('p', 'GND', 'sensor', 'GND'), wire('sensor', pin, 'g', 'A'), wire('p', '5V', 'g', 'B')]
      if (type !== 'TILT_SENSOR') wires.push(wire('p', '5V', 'sensor', 'VCC'))
      expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(expectedQ)
      void sensorLevel
    }
  })
  it('real HC_SR04 timed ECHO feeds the NAND cascade, inverted', () => {
    const { components, wires } = chain()
    components.push(comp('sonar', 'HC_SR04'))
    wires[0] = wire('sonar', 'ECHO', 'g1', 'A')
    wires.push(wire('p', '5V', 'sonar', 'VCC'), wire('p', 'GND', 'sonar', 'GND'), wire('p', '5V', 'sonar', 'TRIG'))
    const scheduler = createScheduler(), timedDigitalStates = new Map()
    // Three cascaded inverters (B=HIGH fixed): g3.Q = NOT(ECHO).
    expect(runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 1 }).pinSignals.get('g3:Q')).toBe(Signal.LOW)
    expect(runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 100 }).pinSignals.get('g3:Q')).toBe(Signal.HIGH)
    expect(timedDigitalStates.size).toBe(1)
  })
  // T10: chain mixing AND/OR/NAND proves NAND reuses the real generic fixed-point.
  it.each([Signal.LOW, Signal.HIGH])('T10: AND -> OR -> NAND retains HIGH regardless of the upstream signal (signal=%s)', signal => {
    const components = [comp('p', 'POWER'), comp('a', 'AND_GATE'), comp('o', 'OR_GATE'), comp('n')]
    const wires = [wire('p', signal === Signal.HIGH ? '5V' : 'GND', 'a', 'A'),
      wire('p', '5V', 'a', 'B'), wire('a', 'Q', 'o', 'A'), wire('p', 'GND', 'o', 'B'),
      wire('o', 'Q', 'n', 'A'), wire('p', 'GND', 'n', 'B')]
    // a.Q = AND(signal,HIGH) = signal. o.Q = OR(signal,LOW) = signal. n.B=GND(LOW)
    // is decisive for NAND regardless of n.A: n.Q = HIGH always.
    for (const order of [components, [...components].reverse()]) {
      expect(runSimulationStep(order, wires).pinSignals.get('n:Q')).toBe(Signal.HIGH)
    }
  })
  it('generic engine has no NAND-specific knowledge', () => {
    for (const file of ['engine.js', 'resolution.js', 'preparation.js', 'simulationRuntimeIntegration.js', 'scheduler.js']) {
      expect(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).not.toMatch(/NAND_GATE|NandGate/)
    }
  })
})
