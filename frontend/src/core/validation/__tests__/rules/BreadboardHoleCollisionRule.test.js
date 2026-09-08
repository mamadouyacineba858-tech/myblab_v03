/**
 * BreadboardHoleCollisionRule.test.js — MB-BREADBOARD-003 (STR-007,
 * Blueprint §4, LOCK-12/AC-12/AC-13).
 *
 * Même patron que structuralRules.test.js (composant/wire minimal, aucun
 * mock nécessaire — la règle est une fonction pure).
 */
import { describe, it, expect } from 'vitest'
import { BreadboardHoleCollisionRule } from '../../rules/structural/BreadboardHoleCollisionRule.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

const resistor = (id, x, y) => ({ id, type: 'RESISTOR', position: { x, y }, parameters: {} })

describe('STR-007 BreadboardHoleCollisionRule', () => {
  it('id/category/level', () => {
    expect(BreadboardHoleCollisionRule.id).toBe('STR-007')
    expect(BreadboardHoleCollisionRule.level).toBe('ERROR')
  })

  it("ne signale rien en l'absence de breadboard, même avec des composants en collision géométrique", () => {
    const document = { breadboard: null, components: [resistor('r1', 60, 22), resistor('r2', 60, 22)], wires: [] }
    expect(BreadboardHoleCollisionRule.validate(document, null)).toBeNull()
  })

  it('ne signale rien quand les composants occupent des trous distincts', () => {
    const document = {
      breadboard,
      components: [resistor('r1', 60, 22), resistor('r2', 300, 22)],
      wires: [],
    }
    expect(BreadboardHoleCollisionRule.validate(document, null)).toBeNull()
  })

  it('signale ERROR pour une collision déjà présente dans le Document (sans commande en attente)', () => {
    const document = {
      breadboard,
      components: [resistor('r1', 60, 22), resistor('r2', 60, 22)],
      wires: [],
    }
    const problem = BreadboardHoleCollisionRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(problem.id).toBe('STR-007')
    // Les deux pins (A et B) coïncident (dx du pin B désormais multiple
    // exact de BREADBOARD_PITCH — MB-BREADBOARD-003 §1) : 2 trous en
    // collision.
    expect(problem.context.collisions).toHaveLength(2)
  })

  it('détecte une collision introduite par une commande ADD_COMPONENT en attente (pré-exécution, ADR-010)', () => {
    const document = { breadboard, components: [resistor('r1', 60, 22)], wires: [] }
    const command = {
      type: 'ADD_COMPONENT',
      payload: { componentType: 'RESISTOR', position: { x: 60, y: 22 } },
    }
    const problem = BreadboardHoleCollisionRule.validate(document, command)
    expect(problem).not.toBeNull()
    expect(problem.context.collisions).toHaveLength(2)
  })

  it("ne signale rien pour une commande ADD_COMPONENT en attente qui n'entre en collision avec rien", () => {
    const document = { breadboard, components: [resistor('r1', 60, 22)], wires: [] }
    const command = {
      type: 'ADD_COMPONENT',
      payload: { componentType: 'RESISTOR', position: { x: 300, y: 22 } },
    }
    expect(BreadboardHoleCollisionRule.validate(document, command)).toBeNull()
  })

  it('détecte une collision introduite par une commande MOVE_COMPONENT en attente (command.payload.moves)', () => {
    const document = {
      breadboard,
      components: [resistor('r1', 60, 22), resistor('r2', 300, 22)],
      wires: [],
    }
    const command = {
      type: 'MOVE_COMPONENT',
      payload: { moves: [{ componentId: 'r2', fromPosition: { x: 300, y: 22 }, toPosition: { x: 60, y: 22 } }] },
    }
    const problem = BreadboardHoleCollisionRule.validate(document, command)
    expect(problem).not.toBeNull()
    expect(problem.context.collisions).toHaveLength(2)
  })

  it("ne signale rien pour une commande MOVE_COMPONENT qui déplace un composant vers un trou libre", () => {
    const document = {
      breadboard,
      components: [resistor('r1', 60, 22), resistor('r2', 60, 22)],
      wires: [],
    }
    const command = {
      type: 'MOVE_COMPONENT',
      payload: { moves: [{ componentId: 'r2', fromPosition: { x: 60, y: 22 }, toPosition: { x: 300, y: 22 } }] },
    }
    expect(BreadboardHoleCollisionRule.validate(document, command)).toBeNull()
  })

  it('ignore défensivement un composant de type inconnu (pas de throw)', () => {
    const document = {
      breadboard,
      components: [{ id: 'x1', type: 'DOES_NOT_EXIST', position: { x: 60, y: 22 } }],
      wires: [],
    }
    expect(() => BreadboardHoleCollisionRule.validate(document, null)).not.toThrow()
    expect(BreadboardHoleCollisionRule.validate(document, null)).toBeNull()
  })

  it('ignore une commande étrangère (ADD_WIRE) — traite le Document existant tel quel', () => {
    const document = {
      breadboard,
      components: [resistor('r1', 60, 22), resistor('r2', 300, 22)],
      wires: [],
    }
    const command = { type: 'ADD_WIRE', payload: { fromUid: 'r1', fromPin: 'A', toUid: 'r2', toPin: 'A' } }
    expect(BreadboardHoleCollisionRule.validate(document, command)).toBeNull()
  })
})

/**
 * FT-B-001-S3 — TEST S3-E : la collision est un fait PHYSIQUE, évalué par
 * CONTACT. L'identité d'occupant d'un trou est (componentId, pinId, contactId)
 * — deux contacts physiques d'une même pin canonique restent distincts (§7).
 *
 * BUTTON @ {x:0,y:48} (probe S3) : 1a=col1/row9, 1b=col1/row4, 2a=col4/row9,
 * 2b=col4/row4 — 4 trous physiques DISTINCTS.
 * RESISTOR @ {x:12,y:94} : pin A -> (12,108) -> col1/row9 (même trou que 1a).
 */
describe('STR-007 — FT-B-001-S3 (TEST S3-E) : collision CONTACT-AWARE', () => {
  const button = (id, x, y) => ({ id, type: 'BUTTON', position: { x, y }, parameters: {} })

  it('un BUTTON seul (4 contacts sur 4 trous distincts) ne déclenche AUCUNE collision — deux contacts d\'une même pin à des trous différents ne collisionnent pas', () => {
    const document = { breadboard, components: [button('b1', 0, 48)], wires: [] }
    expect(BreadboardHoleCollisionRule.validate(document, null)).toBeNull()
  })

  it('collision détectée quand un contact de BUTTON et une pin de RESISTOR occupent EXACTEMENT le même trou physique', () => {
    const document = {
      breadboard,
      components: [button('b1', 0, 48), resistor('r1', 12, 94)],
      wires: [],
    }
    const problem = BreadboardHoleCollisionRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(problem.id).toBe('STR-007')
    // le trou en collision est col1:row9 (contact "1a" de b1 + pin "A" de r1)
    expect(problem.context.collisions.some((c) => c.hole === '1:9')).toBe(true)
    const entry = problem.context.collisions.find((c) => c.hole === '1:9')
    // l'occupant physique porte bien pinId ET contactId
    expect(entry.pins.some((p) => p.componentId === 'b1' && p.pinId === 'pin1' && p.contactId === '1a')).toBe(true)
    expect(entry.pins.some((p) => p.componentId === 'r1' && p.pinId === 'A' && p.contactId === 'A')).toBe(true)
  })

  it('deux BUTTON côte à côte sur des trous distincts (colonnes différentes) ne collisionnent pas', () => {
    const document = {
      breadboard,
      // b2 décalé de 6 colonnes (72px) -> aucun trou partagé
      components: [button('b1', 0, 48), button('b2', 72, 48)],
      wires: [],
    }
    expect(BreadboardHoleCollisionRule.validate(document, null)).toBeNull()
  })

  it('non-régression mono-contact : deux RESISTOR sur le même trou -> collision inchangée', () => {
    const document = {
      breadboard,
      components: [resistor('r1', 60, 22), resistor('r2', 60, 22)],
      wires: [],
    }
    const problem = BreadboardHoleCollisionRule.validate(document, null)
    expect(problem).not.toBeNull()
    expect(problem.context.collisions).toHaveLength(2)
  })
})
