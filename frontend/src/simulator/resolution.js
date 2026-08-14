import { Signal } from "./signals.js"
import { getSimulationDefaultParameters } from "./simulationRegistry.js"

/**
 * MB-SIM-006 : Résolution (ADR-004).
 * Reçoit le modèle préparé (nets) en lecture seule, calcule les signaux bruts.
 * MB-CF2-SIM-001 : les modèles sont découverts via simulationRegistry.
 */
export function resolveSignals(components, prepared) {
  const { uf, nets, allKeys } = prepared
  const pinSignals = new Map()
  for (const k of allKeys) pinSignals.set(k, Signal.UNKNOWN)

  for (const comp of components) {
    if (comp.type !== "POWER") continue
    pinSignals.set(uf.key(comp.uid, "5V"), Signal.HIGH)
    pinSignals.set(uf.key(comp.uid, "GND"), Signal.LOW)
  }

  const propagate = (signal) => {
    for (const [, keys] of nets) {
      let found = false
      for (const k of keys) {
        if (pinSignals.get(k) === signal) { found = true; break }
      }
      if (!found) continue
      for (const k of keys) {
        if (pinSignals.get(k) === Signal.UNKNOWN) pinSignals.set(k, signal)
      }
    }
  }

  propagate(Signal.HIGH)
  propagate(Signal.LOW)

  for (const comp of components) {
    if (comp.type !== "ARDUINO") continue
    for (const pinId of ["D2", "D3"]) {
      const k = uf.key(comp.uid, pinId)
      if (pinSignals.get(k) === Signal.UNKNOWN) pinSignals.set(k, Signal.FLOATING)
    }
  }

  const dcAnalysis = computeDcAnalysis(components, prepared, pinSignals)
  return { pinSignals, dcAnalysis }
}

function computeDcAnalysis(components, prepared, pinSignals) {
  const { uf } = prepared
  const voltage = getSimulationDefaultParameters("POWER").voltage
  const resistance = getSimulationDefaultParameters("RESISTOR").resistance
  const dcAnalysis = new Map()

  for (const comp of components) {
    if (comp.type !== "RESISTOR") continue
    const pinA = pinSignals.get(uf.key(comp.uid, "A"))
    const pinB = pinSignals.get(uf.key(comp.uid, "B"))
    const isSimplePoweredLoop =
      (pinA === Signal.HIGH && pinB === Signal.LOW) ||
      (pinA === Signal.LOW && pinB === Signal.HIGH)
    if (!isSimplePoweredLoop) continue
    dcAnalysis.set(comp.uid, { voltage, current: voltage / resistance })
  }

  const ldrResistance = getSimulationDefaultParameters("LDR").resistance
  for (const comp of components) {
    if (comp.type !== "LDR") continue
    const pinA = pinSignals.get(uf.key(comp.uid, "A"))
    const pinB = pinSignals.get(uf.key(comp.uid, "B"))
    const isSimplePoweredLoop =
      (pinA === Signal.HIGH && pinB === Signal.LOW) ||
      (pinA === Signal.LOW && pinB === Signal.HIGH)
    if (!isSimplePoweredLoop) continue
    dcAnalysis.set(comp.uid, { voltage, current: voltage / ldrResistance })
  }

  const thermistorResistance = getSimulationDefaultParameters("THERMISTOR").resistance
  for (const comp of components) {
    if (comp.type !== "THERMISTOR") continue
    const pinA = pinSignals.get(uf.key(comp.uid, "A"))
    const pinB = pinSignals.get(uf.key(comp.uid, "B"))
    const isSimplePoweredLoop =
      (pinA === Signal.HIGH && pinB === Signal.LOW) ||
      (pinA === Signal.LOW && pinB === Signal.HIGH)
    if (!isSimplePoweredLoop) continue
    dcAnalysis.set(comp.uid, { voltage, current: voltage / thermistorResistance })
  }

  return dcAnalysis
}
