import { prepareCircuit } from "./preparation.js"
import { resolveSignals } from "./resolution.js"
import { getLedState, getRgbLedState } from "./production.js"

/**
 * Moteur de simulation simple MYBlab.
 * - Propagation HIGH/LOW sur les nets (groupes de pins reliées par fils)
 * - LED ON si anode HIGH et cathode LOW
 * - Alimentation comme source
 * - Bouton : pin1 relié à pin2 quand "pressé" (état futur dans component.pins)
 *
 * MB-SIM-006 : le corps de la simulation est désormais réparti entre
 * preparation.js (Préparation), resolution.js (Résolution) et
 * production.js (Production), conformément à ADR-004. Ce fichier reste le
 * point d'entrée public unique (runSimulation, getLedState,
 * getRgbLedState) : signatures, comportement et sorties inchangés.
 *
 * MB-SIM-007 : resolveSignals() retourne désormais { pinSignals,
 * dcAnalysis } (elle est devenue le point d'entrée unique de la phase
 * Résolution, y compris pour le solveur DC interne). runSimulation()
 * n'expose toujours que pinSignals, pour ne rien changer à son propre
 * contrat externe : mêmes appelants (useCircuitState.js, PartRenderer.jsx,
 * tests existants), même type de retour (Map<string, string>).
 */

/**
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @returns {Map<string, string>} clé "uid:pinId" au Signal
 */

export function runSimulation(components, wires) {
  const prepared = prepareCircuit(components, wires)
  const { pinSignals } = resolveSignals(components, prepared)
  return pinSignals
}

export { getLedState, getRgbLedState }