/**
 * circuitSelectors.test.js — MB-VIS-004 / MB-VIS-005 / MB-VIS-LED-V5.
 */
import { describe, it, expect } from 'vitest'
import { buildWirePaths } from '../circuitSelectors.js'

const led = { uid: 'led-1', type: 'LED', x: 0, y: 0 }
const resistor = { uid: 'res-1', type: 'RESISTOR', x: 200, y: 0 }
const wire = { id: 'wire-1', fromUid: 'led-1', fromPin: 'anode', toUid: 'res-1', toPin: 'A' }

describe('MB-VIS-004 — buildWirePaths (géométrie pure)', () => {
  it('produit un objet {id, d} par wire valide, sans champ color', () => {
    const paths = buildWirePaths([led, resistor], [wire])
    expect(paths).toHaveLength(1)
    expect(paths[0].id).toBe('wire-1')
    expect(typeof paths[0].d).toBe('string')
    expect(paths[0].d.length).toBeGreaterThan(0)
    expect(paths[0]).not.toHaveProperty('color')
  })

  it('accepte un appel à deux arguments', () => {
    expect(() => buildWirePaths([led, resistor], [wire])).not.toThrow()
  })

  it('ignore un wire référençant un composant introuvable', () => {
    const paths = buildWirePaths([led], [wire])
    expect(paths).toEqual([])
  })

  it('renvoie un tableau vide pour des entrées invalides', () => {
    expect(buildWirePaths(null, [wire])).toEqual([])
    expect(buildWirePaths([led, resistor], null)).toEqual([])
  })
})

describe('MB-VIS-005 — buildWirePaths consomme les waypoints persistants du wire', () => {
  it('un wire sans waypoints produit un tracé stable', () => {
    const withoutField = buildWirePaths([led, resistor], [wire])
    const withEmptyArray = buildWirePaths([led, resistor], [{ ...wire, waypoints: [] }])
    expect(withoutField[0].d).toBe(withEmptyArray[0].d)
  })

  it('un wire avec waypoints produit un tracé qui les traverse, dans leur ordre', () => {
    const routedWire = { ...wire, waypoints: [{ x: 90, y: 40 }] }
    const paths = buildWirePaths([led, resistor], [routedWire])
    expect(paths).toHaveLength(1)
    expect(paths[0].d).toContain('L 90 40')
  })
})

describe('MB-VIS-LED-V5 — wire endpoint projection', () => {
  it('starts an LED wire at the physical foot while preserving the canonical pin id', () => {
    const paths = buildWirePaths([led, resistor], [wire])
    expect(paths).toHaveLength(1)
    expect(paths[0].d.startsWith('M 28 40')).toBe(true)
  })

  it('keeps non-LED wire endpoints on their canonical coordinates', () => {
    const reverse = { ...wire, fromUid: 'res-1', fromPin: 'A', toUid: 'led-1', toPin: 'cathode' }
    const paths = buildWirePaths([led, resistor], [reverse])
    expect(paths).toHaveLength(1)
    expect(paths[0].d.startsWith('M 184 14')).toBe(true)
  })
})
