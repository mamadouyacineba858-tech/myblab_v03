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
const comp = (uid, type = 'NOT_GATE') => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const notGate = getDigitalContribution('NOT_GATE')
const invert = signal => (signal === Signal.HIGH ? Signal.LOW : Signal.HIGH)
// Three cascaded inverters fed by a constant: LOW -> g1 HIGH -> g2 LOW -> g3 HIGH.
function chain(input = 'GND') {
  return {
    components: [comp('p', 'POWER'), comp('g1'), comp('g2'), comp('g3')],
    wires: [wire('p', input, 'g1', 'A'), wire('g1', 'Q', 'g2', 'A'), wire('g2', 'Q', 'g3', 'A')],
  }
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

describe('A9-NOT canonical and contribution contract', () => {
  it('T1: exactly two pins A input / Q output, digital, no persistent parameters', () => {
    expect(getCanonicalEntry('NOT_GATE')).toMatchObject({ pins: [
      { id: 'A', role: 'input' }, { id: 'Q', role: 'output' },
    ], capabilities: ['digital'], parameterSchema: [], defaultParameters: {}, modelAvailable: true })
    expect(getCanonicalEntry('NOT_GATE').pins).toHaveLength(2)
    expect(getComponentDef('NOT_GATE').pins.map(p => p.id)).toEqual(['A', 'Q'])
    for (const forbidden of ['B', 'VCC', 'GND', 'EN', 'ENABLE', 'CLK', 'CLOCK']) {
      expect(getComponentDef('NOT_GATE').pins.map(p => p.id)).not.toContain(forbidden)
    }
  })
  it('T2/T3/T4/T5: catalogue once, stateless instance, sibling model, digital-only classification', () => {
    expect(PALETTE_ITEMS.filter(p => p.id === 'NOT_GATE')).toHaveLength(1)
    const instance = createComponent('NOT_GATE', 0, 0)
    expect(instance).toMatchObject({ type: 'NOT_GATE' })
    expect(instance).not.toHaveProperty('state')
    expect(getSimulationModel('NOT_GATE').validate({})).toBe(true)
    expect(getSimulationModel('NOT_GATE').validate(null)).toBe(false)
    expect(hasDigitalContribution('NOT_GATE')).toBe(true)
    expect(hasTimedDigitalContribution('NOT_GATE')).toBe(false)
    expect(hasDcContribution('NOT_GATE')).toBe(false)
  })
  // T6/T7: truth table Q = NOT(A) through the real step.
  it.each([['GND', Signal.HIGH], ['5V', Signal.LOW]])('T6/T7: A driven from POWER %s => Q=%s through real step', (source, q) => {
    const components = [comp('p', 'POWER'), comp('g')]
    const result = runSimulationStep(components, [wire('p', source, 'g', 'A')])
    expect(result.pinSignals.get('g:A')).toBe(invert(q))
    expect(result.pinSignals.get('g:Q')).toBe(q)
  })
  // T8/T9: UNKNOWN/FLOATING never become a logic level.
  it.each(Object.values(Signal))('T8/T9: pure contribution and combinational pass for A=%s', A => {
    const output = notGate({ pinSignals: freeze({ A }) })
    const expected = A === Signal.HIGH ? Signal.LOW : A === Signal.LOW ? Signal.HIGH : null
    if (expected === null) expect(output).toBeNull()
    else expect([...output]).toEqual([['Q', expected]])
    const c = [comp('g')]
    const produced = computeCombinationalDigitalSignals(c, prepareCircuit(c, []), digitalRegistry, new Map([['g:A', A]]))
    expect(produced.get('g:Q') ?? null).toBe(expected)
  })
  it('T8: undriven or conflicting A resolves to UNKNOWN in the real pipeline; Q is not invented', () => {
    const unwired = runSimulationStep([comp('g')], [])
    expect(unwired.pinSignals.get('g:A')).toBe(Signal.UNKNOWN)
    expect(unwired.pinSignals.get('g:Q')).toBe(Signal.UNKNOWN)
    const conflict = runSimulationStep([comp('p', 'POWER'), comp('g')], [wire('p', '5V', 'g', 'A'), wire('p', 'GND', 'g', 'A')])
    expect(conflict.pinSignals.get('g:Q')).toBe(Signal.UNKNOWN)
  })
  it('T10: removing the A drive cannot retain the preceding HIGH (no phantom latch)', () => {
    const components = [comp('p', 'POWER'), comp('g')]
    const wires = [wire('p', 'GND', 'g', 'A')]
    expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(Signal.HIGH)
    expect(runSimulationStep(components, []).pinSignals.get('g:Q')).toBe(Signal.UNKNOWN)
    expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(Signal.HIGH)
    const cascade = chain()
    expect(runSimulationStep(cascade.components, cascade.wires).pinSignals.get('g3:Q')).toBe(Signal.HIGH)
    const disconnected = cascade.wires.filter(w => w.toUid !== 'g1')
    expect(runSimulationStep(cascade.components, disconnected).pinSignals.get('g3:Q')).toBe(Signal.UNKNOWN)
  })
  // T11/T13: three inverters cascade and settle in one step, no clocks/private state.
  it.each([['GND', [Signal.HIGH, Signal.LOW, Signal.HIGH]], ['5V', [Signal.LOW, Signal.HIGH, Signal.LOW]]])('T11/T13: three NOT gates fed from %s settle in one step without clocks or private state', (input, expected) => {
    const { components, wires } = chain(input)
    const scheduler = { advance: vi.fn(() => { throw Error('unexpected clock') }) }
    const orchestrators = new Map(), timedDigitalStates = new Map(), electricalTransientStates = new Map()
    const result = runSimulationStep(components, wires, { scheduler, orchestrators, timedDigitalStates, electricalTransientStates })
    expect(['g1', 'g2', 'g3'].map(uid => result.pinSignals.get(`${uid}:Q`))).toEqual(expected)
    expect(resolveSignals).toHaveBeenCalledTimes(1)
    expect(createScheduler).not.toHaveBeenCalled()
    expect(scheduler.advance).not.toHaveBeenCalled()
    for (const state of [orchestrators, timedDigitalStates, electricalTransientStates]) expect(state.size).toBe(0)
  })
  // T12: component/wire order independence.
  it('T12: component and wire permutations preserve every resolved signal', () => {
    const { components, wires } = chain()
    const expected = [...runSimulationStep(components, wires).pinSignals].sort()
    for (const order of [[...components].reverse(), [...components.slice(2), ...components.slice(0, 2)]]) {
      for (const wireOrder of [[...wires].reverse(), [wires[1], wires[2], wires[0]]]) {
        expect([...runSimulationStep(order, wireOrder).pinSignals].sort()).toEqual(expected)
      }
    }
  })
  // T14: no mutation of the frozen contribution context or circuit topology.
  it('T14: frozen contribution context and Document/topology remain unchanged', () => {
    const context = freeze({ component: comp('g'), pins: getComponentDef('NOT_GATE').pins, params: {}, pinSignals: { A: Signal.HIGH } })
    const json = JSON.stringify(context)
    expect([...notGate(context)]).toEqual([['Q', Signal.LOW]])
    expect([...notGate(context)]).toEqual([['Q', Signal.LOW]])
    expect(JSON.stringify(context)).toBe(json)
    const { components, wires } = freeze(chain())
    const prepared = prepareCircuit(components, wires)
    const before = JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
    prepared.uf.find = prepared.uf.union = () => { throw Error('topology mutated') }
    expect(computeCombinationalDigitalSignals(components, prepared, digitalRegistry).get('g3:Q')).toBe(Signal.HIGH)
    expect(JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(before)
  })
  // T15: NOT mixed with AND/OR/NAND/NOR/XOR, downstream and upstream.
  it.each([Signal.LOW, Signal.HIGH])('T15: AND -> OR -> NAND -> NOR -> XOR -> NOT settles through the generic fixed-point (signal=%s)', signal => {
    const components = [comp('p', 'POWER'), comp('a', 'AND_GATE'), comp('o', 'OR_GATE'), comp('nd', 'NAND_GATE'), comp('nr', 'NOR_GATE'), comp('x', 'XOR_GATE'), comp('n')]
    const wires = [wire('p', signal === Signal.HIGH ? '5V' : 'GND', 'a', 'A'),
      wire('p', '5V', 'a', 'B'), wire('a', 'Q', 'o', 'A'), wire('p', 'GND', 'o', 'B'),
      wire('o', 'Q', 'nd', 'A'), wire('p', '5V', 'nd', 'B'),
      wire('nd', 'Q', 'nr', 'A'), wire('p', 'GND', 'nr', 'B'),
      wire('nr', 'Q', 'x', 'A'), wire('p', 'GND', 'x', 'B'),
      wire('x', 'Q', 'n', 'A')]
    // a.Q = signal, o.Q = signal, nd.Q = NOT(signal), nr.Q = signal,
    // x.Q = XOR(signal, LOW) = signal, n.Q = NOT(signal).
    for (const order of [components, [...components].reverse()]) {
      const result = runSimulationStep(order, [...wires].reverse())
      expect(result.pinSignals.get('x:Q')).toBe(signal)
      expect(result.pinSignals.get('n:Q')).toBe(invert(signal))
    }
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })
  it.each([Signal.LOW, Signal.HIGH])('T15: NOT upstream of NAND -> OR -> XOR -> NOR -> AND settles through the generic fixed-point (signal=%s)', signal => {
    const components = [comp('p', 'POWER'), comp('n'), comp('nd', 'NAND_GATE'), comp('o', 'OR_GATE'), comp('x', 'XOR_GATE'), comp('nr', 'NOR_GATE'), comp('a', 'AND_GATE')]
    const wires = [wire('p', signal === Signal.HIGH ? '5V' : 'GND', 'n', 'A'),
      wire('n', 'Q', 'nd', 'A'), wire('p', '5V', 'nd', 'B'),
      wire('nd', 'Q', 'o', 'A'), wire('p', 'GND', 'o', 'B'),
      wire('o', 'Q', 'x', 'A'), wire('p', '5V', 'x', 'B'),
      wire('x', 'Q', 'nr', 'A'), wire('p', 'GND', 'nr', 'B'),
      wire('nr', 'Q', 'a', 'A'), wire('p', '5V', 'a', 'B')]
    // n.Q = NOT(signal); nd.Q = NAND(NOT(signal), HIGH) = signal; o.Q = signal;
    // x.Q = XOR(signal, HIGH) = NOT(signal); nr.Q = NOR(NOT(signal), LOW) = signal;
    // a.Q = AND(signal, HIGH) = signal.
    for (const order of [components, [...components].reverse()]) {
      const result = runSimulationStep(order, wires)
      expect(result.pinSignals.get('n:Q')).toBe(invert(signal))
      expect(result.pinSignals.get('a:Q')).toBe(signal)
    }
  })
  it('T16: live Arduino Runtime drives A and Q inverts it in the same step', () => {
    const components = [comp('g'), comp('arduino', 'ARDUINO')]
    const wires = [wire('arduino', 'D2', 'g', 'A')]
    const orchestrator = createRuntimeOrchestrator()
    const runtime = orchestrator.getRuntime()
    runtime.start()
    const tick = vi.spyOn(runtime, 'tick')
    for (const [signal, expected] of [[Signal.HIGH, Signal.LOW], [Signal.LOW, Signal.HIGH]]) {
      runtime.digitalWrite('D2', signal)
      expect(runSimulationStep(components, wires, { orchestrators: new Map([['arduino', orchestrator]]), dt: 16 }).pinSignals.get('g:Q')).toBe(expected)
    }
    expect(tick).toHaveBeenCalledTimes(2)
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })
  it('T17: all four historical digital contributors feed A without a special branch', () => {
    for (const [type, pin, sensorLevel] of [
      ['SOIL_MOISTURE_SENSOR', 'DO', Signal.HIGH],
      ['PIR_MOTION_SENSOR', 'OUT', Signal.LOW],
      ['TILT_SENSOR', 'DO', Signal.LOW],
      ['IR_RECEIVER', 'SIGNAL', Signal.HIGH],
    ]) {
      const components = [comp('p', 'POWER'), comp('sensor', type), comp('g')]
      const wires = [wire('p', 'GND', 'sensor', 'GND'), wire('sensor', pin, 'g', 'A')]
      if (type !== 'TILT_SENSOR') wires.push(wire('p', '5V', 'sensor', 'VCC'))
      const result = runSimulationStep(components, wires)
      expect(result.pinSignals.get('g:A'), type).toBe(sensorLevel)
      expect(result.pinSignals.get('g:Q'), type).toBe(invert(sensorLevel))
    }
  })
  it('T18: real HC_SR04 timed ECHO feeds A; NOT inverts it without owning the Scheduler', () => {
    const components = [comp('p', 'POWER'), comp('g'), comp('sonar', 'HC_SR04')]
    const wires = [wire('sonar', 'ECHO', 'g', 'A'),
      wire('p', '5V', 'sonar', 'VCC'), wire('p', 'GND', 'sonar', 'GND'), wire('p', '5V', 'sonar', 'TRIG')]
    const scheduler = createScheduler(), timedDigitalStates = new Map()
    const advance = vi.spyOn(scheduler, 'advance')
    // dt=1 -> ECHO=HIGH -> Q=LOW; dt=100 -> ECHO=LOW -> Q=HIGH (same ECHO
    // transitions as the sibling A9 suites).
    const first = runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 1 })
    expect(first.pinSignals.get('g:A')).toBe(Signal.HIGH)
    expect(first.pinSignals.get('g:Q')).toBe(Signal.LOW)
    const second = runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 100 })
    expect(second.pinSignals.get('g:A')).toBe(Signal.LOW)
    expect(second.pinSignals.get('g:Q')).toBe(Signal.HIGH)
    // Only the HC_SR04 producer holds timed state; the Scheduler is the one
    // the caller created (once), advanced once per step, never by NOT.
    expect(timedDigitalStates.size).toBe(1)
    expect([...timedDigitalStates.keys()]).toEqual(['sonar'])
    expect(createScheduler).toHaveBeenCalledTimes(1)
    expect(advance).toHaveBeenCalledTimes(2)
  })
  it('T19: generic engine has no NOT-specific knowledge', () => {
    for (const file of ['engine.js', 'resolution.js', 'preparation.js', 'simulationRuntimeIntegration.js', 'scheduler.js']) {
      expect(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).not.toMatch(/NOT_GATE|NotGate/)
    }
  })
})
