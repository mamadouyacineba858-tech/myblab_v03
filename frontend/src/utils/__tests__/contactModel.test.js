/**
 * contactModel.test.js — FT-B-001-S2.
 *
 * Modèle générique des contacts physiques. Aucune logique par type : le
 * module ne lit que la définition de pin fournie et synthétise le contact
 * implicite pour les pins mono-contact.
 */
import { describe, it, expect } from 'vitest'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  getDefaultContact,
  getDefaultContactId,
  resolveContact,
} from '../contactModel.js'
import { getComponentDef } from '../../config/componentDefinitions.js'

describe('contactModel — resolveContacts', () => {
  it('pin SANS contacts explicites -> exactement 1 contact implicite en pin.dx/pin.dy (id = pin.id)', () => {
    const pin = { id: 'A', label: 'A', dx: 0, dy: 14 }
    const contacts = resolveContacts(pin)
    expect(contacts).toEqual([
      { id: 'A', dx: 0, dy: 14, wireConnectable: true, breadboardInsertable: true },
    ])
  })

  it('pin avec 1 contact explicite -> ce contact, normalisé', () => {
    const pin = { id: 'A', dx: 0, dy: 14, contacts: [{ id: 'a', dx: 2, dy: 3 }] }
    expect(resolveContacts(pin)).toEqual([
      { id: 'a', dx: 2, dy: 3, wireConnectable: true, breadboardInsertable: true },
    ])
  })

  it('pin multi-contacts -> tous, dans l\'ordre de déclaration, flags par défaut true', () => {
    const pin = { id: 'pin1', dx: 14, dy: 30, contacts: [
      { id: '1a', dx: 14, dy: 58 },
      { id: '1b', dx: 14, dy: 2, breadboardInsertable: false },
    ] }
    expect(resolveContacts(pin)).toEqual([
      { id: '1a', dx: 14, dy: 58, wireConnectable: true, breadboardInsertable: true },
      { id: '1b', dx: 14, dy: 2, wireConnectable: true, breadboardInsertable: false },
    ])
  })

  it('contact sans dx/dy -> repli sur ceux de la pin', () => {
    const pin = { id: 'X', dx: 7, dy: 9, contacts: [{ id: 'x' }] }
    expect(resolveContacts(pin)[0]).toMatchObject({ id: 'x', dx: 7, dy: 9 })
  })

  it('entrée invalide -> []', () => {
    expect(resolveContacts(null)).toEqual([])
    expect(resolveContacts(undefined)).toEqual([])
    expect(resolveContacts(42)).toEqual([])
  })

  it('resolveWireConnectableContacts filtre wireConnectable:false', () => {
    const pin = { id: 'p', dx: 0, dy: 0, contacts: [
      { id: 'a', dx: 0, dy: 0 },
      { id: 'b', dx: 1, dy: 1, wireConnectable: false },
    ] }
    expect(resolveWireConnectableContacts(pin).map((c) => c.id)).toEqual(['a'])
  })
})

describe('contactModel — contact par défaut & résolution', () => {
  const multi = { id: 'pin1', dx: 14, dy: 30, contacts: [
    { id: '1a', dx: 14, dy: 58 },
    { id: '1b', dx: 14, dy: 2 },
  ] }
  const single = { id: 'A', dx: 0, dy: 14 }

  it('getDefaultContact = PREMIER contact déclaré (déterministe)', () => {
    expect(getDefaultContact(multi).id).toBe('1a')
    expect(getDefaultContactId(multi)).toBe('1a')
    expect(getDefaultContact(single).id).toBe('A')
  })

  it('resolveContact(pin, id connu) -> ce contact', () => {
    expect(resolveContact(multi, '1b')).toMatchObject({ id: '1b', dx: 14, dy: 2 })
  })

  it('resolveContact(pin, absent) -> contact par défaut (règle C)', () => {
    expect(resolveContact(multi, undefined).id).toBe('1a')
    expect(resolveContact(multi, null).id).toBe('1a')
  })

  it('resolveContact(pin, id inconnu/périmé) -> contact par défaut de LA MÊME pin (règle D), jamais d\'erreur', () => {
    expect(resolveContact(multi, 'ZZZ').id).toBe('1a')
    expect(resolveContact(multi, '2a').id).toBe('1a')
  })

  it('resolveContact sur pin mono-contact -> le contact implicite quel que soit l\'id demandé (règles A/B)', () => {
    expect(resolveContact(single, undefined).id).toBe('A')
    expect(resolveContact(single, 'anything').id).toBe('A')
  })

  it('coercion numérique -> string pour l\'id demandé', () => {
    const p = { id: 'p', dx: 0, dy: 0, contacts: [{ id: '1', dx: 0, dy: 0 }, { id: '2', dx: 1, dy: 1 }] }
    expect(resolveContact(p, 2).id).toBe('2')
  })
})

describe('contactModel — FT-B-001-S4 : héritage des drapeaux pin-level', () => {
  it('contact implicite hérite de pinDef.wireConnectable / pinDef.breadboardInsertable', () => {
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, wireConnectable: false })[0].wireConnectable).toBe(false)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false })[0].breadboardInsertable).toBe(false)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0 })[0]).toMatchObject({ wireConnectable: true, breadboardInsertable: true })
  })

  it('contact explicite : drapeau du contact > drapeau de la pin > true, `false` toujours respecté', () => {
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, wireConnectable: true, contacts: [{ id: 'a', wireConnectable: false }] })[0].wireConnectable).toBe(false)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false, contacts: [{ id: 'a', breadboardInsertable: true }] })[0].breadboardInsertable).toBe(true)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false, contacts: [{ id: 'a' }] })[0].breadboardInsertable).toBe(false)
  })
})

describe('contactModel — intégration composants réels (aucune logique par type)', () => {
  it('LED / RESISTOR / DIODE (aucun contacts[] déclaré) -> 1 contact implicite par pin, en pin.dx/pin.dy, flags true/true', () => {
    const implicitContactTypes = ['LED', 'RESISTOR', 'DIODE']
    for (const type of implicitContactTypes) {
      for (const pin of getComponentDef(type).pins) {
        const contacts = resolveContacts(pin)
        expect(contacts).toHaveLength(1)
        expect(contacts[0]).toEqual({ id: pin.id, dx: pin.dx, dy: pin.dy, wireConnectable: true, breadboardInsertable: true })
      }
    }
  })

  it('MB-L1-CONS-001 — CAPACITOR / BUZZER / POTENTIOMETER / LDR / THERMISTOR / RGB_LED : contacts[] explicite fait autorité pour la géométrie physique ; contactId reste égal à pinId', () => {
    const explicitContactTypes = ['CAPACITOR', 'BUZZER', 'POTENTIOMETER', 'LDR', 'THERMISTOR', 'RGB_LED']
    for (const type of explicitContactTypes) {
      for (const pin of getComponentDef(type).pins) {
        expect(Array.isArray(pin.contacts) && pin.contacts.length === 1).toBe(true)
        const [declared] = pin.contacts
        const contacts = resolveContacts(pin)
        expect(contacts).toHaveLength(1)
        expect(contacts[0]).toEqual({
          id: declared.id, dx: declared.dx, dy: declared.dy,
          wireConnectable: true, breadboardInsertable: true,
        })
        expect(contacts[0].id).toBe(pin.id)
      }
    }
  })

  it('MB-L1-CONS-001 — CAPACITOR / LDR / THERMISTOR / RGB_LED : la géométrie physique déclarée diverge RÉELLEMENT de pin.dx/pin.dy', () => {
    for (const type of ['CAPACITOR', 'LDR', 'THERMISTOR', 'RGB_LED']) {
      for (const pin of getComponentDef(type).pins) {
        const [declared] = pin.contacts
        expect(declared.dx === pin.dx && declared.dy === pin.dy).toBe(false)
      }
    }
  })

  it('FT-B-001-S5 — NPN_TRANSISTOR : 1 contact explicite par pin (B/C/E aux pattes), pinId inchangé, enfichable', () => {
    const def = getComponentDef('NPN_TRANSISTOR')
    expect(def.pins.map((p) => p.id)).toEqual(['collector', 'base', 'emitter'])
    const byPin = Object.fromEntries(def.pins.map((p) => [p.id, resolveContacts(p)]))
    expect(byPin.base).toEqual([{ id: 'B', dx: 31.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }])
    expect(byPin.collector).toEqual([{ id: 'C', dx: 42.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }])
    expect(byPin.emitter).toEqual([{ id: 'E', dx: 53.5, dy: 58.5, wireConnectable: true, breadboardInsertable: true }])
    expect(def.pins.map((p) => [p.dx, p.dy])).toEqual([[45, 0], [0, 45], [90, 45]])
  })

  it('FT-B-001-S5 — POWER / ARDUINO : contacts explicites raster, wireConnectable:true, breadboardInsertable:false ; pin.dx/dy canonique inchangée', () => {
    const power = getComponentDef('POWER')
    for (const pin of power.pins) {
      const [c] = resolveContacts(pin)
      expect(c.wireConnectable).toBe(true)
      expect(c.breadboardInsertable).toBe(false)
    }
    expect(power.pins.map((p) => [p.dx, p.dy])).toEqual([[70, 37], [58, 25]])
    expect(resolveContacts(power.pins.find((p) => p.id === '5V'))[0]).toMatchObject({ dx: 35, dy: 67 })

    const arduino = getComponentDef('ARDUINO')
    for (const pin of arduino.pins) {
      const [c] = resolveContacts(pin)
      expect(c.wireConnectable).toBe(true)
      expect(c.breadboardInsertable).toBe(false)
    }
  })

  it('MB-L1-PROP-009 — DC_MOTOR : contacts explicites sur les deux cosses arrière, Core plus/minus inchangé', () => {
    const def = getComponentDef('DC_MOTOR')
    const plus = def.pins.find((p) => p.id === 'plus')
    const minus = def.pins.find((p) => p.id === 'minus')

    expect([plus.dx, plus.dy]).toEqual([0, 25])
    expect([minus.dx, minus.dy]).toEqual([84, 25])
    expect(resolveContacts(plus)).toEqual([
      { id: 'plus', dx: 3.5, dy: 16, wireConnectable: true, breadboardInsertable: false },
    ])
    expect(resolveContacts(minus)).toEqual([
      { id: 'minus', dx: 3.5, dy: 34, wireConnectable: true, breadboardInsertable: false },
    ])
  })

  it('FT-B-001-S5 — SERVO : contact implicite en pin.dx/dy, wireConnectable:true, breadboardInsertable:false (drapeau pin-level hérité)', () => {
    for (const pin of getComponentDef('SERVO').pins) {
      const contacts = resolveContacts(pin)
      expect(contacts).toHaveLength(1)
      expect(contacts[0]).toEqual({ id: pin.id, dx: pin.dx, dy: pin.dy, wireConnectable: true, breadboardInsertable: false })
    }
  })

  it('BUTTON / BUTTON_LATCHING -> 2 pins canoniques, 2 contacts physiques chacune, contact défaut = patte basse (dy 58)', () => {
    for (const type of ['BUTTON', 'BUTTON_LATCHING']) {
      const def = getComponentDef(type)
      expect(def.pins.map((p) => p.id)).toEqual(['pin1', 'pin2'])
      for (const pin of def.pins) {
        const contacts = resolveContacts(pin)
        expect(contacts).toHaveLength(2)
        expect(getDefaultContact(pin).dy).toBe(58)
        expect(contacts[1].dy).toBe(2)
        expect(contacts.every((c) => c.dx === pin.dx)).toBe(true)
        expect(new Set(contacts.map((c) => c.id)).size).toBe(2)
      }
    }
  })
})
