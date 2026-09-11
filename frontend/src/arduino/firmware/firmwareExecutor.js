import { Signal } from "../../simulator/signals.js"

/**
 * MB-L1-ARD-002 — Firmware Executor V1 (§22 du ticket).
 *
 * Consomme uniquement l'IR produite par `firmwareCompiler.js` et un
 * "RuntimePort" injecté (interface conceptuelle `digitalWrite(pin, level)`,
 * §13) — jamais Document, React, History, wires du circuit, ni le solveur
 * de Simulation (§22, verrouillé structurellement par
 * firmwareExecutor.architecture.test.js). N'importe ni scheduler.js ni
 * runtimeOrchestrator.js (§24) : ce fichier construit la SÉMANTIQUE du
 * programme, pas sa progression temporelle (réservée à MB-L1-ARD-003).
 *
 * `Signal.HIGH`/`Signal.LOW` (signals.js, vocabulaire pur — pas le solveur
 * de Simulation) sont réutilisés tels quels à la frontière vers le
 * RuntimePort (§25) : aucun second vocabulaire (1/0/true/false/"H"/"L")
 * n'est inventé ici.
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
    // globalement).
    this._pinModes = new Map()
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
