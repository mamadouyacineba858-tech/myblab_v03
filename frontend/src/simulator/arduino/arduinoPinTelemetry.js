/**
 * Télémétrie des sorties Arduino (TINKERCAD-005).
 *
 * Mémorise, par broche, ce que le firmware a réellement commandé (niveau
 * numérique ou PWM 8 bits) pour que le solveur transitoire reconstruise la
 * forme d'onde exacte, sans ré-échantillonner le moteur numérique à 16 ms.
 * Le lecteur analogique est fourni par la simulation électrique en cours ;
 * sans lecteur ou sans nœud résolu, `analogRead` échoue explicitement.
 */

export const ARDUINO_PWM_FREQUENCY_HZ = 490
export const ARDUINO_PWM_MAX_FREQUENCY_HZ = 980
export const ARDUINO_ADC_REFERENCE_VOLTS = 5

const drives = new Map()
let analogReader = null
const listeners = new Set()

const keyOf = (uid, pin) => `${uid}:${pin}`
const notify = () => listeners.forEach((fn) => fn())

export function recordDigital(uid, pin, high) {
  drives.set(keyOf(uid, pin), { kind: "digital", level: high ? 1 : 0 })
  notify()
}

export function recordPwm(uid, pin, value) {
  const duty = Math.min(255, Math.max(0, value)) / 255
  const frequencyHz = pin === "D5" || pin === "D6"
    ? ARDUINO_PWM_MAX_FREQUENCY_HZ
    : ARDUINO_PWM_FREQUENCY_HZ
  drives.set(keyOf(uid, pin), { kind: "pwm", duty, value, frequencyHz })
  notify()
}

export function clearPinTelemetry(uid) {
  if (uid === undefined) drives.clear()
  else for (const key of [...drives.keys()]) if (key.startsWith(`${uid}:`)) drives.delete(key)
  notify()
}

export function getPinDrive(uid, pin) {
  return drives.get(keyOf(uid, pin)) ?? null
}

/** @returns {1|0|null} niveau instantané de la broche à l'instant simulé `t` (s) ; null = haute impédance. */
export function pinLevelAt(uid, pin, t) {
  const drive = drives.get(keyOf(uid, pin))
  if (!drive) return null
  if (drive.kind === "digital") return drive.level
  if (drive.duty <= 0) return 0
  if (drive.duty >= 1) return 1
  return (t * drive.frequencyHz) % 1 < drive.duty ? 1 : 0
}

/** Niveau moyen (0..1) de la broche sur l'intervalle (t0, t1] ; intègre exactement le PWM, null = haute impédance. */
export function pinAverageLevel(uid, pin, t0, t1) {
  const drive = drives.get(keyOf(uid, pin))
  if (!drive) return null
  if (drive.kind === "digital") return drive.level
  if (drive.duty <= 0) return 0
  if (drive.duty >= 1) return 1
  const span = (t1 - t0) * drive.frequencyHz
  if (!(span > 0)) return pinLevelAt(uid, pin, t1)
  const cumulative = (t) => {
    const x = t * drive.frequencyHz
    const whole = Math.floor(x)
    return whole * drive.duty + Math.min(x - whole, drive.duty)
  }
  const average = (cumulative(t1) - cumulative(t0)) / span
  return Math.min(1, Math.max(0, average))
}

export function setAnalogReader(fn) {
  analogReader = typeof fn === "function" ? fn : null
}

/** @returns {number|null} code ADC 0..1023 (référence 5 V), ou null si la tension n'est pas résolue. */
export function readAnalogCode(uid, pin) {
  const volts = analogReader ? analogReader(uid, pin) : null
  if (volts === null || volts === undefined || !Number.isFinite(volts)) return null
  const clamped = Math.min(ARDUINO_ADC_REFERENCE_VOLTS, Math.max(0, volts))
  return Math.min(1023, Math.round((clamped / ARDUINO_ADC_REFERENCE_VOLTS) * 1023))
}

export function subscribePinTelemetry(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
