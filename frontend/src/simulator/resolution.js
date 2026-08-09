import { Signal } from "./signals.js"

/**
 * MB-SIM-006 : Résolution (ADR-004).
 * Reçoit le modèle préparé (nets) en lecture seule, calcule les signaux
 * bruts pour chaque pin. Ne conserve aucun état entre deux appels.
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {{ uf, nets: Map<string, string[]>, allKeys: string[] }} prepared
 * @returns {Map<string, string>} clÃƒÂ© "uid:pinId" Ã¢â€ â€™ Signal
 */
export function resolveSignals(components, prepared) {
  const { uf, nets, allKeys } = prepared

  const pinSignals = new Map()
  for (const k of allKeys) {
    pinSignals.set(k, Signal.UNKNOWN)
  }

  /** Sources : alimentation */
  for (const comp of components) {
    if (comp.type !== "POWER") continue
    pinSignals.set(uf.key(comp.uid, "5V"), Signal.HIGH)
    pinSignals.set(uf.key(comp.uid, "GND"), Signal.LOW)
  }

  /** Propagation : sur chaque net, si une pin est HIGH/LOW, toute la net hÃƒÂ©rite */
  const propagate = (signal) => {
    for (const [, keys] of nets) {
      let found = false
      for (const k of keys) {
        if (pinSignals.get(k) === signal) {
          found = true
          break
        }
      }
      if (!found) continue
      for (const k of keys) {
        if (pinSignals.get(k) === Signal.UNKNOWN) {
          pinSignals.set(k, signal)
        }
      }
    }
  }

  propagate(Signal.HIGH)
  propagate(Signal.LOW)

  /** Arduino stub : pins GPIO hÃƒÂ©ritent du net (futur : exÃƒÂ©cution sketch) */
  for (const comp of components) {
    if (comp.type !== "ARDUINO") continue
    for (const pinId of ["D2", "D3"]) {
      const k = uf.key(comp.uid, pinId)
      if (pinSignals.get(k) === Signal.UNKNOWN) {
        pinSignals.set(k, Signal.FLOATING)
      }
    }
  }

  return pinSignals
}