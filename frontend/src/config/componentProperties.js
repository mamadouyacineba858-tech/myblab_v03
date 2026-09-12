import { getComponentDef } from "./componentDefinitions.js"

function schemaFor(type) {
  const definition = getComponentDef(type)
  return definition?.id === type ? definition.propertySchema : undefined
}

export function isPlainProperties(value) {
  if (!value || typeof value !== "object") return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function validValue(rule, value) {
  return rule.type === "string" && typeof value === "string" && [...value].length <= rule.maxLength
}

// Legacy reads resolve defaults; only validated instance values override them.
export function resolveComponentProperties(type, instanceProperties) {
  const schema = schemaFor(type)
  if (!schema) return {}
  return Object.fromEntries(Object.entries(schema).map(([key, rule]) => [
    key,
    isPlainProperties(instanceProperties) && Object.hasOwn(instanceProperties, key) && validValue(rule, instanceProperties[key])
      ? instanceProperties[key] : rule.default,
  ]))
}

// Strict commit validation: unknown keys and invalid values reject the candidate.
export function validateComponentProperties(type, candidateProperties) {
  const schema = schemaFor(type)
  if (!schema) return { valid: false, errors: [`Unknown component type: ${type}`], sanitized: {} }
  if (!isPlainProperties(candidateProperties)) return { valid: false, errors: ["properties must be a plain object"], sanitized: {} }
  const errors = []
  const sanitized = {}
  for (const key of Reflect.ownKeys(candidateProperties)) {
    if (typeof key !== "string" || !Object.hasOwn(schema, key)) {
      errors.push(`Unknown property: ${String(key)}`)
    } else if (!validValue(schema[key], candidateProperties[key])) {
      errors.push(`Invalid property: ${key}`)
    } else {
      sanitized[key] = candidateProperties[key]
    }
  }
  return { valid: errors.length === 0, errors, sanitized: errors.length ? {} : sanitized }
}
