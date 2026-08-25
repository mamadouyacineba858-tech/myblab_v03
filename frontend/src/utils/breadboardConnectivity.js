/**
 * Dérivation de la connectivité électrique introduite par un breadboard
 * (MB-BREADBOARD-001/002, Blueprint §5).
 *
 * Fonction pure : ne lit que document.breadboard + document.components (et
 * componentDefinitions.js pour les décalages géométriques de pins déjà
 * utilisés par le canevas libre). N'écrit rien, ne persiste rien — la
 * connectivité est reconstruite à chaque appel (LOCK-07, AC-17), exactement
 * comme buildNets()/prepareCircuit() le font déjà pour les wires explicites
 * (contrat CF4 — ELE-007).
 *
 * Ce module ne modifie ni nets.js ni preparation.js : il produit des arêtes
 * virtuelles consommées en ADDITION des wires explicites par les deux points
 * d'appel existants (voir §5 de la Blueprint pour le détail du double
 * branchement).
 */
import { getComponentDef } from '../config/componentDefinitions.js'
import { holeAt } from './breadboardGeometry.js'

/**
 * @param {{ id: string, type: string, position: {x,y} }} document.components[i] (forme Core)
 * @returns {Array<{ groupKey: string, componentId: string, pinId: string }>}
 */
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

/**
 * Dérive les arêtes virtuelles introduites par le breadboard, en forme Core
 * (identique à document.wires) : { pinA: {componentId,pinId}, pinB: {...} }.
 *
 * Sans breadboard, ou sans au moins deux pins occupant le même groupe
 * électrique, retourne un tableau vide — comportement neutre garantissant
 * TB-14/TB-15 (Document/canevas libre sans breadboard strictement inchangé).
 *
 * @param {object} document - Document Core (breadboard, components)
 * @returns {Array<{ pinA: {componentId,pinId}, pinB: {componentId,pinId} }>}
 */
export function deriveBreadboardVirtualWires(document) {
  const breadboard = document && document.breadboard
  if (!breadboard) return []

  const occupied = resolveOccupiedHoles(breadboard, document.components)

  const byGroup = new Map()
  for (const entry of occupied) {
    if (!byGroup.has(entry.groupKey)) byGroup.set(entry.groupKey, [])
    byGroup.get(entry.groupKey).push(entry)
  }

  const virtualWires = []
  for (const entries of byGroup.values()) {
    if (entries.length < 2) continue
    // Topologie en étoile vers le premier pin du groupe : n-1 arêtes
    // suffisent à l'Union-Find pour connecter tout le groupe (pas de O(n²)).
    const [reference, ...rest] = entries
    for (const entry of rest) {
      virtualWires.push({
        pinA: { componentId: reference.componentId, pinId: reference.pinId },
        pinB: { componentId: entry.componentId, pinId: entry.pinId },
      })
    }
  }
  return virtualWires
}

/**
 * Convertit une arête virtuelle en forme Core vers la forme bridge attendue
 * par prepareCircuit() (simulator/preparation.js) : { fromUid, fromPin,
 * toUid, toPin }. Aucune duplication de logique : réutilisée aux deux
 * points d'appel (validation ET simulation, Blueprint §5/§1).
 *
 * @param {{ pinA: {componentId,pinId}, pinB: {componentId,pinId} }} coreWire
 * @returns {{ fromUid: string, fromPin: string, toUid: string, toPin: string }}
 */
export function toBridgeWire(coreWire) {
  return {
    fromUid: coreWire.pinA.componentId,
    fromPin: coreWire.pinA.pinId,
    toUid: coreWire.pinB.componentId,
    toPin: coreWire.pinB.pinId,
  }
}

/**
 * Dérive directement les arêtes virtuelles en forme bridge, pour les points
 * d'appel simulateur qui ne manipulent que cette forme (engine.js,
 * simulationRuntimeIntegration.js).
 *
 * @param {object} document - Document Core (breadboard, components)
 * @returns {Array<{ fromUid, fromPin, toUid, toPin }>}
 */
export function deriveBreadboardVirtualWiresBridge(document) {
  return deriveBreadboardVirtualWires(document).map(toBridgeWire)
}
