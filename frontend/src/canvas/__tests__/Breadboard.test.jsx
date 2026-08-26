/**
 * Breadboard.test.jsx — MB-BREADBOARD-002 (Blueprint §8, AC-18), étendu par
 * MB-BREADBOARD-003 (Blueprint §5, AC-08/AC-09, UI-01), puis par
 * MB-BREADBOARD-006 (CSA Ruling — Option B).
 *
 * Rendu géométrique isolé : la Presentation pure (grille de trous, feedback,
 * enrichissements visuels — `breadboard`/`components`/`breadboardFeedback`,
 * props) reste testée exactement comme avant ce ticket. SEULE différence
 * MB-BREADBOARD-006 : Breadboard.jsx consulte désormais useCircuit() pour la
 * sélection/le drag (selectOnly/isSelected/startBreadboardDrag) — même
 * convention que CircuitComponent.jsx, qui n'est pas non plus un composant
 * 100% props-driven pour l'interaction (cf. RealisticRenderers.test.jsx, qui
 * fournit déjà un CircuitProvider réel pour cette raison). Ici, un contexte
 * MINIMAL (CircuitContext.Provider avec de simples fakes, PAS un
 * CircuitProvider complet) suffit : ces tests ne portent que sur le rendu
 * géométrique, jamais sur la sélection/le drag eux-mêmes (couverts par
 * BreadboardMovementDeletion.integration.test.jsx, via le vrai
 * CircuitProvider/CommandBus).
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render as renderRTL } from '@testing-library/react'
import { Breadboard } from '../Breadboard.jsx'
import { CircuitContext } from '../../context/CircuitContext.js'

const BREADBOARD = { id: 'bb1', position: { x: 0, y: 0 }, layout: 'STANDARD_V1' }

// MB-BREADBOARD-006 : fakes minimaux — ces tests ne vérifient ni la
// sélection ni le drag (isSelected() renvoie toujours false : aucune
// assertion de ce fichier ne dépend de la classe --selected).
const minimalCircuitContext = {
  selectOnly: vi.fn(),
  isSelected: () => false,
  startBreadboardDrag: vi.fn(),
}

function render(ui) {
  return renderRTL(<CircuitContext.Provider value={minimalCircuitContext}>{ui}</CircuitContext.Provider>)
}

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

/**
 * MB-BREADBOARD-008 (CSA GO — "Native Breadboard Component Insertion", O5) :
 * `breadboardInsertPreview` — vert/rouge pour un composant qui N'EXISTE PAS
 * ENCORE dans `components` (drag HTML5 natif depuis la Sidebar, aucun uid).
 * Strictement additif : ces tests ne recouvrent aucune assertion du describe
 * précédent (breadboardFeedback, occupiedBy/draggedIds, inchangé).
 */
describe('MB-BREADBOARD-008 — aperçu de drop Sidebar (breadboardInsertPreview, O5)', () => {
  it('colore en vert (feedback-valid) les trous listés quand breadboardInsertPreview.valid est true, sans aucun composant présent', () => {
    const breadboardInsertPreview = { holes: [{ column: 5, row: 3 }, { column: 12, row: 3 }], valid: true }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[]} breadboardInsertPreview={breadboardInsertPreview} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(2)
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(0)
    // Aucun composant réel n'existe : ces trous ne sont pas dans occupiedBy,
    // donc jamais --occupied non plus (une seule classe de mise en évidence).
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })

  it('colore en rouge (feedback-invalid) les trous listés quand breadboardInsertPreview.valid est false', () => {
    const breadboardInsertPreview = { holes: [{ column: 5, row: 3 }], valid: false }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[]} breadboardInsertPreview={breadboardInsertPreview} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(1)
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(0)
  })

  it('breadboardInsertPreview absent (undefined/null) — aucun trou mis en évidence (non-régression)', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(0)
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(0)
  })

  it("breadboardFeedback (composant existant en cours de MOVE) et breadboardInsertPreview (drop Sidebar) sont strictement indépendants : l'un n'affecte jamais le rendu de l'autre", () => {
    const r1 = { uid: 'r1', type: 'RESISTOR', x: -24, y: 22 } // pin B -> col5,row3
    const breadboardFeedback = { draggedIds: new Set(['r1']), valid: true }
    const breadboardInsertPreview = { holes: [{ column: 19, row: 4 }], valid: false }
    const { container } = render(
      <Breadboard
        breadboard={BREADBOARD}
        components={[r1]}
        breadboardFeedback={breadboardFeedback}
        breadboardInsertPreview={breadboardInsertPreview}
      />
    )
    // r1 (via breadboardFeedback) reste vert ; le trou 19:4 (via
    // breadboardInsertPreview) est rouge — les deux mécanismes coexistent
    // sans interférence, chacun sur ses propres trous.
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(1)
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(1)
  })

  it('un trou déjà occupé par un composant existant et également listé par breadboardInsertPreview affiche le feedback de drop (occupancyClass reste une valeur unique)', () => {
    const r1 = { uid: 'r1', type: 'RESISTOR', x: -24, y: 22 } // pin B -> col5,row3
    const breadboardInsertPreview = { holes: [{ column: 5, row: 3 }], valid: false }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[r1]} breadboardInsertPreview={breadboardInsertPreview} />
    )
    expect(container.querySelectorAll('.breadboard__hole--feedback-invalid').length).toBe(1)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })
})

/**
 * MB-BREADBOARD-003 (Ticket "Assembly & Interaction V1", BB-TEST-03/04/05,
 * AC-01/AC-03/AC-04/AC-05) — enrichissements purement visuels : polarité
 * des rails, rainure centrale, séparateurs de groupes de 5. Aucune de ces
 * assertions ne porte sur holeAt()/breadboardGeometry.js (déjà couvert par
 * breadboardGeometry.test.js) : uniquement sur ce que Breadboard.jsx en
 * dérive pour la Presentation.
 */
describe('MB-BREADBOARD-003 — enrichissements visuels (AC-01/AC-03/AC-04/AC-05)', () => {
  it('BB-TEST-04 : les rails + et - portent des classes de polarité distinctes (30 trous chacune, haut + bas)', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    // 2 rangées "+" (haut + bas) x 30 colonnes, idem pour "-" (AC-05).
    expect(container.querySelectorAll('.breadboard__hole--rail-plus').length).toBe(2 * 30)
    expect(container.querySelectorAll('.breadboard__hole--rail-minus').length).toBe(2 * 30)
    // Chaque trou rail reste par ailleurs classé --rail (non-régression).
    expect(container.querySelectorAll('.breadboard__hole--rail').length).toBe(4 * 30)
  })

  it('BB-TEST-04 : une ligne de bus colorée est rendue pour chacune des 4 rangées de rail (2 "+", 2 "-")', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    expect(container.querySelectorAll('.breadboard__rail-line--plus').length).toBe(2)
    expect(container.querySelectorAll('.breadboard__rail-line--minus').length).toBe(2)
  })

  it('BB-TEST-05 : la rainure centrale est rendue comme un élément visuel unique et distinct des trous', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    const groove = container.querySelectorAll('.breadboard__groove')
    expect(groove.length).toBe(1)
    // La rainure ne doit jamais recouvrir la position d'un trou rendu
    // (LOCK-09) : aucun <circle class="breadboard__hole"> ne tombe dans la
    // bande [y, y+height] occupée par la rainure.
    const grooveY = Number(groove[0].getAttribute('y'))
    const grooveHeight = Number(groove[0].getAttribute('height'))
    const holeYs = [...container.querySelectorAll('.breadboard__hole')].map((el) =>
      Number(el.getAttribute('cy'))
    )
    expect(holeYs.every((y) => y <= grooveY || y >= grooveY + grooveHeight)).toBe(true)
  })

  it("BB-TEST-03 : des séparateurs de groupes de 5 sont rendus dans les deux blocs de strip (haut et bas), aucun dans les rails", () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[]} />)
    // 30 colonnes -> séparateurs après les colonnes 4,9,14,19,24 (5 par bloc).
    const dividers = container.querySelectorAll('.breadboard__group-divider')
    expect(dividers.length).toBe(5 * 2)
  })

  it('sans breadboard, aucun élément visuel enrichi (rainure/rails colorés/séparateurs) ne fuit dans le DOM', () => {
    const { container } = render(<Breadboard breadboard={null} components={[]} />)
    expect(container.querySelectorAll('.breadboard__groove').length).toBe(0)
    expect(container.querySelectorAll('.breadboard__rail-line').length).toBe(0)
    expect(container.querySelectorAll('.breadboard__group-divider').length).toBe(0)
  })
})

/**
 * MB-BREADBOARD-007 — "Vérité visuelle du bus Breadboard" (Ticket §4/§8/§9).
 * Distingue trois états mutuellement exclusifs : libre (aucune classe),
 * occupé mais isolé (--occupied, comportement MB-BREADBOARD-002 inchangé),
 * occupé ET membre d'un groupe électrique actif — ≥2 pins partageant le
 * même groupKey (--bus-active, nouveau). Dérivé exclusivement de holeAt()/
 * groupKey (breadboardGeometry.js, non modifié) — jamais une topologie
 * indépendante ; aucun appel à deriveBreadboardVirtualWires()
 * (breadboardConnectivity.js, non modifié, non appelé par Breadboard.jsx).
 */
describe('MB-BREADBOARD-007 — retour visuel du bus (groupKey actif, AC Ticket)', () => {
  // ra/rb : deux RESISTOR DISTINCTS dont les pins A (col5, rangées 3 et 4)
  // ET les pins B (col12, rangées 3 et 4) partagent chacun un groupKey de
  // strip (groupKey dépend uniquement de la colonne, pas de la rangée
  // exacte parmi les 5 d'un bloc — breadboardGeometry.js holeAt()) : 4 trous
  // occupés DISTINCTS, 2 groupes électriques actifs.
  const ra = { uid: 'ra', type: 'RESISTOR', x: 60, y: 22 } // A->col5/row3, B->col12/row3
  const rb = { uid: 'rb', type: 'RESISTOR', x: 60, y: 34 } // A->col5/row4, B->col12/row4 (mêmes groupKey que ra)
  // rc : RESISTOR isolé, ses deux groupes (col19, col26) n'ont qu'un seul
  // occupant chacun — doit rester --occupied, jamais --bus-active.
  const rc = { uid: 'rc', type: 'RESISTOR', x: 228, y: 22 } // A->col19/row3, B->col26/row3

  it('deux composants distincts partageant un groupKey de strip (colonnes identiques, rangées différentes) : les 4 trous occupés sont --bus-active', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[ra, rb]} />)
    expect(container.querySelectorAll('.breadboard__hole--bus-active').length).toBe(4)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })

  it('un composant isolé (aucun partenaire dans son groupKey) reste --occupied, jamais --bus-active', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[rc]} />)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(2)
    expect(container.querySelectorAll('.breadboard__hole--bus-active').length).toBe(0)
  })

  it('coexistence : groupes actifs et composant isolé conservent chacun leur classe propre, sans interférence', () => {
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[ra, rb, rc]} />)
    expect(container.querySelectorAll('.breadboard__hole--bus-active').length).toBe(4)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(2)
  })

  it("cas RAIL multi-colonnes (Ticket TEST A1/A4) : deux composants sur la MÊME rangée de rail, colonnes différentes, forment un groupe actif — le groupKey de rail ignore la colonne (holeAt())", () => {
    // ra2/rb2 : pin A sur la rangée de rail haut+ (row0) à des colonnes
    // différentes (2 et 10) ; pin B (dx84) retombe aussi sur row0 (même
    // rangée, RESISTOR ayant un dy identique pour ses deux pattes) à des
    // colonnes encore différentes (9 et 17) — les 4 pins partagent donc le
    // même groupKey de rail (row0), 4 trous distincts, tous --bus-active.
    const ra2 = { uid: 'ra2', type: 'RESISTOR', x: 24, y: -14 } // A->col2/row0, B->col9/row0
    const rb2 = { uid: 'rb2', type: 'RESISTOR', x: 120, y: -14 } // A->col10/row0, B->col17/row0
    const { container } = render(<Breadboard breadboard={BREADBOARD} components={[ra2, rb2]} />)
    expect(container.querySelectorAll('.breadboard__hole--bus-active').length).toBe(4)
    expect(container.querySelectorAll('.breadboard__hole--occupied').length).toBe(0)
  })

  it('feedback de drag (MB-BREADBOARD-003) reste prioritaire sur --bus-active : un trou en cours de drag affiche le feedback, jamais le bus', () => {
    const breadboardFeedback = { draggedIds: new Set(['ra']), valid: true }
    const { container } = render(
      <Breadboard breadboard={BREADBOARD} components={[ra, rb]} breadboardFeedback={breadboardFeedback} />
    )
    // Les 2 trous de ra (col5/row3 et col12/row3) affichent le feedback vert
    // (et non --bus-active, bien que leur groupKey soit actif) ; les 2 trous
    // de rb (col5/row4, col12/row4) restent --bus-active (rb n'est pas
    // draggé).
    expect(container.querySelectorAll('.breadboard__hole--feedback-valid').length).toBe(2)
    expect(container.querySelectorAll('.breadboard__hole--bus-active').length).toBe(2)
  })
})
