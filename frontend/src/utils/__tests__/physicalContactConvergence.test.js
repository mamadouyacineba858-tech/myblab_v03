/**
 * physicalContactConvergence.test.js — FT-B-001-S4 R2
 * "Physical Contact Presentation Convergence".
 *
 * Verrouille la convergence de la présentation des points physiques sur le
 * modèle PhysicalContact générique (contactModel.js), SANS toucher au contrat
 * d'attachement breadboard historique (POWER / ARDUINO — TODO S5).
 *
 * Couvre : S4-A (héritage contactModel), S4-B (registres *_VISUAL_PINS retirés
 * / conservés), S4-C (aucune branche de type pour la coordonnée de contact
 * générique), S4-D (BUTTON / BUTTON_LATCHING), S4-F/G (POWER / ARDUINO
 * inchangés), S4-H (DC_MOTOR / BUZZER / SERVO), S4-K/N (matrice API 16/16).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  resolveContacts,
  resolveWireConnectableContacts,
  resolveBreadboardInsertableContacts,
  getDefaultContact,
  resolveContact,
} from '../contactModel.js'
import { getPinPresentationPosition } from '../pinPresentationGeometry.js'
import { getPinPosition } from '../geometry.js'
import { buildWirePaths } from '../circuitSelectors.js'
import { COMPONENT_TYPES, getComponentDef } from '../../config/componentDefinitions.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ALL_TYPES = Object.keys(COMPONENT_TYPES)

// ---------------------------------------------------------------------------
// TEST S4-A — héritage pin-level générique dans contactModel
// ---------------------------------------------------------------------------
describe('FT-B-001-S4 — TEST S4-A : contactModel — héritage des drapeaux pin-level', () => {
  it('contact IMPLICITE hérite de pinDef.wireConnectable', () => {
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0 })[0].wireConnectable).toBe(true)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, wireConnectable: false })[0].wireConnectable).toBe(false)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, wireConnectable: true })[0].wireConnectable).toBe(true)
  })

  it('contact IMPLICITE hérite de pinDef.breadboardInsertable', () => {
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0 })[0].breadboardInsertable).toBe(true)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false })[0].breadboardInsertable).toBe(false)
  })

  it('contact EXPLICITE : drapeau du contact > drapeau de la pin > true', () => {
    // contact impose false malgré pin true
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, wireConnectable: true, contacts: [{ id: 'a', wireConnectable: false }] })[0].wireConnectable).toBe(false)
    // contact impose true malgré pin false
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false, contacts: [{ id: 'a', breadboardInsertable: true }] })[0].breadboardInsertable).toBe(true)
    // contact silencieux -> hérite de la pin
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false, contacts: [{ id: 'a' }] })[0].breadboardInsertable).toBe(false)
    // contact silencieux + pin silencieuse -> true
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, contacts: [{ id: 'a' }] })[0].wireConnectable).toBe(true)
  })

  it('`false` explicite n\'est JAMAIS transformé en `true`', () => {
    const r = resolveContacts({ id: 'p', dx: 0, dy: 0, contacts: [
      { id: 'a', wireConnectable: false, breadboardInsertable: false },
    ] })
    expect(r[0]).toMatchObject({ wireConnectable: false, breadboardInsertable: false })
  })

  it('ordre déterministe + repli resolveContact inchangé', () => {
    const pin = { id: 'p', dx: 5, dy: 6, contacts: [{ id: '1a', dx: 1, dy: 2 }, { id: '1b', dx: 3, dy: 4 }] }
    expect(resolveContacts(pin).map((c) => c.id)).toEqual(['1a', '1b'])
    expect(getDefaultContact(pin).id).toBe('1a')
    expect(resolveContact(pin, '1b').id).toBe('1b')
    expect(resolveContact(pin, 'ZZZ').id).toBe('1a') // périmé -> défaut MÊME pin
    expect(resolveContact({ id: 'q', dx: 0, dy: 0 }, 'anything').id).toBe('q') // mono-contact
  })

  it('tous les types du catalogue -> drapeaux de contact booléens ; classification d\'enfichage FT-B-001-S5', () => {
    // wireConnectable : true partout (tout composant est câblable).
    // breadboardInsertable : false pour POWER / ARDUINO / DC_MOTOR / SERVO
    // (drapeau pin-level ou contact explicite), true partout ailleurs.
    const NON_INSERTABLE = new Set(['POWER', 'ARDUINO', 'DC_MOTOR', 'SERVO', 'BATTERY_9V', 'BATTERY_AA', 'COIN_CELL_CR2032'])
    for (const type of ALL_TYPES) {
      for (const pin of getComponentDef(type).pins) {
        for (const c of resolveContacts(pin)) {
          expect(typeof c.wireConnectable).toBe('boolean')
          expect(typeof c.breadboardInsertable).toBe('boolean')
          expect(c.wireConnectable).toBe(true)
          expect(c.breadboardInsertable).toBe(!NON_INSERTABLE.has(type))
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// TEST S4-B / S5 — les 6 registres *_VISUAL_PINS de la dette FT-B sont SUPPRIMÉS
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — TEST S4-B/S5 : plus aucun registre *_VISUAL_PINS', () => {
  const rawSrc = readFileSync(resolve(__dirname, '../pinPresentationGeometry.js'), 'utf-8')
  // stripComments : retirer d'abord les `//`, puis les blocs `/* */` (ordre de
  // MB-VIS-COMP-007) — on teste le CODE, pas les commentaires explicatifs.
  const code = rawSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

  it('les 6 registres *_VISUAL_PINS + getLedVisualPinPosition sont SUPPRIMÉS du code', () => {
    for (const name of [
      'LED_VISUAL_PINS', 'BUTTON_VISUAL_PINS', 'BUTTON_LATCHING_VISUAL_PINS',
      'NPN_TRANSISTOR_VISUAL_PINS', 'POWER_VISUAL_PINS', 'ARDUINO_VISUAL_PINS',
      'getLedVisualPinPosition',
    ]) {
      expect(code, name).not.toMatch(new RegExp(name))
    }
  })

  it('aucune branche de type dans pinPresentationGeometry.js (résolution 100% générique)', () => {
    expect(code).not.toMatch(/component\.type\s*===/)
    for (const t of ['LED', 'BUTTON', 'BUTTON_LATCHING', 'NPN_TRANSISTOR', 'POWER', 'ARDUINO']) {
      expect(code, t).not.toMatch(new RegExp(`type\\s*===\\s*["']${t}["']`))
    }
  })
})

// ---------------------------------------------------------------------------
// TEST S4-C / S5 — résolution de contact 100% générique, tous types
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — TEST S4-C/S5 : résolution de contact générique, TOUS les types', () => {
  for (const type of ALL_TYPES) {
    it(`${type} : hit target == contact par défaut, sans registre parallèle`, () => {
      const def = getComponentDef(type)
      const comp = { uid: 'c', type, x: 100, y: 200 }
      for (const pin of def.pins) {
        const dflt = getDefaultContact(pin)
        const pres = getPinPresentationPosition(comp, pin)
        expect(pres).toEqual({ x: comp.x + dflt.dx, y: comp.y + dflt.dy })
        // pour un mono-contact, c'est aussi exactement la géométrie canonique
        if (!Array.isArray(pin.contacts) || pin.contacts.length === 0) {
          expect(pres).toEqual(getPinPosition(comp, pin))
        }
      }
    })
  }
})

// ---------------------------------------------------------------------------
// TEST S4-D — BUTTON / BUTTON_LATCHING
// ---------------------------------------------------------------------------
describe('FT-B-001-S4 — TEST S4-D : BUTTON / BUTTON_LATCHING', () => {
  for (const type of ['BUTTON', 'BUTTON_LATCHING']) {
    it(`${type} : 4 contacts physiques / 2 pins canoniques, coordonnées S2 inchangées`, () => {
      const def = getComponentDef(type)
      expect(def.pins.map((p) => p.id)).toEqual(['pin1', 'pin2'])
      const dx = type === 'BUTTON' ? [14, 46] : [13, 47]
      for (const [i, pin] of def.pins.entries()) {
        const contacts = resolveContacts(pin)
        expect(contacts).toHaveLength(2)
        expect(contacts.map((c) => [c.id, c.dx, c.dy])).toEqual([
          [`${i + 1}a`, dx[i], 58],
          [`${i + 1}b`, dx[i], 2],
        ])
      }
    })

    it(`${type} : contact par défaut = patte basse (dy 58), fil legacy sans contactId reste dessus`, () => {
      const def = getComponentDef(type)
      const comp = { uid: 'b', type, x: 0, y: 0 }
      for (const pin of def.pins) {
        // 2-arg (aucun contact) -> contact par défaut = patte basse (dy 58)
        expect(getPinPresentationPosition(comp, pin)).toEqual({ x: pin.dx, y: 58 })
        // contact explicite haut ("1b"/"2b") -> patte haute dy 2
        const high = pin.id === 'pin1' ? '1b' : '2b'
        expect(getPinPresentationPosition(comp, pin, { contact: resolveContact(pin, high) })).toEqual({ x: pin.dx, y: 2 })
      }
    })
  }

  it('BUTTON : hit target (défaut) == extrémité de fil (fil legacy sans contactId)', () => {
    const button = { uid: 'btn', type: 'BUTTON', x: 100, y: 100 }
    const resistor = { uid: 'r', type: 'RESISTOR', x: 400, y: 100 }
    const wire = { id: 'w', fromUid: 'btn', fromPin: 'pin1', toUid: 'r', toPin: 'A' }
    const [path] = buildWirePaths([button, resistor], [wire])
    const pin1 = getComponentDef('BUTTON').pins[0]
    const expected = getPinPresentationPosition(button, pin1) // (114, 158)
    expect(path.d.startsWith(`M ${expected.x} ${expected.y}`)).toBe(true)
    expect(expected).toEqual({ x: 114, y: 158 })
  })

  it('BUTTON : fil avec fromContact "1b" -> extrémité EXACTEMENT sur la patte haute', () => {
    const button = { uid: 'btn', type: 'BUTTON', x: 100, y: 100 }
    const resistor = { uid: 'r', type: 'RESISTOR', x: 400, y: 100 }
    const wire = { id: 'w', fromUid: 'btn', fromPin: 'pin1', fromContact: '1b', toUid: 'r', toPin: 'A' }
    const [path] = buildWirePaths([button, resistor], [wire])
    expect(path.d.startsWith('M 114 102')).toBe(true) // (100+14, 100+2)
  })
})

// ---------------------------------------------------------------------------
// TEST S4-F / S4-G / S5 — POWER / ARDUINO / NPN : présentation via PhysicalContact
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — TEST S4-F/G/S5 : POWER / ARDUINO / NPN présentation via contacts déclarés', () => {
  it('POWER : hit target / endpoint sur les CONTACTS raster (35,67)/(22,67) ; pin.dx/dy canonique intacte', () => {
    const comp = { uid: 'p', type: 'POWER', x: 0, y: 0 }
    const def = getComponentDef('POWER')
    const p5v = def.pins.find((p) => p.id === '5V')
    const pgnd = def.pins.find((p) => p.id === 'GND')
    expect(getPinPresentationPosition(comp, p5v)).toEqual({ x: 35, y: 67 })
    expect(getPinPresentationPosition(comp, pgnd)).toEqual({ x: 22, y: 67 })
    // pin.dx/dy (géométrie canonique / électrique, MB-BREADBOARD-005) intacte
    expect([p5v.dx, p5v.dy]).toEqual([70, 37])
    expect([pgnd.dx, pgnd.dy]).toEqual([58, 25])
    expect(getPinPresentationPosition(comp, p5v, { contact: getDefaultContact(p5v) })).toEqual({ x: 35, y: 67 })
  })

  it('ARDUINO : hit target / endpoint sur les CONTACTS raster ; pin.dx/dy canonique intacte', () => {
    const comp = { uid: 'a', type: 'ARDUINO', x: 0, y: 0 }
    const def = getComponentDef('ARDUINO')
    const expected = { D2: [3, 50], D3: [15, 75], GND: [15, 108], '5V': [115, 50] }
    const canon = { D2: [0, 50], D3: [0, 75], GND: [0, 110], '5V': [120, 50] }
    for (const pin of def.pins) {
      const pos = getPinPresentationPosition(comp, pin)
      expect([pos.x, pos.y]).toEqual(expected[pin.id])
      expect([pin.dx, pin.dy]).toEqual(canon[pin.id])
      expect(getPinPresentationPosition(comp, pin, { contact: getDefaultContact(pin) })).toEqual(pos)
    }
  })

  it('NPN_TRANSISTOR : présentation sur les CONTACTS probe-validés B/C/E = (31.5,58.5)/(42.5,58.5)/(53.5,58.5) ; canonique intacte', () => {
    const comp = { uid: 'n', type: 'NPN_TRANSISTOR', x: 0, y: 0 }
    const def = getComponentDef('NPN_TRANSISTOR')
    const expected = { base: [31.5, 58.5], collector: [42.5, 58.5], emitter: [53.5, 58.5] }
    const canon = { collector: [45, 0], base: [0, 45], emitter: [90, 45] }
    for (const pin of def.pins) {
      const pos = getPinPresentationPosition(comp, pin)
      expect([pos.x, pos.y]).toEqual(expected[pin.id])
      expect([pin.dx, pin.dy]).toEqual(canon[pin.id])
    }
    expect(def.pins.map((p) => p.id).sort()).toEqual(['base', 'collector', 'emitter'])
  })
})

// ---------------------------------------------------------------------------
// TEST S4-H / S5 — DC_MOTOR / BUZZER / SERVO
// ---------------------------------------------------------------------------
describe('FT-B-001-S5 — TEST S4-H/S5 : DC_MOTOR / BUZZER / SERVO', () => {
  it('BUZZER : reste enfichable (contact implicite en pin.dx/dy, breadboardInsertable:true)', () => {
    const comp = { uid: 'c', type: 'BUZZER', x: 0, y: 0 }
    for (const pin of getComponentDef('BUZZER').pins) {
      expect(resolveContacts(pin)).toEqual([{ id: pin.id, dx: pin.dx, dy: pin.dy, wireConnectable: true, breadboardInsertable: true }])
      expect(getPinPresentationPosition(comp, pin)).toEqual(getPinPosition(comp, pin))
    }
  })

  for (const type of ['DC_MOTOR', 'SERVO']) {
    it(`${type} : contact implicite en pin.dx/dy, wireConnectable:true, breadboardInsertable:false (drapeau pin-level)`, () => {
      const comp = { uid: 'c', type, x: 0, y: 0 }
      for (const pin of getComponentDef(type).pins) {
        expect(resolveContacts(pin)).toEqual([{ id: pin.id, dx: pin.dx, dy: pin.dy, wireConnectable: true, breadboardInsertable: false }])
        expect(getPinPresentationPosition(comp, pin)).toEqual(getPinPosition(comp, pin))
      }
    })
  }
})

// ---------------------------------------------------------------------------
// TEST S4-K / S4-N — matrice API PhysicalContact du catalogue
// ---------------------------------------------------------------------------
describe('FT-B-001-S4 — TEST S4-K/N : matrice API PhysicalContact du catalogue', () => {
  const CATALOGUE = [
    'BATTERY_9V', 'BATTERY_AA', 'COIN_CELL_CR2032',
    'LED', 'RESISTOR', 'ARDUINO', 'BUTTON', 'BUTTON_LATCHING', 'POWER', 'CAPACITOR',
    'BUZZER', 'POTENTIOMETER', 'LDR', 'THERMISTOR', 'DIODE', 'RGB_LED', 'NPN_TRANSISTOR',
    'SERVO', 'DC_MOTOR', 'POLARIZED_CAPACITOR',
  ]

  it('le catalogue compte exactement 20 types', () => {
    expect(new Set(CATALOGUE).size).toBe(20)
    expect(new Set(ALL_TYPES)).toEqual(new Set(CATALOGUE))
  })

  for (const type of CATALOGUE) {
    it(`${type} : chaque pin canonique -> >=1 PhysicalContact valide, pin.id jamais remplacé`, () => {
      const def = getComponentDef(type)
      expect(def.pins.length).toBeGreaterThan(0)
      for (const pin of def.pins) {
        expect(typeof pin.id).toBe('string')
        expect(pin.id.length).toBeGreaterThan(0)

        const contacts = resolveContacts(pin)
        expect(contacts.length).toBeGreaterThanOrEqual(1)
        for (const c of contacts) {
          expect(typeof c.id).toBe('string')
          expect(c.id.length).toBeGreaterThan(0)
          expect(Number.isFinite(c.dx)).toBe(true)
          expect(Number.isFinite(c.dy)).toBe(true)
          expect(typeof c.wireConnectable).toBe('boolean')
          expect(typeof c.breadboardInsertable).toBe('boolean')
        }
        // wire-connectable / breadboard-insertable ⊆ resolveContacts
        expect(resolveWireConnectableContacts(pin).length).toBeLessThanOrEqual(contacts.length)
        expect(resolveBreadboardInsertableContacts(pin).length).toBeLessThanOrEqual(contacts.length)

        // resolveContact(pin, absent) -> un contact de CETTE pin, jamais null
        const dflt = resolveContact(pin, undefined)
        expect(dflt).not.toBeNull()
        // contactId n'est pas pin.id sauf pour un mono-contact implicite
        const explicit = Array.isArray(pin.contacts) && pin.contacts.length > 0
        if (!explicit) expect(dflt.id).toBe(pin.id)
      }
    })
  }

  it('BUTTON / BUTTON_LATCHING : 4 contacts physiques au total, 2 pins électriques', () => {
    for (const type of ['BUTTON', 'BUTTON_LATCHING']) {
      const def = getComponentDef(type)
      const total = def.pins.reduce((n, pin) => n + resolveContacts(pin).length, 0)
      expect(total).toBe(4)
      expect(def.pins).toHaveLength(2)
    }
  })

  it('Autres types : exactement 1 contact physique par pin', () => {
    for (const type of CATALOGUE.filter((t) => t !== 'BUTTON' && t !== 'BUTTON_LATCHING')) {
      for (const pin of getComponentDef(type).pins) {
        expect(resolveContacts(pin)).toHaveLength(1)
      }
    }
  })

  // FT-B-001-S5 — classification d'enfichage breadboard verrouillée (§15).
  it('classification breadboardInsertable finale S5 : 13 enfichables / 7 non-directs', () => {
    const INSERTABLE = ['RESISTOR', 'LED', 'DIODE', 'CAPACITOR', 'LDR', 'THERMISTOR',
      'POTENTIOMETER', 'BUTTON', 'BUTTON_LATCHING', 'NPN_TRANSISTOR', 'RGB_LED', 'BUZZER',
      'POLARIZED_CAPACITOR']
    const NON_DIRECT = ['ARDUINO', 'POWER', 'DC_MOTOR', 'SERVO', 'BATTERY_9V', 'BATTERY_AA', 'COIN_CELL_CR2032']
    expect([...INSERTABLE, ...NON_DIRECT].sort()).toEqual([...CATALOGUE].sort())

    const insertableContactCount = (type) =>
      getComponentDef(type).pins.reduce((n, pin) => n + resolveBreadboardInsertableContacts(pin).length, 0)

    for (const type of INSERTABLE) {
      expect(insertableContactCount(type), `${type} doit être enfichable`).toBeGreaterThan(0)
    }
    for (const type of NON_DIRECT) {
      expect(insertableContactCount(type), `${type} ne doit PAS être enfichable directement`).toBe(0)
    }
    // wireConnectable : true pour TOUS (aucun composant n'est non-câblable)
    for (const type of CATALOGUE) {
      const wc = getComponentDef(type).pins.reduce((n, pin) => n + resolveWireConnectableContacts(pin).length, 0)
      expect(wc, `${type} doit être câblable`).toBeGreaterThan(0)
    }
  })
})
