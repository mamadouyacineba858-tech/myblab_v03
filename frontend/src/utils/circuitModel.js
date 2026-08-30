import { getComponentDef } from "../config/componentDefinitions.js"

/**
 * Normalise un composant pour le rendu (évite undefined / NaN).
 *
 * [MB-BREADBOARD-003, correction disclosed — voir Delivery Report
 * MB-BREADBOARD-003 §Déviations] Avant ce ticket, cette fonction appliquait
 * inconditionnellement `snapToGrid()` (GRID_SIZE=20) à x/y — redondant mais
 * invisible jusqu'ici, car TOUT appelant qui construit une position destinée
 * à être persistée l'aligne déjà explicitement lui-même sur GRID_SIZE avant
 * d'atteindre ce point (`addComponent()` et le repli de drag "hors
 * breadboard" dans useCircuitState.js, `documentApi.updateComponentPositions()`
 * pour le canal legacy MoveCommand.js) — jamais un second alignement
 * nécessaire. MB-BREADBOARD-003 introduit le PREMIER cas où une position
 * PERSISTÉE est intentionnellement PAS un multiple de GRID_SIZE (alignée
 * sur BREADBOARD_PITCH=12 à la place, via computeBreadboardPlacement()) :
 * ce second snapToGrid, appliqué par `applyDocument()`/`safeComponents`/
 * `importCircuit()` (les 3 points d'appel de normalizeComponent) sur TOUTE
 * position quel que soit son origine, écrasait silencieusement l'alignement
 * breadboard au tour de rendu suivant (ex. x=58 -> 60) — cassant à la fois
 * l'affichage ET la connectivité électrique dérivée de la position
 * (holeAt()), et empêchant AC-23 (export/import round-trip) de préserver
 * une position breadboard exportée. Découvert via
 * BreadboardInsertionMutationChannel.integration.test.jsx (TEST 1), qui
 * exerce le cycle complet CommandBus -> applyDocument -> rendu, contrairement
 * aux tests unitaires de Handler qui n'observent que le Document Core.
 * Retiré ici : la responsabilité de l'alignement reste entièrement chez
 * l'appelant qui décide de la position (déjà le cas partout ailleurs) ;
 * cette fonction ne fait plus que garantir un nombre fini (défaut 0),
 * jamais un alignement de grille qu'elle n'est pas en position de choisir.
 * Non-régression vérifiée : aucun appelant existant ne dépendait de ce
 * second snap (toutes les positions qui l'atteignaient étaient déjà des
 * multiples de GRID_SIZE par construction — voir Delivery Report).
 *
 * [MB-VIS-COMP-004] La coercion de `state` suivait jusqu'ici deux
 * branchements littéraux sur le TYPE concret (`component.type === "BUTTON"`
 * / `"BUTTON_LATCHING"`). Elle suit désormais le contrat déclaratif déjà
 * introduit par MB-VIS-COMP-002/003 (`componentDefinitions.js` :
 * `interaction.type`, `initialState`) via `_normalizeInteractionState()`
 * ci-dessous. `getComponentDef()` est la même source de vérité déjà
 * consultée par `createComponent()` (componentDefinitions.js) et par les
 * gardes de `useCircuitState.js` (setButtonState/toggleLatchingButton,
 * MB-VIS-COMP-003) — un seul et même contrat, jamais deux mécanismes
 * concurrents pouvant diverger. Un futur type déclarant `interaction.type`
 * ("momentary" ou "latching") est normalisé ici SANS modification de cette
 * fonction. Comportement observable inchangé pour BUTTON/BUTTON_LATCHING et
 * pour tout composant sans capacité d'interaction (RESISTOR/LED/CAPACITOR/…
 * continuent de ne recevoir aucune clé `state` — voir rapport §9/§7 TEST 9).
 *
 * @param {object | null | undefined} component
 * @returns {object | null}
 */
export function normalizeComponent(component) {
  if (!component?.uid || !component?.type) return null

  return {
    uid: String(component.uid),
    type: String(component.type),
    x: Number.isFinite(component.x) ? component.x : 0,
    y: Number.isFinite(component.y) ? component.y : 0,
    pins: Array.isArray(component.pins) ? [...component.pins] : [],
    ..._normalizeInteractionState(component),
  }
}

/**
 * [MB-VIS-COMP-004] Dérive la clé `state` (si applicable) du contrat
 * déclaratif `interaction`/`initialState` de la définition du composant
 * (componentDefinitions.js), au lieu d'un branchement sur le type concret.
 *
 * - Aucune capacité `interaction` déclarée (RESISTOR, LED, CAPACITOR, tout
 *   type inconnu de componentDefinitions.js) → aucune clé `state` ajoutée
 *   (identique au comportement préexistant pour "tout type autre que
 *   BUTTON/BUTTON_LATCHING").
 * - `interaction.type === "momentary"` → vocabulaire {"pressed","released"} ;
 *   un état déjà valide ("pressed") est préservé tel quel (TEST 7) ; sinon
 *   la valeur par défaut est `initialState` déclaré (secours "released" si
 *   `initialState` est absent — ne devrait pas se produire en pratique,
 *   `componentDefinitions.js` déclarant toujours les deux ensemble).
 * - `interaction.type === "latching"` → même principe, vocabulaire
 *   {"on","off"}, secours "off".
 *
 * @param {object} component
 * @returns {{state?: string}}
 */
function _normalizeInteractionState(component) {
  const def = getComponentDef(component.type)
  const interactionType = def?.interaction?.type
  const initialState = def?.initialState

  if (interactionType === "momentary") {
    return { state: component.state === "pressed" ? "pressed" : (initialState ?? "released") }
  }
  if (interactionType === "latching") {
    return { state: component.state === "on" ? "on" : (initialState ?? "off") }
  }
  return {}
}

/**
 * Normalise le tableau de waypoints d'un wire (MB-VIS-005, ADR-008 amendé).
 *
 * Préserve intégralement chaque point {x, y} numérique et fini, dans son
 * ordre persistant (AC-13, docs/pmo/tickets/MB-VIS-005.md §5.1/§9.13/
 * G-11). Un waypoint malformé (coordonnée manquante, non numérique, NaN,
 * Infinity) est écarté défensivement ici — en pratique il ne devrait
 * jamais atteindre ce point : la Validation CF3 pré-exécution (STR-006,
 * ADR-010) rejette toute mutation UPDATE_WIRE_WAYPOINTS malformée avant
 * qu'elle n'atteigne le Document. Absence de `waypoints` normalisée en
 * tableau vide (rétrocompatibilité stricte, AC-08).
 *
 * @param {Array | undefined} waypoints
 * @returns {Array<{x: number, y: number}>}
 */
export function normalizeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) return []
  return waypoints
    .filter((wp) => wp && Number.isFinite(wp.x) && Number.isFinite(wp.y))
    .map((wp) => ({ x: wp.x, y: wp.y }))
}

/**
 * @param {object} wire
 * @returns {object | null}
 */
export function normalizeWire(wire) {
  if (!wire?.id || !wire.fromUid || !wire.fromPin || !wire.toUid || !wire.toPin) {
    return null
  }
  return {
    id: String(wire.id),
    fromUid: String(wire.fromUid),
    fromPin: String(wire.fromPin),
    toUid: String(wire.toUid),
    toPin: String(wire.toPin),
    // MB-VIS-005 : les trois chemins d'appel de normalizeWire() (safeWires,
    // documentApi.applyDocument, import de document — cf.
    // frontend/src/hooks/useCircuitState.js) partagent cette même fonction ;
    // les corriger tous les trois revient donc à corriger ce seul point,
    // exactement comme le prévoit la dépendance obligatoire du ticket.
    waypoints: normalizeWaypoints(wire.waypoints),
  }
}
