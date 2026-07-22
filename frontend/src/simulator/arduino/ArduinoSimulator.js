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
   * Une frame de simulation (à brancher sur requestAnimationFrame ou setInterval).
   * @param {number} _deltaMs
   * @returns {Map<string, string>} pinId → Signal pour ce composant
   */
  tick(deltaMs) {
    void deltaMs

    if (!this.running) return new Map()
    return new Map()
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
