/**
 * Breadboard.test.jsx — MB-BREADBOARD-002 (Blueprint §8, AC-18), étendu par
 * MB-BREADBOARD-003 (Blueprint §5, AC-08/AC-09, UI-01).
 *
 * Rendu isolé : Breadboard.jsx ne consomme aucun contexte (props pures
 * `breadboard`/`components`/`breadboardFeedback`), même précédent de style
 * que WiresLayer.test.jsx pour l'import React explicite (jsdom secondaire).
 *
 * Couvre : absence de rendu sans breadboard (TB-14/TB-15, non-régression
 * visuelle), présence de la grille de trous dérivée de holeAt() (AC-02/AC-03,
 * pas de logique de bande dupliquée), distinction rail/strip, la mise en
 * évidence "occupé" purement géométrique (une pin de composant coïncidant
 * avec un trou) — AC-18 : aucune seconde source de vérité électrique, donc
 * aucune assertion ici ne dépend de deriveBreadboardVirtualWires() — et,
 * depuis MB-BREADBOARD-003, le feedback vert/rouge du composant en cours de
 * drag (`breadboardFeedback`, prop nouvelle).
 */
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Breadboard } from '../Breadboard.jsx'

const BREADBOARD = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

describe('MB-BREADBOARD-002 — Breadboard.jsx (Presentation, AC-18/LOCK-08)', () => {
  it("ne rend rien si document.breadboard est null (TB-14/TB-15)", () => {
    const { container } = render(<Breadboard breadboard={null} components={[]} />)
    expect(container.querySelector('svg.breadboard')).toBe(null)
  })

  it('rend une grille de trous dès que breadboard est posé, sans composant', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    const svg = container.querySelector('svg.breadboard')
    expect(svg).not.toBe(null)

    const holes = container.querySelectorAll('.breadboard__hole')
    // 30 colonnes x 14 rangées valides (2 rails haut + 5 strip haut + 2 rails
    // bas + 5 strip bas) = 420 ; aucune assertion sur les rangées elles-mêmes
    // (rainure/interstices) — uniquement sur ce que holeAt() retourne.
    expect(holes.length).toBe(420)

    // Aucun trou n'est occupé en l'absence de tout composant.
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })

  it('distingue visuellement les rails (2 rangées x 30 colonnes en haut, autant en bas) des strips', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    const railHoles = container.querySelectorAll('.breadboard__hole--rail')
    expect(railHoles.length).toBe(4 * 30)
    expect(container.querySelectorAll('.breadboard__hole').length - railHoles.length).toBe(10 * 30)
  })

  it("met en évidence un trou coïncidant avec la pin d'un composant (coïncidence géométrique point-à-point, pas une union de connectivité)", () => {
    // RESISTOR.B (dx:84,dy:14 — MB-BREADBOARD-003, corrigé depuis dx:90 ; x
    // décalé de +6 en conséquence) à x=-24,y=22 -> position absolue (60,36)
    // -> colonne 5, rangée 3 (strip haut) — même fixture que
    // breadboardMeasurementIntegration.test.js.
    const r1 = { uid: 'r1', type: 'RESISTOR', x: -24, y: 22 }
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[r1]} />)

    const occupied = container.querySelectorAll('.breadboard__hole--occupied')
    // Deux pins (A et B) de r1 : seule B (84,14) tombe exactement sur un trou
    // valide à cette position ; A (0,14) -> (-24,36) est hors grille (colonne
    // négative), donc un seul trou occupé est attendu.
    expect(occupied.length).toBe(1)
  })

  it("ne met en évidence aucun trou si aucune pin de composant ne coïncide avec la grille", () => {
    // Position volontairement décalée d'une fraction de pas : ne tombe sur
    // aucun trou valide (hors tolérance d'insertion, cf. breadboardGeometry.js).
    const offComponent = { uid: 'r1', type: 'RESISTOR', x: 1000, y: 1000 }
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[offComponent]} />)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })
})

describe('MB-BREADBOARD-003 — feedback vert/rouge pendant le drag (Blueprint §5, AC-08/AC-09)', () => {
  const r1 = { uid: 'r1', type: 'RESISTOR', x: -24, y: 22 } // pin B -> col5,row3 (voir ci-dessus)

  it('colore en vert (feedback-valid) le trou du composant en cours de drag quand breadboardFeedback.valid est true', () => {
    const breadboardFeedback = { draggedIds: new Set(['r1']), valid: true }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[r1]} breadboardFeedback={breadboardFeedback} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(1)
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(0)
    // Le feedback remplace la classe "occupé" neutre pour CE trou (une seule
    // classe de mise en évidence par trou).
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })

  it('colore en rouge (feedback-invalid) le trou du composant en cours de drag quand breadboardFeedback.valid est false', () => {
    const breadboardFeedback = { draggedIds: new Set(['r1']), valid: false }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[r1]} breadboardFeedback={breadboardFeedback} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(1)
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(0)
  })

  it("ne colore pas en feedback un trou occupé par un composant qui n'est PAS en cours de drag", () => {
    const breadboardFeedback = { draggedIds: new Set(['un-autre-composant']), valid: false }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[r1]} breadboardFeedback={breadboardFeedback} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(0)
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(0)
    // Le trou reste occupé (neutre) — comportement MB-BREADBOARD-002 inchangé.
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(1)
  })

  it("breadboardFeedback absent (undefined) — comportement identique à MB-BREADBOARD-002 (non-régression)", () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[r1]} />)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(1)
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(0)
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(0)
  })
})
