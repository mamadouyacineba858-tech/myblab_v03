/**
 * circuitComponentRasterChrome.test.js — MB-VIS-PROTOTYPE-001C.2 / 001C.4,
 * généralisé par MB-VIS-INDUSTRIAL-001.
 *
 * Verrouille le mécanisme DÉCLARATIF qui remplace les anciens hacks
 * spécifiques RESISTOR / LED :
 *  - le wrapper `.circuit-component__body` n'habille pas un composant dont la
 *    présentation résolue porte `bareBody` (implicite pour tout backend
 *    `raster`) — via l'attribut `data-bare-body` + la règle CSS générique
 *    `.circuit-component__body[data-bare-body]` ;
 *  - les marqueurs `.myblab-pin` d'un composant `markerless` ne sont pas
 *    rendus — via `hideVisualMarker` -> `opacity: 0` inline dans Pin.jsx ;
 *  - `CircuitComponent.jsx` ne contient plus AUCUNE comparaison `type === "…"`.
 *
 * Aucune assertion n'est affaiblie : les gardes RESISTOR (001C.2/001C.4) sont
 * conservées en substance, désormais exprimées sur le mécanisme générique, et
 * on vérifie en plus qu'un composant SVG sans déclaration `visual` garde son
 * habillage et ses marqueurs (aucune régression pour les 14 autres types).
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { CircuitComponent } from "../CircuitComponent.jsx"
import { getComponentPresentation } from "../../visualization/defaultRegistrations.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSS_PATH = resolve(__dirname, "../CircuitComponent.css")
const JSX_PATH = resolve(__dirname, "../CircuitComponent.jsx")
const PIN_CSS_PATH = resolve(__dirname, "../Pin.css")

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
}

const css = stripComments(readFileSync(CSS_PATH, "utf-8"))
const jsx = readFileSync(JSX_PATH, "utf-8")

const wrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>
function Harness({ onReady }) {
  const c = useCircuit()
  onReady(c)
  return <>{c.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
}
function mountType(type) {
  let api
  const utils = render(<Harness onReady={(a) => { api = a }} />, { wrapper })
  act(() => { api.addComponent(type, 40, 40) })
  return utils
}

describe("MB-VIS-INDUSTRIAL-001 — habillage du wrapper piloté par un flag déclaratif, pas par le type", () => {
  it("une règle générique cible .circuit-component__body[data-bare-body] et neutralise fond / bordure / coins / ombre", () => {
    const block = css.match(/\.circuit-component__body\[data-bare-body\]\s*\{([^}]*)\}/)
    expect(block, "règle générique .circuit-component__body[data-bare-body] introuvable").not.toBeNull()
    const body = block[1]
    expect(body).toMatch(/background:\s*transparent\s*;/)
    expect(body).toMatch(/border:\s*0\s*;/)
    expect(body).toMatch(/border-radius:\s*0\s*;/)
    expect(body).toMatch(/box-shadow:\s*none\s*;/)
  })

  it("la règle de base .circuit-component__body conserve son habillage (aucune suppression globale)", () => {
    const base = css.match(/\.circuit-component__body\s*\{([^}]*)\}/)
    expect(base).not.toBeNull()
    expect(base[1]).toMatch(/background:\s*#1a1f2e/)
    expect(base[1]).toMatch(/border:\s*1px solid #334155/)
    expect(base[1]).toMatch(/box-shadow:\s*0 4px 12px rgba\(0, 0, 0, 0\.35\)/)
  })

  it("les anciens hacks spécifiques (:has(.part-resistor)) ont disparu de CircuitComponent.css", () => {
    // La classe de base .part-resistor { ... } reste légitime (hook de style du
    // renderer, comme .part-led / .part-diode) ; seuls les SÉLECTEURS
    // spécifiques `:has(.part-resistor)` / `:has(> .part-resistor)` doivent
    // avoir disparu au profit de l'attribut déclaratif générique.
    expect(css).not.toMatch(/:has\([^)]*\.part-resistor[^)]*\)/)
    expect(css).not.toMatch(/\.circuit-component[^{]*\.part-resistor/)
  })

  it("CircuitComponent.jsx ne contient plus aucune comparaison type === \"LITTÉRAL\"", () => {
    const codeOnly = stripComments(jsx)
    const branches = [...codeOnly.matchAll(/\btype\s*(===|!==)\s*["']([A-Z0-9_]+)["']/g)].map((m) => m[2])
    expect(branches).toEqual([])
  })

  it("Pin.css : apparence de base du marqueur inchangée (aucune suppression globale)", () => {
    const pinCss = readFileSync(PIN_CSS_PATH, "utf-8")
    expect(pinCss).toMatch(/\.myblab-pin\s*\{[^}]*background:\s*#1e293b/)
    expect(pinCss).toMatch(/\.myblab-pin\s*\{[^}]*border:\s*2px solid #94a3b8/)
  })
})

describe("MB-VIS-INDUSTRIAL-001 — application au rendu réel (attributs déclaratifs + marqueurs)", () => {
  it("RESISTOR (backend raster) : data-backend=raster, data-bare-body présent, marqueurs de pin masqués (opacity 0)", () => {
    expect(getComponentPresentation("RESISTOR")).toMatchObject({ backend: "raster", bareBody: true, markerless: true })
    const { container } = mountType("RESISTOR")
    expect(container.querySelector(".circuit-component").getAttribute("data-backend")).toBe("raster")
    const body = container.querySelector(".circuit-component__body")
    expect(body.hasAttribute("data-bare-body")).toBe(true)
    const pins = [...container.querySelectorAll(".myblab-pin")]
    expect(pins.length).toBe(2)
    for (const p of pins) expect(p.style.opacity).toBe("0")
    // l'asset raster est bien rendu, aucun <svg> du renderer
    expect(container.querySelector(".circuit-component__body img")).not.toBeNull()
    expect(container.querySelector(".circuit-component__body svg")).toBeNull()
  })

  it("LED (backend raster, MB-VIS-PROTOTYPE-003) : data-backend=raster, data-bare-body présent, asset <img>, marqueurs masqués", () => {
    expect(getComponentPresentation("LED")).toMatchObject({ backend: "raster", bareBody: true, markerless: true })
    const { container } = mountType("LED")
    expect(container.querySelector(".circuit-component").getAttribute("data-backend")).toBe("raster")
    expect(container.querySelector(".circuit-component__body").hasAttribute("data-bare-body")).toBe(true)
    expect(container.querySelector(".circuit-component__body img")).not.toBeNull()
    expect(container.querySelector(".circuit-component__body svg")).toBeNull()
    for (const p of container.querySelectorAll(".myblab-pin")) expect(p.style.opacity).toBe("0")
  })

  it("POWER (aucune déclaration visual) : data-backend=svg, PAS de data-bare-body, marqueurs visibles (opacity 1)", () => {
    expect(getComponentPresentation("POWER")).toMatchObject({ backend: "svg", bareBody: false, markerless: false })
    const { container } = mountType("POWER")
    expect(container.querySelector(".circuit-component").getAttribute("data-backend")).toBe("svg")
    expect(container.querySelector(".circuit-component__body").hasAttribute("data-bare-body")).toBe(false)
    const pins = [...container.querySelectorAll(".myblab-pin")]
    expect(pins.length).toBeGreaterThan(0)
    for (const p of pins) expect(p.style.opacity).toBe("1")
  })
})
