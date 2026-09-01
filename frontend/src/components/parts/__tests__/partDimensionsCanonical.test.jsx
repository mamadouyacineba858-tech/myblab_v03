/**
 * partDimensionsCanonical.test.jsx — MB-VIS-COMP-006 (Phase 4)
 *
 * MB-VIS-COMP-006 : élimine la duplication des dimensions (width/height/
 * viewBox) entre componentDefinitions.js (consommé par CircuitComponent.jsx
 * pour dimensionner le wrapper `.circuit-component`) et chaque renderer
 * `*Part.jsx` (qui recopiait littéralement la même largeur/hauteur dans
 * l'attribut SVG racine `viewBox`/`width`/`height`).
 *
 * Ce test ne se contente pas de comparer deux valeurs qui "coïncident" — il
 * MUTE temporairement la définition canonique (componentDefinitions.js) et
 * vérifie que le rendu SVG de chaque Part suit ce changement, ce qui prouve
 * que la source réellement consultée à l'exécution est bien
 * componentDefinitions.js et non une constante recopiée dans le fichier du
 * renderer (même convention que withSwappedInteraction/withSwappedCapability
 * des tickets MB-VIS-COMP-003/004 : mutation d'un type réel déjà enregistré,
 * restauration en `finally`, aucune invention de type fictif).
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"

import { ResistorPart } from "../ResistorPart.jsx"
import { LedPart } from "../LedPart.jsx"
import { CapacitorPart } from "../CapacitorPart.jsx"
import { DiodePart } from "../DiodePart.jsx"
import { ArduinoPart } from "../ArduinoPart.jsx"
import { ButtonPart } from "../ButtonPart.jsx"
import { LatchingButtonPart } from "../LatchingButtonPart.jsx"
import { PowerPart } from "../PowerPart.jsx"
import { BuzzerPart } from "../BuzzerPart.jsx"
import { PotentiometerPart } from "../PotentiometerPart.jsx"
import { LdrPart } from "../LdrPart.jsx"
import { ThermistorPart } from "../ThermistorPart.jsx"
import { RgbLedPart } from "../RgbLedPart.jsx"
import { NpnTransistorPart } from "../NpnTransistorPart.jsx"
import { ServoPart } from "../ServoPart.jsx"
import { DcMotorPart } from "../DcMotorPart.jsx"
import { COMPONENT_TYPES, getComponentDef } from "../../../config/componentDefinitions.js"

// Les 16 renderers concernés par MB-VIS-COMP-006 (tous ceux qui déclarent un
// <svg> racine dimensionné — la totalité du catalogue courant).
// MB-VIS-PROTOTYPE-001C : RESISTOR est passé au backend RASTER (rend un
// <img> vers un asset validé, plus de <svg>). Il est retiré de ce
// describe.each "dimensions du <svg>" et couvert par un describe dédié
// ci-dessous, qui vérifie la même propriété (dimensions dérivées de
// componentDefinitions.js, suivi de mutation) sur l'<img>.
const ALL_PARTS = [
  { type: "LED", Component: LedPart },
  { type: "CAPACITOR", Component: CapacitorPart },
  { type: "DIODE", Component: DiodePart },
  { type: "ARDUINO", Component: ArduinoPart },
  { type: "BUTTON", Component: ButtonPart },
  { type: "BUTTON_LATCHING", Component: LatchingButtonPart },
  { type: "POWER", Component: PowerPart },
  { type: "BUZZER", Component: BuzzerPart },
  { type: "POTENTIOMETER", Component: PotentiometerPart },
  { type: "LDR", Component: LdrPart },
  { type: "THERMISTOR", Component: ThermistorPart },
  { type: "RGB_LED", Component: RgbLedPart },
  { type: "NPN_TRANSISTOR", Component: NpnTransistorPart },
  { type: "SERVO", Component: ServoPart },
  { type: "DC_MOTOR", Component: DcMotorPart },
]

/**
 * Mute temporairement width/height d'un type RÉEL déjà enregistré dans
 * COMPONENT_TYPES, exécute `callback`, puis restaure systématiquement les
 * valeurs d'origine (même en cas d'échec de l'assertion).
 */
function withSwappedDimensions(type, { width, height }, callback) {
  const def = COMPONENT_TYPES[type]
  const originalWidth = def.width
  const originalHeight = def.height
  try {
    def.width = width
    def.height = height
    callback()
  } finally {
    def.width = originalWidth
    def.height = originalHeight
  }
}

describe("MB-VIS-COMP-006 — dimensions des Part renderers dérivées de componentDefinitions.js", () => {
  describe.each(ALL_PARTS)("$type", ({ type, Component }) => {
    it("TEST — au repos : viewBox/width/height du <svg> égalent EXACTEMENT def.width/def.height (comparaison dynamique, pas une valeur recopiée)", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const svg = container.querySelector("svg")
      expect(svg).not.toBeNull()
      expect(svg.getAttribute("width")).toBe(String(def.width))
      expect(svg.getAttribute("height")).toBe(String(def.height))
      expect(svg.getAttribute("viewBox")).toBe(`0 0 ${def.width} ${def.height}`)
    })

    it("TEST — mutation : si componentDefinitions.js change width/height pour ce type, le <svg> rendu suit IMMÉDIATEMENT ce changement", () => {
      withSwappedDimensions(type, { width: 321, height: 654 }, () => {
        const { container } = render(<Component />)
        const svg = container.querySelector("svg")
        expect(svg.getAttribute("width")).toBe("321")
        expect(svg.getAttribute("height")).toBe("654")
        expect(svg.getAttribute("viewBox")).toBe("0 0 321 654")
      })
    })

    it("TEST — après restauration : le renderer revient à la valeur canonique d'origine (aucune pollution inter-tests)", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const svg = container.querySelector("svg")
      expect(svg.getAttribute("width")).toBe(String(def.width))
      expect(svg.getAttribute("height")).toBe(String(def.height))
    })
  })

  describe("MB-VIS-PROTOTYPE-001C — RESISTOR backend raster : dimensions de l'<img> dérivées de componentDefinitions.js", () => {
    it("TEST — au repos : width/height de l'<img> égalent EXACTEMENT def.width/def.height ; aucun <svg>", () => {
      const def = getComponentDef("RESISTOR")
      const { container } = render(<ResistorPart />)
      const img = container.querySelector("img")
      expect(img).not.toBeNull()
      expect(container.querySelector("svg")).toBeNull()
      expect(img.getAttribute("width")).toBe(String(def.width))
      expect(img.getAttribute("height")).toBe(String(def.height))
    })

    it("TEST — mutation : si componentDefinitions.js change width/height, l'<img> rendu suit IMMÉDIATEMENT", () => {
      withSwappedDimensions("RESISTOR", { width: 321, height: 654 }, () => {
        const { container } = render(<ResistorPart />)
        const img = container.querySelector("img")
        expect(img.getAttribute("width")).toBe("321")
        expect(img.getAttribute("height")).toBe("654")
      })
    })

    it("TEST — après restauration : l'<img> revient à la valeur canonique d'origine", () => {
      const def = getComponentDef("RESISTOR")
      const { container } = render(<ResistorPart />)
      const img = container.querySelector("img")
      expect(img.getAttribute("width")).toBe(String(def.width))
      expect(img.getAttribute("height")).toBe(String(def.height))
    })
  })

  it("TEST — sanity check du helper withSwappedDimensions : restaure bien les valeurs même si le callback lève", () => {
    const before = { ...getComponentDef("RESISTOR") }
    expect(() => {
      withSwappedDimensions("RESISTOR", { width: 999, height: 999 }, () => {
        throw new Error("échec simulé")
      })
    }).toThrow("échec simulé")
    const after = getComponentDef("RESISTOR")
    expect(after.width).toBe(before.width)
    expect(after.height).toBe(before.height)
  })
})
