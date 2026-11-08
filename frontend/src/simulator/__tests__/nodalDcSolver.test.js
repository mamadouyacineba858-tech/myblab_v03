import { describe, it, expect } from "vitest"
import { solveDcNetwork } from "../nodalDcSolver.js"
import { Signal } from "../signals.js"

const c = (uid, type, parameters, state) => ({ uid, type, x: 0, y: 0, parameters, state })
const w = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

describe("TINKERCAD-004 nodal DC solver — comparaison avec calculs manuels", () => {
  it("pile 9 V sur une résistance 220 Ω : I = V/R, courant de pile cohérent", () => {
    const s = solveDcNetwork(
      [c("b", "BATTERY_9V"), c("r", "RESISTOR", { resistance: 220 })],
      [w("b", "plus", "r", "A"), w("r", "B", "b", "minus")])
    expect(s.status).toBe("OK")
    expect(s.voltageBetween("r", "A", "r", "B")).toBeCloseTo(9, 6)
    expect(s.elementCurrent("r")).toBeCloseTo(9 / 220, 6)
    expect(s.sourceCurrent("b")).toBeCloseTo(9 / 220, 6)
  })

  it("résistances en série : 1k + 2k sous 9 V → 3 mA, nœud intermédiaire 6 V", () => {
    const s = solveDcNetwork(
      [c("b", "BATTERY_9V"), c("r1", "RESISTOR", { resistance: 1000 }), c("r2", "RESISTOR", { resistance: 2000 })],
      [w("b", "plus", "r1", "A"), w("r1", "B", "r2", "A"), w("r2", "B", "b", "minus")])
    expect(s.elementCurrent("r1")).toBeCloseTo(0.003, 9)
    expect(s.elementCurrent("r2")).toBeCloseTo(0.003, 9)
    expect(s.pinVoltage("r1", "B")).toBeCloseTo(6, 6)
  })

  it("résistances en parallèle : 1k // 1k sous 5 V → 10 mA au total", () => {
    const s = solveDcNetwork(
      [c("p", "POWER"), c("r1", "RESISTOR", { resistance: 1000 }), c("r2", "RESISTOR", { resistance: 1000 })],
      [w("p", "5V", "r1", "A"), w("p", "5V", "r2", "A"), w("r1", "B", "p", "GND"), w("r2", "B", "p", "GND")])
    expect(s.sourceCurrent("p")).toBeCloseTo(0.01, 9)
  })

  it("potentiomètre en diviseur : 10 kΩ à 25 % sous 8 V → wiper = 2 V", () => {
    const s = solveDcNetwork(
      [c("p", "POWER", { voltage: 8 }), c("pot", "POTENTIOMETER", { resistance: 10000, position: 0.25 })],
      [w("p", "5V", "pot", "right"), w("pot", "left", "p", "GND")])
    expect(s.pinVoltage("pot", "wiper")).toBeCloseTo(2, 6)
  })

  it("LED : 9 V → 220 Ω → LED (Vf 2 V, Ron 10 Ω) → retour : I = 7/230", () => {
    const s = solveDcNetwork(
      [c("b", "BATTERY_9V"), c("r", "RESISTOR", { resistance: 220 }), c("l", "LED")],
      [w("b", "plus", "r", "A"), w("r", "B", "l", "anode"), w("l", "cathode", "b", "minus")])
    expect(s.ledState("l").on).toBe(true)
    expect(s.ledState("l").current).toBeCloseTo(7 / 230, 6)
    expect(s.voltageBetween("l", "anode", "l", "cathode")).toBeCloseTo(2 + 10 * 7 / 230, 6)
  })

  it("LED en inverse : aucun courant, éteinte", () => {
    const s = solveDcNetwork(
      [c("b", "BATTERY_9V"), c("r", "RESISTOR", { resistance: 220 }), c("l", "LED")],
      [w("b", "plus", "r", "A"), w("r", "B", "l", "cathode"), w("l", "anode", "b", "minus")])
    expect(s.ledState("l").on).toBe(false)
    expect(s.ledState("l").current).toBe(0)
  })

  it("pile 1,5 V + LED rouge : sous le seuil, LED éteinte", () => {
    const s = solveDcNetwork(
      [c("b", "BATTERY_AA"), c("l", "LED")],
      [w("b", "plus", "l", "anode"), w("l", "cathode", "b", "minus")])
    expect(s.ledState("l").on).toBe(false)
  })

  it("interrupteur : ouvert → 0 A, fermé → 5 V / (220 Ω + LED)", () => {
    const build = (state) => solveDcNetwork(
      [c("p", "POWER"), c("sw", "BUTTON_LATCHING", undefined, state), c("r", "RESISTOR", { resistance: 220 }), c("l", "LED")],
      [w("p", "5V", "sw", "pin1"), w("sw", "pin2", "r", "A"), w("r", "B", "l", "anode"), w("l", "cathode", "p", "GND")])
    expect(build("off").ledState("l").on).toBe(false)
    expect(build("off").elementCurrent("r")).toBeCloseTo(0, 6)
    const closed = build("on")
    expect(closed.ledState("l").on).toBe(true)
    expect(closed.elementCurrent("r")).toBeCloseTo(3 / 230, 6)
  })

  it("Arduino D2 HIGH → 220 Ω → LED → GND Arduino : source Thévenin 5 V / 25 Ω", () => {
    const comps = [c("a", "ARDUINO"), c("r", "RESISTOR", { resistance: 220 }), c("l", "LED")]
    const wires = [w("a", "D2", "r", "A"), w("r", "B", "l", "anode"), w("l", "cathode", "a", "GND")]
    const high = solveDcNetwork(comps, wires, { pinSignals: new Map([["a:D2", Signal.HIGH]]) })
    expect(high.ledState("l").current).toBeCloseTo(3 / (25 + 220 + 10), 6)
    const low = solveDcNetwork(comps, wires, { pinSignals: new Map([["a:D2", Signal.LOW]]) })
    expect(low.ledState("l").on).toBe(false)
    expect(low.pinVoltage("r", "A")).toBeCloseTo(0, 6)
  })

  it("court-circuit de source et composant non qualifié sont signalés, pas inventés", () => {
    const shorted = solveDcNetwork([c("b", "BATTERY_9V")], [w("b", "plus", "b", "minus")])
    expect(shorted.status).toBe("SHORT_CIRCUIT")
    const two = solveDcNetwork(
      [c("b1", "BATTERY_9V"), c("b2", "BATTERY_AA")],
      [w("b1", "plus", "b2", "plus"), w("b1", "minus", "b2", "minus")])
    expect(two.status).toBe("SHORT_CIRCUIT")
    const unq = solveDcNetwork([c("b", "BATTERY_9V"), c("n", "NE555P")], [])
    expect(unq.unqualifiedTypes).toContain("NE555P")
  })

  it("nœud flottant : tension non disponible (null)", () => {
    const s = solveDcNetwork(
      [c("b", "BATTERY_9V"), c("r", "RESISTOR", { resistance: 100 }), c("l", "LED")],
      [w("b", "plus", "r", "A"), w("r", "B", "l", "anode")])
    expect(s.pinVoltage("l", "cathode")).toBeNull()
  })
})
