import { InvalidTimeDeltaError } from "./errors/index.js"

/**
 * MB-SIM-009 — Clock (temps simulé).
 *
 * Primitive temporelle minimale et déterministe, indépendante du temps réel
 * (ADR-004, § Impact sur les développements futurs : « Une simulation en
 * temps réel peut s'appuyer sur la même architecture en l'exécutant à
 * intervalle régulier » — SimulatedClock est le compteur de temps que ce
 * mécanisme d'exécution répétée pourra consulter/faire avancer, sans aucun
 * lien avec Date.now(), setTimeout(), setInterval() ou
 * requestAnimationFrame()).
 *
 * Unité canonique : la milliseconde (ms) — cohérente avec la signature déjà
 * présente sur ArduinoSimulator.tick(deltaMs), sans que cela ne crée de
 * dépendance entre SimulatedClock et ArduinoSimulator (le raccordement
 * réel d'ArduinoSimulator est explicitement hors périmètre de MB-SIM-009,
 * voir MB-SIM-010).
 *
 * Invariants garantis par cette implémentation (Ticket MB-SIM-009 v1) :
 * - INV-SIM009-001 : aucune dépendance à une horloge système.
 * - INV-SIM009-002 : temps initial = 0 ms.
 * - INV-SIM009-003 : unité canonique = ms.
 * - INV-SIM009-004 : avancement explicitement contrôlé via advance(dt).
 * - INV-SIM009-005 : un delta invalide (négatif, NaN, ±Infinity, valeur non
 *   numérique) est rejeté par advance() — la validation a lieu avant toute
 *   mutation de l'état interne, qui reste donc inchangé si une
 *   InvalidTimeDeltaError est levée.
 * - INV-SIM009-006 : monotonie — un delta valide est toujours >= 0, donc
 *   currentTime ne peut jamais décroître d'un appel à advance() à l'autre.
 * - INV-SIM009-007 : déterminisme — aucune source d'aléa ni de temps
 *   système n'intervient ; deux instances recevant la même séquence
 *   d'appels produisent le même temps final.
 */

/**
 * @param {unknown} dt
 * @returns {boolean} true si dt est un nombre fini >= 0.
 */
function isValidDelta(dt) {
  return typeof dt === "number" && Number.isFinite(dt) && dt >= 0
}

export class SimulatedClock {
  constructor() {
    this._currentTime = 0
  }

  /**
   * @returns {number} Temps simulé courant, en millisecondes.
   */
  getCurrentTime() {
    return this._currentTime
  }

  /**
   * Avance le temps simulé de dt millisecondes.
   * @param {number} dt Doit être un nombre fini >= 0.
   * @returns {number} Nouveau temps courant, en millisecondes.
   * @throws {InvalidTimeDeltaError} si dt est invalide. L'état temporel
   *   interne n'est pas modifié dans ce cas (INV-SIM009-005).
   */
  advance(dt) {
    if (!isValidDelta(dt)) {
      throw new InvalidTimeDeltaError(dt)
    }
    this._currentTime += dt
    return this._currentTime
  }

  /**
   * Réinitialise le temps simulé à 0 ms.
   * @returns {number} Nouveau temps courant (toujours 0).
   */
  reset() {
    this._currentTime = 0
    return this._currentTime
  }
}

/**
 * @returns {SimulatedClock} Nouvelle Clock initialisée à 0 ms.
 */
export function createSimulatedClock() {
  return new SimulatedClock()
}
