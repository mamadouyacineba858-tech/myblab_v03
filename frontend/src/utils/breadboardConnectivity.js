/**
 * Dérivation de la connectivité électrique introduite par les breadboards.
 *
 * MB-BREADBOARD-012 : les wires dont une ou deux extrémités sont des trous
 * physiques sont résolus ici. `holeAt()` reste l'unique oracle géométrique ;
 * aucune topologie n'est stockée dans un breadboard.
 *
 * FT-C-BREAD-MULTI-001-B — MULTI-BREADBOARD :
 *  - la source de vérité est `document.breadboards[]` (canonique) ;
 *    `normalizeDocumentBreadboards` absorbe indifféremment l'ancienne forme
 *    `{ breadboard }` à la frontière, JAMAIS de fallback électrique vers
 *    `breadboards[0]` ;
 *  - chaque breadboard a ses PROPRES groupes électriques : toute clé de
 *    groupe passe par `makeBreadboardGroupKey(breadboard.id, localGroupKey)`
 *    (collision-safe). `A`+"rail+" et `B`+"rail+" sont deux réseaux distincts ;
 *  - une extrémité de wire trou est résolue contre EXACTEMENT le breadboard
 *    de son `breadboardId` (Map id -> breadboard, O(1)) ;
 *  - un wire explicite trou<->trou peut unir deux groupes globaux, y compris
 *    appartenant à deux breadboards différents (SEUL cas de fusion
 *    inter-breadboards). Sans wire : aucune fusion.
 */
import { getComponentDef } from '../config/componentDefinitions.js'
import { holeAt, resolveComponentContactHoles } from './breadboardGeometry.js'
import { BREADBOARD_PITCH } from './breadboardGeometry.js'
import { parseBreadboardHoleEndpoint } from './breadboardWireEndpoint.js'
import { makeBreadboardGroupKey } from './breadboardElectricalIdentity.js'
import { toCanonicalBreadboards } from './normalizeDocumentBreadboards.js'

/**
 * Clé électrique GLOBALE d'un trou. `hole.groupKey` (sortie de holeAt()) est
 * une identité de groupe locale au breadboard ; on l'enveloppe dans une clé
 * globale collision-safe portée par `breadboard.id`.
 */
function globalKeyForHole(breadboard, hole) {
  return makeBreadboardGroupKey(breadboard.id, hole.groupKey)
}

/**
 * Occupations physiques résolues, tous breadboards confondus. Chaque entrée
 * porte son `breadboardId` et sa clé de groupe GLOBALE : deux breadboards ne
 * peuvent donc jamais partager une entrée de groupe.
 *
 * FT-B-001-S3 : la politique CONNECTIVITÉ reste « par contact physique résolu »
 * (delta zéro pour un type mono-contact). `contactId` distingue les pattes
 * d'une même pin AVANT canonicalisation, jamais après.
 */
function resolveOccupiedHoles(breadboards, components) {
  const occupied = []
  for (const component of components || []) {
    if (!component || !component.position) continue
    const def = getComponentDef(component.type)
    if (!def || !Array.isArray(def.pins)) continue

    for (const breadboard of breadboards) {
      const { results } = resolveComponentContactHoles(breadboard, def.pins, {
        x: component.position.x,
        y: component.position.y,
      })
      for (const { pinId, contactId, hole } of results) {
        if (!hole) continue
        occupied.push({
          breadboardId: breadboard.id,
          globalGroupKey: globalKeyForHole(breadboard, hole),
          componentId: component.id,
          pinId,
          contactId,
        })
      }
    }
  }
  return occupied
}

/**
 * Résout une extrémité de wire trou vers son groupe GLOBAL, contre EXACTEMENT
 * le breadboard désigné par `parsed.breadboardId` (aucun fallback). `null` si
 * l'id est inconnu ou si le point ne tombe sur aucun trou.
 */
function resolveWireHole(boardById, uid, pinId) {
  const parsed = parseBreadboardHoleEndpoint(uid, pinId)
  if (!parsed) return null
  const breadboard = boardById.get(parsed.breadboardId)
  if (!breadboard || !breadboard.position) return null
  const x = breadboard.position.x + parsed.column * BREADBOARD_PITCH
  const y = breadboard.position.y + parsed.row * BREADBOARD_PITCH
  const hole = holeAt(breadboard, x, y)
  return hole ? { ...parsed, globalGroupKey: globalKeyForHole(breadboard, hole) } : null
}

/**
 * Dérive les arêtes Core nécessaires pour que les pins reliés au même groupe
 * électrique de breadboard restent continus — y compris lorsqu'un groupe est
 * rejoint par un wire explicite terminé sur un trou, et y compris lorsqu'un
 * wire explicite relie les trous de DEUX breadboards différents.
 */
export function deriveBreadboardVirtualWires(document) {
  const breadboards = toCanonicalBreadboards(document)
  if (breadboards.length === 0) return []

  const boardById = new Map(breadboards.map((b) => [b.id, b]))

  const occupied = resolveOccupiedHoles(breadboards, document && document.components)
  const byGroup = new Map()

  const addMember = (globalGroupKey, componentId, pinId) => {
    if (!globalGroupKey || !componentId || !pinId) return
    if (!byGroup.has(globalGroupKey)) byGroup.set(globalGroupKey, [])
    const entries = byGroup.get(globalGroupKey)
    if (!entries.some((entry) => entry.componentId === componentId && entry.pinId === pinId)) {
      entries.push({ globalGroupKey, componentId, pinId })
    }
  }

  for (const entry of occupied) {
    addMember(entry.globalGroupKey, entry.componentId, entry.pinId)
  }

  // Union-find sur les identités électriques GLOBALES. Une fusion n'intervient
  // que par : (a) la règle FT-B-001-S3 multi-contact d'une MÊME pin canonique
  // SUR UN MÊME breadboard ; (b) un wire explicite trou<->trou.
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

  // FT-B-001-S3 (§11) : une même pin canonique peut enficher plusieurs contacts
  // physiques dans des groupes de breadboard DISTINCTS (ex. BUTTON.pin1 :
  // contact "1a" strip bottom, "1b" strip top). Ces groupes sont électriquement
  // continus et doivent être unis — MAIS uniquement s'ils appartiennent AU MÊME
  // breadboard (clé de regroupement = componentId + pinId + breadboardId).
  // FT-C-BREAD-MULTI-001-B : deux contacts d'une même pin observés sur DEUX
  // breadboards différents (chevauchement) ne sont JAMAIS unis automatiquement
  // ici — cette appartenance mécanique multi-breadboard relève de la décision
  // D1 (001-C). Sans wire explicite, A et B restent isolés.
  const groupsByCanonicalPinPerBoard = new Map()
  for (const entry of occupied) {
    const canonicalKey = JSON.stringify([entry.componentId, entry.pinId, entry.breadboardId])
    if (!groupsByCanonicalPinPerBoard.has(canonicalKey)) {
      groupsByCanonicalPinPerBoard.set(canonicalKey, new Set())
    }
    groupsByCanonicalPinPerBoard.get(canonicalKey).add(entry.globalGroupKey)
  }
  for (const groupKeys of groupsByCanonicalPinPerBoard.values()) {
    if (groupKeys.size < 2) continue
    const [firstGroup, ...restGroups] = groupKeys
    for (const groupKey of restGroups) union(firstGroup, groupKey)
  }

  for (const wire of (document && document.wires) || []) {
    const holeA = resolveWireHole(boardById, wire?.pinA?.componentId, wire?.pinA?.pinId)
    const holeB = resolveWireHole(boardById, wire?.pinB?.componentId, wire?.pinB?.pinId)

    if (holeA) find(holeA.globalGroupKey)
    if (holeB) find(holeB.globalGroupKey)

    // Wire explicite trou<->trou : unit les DEUX groupes globaux, même
    // appartenant à deux breadboards différents (unique fusion inter-breadboards).
    if (holeA && holeB) {
      union(holeA.globalGroupKey, holeB.globalGroupKey)
      continue
    }

    if (holeA && wire?.pinB?.componentId && wire?.pinB?.pinId) {
      addMember(holeA.globalGroupKey, wire.pinB.componentId, wire.pinB.pinId)
    }
    if (holeB && wire?.pinA?.componentId && wire?.pinA?.pinId) {
      addMember(holeB.globalGroupKey, wire.pinA.componentId, wire.pinA.pinId)
    }
  }

  // Collapse des groupes fusionnés avant émission de la topologie en étoile.
  const merged = new Map()
  for (const [globalGroupKey, entries] of byGroup.entries()) {
    const root = find(globalGroupKey)
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
