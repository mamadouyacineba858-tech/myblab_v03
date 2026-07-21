/**
 * Génère un identifiant unique pour composants et fils.
 * Utilise crypto.randomUUID si disponible, sinon fallback timestamp.
 */
export function createUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `uid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
