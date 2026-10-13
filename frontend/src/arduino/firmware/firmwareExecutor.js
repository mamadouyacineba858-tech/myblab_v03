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
    this._variables = new Map()

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
    this._variables = new Map()
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
    let executed = 0
    while (this._pc < body.length) {
      if (++executed > 10000) {
        throw new FirmwareExecutionError("execution budget exceeded (possible infinite loop)")
      }
      const instruction = body[this._pc]
      if (instruction.op === "BRANCH_FALSE") {
        const { left, right, operator } = instruction.condition
        const valueOf = (token) => /^-?\d+$/.test(token) ? Number(token) : this._variables.get(token)
        const a = valueOf(left), b = valueOf(right)
        if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) {
          throw new FirmwareExecutionError("condition contains an undefined or unsafe integer")
        }
        const truth = operator === "==" ? a === b : operator === "!=" ? a !== b
          : operator === "<" ? a < b : operator === "<=" ? a <= b
          : operator === ">" ? a > b : a >= b
        this._pc = truth ? this._pc + 1 : instruction.target
        continue
      }
      if (instruction.op === "JUMP") {
        this._pc = instruction.target
        continue
      }
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
      case "VAR_DECLARE_EXPR":
      case "VAR_ASSIGN_EXPR": {
        if (instruction.op === "VAR_DECLARE_EXPR" && this._variables.has(instruction.name)) {
          throw new FirmwareExecutionError("variable already declared: " + instruction.name)
        }
        if (instruction.op === "VAR_ASSIGN_EXPR" && !this._variables.has(instruction.name)) {
          throw new FirmwareExecutionError("undeclared variable: " + instruction.name)
        }
        const resolve = token => /^-?\d+$/.test(token) ? Number(token) : this._variables.get(token)
        const left = resolve(instruction.left), right = resolve(instruction.right)
        if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
          throw new FirmwareExecutionError("undefined or unsafe arithmetic operand")
        }
        let result
        switch (instruction.operator) {
          case "+": result = left + right; break
          case "-": result = left - right; break
          case "*": result = left * right; break
          case "/":
            if (right === 0) throw new FirmwareExecutionError("division by zero")
            result = Math.trunc(left / right)
            break
          case "%":
            if (right === 0) throw new FirmwareExecutionError("modulo by zero")
            result = left % right
            break
          default: throw new FirmwareExecutionError("unsupported arithmetic operator")
        }
        if (!Number.isSafeInteger(result)) throw new FirmwareExecutionError("integer arithmetic exceeds safe range")
        this._variables.set(instruction.name, result)
        return
      }
      case "VAR_REINITIALIZE": {
        if (!Number.isSafeInteger(instruction.value)) throw new FirmwareExecutionError("invalid for counter")
        this._variables.set(instruction.name, instruction.value)
        return
      }
      case "VAR_DECLARE": {
        if (this._variables.has(instruction.name)) {
          throw new FirmwareExecutionError(`variable "${instruction.name}" already declared`)
        }
        if (!Number.isSafeInteger(instruction.value)) {
          throw new FirmwareExecutionError("integer declaration exceeds safe range")
        }
        this._variables.set(instruction.name, instruction.value)
        return
      }
      case "VAR_ASSIGN": {
        if (!this._variables.has(instruction.name)) {
          throw new FirmwareExecutionError(`undeclared variable "${instruction.name}"`)
        }
        const operand = /^-?\d+$/.test(instruction.operand)
          ? Number(instruction.operand)
          : this._variables.get(instruction.operand)
        if (!Number.isSafeInteger(operand)) {
          throw new FirmwareExecutionError(`invalid integer operand "${instruction.operand}"`)
        }
        const previous = this._variables.get(instruction.name)
        const value = instruction.operator === "=" ? operand
          : instruction.operator === "+=" ? previous + operand
          : previous - operand
        if (!Number.isSafeInteger(value)) {
          throw new FirmwareExecutionError("integer arithmetic exceeds safe range")
        }
        this._variables.set(instruction.name, value)
        return
      }
      case "DIGITAL_READ": {
        const mode = this._pinModes.get(instruction.pin)
        if (mode !== "INPUT" && mode !== "INPUT_PULLUP") {
          throw new FirmwareExecutionError("digitalRead requires INPUT or INPUT_PULLUP: " + instruction.pin)
        }
        if (typeof this._runtimePort.digitalRead !== "function") {
          throw new FirmwareExecutionError("digitalRead runtime port is unavailable")
        }
        const signal = this._runtimePort.digitalRead(instruction.pin, mode)
        if (signal !== Signal.HIGH && signal !== Signal.LOW) {
          throw new FirmwareExecutionError("digitalRead received unresolved signal: " + signal)
        }
        if (instruction.declare && this._variables.has(instruction.name)) {
          throw new FirmwareExecutionError("variable already declared: " + instruction.name)
        }
        if (!instruction.declare && !this._variables.has(instruction.name)) {
          throw new FirmwareExecutionError("undeclared variable: " + instruction.name)
        }
        this._variables.set(instruction.name, signal === Signal.HIGH ? 1 : 0)
        return
      }
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
