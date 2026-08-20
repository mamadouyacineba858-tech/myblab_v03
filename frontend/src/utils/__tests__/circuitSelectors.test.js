/**
 * circuitSelectors.test.js — MB-VIS-004.
 *
 * Couvre uniquement buildWirePaths, seule fonction modifiée par ce ticket
 * dans ce fichier (retrait du paramètre selectedWireId et du calcul de
 * couleur — géométrie pure désormais, cf. wirePath.js/WiresLayer.jsx pour
 * le nouveau calcul visuel centralisé). buildConnectedPinsSet et
 * wireAlreadyExists ne sont pas modifiées par ce ticket et ne sont donc pas
 * ajoutées ici (hors périmètre).
 */
import { describe, it, expect } from 'vitest'
import { buildWirePaths } from '../circuitSelectors.js'

const led = { uid: 'led-1', type: 'LED', x: 0, y: 0 }
const resistor = { uid: 'res-1', type: 'RESISTOR', x: 200, y: 0 }
const wire = { id: 'wire-1', fromUid: 'led-1', fromPin: 'anode', toUid: 'res-1', toPin: 'A' }

describe('MB-VIS-004 — buildWirePaths (géométrie pure)', () => {
  it('produit un objet {id, d} par wire valide, sans champ color', () => {
    const paths = buildWirePaths([led, resistor], [wire])
    expect(paths).toHaveLength(1)
    expect(paths[0].id).toBe('wire-1')
    expect(typeof paths[0].d).toBe('string')
    expect(paths[0].d.length).toBeGreaterThan(0)
    expect(paths[0]).not.toHaveProperty('color')
  })

  it('accepte un appel à deux arguments (sans selectedWireId, désormais retiré de la signature)', () => {
    expect(() => buildWirePaths([led, resistor], [wire])).not.toThrow()
  })

  it('ignore un wire référençant un composant introuvable', () => {
    const paths = buildWirePaths([led], [wire])
    expect(paths).toEqual([])
  })

  it('renvoie un tableau vide pour des entrées invalides', () => {
    expect(buildWirePaths(null, [wire])).toEqual([])
    expect(buildWirePaths([led, resistor], null)).toEqual([])
  })
})
