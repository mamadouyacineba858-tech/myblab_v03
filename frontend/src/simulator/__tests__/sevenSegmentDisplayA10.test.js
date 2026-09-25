import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSegmentedDisplayContract, getSegmentedDisplayState, resolveSegmentStates } from '../segmentedDisplay.js'
import { getCanonicalEntry, getAllCanonicalTypes } from '../canonicalRegistry.js'
import { isSimulationModelAvailable } from '../simulationRegistry.js'
import { hasDcContribution } from '../dcContributionRegistry.js'
import { prepareCircuit } from '../preparation.js'
import { resolveSignals } from '../resolution.js'
import { Signal } from '../signals.js'
import { createComponent, getComponentDef, PALETTE_ITEMS } from '../../config/componentDefinitions.js'
import { resolveContacts } from '../../utils/contactModel.js'
import { getVisualState, hasVisualStateResolver } from '../../visualization/visualStateRegistry.js'
import '../../visualization/defaultVisualStateRegistrations.js'

/**
 * A10-DISP1 — Kingbright SC56-11EWA : contrat segmenté déclaratif (pin -> segment + règle
 * cathode commune), électrique (consommateur, deux broches COM = un seul nœud) et Visual State.
 */

const TYPE = 'SEVEN_SEGMENT_DISPLAY'
const here = dirname(fileURLToPath(import.meta.url))
const src = (...p) => readFileSync(resolve(here, '../..', ...p), 'utf8')
const { HIGH, LOW, UNKNOWN, FLOATING } = Signal
const SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'DP']
// Pinout CSA LOCKED : broche physique -> fonction.
const PINOUT = { 1: 'e', 2: 'd', 3: 'COM', 4: 'c', 5: 'DP', 6: 'b', 7: 'a', 8: 'COM', 9: 'f', 10: 'g' }

const uid = 'u7'
/** pinSignals minimal : segments listés HIGH, les autres LOW, COM au niveau demandé. */
function signals(lit, common = LOW, uidValue = uid) {
  const map = new Map([[`${uidValue}:COM`, common]])
  for (const s of SEGMENTS) map.set(`${uidValue}:${s}`, lit.includes(s) ? HIGH : LOW)
  return map
}
const litOf = (state) => SEGMENTS.filter((s) => state[s] === true)
const state = (map) => getSegmentedDisplayState(TYPE, uid, map)

describe('A10-DISP1 — contrat segmenté déclaratif', () => {
  const contract = getSegmentedDisplayContract(TYPE)

  it('1. pinMap exact (segment -> pin électrique -> broche physique CSA LOCKED)', () => {
    expect(Object.keys(contract.segments)).toEqual(SEGMENTS)
    for (const [id, def] of Object.entries(contract.segments)) {
      expect(def.pin).toBe(id)
      expect(PINOUT[def.physicalPin]).toBe(id)
    }
    expect(Object.fromEntries(Object.entries(contract.segments).map(([id, d]) => [id, d.physicalPin])))
      .toEqual({ a: '7', b: '6', c: '4', d: '2', e: '1', f: '9', g: '10', DP: '5' })
    expect(contract.reference).toBe('Kingbright SC56-11EWA')
  })

  it('2. topology = common-cathode', () => {
    expect(contract.topology).toBe('common-cathode')
  })

  it('3. commun = un seul pin électrique COM, broches physiques 3 et 8', () => {
    expect(contract.common).toEqual({ pin: 'COM', physicalPins: ['3', '8'] })
    expect(PINOUT[3]).toBe('COM')
    expect(PINOUT[8]).toBe('COM')
  })

  it('4. 8 segments indépendants : 8 pins distincts, aucun partagé avec le commun', () => {
    const pins = Object.values(contract.segments).map((d) => d.pin)
    expect(new Set(pins).size).toBe(8)
    expect(pins).not.toContain(contract.common.pin)
    for (const s of SEGMENTS) expect(litOf(state(signals([s])))).toEqual([s])
  })

  it('contrat gelé ; type inconnu -> null ; ne contient aucune notion de chiffre', () => {
    expect(Object.isFrozen(contract)).toBe(true)
    expect(Object.isFrozen(contract.segments)).toBe(true)
    expect(Object.isFrozen(contract.segments.a)).toBe(true)
    expect(Object.isFrozen(contract.common.physicalPins)).toBe(true)
    expect(getSegmentedDisplayContract('LED')).toBeNull()
    expect(getSegmentedDisplayContract(undefined)).toBeNull()
    expect(JSON.stringify(contract)).not.toMatch(/digit|glyph|font/i)
  })
})

describe('A10-DISP1 — règle d\'activation cathode commune', () => {
  it('5. aucun segment actif sans condition commune valide (COM UNKNOWN / FLOATING / HIGH / absent)', () => {
    for (const common of [UNKNOWN, FLOATING, HIGH]) {
      expect(litOf(state(signals(SEGMENTS, common))), common).toEqual([])
    }
    const absent = signals(SEGMENTS)
    absent.delete(`${uid}:COM`)
    expect(litOf(state(absent))).toEqual([])
  })

  it('preuve qu\'un HIGH naïf ne suffit pas : tous les segments HIGH mais COM non ramené à LOW -> tout éteint', () => {
    const map = signals(SEGMENTS, UNKNOWN)
    expect(SEGMENTS.every((s) => map.get(`${uid}:${s}`) === HIGH)).toBe(true)
    expect(litOf(state(map))).toEqual([])
    map.set(`${uid}:COM`, LOW)
    expect(litOf(state(map))).toEqual(SEGMENTS)
  })

  it('segment non polarisé en direct (LOW / FLOATING / UNKNOWN) avec COM LOW -> éteint', () => {
    for (const level of [LOW, FLOATING, UNKNOWN]) {
      const map = signals([], LOW)
      map.set(`${uid}:a`, level)
      expect(state(map).a, level).toBe(false)
    }
  })

  it('6. activation de a seule', () => {
    expect(state(signals(['a']))).toEqual({ a: true, b: false, c: false, d: false, e: false, f: false, g: false, DP: false })
  })

  it('7. activation de DP seule', () => {
    expect(litOf(state(signals(['DP'])))).toEqual(['DP'])
  })

  it('8. activation simultanée de plusieurs segments', () => {
    expect(litOf(state(signals(['a', 'c', 'DP'])))).toEqual(['a', 'c', 'DP'])
    expect(litOf(state(signals(SEGMENTS)))).toEqual(SEGMENTS)
  })

  it.each([
    ['9. motif "0"', ['a', 'b', 'c', 'd', 'e', 'f']],
    ['10. motif "1"', ['b', 'c']],
    ['motif "2"', ['a', 'b', 'd', 'e', 'g']],
    ['motif "3"', ['a', 'b', 'c', 'd', 'g']],
    ['11. motif arbitraire non numérique a+f+g+e+d', ['a', 'd', 'e', 'f', 'g']],
  ])('%s -> exactement les segments pilotés', (_, lit) => {
    expect(litOf(state(signals(lit)))).toEqual(SEGMENTS.filter((s) => lit.includes(s)))
  })

  it('12. aucun état métier `digit` : sortie = exactement un booléen par segment', () => {
    const out = state(signals(['a', 'b', 'c', 'd', 'e', 'f']))
    expect(Object.keys(out)).toEqual(SEGMENTS)
    expect(Object.values(out).every((v) => typeof v === 'boolean')).toBe(true)
    expect(out).not.toHaveProperty('digit')
    expect(Object.isFrozen(out)).toBe(true)
    expect(src('simulator', 'segmentedDisplay.js')).not.toMatch(/\bdigit\s*[:=]/)
  })

  it('état invalide / incomplet -> tout éteint, jamais d\'exception', () => {
    const allOff = Object.fromEntries(SEGMENTS.map((s) => [s, false]))
    for (const bad of [undefined, null, {}, [], 'x', new Map()]) {
      expect(state(bad)).toEqual(allOff)
    }
    expect(getSegmentedDisplayState('LED', uid, signals(SEGMENTS))).toEqual({})
    expect(resolveSegmentStates(null, uid, signals(SEGMENTS))).toEqual({})
    const unknownTopology = { ...getSegmentedDisplayContract(TYPE), topology: 'common-anode' }
    expect(litOf(resolveSegmentStates(unknownTopology, uid, signals(SEGMENTS)))).toEqual([])
  })

  it('isolation par uid : les signaux d\'un autre afficheur ne pilotent jamais celui-ci', () => {
    expect(litOf(state(signals(SEGMENTS, LOW, 'other')))).toEqual([])
  })
})

describe('A10-DISP1 — canonique / catalogue', () => {
  const ELECTRICAL = ['e', 'd', 'COM', 'c', 'DP', 'b', 'a', 'f', 'g']

  it('type canonique unique, consommateur sans modèle (patron LED / RGB_LED)', () => {
    expect(getAllCanonicalTypes().filter((t) => t === TYPE)).toHaveLength(1)
    const entry = getCanonicalEntry(TYPE)
    expect(entry).toMatchObject({ type: TYPE, modelAvailable: false, parameterSchema: null, defaultParameters: null, capabilities: null, internalConnections: null })
    expect(isSimulationModelAvailable(TYPE)).toBe(false)
    expect(hasDcContribution(TYPE)).toBe(false)
    expect(getCanonicalEntry('RGB_LED')).toMatchObject({ modelAvailable: false, capabilities: null })
  })

  it('9 pins électriques en ordre de broches physiques, rôles segments input / COM ground (vocabulaire RGB_LED)', () => {
    const entry = getCanonicalEntry(TYPE)
    expect(entry.pins.map((p) => p.id)).toEqual(ELECTRICAL)
    for (const pin of entry.pins) expect(pin.role).toBe(pin.id === 'COM' ? 'ground' : 'input')
    expect(getComponentDef(TYPE).pins.map((p) => p.id)).toEqual(ELECTRICAL)
  })

  it('COM porte les deux PhysicalContacts distincts COM3 / COM8 ; aucun pin COM3/COM8 électrique', () => {
    const def = getComponentDef(TYPE)
    const com = def.pins.find((p) => p.id === 'COM')
    expect(resolveContacts(com).map((c) => [c.id, c.dx, c.dy])).toEqual([['COM3', 36, 93], ['COM8', 36, 21]])
    expect(def.pins.filter((p) => p.id.startsWith('COM'))).toHaveLength(1)
    expect(def.pins.flatMap(resolveContacts)).toHaveLength(10)
  })

  it('libellé, dimensions, palette, instance sans état métier', () => {
    const def = getComponentDef(TYPE)
    expect(def).toMatchObject({ id: TYPE, label: '7-Segment Display SC56-11EWA', width: 72, height: 114 })
    expect(PALETTE_ITEMS.filter((p) => p.id === TYPE)).toHaveLength(1)
    const component = createComponent(TYPE, 10, 20)
    expect(component).toMatchObject({ type: TYPE, x: 10, y: 20, pins: def.pins })
    expect(component).not.toHaveProperty('state')
    expect(component).not.toHaveProperty('digit')
    expect(component).not.toHaveProperty('channelStates')
  })
})

describe('A10-DISP1 — résolution électrique réelle (Document plat -> resolveSignals -> contrat)', () => {
  // POWER 5V -> RESISTOR -> segment ; commun ramené (ou non) au GND de la source.
  const components = [
    { uid: 'p', type: 'POWER', x: 0, y: 0 },
    { uid: 'r1', type: 'RESISTOR', x: 0, y: 0 },
    { uid: 'r2', type: 'RESISTOR', x: 0, y: 0 },
    { uid: 'd', type: TYPE, x: 0, y: 0 },
  ]
  const drive = (segmentA, segmentB) => [
    { fromUid: 'p', fromPin: '5V', toUid: 'r1', toPin: 'A' },
    { fromUid: 'r1', fromPin: 'B', toUid: 'd', toPin: segmentA },
    { fromUid: 'p', fromPin: '5V', toUid: 'r2', toPin: 'A' },
    { fromUid: 'r2', fromPin: 'B', toUid: 'd', toPin: segmentB },
  ]
  const run = (wires) => {
    const { pinSignals } = resolveSignals(components, prepareCircuit(components, wires))
    return { pinSignals, lit: litOf(getSegmentedDisplayState(TYPE, 'd', pinSignals)) }
  }

  it('source -> R -> segments b et c, COM -> GND : "1" allumé', () => {
    const { pinSignals, lit } = run([...drive('b', 'c'), { fromUid: 'p', fromPin: 'GND', toUid: 'd', toPin: 'COM' }])
    expect(pinSignals.get('d:b')).toBe(HIGH)
    expect(pinSignals.get('d:COM')).toBe(LOW)
    expect(lit).toEqual(['b', 'c'])
  })

  it('commun déconnecté : les anodes restent HIGH mais aucun segment ne s\'allume', () => {
    const { pinSignals, lit } = run(drive('b', 'c'))
    expect(pinSignals.get('d:b')).toBe(HIGH)
    expect(pinSignals.get('d:c')).toBe(HIGH)
    expect(pinSignals.get('d:COM')).toBe(UNKNOWN)
    expect(lit).toEqual([])
  })

  it('commun ramené au +5V (condition commune invalide) : aucun segment', () => {
    const { lit } = run([...drive('b', 'c'), { fromUid: 'p', fromPin: '5V', toUid: 'd', toPin: 'COM' }])
    expect(lit).toEqual([])
  })

  it('le composant ne produit aucun signal : sans source, toutes ses pins restent UNKNOWN', () => {
    const alone = [{ uid: 'd', type: TYPE, x: 0, y: 0 }]
    const { pinSignals } = resolveSignals(alone, prepareCircuit(alone, []))
    expect(['e', 'd', 'COM', 'c', 'DP', 'b', 'a', 'f', 'g'].map((p) => pinSignals.get(`d:${p}`)).every((s) => s === UNKNOWN)).toBe(true)
  })
})

describe('A10-DISP1 — Visual State Registry', () => {
  const vs = (map) => getVisualState(TYPE, { uid, pinSignals: map })

  it('resolver enregistré pour le type', () => {
    expect(hasVisualStateResolver(TYPE)).toBe(true)
  })

  it('OFF -> aucun segment lumineux', () => {
    expect(litOf(vs(signals([], LOW)).segments)).toEqual([])
    expect(litOf(vs(signals(SEGMENTS, UNKNOWN)).segments)).toEqual([])
  })

  it('segment a -> uniquement a ; DP -> uniquement DP ; plusieurs segments', () => {
    expect(litOf(vs(signals(['a'])).segments)).toEqual(['a'])
    expect(litOf(vs(signals(['DP'])).segments)).toEqual(['DP'])
    expect(litOf(vs(signals(['b', 'c', 'g'])).segments)).toEqual(['b', 'c', 'g'])
  })

  it('changement de pinSignals -> changement de visual state (projection pure, sans mémoire)', () => {
    const map = signals(['a'])
    expect(litOf(vs(map).segments)).toEqual(['a'])
    map.set(`${uid}:a`, LOW)
    map.set(`${uid}:g`, HIGH)
    expect(litOf(vs(map).segments)).toEqual(['g'])
    map.set(`${uid}:COM`, FLOATING)
    expect(litOf(vs(map).segments)).toEqual([])
  })

  it('état invalide / incomplet -> tous les segments éteints, jamais d\'exception', () => {
    for (const ctx of [{}, { uid }, { uid, pinSignals: null }, { pinSignals: signals(SEGMENTS) }]) {
      const out = getVisualState(TYPE, ctx)
      expect(Object.keys(out)).toEqual(['segments'])
      expect(litOf(out.segments)).toEqual([])
    }
  })

  it('le resolver ne produit que { segments } — aucune clé digit', () => {
    const out = vs(signals(['a', 'b', 'c', 'd', 'e', 'f']))
    expect(Object.keys(out)).toEqual(['segments'])
    expect(out).not.toHaveProperty('digit')
  })
})
