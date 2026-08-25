/**
 * engineAdapter.test.js — MB-BREADBOARD-002.
 *
 * Aucune couverture de test n'existait pour toEngineInput() avant ce
 * ticket. Ce fichier couvre la conversion Core → bridge de base (régression,
 * TB-14/TB-15) et l'ajout des arêtes virtuelles breadboard (TB-01, TB-06).
 */
import { describe, it, expect } from 'vitest'
import { toEngineInput } from '../engineAdapter.js'

describe('toEngineInput — régression (sans breadboard)', () => {
  it('retourne des tableaux vides pour une entrée invalide', () => {
    expect(toEngineInput(null)).toEqual({ components: [], wires: [] })
    expect(toEngineInput(undefined)).toEqual({ components: [], wires: [] })
  })

  it('convertit components/wires Core vers la forme bridge, sans breadboard (TB-14)', () => {
    const coreDocument = {
      components: [
        { id: 'R1', type: 'RESISTOR', position: { x: 10, y: 20 }, parameters: { resistance: 220 } },
      ],
      wires: [
        { id: 'W1', pinA: { componentId: 'R1', pinId: 'A' }, pinB: { componentId: 'LED1', pinId: 'anode' } },
      ],
    }
    const result = toEngineInput(coreDocument)
    expect(result.components).toEqual([
      { uid: 'R1', type: 'RESISTOR', x: 10, y: 20, parameters: { resistance: 220 }, state: undefined, pins: undefined },
    ])
    expect(result.wires).toEqual([{ fromUid: 'R1', fromPin: 'A', toUid: 'LED1', toPin: 'anode' }])
  })

  it('ignore des composants/wires incomplets (comportement historique inchangé)', () => {
    const coreDocument = {
      components: [{ id: 'R1', type: 'RESISTOR' }], // pas de position
      wires: [{ id: 'W1', pinA: { pinId: 'A' } }], // pas de componentId
    }
    expect(toEngineInput(coreDocument)).toEqual({ components: [], wires: [] })
  })
})

describe('toEngineInput — breadboard (MB-BREADBOARD-002)', () => {
  const breadboard = { id: 'bb1', position: { x: 0, y: 0 } }
  // RESISTOR.A à dx:0,dy:14 ; position {60,22} -> pin A absolu (60,36) = col5,row3 (strip top).
  const R1 = { id: 'R1', type: 'RESISTOR', position: { x: 60, y: 22 } }
  const R2 = { id: 'R2', type: 'RESISTOR', position: { x: 60, y: 22 } }

  it('ajoute les arêtes virtuelles breadboard aux wires explicites (TB-01)', () => {
    // MB-BREADBOARD-003 : dx du pin B (84) est désormais un multiple exact de
    // BREADBOARD_PITCH. R1/R2 partageant leur position, pin A ET pin B
    // atterrissent chacun sur un trou valide → 2 arêtes virtuelles.
    const result = toEngineInput({ breadboard, components: [R1, R2], wires: [] })
    expect(result.wires).toEqual([
      { fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' },
      { fromUid: 'R1', fromPin: 'B', toUid: 'R2', toPin: 'B' },
    ])
  })

  it('combine wire explicite et connexion breadboard (TB-06)', () => {
    const explicitWire = { id: 'W1', pinA: { componentId: 'R1', pinId: 'B' }, pinB: { componentId: 'LED1', pinId: 'anode' } }
    const result = toEngineInput({ breadboard, components: [R1, R2], wires: [explicitWire] })
    expect(result.wires).toContainEqual({ fromUid: 'R1', fromPin: 'B', toUid: 'LED1', toPin: 'anode' })
    expect(result.wires).toContainEqual({ fromUid: 'R1', fromPin: 'A', toUid: 'R2', toPin: 'A' })
    expect(result.wires).toContainEqual({ fromUid: 'R1', fromPin: 'B', toUid: 'R2', toPin: 'B' })
    expect(result.wires).toHaveLength(3)
  })

  it('sans breadboard sur le Document, aucune arête virtuelle ajoutée (TB-15, canevas libre inchangé)', () => {
    const result = toEngineInput({ components: [R1, R2], wires: [] })
    expect(result.wires).toEqual([])
  })
})
