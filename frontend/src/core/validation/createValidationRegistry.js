/**
 * Factory Core — MB-CF4-001.
 * Construit un ValidationRegistry par défaut, peuplé de toutes les règles
 * métier CF4 (structural + electrical + pedagogical), via l'API réelle
 * registry.add(rule). N'invente aucune API : ValidationRegistry n'est pas
 * modifié.
 */
import { ValidationRegistry } from './ValidationRegistry.js'
import { ALL_VALIDATION_RULES } from './rules/index.js'

export function createDefaultValidationRegistry() {
  const registry = new ValidationRegistry()
  for (const rule of ALL_VALIDATION_RULES) {
    registry.add(rule)
  }
  return registry
}
