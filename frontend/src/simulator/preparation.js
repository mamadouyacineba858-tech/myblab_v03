import { getCanonicalEntry, resolveInternalConnections } from "./canonicalRegistry.js"

/**
 * Union-Find pour regrouper les pins connectées par fils.
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
    const def = getCanonicalEntry(comp.type)
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

  /** A3-SW0 : topologie interne générique (déclarative, cf. canonicalRegistry) */
  for (const comp of components) {
    const def = getCanonicalEntry(comp.type)
    if (!def) continue
    for (const [pinA, pinB] of resolveInternalConnections(def, comp)) {
      uf.union(uf.key(comp.uid, pinA), uf.key(comp.uid, pinB))
    }
  }

  /** netId → liste de clés pin */
  const nets = new Map()
  for (const k of allKeys) {
    const root = uf.find(k)
    if (!nets.has(root)) nets.set(root, [])
    nets.get(root).push(k)
  }

  return { uf, nets, allKeys }
}