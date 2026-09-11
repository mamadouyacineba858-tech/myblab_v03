/**
 * MB-L1-ARD-002 — source de vérité unique pour le mapping
 * "numéro de pin Arduino" → "pin canonique MYBlab" (§10 du ticket).
 *
 * Aucune connaissance de Simulation/Runtime/React/Document ici — une pure
 * table de correspondance. `firmwareCompiler.js` est le SEUL consommateur ;
 * jamais de branchement dispersé du type `pin === 2 ? "D2" : ...` ailleurs.
 *
 * Scope strict V1 (§26) : D2/D3 uniquement. Étendre à D4…D13 est
 * explicitement hors périmètre de ce ticket.
 */

const ARDUINO_PIN_TO_CANONICAL = new Map([
  [2, "D2"],
  [3, "D3"],
])

/**
 * @param {number} arduinoPin Numéro de pin tel qu'écrit dans le sketch (ex. 2).
 * @returns {string|null} Le pin canonique MYBlab (ex. "D2"), ou `null` si ce
 *   numéro de pin n'est pas supporté en V1.
 */
export function mapArduinoPin(arduinoPin) {
  return ARDUINO_PIN_TO_CANONICAL.get(arduinoPin) ?? null
}

/** @returns {number[]} La liste des numéros de pin supportés en V1 (triée). */
export function getSupportedArduinoPins() {
  return [...ARDUINO_PIN_TO_CANONICAL.keys()].sort((a, b) => a - b)
}
