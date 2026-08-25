/**
 * breadboardPlacementAdapter.js — MB-BREADBOARD-003 (Blueprint §2).
 *
 * Fonction pure, même famille que breadboardGeometry.js/breadboardConnectivity.js :
 * aucun état React, aucune mesure DOM, aucune logique de connectivité
 * électrique propre (LOCK-02 — l'union électrique par bus reste l'unique
 * responsabilité de breadboardConnectivity.js, non modifié, non appelé ici).
 *
 * Calcule où un composant à exactement 2 pins atterrirait s'il était
 * repositionné sur un breadboard, en réutilisant strictement holeAt()
 * (breadboardGeometry.js, non modifié, non touché — LOCK-02/§7 du
 * Blueprint) comme SEUL arbitre de la validité d'un trou : ce module ne
 * réimplémente jamais la tolérance d'insertion ni l'arrondi (constante
 * volontairement privée à breadboardGeometry.js), il se contente
 * d'interroger holeAt() point par point, exactement comme Breadboard.jsx
 * (Presentation) le fait déjà pour la mise en évidence "occupé".
 *
 * Consommé par useCircuitState.js (Presentation) pendant le drag d'un
 * composant DÉJÀ PRÉSENT sur le canevas (Blueprint §3/§0 Q2). Le dépôt
 * initial depuis la barre latérale (Drag & Drop HTML5, Sidebar.jsx/
 * SimulationCanvas.jsx) n'est pas couvert par ce module en V1 — non-goal
 * disclosed (Blueprint §10).
 *
 * [Correction algorithmique, disclosed — voir Delivery Report MB-BREADBOARD-003
 * §Déviations] Le Blueprint §2 décrivait un algorithme en 2 étapes : aligner
 * pins[0] EXACTEMENT sur le trou le plus proche (résidu 0 modulo
 * BREADBOARD_PITCH), puis vérifier les pins restantes. Cet algorithme
 * suppose implicitement que l'écart entre pins[0] et chaque autre pin est un
 * multiple exact de BREADBOARD_PITCH — vrai pour RESISTOR/DIODE/LDR/
 * THERMISTOR/DC_MOTOR après la correction dx du §1 (écart 84, multiple
 * exact de 12) et pour BUTTON/BUTTON_LATCHING (écart 60) — mais FAUX pour
 * LED (écart dx 80 : 80 mod 12 = 8, distance 4 au multiple le plus proche,
 * hors tolérance d'insertion de breadboardGeometry.js) et pour POWER (écart
 * dy 40 : distance 4, même problème sur l'axe vertical). Avec l'algorithme
 * littéral du Blueprint, LED ne pourrait ATTEINDRE valid:true à AUCUNE
 * position — ce qui aurait rendu impossible le scénario de preuve Canvas
 * obligatoire du ticket (§9 : "5V→Rail+→Résistance→LED→Rail−→GND"), qui
 * exige explicitement une insertion LED réussie sur breadboard.
 * Vérifié numériquement que LED EST géométriquement compatible (existe une
 * position, ex. composant.x ≡ 2 (mod 12), où les deux pins résolvent un trou
 * valide) — seul l'algorithme "pins[0] à résidu exactement 0" ne la trouvait
 * pas. La fonction ci-dessous généralise donc la recherche : plutôt que de
 * fixer arbitrairement le résidu de pins[0] à 0, elle explore une fenêtre de
 * positions entières autour de candidatePosition et retient, via holeAt()
 * comme unique oracle, la position valide la plus proche — un sur-ensemble
 * strict de l'algorithme d'origine (même résultat pour tous les types déjà
 * conformes à résidu 0, résultat corrigé pour LED/POWER). Le contrat de la
 * fonction (signature, forme du retour) reste strictement celui du
 * Blueprint §2 — seule la recherche interne est plus générale.
 */
import { getComponentDef } from "../config/componentDefinitions.js"
import {
  BREADBOARD_PITCH,
  STANDARD_V1_LAYOUT,
  STANDARD_V1_TOTAL_ROWS,
  holeAt,
} from "./breadboardGeometry.js"

/**
 * `candidatePosition` tombe-t-elle dans le rectangle couvert par la grille
 * de trous du breadboard (mêmes bornes que Breadboard.jsx : colonnes
 * [0, columns-1], rangées [0, STANDARD_V1_TOTAL_ROWS-1], en unités de pas) ?
 * Vérifie uniquement l'empreinte globale — holeAt() reste la seule source
 * de vérité pour la validité d'un trou précis (rainure/interstices compris).
 */
function isWithinFootprint(breadboard, position) {
  if (!breadboard || !breadboard.position || !position) return false
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return false
  const relX = position.x - breadboard.position.x
  const relY = position.y - breadboard.position.y
  const maxX = (STANDARD_V1_LAYOUT.columns - 1) * BREADBOARD_PITCH
  const maxY = (STANDARD_V1_TOTAL_ROWS - 1) * BREADBOARD_PITCH
  return relX >= 0 && relX <= maxX && relY >= 0 && relY <= maxY
}

/**
 * Trous occupés par les pins d'AUTRES composants (LOCK-12 : un trou = une
 * seule patte). Résolution géométrique point-à-point via holeAt(), même
 * technique que resolveOccupiedHoles() (breadboardConnectivity.js) mais
 * gardée locale à ce module : il s'agit ici d'occupation PHYSIQUE pour la
 * collision de placement, pas de l'union électrique par bus/groupKey que
 * dérive breadboardConnectivity.js (deux concepts distincts, cf. Blueprint
 * §4 — un même bus/groupe peut légitimement contenir plusieurs trous
 * occupés par des composants différents, ce n'est PAS une collision).
 *
 * @param {Array<{uid:string,type:string,x:number,y:number}>} components
 */
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

/**
 * Tente de résoudre TOUTES les pins de `pins` à la position `position`
 * donnée, via holeAt() (seul oracle). Retourne le tableau de trous
 * (aligné sur l'ordre de `pins`) si TOUTES résolvent, sinon `null`.
 */
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
 * Explore une fenêtre de positions entières du composant autour de
 * `candidatePosition` (rayon BREADBOARD_PITCH dans chaque axe — largement
 * suffisant pour couvrir au moins une période complète de résidus valides,
 * puisque la faisabilité géométrique d'un type 2-pins est périodique de
 * période BREADBOARD_PITCH dans chaque axe) et retient, parmi les positions
 * où TOUTES les pins résolvent un trou valide, celle la plus proche de
 * `candidatePosition` (distance euclidienne au carré). Retourne `null` si
 * aucune position de la fenêtre ne satisfait toutes les pins.
 */
function findNearestFullyResolvedPosition(breadboard, pins, candidatePosition) {
  const anchorX = Math.round(candidatePosition.x)
  const anchorY = Math.round(candidatePosition.y)

  let best = null
  let bestDistance = Infinity
  for (let ox = -BREADBOARD_PITCH; ox <= BREADBOARD_PITCH; ox++) {
    for (let oy = -BREADBOARD_PITCH; oy <= BREADBOARD_PITCH; oy++) {
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

/**
 * Repli d'affichage lorsqu'aucune position de la fenêtre de recherche ne
 * résout toutes les pins (ex. candidatePosition dans la rainure centrale) :
 * aligne pins[0] sur le trou le plus proche (même formule que holeAt()),
 * comme le décrivait le Blueprint §2, uniquement pour donner une position
 * "tentative" cohérente au feedback visuel (AC-09) — `valid` reste `false`
 * dans tous les cas où cette voie est empruntée (voir resolveAllHoles ci-
 * dessus, jamais appelée ici en garantie de validité).
 */
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

/**
 * @param {{id:string,position:{x:number,y:number}}|null} breadboard
 * @param {string} componentType
 * @param {{x:number,y:number}} candidatePosition
 * @param {Array<{uid:string,type:string,x:number,y:number}>} otherComponents
 * @returns {{
 *   breadboardActive: boolean,
 *   compatible: boolean,
 *   valid: boolean,
 *   position: {x:number,y:number},
 *   holes: Array<{pinId:string, column:number|null, row:number|null}>,
 * }}
 */
export function computeBreadboardPlacement(breadboard, componentType, candidatePosition, otherComponents) {
  const fallbackPosition =
    candidatePosition && Number.isFinite(candidatePosition.x) && Number.isFinite(candidatePosition.y)
      ? { x: candidatePosition.x, y: candidatePosition.y }
      : { x: 0, y: 0 }

  const def = getComponentDef(componentType)
  // "compatible" est un diagnostic purement dérivé du type (jamais codé en
  // dur — cf. Blueprint §2) : indépendant de la présence d'un breadboard ou
  // de l'empreinte, pour rester utilisable comme signal isolé.
  const compatible = !!def && Array.isArray(def.pins) && def.pins.length === 2

  const hasBreadboard = !!breadboard && !!breadboard.position
  const withinFootprint = hasBreadboard && isWithinFootprint(breadboard, candidatePosition)

  // Étape 1 (Blueprint §2) : pas de breadboard, OU type non 2-pins, OU hors
  // empreinte → repli intégral sur le comportement actuel (candidatePosition
  // inchangée ; le snap-to-grid GRID_SIZE reste appliqué par l'appelant,
  // non-régression stricte LOCK-13/AC-20).
  if (!hasBreadboard || !compatible || !withinFootprint) {
    return { breadboardActive: false, compatible, valid: false, position: fallbackPosition, holes: [] }
  }

  const found = findNearestFullyResolvedPosition(breadboard, def.pins, candidatePosition)
  const { position, holes } = found ?? bestEffortPinZeroSnap(breadboard, def.pins, candidatePosition)
  const allResolved = !!found

  // Étape 4 (Blueprint §2) : valid = toutes les pins résolvent un trou ET
  // aucun trou n'est déjà occupé par une pin d'un AUTRE composant (LOCK-12).
  const occupiedByOthers = resolveOccupiedHoleKeys(breadboard, otherComponents)
  const collides = holes.some((h) => h.column !== null && occupiedByOthers.has(`${h.column}:${h.row}`))

  // Étape 5 : la position alignée est retournée que `valid` soit vrai ou
  // faux — permet d'afficher où l'insertion *tenterait* d'atterrir (feedback
  // rouge inclus, AC-09).
  return {
    breadboardActive: true,
    compatible: true,
    valid: allResolved && !collides,
    position,
    holes,
  }
}
