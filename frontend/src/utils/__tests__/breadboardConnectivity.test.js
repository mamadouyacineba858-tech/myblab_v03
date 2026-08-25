/**
 * breadboardConnectivity.test.js — MB-BREADBOARD-002.
 *
 * Couvre deriveBreadboardVirtualWires()/toBridgeWire()/
 * deriveBreadboardVirtualWiresBridge() : fonctions pures, reconstruites à
 * chaque appel à partir du Document seul (LOCK-07, AC-17).
 *
 * RESISTOR (canonicalRegistry/componentDefinitions) : pin 'A' à dx:0,dy:14.
 * BREADBOARD_PITCH = 12. Un composant positionné en {60,22} place son pin
 * 'A' exactement en (60,36) — col 5, rangée 3 (début de la strip du haut).
 */
import { describe, it, expect } from 'vitest'
import {
  deriveBreadboardVirtualWires,
  deriveBreadboardVirtualWiresBridge,
  toBridgeWire,
} from '../breadboardConnectivity.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }

// Deux composants dont le pin 'A' tombe exactement dans le même groupe de
// cinq (col 5, strip du haut).
const R1 = { id: 'R1', type: 'RESISTOR', position: { x: 60, y: 22 } }
const R2 = { id: 'R2', type: 'RESISTOR', position: { x: 60, y: 22 } }
// Composant dont le pin 'A' tombe dans un groupe voisin (col 6).
const R3 = { id: 'R3', type: 'RESISTOR', position: { x: 72, y: 22 } }

describe('deriveBreadboardVirtualWires', () => {
  it('retourne [] sans breadboard (TB-14, aucune régression Document existant)', () => {
    expect(deriveBreadboardVirtualWires({ breadboard: null, components: [R1, R2] })).toEqual([])
  })

  it('retourne [] avec un breadboard mais sans components', () => {
    expect(deriveBreadboardVirtualWires({ breadboard, components: [] })).toEqual([])
  })

  it('retourne [] pour un seul composant occupant un groupe (aucune paire à connecter)', () => {
    expect(deriveBreadboardVirtualWires({ breadboard, components: [R1] })).toEqual([])
  })

  it('connecte deux pins occupant le même groupe de cinq (TB-01)', () => {
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, R2] })
    expect(wires).toHaveLength(1)
    expect(wires[0]).toEqual({
      pinA: { componentId: 'R1', pinId: 'A' },
      pinB: { componentId: 'R2', pinId: 'A' },
    })
  })

  it('ne connecte pas deux pins de groupes voisins (TB-02)', () => {
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, R3] })
    expect(wires).toEqual([])
  })

  it('retrait : un composant retiré de la liste ne laisse aucune connexion résiduelle (TB-07)', () => {
    const withBoth = deriveBreadboardVirtualWires({ breadboard, components: [R1, R2] })
    expect(withBoth).toHaveLength(1)
    const afterRemoval = deriveBreadboardVirtualWires({ breadboard, components: [R1] })
    expect(afterRemoval).toEqual([])
  })

  it('déplacement : ancien groupe libéré, nouveau groupe utilisé (TB-08)', () => {
    const movedR2 = { ...R2, position: { x: 72, y: 22 } } // rejoint le groupe de R3
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, movedR2, R3] })
    expect(wires).toHaveLength(1)
    expect(wires[0]).toEqual({
      pinA: { componentId: 'R2', pinId: 'A' },
      pinB: { componentId: 'R3', pinId: 'A' },
    })
  })

  it('un pin hors grille (insertion invalide) ne produit aucune arête (TB-09)', () => {
    const offGrid = { id: 'R4', type: 'RESISTOR', position: { x: 3, y: 3 } }
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, offGrid] })
    expect(wires).toEqual([])
  })

  it('ignore défensivement un composant de type inconnu', () => {
    const unknown = { id: 'X1', type: 'DOES_NOT_EXIST', position: { x: 60, y: 22 } }
    expect(() =>
      deriveBreadboardVirtualWires({ breadboard, components: [R1, unknown] })
    ).not.toThrow()
  })
})

describe('toBridgeWire / deriveBreadboardVirtualWiresBridge', () => {
  it('convertit une arête Core en forme bridge', () => {
    const core = { pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'R2', pinId: 'A' } }
    expect(toBridgeWire(core)).toEqual({ fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' })
  })

  it('dérive directement en forme bridge (TB-01, consommable par prepareCircuit)', () => {
    const wires = deriveBreadboardVirtualWiresBridge({ breadboard, components: [R1, R2] })
    expect(wires).toEqual([{ fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' }])
  })
})
