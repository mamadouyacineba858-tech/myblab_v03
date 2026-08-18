import { Signal } from "../signals.js"
import { validatePwmFrequencyHz, createPwmSignal, analogValueToDutyCycle, evaluatePwmSignal } from "../pwmSignal.js"

/**
 * Couche Arduino (étape 7 — préparation future).
 * Permettra : chargement sketch, boucle loop(), pins digitales, PWM.
 *
 * Usage prévu :
 *   const sim = new ArduinoSimulator()
 *   sim.loadCode(source)
 *   sim.tick(currentTimeMs) → met à jour pinSignals pour uid Arduino
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
 * MB-SIM-014 — PWM Runtime (voir ticket) complète ce qui précède :
 * - Le Scheduler reste l'unique source de temps (§4 du ticket). Ce Runtime
 *   ne possède pas d'horloge propre : `tick(currentTimeMs)` mémorise
 *   uniquement un snapshot du dernier `currentTimeMs` explicitement fourni
 *   par l'appelant (RuntimeOrchestrator, alimenté par Scheduler.advance()),
 *   jamais accumulé localement, jamais lu depuis une horloge système.
 * - `analogWrite(pin, value)` convertit `value` en `dutyCycle` via
 *   `analogValueToDutyCycle()` et crée un `PwmSignal` via
 *   `createPwmSignal()` (pwmSignal.js, non réimplémenté), en utilisant
 *   `this._pwmFrequencyHz` (MB-SIM-014A) comme fréquence et le dernier
 *   `this._currentTimeMs` connu comme `startTime`. Si `this._pwmFrequencyHz`
 *   est `null`, `analogWrite()` échoue explicitement (§9) — aucune
 *   fréquence par défaut n'est substituée.
 * - `analogWrite()` n'écrit jamais dans `pinOutputs` et n'évalue jamais
 *   HIGH/LOW : il enregistre le `PwmSignal` dans `this._pwmSignals`
 *   (`Map<pin, PwmSignal>`), remplaçant tout `PwmSignal` déjà actif pour ce
 *   pin (§10/§12). La sortie effective n'est calculée qu'au `tick()`
 *   suivant.
 * - `digitalWrite(pin, level)` supprime tout `PwmSignal` actif pour ce pin
 *   avant d'écrire le niveau digital (§14) : digital et PWM restent
 *   mutuellement exclusifs par pin, le dernier appel déterminant le mode
 *   actif.
 * - `tick(currentTimeMs)` fusionne les sorties digitales (`pinOutputs`)
 *   avec les sorties PWM actives, chacune évaluée à cet instant via
 *   `evaluatePwmSignal(pwmSignal, currentTimeMs)` (non réimplémenté) — le
 *   résultat ne contient jamais de `PwmSignal` brut, uniquement
 *   `Signal.HIGH`/`Signal.LOW` (§15 ; aucun `Signal.PWM`, `signals.js` non
 *   modifié).
 * - Aucune politique de capacité matérielle des pins n'est introduite ici
 *   (§16) : ce Runtime accepte tout `pin` fourni par l'appelant, exactement
 *   comme `digitalWrite()` le faisait déjà.
 * - `this._pwmSignals` est un état strictement interne : aucune API
 *   publique d'introspection dédiée n'est exposée pour l'inspecter (§7/§23
 *   du ticket) — les tests y accèdent directement lorsque nécessaire.
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
    // MB-SIM-014 §7 : snapshot du dernier currentTimeMs explicitement
    // fourni par l'appelant via tick(currentTimeMs) — jamais une horloge
    // propre, jamais accumulé (pas de += dt), jamais lu depuis une horloge
    // système quelconque. Valeur initiale 0, cohérente avec SimulatedClock.
    this._currentTimeMs = 0
    // MB-SIM-014 §7/§10 : Map<pin, PwmSignal>, état strictement interne
    // (aucune API publique d'introspection dédiée, §23 du ticket). Un seul
    // PwmSignal actif par pin, remplacé par tout nouvel analogWrite() sur
    // ce même pin (§10), supprimé par tout digitalWrite() sur ce même pin
    // (§14).
    this._pwmSignals = new Map()

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
   * Lecture seule au sens API : ne modifie jamais l'état PWM. Consommée
   * par `analogWrite()` (MB-SIM-014) comme `frequencyHz` de tout nouveau
   * `PwmSignal`.
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
   * MB-SIM-014 §7/§13 : `currentTimeMs` est l'instant simulé courant,
   * fourni explicitement par l'appelant (RuntimeOrchestrator.advance(),
   * alimenté par Scheduler.advance()) — ce Runtime ne calcule ni ne lit
   * jamais le temps lui-même. `this._currentTimeMs` n'est qu'un snapshot de
   * la dernière valeur reçue, mémorisé pour que `analogWrite()` puisse
   * l'utiliser comme `startTime` d'un futur `PwmSignal` (§11) ; il n'est
   * jamais accumulé.
   *
   * Fusionne les sorties digitales (`pinOutputs`, déjà écrites par
   * `digitalWrite()`, inchangé depuis MB-SIM-010) avec les sorties PWM
   * actives (`_pwmSignals`), chacune évaluée à cet instant via
   * `evaluatePwmSignal()` (pwmSignal.js, non réimplémenté ici — §13). Le
   * résultat ne contient jamais de `PwmSignal` brut, uniquement
   * `Signal.HIGH`/`Signal.LOW` (§15).
   * @param {number} currentTimeMs Instant simulé courant, en ms.
   * @returns {Map<string, string>} pinId → Signal pour ce composant
   */
  tick(currentTimeMs) {
    this._currentTimeMs = currentTimeMs

    if (!this.running) return new Map()

    const output = new Map(this.pinOutputs)
    for (const [pin, pwmSignal] of this._pwmSignals) {
      output.set(pin, evaluatePwmSignal(pwmSignal, currentTimeMs))
    }
    return output
  }

  /**
   * digitalWrite(pin, HIGH|LOW).
   *
   * MB-SIM-014 §14 : digitalWrite et analogWrite sont mutuellement
   * exclusifs par pin — un digitalWrite() sur un pin supprime tout
   * PwmSignal actif pour ce même pin avant d'écrire le niveau digital.
   * @param {string} pin
   * @param {string} level
   */
  digitalWrite(pin, level) {
    this._pwmSignals.delete(pin)
    this.pinOutputs.set(pin, level === Signal.HIGH ? Signal.HIGH : Signal.LOW)
  }

  /**
   * analogWrite(pin, value) — MB-SIM-014 §8-§12.
   *
   * `value` doit être un entier dans [0, 255] (contrat canonique Arduino,
   * inchangé) : converti en dutyCycle via `analogValueToDutyCycle()`
   * (pwmSignal.js, non réimplémenté ici — une valeur invalide y lève déjà
   * un RangeError, propagé tel quel).
   *
   * `this._pwmFrequencyHz` (MB-SIM-014A) doit avoir été configurée à la
   * construction : aucune fréquence par défaut n'est appliquée ici (§9) ;
   * si elle est absente (`null`), analogWrite() échoue explicitement.
   *
   * N'écrit jamais dans pinOutputs, ne calcule jamais HIGH/LOW et
   * n'appelle jamais evaluatePwmSignal() ici (§12) : le PwmSignal créé est
   * seulement enregistré dans this._pwmSignals, remplaçant tout PwmSignal
   * déjà actif pour ce pin (§10). La sortie effective n'est calculée qu'au
   * prochain tick(currentTimeMs).
   *
   * `startTime` du PwmSignal créé = dernier this._currentTimeMs connu — le
   * PWM redémarre donc sa phase à l'instant de cet appel (§11).
   * @param {string} pin
   * @param {number} value Entier dans [0, 255].
   * @throws {RangeError} si value est hors de [0, 255] ou non entier, ou si
   *   aucun pwmFrequencyHz n'a été configuré sur ce runtime.
   */
  analogWrite(pin, value) {
    if (this._pwmFrequencyHz === null) {
      throw new RangeError(
        "ArduinoSimulator.analogWrite: no pwmFrequencyHz configured on this runtime. " +
          "Provide one via new ArduinoSimulator({ pwmFrequencyHz }) before calling analogWrite()."
      )
    }

    const dutyCycle = analogValueToDutyCycle(value)
    const pwmSignal = createPwmSignal({
      frequencyHz: this._pwmFrequencyHz,
      dutyCycle,
      startTime: this._currentTimeMs,
    })
    this._pwmSignals.set(pin, pwmSignal)
  }
}
