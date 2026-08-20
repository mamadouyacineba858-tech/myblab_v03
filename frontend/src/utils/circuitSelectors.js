import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "./geometry.js"
import { buildWirePath } from "../wires/wirePath.js"

/** @param {string} uid @param {string} pinId */
export function pinRefKey(uid, pinId) {
  if (!uid || !pinId) return ""
  return `${uid}:${pinId}`
}

/**
 * Ensemble des pins connectées (uid:pinId).
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @returns {Set<string>}
 */
export function buildConnectedPinsSet(wires) {
  const set = new Set()
  if (!Array.isArray(wires)) return set

  for (const wire of wires) {
    if (!wire) continue
    const a = pinRefKey(wire.fromUid, wire.fromPin)
    const b = pinRefKey(wire.toUid, wire.toPin)
    if (a) set.add(a)
    if (b) set.add(b)
  }
  return set
}

/**
 * Chemins SVG des fils — positions calculées au render, jamais stockées dans le modèle.
 *
 * Géométrie pure (MB-VIS-004) : ne calcule plus de couleur/état visuel.
 * Avant ce ticket, cette fonction pré-calculait une couleur via
 * getWireColor({highlight: wire.id === selectedWireId}), redondante avec le
 * calcul de sélection (isSelected, Set de multi-sélection) déjà effectué
 * indépendamment par WiresLayer.jsx — deux implémentations parallèles du
 * même concept. Consolidation retenue (Blueprint MB-VIS-004, section E ;
 * condition de l'arbitrage CSA Q2, 2026-08-20 : "ne doit pas introduire une
 * nouvelle duplication") : tout le calcul visuel (sélection, hover, état
 * logique) est désormais centralisé dans WiresLayer.jsx, seul endroit ayant
 * accès aux trois informations à la fois.
 *
 * @param {Array<{ uid, type, x, y }>} components
 * @param {Array<{ id, fromUid, fromPin, toUid, toPin }>} wires
 * @returns {Array<{ id: string, d: string }>}
 */
export function buildWirePaths(components, wires) {
  if (!Array.isArray(components) || !Array.isArray(wires)) return []

  const byUid = new Map(
    components.filter((c) => c?.uid).map((c) => [c.uid, c])
  )

  const paths = []

  for (const wire of wires) {
    if (!wire?.id || !wire.fromUid || !wire.toUid) continue

    const fromComp = byUid.get(wire.fromUid)
    const toComp = byUid.get(wire.toUid)
    if (!fromComp || !toComp) continue

    const fromDef = getComponentDef(fromComp.type)
    const toDef = getComponentDef(toComp.type)
    if (!fromDef || !toDef) continue

    const fromPinDef = fromDef.pins?.find((p) => p.id === wire.fromPin)
    const toPinDef = toDef.pins?.find((p) => p.id === wire.toPin)
    if (!fromPinDef || !toPinDef) continue

    const fromPos = getPinPosition(fromComp, fromPinDef)
    const toPos = getPinPosition(toComp, toPinDef)
    if (!fromPos || !toPos) continue

    const d = buildWirePath(fromPos, toPos)
    if (!d) continue

    paths.push({ id: wire.id, d })
  }

  return paths
}

/**
 * Vérifie si un fil identique existe déjà (sans tenir compte de l'orientation).
 */
export function wireAlreadyExists(wires, fromUid, fromPin, toUid, toPin) {
  if (!Array.isArray(wires)) return false
  return wires.some(
    (w) =>
      w &&
      ((w.fromUid === fromUid &&
        w.fromPin === fromPin &&
        w.toUid === toUid &&
        w.toPin === toPin) ||
        (w.fromUid === toUid &&
          w.fromPin === toPin &&
          w.toUid === fromUid &&
          w.toPin === fromPin))
  )
}