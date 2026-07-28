import { describe, it, expect, vi } from "vitest"
import { getRgbLedState } from "../simulator/engine.js"
import { Signal } from "../simulator/signals.js"

// Mock minimal de componentDefinitions.js (requis par engine.js)
vi.mock("../config/componentDefinitions.js", () => ({
  getComponentDef: (type) => {
    const defs = {
      POWER: { pins: [{ id: "5V" }, { id: "GND" }] },
      RGB_LED: {
        pins: [
          { id: "R" },
          { id: "common" },
          { id: "G" },
          { id: "B" },
        ],
      },
    }
    return defs[type] || null
  },
}))

describe("engine.js — RGB_LED (getRgbLedState)", () => {
  it("T-RGB-01: common=LOW, R=HIGH, G=LOW, B=LOW → seul rouge actif", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.LOW],
      ["rgb1:R", Signal.HIGH],
      ["rgb1:G", Signal.LOW],
      ["rgb1:B", Signal.LOW],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(true)
    expect(state.g).toBe(false)
    expect(state.b).toBe(false)
  })

  it("T-RGB-02: common=LOW, R=HIGH, G=HIGH, B=LOW → rouge et vert actifs", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.LOW],
      ["rgb1:R", Signal.HIGH],
      ["rgb1:G", Signal.HIGH],
      ["rgb1:B", Signal.LOW],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(true)
    expect(state.g).toBe(true)
    expect(state.b).toBe(false)
  })

  it("T-RGB-03: common=UNKNOWN, tous HIGH → aucun canal actif (circuit ouvert)", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.UNKNOWN],
      ["rgb1:R", Signal.HIGH],
      ["rgb1:G", Signal.HIGH],
      ["rgb1:B", Signal.HIGH],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(false)
    expect(state.g).toBe(false)
    expect(state.b).toBe(false)
  })

  it("T-RGB-04: common=HIGH, tous HIGH → aucun canal actif (polarité inversée)", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.HIGH],
      ["rgb1:R", Signal.HIGH],
      ["rgb1:G", Signal.HIGH],
      ["rgb1:B", Signal.HIGH],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(false)
    expect(state.g).toBe(false)
    expect(state.b).toBe(false)
  })

  it("T-RGB-05: common=LOW, tous HIGH → trois canaux actifs (blanc)", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.LOW],
      ["rgb1:R", Signal.HIGH],
      ["rgb1:G", Signal.HIGH],
      ["rgb1:B", Signal.HIGH],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(true)
    expect(state.g).toBe(true)
    expect(state.b).toBe(true)
  })

  it("T-RGB-06: common=LOW, tous UNKNOWN → aucun canal actif", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.LOW],
      ["rgb1:R", Signal.UNKNOWN],
      ["rgb1:G", Signal.UNKNOWN],
      ["rgb1:B", Signal.UNKNOWN],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(false)
    expect(state.g).toBe(false)
    expect(state.b).toBe(false)
  })

  it("T-RGB-07: common=LOW, R=LOW, G=LOW, B=LOW → aucun canal actif", () => {
    const pinSignals = new Map([
      ["rgb1:common", Signal.LOW],
      ["rgb1:R", Signal.LOW],
      ["rgb1:G", Signal.LOW],
      ["rgb1:B", Signal.LOW],
    ])

    const state = getRgbLedState("rgb1", pinSignals)

    expect(state.r).toBe(false)
    expect(state.g).toBe(false)
    expect(state.b).toBe(false)
  })
})