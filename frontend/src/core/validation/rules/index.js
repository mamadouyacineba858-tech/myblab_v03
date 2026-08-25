/**
 * Point d'entrée des règles de validation métier MB-CF4-001.
 *
 * ELE-004 (SourceCurrentDefinedRule) volontairement absente : aucun type
 * CURRENT_SOURCE n'existe dans canonicalRegistry (contrat CF4, non
 * applicable actuellement).
 *
 * Ce sous-dossier (core/validation/rules/**) est le seul sous-arbre de
 * core/validation/ autorisé à référencer canonicalRegistry.js, conformément
 * à l'amendement CSA-CF4-001-A (INV-CF2-009 restreint).
 */

// Structurelles
export { ComponentTypeRule } from './structural/ComponentTypeRule.js'
export { ComponentPinsRule } from './structural/ComponentPinsRule.js'
export { WirePinsExistRule } from './structural/WirePinsExistRule.js'
export { SelfLoopRule } from './structural/SelfLoopRule.js'
export { ReferenceCoherenceRule } from './structural/ReferenceCoherenceRule.js'
// MB-VIS-005 : valide la structure des waypoints d'une commande
// UPDATE_WIRE_WAYPOINTS en attente. N'implique aucun enregistrement de
// cette commande dans un CommandRegistry — indépendant du verrou
// cf1DocumentArchitecture.test.js (portée : ValidationRegistry uniquement).
export { WireWaypointsStructureRule } from './structural/WireWaypointsStructureRule.js'
// MB-BREADBOARD-003 (Blueprint §4, CSA Ruling GO du 2026-08-25) : bloque
// toute commande ADD_COMPONENT/MOVE_COMPONENT qui ferait coïncider 2+ pins
// distinctes sur le même trou exact d'un breadboard (LOCK-12). Id STR-007
// (STR-005 déjà pris par ReferenceCoherenceRule, STR-006 par
// WireWaypointsStructureRule — voir BreadboardHoleCollisionRule.js).
export { BreadboardHoleCollisionRule } from './structural/BreadboardHoleCollisionRule.js'

// Électriques
export { ResistancePositiveRule } from './electrical/ResistancePositiveRule.js'
export { CapacitancePositiveRule } from './electrical/CapacitancePositiveRule.js'
export { VoltageDefinedRule } from './electrical/VoltageDefinedRule.js'
export { OutputToOutputRule } from './electrical/OutputToOutputRule.js'
export { PowerSourcePresenceRule } from './electrical/PowerSourcePresenceRule.js'
export { PowerGroundShortCircuitRule } from './electrical/PowerGroundShortCircuitRule.js'

// Pédagogiques
export { FloatingInputPinRule } from './pedagogical/FloatingInputPinRule.js'

import { ComponentTypeRule } from './structural/ComponentTypeRule.js'
import { ComponentPinsRule } from './structural/ComponentPinsRule.js'
import { WirePinsExistRule } from './structural/WirePinsExistRule.js'
import { SelfLoopRule } from './structural/SelfLoopRule.js'
import { ReferenceCoherenceRule } from './structural/ReferenceCoherenceRule.js'
import { WireWaypointsStructureRule } from './structural/WireWaypointsStructureRule.js'
import { BreadboardHoleCollisionRule } from './structural/BreadboardHoleCollisionRule.js'
import { ResistancePositiveRule } from './electrical/ResistancePositiveRule.js'
import { CapacitancePositiveRule } from './electrical/CapacitancePositiveRule.js'
import { VoltageDefinedRule } from './electrical/VoltageDefinedRule.js'
import { OutputToOutputRule } from './electrical/OutputToOutputRule.js'
import { PowerSourcePresenceRule } from './electrical/PowerSourcePresenceRule.js'
import { PowerGroundShortCircuitRule } from './electrical/PowerGroundShortCircuitRule.js'
import { FloatingInputPinRule } from './pedagogical/FloatingInputPinRule.js'

export const ALL_VALIDATION_RULES = [
  ComponentTypeRule,
  ComponentPinsRule,
  WirePinsExistRule,
  SelfLoopRule,
  ReferenceCoherenceRule,
  WireWaypointsStructureRule,
  BreadboardHoleCollisionRule,
  ResistancePositiveRule,
  CapacitancePositiveRule,
  VoltageDefinedRule,
  OutputToOutputRule,
  PowerSourcePresenceRule,
  PowerGroundShortCircuitRule,
  FloatingInputPinRule,
]
