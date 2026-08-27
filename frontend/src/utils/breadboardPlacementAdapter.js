/**
 * breadboardPlacementAdapter.js — MB-BREADBOARD-003 (Blueprint §2).
 *
 * Fonction pure, même famille que breadboardGeometry.js/breadboardConnectivity.js :
 * aucun état React, aucune mesure DOM, aucune logique de connectivité
 * électrique propre (LOCK-02 — l'union électrique par bus reste l'unique
 * responsabilité de breadboardConnectivity.js, non modifié, non appelé ici).
 *
 * Calcule où un composant atterrirait s'il était repositionné sur un breadboard,
 * en réutilisant strictement holeAt() comme SEUL arbitre de la validité d'un trou.
 *
 * MB-BREADBOARD-011 : la position candidate représente le point d'origine du
 * composant. Lors d'un dépôt depuis la Sidebar, cette origine peut être
 * décalée de plusieurs pixels par rapport au trou sous le pointeur. La
 * recherche couvre donc une fenêtre pratique de plusieurs pas, tout en
 * retenant toujours la position valide la plus proche. La validité physique
 * reste exclusivement déterminée par holeAt().
 */
import { getComponentDef } from "../config/componentDefinitions.js"
import {
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
  holeAt,
} from "./breadboardGeometry.js"

function isWithinFootprint(breadboard, position, pins) {
  if (!breadboard || !breadboard.position || !position) return false
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return false

  const maxX = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH
  const maxY = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH

  return (pins || []).some((pin) => {
    const relX = position.x + pin.dx - breadboard.position.x
    const relY = position.y + pin.dy - breadboard.position.y
    return relX >= 0 && relX <= maxX && relY >= 0 && relY <= maxY
  })
}

function resolveOccupiedHoleKeys(breadboard, components) {
  const occupied = new Set()
  for (const component of components || []) {
    if (!component || !Number.isFinite(component.x) || !Number.isFinite(component.y)) continue
    const def = getComponentDef(component.type)
    if (!def || !Array.isArray(def.pins)) continue
    for (const pin of def.pins) {
      const hole = holeAt(breadboard, component.x + pin.dx, component.y + pin.dy)
      if (hole) occupied.add(`${hole.column}:${hole.row}`)
    }
  }
  return occupied
}

function resolveAllHoles(breadboard, pins, position) {
  const holes = []
  for (const pin of pins) {
    const hole = holeAt(breadboard, position.x + pin.dx, position.y + pin.dy)
    if (!hole) return null
    holes.push({ pinId: pin.id, column: hole.column, row: hole.row })
  }
  return holes
}

/**
 * MB-BREADBOARD-011 : couvre quatre pas dans chaque direction. Cette marge
 * absorbe notamment le décalage historique du drop Sidebar (-40,-20) tout en
 * conservant la règle "position valide la plus proche". Chaque candidat
 * passe obligatoirement par holeAt() : aucun trou artificiel n'est créé.
 */
function findNearestFullyResolvedPosition(breadboard, pins, candidatePosition) {
  const anchorX = Math.round(candidatePosition.x)
  const anchorY = Math.round(candidatePosition.y)
  const SEARCH_RADIUS = BREADBOARD_PITCH * 4

  let best = null
  let bestDistance = Infinity
  for (let ox = -SEARCH_RADIUS; ox <= SEARCH_RADIUS; ox++) {
    for (let oy = -SEARCH_RADIUS; oy <= SEARCH_RADIUS; oy++) {
      const position = { x: anchorX + ox, y: anchorY + oy }
      const holes = resolveAllHoles(breadboard, pins, position)
      if (!holes) continue
      const dx = position.x - candidatePosition.x
      const dy = position.y - candidatePosition.y
      const distance = dx * dx + dy * dy
      if (distance < bestDistance) {
        bestDistance = distance
        best = { position, holes }
      }
    }
  }
  return best
}

function bestEffortPinZeroSnap(breadboard, pins, candidatePosition) {
  const [pin0] = pins
  const pin0Absolute = { x: candidatePosition.x + pin0.dx, y: candidatePosition.y + pin0.dy }
  const relX = pin0Absolute.x - breadboard.position.x
  const relY = pin0Absolute.y - breadboard.position.y
  const column0 = Math.round(relX / BREADBOARD_PITCH)
  const row0 = Math.round(relY / BREADBOARD_PITCH)
  const snappedPin0 = {
    x: breadboard.position.x + column0 * BREADBOARD_PITCH,
    y: breadboard.position.y + row0 * BREADBOARD_PITCH,
  }
  const position = { x: snappedPin0.x - pin0.dx, y: snappedPin0.y - pin0.dy }

  const holes = []
  for (const pin of pins) {
    const hole = holeAt(breadboard, position.x + pin.dx, position.y + pin.dy)
    holes.push(hole ? { pinId: pin.id, column: hole.column, row: hole.row } : { pinId: pin.id, column: null, row: null })
  }
  return { position, holes }
}

export function computeBreadboardPlacement(breadboard, componentType, candidatePosition, otherComponents) {
  const fallbackPosition =
    candidatePosition && Number.isFinite(candidatePosition.x) && Number.isFinite(candidatePosition.y)
      ? { x: candidatePosition.x, y: candidatePosition.y }
      : { x: 0, y: 0 }

  const def = getComponentDef(componentType)
  const compatible = !!def && Array.isArray(def.pins) && def.pins.length > 0

  const hasBreadboard = !!breadboard && !!breadboard.position
  const withinFootprint = hasBreadboard && isWithinFootprint(breadboard, candidatePosition, def?.pins)

  if (!hasBreadboard || !compatible || !withinFootprint) {
    return { breadboardActive: false, compatible, valid: false, position: fallbackPosition, holes: [] }
  }

  const found = findNearestFullyResolvedPosition(breadboard, def.pins, candidatePosition)
  const { position, holes } = found ?? bestEffortPinZeroSnap(breadboard, def.pins, candidatePosition)
  const allResolved = !!found

  const occupiedByOthers = resolveOccupiedHoleKeys(breadboard, otherComponents)
  const collides = holes.some((h) => h.column !== null && occupiedByOthers.has(`${h.column}:${h.row}`))

  return {
    breadboardActive: true,
    compatible: true,
    valid: allResolved && !collides,
    position,
    holes,
  }
}
