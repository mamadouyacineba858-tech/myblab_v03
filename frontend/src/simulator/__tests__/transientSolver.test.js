import { describe, it, expect } from "vitest"
import { createTransientSession, waveformValue } from "../transientSolver.js"

const c = (uid, type, parameters) => ({ uid, type, x: 0, y: 0, parameters })
const w = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

describe("TINKERCAD-005 solveur transitoire — références analytiques", () => {
  it("RC série 5 V / 1 kΩ / 1 µF : Vc(t) = 5(1 − e^(−t/τ)), i(t) = (5/R)e^(−t/τ)", () => {
    const s = createTransientSession(
      [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-6 })],
      [w("p", "5V", "r", "A"), w("r", "B", "c", "pinA"), w("c", "pinB", "p", "GND")])
    const tau = 1e-3
    s.advance(tau, tau / 500)
    expect(s.voltageBetween({ uid: "c", pin: "pinA" }, { uid: "c", pin: "pinB" })).toBeCloseTo(5 * (1 - Math.exp(-1)), 1)
    expect(Math.abs(s.pinVoltage("c", "pinA") - 5 * (1 - Math.exp(-1)))).toBeLessThan(0.02)
    expect(Math.abs(s.elementCurrent("r") - (5 / 1000) * Math.exp(-1))).toBeLessThan(5e-5)
    s.advance(4 * tau, tau / 500)
    expect(Math.abs(s.pinVoltage("c", "pinA") - 5 * (1 - Math.exp(-5)))).toBeLessThan(0.02)
    expect(s.time).toBeCloseTo(5e-3, 9)
  })

  it("RC : décharge via un nœud de GND commun (état initial nul → pas d'énergie spontanée)", () => {
    const s = createTransientSession(
      [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-6 })],
      [w("p", "5V", "r", "A"), w("r", "B", "c", "pinA"), w("c", "pinB", "p", "GND")])
    s.step(1e-9)
    expect(Math.abs(s.pinVoltage("c", "pinA"))).toBeLessThan(0.01)
  })

  it("RL série 5 V / 100 Ω / 10 mH : i(t) = (V/R)(1 − e^(−t/τ)), τ = L/R", () => {
    const s = createTransientSession(
      [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 100 }), c("l", "INDUCTOR", { inductance: 0.01 })],
      [w("p", "5V", "r", "A"), w("r", "B", "l", "A"), w("l", "B", "p", "GND")])
    const tau = 0.01 / 100
    s.advance(tau, tau / 500)
    expect(Math.abs(s.elementCurrent("l") - 0.05 * (1 - Math.exp(-1)))).toBeLessThan(2e-4)
    s.advance(4 * tau, tau / 500)
    expect(Math.abs(s.elementCurrent("l") - 0.05 * (1 - Math.exp(-5)))).toBeLessThan(2e-4)
  })

  it("filtre RC passe-bas piloté par le générateur : gain 1/√2 à fc = 1 kHz", () => {
    const fc = 1000
    const cap = 1 / (2 * Math.PI * fc * 1000)
    const s = createTransientSession(
      [c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: cap })],
      [w("r", "B", "c", "pinA")],
      { generators: [{ id: "g1", plus: { uid: "r", pin: "A" }, minus: { uid: "c", pin: "pinB" }, waveform: "sine", frequencyHz: fc, amplitude: 2, offset: 0 }] })
    const dt = 1 / fc / 400
    let peak = 0
    for (let i = 0; i < 400 * 12; i++) {
      s.step(dt)
      if (i > 400 * 8) peak = Math.max(peak, Math.abs(s.voltageBetween({ uid: "c", pin: "pinA" }, { uid: "c", pin: "pinB" })))
    }
    expect(Math.abs(peak - 2 / Math.SQRT2) / (2 / Math.SQRT2)).toBeLessThan(0.03)
    expect(Math.abs(s.generator("g1").voltage)).toBeLessThanOrEqual(2 + 1e-9)
  })

  it("redresseur mono-alternance : crête = (Vpk − Vf)·R/(R + Ron), alternance négative bloquée", () => {
    const s = createTransientSession(
      [c("d", "DIODE"), c("r", "RESISTOR", { resistance: 1000 })],
      [w("d", "cathode", "r", "A")],
      { generators: [{ id: "g", plus: { uid: "d", pin: "anode" }, minus: { uid: "r", pin: "B" }, waveform: "sine", frequencyHz: 100, amplitude: 5, offset: 0 }] })
    let max = -Infinity; let min = Infinity
    for (let i = 0; i < 4000; i++) {
      s.step(1e-3 / 100 / 10 * 10)
      const v = s.voltageBetween({ uid: "r", pin: "A" }, { uid: "r", pin: "B" })
      max = Math.max(max, v); min = Math.min(min, v)
    }
    expect(max).toBeCloseTo((5 - 0.7) * 1000 / 1010, 1)
    expect(min).toBeGreaterThan(-1e-6)
  })

  describe("transistor NPN (β = 100, Vbe = 0,7 V, Vce,sat = 0,2 V — modèle par morceaux)", () => {
    const build = (rb) => createTransientSession(
      [c("p", "POWER", { voltage: 5 }), c("rc", "RESISTOR", { resistance: 1000 }), c("rb", "RESISTOR", { resistance: rb }), c("q", "NPN_TRANSISTOR")],
      [w("p", "5V", "rc", "A"), w("rc", "B", "q", "collector"), w("q", "emitter", "p", "GND"), w("p", "5V", "rb", "A"), w("rb", "B", "q", "base")])

    it("saturé (Rb = 10 kΩ) : Vce ≈ 0,2 V + Ic·1 Ω, Ic ≈ 4,8 mA", () => {
      const s = build(10000); s.step(1e-6)
      const seg = s.elementSegments("q")[0]
      expect(seg.mode).toBe("sat")
      expect(seg.voltage).toBeCloseTo(0.2 + 4.8 / 1001, 2)
      expect(seg.current).toBeCloseTo(4.8 / 1001, 4)
    })

    it("actif (Rb = 1 MΩ) : Ic = β·Ib avec Ib = (5 − 0,7)/(1 MΩ + 10 Ω)", () => {
      const s = build(1e6); s.step(1e-6)
      const seg = s.elementSegments("q")[0]
      expect(seg.mode).toBe("active")
      const ib = 4.3 / (1e6 + 10)
      expect(seg.base).toBeCloseTo(ib, 9)
      expect(seg.current).toBeCloseTo(100 * ib, 7)
      expect(s.pinVoltage("q", "collector")).toBeCloseTo(5 - 1000 * 100 * ib, 2)
    })

    it("bloqué (base au GND) : Ic = 0 et collecteur à 5 V", () => {
      const s = createTransientSession(
        [c("p", "POWER", { voltage: 5 }), c("rc", "RESISTOR", { resistance: 1000 }), c("rb", "RESISTOR", { resistance: 10000 }), c("q", "NPN_TRANSISTOR")],
        [w("p", "5V", "rc", "A"), w("rc", "B", "q", "collector"), w("q", "emitter", "p", "GND"), w("p", "GND", "rb", "A"), w("rb", "B", "q", "base")])
      s.step(1e-6)
      expect(s.elementSegments("q")[0].mode).toBe("off")
      expect(s.pinVoltage("q", "collector")).toBeCloseTo(5, 3)
    })

    it("PNP côté haut (émetteur à 5 V, base tirée au GND par 10 kΩ) : conduit, charge 1 kΩ alimentée", () => {
      const s = createTransientSession(
        [c("p", "POWER", { voltage: 5 }), c("rl", "RESISTOR", { resistance: 1000 }), c("rb", "RESISTOR", { resistance: 10000 }), c("q", "PNP_TRANSISTOR")],
        [w("p", "5V", "q", "emitter"), w("q", "collector", "rl", "A"), w("rl", "B", "p", "GND"), w("p", "GND", "rb", "A"), w("rb", "B", "q", "base")])
      s.step(1e-6)
      expect(s.elementSegments("q")[0].mode).toBe("sat")
      expect(s.pinVoltage("rl", "A")).toBeGreaterThan(4.5)
    })
  })

  describe("LM358P (gain fini, saturation aux rails)", () => {
    const base = () => [c("supply", "POWER", { voltage: 5 }), c("vin", "POWER", { voltage: 1 }), c("u", "LM358P")]
    const supplyWires = [w("supply", "5V", "u", "VCC+"), w("supply", "GND", "u", "VCC-"), w("vin", "GND", "supply", "GND")]

    it("suiveur : Vout = Vin (à 1/A près)", () => {
      const s = createTransientSession(base(), [...supplyWires, w("vin", "5V", "u", "1IN+"), w("u", "1OUT", "u", "1IN-")])
      s.step(1e-6)
      expect(s.pinVoltage("u", "1OUT")).toBeCloseTo(1, 3)
    })

    it("non inverseur 1 + 20k/10k : Vout = 3 V", () => {
      const s = createTransientSession(
        [...base(), c("rf", "RESISTOR", { resistance: 20000 }), c("rg", "RESISTOR", { resistance: 10000 })],
        [...supplyWires, w("vin", "5V", "u", "1IN+"), w("u", "1OUT", "rf", "A"), w("rf", "B", "u", "1IN-"), w("u", "1IN-", "rg", "A"), w("rg", "B", "supply", "GND")])
      s.step(1e-6)
      expect(s.pinVoltage("u", "1OUT")).toBeCloseTo(3, 2)
    })

    it("comparateur : sature à VCC − 1,5 V ou à ≈ 20 mV selon le signe de V+ − V−", () => {
      const high = createTransientSession(base(), [...supplyWires, w("vin", "5V", "u", "1IN+"), w("supply", "GND", "u", "1IN-")])
      high.step(1e-6)
      expect(high.pinVoltage("u", "1OUT")).toBeCloseTo(3.5, 2)
      const low = createTransientSession(base(), [...supplyWires, w("vin", "5V", "u", "1IN-"), w("supply", "GND", "u", "1IN+")])
      low.step(1e-6)
      expect(low.pinVoltage("u", "1OUT")).toBeCloseTo(0.02, 2)
    })

    it("sans alimentation : sortie non pilotée (aucune valeur inventée)", () => {
      const s = createTransientSession(
        [c("vin", "POWER", { voltage: 1 }), c("u", "LM358P"), c("r", "RESISTOR", { resistance: 1000 })],
        [w("vin", "5V", "u", "1IN+"), w("u", "1OUT", "r", "A"), w("r", "B", "vin", "GND")])
      s.step(1e-6)
      expect(s.elementSegments("u")[0].mode).toBe("off")
      expect(Math.abs(s.pinVoltage("u", "1OUT") ?? 0)).toBeLessThan(1e-6)
    })
  })

  it("PWM Arduino D3 (490 Hz, 50 %) → RC 1 kΩ/10 µF : tension moyenne ≈ 2,5 V, GND Arduino en référence", () => {
    const drive = (uid, pin, t) => (uid === "a" && pin === "D3" ? ((t * 490) % 1 < 0.5 ? 1 : 0) : null)
    const s = createTransientSession(
      [c("a", "ARDUINO"), c("r", "RESISTOR", { resistance: 1000 }), c("cap", "CAPACITOR", { capacitance: 1e-5 })],
      [w("a", "D3", "r", "A"), w("r", "B", "cap", "pinA"), w("cap", "pinB", "a", "GND")], { drive })
    const dt = 1 / 490 / 40
    let sum = 0; let n = 0; let maxPin = 0
    for (let i = 0; i < 40 * 490 * 0.3; i++) {
      s.step(dt)
      maxPin = Math.max(maxPin, s.pinVoltage("a", "D3"))
      if (i > 40 * 490 * 0.25) { sum += s.pinVoltage("cap", "pinA"); n++ }
    }
    expect(sum / n).toBeGreaterThan(2.3)
    expect(sum / n).toBeLessThan(2.7)
    expect(maxPin).toBeGreaterThan(4.9)
  })

  it("Arduino 5V est une source 5 V : diviseur 5V → 10k → A (nœud) → 10k → GND donne 2,5 V", () => {
    const s = createTransientSession(
      [c("a", "ARDUINO"), c("r1", "RESISTOR", { resistance: 10000 }), c("r2", "RESISTOR", { resistance: 10000 })],
      [w("a", "5V", "r1", "A"), w("r1", "B", "r2", "A"), w("r2", "B", "a", "GND")])
    s.step(1e-6)
    expect(s.pinVoltage("r1", "B")).toBeCloseTo(2.5, 2)
  })

  describe("ampèremètre inséré en série", () => {
    const parts = () => [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 1000 })]
    const meter = { id: "m1", a: { uid: "p", pin: "5V" }, b: { uid: "r", pin: "A" } }

    it("série valide : mesure I = V/R = 5 mA", () => {
      const s = createTransientSession(parts(), [w("r", "B", "p", "GND")], { ammeters: [meter] })
      s.step(1e-6)
      const reading = s.ammeter("m1")
      expect(reading.valid).toBe(true)
      expect(reading.current).toBeCloseTo(0.005, 6)
    })

    it("bornes déjà reliées par un fil : branchement invalide (SAME_NET)", () => {
      const s = createTransientSession(parts(), [w("r", "B", "p", "GND"), w("p", "5V", "r", "A")], { ammeters: [meter] })
      s.step(1e-6)
      expect(s.ammeter("m1")).toMatchObject({ valid: false, reason: "SAME_NET" })
    })

    it("borne laissée en l'air : branchement invalide (OPEN_TERMINAL), aucun courant inventé", () => {
      const s = createTransientSession(parts(), [], { ammeters: [meter] })
      s.step(1e-6)
      expect(s.ammeter("m1")).toMatchObject({ valid: false, reason: "OPEN_TERMINAL", current: null })
    })
  })

  it("deux sources de tension différentes en parallèle : SHORT_CIRCUIT signalé", () => {
    const s = createTransientSession(
      [c("a", "POWER", { voltage: 5 }), c("b", "POWER", { voltage: 9 })],
      [w("a", "5V", "b", "5V"), w("a", "GND", "b", "GND")])
    expect(s.step(1e-6)).toBe("SHORT_CIRCUIT")
  })

  it("types non qualifiés signalés (aucun résultat inventé)", () => {
    const s = createTransientSession([c("x", "NE555P"), c("r", "RESISTOR")], [])
    expect(s.unqualifiedTypes).toEqual(["NE555P"])
  })

  it("formes d'onde du générateur", () => {
    const g = { frequencyHz: 100, amplitude: 2, offset: 1 }
    expect(waveformValue({ ...g, waveform: "dc" }, 0.123)).toBe(1)
    expect(waveformValue({ ...g, waveform: "sine" }, 0.0025)).toBeCloseTo(3, 9)
    expect(waveformValue({ ...g, waveform: "square", duty: 0.5 }, 0.001)).toBe(3)
    expect(waveformValue({ ...g, waveform: "square", duty: 0.5 }, 0.007)).toBe(-1)
    expect(waveformValue({ ...g, waveform: "triangle" }, 0)).toBeCloseTo(-1, 9)
    expect(waveformValue({ ...g, waveform: "triangle" }, 0.005)).toBeCloseTo(3, 9)
  })
})
