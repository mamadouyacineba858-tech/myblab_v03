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
const comp = (uid, type = 'OR_GATE') => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const orGate = getDigitalContribution('OR_GATE')
function chain() {
  return {
    components: [comp('p', 'POWER'), comp('g1'), comp('g2'), comp('g3')],
    wires: [wire('p', '5V', 'g1', 'A'), wire('g1', 'Q', 'g2', 'A'), wire('g2', 'Q', 'g3', 'A'),
      ...['g1', 'g2', 'g3'].map(uid => wire('p', 'GND', uid, 'B'))],
  }
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

describe('A9-OR canonical and contribution contract', () => {
  it('T1-T5/T12: exact A/B/Q pins, digital model, catalogue, no persistent parameters', () => {
    expect(getCanonicalEntry('OR_GATE')).toMatchObject({ pins: [
      { id: 'A', role: 'input' }, { id: 'B', role: 'input' }, { id: 'Q', role: 'output' },
    ], capabilities: ['digital'], parameterSchema: [], defaultParameters: {}, modelAvailable: true })
    expect(getComponentDef('OR_GATE').pins.map(p => p.id)).toEqual(['A', 'B', 'Q'])
    expect(PALETTE_ITEMS.filter(p => p.id === 'OR_GATE')).toHaveLength(1)
    expect(createComponent('OR_GATE', 0, 0)).not.toHaveProperty('state')
    expect(getSimulationModel('OR_GATE').validate({})).toBe(true)
    expect(hasDigitalContribution('OR_GATE')).toBe(true)
    expect(hasTimedDigitalContribution('OR_GATE')).toBe(false)
    expect(hasDcContribution('OR_GATE')).toBe(false)
  })
  it.each([[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 1]])('T6-T9: A=%i B=%i => Q=%i through real step', (a, b, q) => {
    const components = [comp('p', 'POWER'), comp('g')]
    const wires = [wire('p', a ? '5V' : 'GND', 'g', 'A'), wire('p', b ? '5V' : 'GND', 'g', 'B')]
    expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(q ? Signal.HIGH : Signal.LOW)
  })
  it.each(Object.values(Signal).flatMap(a => Object.values(Signal).map(b => [a, b])))('T10: conservative four-valued inputs %s/%s', (A, B) => {
    const output = orGate({ pinSignals: freeze({ A, B }) })
    const expected = A === Signal.HIGH || B === Signal.HIGH ? Signal.HIGH
      : A === Signal.LOW && B === Signal.LOW ? Signal.LOW : null
    if (expected === null) expect(output).toBeNull()
    else expect([...output]).toEqual([['Q', expected]])
    const c = [comp('g')]
    const produced = computeCombinationalDigitalSignals(c, prepareCircuit(c, []), digitalRegistry,
      new Map([['g:A', A], ['g:B', B]]))
    expect(produced.get('g:Q') ?? null).toBe(expected)
  })
  it('unwired Q stays UNKNOWN; removing a drive cannot retain the preceding HIGH', () => {
    const { components, wires } = chain()
    expect(runSimulationStep(components, wires).pinSignals.get('g3:Q')).toBe(Signal.HIGH)
    const disconnected = wires.filter(w => w.fromUid !== 'g1')
    expect(runSimulationStep(components, disconnected).pinSignals.get('g3:Q')).toBe(Signal.UNKNOWN)
  })
  it('T11/T12/T14/T15: three gates settle in one step without clocks or private state', () => {
    const { components, wires } = chain()
    const scheduler = { advance: vi.fn(() => { throw Error('unexpected clock') }) }
    const orchestrators = new Map(), timedDigitalStates = new Map(), electricalTransientStates = new Map()
    const result = runSimulationStep(components, wires, { scheduler, orchestrators, timedDigitalStates, electricalTransientStates })
    for (const uid of ['g1', 'g2', 'g3']) expect(result.pinSignals.get(`${uid}:Q`)).toBe(Signal.HIGH)
    expect(resolveSignals).toHaveBeenCalledTimes(1)
    expect(createScheduler).not.toHaveBeenCalled()
    expect(scheduler.advance).not.toHaveBeenCalled()
    for (const state of [orchestrators, timedDigitalStates, electricalTransientStates]) expect(state.size).toBe(0)
  })
  it('T16: component and wire permutations preserve every resolved signal', () => {
    const { components, wires } = chain()
    const expected = [...runSimulationStep(components, wires).pinSignals].sort()
    for (const order of [[...components].reverse(), [...components.slice(2), ...components.slice(0, 2)]]) {
      expect([...runSimulationStep(order, [...wires].reverse()).pinSignals].sort()).toEqual(expected)
    }
  })
  it('T17: live Arduino Runtime drives all three gates in the same step', () => {
    const { components, wires } = chain()
    components.push(comp('arduino', 'ARDUINO'))
    wires[0] = wire('arduino', 'D2', 'g1', 'A')
    const orchestrator = createRuntimeOrchestrator()
    const runtime = orchestrator.getRuntime()
    runtime.start()
    const tick = vi.spyOn(runtime, 'tick')
    for (const signal of [Signal.HIGH, Signal.LOW]) {
      runtime.digitalWrite('D2', signal)
      expect(runSimulationStep(components, wires, { orchestrators: new Map([['arduino', orchestrator]]), dt: 16 }).pinSignals.get('g3:Q')).toBe(signal)
    }
    expect(tick).toHaveBeenCalledTimes(2)
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })
  it('T13: frozen contribution context and Document/topology remain unchanged', () => {
    const context = freeze({ component: comp('g'), pins: getComponentDef('OR_GATE').pins, params: {}, pinSignals: { A: Signal.HIGH, B: Signal.HIGH } })
    const json = JSON.stringify(context)
    expect([...orGate(context)]).toEqual([['Q', Signal.HIGH]])
    expect([...orGate(context)]).toEqual([['Q', Signal.HIGH]])
    expect(JSON.stringify(context)).toBe(json)
    const { components, wires } = freeze(chain())
    const prepared = prepareCircuit(components, wires)
    const before = JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
    prepared.uf.find = prepared.uf.union = () => { throw Error('topology mutated') }
    expect(computeCombinationalDigitalSignals(components, prepared, digitalRegistry).get('g3:Q')).toBe(Signal.HIGH)
    expect(JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(before)
  })
  it('T18: all four historical digital contributors retain powered behavior', () => {
    for (const [type, pin, level] of [['SOIL_MOISTURE_SENSOR', 'DO', Signal.HIGH], ['PIR_MOTION_SENSOR', 'OUT', Signal.LOW], ['TILT_SENSOR', 'DO', Signal.LOW], ['IR_RECEIVER', 'SIGNAL', Signal.HIGH]]) {
      const components = [comp('p', 'POWER'), comp('sensor', type), comp('g')]
      const wires = [wire('p', 'GND', 'sensor', 'GND'), wire('sensor', pin, 'g', 'A'), wire('p', 'GND', 'g', 'B')]
      if (type !== 'TILT_SENSOR') wires.push(wire('p', '5V', 'sensor', 'VCC'))
      expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(level)
    }
  })
  it('T20: real HC_SR04 timed ECHO feeds the OR cascade', () => {
    const { components, wires } = chain()
    components.push(comp('sonar', 'HC_SR04'))
    wires[0] = wire('sonar', 'ECHO', 'g1', 'A')
    wires.push(wire('p', '5V', 'sonar', 'VCC'), wire('p', 'GND', 'sonar', 'GND'), wire('p', '5V', 'sonar', 'TRIG'))
    const scheduler = createScheduler(), timedDigitalStates = new Map()
    expect(runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 1 }).pinSignals.get('g3:Q')).toBe(Signal.HIGH)
    expect(runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 100 }).pinSignals.get('g3:Q')).toBe(Signal.LOW)
    expect(timedDigitalStates.size).toBe(1)
  })
  it.each([Signal.LOW, Signal.HIGH])('T19: AND -> OR -> AND retains %s in one real step', signal => {
    const components = [comp('p', 'POWER'), comp('a1', 'AND_GATE'), comp('o'), comp('a2', 'AND_GATE')]
    const wires = [wire('p', signal === Signal.HIGH ? '5V' : 'GND', 'a1', 'A'),
      wire('p', '5V', 'a1', 'B'), wire('a1', 'Q', 'o', 'A'), wire('p', 'GND', 'o', 'B'),
      wire('o', 'Q', 'a2', 'A'), wire('p', '5V', 'a2', 'B')]
    for (const order of [components, [...components].reverse()]) {
      expect(runSimulationStep(order, wires).pinSignals.get('a2:Q')).toBe(signal)
    }
  })
  it('T27: generic engine has no OR-specific knowledge', () => {
    for (const file of ['engine.js', 'resolution.js', 'preparation.js', 'simulationRuntimeIntegration.js', 'scheduler.js']) {
      expect(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).not.toMatch(/OR_GATE|OrGate/)
    }
  })
})
