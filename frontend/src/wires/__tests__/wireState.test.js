/**
 * wireState.test.js — MB-VIS-004.
 *
 * Teste getWireLogicalState en isolation (fonction pure), à l'image de
 * rgbLed.test.js pour getRgbLedState : mêmes conventions de clé
 * "uid:pinId", même Map<string, string> en entrée.
 */
import { describe, it, expect } from 'vitest'
import { getWireLogicalState, isKnownSignal, Signal } from '../wireState.js'

const wire = { fromUid: 'A', fromPin: 'anode', toUid: 'B', toPin: 'A' }

describe('MB-VIS-004 — getWireLogicalState', () => {
  it('renvoie HIGH quand la pin de départ porte HIGH', () => {
    const pinSignals = new Map([['A:anode', Signal.HIGH]])
    expect(getWireLogicalState(wire, pinSignals)).toEqual({ signal: Signal.HIGH })
  })

  it('renvoie LOW quand la pin de départ porte LOW', () => {
    const pinSignals = new Map([['A:anode', Signal.LOW]])
    expect(getWireLogicalState(wire, pinSignals)).toEqual({ signal: Signal.LOW })
  })

  it('retombe sur la pin d\'arrivée quand la pin de départ est absente de la Map', () => {
    const pinSignals = new Map([['B:A', Signal.HIGH]])
    expect(getWireLogicalState(wire, pinSignals)).toEqual({ signal: Signal.HIGH })
  })

  it('renvoie UNKNOWN explicitement quand la Map le porte (distinct de l\'absence de donnée)', () => {
    const pinSignals = new Map([
      ['A:anode', Signal.UNKNOWN],
      ['B:A', Signal.UNKNOWN],
    ])
    expect(getWireLogicalState(wire, pinSignals)).toEqual({ signal: Signal.UNKNOWN })
  })

  it('renvoie FLOATING quand la Map le porte', () => {
    const pinSignals = new Map([
      ['A:anode', Signal.FLOATING],
      ['B:A', Signal.FLOATING],
    ])
    expect(getWireLogicalState(wire, pinSignals)).toEqual({ signal: Signal.FLOATING })
  })

  it('[Q3] renvoie signal:null — jamais Signal.UNKNOWN — quand pinSignals est une Map vide (simulation inactive)', () => {
    const emptyMap = new Map()
    const result = getWireLogicalState(wire, emptyMap)
    expect(result).toEqual({ signal: null })
    expect(result.signal).not.toBe(Signal.UNKNOWN)
  })

  it('[Q3] renvoie signal:null quand pinSignals est undefined (défensif, pas d\'exception levée)', () => {
    expect(() => getWireLogicalState(wire, undefined)).not.toThrow()
    expect(getWireLogicalState(wire, undefined)).toEqual({ signal: null })
  })

  it('renvoie signal:null pour un wire null/undefined (défensif)', () => {
    expect(getWireLogicalState(null, new Map())).toEqual({ signal: null })
    expect(getWireLogicalState(undefined, new Map())).toEqual({ signal: null })
  })

  it('renvoie signal:null pour un wire dont une extrémité est incomplète', () => {
    const incomplete = { fromUid: 'A', fromPin: 'anode', toUid: 'B', toPin: undefined }
    const pinSignals = new Map([['A:anode', Signal.HIGH]])
    expect(getWireLogicalState(incomplete, pinSignals)).toEqual({ signal: null })
  })

  it('ne mute jamais la Map pinSignals reçue', () => {
    const pinSignals = new Map([['A:anode', Signal.HIGH]])
    const snapshot = new Map(pinSignals)
    getWireLogicalState(wire, pinSignals)
    expect(pinSignals).toEqual(snapshot)
  })
})

describe('MB-VIS-004 — isKnownSignal', () => {
  it('reconnaît les quatre valeurs de Signal', () => {
    expect(isKnownSignal(Signal.HIGH)).toBe(true)
    expect(isKnownSignal(Signal.LOW)).toBe(true)
    expect(isKnownSignal(Signal.UNKNOWN)).toBe(true)
    expect(isKnownSignal(Signal.FLOATING)).toBe(true)
  })

  it('rejette null et une chaîne arbitraire', () => {
    expect(isKnownSignal(null)).toBe(false)
    expect(isKnownSignal('NOT_A_SIGNAL')).toBe(false)
    expect(isKnownSignal(undefined)).toBe(false)
  })
})
