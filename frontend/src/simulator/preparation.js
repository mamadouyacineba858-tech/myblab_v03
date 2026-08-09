import { getComponentDef } from "../config/componentDefinitions.js"

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
 * MB-SIM-006 : Préparation (ADR-004).
 * Transforme le Document (components/wires) en une représentation interne
 * exploitable par la Résolution : structure de nets (groupes de pins
 * électriquement connectées).
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @returns {{ uf: UnionFind, nets: Map<string, string[]>, allKeys: string[] }}
 */
export function prepareCircuit(components, wires) {
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

  /** netId Ã¢â€ â€™ liste de clÃƒÂ©s pin */
  const nets = new Map()
  for (const k of allKeys) {
    const root = uf.find(k)
    if (!nets.has(root)) nets.set(root, [])
    nets.get(root).push(k)
  }

  return { uf, nets, allKeys }
}