import { describe, it, expect, beforeEach, afterEach } from "vitest"
import {
  getInstruments, updateInstruments, resetInstruments, snapshotInstruments, applyInstrumentsSnapshot,
  armPinPick, consumePinPick, GENERATOR_LIMITS,
} from "../instrumentsStore.js"
import { configureLive, advanceLive, readScopeWindow, getLiveStatus, stopLive, liveVoltage } from "../liveSimulation.js"
import { runSimulationStep } from "../../simulator/simulationRuntimeIntegration.js"
import {
  recordPwm, recordDigital, pinLevelAt, clearPinTelemetry, getPinDrive, setAnalogReader, readAnalogCode, ARDUINO_PWM_FREQUENCY_HZ,
} from "../../simulator/arduino/arduinoPinTelemetry.js"

const c = (uid, type, parameters) => ({ uid, type, x: 0, y: 0, parameters })
const w = (fromUid, fromPin, toUid, toPin) => ({ fromUid, fromPin, toUid, toPin })

describe("instrumentsStore", () => {
  beforeEach(() => resetInstruments())

  it("état par défaut : aucun instantané sérialisé", () => {
    expect(snapshotInstruments()).toBeUndefined()
  })

  it("aller-retour snapshot/apply conserve générateur, scope et sondes", () => {
    updateInstruments((s) => {
      Object.assign(s.generator, { enabled: true, waveform: "square", frequencyHz: 250, amplitude: 3, offset: 1, duty: 0.3, plus: { uid: "r", pin: "A" }, minus: { uid: "c", pin: "pinB" } })
      s.scope.windowMs = 100
      s.scope.ch1 = { plus: { uid: "c", pin: "pinA" }, minus: { uid: "c", pin: "pinB" } }
      s.voltmeter.plus = { uid: "r", pin: "B" }
    })
    const snap = JSON.parse(JSON.stringify(snapshotInstruments()))
    resetInstruments()
    expect(getInstruments().generator.enabled).toBe(false)
    applyInstrumentsSnapshot(snap)
    const g = getInstruments().generator
    expect(g).toMatchObject({ enabled: true, waveform: "square", frequencyHz: 250, amplitude: 3, offset: 1, duty: 0.3 })
    expect(g.plus).toEqual({ uid: "r", pin: "A" })
    expect(getInstruments().scope.windowMs).toBe(100)
    expect(getInstruments().scope.ch1.plus).toEqual({ uid: "c", pin: "pinA" })
    expect(getInstruments().voltmeter.plus).toEqual({ uid: "r", pin: "B" })
  })

  it("les valeurs hors domaine sont bornées et les données invalides assainies", () => {
    updateInstruments((s) => { s.generator.frequencyHz = 1e9; s.generator.amplitude = 500; s.generator.offset = -500 })
    expect(getInstruments().generator.frequencyHz).toBe(GENERATOR_LIMITS.maxHz)
    expect(getInstruments().generator.amplitude).toBe(GENERATOR_LIMITS.maxAmplitude)
    expect(getInstruments().generator.offset).toBe(-GENERATOR_LIMITS.maxOffset)
    applyInstrumentsSnapshot({ generator: { waveform: "bogus", plus: { uid: 3 } }, scope: { windowMs: 7 } })
    expect(getInstruments().generator.waveform).toBe("sine")
    expect(getInstruments().generator.plus).toBeNull()
    expect(getInstruments().scope.windowMs).toBe(20)
  })

  it("sélection de borne : armée puis consommée une seule fois", () => {
    let got = null
    armPinPick("test", (p) => { got = p })
    expect(consumePinPick("r", "A")).toBe(true)
    expect(got).toEqual({ uid: "r", pin: "A" })
    expect(consumePinPick("r", "B")).toBe(false)
  })
})

describe("arduinoPinTelemetry", () => {
  it("PWM : rapport cyclique reconstruit exactement ; numérique prioritaire après réécriture", () => {
    clearPinTelemetry("a")
    recordPwm("a", "D9", 64)
    const period = 1 / ARDUINO_PWM_FREQUENCY_HZ
    let high = 0
    const n = 10000
    for (let i = 0; i < n; i++) if (pinLevelAt("a", "D9", (i / n) * period * 20) === 1) high++
    expect(high / n).toBeCloseTo(64 / 255, 1)
    recordDigital("a", "D9", false)
    expect(pinLevelAt("a", "D9", 2)).toBe(0)
    clearPinTelemetry("a")
    expect(pinLevelAt("a", "D9", 0)).toBeNull()
  })

  it("PWM Uno : D5/D6 fonctionnent à 980 Hz, les autres broches supportées à 490 Hz", () => {
    for (const pin of ["D3", "D9", "D10", "D11"]) {
      recordPwm("a", pin, 128)
      expect(getPinDrive("a", pin).frequencyHz).toBe(490)
    }
    for (const pin of ["D5", "D6"]) {
      recordPwm("a", pin, 128)
      expect(getPinDrive("a", pin).frequencyHz).toBe(980)
    }
    clearPinTelemetry("a")
  })

  it("analogRead : 0..1023 sur référence 5 V, null sans lecteur", () => {
    setAnalogReader(() => 2.5)
    expect(readAnalogCode("a", "A0")).toBe(512)
    setAnalogReader(() => 5)
    expect(readAnalogCode("a", "A0")).toBe(1023)
    setAnalogReader(() => 0)
    expect(readAnalogCode("a", "A0")).toBe(0)
    setAnalogReader(null)
    expect(readAnalogCode("a", "A0")).toBeNull()
  })
})

describe("liveSimulation — générateur → RC → oscilloscope", () => {
  beforeEach(() => { resetInstruments(); stopLive(); clearPinTelemetry() })
  afterEach(() => { stopLive(); clearPinTelemetry() })

  it("l'amplitude crête lue à l'oscilloscope correspond au gain analytique du filtre RC", () => {
    const fc = 1000
    const cap = 1 / (2 * Math.PI * fc * 1000)
    const comps = [c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: cap })]
    const wires = [w("r", "B", "c", "pinA")]
    updateInstruments((s) => {
      Object.assign(s.generator, { enabled: true, waveform: "sine", frequencyHz: fc, amplitude: 2, offset: 0, plus: { uid: "r", pin: "A" }, minus: { uid: "c", pin: "pinB" } })
      s.scope.ch1 = { plus: { uid: "c", pin: "pinA" }, minus: { uid: "c", pin: "pinB" } }
      s.scope.ch2 = { plus: { uid: "r", pin: "A" }, minus: { uid: "c", pin: "pinB" } }
    })
    expect(configureLive(comps, wires)).toBe(true)
    for (let i = 0; i < 400; i++) advanceLive(0.016)
    const { columns } = readScopeWindow(0.004, 40)
    const max1 = Math.max(...columns.map((x) => x.max1))
    const max2 = Math.max(...columns.map((x) => x.max2))
    // Échantillonnage de l'oscilloscope : 50 kéch./s au plus → erreur de crête < 0,5 % à 1 kHz.
    expect(Math.abs(max2 - 2) / 2).toBeLessThan(0.02)
    expect(Math.abs(max1 - 2 / Math.SQRT2) / (2 / Math.SQRT2)).toBeLessThan(0.04)
    expect(getLiveStatus().available).toBe(true)
    expect(Math.abs(liveVoltage({ uid: "r", pin: "A" }, { uid: "c", pin: "pinB" }))).toBeLessThanOrEqual(2.0001)
  })

  it("PWM Arduino (analogWrite 64) → RC : moyenne du condensateur = 5 V × 64/255 à 1 %", () => {
    clearPinTelemetry()
    recordPwm("ard", "D9", 64)
    const comps = [c("ard", "ARDUINO", {}), c("r", "RESISTOR", { resistance: 1000 }), c("c", "CAPACITOR", { capacitance: 1e-5 })]
    const wires = [w("ard", "D9", "r", "A"), w("r", "B", "c", "pinA"), w("c", "pinB", "ard", "GND")]
    updateInstruments((s) => { s.scope.ch1 = { plus: { uid: "c", pin: "pinA" }, minus: { uid: "c", pin: "pinB" } } })
    configureLive(comps, wires)
    for (let i = 0; i < 60; i++) advanceLive(0.016, true)
    const { columns } = readScopeWindow(0.0204, 10)
    const all = columns.filter((x) => Number.isFinite(x.min1))
    const mid = all.reduce((a, x) => a + (x.min1 + x.max1) / 2, 0) / all.length
    expect(Math.abs(mid - (5 * 64) / 255) / ((5 * 64) / 255)).toBeLessThan(0.03)
    clearPinTelemetry()
  })

  it("le firmware analogWrite réel pilote le PWM du solveur transitoire", () => {
    const source = "void setup() { pinMode(9, OUTPUT); } void loop() { analogWrite(9, 64); delay(16); }"
    const components = [
      { uid: "ard", type: "ARDUINO", firmware: { source } },
      c("r", "RESISTOR", { resistance: 1000 }),
      c("c", "CAPACITOR", { capacitance: 1e-5 }),
    ]
    const wires = [
      w("ard", "D9", "r", "A"),
      w("r", "B", "c", "pinA"),
      w("c", "pinB", "ard", "GND"),
    ]
    runSimulationStep(components, wires, {
      orchestrators: new Map(),
      firmwareSessions: new Map(),
      dt: 0,
    })
    expect(getPinDrive("ard", "D9")).toMatchObject({ kind: "pwm", value: 64, frequencyHz: 490 })

    updateInstruments((s) => {
      s.scope.ch1 = { plus: { uid: "c", pin: "pinA" }, minus: { uid: "c", pin: "pinB" } }
    })
    configureLive(components, wires)
    for (let i = 0; i < 60; i++) advanceLive(0.016, true)
    const { columns } = readScopeWindow(0.0204, 10)
    const samples = columns.filter((column) => Number.isFinite(column.min1))
    const mean = samples.reduce((sum, column) => sum + (column.min1 + column.max1) / 2, 0) / samples.length
    expect(Math.abs(mean - (5 * 64) / 255) / ((5 * 64) / 255)).toBeLessThan(0.03)
  })

  it("analogRead(A0) échantillonne le nœud électrique et pilote le firmware", () => {
    const source = "void setup() { pinMode(13, OUTPUT); } void loop() { int value = analogRead(A0); if (value > 500) { digitalWrite(13, HIGH); } else { digitalWrite(13, LOW); } delay(16); }"
    const components = [
      { uid: "ard", type: "ARDUINO", firmware: { source } },
      c("top", "RESISTOR", { resistance: 1000 }),
      c("bottom", "RESISTOR", { resistance: 3000 }),
    ]
    const wires = [
      w("ard", "5V", "top", "A"),
      w("top", "B", "ard", "A0"),
      w("ard", "A0", "bottom", "A"),
      w("bottom", "B", "ard", "GND"),
    ]

    configureLive(components, wires)
    advanceLive(0.016)
    expect(readAnalogCode("ard", "A0")).toBe(767)

    const result = runSimulationStep(components, wires, {
      orchestrators: new Map(),
      firmwareSessions: new Map(),
      dt: 0,
    })
    expect(result.pinSignals.get("ard:D13")).toBe("HIGH")
  })

  it("sans session, aucune donnée n'est fabriquée", () => {
    expect(readScopeWindow(0.01, 10).columns).toEqual([])
    expect(getLiveStatus().available).toBe(false)
  })
})
