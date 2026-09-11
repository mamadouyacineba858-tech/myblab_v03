import { describe, it, expect, vi } from "vitest"
import { FirmwareRuntimeController } from "../firmwareRuntimeController.js"
import { FirmwareExecutor } from "../firmwareExecutor.js"
import { compileFirmware } from "../firmwareCompiler.js"
import { createScheduler } from "../../../simulator/scheduler.js"
import { Signal } from "../../../simulator/signals.js"

function fakeRuntime() {
  return { digitalWrite: vi.fn() }
}

function buildController(source, { scheduler } = {}) {
  const compiled = compileFirmware(source)
  expect(compiled.ok).toBe(true)
  const runtime = fakeRuntime()
  const executor = new FirmwareExecutor(compiled.ir, runtime)
  const controller = new FirmwareRuntimeController({ scheduler, executor })
  return { controller, runtime }
}

const BLINK_SOURCE = "void setup() { pinMode(2, OUTPUT); }\nvoid loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }"

describe("MB-L1-ARD-003 — firmwareRuntimeController — construction et injection (§16)", () => {
  it("crée son propre Scheduler indépendant si aucun n'est injecté", () => {
    const { controller } = buildController(BLINK_SOURCE)
    expect(controller.getScheduler()).toBeDefined()
    expect(controller.getCurrentTime()).toBe(0)
  })

  it("accepte un Scheduler injecté explicitement (composabilité, §15)", () => {
    const scheduler = createScheduler()
    const { controller } = buildController(BLINK_SOURCE, { scheduler })
    expect(controller.getScheduler()).toBe(scheduler)
  })
})

describe("MB-L1-ARD-003 — firmwareRuntimeController — start/advance/stop/reset (§17-§20)", () => {
  it("start() exécute setup+premier passage de loop sans avancer le Scheduler", () => {
    const { controller, runtime } = buildController(BLINK_SOURCE)
    controller.start()
    expect(controller.getCurrentTime()).toBe(0)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
  })

  it("advance(dt) avance le Scheduler ET reprend l'exécution firmware", () => {
    const { controller, runtime } = buildController(BLINK_SOURCE)
    controller.start()
    controller.advance(500)
    expect(controller.getCurrentTime()).toBe(500)
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.LOW)
  })

  it("stop() suspend le firmware : advance() ultérieur n'exécute plus d'instruction firmware", () => {
    const { controller, runtime } = buildController(BLINK_SOURCE)
    controller.start()
    controller.stop()
    const callsAtStop = runtime.digitalWrite.mock.calls.length
    controller.advance(500)
    controller.advance(500)
    expect(runtime.digitalWrite.mock.calls.length).toBe(callsAtStop)
  })

  it("le Scheduler continue de progresser même après stop() (l'axe du temps reste cohérent)", () => {
    const { controller } = buildController(BLINK_SOURCE)
    controller.start()
    controller.stop()
    controller.advance(1000)
    expect(controller.getCurrentTime()).toBe(1000)
  })

  it("reset() remet le temps du Scheduler à 0 et permet un nouveau setup", () => {
    const { controller, runtime } = buildController(BLINK_SOURCE)
    controller.start()
    controller.advance(500)
    controller.reset()
    expect(controller.getCurrentTime()).toBe(0)
    expect(controller.isRunning()).toBe(false)

    controller.start()
    expect(runtime.digitalWrite).toHaveBeenLastCalledWith("D2", Signal.HIGH)
  })
})

describe("MB-L1-ARD-003 — firmwareRuntimeController — Blink complet via le contrôleur", () => {
  it("séquence 0/499/500/999/1000/1500 identique à celle spécifiée §10/§28", () => {
    const { controller, runtime } = buildController(BLINK_SOURCE)
    const lastValue = () => runtime.digitalWrite.mock.calls.at(-1)?.[1]

    controller.start()
    expect(lastValue()).toBe(Signal.HIGH)
    controller.advance(499)
    expect(lastValue()).toBe(Signal.HIGH)
    controller.advance(1)
    expect(lastValue()).toBe(Signal.LOW)
    controller.advance(499)
    expect(lastValue()).toBe(Signal.LOW)
    controller.advance(1)
    expect(lastValue()).toBe(Signal.HIGH)
    controller.advance(500)
    expect(lastValue()).toBe(Signal.LOW)
  })
})
