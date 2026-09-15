/**
 * breadboardSwitchFit.test.js — A3-SW3 "Switch Breadboard Physical Fit".
 *
 * Preuve que SLIDE_SWITCH et DIP_SWITCH sont désormais réellement enfichables
 * sur le Breadboard V1 (BREADBOARD_PITCH=12), en réutilisant EXCLUSIVEMENT le
 * pipeline générique déjà existant (holeAt / resolveComponentContactHoles /
 * computeBreadboardPlacement / deriveBreadboardVirtualWires /
 * resolveSolidaryComponentIds / BreadboardHoleCollisionRule) — AUCUNE branche
 * `type === "SLIDE_SWITCH"` / `type === "DIP_SWITCH"` n'est introduite nulle
 * part (Breadboard.jsx, placement adapter, connectivity, solidarity restent
 * non modifiés).
 *
 * Couvre T1-T19 du ticket A3-SW3 (§11) ; T20 (non-régression raster) est
 * couvert par SlideSwitchPart.raster.test.jsx / DipSwitchPart.raster.test.jsx
 * (non dupliqué ici).
 */
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { getComponentDef } from '../../config/componentDefinitions.js'
import { resolveBreadboardInsertableContacts } from '../contactModel.js'
import { BREADBOARD_PITCH, holeAt, resolveComponentContactHoles } from '../breadboardGeometry.js'
import { computeBreadboardPlacement } from '../breadboardPlacementAdapter.js'
import { deriveBreadboardVirtualWires } from '../breadboardConnectivity.js'
import { resolveSolidaryComponentIds } from '../../core/handlers/breadboard/breadboardSolidarity.js'
import { BreadboardHoleCollisionRule } from '../../core/validation/rules/structural/BreadboardHoleCollisionRule.js'
import { CircuitProvider } from '../../context/CircuitContext.jsx'
import { useCircuit } from '../../context/useCircuit.js'
import { useCircuitInteraction } from '../../context/useCircuitInteraction.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

// Origines valides démontrées par calcul direct (cf. rapport final §C) :
//  - SLIDE_SWITCH (dx 12/36/60, tous multiples exacts de 12 ; dy 44) :
//    origin (0,4) -> throwA/common/throwB en col 1/3/5, row 4 (strip haut).
//  - DIP_SWITCH (dx 14/26/38/50/62/74/86/98, résidu uniforme 2 mod 12 ; dy 50) :
//    origin (10,10) -> 1A..4B en col 2..9 (consécutives), row 5 (strip haut).
const SLIDE_VALID_ORIGIN = { x: 0, y: 4 }
const DIP_VALID_ORIGIN = { x: 10, y: 10 }

function renderWithCanvas() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

function pointerDown(result, component) {
  act(() => {
    result.current.startDrag(
      {
        button: 0,
        clientX: component.x + 10,
        clientY: component.y + 10,
        ctrlKey: false,
        metaKey: false,
        preventDefault: () => {},
        stopPropagation: () => {},
      },
      component.uid
    )
  })
}
function pointerMoveTo(component, targetX, targetY) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: targetX + 10, clientY: targetY + 10 }))
  })
}
function pointerUp() {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup'))
  })
}
function dragTo(result, component, targetX, targetY) {
  pointerDown(result, component)
  pointerMoveTo(component, targetX, targetY)
  pointerUp()
}

describe('A3-SW3 — T8 : géométrie DIP_SWITCH compatible BREADBOARD_PITCH=12 (résidu uniforme)', () => {
  it('les 8 contacts partagent le MÊME résidu mod 12 en dx (une seule origine peut tous les aligner)', () => {
    const def = getComponentDef('DIP_SWITCH')
    const residues = new Set(def.pins.map((p) => ((p.dx % BREADBOARD_PITCH) + BREADBOARD_PITCH) % BREADBOARD_PITCH))
    expect(residues.size).toBe(1)
  })

  it('les 3 contacts SLIDE_SWITCH sont TOUS des multiples exacts de 12 (résidu 0)', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    for (const p of def.pins) expect(p.dx % BREADBOARD_PITCH).toBe(0)
  })
})

describe('A3-SW3 — T1/T5 : tous les contacts résolus à une origine valide', () => {
  it('T1 — SLIDE_SWITCH : les 3 contacts résolvent vers 3 trous distincts à origin (0,4)', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, SLIDE_VALID_ORIGIN)
    expect(allResolved).toBe(true)
    expect(results).toHaveLength(3)
    const cols = results.map((r) => r.hole.column)
    expect(new Set(cols).size).toBe(3)
    for (const r of results) expect(r.hole.row).toBe(4)
  })

  it('T5 — DIP_SWITCH : les 8 contacts résolvent vers 8 trous distincts à origin (10,10)', () => {
    const def = getComponentDef('DIP_SWITCH')
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, DIP_VALID_ORIGIN)
    expect(allResolved).toBe(true)
    expect(results).toHaveLength(8)
    const cols = results.map((r) => r.hole.column)
    expect(new Set(cols).size).toBe(8)
    expect(Math.min(...cols)).toBe(2)
    expect(Math.max(...cols)).toBe(9)
    for (const r of results) expect(r.hole.row).toBe(5)
  })
})

describe('A3-SW3 — T2 : origine invalide rejetée (SLIDE_SWITCH)', () => {
  it('un décalage de 5px (> tolérance ±2) hors grille fait échouer TOUS les contacts', () => {
    const def = getComponentDef('SLIDE_SWITCH')
    const offGrid = { x: SLIDE_VALID_ORIGIN.x + 5, y: SLIDE_VALID_ORIGIN.y }
    const { anyResolved } = resolveComponentContactHoles(breadboard, def.pins, offGrid)
    expect(anyResolved).toBe(false)
  })
})

describe('A3-SW3 — T6/T7 : aucun contact DIP entre deux trous ni dans la rainure', () => {
  it('T6 — chaque contact résolu tombe EXACTEMENT sur un trou (aucun `hole:null` à origin valide)', () => {
    const def = getComponentDef('DIP_SWITCH')
    const { results } = resolveComponentContactHoles(breadboard, def.pins, DIP_VALID_ORIGIN)
    for (const r of results) {
      expect(r.hole).not.toBeNull()
      expect(r.resolved).toBe(true)
    }
  })

  it('T7 — aucun trou résolu ne porte un groupKey de rainure/rail (tous en "strip")', () => {
    const def = getComponentDef('DIP_SWITCH')
    const { results } = resolveComponentContactHoles(breadboard, def.pins, DIP_VALID_ORIGIN)
    for (const r of results) expect(r.hole.kind).toBe('STRIP')
  })
})

describe('A3-SW3 — T10/T11 : topologie électrique DIP_SWITCH inchangée (8 pins, 4 canaux)', () => {
  it('T10 — les 8 pins restent électriquement distinctes (ids inchangés)', () => {
    const def = getComponentDef('DIP_SWITCH')
    expect(def.pins.map((p) => p.id)).toEqual(['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B'])
    expect(new Set(def.pins.map((p) => p.id)).size).toBe(8)
  })

  it('T11 — channelStates ON/OFF par canal reste indépendant (initialChannelStates inchangé)', () => {
    const def = getComponentDef('DIP_SWITCH')
    expect(def.interaction).toEqual({ type: 'multi-state-toggle', channels: ['1', '2', '3', '4'], states: ['off', 'on'] })
  })
})

describe('A3-SW3 — T3/T9 : le placement adapter trouve une origine valide (best-effort search)', () => {
  it('T3 — SLIDE_SWITCH : un candidat proche de (0,4) snap vers un placement valide', () => {
    const result = computeBreadboardPlacement(breadboard, 'SLIDE_SWITCH', { x: 3, y: 5 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.holes).toHaveLength(3)
  })

  it('T9 — DIP_SWITCH : un candidat proche de (10,10) snap vers un placement valide', () => {
    const result = computeBreadboardPlacement(breadboard, 'DIP_SWITCH', { x: 12, y: 12 }, [])
    expect(result.compatible).toBe(true)
    expect(result.breadboardActive).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.holes).toHaveLength(8)
  })
})

describe('A3-SW3 — T4 : connectivité dérivée correspond aux trous occupés (SLIDE_SWITCH)', () => {
  it('deriveBreadboardVirtualWires unit SLIDE_SWITCH.common à un RESISTOR posé sur la même colonne/strip', () => {
    // common résout col3/row4 (strip haut, colX3). On pose un RESISTOR dont
    // le pin A tombe sur la MÊME colonne/strip (col3, row5 -> même groupKey
    // de strip top col3) pour prouver la fusion par bus.
    const resistorDef = getComponentDef('RESISTOR')
    const resistorOrigin = { x: 36 - resistorDef.pins[0].dx, y: 60 - resistorDef.pins[0].dy }
    // Ancre le pin A du RESISTOR exactement sur col3 (x=36), row5 (y=60).
    const document = {
      breadboards: [breadboard],
      components: [
        { id: 'sw1', type: 'SLIDE_SWITCH', position: SLIDE_VALID_ORIGIN },
        { id: 'r1', type: 'RESISTOR', position: resistorOrigin },
      ],
      wires: [],
    }
    const virtualWires = deriveBreadboardVirtualWires(document)
    const linked = virtualWires.some(
      (w) =>
        (w.pinA.componentId === 'sw1' && w.pinA.pinId === 'common' && w.pinB.componentId === 'r1') ||
        (w.pinB.componentId === 'sw1' && w.pinB.pinId === 'common' && w.pinA.componentId === 'r1')
    )
    expect(linked).toBe(true)
  })
})

describe('A3-SW3 — T14 : collision détectée (STR-007) quand deux composants visent le même trou', () => {
  it('DIP_SWITCH et un RESISTOR positionnés pour occuper le même trou déclenchent STR-007', () => {
    // 1A de DIP_SWITCH à DIP_VALID_ORIGIN résout col2/row5 (x=24,y=60).
    // On place un RESISTOR dont le pin A tombe EXACTEMENT sur le même trou.
    const resistorDef = getComponentDef('RESISTOR')
    const collidingOrigin = { x: 24 - resistorDef.pins[0].dx, y: 60 - resistorDef.pins[0].dy }
    const document = {
      breadboard,
      components: [
        { id: 'dip1', type: 'DIP_SWITCH', position: DIP_VALID_ORIGIN },
        { id: 'r1', type: 'RESISTOR', position: collidingOrigin },
      ],
      wires: [],
    }
    const problem = BreadboardHoleCollisionRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(problem.id).toBe('STR-007')
  })

  it("aucune collision quand DIP_SWITCH et un RESISTOR occupent des trous distincts", () => {
    const document = {
      breadboard,
      components: [
        { id: 'dip1', type: 'DIP_SWITCH', position: DIP_VALID_ORIGIN },
        { id: 'r1', type: 'RESISTOR', position: { x: 500, y: 500 } },
      ],
      wires: [],
    }
    expect(BreadboardHoleCollisionRule.validate(document, null)).toBeNull()
  })
})

describe('A3-SW3 — T15 : solidarité breadboard (suit le breadboard lors d\'un déplacement)', () => {
  it('SLIDE_SWITCH inséré est solidaire du breadboard (au moins un contact résolu)', () => {
    const components = [{ uid: 'sw1', type: 'SLIDE_SWITCH', x: SLIDE_VALID_ORIGIN.x, y: SLIDE_VALID_ORIGIN.y }]
    const solidary = resolveSolidaryComponentIds(breadboard, components)
    expect(solidary.has('sw1')).toBe(true)
  })

  it('DIP_SWITCH inséré est solidaire du breadboard', () => {
    const components = [{ uid: 'dip1', type: 'DIP_SWITCH', x: DIP_VALID_ORIGIN.x, y: DIP_VALID_ORIGIN.y }]
    const solidary = resolveSolidaryComponentIds(breadboard, components)
    expect(solidary.has('dip1')).toBe(true)
  })

  it('un SLIDE_SWITCH hors breadboard n\'est PAS solidaire', () => {
    const components = [{ uid: 'sw1', type: 'SLIDE_SWITCH', x: 5000, y: 5000 }]
    const solidary = resolveSolidaryComponentIds(breadboard, components)
    expect(solidary.has('sw1')).toBe(false)
  })
})

describe('A3-SW3 — T16 : autres composants breadboardInsertable non régressés', () => {
  it('RESISTOR reste enfichable exactement comme avant (baseline non affectée)', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, [])
    expect(result.valid).toBe(true)
  })
  it('POWER (non enfichable) reste non enfichable directement (baseline non affectée)', () => {
    const result = computeBreadboardPlacement(breadboard, 'POWER', { x: 58, y: 21 }, [])
    expect(result.compatible).toBe(false)
  })
})

describe('A3-SW3 — pipeline réel (drag/snap/retrait/undo/redo/interaction) — T12/T13/T17/T18/T19', () => {
  it('T12 — SLIDE_SWITCH : un drag réel vers le breadboard snap sur un trou valide', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('SLIDE_SWITCH', 500, 500)
    })
    const sw = result.current.components.find((c) => c.type === 'SLIDE_SWITCH')
    dragTo(result, sw, SLIDE_VALID_ORIGIN.x, SLIDE_VALID_ORIGIN.y)
    const after = result.current.components.find((c) => c.uid === sw.uid)
    expect(after.x).toBe(SLIDE_VALID_ORIGIN.x)
    expect(after.y).toBe(SLIDE_VALID_ORIGIN.y)
  })

  it('T12 — DIP_SWITCH : un drag réel vers le breadboard snap sur un trou valide', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('DIP_SWITCH', 500, 500)
    })
    const dip = result.current.components.find((c) => c.type === 'DIP_SWITCH')
    dragTo(result, dip, DIP_VALID_ORIGIN.x, DIP_VALID_ORIGIN.y)
    const after = result.current.components.find((c) => c.uid === dip.uid)
    expect(after.x).toBe(DIP_VALID_ORIGIN.x)
    expect(after.y).toBe(DIP_VALID_ORIGIN.y)
  })

  it('T13 — retirer le DIP_SWITCH du breadboard (drag loin) fonctionne librement, sans forçage sur un trou', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('DIP_SWITCH', 500, 500)
    })
    const dip = result.current.components.find((c) => c.type === 'DIP_SWITCH')
    dragTo(result, dip, DIP_VALID_ORIGIN.x, DIP_VALID_ORIGIN.y)
    dragTo(result, result.current.components.find((c) => c.uid === dip.uid), 900, 900)
    const after = result.current.components.find((c) => c.uid === dip.uid)
    expect(after.x).toBe(900)
    expect(after.y).toBe(900)
  })

  it('T17 — SLIDE_SWITCH inséré sur breadboard : le toggle left/right reste fonctionnel', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('SLIDE_SWITCH', 500, 500)
    })
    const sw = result.current.components.find((c) => c.type === 'SLIDE_SWITCH')
    dragTo(result, sw, SLIDE_VALID_ORIGIN.x, SLIDE_VALID_ORIGIN.y)
    expect(result.current.components.find((c) => c.uid === sw.uid).state).toBe('left')
    act(() => { result.current.toggleComponentState(sw.uid) })
    expect(result.current.components.find((c) => c.uid === sw.uid).state).toBe('right')
  })

  it('T18 — DIP_SWITCH inséré sur breadboard : le toggle par canal reste fonctionnel', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('DIP_SWITCH', 500, 500)
    })
    const dip = result.current.components.find((c) => c.type === 'DIP_SWITCH')
    dragTo(result, dip, DIP_VALID_ORIGIN.x, DIP_VALID_ORIGIN.y)
    act(() => { result.current.toggleComponentChannel(dip.uid, '2') })
    expect(result.current.components.find((c) => c.uid === dip.uid).channelStates).toEqual({ '1': 'off', '2': 'on', '3': 'off', '4': 'off' })
  })

  it('T19 — Undo/Redo non régressé après une insertion réelle sur breadboard (DIP_SWITCH)', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('DIP_SWITCH', 500, 500)
    })
    const dip = result.current.components.find((c) => c.type === 'DIP_SWITCH')
    dragTo(result, dip, DIP_VALID_ORIGIN.x, DIP_VALID_ORIGIN.y)
    expect(result.current.components.find((c) => c.uid === dip.uid).x).toBe(DIP_VALID_ORIGIN.x)

    act(() => { result.current.undo() })
    expect(result.current.components.find((c) => c.uid === dip.uid).x).toBe(500)

    act(() => { result.current.redo() })
    expect(result.current.components.find((c) => c.uid === dip.uid).x).toBe(DIP_VALID_ORIGIN.x)
  })
})
