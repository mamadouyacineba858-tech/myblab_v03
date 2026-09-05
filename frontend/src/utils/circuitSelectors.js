import { getComponentDef } from "../config/componentDefinitions.js"
import { getPinPosition } from "./geometry.js"
import { getPinPresentationPosition } from "./pinPresentationGeometry.js"
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
 * Les coordonnées électriques restent celles de getPinPosition(); la
 * présentation peut toutefois projeter le point d'arrivée d'un composant
 * vers sa géométrie physique via getPinPresentationPosition().
 *
 * [MB-VIS-CANVAS-052] `focusInfo` optionnel — `{ uid, scale }` du composant
 * actuellement focalisé (au plus un). Jamais une seconde géométrie
 * électrique : uniquement transmis à `getPinPresentationPosition()` pour
 * que l'extrémité de fil dessinée corresponde exactement à la position
 * visuelle du pin une fois le composant agrandi localement (même formule
 * que le `transform: scale()` CSS posé par CircuitComponent.jsx — voir
 * pinPresentationGeometry.js). Omis (ou `null`), comportement strictement
 * inchangé — tout appelant existant à 2 arguments n'est pas affecté.
 *
 * @param {Array<{ uid, type, x, y }>} components
 * @param {Array<{ id, fromUid, fromPin, toUid, toPin, waypoints? }>} wires waypoints (MB-VIS-005, ADR-008 amendé) : points intermédiaires persistants optionnels, consommés dans leur ordre par buildWirePath().
 * @param {{ uid: string, scale: number } | null} [focusInfo]
 * @returns {Array<{ id: string, d: string }>}
 */
export function buildWirePaths(components, wires, focusInfo) {
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

    // Electrical geometry remains canonical and untouched.
    // The wire path is presentation geometry, so it may use a visual
    // projection such as the LED's physical lead endpoints.
    const fromElectricalPos = getPinPosition(fromComp, fromPinDef)
    const toElectricalPos = getPinPosition(toComp, toPinDef)
    const fromScale = focusInfo && focusInfo.uid === fromComp.uid ? focusInfo.scale : 1
    const toScale = focusInfo && focusInfo.uid === toComp.uid ? focusInfo.scale : 1
    const fromPos = getPinPresentationPosition(fromComp, fromPinDef, { scale: fromScale }) ?? fromElectricalPos
    const toPos = getPinPresentationPosition(toComp, toPinDef, { scale: toScale }) ?? toElectricalPos
    if (!fromPos || !toPos) continue

    const d = buildWirePath(fromPos, toPos, wire.waypoints)
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
