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
  ResistancePositiveRule,
  CapacitancePositiveRule,
  VoltageDefinedRule,
  OutputToOutputRule,
  PowerSourcePresenceRule,
  PowerGroundShortCircuitRule,
  FloatingInputPinRule,
]
