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
import { readFileSync, existsSync, statSync } from "node:fs"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

import { COMPONENT_TYPES } from "../config/componentDefinitions.js"
import { DEFAULT_REGISTRATIONS, getComponentByType, getComponentPresentation } from "../visualization/defaultRegistrations.js"
import { RENDER_BUDGET } from "../visualization/visualContract.js"
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

  // MB-VIS-INDUSTRIAL-001 : les 2 anciennes comparaisons `type === "LED"` de
  // CircuitComponent.jsx (habillage du body + masquage du marqueur de pin) ont
  // été remplacées par une présentation DÉCLARATIVE (getComponentPresentation
  // -> data-bare-body / hideVisualMarker). La couche de rendu ne contient donc
  // plus AUCUNE comparaison de type : la table d'exceptions est vide.
  const KNOWN_EXCEPTIONS = {}

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

describe("MB-VIS-INDUSTRIAL-001 — TEST T10 : intégrité + budget des assets raster (RENDER_BUDGET.raster)", () => {
  // Pendant raster du garde-fou T9 (primitives SVG) : pour chaque composant
  // dont l'entrée de registre déclare le backend raster, on vérifie sur les
  // FICHIERS RÉELS (octets, dimensions, sha256) que le paquet d'assets est
  // présent, cohérent avec son manifeste / son ASSET-INTEGRITY, sous le budget
  // de poids et de dimension du contrat visuel, et ancré à la géométrie
  // canonique. Générique et TOLÉRANT AU SCHÉMA : `manifest.type` ou
  // `manifest.component` ; `manifest.assets[]` (schéma RESISTOR) ou
  // `manifest.variants[]` (schéma DIODE) ; `ASSET-INTEGRITY.json` optionnel.
  // Tout futur composant raster est couvert sans le nommer ici.
  const publicDir = resolve(__dirname, "../../public")
  const RASTER_TYPES = ALL_TYPES.filter(
    (type) => getComponentPresentation(type).backend === "raster"
  )
  const toKebab = (type) => type.toLowerCase().replace(/_/g, "-")
  const sha256 = (buf) => createHash("sha256").update(buf).digest("hex")

  // Dimensions réelles d'un PNG (IHDR) ou d'un WebP (VP8X / VP8L / VP8 lossy).
  function imageDims(buf) {
    if (buf.toString("ascii", 12, 16) === "IHDR") {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
    }
    if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
      const fourcc = buf.toString("ascii", 12, 16)
      if (fourcc === "VP8X") {
        return {
          w: 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16)),
          h: 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16)),
        }
      }
      if (fourcc === "VP8L") {
        const b = buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24)
        return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }
      }
      if (fourcc === "VP8 ") {
        return {
          w: ((buf[27] << 8) | buf[26]) & 0x3fff,
          h: ((buf[29] << 8) | buf[28]) & 0x3fff,
        }
      }
    }
    return null
  }

  it("le budget raster du contrat est exploitable (bornes > 0)", () => {
    expect(RENDER_BUDGET.raster.maxWeightKbPerVariantSimple).toBeGreaterThan(0)
    expect(RENDER_BUDGET.raster.maxWeightKbPerVariantComplex).toBeGreaterThanOrEqual(
      RENDER_BUDGET.raster.maxWeightKbPerVariantSimple
    )
    expect(RENDER_BUDGET.raster.maxDimensionPx).toBeGreaterThan(0)
    expect(RENDER_BUDGET.raster.resolutions).toBe(2)
  })

  for (const type of RASTER_TYPES) {
    it(`${type} : paquet d'assets présent, sha256/octets/dimensions cohérents, sous le budget`, () => {
      const kebab = toKebab(type)
      const dir = resolve(publicDir, `assets/components/${kebab}`)
      const manifestPath = resolve(dir, "manifest.json")
      expect(existsSync(manifestPath), `manifeste manquant : ${manifestPath}`).toBe(true)
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"))

      // composant déclaré (schéma RESISTOR: `type` ; schéma DIODE: `component`)
      expect(manifest.type ?? manifest.component).toBe(type)
      // backend déclaré cohérent si présent
      if (manifest.backend !== undefined) expect(manifest.backend).toBe("raster")
      // géométrie canonique déclarée cohérente avec componentDefinitions
      // (schéma DIODE: `canonical` ; schéma RESISTOR: `canonicalBox`)
      const canon = manifest.canonical ?? manifest.canonicalBox
      if (canon) {
        const def = COMPONENT_TYPES[type]
        expect(canon.width).toBe(def.width)
        expect(canon.height).toBe(def.height)
      }

      // liste des variantes image : `assets[]` OU `variants[]`
      const entries = (manifest.assets ?? manifest.variants ?? [])
      const imageEntries = entries.filter((e) => /\.(webp|png)$/.test(e.file))
      expect(
        imageEntries.length,
        "attendu 2 résolutions × (webp + png)"
      ).toBe(RENDER_BUDGET.raster.resolutions * 2)

      // intégrité optionnelle (bytes + sha256 par fichier)
      const integPath = resolve(dir, "ASSET-INTEGRITY.json")
      const integrity = existsSync(integPath)
        ? new Map(JSON.parse(readFileSync(integPath, "utf-8")).map((r) => [r.file, r]))
        : null

      const cap =
        manifest.complexity === "complex" || manifest.budget?.complexity === "complex"
          ? RENDER_BUDGET.raster.maxWeightKbPerVariantComplex
          : RENDER_BUDGET.raster.maxWeightKbPerVariantSimple

      for (const entry of imageEntries) {
        const p = resolve(dir, entry.file)
        expect(existsSync(p), `asset manquant : ${entry.file}`).toBe(true)
        const buf = readFileSync(p)
        const bytes = buf.length
        expect(statSync(p).size).toBe(bytes)

        // octets réels == manifeste (si déclarés) et == ASSET-INTEGRITY (si présent)
        if (typeof entry.bytes === "number") {
          expect(bytes, `${entry.file} : octets réels ≠ manifeste`).toBe(entry.bytes)
        }
        if (integrity?.has(entry.file)) {
          expect(bytes, `${entry.file} : octets réels ≠ ASSET-INTEGRITY`).toBe(integrity.get(entry.file).bytes)
          expect(sha256(buf), `${entry.file} : sha256 réel ≠ ASSET-INTEGRITY`).toBe(integrity.get(entry.file).sha256)
        }

        // budget de poids
        expect(
          bytes / 1024,
          `${entry.file} = ${(bytes / 1024).toFixed(1)} Ko > budget ${cap} Ko`
        ).toBeLessThanOrEqual(cap)

        // dimension réelle ≤ maxDimensionPx
        const dims = imageDims(buf)
        expect(dims, `${entry.file} : en-tête image illisible`).not.toBeNull()
        expect(
          Math.max(dims.w, dims.h),
          `${entry.file} (${dims.w}×${dims.h}) dépasse maxDimensionPx`
        ).toBeLessThanOrEqual(RENDER_BUDGET.raster.maxDimensionPx)
      }

      // @3x ≈ 3 × @1x (± 1 px) sur chaque format, quand les 2 résolutions existent
      for (const ext of ["webp", "png"]) {
        const one = imageEntries.find((e) => e.file.includes(`.1x.${ext}`))
        const three = imageEntries.find((e) => e.file.includes(`.3x.${ext}`))
        if (!one || !three) continue
        const a = imageDims(readFileSync(resolve(dir, one.file)))
        const c = imageDims(readFileSync(resolve(dir, three.file)))
        expect(Math.abs(c.w - a.w * 3), `${ext}: 3x.w ≠ 3×1x.w`).toBeLessThanOrEqual(1)
        expect(Math.abs(c.h - a.h * 3), `${ext}: 3x.h ≠ 3×1x.h`).toBeLessThanOrEqual(1)
      }
    })
  }
})
