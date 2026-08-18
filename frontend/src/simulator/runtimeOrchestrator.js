import { createScheduler } from "./scheduler.js"
import { ArduinoSimulator } from "./arduino/ArduinoSimulator.js"

/**
 * MB-SIM-010 — Orchestrateur Scheduler ↔ Embedded Runtime ↔ Simulation.
 *
 * Module d'orchestration dédié au sens de l'INV-SIM010-003 révisé (v2, D1) :
 * distinct de preparation.js / resolution.js / production.js — ces trois
 * fichiers n'importent pas ce module et ne sont pas modifiés par lui — il
 * fait le pont entre le Scheduler (MB-SIM-009) et l'Embedded Runtime
 * (ArduinoSimulator), sans imposer par défaut de modification de la
 * signature publique de runSimulation() (§10, §Contrainte 20) : ce module
 * n'appelle jamais runSimulation() ni aucune fonction de engine.js.
 *
 * Frontière établie (Ticket §Mission) :
 *
 *   Scheduler → Embedded Runtime → SignalMap → (Simulation, en consultation)
 *
 * Séparation stricte des responsabilités :
 * - Le Scheduler (scheduler.js) reste générique : il ne connaît ni Arduino,
 *   ni composant, ni Signal, ni resolution.js (INV-SIM010, contraintes
 *   absolues #1 à #5 — inchangé par ce fichier, voir aussi
 *   timeArchitecture.test.js).
 * - L'Embedded Runtime (ArduinoSimulator) ne réalise aucun calcul électrique
 *   et ne modifie jamais le Document Circuit (contraintes #6, #7) : il
 *   expose seulement l'état de ses propres pins de sortie, tel qu'écrit par
 *   un appelant via digitalWrite() (aucun firmware réel, aucun
 *   interpréteur — contraintes #15, #16).
 * - Ce module ne connaît ni le Document Circuit, ni les composants du
 *   circuit, ni Signal : il consulte le Runtime (Tome II §4.1 : « Simulation
 *   … peut utiliser Embedded Runtime comme source de signaux, selon les
 *   interfaces que celui-ci expose ») et transmet un SignalMap brut
 *   (pinId → Signal), sans l'interpréter.
 * - La fusion d'un SignalMap dans un pinSignals au format Simulation
 *   (mergeRuntimeSignalsIntoPinSignals ci-dessous) est une fonction pure,
 *   fournie mais non appelée par aucun chemin par défaut de Simulation :
 *   runSimulation() reste, par défaut, strictement inchangé (§10, §20).
 */
export class RuntimeOrchestrator {
  /**
   * @param {{ scheduler?: import('./scheduler.js').Scheduler, runtime?: ArduinoSimulator }} [options]
   *   Un Scheduler et/ou un Runtime peuvent être injectés explicitement
   *   (tests, ou futur consommateur possédant déjà ses propres instances).
   *   À défaut, l'orchestrateur crée ses propres instances indépendantes.
   */
  constructor({ scheduler, runtime } = {}) {
    this._scheduler = scheduler ?? createScheduler()
    this._runtime = runtime ?? new ArduinoSimulator()
  }

  /**
   * Référence en lecture seule (consultation, Tome II §2.3) vers le
   * Scheduler orchestré. Ne pas muter l'état interne du Scheduler par un
   * autre chemin que son API publique (getCurrentTime/advance/reset).
   * @returns {import('./scheduler.js').Scheduler}
   */
  getScheduler() {
    return this._scheduler
  }

  /**
   * Référence en lecture seule vers le Runtime orchestré — permet à un
   * appelant de le configurer explicitement (loadCode, start, stop,
   * digitalWrite), en dehors du cycle advance().
   * @returns {ArduinoSimulator}
   */
  getRuntime() {
    return this._runtime
  }

  /**
   * @returns {number} Temps courant du Scheduler orchestré, en ms.
   */
  getCurrentTime() {
    return this._scheduler.getCurrentTime()
  }

  /**
   * Fait progresser le temps du Scheduler de dt, puis consulte le Runtime
   * pour obtenir l'état courant de ses pins de sortie (Tome II §4.1/§4.2 :
   * consultation à sens unique, jamais l'inverse — INV-SIM010-N03).
   *
   * MB-SIM-014 §4/§5 : le Scheduler reste l'unique source de temps — le
   * Runtime ne possède pas sa propre horloge. `this._runtime.tick()` reçoit
   * désormais le `currentTimeMs` absolu retourné par
   * `this._scheduler.advance(dt)` (et non plus `dt` lui-même) : le Runtime
   * n'a donc jamais à reconstruire son propre temps par accumulation de
   * deltas. L'ordre Scheduler → Runtime reste garanti.
   *
   * @param {number} dt Délégué tel quel au Scheduler (mêmes règles de
   *   validation que Scheduler.advance/SimulatedClock.advance). N'est plus
   *   transmis directement au Runtime : c'est `time` (temps absolu après
   *   avance) qui est transmis à `Runtime.tick(time)`.
   * @returns {{ time: number, signalMap: Map<string, string> }}
   *   `signalMap` : pinId → Signal, tel qu'exposé par le Runtime. Vide si
   *   le Runtime n'est pas démarré (`runtime.start()` non appelé) ou si
   *   aucun digitalWrite()/analogWrite() n'a encore été effectué.
   */
  advance(dt) {
    const time = this._scheduler.advance(dt)
    const signalMap = this._runtime.tick(time)
    return { time, signalMap }
  }

  /**
   * Réinitialise le temps du Scheduler orchestré à 0 ms. Ne touche pas à
   * l'état du Runtime (pinOutputs, running) : ce sont deux responsabilités
   * distinctes (le Runtime a son propre cycle start()/stop(), étranger au
   * Scheduler — voir Ticket v2 §3.1, D2).
   * @returns {number} Nouveau temps courant (toujours 0).
   */
  reset() {
    return this._scheduler.reset()
  }
}

/**
 * @param {{ scheduler?: import('./scheduler.js').Scheduler, runtime?: ArduinoSimulator }} [options]
 * @returns {RuntimeOrchestrator}
 */
export function createRuntimeOrchestrator(options) {
  return new RuntimeOrchestrator(options)
}

/**
 * Fusionne un SignalMap produit par un Runtime (clé = pinId brut, ex.
 * "D2") dans un pinSignals au format Simulation (clé "uid:pinId", le même
 * format que celui retourné par resolveSignals() / runSimulation()), pour
 * un composant identifié par `uid`.
 *
 * Fonction pure : ne modifie ni `pinSignals` ni `runtimeSignalMap` en
 * place ; retourne une nouvelle Map. N'est appelée par aucun chemin par
 * défaut de Simulation (runSimulation() n'importe pas ce fichier) —
 * capacité fournie et testée, disponible pour un futur ticket d'intégration
 * explicite dans le pipeline par défaut, décision hors périmètre de
 * MB-SIM-010 (§10, §14).
 *
 * @param {Map<string, string>} pinSignals État Simulation existant (peut
 *   être vide).
 * @param {string} uid Identifiant du composant Arduino dans le Document.
 * @param {Map<string, string>} runtimeSignalMap SignalMap tel que retourné
 *   par RuntimeOrchestrator.advance() / ArduinoSimulator.tick().
 * @returns {Map<string, string>} Nouvelle Map, copie de `pinSignals`
 *   augmentée des entrées `${uid}:${pinId}` → Signal du Runtime.
 */
export function mergeRuntimeSignalsIntoPinSignals(pinSignals, uid, runtimeSignalMap) {
  const merged = new Map(pinSignals)
  for (const [pinId, signal] of runtimeSignalMap) {
    merged.set(`${uid}:${pinId}`, signal)
  }
  return merged
}
