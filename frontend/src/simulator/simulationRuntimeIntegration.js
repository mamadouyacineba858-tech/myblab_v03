import { compileFirmware } from "../arduino/firmware/firmwareCompiler.js"
import { FirmwareExecutor } from "../arduino/firmware/firmwareExecutor.js"
import { FirmwareRuntimeController } from "../arduino/firmware/firmwareRuntimeController.js"

// Presentation frames advance this fixed simulated duration, never wall time.
export const SIMULATION_STEP_MS = 16

import { runSimulation } from "./engine.js"
import { prepareCircuit } from "./preparation.js"
import { resolveSignals } from "./resolution.js"
import { createRuntimeOrchestrator } from "./runtimeOrchestrator.js"

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
 *
 * MB-SIM-012 : lorsqu'au moins un composant Runtime est présent, ce module
 * n'appelle plus runSimulation() (qui ne connaît pas externalSignals et ne
 * doit pas être modifié par défaut — §10 du ticket) mais compose
 * directement les deux mêmes briques que runSimulation() utilise en
 * interne : prepareCircuit() (preparation.js, importée telle quelle, non
 * modifiée, non dupliquée) puis resolveSignals(components, prepared,
 * externalSignals) (resolution.js, dont seule la signature a été étendue
 * d'un 3e paramètre optionnel — §4.1/§9 du ticket : aucune logique de
 * préparation/résolution/propagation/production n'est réimplémentée ici,
 * seules les fonctions existantes sont appelées avec un argument
 * supplémentaire). Le SignalMap du Runtime est ainsi transmis à la
 * résolution AVANT la propagation (externalSignals), et non plus fusionné
 * après coup dans le résultat final (ancien comportement MB-SIM-011,
 * remplacé — voir resolution.js pour le détail de l'injection).
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
 * Point d'entrée SIM3 : pour un circuit sans composant Runtime (ARDUINO),
 * délègue intégralement à runSimulation() (chemin historique, inchangé —
 * GATE 0). Dès qu'au moins un composant Runtime est présent, obtient
 * d'abord le SignalMap de chaque Runtime (Scheduler.advance(dt) TOUJOURS
 * avant ArduinoSimulator.tick(currentTimeMs), hérité de
 * RuntimeOrchestrator.advance() — MB-SIM-014 : le Runtime reçoit désormais
 * le currentTimeMs absolu retourné par le Scheduler, jamais dt lui-même,
 * et TOUS les Runtime d'un même appel partageant un Scheduler reçoivent
 * exactement le même currentTimeMs, voir sharedCurrentTimeMs ci-dessous),
 * les convertit en `externalSignals` (même format de clé "uid:pinId" que
 * pinSignals — aucune conversion conceptuelle, §5 du ticket), puis appelle
 * prepareCircuit() + resolveSignals(components, prepared, externalSignals) :
 * le signal Runtime participe ainsi réellement à la résolution (nets,
 * propagation), avant que pinSignals ne soit calculé — et non plus fusionné
 * après coup (MB-SIM-011).
 *
 * GATE 0 (non-régression) : pour un circuit sans composant Runtime, cette
 * fonction retourne exactement runSimulation(components, wires) — même
 * référence de Map, aucun Scheduler ni Runtime créé, aucun paramètre
 * supplémentaire requis.
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
 *   runSimulation() (clé "uid:pinId" → Signal), désormais calculé avec
 *   les signaux Runtime comme entrées de la résolution le cas échéant.
 */
export function runSimulationWithRuntime(components, wires, options = {}) {
  const runtimeComponents = (components || []).filter((c) => c && c.type === RUNTIME_COMPONENT_TYPE)
  if (runtimeComponents.length === 0) {
    return runSimulation(components, wires)
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
  // désormais à jour, ne font progresser que leur propre Runtime.
  //
  // MB-SIM-014 §4/§6 : le Scheduler reste l'unique source de temps — tous
  // les Runtime d'un même appel doivent recevoir EXACTEMENT le même
  // currentTimeMs (jamais dt, une simple durée). Le currentTimeMs retourné
  // par le premier orchestrator.advance(dt) est donc mémorisé et réutilisé
  // tel quel pour tous les Runtime suivants de cet appel
  // (orchestrator.getRuntime().tick(sharedCurrentTimeMs)), sans réappeler
  // Scheduler.advance().
  // Resolve every runtime before advancing the one shared clock.
  for (const comp of runtimeComponents) {
    if (!orchestrators.has(comp.uid)) {
      const orchestrator = sharedScheduler
        ? createRuntimeOrchestrator({ scheduler: sharedScheduler })
        : createRuntimeOrchestrator()
      sharedScheduler = orchestrator.getScheduler()
      orchestrators.set(comp.uid, orchestrator)
    }
  }
  for (const comp of runtimeComponents) {
    if (orchestrators.get(comp.uid).getScheduler() !== sharedScheduler) {
      throw new Error("Live Arduino runtimes must share one Scheduler")
    }
  }
  if (options.firmwareSessions) {
    synchronizeFirmware(options.firmwareComponents ?? components, orchestrators, options.firmwareSessions)
  }
  sharedScheduler.advance(dt)
  const currentTimeMs = sharedScheduler.getCurrentTime()
  for (const comp of runtimeComponents) {
    options.firmwareSessions?.get(comp.uid)?.controller?.resumeAtCurrentTime()
  }
  const externalSignals = new Map()
  for (const comp of runtimeComponents) {
    const signalMap = orchestrators.get(comp.uid).getRuntime().tick(currentTimeMs)
    for (const [pinId, signal] of signalMap) externalSignals.set(`${comp.uid}:${pinId}`, signal)
  }
  const prepared = prepareCircuit(components, wires)
  const { pinSignals } = resolveSignals(components, prepared, externalSignals)
  return pinSignals
}

export function stopFirmwareSimulation(orchestrators, sessions) {
  for (const session of sessions.values()) session.controller?.stop()
  for (const orchestrator of orchestrators.values()) orchestrator.getRuntime().stop()
  sessions.clear()
  orchestrators.clear()
}

function synchronizeFirmware(components, orchestrators, sessions) {
  const live = new Set(components.filter(c => c.type === "ARDUINO").map(c => c.uid))
  for (const [uid, session] of sessions) {
    if (!live.has(uid)) {
      session.controller?.stop()
      orchestrators.get(uid)?.getRuntime().stop()
      sessions.delete(uid)
      orchestrators.delete(uid)
    }
  }
  for (const comp of components) {
    if (comp.type !== "ARDUINO") continue
    const source = comp.firmware?.source
    const previous = sessions.get(comp.uid)
    if (previous && previous.source === source) continue
    previous?.controller?.stop()
    const orchestrator = orchestrators.get(comp.uid)
    const runtime = orchestrator.getRuntime()
    runtime.stop()
    runtime.loadCode(source)
    const compiled = compileFirmware(source)
    const session = { source, diagnostics: compiled.ok ? [] : compiled.diagnostics }
    sessions.set(comp.uid, session)
    if (!compiled.ok) continue
    session.executor = new FirmwareExecutor(compiled.ir, runtime)
    session.controller = new FirmwareRuntimeController({ scheduler: orchestrator.getScheduler(), executor: session.executor })
    runtime.start()
    session.controller.start()
  }
}
