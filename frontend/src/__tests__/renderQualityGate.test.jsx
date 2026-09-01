/**
 * renderQualityGate.test.jsx — MB-VIS-RENDER-009 (Phase 4/8, TEST T1-T9)
 *
 * Verrouille, comme garde durable, le contrat de qualité de rendu établi par
 * MB-VIS-RENDER-009 (voir docs/pmo/tickets/MB-VIS-RENDER-009-visual-quality-contract.md).
 *
 * Contrainte de gouvernance de ce ticket : "baseline et contrat, pas une
 * refonte esthétique". Ces tests valident donc des PROPRIÉTÉS STRUCTURELLES
 * (cohérence dimensions/pins, découplage présentation/électrique, absence de
 * branchement générique, déterminisme, garde-fou performance) — jamais une
 * implémentation graphique précise (pas de snapshot pixel, pas d'assertion
 * sur une couleur ou une forme particulière) — pour ne jamais bloquer un
 * futur ticket visuel (MB-VIS-LED-010 → MB-VIS-TINKERCAD-030) qui améliorerait
 * légitimement le réalisme d'un composant.
 *
 * T4 (non-mutation de la géométrie électrique) est déjà verrouillé par
 * config/__tests__/componentDefinitions.test.js et n'est pas dupliqué ici.
 * T7 (cohérence des matériaux/conventions) n'a pas de test : aucune
 * convention n'existe encore à vérifier (voir §6 du contrat).
 */
import React from "react"
import { describe, it, expect } from "vitest"
import { render, act } from "@testing-library/react"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import { COMPONENT_TYPES } from "../config/componentDefinitions.js"
import { DEFAULT_REGISTRATIONS, getComponentByType } from "../visualization/defaultRegistrations.js"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { CircuitComponent } from "../canvas/CircuitComponent.jsx"
import { getPinPresentationPosition } from "../utils/pinPresentationGeometry.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Réutilise tel quel le stripComments() corrigé de MB-VIS-COMP-007/008 (ordre
// ligne-puis-bloc) — voir pinFootprintConsumersGuard.test.js pour la
// justification complète de cet ordre.
function stripComments(source) {
  return source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")
}

const ALL_TYPES = Object.keys(COMPONENT_TYPES)

// Props minimales nécessaires pour un rendu stable (LED/RGB_LED reçoivent un
// état visuel dérivé via le Visual State Registry en production ; on fige
// ici une valeur fixe pour tester le déterminisme du RENDU, pas le calcul
// de l'état).
function fixedPropsFor(type) {
  if (type === "LED") return { isOn: false }
  if (type === "RGB_LED") return { r: false, g: true, b: false }
  return {}
}

describe("MB-VIS-RENDER-009 — TEST T1 : présence du contrat de qualité", () => {
  const contractPath = resolve(__dirname, "../../../docs/pmo/tickets/MB-VIS-RENDER-009-visual-quality-contract.md")

  it("le fichier de contrat existe", () => {
    expect(existsSync(contractPath), `contrat manquant : ${contractPath}`).toBe(true)
  })

  it("le contrat documente bien les 14 dimensions de qualité Q1-Q14", () => {
    const content = readFileSync(contractPath, "utf-8")
    for (let i = 1; i <= 14; i++) {
      expect(content, `dimension Q${i} absente du contrat`).toMatch(new RegExp(`\\bQ${i}\\b`))
    }
  })
})

describe("MB-VIS-RENDER-009 — TEST T2/T3 : cohérence dimensions/pins au niveau du conteneur CircuitComponent", () => {
  const circuitWrapper = ({ children }) => <CircuitProvider>{children}</CircuitProvider>

  function Harness({ type, onReady }) {
    const circuit = useCircuit()
    onReady(circuit)
    return <>{circuit.components.map((comp) => <CircuitComponent key={comp.uid} component={comp} />)}</>
  }

  for (const type of ALL_TYPES) {
    it(`${type} : le conteneur .circuit-component a width/height exactement égaux à getComponentDef().width/height`, () => {
      let circuit
      const { container } = render(
        <Harness type={type} onReady={(c) => { circuit = c }} />,
        { wrapper: circuitWrapper }
      )
      act(() => { circuit.addComponent(type, 50, 60) })
      const wrapper = container.querySelector(".circuit-component")
      expect(wrapper).not.toBeNull()
      const def = COMPONENT_TYPES[type]
      expect(wrapper.style.width).toBe(`${def.width}px`)
      expect(wrapper.style.height).toBe(`${def.height}px`)
    })

    it(`${type} : chaque <Pin> rendu est positionné exactement à getPinPresentationPosition() (relatif au composant)`, () => {
      let circuit
      const { container } = render(
        <Harness type={type} onReady={(c) => { circuit = c }} />,
        { wrapper: circuitWrapper }
      )
      act(() => { circuit.addComponent(type, 50, 60) })
      const component = circuit.components[0]
      const def = COMPONENT_TYPES[type]
      const pinButtons = container.querySelectorAll(".myblab-pin")
      expect(pinButtons.length).toBe(def.pins.length)

      def.pins.forEach((pin, index) => {
        const expected = getPinPresentationPosition(component, pin)
        const expectedLeft = expected.x - component.x
        const expectedTop = expected.y - component.y
        const el = pinButtons[index]
        expect(Number(el.style.left.replace("px", ""))).toBeCloseTo(expectedLeft, 5)
        expect(Number(el.style.top.replace("px", ""))).toBeCloseTo(expectedTop, 5)
      })
    })
  }
})

describe("MB-VIS-RENDER-009 — TEST T5 : découplage présentation/électrique (aucun import simulator/ dans components/parts/)", () => {
  const partsDir = resolve(__dirname, "../components/parts")

  for (const type of ALL_TYPES) {
    const Component = getComponentByType(type)
    // Le nom de fichier suit toujours le nom du composant exporté (contrat
    // établi depuis MB-VIS-COMP-006, aucune exception connue).
    const fileName = `${Component.name}.jsx`
    const filePath = resolve(partsDir, fileName)

    it(`${fileName} n'importe rien depuis simulator/`, () => {
      expect(existsSync(filePath), `fichier introuvable : ${filePath}`).toBe(true)
      const codeOnly = stripComments(readFileSync(filePath, "utf-8"))
      const forbidden = codeOnly.match(/from\s+["'][^"']*\/simulator\//)
      expect(forbidden, `import interdit trouvé dans ${fileName} : "${forbidden?.[0]}"`).toBeNull()
    })
  }

  it("sanity check : le motif interdit est bien détecté sur un extrait fabriqué", () => {
    const fakeSource = `import { getDcContribution } from '../../simulator/dcContributionRegistry.js'`
    expect(fakeSource).toMatch(/from\s+["'][^"']*\/simulator\//)
  })
})

describe("MB-VIS-RENDER-009 — TEST T6 : absence de nouveau branchement générique par type dans la couche de rendu", () => {
  // Motif large (variable locale `type` OU propriété `.type`), restreint aux
  // littéraux ALL-CAPS/underscore (les identifiants de type de composant),
  // pour ne jamais confondre avec des comparaisons d'état/interaction
  // (ex. `interaction.type === "momentary"`, `component.state === "pressed"`
  // — toutes en minuscules, donc naturellement exclues).
  const TYPE_BRANCH_PATTERN = /\btype\s*(===|!==)\s*["']([A-Z0-9_]+)["']/g

  const KNOWN_EXCEPTIONS = {
    "CircuitComponent.jsx": ["LED", "LED"], // 2 occurrences documentées (style du body + hideVisualMarker), toutes deux présentationnelles pour LED
  }

  const RENDER_FILES = [
    { path: resolve(__dirname, "../canvas/CircuitComponent.jsx"), key: "CircuitComponent.jsx" },
    { path: resolve(__dirname, "../canvas/Pin.jsx"), key: "Pin.jsx" },
    { path: resolve(__dirname, "../components/parts/PartRenderer.jsx"), key: "PartRenderer.jsx" },
  ]

  for (const { path, key } of RENDER_FILES) {
    it(`${key} ne contient aucune comparaison de type non répertoriée`, () => {
      const codeOnly = stripComments(readFileSync(path, "utf-8"))
      const found = [...codeOnly.matchAll(TYPE_BRANCH_PATTERN)].map((m) => m[2])
      const allowed = [...(KNOWN_EXCEPTIONS[key] ?? [])]
      const unexpected = [...found]
      for (const type of found) {
        const idx = allowed.indexOf(type)
        if (idx !== -1) allowed.splice(idx, 1)
      }
      // Toute occurrence en trop (nouveau branchement) OU en moins (une
      // exception documentée aurait disparu du code sans mise à jour de ce
      // test) doit être visible explicitement.
      expect(found.sort(), `occurrences trouvées dans ${key}`).toEqual(
        (KNOWN_EXCEPTIONS[key] ?? []).slice().sort()
      )
    })
  }

  it("sanity check : le motif de branchement générique est bien détecté sur un extrait fabriqué (variable locale ET propriété)", () => {
    expect([...`if (type === "WIDGET") {}`.matchAll(TYPE_BRANCH_PATTERN)].map((m) => m[2])).toEqual(["WIDGET"])
    expect([...`if (comp.type === "WIDGET") {}`.matchAll(TYPE_BRANCH_PATTERN)].map((m) => m[2])).toEqual(["WIDGET"])
  })

  it("sanity check : les comparaisons d'état/interaction en minuscules ne sont jamais détectées (pas de faux positif)", () => {
    expect([...`interaction.type === "momentary"`.matchAll(TYPE_BRANCH_PATTERN)]).toHaveLength(0)
    expect([...`component.state === "pressed"`.matchAll(TYPE_BRANCH_PATTERN)]).toHaveLength(0)
  })
})

describe("MB-VIS-RENDER-009 — TEST T8 : déterminisme du rendu (Q14)", () => {
  for (const type of ALL_TYPES) {
    it(`${type} : deux rendus successifs avec les mêmes props produisent un HTML strictement identique`, () => {
      const Component = getComponentByType(type)
      const props = fixedPropsFor(type)
      const first = render(<Component {...props} />)
      const firstHtml = first.container.innerHTML
      first.unmount()

      const second = render(<Component {...props} />)
      const secondHtml = second.container.innerHTML
      second.unmount()

      expect(secondHtml).toBe(firstHtml)
    })
  }
})

describe("MB-VIS-RENDER-009 — TEST T9 : garde-fou performance — nombre de primitives SVG (Q12)", () => {
  // Plafond délibérément généreux (voir contrat §6) : LED, le renderer le
  // plus détaillé du catalogue à ce jour, compte 27 primitives. Ce garde-fou
  // ne verrouille pas un niveau de réalisme, seulement l'absence
  // d'explosion accidentelle.
  const PRIMITIVE_CEILING = 40
  const PRIMITIVE_SELECTOR = "rect, circle, line, path, ellipse, polygon"

  for (const type of ALL_TYPES) {
    it(`${type} : le <svg> racine contient moins de ${PRIMITIVE_CEILING} primitives`, () => {
      const Component = getComponentByType(type)
      const { container } = render(<Component {...fixedPropsFor(type)} />)
      const svg = container.querySelector("svg")
      // MB-VIS-PROTOTYPE-001C : un renderer backend "raster" ne rend pas de
      // <svg> mais un <img> vers un asset validé -> 0 primitive SVG, sous le
      // plafond par construction. Le garde-fou reste actif pour les <svg>.
      if (!svg) {
        expect(container.querySelector("img"), `${type} : ni <svg> ni <img>`).not.toBeNull()
        return
      }
      const count = svg.querySelectorAll(PRIMITIVE_SELECTOR).length
      expect(count, `${type} compte ${count} primitives SVG`).toBeLessThan(PRIMITIVE_CEILING)
    })
  }
})
