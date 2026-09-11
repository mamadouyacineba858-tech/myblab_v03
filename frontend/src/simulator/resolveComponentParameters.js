import { getCanonicalEntry } from "./canonicalRegistry.js"

/**
 * MB-L1-CVE-001 — primitive centrale unique gouvernant la résolution et la
 * validation des paramètres d'instance d'un composant. Aucun autre fichier
 * ne doit ré-implémenter cette logique (contrainte CSA §6 : "une SEULE
 * primitive centrale doit gouverner cette logique").
 *
 * Contrat : canonical defaults + validated instance overrides = effective
 * parameters. `resolveComponentParameters` et `validateComponentParameters`
 * partagent la même règle de validité par clé (`isValidOverrideValue`) —
 * une seule source de vérité pour "cette valeur est-elle acceptable pour
 * cette clé de ce type".
 */

function isValidOverrideValue(paramDef, value) {
  if (!paramDef) return false
  if (typeof value !== "number" || !Number.isFinite(value)) return false
  if (typeof paramDef.minimum === "number" && value < paramDef.minimum) return false
  if (typeof paramDef.maximum === "number" && value > paramDef.maximum) return false
  return true
}

function schemaByKey(entry) {
  const map = new Map()
  if (Array.isArray(entry?.parameterSchema)) {
    for (const param of entry.parameterSchema) map.set(param.key, param)
  }
  return map
}

/**
 * Résolveur tolérant : ne lève jamais d'exception, toujours utilisé par la
 * Simulation et l'affichage Inspector pour obtenir un jeu de paramètres
 * complet et sûr. Toute clé inconnue ou toute valeur invalide de
 * `instanceParameters` est silencieusement ignorée (repli sur le default
 * canonique de cette clé) — jamais propagée telle quelle.
 *
 * @param {string} type
 * @param {Record<string, unknown>|null|undefined} instanceParameters
 * @returns {Record<string, number>} toujours un objet, vide si le type est
 *   inconnu ou n'a pas de modèle de simulation (`modelAvailable === false`).
 */
export function resolveComponentParameters(type, instanceParameters) {
  const entry = getCanonicalEntry(type)
  if (!entry || !entry.modelAvailable || !entry.defaultParameters) return {}

  const schema = schemaByKey(entry)
  const effective = { ...entry.defaultParameters }

  if (instanceParameters && typeof instanceParameters === "object" && !Array.isArray(instanceParameters)) {
    for (const [key, value] of Object.entries(instanceParameters)) {
      const paramDef = schema.get(key)
      if (paramDef && isValidOverrideValue(paramDef, value)) {
        effective[key] = value
      }
    }
  }

  return effective
}

/**
 * Validateur strict : utilisé par la couche de composition (UI commit) et
 * par le Handler avant toute mutation persistante (CV-12). Rejette la
 * candidature ENTIÈRE (aucune mutation) si une seule clé est invalide —
 * jamais de clamp silencieux.
 *
 * @param {string} type
 * @param {Record<string, unknown>} candidateParameters
 * @returns {{ valid: boolean, errors: string[], sanitized: Record<string, number> }}
 */
export function validateComponentParameters(type, candidateParameters) {
  const entry = getCanonicalEntry(type)
  if (!entry || !entry.modelAvailable || !entry.defaultParameters) {
    return { valid: false, errors: [`type "${type}" has no editable parameter model`], sanitized: {} }
  }
  if (!candidateParameters || typeof candidateParameters !== "object" || Array.isArray(candidateParameters)) {
    return { valid: false, errors: ["candidateParameters must be a plain object"], sanitized: {} }
  }

  const schema = schemaByKey(entry)
  const errors = []
  const sanitized = {}

  for (const [key, value] of Object.entries(candidateParameters)) {
    const paramDef = schema.get(key)
    if (!paramDef) {
      errors.push(`unknown parameter key "${key}" for type "${type}"`)
      continue
    }
    if (typeof paramDef.minimum === "number" && typeof paramDef.maximum === "number" && paramDef.minimum === paramDef.maximum) {
      errors.push(`parameter "${key}" is fixed (minimum === maximum) and cannot be edited`)
      continue
    }
    if (!isValidOverrideValue(paramDef, value)) {
      errors.push(`invalid value for parameter "${key}": ${value}`)
      continue
    }
    sanitized[key] = value
  }

  return { valid: errors.length === 0, errors, sanitized }
}

/**
 * Utilitaire Presentation (Inspector) : indique si le paramètre `key` d'un
 * type donné est figé (minimum === maximum, ex. tension nominale d'une
 * pile) — permet un rendu générique lecture-seule sans branche par type
 * (CV-16, ticket §15).
 */
export function isFixedParameter(type, key) {
  const entry = getCanonicalEntry(type)
  const paramDef = schemaByKey(entry).get(key)
  if (!paramDef) return false
  return typeof paramDef.minimum === "number" && typeof paramDef.maximum === "number" && paramDef.minimum === paramDef.maximum
}
