import { Signal } from "../../simulator/signals.js"

/**
 * MB-L1-ARD-002 — Firmware Executor V1 (§22 du ticket).
 * MB-L1-ARD-003 — étendu avec suspend/resume piloté par le temps (§8/§22).
 *
 * Consomme uniquement l'IR produite par `firmwareCompiler.js` et un
 * "RuntimePort" injecté (interface conceptuelle `digitalWrite(pin, level)`,
 * §13) — jamais Document, React, History, wires du circuit, ni le solveur
 * de Simulation (§22, verrouillé structurellement par
 * firmwareExecutor.architecture.test.js). N'importe ni scheduler.js ni
 * runtimeOrchestrator.js (§24) : ce fichier construit la SÉMANTIQUE du
 * programme et sa suspension/reprise déterministe, jamais sa propre
 * horloge — le temps est TOUJOURS fourni par l'appelant (le futur
 * `firmwareRuntimeController.js`, lui-même piloté par le Scheduler).
 *
 * `Signal.HIGH`/`Signal.LOW` (signals.js, vocabulaire pur — pas le solveur
 * de Simulation) sont réutilisés tels quels à la frontière vers le
 * RuntimePort (§25) : aucun second vocabulaire (1/0/true/false/"H"/"L")
 * n'est inventé ici.
 *
 * DEUX API COEXISTENT SUR CETTE CLASSE, DÉLIBÉRÉMENT SÉPARÉES :
 *
 *   1. `start()` / `runLoopOnce()` / `reset()` — API ARD-002, synchrone,
 *      comportement STRICTEMENT INCHANGÉ (aucun des 15 tests E1-E12 n'a été
 *      modifié) : `start()` exécute `setup` en une fois, `runLoopOnce()`
 *      exécute un passage complet de `loop` en une fois. Ces méthodes ne
 *      gèrent jamais `DELAY` (un IR ARD-002, compilé avant ce ticket, n'en
 *      contient de toute façon jamais).
 *
 *   2. `resume(currentTimeMs)` — NOUVELLE API temporelle (ARD-003),
 *      seule consommée par `firmwareRuntimeController.js`. Suspend
 *      l'exécution sur un `DELAY` (`_waitingUntil`) et reprend exactement à
 *      l'instruction suivante lors d'un futur `resume()` dont
 *      `currentTimeMs >= _waitingUntil` (§6/§8). Une fois `setup` terminée
 *      sans suspension, `resume()` enchaîne immédiatement sur `loop` dans le
 *      même appel — borné à UN SEUL passage complet de `loop` sans délai
 *      par appel (§12, protection contre une boucle JS synchrone infinie),
 *      jamais plus.
 *
 * Les deux API partagent `_pinModes` (le matériel configuré est le même,
 * quelle que soit l'API utilisée) mais possèdent chacune leur propre suivi
 * de progression (`_setupExecuted` pour l'API 1, `_setupCompleted`/`_pc`/
 * `_waitingUntil` pour l'API 2) — aucun test existant ni nouveau ne mélange
 * les deux API sur la même instance.
 */

export class FirmwareExecutionError extends Error {
  constructor(message) {
    super(message)
    this.name = "FirmwareExecutionError"
  }
}

export class FirmwareExecutor {
  /**
   * @param {{ setup: object[], loop: object[] }} ir Sortie de compileFirmware() (ok:true uniquement).
   * @param {{ digitalWrite(pin: string, level: string): void }} runtimePort
   */
  constructor(ir, runtimePort) {
    this._ir = ir
    this._runtimePort = runtimePort
    this._setupExecuted = false
    // Map<pin canonique, "OUTPUT"> — état d'exécution LOCAL, jamais persisté
    // (ARD-16/§16 : reset() le vide, jamais le Document ni ArduinoSimulator
    // globalement). Partagée entre l'API ARD-002 et l'API temporelle
    // ARD-003 : le "matériel" configuré est le même quelle que soit l'API.
    this._pinModes = new Map()

    // MB-L1-ARD-003 — état d'exécution temporel, VOLATILE, distinct de
    // `_setupExecuted` (API ARD-002) : jamais lu/écrit par start()/
    // runLoopOnce(), jamais persisté au Document, jamais exporté (§7/§23).
    this._setupCompleted = false
    this._pc = 0
    this._waitingUntil = null
  }

  /**
   * Exécute setup() exactement une fois par cycle start()/reset() (§14).
   * Idempotent : un second appel sans reset() intermédiaire ne réexécute
   * jamais setup().
   */
  start() {
    if (this._setupExecuted) return
    for (const instruction of this._ir.setup) {
      this._executeInstruction(instruction)
    }
    this._setupExecuted = true
  }

  /**
   * Exécute exactement une itération du corps loop() (§15). Le scheduling
   * répétitif/temporel appartient à MB-L1-ARD-003 — ce fichier n'introduit
   * aucune boucle, aucun timer, aucun requestAnimationFrame/setInterval.
   */
  runLoopOnce() {
    for (const instruction of this._ir.loop) {
      this._executeInstruction(instruction)
    }
  }

  /**
   * Réinitialise l'état d'exécution LOCAL (§16) : setup pourra être
   * réexécuté par le prochain start(), les pinModes enregistrés sont
   * oubliés. Ne touche jamais le Document (`component.firmware.source`),
   * ni l'état global d'un ArduinoSimulator réel au-delà des appels
   * digitalWrite() explicitement issus de l'exécution suivante.
   */
  reset() {
    this._setupExecuted = false
    this._pinModes = new Map()
    // MB-L1-ARD-003 §20 : reset() efface aussi l'état d'exécution temporel
    // (jamais le Document firmware.source, jamais l'historique — cette
    // méthode ne connaît ni l'un ni l'autre).
    this._setupCompleted = false
    this._pc = 0
    this._waitingUntil = null
  }

  // =========================================================================
  // MB-L1-ARD-003 — API temporelle (§8/§12/§14) : seule consommée par
  // firmware RuntimeController.js. `currentTimeMs` provient TOUJOURS de
  // l'appelant (jamais Date.now()/performance.now() ici, §4).
  // =========================================================================

  /**
   * Point d'entrée unique de progression temporelle. Reprend l'exécution là
   * où elle a été suspendue (`setup` ou `loop`), ou la démarre si c'est le
   * premier appel depuis la construction/le dernier `reset()`.
   *
   * Sémantique (§6/§9/§10, vérifiée sur la séquence Blink de référence) :
   * - tant que `setup` n'est pas terminée, seule `setup` progresse ;
   * - une fois `setup` terminée SANS suspension en attente, l'exécution
   *   enchaîne immédiatement sur `loop` dans le MÊME appel (aucune étape
   *   intermédiaire n'est requise de l'appelant) ;
   * - `loop` est bornée à UN SEUL passage complet sans délai par appel
   *   (§12) — jamais une boucle JS synchrone illimitée.
   * @param {number} currentTimeMs Instant courant du Scheduler (absolu, ms).
   */
  resume(currentTimeMs) {
    if (!this._setupCompleted) {
      const suspended = this._runBody(this._ir.setup, currentTimeMs)
      if (suspended) return
      this._setupCompleted = true
      this._pc = 0
    }
    this._runLoopBounded(currentTimeMs)
  }

  /**
   * Exécute `body` à partir de `this._pc`, en respectant une suspension en
   * cours (`this._waitingUntil`). Un `DELAY` avance `this._pc` PAST
   * l'instruction (reprise à l'instruction suivante, §6/§8 — jamais une
   * réexécution du `delay()` lui-même) et arme `this._waitingUntil`.
   * @returns {boolean} `true` si l'exécution est suspendue (attente d'un
   *   délai non expiré, ou délai qui vient d'être armé) ; `false` si `body`
   *   a été entièrement parcouru sans suspension.
   */
  _runBody(body, currentTimeMs) {
    if (this._waitingUntil !== null) {
      if (currentTimeMs < this._waitingUntil) return true
      this._waitingUntil = null
    }
    while (this._pc < body.length) {
      const instruction = body[this._pc]
      if (instruction.op === "DELAY") {
        this._pc++
        this._waitingUntil = currentTimeMs + instruction.durationMs
        return true
      }
      this._executeInstruction(instruction)
      this._pc++
    }
    return false
  }

  /**
   * Exécute `loop`, bornée à UN SEUL passage complet sans délai par appel
   * (§12) : si un passage entier de `loop` se termine sans jamais
   * rencontrer de `DELAY`, un second passage n'est PAS démarré dans le même
   * appel — il attendra le prochain `resume()`. Ceci empêche
   * `void loop() { digitalWrite(2, HIGH); }` (sans délai) de bloquer
   * JavaScript en boucle synchrone infinie, tout en restant équivalent à
   * `runLoopOnce()` (ARD-002) pour ce cas précis : un appel = une itération.
   */
  _runLoopBounded(currentTimeMs) {
    let freshIterationsStarted = 0
    while (true) {
      if (this._pc === 0) {
        if (freshIterationsStarted >= 1) return
        freshIterationsStarted++
      }
      const suspended = this._runBody(this._ir.loop, currentTimeMs)
      if (suspended) return
      this._pc = 0
    }
  }

  _executeInstruction(instruction) {
    switch (instruction.op) {
      case "PIN_MODE":
        this._pinModes.set(instruction.pin, instruction.mode)
        return
      case "DIGITAL_WRITE": {
        if (this._pinModes.get(instruction.pin) !== "OUTPUT") {
          throw new FirmwareExecutionError(
            `digitalWrite("${instruction.pin}", ${instruction.value}) called before pinMode("${instruction.pin}", OUTPUT)`
          )
        }
        const signal = instruction.value === "HIGH" ? Signal.HIGH : Signal.LOW
        this._runtimePort.digitalWrite(instruction.pin, signal)
        return
      }
      default:
        throw new FirmwareExecutionError(`unknown IR opcode: "${instruction.op}"`)
    }
  }
}
