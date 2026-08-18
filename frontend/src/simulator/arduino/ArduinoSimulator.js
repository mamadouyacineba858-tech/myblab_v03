import { Signal } from "../signals.js"
import { validatePwmFrequencyHz } from "../pwmSignal.js"

/**
 * Couche Arduino (étape 7 — préparation future).
 * Permettra : chargement sketch, boucle loop(), pins digitales, PWM.
 *
 * Usage prévu :
 *   const sim = new ArduinoSimulator()
 *   sim.loadCode(source)
 *   sim.tick(dt) → met à jour pinSignals pour uid Arduino
 *
 * MB-SIM-014A — PWM Frequency Configuration (F1-F5, voir ticket) :
 * - F1 (origine) : une fréquence PWM globale peut être fournie
 *   explicitement à la construction, via `new ArduinoSimulator({
 *   pwmFrequencyHz })`. Ce choix réutilise l'idiome de configuration déjà
 *   établi par RuntimeOrchestrator (runtimeOrchestrator.js,
 *   `constructor({ scheduler, runtime } = {})`) plutôt que d'inventer une
 *   nouvelle convention. Elle n'est JAMAIS déduite d'un paramètre de
 *   `analogWrite(pin, value)`, dont le contrat à deux arguments reste
 *   strictement inchangé.
 * - F2 (pas de défaut) : aucune fréquence par défaut n'est appliquée.
 *   Si `pwmFrequencyHz` est omise, `getPwmFrequencyHz()` retourne `null`
 *   ("non configurée") — jamais une valeur arbitraire telle que 500 Hz ou
 *   490 Hz.
 * - F3 (granularité) : une seule fréquence PWM globale par instance de
 *   runtime (pas de configuration par broche — hors périmètre de ce
 *   ticket, voir ADR-013).
 * - F4 (stockage) : la fréquence est stockée sur l'instance du runtime
 *   (`this._pwmFrequencyHz`), jamais comme constante cachée dans
 *   pwmSignal.js, qui reste un module mathématique/contractuel pur.
 * - F5 (validation) : validée à la construction via
 *   `validatePwmFrequencyHz` (pwmSignal.js), la même règle déjà appliquée
 *   par `validatePwmSignal`/`createPwmSignal` — aucune règle dupliquée. Un
 *   `pwmFrequencyHz` explicitement fourni mais invalide (0, négatif, NaN,
 *   Infinity, ou d'un type non numérique) fait échouer la construction
 *   avec un `RangeError` (même idiome que `createPwmSignal`, échec rapide
 *   et déterministe).
 *
 * Cette configuration ne fait que rendre une fréquence PWM disponible sur
 * le runtime : elle n'implémente aucun comportement PWM. `tick()`
 * n'appelle pas `evaluatePwmSignal()`, `analogWrite()` reste un stub, et
 * `runtimeOrchestrator.js` n'est pas modifié (transmission de
 * `currentTimeMs` à `tick()` différée à MB-SIM-014, voir ADR-013 Gate G2).
 */

export class ArduinoSimulator {
  /**
   * @param {{ pwmFrequencyHz?: number }} [options] `pwmFrequencyHz`,
   *   lorsque fournie, doit être un nombre fini strictement positif (voir
   *   validatePwmFrequencyHz). Omise (clé absente de `options`), aucune
   *   fréquence PWM n'est configurée — `getPwmFrequencyHz()` retourne
   *   `null`, sans aucune valeur par défaut substituée.
   * @throws {RangeError} si `pwmFrequencyHz` est explicitement fournie
   *   (la clé est présente, même avec la valeur `undefined`) mais invalide.
   */
  constructor(options = {}) {
    this.code = ""
    this.pinOutputs = new Map()
    this.running = false
    this._pwmFrequencyHz = null

    if (Object.prototype.hasOwnProperty.call(options, "pwmFrequencyHz")) {
      const result = validatePwmFrequencyHz(options.pwmFrequencyHz)
      if (!result.valid) {
        throw new RangeError(
          `ArduinoSimulator: invalid pwmFrequencyHz configuration: ${result.errors.join("; ")}`
        )
      }
      this._pwmFrequencyHz = options.pwmFrequencyHz
    }
  }

  /**
   * Fréquence PWM globale configurée pour ce runtime (MB-SIM-014A).
   * Lecture seule au sens API : ne modifie jamais l'état PWM (aucun état
   * PWM n'existe encore — la consommation de cette fréquence par
   * `analogWrite()`/`tick()` est différée à MB-SIM-014).
   * @returns {number|null} La fréquence en Hz, ou `null` si aucune
   *   fréquence n'a été fournie à la construction (jamais une valeur par
   *   défaut substituée).
   */
  getPwmFrequencyHz() {
    return this._pwmFrequencyHz
  }

  /**
   * @param {string} source Code Arduino (futur : transpilation / interprétation)
   */
  loadCode(source) {
    this.code = source ?? ""
    this.pinOutputs.clear()
  }

  start() {
    this.running = true
  }

  stop() {
    this.running = false
  }

  /**
   * Une frame de simulation (à brancher sur requestAnimationFrame ou setInterval,
   * ou — MB-SIM-010 — sur le Scheduler via runtimeOrchestrator.js).
   *
   * MB-SIM-010 : adaptation minimale (Ticket §Phase 2). Cette méthode ne
   * réalise aucun calcul (aucun accès à Signal, aucune horloge, aucune
   * interprétation de code) : elle expose fidèlement l'état déjà présent
   * dans pinOutputs (déjà écrit par digitalWrite()), conformément à son
   * propre contrat documenté ci-dessous, plutôt que d'ignorer cet état comme
   * le faisait la version stub précédente. Aucun calcul électrique n'est
   * introduit (contrainte absolue #6) ; aucun PWM, aucun firmware réel,
   * aucun interpréteur (contraintes #9-#16) : pinOutputs ne peut être
   * peuplé que par un appel explicite et déjà-existant à digitalWrite().
   * @param {number} _deltaMs
   * @returns {Map<string, string>} pinId → Signal pour ce composant
   */
  tick(deltaMs) {
    void deltaMs

    if (!this.running) return new Map()
    return new Map(this.pinOutputs)
}

  /**
   * API future : digitalWrite(pin, HIGH|LOW)
   * @param {string} pin
   * @param {string} level
   */
  digitalWrite(pin, level) {
    this.pinOutputs.set(pin, level === Signal.HIGH ? Signal.HIGH : Signal.LOW)
  }

  /**
   * API future : analogWrite (PWM)
   */
  analogWrite(pin, value) {
    void pin
    void value

    // PWM à implémenter
}
}
