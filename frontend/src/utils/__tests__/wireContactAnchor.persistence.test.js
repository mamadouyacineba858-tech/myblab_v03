/**
 * wireContactAnchor.persistence.test.js — FT-B-001-S2.
 *
 * Prouve que l'ancre de contact physique (`fromContact` / `toContact` côté
 * React, `pinA.contactId` / `pinB.contactId` côté Core) :
 *  - est purement ADDITIVE et OPTIONNELLE ;
 *  - survit ADD_WIRE -> Core -> toReact -> normalizeWire -> export/import ;
 *  - survit undo / redo ;
 *  - n'entre JAMAIS dans l'entrée du moteur (aucune sémantique électrique) ;
 *  - a un repli LEGACY déterministe (fil sans contact = comportement d'avant S2).
 */
import { describe, it, expect } from 'vitest'
import { AddWireHandler } from '../../core/handlers/wire/AddWireHandler.js'
import { createTestDocument } from '../../core/handlers/__tests__/fixtures/testDocument.js'
import { createHandlerTestContext } from '../../core/handlers/__tests__/fixtures/testHistoryContext.js'
import { ReactDocumentMapper } from '../../bridge/ReactDocumentMapper.js'
import { normalizeWire } from '../circuitModel.js'
import { toEngineInput } from '../../simulator/engineAdapter.js'

describe('FT-B-001-S2 — AddWireHandler : contactId additif dans pinA/pinB', () => {
  const setup = () => {
    const ctx = createHandlerTestContext(createTestDocument())
    return {
      documentApi: ctx.documentApi,
      historyService: ctx.historyService,
      handler: new AddWireHandler({ historyService: ctx.historyService, documentApi: ctx.documentApi }),
    }
  }

  it('payload avec fromContact/toContact -> pinA.contactId / pinB.contactId', () => {
    const { documentApi, handler } = setup()
    const out = handler.execute({ type: 'ADD_WIRE', payload: {
      fromUid: 'R1', fromPin: 'pin3', toUid: 'LED1', toPin: 'cathode',
      fromContact: '1a', toContact: 'cathode',
    } }, documentApi.getDocument())
    const w = documentApi.getDocument().wires.find((x) => x.id === out.result.wireId)
    expect(w.pinA).toEqual({ componentId: 'R1', pinId: 'pin3', contactId: '1a' })
    expect(w.pinB).toEqual({ componentId: 'LED1', pinId: 'cathode', contactId: 'cathode' })
  })

  it('payload SANS contact -> aucun contactId (fil legacy, comportement inchangé)', () => {
    const { documentApi, handler } = setup()
    const out = handler.execute({ type: 'ADD_WIRE', payload: {
      fromUid: 'R1', fromPin: 'pin3', toUid: 'LED1', toPin: 'cathode',
    } }, documentApi.getDocument())
    const w = documentApi.getDocument().wires.find((x) => x.id === out.result.wireId)
    expect(w.pinA).toEqual({ componentId: 'R1', pinId: 'pin3' })
    expect(w.pinB).toEqual({ componentId: 'LED1', pinId: 'cathode' })
    expect('contactId' in w.pinA).toBe(false)
  })

  it('undo puis redo restaure les mêmes endpoints ET les mêmes ancres de contact', () => {
    const { documentApi, historyService, handler } = setup()
    const out = handler.execute({ type: 'ADD_WIRE', payload: {
      fromUid: 'R1', fromPin: 'pin3', toUid: 'LED1', toPin: 'cathode',
      fromContact: '1b', toContact: 'anode',
    } }, documentApi.getDocument())
    const id = out.result.wireId
    const before = documentApi.getDocument().wires.find((w) => w.id === id)
    expect(before.pinA.contactId).toBe('1b')

    historyService.undo()
    expect(documentApi.getDocument().wires.find((w) => w.id === id)).toBeUndefined()

    historyService.redo()
    const after = documentApi.getDocument().wires.find((w) => w.id === id)
    expect(after.pinA).toEqual(before.pinA)
    expect(after.pinB).toEqual(before.pinB)
    expect(after.pinA.contactId).toBe('1b')
    expect(after.pinB.contactId).toBe('anode')
  })
})

describe('FT-B-001-S2 — ReactDocumentMapper : ancre de contact bidirectionnelle', () => {
  it('React -> Core : fromContact/toContact -> pinA.contactId/pinB.contactId', () => {
    const core = ReactDocumentMapper.toCore({
      components: [],
      wires: [{ id: 'w1', fromUid: 'A', fromPin: 'p', fromContact: '1a', toUid: 'B', toPin: 'q', toContact: '2b' }],
    })
    expect(core.wires[0].pinA).toEqual({ componentId: 'A', pinId: 'p', contactId: '1a' })
    expect(core.wires[0].pinB).toEqual({ componentId: 'B', pinId: 'q', contactId: '2b' })
  })

  it('Core -> React : pinA.contactId/pinB.contactId -> fromContact/toContact', () => {
    const react = ReactDocumentMapper.toReact({
      components: [],
      wires: [{ id: 'w1', pinA: { componentId: 'A', pinId: 'p', contactId: '1a' }, pinB: { componentId: 'B', pinId: 'q', contactId: '2b' } }],
    })
    expect(react.wires[0]).toMatchObject({ fromUid: 'A', fromPin: 'p', fromContact: '1a', toUid: 'B', toPin: 'q', toContact: '2b' })
  })

  it('absence d\'ancre : aucune clé synthétisée, ni React->Core ni Core->React (legacy)', () => {
    const core = ReactDocumentMapper.toCore({ components: [], wires: [{ id: 'w1', fromUid: 'A', fromPin: 'p', toUid: 'B', toPin: 'q' }] })
    expect('contactId' in core.wires[0].pinA).toBe(false)
    expect('contactId' in core.wires[0].pinB).toBe(false)
    const react = ReactDocumentMapper.toReact({ components: [], wires: [{ id: 'w1', pinA: { componentId: 'A', pinId: 'p' }, pinB: { componentId: 'B', pinId: 'q' } }] })
    expect('fromContact' in react.wires[0]).toBe(false)
    expect('toContact' in react.wires[0]).toBe(false)
  })

  it('round-trip React -> Core -> React préserve l\'ancre', () => {
    const src = { id: 'w1', fromUid: 'A', fromPin: 'p', fromContact: '1a', toUid: 'B', toPin: 'q', toContact: '2b', waypoints: [] }
    const back = ReactDocumentMapper.toReact(ReactDocumentMapper.toCore({ components: [], wires: [src] })).wires[0]
    expect(back).toMatchObject({ fromUid: 'A', fromPin: 'p', fromContact: '1a', toUid: 'B', toPin: 'q', toContact: '2b' })
  })
})

describe('FT-B-001-S2 — normalizeWire : ancre additive', () => {
  it('conserve fromContact/toContact scalaires', () => {
    const n = normalizeWire({ id: 'w', fromUid: 'A', fromPin: 'p', fromContact: '1a', toUid: 'B', toPin: 'q', toContact: '2b' })
    expect(n).toMatchObject({ fromContact: '1a', toContact: '2b' })
  })

  it('coerce en String (cohérence fromPin/toPin)', () => {
    const n = normalizeWire({ id: 'w', fromUid: 'A', fromPin: 'p', fromContact: 1, toUid: 'B', toPin: 'q' })
    expect(n.fromContact).toBe('1')
    expect('toContact' in n).toBe(false)
  })

  it('fil legacy (sans contact) -> aucune clé de contact ajoutée', () => {
    const n = normalizeWire({ id: 'w', fromUid: 'A', fromPin: 'p', toUid: 'B', toPin: 'q' })
    expect('fromContact' in n).toBe(false)
    expect('toContact' in n).toBe(false)
    expect(n).toEqual({ id: 'w', fromUid: 'A', fromPin: 'p', toUid: 'B', toPin: 'q', waypoints: [] })
  })

  it('valeur non scalaire ignorée (défensif)', () => {
    const n = normalizeWire({ id: 'w', fromUid: 'A', fromPin: 'p', fromContact: { x: 1 }, toUid: 'B', toPin: 'q', toContact: '' })
    expect('fromContact' in n).toBe(false)
    expect('toContact' in n).toBe(false)
  })

  it('round-trip complet : new wire -> normalize -> export(JSON) -> import -> normalize préserve l\'ancre', () => {
    const created = { id: 'w', fromUid: 'A', fromPin: 'p', fromContact: '1a', toUid: 'B', toPin: 'q', toContact: '2b', waypoints: [] }
    const exported = JSON.parse(JSON.stringify(normalizeWire(created)))
    const reimported = normalizeWire(exported)
    expect(reimported).toMatchObject({ fromContact: '1a', toContact: '2b' })
  })
})

describe('FT-B-001-S2 — invariance électrique : le moteur ignore contactId', () => {
  it('toEngineInput ne transmet jamais contactId ; deux contacts d\'une même pin sont électriquement identiques', () => {
    const base = {
      components: [
        { id: 'BTN', type: 'BUTTON', position: { x: 0, y: 0 } },
        { id: 'R', type: 'RESISTOR', position: { x: 200, y: 0 } },
      ],
    }
    const wire1a = toEngineInput({ ...base, wires: [{ id: 'w', pinA: { componentId: 'BTN', pinId: 'pin1', contactId: '1a' }, pinB: { componentId: 'R', pinId: 'A' } }] })
    const wire1b = toEngineInput({ ...base, wires: [{ id: 'w', pinA: { componentId: 'BTN', pinId: 'pin1', contactId: '1b' }, pinB: { componentId: 'R', pinId: 'A' } }] })
    const wireNone = toEngineInput({ ...base, wires: [{ id: 'w', pinA: { componentId: 'BTN', pinId: 'pin1' }, pinB: { componentId: 'R', pinId: 'A' } }] })

    expect(wire1a.wires).toEqual([{ fromUid: 'BTN', fromPin: 'pin1', toUid: 'R', toPin: 'A' }])
    expect(wire1b.wires).toEqual(wire1a.wires)
    expect(wireNone.wires).toEqual(wire1a.wires)
    for (const w of wire1a.wires) expect('contactId' in w).toBe(false)
  })
})
