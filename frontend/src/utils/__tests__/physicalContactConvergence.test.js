/**
 * physicalContactConvergence.test.js — FT-B-001-S4 R2
 * "Physical Contact Presentation Convergence".
 *
 * Verrouille la convergence de la présentation des points physiques sur le
 * modèle PhysicalContact générique (contactModel.js), SANS toucher au contrat
 * d'attachement breadboard historique (POWER / ARDUINO — TODO S5).
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
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, wireConnectable: true, contacts: [{ id: 'a', wireConnectable: false }] })[0].wireConnectable).toBe(false)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false, contacts: [{ id: 'a', breadboardInsertable: true }] })[0].breadboardInsertable).toBe(true)
    expect(resolveContacts({ id: 'p', dx: 0, dy: 0, breadboardInsertable: false, contacts: [{ id: 'a' }] })[0].breadboardInsertable).toBe(false)
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
    expect(resolveContact(pin, 'ZZZ').id).toBe('1a')
    expect(resolveContact({ id: 'q', dx: 0, dy: 0 }, 'anything').id).toBe('q')
  })

  it('tous les types du catalogue -> drapeaux de contact booléens ; classification d\'enfichage FT-B-001-S5', () => {
    // A3-SW3 : SLIDE_SWITCH et DIP_SWITCH sont passés à breadboardInsertable:
    // true (géométrie prouvée compatible BREADBOARD_PITCH=12,
    // componentDefinitions.js) — retirés de NON_INSERTABLE.
    // A6-OUT1-R1 : VIBRATION_MOTOR est passé à breadboardInsertable: true
    // (géométrie prouvée compatible BREADBOARD_PITCH=12, entraxe 24 = 2×12,
    // cf. vibrationMotorA6Out1R1.test.js) — retiré de NON_INSERTABLE. DC_MOTOR
    // seul conserve le statut non-enfichable (aucune géométrie démontrée).
    // A6-OUT2 : LIGHT_BULB rejoint directement les enfichables (même famille
    // géométrique 72×96/(24,84)/(48,84) que VIBRATION_MOTOR, cf.
    // lightBulbA6Out2.test.jsx) — n'a jamais été dans NON_INSERTABLE.
    // A6-OUT3 : HOBBY_GEARMOTOR est wire-only (breadboardInsertable:false sur
    // les deux broches, comme DC_MOTOR — jamais de géométrie BREADBOARD_PITCH
    // démontrée ni recherchée, cf. componentDefinitions.js) -> NON_INSERTABLE.
    // A7-C2 : FORCE_SENSOR et FLEX_SENSOR étaient tous deux wire-only
    // (queue plate à pastilles rapprochées, pas deux pattes traversantes au
    // pas breadboard, même précédent que HOBBY_GEARMOTOR) -> NON_INSERTABLE
    // initialement. A7-C2-R1 (FLEX_SENSOR) puis A7-C2-R2 (FORCE_SENSOR),
    // deux correctifs CSA successifs suite à un Founder Canvas Gate FAIL sur
    // le physical fit, les ont tous deux fait rejoindre les enfichables :
    // leurs PhysicalContacts fonctionnels sont désormais recalés au pas
    // breadboard (entraxe 12 = 1×BREADBOARD_PITCH), distincts des racines
    // mécaniques mesurées du raster (INCHANGÉES, cf. assemblyProfiles.js)
    // -> retirés de NON_INSERTABLE.
    const NON_INSERTABLE = new Set(['POWER', 'ARDUINO', 'DC_MOTOR', 'SERVO', 'BATTERY_9V', 'BATTERY_AA', 'COIN_CELL_CR2032', 'HOBBY_GEARMOTOR'])
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

describe('FT-B-001-S5 — TEST S4-B/S5 : plus aucun registre *_VISUAL_PINS', () => {
  const rawSrc = readFileSync(resolve(__dirname, '../pinPresentationGeometry.js'), 'utf-8')
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

describe('FT-B-001-S5 — TEST S4-C/S5 : résolution de contact générique, TOUS les types', () => {
  for (const type of ALL_TYPES) {
    it(`${type} : hit target == contact par défaut, sans registre parallèle`, () => {
      const def = getComponentDef(type)
      const comp = { uid: 'c', type, x: 100, y: 200 }
      for (const pin of def.pins) {
        const dflt = getDefaultContact(pin)
        const pres = getPinPresentationPosition(comp, pin)
        expect(pres).toEqual({ x: comp.x + dflt.dx, y: comp.y + dflt.dy })
        if (!Array.isArray(pin.contacts) || pin.contacts.length === 0) {
          expect(pres).toEqual(getPinPosition(comp, pin))
        }
      }
    })
  }
})

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
        expect(getPinPresentationPosition(comp, pin)).toEqual({ x: pin.dx, y: 58 })
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
    const expected = getPinPresentationPosition(button, pin1)
    expect(path.d.startsWith(`M ${expected.x} ${expected.y}`)).toBe(true)
    expect(expected).toEqual({ x: 114, y: 158 })
  })

  it('BUTTON : fil avec fromContact "1b" -> extrémité EXACTEMENT sur la patte haute', () => {
    const button = { uid: 'btn', type: 'BUTTON', x: 100, y: 100 }
    const resistor = { uid: 'r', type: 'RESISTOR', x: 400, y: 100 }
    const wire = { id: 'w', fromUid: 'btn', fromPin: 'pin1', fromContact: '1b', toUid: 'r', toPin: 'A' }
    const [path] = buildWirePaths([button, resistor], [wire])
    expect(path.d.startsWith('M 114 102')).toBe(true)
  })
})

describe('FT-B-001-S5 — TEST S4-F/G/S5 : POWER / ARDUINO / NPN présentation via contacts déclarés', () => {
  it('POWER : hit target / endpoint sur les CONTACTS raster (35,67)/(22,67) ; pin.dx/dy canonique intacte', () => {
    const comp = { uid: 'p', type: 'POWER', x: 0, y: 0 }
    const def = getComponentDef('POWER')
    const p5v = def.pins.find((p) => p.id === '5V')
    const pgnd = def.pins.find((p) => p.id === 'GND')
    expect(getPinPresentationPosition(comp, p5v)).toEqual({ x: 35, y: 67 })
    expect(getPinPresentationPosition(comp, pgnd)).toEqual({ x: 22, y: 67 })
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

  it('NPN_TRANSISTOR : présentation sur les CONTACTS probe-validés B/C/E ; canonique intacte', () => {
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

describe('FT-B-001-S5 — TEST S4-H/S5 : DC_MOTOR / BUZZER / SERVO', () => {
  it('BUZZER : reste enfichable (contact implicite en pin.dx/dy, breadboardInsertable:true)', () => {
    const comp = { uid: 'c', type: 'BUZZER', x: 0, y: 0 }
    for (const pin of getComponentDef('BUZZER').pins) {
      expect(resolveContacts(pin)).toEqual([{ id: pin.id, dx: pin.dx, dy: pin.dy, wireConnectable: true, breadboardInsertable: true }])
      expect(getPinPresentationPosition(comp, pin)).toEqual(getPinPosition(comp, pin))
    }
  })

  it('MB-L1-PROP-009 — DC_MOTOR : contacts explicites sur les deux cosses arrière ; canonique électrique inchangée', () => {
    const comp = { uid: 'm', type: 'DC_MOTOR', x: 0, y: 0 }
    const def = getComponentDef('DC_MOTOR')
    const plus = def.pins.find((p) => p.id === 'plus')
    const minus = def.pins.find((p) => p.id === 'minus')

    expect([plus.dx, plus.dy]).toEqual([0, 25])
    expect([minus.dx, minus.dy]).toEqual([84, 25])
    expect(resolveContacts(plus)).toEqual([{ id: 'plus', dx: 3.5, dy: 16, wireConnectable: true, breadboardInsertable: false }])
    expect(resolveContacts(minus)).toEqual([{ id: 'minus', dx: 3.5, dy: 34, wireConnectable: true, breadboardInsertable: false }])
    expect(getPinPresentationPosition(comp, plus)).toEqual({ x: 3.5, y: 16 })
    expect(getPinPresentationPosition(comp, minus)).toEqual({ x: 3.5, y: 34 })
  })

  it('SERVO : contact implicite en pin.dx/dy, wireConnectable:true, breadboardInsertable:false (drapeau pin-level)', () => {
    const comp = { uid: 's', type: 'SERVO', x: 0, y: 0 }
    for (const pin of getComponentDef('SERVO').pins) {
      expect(resolveContacts(pin)).toEqual([{ id: pin.id, dx: pin.dx, dy: pin.dy, wireConnectable: true, breadboardInsertable: false }])
      expect(getPinPresentationPosition(comp, pin)).toEqual(getPinPosition(comp, pin))
    }
  })
})

describe('FT-B-001-S4 — TEST S4-K/N : matrice API PhysicalContact du catalogue', () => {
  const CATALOGUE = [
    'BATTERY_9V', 'BATTERY_AA', 'COIN_CELL_CR2032',
    'LED', 'RESISTOR', 'ARDUINO', 'BUTTON', 'BUTTON_LATCHING', 'POWER', 'CAPACITOR',
    'BUZZER', 'POTENTIOMETER', 'LDR', 'THERMISTOR', 'DIODE', 'RGB_LED', 'NPN_TRANSISTOR', 'PNP_TRANSISTOR', 'NMOS', 'PMOS', 'VOLTAGE_REGULATOR', 'RELAY',
    'SERVO', 'DC_MOTOR', 'POLARIZED_CAPACITOR', 'SLIDE_SWITCH', 'DIP_SWITCH', 'VIBRATION_MOTOR',
    'LIGHT_BULB', 'HOBBY_GEARMOTOR', 'TMP36', 'FORCE_SENSOR', 'FLEX_SENSOR', 'SOIL_MOISTURE_SENSOR',
    'PIR_MOTION_SENSOR', 'TILT_SENSOR', 'IR_RECEIVER', 'HC_SR04', 'INDUCTOR', 'ZENER_DIODE', 'H_BRIDGE', 'AND_GATE', 'OR_GATE',
  ]

  it('le catalogue compte exactement 43 types', () => {
    // A3-SW2 : 21 -> 22 (DIP_SWITCH ajouté). A6-OUT1 : 22 -> 23 (VIBRATION_MOTOR ajouté).
    // A6-OUT2 : 23 -> 24 (LIGHT_BULB ajouté). A6-OUT3 : 24 -> 25 (HOBBY_GEARMOTOR ajouté).
    // A7-C1 : 25 -> 26 (TMP36 ajouté). A7-C2 : 26 -> 28 (FORCE_SENSOR + FLEX_SENSOR ajoutés).
    // A7-C3 : 28 -> 29 (SOIL_MOISTURE_SENSOR ajouté). A7-C4-PIR : 29 -> 30
    // (PIR_MOTION_SENSOR ajouté). A7-C4-TILT : 30 -> 31 (TILT_SENSOR ajouté).
    // A7-C4-IR : 31 -> 32 (IR_RECEIVER ajouté). A7-C5 : 32 -> 33 (HC_SR04 ajouté).
    // A4-INDUCTOR : 33 -> 34 (INDUCTOR ajouté).
    expect(new Set(CATALOGUE).size).toBe(43)
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
        expect(resolveWireConnectableContacts(pin).length).toBeLessThanOrEqual(contacts.length)
        expect(resolveBreadboardInsertableContacts(pin).length).toBeLessThanOrEqual(contacts.length)
        const dflt = resolveContact(pin, undefined)
        expect(dflt).not.toBeNull()
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

  it('Autres types : exactement 1 contact physique par pin (hors GND de H_BRIDGE)', () => {
    for (const type of CATALOGUE.filter((t) => t !== 'BUTTON' && t !== 'BUTTON_LATCHING')) {
      for (const pin of getComponentDef(type).pins) {
        // A8-H-BRIDGE : L293D DIP-16, les 4 broches physiques GND sont 4 contacts du pin electrique GND.
        const expected = type === 'H_BRIDGE' && pin.id === 'GND' ? 4 : 1
        expect(resolveContacts(pin)).toHaveLength(expected)
      }
    }
  })

  it('classification breadboardInsertable finale S5 : 29 enfichables / 8 non-directs', () => {
    const INSERTABLE = ['RESISTOR', 'LED', 'DIODE', 'CAPACITOR', 'LDR', 'THERMISTOR',
      'POTENTIOMETER', 'BUTTON', 'BUTTON_LATCHING', 'NPN_TRANSISTOR', 'RGB_LED', 'BUZZER',
      'POLARIZED_CAPACITOR',
      // A3-SW3 : géométrie prouvée compatible BREADBOARD_PITCH=12 (cf.
      // breadboardSwitchFit.test.js) -> breadboardInsertable:true.
      'SLIDE_SWITCH', 'DIP_SWITCH',
      // A6-OUT1-R1 : géométrie prouvée compatible BREADBOARD_PITCH=12
      // (entraxe 24 = 2×12, cf. vibrationMotorA6Out1R1.test.js) -> breadboardInsertable:true.
      'VIBRATION_MOTOR',
      // A6-OUT2 : même géométrie compatible BREADBOARD_PITCH=12 (entraxe
      // 24 = 2×12, cf. lightBulbA6Out2.test.jsx) -> breadboardInsertable:true.
      'LIGHT_BULB',
      // A7-C1 : 3 PhysicalContacts entraxe 12 = 1×BREADBOARD_PITCH exact
      // entre contacts adjacents (cf. tmp36A7C1.test.js) -> breadboardInsertable:true.
      'TMP36',
      // A7-C2-R1/A7-C2-R2 : correctifs CSA successifs (Founder Canvas Gate
      // FAIL sur le physical fit) — PhysicalContacts fonctionnels recalés
      // FLEX_SENSOR A(30,180)/B(42,180), FORCE_SENSOR A(30,132)/B(42,132),
      // entraxe 12 = 1×BREADBOARD_PITCH exact chacun (cf.
      // forceFlexSensorA7C2.test.js) -> breadboardInsertable:true. Racines
      // mécaniques mesurées du raster INCHANGÉES (cf. assemblyProfiles.js).
      'FLEX_SENSOR', 'FORCE_SENSOR',
      // A7-C3 : 4 PhysicalContacts entraxe 12 = 1×BREADBOARD_PITCH exact
      // entre chaque paire adjacente (cf. soilMoistureSensorA7C3.test.js) ->
      // breadboardInsertable:true.
      'SOIL_MOISTURE_SENSOR',
      // A7-C4-PIR : 3 PhysicalContacts entraxe 12 = 1×BREADBOARD_PITCH exact
      // entre chaque paire adjacente (cf. pirMotionSensorA7C4.test.js) ->
      // breadboardInsertable:true.
      'PIR_MOTION_SENSOR',
      // A7-C4-TILT : 2 PhysicalContacts entraxe 12 = 1×BREADBOARD_PITCH exact
      // (deux trous adjacents, cf. tiltSensorA7C4.test.js) -> breadboardInsertable:true.
      'TILT_SENSOR',
      // A7-C4-IR : 3 PhysicalContacts entraxe 12 = 1×BREADBOARD_PITCH exact
      // entre chaque paire adjacente (cf. irReceiverA7C4.test.js) ->
      // breadboardInsertable:true.
      'IR_RECEIVER',
      // A7-C5 : 4 PhysicalContacts entraxe 12 = 1×BREADBOARD_PITCH exact
      // entre chaque paire adjacente (cf. hcSr04A7C5.test.js) ->
      // breadboardInsertable:true.
      'HC_SR04',
      // A4-INDUCTOR : 2 PhysicalContacts entraxe 120 = 10×BREADBOARD_PITCH
      // exact (cf. inductorA4.test.js) -> breadboardInsertable:true.
            'INDUCTOR',
      // A5-ZENER_DIODE : 2 PhysicalContacts A/K, entraxe 144 = 12×BREADBOARD_PITCH
      // exact -> breadboardInsertable:true.
      'ZENER_DIODE', 'PNP_TRANSISTOR', 'NMOS', 'PMOS', 'RELAY', 'VOLTAGE_REGULATOR', 'H_BRIDGE', 'AND_GATE', 'OR_GATE']
    // A6-OUT1-R1 : VIBRATION_MOTOR quitte NON_DIRECT (rejoint INSERTABLE ci-dessus).
    // A6-OUT3 : HOBBY_GEARMOTOR ajouté à NON_DIRECT — wire-only par contrat
    // produit (jamais de géométrie breadboard recherchée, cf.
    // componentDefinitions.js), comme DC_MOTOR.
    // A7-C2 : FORCE_SENSOR et FLEX_SENSOR avaient initialement rejoint
    // NON_DIRECT (wire-only, même précédent que HOBBY_GEARMOTOR) mais
    // A7-C2-R1 (FLEX_SENSOR) puis A7-C2-R2 (FORCE_SENSOR) les en ont
    // retirés tour à tour (rejoignent INSERTABLE ci-dessus).
    const NON_DIRECT = ['ARDUINO', 'POWER', 'DC_MOTOR', 'SERVO', 'BATTERY_9V', 'BATTERY_AA', 'COIN_CELL_CR2032', 'HOBBY_GEARMOTOR']
    expect([...INSERTABLE, ...NON_DIRECT].sort()).toEqual([...CATALOGUE].sort())

    const insertableContactCount = (type) =>
      getComponentDef(type).pins.reduce((n, pin) => n + resolveBreadboardInsertableContacts(pin).length, 0)

    for (const type of INSERTABLE) {
      expect(insertableContactCount(type), `${type} doit être enfichable`).toBeGreaterThan(0)
    }
    for (const type of NON_DIRECT) {
      expect(insertableContactCount(type), `${type} ne doit PAS être enfichable directement`).toBe(0)
    }
    for (const type of CATALOGUE) {
      const wc = getComponentDef(type).pins.reduce((n, pin) => n + resolveWireConnectableContacts(pin).length, 0)
      expect(wc, `${type} doit être câblable`).toBeGreaterThan(0)
    }
  })
})
