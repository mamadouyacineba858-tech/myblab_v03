import { runSimulation } from "./engine.js"
import { createRuntimeOrchestrator, mergeRuntimeSignalsIntoPinSignals } from "./runtimeOrchestrator.js"

/**
 * MB-SIM-011 — Intégration Simulation ↔ Scheduler/Runtime (SIM3).
 *
 * Module d'intégration dédié, distinct de engine.js et de
 * runtimeOrchestrator.js, ni importé par ni ne les modifiant — c'est le
 * point d'orchestration identifié après inspection (voir rapport de
 * livraison MB-SIM-011) : les deux verrous architecturaux existants
 * (runtimeArchitecture.test.js) interdisent à engine.js d'importer
 * runtimeOrchestrator.js/ArduinoSimulator.js, et à runtimeOrchestrator.js
 * de référencer runSimulation/resolveSignals/prepareCircuit/
 * computeDcAnalysis. Ce fichier est le seul à composer les deux côtés,
 * sans modifier ni l'un ni l'autre.
 *
 * runSimulation() (engine.js) reste strictement inchangé et reste
 * utilisable directement, sans dépendance obligatoire au Scheduler ou à
 * ArduinoSimulator (GATE 0 — non-régression) : ce module ne fait
 * qu'ENVELOPPER runSimulation(), jamais le contraire.
 */

/**
 * Seul type canonique du Registry conçu pour un runtime embarqué
 * (ArduinoSimulator). Ce n'est pas une donnée dupliquée de
 * canonicalRegistry.js (aucune liste de pins/rôles/paramètres n'est
 * recopiée ici) : c'est la sélection, propre à ce module d'intégration,
 * du type qui déclenche l'activation conditionnelle du Runtime (Q3 du
 * mandat CSA-SIM3). Le rôle de pin "gpio" seul ne permettrait pas cette
 * discrimination : SERVO.signal est également "gpio" sans qu'un SERVO
 * nécessite d'ArduinoSimulator.
 */
const RUNTIME_COMPONENT_TYPE = "ARDUINO"

/**
 * Indique si le circuit contient au moins un composant nécessitant
 * l'activation du Runtime (Q3 : activation conditionnelle — un circuit
 * sans composant pertinent ne doit jamais instancier de Scheduler ni de
 * Runtime).
 * @param {Array<{ uid, type }>} components
 * @returns {boolean}
 */
export function circuitRequiresRuntime(components) {
  return Array.isArray(components) && components.some((c) => c && c.type === RUNTIME_COMPONENT_TYPE)
}

/**
 * Point d'entrée SIM3 : exécute le chemin de simulation historique
 * (runSimulation, inchangé) puis, uniquement si le circuit contient au
 * moins un composant Runtime (ARDUINO), fait progresser un
 * RuntimeOrchestrator par composant et fusionne son SignalMap dans le
 * pinSignals via mergeRuntimeSignalsIntoPinSignals (réutilisé tel quel,
 * aucune deuxième fonction de fusion créée — Q2).
 *
 * GATE 0 (non-régression) : pour un circuit sans composant Runtime, cette
 * fonction retourne exactement runSimulation(components, wires) — même
 * référence de Map, aucun Scheduler ni Runtime créé, aucun paramètre
 * supplémentaire requis.
 *
 * Ordre temporel garanti (hérité de RuntimeOrchestrator.advance(),
 * inchangé) : Scheduler.advance(dt) est TOUJOURS exécuté avant
 * ArduinoSimulator.tick(dt) pour chaque composant Runtime.
 *
 * Déterminisme : aucune dépendance à Date.now()/setTimeout()/
 * setInterval()/performance.now() ; dt est fourni explicitement par
 * l'appelant, comme pour Scheduler.advance()/SimulatedClock.advance().
 *
 * @param {Array<{ uid, type, x, y, pins? }>} components
 * @param {Array<{ fromUid, fromPin, toUid, toPin }>} wires
 * @param {{ dt?: number, orchestrators?: Map<string, import('./runtimeOrchestrator.js').RuntimeOrchestrator> }} [options]
 *   `dt` : délégué tel quel à RuntimeOrchestrator.advance() pour chaque
 *   composant Runtime (0 par défaut — aucune progression temporelle si
 *   omis). `orchestrators` : Map optionnelle uid → RuntimeOrchestrator,
 *   à fournir par l'appelant pour conserver un état Runtime persistant
 *   entre plusieurs appels successifs (déterminisme, cycles de
 *   simulation répétés) ; une nouvelle Map est utilisée si omise. Tous
 *   les RuntimeOrchestrator créés automatiquement par un même appel
 *   partagent un unique Scheduler (une seule source de temps, GATE 1).
 * @returns {Map<string, string>} pinSignals — même format que
 *   runSimulation() (clé "uid:pinId" → Signal), augmenté des signaux
 *   Runtime le cas échéant.
 */
export function runSimulationWithRuntime(components, wires, options = {}) {
  const pinSignals = runSimulation(components, wires)

  const runtimeComponents = (components || []).filter((c) => c && c.type === RUNTIME_COMPONENT_TYPE)
  if (runtimeComponents.length === 0) {
    return pinSignals
  }

  const dt = options.dt ?? 0
  const orchestrators = options.orchestrators instanceof Map ? options.orchestrators : new Map()

  let sharedScheduler = null
  for (const existing of orchestrators.values()) {
    sharedScheduler = existing.getScheduler()
    break
  }

  // Une seule source de temps (GATE 1) : lorsque plusieurs composants
  // Runtime partagent un même Scheduler (créés automatiquement au sein
  // d'un même appel), ce Scheduler ne doit être avancé qu'UNE SEULE fois
  // par appel — pas une fois par composant, ce qui le ferait dériver
  // (dt * nombre de composants). Le premier composant traité avance le
  // Scheduler (via RuntimeOrchestrator.advance(), qui préserve l'ordre
  // Scheduler -> Runtime) ; les suivants, partageant déjà ce Scheduler
  // désormais à jour, ne font progresser que leur propre Runtime
  // (orchestrator.getRuntime().tick(dt)), sans réappeler
  // Scheduler.advance().
  let schedulerAlreadyAdvancedThisCall = false

  let merged = pinSignals
  for (const comp of runtimeComponents) {
    let orchestrator = orchestrators.get(comp.uid)
    if (!orchestrator) {
      orchestrator = sharedScheduler
        ? createRuntimeOrchestrator({ scheduler: sharedScheduler })
        : createRuntimeOrchestrator()
      sharedScheduler = orchestrator.getScheduler()
      orchestrators.set(comp.uid, orchestrator)
    }

    let signalMap
    if (!schedulerAlreadyAdvancedThisCall) {
      ;({ signalMap } = orchestrator.advance(dt))
      schedulerAlreadyAdvancedThisCall = true
    } else {
      signalMap = orchestrator.getRuntime().tick(dt)
    }

    merged = mergeRuntimeSignalsIntoPinSignals(merged, comp.uid, signalMap)
  }

  return merged
}
