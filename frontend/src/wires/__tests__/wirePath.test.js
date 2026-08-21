/**
 * wirePath.test.js — MB-VIS-004.
 *
 * buildWirePath n'est pas modifié par ce ticket (géométrie inchangée) mais
 * n'avait aucune couverture de test — un minimum de non-régression est
 * ajouté ici. getWireStrokeColor/getWireStateClassName sont les nouveaux
 * exports de ce ticket, remplaçant l'ancien getWireColor(options).
 */
import { describe, it, expect } from 'vitest'
import { buildWirePath, getWireStrokeColor, getWireStateClassName } from '../wirePath.js'
import { Signal } from '../../simulator/signals.js'

describe('MB-VIS-004 — buildWirePath (non-régression géométrique)', () => {
  it('construit un chemin en L (horizontal puis vertical) entre deux points', () => {
    const d = buildWirePath({ x: 0, y: 0 }, { x: 100, y: 50 })
    expect(d).toBe('M 0 0 L 50 0 L 50 50 L 100 50')
  })

  it("renvoie une chaîne vide si un point est manquant", () => {
    expect(buildWirePath(null, { x: 1, y: 1 })).toBe('')
    expect(buildWirePath({ x: 1, y: 1 }, undefined)).toBe('')
  })

  it('renvoie une chaîne vide si une coordonnée est non finie', () => {
    expect(buildWirePath({ x: NaN, y: 0 }, { x: 1, y: 1 })).toBe('')
  })
})

describe('MB-VIS-005 — buildWirePath (routage par waypoints persistants)', () => {
  it('sans waypoints, produit exactement le même chemin en L qu\'avant MB-VIS-005 (AC-08, non-régression bit à bit)', () => {
    expect(buildWirePath({ x: 0, y: 0 }, { x: 100, y: 50 }, [])).toBe(
      buildWirePath({ x: 0, y: 0 }, { x: 100, y: 50 })
    )
    expect(buildWirePath({ x: 0, y: 0 }, { x: 100, y: 50 }, [])).toBe('M 0 0 L 50 0 L 50 50 L 100 50')
  })

  it('un waypoint unique produit un chemin en deux segments passant par ce point (AC-06)', () => {
    const d = buildWirePath({ x: 0, y: 0 }, { x: 100, y: 0 }, [{ x: 50, y: 80 }])
    expect(d).toBe('M 0 0 L 50 80 L 100 0')
  })

  it('plusieurs waypoints sont consommés dans leur ordre persistant (AC-06)', () => {
    const d = buildWirePath({ x: 0, y: 0 }, { x: 30, y: 0 }, [
      { x: 10, y: 10 },
      { x: 20, y: -10 },
    ])
    expect(d).toBe('M 0 0 L 10 10 L 20 -10 L 30 0')
  })

  it('ignore défensivement un waypoint aux coordonnées non finies (retombe sur le chemin en L historique)', () => {
    const d = buildWirePath({ x: 0, y: 0 }, { x: 10, y: 0 }, [{ x: NaN, y: 1 }])
    expect(d).toBe(buildWirePath({ x: 0, y: 0 }, { x: 10, y: 0 }, []))
  })

  it('ignore uniquement le waypoint invalide au sein d\'un tableau par ailleurs valide', () => {
    const d = buildWirePath({ x: 0, y: 0 }, { x: 20, y: 0 }, [
      { x: 5, y: 5 },
      { x: NaN, y: 1 },
      { x: 15, y: 5 },
    ])
    expect(d).toBe('M 0 0 L 5 5 L 15 5 L 20 0')
  })

  it('waypoints non fourni (undefined) se comporte comme un tableau vide', () => {
    expect(buildWirePath({ x: 0, y: 0 }, { x: 10, y: 10 })).toBe(
      buildWirePath({ x: 0, y: 0 }, { x: 10, y: 10 }, undefined)
    )
  })
})

describe('MB-VIS-004 — getWireStrokeColor (précédence sélection > signal > neutre)', () => {
  it('couleur neutre par défaut (non-régression : identique à l\'ancien getWireColor() sans options)', () => {
    expect(getWireStrokeColor()).toBe('#f97316')
    expect(getWireStrokeColor({})).toBe('#f97316')
  })

  it('couleur de sélection identique à l\'ancien getWireColor({highlight:true}) (non-régression)', () => {
    expect(getWireStrokeColor({ selected: true })).toBe('#22c55e')
  })

  it('la sélection prévaut toujours sur l\'état logique', () => {
    expect(getWireStrokeColor({ selected: true, signal: Signal.HIGH })).toBe('#22c55e')
  })

  it('attribue une couleur distincte à chacun des quatre états logiques', () => {
    const colors = [Signal.HIGH, Signal.LOW, Signal.UNKNOWN, Signal.FLOATING].map(
      (signal) => getWireStrokeColor({ signal })
    )
    expect(new Set(colors).size).toBe(4)
    colors.forEach((c) => {
      expect(c).not.toBe('#f97316') // distinct du neutre
      expect(c).not.toBe('#22c55e') // distinct de la sélection
    })
  })

  it('[Q3] signal:null retombe sur le neutre, jamais sur une couleur de signal', () => {
    expect(getWireStrokeColor({ signal: null })).toBe('#f97316')
  })

  it('ignore une valeur de signal inconnue et retombe sur le neutre', () => {
    expect(getWireStrokeColor({ signal: 'NOT_A_SIGNAL' })).toBe('#f97316')
  })
})

describe('MB-VIS-004 — getWireStateClassName', () => {
  it('renvoie une classe distincte pour chacun des quatre états logiques', () => {
    expect(getWireStateClassName({ signal: Signal.HIGH })).toBe('wires-layer__wire--high')
    expect(getWireStateClassName({ signal: Signal.LOW })).toBe('wires-layer__wire--low')
    expect(getWireStateClassName({ signal: Signal.UNKNOWN })).toBe('wires-layer__wire--unknown')
    expect(getWireStateClassName({ signal: Signal.FLOATING })).toBe('wires-layer__wire--floating')
  })

  it('[Q3] renvoie null pour signal:null (état neutre, pas de modificateur)', () => {
    expect(getWireStateClassName({ signal: null })).toBeNull()
    expect(getWireStateClassName()).toBeNull()
  })
})
