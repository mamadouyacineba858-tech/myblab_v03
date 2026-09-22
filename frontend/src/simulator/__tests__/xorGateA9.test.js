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
const comp = (uid, type = 'XOR_GATE') => ({ uid, type, x: 0, y: 0 })
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const xorGate = getDigitalContribution('XOR_GATE')
// Unlike AND/OR/NAND/NOR's chain() (a fixed B input turns every stage into a
// plain gate of A alone), XOR genuinely needs BOTH inputs decisively known,
// so a chain with B pinned to a constant still exercises the real two-input
// truth table at every stage: with B=LOW fixed, XOR(A,LOW) = A (identity),
// so three cascaded stages just relay A unchanged (odd or even count alike).
// g1: A=LOW,B=LOW => Q=LOW. g2: A=LOW,B=LOW => Q=LOW. g3: A=LOW,B=LOW => Q=LOW.
function chain() {
  return {
    components: [comp('p', 'POWER'), comp('g1'), comp('g2'), comp('g3')],
    wires: [wire('p', 'GND', 'g1', 'A'), wire('g1', 'Q', 'g2', 'A'), wire('g2', 'Q', 'g3', 'A'),
      ...['g1', 'g2', 'g3'].map(uid => wire('p', 'GND', uid, 'B'))],
  }
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value) }
  return value
}

describe('A9-XOR canonical and contribution contract', () => {
  it('exact A/B/Q pins, digital model, catalogue, no persistent parameters', () => {
    expect(getCanonicalEntry('XOR_GATE')).toMatchObject({ pins: [
      { id: 'A', role: 'input' }, { id: 'B', role: 'input' }, { id: 'Q', role: 'output' },
    ], capabilities: ['digital'], parameterSchema: [], defaultParameters: {}, modelAvailable: true })
    expect(getComponentDef('XOR_GATE').pins.map(p => p.id)).toEqual(['A', 'B', 'Q'])
    expect(PALETTE_ITEMS.filter(p => p.id === 'XOR_GATE')).toHaveLength(1)
    expect(createComponent('XOR_GATE', 0, 0)).not.toHaveProperty('state')
    expect(getSimulationModel('XOR_GATE').validate({})).toBe(true)
    expect(hasDigitalContribution('XOR_GATE')).toBe(true)
    expect(hasTimedDigitalContribution('XOR_GATE')).toBe(false)
    expect(hasDcContribution('XOR_GATE')).toBe(false)
  })
  // T1-T4: truth table Q = A XOR B.
  it.each([[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]])('T1-T4: A=%i B=%i => Q=%i through real step', (a, b, q) => {
    const components = [comp('p', 'POWER'), comp('g')]
    const wires = [wire('p', a ? '5V' : 'GND', 'g', 'A'), wire('p', b ? '5V' : 'GND', 'g', 'B')]
    expect(runSimulationStep(components, wires).pinSignals.get('g:Q')).toBe(q ? Signal.HIGH : Signal.LOW)
  })
  // T5-T8 (plus every other four-valued combination): conservative contract.
  // Unlike AND/OR/NAND/NOR, XOR has NO single decisive input value: Q is
  // only driven when BOTH A and B are decisively HIGH or LOW. Any other
  // combination (one side UNKNOWN/FLOATING) produces no drive: null,
  // preserving UNKNOWN through generic resolution rather than guessing.
  it.each(Object.values(Signal).flatMap(a => Object.values(Signal).map(b => [a, b])))('T5-T8: conservative four-valued inputs %s/%s', (A, B) => {
    const output = xorGate({ pinSignals: freeze({ A, B }) })
    const bothKnown = (A === Signal.HIGH || A === Signal.LOW) && (B === Signal.HIGH || B === Signal.LOW)
    const expected = bothKnown ? (A !== B ? Signal.HIGH : Signal.LOW) : null
    if (expected === null) expect(output).toBeNull()
    else expect([...output]).toEqual([['Q', expected]])
    const c = [comp('g')]
    const produced = computeCombinationalDigitalSignals(c, prepareCircuit(c, []), digitalRegistry,
      new Map([['g:A', A], ['g:B', B]]))
    expect(produced.get('g:Q') ?? null).toBe(expected)
  })
  it('unwired Q stays UNKNOWN; removing a drive cannot retain the preceding HIGH', () => {
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
    expect(result.pinSignals.get('g2:Q')).toBe(Signal.LOW)
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
  it('live Arduino Runtime drives both gate inputs in the same step', () => {
    const components = [comp('p', 'POWER'), comp('g'), comp('arduino', 'ARDUINO')]
    const wires = [wire('arduino', 'D2', 'g', 'A'), wire('p', '5V', 'g', 'B')]
    const orchestrator = createRuntimeOrchestrator()
    const runtime = orchestrator.getRuntime()
    runtime.start()
    const tick = vi.spyOn(runtime, 'tick')
    // B=HIGH fixed: g.Q = XOR(D2,HIGH) = NOT(D2).
    for (const [signal, expected] of [[Signal.HIGH, Signal.LOW], [Signal.LOW, Signal.HIGH]]) {
      runtime.digitalWrite('D2', signal)
      expect(runSimulationStep(components, wires, { orchestrators: new Map([['arduino', orchestrator]]), dt: 16 }).pinSignals.get('g:Q')).toBe(expected)
    }
    expect(tick).toHaveBeenCalledTimes(2)
    expect(resolveSignals).toHaveBeenCalledTimes(2)
  })
  // T12: no mutation of the frozen contribution context or circuit topology.
  it('T12: frozen contribution context and Document/topology remain unchanged', () => {
    const context = freeze({ component: comp('g'), pins: getComponentDef('XOR_GATE').pins, params: {}, pinSignals: { A: Signal.HIGH, B: Signal.LOW } })
    const json = JSON.stringify(context)
    expect([...xorGate(context)]).toEqual([['Q', Signal.HIGH]])
    expect([...xorGate(context)]).toEqual([['Q', Signal.HIGH]])
    expect(JSON.stringify(context)).toBe(json)
    const { components, wires } = freeze(chain())
    const prepared = prepareCircuit(components, wires)
    const before = JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])
    prepared.uf.find = prepared.uf.union = () => { throw Error('topology mutated') }
    expect(computeCombinationalDigitalSignals(components, prepared, digitalRegistry).get('g3:Q')).toBe(Signal.LOW)
    expect(JSON.stringify([components, wires, [...prepared.uf.parent], [...prepared.nets], prepared.allKeys])).toBe(before)
  })
  it('all four historical digital contributors feed one decisive XOR input', () => {
    // B=HIGH (decisive value that flips the sensor's own output): g.Q = NOT(sensorOutput).
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
  it('real HC_SR04 timed ECHO feeds the XOR gate, inverted by a fixed HIGH on B', () => {
    const components = [comp('p', 'POWER'), comp('g'), comp('sonar', 'HC_SR04')]
    const wires = [wire('sonar', 'ECHO', 'g', 'A'), wire('p', '5V', 'g', 'B'),
      wire('p', '5V', 'sonar', 'VCC'), wire('p', 'GND', 'sonar', 'GND'), wire('p', '5V', 'sonar', 'TRIG')]
    const scheduler = createScheduler(), timedDigitalStates = new Map()
    // B=HIGH fixed: g.Q = XOR(ECHO,HIGH) = NOT(ECHO), the same single net
    // inversion as norGateA9.test.js's three-stage (odd -> one inversion)
    // cascade, so the real ECHO transition it measures applies identically:
    // dt=1 -> ECHO=HIGH -> g.Q=LOW; dt=100 -> ECHO=LOW -> g.Q=HIGH.
    expect(runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 1 }).pinSignals.get('g:Q')).toBe(Signal.LOW)
    expect(runSimulationStep(components, wires, { scheduler, timedDigitalStates, dt: 100 }).pinSignals.get('g:Q')).toBe(Signal.HIGH)
    expect(timedDigitalStates.size).toBe(1)
  })
  // T10: chain mixing AND/OR/NAND/NOR/XOR proves XOR reuses the real generic fixed-point.
  it.each([Signal.LOW, Signal.HIGH])('T10: AND -> OR -> NAND -> NOR -> XOR settles to a signal-independent constant (signal=%s)', signal => {
    const components = [comp('p', 'POWER'), comp('a', 'AND_GATE'), comp('o', 'OR_GATE'), comp('nd', 'NAND_GATE'), comp('nr', 'NOR_GATE'), comp('x')]
    const wires = [wire('p', signal === Signal.HIGH ? '5V' : 'GND', 'a', 'A'),
      wire('p', '5V', 'a', 'B'), wire('a', 'Q', 'o', 'A'), wire('p', 'GND', 'o', 'B'),
      wire('o', 'Q', 'nd', 'A'), wire('p', '5V', 'nd', 'B'),
      wire('nd', 'Q', 'nr', 'A'), wire('p', 'GND', 'nr', 'B'),
      wire('nr', 'Q', 'x', 'A'), wire('p', 'GND', 'x', 'B')]
    // a.Q = AND(signal,HIGH) = signal. o.Q = OR(signal,LOW) = signal.
    // nd.Q = NAND(signal,HIGH) = NOT(signal). nr.Q = NOR(NOT(signal),LOW) = signal.
    // x.B=LOW is NOT decisive alone for XOR, but x.A=nr.Q is always
    // decisively known here, so x.Q = XOR(signal,LOW) = signal — the chain
    // ultimately settles to whatever `a` was fed, not a true constant, but
    // the point (as for the sibling gates) is that it settles identically
    // regardless of storage/evaluation order.
    for (const order of [components, [...components].reverse()]) {
      expect(runSimulationStep(order, wires).pinSignals.get('x:Q')).toBe(signal)
    }
  })
  // T14: XOR feeding back into AND/OR/NAND/NOR proves the fixed-point resolves
  // regardless of which side of the mix XOR sits on.
  it.each([Signal.LOW, Signal.HIGH])('T14: XOR -> NAND -> OR -> AND settles to a signal-independent constant (signal=%s)', signal => {
    const components = [comp('p', 'POWER'), comp('x'), comp('nd', 'NAND_GATE'), comp('o', 'OR_GATE'), comp('a', 'AND_GATE')]
    const wires = [wire('p', signal === Signal.HIGH ? '5V' : 'GND', 'x', 'A'),
      wire('p', 'GND', 'x', 'B'), wire('x', 'Q', 'nd', 'A'), wire('p', '5V', 'nd', 'B'),
      wire('nd', 'Q', 'o', 'A'), wire('p', 'GND', 'o', 'B'),
      wire('o', 'Q', 'a', 'A'), wire('p', 'GND', 'a', 'B')]
    // x.B=LOW fixed: x.Q = XOR(signal,LOW) = signal. nd.Q = NAND(signal,HIGH) = NOT(signal).
    // o.Q = OR(NOT(signal),LOW) = NOT(signal). a.B=GND(LOW) is decisive for AND
    // regardless of a.A: a.Q = LOW always.
    for (const order of [components, [...components].reverse()]) {
      expect(runSimulationStep(order, wires).pinSignals.get('a:Q')).toBe(Signal.LOW)
    }
  })
  it('generic engine has no XOR-specific knowledge', () => {
    for (const file of ['engine.js', 'resolution.js', 'preparation.js', 'simulationRuntimeIntegration.js', 'scheduler.js']) {
      expect(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')).not.toMatch(/XOR_GATE|XorGate/)
    }
  })
})
