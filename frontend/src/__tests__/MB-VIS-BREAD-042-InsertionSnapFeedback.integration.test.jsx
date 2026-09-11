/**
 * MB-VIS-BREAD-042-InsertionSnapFeedback.integration.test.jsx
 *
 * MB-VIS-BREAD-042 — "Breadboard : Physical Insertion, Snap & Feedback
 * Qualification" (Blueprint CSA, base verrouillée d06015e).
 *
 * Étend la couverture MB-BREADBOARD-008 déjà présente dans
 * BreadboardInsertionMutationChannel.integration.test.jsx (aperçu Sidebar de
 * base : valid/invalid, nettoyage, garde défensive) SANS la dupliquer.
 * Preuve via le hook réel (CircuitProvider, vrai CommandRegistry, vrai
 * ValidationEngine, vrai CommandBus) — aucun mock du Document/du moteur de
 * placement. Même patron de conversion client->document que
 * BreadboardInsertionMutationChannel.integration.test.jsx :
 * `x = clientX - GRID_SIZE*2 (40)`, `y = clientY - GRID_SIZE (20)`
 * (updateSidebarComponentDragPosition, useCircuitState.js), canvasRef sans
 * position CSS sous jsdom (getBoundingClientRect -> 0), zoom=1 par défaut.
 *
 * Toutes les positions/trous attendus ci-dessous ont été obtenus en exécutant
 * les véritables computeBreadboardPlacement()/computeMultiBreadboardPlacement()
 * (breadboardPlacementAdapter.js/breadboardAssociation.js, tous deux LOCKED,
 * non modifiés par ce ticket) via un script Node jetable (supprimé après
 * usage) — jamais calculées à la main, même discipline que
 * breadboardPlacementAdapter.test.js/AddComponentBreadboardPlacement.
 * integration.test.jsx.
 *
 * Couverture blueprint (§14) :
 *   T1  aperçu Sidebar sans mutation Document.
 *   T2  breadboardId correct dans l'aperçu.
 *   T3  position d'aperçu === position finale au drop.
 *   T4  collision -> aperçu invalide + drop ne persiste rien.
 *   T5  endSidebarComponentDrag nettoie `type`/`position` (pas seulement holes/valid).
 *   T6  RESISTOR — 2 contacts enfichables, tous résolus.
 *   T7  LED — 2 contacts enfichables, tous résolus.
 *   T8  POTENTIOMETER — 3 contacts enfichables, tous résolus (générique, aucun `type ===`).
 *   T9  BUTTON — 4 contacts physiques enfichables, tous résolus.
 *   T10 composant wire-only (POWER) — aucun faux snap, aucun aperçu publié.
 *   T11 breadboard A -> B : l'aperçu bascule au bon `breadboardId` (D1), même session de drag.
 *   T12 collision sur A n'interdit pas le même trou LOCAL sur B (isolation inter-breadboard).
 *   T15 drop invalide (collision) : aucune entrée d'historique créée.
 */

import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CircuitProvider } from '../context/CircuitContext.jsx'
import { useCircuit } from '../context/useCircuit.js'
import { useCircuitInteraction } from '../context/useCircuitInteraction.js'

function renderWithCanvas() {
  const canvasRef = React.createRef()
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasRef}>
      <div ref={(node) => { canvasRef.current = node }}>{children}</div>
    </CircuitProvider>
  )
  return renderHook(() => ({ ...useCircuit(), ...useCircuitInteraction() }), { wrapper })
}

describe('MB-VIS-BREAD-042 — contrat enrichi de breadboardInsertPreview (type + position, INV-042-02/03)', () => {
  it('T1/T2/T3 — aperçu Sidebar : aucune mutation Document, breadboardId correct, position identique au drop', () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    const bb = result.current.breadboards[0]

    act(() => { result.current.startSidebarComponentDrag('RESISTOR') })
    act(() => { result.current.updateSidebarComponentDragPosition(98, 41) })

    const preview = result.current.breadboardInsertPreview
    expect(preview).not.toBe(null)
    expect(preview.type).toBe('RESISTOR')
    expect(preview.breadboardId).toBe(bb.id)
    expect(preview.valid).toBe(true)
    expect(preview.position).toEqual({ x: 58, y: 21 })
    // T1 : aucune mutation pendant le simple survol (INV-042-01).
    expect(result.current.components.length).toBe(0)

    // T3 : le drop réel (SimulationCanvas.jsx handleDrop) applique EXACTEMENT
    // `preview.position` via addComponent() — reproduit ici sans DOM drop
    // natif (non simulable fidèlement sous jsdom, même limite documentée dans
    // BreadboardInsertionMutationChannel.integration.test.jsx).
    act(() => {
      result.current.addComponent(preview.type, preview.position.x, preview.position.y)
      result.current.endSidebarComponentDrag()
    })
    expect(result.current.components.length).toBe(1)
    expect(result.current.components[0].x).toBe(preview.position.x)
    expect(result.current.components[0].y).toBe(preview.position.y)
  })

  it('T4/T15 — collision : aperçu invalide, le drop ne persiste rien et ne crée aucune entrée d\'historique', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      // Occupe déjà col5/row3 + col12/row3.
      result.current.addComponent('RESISTOR', 58, 21)
    })
    const undoCountBefore = result.current.getUndoCount()

    act(() => { result.current.startSidebarComponentDrag('RESISTOR') })
    act(() => { result.current.updateSidebarComponentDragPosition(98, 41) })

    const preview = result.current.breadboardInsertPreview
    expect(preview.valid).toBe(false)
    expect(preview.position).toEqual({ x: 58, y: 21 })

    // Le drop réel dispatche quand même ADD_COMPONENT (comportement existant,
    // non modifié par ce ticket) — c'est BreadboardHoleCollisionRule (STR-007,
    // ValidationEngine) qui rejette silencieusement la commande AVANT
    // exécution (§9 AddComponentBreadboardPlacement.integration.test.jsx
    // TEST 5, LOCKED, non dupliqué ici) : aucune mutation, aucun historique.
    act(() => {
      result.current.addComponent(preview.type, preview.position.x, preview.position.y)
      result.current.endSidebarComponentDrag()
    })

    expect(result.current.components.length).toBe(1) // toujours le seul RESISTOR déjà posé
    expect(result.current.getUndoCount()).toBe(undoCountBefore)
  })

  it("T5 — endSidebarComponentDrag nettoie intégralement l'aperçu (type/position inclus, pas seulement holes/valid — I-P10)", () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    act(() => { result.current.startSidebarComponentDrag('RESISTOR') })
    act(() => { result.current.updateSidebarComponentDragPosition(98, 41) })
    expect(result.current.breadboardInsertPreview).not.toBe(null)

    act(() => { result.current.endSidebarComponentDrag() })
    expect(result.current.breadboardInsertPreview).toBe(null)
  })

  it('T6 — RESISTOR : 2 contacts enfichables, tous résolus', () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    act(() => { result.current.startSidebarComponentDrag('RESISTOR') })
    act(() => { result.current.updateSidebarComponentDragPosition(98, 41) })

    const preview = result.current.breadboardInsertPreview
    expect(preview.valid).toBe(true)
    expect(preview.holes.length).toBe(2)
    expect(preview.holes).toEqual([
      { column: 5, row: 3 },
      { column: 12, row: 3 },
    ])
  })

  it('T7 — LED : 2 contacts enfichables, tous résolus', () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    act(() => { result.current.startSidebarComponentDrag('LED') })
    // Candidat document (5,5) -> clientX=45, clientY=25 (écart de pins LED
    // 24 = 2*pitch, cf. breadboardPlacementAdapter.test.js).
    act(() => { result.current.updateSidebarComponentDragPosition(45, 25) })

    const preview = result.current.breadboardInsertPreview
    expect(preview.type).toBe('LED')
    expect(preview.valid).toBe(true)
    expect(preview.position).toEqual({ x: 6, y: 8 })
    expect(preview.holes.length).toBe(2)
  })

  it('T8 — POTENTIOMETER : 3 contacts physiques enfichables, tous résolus (générique, aucun `type ===`)', () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    act(() => { result.current.startSidebarComponentDrag('POTENTIOMETER') })
    // Candidat document (40,20) -> clientX=80, clientY=40.
    act(() => { result.current.updateSidebarComponentDragPosition(80, 40) })

    const preview = result.current.breadboardInsertPreview
    expect(preview.type).toBe('POTENTIOMETER')
    expect(preview.valid).toBe(true)
    expect(preview.position).toEqual({ x: 38, y: 22 })
    expect(preview.holes.length).toBe(3)
    expect(new Set(preview.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(3)
  })

  it('T9 — BUTTON : 4 contacts physiques enfichables, tous résolus (générique, aucun `type ===`)', () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    act(() => { result.current.startSidebarComponentDrag('BUTTON') })
    act(() => { result.current.updateSidebarComponentDragPosition(80, 40) })

    const preview = result.current.breadboardInsertPreview
    expect(preview.type).toBe('BUTTON')
    expect(preview.valid).toBe(true)
    expect(preview.position).toEqual({ x: 36, y: 12 })
    expect(preview.holes.length).toBe(4)
    expect(new Set(preview.holes.map((h) => `${h.column}:${h.row}`)).size).toBe(4)
  })

  it("T10 — POWER (wire-only, [FT-B-001-S5]) : aucun aperçu publié, aucun faux snap du corps sur le breadboard", () => {
    const { result } = renderWithCanvas()
    act(() => { result.current.addBreadboard(0, 0) })
    act(() => { result.current.startSidebarComponentDrag('POWER') })
    act(() => { result.current.updateSidebarComponentDragPosition(80, 40) })

    expect(result.current.breadboardInsertPreview).toBe(null)
  })

  it('T11 — multi-breadboard : la même session de drag bascule proprement son aperçu de A vers B (D1)', () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      // 1200 = 100*BREADBOARD_PITCH (12) — déjà un multiple exact, aucun
      // snap silencieux par AddBreadboardHandler (snapToBreadboardPitch)
      // qui déplacerait B d'un pas imprévu et casserait le delta ci-dessous.
      result.current.addBreadboard(1200, 1200)
    })
    const [bbA, bbB] = result.current.breadboards

    act(() => { result.current.startSidebarComponentDrag('RESISTOR') })

    // Survol de A.
    act(() => { result.current.updateSidebarComponentDragPosition(98, 41) })
    expect(result.current.breadboardInsertPreview.breadboardId).toBe(bbA.id)
    expect(result.current.breadboardInsertPreview.position).toEqual({ x: 58, y: 21 })

    // Déplacement vers B, TOUJOURS dans la même session de drag (aucun
    // startSidebarComponentDrag/endSidebarComponentDrag intermédiaire) —
    // reproduit un survol continu Sidebar -> A -> B.
    act(() => { result.current.updateSidebarComponentDragPosition(1298, 1241) })
    expect(result.current.breadboardInsertPreview.breadboardId).toBe(bbB.id)
    expect(result.current.breadboardInsertPreview.position).toEqual({ x: 1258, y: 1221 })
    expect(result.current.breadboardInsertPreview.valid).toBe(true)
  })

  it("T12 — une collision physique sur A n'interdit pas le même trou LOCAL sur B (isolation inter-breadboard, I-C1/I-C2)", () => {
    const { result } = renderWithCanvas()
    act(() => {
      result.current.addBreadboard(0, 0)
      result.current.addBreadboard(1200, 1200)
      // Occupe col5/row3 + col12/row3 de A (RESISTOR réel).
      result.current.addComponent('RESISTOR', 58, 21)
    })
    const [, bbB] = result.current.breadboards

    act(() => { result.current.startSidebarComponentDrag('RESISTOR') })
    // Survol du trou LOCAL équivalent (col5/row3 + col12/row3) mais sur B —
    // aucune occupation de B : doit rester valide.
    act(() => { result.current.updateSidebarComponentDragPosition(1298, 1241) })

    const preview = result.current.breadboardInsertPreview
    expect(preview.breadboardId).toBe(bbB.id)
    expect(preview.valid).toBe(true)
    expect(preview.position).toEqual({ x: 1258, y: 1221 })
  })
})
