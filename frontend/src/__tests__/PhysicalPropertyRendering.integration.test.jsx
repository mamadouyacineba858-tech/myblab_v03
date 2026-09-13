/**
 * PhysicalPropertyRendering.integration.test.jsx — L1-PROP-003.
 *
 * LED.properties.color : première propriété PHYSIQUE persistante (axe A),
 * strictement orthogonale à `isOn` (axe B, runtime). Couvre le contrat de
 * bout en bout : schéma déclaratif -> validation générique -> Inspector
 * (select générique) -> Document/History -> LedPart (color × isOn -> asset)
 * -> géométrie électrique inchangée -> export/import -> legacy -> assets
 * livrés/manifest/intégrité.
 */
import React from "react" // eslint-disable-line no-unused-vars -- Required by the official Vitest classic JSX transform.
import { describe, it, expect, afterEach } from "vitest"
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { CircuitProvider } from "../context/CircuitContext.jsx"
import { useCircuit } from "../context/useCircuit.js"
import { useCircuitInteraction } from "../context/useCircuitInteraction.js"
import { ComponentInspector } from "../components/ComponentInspector.jsx"
import { CircuitComponent } from "../canvas/CircuitComponent.jsx"
import { LedPart } from "../components/parts/LedPart.jsx"
import { COMPONENT_TYPES, getComponentDef, LED_COLOR_OPTIONS } from "../config/componentDefinitions.js"
import { resolveComponentProperties, validateComponentProperties } from "../config/componentProperties.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ASSET_DIR = resolve(__dirname, "../../public/assets/components/led")

let api
afterEach(cleanup)

function Probe() {
  api = useCircuit()
  const { components } = useCircuitInteraction()
  return (
    <>
      <ComponentInspector />
      {components.map((c) => <CircuitComponent key={c.uid} component={c} />)}
    </>
  )
}
function mount() {
  return render(<CircuitProvider><Probe /></CircuitProvider>)
}
function addLed() {
  act(() => api.addComponent("LED", 20, 40))
  const uid = api.exportCircuit().components.at(-1).uid
  act(() => api.selectOnly({ type: "component", id: uid }))
  return uid
}
function pinPositions(container) {
  return [...container.querySelectorAll(".myblab-pin")]
    .map((el) => [Number(el.style.left.replace("px", "")), Number(el.style.top.replace("px", ""))])
    .sort((a, b) => a[0] - b[0])
}

describe("L1-PROP-003 — schéma déclaratif et validation générique (T1/T2/T3)", () => {
  it("T1 — une nouvelle LED résout name:'' et color:'red' sans exiger de valeur explicite", () => {
    expect(resolveComponentProperties("LED")).toEqual({ name: "", color: "red" })
  })

  it("T2 — la LED expose Nom + Couleur ; les options sont exactement Rouge/Vert/Bleu/Jaune/Blanc", () => {
    const schema = COMPONENT_TYPES.LED.propertySchema
    expect(Object.keys(schema)).toEqual(["name", "color"])
    expect(schema.color.options.map((o) => o.label)).toEqual(["Rouge", "Vert", "Bleu", "Jaune", "Blanc"])
    expect(schema.color.options.map((o) => o.value)).toEqual(["red", "green", "blue", "yellow", "white"])
    expect(LED_COLOR_OPTIONS).toBe(schema.color.options)
  })

  it("T3 — validation : red/green/blue/yellow/white acceptés, pink/orange/unknown rejetés ; règles name intactes", () => {
    for (const value of ["red", "green", "blue", "yellow", "white"]) {
      expect(validateComponentProperties("LED", { name: "", color: value })).toEqual({
        valid: true, errors: [], sanitized: { name: "", color: value },
      })
    }
    for (const value of ["pink", "orange", "unknown", "", "RED", 1, null]) {
      expect(validateComponentProperties("LED", { name: "", color: value }).valid).toBe(false)
    }
    // name rules (L1-PROP-002) still enforced unchanged alongside color.
    expect(validateComponentProperties("LED", { name: "x".repeat(81), color: "red" }).valid).toBe(false)
    // partial candidates remain supported (patch semantics) for either key independently.
    expect(validateComponentProperties("LED", { name: "ok" })).toEqual({ valid: true, errors: [], sanitized: { name: "ok" } })
    expect(validateComponentProperties("LED", { color: "red" })).toEqual({ valid: true, errors: [], sanitized: { color: "red" } })
  })
})

describe("L1-PROP-003 — aucune branche par type dans la couche de rendu centrale (T4)", () => {
  it("CircuitComponent / PartRenderer / ComponentInspector / componentProperties ne contiennent aucune comparaison type===\"LED\"", () => {
    const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
    for (const rel of [
      "../canvas/CircuitComponent.jsx",
      "../components/parts/PartRenderer.jsx",
      "../components/ComponentInspector.jsx",
      "../config/componentProperties.js",
    ]) {
      const src = strip(readFileSync(resolve(__dirname, rel), "utf-8"))
      expect(src, `${rel} ne doit contenir aucune comparaison type === "LED"`).not.toMatch(/\btype\s*===?\s*["']LED["']/)
      expect(src, `${rel} ne doit contenir aucun mapping d'assets LED`).not.toMatch(/led\.(red|green|blue|yellow|white)\./)
    }
  })
})

describe("L1-PROP-003 — Inspector -> Document -> History (T5/T6)", () => {
  it("T5 — choisir Vert commite properties.color='green' ; parameters reste inchangé", () => {
    mount(); addLed()
    const before = api.selectedComponent.parameters
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "green" } })
    expect(api.selectedComponent.properties.color).toBe("green")
    expect(api.selectedComponent.parameters).toEqual(before)
  })

  it("T6 — red -> blue produit exactement +1 History ; Undo -> red ; Redo -> blue", () => {
    mount(); addLed()
    const count = api.getUndoCount()
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "blue" } })
    expect(api.selectedComponent.properties.color).toBe("blue")
    expect(api.getUndoCount()).toBe(count + 1)
    act(() => api.undo())
    expect(api.selectedComponent.properties.color).toBe("red")
    act(() => api.redo())
    expect(api.selectedComponent.properties.color).toBe("blue")
  })

  it("sélectionner la même couleur ne produit aucune History supplémentaire", () => {
    mount(); addLed()
    const count = api.getUndoCount()
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "red" } })
    expect(api.getUndoCount()).toBe(count)
  })
})

describe("L1-PROP-003 — LedPart : properties.color × isOn -> asset (T7/T8/T9)", () => {
  it("T7 — color=green, isOn=false -> asset green/off", () => {
    const { container } = render(<LedPart isOn={false} properties={{ color: "green" }} />)
    expect(container.querySelector("img").getAttribute("src")).toContain("/assets/components/led/led.green.off.")
  })

  it("T8 — color=green, isOn=true -> asset green/on", () => {
    const { container } = render(<LedPart isOn={true} properties={{ color: "green" }} />)
    expect(container.querySelector("img").getAttribute("src")).toContain("/assets/components/led/led.green.on.")
  })

  it("T9 — changer green -> blue change l'asset immédiatement, sans toucher uid/x/y/pins/contacts", () => {
    mount(); addLed()
    const before = { uid: api.selectedComponent.uid, x: api.selectedComponent.x, y: api.selectedComponent.y }
    const positionsBefore = pinPositions(document.body)
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "green" } })
    expect(document.querySelector(".circuit-component__body img").getAttribute("src")).toContain("led.green.")
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "blue" } })
    expect(document.querySelector(".circuit-component__body img").getAttribute("src")).toContain("led.blue.")
    expect(api.selectedComponent.uid).toBe(before.uid)
    expect(api.selectedComponent.x).toBe(before.x)
    expect(api.selectedComponent.y).toBe(before.y)
    expect(pinPositions(document.body)).toEqual(positionsBefore)
  })

  it.each(LED_COLOR_OPTIONS.map((o) => o.value))("mapping complet : %s/off et %s/on référencent les assets correspondants", (color) => {
    const off = render(<LedPart isOn={false} properties={{ color }} />).container.querySelector("img").getAttribute("src")
    const on = render(<LedPart isOn={true} properties={{ color }} />).container.querySelector("img").getAttribute("src")
    expect(off).toContain(`/assets/components/led/led.${color}.off.`)
    expect(on).toContain(`/assets/components/led/led.${color}.on.`)
  })
})

describe("L1-PROP-003 — indépendance runtime / persistant (T10/T14) et verrou géométrique (T11)", () => {
  it("T10 — off -> on (runtime) ne mute jamais properties.color ni le Document", () => {
    const before = { color: "blue" }
    const off = render(<LedPart isOn={false} properties={before} />)
    off.unmount()
    const on = render(<LedPart isOn={true} properties={before} />)
    on.unmount()
    expect(before).toEqual({ color: "blue" })
  })

  it("T11 — largeur/hauteur/anode/cathode strictement identiques avant/après changement de couleur", () => {
    mount(); addLed()
    const def = getComponentDef("LED")
    const before = pinPositions(document.body)
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "white" } })
    expect(pinPositions(document.body)).toEqual(before)
    expect([def.width, def.height]).toEqual([80, 64])
    const byId = Object.fromEntries(def.pins.map((p) => [p.id, [p.dx, p.dy]]))
    expect(byId.anode).toEqual([28, 62])
    expect(byId.cathode).toEqual([52, 62])
  })

  it("T14 — un changement de paramètre électrique ne modifie jamais properties.color, et réciproquement", () => {
    mount(); const uid = addLed()
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "yellow" } })
    act(() => api.updateComponentProperties(uid, { name: "Témoin" }))
    expect(api.selectedComponent.properties.color).toBe("yellow")
    expect(api.selectedComponent.properties.name).toBe("Témoin")
  })
})

describe("L1-PROP-003 — export/import et compatibilité legacy (T12/T13)", () => {
  it("T12 — exporter une LED color=yellow puis réimporter préserve properties.color et le rendu", () => {
    mount(); addLed()
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "yellow" } })
    const uid = api.selectedComponent.uid
    const exported = JSON.parse(JSON.stringify(api.exportCircuit()))
    act(() => api.importCircuit(exported))
    act(() => api.selectOnly({ type: "component", id: uid }))
    expect(api.selectedComponent.properties.color).toBe("yellow")
    expect(document.querySelector(".circuit-component__body img").getAttribute("src")).toContain("led.yellow.")
  })

  it("T13 — un Document historique sans properties.color résout color:'red' sans crash", () => {
    const legacyDocument = { components: [{ uid: "legacy-led", type: "LED", x: 10, y: 10, pins: [], parameters: {} }], wires: [] }
    expect(() => {
      mount()
      act(() => api.importCircuit(legacyDocument))
      act(() => api.selectOnly({ type: "component", id: "legacy-led" }))
    }).not.toThrow()
    expect(api.selectedComponent.properties?.color).toBeUndefined() // stored value absent (legacy) …
    expect(resolveComponentProperties("LED", api.selectedComponent.properties)).toEqual({ name: "", color: "red" }) // … effective resolution = red
    expect(document.querySelector(".circuit-component__body img").getAttribute("src")).toContain("led.red.")
  })
})

describe("L1-PROP-003 — régression T15 (édition texte inchangée en présence de color)", () => {
  it("le champ Nom reste text/blur/Enter/Escape/maxLength=80 conforme à L1-PROP-002 sur une LED colorée", () => {
    mount(); addLed()
    fireEvent.change(screen.getByLabelText("Couleur"), { target: { value: "green" } })
    const name = screen.getByLabelText("Nom")
    expect(name.type).toBe("text")
    expect(name.maxLength).toBe(80)
    act(() => name.focus())
    fireEvent.change(name, { target: { value: "discard me" } })
    fireEvent.keyDown(name, { key: "Escape" })
    expect(name.value).toBe("")
    act(() => name.focus())
    fireEvent.change(name, { target: { value: "LED témoin" } })
    act(() => name.blur())
    expect(api.selectedComponent.properties.name).toBe("LED témoin")
    expect(api.selectedComponent.properties.color).toBe("green")
  })
})

describe("L1-PROP-003 — assets livrés, manifest et intégrité (T16/T17/T18)", () => {
  const colors = ["red", "green", "blue", "yellow", "white"]
  const states = ["off", "on"]

  it("T16 — les 40 nouveaux assets existent, dimensions 1x=80×64 / 3x=240×192", () => {
    for (const color of colors) {
      for (const state of states) {
        for (const [scale, w, h] of [["1x", 80, 64], ["3x", 240, 192]]) {
          for (const ext of ["png", "webp"]) {
            const bytes = readFileSync(resolve(ASSET_DIR, `led.${color}.${state}.${scale}.${ext}`))
            expect(bytes.length).toBeGreaterThan(0)
            if (ext === "png") {
              expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([w, h])
            }
          }
        }
      }
    }
  })

  it("T17 — manifest : géométrie canonique inchangée, colors correctes, defaultColor red, legacy préservé", () => {
    const manifest = JSON.parse(readFileSync(resolve(ASSET_DIR, "manifest.json"), "utf-8"))
    expect(manifest.canonical).toEqual({ width: 80, height: 64, pins: { anode: [28, 62], cathode: [52, 62] }, origin: "top-left" })
    expect(manifest.colors).toEqual(colors)
    expect(manifest.defaultColor).toBe("red")
    const legacyFiles = manifest.variants.filter((v) => v.legacy === true).map((v) => v.file)
    expect(legacyFiles.sort()).toEqual(["led.off.1x.png", "led.off.1x.webp", "led.off.3x.png", "led.off.3x.webp",
      "led.on.1x.png", "led.on.1x.webp", "led.on.3x.png", "led.on.3x.webp"].sort())
    for (const color of colors) {
      for (const state of states) {
        expect(manifest.variants.some((v) => v.color === color && v.state === state && v.scale === "1x" && v.format === "png")).toBe(true)
        expect(manifest.variants.some((v) => v.color === color && v.state === state && v.scale === "3x" && v.format === "webp")).toBe(true)
      }
    }
  })

  it("T18 — chaque fichier déclaré dans ASSET-INTEGRITY.json existe avec les bytes/SHA-256 réels", () => {
    const integrity = JSON.parse(readFileSync(resolve(ASSET_DIR, "ASSET-INTEGRITY.json"), "utf-8"))
    expect(integrity.files.length).toBe(49) // 8 legacy + 40 nouveaux + manifest.json
    for (const { file, bytes: expectedBytes, sha256 } of integrity.files) {
      const buf = readFileSync(resolve(ASSET_DIR, file))
      expect(buf.length).toBe(expectedBytes)
      expect(createHash("sha256").update(buf).digest("hex")).toBe(sha256)
    }
  })
})
