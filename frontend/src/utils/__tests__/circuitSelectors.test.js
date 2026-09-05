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
    expect(paths[0].d.startsWith('M 28 68')).toBe(true)
  })

  it('keeps non-LED wire endpoints on their canonical coordinates', () => {
    const reverse = { ...wire, fromUid: 'res-1', fromPin: 'A', toUid: 'led-1', toPin: 'cathode' }
    const paths = buildWirePaths([led, resistor], [reverse])
    expect(paths).toHaveLength(1)
    expect(paths[0].d.startsWith('M 184 14')).toBe(true)
  })
})

describe('MB-VIS-CANVAS-052 — buildWirePaths(components, wires, focusInfo)', () => {
  // Deux RESISTOR (84x28), jamais LED : évite toute dépendance à la
  // projection visuelle LED (hors périmètre de ce ticket, non touchée).
  const resA = { uid: 'res-a', type: 'RESISTOR', x: 0, y: 0 }
  const resB = { uid: 'res-b', type: 'RESISTOR', x: 300, y: 0 }
  const wireAB = { id: 'wire-ab', fromUid: 'res-a', fromPin: 'B', toUid: 'res-b', toPin: 'A' }

  it('focusInfo omis (2 arguments) reste identique au comportement existant', () => {
    const withoutFocus = buildWirePaths([resA, resB], [wireAB])
    const withNullFocus = buildWirePaths([resA, resB], [wireAB], null)
    expect(withoutFocus).toEqual(withNullFocus)
    // res-a.B canonique : (0+84, 0+14) = (84,14).
    expect(withoutFocus[0].d.startsWith('M 84 14')).toBe(true)
  })

  it('focusInfo sur un composant NON connecté par ce wire ne change rien', () => {
    const irrelevant = buildWirePaths([resA, resB], [wireAB], { uid: 'res-does-not-exist', scale: 2 })
    const baseline = buildWirePaths([resA, resB], [wireAB], null)
    expect(irrelevant).toEqual(baseline)
  })

  it('focusInfo sur le composant SOURCE (res-a) déplace UNIQUEMENT cette extrémité, autour de son propre centre', () => {
    const paths = buildWirePaths([resA, resB], [wireAB], { uid: 'res-a', scale: 2 })
    // res-a centre (42,14) ; pin B canonique (84,14), delta (+42,0) -> scale 2 : (42+84,14) = (126,14).
    expect(paths[0].d.startsWith('M 126 14')).toBe(true)
    // L'extrémité res-b (non focalisé) reste canonique : (300+0, 0+14) = (300,14).
    expect(paths[0].d).toContain('L 300 14')
  })

  it('focusInfo sur le composant CIBLE (res-b) déplace uniquement cette extrémité', () => {
    const paths = buildWirePaths([resA, resB], [wireAB], { uid: 'res-b', scale: 2 })
    // res-a (non focalisé) : extrémité canonique (84,14), inchangée.
    expect(paths[0].d.startsWith('M 84 14')).toBe(true)
    // res-b centre (300+42,14)=(342,14) ; pin A canonique (300,14), delta (-42,0) -> scale 2 : (342-84,14)=(258,14).
    expect(paths[0].d).toContain('L 258 14')
  })

  it('scale=1 explicite via focusInfo est un no-op strict (non-régression)', () => {
    const scaled1 = buildWirePaths([resA, resB], [wireAB], { uid: 'res-a', scale: 1 })
    const baseline = buildWirePaths([resA, resB], [wireAB], null)
    expect(scaled1).toEqual(baseline)
  })

  it('ne mute jamais les objets composants passés en entrée (Document = source de vérité)', () => {
    const snapshotA = { ...resA }
    const snapshotB = { ...resB }
    buildWirePaths([resA, resB], [wireAB], { uid: 'res-a', scale: 2.7 })
    expect(resA).toEqual(snapshotA)
    expect(resB).toEqual(snapshotB)
  })
})
