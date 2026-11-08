import { describe, it, expect } from "vitest"
import { compileFirmware } from "../firmwareCompiler.js"
import { FirmwareExecutor } from "../firmwareExecutor.js"
import { Signal } from "../../../simulator/signals.js"

const blink = `void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
}
void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(250);
  digitalWrite(LED_BUILTIN, LOW);
  delay(250);
}`

describe("A17 — UNO built-in LED sketch", () => {
  it("compiles LED_BUILTIN as the canonical D13 pin", () => {
    const result = compileFirmware(blink)
    expect(result.ok).toBe(true)
    expect(result.ir.setup).toEqual([{ op: "PIN_MODE", pin: "D13", mode: "OUTPUT" }])
    expect(result.ir.loop[0]).toEqual({ op: "DIGITAL_WRITE", pin: "D13", value: "HIGH" })
    expect(result.ir.loop[2]).toEqual({ op: "DIGITAL_WRITE", pin: "D13", value: "LOW" })
  })
  it("executes the same D13 signal through the existing runtime port", () => {
    const compiled = compileFirmware(blink)
    expect(compiled.ok).toBe(true)
    const writes = []
    const executor = new FirmwareExecutor(compiled.ir, { digitalWrite: (pin, level) => writes.push([pin, level]) })
    executor.resume(0)
    expect(writes.at(-1)).toEqual(["D13", Signal.HIGH])
    executor.resume(250)
    expect(writes.at(-1)).toEqual(["D13", Signal.LOW])
    executor.resume(500)
    expect(writes.at(-1)).toEqual(["D13", Signal.HIGH])
  })
  it("rejects arbitrary identifiers and unsupported C++ instead of silently accepting them", () => {
    expect(compileFirmware("void setup() { pinMode(UNKNOWN_PIN, OUTPUT); } void loop() {}").ok).toBe(false)
    expect(compileFirmware("void setup() {} void loop() { Serial.println(1); }").ok).toBe(false)
  })
})
