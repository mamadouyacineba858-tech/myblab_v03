import { Signal } from "../signals.js"

/**
 * Couche Arduino (étape 7 — préparation future).
 * Permettra : chargement sketch, boucle loop(), pins digitales, PWM.
 *
 * Usage prévu :
 *   const sim = new ArduinoSimulator()
 *   sim.loadCode(source)
 *   sim.tick(dt) → met à jour pinSignals pour uid Arduino
 */

export class ArduinoSimulator {
  constructor() {
    this.code = ""
    this.pinOutputs = new Map()
    this.running = false
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
