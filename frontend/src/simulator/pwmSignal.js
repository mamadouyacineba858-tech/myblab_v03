import { Signal } from "./signals.js"

/**
 * MB-SIM-013 — PwmSignal (contrat d'architecture, pas d'implémentation
 * complète).
 *
 * Ce module définit un type de valeur autonome représentant un signal PWM
 * (fréquence + rapport cyclique), conformément à l'ADR-013
 * (docs/governance/ADR/ADR-013-pwm-signal-model.md, Option B).
 *
 * Décisions verrouillées par l'ADR-013 :
 * - `Signal` (signals.js) n'est PAS modifié : PWM est un type parallèle,
 *   jamais un membre supplémentaire de `Signal`.
 * - `PwmSignal` est une valeur immuable (`Object.freeze`), jamais mutée.
 * - `frequencyHz` n'a AUCUNE valeur par défaut : elle doit toujours être
 *   fournie explicitement par l'appelant (aucune fréquence n'est inventée
 *   ici, conformément à l'interdiction du ticket MB-SIM-013 §9/§11).
 * - `dutyCycle` est un ratio [0, 1] (convention déjà utilisée par
 *   canonicalRegistry.js pour POTENTIOMETER.position), pas un pourcentage.
 * - `evaluatePwmSignal` est une fonction PURE : elle ne lit jamais le temps
 *   elle-même. `currentTimeMs` doit toujours provenir explicitement de
 *   SimulatedClock.getCurrentTime() (via le Scheduler) — jamais de
 *   Date.now(), setTimeout(), setInterval(), performance.now(), ou toute
 *   autre horloge réelle (aucune de ces API n'est utilisée dans ce
 *   fichier — voir le test d'architecture associé).
 * - `evaluatePwmSignal` retourne toujours une valeur de l'énumération
 *   `Signal` existante (`HIGH` ou `LOW`), jamais un nouvel état.
 *
 * Ce module est volontairement autonome et n'est importé par AUCUN autre
 * module de production dans ce ticket (ni ArduinoSimulator.js, ni
 * runtimeOrchestrator.js, ni resolution.js, ni canonicalRegistry.js) : il
 * s'agit d'un contrat inerte, prêt à être consommé par une future
 * implémentation (MB-SIM-014), pas d'une fonctionnalité livrée.
 *
 * Hors périmètre de ce ticket (différé à MB-SIM-014, voir ADR-013) :
 * - la validation de la capacité PWM d'une broche (broche valide /
 *   invalide / non-PWM) — ce module est délibérément agnostique de toute
 *   notion de broche ;
 * - le câblage dans ArduinoSimulator.tick()/analogWrite() ;
 * - toute décision canonicalRegistry.js sur les broches PWM-capables.
 */

/**
 * @param {unknown} value
 * @returns {boolean} true si value est un nombre fini.
 */
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * Valide une configuration candidate de PwmSignal, sans lever d'exception.
 * Suit l'idiome déjà établi par canonicalRegistry.js#validateCanonicalEntry.
 *
 * @param {unknown} config
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePwmSignal(config) {
  const errors = []

  if (!config || typeof config !== "object") {
    return { valid: false, errors: ["config must be a non-null object"] }
  }

  if (!isFiniteNumber(config.frequencyHz)) {
    errors.push("frequencyHz must be a finite number")
  } else if (config.frequencyHz <= 0) {
    errors.push("frequencyHz must be strictly greater than 0 (0 Hz and negative frequencies are not a valid PWM period)")
  }

  if (!isFiniteNumber(config.dutyCycle)) {
    errors.push("dutyCycle must be a finite number")
  } else if (config.dutyCycle < 0 || config.dutyCycle > 1) {
    errors.push("dutyCycle must be a ratio in the [0, 1] range (not a percentage)")
  }

  const startTime = Object.prototype.hasOwnProperty.call(config, "startTime") ? config.startTime : 0
  if (!isFiniteNumber(startTime)) {
    errors.push("startTime must be a finite number when provided")
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Construit un PwmSignal immuable et validé.
 *
 * @param {{frequencyHz: number, dutyCycle: number, startTime?: number}} config
 * @returns {Readonly<{frequencyHz: number, dutyCycle: number, startTime: number}>}
 * @throws {RangeError} si config est invalide (voir validatePwmSignal).
 */
export function createPwmSignal(config) {
  const result = validatePwmSignal(config)
  if (!result.valid) {
    throw new RangeError(`createPwmSignal: invalid PwmSignal configuration: ${result.errors.join("; ")}`)
  }
  const startTime = Object.prototype.hasOwnProperty.call(config, "startTime") ? config.startTime : 0
  return Object.freeze({
    frequencyHz: config.frequencyHz,
    dutyCycle: config.dutyCycle,
    startTime,
  })
}

/**
 * Convertit une valeur analogWrite() canonique Arduino (entier [0, 255])
 * en rapport cyclique [0, 1]. Conversion linéaire et déterministe :
 * 0 -> 0, 255 -> 1.0.
 *
 * Ne détermine AUCUNE fréquence : analogWrite() ne fixe que le rapport
 * cyclique, la fréquence d'un PwmSignal reste un paramètre distinct et
 * obligatoire (voir ADR-013, section "Contrat analogWrite").
 *
 * @param {unknown} value Doit être un entier dans [0, 255].
 * @returns {number} Rapport cyclique dans [0, 1].
 * @throws {RangeError} si value n'est pas un entier dans [0, 255].
 */
export function analogValueToDutyCycle(value) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new RangeError(
      `analogValueToDutyCycle: "${String(value)}" is not a valid analogWrite() value. ` +
        `Expected an integer in the canonical Arduino range [0, 255].`
    )
  }
  return value / 255
}

/**
 * Évalue l'état logique (Signal.HIGH ou Signal.LOW) d'un PwmSignal à un
 * instant donné, exprimé en millisecondes.
 *
 * Fonction PURE : ne lit jamais le temps elle-même. `currentTimeMs` doit
 * provenir explicitement de SimulatedClock.getCurrentTime() (via le
 * Scheduler) — jamais lu implicitement, jamais dérivé d'une horloge réelle.
 *
 * Formule (voir ADR-013 pour la justification de chaque règle de bord) :
 *   period       = 1000 / frequencyHz                        (ms)
 *   elapsed      = currentTimeMs - startTime
 *   phase        = ((elapsed % period) + period) % period      // toujours dans [0, period)
 *   dutyBoundary = dutyCycle * period
 *   résultat     = phase < dutyBoundary ? Signal.HIGH : Signal.LOW
 *
 * Règles de bord verrouillées :
 * - dutyCycle = 0   -> toujours Signal.LOW (dutyBoundary = 0)
 * - dutyCycle = 1   -> toujours Signal.HIGH (dutyBoundary = period)
 * - phase = dutyBoundary (front descendant) -> Signal.LOW (borne incluse
 *   dans LOW ; l'intervalle HIGH est semi-ouvert [0, dutyBoundary))
 * - t < startTime (elapsed < 0) -> géré par extension périodique arrière
 *   du modulo normalisé, pas un état "non démarré" distinct (hypothèse de
 *   conception documentée et révisable, voir ADR-013)
 * - t = period, t = n*period -> équivalent à t = 0 par périodicité
 *
 * @param {{frequencyHz: number, dutyCycle: number, startTime: number}} pwmSignal
 * @param {number} currentTimeMs Instant d'évaluation, en ms, fourni par
 *   l'appelant (jamais lu par cette fonction).
 * @returns {Signal} Signal.HIGH ou Signal.LOW — jamais un nouvel état.
 */
export function evaluatePwmSignal(pwmSignal, currentTimeMs) {
  const { frequencyHz, dutyCycle, startTime } = pwmSignal
  const period = 1000 / frequencyHz
  const elapsed = currentTimeMs - startTime
  const phase = ((elapsed % period) + period) % period
  const dutyBoundary = dutyCycle * period
  return phase < dutyBoundary ? Signal.HIGH : Signal.LOW
}
