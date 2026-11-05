import { describe, it, expect, beforeEach } from "vitest"
import { updateInstruments, resetInstruments, getAmmeterBridgeWire } from "../instrumentsStore.js"
import { configureLive, advanceLive, getLiveStatus, stopLive } from "../liveSimulation.js"
import { runSimulation, getLedState } from "../../simulator/engine.js"

const c = (uid, type, parameters) => ({ uid, type, x: 0, y: 0, parameters })
const w = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

// Alimentation 5 V -> R -> LED, retour GND coupé : l'ampèremètre referme le circuit.
const components = [c("p", "POWER"), c("r", "RESISTOR", { resistance: 220 }), c("d", "LED")]
const openWires = [w("p", "5V", "r", "A"), w("r", "B", "d", "anode")]
const closedWires = [...openWires, w("d", "cathode", "p", "GND")]

describe("C03 — cohérence ampèremètre / courant / LED", () => {
  beforeEach(() => { resetInstruments(); stopLive() })

  it("aucun pont sans ampèremètre complet", () => {
    expect(getAmmeterBridgeWire()).toBeNull()
    updateInstruments((s) => { s.ammeter.a = { uid: "d", pin: "cathode" } })
    expect(getAmmeterBridgeWire()).toBeNull()
  })

  it("circuit ouvert : LED éteinte", () => {
    expect(getLedState("d", runSimulation(components, openWires)).on).toBe(false)
  })

  it("le fil virtuel de l'ampèremètre allume la LED comme un fil réel", () => {
    updateInstruments((s) => { s.ammeter.a = { uid: "d", pin: "cathode" }; s.ammeter.b = { uid: "p", pin: "GND" } })
    const bridge = getAmmeterBridgeWire()
    expect(bridge).toEqual({ fromUid: "d", fromPin: "cathode", toUid: "p", toPin: "GND" })
    expect(getLedState("d", runSimulation(components, [...openWires, bridge])).on).toBe(true)
    expect(getLedState("d", runSimulation(components, closedWires)).on).toBe(true)
  })

  it("le solveur transitoire mesure 13,043 mA dans ce même circuit", () => {
    updateInstruments((s) => { s.ammeter.a = { uid: "d", pin: "cathode" }; s.ammeter.b = { uid: "p", pin: "GND" } })
    configureLive(components, openWires)
    for (let i = 0; i < 20; i += 1) advanceLive(0.001)
    const amm = getLiveStatus().ammeter
    expect(amm.valid).toBe(true)
    expect(Math.abs(amm.current)).toBeCloseTo(0.013043, 6)
  })
})
