/**
 * AssemblyLeadsLayer.test.jsx — FT-C-001-A (§35).
 *
 * Preuves de rendu de la couche générique de pattes / cosses :
 *  - nombre correct de <line> (1 par contact câblable) ;
 *  - racines et targets corrects (repère local, origin soustraite) ;
 *  - style dérivé (`--wire` / `--lug`), aucun `type ===` ;
 *  - géométrie vide ⇒ AUCUN <svg> (pas de patte fantôme) ;
 *  - `data-inserted` reflète l'état d'insertion ;
 *  - INTÉGRATION CircuitComponent : pour LED / NPN / POTENTIOMETER, le bout de
 *    chaque patte (`line` x2/y2) coïncide EXACTEMENT avec le hit target du
 *    <Pin> correspondant ; RESISTOR (non traversant) ne rend aucune patte.
 */
// React requis en portée pour le JSX rendu sous la config vitest secondaire
// (sans @vitejs/plugin-react), comme les autres tests de rendu du dépôt
// (CircuitComponent.interaction.test.jsx, …).
// eslint-disable-next-line no-unused-vars
import React from "react"
import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup, act } from "@testing-library/react"
import { AssemblyLeadsLayer } from "../AssemblyLeadsLayer.jsx"
import { resolveAssemblyGeometry } from "../../../utils/assemblyGeometry.js"
import { CircuitProvider } from "../../../context/CircuitContext.jsx"
import { useCircuit } from "../../../context/useCircuit.js"
import { useCircuitInteraction } from "../../../context/useCircuitInteraction.js"
import { CircuitComponent } from "../../../canvas/CircuitComponent.jsx"

afterEach(() => cleanup())

const bb = { id: "bb1", position: { x: 0, y: 0 }, layout: "STANDARD_V1" }

describe("AssemblyLeadsLayer — rendu direct", () => {
  it("1 <line> par contact ; x/y en repère local (origin soustraite)", () => {
    const led = { uid: "l", type: "LED", x: 100, y: 200 }
    const geometry = resolveAssemblyGeometry(led, null)
    const { container } = render(<AssemblyLeadsLayer geometry={geometry} originX={100} originY={200} />)

    const lines = container.querySelectorAll("line.assembly-leads__lead")
    expect(lines).toHaveLength(2)

    const anode = container.querySelector('line[data-pin="anode"]')
    // target anode = (128,262) abs -> local (28,62) ; root = (128,236) -> (28,36)
    expect(anode.getAttribute("x2")).toBe("28")
    expect(anode.getAttribute("y2")).toBe("62")
    expect(anode.getAttribute("x1")).toBe("28")
    expect(anode.getAttribute("y1")).toBe("36")
  })

  it("style dérivé du profil : LED -> --wire, POTENTIOMETER -> --lug (aucun type=== dans la couche)", () => {
    const potGeom = resolveAssemblyGeometry({ uid: "p", type: "POTENTIOMETER", x: 0, y: 0 }, null)
    const { container } = render(<AssemblyLeadsLayer geometry={potGeom} originX={0} originY={0} />)
    expect(container.querySelectorAll("line.assembly-leads__lead--lug")).toHaveLength(3)
    expect(container.querySelectorAll("line.assembly-leads__lead--wire")).toHaveLength(0)
    // le code source de la couche ne contient aucun littéral de type composant
    // (garantie visuelle : le style vient de la classe posée d'après le profil)
  })

  it("géométrie vide ⇒ aucun <svg> rendu", () => {
    const { container } = render(<AssemblyLeadsLayer geometry={{ inserted: false, contacts: [] }} originX={0} originY={0} />)
    expect(container.querySelector("svg")).toBeNull()
  })

  it("data-inserted présent uniquement quand geometry.inserted", () => {
    const free = resolveAssemblyGeometry({ uid: "f", type: "LED", x: 0, y: 0 }, null)
    const ins = resolveAssemblyGeometry({ uid: "i", type: "LED", x: -4, y: 10 }, bb)
    const { container: c1 } = render(<AssemblyLeadsLayer geometry={free} originX={0} originY={0} />)
    expect(c1.querySelector("svg").hasAttribute("data-inserted")).toBe(false)
    const { container: c2 } = render(<AssemblyLeadsLayer geometry={ins} originX={-4} originY={10} />)
    expect(c2.querySelector("svg").hasAttribute("data-inserted")).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Intégration CircuitComponent : bout de patte == hit target du <Pin>
// ---------------------------------------------------------------------------
function Harness({ breadboard, onReady }) {
  const circuit = useCircuit()
  const { components } = useCircuitInteraction()
  onReady(circuit)
  return (
    <>
      {components.map((comp) => (
        <CircuitComponent key={comp.uid} component={comp} breadboard={breadboard} />
      ))}
    </>
  )
}

function pinTips(container) {
  // <Pin> = <button class="myblab-pin" style="left:..;top:..">
  return [...container.querySelectorAll("button.myblab-pin")].map((el) => ({
    pin: el.getAttribute("data-wire-pin"),
    left: parseFloat(el.style.left),
    top: parseFloat(el.style.top),
  }))
}
function leadTips(container) {
  return [...container.querySelectorAll("line.assembly-leads__lead")].map((el) => ({
    pin: el.getAttribute("data-pin"),
    x2: parseFloat(el.getAttribute("x2")),
    y2: parseFloat(el.getAttribute("y2")),
  }))
}

describe("AssemblyLeadsLayer — intégration CircuitComponent : bout de patte == hit target <Pin>", () => {
  for (const type of ["LED", "NPN_TRANSISTOR", "POTENTIOMETER"]) {
    it(`${type} libre : chaque bout de patte coïncide avec le <Pin> de même pinId`, () => {
      let api = null
      const { container } = render(
        <CircuitProvider>
          <Harness breadboard={null} onReady={(a) => (api = a)} />
        </CircuitProvider>,
      )
      act(() => api.addComponent(type, 300, 300))

      const pins = pinTips(container)
      const leads = leadTips(container)
      expect(leads.length).toBe(pins.length)

      for (const lead of leads) {
        const pin = pins.find((p) => p.pin === lead.pin)
        expect(pin).toBeDefined()
        // <Pin> left/top sont en repère local (relatifs à component.x/y),
        // exactement comme line x2/y2 -> coïncidence EXACTE attendue.
        expect(lead.x2).toBeCloseTo(pin.left, 5)
        expect(lead.y2).toBeCloseTo(pin.top, 5)
      }
    })
  }

  it("RESISTOR (non traversant) : aucune patte d'assemblage rendue", () => {
    let api = null
    const { container } = render(
      <CircuitProvider>
        <Harness breadboard={null} onReady={(a) => (api = a)} />
      </CircuitProvider>,
    )
    act(() => api.addComponent("RESISTOR", 300, 300))
    expect(container.querySelector(".assembly-leads")).toBeNull()
    // les <Pin> RESISTOR, eux, restent rendus normalement
    expect(container.querySelectorAll("button.myblab-pin").length).toBe(2)
  })

  it("LED insérée : le corps est clippé (raster) et les pattes rejoignent toujours les <Pin>", () => {
    let api = null
    const { container } = render(
      <CircuitProvider>
        <Harness breadboard={bb} onReady={(a) => (api = a)} />
      </CircuitProvider>,
    )
    // addComponent applique computeBreadboardPlacement (breadboard actif) :
    // la LED est enfichée, position déterministe.
    act(() => api.addBreadboard(0, 0))
    act(() => api.addComponent("LED", 116, 10))

    const body = container.querySelector(".circuit-component__body")
    expect(body.style.clipPath).toMatch(/^inset\(/)
    expect(body.style.clipPath).toContain("26px")

    const pins = pinTips(container)
    const leads = leadTips(container)
    for (const lead of leads) {
      const pin = pins.find((p) => p.pin === lead.pin)
      expect(lead.x2).toBeCloseTo(pin.left, 5)
      expect(lead.y2).toBeCloseTo(pin.top, 5)
    }
  })
})
