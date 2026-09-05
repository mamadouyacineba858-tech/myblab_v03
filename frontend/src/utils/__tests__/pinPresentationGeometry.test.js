import { describe, it, expect } from 'vitest'
import { getPinPresentationPosition } from '../pinPresentationGeometry.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

describe('MB-VIS-LED-V5 — presentation-only pin geometry', () => {
  it('projects LED pins to the physical feet without changing the electrical definition', () => {
    const component = { uid: 'led-1', type: 'LED', x: 100, y: 200 }
    const def = getComponentDef('LED')

    expect(def.pins).toEqual([
      expect.objectContaining({ id: 'anode', dx: 0, dy: 20 }),
      expect.objectContaining({ id: 'cathode', dx: 80, dy: 20 }),
    ])

    expect(getPinPresentationPosition(component, def.pins[0])).toEqual({ x: 128, y: 268 })
    expect(getPinPresentationPosition(component, def.pins[1])).toEqual({ x: 152, y: 268 })
  })

  it('falls back to canonical coordinates for non-LED components', () => {
    const component = { uid: 'res-1', type: 'RESISTOR', x: 100, y: 200 }
    const def = getComponentDef('RESISTOR')

    expect(getPinPresentationPosition(component, def.pins[0])).toEqual({ x: 100, y: 214 })
    expect(getPinPresentationPosition(component, def.pins[1])).toEqual({ x: 184, y: 214 })
  })
})

describe('MB-VIS-CANVAS-052 — getPinPresentationPosition({ scale })', () => {
  const component = { uid: 'res-1', type: 'RESISTOR', x: 100, y: 200 }
  const def = getComponentDef('RESISTOR')
  // RESISTOR : 84x28, pins canoniques A(dx:0,dy:14)/B(dx:84,dy:14) ->
  // position absolue A(100,214)/B(184,214) ; centre du composant à
  // (100+42, 200+14) = (142, 214) — les deux pins sont donc symétriques
  // par rapport au centre en X (distance -42 / +42), identiques en Y (sur
  // l'axe du centre : aucune variation par le scale).

  it('scale omis (comportement 2-arguments) reste identique à la non-régression ci-dessus', () => {
    expect(getPinPresentationPosition(component, def.pins[0])).toEqual({ x: 100, y: 214 })
  })

  it('scale=1 explicite ne change rien (non-régression stricte)', () => {
    expect(getPinPresentationPosition(component, def.pins[0], { scale: 1 })).toEqual({ x: 100, y: 214 })
    expect(getPinPresentationPosition(component, def.pins[1], { scale: 1 })).toEqual({ x: 184, y: 214 })
  })

  it('scale=2 reprojette chaque pin autour du centre du composant, jamais component.x/y', () => {
    expect(getPinPresentationPosition(component, def.pins[0], { scale: 2 })).toEqual({ x: 58, y: 214 })
    expect(getPinPresentationPosition(component, def.pins[1], { scale: 2 })).toEqual({ x: 226, y: 214 })
    // component lui-même n'est jamais muté par la présentation.
    expect(component).toEqual({ uid: 'res-1', type: 'RESISTOR', x: 100, y: 200 })
  })

  it('scale=LOCAL_SCALE_DEFAULT (1.5) et LOCAL_SCALE_MAX (3.0) restent finis et cohérents avec la formule centre+delta*scale', () => {
    const p1 = getPinPresentationPosition(component, def.pins[0], { scale: 1.5 })
    expect(p1.x).toBeCloseTo(142 + (100 - 142) * 1.5, 10)
    expect(Number.isFinite(p1.x)).toBe(true)
    const p2 = getPinPresentationPosition(component, def.pins[1], { scale: 3.0 })
    expect(p2.x).toBeCloseTo(142 + (184 - 142) * 3.0, 10)
    expect(Number.isFinite(p2.x)).toBe(true)
  })

  it('scale non fini (NaN/Infinity) retombe sur la position de base, jamais NaN', () => {
    expect(getPinPresentationPosition(component, def.pins[0], { scale: NaN })).toEqual({ x: 100, y: 214 })
    expect(getPinPresentationPosition(component, def.pins[0], { scale: Infinity })).toEqual({ x: 100, y: 214 })
  })

  it('un type avec projection visuelle par type (NPN_TRANSISTOR) applique le même centre canonique (largeur/hauteur de componentDefinitions.js), pas un branchement ad hoc', () => {
    const npn = { uid: 'npn-1', type: 'NPN_TRANSISTOR', x: 0, y: 0 }
    const npnDef = getComponentDef('NPN_TRANSISTOR')
    const basePin = npnDef.pins.find((p) => p.id === 'base')
    const base = getPinPresentationPosition(npn, basePin)
    // NPN_TRANSISTOR : 90x60 -> centre (45,30).
    const center = { x: 45, y: 30 }
    const scaled = getPinPresentationPosition(npn, basePin, { scale: 2 })
    expect(scaled.x).toBeCloseTo(center.x + (base.x - center.x) * 2, 10)
    expect(scaled.y).toBeCloseTo(center.y + (base.y - center.y) * 2, 10)
  })
})
