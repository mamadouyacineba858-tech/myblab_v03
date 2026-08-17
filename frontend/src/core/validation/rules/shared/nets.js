/**
 * Construction de réseaux électriques (nets) à partir des wires du
 * Document, par composantes connexes (Union-Find). Aucun état persistant :
 * reconstruit à chaque appel de règle, à partir des wires uniquement
 * (conforme au contrat CF4 — ELE-007).
 */

class UnionFind {
  constructor() {
    this._parent = new Map()
  }

  find(x) {
    if (!this._parent.has(x)) this._parent.set(x, x)
    let root = x
    while (this._parent.get(root) !== root) root = this._parent.get(root)
    let cur = x
    while (this._parent.get(cur) !== root) {
      const next = this._parent.get(cur)
      this._parent.set(cur, root)
      cur = next
    }
    return root
  }

  union(a, b) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this._parent.set(ra, rb)
  }
}

const SEP = ' '
const keyOf = (endpoint) => `${endpoint.componentId}${SEP}${endpoint.pinId}`

/**
 * Regroupe les extrémités de wires (componentId, pinId) en réseaux
 * électriques connectés. Les wires dont une extrémité ne référence pas de
 * componentId sont ignorés ici (STR-003/STR-005 couvrent déjà ce cas).
 *
 * @param {Array} wires - wires effectifs (forme Core : {pinA, pinB})
 * @returns {Array<Array<{componentId, pinId}>>} liste de réseaux (chacun
 *   une liste d'extrémités connectées entre elles par au moins un wire)
 */
export function buildNets(wires) {
  const uf = new UnionFind()
  const nodeInfo = new Map()

  for (const wire of wires) {
    if (!wire || !wire.pinA || !wire.pinB) continue
    if (!wire.pinA.componentId || !wire.pinB.componentId) continue
    const keyA = keyOf(wire.pinA)
    const keyB = keyOf(wire.pinB)
    nodeInfo.set(keyA, { componentId: wire.pinA.componentId, pinId: wire.pinA.pinId })
    nodeInfo.set(keyB, { componentId: wire.pinB.componentId, pinId: wire.pinB.pinId })
    uf.union(keyA, keyB)
  }

  const groups = new Map()
  for (const key of nodeInfo.keys()) {
    const root = uf.find(key)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(nodeInfo.get(key))
  }
  return [...groups.values()]
}
