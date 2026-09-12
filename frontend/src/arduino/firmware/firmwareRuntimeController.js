import { createScheduler } from "../../simulator/scheduler.js"

/**
 * MB-L1-ARD-003 — Firmware Runtime Controller (§14 du ticket).
 *
 * Couche d'orchestration dédiée : Scheduler + FirmwareExecutor + RuntimePort.
 * Le Scheduler (`scheduler.js`) reste totalement inchangé et générique
 * (aucune connaissance Arduino) — ce fichier est le SEUL consommateur qui
 * relie explicitement un Scheduler à un FirmwareExecutor (§15/§16 : "ONE
 * Arduino runtime execution → ONE authoritative Scheduler", jamais une
 * seconde horloge cachée).
 *
 * Injectable/composable (§16) : un Scheduler peut être fourni explicitement
 * (le futur MB-L1-ARD-004/005 réutilisera le même Scheduler que le pont
 * Simulation existant, `RuntimeOrchestrator`) ; à défaut, le contrôleur crée
 * le sien, indépendant — même idiome que `RuntimeOrchestrator`
 * (`constructor({ scheduler, runtime } = {})`, `simulator/runtimeOrchestrator.js`).
 *
 * Aucune connaissance de Document/React/History/CommandBus ici (§23) —
 * verrouillé structurellement par firmwareTemporalArchitecture.test.js.
 */
export class FirmwareRuntimeController {
  /**
   * @param {{ scheduler?: import('../../simulator/scheduler.js').Scheduler, executor: import('./firmwareExecutor.js').FirmwareExecutor }} options
   *   `executor` est obligatoire (déjà construit avec l'IR compilée et le
   *   RuntimePort réel/fake). `scheduler` peut être injecté ; à défaut, le
   *   contrôleur en crée un nouveau, indépendant.
   */
  constructor({ scheduler, executor } = {}) {
    this._scheduler = scheduler ?? createScheduler()
    this._executor = executor
    this._running = false
  }

  /** @returns {import('../../simulator/scheduler.js').Scheduler} Référence en lecture seule vers le Scheduler orchestré. */
  getScheduler() {
    return this._scheduler
  }

  /** @returns {number} Temps courant du Scheduler orchestré, en ms. */
  getCurrentTime() {
    return this._scheduler.getCurrentTime()
  }

  /** @returns {boolean} Vrai si le firmware est en cours d'exécution (démarré, non arrêté). */
  isRunning() {
    return this._running
  }

  /**
   * Démarre l'exécution firmware (§17) : réinitialise l'état d'exécution de
   * l'executor (jamais le Scheduler — le temps ne progresse que via
   * `advance()`, explicite), puis exécute `setup` jusqu'à sa complétion ou
   * jusqu'au premier `delay()` rencontré, en utilisant le temps COURANT du
   * Scheduler (sans jamais l'avancer soi-même).
   */
  start() {
    this._executor.reset()
    this._running = true
    this._executor.resume(this._scheduler.getCurrentTime())
  }

  /**
   * Fait progresser le temps du Scheduler de `dt`, puis reprend l'exécution
   * firmware suspendue si elle est en cours (§18). N'exécute jamais de
   * nouvelle instruction firmware si `stop()` a été appelé depuis le
   * dernier `start()` (§19) — le Scheduler avance néanmoins, pour que l'axe
   * du temps reste cohérent et composable avec un futur appelant partageant
   * le même Scheduler.
   * @param {number} dt Délégué tel quel au Scheduler (mêmes règles de validation, clock.js).
   * @returns {number} Le nouveau temps courant du Scheduler, en ms.
   */
  resumeAtCurrentTime() {
    if (this._running) this._executor.resume(this._scheduler.getCurrentTime())
  }

  advance(dt) {
    const currentTimeMs = this._scheduler.advance(dt)
    if (this._running) {
      this._executor.resume(currentTimeMs)
    }
    return currentTimeMs
  }

  /**
   * Suspend l'exécution firmware (§19). Un `advance()` ultérieur continue de
   * faire progresser le Scheduler mais ne reprend plus jamais l'executor
   * tant que `start()` n'a pas été rappelé.
   */
  stop() {
    this._running = false
  }

  /**
   * Réinitialise intégralement le Scheduler ET l'executor (§20) : le temps
   * revient à 0 ms, l'état d'exécution local est effacé. Ne mute jamais le
   * Document (`component.firmware.source`), l'historique, les wires ou les
   * composants — ce fichier n'importe aucun de ces domaines.
   */
  reset() {
    this._scheduler.reset()
    this._executor.reset()
    this._running = false
  }
}

/**
 * @param {{ scheduler?: import('../../simulator/scheduler.js').Scheduler, executor: import('./firmwareExecutor.js').FirmwareExecutor }} options
 * @returns {FirmwareRuntimeController}
 */
export function createFirmwareRuntimeController(options) {
  return new FirmwareRuntimeController(options)
}
