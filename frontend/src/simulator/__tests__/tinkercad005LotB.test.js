import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { advanceLive, configureLive, liveVoltage, stopLive } from "../../instruments/liveSimulation.js"
import { resetInstruments } from "../../instruments/instrumentsStore.js"
import { clearPinTelemetry, getPinDrive, readAnalogCode, setAnalogReader } from "../arduino/arduinoPinTelemetry.js"
import { runSimulationStep } from "../simulationRuntimeIntegration.js"
import { createTransientSession, waveformValue } from "../transientSolver.js"

const c = (uid, type, parameters = {}) => ({ uid, type, x: 0, y: 0, parameters })
const w = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })
const pin = (uid, name) => ({ uid, pin: name })

describe("MYBLAB-TINKERCAD-005-B — scénarios scientifiques", () => {
  it("B01 — charge RC : Euler implicite suit Vc(t) = E(1 - exp(-t/RC))", () => {
    const components = [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-6 })]
    const wires = [w("p", "5V", "r", "A"), w("r", "B", "c", "pinA"), w("c", "pinB", "p", "GND")]
    const session = createTransientSession(components, wires)
    const tau = 1e-3
    session.advance(tau, tau / 500)
    const expected = 5 * (1 - Math.exp(-1))
    const actual = session.pinVoltage("c", "pinA")
    expect(session.status).toBe("OK")
    expect(Math.abs(actual - expected) / expected).toBeLessThan(0.002)
  })

  it("B02 — décharge RC depuis 5 V : Euler implicite suit Vc(t) = V0 exp(-t/RC)", () => {
    const components = [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-6 })]
    const wires = [w("r", "A", "c", "pinA"), w("r", "B", "p", "GND"), w("c", "pinB", "p", "GND")]
    const session = createTransientSession(components, wires, { initialConditions: { capacitorVoltages: { c: 5 } } })
    const tau = 1e-3
    session.advance(tau, tau / 500)
    const expected = 5 * Math.exp(-1)
    const actual = session.pinVoltage("c", "pinA")
    expect(Math.abs(actual - expected) / expected).toBeLessThan(0.002)
  })

  it("B03 — établissement RL depuis 0 A : Euler implicite suit I(t) = (E/R)(1 - exp(-Rt/L))", () => {
    const components = [c("p", "POWER", { voltage: 5 }), c("r", "RESISTOR", { resistance: 100 }), c("l", "INDUCTOR", { inductance: 0.01 })]
    const wires = [w("p", "5V", "r", "A"), w("r", "B", "l", "A"), w("l", "B", "p", "GND")]
    const session = createTransientSession(components, wires)
    const tau = 0.01 / 100
    session.advance(tau, tau / 500)
    const expected = (5 / 100) * (1 - Math.exp(-1))
    const actual = session.elementCurrent("l")
    expect(Math.abs(actual - expected) / expected).toBeLessThan(0.002)
  })

  it("B04 — NPN bloqué : base à 0 V, courant collecteur nul et collecteur tiré à 5 V", () => {
    const components = [c("p", "POWER", { voltage: 5 }), c("rc", "RESISTOR", { resistance: 1000 }), c("rb", "RESISTOR", { resistance: 10000 }), c("q", "NPN_TRANSISTOR")]
    const wires = [
      w("p", "5V", "rc", "A"), w("rc", "B", "q", "collector"), w("q", "emitter", "p", "GND"),
      w("p", "GND", "rb", "A"), w("rb", "B", "q", "base"),
    ]
    const session = createTransientSession(components, wires)
    session.step(1e-6)
    const transistor = session.elementSegments("q")[0]
    expect(transistor.mode).toBe("off")
    expect(transistor.current).toBe(0)
    expect(session.pinVoltage("q", "collector")).toBeCloseTo(5, 3)
  })

  it("B05 — NPN saturé commandé par Arduino : courant de charge compatible avec RCE et l'impédance de sortie", () => {
    const components = [
      c("a", "ARDUINO"), c("load", "RESISTOR", { resistance: 100 }),
      c("base", "RESISTOR", { resistance: 1000 }), c("q", "NPN_TRANSISTOR", { onResistance: 2 }),
    ]
    const wires = [
      w("a", "5V", "load", "A"), w("load", "B", "q", "collector"), w("q", "emitter", "a", "GND"),
      w("a", "D3", "base", "A"), w("base", "B", "q", "base"),
    ]
    const session = createTransientSession(components, wires, { drive: (_uid, pinName) => pinName === "D3" ? 1 : null })
    session.step(1e-6)
    const transistor = session.elementSegments("q")[0]
    const expectedLoadCurrent = (5 - 0.2) / (1 + 100 + 2)
    expect(transistor.mode).toBe("sat")
    expect(Math.abs(transistor.current - expectedLoadCurrent) / expectedLoadCurrent).toBeLessThan(0.01)
    expect(transistor.base).toBeGreaterThan(0)
    expect(session.pinVoltage("a", "D3")).toBeLessThan(5)
  })

  it("B06 — LM358P suiveur : la contre-réaction rend Vout proche de Vin hors saturation", () => {
    const components = [c("s", "POWER", { voltage: 5 }), c("vin", "POWER", { voltage: 1 }), c("u", "LM358P")]
    const wires = [
      w("s", "5V", "u", "VCC+"), w("s", "GND", "u", "VCC-"), w("vin", "GND", "s", "GND"),
      w("vin", "5V", "u", "1IN+"), w("u", "1OUT", "u", "1IN-"),
    ]
    const session = createTransientSession(components, wires)
    session.step(1e-6)
    expect(Math.abs(session.pinVoltage("u", "1OUT") - 1)).toBeLessThan(0.001)
    expect(session.elementSegments("u")[0].mode).toBe("lin")
  })

  it("B07 — LM358P amplificateur non-inverseur et écrêtage à VCC+ - headroom", () => {
    const build = (inputVoltage) => {
      const components = [
        c("s", "POWER", { voltage: 9 }), c("vin", "POWER", { voltage: inputVoltage }), c("u", "LM358P"),
        c("rf", "RESISTOR", { resistance: 20000 }), c("rg", "RESISTOR", { resistance: 10000 }),
      ]
      const wires = [
        w("s", "5V", "u", "VCC+"), w("s", "GND", "u", "VCC-"), w("vin", "GND", "s", "GND"),
        w("vin", "5V", "u", "1IN+"), w("u", "1OUT", "rf", "A"), w("rf", "B", "u", "1IN-"),
        w("u", "1IN-", "rg", "A"), w("rg", "B", "s", "GND"),
      ]
      const session = createTransientSession(components, wires)
      session.step(1e-6)
      return session
    }
    const linear = build(1)
    expect(Math.abs(linear.pinVoltage("u", "1OUT") - 3)).toBeLessThan(0.002)
    expect(linear.elementSegments("u")[0].mode).toBe("lin")
    const saturated = build(5)
    expect(saturated.pinVoltage("u", "1OUT")).toBeGreaterThan(7.48)
    expect(saturated.pinVoltage("u", "1OUT")).toBeLessThan(7.5)
    expect(saturated.elementSegments("u")[0].mode).toBe("high")
  })

  it("B08 — GBF carré 100 Hz, 25 % → RC : la charge et la décharge suivent les constantes de temps", () => {
    const components = [c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-6 })]
    const wires = [w("r", "B", "c", "pinA")]
    const generators = [{
      id: "square", plus: pin("r", "A"), minus: pin("c", "pinB"),
      waveform: "square", frequencyHz: 100, amplitude: 2, offset: 2, duty: 0.25,
    }]
    const session = createTransientSession(components, wires, { generators })
    const dt = 1e-3 / 200
    session.advance(0.02249, dt)
    const nearPeak = session.pinVoltage("c", "pinA")
    const expectedPeak = 4 * (1 - Math.exp(-2.49))
    session.advance(0.0075, dt)
    const nearLow = session.pinVoltage("c", "pinA")
    expect(Math.abs(nearPeak - expectedPeak)).toBeLessThan(0.01)
    expect(nearLow).toBeGreaterThanOrEqual(0)
    expect(nearLow).toBeLessThan(0.004)
  })

  it("B09 — GBF sinusoïdal : amplitude, fréquence, offset, continu et triangle vérifiés au solveur", () => {
    const components = [c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-6 })]
    const wires = [w("r", "B", "c", "pinA")]
    const frequencyHz = 20
    const session = createTransientSession(components, wires, {
      generators: [{
        id: "sine", plus: pin("r", "A"), minus: pin("c", "pinB"),
        waveform: "sine", frequencyHz, amplitude: 2, offset: 1,
      }],
    })
    const dt = 1 / (frequencyHz * 400)
    const samples = []
    for (let i = 0; i < 3 * 400; i++) {
      session.step(dt)
      samples.push({ time: session.time, voltage: session.generator("sine").voltage })
    }
    const peaks = samples.filter((sample, index) => index > 0 && index < samples.length - 1
      && sample.voltage > samples[index - 1].voltage && sample.voltage >= samples[index + 1].voltage)
    const measuredPeriod = peaks[1].time - peaks[0].time
    const max = Math.max(...samples.map((sample) => sample.voltage))
    const min = Math.min(...samples.map((sample) => sample.voltage))
    expect(Math.abs(max - 3)).toBeLessThan(0.001)
    expect(Math.abs(min + 1)).toBeLessThan(0.001)
    expect(Math.abs(1 / measuredPeriod - frequencyHz) / frequencyHz).toBeLessThan(0.01)
    expect(waveformValue({ waveform: "dc", amplitude: 2, offset: 1, frequencyHz }, 0.13)).toBe(1)
    expect(waveformValue({ waveform: "triangle", amplitude: 2, offset: 1, frequencyHz }, 0)).toBe(-1)
    expect(waveformValue({ waveform: "triangle", amplitude: 2, offset: 1, frequencyHz }, 1 / (2 * frequencyHz))).toBe(3)
  })

  it("B10 — régression Arduino : analogRead ADC 10 bits pilote le firmware et analogWrite PWM", () => {
    const source = "void setup() { pinMode(13, OUTPUT); pinMode(9, OUTPUT); } void loop() { int value = analogRead(A0); if (value > 500) { digitalWrite(13, HIGH); } else { digitalWrite(13, LOW); } analogWrite(9, 64); delay(16); }"
    const components = [
      { ...c("a", "ARDUINO"), firmware: { source } },
      c("top", "RESISTOR", { resistance: 1000 }), c("bottom", "RESISTOR", { resistance: 3000 }),
      c("r", "RESISTOR", { resistance: 1000 }), c("cap", "CAPACITOR", { capacitance: 1e-5 }),
    ]
    const wires = [
      w("a", "5V", "top", "A"), w("top", "B", "a", "A0"), w("a", "A0", "bottom", "A"), w("bottom", "B", "a", "GND"),
      w("a", "D9", "r", "A"), w("r", "B", "cap", "pinA"), w("cap", "pinB", "a", "GND"),
    ]
    const session = createTransientSession(components, wires, {
      drive: (uid, pinName, time) => (uid === "a" && pinName === "D9" ? ((time * 490) % 1 < 64 / 255 ? 1 : 0) : null),
    })
    session.advance(0.2, 1 / (490 * 100))
    const analogVoltage = session.pinVoltage("a", "A0")
    setAnalogReader((uid, pinName) => (uid === "a" && pinName === "A0" ? analogVoltage : null))
    expect(analogVoltage).toBeCloseTo(3.75, 2)
    expect(readAnalogCode("a", "A0")).toBe(767)

    runSimulationStep(components, wires, { orchestrators: new Map(), firmwareSessions: new Map(), dt: 0 })
    expect(getPinDrive("a", "D9")).toMatchObject({ kind: "pwm", value: 64, frequencyHz: 490 })
    expect(getPinDrive("a", "D13")).toMatchObject({ kind: "digital", level: 1 })
  })
})

describe("MYBLAB-TINKERCAD-005-B — conservation d'état et garde-fous", () => {
  beforeEach(() => {
    resetInstruments()
    stopLive()
    clearPinTelemetry()
    setAnalogReader(null)
  })
  afterEach(() => {
    stopLive()
    clearPinTelemetry()
    setAnalogReader(null)
  })

  it("préserve la charge d'un condensateur lors de l'ouverture puis de la fermeture d'un interrupteur", () => {
    const components = (state) => [
      c("p", "POWER", { voltage: 5 }), { ...c("sw", "BUTTON_LATCHING"), state },
      c("r", "RESISTOR", { resistance: 1000 }), c("bleed", "RESISTOR", { resistance: 10000 }),
      c("c", "CAPACITOR", { capacitance: 1e-6 }),
    ]
    const wires = [
      w("p", "5V", "sw", "pin1"), w("sw", "pin2", "r", "A"),
      w("r", "B", "c", "pinA"), w("c", "pinA", "bleed", "A"),
      w("bleed", "B", "c", "pinB"), w("c", "pinB", "p", "GND"),
    ]
    configureLive(components("on"), wires)
    advanceLive(0.002)
    const charged = liveVoltage(pin("c", "pinA"), pin("c", "pinB"))
    expect(charged).toBeGreaterThan(4)

    configureLive(components("off"), wires)
    advanceLive(0.001)
    const discharged = liveVoltage(pin("c", "pinA"), pin("c", "pinB"))
    const dischargingExpected = charged * Math.exp(-0.1)
    expect(Math.abs(discharged - dischargingExpected) / dischargingExpected).toBeLessThan(0.002)

    configureLive(components("on"), wires)
    advanceLive(0.001)
    const recharged = liveVoltage(pin("c", "pinA"), pin("c", "pinB"))
    const chargingAsymptote = 5 * 10000 / (1000 + 10000)
    const chargingTau = (1000 * 10000 / (1000 + 10000)) * 1e-6
    const expected = chargingAsymptote + (discharged - chargingAsymptote) * Math.exp(-0.001 / chargingTau)
    expect(Math.abs(recharged - expected)).toBeLessThan(0.01)
  })

  it("rejette explicitement les pas, états et paramètres physiques invalides", () => {
    const session = createTransientSession([c("r", "RESISTOR")], [])
    expect(() => session.step(0)).toThrow(/dt must be finite and greater than zero/)
    expect(() => session.advance(1, 0)).toThrow(/dtMax must be finite and greater than zero/)
    expect(() => session.advance(1, 1e-9)).toThrow(/more than 1000000 steps/)
    expect(() => createTransientSession([c("c", "CAPACITOR", { capacitance: 0 })], [])).toThrow(/capacitance/)
    expect(() => createTransientSession([], [], {
      generators: [{ id: "bad", plus: pin("r", "A"), waveform: "square", frequencyHz: 10, amplitude: 1, offset: 0, duty: 1 }],
    })).toThrow(/duty/)
    expect(() => createTransientSession([], [], { initialConditions: { capacitorVoltages: { c: Number.NaN } } })).toThrow(/must be finite/)
  })

  it("signale un circuit ouvert sans référence et ne fabrique pas de tension", () => {
    const session = createTransientSession([c("r", "RESISTOR", { resistance: 1000 })], [])
    expect(session.step(1e-6)).toBe("NO_REFERENCE")
    expect(session.pinVoltage("r", "A")).toBeNull()
    expect(session.pinVoltage("r", "B")).toBeNull()
  })
})
