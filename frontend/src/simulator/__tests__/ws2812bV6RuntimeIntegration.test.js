import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { recordDigitalTransitions } from "../digitalTransitions.js"
import {
  SIMULATION_STEP_MS,
  createSimulationRuntimeSession,
  resetSimulationRuntimeSession,
  retainSimulationRuntimeSessionUids,
  runSimulationWithRuntime,
} from "../simulationRuntimeIntegration.js"
import { runSimulation } from "../engine.js"
import { InvalidDigitalTransitionError } from "../errors/index.js"
import { Signal } from "../signals.js"

/**
 * A12-NEOPIXEL-FUNC-WS2812B-V6-001 — pixels WS2812B_V6 dans le runtime
 * générique (Registry de production, aucun fixture) : alimentation par POWER,
 * données injectées comme par un futur producteur sur la pin d'un composant
 * non contributeur (PNP_TRANSISTOR "src"), chaînage DOUT -> DIN par fils.
 * N pixels = N composants unitaires : aucune API strip/ring.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const readSourceWithoutComments = (name) => readFileSync(resolve(__dirname, "..", name), "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")

const byteBits = (byte) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
const grbBits = ({ r, g, b }) => [...byteBits(g), ...byteBits(r), ...byteBits(b)]
/** Trame valide sur src.emitter (0 = 300/950 ns, 1 = 800/600 ns), temps en ns entiers -> ms. */
function frame(colors, startNs = 1_000_000) {
  const out = []
  let t = startNs
  for (const bit of colors.flatMap(grbBits)) {
    out.push({ pinId: "emitter", timeMs: t / 1e6, signal: Signal.HIGH })
    out.push({ pinId: "emitter", timeMs: (t + (bit ? 800 : 300)) / 1e6, signal: Signal.LOW })
    t += bit ? 1400 : 1250
  }
  return out
}

const RED = { r: 0xff, g: 0x00, b: 0x00 }
const GREEN = { r: 0x00, g: 0xff, b: 0x00 }
const TEAL = { r: 0x12, g: 0x34, b: 0x56 }

const wire = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
/** POWER + src + chaîne de pixels (dans l'ordre de la chaîne), chacun alimenté. */
function chain(uids, { cycle = false } = {}) {
  const components = [
    { uid: "p", type: "POWER", x: 0, y: 0 },
    { uid: "src", type: "PNP_TRANSISTOR", x: 0, y: 0 },
    ...uids.map((uid) => ({ uid, type: "WS2812B_V6", x: 0, y: 0 })),
  ]
  const wires = [
    ...uids.flatMap((uid) => [wire("p", "5V", uid, "VDD"), wire("p", "GND", uid, "VSS")]),
    wire("src", "emitter", uids[0], "DIN"),
    ...uids.slice(1).map((uid, i) => wire(uids[i], "DOUT", uid, "DIN")),
  ]
  if (cycle) wires.push(wire(uids.at(-1), "DOUT", uids[0], "DIN"))
  return { components, wires }
}
const step = ({ components, wires }, session) => runSimulationWithRuntime(components, wires, { dt: SIMULATION_STEP_MS, runtimeSession: session })
const color = (session, uid) => session.digitalEventStates.get(uid)?.color ?? null

/** Envoie les couleurs (ordre de la chaîne) au step 16 ; RESET reconnu au step 32. */
function send(circuit, colors, session = createSimulationRuntimeSession(), startNs = 1_000_000) {
  recordDigitalTransitions(session.digitalTransitions, "src", frame(colors, startNs))
  step(circuit, session)
  step(circuit, session)
  return session
}

describe("A12-FUNC — pixel unitaire dans le runtime générique", () => {
  it("1 pixel : couleur latchée dans digitalEventStates, jamais dans le Document (P19)", () => {
    const circuit = chain(["a"])
    const before = JSON.stringify(circuit)
    const session = createSimulationRuntimeSession()
    recordDigitalTransitions(session.digitalTransitions, "src", frame([TEAL]))
    step(circuit, session)
    expect(color(session, "a")).toBeNull() // RESET pas encore observable à l'horizon
    step(circuit, session)
    expect(color(session, "a")).toEqual({ r: 0x12, g: 0x34, b: 0x56 })
    expect(JSON.stringify(circuit)).toBe(before)
    expect(session.timedDigitalStates.size).toBe(0)
  })

  it("non alimenté (pas de POWER) : aucune couleur", () => {
    const { components, wires } = chain(["a"])
    const session = createSimulationRuntimeSession()
    recordDigitalTransitions(session.digitalTransitions, "src", frame([TEAL]))
    const unpowered = { components: components.filter((c) => c.uid !== "p"), wires: wires.filter((w) => w.fromUid !== "p") }
    step(unpowered, session)
    step(unpowered, session)
    expect(color(session, "a")).toBeNull()
  })

  it("SignalMap inchangé : pinSignals identiques au contrat historique (DIN/DOUT jamais pilotés au niveau)", () => {
    const circuit = chain(["a", "b"])
    const session = createSimulationRuntimeSession()
    recordDigitalTransitions(session.digitalTransitions, "src", frame([RED, GREEN]))
    const pinSignals = step(circuit, session)
    expect([...pinSignals.entries()]).toEqual([...runSimulation(circuit.components, circuit.wires).entries()])
  })
})

describe("A12-FUNC — cascade DOUT -> DIN", () => {
  it("P27 — A -> B : deux couleurs distinctes", () => {
    const session = send(chain(["a", "b"]), [RED, GREEN])
    expect(color(session, "a")).toEqual(RED)
    expect(color(session, "b")).toEqual(GREEN)
  })

  it("P28 — A -> B -> C : trois couleurs", () => {
    const session = send(chain(["a", "b", "c"]), [RED, GREEN, TEAL])
    expect([color(session, "a"), color(session, "b"), color(session, "c")]).toEqual([RED, GREEN, TEAL])
  })

  it("P29 — déterministe quel que soit l'ordre des uid et des composants", () => {
    const reference = send(chain(["a", "b", "c"]), [RED, GREEN, TEAL])
    const reversed = chain(["z", "m", "a"]) // ordre de traitement (uid) inverse de la chaîne
    reversed.components.reverse()
    const session = send(reversed, [RED, GREEN, TEAL])
    expect([color(session, "z"), color(session, "m"), color(session, "a")]).toEqual([RED, GREEN, TEAL])
    expect([...session.digitalEventStates.values()].map((s) => s.color)).toHaveLength(3)
    expect(color(reference, "c")).toEqual(TEAL)
  })

  it("données insuffisantes : un pixel en bout de chaîne sans ses 24 bits ne latche rien", () => {
    const session = send(chain(["a", "b", "c"]), [RED, GREEN])
    expect([color(session, "a"), color(session, "b"), color(session, "c")]).toEqual([RED, GREEN, null])
  })

  it("P31 — RESET/latch cohérent après cascade : une seconde trame met à jour toute la chaîne", () => {
    const circuit = chain(["a", "b"])
    const session = send(circuit, [RED, GREEN])
    send(circuit, [TEAL, RED], session, 40_000_000)
    expect([color(session, "a"), color(session, "b")]).toEqual([TEAL, RED])
  })

  it("P30 — topologie cyclique (DOUT du dernier -> DIN du premier) : bornée, sans boucle infinie", () => {
    const circuit = chain(["a", "b"], { cycle: true })
    // aucune donnée ne revient sur le net de A : terminaison normale
    const session = send(circuit, [RED, GREEN])
    expect([color(session, "a"), color(session, "b")]).toEqual([RED, GREEN])
    // des données qui reviennent sur DIN de A = deux producteurs sur un même net :
    // refus explicite (monotonie du store), jamais une boucle ni un écrasement silencieux
    const collision = createSimulationRuntimeSession()
    recordDigitalTransitions(collision.digitalTransitions, "src", frame([RED, GREEN, TEAL]))
    expect(() => step(circuit, collision)).toThrow(InvalidDigitalTransitionError)
  })

  it("P32 — suppression d'un pixel (retain) et reset runtime purgent son état", () => {
    const session = send(chain(["a", "b"]), [RED, GREEN])
    retainSimulationRuntimeSessionUids(session, new Set(["p", "src", "a"]))
    expect([...session.digitalEventStates.keys()]).toEqual(["a"])
    resetSimulationRuntimeSession(session)
    expect(session.digitalEventStates.size).toBe(0)
    expect(session.digitalTransitions.size).toBe(0)
  })
})

describe("A12-FUNC — gardes d'architecture", () => {
  it("P22 — ONE RESOLUTION : un seul appel resolveSignals() dans l'intégration", () => {
    expect(readSourceWithoutComments("simulationRuntimeIntegration.js").match(/\bresolveSignals\s*\(/g)).toHaveLength(1)
  })

  it("P23 — aucune connaissance WS2812 dans le moteur générique (hors commentaires)", () => {
    for (const name of ["simulationRuntimeIntegration.js", "digitalTransitions.js", "engine.js", "resolution.js", "preparation.js", "scheduler.js", "clock.js", "runtimeOrchestrator.js"]) {
      expect(readSourceWithoutComments(name), name).not.toMatch(/WS2812|ws2812|NeoPixel|NEOPIXEL|\bDIN\b|\bDOUT\b/)
    }
  })

  it("P24 — aucun code Arduino / NeoPixel ajouté au firmware", () => {
    for (const path of ["firmwareCompiler.js", "firmwareExecutor.js", "firmwareRuntimeController.js"]) {
      const code = readFileSync(resolve(__dirname, "../../arduino/firmware", path), "utf-8")
      expect(code, path).not.toMatch(/WS2812|NeoPixel|Adafruit|FastLED|setPixelColor/i)
    }
  })
})
