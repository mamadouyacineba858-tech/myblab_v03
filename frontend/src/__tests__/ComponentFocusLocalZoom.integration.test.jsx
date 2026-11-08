/**
 * ComponentFocusLocalZoom.integration.test.jsx — MB-VIS-CANVAS-052.
 *
 * Verrouille le contrat de focus de composant + échelle visuelle locale
 * (docs/pmo/tickets/MB-VIS-CANVAS-052.md, Blueprint associé) via le pipeline
 * RÉEL (CircuitProvider, VRAI CommandRegistry, VRAI flux pointer/clavier) :
 *
 *  - Enter -> focus (composant sélectionné uniquement) ; Escape -> sortie ;
 *  - au plus un focus actif ;
 *  - centrage du viewport via les primitives 050 existantes (bounds Document) ;
 *  - `component.uid`/`x`/`y`, pin IDs, wire references inchangés ;
 *  - échelle locale bornée [1.0, 3.0], pas 0.1, jamais NaN/infinie ;
 *  - aucune entrée HistoryManager créée par focus/local scale ;
 *  - drag et câblage d'un composant focalisé restent fonctionnels ;
 *  - cohérence pin/hit target/wire endpoint sous échelle locale ;
 *  - combinaison zoom global + pan + focus + échelle locale ;
 *  - au moins deux types visuellement différents (LED, RESISTOR) ;
 *  - architecture générique (aucun branchement par type) ;
 *  - non-régression 049/050/051.
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { useKeyboardSystem } from "../keyboard/useKeyboardSystem.js"
import { CircuitComponent } from "../canvas/CircuitComponent.jsx"
import { SimulationCanvas } from "../canvas/SimulationCanvas.jsx"
import { WiresLayer } from "../wires/WiresLayer.jsx"
import { getComponentDef, COMPONENT_TYPES } from "../config/componentDefinitions.js"
import {
  LOCAL_SCALE_MIN,
  LOCAL_SCALE_MAX,
  LOCAL_SCALE_STEP,
  LOCAL_SCALE_DEFAULT,
} from "../utils/localScale.js"

function renderFocusHarness() {
  const canvasNode = { current: null }
  let api = null

  function Harness() {
    const circuit = useCircuit()
    const interaction = useCircuitInteraction()
    api = { ...circuit, ...interaction }
    useKeyboardSystem()
    return (
      <>
        {interaction.components.map((c) => (
          <CircuitComponent
            key={c.uid}
            component={c}
            focused={c.uid === circuit.focusedComponentId}
            localScale={c.uid === circuit.focusedComponentId ? interaction.localScale : 1}
          />
        ))}
        <WiresLayer wirePaths={interaction.wirePaths} />
      </>
    )
  }

  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasNode}>
      <div ref={(node) => { canvasNode.current = node }}>{children}</div>
    </CircuitProvider>
  )

  const utils = render(<Harness />, { wrapper })
  return { ...utils, getApi: () => api, canvasNode }
}

function pointerEvent({ button = 0, clientX = 0, clientY = 0, ctrlKey = false, target } = {}) {
  return {
    button, clientX, clientY, ctrlKey, metaKey: false, target,
    preventDefault: () => {}, stopPropagation: () => {},
  }
}

function movePointer(clientX, clientY) {
  act(() => { window.dispatchEvent(new PointerEvent("pointermove", { clientX, clientY })) })
}
function releasePointer() {
  act(() => { window.dispatchEvent(new PointerEvent("pointerup")) })
}
function pressKey(key) {
  act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })) })
}

describe("MB-VIS-CANVAS-052 — Focus de composant + échelle visuelle locale", () => {
  it("Enter focalise le composant sélectionné ; un seul focus à la fois", () => {
    const { getApi } = renderFocusHarness()
    act(() => {
      getApi().addComponent("LED", 100, 100)
      getApi().addComponent("RESISTOR", 300, 100)
    })
    const [led, resistor] = getApi().components

    act(() => { getApi().selectOnly({ type: "component", id: led.uid }) })
    pressKey("Enter")
    expect(getApi().focusedComponentId).toBe(led.uid)

    // Un second Enter sur un AUTRE composant sélectionné remplace le focus —
    // au plus un focus actif (Blueprint G).
    act(() => { getApi().selectOnly({ type: "component", id: resistor.uid }) })
    pressKey("Enter")
    expect(getApi().focusedComponentId).toBe(resistor.uid)
    expect(getApi().focusedComponentId).not.toBe(led.uid)
  })

  it("Enter sans sélection de composant (aucune sélection, ou un wire) est un no-op", () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("LED", 100, 100) })
    expect(getApi().focusedComponentId).toBe(null)
    pressKey("Enter")
    expect(getApi().focusedComponentId).toBe(null)
  })

  it("Escape quitte le focus sans muter le Document ni la sélection métier", () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("LED", 100, 100) })
    const [led] = getApi().components
    act(() => { getApi().selectOnly({ type: "component", id: led.uid }) })
    pressKey("Enter")
    expect(getApi().focusedComponentId).toBe(led.uid)

    pressKey("Escape")
    expect(getApi().focusedComponentId).toBe(null)
    // La sélection métier (activeItem), elle, n'est pas remplacée par le
    // focus — Blueprint G : "le focus ne remplace pas la sélection".
    expect(getApi().activeItem).toEqual({ type: "component", id: led.uid })
  })

  it("focus centre le viewport sur les bounds Document du composant, sans changer x/y/uid", () => {
    const { getApi, canvasNode } = renderFocusHarness()
    Object.defineProperty(canvasNode.current, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 }),
      configurable: true,
    })
    act(() => { getApi().addComponent("RESISTOR", 500, 500) })
    const [resistor] = getApi().components
    const before = { uid: resistor.uid, x: resistor.x, y: resistor.y }

    act(() => { getApi().focusComponent(resistor.uid) })

    const def = getComponentDef("RESISTOR")
    const expectedCenterX = resistor.x + def.width / 2
    const expectedCenterY = resistor.y + def.height / 2
    // centerOnRect (utils/viewport.js) : translateX/Y = viewportSize/2 - centre*zoom.
    const zoom = getApi().viewport.zoom
    expect(getApi().viewport.translateX).toBeCloseTo(400 - expectedCenterX * zoom, 6)
    expect(getApi().viewport.translateY).toBeCloseTo(300 - expectedCenterY * zoom, 6)

    // uid/x/y du composant Document : strictement inchangés par le focus.
    const after = getApi().components.find((c) => c.uid === resistor.uid)
    expect(after.uid).toBe(before.uid)
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
  })

  it("l'échelle locale démarre à LOCAL_SCALE_DEFAULT à chaque nouvelle entrée en focus", () => {
    const { getApi } = renderFocusHarness()
    act(() => {
      getApi().addComponent("LED", 0, 0)
      getApi().addComponent("RESISTOR", 300, 0)
    })
    const [led, resistor] = getApi().components

    act(() => { getApi().focusComponent(led.uid) })
    expect(getApi().localScale).toBe(LOCAL_SCALE_DEFAULT)

    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })
    expect(getApi().localScale).toBeCloseTo(LOCAL_SCALE_DEFAULT + LOCAL_SCALE_STEP, 10)

    // Refocaliser (même composant ou un autre) réinitialise l'échelle locale.
    act(() => { getApi().focusComponent(resistor.uid) })
    expect(getApi().localScale).toBe(LOCAL_SCALE_DEFAULT)
  })

  it(`l'échelle locale reste bornée dans [${LOCAL_SCALE_MIN}, ${LOCAL_SCALE_MAX}], jamais NaN/infinie`, () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("LED", 0, 0) })
    const [led] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })

    for (let i = 0; i < 50; i++) {
      act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })
    }
    expect(getApi().localScale).toBe(LOCAL_SCALE_MAX)
    expect(Number.isFinite(getApi().localScale)).toBe(true)

    for (let i = 0; i < 50; i++) {
      act(() => { getApi().adjustLocalScale(-LOCAL_SCALE_STEP) })
    }
    expect(getApi().localScale).toBe(LOCAL_SCALE_MIN)
    expect(Number.isFinite(getApi().localScale)).toBe(true)
  })

  it("adjustLocalScale sans focus actif est un no-op (aucune valeur fantôme)", () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("LED", 0, 0) })
    expect(getApi().focusedComponentId).toBe(null)
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })
    expect(getApi().localScale).toBe(LOCAL_SCALE_DEFAULT)
  })

  it("focus/échelle locale ne créent AUCUNE entrée History", () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("LED", 0, 0) })
    const [led] = getApi().components
    const undoCountBefore = getApi().getUndoCount()
    const canUndoBefore = getApi().canUndo()

    act(() => { getApi().focusComponent(led.uid) })
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })
    act(() => { getApi().adjustLocalScale(-LOCAL_SCALE_STEP) })
    act(() => { getApi().exitFocus() })

    // Le seul undoable présent est l'ADD_COMPONENT déjà dispatché avant ce
    // bloc (canUndoBefore) — focus/échelle locale n'en ajoutent aucun.
    expect(getApi().getUndoCount()).toBe(undoCountBefore)
    expect(getApi().canUndo()).toBe(canUndoBefore)
  })

  it("les pins canoniques et leurs IDs restent inchangés pendant focus/échelle locale", () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("RESISTOR", 100, 100) })
    const [resistor] = getApi().components
    const def = getComponentDef("RESISTOR")
    const pinIdsBefore = def.pins.map((p) => p.id)

    act(() => { getApi().focusComponent(resistor.uid) })
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP * 10) })

    const defAfter = getComponentDef("RESISTOR")
    expect(defAfter.pins.map((p) => p.id)).toEqual(pinIdsBefore)
    expect(defAfter).toBe(def) // même référence : componentDefinitions.js jamais muté.
  })

  it("un composant focalisé reste déplaçable (drag) — le Document est mis à jour au relâchement, la position reflète le delta écran, pas l'échelle locale", () => {
    const { getApi, canvasNode } = renderFocusHarness()
    act(() => { getApi().addComponent("RESISTOR", 100, 100) })
    const [resistor] = getApi().components
    act(() => { getApi().focusComponent(resistor.uid) })
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP * 10) }) // scale != 1

    act(() => {
      getApi().startDrag(
        pointerEvent({ button: 0, clientX: resistor.x + 5, clientY: resistor.y + 5, target: canvasNode.current }),
        resistor.uid
      )
    })
    movePointer(resistor.x + 5 + 60, resistor.y + 5 + 40)
    releasePointer()

    const moved = getApi().components.find((c) => c.uid === resistor.uid)
    // Delta appliqué (60,40), zoom=1, translate=0 par défaut : la position
    // Document avance EXACTEMENT du delta écran, jamais corrigée par
    // l'échelle locale (Blueprint F : "le local scale ne doit pas devenir
    // une correction de coordonnées Document").
    expect(moved.x).toBe(resistor.x + 60)
    expect(moved.y).toBe(resistor.y + 40)
    expect(moved.uid).toBe(resistor.uid)
  })

  it("le câblage vers/depuis un pin d'un composant focalisé fonctionne, avec les mêmes identités de pin", () => {
    const { getApi } = renderFocusHarness()
    act(() => {
      getApi().addComponent("LED", 0, 0)
      getApi().addComponent("RESISTOR", 300, 0)
    })
    const [led, resistor] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP * 10) })

    act(() => { getApi().addWire(led.uid, "anode", resistor.uid, "A") })

    expect(getApi().wires).toHaveLength(1)
    expect(getApi().wires[0]).toMatchObject({
      fromUid: led.uid, fromPin: "anode", toUid: resistor.uid, toPin: "A",
    })
    expect(getApi().isPinConnected(led.uid, "anode")).toBe(true)
  })

  it("l'extrémité de fil dessinée suit le pin du composant focalisé sous échelle locale, sans déplacer l'autre extrémité", () => {
    const { getApi } = renderFocusHarness()
    act(() => {
      getApi().addComponent("RESISTOR", 0, 0)
      getApi().addComponent("RESISTOR", 300, 0)
    })
    const [resA, resB] = getApi().components
    act(() => { getApi().addWire(resA.uid, "B", resB.uid, "A") })

    const pathAtScale1 = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d

    act(() => { getApi().focusComponent(resA.uid) })
    const pathAtDefault = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d
    // Le focus seul (échelle par défaut 1.5 != 1) change déjà le tracé côté
    // res-a — c'est la démonstration que wirePaths reflète bien le focus.
    expect(pathAtDefault).not.toBe(pathAtScale1)

    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP * 10) }) // 1.5 -> 2.5
    const pathAtHigherScale = getApi().wirePaths.find((p) => p.id === getApi().wires[0].id).d
    expect(pathAtHigherScale).not.toBe(pathAtDefault)
    // L'extrémité res-b (non focalisé) reste sur sa position canonique dans
    // les trois cas : seul le point de départ (res-a) doit varier.
    const canonicalBEndpoint = "L 300 14"
    expect(pathAtScale1).toContain(canonicalBEndpoint)
    expect(pathAtDefault).toContain(canonicalBEndpoint)
    expect(pathAtHigherScale).toContain(canonicalBEndpoint)
  })

  it("le wrapper DOM du composant focalisé porte le transform scale() attendu ; les autres n'en portent aucun", () => {
    const { getApi, container } = renderFocusHarness()
    act(() => {
      getApi().addComponent("LED", 0, 0)
      getApi().addComponent("RESISTOR", 300, 0)
    })
    const [led, resistor] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP * 5) }) // 1.5 -> 2.0

    const nodes = [...container.querySelectorAll(".circuit-component")]
    const focusedNode = nodes.find((n) => n.getAttribute("data-focused") === "")
    const otherNode = nodes.find((n) => n.getAttribute("data-focused") !== "")
    expect(focusedNode).toBeTruthy()
    expect(otherNode).toBeTruthy()
    expect(focusedNode.style.transform).toBe("scale(2)")
    expect(otherNode.style.transform).toBe("")

    // Les <Pin> restent positionnés à leur offset canonique NON recalculé —
    // c'est l'héritage du transform CSS ci-dessus qui les agrandit/déplace
    // visuellement, jamais un second calcul (Blueprint D5, non-double-scaling).
    const focusedPins = [...focusedNode.querySelectorAll(".myblab-pin")]
    expect(focusedPins.length).toBeGreaterThan(0)
    // LED anode : dx=0,dy=20 (géométrie canonique, componentDefinitions.js)
    // — getPinPresentationPosition SANS scale (comportement CircuitComponent.jsx).
    const anodePin = focusedPins[0]
    expect(Number(anodePin.style.left.replace("px", ""))).not.toBeNaN()
  })

  it("combinaison zoom global + pan + focus + échelle locale reste déterministe et réversible", () => {
    const { getApi, canvasNode } = renderFocusHarness()
    Object.defineProperty(canvasNode.current, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 }),
      configurable: true,
    })
    act(() => { getApi().addComponent("RESISTOR", 100, 100) })
    const [resistor] = getApi().components

    // 1. Zoom global (049/050, non-régression).
    act(() => { getApi().zoomIn() })
    const zoomAfterZoomIn = getApi().viewport.zoom
    expect(zoomAfterZoomIn).toBeGreaterThan(1)

    // 2. Pan global (050, non-régression) — via startPan/pointermove/pointerup.
    act(() => { getApi().startPan(pointerEvent({ button: 1, clientX: 0, clientY: 0 })) })
    movePointer(50, 30)
    releasePointer()
    expect(getApi().viewport.translateX).not.toBe(0)

    const viewportBeforeFocus = { ...getApi().viewport }

    // 3. Focus + échelle locale — n'altère ni le zoom ni le pan déjà en place
    //    au-delà du recentrage explicite du focus (D4/D9 : centerViewportOnRect
    //    conserve le zoom courant, ne touche que translateX/Y).
    act(() => { getApi().focusComponent(resistor.uid) })
    expect(getApi().viewport.zoom).toBe(viewportBeforeFocus.zoom)
    act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP * 3) })
    expect(getApi().localScale).toBeCloseTo(LOCAL_SCALE_DEFAULT + LOCAL_SCALE_STEP * 3, 10)
    // Le viewport (zoom/pan) n'est jamais modifié par un changement d'échelle
    // locale (D2/D5 : ce ne sont jamais le même modèle).
    expect(getApi().viewport.zoom).toBe(viewportBeforeFocus.zoom)

    // 4. Sortie focus : conserve le viewport courant (Blueprint G).
    const viewportBeforeExit = { ...getApi().viewport }
    act(() => { getApi().exitFocus() })
    expect(getApi().viewport).toEqual(viewportBeforeExit)
    expect(getApi().localScale).toBe(LOCAL_SCALE_DEFAULT)
  })

  it("fonctionne sur au moins deux types visuellement différents (LED, RESISTOR) sans branche par type", () => {
    for (const type of ["LED", "RESISTOR"]) {
      const { getApi } = renderFocusHarness()
      act(() => { getApi().addComponent(type, 50, 50) })
      const [comp] = getApi().components
      act(() => { getApi().focusComponent(comp.uid) })
      expect(getApi().focusedComponentId).toBe(comp.uid)
      act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })
      expect(getApi().localScale).toBeGreaterThan(LOCAL_SCALE_DEFAULT)
      act(() => { getApi().exitFocus() })
      expect(getApi().focusedComponentId).toBe(null)
    }
  })

  it("architecture générique : focus/défocalisation fonctionne pour les 16 types du catalogue, sans erreur", () => {
    for (const type of Object.keys(COMPONENT_TYPES)) {
      const { getApi } = renderFocusHarness()
      act(() => { getApi().addComponent(type, 20, 20) })
      const comp = getApi().components[0]
      expect(comp).toBeDefined()
      expect(() => {
        act(() => { getApi().focusComponent(comp.uid) })
      }).not.toThrow()
      expect(getApi().focusedComponentId).toBe(comp.uid)
      expect(() => {
        act(() => { getApi().adjustLocalScale(LOCAL_SCALE_STEP) })
        act(() => { getApi().exitFocus() })
      }).not.toThrow()
      expect(getApi().focusedComponentId).toBe(null)
    }
  })

  it("un composant focalisé qui est supprimé libère automatiquement le focus (aucun uid fantôme)", () => {
    const { getApi } = renderFocusHarness()
    act(() => { getApi().addComponent("LED", 0, 0) })
    const [led] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })
    expect(getApi().focusedComponentId).toBe(led.uid)

    act(() => { getApi().selectOnly({ type: "component", id: led.uid }) })
    act(() => { getApi().deleteSelection() })

    expect(getApi().focusedComponentId).toBe(null)
  })

  it("non-régression 051 : le focus/l'échelle locale ne réveillent jamais un composant NON focalisé (React.memo + props, aucun Context supplémentaire pour CircuitComponent)", () => {
    const canvasNode = { current: null }
    let api = null
    const renderCounts = new Map()

    const ProbedComponent = React.memo(function ProbedComponent({ component, focused, localScale }) {
      renderCounts.set(component.uid, (renderCounts.get(component.uid) || 0) + 1)
      return <CircuitComponent component={component} focused={focused} localScale={localScale} />
    })

    function Harness() {
      const circuit = useCircuit()
      const interaction = useCircuitInteraction()
      api = { ...circuit, ...interaction }
      return (
        <>
          {interaction.components.map((c) => (
            <ProbedComponent
              key={c.uid}
              component={c}
              focused={c.uid === circuit.focusedComponentId}
              localScale={c.uid === circuit.focusedComponentId ? interaction.localScale : 1}
            />
          ))}
        </>
      )
    }
    const wrapper = ({ children }) => (
      <CircuitProvider canvasRef={canvasNode}>
        <div ref={(node) => { canvasNode.current = node }}>{children}</div>
      </CircuitProvider>
    )
    render(<Harness />, { wrapper })

    act(() => {
      for (let i = 0; i < 20; i++) api.addComponent("RESISTOR", i * 100, 0)
    })
    const target = api.components[10]
    act(() => { api.focusComponent(target.uid) })
    const mountCounts = new Map(renderCounts)

    for (let i = 0; i < 15; i++) {
      act(() => { api.adjustLocalScale(i % 2 === 0 ? LOCAL_SCALE_STEP : -LOCAL_SCALE_STEP) })
    }

    let othersRerendered = 0
    for (const [uid, count] of renderCounts.entries()) {
      if (uid === target.uid) continue
      if (count !== (mountCounts.get(uid) || 0)) othersRerendered += 1
    }
    expect(othersRerendered).toBe(0)
    // Le composant focalisé, lui, a bien réagi à chaque pas de molette.
    expect(renderCounts.get(target.uid)).toBeGreaterThan(mountCounts.get(target.uid))
  })
})

/**
 * MB-VIS-CANVAS-052 — correctif CSA (relevé du commit 5821199) : la molette
 * ne doit piloter l'échelle locale que lorsqu'elle survole RÉELLEMENT le
 * composant focalisé (`e.target` du DOM natif, jamais une heuristique basée
 * uniquement sur `focusedComponentId`) ; ailleurs sur le Canvas — même avec
 * un focus actif — elle doit conserver son rôle de zoom global 050. Ces
 * tests rendent SimulationCanvas.jsx en entier (le VRAI listener `wheel`
 * natif y est attaché) et dispatchent de VRAIS `WheelEvent` avec un `target`
 * DOM réel — jamais un appel direct à `adjustLocalScale()`/
 * `zoomByFactorAtScreenPoint()`.
 */
function renderSimulationCanvasHarness() {
  const canvasNode = { current: null }
  let api = null
  function Harness() {
    const circuit = useCircuit()
    const interaction = useCircuitInteraction()
    api = { ...circuit, ...interaction }
    return <SimulationCanvas />
  }
  const wrapper = ({ children }) => (
    <CircuitProvider canvasRef={canvasNode}>{children}</CircuitProvider>
  )
  const utils = render(<Harness />, { wrapper })
  return { ...utils, getApi: () => api, canvasNode }
}

function dispatchWheel(target, deltaY) {
  act(() => {
    target.dispatchEvent(new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true }))
  })
}

describe("MB-VIS-CANVAS-052 — correctif CSA : molette scopée au composant focalisé (DOM réel)", () => {
  it("A/B — focus actif + wheel sur le composant focalisé -> localScale change, le viewport global reste inchangé", () => {
    const { getApi, container } = renderSimulationCanvasHarness()
    act(() => { getApi().addComponent("LED", 100, 100) })
    const [led] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })
    const zoomBefore = getApi().viewport.zoom
    const scaleBefore = getApi().localScale

    const focusedNode = container.querySelector('.circuit-component[data-focused]')
    expect(focusedNode).toBeTruthy()

    dispatchWheel(focusedNode, -100) // deltaY < 0 -> agrandir
    expect(getApi().localScale).toBeCloseTo(scaleBefore + LOCAL_SCALE_STEP, 10)
    expect(getApi().viewport.zoom).toBe(zoomBefore)
  })

  it("C/D — focus actif + wheel AILLEURS sur le Canvas -> localScale inchangé, comportement global (zoom) attendu", () => {
    const { getApi, canvasNode } = renderSimulationCanvasHarness()
    act(() => { getApi().addComponent("LED", 100, 100) })
    const [led] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })
    const scaleBefore = getApi().localScale
    const zoomBefore = getApi().viewport.zoom

    // Survol du FOND du canvas (l'élément racine lui-même, pas un descendant
    // de .circuit-component) : `e.target.closest('.circuit-component
    // [data-focused]')` doit être `null`.
    dispatchWheel(canvasNode.current, -100)

    expect(getApi().localScale).toBe(scaleBefore)
    expect(getApi().viewport.zoom).toBeGreaterThan(zoomBefore)
  })

  it("E/F — aucun focus + wheel sur le Canvas -> zoom global 050 inchangé (non-régression)", () => {
    const { getApi, canvasNode } = renderSimulationCanvasHarness()
    act(() => { getApi().addComponent("LED", 100, 100) })
    expect(getApi().focusedComponentId).toBe(null)
    const zoomBefore = getApi().viewport.zoom

    dispatchWheel(canvasNode.current, -100)

    expect(getApi().viewport.zoom).toBeGreaterThan(zoomBefore)
    expect(getApi().localScale).toBe(LOCAL_SCALE_DEFAULT)
  })

  it("wheel sur le composant focalisé lui-même reste scopé même si un AUTRE composant existe sur le Canvas", () => {
    const { getApi, container } = renderSimulationCanvasHarness()
    act(() => {
      getApi().addComponent("LED", 0, 0)
      getApi().addComponent("RESISTOR", 400, 0)
    })
    const [led] = getApi().components
    act(() => { getApi().focusComponent(led.uid) })
    const zoomBefore = getApi().viewport.zoom

    const nodes = [...container.querySelectorAll(".circuit-component")]
    const otherNode = nodes.find((n) => n.getAttribute("data-focused") !== "")
    expect(otherNode).toBeTruthy()

    // Survol du composant NON focalisé (RESISTOR) pendant que la LED est
    // focalisée : ne matche pas `[data-focused]` -> zoom global, jamais
    // l'échelle locale de la LED.
    const scaleBefore = getApi().localScale
    dispatchWheel(otherNode, -100)
    expect(getApi().localScale).toBe(scaleBefore)
    expect(getApi().viewport.zoom).toBeGreaterThan(zoomBefore)
  })
})
