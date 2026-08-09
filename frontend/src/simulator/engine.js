import { prepareCircuit } from "./preparation.js"
import { resolveSignals } from "./resolution.js"
import { getLedState, getRgbLedState } from "./production.js"

/**
 * Moteur de simulation simple MYBlab.
 * - Propagation HIGH/LOW sur les nets (groupes de pins reliÃƒÂ©es par fils)
 * - LED ON si anode HIGH et cathode LOW
 * - Alimentation comme source
 * - Bouton : pin1 reliÃƒÂ© ÃƒÂ  pin2 quand "pressÃƒÂ©" (ÃƒÂ©tat futur dans component.pins)
 *
 * MB-SIM-006 : le corps de la simulation est désormais réparti entre
 * preparation.js (Préparation), resolution.js (Résolution) et
 * production.js (Production), conformément à ADR-004. Ce fichier reste le
 * point d'entrée public unique (runSimulation, getLedState,
 * getRgbLedState) : signatures, comportement et sorties inchangés.
 */

/**
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @returns {Map<string, string>} clÃƒÂ© "uid:pinId" Ã¢â€ â€™ Signal
 */
export function runSimulation(components, wires) {
  const prepared = prepareCircuit(components, wires)
  return resolveSignals(components, prepared)
}

export { getLedState, getRgbLedState }