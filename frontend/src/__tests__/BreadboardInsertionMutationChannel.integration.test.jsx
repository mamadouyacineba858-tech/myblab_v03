/**
 * BreadboardInsertionMutationChannel.integration.test.jsx — MB-BREADBOARD-003
 * (Blueprint §3/§8/§9 ; UI-04/05/06/08/10/11/12/13).
 *
 * Preuve end-to-end via le hook réel (CircuitProvider, VRAI CommandRegistry
 * de production, VRAI ValidationEngine, VRAI flux pointer — startDrag/
 * window pointermove/window pointerup) : aucun Document construit à la
 * main, aucun mock. Même patron que MoveComponentMutationChannel.integration.
 * test.jsx (canvasRef réel attaché à un noeud DOM — startDrag est un no-op
 * sans canvasRef).
 *
 * Scénario mandaté (CSA FINAL RULING MB-BREADBOARD-003, "PREUVE CANVAS
 * OBLIGATOIRE") : POWER.5V --wire--> RESISTOR.A ; RESISTOR.B <-> LED.anode
 * UNIQUEMENT via le breadboard (aucun wire explicite entre elles, comme
 * breadboardSimulationIntegration.test.js/MB-BREADBOARD-002, mais ici la
 * jonction est atteinte par une INSERTION INTERACTIVE réelle, pas par un
 * Document pré-construit) ; LED.cathode --wire--> POWER.GND. Couvre
 * placement/snapping/insertion/occupation/nets/simulation (TEST 1),
 * retrait/rupture (TEST 2), réinsertion/reconstruction (TEST 3), et le
 * rejet silencieux d'une insertion invalide par collision (TEST 4, LOCK-12/
 * AC-11/AC-12, arbitrage Q4 du Blueprint §0).
 *
 * Bus breadboard : deriveBreadboardVirtualWires() groupe par COLONNE (pas
 * par trou exact) — RESISTOR.B et LED.anode occupent donc deux trous
 * DISTINCTS de la même colonne (même strip haut, lignes 3-7), ce qui les
 * connecte électriquement SANS collision physique (LOCK-12 : collision =
 * même trou EXACT, pas même colonne).
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { getLedState } from '../simulator/engine.js'

function renderWithCanvas() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => useCircuit(), { wrapper })
}

// Même patron que MoveComponentMutationChannel.integration.test.jsx : le
// noeud canvas de test n'a pas de position CSS (getBoundingClientRect ->
// tout à zéro sous jsdom), donc la coordonnée canvas d'un pointeur est
// directement son clientX/clientY.
let _result = null
function lastResult() {
  return _result.current
}

function pointerDown(component) {
  const pointerDownEvent = {
    button: 0,
    clientX: component.x + 10,
    clientY: component.y + 10,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
  act(() => {
    lastResult().startDrag(pointerDownEvent, component.uid)
  })
}

function pointerMove(component, { dx, dy = 0 }) {
  const pointerMoveEvent = new PointerEvent('pointermove', {
    clientX: component.x + 10 + dx,
    clientY: component.y + 10 + dy,
  })
  act(() => {
    window.dispatchEvent(pointerMoveEvent)
  })
}

function drag(component, { dx, dy = 0 }) {
  pointerDown(component)
  pointerMove(component, { dx, dy })
}

function pointerUp() {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup'))
  })
}

/**
 * Assemble le circuit de base (breadboard posé + POWER/RESISTOR/LED câblés
 * pour tout SAUF la jonction RESISTOR.B<->LED.anode, laissée à la charge du
 * breadboard) sur un hook fraîchement rendu. Les deux composants 2-pins
 * sont placés hors de l'empreinte du breadboard au départ — l'insertion
 * elle-même est ce que chaque test exerce ensuite via un drag réel.
 */
function setupBaseCircuit(result) {
  act(() => {
    result.current.addBreadboard(0, 0)
    result.current.addComponent('POWER', 700, 200)
    result.current.addComponent('RESISTOR', 500, 500)
    result.current.addComponent('LED', 700, 500)
  })
  const power = result.current.components.find((c) => c.type === 'POWER')
  const resistor = result.current.components.find((c) => c.type === 'RESISTOR')
  const led = result.current.components.find((c) => c.type === 'LED')

  act(() => {
    result.current.addWire(power.uid, '5V', resistor.uid, 'A')
    result.current.addWire(led.uid, 'cathode', power.uid, 'GND')
  })

  expect(result.current.breadboard).not.toBe(null)
  return { power, resistor, led }
}

function isLedOn(result, ledUid) {
  const pinSignals = result.current.pinSignals
  return getLedState(ledUid, pinSignals).on
}

describe('MB-BREADBOARD-003 — insertion interactive réelle sur breadboard (UI-04/05/06/08/10/11/12/13)', () => {
  it('TEST 1 (placement/snapping/insertion/occupation/nets/simulation) : le drag aligne RESISTOR et LED sur des trous valides, le bus breadboard connecte RESISTOR.B<->LED.anode SANS wire explicite, et la LED s\'allume', () => {
    const { result } = renderWithCanvas()
    _result = result
    const { resistor, led } = setupBaseCircuit(result)

    // --- Insertion de la résistance : proche d'une position déjà valide
    // (voir breadboardPlacementAdapter.test.js, même fixture) ; A -> col5/
    // row3, B -> col12/row3.
    drag(resistor, { dx: 58 - resistor.x, dy: 21 - resistor.y })
    pointerUp()

    const resistorAfter = result.current.components.find((c) => c.uid === resistor.uid)
    expect(resistorAfter.x).toBe(58)
    expect(resistorAfter.y).toBe(21)

    // --- Insertion de la LED : anode ciblée sur la MÊME colonne que
    // RESISTOR.B (col12) mais une rangée différente (row4, PAS row3) — même
    // bus électrique, aucune collision physique (LOCK-12 : trou EXACT).
    drag(led, { dx: 144 - led.x, dy: 28 - led.y })
    pointerUp()

    const ledAfter = result.current.components.find((c) => c.uid === led.uid)
    // Position déterministe (voir breadboardPlacementAdapter.test.js) : le
    // point de recherche le plus proche de (144,28) qui résout les DEUX
    // pins est (146,28).
    expect(ledAfter.x).toBe(146)
    expect(ledAfter.y).toBe(28)

    // Occupation dérivée de la position (LOCK-02/07) — aucun wire explicite
    // RESISTOR.B<->LED.anode n'a été ajouté (setupBaseCircuit ne câble que
    // POWER<->RESISTOR.A et LED.cathode<->POWER.GND).
    expect(
      result.current.wires.some(
        (w) =>
          (w.fromUid === resistorAfter.uid && w.toUid === ledAfter.uid) ||
          (w.fromUid === ledAfter.uid && w.toUid === resistorAfter.uid)
      )
    ).toBe(false)

    // --- Simulation : la jonction breadboard suffit à fermer le circuit.
    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, led.uid)).toBe(true)
  })

  it('TEST 2 (retrait/rupture, LOCK-07) : retirer la LED du breadboard casse la connexion — la LED s\'éteint', () => {
    const { result } = renderWithCanvas()
    _result = result
    const { resistor, led } = setupBaseCircuit(result)

    drag(resistor, { dx: 58 - resistor.x, dy: 21 - resistor.y })
    pointerUp()
    let current = result.current.components.find((c) => c.uid === led.uid)
    drag(current, { dx: 144 - current.x, dy: 28 - current.y })
    pointerUp()

    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, led.uid)).toBe(true)

    // Retrait : déplacement de la LED loin du breadboard (hors empreinte).
    current = result.current.components.find((c) => c.uid === led.uid)
    drag(current, { dx: 700 - current.x, dy: 500 - current.y })
    pointerUp()

    const ledAfterRemoval = result.current.components.find((c) => c.uid === led.uid)
    expect(ledAfterRemoval.x).toBe(700)
    expect(ledAfterRemoval.y).toBe(500)

    // Reconstruction fraîche (LOCK-07) : la connectivité breadboard est
    // recalculée à partir des positions actuelles, pas d'un état mis en
    // cache — la LED redevient éteinte.
    expect(isLedOn(result, led.uid)).toBe(false)
  })

  it('TEST 3 (réinsertion/reconstruction, LOCK-07) : réinsérer la LED au même endroit rétablit la connexion — la LED se rallume, position déterministe', () => {
    const { result } = renderWithCanvas()
    _result = result
    const { resistor, led } = setupBaseCircuit(result)

    drag(resistor, { dx: 58 - resistor.x, dy: 21 - resistor.y })
    pointerUp()
    let current = result.current.components.find((c) => c.uid === led.uid)
    drag(current, { dx: 144 - current.x, dy: 28 - current.y })
    pointerUp()

    // Retrait.
    current = result.current.components.find((c) => c.uid === led.uid)
    drag(current, { dx: 700 - current.x, dy: 500 - current.y })
    pointerUp()
    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, led.uid)).toBe(false)

    // Réinsertion : même trajectoire qu'à la première insertion (TEST 1).
    current = result.current.components.find((c) => c.uid === led.uid)
    drag(current, { dx: 144 - current.x, dy: 28 - current.y })
    pointerUp()

    const ledAfter = result.current.components.find((c) => c.uid === led.uid)
    // Résultat identique et déterministe à la première insertion.
    expect(ledAfter.x).toBe(146)
    expect(ledAfter.y).toBe(28)
    expect(isLedOn(result, led.uid)).toBe(true)
  })

  it("TEST 4 (rejet silencieux d'une collision, LOCK-12/AC-11/AC-12, arbitrage Q4) : insérer un second composant sur un trou déjà occupé ne mute PAS le Document (position d'origine préservée, aucune entrée d'historique)", () => {
    const { result } = renderWithCanvas()
    _result = result
    const { resistor } = setupBaseCircuit(result)

    drag(resistor, { dx: 58 - resistor.x, dy: 21 - resistor.y })
    pointerUp()
    const resistorAfter = result.current.components.find((c) => c.uid === resistor.uid)
    expect(resistorAfter.x).toBe(58)
    expect(resistorAfter.y).toBe(21)

    act(() => {
      result.current.addComponent('RESISTOR', 900, 900)
    })
    const r2 = result.current.components.find((c) => c.type === 'RESISTOR' && c.uid !== resistor.uid)
    const undoCountBefore = result.current.getUndoCount()

    // Cible : le même trou (col5/row3) que RESISTOR.A déjà posé — collision
    // physique exacte (STR-007, BreadboardHoleCollisionRule).
    drag(r2, { dx: 58 - r2.x, dy: 21 - r2.y })
    pointerUp()

    const r2After = result.current.components.find((c) => c.uid === r2.uid)
    // AUCUNE mutation : la commande MOVE_COMPONENT a été rejetée en
    // pré-exécution par CommandBus.dispatch() (ADR-010) — le composant
    // reste exactement à sa position d'avant ce drag (retour silencieux,
    // Q4 — aucun mécanisme de message n'existe dans ce dépôt).
    expect(r2After.x).toBe(r2.x)
    expect(r2After.y).toBe(r2.y)
    expect(result.current.getUndoCount()).toBe(undoCountBefore)

    // Le premier RESISTOR, lui, est resté strictement inchangé (aucun effet
    // de bord d'une commande rejetée sur le reste du Document).
    const resistorStillThere = result.current.components.find((c) => c.uid === resistor.uid)
    expect(resistorStillThere.x).toBe(58)
    expect(resistorStillThere.y).toBe(21)
  })

  it('TEST 5 (non-régression, LOCK-13/AC-20) : un composant de type incompatible (>2 pins) traversant l\'empreinte du breadboard garde le snap-to-grid habituel', () => {
    const { result } = renderWithCanvas()
    _result = result
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addComponent('ARDUINO', 500, 500)
    })
    const arduino = result.current.components[0]

    // Cible à l'intérieur de l'empreinte du breadboard.
    drag(arduino, { dx: 60 - arduino.x, dy: 22 - arduino.y })
    pointerUp()

    const after = result.current.components.find((c) => c.uid === arduino.uid)
    // Comportement GRID_SIZE inchangé : aucune tentative d'alignement
    // breadboard pour un type incompatible (Blueprint §2 étape 1).
    expect(after.x % 20).toBe(0)
    expect(after.y % 20).toBe(0)
  })

  it("TEST 6 (BB-TEST-11, LOCK-05/06/07) : pointermove au-dessus d'un trou valide ne mute PAS le Document réel — seul pointerup persiste", () => {
    const { result } = renderWithCanvas()
    _result = result
    const { resistor } = setupBaseCircuit(result)
    const undoCountBefore = result.current.getUndoCount()

    pointerDown(resistor)
    pointerMove(resistor, { dx: 58 - resistor.x, dy: 21 - resistor.y })

    // Toujours en cours de drag (pointerup non déclenché) : le Document RÉEL
    // (exportCircuit -> safeComponents — même patron que MoveComponentMutation
    // Channel.integration.test.jsx TEST 8, JAMAIS componentsForRender/preview)
    // est STRICTEMENT inchangé, malgré un feedback breadboard actif (preuve
    // que le placement calculé n'est qu'un aperçu local).
    const realDuring = result.current.exportCircuit().components.find((c) => c.uid === resistor.uid)
    expect(realDuring.x).toBe(resistor.x)
    expect(realDuring.y).toBe(resistor.y)
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
    expect(result.current.breadboardFeedback).not.toBe(null)
    expect(result.current.breadboardFeedback.draggedIds.has(resistor.uid)).toBe(true)

    // L'aperçu affiché (components -> componentsForRender), lui, a bien
    // bougé — sinon le feedback visuel n'aurait aucun sens.
    const previewDuring = result.current.components.find((c) => c.uid === resistor.uid)
    expect(previewDuring.x).toBe(58)
    expect(previewDuring.y).toBe(21)

    pointerUp()

    // Seul le relâchement persiste effectivement la position calculée dans
    // le Document réel.
    const realAfter = result.current.exportCircuit().components.find((c) => c.uid === resistor.uid)
    expect(realAfter.x).toBe(58)
    expect(realAfter.y).toBe(21)
    expect(result.current.getUndoCount()).toBe(undoCountBefore + 1)
  })

  it('TEST 7 (BB-TEST-13, AC-17/AC-18) : supprimer un composant posé sur breadboard (pas un simple déplacement) libère son trou pour une insertion suivante', () => {
    const { result } = renderWithCanvas()
    _result = result
    const { power, resistor, led } = setupBaseCircuit(result)

    drag(resistor, { dx: 58 - resistor.x, dy: 21 - resistor.y })
    pointerUp()
    drag(led, { dx: 144 - led.x, dy: 28 - led.y })
    pointerUp()

    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, led.uid)).toBe(true)

    // Suppression réelle (pas un déplacement hors empreinte) — canal
    // deleteComponent(), distinct de la voie "retrait par drag" déjà
    // couverte par TEST 2.
    act(() => {
      result.current.deleteComponent(led.uid)
    })
    expect(result.current.components.some((c) => c.uid === led.uid)).toBe(false)
    // Aucun wire résiduel ne référence le composant supprimé.
    expect(
      result.current.wires.some((w) => w.fromUid === led.uid || w.toUid === led.uid)
    ).toBe(false)

    // Le trou (col12/row4, absolu (146,28)) est maintenant libre : un
    // nouveau composant 2-pins peut s'y insérer sans collision (AC-17).
    act(() => {
      result.current.addComponent('LED', 700, 700)
    })
    const newLed = result.current.components.find((c) => c.type === 'LED')
    drag(newLed, { dx: 144 - newLed.x, dy: 28 - newLed.y })
    pointerUp()

    const newLedAfter = result.current.components.find((c) => c.uid === newLed.uid)
    // Même position déterministe que l'insertion originale de la LED
    // supprimée (TEST 1/3) — preuve directe que le trou n'est plus occupé.
    expect(newLedAfter.x).toBe(146)
    expect(newLedAfter.y).toBe(28)

    // Reconnexion explicite cathode->GND (setupBaseCircuit ne câblait que la
    // LED d'origine, maintenant supprimée) — la jonction anode<->RESISTOR.B
    // reste, elle, entièrement portée par le breadboard (LOCK-01 de ce test).
    act(() => {
      result.current.addWire(newLed.uid, 'cathode', power.uid, 'GND')
    })

    // La simulation reste cohérente (aucun état électrique fantôme) : la
    // nouvelle LED, reconnectée au même bus breadboard, s'allume à son tour.
    act(() => {
      result.current.startSimulation()
    })
    expect(isLedOn(result, newLed.uid)).toBe(true)
  })
})
