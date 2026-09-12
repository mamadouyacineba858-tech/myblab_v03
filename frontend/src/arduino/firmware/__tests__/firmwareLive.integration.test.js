import { describe, it, expect, vi } from "vitest"
import { runSimulationWithRuntime, stopFirmwareSimulation, SIMULATION_STEP_MS } from "../../../simulator/simulationRuntimeIntegration.js"
const blink = "void setup() { pinMode(2, OUTPUT); } void loop() { digitalWrite(2, HIGH); delay(500); digitalWrite(2, LOW); delay(500); }"
function fixture() {
  const components = ["a", "b"].map(uid => ({ uid, type: "ARDUINO", x: 0, y: 0, firmware: { source: blink } }))
  const options = { orchestrators: new Map(), firmwareSessions: new Map(), dt: 0 }
  const step = (dt = SIMULATION_STEP_MS) => runSimulationWithRuntime(components, [], { ...options, dt })
  step(0)
  return { components, options, step }
}
describe("ARD-004 live composition", () => {
  it("advances shared Scheduler once; resumes all firmware before ticks at the same time", () => {
    const { options, step } = fixture()
    const scheduler = options.orchestrators.get("a").getScheduler()
    const advance = vi.spyOn(scheduler, "advance")
    const order = []
    for (const [uid, session] of options.firmwareSessions) {
      const resume = session.controller.resumeAtCurrentTime.bind(session.controller)
      vi.spyOn(session.controller, "resumeAtCurrentTime").mockImplementation(() => { order.push("resume:" + uid); resume() })
      const runtime = options.orchestrators.get(uid).getRuntime()
      const tick = runtime.tick.bind(runtime)
      vi.spyOn(runtime, "tick").mockImplementation(time => { order.push("tick:" + uid + ":" + time); return tick(time) })
    }
    step()
    expect(advance).toHaveBeenCalledTimes(1)
    expect(scheduler.getCurrentTime()).toBe(16)
    expect(order).toEqual(["resume:a", "resume:b", "tick:a:16", "tick:b:16"])
  })
  it("fixed frames produce HIGH LOW HIGH; stop prevents resume and restart starts at zero", () => {
    const { options, step } = fixture()
    const runtime = options.orchestrators.get("a").getRuntime()
    expect(runtime.pinOutputs.get("D2")).toBe("HIGH")
    for (let i = 0; i < 32; i++) step()
    expect(runtime.pinOutputs.get("D2")).toBe("LOW")
    for (let i = 0; i < 32; i++) step()
    expect(runtime.pinOutputs.get("D2")).toBe("HIGH")
    const session = options.firmwareSessions.get("a")
    stopFirmwareSimulation(options.orchestrators, options.firmwareSessions)
    const resume = vi.spyOn(session.executor, "resume")
    session.controller.resumeAtCurrentTime()
    expect(resume).not.toHaveBeenCalled()
    expect(runtime.running).toBe(false)
    step(0)
    expect(options.orchestrators.get("a").getCurrentTime()).toBe(0)
    expect(options.firmwareSessions.get("a")).not.toBe(session)
  })
  it("source change replaces IR; invalid source stops runtime and clears GPIO", () => {
    const { components, options, step } = fixture()
    const old = options.firmwareSessions.get("a")
    components[0].firmware.source = "invalid"
    step()
    const session = options.firmwareSessions.get("a")
    expect(session).not.toBe(old)
    expect(old.controller.isRunning()).toBe(false)
    expect(session.diagnostics.length).toBeGreaterThan(0)
    expect(session.controller).toBeUndefined()
    expect(options.orchestrators.get("a").getRuntime().pinOutputs.size).toBe(0)
    expect(options.orchestrators.get("a").getRuntime().running).toBe(false)
  })
})
