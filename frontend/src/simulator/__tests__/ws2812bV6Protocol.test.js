import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  WS2812B_V6_TIMING_NS,
  WS2812B_V6_TIMING_MS,
  WS2812B_V6_INITIAL_STATE,
  WS2812B_V6_DIGITAL_EVENT_CONTRIBUTION,
  ws2812bV6DigitalEvent,
  durationNs,
  classifyHighNs,
  decodeGrbWord,
} from "../ws2812bV6Protocol.js"
import { getDigitalEventContribution, hasDigitalEventContribution } from "../digitalEventContributionRegistry.js"
import { SIMULATION_STEP_MS } from "../simulationRuntimeIntegration.js"
import { Signal } from "../signals.js"

/**
 * A12-NEOPIXEL-FUNC-WS2812B-V6-001 — décodeur RZ d'UN pixel (P01..P26), par
 * injection directe de DigitalTransition sur DIN. Temps de trame construits en
 * ns entiers puis convertis en ms (aucune accumulation flottante).
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const readSourceWithoutComments = (name) => readFileSync(resolve(__dirname, "..", name), "utf-8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "")

const POWERED = Object.freeze({ VDD: Signal.HIGH, DOUT: Signal.UNKNOWN, VSS: Signal.LOW, DIN: Signal.UNKNOWN })
const ms = (ns) => ns / 1e6
const din = (ns, signal) => ({ pinId: "DIN", timeMs: ms(ns), signal })

/** Bits valides : 0 = 300 ns HIGH + 950 ns LOW ; 1 = 800 ns HIGH + 600 ns LOW. */
function bitsToTransitions(bits, startNs = 1_000_000, timing = {}) {
  const { h0 = 300, l0 = 950, h1 = 800, l1 = 600 } = timing
  const out = []
  let t = startNs
  for (const bit of bits) {
    out.push(din(t, Signal.HIGH))
    out.push(din(t + (bit ? h1 : h0), Signal.LOW))
    t += bit ? h1 + l1 : h0 + l0
  }
  return { transitions: out, endNs: t }
}
const byteBits = (byte) => Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1)
const grbBits = ({ r, g, b }) => [...byteBits(g), ...byteBits(r), ...byteBits(b)]

function feed(transitions, previousState, currentTimeMs = 16, pinSignals = POWERED) {
  return ws2812bV6DigitalEvent({ pinSignals, currentTimeMs, previousState, transitions })
}
/** Deux steps : trame au step 16, latch par horizon au step 32. */
function frameAndLatch(transitions, previousState) {
  const first = feed(transitions, previousState, 16)
  const second = feed([], first.state, 32)
  return { first, state: second.state }
}
/** Une impulsion HIGH de `highNs` (bit isolé, lecture de l'état de réception). */
const pulse = (highNs, startNs = 1_000_000) => feed([din(startNs, Signal.HIGH), din(startNs + highNs, Signal.LOW)]).state

describe("A12-FUNC — registry et contrat", () => {
  it("P01/P02/P03 — WS2812B_V6 enregistré : entrée DIN, sortie DOUT", () => {
    expect(hasDigitalEventContribution("WS2812B_V6")).toBe(true)
    const entry = getDigitalEventContribution("WS2812B_V6")
    expect(entry.inputPins).toEqual(["DIN"])
    expect(entry.outputPins).toEqual(["DOUT"])
    expect(entry.contribute).toBe(WS2812B_V6_DIGITAL_EVENT_CONTRIBUTION.contribute)
  })

  it("constantes verrouillées, converties en ms sans arrondi", () => {
    expect(WS2812B_V6_TIMING_NS).toEqual({
      T0H_MIN: 220, T0H_MAX: 380, T1H_MIN: 580, T1H_MAX: 1000, TL_MIN: 580, TL_MAX: 1000, BIT_PERIOD_MIN: 1250, RESET_LOW_MIN_EXCLUSIVE: 280000,
    })
    expect(WS2812B_V6_TIMING_MS.T0H_MIN).toBe(0.00022)
    expect(WS2812B_V6_TIMING_MS.T0H_MAX).toBe(0.00038)
    expect(WS2812B_V6_TIMING_MS.T1H_MIN).toBe(0.00058)
    expect(WS2812B_V6_TIMING_MS.T1H_MAX).toBe(0.001)
    expect(WS2812B_V6_TIMING_MS.BIT_PERIOD_MIN).toBe(0.00125)
    expect(WS2812B_V6_TIMING_MS.RESET_LOW_MIN_EXCLUSIVE).toBe(0.28)
  })

  it("P04 — état initial déterministe et gelé", () => {
    expect(WS2812B_V6_INITIAL_STATE).toEqual({
      phase: "IDLE", din: Signal.LOW, lastEdgeMs: null, bitStartMs: null, bits: 0, word: 0, dout: Signal.LOW, color: null, stepTimeMs: null, horizonMs: null,
    })
    expect(Object.isFrozen(WS2812B_V6_INITIAL_STATE)).toBe(true)
    expect(feed([], undefined).state).toEqual({ ...WS2812B_V6_INITIAL_STATE, stepTimeMs: 16 })
  })

  it("P05 — aucune transition : aucune couleur inventée, aucune sortie, sur plusieurs steps", () => {
    let state
    for (const now of [16, 32, 48]) {
      const result = feed([], state, now)
      expect(result.transitions).toEqual([])
      state = result.state
    }
    expect(state.color).toBeNull()
  })
})

describe("A12-FUNC — classification des impulsions (bornes incluses)", () => {
  it("P06/P07 — bit 0 aux bornes 220 ns et 380 ns", () => {
    for (const highNs of [220, 380]) {
      expect(pulse(highNs)).toMatchObject({ phase: "RECEIVING", bits: 1, word: 0 })
    }
    expect(classifyHighNs(220)).toBe(0)
    expect(classifyHighNs(380)).toBe(0)
  })

  it("P08/P09 — bit 1 aux bornes 580 ns et 1000 ns", () => {
    for (const highNs of [580, 1000]) {
      expect(pulse(highNs)).toMatchObject({ phase: "RECEIVING", bits: 1, word: 1 })
    }
    expect(classifyHighNs(580)).toBe(1)
    expect(classifyHighNs(1000)).toBe(1)
  })

  it("P10 — impulsion hors fenêtre : jamais classée, décodeur INVALID jusqu'au RESET, aucune couleur", () => {
    for (const highNs of [219, 381, 450, 579, 1001, 5000]) {
      expect(classifyHighNs(highNs)).toBeNull()
      expect(pulse(highNs)).toMatchObject({ phase: "INVALID", bits: 0, word: 0 })
    }
    // une trame par ailleurs complète, contenant un bit invalide, ne latche rien
    const bits = grbBits({ r: 1, g: 2, b: 3 })
    const { transitions } = bitsToTransitions(bits)
    transitions[11] = { ...transitions[11], timeMs: transitions[10].timeMs + ms(450) } // 6e bit : HIGH 450 ns
    const { state } = frameAndLatch(transitions)
    expect(state.color).toBeNull()
    expect(state.phase).toBe("IDLE")
  })

  it("LOW entre bits hors [580, 1000] ns ou période < 1.25 µs : INVALID", () => {
    expect(feed(bitsToTransitions([0, 0], 1_000_000, { l0: 579 }).transitions).state.phase).toBe("INVALID")
    expect(feed(bitsToTransitions([0, 0], 1_000_000, { l0: 1001 }).transitions).state.phase).toBe("INVALID")
    // HIGH 300 + LOW 900 = 1200 ns < 1250 ns
    expect(feed(bitsToTransitions([0, 0], 1_000_000, { l0: 900 }).transitions).state.phase).toBe("INVALID")
    expect(feed(bitsToTransitions([0, 0], 1_000_000, { l0: 950 }).transitions).state).toMatchObject({ phase: "RECEIVING", bits: 2 })
  })

  it("durées sur timestamps fractionnaires quelconques : résolution 1 ps, fenêtres inchangées", () => {
    expect(durationNs(1.0, 1.00022)).toBe(220)
    expect(durationNs(5.123456789, 5.123456789 + 0.00038)).toBe(380)
    expect(durationNs(1.0, 1.28)).toBe(280000)
  })
})

describe("A12-FUNC — trame, GRB, RESET", () => {
  it("P11/P12/P13/P14 — 24 bits exacts, GRB MSB first : G=0x12 R=0x34 B=0x56 -> { r: 0x34, g: 0x12, b: 0x56 }", () => {
    const { transitions } = bitsToTransitions(grbBits({ r: 0x34, g: 0x12, b: 0x56 }), 1_000_123)
    expect(transitions[0].timeMs).toBe(1.000123)
    const { state } = frameAndLatch(transitions)
    expect(state.color).toEqual({ r: 0x34, g: 0x12, b: 0x56 })
    expect(decodeGrbWord(0x123456)).toEqual({ r: 0x34, g: 0x12, b: 0x56 })
    // MSB first, octets asymétriques (pas RGB, pas BGR, pas LSB first)
    expect(frameAndLatch(bitsToTransitions(grbBits({ r: 0x01, g: 0x80, b: 0xfe })).transitions).state.color).toEqual({ r: 0x01, g: 0x80, b: 0xfe })
  })

  it("P15 — 23 bits + RESET : aucune couleur ; couleur précédente conservée", () => {
    const bits = grbBits({ r: 9, g: 9, b: 9 }).slice(0, 23)
    expect(frameAndLatch(bitsToTransitions(bits).transitions).state.color).toBeNull()
    const lit = frameAndLatch(bitsToTransitions(grbBits({ r: 1, g: 2, b: 3 })).transitions).state
    const after = feed([], feed(bitsToTransitions(bits, 40_000_000).transitions, lit, 48).state, 64).state
    expect(after.color).toEqual({ r: 1, g: 2, b: 3 })
    expect(after.phase).toBe("IDLE")
  })

  it("P16/P17 — RESET strict > 280 µs : 280 µs exact n'est PAS un reset (LOW hors contrat), 280.001 µs l'est", () => {
    const first = bitsToTransitions(grbBits({ r: 0x10, g: 0x20, b: 0x30 }))
    const secondBits = grbBits({ r: 0x40, g: 0x50, b: 0x60 })
    const run = (gapNs) => {
      const second = bitsToTransitions(secondBits, first.endNs + gapNs - 950) // dernier LOW du 1er mot = gapNs
      return feed([...first.transitions, ...second.transitions]).state
    }
    const exact = run(280_000)
    expect(exact.color).toBeNull()
    expect(exact.phase).toBe("INVALID") // 24 bits reçus, puis un LOW de 280 µs non conforme
    const beyond = run(280_001)
    expect(beyond.color).toEqual({ r: 0x10, g: 0x20, b: 0x30 }) // latch au front montant de la trame suivante
    expect(beyond).toMatchObject({ phase: "RECEIVING", bits: 24 })
  })

  it("RESET par horizon : latch au step suivant la trame, jamais par anticipation", () => {
    const { transitions } = bitsToTransitions(grbBits({ r: 5, g: 6, b: 7 }))
    const first = feed(transitions, undefined, 16)
    expect(first.state.color).toBeNull() // horizon encore inconnu
    expect(first.state.bits).toBe(24)
    const again = feed([], first.state, 16) // même step (autre round) : horizon inchangé
    expect(again.state.color).toBeNull()
    expect(feed([], first.state, 32).state.color).toEqual({ r: 5, g: 6, b: 7 })
  })

  it("RESET sans trame : aucun effet", () => {
    let state = feed([din(1_000_000, Signal.LOW)]).state
    state = feed([], state, 32).state
    state = feed([], state, 48).state
    expect(state).toMatchObject({ phase: "IDLE", color: null, bits: 0 })
  })

  it("P18 — deux trames successives : la seconde remplace la première", () => {
    const a = frameAndLatch(bitsToTransitions(grbBits({ r: 1, g: 2, b: 3 })).transitions).state
    const b = feed([], feed(bitsToTransitions(grbBits({ r: 200, g: 100, b: 50 }), 40_000_000).transitions, a, 48).state, 64).state
    expect(b.color).toEqual({ r: 200, g: 100, b: 50 })
  })
})

describe("A12-FUNC — DOUT : absorption de 24 bits, retransmission", () => {
  it("P25/P26/P11 — 48 bits : le pixel absorbe exactement 24 bits et retransmet tels quels les 24 suivants (mêmes timeMs)", () => {
    const own = grbBits({ r: 0x11, g: 0x22, b: 0x33 })
    const next = grbBits({ r: 0xaa, g: 0xbb, b: 0xcc })
    const { transitions } = bitsToTransitions([...own, ...next], 1_000_007)
    const result = feed(transitions)
    expect(result.state).toMatchObject({ phase: "FORWARDING", bits: 24 })
    expect(result.transitions).toEqual(transitions.slice(48).map((t) => ({ ...t, pinId: "DOUT" })))
    expect(result.transitions.every((t, i) => t.timeMs === transitions[48 + i].timeMs)).toBe(true)
    expect(feed([], result.state, 32).state.color).toEqual({ r: 0x11, g: 0x22, b: 0x33 })
  })

  it("25e bit : retransmis, couleur propre intacte (25+ bits)", () => {
    const { transitions } = bitsToTransitions([...grbBits({ r: 1, g: 2, b: 3 }), 1])
    const result = feed(transitions)
    expect(result.transitions.map((t) => t.signal)).toEqual([Signal.HIGH, Signal.LOW])
    expect(feed([], result.state, 32).state.color).toEqual({ r: 1, g: 2, b: 3 })
  })

  it("24 bits seuls : rien sur DOUT", () => {
    expect(feed(bitsToTransitions(grbBits({ r: 1, g: 1, b: 1 })).transitions).transitions).toEqual([])
  })
})

describe("A12-FUNC — alimentation", () => {
  it("VDD/VSS non établis : état initial, transitions DIN ignorées, aucune sortie", () => {
    const { transitions } = bitsToTransitions([...grbBits({ r: 1, g: 2, b: 3 }), ...grbBits({ r: 4, g: 5, b: 6 })])
    for (const pinSignals of [{ VDD: Signal.UNKNOWN, VSS: Signal.LOW }, { VDD: Signal.HIGH, VSS: Signal.UNKNOWN }, { VDD: Signal.LOW, VSS: Signal.LOW }, {}]) {
      const result = feed(transitions, undefined, 16, pinSignals)
      expect(result.state).toBe(WS2812B_V6_INITIAL_STATE)
      expect(result.transitions).toEqual([])
    }
  })

  it("perte d'alimentation : la couleur latchée est perdue (aucune couleur maintenue sans VDD)", () => {
    const lit = frameAndLatch(bitsToTransitions(grbBits({ r: 1, g: 2, b: 3 })).transitions).state
    expect(lit.color).toEqual({ r: 1, g: 2, b: 3 })
    expect(feed([], lit, 48, { VDD: Signal.UNKNOWN, VSS: Signal.LOW }).state.color).toBeNull()
  })
})

describe("A12-FUNC — gardes du module protocolaire", () => {
  const source = readSourceWithoutComments("ws2812bV6Protocol.js")

  it("P20 — aucune horloge système, aucun timer", () => {
    for (const pattern of [/Date\.now\s*\(/, /performance\.now\s*\(/, /\bsetTimeout\s*\(/, /\bsetInterval\s*\(/, /\brequestAnimationFrame\s*\(/]) {
      expect(source).not.toMatch(pattern)
    }
  })

  it("P21 — SIMULATION_STEP_MS reste 16 et n'est pas utilisé par le protocole", () => {
    expect(SIMULATION_STEP_MS).toBe(16)
    expect(source).not.toMatch(/SIMULATION_STEP_MS|simulationRuntimeIntegration/)
  })

  it("P22/P24 — module pur : n'importe que signals.js (ni résolution, ni React, ni Arduino, ni store)", () => {
    expect([...source.matchAll(/import\s[^\n]*from\s+["']([^"']+)["']/g)].map((m) => m[1])).toEqual(["./signals.js"])
    expect(source).not.toMatch(/resolveSignals|prepareCircuit|react|arduino|digitalTransitions|Scheduler/i)
  })
})
