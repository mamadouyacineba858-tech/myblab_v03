import { Signal } from "./signals.js"
import { getComponentDef } from "../config/componentDefinitions.js"

/**
 * Moteur de simulation simple MYBlab.
 * - Propagation HIGH/LOW sur les nets (groupes de pins reliÃƒÂ©es par fils)
 * - LED ON si anode HIGH et cathode LOW
 * - Alimentation comme source
 * - Bouton : pin1 reliÃƒÂ© ÃƒÂ  pin2 quand "pressÃƒÂ©" (ÃƒÂ©tat futur dans component.pins)
 */

/**
 * Union-Find pour regrouper les pins connectÃƒÂ©es par fils.
 */
class UnionFind {
  constructor() {
    this.parent = new Map()
  }

  key(uid, pinId) {
    return `${uid}:${pinId}`
  }

  find(k) {
    if (!this.parent.has(k)) this.parent.set(k, k)
    if (this.parent.get(k) !== k) {
      this.parent.set(k, this.find(this.parent.get(k)))
    }
    return this.parent.get(k)
  }

  union(a, b) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

/**
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @returns {Map<string, string>} clÃƒÂ© "uid:pinId" Ã¢â€ â€™ Signal
 */
export function runSimulation(components, wires) {
  const uf = new UnionFind()
  const allKeys = []

  for (const comp of components) {
    const def = getComponentDef(comp.type)
    if (!def) continue
    for (const pin of def.pins) {
      const k = uf.key(comp.uid, pin.id)
      allKeys.push(k)
      uf.find(k)
    }
  }

  for (const wire of wires) {
    const a = uf.key(wire.fromUid, wire.fromPin)
    const b = uf.key(wire.toUid, wire.toPin)
    uf.union(a, b)
  }

    /** Boutons : court-circuit interne pin1 ↔ pin2 selon l'état */
  for (const comp of components) {
    if (comp.type === "BUTTON" && comp.state === "pressed") {
      uf.union(uf.key(comp.uid, "pin1"), uf.key(comp.uid, "pin2"))
    }
    if (comp.type === "BUTTON_LATCHING" && comp.state === "on") {
      uf.union(uf.key(comp.uid, "pin1"), uf.key(comp.uid, "pin2"))
    }
  }

  /** netId Ã¢â€ â€™ liste de clÃƒÂ©s pin */
  const nets = new Map()
  for (const k of allKeys) {
    const root = uf.find(k)
    if (!nets.has(root)) nets.set(root, [])
    nets.get(root).push(k)
  }

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

/**
 * Ãƒâ€°tat visuel d'une LED selon les signaux de ses pins.
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 */
export function getLedState(uid, pinSignals) {
  const anode = pinSignals.get(`${uid}:anode`)
  const cathode = pinSignals.get(`${uid}:cathode`)
  const on = anode === Signal.HIGH && cathode === Signal.LOW
  return { on, anode, cathode }
}

/**
 * Ã‰tat visuel d'une LED RGB Ã  cathode commune.
 * Un canal est actif lorsque common est LOW
 * et que le canal correspondant est HIGH.
 *
 * @param {string} uid
 * @param {Map<string, string>} pinSignals
 */
export function getRgbLedState(uid, pinSignals) {
  const common = pinSignals.get(`${uid}:common`)
  const r = pinSignals.get(`${uid}:R`)
  const g = pinSignals.get(`${uid}:G`)
  const b = pinSignals.get(`${uid}:B`)

  const commonIsLow = common === Signal.LOW

  return {
    r: commonIsLow && r === Signal.HIGH,
    g: commonIsLow && g === Signal.HIGH,
    b: commonIsLow && b === Signal.HIGH,
  }
}
