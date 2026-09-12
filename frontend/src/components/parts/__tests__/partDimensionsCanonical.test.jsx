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
import { PolarizedCapacitorPart } from "../PolarizedCapacitorPart.jsx"
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
import { getComponentPresentation } from "../../../visualization/defaultRegistrations.js"

// Catalogue complet (17, dont POLARIZED_CAPACITOR — FT-C-COMP-002).
// MB-VIS-INDUSTRIAL-001 : la répartition
// SVG / RASTER est DÉRIVÉE du registre (`getComponentPresentation().backend`),
// plus jamais une liste de types codée en dur. Les renderers SVG sont
// vérifiés sur leur <svg> racine dimensionné ; les renderers raster (RESISTOR,
// et tout futur composant qui déclare `backend: 'raster'`) sur leur <img>.
// Dans les deux cas : dimensions dérivées de componentDefinitions.js, prouvées
// par un test de MUTATION.
const CATALOG = [
  { type: "RESISTOR", Component: ResistorPart },
  { type: "LED", Component: LedPart },
  { type: "CAPACITOR", Component: CapacitorPart },
  { type: "POLARIZED_CAPACITOR", Component: PolarizedCapacitorPart },
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
// [MB-L1-CONS-002] CAPACITOR / THERMISTOR ont abandonné le raster pour un
// renderer CSS/DOM pur (corps `<div>` stylé, ni <svg> ni <img>) — `backend`
// résout désormais à `svg` (défaut, dette de métadonnée corrigée), mais ils
// ne rendent PAS de <svg> pour autant : ils ne peuvent donc pas être testés
// par le même gabarit que SVG_PARTS (qui exige un <svg> racine) ni que
// RASTER_PARTS (qui exige un <img>). Liste explicite (test uniquement — ce
// n'est pas un branchement `type === "…"` en production) : cf. delivery
// report MB-L1-CONS-002.
const PHYSICAL_DOM_TYPES = new Set(["CAPACITOR", "THERMISTOR"])
// LDR déclare bien `backend: 'raster'` et rend un <img> réel, mais celui-ci
// porte les dimensions NATIVES de l'asset (fixes, avec crop CSS) — seul le
// <div> racine (`.part-ldr`) porte la boîte canonique dynamique
// (`width = def?.width ?? 84` lu à chaque rendu). `componentDefinitions =
// boîte canonique du composant ; géométrie du corps du renderer =
// présentation À L'INTÉRIEUR de cette boîte` (principe MB-L1-CONS-002) : le
// test raster générique (qui suppose `<img>.width === def.width`) ne
// s'applique donc pas à ce type.
const WRAPPER_DIMENSIONED_RASTER_TYPES = new Set(["LDR"])
// RGB_LED est un cas distinct : ni son <div> racine (`width:'100%',
// height:'100%'`, jamais dérivé de componentDefinitions.js) ni son <img>
// (dimensions natives 90×56 codées en dur) ne consomment la boîte canonique
// au rendu STANDALONE — la boîte canonique est portée exclusivement par le
// parent `.circuit-component__body` (dimensionné par CircuitComponent.jsx
// depuis componentDefinitions.js, déjà verrouillé par
// renderQualityGate.test.jsx TEST T2/T3, inchangé et PASS). Ce n'est pas une
// régression à corriger : c'est l'architecture réelle de ce renderer
// (délégation complète du dimensionnement au parent).
const PARENT_DELEGATED_RASTER_TYPES = new Set(["RGB_LED"])

const SVG_PARTS = CATALOG.filter((p) => !PHYSICAL_DOM_TYPES.has(p.type) && getComponentPresentation(p.type).backend !== "raster")
const RASTER_PARTS = CATALOG.filter((p) => !PHYSICAL_DOM_TYPES.has(p.type) && getComponentPresentation(p.type).backend === "raster" && !WRAPPER_DIMENSIONED_RASTER_TYPES.has(p.type) && !PARENT_DELEGATED_RASTER_TYPES.has(p.type))
const WRAPPER_DIMENSIONED_RASTER_PARTS = CATALOG.filter((p) => WRAPPER_DIMENSIONED_RASTER_TYPES.has(p.type))
const PARENT_DELEGATED_RASTER_PARTS = CATALOG.filter((p) => PARENT_DELEGATED_RASTER_TYPES.has(p.type))
const PHYSICAL_DOM_PARTS = CATALOG.filter((p) => PHYSICAL_DOM_TYPES.has(p.type))

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
  describe.each(SVG_PARTS)("$type", ({ type, Component }) => {
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

  describe.each(RASTER_PARTS)("$type (backend raster) — dimensions de l'<img> dérivées de componentDefinitions.js", ({ type, Component }) => {
    it("TEST — au repos : width/height de l'<img> égalent EXACTEMENT def.width/def.height ; aucun <svg>", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const img = container.querySelector("img")
      expect(img).not.toBeNull()
      expect(container.querySelector("svg")).toBeNull()
      expect(img.getAttribute("width")).toBe(String(def.width))
      expect(img.getAttribute("height")).toBe(String(def.height))
    })

    it("TEST — mutation : si componentDefinitions.js change width/height, l'<img> rendu suit IMMÉDIATEMENT", () => {
      withSwappedDimensions(type, { width: 321, height: 654 }, () => {
        const { container } = render(<Component />)
        const img = container.querySelector("img")
        expect(img.getAttribute("width")).toBe("321")
        expect(img.getAttribute("height")).toBe("654")
      })
    })

    it("TEST — après restauration : l'<img> revient à la valeur canonique d'origine", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const img = container.querySelector("img")
      expect(img.getAttribute("width")).toBe(String(def.width))
      expect(img.getAttribute("height")).toBe(String(def.height))
    })
  })

  // [MB-L1-CONS-002] LDR / RGB_LED : le <div> racine (boîte canonique) suit
  // dynamiquement componentDefinitions.js ; l'<img> interne (asset raster
  // réel, dimensions NATIVES avec crop CSS) reste volontairement fixe —
  // séparation des responsabilités documentée, pas une régression.
  describe.each(WRAPPER_DIMENSIONED_RASTER_PARTS)("$type (backend raster, boîte portée par le wrapper) — dimensions du <div> racine dérivées de componentDefinitions.js ; <img> à taille NATIVE fixe", ({ type, Component }) => {
    it("TEST — au repos : le <div> racine égale EXACTEMENT def.width/def.height ; un <img> réel est présent, aucun <svg>", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const root = container.firstElementChild
      expect(root.style.width).toBe(`${def.width}px`)
      expect(root.style.height).toBe(`${def.height}px`)
      expect(container.querySelector("svg")).toBeNull()
      expect(container.querySelector("img")).not.toBeNull()
    })

    it("TEST — mutation : le <div> racine suit IMMÉDIATEMENT componentDefinitions.js ; l'<img> (asset natif) NE bouge PAS (séparation boîte canonique / dimensions d'asset)", () => {
      const before = render(<Component />)
      const nativeWidth = before.container.querySelector("img").getAttribute("width")
      const nativeHeight = before.container.querySelector("img").getAttribute("height")
      before.unmount()

      withSwappedDimensions(type, { width: 321, height: 654 }, () => {
        const { container } = render(<Component />)
        const root = container.firstElementChild
        expect(root.style.width).toBe("321px")
        expect(root.style.height).toBe("654px")
        const img = container.querySelector("img")
        expect(img.getAttribute("width")).toBe(nativeWidth)
        expect(img.getAttribute("height")).toBe(nativeHeight)
      })
    })

    it("TEST — après restauration : le <div> racine revient à la valeur canonique d'origine", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const root = container.firstElementChild
      expect(root.style.width).toBe(`${def.width}px`)
      expect(root.style.height).toBe(`${def.height}px`)
    })
  })

  // [MB-L1-CONS-002] RGB_LED : ni le <div> racine ni l'<img> ne dérivent la
  // boîte canonique au rendu standalone (délégation complète au parent,
  // cf. commentaire PARENT_DELEGATED_RASTER_TYPES ci-dessus) — on verrouille
  // ici le fait réel (racine toujours 100%/100%, image toujours à sa taille
  // native), jamais une consommation dynamique qui n'existe pas dans ce
  // renderer précis.
  describe.each(PARENT_DELEGATED_RASTER_PARTS)("$type (backend raster, boîte déléguée au parent) — le <div> racine ne porte PAS la boîte canonique ; l'<img> reste à sa taille native", ({ type, Component }) => {
    it("TEST — au repos : le <div> racine remplit son parent (100%/100%) ; un <img> réel est présent à sa taille native, aucun <svg>", () => {
      const { container } = render(<Component />)
      const root = container.firstElementChild
      expect(root.style.width).toBe("100%")
      expect(root.style.height).toBe("100%")
      expect(container.querySelector("svg")).toBeNull()
      expect(container.querySelector("img")).not.toBeNull()
    })

    it("TEST — mutation : componentDefinitions.js ne change ni le <div> racine (délégué au parent) ni l'<img> (taille native fixe) — la boîte canonique réelle est prouvée au niveau du parent .circuit-component__body par renderQualityGate.test.jsx TEST T2/T3, inchangé", () => {
      const before = render(<Component />)
      const nativeWidth = before.container.querySelector("img").getAttribute("width")
      const nativeHeight = before.container.querySelector("img").getAttribute("height")
      before.unmount()

      withSwappedDimensions(type, { width: 321, height: 654 }, () => {
        const { container } = render(<Component />)
        const root = container.firstElementChild
        expect(root.style.width).toBe("100%")
        expect(root.style.height).toBe("100%")
        const img = container.querySelector("img")
        expect(img.getAttribute("width")).toBe(nativeWidth)
        expect(img.getAttribute("height")).toBe(nativeHeight)
      })
    })

    it("TEST — après restauration : comportement identique (rien à restaurer, ce renderer ne lit jamais componentDefinitions.js pour ses propres dimensions)", () => {
      const { container } = render(<Component />)
      const root = container.firstElementChild
      expect(root.style.width).toBe("100%")
      expect(root.style.height).toBe("100%")
    })
  })

  // [MB-L1-CONS-002] CAPACITOR / THERMISTOR : renderer CSS/DOM pur (ni <svg>
  // ni <img>) — le <div> racine EST la boîte canonique, dynamiquement dérivée
  // de componentDefinitions.js (aucune valeur recopiée).
  describe.each(PHYSICAL_DOM_PARTS)("$type (renderer CSS/DOM physique) — dimensions du <div> racine dérivées de componentDefinitions.js ; aucun <svg>, aucun <img>", ({ type, Component }) => {
    it("TEST — au repos : le <div> racine égale EXACTEMENT def.width/def.height ; ni <svg> ni <img>", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const root = container.firstElementChild
      expect(root.style.width).toBe(`${def.width}px`)
      expect(root.style.height).toBe(`${def.height}px`)
      expect(container.querySelector("svg")).toBeNull()
      expect(container.querySelector("img")).toBeNull()
    })

    it("TEST — mutation : si componentDefinitions.js change width/height, le <div> racine suit IMMÉDIATEMENT", () => {
      withSwappedDimensions(type, { width: 321, height: 654 }, () => {
        const { container } = render(<Component />)
        const root = container.firstElementChild
        expect(root.style.width).toBe("321px")
        expect(root.style.height).toBe("654px")
      })
    })

    it("TEST — après restauration : le <div> racine revient à la valeur canonique d'origine (aucune pollution inter-tests)", () => {
      const def = getComponentDef(type)
      const { container } = render(<Component />)
      const root = container.firstElementChild
      expect(root.style.width).toBe(`${def.width}px`)
      expect(root.style.height).toBe(`${def.height}px`)
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
