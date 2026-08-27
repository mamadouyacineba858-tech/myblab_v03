/**
 * Dérivation de la connectivité électrique introduite par un breadboard.
 *
 * MB-BREADBOARD-012 étend la source de vérité existante pour prendre en
 * compte les wires dont une ou deux extrémités sont des trous physiques.
 * `holeAt()` reste l'unique oracle géométrique ; aucune topologie n'est
 * stockée dans le breadboard.
 */
import { getComponentDef } from '../config/componentDefinitions.js'
import { holeAt } from './breadboardGeometry.js'
import { BREADBOARD_PITCH } from './breadboardGeometry.js'
import { parseBreadboardHoleEndpoint } from './breadboardWireEndpoint.js'

function resolveOccupiedHoles(breadboard, components) {
  const occupied = []
  for (const component of components || []) {
    if (!component || !component.position) continue
    const def = getComponentDef(component.type)
    if (!def || !Array.isArray(def.pins)) continue

    for (const pin of def.pins) {
      const x = component.position.x + pin.dx
      const y = component.position.y + pin.dy
      const hole = holeAt(breadboard, x, y)
      if (!hole) continue
      occupied.push({ groupKey: hole.groupKey, componentId: component.id, pinId: pin.id })
    }
  }
  return occupied
}

function resolveWireHole(breadboard, uid, pinId) {
  const parsed = parseBreadboardHoleEndpoint(uid, pinId)
  if (!parsed || !breadboard || parsed.breadboardId !== breadboard.id) return null
  const x = breadboard.position.x + parsed.column * BREADBOARD_PITCH
  const y = breadboard.position.y + parsed.row * BREADBOARD_PITCH
  const hole = holeAt(breadboard, x, y)
  return hole ? { ...parsed, groupKey: hole.groupKey } : null
}

/**
 * Dérive les arêtes Core nécessaires pour que les pins connectés au même
 * breadboard group restent électriquement continus, y compris lorsqu'un
 * groupe est rejoint par un wire explicite terminé sur un trou.
 */
export function deriveBreadboardVirtualWires(document) {
  const breadboard = document && document.breadboard
  if (!breadboard) return []

  const occupied = resolveOccupiedHoles(breadboard, document.components)
  const byGroup = new Map()

  const addMember = (groupKey, componentId, pinId) => {
    if (!groupKey || !componentId || !pinId) return
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, [])
    const entries = byGroup.get(groupKey)
    if (!entries.some((entry) => entry.componentId === componentId && entry.pinId === pinId)) {
      entries.push({ groupKey, componentId, pinId })
    }
  }

  for (const entry of occupied) {
    addMember(entry.groupKey, entry.componentId, entry.pinId)
  }

  // Hole-to-hole wires merge their two electrical groups. A pin-to-hole wire
  // adds the pin to the hole's group. Pin-to-pin wires remain explicit and
  // are therefore intentionally ignored here.
  const parent = new Map()
  const find = (key) => {
    if (!parent.has(key)) parent.set(key, key)
    const current = parent.get(key)
    if (current !== key) parent.set(key, find(current))
    return parent.get(key)
  }
  const union = (a, b) => {
    if (!a || !b) return
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const wire of document.wires || []) {
    const holeA = resolveWireHole(breadboard, wire?.pinA?.componentId, wire?.pinA?.pinId)
    const holeB = resolveWireHole(breadboard, wire?.pinB?.componentId, wire?.pinB?.pinId)

    if (holeA) find(holeA.groupKey)
    if (holeB) find(holeB.groupKey)

    if (holeA && holeB) {
      union(holeA.groupKey, holeB.groupKey)
      continue
    }

    if (holeA && wire?.pinB?.componentId && wire?.pinB?.pinId) {
      addMember(holeA.groupKey, wire.pinB.componentId, wire.pinB.pinId)
    }
    if (holeB && wire?.pinA?.componentId && wire?.pinA?.pinId) {
      addMember(holeB.groupKey, wire.pinA.componentId, wire.pinA.pinId)
    }
  }

  // Collapse merged groups before emitting the star topology.
  const merged = new Map()
  for (const [groupKey, entries] of byGroup.entries()) {
    const root = find(groupKey)
    if (!merged.has(root)) merged.set(root, [])
    for (const entry of entries) {
      if (!merged.get(root).some((e) => e.componentId === entry.componentId && e.pinId === entry.pinId)) {
        merged.get(root).push(entry)
      }
    }
  }

  const virtualWires = []
  for (const entries of merged.values()) {
    if (entries.length < 2) continue
    const [reference, ...rest] = entries
    for (const entry of rest) {
      if (reference.componentId === entry.componentId && reference.pinId === entry.pinId) continue
      virtualWires.push({
        pinA: { componentId: reference.componentId, pinId: reference.pinId },
        pinB: { componentId: entry.componentId, pinId: entry.pinId },
      })
    }
  }
  return virtualWires
}

export function toBridgeWire(coreWire) {
  return {
    fromUid: coreWire.pinA.componentId,
    fromPin: coreWire.pinA.pinId,
    toUid: coreWire.pinB.componentId,
    toPin: coreWire.pinB.pinId,
  }
}

export function deriveBreadboardVirtualWiresBridge(document) {
  return deriveBreadboardVirtualWires(document).map(toBridgeWire)
}
