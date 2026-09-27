/**
 * A10-DISP2 — projection LECTURE SEULE runtime -> Presentation par le chemin applicatif réel :
 * CircuitProvider -> useCircuitState (runSimulationWithRuntime + session runtime) ->
 * `runtimeStates` (snapshot gelé) -> CircuitComponent -> PartRenderer -> Visual State Registry
 * -> LcdWh1602bPart. Le LCD est piloté uniquement par le Document (fils vers les rails) et un
 * SLIDE_SWITCH qui commute E en une seule action (aucune fixture, aucune API de test).
 *
 * requestAnimationFrame est remplacé par une file manuelle : chaque `frame()` exécute une fois les
 * callbacks enregistrés par le hook (SIMULATION_STEP_MS de temps simulé, jamais l'horloge murale).
 */

// Requis par le transform JSX de ce projet (même convention que les autres tests .jsx du dépôt).
import React from "react" // eslint-disable-line no-unused-vars -- Vitest classic JSX transform.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, render } from "@testing-library/react"
import { CircuitProvider } from "../../context/CircuitContext.jsx"
import { useCircuit } from "../../context/useCircuit.js"
import { useCircuitInteraction } from "../../context/useCircuitInteraction.js"
import { CircuitComponent } from "../../canvas/CircuitComponent.jsx"
import { runSimulationWithRuntime } from "../../simulator/simulationRuntimeIntegration.js"
import { projectSt7066uDisplay } from "../../visualization/st7066uDisplayProjection.js"
import { Signal } from "../../simulator/signals.js"

vi.mock("../../simulator/simulationRuntimeIntegration.js", async (original) => {
  const actual = await original()
  return { ...actual, runSimulationWithRuntime: vi.fn(actual.runSimulationWithRuntime) }
})

const { HIGH, LOW } = Signal
const TYPE = "LCD_16X2_WH1602B"
const DB = ["DB0", "DB1", "DB2", "DB3", "DB4", "DB5", "DB6", "DB7"]
const BUS_PINS = new Set(["RS", ...DB])
const BLANK_LINE = " ".repeat(16)

let rafQueue = []
beforeEach(() => {
  rafQueue = []
  let id = 0
  vi.stubGlobal("requestAnimationFrame", (cb) => { rafQueue.push({ id: ++id, cb }); return id })
  vi.stubGlobal("cancelAnimationFrame", () => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function frame(count = 1) {
  for (let i = 0; i < count; i++) {
    const pending = rafQueue
    rafQueue = []
    act(() => { for (const { cb } of pending) cb(987654.321 * (i + 1)) })
  }
}

const session = () => runSimulationWithRuntime.mock.calls.at(-1)[2].runtimeSession

/** Monte l'application réelle et rend le CircuitComponent du LCD (s'il existe). */
function mount() {
  const api = { current: null }
  function Harness() {
    const state = { ...useCircuit(), ...useCircuitInteraction() }
    api.current = state
    const lcd = state.components.find((c) => c.type === TYPE)
    return lcd ? <CircuitComponent component={lcd} /> : null
  }
  const view = render(<CircuitProvider orchestrators={new Map()}><Harness /></CircuitProvider>)
  return { api, view }
}

function add(api, type, x, y) {
  const before = new Set(api.current.components.map((c) => c.uid))
  act(() => api.current.addComponent(type, x, y))
  return api.current.components.find((c) => !before.has(c.uid)).uid
}

/** POWER + LCD alimenté (R/W LOW) + SLIDE_SWITCH : common -> E, throwA -> 5V, throwB -> GND. */
function build(api) {
  const power = add(api, "POWER", 0, 0)
  const lcd = add(api, TYPE, 0, 200)
  const sw = add(api, "SLIDE_SWITCH", 500, 0)
  act(() => {
    api.current.addWire(power, "5V", lcd, "VDD")
    api.current.addWire(power, "GND", lcd, "VSS")
    api.current.addWire(power, "GND", lcd, "RW")
    api.current.addWire(power, "5V", sw, "throwA")
    api.current.addWire(power, "GND", sw, "throwB")
    api.current.addWire(sw, "common", lcd, "E")
  })
  /** Pose RS et DB0..DB7 (E inchangé pendant ces deux actions : aucun front). */
  const setBus = (rs, byte) => {
    act(() => {
      for (const w of api.current.wires.filter((w) => w.toUid === lcd && BUS_PINS.has(w.toPin))) api.current.removeWire(w.id)
    })
    act(() => {
      api.current.addWire(power, rs === HIGH ? "5V" : "GND", lcd, "RS")
      DB.forEach((pin, i) => api.current.addWire(power, (byte >> i) & 1 ? "5V" : "GND", lcd, pin))
    })
  }
  /** E HIGH -> LOW (transaction), puis un step de temps simulé, puis E revient HIGH. */
  const strobe = () => {
    act(() => api.current.toggleComponentState(sw))
    frame()
    act(() => api.current.toggleComponentState(sw))
  }
  const send = (rs, byte) => { setBus(rs, byte); strobe() }
  return { power, lcd, sw, send }
}

const lcdRoot = (view) => view.container.querySelector(".part-lcd-wh1602b")

describe("A10-DISP2 — runtimeStates : projection lecture seule dans l'application réelle", () => {
  it("expose l'état runtime du LCD (gelé, jamais la Map de la session) et le rend via CircuitComponent -> PartRenderer", () => {
    const { api, view } = mount()
    const { lcd, send } = build(api)
    expect(api.current.runtimeStates.size).toBe(0) // simulation arrêtée
    act(() => api.current.startSimulation())
    expect(api.current.pinSignals.get(`${lcd}:E`)).toBe(HIGH)

    const initial = api.current.runtimeStates.get(lcd)
    expect(initial).toMatchObject({ displayOn: false, addressCounter: 0, previousE: HIGH })
    expect(api.current.runtimeStates).not.toBe(session().timedDigitalStates)
    expect(Object.isFrozen(initial)).toBe(true)
    expect(lcdRoot(view).getAttribute("data-display-on")).toBe("false")

    send(LOW, 0x0c)
    send(HIGH, 0x48)
    send(HIGH, 0x69)

    const state = api.current.runtimeStates.get(lcd)
    expect(state).toBe(session().timedDigitalStates.get(lcd))
    expect(projectSt7066uDisplay(state).lines).toEqual(["Hi".padEnd(16), BLANK_LINE])
    expect(lcdRoot(view).getAttribute("data-display-on")).toBe("true")
    expect(lcdRoot(view).getAttribute("data-line-1")).toBe("Hi".padEnd(16))
    expect(() => { state.ddram[0] = 0x5a }).toThrow(TypeError)
  })

  it("LCD-45 : stop vide la projection ; start repart d'une DDRAM vierge (aucune restauration)", () => {
    const { api, view } = mount()
    const { lcd, send } = build(api)
    act(() => api.current.startSimulation())
    send(LOW, 0x0c)
    send(HIGH, 0x41)
    expect(lcdRoot(view).getAttribute("data-line-1")).toBe("A".padEnd(16))

    act(() => api.current.stopSimulation())
    expect(api.current.runtimeStates.size).toBe(0)
    expect(lcdRoot(view).getAttribute("data-display-on")).toBe("false")

    act(() => api.current.startSimulation())
    const restarted = api.current.runtimeStates.get(lcd)
    expect(restarted.ddram.every((code) => code === 0x20)).toBe(true)
    expect(restarted).toMatchObject({ displayOn: false, addressCounter: 0 })
    expect(lcdRoot(view).getAttribute("data-display-on")).toBe("false")
    frame(3)
    expect(projectSt7066uDisplay(api.current.runtimeStates.get(lcd)).lines).toEqual([BLANK_LINE, BLANK_LINE])
  })

  it("LCD-34 / LCD-36 : aucune donnée runtime dans l'export ; supprimer le LCD purge son état runtime", () => {
    const { api } = mount()
    const { lcd, send } = build(api)
    act(() => api.current.startSimulation())
    send(LOW, 0x0c)
    send(HIGH, 0x41)
    const exported = JSON.stringify(api.current.exportCircuit())
    expect(exported).not.toMatch(/ddram|addressCounter|pendingNibble|busyUntilMs|previousE|runtimeStates/)
    const component = api.current.components.find((c) => c.uid === lcd)
    expect(Object.keys(component)).not.toContain("ddram")

    act(() => api.current.deleteComponent(lcd))
    expect(session().timedDigitalStates.has(lcd)).toBe(false)
    expect(api.current.runtimeStates.has(lcd)).toBe(false)
  })
})
