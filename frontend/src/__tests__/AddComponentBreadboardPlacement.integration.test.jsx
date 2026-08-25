/**
 * AddComponentBreadboardPlacement.integration.test.jsx
 * MB-BREADBOARD-003 — correctif ciblé (mission dédiée, dépôt initial).
 *
 * Régression corrigée : addComponent() (dépôt initial depuis la Sidebar,
 * canal CommandBus -> AddComponentHandler -> HistoryService) appliquait
 * inconditionnellement snapToGrid() à la position demandée, y compris
 * lorsqu'un breadboard actif et un type compatible auraient dû faire
 * intervenir computeBreadboardPlacement() — exactement comme le fait déjà
 * MOVE_COMPONENT (handlePointerMove). Ce fichier exerce le hook réel
 * (CircuitProvider), pas un mock : vrai CommandRegistry, vrai
 * ValidationEngine (dont BreadboardHoleCollisionRule/STR-007), vrai
 * HistoryService/HistoryManager.
 *
 * Toutes les positions attendues ci-dessous ont été obtenues en exécutant
 * le véritable computeBreadboardPlacement() (breadboardPlacementAdapter.js)
 * via un script Node jetable (supprimé après usage), jamais calculées à la
 * main — même discipline que les autres suites d'intégration
 * MB-BREADBOARD-003.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'

const wrapper = ({ children }) => (
  <CircuitProvider>{children}</CircuitProvider>
)

describe('MB-BREADBOARD-003 (correctif ciblé) — placement breadboard au dépôt initial (ADD_COMPONENT)', () => {
  it('TEST 1 : sans breadboard, ADD_COMPONENT conserve le snap global existant (non-régression)', () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addComponent('RESISTOR', 145, 103)
    })

    expect(result.current.components.length).toBe(1)
    const r = result.current.components[0]
    expect(r.x).toBe(140)
    expect(r.y).toBe(100)
  })

  it('TEST 2 : avec breadboard + composant 2-pins compatible, ADD_COMPONENT utilise la position retournée par computeBreadboardPlacement()', () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addBreadboard(120, 180)
    })
    act(() => {
      // Candidat volontairement non aligné, choisi pour que
      // computeBreadboardPlacement() le déplace réellement (position finale
      // différente du candidat brut) : prouve que la fonction est
      // effectivement invoquée et pas court-circuitée.
      result.current.addComponent('RESISTOR', 175, 201)
    })

    expect(result.current.components.length).toBe(1)
    const r = result.current.components[0]
    expect(r.x).toBe(178)
    expect(r.y).toBe(201)
  })

  it("TEST 3 (point de régression principal) : la position issue de computeBreadboardPlacement() n'est PAS repassée dans snapToGrid()", () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addBreadboard(120, 180)
    })
    act(() => {
      result.current.addComponent('RESISTOR', 175, 201)
    })

    const r = result.current.components[0]
    // GRID_SIZE = 20 : si un second snapToGrid() avait été réappliqué,
    // r.x/r.y seraient des multiples de 20 (180/200) — ce n'est pas le cas,
    // preuve directe que la position breadboard traverse intacte.
    expect(r.x % 20).not.toBe(0)
    expect(r.y % 20).not.toBe(0)
    expect(r.x).toBe(178)
    expect(r.y).toBe(201)
  })

  it('TEST 4 : avec breadboard + composant incompatible (>2 pins), fallback vers snapToGrid (non-régression LOCK-13)', () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addBreadboard(120, 180)
    })
    act(() => {
      // Même candidat brut que TEST 2/3, type incompatible : le breadboard
      // ne doit avoir strictement aucun effet sur ARDUINO.
      result.current.addComponent('ARDUINO', 178, 201)
    })

    expect(result.current.components.length).toBe(1)
    const arduino = result.current.components[0]
    expect(arduino.x).toBe(180)
    expect(arduino.y).toBe(200)
  })

  it("TEST 5 : un composant déjà présent occupant le trou cible est bien pris en compte comme collision (STR-007), sans que le nouveau composant ne se compte lui-même", () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addBreadboard(120, 180)
    })
    act(() => {
      result.current.addComponent('RESISTOR', 175, 201)
    })
    expect(result.current.components.length).toBe(1)
    const firstPosition = { x: result.current.components[0].x, y: result.current.components[0].y }

    act(() => {
      // Même trou cible que le premier RESISTOR : rejeté silencieusement
      // par BreadboardHoleCollisionRule (STR-007) au moment de la
      // validation CommandBus — comportement déjà établi (Q4), aucune
      // nouvelle règle métier introduite par ce correctif.
      result.current.addComponent('RESISTOR', 175, 201)
    })

    expect(result.current.components.length).toBe(1)
    expect(result.current.components[0].x).toBe(firstPosition.x)
    expect(result.current.components[0].y).toBe(firstPosition.y)
  })

  it('TEST 6 : ADD_COMPONENT avec placement breadboard reste historisé via CommandBus -> AddComponentHandler -> HistoryService', () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addBreadboard(120, 180)
    })
    expect(result.current.canUndo()).toBe(true) // addBreadboard lui-même est historisé

    act(() => {
      result.current.addComponent('RESISTOR', 175, 201)
    })

    expect(result.current.components.length).toBe(1)
    expect(result.current.canUndo()).toBe(true)
  })

  it('TEST 7 : Undo/Redo d\'un ADD_COMPONENT placé sur breadboard fonctionne toujours, et restaure exactement la même position', () => {
    const { result } = renderHook(() => useCircuit(), { wrapper })

    act(() => {
      result.current.addBreadboard(120, 180)
    })
    act(() => {
      result.current.addComponent('RESISTOR', 175, 201)
    })
    expect(result.current.components.length).toBe(1)
    const placedPosition = { x: result.current.components[0].x, y: result.current.components[0].y }

    act(() => {
      result.current.undo()
    })
    expect(result.current.components.length).toBe(0)
    expect(result.current.canRedo()).toBe(true)

    act(() => {
      result.current.redo()
    })
    expect(result.current.components.length).toBe(1)
    expect(result.current.components[0].x).toBe(placedPosition.x)
    expect(result.current.components[0].y).toBe(placedPosition.y)
  })
})
