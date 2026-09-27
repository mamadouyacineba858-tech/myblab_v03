import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  runSimulationWithRuntime,
  computeTimedDigitalSignals,
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  circuitRequiresContinuousStepping,
  snapshotTimedDigitalStates,
  SIMULATION_STEP_MS,
} from '../simulationRuntimeIntegration.js'
import {
  getAllTimedDigitalContributionTypes,
  getTimedDigitalContribution,
  hasTimedDigitalContribution,
  createTimedDigitalContributionRegistry,
} from '../timedDigitalContributionRegistry.js'
import { hasDigitalContribution } from '../digitalContributionRegistry.js'
import { hasDcContribution } from '../dcContributionRegistry.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { isSimulationModelAvailable, getSimulationDefaultParameters } from '../simulationRegistry.js'
import { Lcd16x2WH1602BModel } from '../models/Lcd16x2WH1602BModel.js'
import { toEngineInput } from '../engineAdapter.js'
import { Signal } from '../signals.js'
import { projectSt7066uDisplay } from '../../visualization/st7066uDisplayProjection.js'

/**
 * A10-DISP2 — Winstar WH1602B / contrôleur ST7066U : contrat fonctionnel (LCD-xx).
 *
 * Toute la logique passe par le Registry timed de production
 * (timedDigitalContributionRegistry.js) et le pipeline A9-SEQ-PREQ/PREQ2 réel
 * (`runSimulationWithRuntime` + `createSimulationRuntimeSession`) ; aucune
 * fixture ne remplace le producteur ST7066U. Le busy timing (µs/ms) et
 * FLOATING (non productible par câblage) passent par la contribution de
 * production appelée directement avec un `currentTimeMs` explicite.
 */

const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const TYPE = 'LCD_16X2_WH1602B'
const isLogic = s => s === HIGH || s === LOW
const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const DB = ['DB0', 'DB1', 'DB2', 'DB3', 'DB4', 'DB5', 'DB6', 'DB7']
const BLANK_LINE = ' '.repeat(16)

// Temps d'exécution ST7066U (fiche technique, fosc = 270 kHz) : Clear Display / Return Home
// 1.52 ms ; toute autre instruction et l'écriture de donnée 37 µs.
const LONG_MS = 1.52
const SHORT_MS = 0.037

/** Niveaux DB0..DB7 d'un octet. */
const bus = byte => Object.fromEntries(DB.map((pin, i) => [pin, (byte >> i) & 1 ? HIGH : LOW]))
/** Niveaux DB4..DB7 d'un nibble (DB0..DB3 non pilotés, comme un câblage 4 bits). */
const nibbleBus = nibble => Object.fromEntries(DB.slice(4).map((pin, i) => [pin, (nibble >> i) & 1 ? HIGH : LOW]))
const text = s => [...s].map(c => c.charCodeAt(0))

/** Câblage : chaque pin décisive reliée au rail POWER correspondant, une pin UNKNOWN reste non connectée. */
const BASE = { VSS: LOW, VDD: HIGH, RW: LOW, RS: LOW, E: LOW }
function wiresFor(levels, uid = 'lcd') {
  return Object.entries({ ...BASE, ...levels })
    .filter(([, level]) => isLogic(level))
    .map(([pin, level]) => wire('p', level === HIGH ? '5V' : 'GND', uid, pin))
}

/** Banc sur le pipeline réel : pas de SIMULATION_STEP_MS, le contrôleur n'est jamais occupé d'un step à l'autre. */
function bench(uid = 'lcd') {
  const runtimeSession = createSimulationRuntimeSession()
  const components = [{ uid: 'p', type: 'POWER' }, { uid, type: TYPE }]
  const step = (levels = {}, dt = SIMULATION_STEP_MS) => runSimulationWithRuntime(components, wiresFor(levels, uid), { runtimeSession, dt })
  const memory = () => runtimeSession.timedDigitalStates.get(uid)
  /** Impulsion E complète HIGH -> LOW avec les mêmes RS/R-W/DB. */
  const pulse = (levels = {}) => {
    step({ ...levels, E: HIGH })
    return step({ ...levels, E: LOW })
  }
  const command = byte => pulse({ RS: LOW, ...bus(byte) })
  const data = byte => pulse({ RS: HIGH, ...bus(byte) })
  const print = s => text(s).forEach(data)
  const view = () => projectSt7066uDisplay(memory())
  return { runtimeSession, components, step, memory, pulse, command, data, print, view }
}

/** Contribution de production appelée directement, temps explicite (busy timing, FLOATING). */
function chip() {
  const contribute = getTimedDigitalContribution(TYPE)
  let state
  const apply = (levels, t) => {
    const r = contribute({ component: { uid: 'lcd', type: TYPE }, pins: [], params: {}, currentTimeMs: t, previousState: state, pinSignals: { ...BASE, ...levels } })
    state = r.state
    return r
  }
  /** Front descendant à l'instant t (E HIGH puis LOW au même instant). */
  const edge = (levels, t) => {
    apply({ ...levels, E: HIGH }, t)
    return apply({ ...levels, E: LOW }, t)
  }
  return { apply, edge, state: () => state }
}

describe('A10-DISP2 — LCD-01 / LCD-02 registration and pinout', () => {
  it('LCD-01: one declarative entry in the production timed registry, unique canonical type, no combinational/DC path', () => {
    expect(hasTimedDigitalContribution(TYPE)).toBe(true)
    expect(getTimedDigitalContribution(TYPE)).toBeTypeOf('function')
    expect(getAllTimedDigitalContributionTypes().filter(t => t === TYPE)).toHaveLength(1)
    expect(getAllCanonicalTypes().filter(t => t === TYPE)).toHaveLength(1)
    expect(getAllCanonicalTypes().filter(t => /LCD|WH1602|ST7066/.test(t))).toEqual([TYPE])
    expect(hasDigitalContribution(TYPE)).toBe(false)
    expect(hasDcContribution(TYPE)).toBe(false)
    expect(circuitRequiresContinuousStepping([{ uid: 'lcd', type: TYPE }])).toBe(true)
  })

  it('LCD-02: canonical entry = 16 electrical pins in physical order 1..16 with locked roles, digital, no parameters, model available', () => {
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: true, capabilities: ['digital'], defaultParameters: {}, parameterSchema: [] })
    expect(entry.pins.map(p => [p.id, p.role])).toEqual([
      ['VSS', 'ground'], ['VDD', 'power'], ['VO', 'input'], ['RS', 'input'], ['RW', 'input'], ['E', 'input'],
      ['DB0', 'input'], ['DB1', 'input'], ['DB2', 'input'], ['DB3', 'input'], ['DB4', 'input'], ['DB5', 'input'],
      ['DB6', 'input'], ['DB7', 'input'], ['A', 'input'], ['K', 'ground'],
    ])
    expect(isSimulationModelAvailable(TYPE)).toBe(true)
    expect(getSimulationDefaultParameters(TYPE)).toEqual({})
    expect(Lcd16x2WH1602BModel).toMatchObject({ type: TYPE })
    expect(Lcd16x2WH1602BModel.validate({})).toBe(true)
    expect(Lcd16x2WH1602BModel.validate(null)).toBe(false)
    expect(Lcd16x2WH1602BModel.validate([])).toBe(false)
  })
})

describe('A10-DISP2 — LCD-04 / LCD-05 / LCD-06 power', () => {
  it('initial state is the deterministic MYBlab state (blank DDRAM, AC 0, increment, display off, 8-bit, E UNKNOWN, no nibble, idle)', () => {
    const { state, outputs } = chip().apply({ E: UNKNOWN }, 0)
    expect(outputs).toBeNull()
    expect(state).toEqual({
      ddram: new Array(128).fill(0x20), addressCounter: 0, entryIncrement: true, displayOn: false, cursorOn: false,
      blinkOn: false, dataLength: 8, ramTarget: 'DDRAM', previousE: UNKNOWN, pendingNibble: null, busyUntilMs: 0,
    })
    expect(Object.isFrozen(state)).toBe(true)
    expect(Object.isFrozen(state.ddram)).toBe(true)
  })

  it('LCD-04: VDD HIGH + VSS LOW enables the controller (a data write lands in DDRAM)', () => {
    const b = bench()
    b.data(0x41)
    expect(b.memory().ddram[0x00]).toBe(0x41)
    expect(b.memory().addressCounter).toBe(0x01)
  })

  it.each([
    ['no supply at all', { VDD: UNKNOWN, VSS: UNKNOWN }],
    ['VDD missing', { VDD: UNKNOWN }],
    ['VSS missing', { VSS: UNKNOWN }],
    ['VDD LOW', { VDD: LOW }],
    ['VSS HIGH', { VSS: HIGH }],
    ['VDD/VSS reversed', { VDD: LOW, VSS: HIGH }],
  ])('LCD-05: without a valid supply (%s) there is no output and no transaction, even on a falling E edge', (_label, supply) => {
    const c = chip()
    const edge = c.edge({ ...supply, RS: HIGH, ...bus(0x41) }, 1)
    expect(edge.outputs).toBeNull()
    expect(c.state().ddram[0]).toBe(0x20)
    expect(c.state().addressCounter).toBe(0)
    expect(c.state().previousE).toBe(UNKNOWN)
    const b = bench()
    b.pulse({ ...supply, RS: HIGH, ...bus(0x41) })
    expect(b.memory().ddram[0]).toBe(0x20)
  })

  it('LCD-06: power loss returns to the initial state; repower never restores a phantom DDRAM/AC/display', () => {
    const b = bench()
    b.command(0x0f)
    b.print('Hi')
    expect(b.memory()).toMatchObject({ displayOn: true, cursorOn: true, blinkOn: true, addressCounter: 2 })
    b.step({ VDD: UNKNOWN })
    const off = b.memory()
    expect(off.ddram.every(code => code === 0x20)).toBe(true)
    expect(off).toMatchObject({ addressCounter: 0, displayOn: false, cursorOn: false, blinkOn: false, dataLength: 8, pendingNibble: null, previousE: UNKNOWN })
    b.step()
    expect(b.view().lines).toEqual([BLANK_LINE, BLANK_LINE])
    expect(b.memory().ddram.slice(0, 2)).toEqual([0x20, 0x20])
  })
})

describe('A10-DISP2 — LCD-07 / LCD-08 / LCD-09 / LCD-10 strobe E', () => {
  it('LCD-07: exactly one transaction per E HIGH -> LOW edge', () => {
    const b = bench()
    b.step({ RS: HIGH, ...bus(0x41), E: HIGH })
    expect(b.memory().ddram[0]).toBe(0x20)
    b.step({ RS: HIGH, ...bus(0x41), E: LOW })
    expect(b.memory().ddram[0]).toBe(0x41)
    expect(b.memory().addressCounter).toBe(1)
  })

  it('LCD-08: E held LOW (or HIGH) for many steps never repeats the transaction', () => {
    const b = bench()
    b.data(0x41)
    for (let i = 0; i < 5; i++) b.step({ RS: HIGH, ...bus(0x42), E: LOW })
    for (let i = 0; i < 5; i++) b.step({ RS: HIGH, ...bus(0x42), E: HIGH })
    expect(b.memory().addressCounter).toBe(1)
    expect(b.memory().ddram.slice(0, 2)).toEqual([0x41, 0x20])
  })

  it('LCD-09: E LOW -> HIGH never triggers a transaction', () => {
    const b = bench()
    b.step({ RS: HIGH, ...bus(0x41), E: LOW })
    b.step({ RS: HIGH, ...bus(0x41), E: HIGH })
    expect(b.memory().ddram[0]).toBe(0x20)
    expect(b.memory().addressCounter).toBe(0)
  })

  it.each([[UNKNOWN], [FLOATING]])('LCD-10: E %s is never coerced into an edge, before or after', level => {
    const c = chip()
    c.apply({ RS: HIGH, ...bus(0x41), E: HIGH }, 1)
    c.apply({ RS: HIGH, ...bus(0x41), E: level }, 2) // HIGH -> undetermined : no edge
    c.apply({ RS: HIGH, ...bus(0x41), E: LOW }, 3) // undetermined -> LOW : no edge
    expect(c.state().ddram[0]).toBe(0x20)
    c.edge({ RS: HIGH, ...bus(0x41) }, 4) // a real edge still writes
    expect(c.state().ddram[0]).toBe(0x41)
  })

  it.each([
    ['RS UNKNOWN', { RS: UNKNOWN }],
    ['RS FLOATING', { RS: FLOATING }],
    ['R/W UNKNOWN', { RW: UNKNOWN }],
    ['R/W FLOATING', { RW: FLOATING }],
  ])('LCD-10: %s on the edge produces no command and no data', (_label, levels) => {
    const c = chip()
    c.edge({ ...bus(0x41), ...levels }, 1)
    expect(c.state().ddram[0]).toBe(0x20)
    expect(c.state().addressCounter).toBe(0)
    expect(c.state().busyUntilMs).toBe(0)
  })

  it.each([[UNKNOWN], [FLOATING]])('LCD-10: a data bit %s is never invented (no DDRAM write, AC unchanged)', level => {
    const c = chip()
    c.edge({ RS: HIGH, ...bus(0x41), DB3: level }, 1)
    expect(c.state().ddram[0]).toBe(0x20)
    expect(c.state().addressCounter).toBe(0)
    const b = bench()
    b.pulse({ RS: HIGH, ...bus(0x41), DB5: UNKNOWN }) // unconnected DB5
    expect(b.memory().ddram[0]).toBe(0x20)
  })

  it('LCD-10: undetermined bits that cannot change the decoded instruction do not block it (Function Set with DB0..DB3 unconnected)', () => {
    const b = bench()
    // 0x2? with DB0..DB3 undetermined : every interpretation is Function Set DL=0 (N/F are ignored).
    b.pulse({ RS: LOW, DB4: LOW, DB5: HIGH, DB6: LOW, DB7: LOW })
    expect(b.memory().dataLength).toBe(4)
    // 0x0? with DB0..DB3 undetermined is ambiguous (Clear / Home / Entry / Display...) : nothing happens.
    const b2 = bench()
    b2.command(0x0f)
    b2.pulse({ RS: LOW, DB4: LOW, DB5: LOW, DB6: LOW, DB7: LOW })
    expect(b2.memory()).toMatchObject({ displayOn: true, cursorOn: true, blinkOn: true, dataLength: 8 })
  })
})

describe('A10-DISP2 — LCD-11 / LCD-12 / LCD-13 / LCD-14 8-bit transactions', () => {
  it('LCD-11: the byte is DB7..DB0 (bit order checked with asymmetric patterns)', () => {
    const b = bench()
    for (const byte of [0x5a, 0xa5, 0x01, 0x80, 0x7e]) b.data(byte)
    expect(b.memory().ddram.slice(0, 5)).toEqual([0x5a, 0xa5, 0x01, 0x80, 0x7e])
  })

  it('LCD-12: RS LOW is an instruction (0x41 = Set CGRAM Address, never a DDRAM write)', () => {
    const b = bench()
    b.command(0x41)
    expect(b.memory().ddram.every(code => code === 0x20)).toBe(true)
    expect(b.memory().ramTarget).toBe('CGRAM')
    // Data written while CGRAM is selected never touches the DDRAM (CGRAM content not modelled).
    b.data(0x42)
    expect(b.memory().ddram.every(code => code === 0x20)).toBe(true)
    // Set DDRAM Address selects the DDRAM again.
    b.command(0x80)
    b.data(0x42)
    expect(b.memory().ddram[0]).toBe(0x42)
  })

  it('LCD-13: RS HIGH is data (0x01 as data is the character code 1, never Clear Display)', () => {
    const b = bench()
    b.print('AB')
    b.data(0x01)
    expect(b.memory().ddram.slice(0, 3)).toEqual([0x41, 0x42, 0x01])
    expect(b.memory().addressCounter).toBe(3)
  })

  it('LCD-14: R/W HIGH writes nothing (read cycle, out of scope V1) and drives no DB pin', () => {
    const b = bench()
    b.command(0x0c)
    const before = b.memory()
    const signals = b.pulse({ RW: HIGH, RS: HIGH, ...bus(0x41) })
    expect(b.memory().ddram).toBe(before.ddram)
    expect(b.memory().addressCounter).toBe(0)
    b.pulse({ RW: HIGH, RS: LOW, ...bus(0x01) })
    expect(b.memory().displayOn).toBe(true)
    // No bus driving: without any external level, DB pins stay undetermined.
    const floating = b.pulse({ RW: HIGH, RS: LOW })
    for (const pin of DB) expect(isLogic(floating.get(`lcd:${pin}`)), pin).toBe(false)
    expect(signals.get('lcd:DB0')).toBe(HIGH) // driven by the rail only
    const { outputs } = chip().edge({ RW: HIGH, RS: LOW }, 1)
    expect(outputs).toBeNull()
  })
})

describe('A10-DISP2 — LCD-15 / LCD-16 / LCD-17 DDRAM addressing', () => {
  it('LCD-15: Set DDRAM Address 1AAAAAAA loads the address counter; the next write lands there', () => {
    const b = bench()
    b.command(0x80 | 0x45)
    expect(b.memory().addressCounter).toBe(0x45)
    b.data(0x5a)
    expect(b.memory().ddram[0x45]).toBe(0x5a)
    expect(b.memory().addressCounter).toBe(0x46)
  })

  it('LCD-16: line 1 is DDRAM 0x00..0x0F', () => {
    const b = bench()
    b.command(0x0c)
    b.print('0123456789ABCDEF')
    expect(b.view().lines).toEqual(['0123456789ABCDEF', BLANK_LINE])
    expect(b.memory().addressCounter).toBe(0x10)
  })

  it('LCD-17: line 2 is DDRAM 0x40..0x4F; 0x10..0x27 are off-screen', () => {
    const b = bench()
    b.command(0x0c)
    b.command(0xc0)
    b.print('Hello, WH1602B!')
    b.command(0x90) // 0x10 : DDRAM but outside the visible 16 columns
    b.print('xyz')
    expect(b.view().lines).toEqual([BLANK_LINE, 'Hello, WH1602B! '])
    expect(b.memory().ddram.slice(0x10, 0x13)).toEqual(text('xyz'))
  })

  it('address counter chains line 1 -> line 2 -> line 1 (0x27 -> 0x40, 0x67 -> 0x00); writes outside DDRAM are not stored', () => {
    const b = bench()
    b.command(0x80 | 0x27)
    b.data(0x41)
    expect(b.memory().addressCounter).toBe(0x40)
    b.command(0x80 | 0x67)
    b.data(0x42)
    expect(b.memory().addressCounter).toBe(0x00)
    b.command(0x80 | 0x30) // not a DDRAM address in 2-line mode
    b.data(0x43)
    expect(b.memory().ddram[0x30]).toBe(0x20)
    expect(b.memory().addressCounter).toBe(0x31)
    expect([b.memory().ddram[0x27], b.memory().ddram[0x67]]).toEqual([0x41, 0x42])
  })
})

describe('A10-DISP2 — LCD-18 .. LCD-25 instructions', () => {
  it('LCD-18: Clear Display (0x01) blanks the DDRAM, homes AC and restores increment mode', () => {
    const b = bench()
    b.command(0x04) // decrement
    b.command(0x80 | 0x48)
    b.print('ab')
    b.command(0x01)
    expect(b.memory().ddram.every(code => code === 0x20)).toBe(true)
    expect(b.memory()).toMatchObject({ addressCounter: 0, entryIncrement: true })
  })

  it('LCD-19: Return Home (0x02) homes AC and keeps the DDRAM', () => {
    const b = bench()
    b.command(0x0c)
    b.print('abc')
    b.command(0x02)
    expect(b.memory().addressCounter).toBe(0)
    expect(b.view().lines[0]).toBe('abc'.padEnd(16))
    b.print('X')
    expect(b.view().lines[0]).toBe('Xbc'.padEnd(16))
  })

  it('LCD-20: Entry Mode I/D = 1 increments after each write', () => {
    const b = bench()
    b.command(0x06)
    b.print('ab')
    expect(b.memory()).toMatchObject({ entryIncrement: true, addressCounter: 2 })
    expect(b.memory().ddram.slice(0, 2)).toEqual(text('ab'))
  })

  it('LCD-21: Entry Mode I/D = 0 decrements after each write (right-to-left text)', () => {
    const b = bench()
    b.command(0x0c)
    b.command(0x04)
    b.command(0x80 | 0x05)
    b.print('abc')
    expect(b.memory()).toMatchObject({ entryIncrement: false, addressCounter: 0x02 })
    expect(b.view().lines[0]).toBe('   cba'.padEnd(16))
  })

  it('LCD-22: Display ON/OFF control 00001DCB sets display, cursor and blink', () => {
    const b = bench()
    b.command(0x0c)
    expect(b.memory()).toMatchObject({ displayOn: true, cursorOn: false, blinkOn: false })
    b.command(0x0e)
    expect(b.memory()).toMatchObject({ displayOn: true, cursorOn: true, blinkOn: false })
    b.command(0x0d)
    expect(b.memory()).toMatchObject({ displayOn: true, cursorOn: false, blinkOn: true })
    expect(b.view()).toMatchObject({ displayOn: true, cursorOn: false, blinkOn: true })
  })

  it('LCD-23: Display OFF keeps the DDRAM (content masked, not erased)', () => {
    const b = bench()
    b.command(0x0c)
    b.print('keep')
    b.command(0x08)
    expect(b.memory().displayOn).toBe(false)
    expect(b.memory().ddram.slice(0, 4)).toEqual(text('keep'))
    b.command(0x0c)
    expect(b.view().lines[0]).toBe('keep'.padEnd(16))
  })

  it('LCD-24: Function Set DL = 1 keeps the 8-bit interface (N/F received, hardware unchanged)', () => {
    const b = bench()
    for (const byte of [0x30, 0x38, 0x3c, 0x34]) {
      b.command(byte)
      expect(b.memory().dataLength).toBe(8)
    }
    b.data(0x41)
    expect(b.memory().ddram[0]).toBe(0x41)
  })

  it('LCD-25: Function Set DL = 0 switches to the 4-bit interface', () => {
    const b = bench()
    b.command(0x28)
    expect(b.memory().dataLength).toBe(4)
    expect(b.memory().pendingNibble).toBeNull()
  })

  it('cursor shift (0001 0R00) moves the address counter; display shift (0001 1xxx) is accepted without effect in V1', () => {
    const b = bench()
    b.command(0x14)
    b.command(0x14)
    expect(b.memory().addressCounter).toBe(2)
    b.command(0x10)
    expect(b.memory().addressCounter).toBe(1)
    const before = b.memory()
    b.command(0x18)
    b.command(0x1c)
    expect(b.memory().ddram).toBe(before.ddram)
    expect(b.memory().addressCounter).toBe(1)
  })
})

describe('A10-DISP2 — LCD-26 / LCD-27 / LCD-28 4-bit interface', () => {
  /** Banc 4 bits : DB0..DB3 jamais connectés, comme un câblage 4 bits réel. */
  function bench4() {
    const b = bench()
    b.pulse({ RS: LOW, ...nibbleBus(0x2) }) // Function Set 4-bit sent as one 8-bit cycle
    const nibble = (rs, n) => b.pulse({ RS: rs, ...nibbleBus(n) })
    const send = (rs, byte) => { nibble(rs, byte >> 4); nibble(rs, byte & 0xf) }
    return { ...b, nibble, send }
  }

  it('LCD-26: a single nibble never writes the DDRAM; it is only remembered in the runtime state', () => {
    const b = bench4()
    expect(b.memory().dataLength).toBe(4)
    b.nibble(HIGH, 0x4)
    expect(b.memory().ddram[0]).toBe(0x20)
    expect(b.memory().addressCounter).toBe(0)
    expect(b.memory().pendingNibble).toEqual({ rs: HIGH, highNibbles: [0x4] })
  })

  it('LCD-27: two nibbles (high then low) make one byte', () => {
    const b = bench4()
    b.send(LOW, 0x0c)
    b.send(HIGH, 0x48)
    b.send(HIGH, 0x69)
    expect(b.memory().pendingNibble).toBeNull()
    expect(b.view()).toMatchObject({ displayOn: true, lines: ['Hi'.padEnd(16), BLANK_LINE] })
  })

  it('LCD-27: a LiquidCrystal-style 4-bit init (0x3,0x3,0x3,0x2 then 0x28 0x0C 0x06 0x01) prints text', () => {
    const b = bench()
    const nibble = (rs, n) => b.pulse({ RS: rs, ...nibbleBus(n) })
    const send = (rs, byte) => { nibble(rs, byte >> 4); nibble(rs, byte & 0xf) }
    for (const n of [0x3, 0x3, 0x3, 0x2]) nibble(LOW, n)
    for (const byte of [0x28, 0x0c, 0x06, 0x01, 0xc0 | 0x03]) send(LOW, byte)
    for (const code of text('MYBlab')) send(HIGH, code)
    expect(b.view().lines).toEqual([BLANK_LINE, '   MYBlab'.padEnd(16)])
    expect(b.memory().dataLength).toBe(4)
  })

  it('LCD-27: an RS change between the two nibbles abandons the sequence (no byte fabricated)', () => {
    const b = bench4()
    b.nibble(HIGH, 0x4)
    b.nibble(LOW, 0x1)
    expect(b.memory().ddram[0]).toBe(0x20)
    expect(b.memory().pendingNibble).toBeNull()
    // The next two nibbles are a fresh, aligned byte.
    b.send(HIGH, 0x41)
    expect(b.memory().ddram[0]).toBe(0x41)
  })

  it('LCD-27: a read cycle (R/W HIGH) or an undetermined nibble bit never completes a byte', () => {
    const b = bench4()
    b.nibble(HIGH, 0x4)
    b.pulse({ RW: HIGH, RS: HIGH, ...nibbleBus(0x1) })
    expect(b.memory().pendingNibble).toBeNull()
    expect(b.memory().ddram[0]).toBe(0x20)
    b.nibble(HIGH, 0x4)
    b.pulse({ RS: HIGH, ...nibbleBus(0x1), DB6: UNKNOWN })
    expect(b.memory().ddram[0]).toBe(0x20)
    expect(b.memory().addressCounter).toBe(0)
  })

  it('LCD-28: power loss and runtime reset drop the pending nibble', () => {
    const b = bench4()
    b.nibble(HIGH, 0x4)
    expect(b.memory().pendingNibble).not.toBeNull()
    b.step({ VDD: UNKNOWN })
    expect(b.memory().pendingNibble).toBeNull()
    expect(b.memory().dataLength).toBe(8)
    const b2 = bench4()
    b2.nibble(HIGH, 0x4)
    resetSimulationRuntimeSession(b2.runtimeSession)
    b2.step()
    expect(b2.memory().pendingNibble).toBeNull()
    expect(b2.memory().dataLength).toBe(8)
  })
})

describe('A10-DISP2 — LCD-29 .. LCD-32 busy timing (currentTimeMs only)', () => {
  it('LCD-29: a short instruction / data write keeps the controller busy 37 µs', () => {
    const c = chip()
    c.edge({ RS: HIGH, ...bus(0x41) }, 10)
    expect(c.state().busyUntilMs).toBeCloseTo(10 + SHORT_MS, 12)
    c.edge({ RS: HIGH, ...bus(0x42) }, 10.02) // busy : ignored
    expect(c.state().ddram.slice(0, 2)).toEqual([0x41, 0x20])
    c.edge({ RS: HIGH, ...bus(0x42) }, 10 + SHORT_MS) // exactly free again
    expect(c.state().ddram.slice(0, 2)).toEqual([0x41, 0x42])
  })

  it('LCD-30: Clear Display keeps the controller busy 1.52 ms', () => {
    const c = chip()
    c.edge({ RS: LOW, ...bus(0x01) }, 5)
    expect(c.state().busyUntilMs).toBeCloseTo(5 + LONG_MS, 12)
    c.edge({ RS: HIGH, ...bus(0x41) }, 5 + 1.5)
    expect(c.state().ddram[0]).toBe(0x20)
    c.edge({ RS: HIGH, ...bus(0x41) }, 5 + LONG_MS)
    expect(c.state().ddram[0]).toBe(0x41)
  })

  it('LCD-31: Return Home keeps the controller busy 1.52 ms', () => {
    const c = chip()
    c.edge({ RS: LOW, ...bus(0x02) }, 0)
    expect(c.state().busyUntilMs).toBeCloseTo(LONG_MS, 12)
    c.edge({ RS: LOW, ...bus(0x0c) }, 1)
    expect(c.state().displayOn).toBe(false)
    c.edge({ RS: LOW, ...bus(0x0c) }, 2)
    expect(c.state().displayOn).toBe(true)
  })

  it('LCD-32: a command during busy is not executed and does not extend the busy window; E is still tracked', () => {
    const c = chip()
    c.edge({ RS: LOW, ...bus(0x01) }, 0)
    const busyUntil = c.state().busyUntilMs
    c.edge({ RS: LOW, ...bus(0x0f) }, 0.5)
    expect(c.state()).toMatchObject({ displayOn: false, cursorOn: false, busyUntilMs: busyUntil, previousE: LOW })
    // The real pipeline with dt = 0 never advances time : the second command stays refused.
    const b = bench()
    b.step()
    b.step({ RS: LOW, ...bus(0x01), E: HIGH }, 0)
    b.step({ RS: LOW, ...bus(0x01), E: LOW }, 0)
    b.step({ RS: LOW, ...bus(0x0c), E: HIGH }, 0)
    b.step({ RS: LOW, ...bus(0x0c), E: LOW }, 0)
    expect(b.memory().displayOn).toBe(false)
    b.command(0x0c) // SIMULATION_STEP_MS later : free
    expect(b.memory().displayOn).toBe(true)
  })
})

describe('A10-DISP2 — LCD-33 .. LCD-36 runtime lifecycle', () => {
  it('LCD-33: two LCD instances keep independent runtime states', () => {
    const runtimeSession = createSimulationRuntimeSession()
    const comps = [{ uid: 'p', type: 'POWER' }, { uid: 'a', type: TYPE }, { uid: 'b', type: TYPE }]
    const step = (a, bLevels) => runSimulationWithRuntime(comps, [...wiresFor(a, 'a'), ...wiresFor(bLevels, 'b')], { runtimeSession, dt: SIMULATION_STEP_MS })
    step({ RS: HIGH, ...bus(0x41), E: HIGH }, { RS: HIGH, ...bus(0x5a), E: LOW })
    step({ RS: HIGH, ...bus(0x41), E: LOW }, { RS: HIGH, ...bus(0x5a), E: LOW })
    const a = runtimeSession.timedDigitalStates.get('a')
    const b = runtimeSession.timedDigitalStates.get('b')
    expect([a.ddram[0], a.addressCounter]).toEqual([0x41, 1])
    expect([b.ddram[0], b.addressCounter]).toEqual([0x20, 0])
    expect(a).not.toBe(b)
    expect(a.ddram).not.toBe(b.ddram)
  })

  it('LCD-34: the Document is never mutated and carries no DDRAM/controller state', () => {
    const doc = levels => ({
      components: [{ id: 'p', type: 'POWER', position: { x: 0, y: 0 } }, { id: 'lcd', type: TYPE, position: { x: 200, y: 0 } }],
      wires: Object.entries({ ...BASE, ...levels })
        .filter(([, level]) => isLogic(level))
        .map(([pin, level], i) => ({ id: `w${i}`, pinA: { componentId: 'p', pinId: level === HIGH ? '5V' : 'GND' }, pinB: { componentId: 'lcd', pinId: pin } })),
    })
    const runtimeSession = createSimulationRuntimeSession()
    const step = levels => {
      const d = doc(levels)
      const before = JSON.stringify(d)
      const input = toEngineInput(d)
      runSimulationWithRuntime(input.components, input.wires, { runtimeSession, dt: SIMULATION_STEP_MS })
      expect(JSON.stringify(d)).toBe(before)
      expect(before).not.toMatch(/ddram|addressCounter|pendingNibble|busyUntilMs|previousE/)
      for (const c of input.components) expect(c).not.toHaveProperty('ddram')
    }
    step({ RS: HIGH, ...bus(0x41), E: HIGH })
    step({ RS: HIGH, ...bus(0x41), E: LOW })
    expect(runtimeSession.timedDigitalStates.get('lcd').ddram[0]).toBe(0x41)
  })

  it('LCD-35: resetSimulationRuntimeSession purges the DDRAM (next step starts from the initial state)', () => {
    const b = bench()
    b.command(0x0c)
    b.print('Hi')
    resetSimulationRuntimeSession(b.runtimeSession)
    expect(b.runtimeSession.timedDigitalStates.size).toBe(0)
    expect(b.runtimeSession.scheduler).toBeNull()
    b.step()
    expect(b.view()).toMatchObject({ displayOn: false, lines: [BLANK_LINE, BLANK_LINE] })
    expect(b.memory().ddram.every(code => code === 0x20)).toBe(true)
  })

  it('LCD-36: removing the uid purges its runtime state; a new instance starts blank', () => {
    const b = bench()
    b.print('Hi')
    retainSimulationRuntimeSessionUids(b.runtimeSession, new Set(['p']))
    expect(b.runtimeSession.timedDigitalStates.has('lcd')).toBe(false)
    b.step()
    expect(b.memory().ddram.slice(0, 2)).toEqual([0x20, 0x20])
  })

  it('LCD-45: a new run (reset then steps) never restores the previous DDRAM, even with the same wiring', () => {
    const b = bench()
    b.command(0x0c)
    b.print('old')
    resetSimulationRuntimeSession(b.runtimeSession) // start/stop boundary (useCircuitState)
    b.command(0x0c)
    expect(b.view().lines[0]).toBe(BLANK_LINE)
  })

  it('deterministic: two sessions fed the same sequence give identical states', () => {
    const run = () => {
      const b = bench()
      b.command(0x38)
      b.command(0x0e)
      b.print('abc')
      b.command(0xc4)
      b.print('Z')
      return b.memory()
    }
    expect(run()).toEqual(run())
  })

  it('snapshotTimedDigitalStates: a new read-only Map per call; frozen states; never the runtime store itself', () => {
    const b = bench()
    b.print('A')
    const first = snapshotTimedDigitalStates(b.runtimeSession)
    const second = snapshotTimedDigitalStates(b.runtimeSession)
    expect(first).not.toBe(b.runtimeSession.timedDigitalStates)
    expect(first).not.toBe(second)
    expect(first.get('lcd')).toBe(b.memory())
    expect(Object.isFrozen(first.get('lcd'))).toBe(true)
    expect(Object.isFrozen(first.get('lcd').ddram)).toBe(true)
    expect(() => { first.get('lcd').ddram[0] = 0x5a }).toThrow(TypeError)
    first.delete('lcd')
    expect(b.runtimeSession.timedDigitalStates.has('lcd')).toBe(true)
    // Limited to the uids of the step just solved : a deleted uid is never projected.
    expect([...snapshotTimedDigitalStates(b.runtimeSession, ['p']).keys()]).toEqual([])
    expect([...snapshotTimedDigitalStates(b.runtimeSession, ['p', 'lcd']).keys()]).toEqual(['lcd'])
  })

  it('computeTimedDigitalSignals: the LCD never produces a pin signal (write-only V1)', () => {
    const states = new Map()
    const registry = createTimedDigitalContributionRegistry({ contributions: new Map([[TYPE, getTimedDigitalContribution(TYPE)]]) })
    const signals = new Map(Object.entries({ ...BASE, RS: HIGH, ...bus(0x41), E: HIGH }).map(([pin, s]) => [`lcd:${pin}`, s]))
    expect(computeTimedDigitalSignals([{ uid: 'lcd', type: TYPE }], registry, signals, 0, states).size).toBe(0)
    signals.set('lcd:E', LOW)
    expect(computeTimedDigitalSignals([{ uid: 'lcd', type: TYPE }], registry, signals, 1, states).size).toBe(0)
    expect(states.get('lcd').ddram[0]).toBe(0x41)
  })
})

describe('A10-DISP2 — LCD-43 architecture', () => {
  const read = path => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

  it('LCD-43: generic engine / runtime / canvas / hook files carry no LCD-specific branch', () => {
    for (const file of ['../simulationRuntimeIntegration.js', '../resolution.js', '../scheduler.js', '../clock.js', '../engine.js', '../preparation.js',
      '../runtimeOrchestrator.js', '../digitalContributionRegistry.js', '../../hooks/useCircuitState.js', '../../context/CircuitContext.jsx',
      '../../canvas/CircuitComponent.jsx', '../../canvas/Pin.jsx', '../../canvas/Breadboard.jsx', '../../components/parts/PartRenderer.jsx',
      '../../components/assembly/AssemblyLeadsLayer.jsx', '../../utils/assemblyGeometry.js', '../../utils/contactModel.js']) {
      expect(read(file), file).not.toMatch(/LCD|WH1602|ST7066|lcd-wh1602b|Lcd16x2|LcdWh1602b/)
    }
  })

  it('the ST7066U producer uses no wall clock / timer / React / Document, and imports nothing new', () => {
    const source = read('../timedDigitalContributionRegistry.js')
    const start = source.indexOf('const ST7066U_LONG_EXECUTION_MS')
    const end = source.indexOf('\n}\n', source.indexOf('function st7066uTimedDigital'))
    expect(start).toBeGreaterThan(0)
    expect(end).toBeGreaterThan(start)
    const code = source.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    expect(code).not.toMatch(/Date\.now|performance\.now|setTimeout|setInterval|requestAnimationFrame/)
    expect(code).not.toMatch(/document|parameters|window|React|localStorage/)
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(m => m[1])
    expect(imports).toEqual(['./signals.js'])
  })
})
