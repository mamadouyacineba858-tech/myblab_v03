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
import { holeAt } from '../breadboardGeometry.js'

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
    // MB-BREADBOARD-003 : dx du pin B (84) est désormais un multiple exact de
    // BREADBOARD_PITCH (12). R1 et R2 partageant la même position, leur pin A
    // ET leur pin B atterrissent chacun sur un trou valide (deux groupes
    // distincts, col5 et col12) — c'est le comportement correct attendu
    // post-correction géométrique (avant, pin B tombait toujours hors trou).
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, R2] })
    expect(wires).toHaveLength(2)
    expect(wires).toEqual([
      { pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'R2', pinId: 'A' } },
      { pinA: { componentId: 'R1', pinId: 'B' }, pinB: { componentId: 'R2', pinId: 'B' } },
    ])
  })

  it('ne connecte pas deux pins de groupes voisins (TB-02)', () => {
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, R3] })
    expect(wires).toEqual([])
  })

  it('retrait : un composant retiré de la liste ne laisse aucune connexion résiduelle (TB-07)', () => {
    // MB-BREADBOARD-003 : voir TB-01 ci-dessus — R1/R2 partagent leurs deux
    // pins (A et B) désormais, donc 2 arêtes tant que les deux sont présents.
    const withBoth = deriveBreadboardVirtualWires({ breadboard, components: [R1, R2] })
    expect(withBoth).toHaveLength(2)
    const afterRemoval = deriveBreadboardVirtualWires({ breadboard, components: [R1] })
    expect(afterRemoval).toEqual([])
  })

  it('déplacement : ancien groupe libéré, nouveau groupe utilisé (TB-08)', () => {
    // MB-BREADBOARD-003 : movedR2 rejoint la position de R3, donc leurs pins
    // A ET B coïncident désormais (dx=84 exact multiple de PITCH) — 2 arêtes.
    const movedR2 = { ...R2, position: { x: 72, y: 22 } } // rejoint le groupe de R3
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [R1, movedR2, R3] })
    expect(wires).toHaveLength(2)
    expect(wires).toEqual([
      { pinA: { componentId: 'R2', pinId: 'A' }, pinB: { componentId: 'R3', pinId: 'A' } },
      { pinA: { componentId: 'R2', pinId: 'B' }, pinB: { componentId: 'R3', pinId: 'B' } },
    ])
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

describe('MB-BREADBOARD-007 — TEST A1 : rail multi-colonnes (audit MB-BREADBOARD-AUDIT-CONNECTIVITE §7)', () => {
  // holeAt() indexe un trou de RAIL par RANGÉE uniquement (groupKey sans
  // colonne, breadboardGeometry.js) : deux composants DISTINCTS occupant la
  // même rangée de rail à des colonnes DIFFÉRENTES doivent donc partager le
  // même groupKey et être unis par une arête virtuelle — exactement le même
  // mécanisme que pour une colonne de strip (TB-01 ci-dessus), jamais testé
  // isolément pour un rail avant ce ticket.
  //
  // POWER (dx/dy établis par MB-BREADBOARD-005, cf. componentDefinitions.js)
  // à {x:2,y:155} : 5V -> col6/row16 (rail bas +). R_TAP (RESISTOR) à
  // {x:288,y:178} : pin A -> col24/row16 (MÊME rangée rail+, colonne
  // DIFFÉRENTE) ; pin B (dx84) -> col31, hors grille (>=30 colonnes,
  // volontairement flottant).
  const POWER_RAIL = { id: 'power1', type: 'POWER', position: { x: 2, y: 155 } }
  const R_TAP = { id: 'rtap', type: 'RESISTOR', position: { x: 288, y: 178 } }
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }

  it("POWER.5V (col6) et RESISTOR.A (col24) sur la MÊME rangée de rail : une arête virtuelle les unit", () => {
    const wires = deriveBreadboardVirtualWires({ breadboard, components: [POWER_RAIL, R_TAP] })
    expect(wires).toEqual([
      { pinA: { componentId: 'power1', pinId: '5V' }, pinB: { componentId: 'rtap', pinId: 'A' } },
    ])
  })

  it("verrou du fixture : RESISTOR.B tombe bien hors grille (col31 >= 30 colonnes), seule A occupe le rail", () => {
    // Non-régression du fixture lui-même (si ce verrou échouait, la preuve
    // A1 ci-dessus ne porterait plus sur "une seule pin par composant sur
    // le rail" mais sur un cas différent, 2 pins du même RESISTOR sur la
    // même rangée).
    const pinA = { x: R_TAP.position.x + 0, y: R_TAP.position.y + 14 }
    const pinB = { x: R_TAP.position.x + 84, y: R_TAP.position.y + 14 }
    expect(holeAt(breadboard, pinA.x, pinA.y)).toEqual({ kind: 'RAIL', groupKey: 'bb1:rail:bottom:+', column: 24, row: 16 })
    expect(holeAt(breadboard, pinB.x, pinB.y)).toBeNull()
  })
})

describe('toBridgeWire / deriveBreadboardVirtualWiresBridge', () => {
  it('convertit une arête Core en forme bridge', () => {
    const core = { pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'R2', pinId: 'A' } }
    expect(toBridgeWire(core)).toEqual({ fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' })
  })

  it('dérive directement en forme bridge (TB-01, consommable par prepareCircuit)', () => {
    // MB-BREADBOARD-003 : voir TB-01 ci-dessus — 2 arêtes (pin A et pin B).
    const wires = deriveBreadboardVirtualWiresBridge({ breadboard, components: [R1, R2] })
    expect(wires).toEqual([
      { fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' },
      { fromUid: 'R1', fromPin: 'B', toUid: 'R2', toPin: 'B' },
    ])
  })
})
