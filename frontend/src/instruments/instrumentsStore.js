/**
 * Réglages persistants des instruments (TINKERCAD-005) : générateur de
 * signaux, voies d'oscilloscope, sondes de tension et ampèremètre inséré.
 *
 * Ce store est volontairement hors Document / History : ce sont des réglages
 * de banc de mesure, pas des composants du circuit. Ils sont sauvegardés et
 * restaurés avec le circuit (`exportCircuit` / `importCircuit`) uniquement
 * lorsqu'ils diffèrent des valeurs par défaut, ce qui laisse le format
 * historique inchangé pour les circuits sans instruments.
 */

export const WAVEFORMS_UI = Object.freeze([
  { id: "sine", label: "Sinus" },
  { id: "square", label: "Carré" },
  { id: "triangle", label: "Triangle" },
  { id: "dc", label: "Continu" },
])
export const GENERATOR_LIMITS = Object.freeze({ minHz: 1, maxHz: 1000, maxAmplitude: 20, maxOffset: 20 })
export const SCOPE_WINDOWS_MS = Object.freeze([5, 20, 100, 1000, 5000, 10000])

const DEFAULT_GENERATOR = Object.freeze({
  id: "gen1", enabled: false, waveform: "sine", frequencyHz: 100, amplitude: 2, offset: 0, duty: 0.5, plus: null, minus: null,
})

const defaults = () => ({
  generator: { ...DEFAULT_GENERATOR },
  scope: { windowMs: 20, ch1: { plus: null, minus: null }, ch2: { plus: null, minus: null } },
  voltmeter: { plus: null, minus: null },
  ammeter: { a: null, b: null },
})

let state = defaults()
const listeners = new Set()
let version = 0

const notify = () => { version += 1; listeners.forEach((fn) => fn()) }
const clampNumber = (value, min, max, fallback) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback)
const cleanPin = (pin) => (pin && typeof pin.uid === "string" && typeof pin.pin === "string" ? { uid: pin.uid, pin: pin.pin } : null)

export function getInstruments() { return state }
export function getInstrumentsVersion() { return version }
export function subscribeInstruments(fn) { listeners.add(fn); return () => listeners.delete(fn) }

export function updateInstruments(mutator) {
  const next = structuredClone(state)
  mutator(next)
  next.generator.frequencyHz = clampNumber(Number(next.generator.frequencyHz), GENERATOR_LIMITS.minHz, GENERATOR_LIMITS.maxHz, 100)
  next.generator.amplitude = clampNumber(Number(next.generator.amplitude), 0, GENERATOR_LIMITS.maxAmplitude, 2)
  next.generator.offset = clampNumber(Number(next.generator.offset), -GENERATOR_LIMITS.maxOffset, GENERATOR_LIMITS.maxOffset, 0)
  next.generator.duty = clampNumber(Number(next.generator.duty), 0.01, 0.99, 0.5)
  state = next
  notify()
}

export function resetInstruments() { state = defaults(); notify() }

export function isDefaultInstruments() { return JSON.stringify(state) === JSON.stringify(defaults()) }

/** @returns {object|undefined} instantané sérialisable, ou undefined si tout est par défaut. */
export function snapshotInstruments() {
  return isDefaultInstruments() ? undefined : structuredClone(state)
}

export function applyInstrumentsSnapshot(data) {
  const base = defaults()
  if (data && typeof data === "object") {
    const g = data.generator ?? {}
    base.generator = {
      ...DEFAULT_GENERATOR,
      enabled: g.enabled === true,
      waveform: WAVEFORMS_UI.some((w) => w.id === g.waveform) ? g.waveform : DEFAULT_GENERATOR.waveform,
      frequencyHz: Number(g.frequencyHz), amplitude: Number(g.amplitude), offset: Number(g.offset), duty: Number(g.duty),
      plus: cleanPin(g.plus), minus: cleanPin(g.minus),
    }
    const s = data.scope ?? {}
    base.scope = {
      windowMs: SCOPE_WINDOWS_MS.includes(s.windowMs) ? s.windowMs : base.scope.windowMs,
      ch1: { plus: cleanPin(s.ch1?.plus), minus: cleanPin(s.ch1?.minus) },
      ch2: { plus: cleanPin(s.ch2?.plus), minus: cleanPin(s.ch2?.minus) },
    }
    base.voltmeter = { plus: cleanPin(data.voltmeter?.plus), minus: cleanPin(data.voltmeter?.minus) }
    base.ammeter = { a: cleanPin(data.ammeter?.a), b: cleanPin(data.ammeter?.b) }
  }
  state = base
  updateInstruments(() => {})
}

// ---- Sélection d'une borne par clic sur le canvas ----------------------------------------
let pickTarget = null
const pickListeners = new Set()

/** Arme la prochaine sélection ; `apply(pin)` reçoit {uid, pin}. `label` s'affiche dans le panneau. */
export function armPinPick(label, apply) {
  pickTarget = { label, apply }
  pickListeners.forEach((fn) => fn())
}
export function cancelPinPick() { pickTarget = null; pickListeners.forEach((fn) => fn()) }
export function getPinPickLabel() { return pickTarget?.label ?? null }
export function subscribePinPick(fn) { pickListeners.add(fn); return () => pickListeners.delete(fn) }

/** Appelé par le canvas à chaque clic de broche ; retourne true si le clic a été consommé par une sonde. */
export function consumePinPick(uid, pin) {
  if (!pickTarget) return false
  const target = pickTarget
  pickTarget = null
  target.apply({ uid, pin })
  pickListeners.forEach((fn) => fn())
  return true
}
