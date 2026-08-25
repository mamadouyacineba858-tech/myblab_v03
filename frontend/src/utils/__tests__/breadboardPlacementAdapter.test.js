/**
 * breadboardPlacementAdapter.test.js — MB-BREADBOARD-003 (Blueprint §2/§8,
 * UI-02/03/07/09).
 *
 * Couvre computeBreadboardPlacement() : fonction pure, aucun mock
 * nécessaire (mêmes fixtures/breadboard que breadboardConnectivity.test.js/
 * Breadboard.test.jsx — MB-BREADBOARD-002).
 *
 * Inclut spécifiquement la preuve de la correction algorithmique disclosed
 * (voir en-tête de breadboardPlacementAdapter.js et Delivery Report
 * MB-BREADBOARD-003 §Déviations) : LED (écart de pins 80px, PAS un multiple
 * exact de BREADBOARD_PITCH=12) doit pouvoir atteindre valid:true — un
 * algorithme qui forcerait pins[0] à un résidu exactement nul échouerait
 * systématiquement pour ce type, ce qui aurait rendu impossible le scénario
 * de preuve Canvas obligatoire du ticket (§9, qui exige une LED insérée sur
 * breadboard).
 */
import { describe, it, expect } from 'vitest'
import { computeBreadboardPlacement } from '../breadboardPlacementAdapter.js'

const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

describe('computeBreadboardPlacement — repli (breadboardActive: false)', () => {
  it('sans breadboard, retourne candidatePosition inchangée (UI-... non-régression)', () => {
    const result = computeBreadboardPlacement(null, 'RESISTOR', { x: 60, y: 22 }, [])
    expect(result).toEqual({ breadboardActive: false, compatible: true, valid: false, position: { x: 60, y: 22 }, holes: [] })
  })

  it('pour un type incompatible (plus de 2 pins), même dans l’empreinte du breadboard', () => {
    const result = computeBreadboardPlacement(breadboard, 'ARDUINO', { x: 60, y: 22 }, [])
    expect(result.breadboardActive).toBe(false)
    expect(result.compatible).toBe(false)
    expect(result.valid).toBe(false)
    expect(result.position).toEqual({ x: 60, y: 22 })
    expect(result.holes).toEqual([])
  })

  it('hors de l’empreinte du breadboard, retourne candidatePosition inchangée', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 5000, y: 5000 }, [])
    expect(result).toEqual({ breadboardActive: false, compatible: true, valid: false, position: { x: 5000, y: 5000 }, holes: [] })
  })
})

describe('computeBreadboardPlacement — snapping RESISTOR (UI-02, écart dx 84 après correction §1)', () => {
  it('aligne les deux pins sur des trous valides quand candidatePosition est déjà proche', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.holes).toEqual([
      { pinId: 'A', column: 5, row: 3 },
      { pinId: 'B', column: 12, row: 3 },
    ])
  })

  it('déplace réellement candidatePosition vers la position valide la plus proche', () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 50, y: 18 }, [])
    expect(result.valid).toBe(true)
    expect(result.position).toEqual({ x: 50, y: 20 })
    expect(result.holes).toEqual([
      { pinId: 'A', column: 4, row: 3 },
      { pinId: 'B', column: 11, row: 3 },
    ])
  })
})

describe('computeBreadboardPlacement — snapping LED (UI-03, correction algorithmique disclosed)', () => {
  it('atteint valid:true pour LED malgré un écart de pins (80px) non multiple de BREADBOARD_PITCH', () => {
    const result = computeBreadboardPlacement(breadboard, 'LED', { x: 1, y: 15 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(true)
    expect(result.position).toEqual({ x: 2, y: 15 })
    expect(result.holes).toEqual([
      { pinId: 'anode', column: 0, row: 3 },
      { pinId: 'cathode', column: 7, row: 3 },
    ])
  })

  it("trouve une position valide même quand l'ancrage naïf (pins[0] à résidu 0) échouerait", () => {
    // x=60 place pins[0] (anode, dx:0) EXACTEMENT sur un trou (résidu 0) —
    // l'algorithme naïf du Blueprint §2 s'arrêterait là et échouerait (la
    // cathode, dx:80, ne résout alors aucun trou). La recherche généralisée
    // doit trouver une position valide proche malgré tout.
    const result = computeBreadboardPlacement(breadboard, 'LED', { x: 60, y: 15 }, [])
    expect(result.valid).toBe(true)
    expect(result.holes.every((h) => h.column !== null)).toBe(true)
  })
})

describe('computeBreadboardPlacement — collision (LOCK-12, UI-07/09)', () => {
  it("valid devient false si le trou cible est déjà occupé par un AUTRE composant", () => {
    const others = [{ uid: 'other', type: 'RESISTOR', x: 60, y: 22 }]
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, others)
    expect(result.breadboardActive).toBe(true)
    expect(result.valid).toBe(false)
    // La position/les trous restent renseignés (feedback rouge, AC-09) même
    // si invalide.
    expect(result.holes).toEqual([
      { pinId: 'A', column: 5, row: 3 },
      { pinId: 'B', column: 12, row: 3 },
    ])
  })

  it("n'est pas affecté par l'occupation du composant EN COURS de déplacement (déjà exclu par l'appelant)", () => {
    // otherComponents ne contient jamais le composant déplacé lui-même
    // (filtré par l'appelant, useCircuitState.js) — un tableau vide simule
    // ce cas : aucune collision avec soi-même.
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 58, y: 21 }, [])
    expect(result.valid).toBe(true)
  })
})

describe('computeBreadboardPlacement — hors limites de colonne (repli best-effort, AC-09)', () => {
  it("retourne valid:false avec des trous partiellement résolus quand une pin dépasserait la dernière colonne", () => {
    const result = computeBreadboardPlacement(breadboard, 'RESISTOR', { x: 336, y: 22 }, [])
    expect(result.breadboardActive).toBe(true)
    expect(result.compatible).toBe(true)
    expect(result.valid).toBe(false)
    expect(result.holes).toEqual([
      { pinId: 'A', column: 28, row: 3 },
      { pinId: 'B', column: null, row: null },
    ])
  })
})
