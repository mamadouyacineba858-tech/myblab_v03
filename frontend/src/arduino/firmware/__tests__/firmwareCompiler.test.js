import { describe, it, expect } from "vitest"
import { compileFirmware } from "../firmwareCompiler.js"
import { DiagnosticCode } from "../firmwareDiagnostics.js"
import { DEFAULT_FIRMWARE_SOURCE } from "../../firmwareDefaults.js"

describe("MB-L1-ARD-002 — firmwareCompiler — TEST C1-C16", () => {
  it("C1 — default firmware compile (setup/loop vides)", () => {
    const result = compileFirmware(DEFAULT_FIRMWARE_SOURCE)
    expect(result.ok).toBe(true)
    expect(result.ir).toEqual({ setup: [], loop: [] })
  })

  it("C2 — setup + loop compile", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() {}")
    expect(result.ok).toBe(true)
  })

  it("C3 — pinMode(2, OUTPUT) -> PIN_MODE D2", () => {
    const result = compileFirmware("void setup() { pinMode(2, OUTPUT); }\nvoid loop() {}")
    expect(result.ok).toBe(true)
    expect(result.ir.setup).toEqual([{ op: "PIN_MODE", pin: "D2", mode: "OUTPUT" }])
  })

  it("C4 — pinMode(3, OUTPUT) -> PIN_MODE D3", () => {
    const result = compileFirmware("void setup() { pinMode(3, OUTPUT); }\nvoid loop() {}")
    expect(result.ok).toBe(true)
    expect(result.ir.setup).toEqual([{ op: "PIN_MODE", pin: "D3", mode: "OUTPUT" }])
  })

  it("C5 — digitalWrite(2, HIGH) -> DIGITAL_WRITE D2 HIGH", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() { digitalWrite(2, HIGH); }")
    expect(result.ok).toBe(true)
    expect(result.ir.loop).toEqual([{ op: "DIGITAL_WRITE", pin: "D2", value: "HIGH" }])
  })

  it("C6 — digitalWrite(2, LOW) -> DIGITAL_WRITE D2 LOW", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() { digitalWrite(2, LOW); }")
    expect(result.ok).toBe(true)
    expect(result.ir.loop).toEqual([{ op: "DIGITAL_WRITE", pin: "D2", value: "LOW" }])
  })

  it("C7 — plusieurs instructions préservent l'ordre", () => {
    const result = compileFirmware(
      "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); digitalWrite(2, LOW); digitalWrite(2, HIGH); }"
    )
    expect(result.ok).toBe(true)
    expect(result.ir.loop).toEqual([
      { op: "DIGITAL_WRITE", pin: "D2", value: "HIGH" },
      { op: "DIGITAL_WRITE", pin: "D2", value: "LOW" },
      { op: "DIGITAL_WRITE", pin: "D2", value: "HIGH" },
    ])
  })

  it("C8 — setup absent -> error", () => {
    const result = compileFirmware("void loop() {}")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.MISSING_SETUP)
  })

  it("C9 — loop absent -> error", () => {
    const result = compileFirmware("void setup() {}")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.MISSING_LOOP)
  })

  it("C10 — pin non supportée (13) -> error", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() { digitalWrite(13, HIGH); }")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.UNSUPPORTED_PIN)
  })

  it("C11 — mode INPUT non supporté -> error", () => {
    const result = compileFirmware("void setup() { pinMode(2, INPUT); }\nvoid loop() {}")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.UNSUPPORTED_MODE)
  })

  it("C12 — valeur invalide (MAYBE) -> error", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() { digitalWrite(2, MAYBE); }")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.INVALID_LEVEL)
  })

  it("C13 — Serial.begin -> error", () => {
    const result = compileFirmware("void setup() { Serial.begin(9600); }\nvoid loop() {}")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.UNSUPPORTED_STATEMENT)
  })

  it("C14 — delay(500) -> diagnostic explicite non supporté (jamais implémenté silencieusement)", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() { delay(500); }")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.UNSUPPORTED_STATEMENT)
    expect(result.diagnostics[0].message).toMatch(/delay/)
  })

  it("C15 — accolades mal formées -> error", () => {
    const result = compileFirmware("void setup() { pinMode(2, OUTPUT);\nvoid loop() {}")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.MALFORMED_BRACES)
  })

  it("C16 — instruction inconnue -> error", () => {
    const result = compileFirmware("void setup() {}\nvoid loop() { doSomethingUnknown(1, 2); }")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.UNSUPPORTED_STATEMENT)
  })
})

describe("MB-L1-ARD-002 — firmwareCompiler — §19 cas d'erreur additionnels", () => {
  it("analogWrite() est hors scope ARD-002 -> UNSUPPORTED_STATEMENT", () => {
    const result = compileFirmware("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { analogWrite(2, 128); }")
    expect(result.ok).toBe(false)
    expect(result.diagnostics[0].code).toBe(DiagnosticCode.UNSUPPORTED_STATEMENT)
  })

  it("digitalRead()/analogRead() hors scope -> UNSUPPORTED_STATEMENT", () => {
    expect(compileFirmware("void setup() {}\nvoid loop() { digitalRead(2); }").ok).toBe(false)
    expect(compileFirmware("void setup() {}\nvoid loop() { analogRead(2); }").ok).toBe(false)
  })

  it("les commentaires // et /* */ sont ignorés sans affecter la compilation", () => {
    const result = compileFirmware(
      "// initialise le pin\nvoid setup() { pinMode(2, OUTPUT); /* sortie numérique */ }\nvoid loop() { digitalWrite(2, HIGH); }"
    )
    expect(result.ok).toBe(true)
  })
})

describe("MB-L1-ARD-002 — TEST T35 : atomicité du source invalide", () => {
  it("un source partiellement valide ne retourne jamais d'IR partielle", () => {
    const result = compileFirmware(
      "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); Serial.begin(9600); }"
    )
    expect(result.ok).toBe(false)
    expect(result.ir).toBeUndefined()
  })
})

describe("MB-L1-ARD-002 — IR immuable (ARD-09)", () => {
  it("l'IR retournée est gelée (Object.freeze) — toute tentative de mutation échoue silencieusement ou lève", () => {
    const result = compileFirmware("void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); }")
    expect(Object.isFrozen(result.ir)).toBe(true)
    expect(Object.isFrozen(result.ir.setup)).toBe(true)
    expect(Object.isFrozen(result.ir.loop)).toBe(true)
    expect(Object.isFrozen(result.ir.loop[0])).toBe(true)
  })
})
