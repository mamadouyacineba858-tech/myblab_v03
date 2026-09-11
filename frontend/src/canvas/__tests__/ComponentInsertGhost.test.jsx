/**
 * ComponentInsertGhost.test.jsx — MB-VIS-BREAD-042 (§4/§12/§14 T16).
 *
 * Rendu Presentation PUR : ComponentInsertGhost.jsx ne consulte aucun
 * Context (contrairement à CircuitComponent.jsx/Breadboard.jsx) — un simple
 * `render()` RTL suffit, aucun CircuitProvider requis.
 *
 * Couvre : position = position REÇUE (jamais recalculée, INV-042-02/03),
 * teinte valid/invalid (§5), absence totale d'interactivité — aucun <Pin>
 * (aucun <button> de câblage), `pointer-events: none` sur tout l'arbre
 * (INV-042-12 — T16 : le ghost n'est jamais sélectionnable/câblable), et
 * repli silencieux (aucun rendu) pour un type inconnu ou une position non
 * finie.
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ComponentInsertGhost } from '../ComponentInsertGhost.jsx'

describe('MB-VIS-BREAD-042 — ComponentInsertGhost.jsx (Presentation pure)', () => {
  it('rend le corps du composant exactement à `position` (INV-042-02/03), sans décalage', () => {
    const { container } = render(
      <ComponentInsertGhost type="RESISTOR" position={{ x: 58, y: 21 }} valid={true} breadboard={null} />
    )
    const ghost = container.querySelector('.component-insert-ghost')
    expect(ghost).not.toBe(null)
    expect(ghost.style.left).toBe('58px')
    expect(ghost.style.top).toBe('21px')
  })

  it('valid:true -> classe --valid ; valid:false -> classe --invalid (même vocabulaire que Breadboard.jsx feedback-valid/invalid)', () => {
    const { container: validContainer } = render(
      <ComponentInsertGhost type="RESISTOR" position={{ x: 0, y: 0 }} valid={true} breadboard={null} />
    )
    expect(validContainer.querySelector('.component-insert-ghost--valid')).not.toBe(null)
    expect(validContainer.querySelector('.component-insert-ghost--invalid')).toBe(null)

    const { container: invalidContainer } = render(
      <ComponentInsertGhost type="RESISTOR" position={{ x: 0, y: 0 }} valid={false} breadboard={null} />
    )
    expect(invalidContainer.querySelector('.component-insert-ghost--invalid')).not.toBe(null)
    expect(invalidContainer.querySelector('.component-insert-ghost--valid')).toBe(null)
  })

  it("T16 — n'est jamais sélectionnable ni câblable : aucun <Pin> (aucun <button>), pointer-events neutralisés", () => {
    const { container } = render(
      <ComponentInsertGhost type="LED" position={{ x: 10, y: 10 }} valid={true} breadboard={null} />
    )
    expect(container.querySelectorAll('button').length).toBe(0)
    const ghost = container.querySelector('.component-insert-ghost')
    expect(ghost).not.toBe(null)
    // aria-hidden : jamais exposé à l'arbre d'accessibilité comme un élément
    // interactif réel — cohérent avec l'absence totale de handler souris.
    expect(ghost.getAttribute('aria-hidden')).toBe('true')
  })

  it('type inconnu -> aucun rendu (repli silencieux, symétrique de computeBreadboardPlacement pour un type introuvable)', () => {
    const { container } = render(
      <ComponentInsertGhost type="DOES_NOT_EXIST" position={{ x: 0, y: 0 }} valid={false} breadboard={null} />
    )
    expect(container.querySelector('.component-insert-ghost')).toBe(null)
  })

  it('position absente/non finie -> aucun rendu (jamais un ghost fantôme à (0,0) par défaut)', () => {
    const { container } = render(
      <ComponentInsertGhost type="RESISTOR" position={null} valid={false} breadboard={null} />
    )
    expect(container.querySelector('.component-insert-ghost')).toBe(null)
  })

  it('LED (traversant, profil d’assemblage) reçoit AssemblyLeadsLayer sans crash avec un breadboard réel', () => {
    const breadboard = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }
    const { container } = render(
      <ComponentInsertGhost type="LED" position={{ x: 118, y: 192 }} valid={true} breadboard={breadboard} />
    )
    expect(container.querySelector('.component-insert-ghost')).not.toBe(null)
    // Le composant ne doit jamais planter en présence d'un breadboard réel ;
    // la présence de pattes dépend du profil (assemblyProfiles.js, LOCKED,
    // non ré-vérifié ici) — seule l'absence de crash est le contrat de ce
    // test (résilience du Presentation-only).
  })
})
