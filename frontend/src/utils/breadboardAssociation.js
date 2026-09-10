/**
 * breadboardAssociation.js — FT-C-BREAD-MULTI-001-C (CSA D1).
 *
 * PRIMITIVE CANONIQUE UNIQUE — « à quel breadboard appartient physiquement ce
 * composant ? ». Fonction pure (aucun état React, aucun DOM). Gouverne, via un
 * classement D1 unique :
 *   - placement / snap / preview / drop (`mode: "placement"`) ;
 *   - ownership mécanique d'un composant déjà posé (`mode: "ownership"`) ;
 *   - solidarité lors d'un MOVE_BREADBOARD (breadboardSolidarity.js).
 *
 * S'appuie EXCLUSIVEMENT sur les primitives physiques existantes :
 * `getComponentDef`, `resolveBreadboardInsertableContacts`,
 * `resolveComponentContactHoles`, `computeBreadboardPlacement`,
 * `countInsertableContacts`. Aucune bounding-box, aucune distance au centre,
 * aucun DOM, aucun z-index, aucune seconde géométrie de trous.
 *
 * INVARIANT (I-C1/I-C2) : `owner(component) ∈ { null, un breadboardId }` —
 * JAMAIS deux, même si des breadboards se chevauchent.
 *
 * CLASSEMENT D1 (§8), appliqué dans cet ordre :
 *   D1.1  full resolution  > partial
 *   D1.2  plus grand nombre de PhysicalContacts enfichables résolus
 *   D1.3  placement `valid: true` > placement invalide (collision) [mode placement]
 *   D1.4  distance de snap (dx²+dy²) la plus petite à la position candidate
 *   D1.5  dernier breadboard de `breadboards[]` (ordre de rendu -> « au-dessus »)
 *   D1.6  `breadboard.id` (fallback stable déterministe, cas pathologiques)
 *
 * AUCUN fallback vers `breadboards[0]` (I-C7).
 */
import { getComponentDef } from '../config/componentDefinitions.js'
import { resolveComponentContactHoles } from './breadboardGeometry.js'
import {
  computeBreadboardPlacement,
  countInsertableContacts,
} from './breadboardPlacementAdapter.js'

function finitePosition(position) {
  return position && Number.isFinite(position.x) && Number.isFinite(position.y)
    ? { x: position.x, y: position.y }
    : { x: 0, y: 0 }
}

/** Évalue le composant contre UN breadboard candidat. */
function evaluateCandidate(breadboard, index, { def, componentType, position, otherComponents, mode }) {
  const totalInsertableContactCount = countInsertableContacts(def)

  if (mode === 'ownership') {
    // Ownership : position RÉELLE, aucun déplacement artificiel, aucune
    // collision — on compte les contacts enfichables qui résolvent un trou de
    // CE breadboard exactement là où le composant se trouve.
    const { results, allResolved } = resolveComponentContactHoles(breadboard, def.pins, position)
    const resolvedContactCount = results.filter((r) => r.resolved).length
    return {
      breadboard,
      breadboardId: breadboard.id,
      index,
      placement: null,
      placementActive: resolvedContactCount > 0,
      placementValid: undefined,
      resolvedContactCount,
      totalInsertableContactCount,
      fullyResolved: !!allResolved,
      snapDistSq: 0,
    }
  }

  // Placement : snap + collision via la primitive mono-breadboard EXISTANTE.
  const placement = computeBreadboardPlacement(breadboard, componentType, position, otherComponents)
  const holes = Array.isArray(placement.holes) ? placement.holes : []
  const resolvedContactCount = holes.filter((h) => h && h.column !== null && h.column !== undefined).length
  const fullyResolved = holes.length > 0 && holes.every((h) => h && h.column !== null && h.column !== undefined)
  const dx = (placement.position?.x ?? position.x) - position.x
  const dy = (placement.position?.y ?? position.y) - position.y
  return {
    breadboard,
    breadboardId: breadboard.id,
    index,
    placement,
    placementActive: !!placement.breadboardActive,
    placementValid: placement.valid === true,
    resolvedContactCount,
    totalInsertableContactCount,
    fullyResolved,
    snapDistSq: dx * dx + dy * dy,
  }
}

/** Comparateur D1 : renvoie < 0 si `a` l'emporte sur `b`. */
function compareCandidates(a, b) {
  if (a.fullyResolved !== b.fullyResolved) return a.fullyResolved ? -1 : 1              // D1.1
  if (a.resolvedContactCount !== b.resolvedContactCount) return b.resolvedContactCount - a.resolvedContactCount // D1.2
  const av = a.placementValid === true
  const bv = b.placementValid === true
  if (av !== bv) return av ? -1 : 1                                                     // D1.3
  if (a.snapDistSq !== b.snapDistSq) return a.snapDistSq - b.snapDistSq                 // D1.4
  if (a.index !== b.index) return b.index - a.index                                     // D1.5
  return String(a.breadboardId) < String(b.breadboardId) ? -1 : 1                       // D1.6
}

const NO_ASSOCIATION = (totalInsertableContactCount, candidates) => ({
  breadboard: null,
  breadboardId: null,
  placement: null,
  resolvedContactCount: 0,
  totalInsertableContactCount,
  fullyResolved: false,
  candidates,
})

/**
 * @param {{
 *   breadboards: Array<{id:string, position:{x:number,y:number}}>,
 *   componentType: string,
 *   position: {x:number, y:number},
 *   otherComponents?: Array<object>,
 *   mode?: 'ownership' | 'placement',
 * }} args
 * @returns {{
 *   breadboard: object|null,
 *   breadboardId: string|null,
 *   placement: object|null,               // résultat computeBreadboardPlacement du gagnant (mode placement)
 *   resolvedContactCount: number,
 *   totalInsertableContactCount: number,
 *   fullyResolved: boolean,
 *   candidates: Array<object>,            // évaluations par breadboard (debug/test)
 * }}
 */
export function resolveComponentBreadboardAssociation({
  breadboards,
  componentType,
  position,
  otherComponents = [],
  mode = 'ownership',
}) {
  const def = getComponentDef(componentType)
  const totalInsertableContactCount = countInsertableContacts(def)

  const list = Array.isArray(breadboards) ? breadboards.filter((b) => b && b.position) : []
  if (!def || !Array.isArray(def.pins) || totalInsertableContactCount === 0 || list.length === 0) {
    return NO_ASSOCIATION(totalInsertableContactCount, [])
  }

  const pos = finitePosition(position)
  const ctx = { def, componentType, position: pos, otherComponents, mode }

  const candidates = list
    .map((breadboard, index) => evaluateCandidate(breadboard, index, ctx))
    .filter((c) => c.placementActive)

  if (candidates.length === 0) return NO_ASSOCIATION(totalInsertableContactCount, candidates)

  candidates.sort(compareCandidates)
  const winner = candidates[0]

  const hasAssociation =
    winner.resolvedContactCount >= 1 || (mode === 'placement' && winner.placementValid === true)
  if (!hasAssociation) return NO_ASSOCIATION(totalInsertableContactCount, candidates)

  return {
    breadboard: winner.breadboard,
    breadboardId: winner.breadboardId,
    placement: winner.placement,
    resolvedContactCount: winner.resolvedContactCount,
    totalInsertableContactCount: winner.totalInsertableContactCount,
    fullyResolved: winner.fullyResolved,
    candidates,
  }
}

/**
 * Primitive de PLACEMENT multi-breadboard : teste chaque candidat via
 * `computeBreadboardPlacement` (inchangée), applique D1, retourne UN seul
 * résultat gagnant — même contrat que `computeBreadboardPlacement` + `breadboardId`.
 * Garantit que preview et drop choisissent le MÊME breadboard (I-C5).
 */
export function computeMultiBreadboardPlacement(breadboards, componentType, candidatePosition, otherComponents) {
  const def = getComponentDef(componentType)
  const compatible = !!def && Array.isArray(def.pins) && countInsertableContacts(def) > 0
  const fallbackPosition = finitePosition(candidatePosition)
  const inactive = {
    breadboardId: null,
    breadboard: null,
    breadboardActive: false,
    compatible,
    valid: false,
    position: fallbackPosition,
    holes: [],
  }

  const list = Array.isArray(breadboards) ? breadboards.filter((b) => b && b.position) : []
  if (!compatible || list.length === 0) return inactive

  const assoc = resolveComponentBreadboardAssociation({
    breadboards: list,
    componentType,
    position: candidatePosition,
    otherComponents,
    mode: 'placement',
  })
  if (!assoc.breadboard || !assoc.placement) return inactive

  return {
    breadboardId: assoc.breadboardId,
    breadboard: assoc.breadboard,
    breadboardActive: assoc.placement.breadboardActive,
    compatible: assoc.placement.compatible,
    valid: assoc.placement.valid,
    position: assoc.placement.position,
    holes: assoc.placement.holes,
  }
}
