/**
 * visualStateRegistry.test.js — MB-VIS-COMP-002 (Phase 7)
 *
 * Couvre le mécanisme du Visual State Registry en isolation (fonctions
 * pures, pas de rendu React) :
 *  - TEST 1 : un composant sans resolver enregistré fonctionne (getVisualState
 *    retourne {} au lieu de lever une erreur ou de renvoyer undefined).
 *  - TEST 7 : un type fictif peut être enregistré et résolu sans toucher à
 *    PartRenderer.jsx — la seule API touchée est registerVisualState/
 *    getVisualState, prouvant que PartRenderer.jsx (qui appelle
 *    getVisualState(type, context) génériquement) n'a besoin d'aucune
 *    modification pour supporter ce nouveau type.
 *  - TEST 9 : le registre ne modifie aucune donnée électrique — le resolver
 *    ne fait que lire le Map de signaux fourni, jamais l'écrire.
 */
import { describe, it, expect, afterEach } from 'vitest'
import {
  registerVisualState,
  getVisualState,
  hasVisualStateResolver,
  clearVisualStateRegistry,
} from '../visualStateRegistry.js'

describe('MB-VIS-COMP-002 — VisualStateRegistry (TEST 1, TEST 7, TEST 9)', () => {
  afterEach(() => {
    clearVisualStateRegistry()
  })

  it('TEST 1 — un type sans resolver enregistré retourne {} (fonctionne normalement)', () => {
    expect(hasVisualStateResolver('RESISTOR')).toBe(false)
    expect(getVisualState('RESISTOR', { uid: 'x', pinSignals: new Map() })).toEqual({})
  })

  it('TEST 7 — un type fictif peut être enregistré et résolu sans toucher PartRenderer.jsx', () => {
    registerVisualState('MB_TEST_STATIC_TYPE', ({ uid }) => ({ fictiveProp: `resolved-${uid}` }))
    expect(hasVisualStateResolver('MB_TEST_STATIC_TYPE')).toBe(true)
    expect(getVisualState('MB_TEST_STATIC_TYPE', { uid: 'abc', pinSignals: new Map() }))
      .toEqual({ fictiveProp: 'resolved-abc' })
  })

  it('TEST 9 — le resolver ne modifie pas le Map de signaux fourni (aucune donnée électrique touchée)', () => {
    const signals = new Map([['anode', 'HIGH'], ['cathode', 'LOW']])
    const snapshotBefore = new Map(signals)

    registerVisualState('MB_TEST_READ_ONLY', ({ pinSignals }) => {
      // Un resolver légitime ne fait que LIRE.
      return { sawAnode: pinSignals.get('anode') }
    })

    const result = getVisualState('MB_TEST_READ_ONLY', { uid: 'x', pinSignals: signals })

    expect(result).toEqual({ sawAnode: 'HIGH' })
    expect(signals).toEqual(snapshotBefore)
    expect(signals.size).toBe(2)
  })

  it('registerVisualState rejette un type vide ou un resolver non-fonction', () => {
    expect(() => registerVisualState('', () => ({}))).toThrow()
    expect(() => registerVisualState('X', null)).toThrow()
  })

  it('getVisualState retourne {} si le resolver ne renvoie pas un objet', () => {
    registerVisualState('MB_TEST_BAD_RESOLVER', () => null)
    expect(getVisualState('MB_TEST_BAD_RESOLVER', {})).toEqual({})
  })
})
