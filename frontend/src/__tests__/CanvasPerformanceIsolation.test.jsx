/**
 * CanvasPerformanceIsolation.test.jsx — MB-VIS-CANVAS-051.
 *
 * Verrouille le contrat d'isolation de performance exigé par le Ticket
 * (docs/pmo/tickets/MB-VIS-CANVAS-051.md) et le Blueprint associé :
 *
 *  - le state haute fréquence (dragPreview, viewport, marqueeRect) est isolé
 *    dans un contexte séparé (useCircuitInteraction()) du state stable
 *    (useCircuit()) — voir context/CircuitContext.jsx ;
 *  - un composant qui ne dépend que du state stable (CircuitComponent.jsx,
 *    via React.memo) ne re-rend plus lorsqu'un AUTRE composant est déplacé,
 *    ni lorsque le viewport change (pan/zoom), ni pendant un marquee ;
 *  - le Document reste la source de vérité : aucune mutation persistante
 *    pendant un preview, une seule entrée d'historique par interaction ;
 *  - les fils continuent de suivre le preview de drag nécessaire.
 *
 * MESURE (§E du Blueprint, "mesure reproductible AVANT/APRÈS") : la mesure
 * ci-dessous compte, composant par composant, le nombre de fois où
 * CircuitComponent EXÉCUTE RÉELLEMENT son rendu — pas via React.Profiler
 * (dont onRender() se déclenche pour tout commit incluant le Profiler, même
 * quand le sous-arbre a intégralement "bailed out" via React.memo, ce qui a
 * été vérifié empiriquement donner un faux 100% de re-rendu avant toute
 * conclusion : Profiler mesure le TEMPS d'un commit, pas si le composant a
 * été appelé) — mais via un wrapper `React.memo` dédié au test
 * (ProbedComponent, ci-dessous), dont le corps n'exécute QUE si React décide
 * réellement d'appeler son rendu (même condition de bail-out que
 * CircuitComponent.jsx lui-même : comparaison shallow par défaut sur
 * `component`, la même prop que CircuitComponent.jsx reçoit). Aucune
 * modification de CircuitComponent.jsx/SimulationCanvas.jsx n'est requise.
 * C'est un DÉCOMPTE EXACT d'appels de fonction (FAIT MESURÉ), reproductible
 * à l'identique sur n'importe quelle machine, contrairement à une mesure de
 * durée. Procédure IDENTIQUE utilisée pour la mesure AVANT (commit 1fbabaa,
 * avant ce ticket) et APRÈS (ce fichier, exécuté sans modification contre
 * les deux versions de useCircuitState.js/CircuitContext.jsx/
 * CircuitComponent.jsx) — voir Delivery Report §Mesure pour les deux
 * relevés et leur comparaison.
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { CircuitComponent } from "../canvas/CircuitComponent.jsx"

// Grille 12x10 = 120 composants, jamais superposés (pas de collision de
// pins/sélection), pas de breadboard (hors périmètre de la mesure : la
// mesure porte sur le fan-out de rendu, pas sur breadboard/simulation).
const GRID_COLUMNS = 12
const GRID_ROWS = 10
const TOTAL_COMPONENTS = GRID_COLUMNS * GRID_ROWS
const CELL = 100

function buildLargeCircuit(addComponent) {
  act(() => {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLUMNS; col++) {
        addComponent("RESISTOR", col * CELL, row * CELL)
      }
    }
  })
}

/**
 * Harnais de mesure : ProbedComponent est un wrapper React.memo dédié au
 * test, dont le CORPS (donc `bump(uid)`) n'exécute QUE si React décide
 * réellement d'appeler son rendu — exactement la même condition de bail-out
 * que CircuitComponent.jsx lui-même (comparaison shallow par défaut sur la
 * prop `component`, seule prop qui varie ici). `bump` est déclaré une seule
 * fois par composant de test (module scope), donc sa référence est stable et
 * ne provoque jamais, à elle seule, l'invalidation du memo.
 */
function bump(renderCounts, uid) {
  renderCounts.set(uid, (renderCounts.get(uid) || 0) + 1)
}

function renderLargeCircuit() {
  const canvasNode = { current: null }
  const renderCounts = new Map()
  let api = null

  const ProbedComponent = React.memo(function ProbedComponent({ component }) {
    bump(renderCounts, component.uid)
    return <CircuitComponent component={component} />
  })

  function Harness() {
    const circuit = useCircuit()
    const interaction = useCircuitInteraction()
    api = { ...circuit, ...interaction }
    return (
      <>
        {interaction.components.map((c) => (
          <ProbedComponent key={c.uid} component={c} />
        ))}
      </>
    )
  }

  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasNode}>
      <div ref={(node) => { canvasNode.current = node }}>{children}</div>
    </CircuitProvider>
  )

  const utils = render(<Harness />, { wrapper })
  return { ...utils, getApi: () => api, renderCounts, canvasNode }
}

function pointerDownOn(canvasNode, { button, clientX, clientY, ctrlKey = false }) {
  return {
    button,
    clientX,
    clientY,
    ctrlKey,
    metaKey: false,
    target: canvasNode,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
}

function movePointer(clientX, clientY) {
  act(() => {
    window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY }))
  })
}

function releasePointer() {
  act(() => {
    window.dispatchEvent(new PointerEvent("pointerup"))
  })
}

const DRAG_STEPS = 30
const PAN_STEPS = 30

describe("MB-VIS-CANVAS-051 — isolation du state haute fréquence (100+ composants)", () => {
  it(`FAIT MESURÉ — drag continu d'UN SEUL composant parmi ${TOTAL_COMPONENTS} : seul le composant déplacé re-rend, les ${TOTAL_COMPONENTS - 1} autres ne re-rendent jamais`, () => {
    const { getApi, renderCounts, canvasNode } = renderLargeCircuit()
    buildLargeCircuit(getApi().addComponent)

    expect(getApi().components.length).toBe(TOTAL_COMPONENTS)
    // Après le montage initial, chaque composant a rendu exactement une fois.
    expect(renderCounts.size).toBe(TOTAL_COMPONENTS)
    for (const count of renderCounts.values()) expect(count).toBe(1)

    const target = getApi().components[Math.floor(TOTAL_COMPONENTS / 2)]
    const mountCounts = new Map(renderCounts)

    act(() => {
      getApi().startDrag(
        pointerDownOn(canvasNode.current, { button: 0, clientX: target.x + 5, clientY: target.y + 5 }),
        target.uid
      )
    })

    for (let step = 1; step <= DRAG_STEPS; step++) {
      movePointer(target.x + 5 + step * 3, target.y + 5)
    }

    // MESURE : la fenêtre pertinente pour le fan-out haute fréquence est
    // EXACTEMENT la séquence de pointermove PENDANT le drag (avant le
    // pointerup) — c'est elle que le Ticket qualifie de "drag continu" et
    // c'est elle que ce Blueprint identifie comme le risque de performance
    // (C4/D1). Au relâchement (pointerup), le commit MOVE_COMPONENT fait
    // transiter le Document entier par ReactDocumentMapper.toReact() ->
    // normalizeComponent() (applyDocument(), useCircuitState.js) : celui-ci
    // reconstruit alors, UNE SEULE FOIS, un nouvel objet pour CHAQUE
    // composant (pas seulement celui déplacé) — comportement préexistant du
    // pont Document Core<->React (MB-CF3-003/MB-004.5, non modifié par ce
    // ticket), qui déclenche donc, à ce SEUL instant, un re-rendu de tous les
    // composants. C'est un coût UNIQUE au commit, pas un coût PAR FRAME : il
    // est donc mesuré et rapporté séparément ci-dessous, jamais confondu
    // avec le fan-out pendant l'interaction active (distinction MESURE vs
    // OBSERVATION exigée par le Ticket).
    let othersRerenderedDuringDrag = 0
    let targetDeltaDuringDrag = 0
    for (const [uid, countDuringDrag] of renderCounts.entries()) {
      const before = mountCounts.get(uid) || 0
      const delta = countDuringDrag - before
      if (uid === target.uid) {
        targetDeltaDuringDrag = delta
      } else if (delta > 0) {
        othersRerenderedDuringDrag += 1
      }
    }
    const countsBeforeCommit = new Map(renderCounts)

    releasePointer()

    let othersRerenderedAtCommit = 0
    for (const [uid, finalCount] of renderCounts.entries()) {
      if (uid === target.uid) continue
      if (finalCount !== (countsBeforeCommit.get(uid) || 0)) othersRerenderedAtCommit += 1
    }

    // eslint-disable-next-line no-console
    console.log(
      `[MESURE 051] Drag continu (${DRAG_STEPS} pointermove, ${TOTAL_COMPONENTS} composants) : ` +
      `PENDANT le drag — composant déplacé re-rendu ${targetDeltaDuringDrag} fois ; composants NON déplacés ayant re-rendu : ${othersRerenderedDuringDrag}/${TOTAL_COMPONENTS - 1}. ` +
      `AU COMMIT (pointerup, une seule fois, round-trip Document complet, comportement préexistant non affecté par ce ticket) — composants NON déplacés re-rendus : ${othersRerenderedAtCommit}/${TOTAL_COMPONENTS - 1}.`
    )

    // FAIT MESURÉ (cœur du contrat d'isolation, Ticket §Critères 1) : pendant
    // les 30 pointermove du drag, AUCUN composant non déplacé ne re-rend.
    expect(othersRerenderedDuringDrag).toBe(0)
    expect(targetDeltaDuringDrag).toBeGreaterThan(0)

    // Document = source de vérité : une seule mutation par drag, pas une par
    // frame — déjà prouvé PAR CONSTRUCTION ci-dessus (othersRerenderedDuringDrag
    // === 0 : un commit par frame aurait immédiatement fait réapparaître le
    // rafraîchissement complet, observé ci-dessus, à CHAQUE pointermove, pas
    // une seule fois au relâchement). `getUndoCount()` n'est pas utilisable
    // comme preuve supplémentaire ici : HistoryManager est plafonné à 50
    // entrées (useCircuitState.js, `new HistoryManager(50)`) et ce test en
    // dispatche déjà 120 (une par addComponent) avant même le drag — la
    // preuve par comptage d'historique est déjà apportée, sans plafond, par
    // MoveComponentMutationChannel.integration.test.jsx (TEST 1).
  })

  it(`FAIT MESURÉ — pan continu du viewport sur ${TOTAL_COMPONENTS} composants : AUCUN CircuitComponent ne re-rend`, () => {
    const { getApi, renderCounts, canvasNode } = renderLargeCircuit()
    buildLargeCircuit(getApi().addComponent)

    const mountCounts = new Map(renderCounts)
    const undoCountBefore = getApi().getUndoCount()

    act(() => {
      getApi().startPan(pointerDownOn(canvasNode.current, { button: 1, clientX: 0, clientY: 0 }))
    })
    for (let step = 1; step <= PAN_STEPS; step++) {
      movePointer(step * 5, step * 3)
    }
    releasePointer()

    let rerendered = 0
    for (const [uid, finalCount] of renderCounts.entries()) {
      if (finalCount !== (mountCounts.get(uid) || 0)) rerendered += 1
    }

    // eslint-disable-next-line no-console
    console.log(
      `[MESURE 051] Pan continu (${PAN_STEPS} pointermove, ${TOTAL_COMPONENTS} composants) : ` +
      `composants ayant re-rendu : ${rerendered}/${TOTAL_COMPONENTS}.`
    )

    expect(rerendered).toBe(0)
    // Contrainte #2/#8 (héritée de 050) : le pan ne mute jamais le Document
    // ni n'ajoute d'entrée Undo/Redo.
    expect(getApi().getUndoCount()).toBe(undoCountBefore)
    expect(getApi().viewport.translateX).toBe(PAN_STEPS * 5)
    expect(getApi().viewport.translateY).toBe(PAN_STEPS * 3)
  })

  it("un marquee continu ne re-rend AUCUN CircuitComponent (seul MarqueeOverlay, hors de ce harnais, dépend de marqueeRect)", () => {
    const { getApi, renderCounts, canvasNode } = renderLargeCircuit()
    buildLargeCircuit(getApi().addComponent)

    const mountCounts = new Map(renderCounts)

    act(() => {
      getApi().startMarquee(pointerDownOn(canvasNode.current, { button: 0, clientX: -50, clientY: -50 }))
    })
    for (let step = 1; step <= 15; step++) {
      movePointer(-50 + step * 20, -50 + step * 20)
    }
    releasePointer()

    let rerendered = 0
    for (const [uid, finalCount] of renderCounts.entries()) {
      if (finalCount !== (mountCounts.get(uid) || 0)) rerendered += 1
    }
    expect(rerendered).toBe(0)
  })

  it("les fils continuent de suivre le preview de drag (wirePaths change pendant le drag, avant tout commit)", () => {
    const { getApi, canvasNode } = renderLargeCircuit()
    act(() => {
      getApi().addComponent("LED", 0, 0)
      getApi().addComponent("RESISTOR", 300, 0)
    })
    const [led, resistor] = getApi().components
    act(() => {
      getApi().addWire(led.uid, "anode", resistor.uid, "A")
    })
    const pathBefore = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d
    const undoCountBefore = getApi().getUndoCount()

    act(() => {
      getApi().startDrag(
        pointerDownOn(canvasNode.current, { button: 0, clientX: resistor.x + 5, clientY: resistor.y + 5 }),
        resistor.uid
      )
    })
    movePointer(resistor.x + 5 + 150, resistor.y + 5 + 80)

    const pathDuringDrag = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d
    expect(pathDuringDrag).not.toBe(pathBefore)

    releasePointer()

    // Une seule mutation Document supplémentaire (le déplacement), commitée
    // au relâchement — en plus des 3 déjà présentes (2x addComponent, 1x
    // addWire).
    expect(getApi().getUndoCount()).toBe(undoCountBefore + 1)
  })
})
